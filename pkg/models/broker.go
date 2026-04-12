package models

import (
	"encoding/json"
	"time"
)

type BrokerStatus string

const (
	BrokerStatusActive   BrokerStatus = "active"
	BrokerStatusInactive BrokerStatus = "inactive"
	BrokerStatusPaused   BrokerStatus = "paused"
)

type Broker struct {
	ID          string          `json:"id" db:"id"`
	TenantID    string          `json:"tenant_id" db:"tenant_id"`
	Name        string          `json:"name" db:"name"`
	Status      BrokerStatus    `json:"status" db:"status"`
	TemplateID  string          `json:"template_id" db:"template_id"`
	Endpoint    string          `json:"endpoint" db:"endpoint"`
	Credentials json.RawMessage `json:"credentials,omitempty" db:"credentials_enc"`
	FieldMapping json.RawMessage `json:"field_mapping" db:"field_mapping"`
	DailyCap    int             `json:"daily_cap" db:"daily_cap"`
	TotalCap    int             `json:"total_cap" db:"total_cap"`
	CountryCaps json.RawMessage `json:"country_caps,omitempty" db:"country_caps"`
	Priority      int             `json:"priority" db:"priority"`
	HealthStatus  string          `json:"health_status" db:"health_status"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at" db:"updated_at"`
}

type BrokerTemplate struct {
	ID           string          `json:"id" db:"id"`
	Name         string          `json:"name" db:"name"`
	Version      int             `json:"version" db:"version"`
	Method       string          `json:"method" db:"method"`
	URLTemplate  string          `json:"url_template" db:"url_template"`
	Headers      json.RawMessage `json:"headers" db:"headers"`
	BodyTemplate string          `json:"body_template" db:"body_template"`
	AuthType     string          `json:"auth_type" db:"auth_type"`
	ResponseMapping json.RawMessage `json:"response_mapping" db:"response_mapping"`
	PostbackConfig  json.RawMessage `json:"postback_config,omitempty" db:"postback_config"`
	IsPublic     bool            `json:"is_public" db:"is_public"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}
