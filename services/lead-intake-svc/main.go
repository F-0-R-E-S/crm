package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/geoip"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("lead-intake-svc")
	cfg := LoadConfig()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := database.New(ctx, cfg.DBURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	logger.Info("connected to database")

	rdb, err := cache.NewRedis(ctx, cfg.RedisURL)
	if err != nil {
		logger.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer rdb.Close()
	logger.Info("connected to redis")

	nc, err := messaging.NewNATS(ctx, cfg.NATSURL, logger)
	if err != nil {
		logger.Error("failed to connect to nats", "error", err)
		os.Exit(1)
	}
	defer nc.Close()
	logger.Info("connected to nats")

	geo := geoip.New(cfg.MaxMindAccountID, cfg.MaxMindLicenseKey)

	store := NewStore(db)
	h := NewHandler(logger, store, nc, rdb, geo)

	// --- NATS command handler for assistant-svc ---
	StartCmdHandler(nc, store, rdb, logger)

	mux := http.NewServeMux()
	h.Register(mux)

	// Health check with dependency verification
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		checkCtx, checkCancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer checkCancel()

		status := "ok"
		httpStatus := http.StatusOK
		deps := map[string]string{
			"postgres": "ok",
			"redis":    "ok",
			"nats":     "ok",
		}

		if err := db.Pool.Ping(checkCtx); err != nil {
			deps["postgres"] = "error: " + err.Error()
			status = "degraded"
			httpStatus = http.StatusServiceUnavailable
		}
		if _, err := rdb.Get(checkCtx, "health:ping"); err != nil && err.Error() != "redis: nil" {
			deps["redis"] = "error: " + err.Error()
			status = "degraded"
			httpStatus = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpStatus)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":       status,
			"service":      "lead-intake-svc",
			"dependencies": deps,
			"timestamp":    time.Now().UTC().Format(time.RFC3339),
		})
	})

	mux.Handle("GET /metrics", telemetry.MetricsHandler())

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("starting server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	logger.Info("received shutdown signal", "signal", sig.String())

	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("forced shutdown", "error", err)
	}
	logger.Info("server stopped")
}
