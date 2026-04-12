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
)

type BrokerTemplateHandler struct {
	DB BrokerTemplateQuerier
}

func (h *BrokerTemplateHandler) ListTemplates(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	var categoryFilter, searchFilter, sortFilter *string
	var publicFilter *bool
	if s := c.Query("category"); s != "" {
		categoryFilter = &s
	}
	if s := c.Query("search"); s != "" {
		searchFilter = &s
	}
	if s := c.Query("sort"); s != "" {
		sortFilter = &s
	}
	if s := c.Query("is_public"); s != "" {
		v := s == "true"
		publicFilter = &v
	}

	templates, err := h.DB.ListBrokerTemplates(c.Context(), sqlc.ListBrokerTemplatesParams{
		Limit:    int32(perPage),
		Offset:   int32((page - 1) * perPage),
		Category: categoryFilter,
		Search:   searchFilter,
		IsPublic: publicFilter,
		Sort:     sortFilter,
	})
	if err != nil {
		slog.Error("list templates failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list templates",
		})
	}

	total, _ := h.DB.CountBrokerTemplates(c.Context(), sqlc.CountBrokerTemplatesParams{
		Category: categoryFilter, Search: searchFilter, IsPublic: publicFilter,
	})

	return c.JSON(fiber.Map{"templates": templates, "total": total, "page": page, "per_page": perPage})
}

func (h *BrokerTemplateHandler) GetTemplate(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	tmpl, err := h.DB.GetBrokerTemplate(c.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "template not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch template",
		})
	}
	return c.JSON(tmpl)
}

func (h *BrokerTemplateHandler) CreateTemplate(c fiber.Ctx) error {
	var req struct {
		Name            string          `json:"name"`
		Method          string          `json:"method"`
		URLTemplate     string          `json:"url_template"`
		Headers         json.RawMessage `json:"headers"`
		BodyTemplate    json.RawMessage `json:"body_template"`
		AuthType        string          `json:"auth_type"`
		ResponseMapping json.RawMessage `json:"response_mapping"`
		PostbackConfig  json.RawMessage `json:"postback_config"`
		IsPublic        bool            `json:"is_public"`
		Category        *string         `json:"category"`
		Description     *string         `json:"description"`
		Author          *string         `json:"author"`
		Tags            []string        `json:"tags"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.Name == "" || req.URLTemplate == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "name and url_template are required",
		})
	}
	if req.Method == "" {
		req.Method = "POST"
	}
	if req.AuthType == "" {
		req.AuthType = "api_key"
	}
	if req.Headers == nil {
		req.Headers = json.RawMessage(`{}`)
	}
	if req.BodyTemplate == nil {
		req.BodyTemplate = json.RawMessage(`{}`)
	}
	if req.ResponseMapping == nil {
		req.ResponseMapping = json.RawMessage(`{}`)
	}

	tmpl, err := h.DB.CreateBrokerTemplate(c.Context(), sqlc.CreateBrokerTemplateParams{
		Name:            req.Name,
		Version:         1,
		Method:          req.Method,
		UrlTemplate:     req.URLTemplate,
		Headers:         req.Headers,
		BodyTemplate:    req.BodyTemplate,
		AuthType:        req.AuthType,
		ResponseMapping: req.ResponseMapping,
		PostbackConfig:  req.PostbackConfig,
		IsPublic:        req.IsPublic,
		Category:        req.Category,
		Description:     req.Description,
		Author:          req.Author,
		Tags:            req.Tags,
	})
	if err != nil {
		slog.Error("create template failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create template",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(tmpl)
}

func (h *BrokerTemplateHandler) UpdateTemplate(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	var req struct {
		Name            *string         `json:"name"`
		Method          *string         `json:"method"`
		URLTemplate     *string         `json:"url_template"`
		Headers         json.RawMessage `json:"headers"`
		BodyTemplate    json.RawMessage `json:"body_template"`
		AuthType        *string         `json:"auth_type"`
		ResponseMapping json.RawMessage `json:"response_mapping"`
		PostbackConfig  json.RawMessage `json:"postback_config"`
		Category        *string         `json:"category"`
		Description     *string         `json:"description"`
		Tags            []string        `json:"tags"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	tmpl, err := h.DB.UpdateBrokerTemplate(c.Context(), sqlc.UpdateBrokerTemplateParams{
		ID:              id,
		Name:            req.Name,
		Method:          req.Method,
		UrlTemplate:     req.URLTemplate,
		Headers:         req.Headers,
		BodyTemplate:    req.BodyTemplate,
		AuthType:        req.AuthType,
		ResponseMapping: req.ResponseMapping,
		PostbackConfig:  req.PostbackConfig,
		Category:        req.Category,
		Description:     req.Description,
		Tags:            req.Tags,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "template not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update template",
		})
	}
	return c.JSON(tmpl)
}

func (h *BrokerTemplateHandler) DeleteTemplate(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	if err := h.DB.DeleteBrokerTemplate(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not delete template (only non-public allowed)",
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func RegisterBrokerTemplateRoutes(router fiber.Router, h *BrokerTemplateHandler) {
	router.Get("/broker-templates", h.ListTemplates)
	router.Get("/broker-templates/:id", h.GetTemplate)
	router.Post("/broker-templates", h.CreateTemplate)
	router.Patch("/broker-templates/:id", h.UpdateTemplate)
	router.Delete("/broker-templates/:id", h.DeleteTemplate)
}
