package models

import "time"

// StatusGroup represents a unified lead status classification.
type StatusGroup struct {
	ID         string    `json:"id" db:"id"`
	TenantID   string    `json:"tenant_id,omitempty" db:"tenant_id"`
	Name       string    `json:"name" db:"name"`
	Slug       string    `json:"slug" db:"slug"`
	Rank       int       `json:"rank" db:"rank"`
	Color      string    `json:"color" db:"color"`
	Icon       string    `json:"icon,omitempty" db:"icon"`
	IsTerminal bool      `json:"is_terminal" db:"is_terminal"`
	IsNegative bool      `json:"is_negative" db:"is_negative"`
	IsSystem   bool      `json:"is_system" db:"is_system"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

// BrokerStatusMapping maps a broker's raw status to a status group slug.
type BrokerStatusMapping struct {
	ID              string    `json:"id" db:"id"`
	TenantID        string    `json:"tenant_id" db:"tenant_id"`
	BrokerID        string    `json:"broker_id" db:"broker_id"`
	RawStatus       string    `json:"raw_status" db:"raw_status"`
	StatusGroupSlug string    `json:"status_group_slug" db:"status_group_slug"`
	AutoMapped      bool      `json:"auto_mapped" db:"auto_mapped"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// StatusAnomaly represents a detected status anomaly.
type StatusAnomaly struct {
	ID          string     `json:"id" db:"id"`
	TenantID    string     `json:"tenant_id" db:"tenant_id"`
	RuleID      string     `json:"rule_id,omitempty" db:"rule_id"`
	BrokerID    string     `json:"broker_id,omitempty" db:"broker_id"`
	AffiliateID string     `json:"affiliate_id,omitempty" db:"affiliate_id"`
	LeadID      string     `json:"lead_id,omitempty" db:"lead_id"`
	AnomalyType string     `json:"anomaly_type" db:"anomaly_type"`
	Details     string     `json:"details,omitempty" db:"details"`
	Severity    string     `json:"severity" db:"severity"`
	Resolved    bool       `json:"resolved" db:"resolved"`
	ResolvedBy  string     `json:"resolved_by,omitempty" db:"resolved_by"`
	DetectedAt  time.Time  `json:"detected_at" db:"detected_at"`
	ResolvedAt  *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
}
