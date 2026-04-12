package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/models"
)

// AuditLogFilters holds optional filter criteria for querying the audit log.
type AuditLogFilters struct {
	UserID       string
	Action       string
	ResourceType string
	From         time.Time
	To           time.Time
}

// ---------------------------------------------------------------------------
// GDPR Requests
// ---------------------------------------------------------------------------

// ListGDPRRequests returns a paginated list of GDPR requests for the tenant,
// optionally filtered by status. Returns the requests and the total count.
func (s *Store) ListGDPRRequests(ctx context.Context, tenantID, status string, limit, offset int) ([]models.GDPRRequest, int, error) {
	// Count query
	countSQL := `SELECT count(*) FROM gdpr_requests WHERE tenant_id = $1`
	countArgs := []interface{}{tenantID}
	if status != "" {
		countSQL += ` AND status = $2`
		countArgs = append(countArgs, status)
	}

	var total int
	if err := s.db.Pool.QueryRow(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count gdpr requests: %w", err)
	}

	// Data query
	dataSQL := `SELECT id, tenant_id, request_type, subject_email, COALESCE(subject_data, 'null'::jsonb),
	                   status, completed_at, COALESCE(requested_by,''), COALESCE(processed_by,''),
	                   COALESCE(notes,''), created_at, updated_at
	            FROM gdpr_requests WHERE tenant_id = $1`
	dataArgs := []interface{}{tenantID}
	argIdx := 2

	if status != "" {
		dataSQL += fmt.Sprintf(` AND status = $%d`, argIdx)
		dataArgs = append(dataArgs, status)
		argIdx++
	}

	dataSQL += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, argIdx, argIdx+1)
	dataArgs = append(dataArgs, limit, offset)

	rows, err := s.db.Pool.Query(ctx, dataSQL, dataArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list gdpr requests: %w", err)
	}
	defer rows.Close()

	var requests []models.GDPRRequest
	for rows.Next() {
		var r models.GDPRRequest
		if err := rows.Scan(
			&r.ID, &r.TenantID, &r.RequestType, &r.SubjectEmail, &r.SubjectData,
			&r.Status, &r.CompletedAt, &r.RequestedBy, &r.ProcessedBy,
			&r.Notes, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan gdpr request: %w", err)
		}
		requests = append(requests, r)
	}
	return requests, total, rows.Err()
}

// CreateGDPRRequest inserts a new GDPR request into the database.
func (s *Store) CreateGDPRRequest(ctx context.Context, req *models.GDPRRequest) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO gdpr_requests (tenant_id, request_type, subject_email, subject_data, status, requested_by, notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`,
		req.TenantID, req.RequestType, req.SubjectEmail, nilIfEmpty(string(req.SubjectData)),
		req.Status, nilIfEmpty(req.RequestedBy), nilIfEmpty(req.Notes),
	).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
}

// UpdateGDPRRequest updates the status, processed_by, and notes of an existing GDPR request.
func (s *Store) UpdateGDPRRequest(ctx context.Context, req *models.GDPRRequest) error {
	sql := `UPDATE gdpr_requests SET status = $1, processed_by = $2, notes = $3, updated_at = NOW()`
	args := []interface{}{req.Status, nilIfEmpty(req.ProcessedBy), nilIfEmpty(req.Notes)}

	if req.Status == "completed" || req.Status == "rejected" {
		sql += `, completed_at = NOW()`
	}

	sql += fmt.Sprintf(` WHERE id = $%d AND tenant_id = $%d`, len(args)+1, len(args)+2)
	args = append(args, req.ID, req.TenantID)

	return s.db.Exec(ctx, sql, args...)
}

// ---------------------------------------------------------------------------
// IP Whitelist
// ---------------------------------------------------------------------------

// ListIPWhitelist returns all active IP whitelist entries for the tenant.
func (s *Store) ListIPWhitelist(ctx context.Context, tenantID string) ([]models.IPWhitelistEntry, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, ip_range, COALESCE(description,''), is_active,
		        COALESCE(created_by,''), created_at, expires_at
		 FROM ip_whitelist
		 WHERE tenant_id = $1
		 ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list ip whitelist: %w", err)
	}
	defer rows.Close()

	var entries []models.IPWhitelistEntry
	for rows.Next() {
		var e models.IPWhitelistEntry
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.IPRange, &e.Description, &e.IsActive,
			&e.CreatedBy, &e.CreatedAt, &e.ExpiresAt,
		); err != nil {
			return nil, fmt.Errorf("scan ip whitelist entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// AddIPWhitelist inserts a new IP whitelist entry.
func (s *Store) AddIPWhitelist(ctx context.Context, entry *models.IPWhitelistEntry) error {
	return s.db.Pool.QueryRow(ctx,
		`INSERT INTO ip_whitelist (tenant_id, ip_range, description, created_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, is_active, created_at`,
		entry.TenantID, entry.IPRange, nilIfEmpty(entry.Description),
		nilIfEmpty(entry.CreatedBy), entry.ExpiresAt,
	).Scan(&entry.ID, &entry.IsActive, &entry.CreatedAt)
}

// RemoveIPWhitelist deletes an IP whitelist entry by ID and tenant.
func (s *Store) RemoveIPWhitelist(ctx context.Context, tenantID, id string) error {
	return s.db.Exec(ctx,
		`DELETE FROM ip_whitelist WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	)
}

