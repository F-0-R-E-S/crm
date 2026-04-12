package models

import (
	"encoding/json"
	"time"
)

// IPWhitelistEntry represents an allowed IP range.
type IPWhitelistEntry struct {
	ID          string     `json:"id" db:"id"`
	TenantID    string     `json:"tenant_id" db:"tenant_id"`
	IPRange     string     `json:"ip_range" db:"ip_range"` // CIDR notation
	Description string     `json:"description,omitempty" db:"description"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedBy   string     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty" db:"expires_at"`
}

// GDPRRequest represents a data subject request.
type GDPRRequest struct {
	ID           string          `json:"id" db:"id"`
	TenantID     string          `json:"tenant_id" db:"tenant_id"`
	RequestType  string          `json:"request_type" db:"request_type"` // erasure, portability, access, rectification
	SubjectEmail string          `json:"subject_email" db:"subject_email"`
	SubjectData  json.RawMessage `json:"subject_data,omitempty" db:"subject_data"`
	Status       string          `json:"status" db:"status"` // pending, processing, completed, rejected
	CompletedAt  *time.Time      `json:"completed_at,omitempty" db:"completed_at"`
	RequestedBy  string          `json:"requested_by,omitempty" db:"requested_by"`
	ProcessedBy  string          `json:"processed_by,omitempty" db:"processed_by"`
	Notes        string          `json:"notes,omitempty" db:"notes"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// ConsentRecord tracks per-lead consent for GDPR.
type ConsentRecord struct {
	ID          string     `json:"id" db:"id"`
	TenantID    string     `json:"tenant_id" db:"tenant_id"`
	LeadID      string     `json:"lead_id" db:"lead_id"`
	ConsentType string     `json:"consent_type" db:"consent_type"`
	Granted     bool       `json:"granted" db:"granted"`
	IP          string     `json:"ip,omitempty" db:"ip"`
	UserAgent   string     `json:"user_agent,omitempty" db:"user_agent"`
	GrantedAt   time.Time  `json:"granted_at" db:"granted_at"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
}

// AuditLogEntry represents an entry in the audit log.
type AuditLogEntry struct {
	ID           string          `json:"id" db:"id"`
	TenantID     string          `json:"tenant_id" db:"tenant_id"`
	UserID       string          `json:"user_id,omitempty" db:"user_id"`
	Action       string          `json:"action" db:"action"`
	ResourceType string          `json:"resource_type" db:"resource_type"`
	ResourceID   string          `json:"resource_id,omitempty" db:"resource_id"`
	BeforeState  json.RawMessage `json:"before_state,omitempty" db:"before_state"`
	AfterState   json.RawMessage `json:"after_state,omitempty" db:"after_state"`
	Changes      json.RawMessage `json:"changes,omitempty" db:"changes"`
	IP           string          `json:"ip,omitempty" db:"ip"`
	UserAgent    string          `json:"user_agent,omitempty" db:"user_agent"`
	RequestID    string          `json:"request_id,omitempty" db:"request_id"`
	SessionID    string          `json:"session_id,omitempty" db:"session_id"`
	DurationMs   int             `json:"duration_ms,omitempty" db:"duration_ms"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}
