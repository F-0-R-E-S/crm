package models

import (
	"encoding/json"
	"time"
)

// MLFraudModel represents a trained ML model version.
type MLFraudModel struct {
	ID                string          `json:"id" db:"id"`
	ModelType         string          `json:"model_type" db:"model_type"`
	Version           int             `json:"version" db:"version"`
	Status            string          `json:"status" db:"status"` // training, evaluating, active, retired
	Metrics           json.RawMessage `json:"metrics,omitempty" db:"metrics"`
	FeatureImportance json.RawMessage `json:"feature_importance,omitempty" db:"feature_importance"`
	ModelPath         string          `json:"model_path,omitempty" db:"model_path"`
	TrainedOnRows     int             `json:"trained_on_rows" db:"trained_on_rows"`
	TrainedAt         *time.Time      `json:"trained_at,omitempty" db:"trained_at"`
	ActivatedAt       *time.Time      `json:"activated_at,omitempty" db:"activated_at"`
	CreatedAt         time.Time       `json:"created_at" db:"created_at"`
}

// BehavioralEvent records JS SDK behavioral data.
type BehavioralEvent struct {
	ID        string          `json:"id" db:"id"`
	TenantID  string          `json:"tenant_id" db:"tenant_id"`
	SessionID string          `json:"session_id" db:"session_id"`
	LeadID    string          `json:"lead_id,omitempty" db:"lead_id"`
	EventType string          `json:"event_type" db:"event_type"`
	EventData json.RawMessage `json:"event_data" db:"event_data"`
	ClientTS  *time.Time      `json:"client_ts,omitempty" db:"client_ts"`
	IP        string          `json:"ip,omitempty" db:"ip"`
	UserAgent string          `json:"user_agent,omitempty" db:"user_agent"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
}

// FraudIntelligenceEntry represents a shared fraud intelligence record.
type FraudIntelligenceEntry struct {
	ID                  string    `json:"id" db:"id"`
	ContributorTenantID string    `json:"contributor_tenant_id,omitempty" db:"contributor_tenant_id"`
	EntryType           string    `json:"entry_type" db:"entry_type"` // ip, email, phone, pattern
	HashedValue         string    `json:"hashed_value" db:"hashed_value"`
	RiskScore           int       `json:"risk_score" db:"risk_score"`
	Confidence          float64   `json:"confidence" db:"confidence"`
	ReportsCount        int       `json:"reports_count" db:"reports_count"`
	FirstSeen           time.Time `json:"first_seen" db:"first_seen"`
	LastSeen            time.Time `json:"last_seen" db:"last_seen"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
}

// FraudRuleExperiment represents an A/B test for fraud rules.
type FraudRuleExperiment struct {
	ID            string          `json:"id" db:"id"`
	TenantID      string          `json:"tenant_id" db:"tenant_id"`
	Name          string          `json:"name" db:"name"`
	Description   string          `json:"description,omitempty" db:"description"`
	ControlConfig json.RawMessage `json:"control_config" db:"control_config"`
	VariantConfig json.RawMessage `json:"variant_config" db:"variant_config"`
	TrafficSplit  float64         `json:"traffic_split" db:"traffic_split"`
	Status        string          `json:"status" db:"status"` // draft, running, paused, completed
	Results       json.RawMessage `json:"results,omitempty" db:"results"`
	StartedAt     *time.Time      `json:"started_at,omitempty" db:"started_at"`
	EndedAt       *time.Time      `json:"ended_at,omitempty" db:"ended_at"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at" db:"updated_at"`
}

// VelocityRule defines a rate-limiting rule for suspicious patterns.
type VelocityRule struct {
	ID                string    `json:"id" db:"id"`
	TenantID          string    `json:"tenant_id" db:"tenant_id"`
	Name              string    `json:"name" db:"name"`
	Dimension         string    `json:"dimension" db:"dimension"` // ip, email_domain, phone_prefix, affiliate, geo, device
	MaxCount          int       `json:"max_count" db:"max_count"`
	TimeWindowSeconds int       `json:"time_window_seconds" db:"time_window_seconds"`
	Action            string    `json:"action" db:"action"` // block, flag, reduce_score, notify
	IsActive          bool      `json:"is_active" db:"is_active"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}
