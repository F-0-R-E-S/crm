package models

import "time"

type APIKeyRecord struct {
	ID        string    `json:"id" db:"id"`
	TenantID  string    `json:"tenant_id" db:"tenant_id"`
	Name      string    `json:"name" db:"name"`
	KeyPrefix string    `json:"key_prefix" db:"key_prefix"`
	Scopes    []string  `json:"scopes" db:"scopes"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
