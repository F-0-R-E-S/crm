package admin

import (
	"errors"
	"log/slog"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/gambchamp/crm/internal/config"
	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

// UserHandler handles user CRUD operations.
type UserHandler struct {
	DB  UserQuerier
	Cfg *config.Config
}

var validRoles = map[string]bool{
	"admin": true, "manager": true, "teamlead": true, "buyer": true, "viewer": true,
}

// UserResponse is a User without password_hash.
type UserResponse struct {
	ID          uuid.UUID `json:"id"`
	CompanyID   uuid.UUID `json:"company_id"`
	Email       string    `json:"email"`
	Role        string    `json:"role"`
	Name        *string   `json:"name"`
	TotpEnabled bool      `json:"totp_enabled"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

func toUserResponse(u sqlc.User) UserResponse {
	return UserResponse{
		ID: u.ID, CompanyID: u.CompanyID, Email: u.Email, Role: u.Role,
		Name: u.Name, TotpEnabled: u.TotpEnabled, Status: u.Status, CreatedAt: u.CreatedAt,
	}
}

// ListUsers handles GET /api/v1/users.
func (h *UserHandler) ListUsers(c fiber.Ctx) error {
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

	users, err := h.DB.ListUsers(c.Context(), sqlc.ListUsersParams{
		CompanyID: companyID, Limit: int32(perPage), Offset: int32((page - 1) * perPage),
	})
	if err != nil {
		slog.Error("list users failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list users",
		})
	}

	total, _ := h.DB.CountUsers(c.Context(), companyID)
	resp := make([]UserResponse, 0, len(users))
	for _, u := range users {
		resp = append(resp, toUserResponse(u))
	}
	return c.JSON(fiber.Map{"users": resp, "total": total, "page": page, "per_page": perPage})
}

// CreateUser handles POST /api/v1/users.
func (h *UserHandler) CreateUser(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can create users",
		})
	}

	var req struct {
		Email    string  `json:"email"`
		Password string  `json:"password"`
		Role     string  `json:"role"`
		Name     *string `json:"name"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.Email == "" || req.Password == "" || req.Role == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "email, password, and role are required",
		})
	}
	if !validRoles[req.Role] {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "role must be one of: admin, manager, teamlead, buyer, viewer",
		})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), h.Cfg.BcryptCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not hash password",
		})
	}

	user, err := h.DB.CreateUser(c.Context(), sqlc.CreateUserParams{
		CompanyID: middleware.GetCompanyID(c), Email: req.Email,
		PasswordHash: string(hash), Role: req.Role, Name: req.Name,
	})
	if err != nil {
		slog.Error("create user failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create user",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(toUserResponse(user))
}

// GetUser handles GET /api/v1/users/:id.
func (h *UserHandler) GetUser(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid user id",
		})
	}
	user, err := h.DB.GetUserByID(c.Context(), sqlc.GetUserByIDParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "user not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch user",
		})
	}
	return c.JSON(toUserResponse(user))
}

// UpdateUser handles PATCH /api/v1/users/:id.
func (h *UserHandler) UpdateUser(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can update users",
		})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid user id",
		})
	}
	var req struct {
		Name   *string `json:"name"`
		Role   *string `json:"role"`
		Status *string `json:"status"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.Role != nil && !validRoles[*req.Role] {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "invalid role",
		})
	}

	user, err := h.DB.UpdateUser(c.Context(), sqlc.UpdateUserParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
		Name: req.Name, Role: req.Role, Status: req.Status,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "user not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update user",
		})
	}
	return c.JSON(toUserResponse(user))
}

// DeleteUser handles DELETE /api/v1/users/:id (soft delete).
func (h *UserHandler) DeleteUser(c fiber.Ctx) error {
	if middleware.GetRole(c) != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "FORBIDDEN", "message": "only admins can deactivate users",
		})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid user id",
		})
	}
	if err := h.DB.DeactivateUser(c.Context(), sqlc.DeactivateUserParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not deactivate user",
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// RegisterUserRoutes mounts user handlers.
func RegisterUserRoutes(router fiber.Router, h *UserHandler) {
	router.Get("/users", h.ListUsers)
	router.Post("/users", h.CreateUser)
	router.Get("/users/:id", h.GetUser)
	router.Patch("/users/:id", h.UpdateUser)
	router.Delete("/users/:id", h.DeleteUser)
}
