package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
)

// Handler holds dependencies for the status-sync HTTP handlers.
type Handler struct {
	logger     *slog.Logger
	store      *Store
	nats       *messaging.NATSClient
	normalizer *StatusNormalizer
	detector   *AnomalyDetector
}

// NewHandler creates a ready-to-use Handler.
func NewHandler(logger *slog.Logger, store *Store, nats *messaging.NATSClient, normalizer *StatusNormalizer, detector *AnomalyDetector) *Handler {
	return &Handler{
		logger:     logger,
		store:      store,
		nats:       nats,
		normalizer: normalizer,
		detector:   detector,
	}
}

// Register mounts all routes on the given mux using Go 1.22 patterns.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/postback/{broker_id}", h.HandlePostback)
	mux.HandleFunc("GET /api/v1/leads/{id}/history", h.GetLeadHistory)

	// Status groups
	mux.HandleFunc("GET /api/v1/status-groups", h.ListStatusGroups)
	mux.HandleFunc("POST /api/v1/status-groups", h.CreateStatusGroup)
	mux.HandleFunc("PUT /api/v1/status-groups/{id}", h.UpdateStatusGroup)
	mux.HandleFunc("DELETE /api/v1/status-groups/{id}", h.DeleteStatusGroup)

	// Broker status mappings
	mux.HandleFunc("GET /api/v1/status-groups/mappings/{broker_id}", h.ListBrokerMappings)
	mux.HandleFunc("POST /api/v1/status-groups/mappings/{broker_id}", h.UpsertBrokerMapping)

	// Status analytics
	mux.HandleFunc("GET /api/v1/status-analytics/distribution", h.GetStatusDistribution)
	mux.HandleFunc("GET /api/v1/status-analytics/stale-leads", h.GetStaleLeads)

	// Shave detection / anomalies
	mux.HandleFunc("GET /api/v1/shave-detection/anomalies", h.ListAnomalies)
	mux.HandleFunc("POST /api/v1/shave-detection/anomalies/{id}/resolve", h.ResolveAnomaly)
	mux.HandleFunc("GET /api/v1/shave-detection/rules", h.ListAnomalyRules)
	mux.HandleFunc("POST /api/v1/shave-detection/rules", h.CreateAnomalyRule)
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
	// Use DB-driven normalizer when available, otherwise fall back to hardcoded.
	var normalizedStatus string
	if h.normalizer != nil {
		normalizedStatus = h.normalizer.NormalizeForBroker(brokerID, rawStatus)
	} else {
		normalizedStatus = NormalizeStatus(rawStatus)
	}
	oldStatus := string(lead.Status)
	normalizedOldStatus := NormalizeStatus(oldStatus)

	// --- Shave detection ---
	var shaveDetected bool
	if h.normalizer != nil {
		shaveDetected, _, _ = h.normalizer.DetectShaveEnhanced(normalizedOldStatus, normalizedStatus)
	} else {
		shaveDetected = DetectShave(normalizedOldStatus, normalizedStatus)
	}
	if shaveDetected {
		h.logger.Warn("shave detected",
			"lead_id", lead.ID,
			"broker_id", brokerID,
			"old_status", oldStatus,
			"new_status", normalizedStatus,
			"raw_status", rawStatus,
		)
	}

	// --- Anomaly detection ---
	if h.detector != nil {
		anomalies, err := h.detector.CheckTransition(ctx, lead.TenantID, brokerID, lead.AffiliateID, lead.ID, normalizedOldStatus, normalizedStatus)
		if err != nil {
			h.logger.Error("anomaly detection failed", "lead_id", lead.ID, "error", err)
		}
		if len(anomalies) > 0 {
			for _, a := range anomalies {
				h.logger.Warn("anomaly rule triggered",
					"anomaly_type", a.AnomalyType,
					"severity", a.Severity,
					"lead_id", lead.ID,
					"broker_id", brokerID,
				)
			}
			// Publish anomaly event for each detected anomaly.
			for _, a := range anomalies {
				anomalyData := map[string]interface{}{
					"anomaly_id":   a.ID,
					"tenant_id":    a.TenantID,
					"broker_id":    a.BrokerID,
					"affiliate_id": a.AffiliateID,
					"lead_id":      a.LeadID,
					"anomaly_type": a.AnomalyType,
					"severity":     a.Severity,
					"details":      a.Details,
				}
				if pubErr := h.nats.Publish(ctx, events.StatusAnomalyDetected, "status-sync-svc", anomalyData); pubErr != nil {
					h.logger.Error("failed to publish status.anomaly.detected", "error", pubErr)
				}
			}
		}
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
// GET /api/v1/status-groups
// ---------------------------------------------------------------------------

func (h *Handler) ListStatusGroups(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	groups, err := h.store.ListStatusGroups(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("failed to list status groups", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": groups,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/status-groups
// ---------------------------------------------------------------------------

func (h *Handler) CreateStatusGroup(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var group models.StatusGroup
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if group.Name == "" || group.Slug == "" {
		apperrors.NewValidationError("name and slug are required").WriteJSON(w)
		return
	}

	group.TenantID = tenantID

	if err := h.store.CreateStatusGroup(r.Context(), &group); err != nil {
		h.logger.Error("failed to create status group", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, group)
}

// ---------------------------------------------------------------------------
// PUT /api/v1/status-groups/{id}
// ---------------------------------------------------------------------------

func (h *Handler) UpdateStatusGroup(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		apperrors.NewBadRequest("id path parameter is required").WriteJSON(w)
		return
	}

	var group models.StatusGroup
	if err := json.NewDecoder(r.Body).Decode(&group); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	group.ID = id
	group.TenantID = tenantID

	if err := h.store.UpdateStatusGroup(r.Context(), &group); err != nil {
		h.logger.Error("failed to update status group", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, group)
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/status-groups/{id}
// ---------------------------------------------------------------------------

func (h *Handler) DeleteStatusGroup(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		apperrors.NewBadRequest("id path parameter is required").WriteJSON(w)
		return
	}

	if err := h.store.DeleteStatusGroup(r.Context(), tenantID, id); err != nil {
		h.logger.Error("failed to delete status group", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"deleted": true,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/status-groups/mappings/{broker_id}
// ---------------------------------------------------------------------------

func (h *Handler) ListBrokerMappings(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	brokerID := r.PathValue("broker_id")
	if brokerID == "" {
		apperrors.NewBadRequest("broker_id path parameter is required").WriteJSON(w)
		return
	}

	mappings, err := h.store.ListBrokerMappings(r.Context(), tenantID, brokerID)
	if err != nil {
		h.logger.Error("failed to list broker mappings", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": mappings,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/status-groups/mappings/{broker_id}
// ---------------------------------------------------------------------------

func (h *Handler) UpsertBrokerMapping(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	brokerID := r.PathValue("broker_id")
	if brokerID == "" {
		apperrors.NewBadRequest("broker_id path parameter is required").WriteJSON(w)
		return
	}

	var mapping models.BrokerStatusMapping
	if err := json.NewDecoder(r.Body).Decode(&mapping); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if mapping.RawStatus == "" || mapping.StatusGroupSlug == "" {
		apperrors.NewValidationError("raw_status and status_group_slug are required").WriteJSON(w)
		return
	}

	mapping.TenantID = tenantID
	mapping.BrokerID = brokerID

	if err := h.store.UpsertBrokerMapping(r.Context(), &mapping); err != nil {
		h.logger.Error("failed to upsert broker mapping", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	// Reload normalizer cache after mapping change.
	if h.normalizer != nil {
		if err := h.normalizer.LoadMappings(r.Context(), tenantID); err != nil {
			h.logger.Error("failed to reload normalizer mappings", "error", err)
		}
	}

	writeJSON(w, http.StatusOK, mapping)
}

// ---------------------------------------------------------------------------
// GET /api/v1/status-analytics/distribution
// ---------------------------------------------------------------------------

func (h *Handler) GetStatusDistribution(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	q := r.URL.Query()
	brokerID := q.Get("broker_id")

	from := time.Now().UTC().AddDate(0, 0, -30)
	to := time.Now().UTC()

	if v := q.Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}

	entries, err := h.store.GetStatusDistribution(r.Context(), tenantID, brokerID, from, to)
	if err != nil {
		h.logger.Error("failed to get status distribution", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": entries,
		"from": from.Format(time.RFC3339),
		"to":   to.Format(time.RFC3339),
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/status-analytics/stale-leads
// ---------------------------------------------------------------------------

func (h *Handler) GetStaleLeads(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	thresholdHours := 48
	if v := r.URL.Query().Get("threshold_hours"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			thresholdHours = n
		}
	}

	leads, err := h.store.GetStaleLeads(r.Context(), tenantID, thresholdHours)
	if err != nil {
		h.logger.Error("failed to get stale leads", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":            leads,
		"threshold_hours": thresholdHours,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/shave-detection/anomalies
// ---------------------------------------------------------------------------

func (h *Handler) ListAnomalies(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	q := r.URL.Query()
	limit := 50
	offset := 0
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	var resolved *bool
	if v := q.Get("resolved"); v != "" {
		b := v == "true" || v == "1"
		resolved = &b
	}

	anomalies, total, err := h.store.ListAnomalies(r.Context(), tenantID, resolved, limit, offset)
	if err != nil {
		h.logger.Error("failed to list anomalies", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":   anomalies,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/shave-detection/anomalies/{id}/resolve
// ---------------------------------------------------------------------------

func (h *Handler) ResolveAnomaly(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		apperrors.NewBadRequest("id path parameter is required").WriteJSON(w)
		return
	}

	var body struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	if body.UserID == "" {
		apperrors.NewValidationError("user_id is required").WriteJSON(w)
		return
	}

	if err := h.store.ResolveAnomaly(r.Context(), tenantID, id, body.UserID); err != nil {
		h.logger.Error("failed to resolve anomaly", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"resolved": true,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/shave-detection/rules
// ---------------------------------------------------------------------------

func (h *Handler) ListAnomalyRules(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	rules, err := h.store.ListAnomalyRules(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("failed to list anomaly rules", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": rules,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/shave-detection/rules
// ---------------------------------------------------------------------------

func (h *Handler) CreateAnomalyRule(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var rule StatusAnomalyRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if rule.Name == "" || rule.RuleType == "" || rule.Severity == "" {
		apperrors.NewValidationError("name, rule_type, and severity are required").WriteJSON(w)
		return
	}

	validTypes := map[string]bool{"regression": true, "velocity": true, "stuck": true, "pattern": true}
	if !validTypes[rule.RuleType] {
		apperrors.NewValidationError("rule_type must be one of: regression, velocity, stuck, pattern").WriteJSON(w)
		return
	}

	validSeverities := map[string]bool{"low": true, "medium": true, "high": true, "critical": true}
	if !validSeverities[rule.Severity] {
		apperrors.NewValidationError("severity must be one of: low, medium, high, critical").WriteJSON(w)
		return
	}

	if err := h.store.CreateAnomalyRule(r.Context(), tenantID, &rule); err != nil {
		h.logger.Error("failed to create anomaly rule", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, rule)
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
