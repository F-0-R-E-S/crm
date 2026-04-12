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
	mux.Handle("POST /api/v1/leads", http.HandlerFunc(h.CreateLead))
}

type LeadRequest struct {
	FirstName string          `json:"first_name"`
	LastName  string          `json:"last_name"`
	Email     string          `json:"email"`
	Phone     string          `json:"phone"`
	Country   string          `json:"country"`
	IP        string          `json:"ip"`
	Extra     json.RawMessage `json:"extra,omitempty"`
}

type LeadResponse struct {
	ID     string            `json:"id"`
	Status models.LeadStatus `json:"status"`
}

func (h *Handler) CreateLead(w http.ResponseWriter, r *http.Request) {
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		errors.NewBadRequest("Idempotency-Key header is required").WriteJSON(w)
		return
	}

	var req LeadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.Email == "" || req.FirstName == "" || req.LastName == "" {
		errors.NewValidationError("first_name, last_name, and email are required").WriteJSON(w)
		return
	}

	leadID := uuid.New().String()

	h.logger.Info("lead received",
		"lead_id", leadID,
		"idempotency_key", idempotencyKey,
		"country", req.Country,
	)

	// TODO: persist lead, publish event, call fraud engine
	_ = time.Now()

	resp := LeadResponse{
		ID:     leadID,
		Status: models.LeadStatusProcessing,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(resp)
}
