package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
)

type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// ---------------------------------------------------------------------------
// Scenario model
// ---------------------------------------------------------------------------

type Scenario struct {
	ID            string          `json:"id" db:"id"`
	TenantID      string          `json:"tenant_id" db:"tenant_id"`
	Name          string          `json:"name" db:"name"`
	IsActive      bool            `json:"is_active" db:"is_active"`
	Mode          string          `json:"mode" db:"mode"` // batch, continuous, scheduled
	Schedule      json.RawMessage `json:"schedule" db:"schedule"`
	BatchSize     int             `json:"batch_size" db:"batch_size"`
	ThrottlePerMin int            `json:"throttle_per_min" db:"throttle_per_min"`
	MaxAttempts   int             `json:"max_attempts" db:"max_attempts"`
	SourceFilters json.RawMessage `json:"source_filters" db:"source_filters"`
	TargetBrokers json.RawMessage `json:"target_brokers" db:"target_brokers"`
	OverflowPool  json.RawMessage `json:"overflow_pool" db:"overflow_pool"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at" db:"updated_at"`
}

type SourceFilters struct {
	Statuses    []string `json:"statuses,omitempty"`    // rejected, no_answer, cold
	Countries   []string `json:"countries,omitempty"`
	AgeDaysMax  int      `json:"age_days_max,omitempty"` // only leads from last N days
	Brokers     []string `json:"brokers,omitempty"`       // original broker IDs
}

type QueueItem struct {
	ID              string    `json:"id" db:"id"`
	TenantID        string    `json:"tenant_id" db:"tenant_id"`
	LeadID          string    `json:"lead_id" db:"lead_id"`
	ScenarioID      string    `json:"scenario_id" db:"scenario_id"`
	OriginalBrokerID string   `json:"original_broker_id" db:"original_broker_id"`
	TargetBrokerID  string    `json:"target_broker_id" db:"target_broker_id"`
	Status          string    `json:"status" db:"status"` // pending, processing, completed, failed
	Attempts        int       `json:"attempts" db:"attempts"`
	MaxAttempts     int       `json:"max_attempts" db:"max_attempts"`
	NextAttemptAt   time.Time `json:"next_attempt_at" db:"next_attempt_at"`
	Error           string    `json:"error,omitempty" db:"error"`
	CompletedAt     *time.Time `json:"completed_at,omitempty" db:"completed_at"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// ---------------------------------------------------------------------------
// Scenario CRUD
// ---------------------------------------------------------------------------

func (s *Store) CreateScenario(ctx context.Context, sc *Scenario) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO uad_scenarios
			(tenant_id, name, is_active, mode, schedule, batch_size, throttle_per_min,
			 max_attempts, source_filters, target_brokers, overflow_pool)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		 RETURNING id, created_at, updated_at`,
		sc.TenantID, sc.Name, sc.IsActive, sc.Mode,
		ensureJSON(sc.Schedule), sc.BatchSize, sc.ThrottlePerMin,
		sc.MaxAttempts, ensureJSON(sc.SourceFilters),
		ensureJSON(sc.TargetBrokers), ensureJSON(sc.OverflowPool),
	).Scan(&sc.ID, &sc.CreatedAt, &sc.UpdatedAt)
}

