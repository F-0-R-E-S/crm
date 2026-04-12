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
	mux.Handle("POST /api/v1/postback/{broker_id}", http.HandlerFunc(h.HandlePostback))
}

type PostbackRequest struct {
	LeadID    string `json:"lead_id"`
	Status    string `json:"status"`
	SubStatus string `json:"sub_status,omitempty"`
	Comment   string `json:"comment,omitempty"`
}

type PostbackResponse struct {
	Accepted   bool   `json:"accepted"`
	BrokerID   string `json:"broker_id"`
	LeadID     string `json:"lead_id"`
	NewStatus  string `json:"new_status"`
	ReceivedAt string `json:"received_at"`
}

func (h *Handler) HandlePostback(w http.ResponseWriter, r *http.Request) {
	brokerID := r.PathValue("broker_id")
	if brokerID == "" {
		errors.NewBadRequest("broker_id path parameter is required").WriteJSON(w)
		return
	}

	var req PostbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" || req.Status == "" {
		errors.NewValidationError("lead_id and status are required").WriteJSON(w)
		return
	}

	h.logger.Info("postback received",
		"broker_id", brokerID,
		"lead_id", req.LeadID,
		"status", req.Status,
	)

	// TODO: update lead status, publish event, fire affiliate postback
	resp := PostbackResponse{
		Accepted:   true,
		BrokerID:   brokerID,
		LeadID:     req.LeadID,
		NewStatus:  req.Status,
		ReceivedAt: time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
