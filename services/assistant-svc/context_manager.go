package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/messaging"
)

const (
	contextKeyPrefix = "assistant:ctx:"
	contextTTL       = 30 * time.Minute
)

type TenantContextSnapshot struct {
	TenantID    string    `json:"tenant_id"`
	TenantName  string    `json:"tenant_name"`
	TenantPlan  string    `json:"tenant_plan"`
	BuiltAt     time.Time `json:"built_at"`
	LastEventAt time.Time `json:"last_event_at"`

	KPIs         KPISnapshot        `json:"kpis"`
	Brokers      []BrokerSummary    `json:"brokers"`
	Affiliates   []AffiliateSummary `json:"affiliates"`
	RoutingRules []RuleSummary      `json:"routing_rules"`
	RecentEvents []EventSummary     `json:"recent_events"`
	CapMatrix    map[string]map[string]CapStatus `json:"cap_matrix"`
	Alerts       []Alert            `json:"alerts"`
}

type KPISnapshot struct {
	LeadsToday       int     `json:"leads_today"`
	LeadsThisWeek    int     `json:"leads_this_week"`
	LeadsThisMonth   int     `json:"leads_this_month"`
	ConversionRate7D float64 `json:"conversion_rate_7d"`
	FraudRate7D      float64 `json:"fraud_rate_7d"`
	AvgDeliveryMs24H int64   `json:"avg_delivery_ms_24h"`
	RevenueThisMonth float64 `json:"revenue_this_month"`
}

type BrokerSummary struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Status          string  `json:"status"`
	DailyCap        int     `json:"daily_cap"`
	DailyUsed       int     `json:"daily_used"`
	HealthStatus    string  `json:"health_status"`
	SuccessRate     float64 `json:"success_rate"`
	TopCountries    []string `json:"top_countries,omitempty"`
}

type AffiliateSummary struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Status       string   `json:"status"`
	DailyCap     int      `json:"daily_cap"`
	LeadsToday   int      `json:"leads_today"`
	FraudRate    float64  `json:"fraud_rate"`
	TopCountries []string `json:"top_countries,omitempty"`
}

type RuleSummary struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Algorithm     string   `json:"algorithm"`
	Priority      int      `json:"priority"`
	IsActive      bool     `json:"is_active"`
	DailyCap      int      `json:"daily_cap"`
	DailyUsed     int      `json:"daily_used"`
	BrokerTargets []string `json:"broker_targets"`
}

type CapStatus struct {
	Cap  int `json:"cap"`
	Used int `json:"used"`
}

type EventSummary struct {
	Type      string    `json:"type"`
	Source    string    `json:"source"`
	Summary   string    `json:"summary"`
	Timestamp time.Time `json:"timestamp"`
}

type Alert struct {
	Severity string    `json:"severity"`
	Message  string    `json:"message"`
	Source   string    `json:"source"`
	Time     time.Time `json:"time"`
}

type ContextManager struct {
	redis  *cache.Redis
	db     *database.DB
	logger *slog.Logger
}

func NewContextManager(redis *cache.Redis, db *database.DB, logger *slog.Logger) *ContextManager {
	return &ContextManager{redis: redis, db: db, logger: logger}
}

func (cm *ContextManager) GetSnapshot(ctx context.Context, tenantID string) (*TenantContextSnapshot, error) {
	key := contextKeyPrefix + tenantID

	data, err := cm.redis.Get(ctx, key)
	if err == nil && data != "" {
		var snap TenantContextSnapshot
		if err := json.Unmarshal([]byte(data), &snap); err == nil {
			return &snap, nil
		}
	}

	snap, err := cm.BuildSnapshot(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("build snapshot: %w", err)
	}

	if encoded, err := json.Marshal(snap); err == nil {
		_ = cm.redis.Set(ctx, key, string(encoded), contextTTL)
	}

	return snap, nil
}

