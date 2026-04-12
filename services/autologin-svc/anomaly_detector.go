package main

import (
	"context"
	"log/slog"
)

type AnomalyDetector struct {
	store  *AutologinStore
	logger *slog.Logger
}

func NewAnomalyDetector(store *AutologinStore, logger *slog.Logger) *AnomalyDetector {
	return &AnomalyDetector{store: store, logger: logger}
}

func (ad *AnomalyDetector) CheckDeviceReuse(ctx context.Context, exec *PipelineExecution) {
	fp, err := ad.store.GetFingerprint(ctx, exec.FingerprintID)
	if err != nil || fp == nil {
		return
	}

	if fp.UsageCount24h > 3 {
		ad.logger.Warn("device reuse detected",
			"pipeline_id", exec.ID,
			"fingerprint_id", fp.ID,
			"usage_24h", fp.UsageCount24h,
		)

		severity := "warning"
		action := "log_only"
		if fp.UsageCount24h > 10 {
			severity = "critical"
			action = "notify_admin"
		}

		ad.store.LogAnomaly(ctx, exec.TenantID, exec.ID, "device_reuse", severity,
			map[string]interface{}{
				"fingerprint_id": fp.ID,
				"usage_24h":      fp.UsageCount24h,
				"lead_id":        exec.LeadID,
			}, action)
	}
}

func (ad *AnomalyDetector) CheckGeoMismatch(ctx context.Context, exec *PipelineExecution, leadCountry, proxyCountry string) {
	if leadCountry == proxyCountry || leadCountry == "" || proxyCountry == "" {
		return
	}

	ad.logger.Warn("geo mismatch detected",
		"pipeline_id", exec.ID,
		"lead_country", leadCountry,
		"proxy_country", proxyCountry,
	)

	ad.store.LogAnomaly(ctx, exec.TenantID, exec.ID, "geo_mismatch", "warning",
		map[string]interface{}{
			"lead_country":  leadCountry,
			"proxy_country": proxyCountry,
			"lead_id":       exec.LeadID,
			"proxy_id":      exec.ProxyID,
		}, "log_only")
}

func (ad *AnomalyDetector) CheckIPVelocity(ctx context.Context, exec *PipelineExecution, ip string) {
	// IP velocity check: detect if too many autologin requests from the same IP
	// This would query autologin_sessions for recent sessions with the same IP
	ad.logger.Debug("ip velocity check", "pipeline_id", exec.ID, "ip", ip)
}
