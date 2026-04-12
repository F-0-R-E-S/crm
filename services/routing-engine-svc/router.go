package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/models"
)

type Router struct {
	store  *Store
	redis  *cache.Redis
	logger *slog.Logger
}

func NewRouter(store *Store, redis *cache.Redis, logger *slog.Logger) *Router {
	return &Router{store: store, redis: redis, logger: logger}
}

type RuleConditions struct {
	Countries  []string `json:"countries,omitempty"`
	Affiliates []string `json:"affiliates,omitempty"`
	MinScore   int      `json:"min_score,omitempty"`
	MaxScore   int      `json:"max_score,omitempty"`
}

type BrokerTarget struct {
	BrokerID string `json:"broker_id"`
	Weight   int    `json:"weight"`
}

func (rt *Router) Route(ctx context.Context, lead *models.Lead) (*models.RoutingDecision, error) {
	rules, err := rt.store.GetActiveRules(ctx, lead.TenantID)
	if err != nil {
		return nil, fmt.Errorf("get rules: %w", err)
	}

	start := time.Now()

	for _, rule := range rules {
		if !rt.matchConditions(rule, lead) {
			continue
		}

		// Check rule-level daily cap
		if rule.DailyCap > 0 {
			used, err := rt.getDailyCap(ctx, "rule", rule.ID, "")
			if err != nil {
				rt.logger.Warn("cap check error", "rule", rule.ID, "error", err)
				continue
			}
			if used >= int64(rule.DailyCap) {
				continue
			}
		}

		// Country cap on rule
		if lead.Country != "" && rule.CountryCaps != nil {
			countryCaps := make(map[string]int)
			json.Unmarshal(rule.CountryCaps, &countryCaps)
			if cap, ok := countryCaps[lead.Country]; ok && cap > 0 {
				used, _ := rt.getDailyCap(ctx, "rule", rule.ID, lead.Country)
				if used >= int64(cap) {
					continue
				}
			}
		}

		// Parse broker targets
		var targets []BrokerTarget
		if err := json.Unmarshal(rule.BrokerTargets, &targets); err != nil {
			rt.logger.Warn("parse targets", "rule", rule.ID, "error", err)
			continue
		}

		// Select broker based on algorithm
		brokerID, waterfall, err := rt.selectBroker(ctx, lead, rule.Algorithm, targets)
		if err != nil || brokerID == "" {
			continue
		}

		// Increment caps
		rt.incrementDailyCap(ctx, "rule", rule.ID, "")
		if lead.Country != "" {
			rt.incrementDailyCap(ctx, "rule", rule.ID, lead.Country)
		}
		rt.incrementDailyCap(ctx, "broker", brokerID, "")
		if lead.Country != "" {
			rt.incrementDailyCap(ctx, "broker", brokerID, lead.Country)
		}

		return &models.RoutingDecision{
			LeadID:    lead.ID,
			RuleID:    rule.ID,
			BrokerID:  brokerID,
			Algorithm: rule.Algorithm,
			Waterfall: waterfall,
			Reason:    fmt.Sprintf("matched rule %q (priority %d)", rule.Name, rule.Priority),
			DecidedAt: time.Now(),
			LatencyMs: time.Since(start).Milliseconds(),
		}, nil
	}

	return nil, fmt.Errorf("no matching rule found for lead %s", lead.ID)
}

