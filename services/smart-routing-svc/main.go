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
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("smart-routing-svc")
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

	store := NewStore(db)
	optimizer := NewOptimizer(store, rdb, nc, logger)
	h := NewHandler(logger, optimizer)

	// Start background optimization loop
	go optimizer.RunOptimizationLoop(ctx)
	logger.Info("smart routing optimizer started")

	mux := http.NewServeMux()
	h.Register(mux)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		checkCtx, checkCancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer checkCancel()

		status := "ok"
		httpCode := http.StatusOK
		if err := db.Pool.Ping(checkCtx); err != nil {
			status = "degraded"
			httpCode = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(httpCode)
		json.NewEncoder(w).Encode(map[string]string{"status": status, "service": "smart-routing-svc"})
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
	<-quit

	logger.Info("shutting down")
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	srv.Shutdown(shutdownCtx)
	logger.Info("server stopped")
}
