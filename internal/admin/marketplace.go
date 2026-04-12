package admin

import (
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

type MarketplaceHandler struct {
	Templates   MarketplaceQuerier
	Installs    InstallQuerier
	Reviews     ReviewQuerier
	Submissions SubmissionQuerier
	Versions    VersionQuerier
}

type InstallQuerier interface {
	InstallTemplate(ctx context.Context, arg sqlc.InstallTemplateParams) (sqlc.InstalledIntegration, error)
	UninstallTemplate(ctx context.Context, arg sqlc.UninstallTemplateParams) error
	ListInstalled(ctx context.Context, arg sqlc.ListInstalledParams) ([]sqlc.InstalledIntegration, error)
	GetInstalled(ctx context.Context, arg sqlc.GetInstalledParams) (sqlc.InstalledIntegration, error)
}

type ReviewQuerier interface {
	CreateReview(ctx context.Context, arg sqlc.CreateReviewParams) (sqlc.TemplateReview, error)
	ListReviews(ctx context.Context, arg sqlc.ListReviewsParams) ([]sqlc.TemplateReview, error)
	UpdateReview(ctx context.Context, arg sqlc.UpdateReviewParams) (sqlc.TemplateReview, error)
	DeleteReview(ctx context.Context, arg sqlc.DeleteReviewParams) error
}

type SubmissionQuerier interface {
	CreateSubmission(ctx context.Context, arg sqlc.CreateSubmissionParams) (sqlc.MarketplaceSubmission, error)
	GetSubmission(ctx context.Context, arg sqlc.GetSubmissionParams) (sqlc.MarketplaceSubmission, error)
	ListSubmissions(ctx context.Context, arg sqlc.ListSubmissionsParams) ([]sqlc.MarketplaceSubmission, error)
	UpdateSubmissionStatus(ctx context.Context, arg sqlc.UpdateSubmissionStatusParams) (sqlc.MarketplaceSubmission, error)
}

type VersionQuerier interface {
	CreateTemplateVersion(ctx context.Context, arg sqlc.CreateTemplateVersionParams) (sqlc.TemplateVersion, error)
	ListTemplateVersions(ctx context.Context, arg sqlc.ListTemplateVersionsParams) ([]sqlc.TemplateVersion, error)
	GetTemplateVersion(ctx context.Context, arg sqlc.GetTemplateVersionParams) (sqlc.TemplateVersion, error)
}

// --- Marketplace catalog (uses broker template listing) ---

func (h *MarketplaceHandler) ListCatalog(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	var catFilter, searchFilter, sortFilter *string
	if s := c.Query("category"); s != "" {
		catFilter = &s
	}
	if s := c.Query("search"); s != "" {
		searchFilter = &s
	}
	if s := c.Query("sort"); s != "" {
		sortFilter = &s
	}
	isPublic := true

	templates, err := h.Templates.ListBrokerTemplates(c.Context(), sqlc.ListBrokerTemplatesParams{
		Limit:    int32(perPage),
		Offset:   int32((page - 1) * perPage),
		Category: catFilter,
		Search:   searchFilter,
		IsPublic: &isPublic,
		Sort:     sortFilter,
	})
	if err != nil {
		slog.Error("list catalog failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list catalog",
		})
	}

	total, _ := h.Templates.CountBrokerTemplates(c.Context(), sqlc.CountBrokerTemplatesParams{
		Category: catFilter, Search: searchFilter, IsPublic: &isPublic,
	})

	return c.JSON(fiber.Map{"templates": templates, "total": total, "page": page, "per_page": perPage})
}

func (h *MarketplaceHandler) GetCatalogItem(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	tmpl, err := h.Templates.GetBrokerTemplate(c.Context(), id)
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

// --- One-click install ---

func (h *MarketplaceHandler) InstallTemplate(c fiber.Ctx) error {
	templateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	tmpl, err := h.Templates.GetBrokerTemplate(c.Context(), templateID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "NOT_FOUND", "message": "template not found",
		})
	}

	install, err := h.Installs.InstallTemplate(c.Context(), sqlc.InstallTemplateParams{
		CompanyID:        middleware.GetCompanyID(c),
		TemplateID:       templateID,
		InstalledVersion: tmpl.Version,
	})
	if err != nil {
		slog.Error("install template failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not install template",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(install)
}

func (h *MarketplaceHandler) UninstallTemplate(c fiber.Ctx) error {
	templateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	if err := h.Installs.UninstallTemplate(c.Context(), sqlc.UninstallTemplateParams{
		CompanyID: middleware.GetCompanyID(c), TemplateID: templateID,
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not uninstall template",
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *MarketplaceHandler) ListInstalled(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}

	installed, err := h.Installs.ListInstalled(c.Context(), sqlc.ListInstalledParams{
		CompanyID: middleware.GetCompanyID(c),
		Limit:     int32(perPage),
		Offset:    int32((page - 1) * perPage),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list installed integrations",
		})
	}
	return c.JSON(fiber.Map{"installed": installed, "page": page, "per_page": perPage})
}

// --- Ratings & Reviews ---

func (h *MarketplaceHandler) ListReviews(c fiber.Ctx) error {
	templateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	sort := c.Query("sort", "newest")

	reviews, err := h.Reviews.ListReviews(c.Context(), sqlc.ListReviewsParams{
		TemplateID: templateID,
		Limit:      int32(perPage),
		Offset:     int32((page - 1) * perPage),
		Sort:       &sort,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list reviews",
		})
	}
	return c.JSON(fiber.Map{"reviews": reviews, "page": page, "per_page": perPage})
}