func (rt *Router) matchConditions(rule *models.DistributionRule, lead *models.Lead) bool {
	if rule.Conditions == nil || string(rule.Conditions) == "{}" {
		return true
	}

	var cond RuleConditions
	if err := json.Unmarshal(rule.Conditions, &cond); err != nil {
		return false
	}

	if len(cond.Countries) > 0 {
		found := false
		for _, c := range cond.Countries {
			if strings.EqualFold(c, lead.Country) {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	if len(cond.Affiliates) > 0 {
		found := false
		for _, a := range cond.Affiliates {
			if a == lead.AffiliateID {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	if cond.MinScore > 0 && lead.QualityScore < cond.MinScore {
		return false
	}
	if cond.MaxScore > 0 && lead.QualityScore > cond.MaxScore {
		return false
	}

	return true
}

func (rt *Router) selectBroker(ctx context.Context, lead *models.Lead, algorithm string, targets []BrokerTarget) (string, []string, error) {
	switch algorithm {
	case "priority":
		return rt.prioritySelect(ctx, lead, targets)
	case "weighted_round_robin":
		return rt.weightedRoundRobin(ctx, lead, targets)
	default:
		return rt.weightedRoundRobin(ctx, lead, targets)
	}
}

func (rt *Router) weightedRoundRobin(ctx context.Context, lead *models.Lead, targets []BrokerTarget) (string, []string, error) {
	// Filter out brokers that are over cap
	var available []BrokerTarget
	var waterfall []string

	for _, t := range targets {
		waterfall = append(waterfall, t.BrokerID)
		broker, err := rt.store.GetBroker(ctx, t.BrokerID)
		if err != nil || broker == nil || broker.Status != models.BrokerStatusActive {
			continue
		}

		if broker.DailyCap > 0 {
			used, _ := rt.getDailyCap(ctx, "broker", broker.ID, "")
			if used >= int64(broker.DailyCap) {
				continue
			}
		}

		if lead.Country != "" && broker.CountryCaps != nil {
			countryCaps := make(map[string]int)
			json.Unmarshal(broker.CountryCaps, &countryCaps)
			if cap, ok := countryCaps[lead.Country]; ok && cap > 0 {
				used, _ := rt.getDailyCap(ctx, "broker", broker.ID, lead.Country)
				if used >= int64(cap) {
					continue
				}
			}
		}

		available = append(available, t)
	}

	if len(available) == 0 {
		return "", waterfall, fmt.Errorf("no available brokers")
	}

	// Weighted random selection
	totalWeight := 0
	for _, t := range available {
		totalWeight += t.Weight
	}

	r := rand.Intn(totalWeight)
	cumulative := 0
	for _, t := range available {
		cumulative += t.Weight
		if r < cumulative {
			return t.BrokerID, waterfall, nil
		}
	}

	return available[0].BrokerID, waterfall, nil
}

func (rt *Router) prioritySelect(ctx context.Context, lead *models.Lead, targets []BrokerTarget) (string, []string, error) {
	var waterfall []string
	for _, t := range targets {
		waterfall = append(waterfall, t.BrokerID)
		broker, err := rt.store.GetBroker(ctx, t.BrokerID)
		if err != nil || broker == nil || broker.Status != models.BrokerStatusActive {
			continue
		}
		if broker.DailyCap > 0 {
			used, _ := rt.getDailyCap(ctx, "broker", broker.ID, "")
			if used >= int64(broker.DailyCap) {
				continue
			}
		}
		return t.BrokerID, waterfall, nil
	}
	return "", waterfall, fmt.Errorf("no available brokers")
}

// Redis-backed daily caps with automatic midnight reset (UTC).
func (rt *Router) getDailyCap(ctx context.Context, entityType, entityID, country string) (int64, error) {
	key := rt.capKey(entityType, entityID, country)
	val, err := rt.redis.Get(ctx, key)
	if err != nil {
		return 0, nil // treat as 0 if missing
	}
	var n int64
	fmt.Sscanf(val, "%d", &n)
	return n, nil
}

func (rt *Router) incrementDailyCap(ctx context.Context, entityType, entityID, country string) {
	key := rt.capKey(entityType, entityID, country)
	// TTL until end of day UTC
	now := time.Now().UTC()
	endOfDay := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, time.UTC)
	ttl := endOfDay.Sub(now)
	rt.redis.IncrWithExpiry(ctx, key, ttl)
}

func (rt *Router) capKey(entityType, entityID, country string) string {
	date := time.Now().UTC().Format("2006-01-02")
	if country != "" {
		return fmt.Sprintf("cap:%s:%s:%s:%s", entityType, entityID, country, date)
	}
	return fmt.Sprintf("cap:%s:%s:%s", entityType, entityID, date)
}
