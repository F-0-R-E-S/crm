package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("api-gateway")
	cfg := LoadConfig()

	// Connect to Redis for rate limiting / caching.
	// Non-fatal: if Redis is unavailable, the gateway still starts (in-memory rate limiting).
	redisClient, err := cache.NewRedis(context.Background(), cfg.RedisURL)
	if err != nil {
		logger.Warn("redis connection failed, using in-memory rate limiting only", "error", err)
	} else {
		logger.Info("connected to redis", "url", cfg.RedisURL)
		defer redisClient.Close()
	}

	// Validate JWT secret is configured
	if cfg.JWTSecret == "" {
		logger.Warn("JWT_SECRET is not set — JWT validation will reject all tokens")
	}

	// Create authenticator
	auth := NewAuthenticator(cfg.JWTSecret, cfg.IdentityAddr)

	// Create handler with proxy targets
	mux := http.NewServeMux()
	h := NewHandler(logger, cfg, auth)
	h.Register(mux)

	// Health and metrics — no auth
	mux.Handle("GET /health", http.HandlerFunc(healthHandler(logger, redisClient)))
	mux.Handle("GET /metrics", telemetry.MetricsHandler())

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("starting api gateway", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down api gateway")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("shutdown error", "error", err)
	}
	logger.Info("server stopped")
}

// healthHandler returns a health check that optionally pings Redis.
func healthHandler(logger *slog.Logger, redisClient *cache.Redis) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if redisClient != nil {
			if _, err := redisClient.Get(r.Context(), "health:ping"); err != nil {
				// Redis error is non-fatal — just report degraded
				logger.Warn("health check: redis ping failed", "error", err)
			}
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"api-gateway"}`))
	}
}
