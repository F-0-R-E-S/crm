package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

type PipelineStage string

const (
	StageClick       PipelineStage = "click"
	StageLoad        PipelineStage = "load"
	StageFingerprint PipelineStage = "fingerprint"
	StageSend        PipelineStage = "send"
	StageCompleted   PipelineStage = "completed"
	StageFailed      PipelineStage = "failed"
)

type StageResult struct {
	Stage     PipelineStage `json:"stage"`
	Status    string        `json:"status"` // pending, in_progress, success, failed
	StartedAt time.Time    `json:"started_at"`
	EndedAt   time.Time    `json:"ended_at,omitempty"`
	DurationMs int64       `json:"duration_ms"`
	Error     string        `json:"error,omitempty"`
	Details   interface{}   `json:"details,omitempty"`
}

type PipelineExecution struct {
	ID           string          `json:"id"`
	LeadID       string          `json:"lead_id"`
	BrokerID     string          `json:"broker_id"`
	TenantID     string          `json:"tenant_id"`
	Stage        PipelineStage   `json:"current_stage"`
	Status       string          `json:"status"` // running, completed, failed
	Stages       []StageResult   `json:"stages"`
	AutologinURL string          `json:"autologin_url,omitempty"`
	FingerprintID string         `json:"fingerprint_id,omitempty"`
	ProxyID      string          `json:"proxy_id,omitempty"`
	ProxyType    string          `json:"proxy_type,omitempty"`
	RetryCount   int             `json:"retry_count"`
	StartedAt    time.Time       `json:"started_at"`
	CompletedAt  *time.Time      `json:"completed_at,omitempty"`
	TotalDurationMs int64       `json:"total_duration_ms"`
}

type PipelineEngine struct {
	store           *AutologinStore
	fingerprintPool *FingerprintPool
	proxyPool       *ProxyPoolManager
	anomalyDetector *AnomalyDetector
	client          *http.Client
	logger          *slog.Logger

	mu         sync.RWMutex
	executions map[string]*PipelineExecution
	semaphore  chan struct{}
}

func NewPipelineEngine(store *AutologinStore, fp *FingerprintPool, pp *ProxyPoolManager, ad *AnomalyDetector, logger *slog.Logger) *PipelineEngine {
	return &PipelineEngine{
		store:           store,
		fingerprintPool: fp,
		proxyPool:       pp,
		anomalyDetector: ad,
		client: &http.Client{
			Timeout: 15 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
		logger:     logger,
		executions: make(map[string]*PipelineExecution),
		semaphore:  make(chan struct{}, 50), // max 50 concurrent pipelines
	}
}

func (pe *PipelineEngine) Execute(ctx context.Context, leadID, brokerID, tenantID string) (*PipelineExecution, error) {
	select {
	case pe.semaphore <- struct{}{}:
		defer func() { <-pe.semaphore }()
	default:
		return nil, fmt.Errorf("max concurrent pipelines reached")
	}

	exec := &PipelineExecution{
		ID:        uuid.New().String(),
		LeadID:    leadID,
		BrokerID:  brokerID,
		TenantID:  tenantID,
		Stage:     StageClick,
		Status:    "running",
		Stages:    make([]StageResult, 0, 4),
		StartedAt: time.Now(),
	}

	pe.mu.Lock()
	pe.executions[exec.ID] = exec
	pe.mu.Unlock()

	pe.logger.Info("pipeline started",
		"pipeline_id", exec.ID,
		"lead_id", leadID,
		"broker_id", brokerID,
	)

	// Get autologin config for this broker
	config, err := pe.store.GetAutologinConfig(ctx, brokerID)
	if err != nil || config == nil {
		pe.failExecution(exec, "no autologin config for broker")
		return exec, fmt.Errorf("no autologin config for broker %s", brokerID)
	}

	// Stage 1: Click — generate autologin URL
	if err := pe.executeStage(ctx, exec, StageClick, func() error {
		lead, err := pe.store.GetLead(ctx, leadID)
		if err != nil {
			return fmt.Errorf("lead not found: %w", err)
		}

		url := resolveAutologinURL(config.URLTemplate, lead, brokerID)
		exec.AutologinURL = url
		return nil
	}); err != nil {
		return exec, err
	}

	// Stage 2: Load — assign fingerprint and proxy
	if err := pe.executeStage(ctx, exec, StageLoad, func() error {
		fp, err := pe.fingerprintPool.Assign(ctx, tenantID, leadID)
		if err != nil {
			return fmt.Errorf("fingerprint assignment failed: %w", err)
		}
		exec.FingerprintID = fp.ID

		lead, _ := pe.store.GetLead(ctx, leadID)
		country := ""
		if lead != nil {
			country = lead.Country
		}

		proxy, err := pe.proxyPool.Assign(ctx, tenantID, country)
		if err != nil {
			return fmt.Errorf("proxy assignment failed: %w", err)
		}
		exec.ProxyID = proxy.ID
		exec.ProxyType = proxy.ProxyType

		// Check for anomalies
		pe.anomalyDetector.CheckDeviceReuse(ctx, exec)
		if lead != nil && proxy.Country != "" && lead.Country != proxy.Country {
			pe.anomalyDetector.CheckGeoMismatch(ctx, exec, lead.Country, proxy.Country)
		}

		return nil
	}); err != nil {
		return exec, err
	}

	// Stage 3: Fingerprint — apply device profile
	if err := pe.executeStage(ctx, exec, StageFingerprint, func() error {
		fp, err := pe.fingerprintPool.Get(ctx, exec.FingerprintID)
		if err != nil {
			return fmt.Errorf("fingerprint not found: %w", err)
		}
		pe.logger.Info("fingerprint applied",
			"pipeline_id", exec.ID,
			"fingerprint_id", fp.ID,
			"user_agent", fp.UserAgent,
		)
		return nil
	}); err != nil {
		return exec, err
	}

	// Stage 4: Send — execute autologin request
	maxRetries := config.MaxRetries
	retryDelay := time.Duration(config.RetryDelayMs) * time.Millisecond
	backoffMult := config.BackoffMultiplier

	if err := pe.executeStage(ctx, exec, StageSend, func() error {
		var lastErr error
		for attempt := 0; attempt <= maxRetries; attempt++ {
			if attempt > 0 {
				exec.RetryCount = attempt
				wait := time.Duration(float64(retryDelay) * pow(backoffMult, float64(attempt-1)))
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-time.After(wait):
				}
			}

			err := pe.sendAutologin(ctx, exec, config)
			if err == nil {
				return nil
			}
			lastErr = err
			pe.logger.Warn("autologin attempt failed",
				"pipeline_id", exec.ID,
				"attempt", attempt+1,
				"error", err,
			)
		}
		return lastErr
	}); err != nil {
		return exec, err
	}

	// Pipeline completed successfully
	now := time.Now()
	exec.Status = "completed"
	exec.Stage = StageCompleted
	exec.CompletedAt = &now
	exec.TotalDurationMs = now.Sub(exec.StartedAt).Milliseconds()

	// Persist session
	pe.store.UpsertAutologinSession(ctx, exec)

	pe.logger.Info("pipeline completed",
		"pipeline_id", exec.ID,
		"lead_id", leadID,
		"duration_ms", exec.TotalDurationMs,
		"retries", exec.RetryCount,
	)

	return exec, nil
}