// ---------------------------------------------------------------------------
// Audit Log (read-only for compliance endpoint)
// ---------------------------------------------------------------------------

// ListAuditLog returns a paginated, filtered list of audit log entries for the tenant.
func (s *Store) ListAuditLog(ctx context.Context, tenantID string, filters AuditLogFilters, limit, offset int) ([]models.AuditLogEntry, int, error) {
	// Build WHERE clause dynamically
	conditions := []string{"tenant_id = $1"}
	args := []interface{}{tenantID}
	argIdx := 2

	if filters.UserID != "" {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIdx))
		args = append(args, filters.UserID)
		argIdx++
	}
	if filters.Action != "" {
		conditions = append(conditions, fmt.Sprintf("action = $%d", argIdx))
		args = append(args, filters.Action)
		argIdx++
	}
	if filters.ResourceType != "" {
		conditions = append(conditions, fmt.Sprintf("resource_type = $%d", argIdx))
		args = append(args, filters.ResourceType)
		argIdx++
	}
	if !filters.From.IsZero() {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIdx))
		args = append(args, filters.From)
		argIdx++
	}
	if !filters.To.IsZero() {
		conditions = append(conditions, fmt.Sprintf("created_at <= $%d", argIdx))
		args = append(args, filters.To)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	// Count
	var total int
	countSQL := fmt.Sprintf(`SELECT count(*) FROM audit_log WHERE %s`, where)
	if err := s.db.Pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count audit log: %w", err)
	}

	// Data
	dataSQL := fmt.Sprintf(
		`SELECT id, COALESCE(tenant_id,''), COALESCE(user_id,''), action, resource_type,
		        COALESCE(resource_id,''), COALESCE(before_state, 'null'::jsonb), COALESCE(after_state, 'null'::jsonb),
		        COALESCE(changes, 'null'::jsonb),
		        COALESCE(host(ip),''), COALESCE(user_agent,''),
		        COALESCE(request_id,''), COALESCE(session_id,''),
		        COALESCE(duration_ms,0), created_at
		 FROM audit_log WHERE %s
		 ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := s.db.Pool.Query(ctx, dataSQL, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list audit log: %w", err)
	}
	defer rows.Close()

	var entries []models.AuditLogEntry
	for rows.Next() {
		var e models.AuditLogEntry
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.UserID, &e.Action, &e.ResourceType,
			&e.ResourceID, &e.BeforeState, &e.AfterState, &e.Changes,
			&e.IP, &e.UserAgent,
			&e.RequestID, &e.SessionID,
			&e.DurationMs, &e.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan audit log entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, total, rows.Err()
}
