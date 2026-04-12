package main

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
)

// VelocityViolation describes a triggered velocity rule.
type VelocityViolation struct {
	RuleID    string `json:"rule_id"`
	RuleName  string `json:"rule_name"`
	Dimension string `json:"dimension"`
	Count     int64  `json:"count"`
	MaxCount  int    `json:"max_count"`
	Action    string `json:"action"`
}

// VelocityEngine evaluates configurable velocity rules against Redis sliding windows.
type VelocityEngine struct {
	redis  *cache.Redis
	store  *Store
	logger *slog.Logger
}

// NewVelocityEngine creates a new VelocityEngine.
func NewVelocityEngine(redis *cache.Redis, store *Store, logger *slog.Logger) *VelocityEngine {
	return &VelocityEngine{
		redis:  redis,
		store:  store,
		logger: logger,
	}
}

// EvaluateRules loads active velocity rules for a tenant and checks each against Redis counters.
// Returns a list of triggered rules (violations).
func (ve *VelocityEngine) EvaluateRules(ctx context.Context, tenantID string, req *CheckRequest) ([]VelocityViolation, error) {
	rules, err := ve.store.ListVelocityRules(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("load velocity rules: %w", err)
	}

	var violations []VelocityViolation

	for _, rule := range rules {
		if !rule.IsActive {
			continue
		}

		// Determine the key value based on dimension
		keyValue := ve.extractDimensionValue(req, rule.Dimension)
		if keyValue == "" {
			continue
		}

		// Build Redis key
		redisKey := fmt.Sprintf("fraud:velocity:%s:%s:%s", tenantID, rule.Dimension, strings.ToLower(keyValue))
		ttl := time.Duration(rule.TimeWindowSeconds) * time.Second

		count, err := ve.redis.IncrWithExpiry(ctx, redisKey, ttl)
		if err != nil {
			ve.logger.Warn("velocity rule redis error",
				"rule_id", rule.ID,
				"error", err,
			)
			continue
		}

		if int(count) > rule.MaxCount {
			violations = append(violations, VelocityViolation{
				RuleID:    rule.ID,
				RuleName:  rule.Name,
				Dimension: rule.Dimension,
				Count:     count,
				MaxCount:  rule.MaxCount,
				Action:    rule.Action,
			})

			ve.logger.Info("velocity rule triggered",
				"rule_id", rule.ID,
				"rule_name", rule.Name,
				"dimension", rule.Dimension,
				"count", count,
				"max_count", rule.MaxCount,
				"tenant_id", tenantID,
			)
		}
	}

	return violations, nil
}

// extractDimensionValue gets the appropriate value from the request based on the rule dimension.
func (ve *VelocityEngine) extractDimensionValue(req *CheckRequest, dimension string) string {
	switch dimension {
	case "ip":
		return req.IP
	case "email_domain":
		parts := strings.SplitN(req.Email, "@", 2)
		if len(parts) == 2 {
			return parts[1]
		}
		return ""
	case "phone_prefix":
		if len(req.PhoneE164) >= 5 {
			return req.PhoneE164[:5]
		}
		return req.PhoneE164
	case "affiliate":
		return req.AffiliateID
	case "geo":
		return req.Country
	case "email":
		return req.Email
	case "phone":
		return req.PhoneE164
	default:
		return ""
	}
}
