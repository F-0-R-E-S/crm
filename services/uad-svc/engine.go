package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/messaging"
)

type Engine struct {
	store  *Store
	nats   *messaging.NATSClient
	redis  *cache.Redis
	logger *slog.Logger
}

func NewEngine(store *Store, nats *messaging.NATSClient, redis *cache.Redis, logger *slog.Logger) *Engine {
	return &Engine{store: store, nats: nats, redis: redis, logger: logger}
}

// RunSchedulerLoop polls active scenarios and enqueues matching leads.
func (e *Engine) RunSchedulerLoop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.evaluateScenarios(ctx)
		}
	}
}

// RunProcessorLoop fetches pending queue items and delivers them.
func (e *Engine) RunProcessorLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.processBatch(ctx)
		}
	}
}

func (e *Engine) evaluateScenarios(ctx context.Context) {
	scenarios, err := e.store.GetActiveScenarios(ctx)
	if err != nil {
		e.logger.Error("failed to get active scenarios", "error", err)
		return
	}

	for _, sc := range scenarios {
		if !e.shouldRunNow(sc) {
			continue
		}

		// Dedup: don't re-enqueue if we already ran recently
		lockKey := fmt.Sprintf("uad:lock:%s", sc.ID)
		acquired, _ := e.redis.SetNX(ctx, lockKey, "1", 5*time.Minute)
		if !acquired {
			continue
		}

		var filters SourceFilters
		json.Unmarshal(sc.SourceFilters, &filters)

		leadIDs, err := e.store.FindLeadsForScenario(ctx, sc.TenantID, filters, sc.BatchSize)
		if err != nil {
			e.logger.Error("failed to find leads for scenario", "scenario", sc.ID, "error", err)
			continue
		}
		if len(leadIDs) == 0 {
			continue
		}

		// Pick target broker from scenario config
		var targets []struct {
			BrokerID string `json:"broker_id"`
			Weight   int    `json:"weight"`
		}
		json.Unmarshal(sc.TargetBrokers, &targets)

		targetBrokerID := ""
		if len(targets) > 0 {
			targetBrokerID = targets[0].BrokerID
		}

		enqueued, err := e.store.EnqueueLeads(ctx, sc.ID, sc.TenantID, leadIDs, targetBrokerID, sc.MaxAttempts)
		if err != nil {
			e.logger.Error("failed to enqueue leads", "scenario", sc.ID, "error", err)
			continue
		}

		e.logger.Info("leads enqueued for UAD",
			"scenario", sc.ID,
			"scenario_name", sc.Name,
			"enqueued", enqueued,
			"total_found", len(leadIDs),
		)
	}
}

func (e *Engine) shouldRunNow(sc *Scenario) bool {
	if sc.Mode == "continuous" {
		return true
	}

	if sc.Mode == "scheduled" {
		var sched struct {
			Timezone string   `json:"timezone"`
			Days     []string `json:"days"`
			Times    []string `json:"times"`
		}
		if err := json.Unmarshal(sc.Schedule, &sched); err != nil {
			return false
		}

		loc := time.UTC
		if sched.Timezone != "" {
			if l, err := time.LoadLocation(sched.Timezone); err == nil {
				loc = l
			}
		}

		now := time.Now().In(loc)

		if len(sched.Days) > 0 {
			dayName := strings.ToUpper(now.Weekday().String()[:3])
			found := false
			for _, d := range sched.Days {
				if strings.EqualFold(d, dayName) {
					found = true
					break
				}
			}
			if !found {
				return false
			}
		}

		if len(sched.Times) > 0 {
			currentTime := now.Format("15:04")
			for _, t := range sched.Times {
				if currentTime == t {
					return true
				}
			}
			return false
		}
	}

	// batch mode: always eligible (scheduler decides frequency)
	return true
}

