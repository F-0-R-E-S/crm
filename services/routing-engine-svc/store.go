package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/models"
)

type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// GetActiveRules fetches all active distribution rules for a tenant, ordered by priority ASC.
func (s *Store) GetActiveRules(ctx context.Context, tenantID string) ([]*models.DistributionRule, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, tenant_id, name, priority, is_active,
		        conditions, broker_targets, algorithm,
		        daily_cap, total_cap, country_caps,
		        delayed_actions, cr_limits, timezone_slots,
		        created_at, updated_at
		 FROM distribution_rules
		 WHERE tenant_id = $1 AND is_active = true
		 ORDER BY priority ASC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*models.DistributionRule
	for rows.Next() {
		r := &models.DistributionRule{}
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.Name, &r.Priority, &r.IsActive,
			&r.Conditions, &r.BrokerTargets, &r.Algorithm,
			&r.DailyCap, &r.TotalCap, &r.CountryCaps,
			&r.DelayedActions, &r.CRLimits, &r.TimezoneSlots,
			&r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	return rules, rows.Err()
}

// GetBroker fetches a single broker by ID. Returns (nil, nil) when not found.
func (s *Store) GetBroker(ctx context.Context, brokerID string) (*models.Broker, error) {
	b := &models.Broker{}
	err := s.db.QueryRow(ctx,
		`SELECT id, tenant_id, name, status, template_id, endpoint,
		        credentials_enc, field_mapping,
		        daily_cap, total_cap, country_caps, priority,
		        created_at, updated_at
		 FROM brokers WHERE id = $1`,
		brokerID,
	).Scan(
		&b.ID, &b.TenantID, &b.Name, &b.Status, &b.TemplateID, &b.Endpoint,
		&b.Credentials, &b.FieldMapping,
		&b.DailyCap, &b.TotalCap, &b.CountryCaps, &b.Priority,
		&b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return b, nil
}

// GetActiveBrokers fetches all active brokers for a tenant, ordered by priority ASC.
func (s *Store) GetActiveBrokers(ctx context.Context, tenantID string) ([]*models.Broker, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, tenant_id, name, status, template_id, endpoint,
		        credentials_enc, field_mapping,
		        daily_cap, total_cap, country_caps, priority,
		        created_at, updated_at
		 FROM brokers
		 WHERE tenant_id = $1 AND status = 'active'
		 ORDER BY priority ASC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brokers []*models.Broker
	for rows.Next() {
		b := &models.Broker{}
		if err := rows.Scan(
			&b.ID, &b.TenantID, &b.Name, &b.Status, &b.TemplateID, &b.Endpoint,
			&b.Credentials, &b.FieldMapping,
			&b.DailyCap, &b.TotalCap, &b.CountryCaps, &b.Priority,
			&b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		brokers = append(brokers, b)
	}
	return brokers, rows.Err()
}

// GetLead fetches a single lead by ID. Returns (nil, nil) when not found.
func (s *Store) GetLead(ctx context.Context, leadID string) (*models.Lead, error) {
	lead := &models.Lead{}
	err := s.db.QueryRow(ctx,
		`SELECT id, tenant_id, affiliate_id, idempotency_key,
		        first_name, last_name, email, phone, phone_e164,
		        country, status, quality_score,
		        funnel_name, aff_sub1, aff_sub2, aff_sub3, aff_sub4, aff_sub5,
		        aff_sub6, aff_sub7, aff_sub8, aff_sub9, aff_sub10,
		        fraud_card, extra, created_at, updated_at
		 FROM leads WHERE id = $1`,
		leadID,
	).Scan(
		&lead.ID, &lead.TenantID, &lead.AffiliateID, &lead.IdempotencyKey,
		&lead.FirstName, &lead.LastName, &lead.Email, &lead.Phone, &lead.PhoneE164,
		&lead.Country, &lead.Status, &lead.QualityScore,
		&lead.FunnelName, &lead.AffSub1, &lead.AffSub2, &lead.AffSub3, &lead.AffSub4, &lead.AffSub5,
		&lead.AffSub6, &lead.AffSub7, &lead.AffSub8, &lead.AffSub9, &lead.AffSub10,
		&lead.FraudCard, &lead.Extra, &lead.CreatedAt, &lead.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return lead, nil
}

// CreateRule inserts a new distribution rule and scans back id, created_at, updated_at.
func (s *Store) CreateRule(ctx context.Context, rule *models.DistributionRule) error {
	conditionsJSON := ensureJSON(rule.Conditions)
	targetsJSON := ensureJSON(rule.BrokerTargets)
	countryCapsJSON := ensureJSON(rule.CountryCaps)
	timezoneJSON := ensureJSON(rule.TimezoneSlots)

	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO distribution_rules
			(tenant_id, name, priority, is_active,
			 conditions, broker_targets, algorithm,
			 daily_cap, total_cap, country_caps, timezone_slots)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		 RETURNING id, created_at, updated_at`,
		rule.TenantID, rule.Name, rule.Priority, rule.IsActive,
		conditionsJSON, targetsJSON, rule.Algorithm,
		rule.DailyCap, rule.TotalCap, countryCapsJSON, timezoneJSON,
	).Scan(&rule.ID, &rule.CreatedAt, &rule.UpdatedAt)
}

// UpdateLeadStatus sets lead status and bumps updated_at.
func (s *Store) UpdateLeadStatus(ctx context.Context, leadID string, status models.LeadStatus) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
		string(status), leadID,
	)
}

// CreateLeadEvent inserts a new lead_events row and scans back id, created_at.
func (s *Store) CreateLeadEvent(ctx context.Context, event *models.LeadEvent) error {
	durationMs := int(event.Duration / time.Millisecond)
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO lead_events
			(lead_id, tenant_id, event_type, broker_id,
			 request_body, response_body, status_code, duration_ms, error)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, created_at`,
		event.LeadID, event.TenantID, event.EventType,
		nilIfEmpty(event.BrokerID), event.RequestBody, event.ResponseBody,
		event.StatusCode, durationMs, nilIfEmpty(event.Error),
	).Scan(&event.ID, &event.CreatedAt)
}

func ensureJSON(raw json.RawMessage) json.RawMessage {
	if raw == nil || len(raw) == 0 {
		return json.RawMessage("{}")
	}
	return raw
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
