package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/phone"
)

const (
	dedupWindow        = 24 * time.Hour
	idempotencyTTL     = 24 * time.Hour
	idempotencyPrefix  = "idempotency:lead:"
	defaultLeadsLimit  = 50
	maxLeadsLimit      = 200
)

// Handler holds dependencies for all HTTP handlers.
type Handler struct {
	logger *slog.Logger
	store  *Store
	nats   *messaging.NATSClient
	redis  *cache.Redis
}

// NewHandler creates a ready-to-use Handler.
func NewHandler(logger *slog.Logger, store *Store, nats *messaging.NATSClient, redis *cache.Redis) *Handler {
	return &Handler{
		logger: logger,
		store:  store,
		nats:   nats,
		redis:  redis,
	}
}

// Register mounts all routes on the given mux using Go 1.22 patterns.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/leads", h.CreateLead)
	mux.HandleFunc("GET /api/v1/leads", h.ListLeads)
	mux.HandleFunc("GET /api/v1/leads/{id}", h.GetLead)
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

type CreateLeadRequest struct {
	FirstName   string          `json:"first_name"`
	LastName    string          `json:"last_name"`
	Email       string          `json:"email"`
	Phone       string          `json:"phone"`
	Country     string          `json:"country"`
	IP          string          `json:"ip"`
	AffiliateID string          `json:"affiliate_id"`
	Extra       json.RawMessage `json:"extra,omitempty"`
}

type CreateLeadResponse struct {
	ID       string            `json:"id"`
	Status   models.LeadStatus `json:"status"`
	PhoneE164 string           `json:"phone_e164"`
}

