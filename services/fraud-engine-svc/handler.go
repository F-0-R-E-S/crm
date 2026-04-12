package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/jackc/pgx/v5"
)

// Handler handles HTTP requests for the fraud engine service.
type Handler struct {
	logger  *slog.Logger
	checker *FraudChecker
	store   *Store
}

// NewHandler creates a new fraud engine handler.
func NewHandler(logger *slog.Logger, checker *FraudChecker, store *Store) *Handler {
	return &Handler{
		logger:  logger,
		checker: checker,
		store:   store,
	}
}

// Register registers HTTP routes on the given mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/check", http.HandlerFunc(h.CheckFraud))

	// Blacklist endpoints
	mux.HandleFunc("GET /api/v1/fraud/blacklists", h.ListBlacklists)
	mux.HandleFunc("POST /api/v1/fraud/blacklists", h.AddBlacklist)
	mux.HandleFunc("POST /api/v1/fraud/blacklists/bulk", h.BulkAddBlacklist)
	mux.HandleFunc("DELETE /api/v1/fraud/blacklists/{id}", h.RemoveBlacklist)

	// Fraud profiles
	mux.HandleFunc("GET /api/v1/fraud/profiles", h.ListFraudProfiles)
	mux.HandleFunc("PUT /api/v1/fraud/profiles/{affiliate_id}", h.UpdateFraudProfile)

	// Fraud checks
	mux.HandleFunc("GET /api/v1/fraud/checks/{lead_id}", h.GetFraudCheck)

	// Shave events
	mux.HandleFunc("GET /api/v1/fraud/shaves", h.ListShaves)
	mux.HandleFunc("POST /api/v1/fraud/shaves/{id}/acknowledge", h.AcknowledgeShave)

	// Dashboard
	mux.HandleFunc("GET /api/v1/fraud/dashboard", h.GetFraudDashboard)

	// Velocity rules
	mux.HandleFunc("GET /api/v1/fraud/velocity-rules", h.ListVelocityRules)
	mux.HandleFunc("POST /api/v1/fraud/velocity-rules", h.CreateVelocityRule)
	mux.HandleFunc("PUT /api/v1/fraud/velocity-rules/{id}", h.UpdateVelocityRule)
	mux.HandleFunc("DELETE /api/v1/fraud/velocity-rules/{id}", h.DeleteVelocityRule)
}

// FraudCheckRequest is the JSON body for the POST /internal/check endpoint.
type FraudCheckRequest struct {
	LeadID      string `json:"lead_id"`
	TenantID    string `json:"tenant_id"`
	AffiliateID string `json:"affiliate_id"`
	IP          string `json:"ip"`
	Email       string `json:"email"`
	PhoneE164   string `json:"phone_e164"`
	Country     string `json:"country"`
}

