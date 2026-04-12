package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"sort"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/messaging"
)

type Optimizer struct {
	store  *Store
	redis  *cache.Redis
	nats   *messaging.NATSClient
	logger *slog.Logger
}

func NewOptimizer(store *Store, redis *cache.Redis, nats *messaging.NATSClient, logger *slog.Logger) *Optimizer {
	return &Optimizer{store: store, redis: redis, nats: nats, logger: logger}
}

// ---------------------------------------------------------------------------
// Weight Recommendations
// ---------------------------------------------------------------------------

type WeightRecommendation struct {
	BrokerID       string  `json:"broker_id"`
	BrokerName     string  `json:"broker_name"`
	CurrentWeight  int     `json:"current_weight"`
	RecommendedWeight int  `json:"recommended_weight"`
	Reason         string  `json:"reason"`
	ConversionRate float64 `json:"conversion_rate"`
	Confidence     float64 `json:"confidence"` // 0-1
}

type CapPrediction struct {
	BrokerID        string    `json:"broker_id"`
	BrokerName      string    `json:"broker_name"`
	DailyCap        int       `json:"daily_cap"`
	CurrentUsed     int       `json:"current_used"`
	VelocityPerHour float64   `json:"velocity_per_hour"`
	PredictedExhaustAt *time.Time `json:"predicted_exhaust_at,omitempty"`
	HoursRemaining  float64   `json:"hours_remaining"`
	Confidence      float64   `json:"confidence"`
}

// GenerateWeightRecommendations analyzes broker conversion rates and recommends
// optimal weight distribution for routing rules.
func (o *Optimizer) GenerateWeightRecommendations(ctx context.Context, tenantID string) ([]WeightRecommendation, error) {
	since := time.Now().Add(-7 * 24 * time.Hour)
	stats, err := o.store.GetBrokerStats(ctx, tenantID, since)
	if err != nil {
		return nil, fmt.Errorf("get broker stats: %w", err)
	}

	if len(stats) == 0 {
		return nil, nil
	}

	// Calculate optimal weights based on conversion rate
	type scored struct {
		stats  *BrokerStats
		score  float64
		weight int
	}

	var items []scored
	totalScore := 0.0

	for _, s := range stats {
		// Score combines conversion rate (70%) and reliability (30%)
		reliability := 1.0
		if s.TotalLeads > 0 {
			reliability = 1.0 - (float64(s.Rejected) / float64(s.TotalLeads))
		}
		score := s.ConversionRate*0.7 + reliability*100*0.3

		// Penalize slow brokers
		if s.AvgResponseMs > 5000 {
			score *= 0.8
		}

		if score < 0 {
			score = 0
		}
		totalScore += score
		items = append(items, scored{stats: s, score: score})
	}

	// Normalize to weights (1-1000 range)
	var recs []WeightRecommendation
	for _, item := range items {
		weight := 1
		if totalScore > 0 {
			weight = int(math.Round(item.score / totalScore * 1000))
		}
		if weight < 1 {
			weight = 1
		}

		confidence := 0.0
		if item.stats.TotalLeads >= 100 {
			confidence = 0.9
		} else if item.stats.TotalLeads >= 30 {
			confidence = 0.7
		} else if item.stats.TotalLeads >= 10 {
			confidence = 0.5
		} else {
			confidence = 0.3
		}

		reason := fmt.Sprintf("CR=%.1f%%, reliability=%.0f%%, leads=%d",
			item.stats.ConversionRate,
			(1.0-float64(item.stats.Rejected)/math.Max(float64(item.stats.TotalLeads), 1))*100,
			item.stats.TotalLeads)

		recs = append(recs, WeightRecommendation{
			BrokerID:          item.stats.BrokerID,
			BrokerName:        item.stats.BrokerName,
			RecommendedWeight: weight,
			Reason:            reason,
			ConversionRate:    item.stats.ConversionRate,
			Confidence:        confidence,
		})
	}

	sort.Slice(recs, func(i, j int) bool {
		return recs[i].RecommendedWeight > recs[j].RecommendedWeight
	})

	return recs, nil
}

// ---------------------------------------------------------------------------
// Cap Exhaustion Prediction
// ---------------------------------------------------------------------------

// PredictCapExhaustion estimates when each broker will hit its daily cap.
func (o *Optimizer) PredictCapExhaustion(ctx context.Context, tenantID string) ([]CapPrediction, error) {
	brokers, err := o.store.GetActiveBrokersForTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("get active brokers: %w", err)
	}

	var predictions []CapPrediction

	for _, broker := range brokers {
		if broker.DailyCap <= 0 {
			continue
		}

		// Get current cap usage from Redis
		date := time.Now().UTC().Format("2006-01-02")
		capKey := fmt.Sprintf("cap:broker:%s:%s", broker.ID, date)
		usedStr, _ := o.redis.Get(ctx, capKey)
		var used int
		fmt.Sscanf(usedStr, "%d", &used)

		// Calculate velocity (leads per hour over last 4 hours)
		velocity, _ := o.store.GetCapVelocity(ctx, broker.ID, 4)

		pred := CapPrediction{
			BrokerID:        broker.ID,
			BrokerName:      broker.Name,
			DailyCap:        broker.DailyCap,
			CurrentUsed:     used,
			VelocityPerHour: math.Round(velocity*10) / 10,
		}

		remaining := broker.DailyCap - used
		if velocity > 0 && remaining > 0 {
			hoursLeft := float64(remaining) / velocity
			pred.HoursRemaining = math.Round(hoursLeft*10) / 10
			exhaustAt := time.Now().Add(time.Duration(hoursLeft * float64(time.Hour)))
			pred.PredictedExhaustAt = &exhaustAt
			pred.Confidence = math.Min(0.95, 0.5+velocity/100)
		} else if remaining <= 0 {
			pred.HoursRemaining = 0
			now := time.Now()
			pred.PredictedExhaustAt = &now
			pred.Confidence = 1.0
		} else {
			pred.HoursRemaining = -1 // no velocity data
			pred.Confidence = 0.1
		}

		predictions = append(predictions, pred)
	}

	sort.Slice(predictions, func(i, j int) bool {
		return predictions[i].HoursRemaining < predictions[j].HoursRemaining
	})

	return predictions, nil
}