func (pe *PipelineEngine) executeStage(ctx context.Context, exec *PipelineExecution, stage PipelineStage, fn func() error) error {
	exec.Stage = stage
	sr := StageResult{
		Stage:     stage,
		Status:    "in_progress",
		StartedAt: time.Now(),
	}

	err := fn()

	sr.EndedAt = time.Now()
	sr.DurationMs = sr.EndedAt.Sub(sr.StartedAt).Milliseconds()

	if err != nil {
		sr.Status = "failed"
		sr.Error = err.Error()
		exec.Stages = append(exec.Stages, sr)
		pe.failExecution(exec, err.Error())
		return err
	}

	sr.Status = "success"
	exec.Stages = append(exec.Stages, sr)
	return nil
}

func (pe *PipelineEngine) sendAutologin(ctx context.Context, exec *PipelineExecution, config *AutologinConfig) error {
	req, err := http.NewRequestWithContext(ctx, config.HTTPMethod, exec.AutologinURL, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	// Apply custom headers
	if len(config.CustomHeaders) > 0 {
		var headers map[string]string
		if json.Unmarshal(config.CustomHeaders, &headers) == nil {
			for k, v := range headers {
				req.Header.Set(k, v)
			}
		}
	}

	// Apply fingerprint user agent
	fp, _ := pe.fingerprintPool.Get(ctx, exec.FingerprintID)
	if fp != nil {
		req.Header.Set("User-Agent", fp.UserAgent)
	}

	resp, err := pe.client.Do(req)
	if err != nil {
		return fmt.Errorf("autologin request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusFound || resp.StatusCode == http.StatusMovedPermanently {
		exec.AutologinURL = resp.Header.Get("Location")
		return nil
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		return nil
	}

	return fmt.Errorf("autologin returned HTTP %d", resp.StatusCode)
}

func (pe *PipelineEngine) failExecution(exec *PipelineExecution, reason string) {
	now := time.Now()
	exec.Status = "failed"
	exec.Stage = StageFailed
	exec.CompletedAt = &now
	exec.TotalDurationMs = now.Sub(exec.StartedAt).Milliseconds()

	pe.logger.Error("pipeline failed",
		"pipeline_id", exec.ID,
		"lead_id", exec.LeadID,
		"reason", reason,
		"duration_ms", exec.TotalDurationMs,
	)
}

func (pe *PipelineEngine) GetExecution(pipelineID string) *PipelineExecution {
	pe.mu.RLock()
	defer pe.mu.RUnlock()
	return pe.executions[pipelineID]
}

func resolveAutologinURL(template string, lead *LeadInfo, brokerID string) string {
	result := template
	if lead != nil {
		replacements := map[string]string{
			"lead_id":    lead.ID,
			"email":      lead.Email,
			"phone":      lead.Phone,
			"first_name": lead.FirstName,
			"last_name":  lead.LastName,
			"country":    lead.Country,
			"broker_id":  brokerID,
		}
		for k, v := range replacements {
			result = replaceAll(result, "{{"+k+"}}", v)
		}
	}
	return result
}

func replaceAll(s, old, new string) string {
	for {
		idx := indexOf(s, old)
		if idx < 0 {
			return s
		}
		s = s[:idx] + new + s[idx+len(old):]
	}
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func pow(base, exp float64) float64 {
	result := 1.0
	for i := 0; i < int(exp); i++ {
		result *= base
	}
	return result
}
