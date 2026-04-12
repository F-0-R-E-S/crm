package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
)

// Handler holds dependencies for the status-sync HTTP handlers.
type Handler struct {
	logger *slog.Logger
	store  *Store
	nats   *messaging.NATSClient
}

// NewHandler creates a ready-to-use Handler.
func NewHandler(logger *slog.Logger, store *Store, nats *messaging.NATSClient) *Handler {
	return &Handler{
		logger: logger,
		store:  store,
		nats:   nats,
	}
}

// Register mounts all routes on the given mux using Go 1.22 patterns.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/postback/{broker_id}", h.HandlePostback)
	mux.HandleFunc("GET /api/v1/leads/{id}/history", h.GetLeadHistory)
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

// PostbackRequest represents the JSON body that brokers send in postback
// webhooks. Fields are flexible because brokers use inconsistent naming.
type PostbackRequest struct {
	// LeadID is the broker's reference for the lead (their internal ID).
	// Brokers may send this as "lead_id", "click_id", or "ref".
	LeadID  string `json:"lead_id"`
	ClickID string `json:"click_id"`
	Ref     string `json:"ref"`

	// Status is the new status reported by the broker.
	Status    string `json:"status"`
	SubStatus string `json:"sub_status,omitempty"`
	Comment   string `json:"comment,omitempty"`
}

// PostbackResponse is returned to the broker confirming receipt.
type PostbackResponse struct {
	Accepted       bool   `json:"accepted"`
	BrokerID       string `json:"broker_id"`
	LeadRef        string `json:"lead_ref"`
	OriginalStatus string `json:"original_status"`
	NormalizedStatus string `json:"normalized_status"`
	ShaveDetected  bool   `json:"shave_detected,omitempty"`
	ReceivedAt     string `json:"received_at"`
}

// LeadHistoryResponse wraps the status change history for a lead.
type LeadHistoryResponse struct {
	LeadID  string               `json:"lead_id"`
	History []StatusHistoryEntry `json:"history"`
}

// ---------------------------------------------------------------------------
// POST /api/v1/postback/{broker_id}
// ---------------------------------------------------------------------------

