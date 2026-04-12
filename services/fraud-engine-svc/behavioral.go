package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
)

// BehavioralEventPayload represents a single behavioral event from the JS SDK.
type BehavioralEventPayload struct {
	EventType string          `json:"event_type"`
	EventData json.RawMessage `json:"event_data"`
	ClientTS  *time.Time      `json:"client_ts,omitempty"`
}

// BehavioralBatchRequest is the request body for batch event ingestion.
type BehavioralBatchRequest struct {
	SessionID string                   `json:"session_id"`
	Events    []BehavioralEventPayload `json:"events"`
}

// BehavioralHandler handles behavioral event ingestion from the JS SDK.
type BehavioralHandler struct {
	store  *Store
	logger *slog.Logger
}

// NewBehavioralHandler creates a new BehavioralHandler.
func NewBehavioralHandler(store *Store, logger *slog.Logger) *BehavioralHandler {
	return &BehavioralHandler{
		store:  store,
		logger: logger,
	}
}

// IngestEvents handles POST /api/v1/fraud/behavioral
// Accepts a batch of JS SDK behavioral events for fraud analysis.
func (bh *BehavioralHandler) IngestEvents(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var req BehavioralBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.SessionID == "" {
		errors.NewValidationError("session_id is required").WriteJSON(w)
		return
	}

	if len(req.Events) == 0 {
		errors.NewValidationError("events array must not be empty").WriteJSON(w)
		return
	}

	// Cap at 100 events per batch
	if len(req.Events) > 100 {
		errors.NewValidationError("maximum 100 events per batch").WriteJSON(w)
		return
	}

	// Validate each event has a type
	for i, ev := range req.Events {
		if ev.EventType == "" {
			errors.NewValidationError("event_type is required for each event (missing at index " + itoa(i) + ")").WriteJSON(w)
			return
		}
	}

	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.Header.Get("User-Agent")

	inserted, err := bh.store.BatchInsertBehavioralEvents(r.Context(), tenantID, req.SessionID, req.Events, ip, ua)
	if err != nil {
		bh.logger.Error("batch insert behavioral events failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	bh.logger.Info("behavioral events ingested",
		"tenant_id", tenantID,
		"session_id", req.SessionID,
		"count", inserted,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"inserted": inserted,
	})
}

// itoa converts an int to a string without importing strconv.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	return string(digits)
}
