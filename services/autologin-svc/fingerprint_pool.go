package main

import (
	"context"
	"fmt"
	"log/slog"
)

type FingerprintPool struct {
	store  *AutologinStore
	logger *slog.Logger
}

func NewFingerprintPool(store *AutologinStore, logger *slog.Logger) *FingerprintPool {
	return &FingerprintPool{store: store, logger: logger}
}

func (fp *FingerprintPool) Assign(ctx context.Context, tenantID, leadID string) (*Fingerprint, error) {
	profile, err := fp.store.AssignFingerprint(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("no available fingerprints for tenant %s: %w", tenantID, err)
	}

	fp.logger.Info("fingerprint assigned",
		"fingerprint_id", profile.ID,
		"lead_id", leadID,
		"profile", profile.ProfileName,
		"usage_24h", profile.UsageCount24h,
	)

	return profile, nil
}

func (fp *FingerprintPool) Get(ctx context.Context, fpID string) (*Fingerprint, error) {
	return fp.store.GetFingerprint(ctx, fpID)
}
