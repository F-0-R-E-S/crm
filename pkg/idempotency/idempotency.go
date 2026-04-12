// Package idempotency provides Redis-based idempotency key checking.
package idempotency

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const ttl = 24 * time.Hour

// Store manages idempotency keys in Redis.
type Store struct {
	rdb *redis.Client
}

// NewStore creates a new idempotency store.
func NewStore(rdb *redis.Client) *Store {
	return &Store{rdb: rdb}
}

// Check returns the cached lead ID if the key exists, or empty string if not.
func (s *Store) Check(ctx context.Context, companyID, key string) (string, error) {
	rkey := redisKey(companyID, key)
	val, err := s.rdb.Get(ctx, rkey).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("idempotency check: %w", err)
	}
	return val, nil
}

// Set stores the idempotency key → lead ID mapping with 24h TTL.
func (s *Store) Set(ctx context.Context, companyID, key, leadID string) error {
	rkey := redisKey(companyID, key)
	if err := s.rdb.Set(ctx, rkey, leadID, ttl).Err(); err != nil {
		return fmt.Errorf("idempotency set: %w", err)
	}
	return nil
}

func redisKey(companyID, key string) string {
	return "idem:" + companyID + ":" + key
}
