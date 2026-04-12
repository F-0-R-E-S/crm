package main

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/models"
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

// ---------------------------------------------------------------------------
// Blacklist Operations
// ---------------------------------------------------------------------------

// ListBlacklists returns blacklist entries for a tenant with optional list_type filter.
func (s *Store) ListBlacklists(ctx context.Context, tenantID, listType string, limit, offset int) ([]models.BlacklistEntry, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM blacklists WHERE tenant_id = $1`
	dataQuery := `SELECT id, tenant_id, list_type, value, pattern, reason, source, expires_at, created_by, created_at, updated_at
		FROM blacklists WHERE tenant_id = $1`

	args := []interface{}{tenantID}
	if listType != "" {
		countQuery += ` AND list_type = $2`
		dataQuery += ` AND list_type = $2`
		args = append(args, listType)
	}

	err := s.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count blacklists: %w", err)
	}

	dataQuery += ` ORDER BY created_at DESC LIMIT $` + fmt.Sprintf("%d", len(args)+1) + ` OFFSET $` + fmt.Sprintf("%d", len(args)+2)
	args = append(args, limit, offset)

	rows, err := s.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list blacklists: %w", err)
	}
	defer rows.Close()

	var entries []models.BlacklistEntry
	for rows.Next() {
		var e models.BlacklistEntry
		if err := rows.Scan(&e.ID, &e.TenantID, &e.ListType, &e.Value, &e.Pattern, &e.Reason,
			&e.Source, &e.ExpiresAt, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan blacklist entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, total, nil
}

// AddBlacklistEntry inserts a new blacklist entry.
func (s *Store) AddBlacklistEntry(ctx context.Context, entry *models.BlacklistEntry) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO blacklists (tenant_id, list_type, value, pattern, reason, source, expires_at, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at`,
		entry.TenantID, entry.ListType, entry.Value, entry.Pattern, entry.Reason,
		entry.Source, entry.ExpiresAt, entry.CreatedBy,
	).Scan(&entry.ID, &entry.CreatedAt)
}

// BulkAddBlacklist inserts multiple blacklist entries using a batch.
func (s *Store) BulkAddBlacklist(ctx context.Context, tenantID string, entries []models.BlacklistEntry) (int, error) {
	batch := &pgx.Batch{}
	for i := range entries {
		entries[i].TenantID = tenantID
		batch.Queue(
			`INSERT INTO blacklists (tenant_id, list_type, value, pattern, reason, source, expires_at, created_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT DO NOTHING`,
			entries[i].TenantID, entries[i].ListType, entries[i].Value, entries[i].Pattern,
			entries[i].Reason, entries[i].Source, entries[i].ExpiresAt, entries[i].CreatedBy,
		)
	}

	br := s.db.Pool.SendBatch(ctx, batch)
	defer br.Close()

	inserted := 0
	for range entries {
		ct, err := br.Exec()
		if err != nil {
			return inserted, fmt.Errorf("bulk insert blacklist: %w", err)
		}
		inserted += int(ct.RowsAffected())
	}
	return inserted, nil
}

