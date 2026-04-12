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

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("routing-engine-svc")
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
		logger.Error("failed to connect to nats", "error", err)
		os.Exit(1)
	}
	defer nc.Close()
	logger.Info("connected to nats")

	// --- Wire up components ---
	store := NewStore(db)
	router := NewRouter(store, rdb, logger)
	h := NewHandler(logger, router, store)

	// --- NATS subscriber: lead.received ---
	err = nc.Subscribe(ctx, "leads", "routing-engine", func(subCtx context.Context, event messaging.CloudEvent) error {
		return handleLeadReceived(subCtx, event, store, router, nc, logger)
	})
	if err != nil {
		logger.Error("failed to subscribe to lead.received", "error", err)
		os.Exit(1)
	}
	logger.Info("subscribed to lead.received events")

	// --- NATS command handler for assistant-svc ---
	StartCmdHandler(nc, store, logger)

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

	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("forced shutdown", "error", err)
	}
	logger.Info("server stopped")
}

// handleLeadReceived processes a lead.received event: fetches the lead from DB,
// runs the routing engine, updates status, and publishes outcome events.
func handleLeadReceived(ctx context.Context, event messaging.CloudEvent, store *Store, router *Router, nc *messaging.NATSClient, logger *slog.Logger) error {
	// Extract lead_id from event data
	dataBytes, err := json.Marshal(event.Data)
	if err != nil {
		return fmt.Errorf("marshal event data: %w", err)
	}

	var payload struct {
		LeadID   string `json:"lead_id"`
		TenantID string `json:"tenant_id"`
	}
	if err := json.Unmarshal(dataBytes, &payload); err != nil {
		return fmt.Errorf("unmarshal event payload: %w", err)
	}

	if payload.LeadID == "" {
		return fmt.Errorf("lead_id missing from event data")
	}

	logger.Info("processing lead.received", "lead_id", payload.LeadID, "tenant_id", payload.TenantID)

	// Fetch lead from DB
	lead, err := store.GetLead(ctx, payload.LeadID)
	if err != nil {
		return fmt.Errorf("fetch lead %s: %w", payload.LeadID, err)
	}
	if lead == nil {
		return fmt.Errorf("lead %s not found", payload.LeadID)
	}

	// Run routing
	decision, err := router.Route(ctx, lead)
	if err != nil {
		logger.Warn("routing failed", "lead_id", lead.ID, "error", err)

		// Update lead status to rejected
		if updateErr := store.UpdateLeadStatus(ctx, lead.ID, models.LeadStatusRejected); updateErr != nil {
			logger.Error("failed to update lead status", "lead_id", lead.ID, "error", updateErr)
		}

		// Record the failure event
		_ = store.CreateLeadEvent(ctx, &models.LeadEvent{
			LeadID:    lead.ID,
			TenantID:  lead.TenantID,
			EventType: events.LeadDeliveryFailed,
			Error:     err.Error(),
		})

		// Publish lead.delivery_failed
		publishErr := nc.Publish(ctx, events.LeadDeliveryFailed, "routing-engine-svc", map[string]interface{}{
			"lead_id":   lead.ID,
			"tenant_id": lead.TenantID,
			"reason":    err.Error(),
		})
		if publishErr != nil {
			logger.Error("failed to publish delivery_failed", "lead_id", lead.ID, "error", publishErr)
		}

		return nil // We handled the failure; don't NAK the message
	}

	// Update lead status to routed
	if err := store.UpdateLeadStatus(ctx, lead.ID, models.LeadStatusRouted); err != nil {
		logger.Error("failed to update lead status", "lead_id", lead.ID, "error", err)
	}

	// Record the routing event
	decisionJSON, _ := json.Marshal(decision)
	_ = store.CreateLeadEvent(ctx, &models.LeadEvent{
		LeadID:    lead.ID,
		TenantID:  lead.TenantID,
		EventType: events.LeadRouted,
		BrokerID:  decision.BrokerID,
		RequestBody: decisionJSON,
		Duration:  time.Duration(decision.LatencyMs) * time.Millisecond,
	})

	// Publish lead.routed
	if err := nc.Publish(ctx, events.LeadRouted, "routing-engine-svc", map[string]interface{}{
		"lead_id":      lead.ID,
		"tenant_id":    lead.TenantID,
		"broker_id":    decision.BrokerID,
		"rule_id":      decision.RuleID,
		"algorithm":    decision.Algorithm,
		"waterfall":    decision.Waterfall,
		"reason":       decision.Reason,
		"latency_ms":   decision.LatencyMs,
		"affiliate_id": lead.AffiliateID,
		"country":      lead.Country,
	}); err != nil {
		logger.Error("failed to publish lead.routed", "lead_id", lead.ID, "error", err)
	}

	logger.Info("lead routed successfully",
		"lead_id", lead.ID,
		"broker_id", decision.BrokerID,
		"rule_id", decision.RuleID,
		"latency_ms", decision.LatencyMs,
	)

	return nil
}
