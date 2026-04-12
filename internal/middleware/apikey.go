package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

const apiKeyCacheTTL = 5 * time.Minute

type cachedAffiliate struct {
	AffiliateID uuid.UUID `json:"affiliate_id"`
	CompanyID   uuid.UUID `json:"company_id"`
}

// APIKeyAuth validates the X-API-Key header, caches results in Redis, and injects affiliate_id + company_id.
func APIKeyAuth(queries *sqlc.Queries, rdb *redis.Client) fiber.Handler {
	return func(c fiber.Ctx) error {
		apiKey := c.Get("X-API-Key")
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "MISSING_API_KEY",
				"message": "X-API-Key header is required",
			})
		}

		ctx := c.Context()

		cached, err := checkCache(ctx, rdb, apiKey)
		if err == nil && cached != nil {
			c.Locals("affiliate_id", cached.AffiliateID)
			c.Locals("company_id", cached.CompanyID)
			return c.Next()
		}

		aff, err := queries.GetAffiliateByAPIKey(ctx, apiKey)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "INVALID_API_KEY",
				"message": "The provided API key is not valid",
			})
		}
		if aff.Status != "active" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "INACTIVE_API_KEY",
				"message": "This API key has been deactivated",
			})
		}

		ca := cachedAffiliate{AffiliateID: aff.ID, CompanyID: aff.CompanyID}
		_ = setCache(ctx, rdb, apiKey, &ca)

		c.Locals("affiliate_id", ca.AffiliateID)
		c.Locals("company_id", ca.CompanyID)
		return c.Next()
	}
}

// GetAffiliateID extracts the affiliate ID from Fiber locals.
func GetAffiliateID(c fiber.Ctx) uuid.UUID {
	if v, ok := c.Locals("affiliate_id").(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

func checkCache(ctx context.Context, rdb *redis.Client, apiKey string) (*cachedAffiliate, error) {
	val, err := rdb.Get(ctx, cacheKey(apiKey)).Result()
	if err != nil {
		return nil, err
	}
	var ca cachedAffiliate
	if err := json.Unmarshal([]byte(val), &ca); err != nil {
		return nil, fmt.Errorf("unmarshal cached affiliate: %w", err)
	}
	return &ca, nil
}

func setCache(ctx context.Context, rdb *redis.Client, apiKey string, ca *cachedAffiliate) error {
	data, err := json.Marshal(ca)
	if err != nil {
		return fmt.Errorf("marshal cached affiliate: %w", err)
	}
	return rdb.Set(ctx, cacheKey(apiKey), data, apiKeyCacheTTL).Err()
}

func cacheKey(apiKey string) string {
	return "apikey:" + apiKey
}
