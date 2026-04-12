// Package main is the HTTP API server entry point.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/gambchamp/crm/internal/config"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	cfg, err := config.Load(ctx)
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := telemetry.SetupLogger(cfg.LogLevel)
	logger.Info("starting api server", "port", cfg.Port, "env", cfg.Environment)

	// Server setup will be wired here by agents
	<-ctx.Done()
	logger.Info("shutting down")
}
