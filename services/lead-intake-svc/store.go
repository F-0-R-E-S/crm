package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/netip"
	"strings"
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

func (s *Store) CreateLead(ctx context.Context, lead *models.Lead) error {
	extraJSON, _ := json.Marshal(lead.Extra)
	if lead.Extra == nil {
		extraJSON = []byte("{}")
	}

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
			 country, ip, user_agent, funnel_name,
			 aff_sub1, aff_sub2, aff_sub3, aff_sub4, aff_sub5,
			 aff_sub6, aff_sub7, aff_sub8, aff_sub9, aff_sub10,
			 status, quality_score, fraud_card, extra)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
		 RETURNING id, created_at, updated_at`,
		lead.TenantID, lead.AffiliateID, nilIfEmpty(lead.IdempotencyKey),
		lead.FirstName, lead.LastName, lead.Email, lead.Phone, lead.PhoneE164,
		lead.Country, ipVal, lead.UserAgent, nilIfEmpty(lead.FunnelName),
		nilIfEmpty(lead.AffSub1), nilIfEmpty(lead.AffSub2), nilIfEmpty(lead.AffSub3),
		nilIfEmpty(lead.AffSub4), nilIfEmpty(lead.AffSub5), nilIfEmpty(lead.AffSub6),
		nilIfEmpty(lead.AffSub7), nilIfEmpty(lead.AffSub8), nilIfEmpty(lead.AffSub9),
		nilIfEmpty(lead.AffSub10),
		string(lead.Status), lead.QualityScore, lead.FraudCard, extraJSON,
	).Scan(&lead.ID, &lead.CreatedAt, &lead.UpdatedAt)
}

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

func (s *Store) UpdateLeadStatus(ctx context.Context, leadID string, status models.LeadStatus) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2`,
		string(status), leadID,
	)
}

func (s *Store) UpdateLeadFraudCard(ctx context.Context, leadID string, fraudCard json.RawMessage, qualityScore int) error {
	return s.db.Exec(ctx,
		`UPDATE leads SET fraud_card = $1, quality_score = $2, updated_at = NOW() WHERE id = $3`,
		fraudCard, qualityScore, leadID,
	)
}

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

// DuplicateInfo holds details about a detected duplicate.
type DuplicateInfo struct {
	DuplicateOf      string
	MatchedOn        string // "email", "phone", "both"
	OriginalCreatedAt time.Time
}

