package models

import "time"

type Role string

const (
	RoleSuperAdmin      Role = "super_admin"
	RoleNetworkAdmin    Role = "network_admin"
	RoleAffiliateManager Role = "affiliate_manager"
	RoleMediaBuyer      Role = "media_buyer"
	RoleTeamLead        Role = "team_lead"
	RoleFinanceManager  Role = "finance_manager"
)

type User struct {
	ID           string    `json:"id" db:"id"`
	TenantID     string    `json:"tenant_id" db:"tenant_id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Name         string    `json:"name" db:"name"`
	Role         Role      `json:"role" db:"role"`
	Is2FAEnabled bool      `json:"is_2fa_enabled" db:"is_2fa_enabled"`
	TOTPSecret   string    `json:"-" db:"totp_secret_enc"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type Tenant struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Domain    string    `json:"domain,omitempty" db:"domain"`
	Plan      string    `json:"plan" db:"plan"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	Settings  []byte    `json:"settings,omitempty" db:"settings"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
