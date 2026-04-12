package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/google/uuid"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/route", http.HandlerFunc(h.RouteLead))
}

type RouteRequest struct {
	LeadID string `json:"lead_id"`
}

func (h *Handler) RouteLead(w http.ResponseWriter, r *http.Request) {
	var req RouteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" {
		errors.NewValidationError("lead_id is required").WriteJSON(w)
		return
	}

	h.logger.Info("routing lead", "lead_id", req.LeadID)

	// TODO: evaluate distribution rules, check caps, select broker
	decision := models.RoutingDecision{
		LeadID:    req.LeadID,
		RuleID:    uuid.New().String(),
		BrokerID:  uuid.New().String(),
		Algorithm: "weighted_round_robin",
		Waterfall: []string{},
		Reason:    "stub: default routing",
		DecidedAt: time.Now().UTC(),
		LatencyMs: 1,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(decision)
}
