// Package middleware provides Fiber middleware for auth, rate limiting, and tracing.
package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTClaims holds the standard claims embedded in access tokens.
type JWTClaims struct {
	UserID    uuid.UUID `json:"user_id"`
	CompanyID uuid.UUID `json:"company_id"`
	Role      string    `json:"role"`
	jwt.RegisteredClaims
}

// JWTAuth validates the Bearer JWT and injects user_id, company_id, role into Fiber locals.
func JWTAuth(jwtSecret string) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "UNAUTHORIZED",
				"message": "Authorization header is required",
			})
		}

		tokenStr, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "UNAUTHORIZED",
				"message": "Invalid authorization format, expected Bearer token",
			})
		}

		claims := &JWTClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(_ *jwt.Token) (any, error) {
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "UNAUTHORIZED",
				"message": "Invalid or expired token",
			})
		}

		c.Locals("user_id", claims.UserID)
		c.Locals("company_id", claims.CompanyID)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}

// RequireRole restricts access to users with one of the specified roles.
func RequireRole(roles ...string) fiber.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c fiber.Ctx) error {
		role := GetRole(c)
		if !allowed[role] {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "FORBIDDEN",
				"message": fmt.Sprintf("role %q is not permitted for this action", role),
			})
		}
		return c.Next()
	}
}

// GetUserID extracts the authenticated user's ID from Fiber locals.
func GetUserID(c fiber.Ctx) uuid.UUID {
	if v, ok := c.Locals("user_id").(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// GetCompanyID extracts the authenticated user's company ID from Fiber locals.
func GetCompanyID(c fiber.Ctx) uuid.UUID {
	if v, ok := c.Locals("company_id").(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

// GetRole extracts the authenticated user's role from Fiber locals.
func GetRole(c fiber.Ctx) string {
	if v, ok := c.Locals("role").(string); ok {
		return v
	}
	return ""
}
