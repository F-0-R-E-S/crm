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
	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("assistant-svc")
	cfg := LoadConfig()

	if cfg.AnthropicAPIKey == "" {
		logger.Error("ANTHROPIC_API_KEY is required")
		os.Exit(1)
	}

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
	ctxMgr := NewContextManager(rdb, db, logger)
	sessionMgr := NewSessionManager(logger)
	toolRegistry := NewToolRegistry()
	executor := NewActionExecutor(nc, rdb, store, toolRegistry, logger, cfg)
	claude := NewClaudeClient(cfg.AnthropicAPIKey, cfg.Model, logger)
	promptBuilder := NewPromptBuilder(toolRegistry)

	eventHandler := NewEventHandler(ctxMgr, sessionMgr, nc, logger)
	if err := eventHandler.Start(ctx); err != nil {
		logger.Error("failed to start event handler", "error", err)
		os.Exit(1)
	}
	logger.Info("event handler started")

	h := NewHandler(logger, store, ctxMgr, sessionMgr, claude, promptBuilder, executor, toolRegistry, cfg)

	mux := http.NewServeMux()
	h.Register(mux)

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
		WriteTimeout: 120 * time.Second, // longer for SSE streaming
		IdleTimeout:  120 * time.Second,
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
	sessionMgr.CloseAll()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("forced shutdown", "error", err)
	}
	logger.Info("server stopped")
}
