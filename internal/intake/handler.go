// Package intake provides the lead intake API handlers.
package intake

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
	"github.com/gambchamp/crm/pkg/e164"
	"github.com/gambchamp/crm/pkg/idempotency"
)

const rateLimit = 100

// Handler holds lead intake dependencies.
type Handler struct {
	DB    IntakeQuerier
	RDB   *redis.Client
	NC    *nats.Conn
	Idem  *idempotency.Store
	Log   *slog.Logger
}

type createLeadRequest struct {
	FirstName    string          `json:"first_name"`
	LastName     *string         `json:"last_name"`
	Email        string          `json:"email"`
	Phone        string          `json:"phone"`
	Country      string          `json:"country"`
	Language     *string         `json:"language"`
	IP           *string         `json:"ip"`
	FunnelID     *string         `json:"funnel_id"`
	ClickID      *string         `json:"click_id"`
	SubID1       *string         `json:"sub_id_1"`
	SubID2       *string         `json:"sub_id_2"`
	SubID3       *string         `json:"sub_id_3"`
	SubID4       *string         `json:"sub_id_4"`
	SubID5       *string         `json:"sub_id_5"`
	CustomFields json.RawMessage `json:"custom_fields"`
}

type fieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// CreateLead handles POST /api/v1/leads.
func (h *Handler) CreateLead(c fiber.Ctx) error {
	ctx := c.Context()
	companyID := middleware.GetCompanyID(c)
	affiliateID := middleware.GetAffiliateID(c)
	apiKey := c.Get("X-API-Key")

	// 1. Rate limit
	minute := time.Now().Unix() / 60
	rlKey := fmt.Sprintf("ratelimit:%s:%d", apiKey, minute)
	count, err := h.RDB.Incr(ctx, rlKey).Result()
	if err != nil {
		h.Log.Error("rate limit check failed", "error", err)
	} else {
		if count == 1 {
			h.RDB.Expire(ctx, rlKey, 60*time.Second)
		}
		if count > rateLimit {
			c.Set("Retry-After", "60")
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "RATE_LIMIT_EXCEEDED", "message": "too many requests, try again later",
			})
		}
	}

	// 2. Parse + validate
	var req createLeadRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "malformed JSON",
		})
	}

	var errs []fieldError
	if req.FirstName == "" {
		errs = append(errs, fieldError{Field: "first_name", Message: "required"})
	}
	if req.Email == "" {
		errs = append(errs, fieldError{Field: "email", Message: "required"})
	}
	if req.Phone == "" {
		errs = append(errs, fieldError{Field: "phone", Message: "required"})
	}
	if req.Country == "" {
		errs = append(errs, fieldError{Field: "country", Message: "required"})
	}
	if len(errs) > 0 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "validation failed", "details": errs,
		})
	}

	// 3. Idempotency check
	idemKey := c.Get("Idempotency-Key")
	if idemKey != "" {
		existing, err := h.Idem.Check(ctx, companyID.String(), idemKey)
		if err != nil {
			h.Log.Error("idempotency check failed", "error", err)
		}
		if existing != "" {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{
				"id": existing, "status": "new", "idempotent": true,
			})
		}
	}

	// 4. E.164 normalize phone
	phoneRaw := req.Phone
	normalized, err := e164.Normalize(req.Phone, req.Country)
	if err != nil {
		h.Log.Warn("phone normalization failed, using raw", "phone", req.Phone, "error", err)
		normalized = req.Phone
	}

	// 5. Dedup check
	_, err = h.DB.CheckDuplicate(ctx, sqlc.CheckDuplicateParams{
		CompanyID: companyID, Email: req.Email, Phone: normalized,
	})
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "DUPLICATE", "message": "Lead already exists within 30-day window",
		})
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		h.Log.Error("dedup check failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "dedup check failed",
		})
	}

	// 6. INSERT lead
	ip := ""
	if req.IP != nil {
		ip = *req.IP
	} else {
		ip = c.IP()
	}

	customFields := req.CustomFields
	if customFields == nil {
		customFields = json.RawMessage(`{}`)
	}

	lead, err := h.DB.CreateLead(ctx, sqlc.CreateLeadParams{
		CompanyID:      companyID,
		AffiliateID:    affiliateID,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Email:          req.Email,
		Phone:          normalized,
		PhoneRaw:       &phoneRaw,
		Country:        req.Country,
		Ip:             ip,
		Language:       req.Language,
		FunnelID:       req.FunnelID,
		ClickID:        req.ClickID,
		SubID1:         req.SubID1,
		SubID2:         req.SubID2,
		SubID3:         req.SubID3,
		SubID4:         req.SubID4,
		SubID5:         req.SubID5,
		CustomFields:   customFields,
		Status:         "new",
		IdempotencyKey: nilIfEmpty(idemKey),
		SourceApiKey:   &apiKey,
	})
	if err != nil {
		h.Log.Error("create lead failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create lead",
		})
	}

	// 7. Set idempotency key
	if idemKey != "" {
		_ = h.Idem.Set(ctx, companyID.String(), idemKey, lead.ID.String())
	}

	// 8. Publish to NATS
	if h.NC != nil {
		_ = h.NC.Publish("leads.intake", []byte(lead.ID.String()))
	}

	h.Log.Info("lead created",
		"lead_id", lead.ID, "company_id", companyID, "affiliate_id", affiliateID)

	// 9. Return 201
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id": lead.ID, "status": lead.Status, "created_at": lead.CreatedAt.Format(time.RFC3339),
	})
}