func (cm *ContextManager) BuildSnapshot(ctx context.Context, tenantID string) (*TenantContextSnapshot, error) {
	snap := &TenantContextSnapshot{
		TenantID:  tenantID,
		BuiltAt:   time.Now().UTC(),
		CapMatrix: make(map[string]map[string]CapStatus),
	}

	tx, err := cm.db.WithTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("begin tenant tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Tenant info
	err = tx.QueryRow(ctx,
		`SELECT name, plan FROM tenants WHERE id = $1`, tenantID,
	).Scan(&snap.TenantName, &snap.TenantPlan)
	if err != nil {
		return nil, fmt.Errorf("fetch tenant: %w", err)
	}

	// KPIs from leads table
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	_ = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND created_at >= $2`, tenantID, todayStart,
	).Scan(&snap.KPIs.LeadsToday)
	_ = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND created_at >= $2`, tenantID, weekStart,
	).Scan(&snap.KPIs.LeadsThisWeek)
	_ = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM leads WHERE tenant_id = $1 AND created_at >= $2`, tenantID, monthStart,
	).Scan(&snap.KPIs.LeadsThisMonth)

	// Brokers
	brokerRows, err := tx.Query(ctx,
		`SELECT id, name, status, daily_cap, health_status FROM brokers WHERE tenant_id = $1 ORDER BY priority ASC`,
		tenantID,
	)
	if err == nil {
		defer brokerRows.Close()
		for brokerRows.Next() {
			var b BrokerSummary
			if err := brokerRows.Scan(&b.ID, &b.Name, &b.Status, &b.DailyCap, &b.HealthStatus); err == nil {
				snap.Brokers = append(snap.Brokers, b)
			}
		}
	}

	// Affiliates
	affRows, err := tx.Query(ctx,
		`SELECT id, name, status, daily_cap FROM affiliates WHERE tenant_id = $1 ORDER BY name ASC`,
		tenantID,
	)
	if err == nil {
		defer affRows.Close()
		for affRows.Next() {
			var a AffiliateSummary
			if err := affRows.Scan(&a.ID, &a.Name, &a.Status, &a.DailyCap); err == nil {
				snap.Affiliates = append(snap.Affiliates, a)
			}
		}
	}

	// Distribution rules
	ruleRows, err := tx.Query(ctx,
		`SELECT id, name, algorithm, priority, is_active, daily_cap, broker_targets
		 FROM distribution_rules WHERE tenant_id = $1 ORDER BY priority ASC`,
		tenantID,
	)
	if err == nil {
		defer ruleRows.Close()
		for ruleRows.Next() {
			var r RuleSummary
			var targetsJSON json.RawMessage
			if err := ruleRows.Scan(&r.ID, &r.Name, &r.Algorithm, &r.Priority, &r.IsActive, &r.DailyCap, &targetsJSON); err == nil {
				var targets []struct{ BrokerID string `json:"broker_id"` }
				if json.Unmarshal(targetsJSON, &targets) == nil {
					for _, t := range targets {
						r.BrokerTargets = append(r.BrokerTargets, t.BrokerID)
					}
				}
				snap.RoutingRules = append(snap.RoutingRules, r)
			}
		}
	}

	// Enrich broker daily usage from Redis
	for i, b := range snap.Brokers {
		capKey := fmt.Sprintf("cap:broker:%s:%s", b.ID, now.Format("2006-01-02"))
		if val, err := cm.redis.Get(ctx, capKey); err == nil {
			var used int
			if _, err := fmt.Sscanf(val, "%d", &used); err == nil {
				snap.Brokers[i].DailyUsed = used
			}
		}
	}

	// Enrich rule daily usage from Redis
	for i, r := range snap.RoutingRules {
		capKey := fmt.Sprintf("cap:rule:%s:%s", r.ID, now.Format("2006-01-02"))
		if val, err := cm.redis.Get(ctx, capKey); err == nil {
			var used int
			if _, err := fmt.Sscanf(val, "%d", &used); err == nil {
				snap.RoutingRules[i].DailyUsed = used
			}
		}
	}

	return snap, nil
}

func (cm *ContextManager) ApplyEvent(ctx context.Context, tenantID string, event messaging.CloudEvent) {
	key := contextKeyPrefix + tenantID

	data, err := cm.redis.Get(ctx, key)
	if err != nil || data == "" {
		return
	}

	var snap TenantContextSnapshot
	if err := json.Unmarshal([]byte(data), &snap); err != nil {
		return
	}

	snap.LastEventAt = event.Time

	eventData, _ := json.Marshal(event.Data)
	var payload map[string]interface{}
	json.Unmarshal(eventData, &payload)

	summary := EventSummary{
		Type:      event.Type,
		Source:    event.Source,
		Timestamp: event.Time,
	}

	switch event.Type {
	case "lead.received":
		snap.KPIs.LeadsToday++
		snap.KPIs.LeadsThisWeek++
		snap.KPIs.LeadsThisMonth++
		if affID, ok := payload["affiliate_id"].(string); ok {
			for i, a := range snap.Affiliates {
				if a.ID == affID {
					snap.Affiliates[i].LeadsToday++
					break
				}
			}
		}
		summary.Summary = fmt.Sprintf("New lead received (today: %d)", snap.KPIs.LeadsToday)

	case "lead.routed":
		if brokerID, ok := payload["broker_id"].(string); ok {
			for i, b := range snap.Brokers {
				if b.ID == brokerID {
					snap.Brokers[i].DailyUsed++
					break
				}
			}
		}
		if ruleID, ok := payload["rule_id"].(string); ok {
			for i, r := range snap.RoutingRules {
				if r.ID == ruleID {
					snap.RoutingRules[i].DailyUsed++
					break
				}
			}
		}
		summary.Summary = fmt.Sprintf("Lead routed to broker %s", payload["broker_id"])

	case "lead.fraud.flagged":
		summary.Summary = "Lead flagged as fraudulent"

	case "cap.exhausted":
		alert := Alert{
			Severity: "critical",
			Message:  fmt.Sprintf("Cap exhausted: %v", payload),
			Source:   event.Source,
			Time:     event.Time,
		}
		snap.Alerts = append(snap.Alerts, alert)
		summary.Summary = "Cap exhausted"

	case "broker.integration.health_changed":
		if brokerID, ok := payload["broker_id"].(string); ok {
			newStatus, _ := payload["status"].(string)
			for i, b := range snap.Brokers {
				if b.ID == brokerID {
					snap.Brokers[i].HealthStatus = newStatus
					break
				}
			}
			if newStatus == "degraded" || newStatus == "down" {
				snap.Alerts = append(snap.Alerts, Alert{
					Severity: "warning",
					Message:  fmt.Sprintf("Broker %s health: %s", brokerID, newStatus),
					Source:   event.Source,
					Time:     event.Time,
				})
			}
		}
		summary.Summary = fmt.Sprintf("Broker health changed: %v", payload["status"])

	default:
		summary.Summary = event.Type
	}

	snap.RecentEvents = append([]EventSummary{summary}, snap.RecentEvents...)
	if len(snap.RecentEvents) > 50 {
		snap.RecentEvents = snap.RecentEvents[:50]
	}

	if encoded, err := json.Marshal(snap); err == nil {
		_ = cm.redis.Set(ctx, key, string(encoded), contextTTL)
	}
}

func (cm *ContextManager) InvalidateSnapshot(ctx context.Context, tenantID string) {
	_ = cm.redis.Del(ctx, contextKeyPrefix+tenantID)
}
