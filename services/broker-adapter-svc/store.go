package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/models"
)

// Store handles all database operations for the broker-adapter service.
type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// BrokerWithTemplate is a Broker joined with its BrokerTemplate.
type BrokerWithTemplate struct {
	Broker   models.Broker
	Template models.BrokerTemplate
}

// GetBroker fetches a broker by ID and joins the associated broker_template.
// Returns (nil, nil) when the broker is not found.
func (s *Store) GetBroker(ctx context.Context, brokerID string) (*BrokerWithTemplate, error) {
	b := &BrokerWithTemplate{}
	err := s.db.QueryRow(ctx,
		`SELECT b.id, b.tenant_id, b.name, b.status, b.template_id, b.endpoint,
		        b.credentials_enc, b.field_mapping,
		        b.daily_cap, b.total_cap, b.country_caps, b.priority,
		        b.created_at, b.updated_at,
		        t.id, t.name, t.version, t.method, t.url_template,
		        t.headers, t.body_template, t.auth_type,
		        t.response_mapping, t.postback_config, t.is_public, t.created_at
		 FROM brokers b
		 JOIN broker_templates t ON t.id = b.template_id
		 WHERE b.id = $1`,
		brokerID,
	).Scan(
		&b.Broker.ID, &b.Broker.TenantID, &b.Broker.Name, &b.Broker.Status,
		&b.Broker.TemplateID, &b.Broker.Endpoint,
		&b.Broker.Credentials, &b.Broker.FieldMapping,
		&b.Broker.DailyCap, &b.Broker.TotalCap, &b.Broker.CountryCaps, &b.Broker.Priority,
		&b.Broker.CreatedAt, &b.Broker.UpdatedAt,
		&b.Template.ID, &b.Template.Name, &b.Template.Version,
		&b.Template.Method, &b.Template.URLTemplate,
		&b.Template.Headers, &b.Template.BodyTemplate, &b.Template.AuthType,
		&b.Template.ResponseMapping, &b.Template.PostbackConfig,
		&b.Template.IsPublic, &b.Template.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return b, nil
}

// GetBrokerTemplate fetches a single broker template by ID.
// Returns (nil, nil) when not found.
func (s *Store) GetBrokerTemplate(ctx context.Context, templateID string) (*models.BrokerTemplate, error) {
	t := &models.BrokerTemplate{}
	err := s.db.QueryRow(ctx,
		`SELECT id, name, version, method, url_template,
		        headers, body_template, auth_type,
		        response_mapping, postback_config, is_public, created_at
		 FROM broker_templates WHERE id = $1`,
		templateID,
	).Scan(
		&t.ID, &t.Name, &t.Version, &t.Method, &t.URLTemplate,
		&t.Headers, &t.BodyTemplate, &t.AuthType,
		&t.ResponseMapping, &t.PostbackConfig, &t.IsPublic, &t.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return t, nil
}

// GetLead fetches a single lead by ID. Returns (nil, nil) when not found.
func (s *Store) GetLead(ctx context.Context, leadID string) (*models.Lead, error) {
	lead := &models.Lead{}
	err := s.db.QueryRow(ctx,
		`SELECT id, tenant_id, affiliate_id, idempotency_key,
		        first_name, last_name, email, phone, phone_e164,
		        country, ip, user_agent, status, quality_score,
		        fraud_card, extra, created_at, updated_at
		 FROM leads WHERE id = $1`,
		leadID,
	).Scan(
		&lead.ID, &lead.TenantID, &lead.AffiliateID, &lead.IdempotencyKey,
		&lead.FirstName, &lead.LastName, &lead.Email, &lead.Phone, &lead.PhoneE164,
		&lead.Country, &lead.IP, &lead.UserAgent, &lead.Status, &lead.QualityScore,
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

// UpdateLeadStatus sets lead status and bumps updated_at.
func (s *Store) UpdateLeadStatus(ctx context.Context, leadID string, status models.LeadStatus) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
		string(status), leadID,
	)
}

// CreateLeadEvent inserts a new lead_events row with full request/response body for
// delivery transparency and scans back id, created_at.
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

func (s *Store) GetActiveBrokers(ctx context.Context, tenantID string) ([]*models.Broker, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, tenant_id, name, status, template_id, endpoint, field_mapping,
		        daily_cap, total_cap, priority, health_status, created_at, updated_at
		 FROM brokers WHERE tenant_id = $1 ORDER BY priority ASC`,
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
			&b.ID, &b.TenantID, &b.Name, &b.Status, &b.TemplateID, &b.Endpoint, &b.FieldMapping,
			&b.DailyCap, &b.TotalCap, &b.Priority, &b.HealthStatus, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		brokers = append(brokers, b)
	}
	return brokers, rows.Err()
}

func (s *Store) ListBrokerTemplates(ctx context.Context) ([]*models.BrokerTemplate, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, name, version, method, url_template,
		        headers, body_template, auth_type,
		        response_mapping, postback_config, is_public, created_at
		 FROM broker_templates
		 WHERE is_public = true
		 ORDER BY name ASC, version DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []*models.BrokerTemplate
	for rows.Next() {
		t := &models.BrokerTemplate{}
		if err := rows.Scan(
			&t.ID, &t.Name, &t.Version, &t.Method, &t.URLTemplate,
			&t.Headers, &t.BodyTemplate, &t.AuthType,
			&t.ResponseMapping, &t.PostbackConfig, &t.IsPublic, &t.CreatedAt,
		); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, rows.Err()
}

func (s *Store) CreateBroker(ctx context.Context, broker *models.Broker) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO brokers
			(tenant_id, name, status, template_id, endpoint, credentials_enc, field_mapping,
			 daily_cap, total_cap, country_caps, priority, health_status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		 RETURNING id, created_at, updated_at`,
		broker.TenantID, broker.Name, broker.Status, broker.TemplateID, broker.Endpoint,
		ensureJSON(broker.Credentials), ensureJSON(broker.FieldMapping),
		broker.DailyCap, broker.TotalCap, ensureJSON(broker.CountryCaps),
		broker.Priority, broker.HealthStatus,
	).Scan(&broker.ID, &broker.CreatedAt, &broker.UpdatedAt)
}

func (s *Store) UpdateBroker(ctx context.Context, broker *models.Broker) error {
	return s.db.Exec(ctx,
		`UPDATE brokers
		 SET name = $1,
		     status = $2,
		     template_id = $3,
		     endpoint = $4,
		     credentials_enc = $5,
		     field_mapping = $6,
		     daily_cap = $7,
		     total_cap = $8,
		     country_caps = $9,
		     priority = $10,
		     updated_at = NOW()
		 WHERE id = $11 AND tenant_id = $12`,
		broker.Name, broker.Status, broker.TemplateID, broker.Endpoint,
		ensureJSON(broker.Credentials), ensureJSON(broker.FieldMapping),
		broker.DailyCap, broker.TotalCap, ensureJSON(broker.CountryCaps),
		broker.Priority, broker.ID, broker.TenantID,
	)
}

func (s *Store) UpdateBrokerStatus(ctx context.Context, brokerID, status string) error {
	return s.db.Exec(ctx, `UPDATE brokers SET status = $1, updated_at = NOW() WHERE id = $2`, status, brokerID)
}

func (s *Store) UpdateBrokerCap(ctx context.Context, brokerID string, dailyCap int) error {
	return s.db.Exec(ctx, `UPDATE brokers SET daily_cap = $1, updated_at = NOW() WHERE id = $2`, dailyCap, brokerID)
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
