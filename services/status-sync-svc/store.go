package main

import (
	"context"
	"encoding/json"
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

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
