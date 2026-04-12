package models

import (
	"encoding/json"
	"time"
)

type Affiliate struct {
	ID             string          `json:"id" db:"id"`
	TenantID       string          `json:"tenant_id" db:"tenant_id"`
	Name           string          `json:"name" db:"name"`
	Email          string          `json:"email" db:"email"`
	Status         string          `json:"status" db:"status"`
	APIKey         string          `json:"api_key,omitempty" db:"-"`
	APIKeyHash     string          `json:"-" db:"api_key_hash"`
	PostbackURL    string          `json:"postback_url,omitempty" db:"postback_url"`
	PostbackEvents json.RawMessage `json:"postback_events,omitempty" db:"postback_events"`
	AllowedIPs     []string        `json:"allowed_ips,omitempty" db:"allowed_ips"`
	FraudProfile   json.RawMessage `json:"fraud_profile,omitempty" db:"fraud_profile"`
	DailyCap       int             `json:"daily_cap" db:"daily_cap"`
	TotalCap       int             `json:"total_cap" db:"total_cap"`
	CountryCaps    json.RawMessage `json:"country_caps,omitempty" db:"country_caps"`
	ParentID       *string         `json:"parent_id,omitempty" db:"parent_id"`
	Level          int             `json:"level" db:"level"`
	ManagerID      *string         `json:"manager_id,omitempty" db:"manager_id"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at" db:"updated_at"`
}
