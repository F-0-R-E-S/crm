package models

import (
	"encoding/json"
	"time"
)

type DistributionRule struct {
	ID              string          `json:"id" db:"id"`
	TenantID        string          `json:"tenant_id" db:"tenant_id"`
	Name            string          `json:"name" db:"name"`
	Priority        int             `json:"priority" db:"priority"`
	IsActive        bool            `json:"is_active" db:"is_active"`
	Conditions      json.RawMessage `json:"conditions" db:"conditions"`
	BrokerTargets   json.RawMessage `json:"broker_targets" db:"broker_targets"`
	Algorithm       string          `json:"algorithm" db:"algorithm"`
	DailyCap        int             `json:"daily_cap" db:"daily_cap"`
	TotalCap        int             `json:"total_cap" db:"total_cap"`
	CountryCaps     json.RawMessage `json:"country_caps,omitempty" db:"country_caps"`
	DelayedActions  json.RawMessage `json:"delayed_actions,omitempty" db:"delayed_actions"`
	CRLimits        json.RawMessage `json:"cr_limits,omitempty" db:"cr_limits"`
	TimezoneSlots   json.RawMessage `json:"timezone_slots,omitempty" db:"timezone_slots"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

type RoutingDecision struct {
	LeadID      string   `json:"lead_id"`
	RuleID      string   `json:"rule_id"`
	BrokerID    string   `json:"broker_id"`
	Algorithm   string   `json:"algorithm"`
	Waterfall   []string `json:"waterfall"`
	Reason      string   `json:"reason"`
	DecidedAt   time.Time `json:"decided_at"`
	LatencyMs   int64    `json:"latency_ms"`
}
