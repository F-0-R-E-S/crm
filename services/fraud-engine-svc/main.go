package main

import (
	"context"
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
	logger := telemetry.NewLogger("fraud-engine-svc")
	cfg := LoadConfig()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// --- Connect to PostgreSQL ---
	db, err := database.New(ctx, cfg.DBURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	logger.Info("connected to database")

	// --- Connect to Redis ---
	rdb, err := cache.NewRedis(ctx, cfg.RedisURL)
	if err != nil {
		logger.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer rdb.Close()
	logger.Info("connected to redis")

	// --- Connect to NATS ---
	nc, err := messaging.NewNATS(ctx, cfg.NATSURL, logger)
	if err != nil {
		logger.Warn("nats connection failed, cmd handler disabled", "error", err)
	} else {
		defer nc.Close()
		logger.Info("connected to nats")
	}

	// --- Wire up store, checker, and handler ---
	store := NewStore(db)
	checker := NewFraudChecker(rdb, store, logger, cfg.MaxMindKey, cfg.IPQSKey)
	velocityEngine := NewVelocityEngine(rdb, store, logger)
	behavioralHandler := NewBehavioralHandler(store, logger)
	intelligenceHandler := NewIntelligenceHandler(store, logger)
	experimentHandler := NewExperimentHandler(store, logger)
	h := NewHandler(logger, checker, store)

	if nc != nil {
		StartCmdHandler(nc, store, checker, logger)
	}

	mux := http.NewServeMux()
	h.Register(mux)

	// Register additional handlers
	mux.HandleFunc("POST /api/v1/fraud/behavioral", behavioralHandler.IngestEvents)
	mux.HandleFunc("POST /api/v1/fraud/intelligence/contribute", intelligenceHandler.Contribute)
	mux.HandleFunc("GET /api/v1/fraud/intelligence/check", intelligenceHandler.Check)
	mux.HandleFunc("GET /api/v1/fraud/experiments", experimentHandler.List)
	mux.HandleFunc("POST /api/v1/fraud/experiments", experimentHandler.Create)
	mux.HandleFunc("PUT /api/v1/fraud/experiments/{id}", experimentHandler.Update)
	mux.HandleFunc("GET /api/v1/fraud/experiments/{id}/results", experimentHandler.GetResults)

	// PDF verification card
	pdfHandler := NewPDFHandler(store, logger)
	mux.HandleFunc("GET /api/v1/fraud/checks/{lead_id}/pdf", pdfHandler.GenerateVerificationCard)

	// Velocity engine is available for the checker to use
	_ = velocityEngine

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	mux.Handle("GET /metrics", telemetry.MetricsHandler())

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// --- Start server ---
	go func() {
		logger.Info("starting server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// --- Graceful shutdown ---
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
