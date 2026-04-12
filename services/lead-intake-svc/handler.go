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
	"github.com/gambchamp/crm/pkg/e164"
	"github.com/gambchamp/crm/pkg/email"
	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/geoip"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
)

const (
	dedupWindow       = 90 * 24 * time.Hour // 90 days
	idempotencyTTL    = 72 * time.Hour      // 72h per spec
	idempotencyPrefix = "idempotency:lead:"
	rateLimitPerMin   = 100
	defaultLeadsLimit = 50
	maxLeadsLimit     = 200
)

type Handler struct {
	logger *slog.Logger
	store  *Store
	nats   *messaging.NATSClient
	redis  *cache.Redis
	geoip  *geoip.Client
}

func NewHandler(logger *slog.Logger, store *Store, nats *messaging.NATSClient, redis *cache.Redis, geo *geoip.Client) *Handler {
	return &Handler{
		logger: logger,
		store:  store,
		nats:   nats,
		redis:  redis,
		geoip:  geo,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/leads", h.CreateLead)
	mux.HandleFunc("GET /api/v1/leads", h.ListLeads)
	mux.HandleFunc("GET /api/v1/leads/{id}", h.GetLead)
	mux.HandleFunc("POST /api/v1/leads/bulk", h.BulkImportLeads)
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
	FunnelName  string          `json:"funnel_name"`
	AffSub1     string          `json:"aff_sub1"`
	AffSub2     string          `json:"aff_sub2"`
	AffSub3     string          `json:"aff_sub3"`
	AffSub4     string          `json:"aff_sub4"`
	AffSub5     string          `json:"aff_sub5"`
	AffSub6     string          `json:"aff_sub6"`
	AffSub7     string          `json:"aff_sub7"`
	AffSub8     string          `json:"aff_sub8"`
	AffSub9     string          `json:"aff_sub9"`
	AffSub10    string          `json:"aff_sub10"`
	Extra       json.RawMessage `json:"extra,omitempty"`
}

type CreateLeadResponse struct {
	ID         string             `json:"id"`
	Status     models.LeadStatus  `json:"status"`
	PhoneE164  string             `json:"phone_e164"`
	Validation *ValidationResult  `json:"validation,omitempty"`
}

type ValidationResult struct {
	EmailValid      bool   `json:"email_valid"`
	EmailDisposable bool   `json:"email_disposable"`
	EmailNormalized string `json:"email_normalized"`
	PhoneE164       string `json:"phone_e164"`
	PhoneValid      bool   `json:"phone_valid"`
	IPCountry       string `json:"ip_country,omitempty"`
	IPISP           string `json:"ip_isp,omitempty"`
}

type ListLeadsResponse struct {
	Leads  []*models.Lead `json:"leads"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type GetLeadResponse struct {
	Lead   *models.Lead        `json:"lead"`
	Events []*models.LeadEvent `json:"events"`
}

type BulkImportResponse struct {
	Total    int           `json:"total"`
	Accepted int           `json:"accepted"`
	Rejected int           `json:"rejected"`
	Errors   []BulkError   `json:"errors,omitempty"`
}

type BulkError struct {
	Row     int    `json:"row"`
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

// ---------------------------------------------------------------------------
// POST /api/v1/leads
// ---------------------------------------------------------------------------

func (h *Handler) CreateLead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	start := time.Now()

	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	// --- Rate limiting (Redis-based, per API key) ---
	apiKey := r.Header.Get("X-API-Key")
	if apiKey == "" {
		apiKey = r.RemoteAddr
	}
	rlKey := fmt.Sprintf("ratelimit:lead-intake:%s:%d", apiKey, time.Now().Unix()/60)
	count, _ := h.redis.IncrWithExpiry(ctx, rlKey, 61*time.Second)
	if count > rateLimitPerMin {
		w.Header().Set("Retry-After", "60")
		apperrors.ErrRateLimit.WriteJSON(w)
		return
	}

	// --- Parse body ---
	var req CreateLeadRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	// --- Validate required fields ---
	var fieldErrors []FieldError
	if req.FirstName == "" {
		fieldErrors = append(fieldErrors, FieldError{Field: "first_name", Message: "required", Code: "REQUIRED"})
	}
	if req.Email == "" {
		fieldErrors = append(fieldErrors, FieldError{Field: "email", Message: "required", Code: "REQUIRED"})
	}
	if req.Phone == "" {
		fieldErrors = append(fieldErrors, FieldError{Field: "phone", Message: "required", Code: "REQUIRED"})
	}
	if req.Country == "" {
		fieldErrors = append(fieldErrors, FieldError{Field: "country", Message: "required", Code: "REQUIRED"})
	}
	if len(fieldErrors) > 0 {
		writeFieldErrors(w, fieldErrors)
		return
	}

	// --- Validate email (RFC 5322 + DNS MX + disposable) ---
	emailResult := email.Validate(ctx, req.Email)
	if !emailResult.Valid {
		writeFieldErrors(w, []FieldError{{
			Field: "email", Message: emailResult.Reason, Code: "INVALID_EMAIL",
		}})
		return
	}
	if emailResult.Disposable {
		writeFieldErrors(w, []FieldError{{
			Field: "email", Message: "disposable email domains are not accepted", Code: "DISPOSABLE_EMAIL",
		}})
		return
	}

	normalizedEmail := emailResult.Normalized
	country := strings.ToUpper(strings.TrimSpace(req.Country))

	// --- Validate country code ---
	if !e164.IsValidCountry(country) {
		writeFieldErrors(w, []FieldError{{
			Field: "country", Message: "unknown ISO 3166-1 alpha-2 country code", Code: "INVALID_COUNTRY",
		}})
		return
	}

	// --- Normalize phone to E.164 ---
	phoneE164, phoneErr := e164.Normalize(req.Phone, country)
	phoneValid := phoneErr == nil

	// --- IP geolocation ---
	clientIP := req.IP
	if clientIP == "" {
		clientIP = extractClientIP(r)
	}
	var geoResult geoip.Result
	if h.geoip != nil && clientIP != "" {
		geoResult = h.geoip.Lookup(ctx, clientIP)
		if country == "" && geoResult.Country != "" {
			country = geoResult.Country
		}
	}

	// --- Idempotency check ---
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey != "" {
		if len(idempotencyKey) > 255 {
			apperrors.NewBadRequest("Idempotency-Key must be at most 255 characters").WriteJSON(w)
			return
		}
		cacheKey := idempotencyPrefix + tenantID + ":" + idempotencyKey

		cached, err := h.redis.Get(ctx, cacheKey)
		if err == nil && cached != "" {
			writeJSON(w, http.StatusOK, CreateLeadResponse{
				ID:     cached,
				Status: models.LeadStatusProcessing,
			})
			return
		}

		existing, err := h.store.GetLeadByIdempotencyKey(ctx, tenantID, idempotencyKey)
		if err != nil {
			h.logger.Error("idempotency db check failed", "error", err)
			apperrors.ErrInternal.WriteJSON(w)
			return
		}
		if existing != nil {
			_ = h.redis.Set(ctx, cacheKey, existing.ID, idempotencyTTL)
			writeJSON(w, http.StatusOK, CreateLeadResponse{
				ID:        existing.ID,
				Status:    existing.Status,
				PhoneE164: existing.PhoneE164,
			})
			return
		}
	}

	// --- Duplicate check (email + phone, 90-day window) ---
	dup, err := h.store.CheckDuplicate(ctx, tenantID, normalizedEmail, phoneE164, dedupWindow)
	if err != nil {
		h.logger.Error("duplicate check failed", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if dup != nil {
		(&apperrors.AppError{
			Code:       "DUPLICATE_LEAD",
			Message:    "duplicate lead detected",
			Detail:     fmt.Sprintf("matched on %s, original lead %s created at %s", dup.MatchedOn, dup.DuplicateOf, dup.OriginalCreatedAt.Format(time.RFC3339)),
			HTTPStatus: http.StatusConflict,
		}).WriteJSON(w)
		return
	}

	// --- Build lead ---
	lead := &models.Lead{
		TenantID:       tenantID,
		AffiliateID:    req.AffiliateID,
		IdempotencyKey: idempotencyKey,
		FirstName:      strings.TrimSpace(req.FirstName),
		LastName:       strings.TrimSpace(req.LastName),
		Email:          normalizedEmail,
		Phone:          req.Phone,
		PhoneE164:      phoneE164,
		Country:        country,
		IP:             clientIP,
		UserAgent:      r.UserAgent(),
		FunnelName:     strings.TrimSpace(req.FunnelName),
		AffSub1:        req.AffSub1,
		AffSub2:        req.AffSub2,
		AffSub3:        req.AffSub3,
		AffSub4:        req.AffSub4,
		AffSub5:        req.AffSub5,
		AffSub6:        req.AffSub6,
		AffSub7:        req.AffSub7,
		AffSub8:        req.AffSub8,
		AffSub9:        req.AffSub9,
		AffSub10:       req.AffSub10,
		Status:         models.LeadStatusNew,
		QualityScore:   0,
		Extra:          req.Extra,
	}

	if !phoneValid {
		lead.QualityScore = -10
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
		Duration:  time.Since(start),
	}
	if err := h.store.CreateLeadEvent(ctx, event); err != nil {
		h.logger.Error("failed to create lead event", "error", err, "lead_id", lead.ID)
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
		"funnel_name":  lead.FunnelName,
		"aff_sub1":     lead.AffSub1,
		"quality_score": lead.QualityScore,
		"created_at":   lead.CreatedAt,
	}); err != nil {
		h.logger.Error("failed to publish lead.received", "error", err, "lead_id", lead.ID)
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
		"country", lead.Country,
		"latency_ms", time.Since(start).Milliseconds(),
	)

	writeJSON(w, http.StatusAccepted, CreateLeadResponse{
		ID:        lead.ID,
		Status:    lead.Status,
		PhoneE164: lead.PhoneE164,
		Validation: &ValidationResult{
			EmailValid:      emailResult.Valid,
			EmailDisposable: emailResult.Disposable,
			EmailNormalized: emailResult.Normalized,
			PhoneE164:       phoneE164,
			PhoneValid:      phoneValid,
			IPCountry:       geoResult.Country,
			IPISP:           geoResult.ISP,
		},
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/leads/bulk
// ---------------------------------------------------------------------------

func (h *Handler) BulkImportLeads(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var leads []CreateLeadRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 50<<20)).Decode(&struct {
		Leads *[]CreateLeadRequest `json:"leads"`
	}{Leads: &leads}); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if len(leads) == 0 {
		apperrors.NewBadRequest("leads array is empty").WriteJSON(w)
		return
	}
	if len(leads) > 10000 {
		apperrors.NewBadRequest("max 10,000 leads per batch").WriteJSON(w)
		return
	}

	resp := BulkImportResponse{Total: len(leads)}

	for i, req := range leads {
		row := i + 1

		if req.FirstName == "" || req.Email == "" || req.Phone == "" || req.Country == "" {
			resp.Rejected++
			resp.Errors = append(resp.Errors, BulkError{Row: row, Message: "missing required fields"})
			continue
		}

		emailResult := email.Validate(ctx, req.Email)
		if !emailResult.Valid || emailResult.Disposable {
			resp.Rejected++
			resp.Errors = append(resp.Errors, BulkError{Row: row, Field: "email", Message: "invalid or disposable email"})
			continue
		}

		country := strings.ToUpper(strings.TrimSpace(req.Country))
		phoneE164 := e164.NormalizeE164(req.Phone, country)

		dup, err := h.store.CheckDuplicate(ctx, tenantID, emailResult.Normalized, phoneE164, dedupWindow)
		if err != nil {
			resp.Rejected++
			resp.Errors = append(resp.Errors, BulkError{Row: row, Message: "dedup check failed"})
			continue
		}
		if dup != nil {
			resp.Rejected++
			resp.Errors = append(resp.Errors, BulkError{Row: row, Message: "duplicate lead"})
			continue
		}

		lead := &models.Lead{
			TenantID:    tenantID,
			AffiliateID: req.AffiliateID,
			FirstName:   strings.TrimSpace(req.FirstName),
			LastName:    strings.TrimSpace(req.LastName),
			Email:       emailResult.Normalized,
			Phone:       req.Phone,
			PhoneE164:   phoneE164,
			Country:     country,
			IP:          req.IP,
			FunnelName:  strings.TrimSpace(req.FunnelName),
			AffSub1:     req.AffSub1,
			AffSub2:     req.AffSub2,
			AffSub3:     req.AffSub3,
			AffSub4:     req.AffSub4,
			AffSub5:     req.AffSub5,
			AffSub6:     req.AffSub6,
			AffSub7:     req.AffSub7,
			AffSub8:     req.AffSub8,
			AffSub9:     req.AffSub9,
			AffSub10:    req.AffSub10,
			Status:      models.LeadStatusNew,
			Extra:       req.Extra,
		}

		if err := h.store.CreateLead(ctx, lead); err != nil {
			resp.Rejected++
			resp.Errors = append(resp.Errors, BulkError{Row: row, Message: "insert failed"})
			continue
		}

		_ = h.nats.Publish(ctx, "lead.received", "lead-intake-svc", map[string]interface{}{
			"lead_id":   lead.ID,
			"tenant_id": tenantID,
			"email":     lead.Email,
			"country":   lead.Country,
		})

		resp.Accepted++
	}

	writeJSON(w, http.StatusAccepted, resp)
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

	filters := LeadFilters{
		Status:      r.URL.Query().Get("status"),
		Country:     r.URL.Query().Get("country"),
		AffiliateID: r.URL.Query().Get("affiliate_id"),
		Search:      r.URL.Query().Get("search"),
		DateFrom:    r.URL.Query().Get("date_from"),
		DateTo:      r.URL.Query().Get("date_to"),
	}

	leads, total, err := h.store.ListLeads(r.Context(), tenantID, limit, offset, filters)
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
	if lead == nil || lead.TenantID != tenantID {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	events, err := h.store.GetLeadEvents(r.Context(), leadID)
	if err != nil {
		h.logger.Error("failed to get lead events", "error", err, "lead_id", leadID)
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

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

func writeFieldErrors(w http.ResponseWriter, fields []FieldError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnprocessableEntity)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]interface{}{
			"code":    "VALIDATION_ERROR",
			"message": "validation failed",
			"fields":  fields,
		},
	})
}

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

func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.SplitN(xff, ",", 2)
		return strings.TrimSpace(parts[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, _ := strings.Cut(r.RemoteAddr, ":")
	return host
}
