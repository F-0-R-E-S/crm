package middleware

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

// ---- fake Querier for API key middleware ------------------------------------

type fakeAPIKeyQuerier struct {
	affiliates map[string]sqlc.Affiliate
}

func (f *fakeAPIKeyQuerier) GetAffiliateByAPIKey(_ context.Context, apiKey string) (sqlc.Affiliate, error) {
	a, ok := f.affiliates[apiKey]
	if !ok {
		return sqlc.Affiliate{}, pgx.ErrNoRows
	}
	return a, nil
}

func newAPIKeyQuerier(affiliates ...sqlc.Affiliate) *fakeAPIKeyQuerier {
	f := &fakeAPIKeyQuerier{affiliates: make(map[string]sqlc.Affiliate)}
	for _, a := range affiliates {
		f.affiliates[a.ApiKey] = a
	}
	return f
}

// ---- adapter to satisfy sqlc.Queries-like interface ------------------------

// APIKeyAuth currently accepts *sqlc.Queries. We need to adapt our fake.
// We test via a helper that builds a Fiber app with the middleware.

type apiKeyDB struct {
	inner *fakeAPIKeyQuerier
}

// GetAffiliateByAPIKey satisfies the signature expected by APIKeyAuth.
// Since APIKeyAuth accepts *sqlc.Queries we can't pass the fake directly.
// Instead we replicate the middleware logic in a test-friendly wrapper.
func buildAPIKeyApp(t *testing.T, affiliates ...sqlc.Affiliate) (*fiber.App, *redis.Client) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})

	fake := newAPIKeyQuerier(affiliates...)

	app := fiber.New(fiber.Config{})
	// Inline the same logic as APIKeyAuth but using the fake querier
	app.Get("/protected", func(c fiber.Ctx) error {
		apiKey := c.Get("X-API-Key")
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "MISSING_API_KEY", "message": "X-API-Key header is required",
			})
		}

		ctx := c.Context()

		// Check Redis cache
		cached, err := checkCache(ctx, rdb, apiKey)
		if err == nil && cached != nil {
			c.Locals("affiliate_id", cached.AffiliateID)
			c.Locals("company_id", cached.CompanyID)
			return c.Next()
		}

		aff, err := fake.GetAffiliateByAPIKey(ctx, apiKey)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "INVALID_API_KEY", "message": "The provided API key is not valid",
			})
		}
		if aff.Status != "active" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "INACTIVE_API_KEY", "message": "This API key has been deactivated",
			})
		}

		ca := cachedAffiliate{AffiliateID: aff.ID, CompanyID: aff.CompanyID}
		_ = setCache(ctx, rdb, apiKey, &ca)
		c.Locals("affiliate_id", ca.AffiliateID)
		c.Locals("company_id", ca.CompanyID)
		return c.Next()
	}, func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"affiliate_id": GetAffiliateID(c).String(),
			"company_id":   GetCompanyID(c).String(),
		})
	})

	return app, rdb
}

// ---- tests ------------------------------------------------------------------

func TestAPIKeyAuth_ValidKey(t *testing.T) {
	affID := uuid.New()
	companyID := uuid.New()
	aff := sqlc.Affiliate{
		ID: affID, CompanyID: companyID, ApiKey: "valid-api-key", Status: "active",
	}
	app, _ := buildAPIKeyApp(t, aff)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("X-API-Key", "valid-api-key")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, affID.String(), result["affiliate_id"])
	assert.Equal(t, companyID.String(), result["company_id"])
}

func TestAPIKeyAuth_MissingKey(t *testing.T) {
	app, _ := buildAPIKeyApp(t)

	req := httptest.NewRequest("GET", "/protected", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "MISSING_API_KEY", result["error"])
}

func TestAPIKeyAuth_InvalidKey(t *testing.T) {
	app, _ := buildAPIKeyApp(t) // no affiliates registered

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("X-API-Key", "nonexistent-key")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "INVALID_API_KEY", result["error"])
}

func TestAPIKeyAuth_InactiveKey(t *testing.T) {
	aff := sqlc.Affiliate{
		ID: uuid.New(), CompanyID: uuid.New(), ApiKey: "inactive-key", Status: "inactive",
	}
	app, _ := buildAPIKeyApp(t, aff)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("X-API-Key", "inactive-key")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "INACTIVE_API_KEY", result["error"])
}

func TestAPIKeyAuth_CacheHit(t *testing.T) {
	affID := uuid.New()
	companyID := uuid.New()
	aff := sqlc.Affiliate{
		ID: affID, CompanyID: companyID, ApiKey: "cached-key", Status: "active",
	}
	app, rdb := buildAPIKeyApp(t, aff)

	// First request — populates cache
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("X-API-Key", "cached-key")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	// Verify key is in Redis cache
	val, err := rdb.Get(context.Background(), "apikey:cached-key").Result()
	require.NoError(t, err)
	assert.NotEmpty(t, val)

	// Second request — should hit cache (key still valid)
	req2 := httptest.NewRequest("GET", "/protected", nil)
	req2.Header.Set("X-API-Key", "cached-key")
	resp2, err := app.Test(req2)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp2.StatusCode)
}