// RemoveBlacklistEntry deletes a blacklist entry by ID and tenant.
func (s *Store) RemoveBlacklistEntry(ctx context.Context, tenantID, id string) error {
	ct, err := s.db.Pool.Exec(ctx,
		`DELETE FROM blacklists WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete blacklist entry: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// CheckBlacklist checks if any of the provided values match blacklist entries.
// For IPs it uses CIDR containment, for email/phone exact match, for domain checks email domain.
func (s *Store) CheckBlacklist(ctx context.Context, tenantID, ip, email, phone string) ([]models.BlacklistEntry, error) {
	query := `SELECT id, tenant_id, list_type, value, pattern, reason, source, expires_at, created_by, created_at, updated_at
		FROM blacklists
		WHERE tenant_id = $1
		  AND (expires_at IS NULL OR expires_at > NOW())
		  AND (
			(list_type = 'ip' AND $2 != '' AND inet($2) <<= inet(value))
			OR (list_type = 'email' AND lower($3) = lower(value))
			OR (list_type = 'phone' AND $4 = value)
			OR (list_type = 'domain' AND $3 != '' AND lower(split_part($3, '@', 2)) = lower(value))
		  )`

	rows, err := s.db.Pool.Query(ctx, query, tenantID, ip, email, phone)
	if err != nil {
		return nil, fmt.Errorf("check blacklist: %w", err)
	}
	defer rows.Close()

	var entries []models.BlacklistEntry
	for rows.Next() {
		var e models.BlacklistEntry
		if err := rows.Scan(&e.ID, &e.TenantID, &e.ListType, &e.Value, &e.Pattern, &e.Reason,
			&e.Source, &e.ExpiresAt, &e.CreatedBy, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan blacklist match: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// ---------------------------------------------------------------------------
// Fraud Check Results
// ---------------------------------------------------------------------------

// SaveFraudCheckResult persists a fraud check result.
func (s *Store) SaveFraudCheckResult(ctx context.Context, result *models.FraudCheckResult) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO fraud_check_results (tenant_id, lead_id, overall_score, verdict, checks, ip_data, phone_data, profile_id, checked_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id`,
		result.TenantID, result.LeadID, result.OverallScore, result.Verdict,
		result.Checks, result.IPData, result.PhoneData, result.ProfileID, result.CheckedAt,
	).Scan(&result.ID)
}

// GetFraudCheckResult retrieves the latest fraud check result for a lead.
func (s *Store) GetFraudCheckResult(ctx context.Context, tenantID, leadID string) (*models.FraudCheckResult, error) {
	r := &models.FraudCheckResult{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, lead_id, overall_score, verdict, checks, ip_data, phone_data, profile_id, checked_at, created_at
		 FROM fraud_check_results
		 WHERE tenant_id = $1 AND lead_id = $2
		 ORDER BY checked_at DESC LIMIT 1`,
		tenantID, leadID,
	).Scan(&r.ID, &r.TenantID, &r.LeadID, &r.OverallScore, &r.Verdict,
		&r.Checks, &r.IPData, &r.PhoneData, &r.ProfileID, &r.CheckedAt, &r.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get fraud check result: %w", err)
	}
	return r, nil
}

// ---------------------------------------------------------------------------
// Shave Events
// ---------------------------------------------------------------------------

// CreateShaveEvent inserts a new shave event.
func (s *Store) CreateShaveEvent(ctx context.Context, event *models.ShaveEvent) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO shave_events (tenant_id, lead_id, broker_id, affiliate_id, old_status, new_status, old_rank, new_rank, raw_status, detected_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id`,
		event.TenantID, event.LeadID, event.BrokerID, event.AffiliateID,
		event.OldStatus, event.NewStatus, event.OldRank, event.NewRank,
		event.RawStatus, event.DetectedAt,
	).Scan(&event.ID)
}

