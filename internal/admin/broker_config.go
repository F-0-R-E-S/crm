package admin

import (
	"encoding/json"
	"log/slog"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

type BrokerConfigHandler struct {
	DB BrokerConfigQuerier
}

// --- Opening Hours ---

func (h *BrokerConfigHandler) GetOpeningHours(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	hours, err := h.DB.GetBrokerOpeningHours(c.Context(), sqlc.GetBrokerOpeningHoursParams{
		BrokerID: brokerID, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		slog.Error("get opening hours failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch opening hours",
		})
	}
	return c.JSON(fiber.Map{"opening_hours": hours})
}

func (h *BrokerConfigHandler) UpsertOpeningHours(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	var req struct {
		Schedule []struct {
			DayOfWeek int    `json:"day_of_week"`
			OpenTime  string `json:"open_time"`
			CloseTime string `json:"close_time"`
			Timezone  string `json:"timezone"`
			IsEnabled bool   `json:"is_enabled"`
		} `json:"schedule"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	companyID := middleware.GetCompanyID(c)
	var results []sqlc.BrokerOpeningHour
	for _, s := range req.Schedule {
		if s.DayOfWeek < 0 || s.DayOfWeek > 6 {
			continue
		}
		tz := s.Timezone
		if tz == "" {
			tz = "UTC"
		}
		row, err := h.DB.UpsertBrokerOpeningHours(c.Context(), sqlc.UpsertBrokerOpeningHoursParams{
			BrokerID:  brokerID,
			CompanyID: companyID,
			DayOfWeek: int16(s.DayOfWeek),
			OpenTime:  s.OpenTime,
			CloseTime: s.CloseTime,
			Timezone:  tz,
			IsEnabled: s.IsEnabled,
		})
		if err != nil {
			slog.Error("upsert opening hour failed", "error", err, "day", s.DayOfWeek)
			continue
		}
		results = append(results, row)
	}
	return c.JSON(fiber.Map{"opening_hours": results})
}

// --- Funnel Mappings ---

func (h *BrokerConfigHandler) ListFunnelMappings(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	mappings, err := h.DB.ListFunnelMappings(c.Context(), sqlc.ListFunnelMappingsParams{
		BrokerID: brokerID, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list funnel mappings",
		})
	}
	return c.JSON(fiber.Map{"funnel_mappings": mappings})
}

func (h *BrokerConfigHandler) UpsertFunnelMapping(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	var req struct {
		SourceFunnel string `json:"source_funnel"`
		TargetFunnel string `json:"target_funnel"`
	}
	if err := c.Bind().JSON(&req); err != nil || req.SourceFunnel == "" || req.TargetFunnel == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "source_funnel and target_funnel are required",
		})
	}

	mapping, err := h.DB.UpsertFunnelMapping(c.Context(), sqlc.UpsertFunnelMappingParams{
		BrokerID:     brokerID,
		CompanyID:    middleware.GetCompanyID(c),
		SourceFunnel: req.SourceFunnel,
		TargetFunnel: req.TargetFunnel,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not upsert funnel mapping",
		})
	}
	return c.JSON(mapping)
}

func (h *BrokerConfigHandler) DeleteFunnelMapping(c fiber.Ctx) error {
	mappingID, err := uuid.Parse(c.Params("mapping_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid mapping id",
		})
	}

	if err := h.DB.DeleteFunnelMapping(c.Context(), sqlc.DeleteFunnelMappingParams{
		ID: mappingID, CompanyID: middleware.GetCompanyID(c),
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not delete funnel mapping",
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// --- Postback Config ---

func (h *BrokerConfigHandler) GetPostbackConfig(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	cfg, err := h.DB.GetPostbackConfig(c.Context(), sqlc.GetPostbackConfigParams{
		BrokerID: brokerID, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		return c.JSON(fiber.Map{"postback_config": nil})
	}
	return c.JSON(fiber.Map{"postback_config": cfg})
}

func (h *BrokerConfigHandler) UpsertPostbackConfig(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	var req struct {
		IsEnabled        bool            `json:"is_enabled"`
		VerificationType string          `json:"verification_type"`
		HMACSecret       *string         `json:"hmac_secret"`
		HMACAlgorithm    *string         `json:"hmac_algorithm"`
		HMACHeader       *string         `json:"hmac_header"`
		AllowedIPs       []string        `json:"allowed_ips"`
		StatusMapping    json.RawMessage `json:"status_mapping"`
		VariableTemplate json.RawMessage `json:"variable_template"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	vt := req.VerificationType
	if vt == "" {
		vt = "none"
	}
	sm := req.StatusMapping
	if sm == nil {
		sm = json.RawMessage(`{}`)
	}
	vtpl := req.VariableTemplate
	if vtpl == nil {
		vtpl = json.RawMessage(`{}`)
	}
	algo := "sha256"
	if req.HMACAlgorithm != nil {
		algo = *req.HMACAlgorithm
	}
	header := "X-Signature"
	if req.HMACHeader != nil {
		header = *req.HMACHeader
	}

	cfg, err := h.DB.UpsertPostbackConfig(c.Context(), sqlc.UpsertPostbackConfigParams{
		BrokerID:         brokerID,
		CompanyID:        middleware.GetCompanyID(c),
		IsEnabled:        req.IsEnabled,
		VerificationType: vt,
		HmacSecret:       req.HMACSecret,
		HmacAlgorithm:    &algo,
		HmacHeader:       &header,
		AllowedIps:       req.AllowedIPs,
		StatusMapping:    sm,
		VariableTemplate: vtpl,
	})
	if err != nil {
		slog.Error("upsert postback config failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not upsert postback config",
		})
	}
	return c.JSON(fiber.Map{"postback_config": cfg})
}

// --- Postback Log ---

func (h *BrokerConfigHandler) ListPostbackLog(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	var brokerFilter, leadFilter *uuid.UUID
	if s := c.Query("broker_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			brokerFilter = &id
		}
	}
	if s := c.Query("lead_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			leadFilter = &id
		}
	}

	logs, err := h.DB.ListPostbackLog(c.Context(), sqlc.ListPostbackLogParams{
		CompanyID: middleware.GetCompanyID(c),
		Limit:     int32(perPage),
		Offset:    int32((page - 1) * perPage),
		BrokerID:  brokerFilter,
		LeadID:    leadFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list postback log",
		})
	}
	return c.JSON(fiber.Map{"postback_log": logs, "page": page, "per_page": perPage})
}

func RegisterBrokerConfigRoutes(router fiber.Router, h *BrokerConfigHandler) {
	router.Get("/brokers/:id/opening-hours", h.GetOpeningHours)
	router.Put("/brokers/:id/opening-hours", h.UpsertOpeningHours)
	router.Get("/brokers/:id/funnel-mappings", h.ListFunnelMappings)
	router.Post("/brokers/:id/funnel-mappings", h.UpsertFunnelMapping)
	router.Delete("/brokers/:id/funnel-mappings/:mapping_id", h.DeleteFunnelMapping)
	router.Get("/brokers/:id/postback-config", h.GetPostbackConfig)
	router.Put("/brokers/:id/postback-config", h.UpsertPostbackConfig)
	router.Get("/postback-log", h.ListPostbackLog)
}