type ListLeadsResponse struct {
	Leads  []*models.Lead `json:"leads"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type GetLeadResponse struct {
	Lead   *models.Lead       `json:"lead"`
	Events []*models.LeadEvent `json:"events"`
}

// ---------------------------------------------------------------------------
// POST /api/v1/leads
// ---------------------------------------------------------------------------

func (h *Handler) CreateLead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	// --- Parse body ---
	var req CreateLeadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	// --- Validate required fields ---
	var missing []string
	if req.FirstName == "" {
		missing = append(missing, "first_name")
	}
	if req.LastName == "" {
		missing = append(missing, "last_name")
	}
	if req.Email == "" {
		missing = append(missing, "email")
	}
	if len(missing) > 0 {
		apperrors.NewValidationError(
			fmt.Sprintf("required fields missing: %s", strings.Join(missing, ", ")),
		).WriteJSON(w)
		return
	}

	// --- Idempotency check ---
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey != "" {
		cacheKey := idempotencyPrefix + tenantID + ":" + idempotencyKey

		// Fast path: check Redis cache
		cached, err := h.redis.Get(ctx, cacheKey)
		if err == nil && cached != "" {
			// Already processed; return the cached lead ID
			writeJSON(w, http.StatusOK, CreateLeadResponse{
				ID:     cached,
				Status: models.LeadStatusProcessing,
			})
			return
		}

		// Slow path: check DB
		existing, err := h.store.GetLeadByIdempotencyKey(ctx, tenantID, idempotencyKey)
		if err != nil {
			h.logger.Error("idempotency db check failed", "error", err)
			apperrors.ErrInternal.WriteJSON(w)
			return
		}
		if existing != nil {
			// Re-populate Redis cache
			_ = h.redis.Set(ctx, cacheKey, existing.ID, idempotencyTTL)
			writeJSON(w, http.StatusOK, CreateLeadResponse{
				ID:        existing.ID,
				Status:    existing.Status,
				PhoneE164: existing.PhoneE164,
			})
			return
		}
	}

	// --- Normalize phone ---
	phoneE164 := phone.NormalizeE164(req.Phone, req.Country)

	// --- Duplicate check (same email + tenant within 24h) ---
	isDup, err := h.store.CheckDuplicate(ctx, tenantID, req.Email, dedupWindow)
	if err != nil {
		h.logger.Error("duplicate check failed", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if isDup {
		(&apperrors.AppError{
			Code:       "DUPLICATE",
			Message:    "duplicate lead",
			Detail:     "a lead with this email was received within the last 24 hours",
			HTTPStatus: http.StatusConflict,
		}).WriteJSON(w)
		return
	}

	// --- Build lead ---
	lead := &models.Lead{
		TenantID:       tenantID,
		AffiliateID:    req.AffiliateID,
		IdempotencyKey: idempotencyKey,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Email:          strings.ToLower(strings.TrimSpace(req.Email)),
		Phone:          req.Phone,
		PhoneE164:      phoneE164,
		Country:        strings.ToUpper(strings.TrimSpace(req.Country)),
		IP:             req.IP,
		UserAgent:      r.UserAgent(),
		Status:         models.LeadStatusProcessing,
		QualityScore:   0,
		Extra:          req.Extra,
	}

	// --- Insert ---
	if err := h.store.CreateLead(ctx, lead); err != nil {
		h.logger.Error("failed to create lead", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	// --- Record lead_event ---
	event := &models.LeadEvent{
		LeadID:    lead.ID,
		TenantID:  tenantID,
		EventType: "lead.received",
	}
	if err := h.store.CreateLeadEvent(ctx, event); err != nil {
		h.logger.Error("failed to create lead event", "error", err, "lead_id", lead.ID)
		// Non-fatal: the lead is already persisted.
	}

	// --- Publish to NATS ---
	if err := h.nats.Publish(ctx, "lead.received", "lead-intake-svc", map[string]interface{}{
		"lead_id":      lead.ID,
		"tenant_id":    tenantID,
		"affiliate_id": lead.AffiliateID,
		"email":        lead.Email,
		"country":      lead.Country,
		"phone_e164":   lead.PhoneE164,
		"ip":           lead.IP,
		"created_at":   lead.CreatedAt,
	}); err != nil {
		h.logger.Error("failed to publish lead.received", "error", err, "lead_id", lead.ID)
		// Non-fatal: the lead is persisted. Routing will pick it up via polling/retry.
	}

	// --- Cache idempotency key ---
	if idempotencyKey != "" {
		cacheKey := idempotencyPrefix + tenantID + ":" + idempotencyKey
		if err := h.redis.Set(ctx, cacheKey, lead.ID, idempotencyTTL); err != nil {
			h.logger.Error("failed to cache idempotency key", "error", err)
		}
	}

	h.logger.Info("lead received",
		"lead_id", lead.ID,
		"tenant_id", tenantID,
		"affiliate_id", lead.AffiliateID,
		"idempotency_key", idempotencyKey,
		"country", lead.Country,
	)

	writeJSON(w, http.StatusAccepted, CreateLeadResponse{
		ID:        lead.ID,
		Status:    lead.Status,
		PhoneE164: lead.PhoneE164,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/leads
// ---------------------------------------------------------------------------

func (h *Handler) ListLeads(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	limit := parseIntParam(r, "limit", defaultLeadsLimit)
	if limit <= 0 || limit > maxLeadsLimit {
		limit = defaultLeadsLimit
	}
	offset := parseIntParam(r, "offset", 0)
	if offset < 0 {
		offset = 0
	}

	leads, total, err := h.store.ListLeads(r.Context(), tenantID, limit, offset)
	if err != nil {
		h.logger.Error("failed to list leads", "error", err, "tenant_id", tenantID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	if leads == nil {
		leads = []*models.Lead{}
	}

	writeJSON(w, http.StatusOK, ListLeadsResponse{
		Leads:  leads,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/leads/{id}
// ---------------------------------------------------------------------------

func (h *Handler) GetLead(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	leadID := r.PathValue("id")
	if leadID == "" {
		apperrors.NewBadRequest("lead id is required").WriteJSON(w)
		return
	}

	lead, err := h.store.GetLead(r.Context(), leadID)
	if err != nil {
		h.logger.Error("failed to get lead", "error", err, "lead_id", leadID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if lead == nil {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	// Ensure the lead belongs to the requesting tenant.
	if lead.TenantID != tenantID {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	events, err := h.store.GetLeadEvents(r.Context(), leadID)
	if err != nil {
		h.logger.Error("failed to get lead events", "error", err, "lead_id", leadID)
		// Return lead without events rather than failing entirely.
		events = []*models.LeadEvent{}
	}
	if events == nil {
		events = []*models.LeadEvent{}
	}

	writeJSON(w, http.StatusOK, GetLeadResponse{
		Lead:   lead,
		Events: events,
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

func parseIntParam(r *http.Request, key string, defaultVal int) int {
	s := r.URL.Query().Get(key)
	if s == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return v
}
