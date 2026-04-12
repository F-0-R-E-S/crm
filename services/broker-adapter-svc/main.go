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
	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/telemetry"
)

func main() {
	logger := telemetry.NewLogger("broker-adapter-svc")
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

	// --- Wire up components ---
	store := NewStore(db)
	engine := NewTemplateEngine()
	deliverer := NewDeliverer(store, engine, cfg.DeliveryTimeout, cfg.MaxRetries, logger)
	h := NewHandler(logger, store, deliverer)

	// --- NATS subscriber: lead.routed ---
	err = nc.Subscribe(ctx, "leads", "broker-adapter", func(subCtx context.Context, event messaging.CloudEvent) error {
		return handleLeadRouted(subCtx, event, store, deliverer, nc, logger)
	})
	if err != nil {
		logger.Error("failed to subscribe to lead.routed", "error", err)
		os.Exit(1)
	}
	logger.Info("subscribed to lead.routed events")

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
		WriteTimeout: 60 * time.Second,
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

// handleLeadRouted processes a lead.routed event: extracts broker_id from the
// event data, fetches the lead and broker, delivers the lead, and publishes
// either lead.delivered or lead.delivery_failed.
func handleLeadRouted(ctx context.Context, event messaging.CloudEvent, store *Store, deliverer *Deliverer, nc *messaging.NATSClient, logger *slog.Logger) error {
	// Extract lead_id and broker_id from event data.
	dataBytes, err := json.Marshal(event.Data)
	if err != nil {
		return fmt.Errorf("marshal event data: %w", err)
	}

	var payload struct {
		LeadID      string `json:"lead_id"`
		BrokerID    string `json:"broker_id"`
		TenantID    string `json:"tenant_id"`
		RuleID      string `json:"rule_id"`
		AffiliateID string `json:"affiliate_id"`
		Country     string `json:"country"`
	}
	if err := json.Unmarshal(dataBytes, &payload); err != nil {
		return fmt.Errorf("unmarshal event payload: %w", err)
	}

	if payload.LeadID == "" || payload.BrokerID == "" {
		return fmt.Errorf("lead_id or broker_id missing from event data")
	}

	logger.Info("processing lead.routed",
		"lead_id", payload.LeadID,
		"broker_id", payload.BrokerID,
		"tenant_id", payload.TenantID,
	)

	// Fetch lead from DB.
	lead, err := store.GetLead(ctx, payload.LeadID)
	if err != nil {
		return fmt.Errorf("fetch lead %s: %w", payload.LeadID, err)
	}
	if lead == nil {
		return fmt.Errorf("lead %s not found", payload.LeadID)
	}

	// Fetch broker with template from DB.
	bwt, err := store.GetBroker(ctx, payload.BrokerID)
	if err != nil {
		return fmt.Errorf("fetch broker %s: %w", payload.BrokerID, err)
	}
	if bwt == nil {
		logger.Error("broker not found", "broker_id", payload.BrokerID)
		return publishDeliveryFailed(ctx, nc, lead, payload.BrokerID, "broker not found", logger)
	}

	// Check broker is active.
	if bwt.Broker.Status != models.BrokerStatusActive {
		logger.Warn("broker not active",
			"broker_id", payload.BrokerID,
			"status", bwt.Broker.Status,
		)
		return publishDeliveryFailed(ctx, nc, lead, payload.BrokerID, "broker not active: "+string(bwt.Broker.Status), logger)
	}

	// Deliver lead to broker.
	result, deliveryErr := deliverer.Deliver(ctx, lead, bwt)

	if deliveryErr != nil || !result.Success {
		// Update lead status to rejected.
		if updateErr := store.UpdateLeadStatus(ctx, lead.ID, models.LeadStatusRejected); updateErr != nil {
			logger.Error("failed to update lead status", "lead_id", lead.ID, "error", updateErr)
		}

		reason := "delivery failed"
		if deliveryErr != nil {
			reason = deliveryErr.Error()
		} else if result.Error != "" {
			reason = result.Error
		}

		return publishDeliveryFailed(ctx, nc, lead, payload.BrokerID, reason, logger)
	}

	// Delivery succeeded — update lead status.
	if err := store.UpdateLeadStatus(ctx, lead.ID, models.LeadStatusDelivered); err != nil {
		logger.Error("failed to update lead status", "lead_id", lead.ID, "error", err)
	}

	// Publish lead.delivered.
	if err := nc.Publish(ctx, events.LeadDelivered, "broker-adapter-svc", map[string]interface{}{
		"lead_id":        lead.ID,
		"tenant_id":      lead.TenantID,
		"broker_id":      payload.BrokerID,
		"broker_lead_id": result.BrokerLeadID,
		"autologin_url":  result.AutologinURL,
		"status_code":    result.StatusCode,
		"attempts":       result.Attempts,
		"duration_ms":    result.TotalDuration,
		"affiliate_id":   lead.AffiliateID,
		"country":        lead.Country,
	}); err != nil {
		logger.Error("failed to publish lead.delivered", "lead_id", lead.ID, "error", err)
	}

	logger.Info("lead delivered successfully",
		"lead_id", lead.ID,
		"broker_id", payload.BrokerID,
		"broker_lead_id", result.BrokerLeadID,
		"status_code", result.StatusCode,
		"attempts", result.Attempts,
		"duration_ms", result.TotalDuration,
	)

	return nil
}

// publishDeliveryFailed publishes a lead.delivery_failed event and records
// the failure. Returns nil so the NATS message is ACKed (we handled the failure).
func publishDeliveryFailed(ctx context.Context, nc *messaging.NATSClient, lead *models.Lead, brokerID, reason string, logger *slog.Logger) error {
	if err := nc.Publish(ctx, events.LeadDeliveryFailed, "broker-adapter-svc", map[string]interface{}{
		"lead_id":   lead.ID,
		"tenant_id": lead.TenantID,
		"broker_id": brokerID,
		"reason":    reason,
	}); err != nil {
		logger.Error("failed to publish lead.delivery_failed",
			"lead_id", lead.ID,
			"error", err,
		)
	}
	return nil
}
