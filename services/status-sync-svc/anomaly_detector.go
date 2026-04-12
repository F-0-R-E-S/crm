package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/models"
)

// AnomalyDetector evaluates status transitions against anomaly rules and
// creates anomaly records when suspicious patterns are detected.
type AnomalyDetector struct {
	store      *Store
	normalizer *StatusNormalizer
	logger     *slog.Logger
}

// NewAnomalyDetector creates a detector backed by the given store and normalizer.
func NewAnomalyDetector(store *Store, normalizer *StatusNormalizer, logger *slog.Logger) *AnomalyDetector {
	return &AnomalyDetector{
		store:      store,
		normalizer: normalizer,
		logger:     logger,
	}
}

// CheckTransition evaluates a status transition against all active anomaly
// rules for the tenant. Returns any detected anomalies (may be empty).
func (ad *AnomalyDetector) CheckTransition(ctx context.Context, tenantID, brokerID, affiliateID, leadID, oldStatus, newStatus string) ([]models.StatusAnomaly, error) {
	rules, err := ad.store.ListAnomalyRules(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list anomaly rules: %w", err)
	}

	var anomalies []models.StatusAnomaly

	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}

		var triggered bool
		var details string

		switch rule.RuleType {
		case "regression":
			triggered, details = ad.checkRegression(oldStatus, newStatus)
		case "velocity":
			triggered, details = ad.checkVelocity(ctx, brokerID, rule)
		case "stuck":
			// Stuck is checked by CheckStaleLeads, not per-transition.
			continue
		case "pattern":
			triggered, details = ad.checkPattern(ctx, tenantID, brokerID, affiliateID, rule)
		default:
			ad.logger.Warn("unknown anomaly rule type", "rule_type", rule.RuleType, "rule_id", rule.ID)
			continue
		}

		if triggered {
			anomaly := models.StatusAnomaly{
				TenantID:    tenantID,
				RuleID:      rule.ID,
				BrokerID:    brokerID,
				AffiliateID: affiliateID,
				LeadID:      leadID,
				AnomalyType: rule.RuleType,
				Details:     details,
				Severity:    rule.Severity,
				Resolved:    false,
				DetectedAt:  time.Now().UTC(),
			}

			if err := ad.store.CreateAnomaly(ctx, &anomaly); err != nil {
				ad.logger.Error("failed to create anomaly record",
					"rule_id", rule.ID,
					"lead_id", leadID,
					"error", err,
				)
				continue
			}

			anomalies = append(anomalies, anomaly)

			ad.logger.Warn("anomaly detected",
				"type", rule.RuleType,
				"severity", rule.Severity,
				"lead_id", leadID,
				"broker_id", brokerID,
				"details", details,
			)
		}
	}

	return anomalies, nil
}

// checkRegression checks if the status transition is a regression (shave).
func (ad *AnomalyDetector) checkRegression(oldStatus, newStatus string) (bool, string) {
	isShave, oldRank, newRank := ad.normalizer.DetectShaveEnhanced(oldStatus, newStatus)
	if isShave {
		return true, fmt.Sprintf("status regression from %s (rank %d) to %s (rank %d)",
			oldStatus, oldRank, newStatus, newRank)
	}
	return false, ""
}

// checkVelocity checks if the broker has an unusually high number of status
// changes in a recent time window.
func (ad *AnomalyDetector) checkVelocity(ctx context.Context, brokerID string, rule StatusAnomalyRule) (bool, string) {
	minutes := 60 // default window
	threshold := 100

	if rule.Conditions != nil {
		var cond struct {
			WindowMinutes int `json:"window_minutes"`
			Threshold     int `json:"threshold"`
		}
		if json.Unmarshal(rule.Conditions, &cond) == nil {
			if cond.WindowMinutes > 0 {
				minutes = cond.WindowMinutes
			}
			if cond.Threshold > 0 {
				threshold = cond.Threshold
			}
		}
	}

	count, err := ad.store.CountStatusChanges(ctx, brokerID, minutes)
	if err != nil {
		ad.logger.Error("failed to count status changes for velocity check",
			"broker_id", brokerID,
			"error", err,
		)
		return false, ""
	}

	if count >= threshold {
		return true, fmt.Sprintf("broker %s had %d status changes in last %d minutes (threshold: %d)",
			brokerID, count, minutes, threshold)
	}
	return false, ""
}

// checkPattern checks the rejection rate for a broker-affiliate combination.
func (ad *AnomalyDetector) checkPattern(ctx context.Context, tenantID, brokerID, affiliateID string, rule StatusAnomalyRule) (bool, string) {
	lastN := 50
	maxRate := 0.8

	if rule.Conditions != nil {
		var cond struct {
			LastN   int     `json:"last_n"`
			MaxRate float64 `json:"max_rejection_rate"`
		}
		if json.Unmarshal(rule.Conditions, &cond) == nil {
			if cond.LastN > 0 {
				lastN = cond.LastN
			}
			if cond.MaxRate > 0 {
				maxRate = cond.MaxRate
			}
		}
	}

	rate, err := ad.store.GetBrokerRejectionRate(ctx, tenantID, brokerID, affiliateID, lastN)
	if err != nil {
		ad.logger.Error("failed to get rejection rate for pattern check",
			"broker_id", brokerID,
			"affiliate_id", affiliateID,
			"error", err,
		)
		return false, ""
	}

	if rate >= maxRate {
		return true, fmt.Sprintf("rejection rate %.1f%% for broker %s + affiliate %s over last %d leads (threshold: %.1f%%)",
			rate*100, brokerID, affiliateID, lastN, maxRate*100)
	}
	return false, ""
}

// CheckStaleLeads finds leads stuck in non-terminal statuses for too long
// and creates anomaly records for each.
func (ad *AnomalyDetector) CheckStaleLeads(ctx context.Context, tenantID string, thresholdHours int) ([]models.StatusAnomaly, error) {
	staleLeads, err := ad.store.GetStaleLeads(ctx, tenantID, thresholdHours)
	if err != nil {
		return nil, fmt.Errorf("get stale leads: %w", err)
	}

	var anomalies []models.StatusAnomaly
	for _, sl := range staleLeads {
		anomaly := models.StatusAnomaly{
			TenantID:    tenantID,
			BrokerID:    sl.BrokerID,
			LeadID:      sl.LeadID,
			AnomalyType: "stuck",
			Details:     fmt.Sprintf("lead stuck in status %q for %.1f hours", sl.Status, sl.HoursStale),
			Severity:    "medium",
			Resolved:    false,
			DetectedAt:  time.Now().UTC(),
		}

		if err := ad.store.CreateAnomaly(ctx, &anomaly); err != nil {
			ad.logger.Error("failed to create stale lead anomaly",
				"lead_id", sl.LeadID,
				"error", err,
			)
			continue
		}

		anomalies = append(anomalies, anomaly)
	}

	return anomalies, nil
}
