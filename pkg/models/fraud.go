package models

import (
	"encoding/json"
	"time"
)

// BlacklistEntry represents an IP/email/phone/domain blacklist record.
type BlacklistEntry struct {
	ID        string     `json:"id" db:"id"`
	TenantID  string     `json:"tenant_id" db:"tenant_id"`
	ListType  string     `json:"list_type" db:"list_type"` // ip, email, phone, domain
	Value     string     `json:"value" db:"value"`
	Pattern   string     `json:"pattern,omitempty" db:"pattern"`
	Reason    string     `json:"reason,omitempty" db:"reason"`
	Source    string     `json:"source" db:"source"` // manual, auto, import
	ExpiresAt *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	CreatedBy string     `json:"created_by,omitempty" db:"created_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

// FraudCheckResult is the persisted fraud check for a lead.
type FraudCheckResult struct {
	ID           string          `json:"id" db:"id"`
	TenantID     string          `json:"tenant_id" db:"tenant_id"`
	LeadID       string          `json:"lead_id" db:"lead_id"`
	OverallScore int             `json:"overall_score" db:"overall_score"`
	Verdict      string          `json:"verdict" db:"verdict"`
	Checks       json.RawMessage `json:"checks" db:"checks"`
	IPData       json.RawMessage `json:"ip_data,omitempty" db:"ip_data"`
	PhoneData    json.RawMessage `json:"phone_data,omitempty" db:"phone_data"`
	ProfileID    string          `json:"profile_id,omitempty" db:"profile_id"`
	CheckedAt    time.Time       `json:"checked_at" db:"checked_at"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}

// ShaveEvent records a suspected shave detection.
type ShaveEvent struct {
	ID             string     `json:"id" db:"id"`
	TenantID       string     `json:"tenant_id" db:"tenant_id"`
	LeadID         string     `json:"lead_id" db:"lead_id"`
	BrokerID       string     `json:"broker_id" db:"broker_id"`
	AffiliateID    string     `json:"affiliate_id,omitempty" db:"affiliate_id"`
	OldStatus      string     `json:"old_status" db:"old_status"`
	NewStatus      string     `json:"new_status" db:"new_status"`
	OldRank        int        `json:"old_rank" db:"old_rank"`
	NewRank        int        `json:"new_rank" db:"new_rank"`
	RawStatus      string     `json:"raw_status,omitempty" db:"raw_status"`
	DetectedAt     time.Time  `json:"detected_at" db:"detected_at"`
	Acknowledged   bool       `json:"acknowledged" db:"acknowledged"`
	AcknowledgedBy string     `json:"acknowledged_by,omitempty" db:"acknowledged_by"`
	AcknowledgedAt *time.Time `json:"acknowledged_at,omitempty" db:"acknowledged_at"`
}

// FraudDashboardStats aggregates fraud statistics.
type FraudDashboardStats struct {
	TotalChecked      int            `json:"total_checked"`
	TotalFlagged      int            `json:"total_flagged"`
	TotalRejected     int            `json:"total_rejected"`
	TotalApproved     int            `json:"total_approved"`
	AvgScore          float64        `json:"avg_score"`
	ScoreDistribution map[string]int `json:"score_distribution"` // "0-20": N, "21-40": N, etc.
	VPNCount          int            `json:"vpn_count"`
	TORCount          int            `json:"tor_count"`
	ProxyCount        int            `json:"proxy_count"`
	BotCount          int            `json:"bot_count"`
	VOIPCount         int            `json:"voip_count"`
}