// CheckDuplicate checks for duplicate leads by email AND phone within the given window.
func (s *Store) CheckDuplicate(ctx context.Context, tenantID, email, phoneE164 string, window time.Duration) (*DuplicateInfo, error) {
	cutoff := time.Now().Add(-window)

	var id string
	var createdAt time.Time
	var matchedEmail, matchedPhone bool

	// Check email duplicate
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, created_at FROM leads
		 WHERE tenant_id = $1 AND email = $2 AND created_at > $3
		 ORDER BY created_at DESC LIMIT 1`,
		tenantID, email, cutoff,
	).Scan(&id, &createdAt)
	if err == nil {
		matchedEmail = true
	} else if err != pgx.ErrNoRows {
		return nil, err
	}

	// Check phone duplicate (only if we have a valid E.164 number)
	if phoneE164 != "" {
		var phoneID string
		var phoneCreatedAt time.Time
		err = s.db.Pool.QueryRow(ctx,
			`SELECT id, created_at FROM leads
			 WHERE tenant_id = $1 AND phone_e164 = $2 AND created_at > $3
			 ORDER BY created_at DESC LIMIT 1`,
			tenantID, phoneE164, cutoff,
		).Scan(&phoneID, &phoneCreatedAt)
		if err == nil {
			matchedPhone = true
			if !matchedEmail || phoneCreatedAt.After(createdAt) {
				id = phoneID
				createdAt = phoneCreatedAt
			}
		} else if err != pgx.ErrNoRows {
			return nil, err
		}
	}

	if !matchedEmail && !matchedPhone {
		return nil, nil
	}

	matchedOn := "email"
	if matchedEmail && matchedPhone {
		matchedOn = "both"
	} else if matchedPhone {
		matchedOn = "phone"
	}

	return &DuplicateInfo{
		DuplicateOf:      id,
		MatchedOn:        matchedOn,
		OriginalCreatedAt: createdAt,
	}, nil
}

func (s *Store) GetLead(ctx context.Context, leadID string) (*models.Lead, error) {
	lead := &models.Lead{}
	var ip *netip.Prefix
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, affiliate_id, idempotency_key,
		        first_name, last_name, email, phone, phone_e164,
		        country, ip, user_agent, funnel_name,
		        aff_sub1, aff_sub2, aff_sub3, aff_sub4, aff_sub5,
		        aff_sub6, aff_sub7, aff_sub8, aff_sub9, aff_sub10,
		        status, quality_score,
		        fraud_card, extra, created_at, updated_at
		 FROM leads WHERE id = $1`,
		leadID,
	).Scan(
		&lead.ID, &lead.TenantID, &lead.AffiliateID, &lead.IdempotencyKey,
		&lead.FirstName, &lead.LastName, &lead.Email, &lead.Phone, &lead.PhoneE164,
		&lead.Country, &ip, &lead.UserAgent, &lead.FunnelName,
		&lead.AffSub1, &lead.AffSub2, &lead.AffSub3, &lead.AffSub4, &lead.AffSub5,
		&lead.AffSub6, &lead.AffSub7, &lead.AffSub8, &lead.AffSub9, &lead.AffSub10,
		&lead.Status, &lead.QualityScore,
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

// LeadFilters holds query parameters for listing leads.
type LeadFilters struct {
	Status      string
	Country     string
	AffiliateID string
	Search      string
	DateFrom    string
	DateTo      string
}

func (s *Store) ListLeads(ctx context.Context, tenantID string, limit, offset int, f LeadFilters) ([]*models.Lead, int, error) {
	where := []string{"tenant_id = $1"}
	args := []interface{}{tenantID}
	idx := 2

	if f.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", idx))
		args = append(args, f.Status)
		idx++
	}
	if f.Country != "" {
		where = append(where, fmt.Sprintf("country = $%d", idx))
		args = append(args, strings.ToUpper(f.Country))
		idx++
	}
	if f.AffiliateID != "" {
		where = append(where, fmt.Sprintf("affiliate_id = $%d", idx))
		args = append(args, f.AffiliateID)
		idx++
	}
	if f.DateFrom != "" {
		if t, err := time.Parse(time.RFC3339, f.DateFrom); err == nil {
			where = append(where, fmt.Sprintf("created_at >= $%d", idx))
			args = append(args, t)
			idx++
		}
	}
	if f.DateTo != "" {
		if t, err := time.Parse(time.RFC3339, f.DateTo); err == nil {
			where = append(where, fmt.Sprintf("created_at <= $%d", idx))
			args = append(args, t)
			idx++
		}
	}
	if f.Search != "" {
		searchPattern := "%" + strings.ToLower(f.Search) + "%"
		where = append(where, fmt.Sprintf("(LOWER(email) LIKE $%d OR LOWER(first_name) LIKE $%d OR phone_e164 LIKE $%d)", idx, idx, idx))
		args = append(args, searchPattern)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	var total int
	err := s.db.Pool.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM leads WHERE %s", whereClause),
		args...,
	).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	queryArgs := append(args, limit, offset)
	rows, err := s.db.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, affiliate_id, first_name, last_name,
		        email, phone_e164, country, funnel_name, status, quality_score,
		        created_at, updated_at
		 FROM leads
		 WHERE %s
		 ORDER BY created_at DESC
		 LIMIT $%d OFFSET $%d`, whereClause, idx, idx+1),
		queryArgs...,
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
			&lead.Country, &lead.FunnelName, &lead.Status, &lead.QualityScore,
			&lead.CreatedAt, &lead.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		leads = append(leads, lead)
	}
	return leads, total, nil
}

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

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