// ---------------------------------------------------------------------------
// Auto-Failover
// ---------------------------------------------------------------------------

// CheckAndFailover monitors broker health and triggers automatic failover.
func (o *Optimizer) CheckAndFailover(ctx context.Context) {
	// Get all tenants with active rules (simplified: scan distribution_rules)
	rows, err := o.store.db.Pool.Query(ctx,
		`SELECT DISTINCT tenant_id FROM distribution_rules WHERE is_active = true`,
	)
	if err != nil {
		o.logger.Error("failover: get tenants failed", "error", err)
		return
	}
	defer rows.Close()

	var tenantIDs []string
	for rows.Next() {
		var tid string
		rows.Scan(&tid)
		tenantIDs = append(tenantIDs, tid)
	}

	since := time.Now().Add(-1 * time.Hour)

	for _, tenantID := range tenantIDs {
		stats, err := o.store.GetBrokerStats(ctx, tenantID, since)
		if err != nil {
			continue
		}

		for _, s := range stats {
			if s.TotalLeads < 10 {
				continue
			}

			errorRate := float64(s.Rejected) / float64(s.TotalLeads)

			if errorRate > 0.20 {
				alertKey := fmt.Sprintf("failover:alert:%s:%s", s.BrokerID, time.Now().UTC().Format("2006-01-02-15"))
				acquired, _ := o.redis.SetNX(ctx, alertKey, "1", 1*time.Hour)
				if !acquired {
					continue
				}

				o.logger.Warn("broker degradation detected — failover recommended",
					"broker_id", s.BrokerID,
					"broker_name", s.BrokerName,
					"error_rate", fmt.Sprintf("%.1f%%", errorRate*100),
					"total_leads", s.TotalLeads,
					"rejected", s.Rejected,
				)

				_ = o.nats.Publish(ctx, "broker.integration.health_changed", "smart-routing-svc", map[string]interface{}{
					"broker_id":   s.BrokerID,
					"broker_name": s.BrokerName,
					"tenant_id":   s.TenantID,
					"error_rate":  errorRate,
					"action":      "failover_recommended",
					"reason":      fmt.Sprintf("error rate %.1f%% exceeds 20%% threshold", errorRate*100),
				})
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Background optimization loop
// ---------------------------------------------------------------------------

// RunOptimizationLoop periodically runs weight recommendations and cap predictions.
func (o *Optimizer) RunOptimizationLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			o.CheckAndFailover(ctx)
			o.cacheRecommendations(ctx)
		}
	}
}

func (o *Optimizer) cacheRecommendations(ctx context.Context) {
	rows, err := o.store.db.Pool.Query(ctx,
		`SELECT DISTINCT tenant_id FROM distribution_rules WHERE is_active = true`,
	)
	if err != nil {
		return
	}
	defer rows.Close()

	var tenantIDs []string
	for rows.Next() {
		var tid string
		rows.Scan(&tid)
		tenantIDs = append(tenantIDs, tid)
	}

	for _, tenantID := range tenantIDs {
		recs, err := o.GenerateWeightRecommendations(ctx, tenantID)
		if err != nil || len(recs) == 0 {
			continue
		}

		data, _ := json.Marshal(recs)
		cacheKey := fmt.Sprintf("smart:weights:%s", tenantID)
		_ = o.redis.Set(ctx, cacheKey, string(data), 10*time.Minute)

		preds, err := o.PredictCapExhaustion(ctx, tenantID)
		if err != nil || len(preds) == 0 {
			continue
		}

		predData, _ := json.Marshal(preds)
		predKey := fmt.Sprintf("smart:caps:%s", tenantID)
		_ = o.redis.Set(ctx, predKey, string(predData), 5*time.Minute)

		// Alert on imminent cap exhaustion (< 2 hours)
		for _, p := range preds {
			if p.HoursRemaining >= 0 && p.HoursRemaining < 2 && p.Confidence >= 0.6 {
				alertKey := fmt.Sprintf("smart:cap-alert:%s:%s", p.BrokerID, time.Now().UTC().Format("2006-01-02-15"))
				acquired, _ := o.redis.SetNX(ctx, alertKey, "1", 1*time.Hour)
				if acquired {
					o.logger.Warn("cap exhaustion imminent",
						"broker_id", p.BrokerID,
						"hours_remaining", p.HoursRemaining,
						"velocity", p.VelocityPerHour,
					)
					_ = o.nats.Publish(ctx, "cap.threshold.80pct", "smart-routing-svc", map[string]interface{}{
						"broker_id":       p.BrokerID,
						"broker_name":     p.BrokerName,
						"tenant_id":       tenantID,
						"hours_remaining": p.HoursRemaining,
						"velocity":        p.VelocityPerHour,
						"cap":             p.DailyCap,
						"used":            p.CurrentUsed,
					})
				}
			}
		}
	}
}
