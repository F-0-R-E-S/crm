package admin

import (
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

type BrokerHandler struct {
	DB BrokerQuerier
}

type BrokerResponse struct {
	ID                  uuid.UUID       `json:"id"`
	CompanyID           uuid.UUID       `json:"company_id"`
	Name                string          `json:"name"`
	Status              string          `json:"status"`
	TemplateID          *uuid.UUID      `json:"template_id"`
	Endpoint            string          `json:"endpoint"`
	FieldMapping        json.RawMessage `json:"field_mapping"`
	DailyCap            int32           `json:"daily_cap"`
	TotalCap            int32           `json:"total_cap"`
	CountryCaps         json.RawMessage `json:"country_caps"`
	Priority            int32           `json:"priority"`
	HealthStatus        string          `json:"health_status"`
	OpeningHoursEnabled bool            `json:"opening_hours_enabled"`
	FunnelFallback      string          `json:"funnel_fallback"`
	TestMode            bool            `json:"test_mode"`
	MaintenanceMode     bool            `json:"maintenance_mode"`
	CircuitState        string          `json:"circuit_state"`
	Notes               *string         `json:"notes"`
	ClonedFrom          *uuid.UUID      `json:"cloned_from"`
	CreatedAt           string          `json:"created_at"`
	UpdatedAt           string          `json:"updated_at"`
}

func toBrokerResponse(b sqlc.Broker) BrokerResponse {
	return BrokerResponse{
		ID:                  b.ID,
		CompanyID:           b.CompanyID,
		Name:                b.Name,
		Status:              b.Status,
		TemplateID:          b.TemplateID,
		Endpoint:            b.Endpoint,
		FieldMapping:        b.FieldMapping,
		DailyCap:            b.DailyCap,
		TotalCap:            b.TotalCap,
		CountryCaps:         b.CountryCaps,
		Priority:            b.Priority,
		HealthStatus:        b.HealthStatus,
		OpeningHoursEnabled: b.OpeningHoursEnabled,
		FunnelFallback:      b.FunnelFallback,
		TestMode:            b.TestMode,
		MaintenanceMode:     b.MaintenanceMode,
		CircuitState:        b.CircuitState,
		Notes:               b.Notes,
		ClonedFrom:          b.ClonedFrom,
		CreatedAt:           b.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:           b.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func (h *BrokerHandler) ListBrokers(c fiber.Ctx) error {
	companyID := middleware.GetCompanyID(c)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	var statusFilter, searchFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}
	if s := c.Query("search"); s != "" {
		searchFilter = &s
	}

	brokers, err := h.DB.ListBrokers(c.Context(), sqlc.ListBrokersParams{
		CompanyID: companyID,
		Limit:     int32(perPage),
		Offset:    int32((page - 1) * perPage),
		Status:    statusFilter,
		Search:    searchFilter,
	})
	if err != nil {
		slog.Error("list brokers failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list brokers",
		})
	}

	total, _ := h.DB.CountBrokers(c.Context(), sqlc.CountBrokersParams{
		CompanyID: companyID, Status: statusFilter,
	})

	resp := make([]BrokerResponse, 0, len(brokers))
	for _, b := range brokers {
		resp = append(resp, toBrokerResponse(b))
	}
	return c.JSON(fiber.Map{"brokers": resp, "total": total, "page": page, "per_page": perPage})
}

func (h *BrokerHandler) CreateBroker(c fiber.Ctx) error {
	role := middleware.GetRole(c)
	if role != "admin" && role != "manager" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admin or manager can create brokers",
		})
	}

	var req struct {
		Name         string          `json:"name"`
		TemplateID   *uuid.UUID      `json:"template_id"`
		Endpoint     string          `json:"endpoint"`
		Credentials  json.RawMessage `json:"credentials"`
		FieldMapping json.RawMessage `json:"field_mapping"`
		DailyCap     int32           `json:"daily_cap"`
		TotalCap     int32           `json:"total_cap"`
		CountryCaps  json.RawMessage `json:"country_caps"`
		Priority     int32           `json:"priority"`
		Notes        *string         `json:"notes"`
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
	if req.Endpoint == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "endpoint is required",
		})
	}

	fm := req.FieldMapping
	if fm == nil {
		fm = json.RawMessage(`{}`)
	}
	cc := req.CountryCaps
	if cc == nil {
		cc = json.RawMessage(`{}`)
	}

	broker, err := h.DB.CreateBroker(c.Context(), sqlc.CreateBrokerParams{
		CompanyID:      middleware.GetCompanyID(c),
		Name:           req.Name,
		Status:         "active",
		TemplateID:     req.TemplateID,
		Endpoint:       req.Endpoint,
		CredentialsEnc: req.Credentials,
		FieldMapping:   fm,
		DailyCap:       req.DailyCap,
		TotalCap:       req.TotalCap,
		CountryCaps:    cc,
		Priority:       req.Priority,
		Notes:          req.Notes,
	})
	if err != nil {
		slog.Error("create broker failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create broker",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(toBrokerResponse(broker))
}

func (h *BrokerHandler) GetBroker(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}
	broker, err := h.DB.GetBroker(c.Context(), sqlc.GetBrokerParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "broker not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch broker",
		})
	}
	return c.JSON(toBrokerResponse(broker))
}