// ListShaveEvents returns shave events with optional filters.
func (s *Store) ListShaveEvents(ctx context.Context, tenantID string, brokerID string, acknowledged *bool, limit, offset int) ([]models.ShaveEvent, int, error) {
	var total int
	baseWhere := ` WHERE tenant_id = $1`
	args := []interface{}{tenantID}
	argIdx := 2

	if brokerID != "" {
		baseWhere += fmt.Sprintf(` AND broker_id = $%d`, argIdx)
		args = append(args, brokerID)
		argIdx++
	}
	if acknowledged != nil {
		baseWhere += fmt.Sprintf(` AND acknowledged = $%d`, argIdx)
		args = append(args, *acknowledged)
		argIdx++
	}

	countQuery := `SELECT COUNT(*) FROM shave_events` + baseWhere
	err := s.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count shave events: %w", err)
	}

	dataQuery := `SELECT id, tenant_id, lead_id, broker_id, affiliate_id, old_status, new_status,
		old_rank, new_rank, raw_status, detected_at, acknowledged, acknowledged_by, acknowledged_at
		FROM shave_events` + baseWhere +
		fmt.Sprintf(` ORDER BY detected_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := s.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list shave events: %w", err)
	}
	defer rows.Close()

	var events []models.ShaveEvent
	for rows.Next() {
		var e models.ShaveEvent
		if err := rows.Scan(&e.ID, &e.TenantID, &e.LeadID, &e.BrokerID, &e.AffiliateID,
			&e.OldStatus, &e.NewStatus, &e.OldRank, &e.NewRank, &e.RawStatus,
			&e.DetectedAt, &e.Acknowledged, &e.AcknowledgedBy, &e.AcknowledgedAt); err != nil {
			return nil, 0, fmt.Errorf("scan shave event: %w", err)
		}
		events = append(events, e)
	}
	return events, total, nil
}

// AcknowledgeShave marks a shave event as acknowledged.
func (s *Store) AcknowledgeShave(ctx context.Context, tenantID, id, userID string) error {
	ct, err := s.db.Pool.Exec(ctx,
		`UPDATE shave_events SET acknowledged = true, acknowledged_by = $3, acknowledged_at = NOW()
		 WHERE id = $1 AND tenant_id = $2 AND acknowledged = false`,
		id, tenantID, userID)
	if err != nil {
		return fmt.Errorf("acknowledge shave: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

// GetFraudDashboardStats aggregates fraud check statistics for a time range.
func (s *Store) GetFraudDashboardStats(ctx context.Context, tenantID string, from, to time.Time) (*models.FraudDashboardStats, error) {
	stats := &models.FraudDashboardStats{
		ScoreDistribution: make(map[string]int),
	}

	// Aggregate counts and avg score
	err := s.db.Pool.QueryRow(ctx,
		`SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE verdict = 'review'),
			COUNT(*) FILTER (WHERE verdict = 'rejected'),
			COUNT(*) FILTER (WHERE verdict = 'approved'),
			COALESCE(AVG(overall_score), 0)
		 FROM fraud_check_results
		 WHERE tenant_id = $1 AND checked_at >= $2 AND checked_at <= $3`,
		tenantID, from, to,
	).Scan(&stats.TotalChecked, &stats.TotalFlagged, &stats.TotalRejected, &stats.TotalApproved, &stats.AvgScore)
	if err != nil {
		return nil, fmt.Errorf("dashboard stats aggregate: %w", err)
	}

	// Score distribution buckets
	bucketRows, err := s.db.Pool.Query(ctx,
		`SELECT
			CASE
				WHEN overall_score BETWEEN 0 AND 20 THEN '0-20'
				WHEN overall_score BETWEEN 21 AND 40 THEN '21-40'
				WHEN overall_score BETWEEN 41 AND 60 THEN '41-60'
				WHEN overall_score BETWEEN 61 AND 80 THEN '61-80'
				WHEN overall_score BETWEEN 81 AND 100 THEN '81-100'
			END AS bucket,
			COUNT(*)
		 FROM fraud_check_results
		 WHERE tenant_id = $1 AND checked_at >= $2 AND checked_at <= $3
		 GROUP BY bucket`,
		tenantID, from, to,
	)
	if err != nil {
		return nil, fmt.Errorf("dashboard stats buckets: %w", err)
	}
	defer bucketRows.Close()

	for bucketRows.Next() {
		var bucket string
		var count int
		if err := bucketRows.Scan(&bucket, &count); err != nil {
			return nil, fmt.Errorf("scan bucket: %w", err)
		}
		if bucket != "" {
			stats.ScoreDistribution[bucket] = count
		}
	}

	// VPN/TOR/Proxy/Bot counts from ip_data JSONB
	err = s.db.Pool.QueryRow(ctx,
		`SELECT
			COUNT(*) FILTER (WHERE ip_data->>'vpn' = 'true'),
			COUNT(*) FILTER (WHERE ip_data->>'tor' = 'true'),
			COUNT(*) FILTER (WHERE ip_data->>'proxy' = 'true'),
			COUNT(*) FILTER (WHERE ip_data->>'bot' = 'true'),
			COUNT(*) FILTER (WHERE phone_data->>'voip' = 'true')
		 FROM fraud_check_results
		 WHERE tenant_id = $1 AND checked_at >= $2 AND checked_at <= $3`,
		tenantID, from, to,
	).Scan(&stats.VPNCount, &stats.TORCount, &stats.ProxyCount, &stats.BotCount, &stats.VOIPCount)
	if err != nil {
		return nil, fmt.Errorf("dashboard stats ip_data: %w", err)
	}

	return stats, nil
}

// ---------------------------------------------------------------------------
// Velocity Rules
// ---------------------------------------------------------------------------

// ListVelocityRules returns all velocity rules for a tenant.
func (s *Store) ListVelocityRules(ctx context.Context, tenantID string) ([]models.VelocityRule, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, dimension, max_count, time_window_seconds, action, is_active, created_at, updated_at
		 FROM velocity_rules WHERE tenant_id = $1 ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list velocity rules: %w", err)
	}
	defer rows.Close()

	var rules []models.VelocityRule
	for rows.Next() {
		var r models.VelocityRule
		if err := rows.Scan(&r.ID, &r.TenantID, &r.Name, &r.Dimension, &r.MaxCount,
			&r.TimeWindowSeconds, &r.Action, &r.IsActive, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan velocity rule: %w", err)
		}
		rules = append(rules, r)
	}
	return rules, nil
}

// CreateVelocityRule inserts a new velocity rule.
func (s *Store) CreateVelocityRule(ctx context.Context, rule *models.VelocityRule) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO velocity_rules (tenant_id, name, dimension, max_count, time_window_seconds, action, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`,
		rule.TenantID, rule.Name, rule.Dimension, rule.MaxCount, rule.TimeWindowSeconds, rule.Action, rule.IsActive,
	).Scan(&rule.ID, &rule.CreatedAt, &rule.UpdatedAt)
}

