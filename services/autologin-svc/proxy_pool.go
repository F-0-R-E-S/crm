package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

type ProxyPoolManager struct {
	store    *AutologinStore
	logger   *slog.Logger
	client   *http.Client
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

func NewProxyPoolManager(store *AutologinStore, logger *slog.Logger) *ProxyPoolManager {
	return &ProxyPoolManager{
		store:  store,
		logger: logger,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (pp *ProxyPoolManager) Assign(ctx context.Context, tenantID, country string) (*ProxyEntry, error) {
	proxy, err := pp.store.AssignProxy(ctx, tenantID, country)
	if err != nil {
		return nil, fmt.Errorf("no available proxy for tenant %s country %s: %w", tenantID, country, err)
	}

	pp.logger.Info("proxy assigned",
		"proxy_id", proxy.ID,
		"type", proxy.ProxyType,
		"country", proxy.Country,
		"concurrent", proxy.ConcurrentCount,
	)

	return proxy, nil
}

func (pp *ProxyPoolManager) Release(ctx context.Context, proxyID string) {
	if err := pp.store.ReleaseProxy(ctx, proxyID); err != nil {
		pp.logger.Error("failed to release proxy", "proxy_id", proxyID, "error", err)
	}
}

func (pp *ProxyPoolManager) StartHealthChecks(ctx context.Context, interval time.Duration) {
	ctx, pp.cancel = context.WithCancel(ctx)
	pp.wg.Add(1)

	go func() {
		defer pp.wg.Done()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				pp.checkAll(ctx)
			}
		}
	}()

	pp.logger.Info("proxy health checks started", "interval", interval)
}

func (pp *ProxyPoolManager) Stop() {
	if pp.cancel != nil {
		pp.cancel()
	}
	pp.wg.Wait()
}

func (pp *ProxyPoolManager) checkAll(ctx context.Context) {
	// Proxy health checks would ping each proxy to verify connectivity.
	// For now this is a placeholder that marks unresponsive proxies as unhealthy.
	pp.logger.Debug("running proxy health checks")
}