// ListLeads handles GET /api/v1/leads.
func (h *Handler) ListLeads(c fiber.Ctx) error {
	companyID := middleware.GetCompanyID(c)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	var statusFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}
	var countryFilter *string
	if s := c.Query("country"); s != "" {
		countryFilter = &s
	}
	var searchFilter *string
	if s := c.Query("search"); s != "" {
		searchFilter = &s
	}

	var affiliateFilter pgtype.UUID
	if s := c.Query("affiliate_id"); s != "" {
		if uid, err := uuid.Parse(s); err == nil {
			affiliateFilter = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}

	var dateFrom, dateTo pgtype.Timestamptz
	if s := c.Query("date_from"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			dateFrom = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}
	if s := c.Query("date_to"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			dateTo = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	params := sqlc.ListLeadsParams{
		CompanyID:   companyID,
		Limit:       int32(perPage),
		Offset:      int32((page - 1) * perPage),
		Status:      statusFilter,
		AffiliateID: affiliateFilter,
		Country:     countryFilter,
		DateFrom:    dateFrom,
		DateTo:      dateTo,
		Search:      searchFilter,
	}

	leads, err := h.DB.ListLeads(c.Context(), params)
	if err != nil {
		h.Log.Error("list leads failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list leads",
		})
	}

	total, _ := h.DB.CountLeads(c.Context(), sqlc.CountLeadsParams{
		CompanyID:   companyID,
		Status:      statusFilter,
		AffiliateID: affiliateFilter,
		Country:     countryFilter,
		DateFrom:    dateFrom,
		DateTo:      dateTo,
		Search:      searchFilter,
	})

	return c.JSON(fiber.Map{
		"leads": leads, "total": total, "page": page, "per_page": perPage,
	})
}

// GetLead handles GET /api/v1/leads/:id.
func (h *Handler) GetLead(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid lead id",
		})
	}

	lead, err := h.DB.GetLead(c.Context(), sqlc.GetLeadParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "lead not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch lead",
		})
	}
	return c.JSON(lead)
}

// RegisterRoutes mounts lead intake routes.
func RegisterRoutes(router fiber.Router, h *Handler, apiKeyMw, authMw fiber.Handler) {
	router.Post("/leads", h.CreateLead, apiKeyMw)
	router.Get("/leads", h.ListLeads, authMw)
	router.Get("/leads/:id", h.GetLead, authMw)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