func (s *Store) GetScenario(ctx context.Context, id string) (*Scenario, error) {
	sc := &Scenario{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, is_active, mode, schedule, batch_size,
		        throttle_per_min, max_attempts, source_filters, target_brokers,
		        overflow_pool, created_at, updated_at
		 FROM uad_scenarios WHERE id = $1`,
		id,
	).Scan(&sc.ID, &sc.TenantID, &sc.Name, &sc.IsActive, &sc.Mode, &sc.Schedule,
		&sc.BatchSize, &sc.ThrottlePerMin, &sc.MaxAttempts, &sc.SourceFilters,
		&sc.TargetBrokers, &sc.OverflowPool, &sc.CreatedAt, &sc.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return sc, err
}

func (s *Store) ListScenarios(ctx context.Context, tenantID string) ([]*Scenario, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, is_active, mode, schedule, batch_size,
		        throttle_per_min, max_attempts, source_filters, target_brokers,
		        overflow_pool, created_at, updated_at
		 FROM uad_scenarios WHERE tenant_id = $1 ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scenarios []*Scenario
	for rows.Next() {
		sc := &Scenario{}
		if err := rows.Scan(&sc.ID, &sc.TenantID, &sc.Name, &sc.IsActive, &sc.Mode, &sc.Schedule,
			&sc.BatchSize, &sc.ThrottlePerMin, &sc.MaxAttempts, &sc.SourceFilters,
			&sc.TargetBrokers, &sc.OverflowPool, &sc.CreatedAt, &sc.UpdatedAt); err != nil {
			return nil, err
		}
		scenarios = append(scenarios, sc)
	}
	return scenarios, rows.Err()
}

func (s *Store) UpdateScenario(ctx context.Context, sc *Scenario) error {
	return s.db.Exec(ctx,
		`UPDATE uad_scenarios SET name=$1, is_active=$2, mode=$3, schedule=$4,
		        batch_size=$5, throttle_per_min=$6, max_attempts=$7,
		        source_filters=$8, target_brokers=$9, overflow_pool=$10, updated_at=NOW()
		 WHERE id=$11`,
		sc.Name, sc.IsActive, sc.Mode, ensureJSON(sc.Schedule),
		sc.BatchSize, sc.ThrottlePerMin, sc.MaxAttempts,
		ensureJSON(sc.SourceFilters), ensureJSON(sc.TargetBrokers),
		ensureJSON(sc.OverflowPool), sc.ID,
	)
}

func (s *Store) DeleteScenario(ctx context.Context, id string) error {
	return s.db.Exec(ctx, `DELETE FROM uad_scenarios WHERE id = $1`, id)
}

func (s *Store) GetActiveScenarios(ctx context.Context) ([]*Scenario, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, name, is_active, mode, schedule, batch_size,
		        throttle_per_min, max_attempts, source_filters, target_brokers,
		        overflow_pool, created_at, updated_at
		 FROM uad_scenarios WHERE is_active = true ORDER BY created_at ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scenarios []*Scenario
	for rows.Next() {
		sc := &Scenario{}
		if err := rows.Scan(&sc.ID, &sc.TenantID, &sc.Name, &sc.IsActive, &sc.Mode, &sc.Schedule,
			&sc.BatchSize, &sc.ThrottlePerMin, &sc.MaxAttempts, &sc.SourceFilters,
			&sc.TargetBrokers, &sc.OverflowPool, &sc.CreatedAt, &sc.UpdatedAt); err != nil {
			return nil, err
		}
		scenarios = append(scenarios, sc)
	}
	return scenarios, rows.Err()
}

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

func (s *Store) EnqueueLeads(ctx context.Context, scenarioID, tenantID string, leadIDs []string, targetBrokerID string, maxAttempts int) (int, error) {
	count := 0
	for _, leadID := range leadIDs {
		_, err := s.db.Pool.Exec(ctx,
			`INSERT INTO uad_queue (tenant_id, lead_id, scenario_id, target_broker_id,
			        status, max_attempts, next_attempt_at)
			 VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
			 ON CONFLICT DO NOTHING`,
			tenantID, leadID, scenarioID, nilIfEmpty(targetBrokerID), maxAttempts,
		)
		if err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}

func (s *Store) FetchPendingBatch(ctx context.Context, limit int) ([]*QueueItem, error) {
	rows, err := s.db.Pool.Query(ctx,
		`UPDATE uad_queue SET status = 'processing', updated_at = NOW()
		 WHERE id IN (
		   SELECT id FROM uad_queue
		   WHERE status = 'pending' AND next_attempt_at <= NOW()
		   ORDER BY next_attempt_at ASC
		   LIMIT $1
		   FOR UPDATE SKIP LOCKED
		 )
		 RETURNING id, tenant_id, lead_id, scenario_id, original_broker_id,
		           target_broker_id, status, attempts, max_attempts, next_attempt_at,
		           error, completed_at, created_at`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*QueueItem
	for rows.Next() {
		item := &QueueItem{}
		var origBroker, targetBroker, scenarioID, errStr *string
		if err := rows.Scan(
			&item.ID, &item.TenantID, &item.LeadID, &scenarioID, &origBroker,
			&targetBroker, &item.Status, &item.Attempts, &item.MaxAttempts,
			&item.NextAttemptAt, &errStr, &item.CompletedAt, &item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if origBroker != nil { item.OriginalBrokerID = *origBroker }
		if targetBroker != nil { item.TargetBrokerID = *targetBroker }
		if scenarioID != nil { item.ScenarioID = *scenarioID }
		if errStr != nil { item.Error = *errStr }
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) MarkCompleted(ctx context.Context, queueID, targetBrokerID string) error {
	return s.db.Exec(ctx,
		`UPDATE uad_queue SET status = 'completed', target_broker_id = $1,
		        completed_at = NOW(), updated_at = NOW()
		 WHERE id = $2`,
		nilIfEmpty(targetBrokerID), queueID,
	)
}

func (s *Store) MarkFailed(ctx context.Context, queueID, errMsg string, retryAfter time.Duration) error {
	return s.db.Exec(ctx,
		`UPDATE uad_queue SET
		   status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END,
		   attempts = attempts + 1,
		   error = $1,
		   next_attempt_at = NOW() + $2::interval,
		   updated_at = NOW()
		 WHERE id = $3`,
		errMsg, fmt.Sprintf("%d seconds", int(retryAfter.Seconds())), queueID,
	)
}

// ---------------------------------------------------------------------------
// Lead queries for scenario matching
// ---------------------------------------------------------------------------

func (s *Store) FindLeadsForScenario(ctx context.Context, tenantID string, filters SourceFilters, limit int) ([]string, error) {
	where := []string{"l.tenant_id = $1"}
	args := []interface{}{tenantID}
	idx := 2

	if len(filters.Statuses) > 0 {
		where = append(where, fmt.Sprintf("l.status = ANY($%d)", idx))
		args = append(args, filters.Statuses)
		idx++
	}
	if len(filters.Countries) > 0 {
		where = append(where, fmt.Sprintf("l.country = ANY($%d)", idx))
		args = append(args, filters.Countries)
		idx++
	}
	if filters.AgeDaysMax > 0 {
		where = append(where, fmt.Sprintf("l.created_at > NOW() - interval '%d days'", filters.AgeDaysMax))
	}

	// Exclude leads already in active UAD queue
	where = append(where, "NOT EXISTS (SELECT 1 FROM uad_queue q WHERE q.lead_id = l.id AND q.status IN ('pending','processing'))")

	query := fmt.Sprintf(
		`SELECT l.id FROM leads l WHERE %s ORDER BY l.created_at DESC LIMIT $%d`,
		joinAnd(where), idx,
	)
	args = append(args, limit)

	rows, err := s.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (s *Store) GetQueueStats(ctx context.Context) (pending, processing, completed24h, failed24h int, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT
		   COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), 0),
		   COALESCE(SUM(CASE WHEN status='processing' THEN 1 ELSE 0 END), 0),
		   COALESCE(SUM(CASE WHEN status='completed' AND completed_at > NOW() - interval '24 hours' THEN 1 ELSE 0 END), 0),
		   COALESCE(SUM(CASE WHEN status='failed' AND updated_at > NOW() - interval '24 hours' THEN 1 ELSE 0 END), 0)
		 FROM uad_queue`,
	).Scan(&pending, &processing, &completed24h, &failed24h)
	return
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func joinAnd(parts []string) string {
	result := parts[0]
	for i := 1; i < len(parts); i++ {
		result += " AND " + parts[i]
	}
	return result
}

func ensureJSON(raw json.RawMessage) json.RawMessage {
	if raw == nil || len(raw) == 0 {
		return json.RawMessage("{}")
	}
	return raw
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
