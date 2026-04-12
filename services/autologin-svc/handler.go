package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
)

type Handler struct {
	logger   *slog.Logger
	pipeline *PipelineEngine
	nc       *messaging.NATSClient
}

func NewHandler(logger *slog.Logger, pipeline *PipelineEngine, nc *messaging.NATSClient) *Handler {
	return &Handler{logger: logger, pipeline: pipeline, nc: nc}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/autologin", http.HandlerFunc(h.ExecuteAutologin))
	mux.Handle("GET /internal/autologin/pipeline/{pipeline_id}", http.HandlerFunc(h.GetPipelineStatus))
}

type AutologinRequest struct {
	LeadID   string `json:"lead_id"`
	BrokerID string `json:"broker_id"`
	TenantID string `json:"tenant_id"`
	RuleID   string `json:"rule_id,omitempty"`
}

func (h *Handler) ExecuteAutologin(w http.ResponseWriter, r *http.Request) {
	var req AutologinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" || req.BrokerID == "" {
		errors.NewValidationError("lead_id and broker_id are required").WriteJSON(w)
		return
	}

	h.logger.Info("autologin pipeline requested",
		"lead_id", req.LeadID,
		"broker_id", req.BrokerID,
		"tenant_id", req.TenantID,
	)

	// Execute pipeline asynchronously
	go func() {
		ctx := context.Background()
		exec, err := h.pipeline.Execute(ctx, req.LeadID, req.BrokerID, req.TenantID)

		if h.nc != nil {
			if err != nil || exec.Status == "failed" {
				h.nc.Publish(ctx, events.LeadAutologinFailed, "autologin-svc", map[string]interface{}{
					"lead_id":     req.LeadID,
					"broker_id":   req.BrokerID,
					"tenant_id":   req.TenantID,
					"pipeline_id": exec.ID,
					"error":       errorMsg(err, exec),
				})

				// Try failover if rule_id provided
				if req.RuleID != "" {
					h.tryFailover(ctx, req, exec)
				}
			} else {
				h.nc.Publish(ctx, events.LeadAutologinCompleted, "autologin-svc", map[string]interface{}{
					"lead_id":       req.LeadID,
					"broker_id":     req.BrokerID,
					"tenant_id":     req.TenantID,
					"pipeline_id":   exec.ID,
					"autologin_url": exec.AutologinURL,
					"duration_ms":   exec.TotalDurationMs,
				})
			}

			// Update SLA
			month := exec.StartedAt.Truncate(24 * 30 * 60 * 60 * 1e9)
			if exec.Status == "completed" {
				h.pipeline.store.UpdateSLASnapshot(ctx, req.TenantID, month, 1, 0)
			} else {
				h.pipeline.store.UpdateSLASnapshot(ctx, req.TenantID, month, 0, 1)
			}
		}
	}()

	// Return 202 Accepted with pipeline ID
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "accepted",
		"message": "autologin pipeline started",
	})
}

func (h *Handler) GetPipelineStatus(w http.ResponseWriter, r *http.Request) {
	pipelineID := r.PathValue("pipeline_id")
	if pipelineID == "" {
		errors.NewBadRequest("pipeline_id required").WriteJSON(w)
		return
	}

	exec := h.pipeline.GetExecution(pipelineID)
	if exec == nil {
		errors.ErrNotFound.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exec)
}

func (h *Handler) tryFailover(ctx context.Context, req AutologinRequest, failedExec *PipelineExecution) {
	backupBrokers, err := h.pipeline.store.GetFailoverBrokers(ctx, req.RuleID, req.BrokerID)
	if err != nil || len(backupBrokers) == 0 {
		return
	}

	for i, backupBrokerID := range backupBrokers {
		h.logger.Info("trying failover broker",
			"lead_id", req.LeadID,
			"failover_attempt", i+1,
			"backup_broker_id", backupBrokerID,
		)

		exec, err := h.pipeline.Execute(ctx, req.LeadID, backupBrokerID, req.TenantID)
		if err == nil && exec.Status == "completed" {
			h.nc.Publish(ctx, events.LeadAutologinCompleted, "autologin-svc", map[string]interface{}{
				"lead_id":          req.LeadID,
				"broker_id":        backupBrokerID,
				"tenant_id":        req.TenantID,
				"pipeline_id":      exec.ID,
				"autologin_url":    exec.AutologinURL,
				"failover":         true,
				"failover_attempt": i + 1,
			})
			return
		}
	}

	h.logger.Error("all failover brokers exhausted",
		"lead_id", req.LeadID,
		"original_broker", req.BrokerID,
		"failover_count", len(backupBrokers),
	)
}

func errorMsg(err error, exec *PipelineExecution) string {
	if err != nil {
		return err.Error()
	}
	for _, s := range exec.Stages {
		if s.Error != "" {
			return s.Error
		}
	}
	return "pipeline failed"
}
