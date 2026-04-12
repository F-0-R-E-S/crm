package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("status-sync-svc")
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

	// --- Connect to NATS ---
	nc, err := messaging.NewNATS(ctx, cfg.NATSURL, logger)
	if err != nil {
		logger.Error("failed to connect to nats", "error", err)
		os.Exit(1)
	}
	defer nc.Close()
	logger.Info("connected to nats")

	// --- Wire up store, normalizer, anomaly detector, handler ---
	store := NewStore(db)

	normalizer := NewStatusNormalizer(store)
	// Load initial mappings. Use a background tenant ID; individual requests
	// can reload per-tenant mappings via the API.
	if err := normalizer.LoadMappings(ctx, ""); err != nil {
		logger.Warn("failed to load initial status mappings (non-fatal, will use hardcoded fallback)", "error", err)
	} else {
		logger.Info("loaded status group mappings into normalizer cache")
	}

	detector := NewAnomalyDetector(store, normalizer, logger)

	h := NewHandler(logger, store, nc, normalizer, detector)

	// --- NATS subscriber: lead.delivered ---
	// Track when leads are delivered to brokers so we can correlate
	// future postbacks with the correct lead. We store the broker_lead_id
	// mapping via a lead_event.
	err = nc.Subscribe(ctx, "leads", "status-sync-delivered", func(subCtx context.Context, event messaging.CloudEvent) error {
		return handleLeadDelivered(subCtx, event, store, logger)
	})
	if err != nil {
		logger.Error("failed to subscribe to lead.delivered", "error", err)
		os.Exit(1)
	}
	logger.Info("subscribed to lead.delivered events")

	// --- HTTP server ---
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

	cancel() // cancel the root context

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("forced shutdown", "error", err)
	}
	logger.Info("server stopped")
}

// handleLeadDelivered processes lead.delivered events from the broker-adapter
// service. It records the delivery as an event, establishing the mapping
// between our lead ID and the broker's reference ID (broker_lead_id) so
// that future postback webhooks can be correlated.
func handleLeadDelivered(ctx context.Context, event messaging.CloudEvent, store *Store, logger *slog.Logger) error {
	dataBytes, err := json.Marshal(event.Data)
	if err != nil {
		return fmt.Errorf("marshal event data: %w", err)
	}

	var payload struct {
		LeadID       string `json:"lead_id"`
		TenantID     string `json:"tenant_id"`
		BrokerID     string `json:"broker_id"`
		BrokerLeadID string `json:"broker_lead_id"`
		AutologinURL string `json:"autologin_url"`
		AffiliateID  string `json:"affiliate_id"`
		Country      string `json:"country"`
	}
	if err := json.Unmarshal(dataBytes, &payload); err != nil {
		return fmt.Errorf("unmarshal lead.delivered payload: %w", err)
	}

	if payload.LeadID == "" {
		return fmt.Errorf("lead_id missing from lead.delivered event")
	}

	logger.Info("tracking lead delivery",
		"lead_id", payload.LeadID,
		"broker_id", payload.BrokerID,
		"broker_lead_id", payload.BrokerLeadID,
	)

	// Store the delivery info as a response_body so GetLeadByBrokerRef can
	// find it later via the broker_lead_id JSON field.
	responseBody, _ := json.Marshal(map[string]string{
		"broker_lead_id": payload.BrokerLeadID,
		"autologin_url":  payload.AutologinURL,
	})

	deliveryEvent := &models.LeadEvent{
		LeadID:       payload.LeadID,
		TenantID:     payload.TenantID,
		EventType:    "delivery_success",
		BrokerID:     payload.BrokerID,
		ResponseBody: responseBody,
	}

	if err := store.CreateLeadEvent(ctx, deliveryEvent); err != nil {
		logger.Error("failed to record delivery event",
			"lead_id", payload.LeadID,
			"error", err,
		)
		return fmt.Errorf("record delivery event: %w", err)
	}

	return nil
}