func (h *MarketplaceHandler) CreateReview(c fiber.Ctx) error {
	templateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	var req struct {
		Rating     string `json:"rating"`
		ReviewText string `json:"review_text"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	review, err := h.Reviews.CreateReview(c.Context(), sqlc.CreateReviewParams{
		TemplateID: templateID,
		CompanyID:  middleware.GetCompanyID(c),
		UserID:     middleware.GetUserID(c),
		Rating:     req.Rating,
		ReviewText: &req.ReviewText,
	})
	if err != nil {
		slog.Error("create review failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create review",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(review)
}

// --- Community Submissions ---

func (h *MarketplaceHandler) CreateSubmission(c fiber.Ctx) error {
	var req struct {
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Method      string          `json:"method"`
		URLTemplate string          `json:"url_template"`
		Headers     json.RawMessage `json:"headers"`
		Body        json.RawMessage `json:"body_template"`
		AuthType    string          `json:"auth_type"`
		Readme      string          `json:"readme"`
		LogoURL     string          `json:"logo_url"`
		Countries   []string        `json:"countries"`
		Verticals   []string        `json:"verticals"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	now := time.Now()
	sub, err := h.Submissions.CreateSubmission(c.Context(), sqlc.CreateSubmissionParams{
		CompanyID:    middleware.GetCompanyID(c),
		AuthorUserID: middleware.GetUserID(c),
		Status:       "draft",
		Readme:       &req.Readme,
		LogoUrl:      &req.LogoURL,
		Countries:    req.Countries,
		Verticals:    req.Verticals,
		SubmittedAt:  &now,
	})
	if err != nil {
		slog.Error("create submission failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create submission",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(sub)
}

func (h *MarketplaceHandler) ListSubmissions(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))

	var statusFilter *string
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}

	subs, err := h.Submissions.ListSubmissions(c.Context(), sqlc.ListSubmissionsParams{
		CompanyID: middleware.GetCompanyID(c),
		Limit:     int32(perPage),
		Offset:    int32((page - 1) * perPage),
		Status:    statusFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list submissions",
		})
	}
	return c.JSON(fiber.Map{"submissions": subs, "page": page, "per_page": perPage})
}

func (h *MarketplaceHandler) ReviewSubmission(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can review submissions",
		})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid submission id",
		})
	}

	var req struct {
		Status          string `json:"status"` // approved, rejected
		RejectionReason string `json:"rejection_reason"`
	}
	if err := c.Bind().JSON(&req); err != nil || (req.Status != "approved" && req.Status != "rejected") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "status must be approved or rejected",
		})
	}

	now := time.Now()
	reviewerID := middleware.GetUserID(c)
	sub, err := h.Submissions.UpdateSubmissionStatus(c.Context(), sqlc.UpdateSubmissionStatusParams{
		ID:              id,
		Status:          req.Status,
		RejectionReason: &req.RejectionReason,
		ReviewedAt:      &now,
		ReviewedBy:      &reviewerID,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update submission",
		})
	}
	return c.JSON(sub)
}

// --- Template Versions ---

func (h *MarketplaceHandler) ListVersions(c fiber.Ctx) error {
	templateID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid template id",
		})
	}

	versions, err := h.Versions.ListTemplateVersions(c.Context(), sqlc.ListTemplateVersionsParams{
		TemplateID: templateID, Limit: 50, Offset: 0,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list versions",
		})
	}
	return c.JSON(fiber.Map{"versions": versions})
}

func RegisterMarketplaceRoutes(router fiber.Router, h *MarketplaceHandler) {
	router.Get("/marketplace", h.ListCatalog)
	router.Get("/marketplace/:id", h.GetCatalogItem)
	router.Post("/marketplace/:id/install", h.InstallTemplate)
	router.Delete("/marketplace/:id/uninstall", h.UninstallTemplate)
	router.Get("/marketplace/installed", h.ListInstalled)
	router.Get("/marketplace/:id/reviews", h.ListReviews)
	router.Post("/marketplace/:id/reviews", h.CreateReview)
	router.Get("/marketplace/:id/versions", h.ListVersions)
	router.Post("/marketplace/submissions", h.CreateSubmission)
	router.Get("/marketplace/submissions", h.ListSubmissions)
	router.Patch("/marketplace/submissions/:id/review", h.ReviewSubmission)
}
