package models

import (
	"encoding/json"
	"time"
)

type LeadStatus string

const (
	LeadStatusNew        LeadStatus = "new"
	LeadStatusProcessing LeadStatus = "processing"
	LeadStatusRouted     LeadStatus = "routed"
	LeadStatusDelivered  LeadStatus = "delivered"
	LeadStatusRejected   LeadStatus = "rejected"
	LeadStatusFraud      LeadStatus = "fraud"
	LeadStatusDuplicate  LeadStatus = "duplicate"
)

type Lead struct {
	ID             string          `json:"id" db:"id"`
	TenantID       string          `json:"tenant_id" db:"tenant_id"`
	AffiliateID    string          `json:"affiliate_id" db:"affiliate_id"`
	IdempotencyKey string          `json:"idempotency_key,omitempty" db:"idempotency_key"`
	FirstName      string          `json:"first_name" db:"first_name"`
	LastName       string          `json:"last_name" db:"last_name"`
	Email          string          `json:"email" db:"email"`
	Phone          string          `json:"phone" db:"phone"`
	PhoneE164      string          `json:"phone_e164" db:"phone_e164"`
	Country        string          `json:"country" db:"country"`
	IP             string          `json:"ip" db:"ip"`
	UserAgent      string          `json:"user_agent" db:"user_agent"`
	Status         LeadStatus      `json:"status" db:"status"`
	QualityScore   int             `json:"quality_score" db:"quality_score"`
	FraudCard      json.RawMessage `json:"fraud_card,omitempty" db:"fraud_card"`
	Extra          json.RawMessage `json:"extra,omitempty" db:"extra"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at" db:"updated_at"`
}

type LeadEvent struct {
	ID          string          `json:"id" db:"id"`
	LeadID      string          `json:"lead_id" db:"lead_id"`
	TenantID    string          `json:"tenant_id" db:"tenant_id"`
	EventType   string          `json:"event_type" db:"event_type"`
	BrokerID    string          `json:"broker_id,omitempty" db:"broker_id"`
	RequestBody json.RawMessage `json:"request_body,omitempty" db:"request_body"`
	ResponseBody json.RawMessage `json:"response_body,omitempty" db:"response_body"`
	StatusCode  int             `json:"status_code,omitempty" db:"status_code"`
	Duration    time.Duration   `json:"duration,omitempty" db:"duration_ms"`
	Error       string          `json:"error,omitempty" db:"error"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
}

type FraudVerificationCard struct {
	LeadID       string           `json:"lead_id"`
	OverallScore int              `json:"overall_score"`
	Verdict      string           `json:"verdict"`
	Checks       []FraudCheck     `json:"checks"`
	CheckedAt    time.Time        `json:"checked_at"`
}

type FraudCheck struct {
	Category    string `json:"category"`
	CheckName   string `json:"check_name"`
	Score       int    `json:"score"`
	MaxScore    int    `json:"max_score"`
	Result      string `json:"result"`
	Explanation string `json:"explanation"`
	Provider    string `json:"provider,omitempty"`
}