// HandlePostback receives status update webhooks from brokers. It supports
// both JSON bodies and query parameters to accommodate different broker
// integration styles. The handler:
//  1. Extracts the lead reference and new status
//  2. Looks up the lead by the broker's reference ID
//  3. Normalizes the status to the standard GambChamp vocabulary
//  4. Checks for status regression (shave detection)
//  5. Updates the lead status in the database
//  6. Records the postback as a lead_event with full request body
//  7. Publishes "lead.status_updated" or "lead.shave_detected" to NATS
func (h *Handler) HandlePostback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	brokerID := r.PathValue("broker_id")
	if brokerID == "" {
		apperrors.NewBadRequest("broker_id path parameter is required").WriteJSON(w)
		return
	}

	// --- Extract postback data from JSON body or query params ---
	var leadRef, rawStatus, comment string

	// Read the raw body for logging regardless of format.
	bodyBytes, _ := io.ReadAll(io.LimitReader(r.Body, 64*1024))

	contentType := r.Header.Get("Content-Type")
	if len(bodyBytes) > 0 && (contentType == "application/json" || bodyBytes[0] == '{') {
		// JSON body
		var req PostbackRequest
		if err := json.Unmarshal(bodyBytes, &req); err != nil {
			apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
			return
		}
		leadRef = coalesce(req.LeadID, req.ClickID, req.Ref)
		rawStatus = req.Status
		comment = req.Comment
	} else {
		// Query parameters fallback — many brokers send postbacks via GET-style
		// params appended to the URL.
		q := r.URL.Query()
		leadRef = coalesce(q.Get("lead_id"), q.Get("click_id"), q.Get("ref"))
		rawStatus = q.Get("status")
		comment = q.Get("comment")
	}

	if leadRef == "" || rawStatus == "" {
		apperrors.NewValidationError("lead reference (lead_id/click_id/ref) and status are required").WriteJSON(w)
		return
	}

	h.logger.Info("postback received",
		"broker_id", brokerID,
		"lead_ref", leadRef,
		"raw_status", rawStatus,
	)

	// --- Look up the lead by broker's reference ---
	lead, err := h.store.GetLeadByBrokerRef(ctx, brokerID, leadRef)
	if err != nil {
		h.logger.Error("failed to look up lead by broker ref",
			"broker_id", brokerID,
			"lead_ref", leadRef,
			"error", err,
		)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if lead == nil {
		// If the broker's reference doesn't match, try treating it as our
		// internal lead ID (some integrations pass it back directly).
		lead, err = h.store.GetLead(ctx, leadRef)
		if err != nil {
			h.logger.Error("failed to look up lead by ID",
				"lead_ref", leadRef,
				"error", err,
			)
			apperrors.ErrInternal.WriteJSON(w)
			return
		}
	}
	if lead == nil {
		h.logger.Warn("lead not found for postback",
			"broker_id", brokerID,
			"lead_ref", leadRef,
		)
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	// --- Normalize the status ---
	normalizedStatus := NormalizeStatus(rawStatus)
	oldStatus := string(lead.Status)

	// --- Shave detection ---
	shaveDetected := DetectShave(NormalizeStatus(oldStatus), normalizedStatus)
	if shaveDetected {
		h.logger.Warn("shave detected",
			"lead_id", lead.ID,
			"broker_id", brokerID,
			"old_status", oldStatus,
			"new_status", normalizedStatus,
			"raw_status", rawStatus,
		)
	}

	// --- Update lead status ---
	if err := h.store.UpdateLeadStatus(ctx, lead.ID, normalizedStatus); err != nil {
		h.logger.Error("failed to update lead status",
			"lead_id", lead.ID,
			"error", err,
		)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	// --- Record the postback event ---
	eventBody, _ := json.Marshal(map[string]interface{}{
		"broker_id":         brokerID,
		"lead_ref":          leadRef,
		"raw_status":        rawStatus,
		"normalized_status": normalizedStatus,
		"old_status":        oldStatus,
		"new_status":        normalizedStatus,
		"comment":           comment,
		"shave_detected":    shaveDetected,
		"raw_request":       string(bodyBytes),
		"query_params":      r.URL.RawQuery,
	})

	event := &models.LeadEvent{
		LeadID:      lead.ID,
		TenantID:    lead.TenantID,
		EventType:   "postback_received",
		BrokerID:    brokerID,
		RequestBody: eventBody,
	}
	if err := h.store.CreateLeadEvent(ctx, event); err != nil {
		h.logger.Error("failed to record postback event",
			"lead_id", lead.ID,
			"error", err,
		)
		// Non-fatal: the status update is already persisted.
	}

	// --- Publish to NATS ---
	eventData := map[string]interface{}{
		"lead_id":           lead.ID,
		"tenant_id":         lead.TenantID,
		"broker_id":         brokerID,
		"affiliate_id":      lead.AffiliateID,
		"old_status":        oldStatus,
		"new_status":        normalizedStatus,
		"raw_status":        rawStatus,
		"comment":           comment,
		"shave_detected":    shaveDetected,
		"country":           lead.Country,
	}

	if shaveDetected {
		if err := h.nats.Publish(ctx, events.LeadShaveDetected, "status-sync-svc", eventData); err != nil {
			h.logger.Error("failed to publish lead.shave_detected",
				"lead_id", lead.ID,
				"error", err,
			)
		}
	}

	// Always publish the status update event (even on shave, for audit trail).
	if err := h.nats.Publish(ctx, events.LeadStatusUpdated, "status-sync-svc", eventData); err != nil {
		h.logger.Error("failed to publish lead.status_updated",
			"lead_id", lead.ID,
			"error", err,
		)
	}

	h.logger.Info("postback processed",
		"lead_id", lead.ID,
		"broker_id", brokerID,
		"old_status", oldStatus,
		"new_status", normalizedStatus,
		"shave_detected", shaveDetected,
	)

	// --- Respond to broker ---
	writeJSON(w, http.StatusOK, PostbackResponse{
		Accepted:         true,
		BrokerID:         brokerID,
		LeadRef:          leadRef,
		OriginalStatus:   rawStatus,
		NormalizedStatus: normalizedStatus,
		ShaveDetected:    shaveDetected,
		ReceivedAt:       time.Now().UTC().Format(time.RFC3339),
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/leads/{id}/history
// ---------------------------------------------------------------------------

// GetLeadHistory returns the status change history for a lead.
func (h *Handler) GetLeadHistory(w http.ResponseWriter, r *http.Request) {
	leadID := r.PathValue("id")
	if leadID == "" {
		apperrors.NewBadRequest("lead id is required").WriteJSON(w)
		return
	}

	// Verify the lead exists.
	lead, err := h.store.GetLead(r.Context(), leadID)
	if err != nil {
		h.logger.Error("failed to get lead", "lead_id", leadID, "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if lead == nil {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	history, err := h.store.GetLeadStatusHistory(r.Context(), leadID)
	if err != nil {
		h.logger.Error("failed to get lead status history", "lead_id", leadID, "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, LeadHistoryResponse{
		LeadID:  leadID,
		History: history,
	})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// coalesce returns the first non-empty string from the arguments.
func coalesce(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
