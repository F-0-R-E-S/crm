package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/google/uuid"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/autologin", http.HandlerFunc(h.CreateAutologin))
}

type AutologinRequest struct {
	LeadID   string `json:"lead_id"`
	BrokerID string `json:"broker_id"`
}

type AutologinResponse struct {
	ID          string `json:"id"`
	LeadID      string `json:"lead_id"`
	BrokerID    string `json:"broker_id"`
	AutologinURL string `json:"autologin_url"`
	Status      string `json:"status"`
	ExpiresIn   int    `json:"expires_in_seconds"`
}

func (h *Handler) CreateAutologin(w http.ResponseWriter, r *http.Request) {
	var req AutologinRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" || req.BrokerID == "" {
		errors.NewValidationError("lead_id and broker_id are required").WriteJSON(w)
		return
	}

	h.logger.Info("autologin requested", "lead_id", req.LeadID, "broker_id", req.BrokerID)

	// TODO: generate autologin URL via broker API, cache token, set TTL
	token := uuid.New().String()
	resp := AutologinResponse{
		ID:          uuid.New().String(),
		LeadID:      req.LeadID,
		BrokerID:    req.BrokerID,
		AutologinURL: "https://broker.example.com/autologin?token=" + token,
		Status:      "generated",
		ExpiresIn:   300,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
