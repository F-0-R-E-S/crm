package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("autologin-svc")
	cfg := LoadConfig()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// --- Database ---
	db, err := database.New(ctx, cfg.DBURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	logger.Info("connected to database")

	// --- NATS ---
	var nc *messaging.NATSClient
	nc, err = messaging.NewNATS(ctx, cfg.NATSURL, logger)
	if err != nil {
		logger.Warn("nats connection failed, events disabled", "error", err)
	} else {
		defer nc.Close()
		StartCmdHandler(nc, logger)
	}

	// --- Wire up pipeline components ---
	store := NewAutologinStore(db)
	fpPool := NewFingerprintPool(store, logger)
	proxyPool := NewProxyPoolManager(store, logger)
	anomaly := NewAnomalyDetector(store, logger)
	pipeline := NewPipelineEngine(store, fpPool, proxyPool, anomaly, logger)

	// Start proxy health checks
	proxyPool.StartHealthChecks(ctx, 60*time.Second)
	defer proxyPool.Stop()

	// --- NATS subscriber: lead.delivered → auto-trigger autologin ---
	if nc != nil {
		nc.Subscribe(ctx, "leads.delivered", "autologin-svc", func(subCtx context.Context, event messaging.CloudEvent) error {
			return handleLeadDelivered(subCtx, event, pipeline, logger)
		})
	}

	// --- HTTP server ---
	h := NewHandler(logger, pipeline, nc)
	mux := http.NewServeMux()
	h.Register(mux)

	mux.Handle("GET /health", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
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

	cancel()
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	srv.Shutdown(shutCtx)
	logger.Info("server stopped")
}

func handleLeadDelivered(ctx context.Context, event messaging.CloudEvent, pipeline *PipelineEngine, logger *slog.Logger) error {
	data, ok := event.Data.(map[string]interface{})
	if !ok {
		return nil
	}

	leadID, _ := data["lead_id"].(string)
	brokerID, _ := data["broker_id"].(string)
	tenantID, _ := data["tenant_id"].(string)

	if leadID == "" || brokerID == "" {
		return nil
	}

	logger.Info("auto-triggering autologin for delivered lead",
		"lead_id", leadID,
		"broker_id", brokerID,
	)

	_, err := pipeline.Execute(ctx, leadID, brokerID, tenantID)
	return err
}
