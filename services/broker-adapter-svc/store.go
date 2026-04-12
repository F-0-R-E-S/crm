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

func (s *Store) UpdateBrokerCircuit(ctx context.Context, brokerID string, state string, failureCount int, openedAt time.Time) error {
	return s.db.Exec(ctx,
		`UPDATE brokers SET circuit_state = $1, circuit_failure_count = $2, circuit_opened_at = $3, updated_at = NOW() WHERE id = $4`,
		state, failureCount, openedAt, brokerID,
	)
}

func (s *Store) UpdateBrokerHealthStatus(ctx context.Context, brokerID string, status string) error {
	return s.db.Exec(ctx,
		`UPDATE brokers SET health_status = $1, last_health_check = NOW(), updated_at = NOW() WHERE id = $2`,
		status, brokerID,
	)
}

func (s *Store) GetBrokersWithHealthCheck(ctx context.Context) ([]brokerHealthInfo, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id, health_check_url, tenant_id FROM brokers
		 WHERE health_check_url IS NOT NULL AND health_check_url != ''
		   AND status = 'active' AND maintenance_mode = false`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brokers []brokerHealthInfo
	for rows.Next() {
		var b brokerHealthInfo
		if err := rows.Scan(&b.ID, &b.HealthCheckURL, &b.TenantID); err != nil {
			return nil, err
		}
		brokers = append(brokers, b)
	}
	return brokers, nil
}

func (s *Store) IsBrokerOpen(ctx context.Context, brokerID string) (bool, error) {
	var isOpen bool
	err := s.db.QueryRow(ctx,
		`SELECT EXISTS(
			SELECT 1 FROM broker_opening_hours
			WHERE broker_id = $1
			  AND day_of_week = EXTRACT(DOW FROM NOW())
			  AND is_enabled = true
			  AND open_time <= LOCALTIME
			  AND close_time > LOCALTIME
		)`, brokerID,
	).Scan(&isOpen)
	return isOpen, err
}

func (s *Store) GetFunnelMapping(ctx context.Context, brokerID, sourceFunnel string) (string, error) {
	var target string
	err := s.db.QueryRow(ctx,
		`SELECT target_funnel FROM broker_funnel_mappings
		 WHERE broker_id = $1 AND source_funnel = $2`,
		brokerID, sourceFunnel,
	).Scan(&target)
	return target, err
}

func (s *Store) GetBrokerPostbackConfig(ctx context.Context, brokerID string) (*PostbackConfig, error) {
	cfg := &PostbackConfig{}
	err := s.db.QueryRow(ctx,
		`SELECT is_enabled, verification_type, hmac_secret, hmac_algorithm,
		        hmac_header, allowed_ips, status_mapping, variable_template
		 FROM broker_postback_configs WHERE broker_id = $1`,
		brokerID,
	).Scan(&cfg.IsEnabled, &cfg.VerificationType, &cfg.HMACSecret, &cfg.HMACAlgorithm,
		&cfg.HMACHeader, &cfg.AllowedIPs, &cfg.StatusMapping, &cfg.VariableTemplate)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return cfg, nil
}

func (s *Store) LogPostback(ctx context.Context, log *PostbackLogEntry) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO broker_postback_log
			(company_id, broker_id, lead_id, raw_payload, parsed_status, mapped_status,
			 verification_result, processing_result, error, source_ip)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
		log.TenantID, log.BrokerID, nilIfEmpty(log.LeadID),
		log.RawPayload, nilIfEmpty(log.ParsedStatus), nilIfEmpty(log.MappedStatus),
		nilIfEmpty(log.VerificationResult), log.ProcessingResult,
		nilIfEmpty(log.Error), nilIfEmpty(log.SourceIP),
	).Scan(&log.ID, &log.CreatedAt)
}

type PostbackConfig struct {
	IsEnabled        bool            `json:"is_enabled"`
	VerificationType string          `json:"verification_type"`
	HMACSecret       *string         `json:"hmac_secret"`
	HMACAlgorithm    *string         `json:"hmac_algorithm"`
	HMACHeader       *string         `json:"hmac_header"`
	AllowedIPs       []string        `json:"allowed_ips"`
	StatusMapping    json.RawMessage `json:"status_mapping"`
	VariableTemplate json.RawMessage `json:"variable_template"`
}

type PostbackLogEntry struct {
	ID                 string          `json:"id"`
	TenantID           string          `json:"tenant_id"`
	BrokerID           string          `json:"broker_id"`
	LeadID             string          `json:"lead_id"`
	RawPayload         json.RawMessage `json:"raw_payload"`
	ParsedStatus       string          `json:"parsed_status"`
	MappedStatus       string          `json:"mapped_status"`
	VerificationResult string          `json:"verification_result"`
	ProcessingResult   string          `json:"processing_result"`
	Error              string          `json:"error"`
	SourceIP           string          `json:"source_ip"`
	CreatedAt          time.Time       `json:"created_at"`
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
