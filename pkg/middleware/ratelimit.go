package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
)

type RateLimiter struct {
	redis  *cache.Redis
	limit  int64
	window time.Duration
}

func NewRateLimiter(redis *cache.Redis, limit int64, window time.Duration) *RateLimiter {
	return &RateLimiter{
		redis:  redis,
		limit:  limit,
		window: window,
	}
}

func (rl *RateLimiter) Allow(ctx context.Context, key string) bool {
	bucket := time.Now().Unix() / int64(rl.window.Seconds())
	redisKey := fmt.Sprintf("ratelimit:%s:%d", key, bucket)

	count, err := rl.redis.IncrWithExpiry(ctx, redisKey, rl.window+time.Second)
	if err != nil {
		return true
	}

	return count <= rl.limit
}

func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get("X-API-Key")
			if key == "" {
				key = r.RemoteAddr
			}
			if !limiter.Allow(r.Context(), key) {
				w.Header().Set("Retry-After", "60")
				http.Error(w, `{"error":{"code":"RATE_LIMITED","message":"too many requests"}}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