// UpdateVelocityRule updates an existing velocity rule.
func (s *Store) UpdateVelocityRule(ctx context.Context, rule *models.VelocityRule) error {
	ct, err := s.db.Pool.Exec(ctx,
		`UPDATE velocity_rules SET name = $3, dimension = $4, max_count = $5,
			time_window_seconds = $6, action = $7, is_active = $8, updated_at = NOW()
		 WHERE id = $1 AND tenant_id = $2`,
		rule.ID, rule.TenantID, rule.Name, rule.Dimension, rule.MaxCount,
		rule.TimeWindowSeconds, rule.Action, rule.IsActive,
	)
	if err != nil {
		return fmt.Errorf("update velocity rule: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// DeleteVelocityRule deletes a velocity rule.
func (s *Store) DeleteVelocityRule(ctx context.Context, tenantID, id string) error {
	ct, err := s.db.Pool.Exec(ctx,
		`DELETE FROM velocity_rules WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete velocity rule: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// ---------------------------------------------------------------------------
// Behavioral Events
// ---------------------------------------------------------------------------

// BatchInsertBehavioralEvents inserts a batch of behavioral events.
func (s *Store) BatchInsertBehavioralEvents(ctx context.Context, tenantID, sessionID string, events []BehavioralEventPayload, ip, ua string) (int, error) {
	batch := &pgx.Batch{}
	for _, ev := range events {
		batch.Queue(
			`INSERT INTO behavioral_events (tenant_id, session_id, event_type, event_data, client_ts, ip, user_agent)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			tenantID, sessionID, ev.EventType, ev.EventData, ev.ClientTS, ip, ua,
		)
	}

	br := s.db.Pool.SendBatch(ctx, batch)
	defer br.Close()

	inserted := 0
	for range events {
		_, err := br.Exec()
		if err != nil {
			return inserted, fmt.Errorf("batch insert behavioral event: %w", err)
		}
		inserted++
	}
	return inserted, nil
}

// ---------------------------------------------------------------------------
// Fraud Intelligence
// ---------------------------------------------------------------------------

// UpsertFraudIntelligence creates or updates a fraud intelligence entry.
func (s *Store) UpsertFraudIntelligence(ctx context.Context, entry *models.FraudIntelligenceEntry) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO fraud_intelligence_pool (contributor_tenant_id, entry_type, hashed_value, risk_score, confidence, reports_count, first_seen, last_seen)
		 VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
		 ON CONFLICT (entry_type, hashed_value) DO UPDATE SET
			risk_score = GREATEST(fraud_intelligence_pool.risk_score, EXCLUDED.risk_score),
			confidence = (fraud_intelligence_pool.confidence + EXCLUDED.confidence) / 2,
			reports_count = fraud_intelligence_pool.reports_count + 1,
			last_seen = NOW()
		 RETURNING id, first_seen, last_seen, created_at`,
		entry.ContributorTenantID, entry.EntryType, entry.HashedValue,
		entry.RiskScore, entry.Confidence,
	).Scan(&entry.ID, &entry.FirstSeen, &entry.LastSeen, &entry.CreatedAt)
}

// CheckFraudIntelligence checks if a hashed value exists in the intelligence pool.
func (s *Store) CheckFraudIntelligence(ctx context.Context, entryType, hashedValue string) (*models.FraudIntelligenceEntry, error) {
	e := &models.FraudIntelligenceEntry{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, contributor_tenant_id, entry_type, hashed_value, risk_score, confidence, reports_count, first_seen, last_seen, created_at
		 FROM fraud_intelligence_pool
		 WHERE entry_type = $1 AND hashed_value = $2`,
		entryType, hashedValue,
	).Scan(&e.ID, &e.ContributorTenantID, &e.EntryType, &e.HashedValue,
		&e.RiskScore, &e.Confidence, &e.ReportsCount, &e.FirstSeen, &e.LastSeen, &e.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("check fraud intelligence: %w", err)
	}
	return e, nil
}

