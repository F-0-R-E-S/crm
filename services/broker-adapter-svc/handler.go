package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/deliver", http.HandlerFunc(h.DeliverLead))
}

type DeliverRequest struct {
	LeadID   string `json:"lead_id"`
	BrokerID string `json:"broker_id"`
}

type DeliverResponse struct {
	LeadID       string `json:"lead_id"`
	BrokerID     string `json:"broker_id"`
	Status       string `json:"status"`
	BrokerLeadID string `json:"broker_lead_id,omitempty"`
	StatusCode   int    `json:"status_code"`
	DurationMs   int64  `json:"duration_ms"`
	DeliveredAt  string `json:"delivered_at"`
}

func (h *Handler) DeliverLead(w http.ResponseWriter, r *http.Request) {
	var req DeliverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" || req.BrokerID == "" {
		errors.NewValidationError("lead_id and broker_id are required").WriteJSON(w)
		return
	}

	h.logger.Info("delivering lead", "lead_id", req.LeadID, "broker_id", req.BrokerID)

	// TODO: load broker template, build request, call broker API, parse response
	resp := DeliverResponse{
		LeadID:       req.LeadID,
		BrokerID:     req.BrokerID,
		Status:       "delivered",
		BrokerLeadID: "stub-broker-ref-123",
		StatusCode:   200,
		DurationMs:   45,
		DeliveredAt:  time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