func (h *BrokerHandler) UpdateBroker(c fiber.Ctx) error {
	role := middleware.GetRole(c)
	if role != "admin" && role != "manager" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admin or manager can update brokers",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	var req struct {
		Name                *string         `json:"name"`
		Status              *string         `json:"status"`
		Endpoint            *string         `json:"endpoint"`
		TemplateID          *uuid.UUID      `json:"template_id"`
		CredentialsEnc      []byte          `json:"credentials"`
		FieldMapping        json.RawMessage `json:"field_mapping"`
		DailyCap            *int32          `json:"daily_cap"`
		TotalCap            *int32          `json:"total_cap"`
		CountryCaps         json.RawMessage `json:"country_caps"`
		Priority            *int32          `json:"priority"`
		Notes               *string         `json:"notes"`
		HealthCheckURL      *string         `json:"health_check_url"`
		MaintenanceMode     *bool           `json:"maintenance_mode"`
		OpeningHoursEnabled *bool           `json:"opening_hours_enabled"`
		FunnelFallback      *string         `json:"funnel_fallback"`
		DefaultFunnelName   *string         `json:"default_funnel_name"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	broker, err := h.DB.UpdateBroker(c.Context(), sqlc.UpdateBrokerParams{
		ID:                  id,
		CompanyID:           middleware.GetCompanyID(c),
		Name:                req.Name,
		Status:              req.Status,
		Endpoint:            req.Endpoint,
		TemplateID:          req.TemplateID,
		CredentialsEnc:      req.CredentialsEnc,
		FieldMapping:        req.FieldMapping,
		DailyCap:            req.DailyCap,
		TotalCap:            req.TotalCap,
		CountryCaps:         req.CountryCaps,
		Priority:            req.Priority,
		Notes:               req.Notes,
		HealthCheckUrl:      req.HealthCheckURL,
		MaintenanceMode:     req.MaintenanceMode,
		OpeningHoursEnabled: req.OpeningHoursEnabled,
		FunnelFallback:      req.FunnelFallback,
		DefaultFunnelName:   req.DefaultFunnelName,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "broker not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update broker",
		})
	}
	return c.JSON(toBrokerResponse(broker))
}

func (h *BrokerHandler) DeleteBroker(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can delete brokers",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	if err := h.DB.DeleteBroker(c.Context(), sqlc.DeleteBrokerParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not delete broker",
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *BrokerHandler) CloneBroker(c fiber.Ctx) error {
	role := middleware.GetRole(c)
	if role != "admin" && role != "manager" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admin or manager can clone brokers",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := c.Bind().JSON(&req); err != nil || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "name is required for clone",
		})
	}

	clone, err := h.DB.CloneBroker(c.Context(), sqlc.CloneBrokerParams{
		ID: id, CompanyID: middleware.GetCompanyID(c), Name: req.Name,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "source broker not found",
			})
		}
		slog.Error("clone broker failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not clone broker",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(toBrokerResponse(clone))
}

func (h *BrokerHandler) GetCapUsage(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	companyID := middleware.GetCompanyID(c)
	broker, err := h.DB.GetBroker(c.Context(), sqlc.GetBrokerParams{
		ID: id, CompanyID: companyID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "broker not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch broker",
		})
	}

	delivered, _ := h.DB.GetBrokerCapUsageToday(c.Context(), sqlc.GetBrokerCapUsageTodayParams{
		BrokerID: id, CompanyID: companyID,
	})

	return c.JSON(fiber.Map{
		"broker_id":       broker.ID,
		"daily_cap":       broker.DailyCap,
		"delivered_today": delivered,
		"remaining":       max(0, int64(broker.DailyCap)-delivered),
		"total_cap":       broker.TotalCap,
	})
}

func (h *BrokerHandler) SetMaintenanceMode(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can set maintenance mode",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	var req struct {
		Enabled bool    `json:"enabled"`
		Until   *string `json:"until"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	if err := h.DB.SetBrokerMaintenanceMode(c.Context(), sqlc.SetBrokerMaintenanceModeParams{
		ID: id, CompanyID: middleware.GetCompanyID(c), MaintenanceMode: req.Enabled,
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not set maintenance mode",
		})
	}
	return c.JSON(fiber.Map{"updated": true, "maintenance_mode": req.Enabled})
}

func RegisterBrokerRoutes(router fiber.Router, h *BrokerHandler) {
	router.Get("/brokers", h.ListBrokers)
	router.Post("/brokers", h.CreateBroker)
	router.Get("/brokers/:id", h.GetBroker)
	router.Patch("/brokers/:id", h.UpdateBroker)
	router.Delete("/brokers/:id", h.DeleteBroker)
	router.Post("/brokers/:id/clone", h.CloneBroker)
	router.Get("/brokers/:id/cap-usage", h.GetCapUsage)
	router.Post("/brokers/:id/maintenance", h.SetMaintenanceMode)
}
