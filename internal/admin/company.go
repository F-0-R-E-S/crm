// Package admin provides company, user, and affiliate management HTTP handlers.
package admin

import (
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

// CompanyHandler handles company CRUD operations.
type CompanyHandler struct {
	DB CompanyQuerier
}

type createCompanyRequest struct {
	Name     string          `json:"name"`
	Slug     string          `json:"slug"`
	Plan     string          `json:"plan"`
	Settings json.RawMessage `json:"settings"`
}

type updateCompanyRequest struct {
	Name     *string         `json:"name"`
	Plan     *string         `json:"plan"`
	Settings json.RawMessage `json:"settings"`
}

// CreateCompany handles POST /api/v1/companies.
func (h *CompanyHandler) CreateCompany(c fiber.Ctx) error {
	var req createCompanyRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.Name == "" || req.Slug == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "name and slug are required",
		})
	}

	plan := req.Plan
	if plan == "" {
		plan = "starter"
	}
	settings := req.Settings
	if settings == nil {
		settings = json.RawMessage(`{}`)
	}

	company, err := h.DB.CreateCompany(c.Context(), sqlc.CreateCompanyParams{
		Name: req.Name, Slug: req.Slug, Plan: plan, Status: "active", Settings: settings,
	})
	if err != nil {
		slog.Error("create company failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create company",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(company)
}

// GetCompany handles GET /api/v1/companies/:id.
func (h *CompanyHandler) GetCompany(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid company id",
		})
	}

	jwtCompany := middleware.GetCompanyID(c)
	if middleware.GetRole(c) != "admin" && id != jwtCompany {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "you can only view your own company",
		})
	}

	company, err := h.DB.GetCompany(c.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "company not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch company",
		})
	}
	return c.JSON(company)
}

// UpdateCompany handles PATCH /api/v1/companies/:id.
func (h *CompanyHandler) UpdateCompany(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid company id",
		})
	}

	jwtCompany := middleware.GetCompanyID(c)
	if id != jwtCompany {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "you can only update your own company",
		})
	}

	var req updateCompanyRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	company, err := h.DB.UpdateCompany(c.Context(), sqlc.UpdateCompanyParams{
		ID: id, Name: req.Name, Plan: req.Plan, Settings: req.Settings,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "company not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update company",
		})
	}
	return c.JSON(company)
}

// RegisterCompanyRoutes mounts company handlers.
func RegisterCompanyRoutes(router fiber.Router, h *CompanyHandler) {
	router.Post("/companies", h.CreateCompany)
	router.Get("/companies/:id", h.GetCompany)
	router.Patch("/companies/:id", h.UpdateCompany)
}
