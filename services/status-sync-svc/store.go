package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/models"
)

// Store handles all database operations for the status-sync service.
type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// GetLeadByBrokerRef looks up a lead by the broker's own reference ID.
// Brokers identify leads by the ID they returned during delivery — stored in
// lead_events as broker_lead_id. We search lead_events for a delivery_success
// event matching this broker + their reference ID.
//
// Returns (nil, nil) when not found.
func (s *Store) GetLeadByBrokerRef(ctx context.Context, brokerID, brokerLeadID string) (*models.Lead, error) {
	// The broker_lead_id is stored inside the response_body JSON of the
	// delivery_success event. We also store broker_id on the lead_event row.
	// First, find the lead_id from lead_events.
	var leadID string
	err := s.db.Pool.QueryRow(ctx,
		`SELECT le.lead_id
		 FROM lead_events le
		 WHERE le.broker_id = $1
		   AND le.event_type = 'delivery_success'
		   AND le.response_body->>'broker_lead_id' = $2
		 ORDER BY le.created_at DESC
		 LIMIT 1`,
		brokerID, brokerLeadID,
	).Scan(&leadID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return s.GetLead(ctx, leadID)
}

// GetLead fetches a single lead by ID. Returns (nil, nil) when not found.
func (s *Store) GetLead(ctx context.Context, leadID string) (*models.Lead, error) {
	lead := &models.Lead{}
	err := s.db.Pool.QueryRow(ctx,
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
func (s *Store) UpdateLeadStatus(ctx context.Context, leadID string, status string) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, leadID,
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

// StatusHistoryEntry represents a single status change for a lead.
type StatusHistoryEntry struct {
	ID        string    `json:"id"`
	EventType string    `json:"event_type"`
	BrokerID  string    `json:"broker_id,omitempty"`
	OldStatus string    `json:"old_status,omitempty"`
	NewStatus string    `json:"new_status,omitempty"`
	Comment   string    `json:"comment,omitempty"`
	RawBody   json.RawMessage `json:"raw_body,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// GetLeadStatusHistory returns all postback / status change events for a lead,
// ordered chronologically (newest first). This is used both for the history
// endpoint and for shave detection context.
func (s *Store) GetLeadStatusHistory(ctx context.Context, leadID string) ([]StatusHistoryEntry, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, event_type, broker_id, request_body, created_at
		 FROM lead_events
		 WHERE lead_id = $1
		   AND event_type IN ('postback_received', 'lead.status_updated', 'lead.shave_detected',
		                      'delivery_success', 'delivery_attempt', 'delivery_failed',
		                      'lead.received', 'lead.delivered')
		 ORDER BY created_at DESC`,
		leadID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []StatusHistoryEntry
	for rows.Next() {
		var e StatusHistoryEntry
		var brokerID *string
		var rawBody json.RawMessage
		if err := rows.Scan(&e.ID, &e.EventType, &brokerID, &rawBody, &e.CreatedAt); err != nil {
			return nil, err
		}
		if brokerID != nil {
			e.BrokerID = *brokerID
		}
		e.RawBody = rawBody

		// Try to extract old_status, new_status, comment from request_body JSON.
		if len(rawBody) > 0 {
			var body struct {
				OldStatus string `json:"old_status"`
				NewStatus string `json:"new_status"`
				Comment   string `json:"comment"`
			}
			if json.Unmarshal(rawBody, &body) == nil {
				e.OldStatus = body.OldStatus
				e.NewStatus = body.NewStatus
				e.Comment = body.Comment
			}
		}

		entries = append(entries, e)
	}
	if entries == nil {
		entries = []StatusHistoryEntry{}
	}
	return entries, nil
}

// ---------------------------------------------------------------------------
// Postback delivery queue (EPIC-04)
// ---------------------------------------------------------------------------

type PostbackJob struct {
	ID           string          `json:"id"`
	TenantID     string          `json:"tenant_id"`
	AffiliateID  string          `json:"affiliate_id"`
	LeadID       string          `json:"lead_id"`
	EventType    string          `json:"event_type"`
	URL          string          `json:"url"`
	Payload      json.RawMessage `json:"payload"`
	Status       string          `json:"status"`
	Attempts     int             `json:"attempts"`
	MaxAttempts  int             `json:"max_attempts"`
	LastError    string          `json:"last_error,omitempty"`
	NextAttemptAt time.Time      `json:"next_attempt_at"`
}

func (s *Store) EnqueuePostback(ctx context.Context, tenantID, affiliateID, leadID, eventType, url string, payload json.RawMessage) error {
	return s.db.Exec(ctx,
		`INSERT INTO postback_queue (tenant_id, affiliate_id, lead_id, event_type, url, payload)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
		tenantID, affiliateID, leadID, eventType, url, payload,
	)
}

func (s *Store) FetchPendingPostbacks(ctx context.Context, limit int) ([]PostbackJob, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, affiliate_id, lead_id, event_type, url, payload, status, attempts, max_attempts, next_attempt_at
		 FROM postback_queue
		 WHERE status = 'pending' AND next_attempt_at <= NOW()
		 ORDER BY next_attempt_at ASC
		 LIMIT $1
		 FOR UPDATE SKIP LOCKED`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []PostbackJob
	for rows.Next() {
		var j PostbackJob
		if err := rows.Scan(
			&j.ID, &j.TenantID, &j.AffiliateID, &j.LeadID, &j.EventType,
			&j.URL, &j.Payload, &j.Status, &j.Attempts, &j.MaxAttempts, &j.NextAttemptAt,
		); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

func (s *Store) MarkPostbackComplete(ctx context.Context, jobID string) error {
	return s.db.Exec(ctx,
		`UPDATE postback_queue SET status = 'completed', completed_at = NOW() WHERE id = $1`,
		jobID,
	)
}

func (s *Store) MarkPostbackFailed(ctx context.Context, jobID string, lastError string, statusCode int) error {
	return s.db.Exec(ctx,
		`UPDATE postback_queue
		 SET attempts = attempts + 1,
		     last_error = $2,
		     last_status_code = $3,
		     next_attempt_at = NOW() + (INTERVAL '1 minute' * POWER(2, attempts)),
		     status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END
		 WHERE id = $1`,
		jobID, lastError, statusCode,
	)
}

func (s *Store) GetAffiliatePostback(ctx context.Context, tenantID, affiliateID string) (url string, eventsJSON json.RawMessage, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT COALESCE(postback_url,''), COALESCE(postback_events,'[]'::jsonb)
		 FROM affiliates WHERE id = $1 AND tenant_id = $2`,
		affiliateID, tenantID,
	).Scan(&url, &eventsJSON)
	return
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// ---------------------------------------------------------------------------
// Status Groups
// ---------------------------------------------------------------------------

// ListStatusGroups returns all status groups visible to the tenant (tenant-
// specific + system/global groups where tenant_id IS NULL).
func (s *Store) ListStatusGroups(ctx context.Context, tenantID string) ([]models.StatusGroup, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, COALESCE(tenant_id,''), name, slug, rank, color,
		        COALESCE(icon,''), is_terminal, is_negative, is_system, created_at, updated_at
		 FROM status_groups
		 WHERE tenant_id = $1 OR tenant_id IS NULL
		 ORDER BY rank ASC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.StatusGroup
	for rows.Next() {
		var g models.StatusGroup
		if err := rows.Scan(
			&g.ID, &g.TenantID, &g.Name, &g.Slug, &g.Rank, &g.Color,
			&g.Icon, &g.IsTerminal, &g.IsNegative, &g.IsSystem, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	if groups == nil {
		groups = []models.StatusGroup{}
	}
	return groups, rows.Err()
}

// CreateStatusGroup inserts a new status group.
func (s *Store) CreateStatusGroup(ctx context.Context, group *models.StatusGroup) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO status_groups
			(tenant_id, name, slug, rank, color, icon, is_terminal, is_negative, is_system)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, created_at, updated_at`,
		nilIfEmpty(group.TenantID), group.Name, group.Slug, group.Rank, group.Color,
		nilIfEmpty(group.Icon), group.IsTerminal, group.IsNegative, group.IsSystem,
	).Scan(&group.ID, &group.CreatedAt, &group.UpdatedAt)
}

// UpdateStatusGroup updates an existing status group.
func (s *Store) UpdateStatusGroup(ctx context.Context, group *models.StatusGroup) error {
	return s.db.Exec(ctx,
		`UPDATE status_groups
		 SET name = $1, slug = $2, rank = $3, color = $4, icon = $5,
		     is_terminal = $6, is_negative = $7, updated_at = NOW()
		 WHERE id = $8 AND (tenant_id = $9 OR tenant_id IS NULL)`,
		group.Name, group.Slug, group.Rank, group.Color, nilIfEmpty(group.Icon),
		group.IsTerminal, group.IsNegative,
		group.ID, nilIfEmpty(group.TenantID),
	)
}

// DeleteStatusGroup deletes a non-system status group.
func (s *Store) DeleteStatusGroup(ctx context.Context, tenantID, id string) error {
	return s.db.Exec(ctx,
		`DELETE FROM status_groups
		 WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND is_system = FALSE`,
		id, nilIfEmpty(tenantID),
	)
}

// ---------------------------------------------------------------------------
// Broker Status Mappings
// ---------------------------------------------------------------------------

// ListBrokerMappings returns all mappings for a specific broker.
func (s *Store) ListBrokerMappings(ctx context.Context, tenantID, brokerID string) ([]models.BrokerStatusMapping, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, broker_id, raw_status, status_group_slug, auto_mapped, created_at
		 FROM broker_status_mappings
		 WHERE tenant_id = $1 AND broker_id = $2
		 ORDER BY raw_status ASC`,
		tenantID, brokerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []models.BrokerStatusMapping
	for rows.Next() {
		var m models.BrokerStatusMapping
		if err := rows.Scan(
			&m.ID, &m.TenantID, &m.BrokerID, &m.RawStatus,
			&m.StatusGroupSlug, &m.AutoMapped, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		mappings = append(mappings, m)
	}
	if mappings == nil {
		mappings = []models.BrokerStatusMapping{}
	}
	return mappings, rows.Err()
}

// UpsertBrokerMapping inserts or updates a broker status mapping.
func (s *Store) UpsertBrokerMapping(ctx context.Context, mapping *models.BrokerStatusMapping) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO broker_status_mappings
			(tenant_id, broker_id, raw_status, status_group_slug, auto_mapped)
		 VALUES ($1,$2,$3,$4,$5)
		 ON CONFLICT (tenant_id, broker_id, raw_status) DO UPDATE
		 SET status_group_slug = EXCLUDED.status_group_slug,
		     auto_mapped = EXCLUDED.auto_mapped
		 RETURNING id, created_at`,
		mapping.TenantID, mapping.BrokerID, mapping.RawStatus,
		mapping.StatusGroupSlug, mapping.AutoMapped,
	).Scan(&mapping.ID, &mapping.CreatedAt)
}

// DeleteBrokerMapping deletes a broker status mapping.
func (s *Store) DeleteBrokerMapping(ctx context.Context, tenantID, id string) error {
	return s.db.Exec(ctx,
		`DELETE FROM broker_status_mappings WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	)
}

// GetAllMappings returns all broker status mappings for a tenant, organized as
// brokerID -> rawStatus -> groupSlug.
func (s *Store) GetAllMappings(ctx context.Context, tenantID string) (map[string]map[string]string, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT broker_id, raw_status, status_group_slug
		 FROM broker_status_mappings
		 WHERE tenant_id = $1`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]map[string]string)
	for rows.Next() {
		var brokerID, rawStatus, slug string
		if err := rows.Scan(&brokerID, &rawStatus, &slug); err != nil {
			return nil, err
		}
		if result[brokerID] == nil {
			result[brokerID] = make(map[string]string)
		}
		result[brokerID][rawStatus] = slug
	}
	return result, rows.Err()
}

// ---------------------------------------------------------------------------
// Anomaly Rules
// ---------------------------------------------------------------------------

// StatusAnomalyRule represents a configured anomaly detection rule.
type StatusAnomalyRule struct {
	ID         string          `json:"id"`
	TenantID   string          `json:"tenant_id"`
	Name       string          `json:"name"`
	RuleType   string          `json:"rule_type"`
	Conditions json.RawMessage `json:"conditions,omitempty"`
	Severity   string          `json:"severity"`
	Enabled    bool            `json:"enabled"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// ListAnomalyRules returns all anomaly rules for a tenant.
func (s *Store) ListAnomalyRules(ctx context.Context, tenantID string) ([]StatusAnomalyRule, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, rule_type, conditions, severity, enabled, created_at, updated_at
		 FROM status_anomaly_rules
		 WHERE tenant_id = $1
		 ORDER BY created_at ASC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []StatusAnomalyRule
	for rows.Next() {
		var r StatusAnomalyRule
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.Name, &r.RuleType, &r.Conditions,
			&r.Severity, &r.Enabled, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}
		rules = append(rules, r)
	}
	if rules == nil {
		rules = []StatusAnomalyRule{}
	}
	return rules, rows.Err()
}

// CreateAnomalyRule inserts a new anomaly rule.
func (s *Store) CreateAnomalyRule(ctx context.Context, tenantID string, rule *StatusAnomalyRule) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO status_anomaly_rules
			(tenant_id, name, rule_type, conditions, severity, enabled)
		 VALUES ($1,$2,$3,$4::jsonb,$5,$6)
		 RETURNING id, created_at, updated_at`,
		tenantID, rule.Name, rule.RuleType, rule.Conditions,
		rule.Severity, rule.Enabled,
	).Scan(&rule.ID, &rule.CreatedAt, &rule.UpdatedAt)
}

// UpdateAnomalyRule updates an existing anomaly rule.
func (s *Store) UpdateAnomalyRule(ctx context.Context, rule *StatusAnomalyRule) error {
	return s.db.Exec(ctx,
		`UPDATE status_anomaly_rules
		 SET name = $1, rule_type = $2, conditions = $3::jsonb, severity = $4,
		     enabled = $5, updated_at = NOW()
		 WHERE id = $6 AND tenant_id = $7`,
		rule.Name, rule.RuleType, rule.Conditions, rule.Severity,
		rule.Enabled, rule.ID, rule.TenantID,
	)
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

// ListAnomalies returns anomalies for a tenant with optional resolved filter
// and pagination. Also returns the total count for pagination.
func (s *Store) ListAnomalies(ctx context.Context, tenantID string, resolved *bool, limit, offset int) ([]models.StatusAnomaly, int, error) {
	// Count total.
	countQuery := `SELECT COUNT(*) FROM status_anomalies WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if resolved != nil {
		countQuery += fmt.Sprintf(` AND resolved = $%d`, argIdx)
		args = append(args, *resolved)
		argIdx++
	}

	var total int
	if err := s.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Fetch page.
	selectQuery := `SELECT id, tenant_id, COALESCE(rule_id,''), COALESCE(broker_id,''),
	                       COALESCE(affiliate_id,''), COALESCE(lead_id,''),
	                       anomaly_type, COALESCE(details,''), severity,
	                       resolved, COALESCE(resolved_by,''), detected_at, resolved_at
	                FROM status_anomalies WHERE tenant_id = $1`

	selectArgs := []interface{}{tenantID}
	selectIdx := 2

	if resolved != nil {
		selectQuery += fmt.Sprintf(` AND resolved = $%d`, selectIdx)
		selectArgs = append(selectArgs, *resolved)
		selectIdx++
	}

	selectQuery += fmt.Sprintf(` ORDER BY detected_at DESC LIMIT $%d OFFSET $%d`, selectIdx, selectIdx+1)
	selectArgs = append(selectArgs, limit, offset)

	rows, err := s.db.Pool.Query(ctx, selectQuery, selectArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var anomalies []models.StatusAnomaly
	for rows.Next() {
		var a models.StatusAnomaly
		if err := rows.Scan(
			&a.ID, &a.TenantID, &a.RuleID, &a.BrokerID,
			&a.AffiliateID, &a.LeadID,
			&a.AnomalyType, &a.Details, &a.Severity,
			&a.Resolved, &a.ResolvedBy, &a.DetectedAt, &a.ResolvedAt,
		); err != nil {
			return nil, 0, err
		}
		anomalies = append(anomalies, a)
	}
	if anomalies == nil {
		anomalies = []models.StatusAnomaly{}
	}
	return anomalies, total, rows.Err()
}

// CreateAnomaly inserts a new status anomaly record.
func (s *Store) CreateAnomaly(ctx context.Context, anomaly *models.StatusAnomaly) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO status_anomalies
			(tenant_id, rule_id, broker_id, affiliate_id, lead_id,
			 anomaly_type, details, severity, resolved)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		 RETURNING id, detected_at`,
		anomaly.TenantID, nilIfEmpty(anomaly.RuleID), nilIfEmpty(anomaly.BrokerID),
		nilIfEmpty(anomaly.AffiliateID), nilIfEmpty(anomaly.LeadID),
		anomaly.AnomalyType, nilIfEmpty(anomaly.Details), anomaly.Severity, anomaly.Resolved,
	).Scan(&anomaly.ID, &anomaly.DetectedAt)
}

// ResolveAnomaly marks an anomaly as resolved.
func (s *Store) ResolveAnomaly(ctx context.Context, tenantID, id, userID string) error {
	return s.db.Exec(ctx,
		`UPDATE status_anomalies
		 SET resolved = TRUE, resolved_by = $1, resolved_at = NOW()
		 WHERE id = $2 AND tenant_id = $3`,
		userID, id, tenantID,
	)
}

// ---------------------------------------------------------------------------
// Status Analytics
// ---------------------------------------------------------------------------

// StatusDistEntry represents aggregated lead counts per status group per broker.
type StatusDistEntry struct {
	BrokerID    string  `json:"broker_id"`
	BrokerName  string  `json:"broker_name"`
	StatusGroup string  `json:"status_group"`
	Count       int     `json:"count"`
	Percentage  float64 `json:"percentage"`
}

// GetStatusDistribution aggregates lead counts per normalized status group per
// broker within the given time range.
func (s *Store) GetStatusDistribution(ctx context.Context, tenantID string, brokerID string, from, to time.Time) ([]StatusDistEntry, error) {
	query := `
		SELECT le.broker_id, COALESCE(b.name, le.broker_id), le.request_body->>'normalized_status' AS status_group,
		       COUNT(*) AS cnt
		FROM lead_events le
		LEFT JOIN brokers b ON b.id = le.broker_id AND b.tenant_id = $1
		WHERE le.tenant_id = $1
		  AND le.event_type = 'postback_received'
		  AND le.created_at >= $2
		  AND le.created_at <= $3`

	args := []interface{}{tenantID, from, to}
	argIdx := 4

	if brokerID != "" {
		query += fmt.Sprintf(` AND le.broker_id = $%d`, argIdx)
		args = append(args, brokerID)
		argIdx++
	}

	query += ` GROUP BY le.broker_id, b.name, status_group ORDER BY le.broker_id, cnt DESC`

	rows, err := s.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []StatusDistEntry
	var totalByBroker = make(map[string]int)

	for rows.Next() {
		var e StatusDistEntry
		var brokerName *string
		if err := rows.Scan(&e.BrokerID, &brokerName, &e.StatusGroup, &e.Count); err != nil {
			return nil, err
		}
		if brokerName != nil {
			e.BrokerName = *brokerName
		}
		totalByBroker[e.BrokerID] += e.Count
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Calculate percentages.
	for i := range entries {
		total := totalByBroker[entries[i].BrokerID]
		if total > 0 {
			entries[i].Percentage = float64(entries[i].Count) / float64(total) * 100
		}
	}

	if entries == nil {
		entries = []StatusDistEntry{}
	}
	return entries, nil
}

// StaleLead represents a lead stuck in a non-terminal status.
type StaleLead struct {
	LeadID     string    `json:"lead_id"`
	BrokerID   string    `json:"broker_id"`
	Status     string    `json:"status"`
	HoursStale float64   `json:"hours_stale"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// GetStaleLeads returns leads that have not been updated for more than the
// given threshold hours and are still in a non-terminal status.
func (s *Store) GetStaleLeads(ctx context.Context, tenantID string, thresholdHours int) ([]StaleLead, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT l.id, COALESCE(le.broker_id, ''), l.status,
		        EXTRACT(EPOCH FROM (NOW() - l.updated_at)) / 3600.0 AS hours_stale,
		        l.updated_at
		 FROM leads l
		 LEFT JOIN LATERAL (
		     SELECT broker_id FROM lead_events
		     WHERE lead_id = l.id AND event_type = 'delivery_success'
		     ORDER BY created_at DESC LIMIT 1
		 ) le ON TRUE
		 WHERE l.tenant_id = $1
		   AND l.status NOT IN ('rejected', 'duplicate', 'converted', 'fraud')
		   AND l.updated_at < NOW() - ($2 || ' hours')::INTERVAL
		 ORDER BY l.updated_at ASC
		 LIMIT 200`,
		tenantID, fmt.Sprintf("%d", thresholdHours),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leads []StaleLead
	for rows.Next() {
		var sl StaleLead
		if err := rows.Scan(&sl.LeadID, &sl.BrokerID, &sl.Status, &sl.HoursStale, &sl.UpdatedAt); err != nil {
			return nil, err
		}
		leads = append(leads, sl)
	}
	if leads == nil {
		leads = []StaleLead{}
	}
	return leads, rows.Err()
}

// CountStatusChanges counts lead_events of type postback_received for the
// given broker in the last N minutes.
func (s *Store) CountStatusChanges(ctx context.Context, brokerID string, sinceMinutes int) (int, error) {
	var count int
	err := s.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*)
		 FROM lead_events
		 WHERE broker_id = $1
		   AND event_type = 'postback_received'
		   AND created_at >= NOW() - ($2 || ' minutes')::INTERVAL`,
		brokerID, fmt.Sprintf("%d", sinceMinutes),
	).Scan(&count)
	return count, err
}

// GetBrokerRejectionRate calculates the rejection rate (rejected / total) for
// the last N leads from the given affiliate delivered to the given broker.
func (s *Store) GetBrokerRejectionRate(ctx context.Context, tenantID, brokerID, affiliateID string, lastN int) (float64, error) {
	var total, rejected int
	err := s.db.Pool.QueryRow(ctx,
		`WITH recent_leads AS (
			SELECT l.id, l.status
			FROM leads l
			INNER JOIN lead_events le ON le.lead_id = l.id
			WHERE l.tenant_id = $1
			  AND l.affiliate_id = $2
			  AND le.broker_id = $3
			  AND le.event_type = 'delivery_success'
			ORDER BY le.created_at DESC
			LIMIT $4
		)
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE status IN ('rejected', 'duplicate'))
		FROM recent_leads`,
		tenantID, affiliateID, brokerID, lastN,
	).Scan(&total, &rejected)
	if err != nil {
		return 0, err
	}
	if total == 0 {
		return 0, nil
	}
	return float64(rejected) / float64(total), nil
}
