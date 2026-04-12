package auth

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"github.com/gambchamp/crm/internal/middleware"
)

// Handler holds HTTP handler dependencies.
type Handler struct {
	Svc *Service
}

type loginRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	CompanyID string `json:"company_id"`
}

type loginTOTPRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	CompanyID string `json:"company_id"`
	TOTPCode  string `json:"totp_code"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type totpCodeRequest struct {
	Code string `json:"code"`
}

// Login handles POST /api/v1/auth/login.
func (h *Handler) Login(c fiber.Ctx) error {
	var req loginRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	companyID, err := uuid.Parse(req.CompanyID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid company_id",
		})
	}

	tokens, err := h.Svc.Login(c.Context(), companyID, req.Email, req.Password, c.IP(), string(c.Request().Header.UserAgent()))
	if err != nil {
		if errors.Is(err, ErrTOTPRequired) {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{"requires_2fa": true})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "UNAUTHORIZED", "message": "invalid email or password",
		})
	}

	return c.Status(fiber.StatusOK).JSON(tokens)
}

// LoginWithTOTP handles POST /api/v1/auth/login/2fa.
func (h *Handler) LoginWithTOTP(c fiber.Ctx) error {
	var req loginTOTPRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	companyID, err := uuid.Parse(req.CompanyID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid company_id",
		})
	}

	tokens, err := h.Svc.LoginWithTOTP(c.Context(), companyID, req.Email, req.Password, req.TOTPCode, c.IP(), string(c.Request().Header.UserAgent()))
	if err != nil {
		if errors.Is(err, ErrInvalidTOTP) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "INVALID_TOTP", "message": "invalid 2FA code",
			})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "UNAUTHORIZED", "message": "invalid credentials",
		})
	}

	return c.Status(fiber.StatusOK).JSON(tokens)
}

// Refresh handles POST /api/v1/auth/refresh.
func (h *Handler) Refresh(c fiber.Ctx) error {
	var req refreshRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	tokens, err := h.Svc.Refresh(c.Context(), req.RefreshToken, c.IP(), string(c.Request().Header.UserAgent()))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "SESSION_EXPIRED", "message": "refresh token is invalid or expired",
		})
	}

	return c.Status(fiber.StatusOK).JSON(tokens)
}

// Logout handles POST /api/v1/auth/logout.
func (h *Handler) Logout(c fiber.Ctx) error {
	var req logoutRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	_ = h.Svc.Logout(c.Context(), req.RefreshToken)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "logged out"})
}

// SetupTOTP handles POST /api/v1/auth/2fa/setup (requires auth).
func (h *Handler) SetupTOTP(c fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	secret, url, err := h.Svc.SetupTOTP(c.Context(), userID, companyID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not setup 2FA",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"secret": secret,
		"qr_url": url,
	})
}

// VerifyTOTP handles POST /api/v1/auth/2fa/verify (requires auth).
func (h *Handler) VerifyTOTP(c fiber.Ctx) error {
	var req totpCodeRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	if err := h.Svc.VerifyAndEnableTOTP(c.Context(), userID, companyID, req.Code); err != nil {
		if errors.Is(err, ErrInvalidTOTP) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "INVALID_TOTP", "message": "invalid 2FA code",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not verify 2FA",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "2FA enabled"})
}

// DisableTOTP handles POST /api/v1/auth/2fa/disable (requires auth).
func (h *Handler) DisableTOTP(c fiber.Ctx) error {
	var req totpCodeRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	userID := middleware.GetUserID(c)
	companyID := middleware.GetCompanyID(c)

	if err := h.Svc.DisableTOTP(c.Context(), userID, companyID, req.Code); err != nil {
		if errors.Is(err, ErrInvalidTOTP) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "INVALID_TOTP", "message": "invalid 2FA code",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not disable 2FA",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "2FA disabled"})
}

// RegisterRoutes mounts auth routes on the given router.
func RegisterRoutes(router fiber.Router, h *Handler, authMw fiber.Handler) {
	router.Post("/auth/login", h.Login)
	router.Post("/auth/login/2fa", h.LoginWithTOTP)
	router.Post("/auth/refresh", h.Refresh)
	router.Post("/auth/logout", h.Logout)

	twofa := router.Group("/auth/2fa", authMw)
	twofa.Post("/setup", h.SetupTOTP)
	twofa.Post("/verify", h.VerifyTOTP)
	twofa.Post("/disable", h.DisableTOTP)
}
