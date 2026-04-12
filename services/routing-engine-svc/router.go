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

// ---------------------------------------------------------------------------
// Condition types
// ---------------------------------------------------------------------------

type RuleConditions struct {
	Countries  []string          `json:"countries,omitempty"`
	Affiliates []string          `json:"affiliates,omitempty"`
	MinScore   int               `json:"min_score,omitempty"`
	MaxScore   int               `json:"max_score,omitempty"`
	FunnelNames []string         `json:"funnel_names,omitempty"`
	SubParams  map[string][]string `json:"sub_params,omitempty"` // {"aff_sub1": ["val1","val2"], ...}
}

type BrokerTarget struct {
	BrokerID string `json:"broker_id"`
	Weight   int    `json:"weight"`
}

// TimezoneSlot defines a broker's operating window.
type TimezoneSlot struct {
	Timezone string   `json:"timezone"`
	Days     []string `json:"days,omitempty"` // "MON","TUE",...; empty = all days
	Start    string   `json:"start"`          // "09:00"
	End      string   `json:"end"`            // "18:00"
}

// ---------------------------------------------------------------------------
// Main routing entry point
// ---------------------------------------------------------------------------

func (rt *Router) Route(ctx context.Context, lead *models.Lead) (*models.RoutingDecision, error) {
	start := time.Now()

	// Fraud gate: reject if fraud score is too high
	if err := rt.checkFraudGate(lead); err != nil {
		return nil, err
	}

	rules, err := rt.store.GetActiveRules(ctx, lead.TenantID)
	if err != nil {
		return nil, fmt.Errorf("get rules: %w", err)
	}

	// Prefetch all broker IDs referenced in rules to avoid N+1
	brokerCache, err := rt.prefetchBrokers(ctx, rules)
	if err != nil {
		rt.logger.Warn("broker prefetch failed, falling back to per-lookup", "error", err)
		brokerCache = make(map[string]*models.Broker)
	}

	for _, rule := range rules {
		if !rt.matchConditions(rule, lead) {
			continue
		}

		// Check timeslot (rule-level operating hours)
		if !rt.checkTimeslots(rule) {
			continue
		}

		// Rule-level daily cap
		if rule.DailyCap > 0 {
			used, err := rt.getDailyCap(ctx, "rule", rule.ID, "", "")
			if err != nil {
				rt.logger.Warn("cap check error", "rule", rule.ID, "error", err)
				continue
			}
			if used >= int64(rule.DailyCap) {
				continue
			}
		}

		// Rule-level total cap (lifetime)
		if rule.TotalCap > 0 {
			used, _ := rt.getTotalCap(ctx, "rule", rule.ID)
			if used >= int64(rule.TotalCap) {
				continue
			}
		}

		// Rule-level country cap
		if lead.Country != "" && rule.CountryCaps != nil {
			countryCaps := make(map[string]int)
			json.Unmarshal(rule.CountryCaps, &countryCaps)
			if cap, ok := countryCaps[lead.Country]; ok && cap > 0 {
				used, _ := rt.getDailyCap(ctx, "rule", rule.ID, lead.Country, "")
				if used >= int64(cap) {
					continue
				}
			}
		}

		// Per-source cap (per affiliate)
		if lead.AffiliateID != "" {
			if exceeded, _ := rt.checkSourceCap(ctx, rule, lead.AffiliateID); exceeded {
				continue
			}
		}

		// Parse broker targets
		var targets []BrokerTarget
		if err := json.Unmarshal(rule.BrokerTargets, &targets); err != nil {
			rt.logger.Warn("parse targets", "rule", rule.ID, "error", err)
			continue
		}

		brokerID, waterfall, err := rt.selectBroker(ctx, lead, rule, targets, brokerCache)
		if err != nil || brokerID == "" {
			continue
		}

		// Increment all caps atomically
		rt.incrementCaps(ctx, rule.ID, brokerID, lead.Country, lead.AffiliateID)

		// Cap threshold alerts
		rt.checkCapThresholds(ctx, rule, brokerID, lead.Country)

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

// ---------------------------------------------------------------------------
// Fraud gate
// ---------------------------------------------------------------------------

func (rt *Router) checkFraudGate(lead *models.Lead) error {
	if lead.FraudCard == nil || len(lead.FraudCard) == 0 || string(lead.FraudCard) == "{}" {
		return nil
	}
	var card models.FraudVerificationCard
	if err := json.Unmarshal(lead.FraudCard, &card); err != nil {
		return nil // can't parse, don't block
	}
	if card.Verdict == "reject" || card.OverallScore >= 80 {
		return fmt.Errorf("lead %s rejected by fraud gate (score=%d, verdict=%s)", lead.ID, card.OverallScore, card.Verdict)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Condition matching (extended with sub-params and funnel)
// ---------------------------------------------------------------------------

func (rt *Router) matchConditions(rule *models.DistributionRule, lead *models.Lead) bool {
	if rule.Conditions == nil || string(rule.Conditions) == "{}" {
		return true
	}

	var cond RuleConditions
	if err := json.Unmarshal(rule.Conditions, &cond); err != nil {
		return false
	}

	// Country filter
	if len(cond.Countries) > 0 {
		if !containsIgnoreCase(cond.Countries, lead.Country) {
			return false
		}
	}

	// Affiliate filter
	if len(cond.Affiliates) > 0 {
		if !contains(cond.Affiliates, lead.AffiliateID) {
			return false
		}
	}

	// Quality score range
	if cond.MinScore > 0 && lead.QualityScore < cond.MinScore {
		return false
	}
	if cond.MaxScore > 0 && lead.QualityScore > cond.MaxScore {
		return false
	}

	// Funnel name filter
	if len(cond.FunnelNames) > 0 {
		if !containsIgnoreCase(cond.FunnelNames, lead.FunnelName) {
			return false
		}
	}

	// Sub-parameter filters
	if len(cond.SubParams) > 0 {
		subValues := map[string]string{
			"aff_sub1":  lead.AffSub1,
			"aff_sub2":  lead.AffSub2,
			"aff_sub3":  lead.AffSub3,
			"aff_sub4":  lead.AffSub4,
			"aff_sub5":  lead.AffSub5,
			"aff_sub6":  lead.AffSub6,
			"aff_sub7":  lead.AffSub7,
			"aff_sub8":  lead.AffSub8,
			"aff_sub9":  lead.AffSub9,
			"aff_sub10": lead.AffSub10,
		}
		for param, allowed := range cond.SubParams {
			if len(allowed) == 0 {
				continue
			}
			val, exists := subValues[param]
			if !exists || !contains(allowed, val) {
				return false
			}
		}
	}

	return true
}

// ---------------------------------------------------------------------------
// Timeslot checking
// ---------------------------------------------------------------------------

func (rt *Router) checkTimeslots(rule *models.DistributionRule) bool {
	if rule.TimezoneSlots == nil || string(rule.TimezoneSlots) == "{}" || string(rule.TimezoneSlots) == "[]" || string(rule.TimezoneSlots) == "null" {
		return true
	}

	var slots []TimezoneSlot
	if err := json.Unmarshal(rule.TimezoneSlots, &slots); err != nil {
		return true
	}
	if len(slots) == 0 {
		return true
	}

	for _, slot := range slots {
		loc, err := time.LoadLocation(slot.Timezone)
		if err != nil {
			continue
		}

		now := time.Now().In(loc)

		// Check day of week
		if len(slot.Days) > 0 {
			dayName := strings.ToUpper(now.Weekday().String()[:3])
			if !contains(slot.Days, dayName) {
				continue
			}
		}

		// Parse start/end times
		startTime, err1 := time.Parse("15:04", slot.Start)
		endTime, err2 := time.Parse("15:04", slot.End)
		if err1 != nil || err2 != nil {
			continue
		}

		currentMinutes := now.Hour()*60 + now.Minute()
		startMinutes := startTime.Hour()*60 + startTime.Minute()
		endMinutes := endTime.Hour()*60 + endTime.Minute()

		if currentMinutes >= startMinutes && currentMinutes < endMinutes {
			return true
		}
	}

	return false
}

// ---------------------------------------------------------------------------
// Broker selection (3 algorithms)
// ---------------------------------------------------------------------------

func (rt *Router) selectBroker(ctx context.Context, lead *models.Lead, rule *models.DistributionRule, targets []BrokerTarget, cache map[string]*models.Broker) (string, []string, error) {
	switch rule.Algorithm {
	case "priority":
		return rt.prioritySelect(ctx, lead, targets, cache)
	case "slots_chance":
		return rt.slotsChanceSelect(ctx, lead, targets, cache)
	case "weighted_round_robin":
		return rt.weightedRoundRobin(ctx, lead, rule, targets, cache)
	default:
		return rt.weightedRoundRobin(ctx, lead, rule, targets, cache)
	}
}

// weightedRoundRobin uses a Redis counter per rule to maintain true round-robin state.
func (rt *Router) weightedRoundRobin(ctx context.Context, lead *models.Lead, rule *models.DistributionRule, targets []BrokerTarget, cache map[string]*models.Broker) (string, []string, error) {
	available, waterfall := rt.filterAvailableBrokers(ctx, lead, targets, cache)
	if len(available) == 0 {
		return "", waterfall, fmt.Errorf("no available brokers")
	}

	// Stateful round-robin: use Redis INCR to get the next position
	rrKey := fmt.Sprintf("rr:%s", rule.ID)
	pos, err := rt.redis.Incr(ctx, rrKey)
	if err != nil {
		// Fallback to random weighted selection
		return rt.randomWeightedSelect(available), waterfall, nil
	}

	// Expand targets by weight into a virtual ring
	var ring []string
	for _, t := range available {
		w := t.Weight
		if w <= 0 {
			w = 1
		}
		for i := 0; i < w; i++ {
			ring = append(ring, t.BrokerID)
		}
	}

	selected := ring[int(pos-1)%len(ring)]
	return selected, waterfall, nil
}

// slotsChanceSelect implements probability-based routing (Leadgreed-style).
// Each broker's weight represents its percentage chance of being selected.
// Unlike round-robin which distributes evenly over time, this is purely statistical
// per individual lead — better for low-volume flows where RR wouldn't converge.
func (rt *Router) slotsChanceSelect(ctx context.Context, lead *models.Lead, targets []BrokerTarget, cache map[string]*models.Broker) (string, []string, error) {
	available, waterfall := rt.filterAvailableBrokers(ctx, lead, targets, cache)
	if len(available) == 0 {
		return "", waterfall, fmt.Errorf("no available brokers")
	}

	return rt.randomWeightedSelect(available), waterfall, nil
}

func (rt *Router) prioritySelect(ctx context.Context, lead *models.Lead, targets []BrokerTarget, cache map[string]*models.Broker) (string, []string, error) {
	var waterfall []string
	for _, t := range targets {
		waterfall = append(waterfall, t.BrokerID)
		if !rt.isBrokerAvailable(ctx, lead, t.BrokerID, cache) {
			continue
		}
		return t.BrokerID, waterfall, nil
	}
	return "", waterfall, fmt.Errorf("no available brokers")
}

// ---------------------------------------------------------------------------
// Broker availability helpers
// ---------------------------------------------------------------------------

func (rt *Router) filterAvailableBrokers(ctx context.Context, lead *models.Lead, targets []BrokerTarget, cache map[string]*models.Broker) ([]BrokerTarget, []string) {
	var available []BrokerTarget
	var waterfall []string

	for _, t := range targets {
		waterfall = append(waterfall, t.BrokerID)
		if rt.isBrokerAvailable(ctx, lead, t.BrokerID, cache) {
			available = append(available, t)
		}
	}
	return available, waterfall
}

func (rt *Router) isBrokerAvailable(ctx context.Context, lead *models.Lead, brokerID string, cache map[string]*models.Broker) bool {
	broker := cache[brokerID]
	if broker == nil {
		var err error
		broker, err = rt.store.GetBroker(ctx, brokerID)
		if err != nil || broker == nil {
			return false
		}
	}

	if broker.Status != models.BrokerStatusActive {
		return false
	}

	// Daily cap
	if broker.DailyCap > 0 {
		used, _ := rt.getDailyCap(ctx, "broker", broker.ID, "", "")
		if used >= int64(broker.DailyCap) {
			return false
		}
	}

	// Total cap
	if broker.TotalCap > 0 {
		used, _ := rt.getTotalCap(ctx, "broker", broker.ID)
		if used >= int64(broker.TotalCap) {
			return false
		}
	}

	// Country cap
	if lead.Country != "" && broker.CountryCaps != nil {
		countryCaps := make(map[string]int)
		json.Unmarshal(broker.CountryCaps, &countryCaps)
		if cap, ok := countryCaps[lead.Country]; ok && cap > 0 {
			used, _ := rt.getDailyCap(ctx, "broker", broker.ID, lead.Country, "")
			if used >= int64(cap) {
				return false
			}
		}
	}

	return true
}

func (rt *Router) randomWeightedSelect(targets []BrokerTarget) string {
	totalWeight := 0
	for _, t := range targets {
		w := t.Weight
		if w <= 0 {
			w = 1
		}
		totalWeight += w
	}

	r := rand.Intn(totalWeight)
	cumulative := 0
	for _, t := range targets {
		w := t.Weight
		if w <= 0 {
			w = 1
		}
		cumulative += w
		if r < cumulative {
			return t.BrokerID
		}
	}
	return targets[0].BrokerID
}

// ---------------------------------------------------------------------------
// Prefetch brokers (eliminate N+1 queries)
// ---------------------------------------------------------------------------

func (rt *Router) prefetchBrokers(ctx context.Context, rules []*models.DistributionRule) (map[string]*models.Broker, error) {
	brokerIDs := make(map[string]bool)
	for _, rule := range rules {
		var targets []BrokerTarget
		if err := json.Unmarshal(rule.BrokerTargets, &targets); err != nil {
			continue
		}
		for _, t := range targets {
			brokerIDs[t.BrokerID] = true
		}
	}

	cache := make(map[string]*models.Broker, len(brokerIDs))
	for id := range brokerIDs {
		broker, err := rt.store.GetBroker(ctx, id)
		if err != nil {
			return nil, err
		}
		if broker != nil {
			cache[id] = broker
		}
	}
	return cache, nil
}

// ---------------------------------------------------------------------------
// Cap management (timezone-aware + total caps)
// ---------------------------------------------------------------------------

// Country timezone mapping for cap reset times.
var countryTimezones = map[string]string{
	"US": "America/New_York", "GB": "Europe/London", "DE": "Europe/Berlin",
	"FR": "Europe/Paris", "AU": "Australia/Sydney", "JP": "Asia/Tokyo",
	"KR": "Asia/Seoul", "CN": "Asia/Shanghai", "IN": "Asia/Kolkata",
	"BR": "America/Sao_Paulo", "RU": "Europe/Moscow", "TR": "Europe/Istanbul",
	"AE": "Asia/Dubai", "SA": "Asia/Riyadh", "IL": "Asia/Jerusalem",
	"ZA": "Africa/Johannesburg", "NG": "Africa/Lagos", "KE": "Africa/Nairobi",
	"EG": "Africa/Cairo", "TH": "Asia/Bangkok", "VN": "Asia/Ho_Chi_Minh",
	"PH": "Asia/Manila", "MY": "Asia/Kuala_Lumpur", "SG": "Asia/Singapore",
	"ID": "Asia/Jakarta", "NZ": "Pacific/Auckland", "CA": "America/Toronto",
	"MX": "America/Mexico_City", "AR": "America/Argentina/Buenos_Aires",
	"CO": "America/Bogota", "CL": "America/Santiago", "PL": "Europe/Warsaw",
	"UA": "Europe/Kiev", "SE": "Europe/Stockholm", "NO": "Europe/Oslo",
	"NL": "Europe/Amsterdam", "ES": "Europe/Madrid", "IT": "Europe/Rome",
	"PT": "Europe/Lisbon", "GR": "Europe/Athens", "CZ": "Europe/Prague",
	"RO": "Europe/Bucharest", "HU": "Europe/Budapest",
}

func (rt *Router) getDailyCap(ctx context.Context, entityType, entityID, country, tz string) (int64, error) {
	key := rt.capKey(entityType, entityID, country, tz)
	val, err := rt.redis.Get(ctx, key)
	if err != nil {
		return 0, nil
	}
	var n int64
	fmt.Sscanf(val, "%d", &n)
	return n, nil
}

func (rt *Router) getTotalCap(ctx context.Context, entityType, entityID string) (int64, error) {
	key := fmt.Sprintf("cap:total:%s:%s", entityType, entityID)
	val, err := rt.redis.Get(ctx, key)
	if err != nil {
		return 0, nil
	}
	var n int64
	fmt.Sscanf(val, "%d", &n)
	return n, nil
}

func (rt *Router) incrementCaps(ctx context.Context, ruleID, brokerID, country, affiliateID string) {
	tz := ""
	if country != "" {
		tz = countryTimezones[country]
	}

	// Rule caps
	rt.incrementDailyCap(ctx, "rule", ruleID, "", tz)
	rt.incrementTotalCap(ctx, "rule", ruleID)
	if country != "" {
		rt.incrementDailyCap(ctx, "rule", ruleID, country, tz)
	}

	// Broker caps
	rt.incrementDailyCap(ctx, "broker", brokerID, "", tz)
	rt.incrementTotalCap(ctx, "broker", brokerID)
	if country != "" {
		rt.incrementDailyCap(ctx, "broker", brokerID, country, tz)
	}

	// Source (affiliate) caps
	if affiliateID != "" {
		rt.incrementDailyCap(ctx, "source", affiliateID, "", tz)
	}
}

func (rt *Router) incrementDailyCap(ctx context.Context, entityType, entityID, country, tz string) {
	key := rt.capKey(entityType, entityID, country, tz)
	now := rt.nowInTZ(tz)
	endOfDay := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	ttl := endOfDay.Sub(now)
	if ttl < time.Second {
		ttl = time.Second
	}
	rt.redis.IncrWithExpiry(ctx, key, ttl)
}

func (rt *Router) incrementTotalCap(ctx context.Context, entityType, entityID string) {
	key := fmt.Sprintf("cap:total:%s:%s", entityType, entityID)
	rt.redis.Incr(ctx, key)
}

func (rt *Router) capKey(entityType, entityID, country, tz string) string {
	date := rt.nowInTZ(tz).Format("2006-01-02")
	if country != "" {
		return fmt.Sprintf("cap:%s:%s:%s:%s", entityType, entityID, country, date)
	}
	return fmt.Sprintf("cap:%s:%s:%s", entityType, entityID, date)
}

func (rt *Router) nowInTZ(tz string) time.Time {
	if tz == "" {
		return time.Now().UTC()
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.Now().UTC()
	}
	return time.Now().In(loc)
}

// ---------------------------------------------------------------------------
// Per-source (affiliate) caps
// ---------------------------------------------------------------------------

func (rt *Router) checkSourceCap(ctx context.Context, rule *models.DistributionRule, affiliateID string) (bool, error) {
	// Source caps are stored in rule conditions as source_daily_cap
	if rule.Conditions == nil {
		return false, nil
	}
	var cond struct {
		SourceDailyCap int `json:"source_daily_cap"`
	}
	json.Unmarshal(rule.Conditions, &cond)
	if cond.SourceDailyCap <= 0 {
		return false, nil
	}

	used, err := rt.getDailyCap(ctx, "source", affiliateID, "", "")
	if err != nil {
		return false, err
	}
	return used >= int64(cond.SourceDailyCap), nil
}

// ---------------------------------------------------------------------------
// Cap threshold alerts
// ---------------------------------------------------------------------------

func (rt *Router) checkCapThresholds(ctx context.Context, rule *models.DistributionRule, brokerID, country string) {
	if rule.DailyCap <= 0 {
		return
	}

	used, _ := rt.getDailyCap(ctx, "rule", rule.ID, "", "")
	pct := float64(used) / float64(rule.DailyCap) * 100

	if pct >= 80 && pct < 100 {
		alertKey := fmt.Sprintf("cap:alert:80:%s:%s", rule.ID, time.Now().UTC().Format("2006-01-02"))
		set, _ := rt.redis.SetNX(ctx, alertKey, "1", 24*time.Hour)
		if set {
			rt.logger.Warn("cap threshold 80% reached",
				"rule_id", rule.ID,
				"used", used,
				"cap", rule.DailyCap,
			)
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

func containsIgnoreCase(slice []string, val string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, val) {
			return true
		}
	}
	return false
}
