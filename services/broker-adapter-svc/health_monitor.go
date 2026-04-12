package main

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

type HealthMonitor struct {
	store    *Store
	client   *http.Client
	logger   *slog.Logger
	interval time.Duration
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

func NewHealthMonitor(store *Store, logger *slog.Logger, interval time.Duration) *HealthMonitor {
	return &HealthMonitor{
		store:  store,
		logger: logger,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		interval: interval,
	}
}

func (hm *HealthMonitor) Start(ctx context.Context) {
	ctx, hm.cancel = context.WithCancel(ctx)
	hm.wg.Add(1)

	go func() {
		defer hm.wg.Done()
		ticker := time.NewTicker(hm.interval)
		defer ticker.Stop()

		hm.logger.Info("health monitor started", "interval", hm.interval)

		for {
			select {
			case <-ctx.Done():
				hm.logger.Info("health monitor stopped")
				return
			case <-ticker.C:
				hm.checkAll(ctx)
			}
		}
	}()
}

func (hm *HealthMonitor) Stop() {
	if hm.cancel != nil {
		hm.cancel()
	}
	hm.wg.Wait()
}

func (hm *HealthMonitor) checkAll(ctx context.Context) {
	brokers, err := hm.store.GetBrokersWithHealthCheck(ctx)
	if err != nil {
		hm.logger.Error("failed to list brokers for health check", "error", err)
		return
	}

	for _, b := range brokers {
		if b.HealthCheckURL == "" {
			continue
		}
		go hm.checkBroker(ctx, b)
	}
}

type brokerHealthInfo struct {
	ID             string
	HealthCheckURL string
	TenantID       string
}

func (hm *HealthMonitor) checkBroker(ctx context.Context, b brokerHealthInfo) {
	req, err := http.NewRequestWithContext(ctx, "GET", b.HealthCheckURL, nil)
	if err != nil {
		hm.updateStatus(ctx, b, "unhealthy")
		return
	}

	start := time.Now()
	resp, err := hm.client.Do(req)
	latency := time.Since(start)

	if err != nil {
		hm.logger.Warn("health check failed",
			"broker_id", b.ID, "error", err, "latency_ms", latency.Milliseconds())
		hm.updateStatus(ctx, b, "unhealthy")
		return
	}
	defer resp.Body.Close()

	status := "healthy"
	if resp.StatusCode >= 400 || latency > 5*time.Second {
		status = "degraded"
	}
	if resp.StatusCode >= 500 || latency > 10*time.Second {
		status = "unhealthy"
	}

	hm.updateStatus(ctx, b, status)
}

func (hm *HealthMonitor) updateStatus(ctx context.Context, b brokerHealthInfo, status string) {
	if err := hm.store.UpdateBrokerHealthStatus(ctx, b.ID, status); err != nil {
		hm.logger.Error("failed to update broker health",
			"broker_id", b.ID, "status", status, "error", err)
	}
}
