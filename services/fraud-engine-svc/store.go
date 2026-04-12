package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
)

// FraudProfile holds per-affiliate fraud check settings.
type FraudProfile struct {
	ID               string  `json:"id"`
	TenantID         string  `json:"tenant_id"`
	AffiliateID      string  `json:"affiliate_id"`
	IPCheckEnabled   bool    `json:"ip_check_enabled"`
	EmailCheckEnabled bool   `json:"email_check_enabled"`
	PhoneCheckEnabled bool   `json:"phone_check_enabled"`
	VelocityCheckEnabled bool `json:"velocity_check_enabled"`
	MinQualityScore  int     `json:"min_quality_score"`
	AutoRejectScore  int     `json:"auto_reject_score"`
}

// Store handles database operations for the fraud engine.
type Store struct {
	db *database.DB
}

// NewStore creates a new fraud engine store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// GetFraudProfile loads the fraud profile for a given tenant and affiliate.
// Returns a default profile (all checks enabled, min_quality_score=40,
// auto_reject_score=20) if no profile is found.
func (s *Store) GetFraudProfile(ctx context.Context, tenantID, affiliateID string) (*FraudProfile, error) {
	profile := &FraudProfile{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, affiliate_id,
		        ip_check_enabled, email_check_enabled,
		        phone_check_enabled, velocity_check_enabled,
		        min_quality_score, auto_reject_score
		 FROM fraud_profiles
		 WHERE tenant_id = $1 AND affiliate_id = $2`,
		tenantID, affiliateID,
	).Scan(
		&profile.ID, &profile.TenantID, &profile.AffiliateID,
		&profile.IPCheckEnabled, &profile.EmailCheckEnabled,
		&profile.PhoneCheckEnabled, &profile.VelocityCheckEnabled,
		&profile.MinQualityScore, &profile.AutoRejectScore,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Return a default profile with all checks enabled
			return &FraudProfile{
				TenantID:             tenantID,
				AffiliateID:          affiliateID,
				IPCheckEnabled:       true,
				EmailCheckEnabled:    true,
				PhoneCheckEnabled:    true,
				VelocityCheckEnabled: true,
				MinQualityScore:      40,
				AutoRejectScore:      20,
			}, nil
		}
		return nil, fmt.Errorf("query fraud profile: %w", err)
	}
	return profile, nil
}

func (s *Store) ListFraudProfiles(ctx context.Context, tenantID string) ([]*FraudProfile, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, affiliate_id, ip_check_enabled, email_check_enabled,
		        phone_check_enabled, velocity_check_enabled, min_quality_score, auto_reject_score
		 FROM fraud_profiles WHERE tenant_id = $1`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list fraud profiles: %w", err)
	}
	defer rows.Close()

	var profiles []*FraudProfile
	for rows.Next() {
		p := &FraudProfile{}
		if err := rows.Scan(&p.ID, &p.TenantID, &p.AffiliateID,
			&p.IPCheckEnabled, &p.EmailCheckEnabled,
			&p.PhoneCheckEnabled, &p.VelocityCheckEnabled,
			&p.MinQualityScore, &p.AutoRejectScore); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, nil
}

func (s *Store) UpdateMinQualityScore(ctx context.Context, affiliateID string, score int) error {
	return s.db.Exec(ctx,
		`UPDATE fraud_profiles SET min_quality_score = $1 WHERE affiliate_id = $2`,
		score, affiliateID)
}

func (s *Store) UpdateAutoRejectScore(ctx context.Context, affiliateID string, score int) error {
	return s.db.Exec(ctx,
		`UPDATE fraud_profiles SET auto_reject_score = $1 WHERE affiliate_id = $2`,
		score, affiliateID)
}

// UpsertFraudProfile creates or updates a fraud profile.
func (s *Store) UpsertFraudProfile(ctx context.Context, profile *FraudProfile) error {
	return s.db.Exec(ctx,
		`INSERT INTO fraud_profiles
			(tenant_id, affiliate_id,
			 ip_check_enabled, email_check_enabled,
			 phone_check_enabled, velocity_check_enabled,
			 min_quality_score, auto_reject_score)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (tenant_id, affiliate_id)
		 DO UPDATE SET
			ip_check_enabled = EXCLUDED.ip_check_enabled,
			email_check_enabled = EXCLUDED.email_check_enabled,
			phone_check_enabled = EXCLUDED.phone_check_enabled,
			velocity_check_enabled = EXCLUDED.velocity_check_enabled,
			min_quality_score = EXCLUDED.min_quality_score,
			auto_reject_score = EXCLUDED.auto_reject_score`,
		profile.TenantID, profile.AffiliateID,
		profile.IPCheckEnabled, profile.EmailCheckEnabled,
		profile.PhoneCheckEnabled, profile.VelocityCheckEnabled,
		profile.MinQualityScore, profile.AutoRejectScore,
	)
}
