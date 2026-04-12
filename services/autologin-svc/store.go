package main

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
)

type AutologinStore struct {
	db *database.DB
}

func NewAutologinStore(db *database.DB) *AutologinStore {
	return &AutologinStore{db: db}
}

type AutologinConfig struct {
	BrokerID          string          `json:"broker_id"`
	IsEnabled         bool            `json:"is_enabled"`
	AutologinType     string          `json:"autologin_type"`
	URLTemplate       string          `json:"url_template"`
	HTTPMethod        string          `json:"http_method"`
	CustomHeaders     json.RawMessage `json:"custom_headers"`
	AuthMethod        string          `json:"auth_method"`
	TimeoutMs         int             `json:"timeout_ms"`
	MaxRetries        int             `json:"max_retries"`
	RetryDelayMs      int             `json:"retry_delay_ms"`
	BackoffMultiplier float64         `json:"backoff_multiplier"`
}

type LeadInfo struct {
	ID        string `json:"id"`
	TenantID  string `json:"tenant_id"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Country   string `json:"country"`
}

type Fingerprint struct {
	ID            string `json:"id"`
	TenantID      string `json:"tenant_id"`
	ProfileName   string `json:"profile_name"`
	WebGLRenderer string `json:"webgl_renderer"`
	CanvasHash    string `json:"canvas_hash"`
	UserAgent     string `json:"user_agent"`
	Timezone      string `json:"timezone"`
	ScreenWidth   int    `json:"screen_width"`
	ScreenHeight  int    `json:"screen_height"`
	Language      string `json:"language"`
	Platform      string `json:"platform"`
	UsageCount24h int    `json:"usage_count_24h"`
}

type ProxyEntry struct {
	ID             string `json:"id"`
	TenantID       string `json:"tenant_id"`
	ProxyType      string `json:"proxy_type"`
	Host           string `json:"host"`
	Port           int    `json:"port"`
	Username       string `json:"username"`
	Country        string `json:"country"`
	IsHealthy      bool   `json:"is_healthy"`
	LatencyMs      int    `json:"latency_ms"`
	ConcurrentCount int   `json:"concurrent_count"`
	MaxConcurrent  int    `json:"max_concurrent"`
}

func (s *AutologinStore) GetAutologinConfig(ctx context.Context, brokerID string) (*AutologinConfig, error) {
	cfg := &AutologinConfig{}
	err := s.db.QueryRow(ctx,
		`SELECT broker_id, is_enabled, autologin_type, url_template,
		        http_method, custom_headers, auth_method, timeout_ms,
		        max_retries, retry_delay_ms, backoff_multiplier
		 FROM broker_autologin_configs WHERE broker_id = $1 AND is_enabled = true`,
		brokerID,
	).Scan(
		&cfg.BrokerID, &cfg.IsEnabled, &cfg.AutologinType, &cfg.URLTemplate,
		&cfg.HTTPMethod, &cfg.CustomHeaders, &cfg.AuthMethod, &cfg.TimeoutMs,
		&cfg.MaxRetries, &cfg.RetryDelayMs, &cfg.BackoffMultiplier,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return cfg, nil
}

func (s *AutologinStore) GetLead(ctx context.Context, leadID string) (*LeadInfo, error) {
	lead := &LeadInfo{}
	err := s.db.QueryRow(ctx,
		`SELECT id, tenant_id, email, phone_e164, first_name, last_name, country
		 FROM leads WHERE id = $1`,
		leadID,
	).Scan(&lead.ID, &lead.TenantID, &lead.Email, &lead.Phone,
		&lead.FirstName, &lead.LastName, &lead.Country)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return lead, nil
}

func (s *AutologinStore) AssignFingerprint(ctx context.Context, tenantID string) (*Fingerprint, error) {
	fp := &Fingerprint{}
	err := s.db.QueryRow(ctx,
		`UPDATE device_fingerprints SET
			usage_count_24h = usage_count_24h + 1,
			last_used_at = NOW()
		 WHERE id = (
			SELECT id FROM device_fingerprints
			WHERE tenant_id = $1 AND is_active = true
			ORDER BY usage_count_24h ASC, RANDOM()
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		 ) RETURNING id, tenant_id, profile_name, webgl_renderer, canvas_hash,
		   user_agent, timezone, screen_width, screen_height, language, platform, usage_count_24h`,
		tenantID,
	).Scan(&fp.ID, &fp.TenantID, &fp.ProfileName, &fp.WebGLRenderer, &fp.CanvasHash,
		&fp.UserAgent, &fp.Timezone, &fp.ScreenWidth, &fp.ScreenHeight,
		&fp.Language, &fp.Platform, &fp.UsageCount24h)
	if err != nil {
		return nil, err
	}
	return fp, nil
}

func (s *AutologinStore) GetFingerprint(ctx context.Context, fpID string) (*Fingerprint, error) {
	fp := &Fingerprint{}
	err := s.db.QueryRow(ctx,
		`SELECT id, tenant_id, profile_name, webgl_renderer, canvas_hash,
		        user_agent, timezone, screen_width, screen_height, language, platform, usage_count_24h
		 FROM device_fingerprints WHERE id = $1`,
		fpID,
	).Scan(&fp.ID, &fp.TenantID, &fp.ProfileName, &fp.WebGLRenderer, &fp.CanvasHash,
		&fp.UserAgent, &fp.Timezone, &fp.ScreenWidth, &fp.ScreenHeight,
		&fp.Language, &fp.Platform, &fp.UsageCount24h)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return fp, nil
}

func (s *AutologinStore) AssignProxy(ctx context.Context, tenantID, country string) (*ProxyEntry, error) {
	proxy := &ProxyEntry{}
	query := `UPDATE proxy_pool SET
			concurrent_count = concurrent_count + 1
		 WHERE id = (
			SELECT id FROM proxy_pool
			WHERE tenant_id = $1 AND is_healthy = true
			  AND concurrent_count < max_concurrent`

	args := []interface{}{tenantID}
	if country != "" {
		query += ` AND (country = $2 OR country IS NULL)`
		args = append(args, country)
	}

	query += ` ORDER BY
			CASE WHEN country = $` + argNum(len(args)) + ` THEN 0 ELSE 1 END,
			concurrent_count ASC, latency_ms ASC NULLS LAST
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		 ) RETURNING id, tenant_id, proxy_type, host, port, username, country,
		   is_healthy, latency_ms, concurrent_count, max_concurrent`

	if country != "" {
		args = append(args, country)
	} else {
		args = append(args, "")
	}

	err := s.db.QueryRow(ctx, query, args...).Scan(
		&proxy.ID, &proxy.TenantID, &proxy.ProxyType, &proxy.Host, &proxy.Port,
		&proxy.Username, &proxy.Country, &proxy.IsHealthy, &proxy.LatencyMs,
		&proxy.ConcurrentCount, &proxy.MaxConcurrent,
	)
	if err != nil {
		return nil, err
	}
	return proxy, nil
}

func (s *AutologinStore) ReleaseProxy(ctx context.Context, proxyID string) error {
	return s.db.Exec(ctx,
		`UPDATE proxy_pool SET concurrent_count = GREATEST(concurrent_count - 1, 0) WHERE id = $1`,
		proxyID,
	)
}

func (s *AutologinStore) UpsertAutologinSession(ctx context.Context, exec *PipelineExecution) error {
	stagesJSON, _ := json.Marshal(exec.Stages)
	_, err := s.db.Pool.Exec(ctx,
		`INSERT INTO autologin_sessions (
			id, tenant_id, lead_id, broker_id, stage, autologin_url,
			fingerprint_id, proxy_id, proxy_type, proxy_country,
			retry_count, duration_ms, error, completed_at, created_at
		 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		 ON CONFLICT (id) DO UPDATE SET
			stage = EXCLUDED.stage,
			autologin_url = EXCLUDED.autologin_url,
			duration_ms = EXCLUDED.duration_ms,
			completed_at = EXCLUDED.completed_at`,
		exec.ID, exec.TenantID, exec.LeadID, exec.BrokerID,
		string(exec.Stage), exec.AutologinURL,
		nilIfEmpty(exec.FingerprintID), nilIfEmpty(exec.ProxyID),
		nilIfEmpty(exec.ProxyType), nil,
		exec.RetryCount, exec.TotalDurationMs,
		nilIfEmpty(errorFromStages(stagesJSON)), exec.CompletedAt, exec.StartedAt,
	)
	return err
}

func (s *AutologinStore) LogAnomaly(ctx context.Context, tenantID, sessionID, anomalyType, severity string, details map[string]interface{}, action string) error {
	detailsJSON, _ := json.Marshal(details)
	_, err := s.db.Pool.Exec(ctx,
		`INSERT INTO autologin_anomalies (tenant_id, session_id, anomaly_type, severity, details, action_taken)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		tenantID, sessionID, anomalyType, severity, detailsJSON, action,
	)
	return err
}

