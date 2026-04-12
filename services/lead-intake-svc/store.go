package main

import (
	"context"
	"encoding/json"
	"net/netip"
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

// CreateLead inserts a new lead and scans back id, created_at, updated_at.
func (s *Store) CreateLead(ctx context.Context, lead *models.Lead) error {
	extraJSON, _ := json.Marshal(lead.Extra)
	if lead.Extra == nil {
		extraJSON = []byte("{}")
	}

	// The ip column is INET; parse the string to netip.Addr so pgx encodes it
	// correctly. An empty or invalid IP is stored as NULL.
	var ipVal interface{}
	if lead.IP != "" {
		if addr, err := netip.ParseAddr(lead.IP); err == nil {
			ipVal = netip.PrefixFrom(addr, addr.BitLen())
		}
	}

	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO leads
			(tenant_id, affiliate_id, idempotency_key,
			 first_name, last_name, email, phone, phone_e164,
			 country, ip, user_agent, status, quality_score, fraud_card, extra)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		 RETURNING id, created_at, updated_at`,
		lead.TenantID, lead.AffiliateID, nilIfEmpty(lead.IdempotencyKey),
		lead.FirstName, lead.LastName, lead.Email, lead.Phone, lead.PhoneE164,
		lead.Country, ipVal, lead.UserAgent, string(lead.Status),
		lead.QualityScore, lead.FraudCard, extraJSON,
	).Scan(&lead.ID, &lead.CreatedAt, &lead.UpdatedAt)
}

// GetLeadByIdempotencyKey looks up a lead by tenant + idempotency_key.
// Returns (nil, nil) when not found.
func (s *Store) GetLeadByIdempotencyKey(ctx context.Context, tenantID, key string) (*models.Lead, error) {
	lead := &models.Lead{}
	var ip *netip.Prefix
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, affiliate_id, idempotency_key,
		        first_name, last_name, email, phone, phone_e164,
		        country, ip, status, quality_score, fraud_card,
		        created_at, updated_at
		 FROM leads
		 WHERE tenant_id = $1 AND idempotency_key = $2`,
		tenantID, key,
	).Scan(
		&lead.ID, &lead.TenantID, &lead.AffiliateID, &lead.IdempotencyKey,
		&lead.FirstName, &lead.LastName, &lead.Email, &lead.Phone, &lead.PhoneE164,
		&lead.Country, &ip, &lead.Status, &lead.QualityScore, &lead.FraudCard,
		&lead.CreatedAt, &lead.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if ip != nil {
		lead.IP = ip.Addr().String()
	}
	return lead, nil
}

// UpdateLeadStatus sets status and bumps updated_at.
func (s *Store) UpdateLeadStatus(ctx context.Context, leadID string, status models.LeadStatus) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
		string(status), leadID,
	)
}

// UpdateLeadFraudCard stores the fraud verification card and quality score.
func (s *Store) UpdateLeadFraudCard(ctx context.Context, leadID string, fraudCard json.RawMessage, qualityScore int) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET fraud_card = $1, quality_score = $2, updated_at = NOW() WHERE id = $3`,
		fraudCard, qualityScore, leadID,
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

// CheckDuplicate returns true if the same email for the same tenant was
// received within the given window.
func (s *Store) CheckDuplicate(ctx context.Context, tenantID, email string, window time.Duration) (bool, error) {
	var count int
	err := s.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM leads
		 WHERE tenant_id = $1 AND email = $2 AND created_at > $3`,
		tenantID, email, time.Now().Add(-window),
	).Scan(&count)
	return count > 0, err
}

// GetLead fetches a single lead by id. Returns (nil, nil) when not found.
func (s *Store) GetLead(ctx context.Context, leadID string) (*models.Lead, error) {
	lead := &models.Lead{}
	var ip *netip.Prefix
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
		&lead.Country, &ip, &lead.UserAgent, &lead.Status, &lead.QualityScore,
		&lead.FraudCard, &lead.Extra, &lead.CreatedAt, &lead.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if ip != nil {
		lead.IP = ip.Addr().String()
	}
	return lead, nil
}

// ListLeads returns a page of leads for a tenant, plus total count.
func (s *Store) ListLeads(ctx context.Context, tenantID string, limit, offset int) ([]*models.Lead, int, error) {
	var total int
	err := s.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM leads WHERE tenant_id = $1`, tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, affiliate_id, first_name, last_name,
		        email, phone_e164, country, status, quality_score,
		        created_at, updated_at
		 FROM leads
		 WHERE tenant_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var leads []*models.Lead
	for rows.Next() {
		lead := &models.Lead{}
		if err := rows.Scan(
			&lead.ID, &lead.TenantID, &lead.AffiliateID,
			&lead.FirstName, &lead.LastName, &lead.Email, &lead.PhoneE164,
			&lead.Country, &lead.Status, &lead.QualityScore,
			&lead.CreatedAt, &lead.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		leads = append(leads, lead)
	}
	return leads, total, nil
}

// GetLeadEvents returns all events for a lead ordered by time descending.
func (s *Store) GetLeadEvents(ctx context.Context, leadID string) ([]*models.LeadEvent, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, lead_id, tenant_id, event_type, broker_id,
		        request_body, response_body, status_code, duration_ms, error,
		        created_at
		 FROM lead_events
		 WHERE lead_id = $1
		 ORDER BY created_at DESC`,
		leadID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*models.LeadEvent
	for rows.Next() {
		ev := &models.LeadEvent{}
		var durationMs int
		var brokerID *string
		var errStr *string
		if err := rows.Scan(
			&ev.ID, &ev.LeadID, &ev.TenantID, &ev.EventType, &brokerID,
			&ev.RequestBody, &ev.ResponseBody, &ev.StatusCode, &durationMs, &errStr,
			&ev.CreatedAt,
		); err != nil {
			return nil, err
		}
		ev.Duration = time.Duration(durationMs) * time.Millisecond
		if brokerID != nil {
			ev.BrokerID = *brokerID
		}
		if errStr != nil {
			ev.Error = *errStr
		}
		events = append(events, ev)
	}
	return events, nil
}

// ---------------------------------------------------------------------------
// Affiliate cap enforcement (EPIC-04)
// ---------------------------------------------------------------------------

func (s *Store) GetAffiliateDailyCap(ctx context.Context, tenantID, affiliateID string) (cap int, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT daily_cap FROM affiliates WHERE id = $1 AND tenant_id = $2`,
		affiliateID, tenantID,
	).Scan(&cap)
	return cap, err
}

func (s *Store) CountAffiliateLeadsToday(ctx context.Context, tenantID, affiliateID string) (int, error) {
	var count int
	err := s.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM leads
		 WHERE tenant_id = $1 AND affiliate_id = $2
		   AND created_at >= CURRENT_DATE`,
		tenantID, affiliateID,
	).Scan(&count)
	return count, err
}

func (s *Store) GetAffiliatePostbackConfig(ctx context.Context, tenantID, affiliateID string) (url string, events json.RawMessage, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT COALESCE(postback_url,''), COALESCE(postback_events,'[]'::jsonb)
		 FROM affiliates WHERE id = $1 AND tenant_id = $2`,
		affiliateID, tenantID,
	).Scan(&url, &events)
	return url, events, err
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