// ---------------------------------------------------------------------------
// Fraud Rule Experiments
// ---------------------------------------------------------------------------

// ListExperiments returns all experiments for a tenant.
func (s *Store) ListExperiments(ctx context.Context, tenantID string) ([]models.FraudRuleExperiment, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, description, control_config, variant_config, traffic_split,
			status, results, started_at, ended_at, created_at, updated_at
		 FROM fraud_rule_experiments WHERE tenant_id = $1 ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list experiments: %w", err)
	}
	defer rows.Close()

	var exps []models.FraudRuleExperiment
	for rows.Next() {
		var e models.FraudRuleExperiment
		if err := rows.Scan(&e.ID, &e.TenantID, &e.Name, &e.Description,
			&e.ControlConfig, &e.VariantConfig, &e.TrafficSplit,
			&e.Status, &e.Results, &e.StartedAt, &e.EndedAt, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan experiment: %w", err)
		}
		exps = append(exps, e)
	}
	return exps, nil
}

// CreateExperiment inserts a new experiment.
func (s *Store) CreateExperiment(ctx context.Context, exp *models.FraudRuleExperiment) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO fraud_rule_experiments (tenant_id, name, description, control_config, variant_config, traffic_split, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`,
		exp.TenantID, exp.Name, exp.Description, exp.ControlConfig, exp.VariantConfig, exp.TrafficSplit, exp.Status,
	).Scan(&exp.ID, &exp.CreatedAt, &exp.UpdatedAt)
}

// UpdateExperiment updates an existing experiment.
func (s *Store) UpdateExperiment(ctx context.Context, exp *models.FraudRuleExperiment) error {
	ct, err := s.db.Pool.Exec(ctx,
		`UPDATE fraud_rule_experiments SET name = $3, description = $4, control_config = $5,
			variant_config = $6, traffic_split = $7, status = $8, results = $9,
			started_at = $10, ended_at = $11, updated_at = NOW()
		 WHERE id = $1 AND tenant_id = $2`,
		exp.ID, exp.TenantID, exp.Name, exp.Description, exp.ControlConfig,
		exp.VariantConfig, exp.TrafficSplit, exp.Status, exp.Results,
		exp.StartedAt, exp.EndedAt,
	)
	if err != nil {
		return fmt.Errorf("update experiment: %w", err)
	}
	if ct.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

// GetExperiment retrieves a single experiment by ID.
func (s *Store) GetExperiment(ctx context.Context, tenantID, id string) (*models.FraudRuleExperiment, error) {
	e := &models.FraudRuleExperiment{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, description, control_config, variant_config, traffic_split,
			status, results, started_at, ended_at, created_at, updated_at
		 FROM fraud_rule_experiments WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&e.ID, &e.TenantID, &e.Name, &e.Description,
		&e.ControlConfig, &e.VariantConfig, &e.TrafficSplit,
		&e.Status, &e.Results, &e.StartedAt, &e.EndedAt, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get experiment: %w", err)
	}
	return e, nil
}

