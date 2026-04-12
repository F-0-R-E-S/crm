package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "test-secret-key-for-unit-tests"

func signToken(t *testing.T, claims jwt.MapClaims, secret string) string {
	t.Helper()
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	require.NoError(t, err)
	return tok
}

func newFiberApp(secret string) *fiber.App {
	app := fiber.New(fiber.Config{})
	app.Get("/protected", JWTAuth(secret), func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"user_id":    GetUserID(c).String(),
			"company_id": GetCompanyID(c).String(),
			"role":       GetRole(c),
		})
	})
	return app
}

func TestJWTAuth_ValidToken(t *testing.T) {
	userID := uuid.New()
	companyID := uuid.New()
	app := newFiberApp(testSecret)

	claims := jwt.MapClaims{
		"user_id":    userID.String(),
		"company_id": companyID.String(),
		"role":       "admin",
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
		"iat":        time.Now().Unix(),
	}
	token := signToken(t, claims, testSecret)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestJWTAuth_MissingHeader(t *testing.T) {
	app := newFiberApp(testSecret)
	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestJWTAuth_InvalidFormat(t *testing.T) {
	app := newFiberApp(testSecret)
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Token abc123") // not Bearer
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestJWTAuth_ExpiredToken(t *testing.T) {
	app := newFiberApp(testSecret)
	claims := jwt.MapClaims{
		"user_id":    uuid.New().String(),
		"company_id": uuid.New().String(),
		"role":       "admin",
		"exp":        time.Now().Add(-1 * time.Hour).Unix(), // expired
		"iat":        time.Now().Add(-2 * time.Hour).Unix(),
	}
	token := signToken(t, claims, testSecret)
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestJWTAuth_WrongSecret(t *testing.T) {
	app := newFiberApp(testSecret)
	claims := jwt.MapClaims{
		"user_id":    uuid.New().String(),
		"company_id": uuid.New().String(),
		"role":       "admin",
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	}
	token := signToken(t, claims, "wrong-secret")
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestJWTAuth_MalformedToken(t *testing.T) {
	app := newFiberApp(testSecret)
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer not.a.jwt")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestRequireRole_Allowed(t *testing.T) {
	app := fiber.New(fiber.Config{})
	app.Get("/admin-only",
		func(c fiber.Ctx) error {
			c.Locals("role", "admin")
			return c.Next()
		},
		RequireRole("admin", "manager"),
		func(c fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) },
	)
	req := httptest.NewRequest("GET", "/admin-only", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestRequireRole_Forbidden(t *testing.T) {
	app := fiber.New(fiber.Config{})
	app.Get("/admin-only",
		func(c fiber.Ctx) error {
			c.Locals("role", "viewer")
			return c.Next()
		},
		RequireRole("admin"),
		func(c fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) },
	)
	req := httptest.NewRequest("GET", "/admin-only", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestGetLocals_Defaults(t *testing.T) {
	app := fiber.New(fiber.Config{})
	app.Get("/test", func(c fiber.Ctx) error {
		assert.Equal(t, uuid.Nil, GetUserID(c))
		assert.Equal(t, uuid.Nil, GetCompanyID(c))
		assert.Equal(t, "", GetRole(c))
		return c.SendStatus(fiber.StatusOK)
	})
	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}
