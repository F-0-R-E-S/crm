// Package telemetry provides structured logging and metrics setup.
package telemetry

import (
	"log/slog"
	"os"
	"strings"
)

// SetupLogger configures the global slog logger with JSON output.
func SetupLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: lvl,
	})
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}