// CheckFraud handles the POST /internal/check endpoint.
// It loads the affiliate's fraud profile, runs all configured checks,
// and returns a FraudVerificationCard.
func (h *Handler) CheckFraud(w http.ResponseWriter, r *http.Request) {
	var req FraudCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" {
		errors.NewValidationError("lead_id is required").WriteJSON(w)
		return
	}
	if req.TenantID == "" {
		errors.NewValidationError("tenant_id is required").WriteJSON(w)
		return
	}

	h.logger.Info("fraud check requested",
		"lead_id", req.LeadID,
		"tenant_id", req.TenantID,
		"affiliate_id", req.AffiliateID,
		"ip", req.IP,
	)

	// Load affiliate-specific fraud profile (returns defaults if not found)
	profile, err := h.store.GetFraudProfile(r.Context(), req.TenantID, req.AffiliateID)
	if err != nil {
		h.logger.Error("failed to load fraud profile", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// Build the check request
	checkReq := &CheckRequest{
		LeadID:      req.LeadID,
		TenantID:    req.TenantID,
		AffiliateID: req.AffiliateID,
		IP:          req.IP,
		Email:       req.Email,
		PhoneE164:   req.PhoneE164,
		Country:     req.Country,
	}

	// Run fraud checks
	card, err := h.checker.CheckLead(r.Context(), checkReq)
	if err != nil {
		h.logger.Error("fraud check failed", "error", err, "lead_id", req.LeadID)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// Apply affiliate profile overrides to the verdict
	if card.OverallScore <= profile.AutoRejectScore {
		card.Verdict = "rejected"
	} else if card.OverallScore < profile.MinQualityScore && card.Verdict == "approved" {
		card.Verdict = "review"
	}

	h.logger.Info("fraud check completed",
		"lead_id", req.LeadID,
		"score", card.OverallScore,
		"verdict", card.Verdict,
		"profile_min_score", profile.MinQualityScore,
		"profile_auto_reject", profile.AutoRejectScore,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(card)
}

// ---------------------------------------------------------------------------
// Helper: extract tenant ID from header
// ---------------------------------------------------------------------------

func (h *Handler) tenantID(r *http.Request) string {
	return r.Header.Get("X-Tenant-ID")
}

func (h *Handler) requireTenant(w http.ResponseWriter, r *http.Request) (string, bool) {
	tid := h.tenantID(r)
	if tid == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return "", false
	}
	return tid, true
}

func queryInt(r *http.Request, key string, defaultVal int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return defaultVal
	}
	return n
}

// ---------------------------------------------------------------------------
// Blacklist Handlers
// ---------------------------------------------------------------------------

// ListBlacklists handles GET /api/v1/fraud/blacklists
func (h *Handler) ListBlacklists(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	listType := r.URL.Query().Get("list_type")
	limit := queryInt(r, "limit", 50)
	offset := queryInt(r, "offset", 0)

	entries, total, err := h.store.ListBlacklists(r.Context(), tenantID, listType, limit, offset)
	if err != nil {
		h.logger.Error("list blacklists failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  entries,
		"total": total,
	})
}

// AddBlacklist handles POST /api/v1/fraud/blacklists
func (h *Handler) AddBlacklist(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	var entry models.BlacklistEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	entry.TenantID = tenantID

	if entry.ListType == "" || entry.Value == "" {
		errors.NewValidationError("list_type and value are required").WriteJSON(w)
		return
	}

	if err := h.store.AddBlacklistEntry(r.Context(), &entry); err != nil {
		h.logger.Error("add blacklist entry failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(entry)
}

// BulkAddBlacklist handles POST /api/v1/fraud/blacklists/bulk
func (h *Handler) BulkAddBlacklist(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	var req struct {
		Entries []models.BlacklistEntry `json:"entries"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if len(req.Entries) == 0 {
		errors.NewValidationError("entries array is required and must not be empty").WriteJSON(w)
		return
	}

	count, err := h.store.BulkAddBlacklist(r.Context(), tenantID, req.Entries)
	if err != nil {
		h.logger.Error("bulk add blacklist failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"inserted": count,
	})
}

// RemoveBlacklist handles DELETE /api/v1/fraud/blacklists/{id}
func (h *Handler) RemoveBlacklist(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if id == "" {
		errors.NewValidationError("id is required").WriteJSON(w)
		return
	}

	err := h.store.RemoveBlacklistEntry(r.Context(), tenantID, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			errors.ErrNotFound.WriteJSON(w)
			return
		}
		h.logger.Error("remove blacklist entry failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ---------------------------------------------------------------------------
// Fraud Profile Handlers
// ---------------------------------------------------------------------------

// ListFraudProfiles handles GET /api/v1/fraud/profiles
func (h *Handler) ListFraudProfiles(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	profiles, err := h.store.ListFraudProfiles(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("list fraud profiles failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": profiles,
	})
}

// UpdateFraudProfile handles PUT /api/v1/fraud/profiles/{affiliate_id}
func (h *Handler) UpdateFraudProfile(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	affiliateID := r.PathValue("affiliate_id")
	if affiliateID == "" {
		errors.NewValidationError("affiliate_id is required").WriteJSON(w)
		return
	}

	var profile FraudProfile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	profile.TenantID = tenantID
	profile.AffiliateID = affiliateID

	if err := h.store.UpsertFraudProfile(r.Context(), &profile); err != nil {
		h.logger.Error("update fraud profile failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// ---------------------------------------------------------------------------
// Fraud Check Handlers
// ---------------------------------------------------------------------------

// GetFraudCheck handles GET /api/v1/fraud/checks/{lead_id}
func (h *Handler) GetFraudCheck(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	leadID := r.PathValue("lead_id")
	if leadID == "" {
		errors.NewValidationError("lead_id is required").WriteJSON(w)
		return
	}

	result, err := h.store.GetFraudCheckResult(r.Context(), tenantID, leadID)
	if err != nil {
		h.logger.Error("get fraud check failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if result == nil {
		errors.ErrNotFound.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ---------------------------------------------------------------------------
// Shave Event Handlers
// ---------------------------------------------------------------------------

// ListShaves handles GET /api/v1/fraud/shaves
func (h *Handler) ListShaves(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	brokerID := r.URL.Query().Get("broker_id")
	limit := queryInt(r, "limit", 50)
	offset := queryInt(r, "offset", 0)

	var acknowledged *bool
	if v := r.URL.Query().Get("acknowledged"); v != "" {
		b := v == "true"
		acknowledged = &b
	}

	events, total, err := h.store.ListShaveEvents(r.Context(), tenantID, brokerID, acknowledged, limit, offset)
	if err != nil {
		h.logger.Error("list shave events failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  events,
		"total": total,
	})
}

// AcknowledgeShave handles POST /api/v1/fraud/shaves/{id}/acknowledge
func (h *Handler) AcknowledgeShave(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if id == "" {
		errors.NewValidationError("id is required").WriteJSON(w)
		return
	}

	userID := r.Header.Get("X-User-ID")
	if userID == "" {
		userID = "system"
	}

	err := h.store.AcknowledgeShave(r.Context(), tenantID, id, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			errors.ErrNotFound.WriteJSON(w)
			return
		}
		h.logger.Error("acknowledge shave failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"acknowledged": true,
	})
}

// ---------------------------------------------------------------------------
// Dashboard Handler
// ---------------------------------------------------------------------------

// GetFraudDashboard handles GET /api/v1/fraud/dashboard
func (h *Handler) GetFraudDashboard(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	// Default to last 30 days
	to := time.Now().UTC()
	from := to.AddDate(0, 0, -30)

	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}

	stats, err := h.store.GetFraudDashboardStats(r.Context(), tenantID, from, to)
	if err != nil {
		h.logger.Error("get fraud dashboard failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// ---------------------------------------------------------------------------
// Velocity Rule Handlers
// ---------------------------------------------------------------------------

// ListVelocityRules handles GET /api/v1/fraud/velocity-rules
func (h *Handler) ListVelocityRules(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	rules, err := h.store.ListVelocityRules(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("list velocity rules failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": rules,
	})
}

// CreateVelocityRule handles POST /api/v1/fraud/velocity-rules
func (h *Handler) CreateVelocityRule(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	var rule models.VelocityRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	rule.TenantID = tenantID

	if rule.Name == "" || rule.Dimension == "" || rule.MaxCount <= 0 || rule.TimeWindowSeconds <= 0 {
		errors.NewValidationError("name, dimension, max_count (>0), and time_window_seconds (>0) are required").WriteJSON(w)
		return
	}

	if err := h.store.CreateVelocityRule(r.Context(), &rule); err != nil {
		h.logger.Error("create velocity rule failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(rule)
}

// UpdateVelocityRule handles PUT /api/v1/fraud/velocity-rules/{id}
func (h *Handler) UpdateVelocityRule(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if id == "" {
		errors.NewValidationError("id is required").WriteJSON(w)
		return
	}

	var rule models.VelocityRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	rule.ID = id
	rule.TenantID = tenantID

	err := h.store.UpdateVelocityRule(r.Context(), &rule)
	if err != nil {
		if err == pgx.ErrNoRows {
			errors.ErrNotFound.WriteJSON(w)
			return
		}
		h.logger.Error("update velocity rule failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rule)
}

// DeleteVelocityRule handles DELETE /api/v1/fraud/velocity-rules/{id}
func (h *Handler) DeleteVelocityRule(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := h.requireTenant(w, r)
	if !ok {
		return
	}

	id := r.PathValue("id")
	if id == "" {
		errors.NewValidationError("id is required").WriteJSON(w)
		return
	}

	err := h.store.DeleteVelocityRule(r.Context(), tenantID, id)
	if err != nil {
		if err == pgx.ErrNoRows {
			errors.ErrNotFound.WriteJSON(w)
			return
		}
		h.logger.Error("delete velocity rule failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