func (e *Engine) processBatch(ctx context.Context) {
	items, err := e.store.FetchPendingBatch(ctx, 50)
	if err != nil {
		e.logger.Error("failed to fetch pending batch", "error", err)
		return
	}
	if len(items) == 0 {
		return
	}

	for _, item := range items {
		e.processItem(ctx, item)
	}
}

func (e *Engine) processItem(ctx context.Context, item *QueueItem) {
	targetBrokerID := item.TargetBrokerID

	// If no target broker, try overflow pool from scenario
	if targetBrokerID == "" && item.ScenarioID != "" {
		sc, err := e.store.GetScenario(ctx, item.ScenarioID)
		if err == nil && sc != nil {
			var overflow []struct {
				BrokerID string `json:"broker_id"`
			}
			json.Unmarshal(sc.OverflowPool, &overflow)
			if len(overflow) > 0 {
				idx := item.Attempts % len(overflow)
				targetBrokerID = overflow[idx].BrokerID
			}
		}
	}

	if targetBrokerID == "" {
		_ = e.store.MarkFailed(ctx, item.ID, "no target broker available", 10*time.Minute)
		return
	}

	// Publish re-routing event to NATS for the routing engine to process
	err := e.nats.Publish(ctx, "lead.reroute", "uad-svc", map[string]interface{}{
		"lead_id":          item.LeadID,
		"tenant_id":        item.TenantID,
		"target_broker_id": targetBrokerID,
		"uad_queue_id":     item.ID,
		"attempt":          item.Attempts + 1,
		"source":           "uad",
	})
	if err != nil {
		e.logger.Error("failed to publish reroute event",
			"lead_id", item.LeadID,
			"queue_id", item.ID,
			"error", err,
		)
		_ = e.store.MarkFailed(ctx, item.ID, "publish failed: "+err.Error(), 2*time.Minute)
		return
	}

	_ = e.store.MarkCompleted(ctx, item.ID, targetBrokerID)

	e.logger.Info("lead rerouted via UAD",
		"lead_id", item.LeadID,
		"target_broker", targetBrokerID,
		"attempt", item.Attempts+1,
	)
}

// HandleDeliveryFailed processes lead.delivery_failed events and enqueues leads for UAD retry.
func (e *Engine) HandleDeliveryFailed(ctx context.Context, event messaging.CloudEvent) error {
	dataBytes, _ := json.Marshal(event.Data)
	var payload struct {
		LeadID   string `json:"lead_id"`
		TenantID string `json:"tenant_id"`
		BrokerID string `json:"broker_id"`
		Reason   string `json:"reason"`
	}
	if err := json.Unmarshal(dataBytes, &payload); err != nil {
		return fmt.Errorf("unmarshal delivery_failed: %w", err)
	}

	if payload.LeadID == "" {
		return nil
	}

	// Check if any active scenario matches this lead
	scenarios, err := e.store.GetActiveScenarios(ctx)
	if err != nil {
		return err
	}

	for _, sc := range scenarios {
		if sc.TenantID != payload.TenantID || sc.Mode != "continuous" {
			continue
		}

		var filters SourceFilters
		json.Unmarshal(sc.SourceFilters, &filters)

		if len(filters.Statuses) > 0 {
			found := false
			for _, s := range filters.Statuses {
				if s == "rejected" || s == "delivery_failed" {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		var targets []struct {
			BrokerID string `json:"broker_id"`
		}
		json.Unmarshal(sc.TargetBrokers, &targets)
		targetBrokerID := ""
		if len(targets) > 0 {
			targetBrokerID = targets[0].BrokerID
		}

		_, _ = e.store.EnqueueLeads(ctx, sc.ID, sc.TenantID, []string{payload.LeadID}, targetBrokerID, sc.MaxAttempts)
		e.logger.Info("failed lead auto-enqueued for UAD",
			"lead_id", payload.LeadID,
			"scenario", sc.ID,
		)
		break
	}

	return nil
}
