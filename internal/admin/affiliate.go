package admin

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

// AffiliateHandler handles affiliate CRUD operations.
type AffiliateHandler struct {
	DB  *sqlc.Queries
	RDB *redis.Client
}

// AffiliateResponse masks the API key in normal responses.
type AffiliateResponse struct {
	ID        uuid.UUID       `json:"id"`
	CompanyID uuid.UUID       `json:"company_id"`
	Name      string          `json:"name"`
	APIKey    string          `json:"api_key"`
	Email     *string         `json:"email"`
	Status    string          `json:"status"`
	Settings  json.RawMessage `json:"settings"`
	CreatedAt string          `json:"created_at"`
}

func toAffiliateResponse(a sqlc.Affiliate, showFullKey bool) AffiliateResponse {
	key := a.ApiKey
	if !showFullKey && len(key) > 8 {
		key = "****" + key[len(key)-8:]
	}
	return AffiliateResponse{
		ID: a.ID, CompanyID: a.CompanyID, Name: a.Name, APIKey: key,
		Email: a.Email, Status: a.Status, Settings: a.Settings,
		CreatedAt: a.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func generateAPIKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ListAffiliates handles GET /api/v1/affiliates.
func (h *AffiliateHandler) ListAffiliates(c fiber.Ctx) error {
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

	affiliates, err := h.DB.ListAffiliates(c.Context(), sqlc.ListAffiliatesParams{
		CompanyID: companyID, Limit: int32(perPage),
		Offset: int32((page - 1) * perPage), Status: statusFilter,
	})
	if err != nil {
		slog.Error("list affiliates failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list affiliates",
		})
	}

	total, _ := h.DB.CountAffiliates(c.Context(), companyID)
	resp := make([]AffiliateResponse, 0, len(affiliates))
	for _, a := range affiliates {
		resp = append(resp, toAffiliateResponse(a, false))
	}
	return c.JSON(fiber.Map{"affiliates": resp, "total": total, "page": page, "per_page": perPage})
}

// CreateAffiliate handles POST /api/v1/affiliates.
func (h *AffiliateHandler) CreateAffiliate(c fiber.Ctx) error {
	role := middleware.GetRole(c)
	if role != "admin" && role != "manager" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admin or manager can create affiliates",
		})
	}

	var req struct {
		Name     string          `json:"name"`
		Email    *string         `json:"email"`
		Settings json.RawMessage `json:"settings"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "name is required",
		})
	}

	apiKey, err := generateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not generate API key",
		})
	}

	settings := req.Settings
	if settings == nil {
		settings = json.RawMessage(`{}`)
	}

	aff, err := h.DB.CreateAffiliate(c.Context(), sqlc.CreateAffiliateParams{
		CompanyID: middleware.GetCompanyID(c), Name: req.Name,
		ApiKey: apiKey, Email: req.Email, Status: "active", Settings: settings,
	})
	if err != nil {
		slog.Error("create affiliate failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create affiliate",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(toAffiliateResponse(aff, true))
}

// GetAffiliate handles GET /api/v1/affiliates/:id.
func (h *AffiliateHandler) GetAffiliate(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid affiliate id",
		})
	}
	aff, err := h.DB.GetAffiliate(c.Context(), sqlc.GetAffiliateParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "affiliate not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch affiliate",
		})
	}
	return c.JSON(toAffiliateResponse(aff, false))
}

// UpdateAffiliate handles PATCH /api/v1/affiliates/:id.
func (h *AffiliateHandler) UpdateAffiliate(c fiber.Ctx) error {
	role := middleware.GetRole(c)
	if role != "admin" && role != "manager" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admin or manager can update affiliates",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid affiliate id",
		})
	}

	var req struct {
		Name     *string         `json:"name"`
		Email    *string         `json:"email"`
		Status   *string         `json:"status"`
		Settings json.RawMessage `json:"settings"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	aff, err := h.DB.UpdateAffiliate(c.Context(), sqlc.UpdateAffiliateParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
		Name: req.Name, Email: req.Email, Status: req.Status, Settings: req.Settings,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "affiliate not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update affiliate",
		})
	}
	return c.JSON(toAffiliateResponse(aff, false))
}

// RegenerateKey handles POST /api/v1/affiliates/:id/regenerate-key.
func (h *AffiliateHandler) RegenerateKey(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can regenerate API keys",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid affiliate id",
		})
	}

	companyID := middleware.GetCompanyID(c)

	oldAff, err := h.DB.GetAffiliate(c.Context(), sqlc.GetAffiliateParams{ID: id, CompanyID: companyID})
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "NOT_FOUND", "message": "affiliate not found",
		})
	}
	h.RDB.Del(c.Context(), "apikey:"+oldAff.ApiKey)

	newKey, err := generateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not generate new key",
		})
	}

	aff, err := h.DB.UpdateAffiliateAPIKey(c.Context(), sqlc.UpdateAffiliateAPIKeyParams{
		ID: id, CompanyID: companyID, ApiKey: newKey,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not regenerate key",
		})
	}
	return c.JSON(toAffiliateResponse(aff, true))
}

// RegisterAffiliateRoutes mounts affiliate handlers.
func RegisterAffiliateRoutes(router fiber.Router, h *AffiliateHandler) {
	router.Get("/affiliates", h.ListAffiliates)
	router.Post("/affiliates", h.CreateAffiliate)
	router.Get("/affiliates/:id", h.GetAffiliate)
	router.Patch("/affiliates/:id", h.UpdateAffiliate)
	router.Post("/affiliates/:id/regenerate-key", h.RegenerateKey)
}