func (s *AutologinStore) GetFailoverBrokers(ctx context.Context, ruleID, primaryBrokerID string) ([]string, error) {
	rows, err := s.db.Query(ctx,
		`SELECT backup_broker_id FROM autologin_failover_chains
		 WHERE rule_id = $1 AND primary_broker_id = $2
		 ORDER BY priority ASC`,
		ruleID, primaryBrokerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var brokerIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		brokerIDs = append(brokerIDs, id)
	}
	return brokerIDs, nil
}

func (s *AutologinStore) UpdateSLASnapshot(ctx context.Context, tenantID string, month time.Time, successful, failed int) error {
	_, err := s.db.Pool.Exec(ctx,
		`INSERT INTO autologin_sla_snapshots (tenant_id, month, total_attempts, successful, failed, sla_percent)
		 VALUES ($1, $2, $3, $4, $5, CASE WHEN ($4 + $5) > 0 THEN ($4::decimal / ($4 + $5) * 100) ELSE 100 END)
		 ON CONFLICT (tenant_id, month) DO UPDATE SET
			total_attempts = autologin_sla_snapshots.total_attempts + $3,
			successful = autologin_sla_snapshots.successful + $4,
			failed = autologin_sla_snapshots.failed + $5,
			sla_percent = CASE WHEN (autologin_sla_snapshots.successful + $4 + autologin_sla_snapshots.failed + $5) > 0
				THEN ((autologin_sla_snapshots.successful + $4)::decimal / (autologin_sla_snapshots.successful + $4 + autologin_sla_snapshots.failed + $5) * 100)
				ELSE 100 END,
			updated_at = NOW()`,
		tenantID, month, successful+failed, successful, failed,
	)
	return err
}

func argNum(n int) string {
	return "$" + string(rune('0'+n))
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func errorFromStages(stagesJSON []byte) string {
	var stages []StageResult
	json.Unmarshal(stagesJSON, &stages)
	for _, s := range stages {
		if s.Error != "" {
			return s.Error
		}
	}
	return ""
}
