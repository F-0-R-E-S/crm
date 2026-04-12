package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/models"
	"golang.org/x/crypto/bcrypt"
)

type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

func (s *Store) CreateTenant(ctx context.Context, name, plan string) (*models.Tenant, error) {
	tenant := &models.Tenant{}
	err := s.db.Pool.QueryRow(ctx,
		`INSERT INTO tenants (name, plan)
		 VALUES ($1, $2)
		 RETURNING id, name, domain, plan, is_active, settings, created_at, updated_at`,
		name, plan,
	).Scan(
		&tenant.ID, &tenant.Name, &tenant.Domain, &tenant.Plan,
		&tenant.IsActive, &tenant.Settings, &tenant.CreatedAt, &tenant.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create tenant: %w", err)
	}
	return tenant, nil
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

func (s *Store) CreateUser(ctx context.Context, tenantID, email, password, name string, role models.Role) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &models.User{}
	err = s.db.Pool.QueryRow(ctx,
		`INSERT INTO users (tenant_id, email, password_hash, name, role)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, email, name, role, is_2fa_enabled, is_active, created_at, updated_at`,
		tenantID, email, string(hash), name, string(role),
	).Scan(
		&user.ID, &user.TenantID, &user.Email, &user.Name, &user.Role,
		&user.Is2FAEnabled, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, password_hash, name, role,
		        is_2fa_enabled, is_active, last_login_at, created_at, updated_at
		 FROM users WHERE email = $1`,
		email,
	).Scan(
		&user.ID, &user.TenantID, &user.Email, &user.PasswordHash, &user.Name, &user.Role,
		&user.Is2FAEnabled, &user.IsActive, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return user, nil
}

func (s *Store) GetUserByID(ctx context.Context, userID string) (*models.User, error) {
	user := &models.User{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, name, role,
		        is_2fa_enabled, is_active, last_login_at, created_at, updated_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(
		&user.ID, &user.TenantID, &user.Email, &user.Name, &user.Role,
		&user.Is2FAEnabled, &user.IsActive, &user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}

func (s *Store) UpdateLastLogin(ctx context.Context, userID string) error {
	return s.db.Exec(ctx, `UPDATE users SET last_login_at = NOW() WHERE id = $1`, userID)
}

// ---------------------------------------------------------------------------
// Refresh tokens
// ---------------------------------------------------------------------------

func (s *Store) SaveRefreshToken(ctx context.Context, userID, tenantID, tokenHash string, expiresAt time.Time) error {
	return s.db.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
		 VALUES ($1, $2, $3, $4)`,
		userID, tenantID, tokenHash, expiresAt,
	)
}

func (s *Store) GetRefreshToken(ctx context.Context, tokenHash string) (userID, tenantID string, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT user_id, tenant_id
		 FROM refresh_tokens
		 WHERE token_hash = $1 AND expires_at > NOW()`,
		tokenHash,
	).Scan(&userID, &tenantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", nil
		}
		return "", "", fmt.Errorf("get refresh token: %w", err)
	}
	return userID, tenantID, nil
}

func (s *Store) DeleteRefreshToken(ctx context.Context, tokenHash string) error {
	return s.db.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash = $1`, tokenHash)
}

func (s *Store) DeleteUserRefreshTokens(ctx context.Context, userID string) error {
	return s.db.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, userID)
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

func (s *Store) CreateAPIKey(ctx context.Context, tenantID, name string, scopes []string) (string, *models.APIKeyRecord, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", nil, err
	}
	key := "gc_" + hex.EncodeToString(raw)
	prefix := key[:8] // VARCHAR(8) in schema
	keyHash := HashToken(key)

	scopesJSON, err := json.Marshal(scopes)
	if err != nil {
		return "", nil, fmt.Errorf("marshal scopes: %w", err)
	}

	var (
		id        string
		tid       string
		n         string
		kp        string
		scopesRaw []byte
		isActive  bool
		createdAt time.Time
	)
	err = s.db.Pool.QueryRow(ctx,
		`INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes)
		 VALUES ($1, $2, $3, $4, $5::jsonb)
		 RETURNING id, tenant_id, name, key_prefix, scopes, is_active, created_at`,
		tenantID, name, keyHash, prefix, scopesJSON,
	).Scan(&id, &tid, &n, &kp, &scopesRaw, &isActive, &createdAt)
	if err != nil {
		return "", nil, fmt.Errorf("create api key: %w", err)
	}

	var parsedScopes []string
	if err := json.Unmarshal(scopesRaw, &parsedScopes); err != nil {
		parsedScopes = scopes // fallback to input
	}

	record := &models.APIKeyRecord{
		ID:        id,
		TenantID:  tid,
		Name:      n,
		KeyPrefix: kp,
		Scopes:    parsedScopes,
		IsActive:  isActive,
		CreatedAt: createdAt,
	}
	return key, record, nil
}

func (s *Store) ValidateAPIKey(ctx context.Context, apiKey string) (tenantID string, scopes []byte, err error) {
	keyHash := HashToken(apiKey)
	err = s.db.Pool.QueryRow(ctx,
		`SELECT tenant_id, scopes FROM api_keys WHERE key_hash = $1 AND is_active = true`,
		keyHash,
	).Scan(&tenantID, &scopes)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil, nil
		}
		return "", nil, fmt.Errorf("validate api key: %w", err)
	}
	_, _ = s.db.Pool.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1`, keyHash)
	return tenantID, scopes, nil
}

// ---------------------------------------------------------------------------
// Sessions (EPIC-06)
// ---------------------------------------------------------------------------

func (s *Store) CreateSession(ctx context.Context, userID, tenantID, tokenHash, ip, userAgent, deviceName string, expiresAt time.Time) (*models.Session, error) {
	sess := &models.Session{}
	err := s.db.Pool.QueryRow(ctx,
		`INSERT INTO sessions (user_id, tenant_id, token_hash, ip, user_agent, device_name, expires_at)
		 VALUES ($1, $2, $3, $4::inet, $5, $6, $7)
		 RETURNING id, user_id, tenant_id, COALESCE(host(ip),''), COALESCE(user_agent,''), COALESCE(device_name,''), last_active_at, expires_at, created_at`,
		userID, tenantID, tokenHash, nilIfEmpty(ip), userAgent, deviceName, expiresAt,
	).Scan(
		&sess.ID, &sess.UserID, &sess.TenantID, &sess.IP, &sess.UserAgent,
		&sess.DeviceName, &sess.LastActiveAt, &sess.ExpiresAt, &sess.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}
	return sess, nil
}

func (s *Store) ListUserSessions(ctx context.Context, userID, tenantID string) ([]*models.Session, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, user_id, tenant_id, COALESCE(host(ip),''), COALESCE(user_agent,''),
		        COALESCE(device_name,''), last_active_at, expires_at, created_at
		 FROM sessions
		 WHERE user_id = $1 AND tenant_id = $2 AND expires_at > NOW()
		 ORDER BY last_active_at DESC`,
		userID, tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []*models.Session
	for rows.Next() {
		sess := &models.Session{}
		if err := rows.Scan(
			&sess.ID, &sess.UserID, &sess.TenantID, &sess.IP, &sess.UserAgent,
			&sess.DeviceName, &sess.LastActiveAt, &sess.ExpiresAt, &sess.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, sess)
	}
	return sessions, rows.Err()
}

func (s *Store) DeleteSessionByID(ctx context.Context, sessionID, userID string) error {
	return s.db.Exec(ctx,
		`DELETE FROM sessions WHERE id = $1 AND user_id = $2`,
		sessionID, userID,
	)
}

func (s *Store) DeleteOtherSessions(ctx context.Context, userID, currentTokenHash string) error {
	return s.db.Exec(ctx,
		`DELETE FROM sessions WHERE user_id = $1 AND token_hash != $2`,
		userID, currentTokenHash,
	)
}

func (s *Store) TouchSession(ctx context.Context, tokenHash string) error {
	return s.db.Exec(ctx,
		`UPDATE sessions SET last_active_at = NOW() WHERE token_hash = $1`,
		tokenHash,
	)
}

func (s *Store) GetSessionByTokenHash(ctx context.Context, tokenHash string) (userID, tenantID string, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT user_id, tenant_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()`,
		tokenHash,
	).Scan(&userID, &tenantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", nil
		}
		return "", "", fmt.Errorf("get session: %w", err)
	}
	return userID, tenantID, nil
}

func (s *Store) DeleteSessionByTokenHash(ctx context.Context, tokenHash string) error {
	return s.db.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
}

// ---------------------------------------------------------------------------
// User invites (EPIC-06)
// ---------------------------------------------------------------------------

func (s *Store) CreateInvite(ctx context.Context, tenantID, email, role, name, tokenHash, invitedBy string, expiresAt time.Time) (*models.UserInvite, error) {
	inv := &models.UserInvite{}
	err := s.db.Pool.QueryRow(ctx,
		`INSERT INTO user_invites (tenant_id, email, role, name, token_hash, invited_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, email, role, name, invited_by, accepted_at, expires_at, created_at`,
		tenantID, email, role, name, tokenHash, invitedBy, expiresAt,
	).Scan(
		&inv.ID, &inv.TenantID, &inv.Email, &inv.Role, &inv.Name,
		&inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create invite: %w", err)
	}
	return inv, nil
}

func (s *Store) GetInviteByToken(ctx context.Context, tokenHash string) (*models.UserInvite, error) {
	inv := &models.UserInvite{}
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, role, COALESCE(name,''), invited_by, accepted_at, expires_at, created_at
		 FROM user_invites
		 WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(
		&inv.ID, &inv.TenantID, &inv.Email, &inv.Role, &inv.Name,
		&inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get invite: %w", err)
	}
	return inv, nil
}

func (s *Store) AcceptInvite(ctx context.Context, inviteID string) error {
	return s.db.Exec(ctx,
		`UPDATE user_invites SET accepted_at = NOW() WHERE id = $1`,
		inviteID,
	)
}

func (s *Store) ListPendingInvites(ctx context.Context, tenantID string) ([]*models.UserInvite, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, email, role, COALESCE(name,''), invited_by, accepted_at, expires_at, created_at
		 FROM user_invites
		 WHERE tenant_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
		 ORDER BY created_at DESC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list invites: %w", err)
	}
	defer rows.Close()

	var invites []*models.UserInvite
	for rows.Next() {
		inv := &models.UserInvite{}
		if err := rows.Scan(
			&inv.ID, &inv.TenantID, &inv.Email, &inv.Role, &inv.Name,
			&inv.InvitedBy, &inv.AcceptedAt, &inv.ExpiresAt, &inv.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan invite: %w", err)
		}
		invites = append(invites, inv)
	}
	return invites, rows.Err()
}

func (s *Store) DeleteInvite(ctx context.Context, inviteID, tenantID string) error {
	return s.db.Exec(ctx,
		`DELETE FROM user_invites WHERE id = $1 AND tenant_id = $2`,
		inviteID, tenantID,
	)
}

// ---------------------------------------------------------------------------
// Password resets (EPIC-06)
// ---------------------------------------------------------------------------

func (s *Store) CreatePasswordReset(ctx context.Context, userID, tenantID, tokenHash string, expiresAt time.Time) error {
	return s.db.Exec(ctx,
		`INSERT INTO password_resets (user_id, tenant_id, token_hash, expires_at)
		 VALUES ($1, $2, $3, $4)`,
		userID, tenantID, tokenHash, expiresAt,
	)
}

func (s *Store) GetPasswordReset(ctx context.Context, tokenHash string) (userID, tenantID string, err error) {
	err = s.db.Pool.QueryRow(ctx,
		`SELECT user_id, tenant_id
		 FROM password_resets
		 WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
		tokenHash,
	).Scan(&userID, &tenantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", nil
		}
		return "", "", fmt.Errorf("get password reset: %w", err)
	}
	return userID, tenantID, nil
}

func (s *Store) MarkPasswordResetUsed(ctx context.Context, tokenHash string) error {
	return s.db.Exec(ctx,
		`UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1`,
		tokenHash,
	)
}

// ---------------------------------------------------------------------------
// Password change
// ---------------------------------------------------------------------------

func (s *Store) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	return s.db.Exec(ctx,
		`UPDATE users SET password_hash = $2 WHERE id = $1`,
		userID, passwordHash,
	)
}

// ---------------------------------------------------------------------------
// Users management (EPIC-06)
// ---------------------------------------------------------------------------

func (s *Store) ListUsers(ctx context.Context, tenantID string, limit, offset int) ([]*models.User, int, error) {
	var total int
	if err := s.db.Pool.QueryRow(ctx,
		`SELECT count(*) FROM users WHERE tenant_id = $1`, tenantID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}

	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, tenant_id, email, name, role, is_2fa_enabled, is_active, last_login_at, created_at, updated_at
		 FROM users WHERE tenant_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(
			&u.ID, &u.TenantID, &u.Email, &u.Name, &u.Role,
			&u.Is2FAEnabled, &u.IsActive, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (s *Store) UpdateUserRole(ctx context.Context, userID, tenantID string, role models.Role) error {
	return s.db.Exec(ctx,
		`UPDATE users SET role = $3 WHERE id = $1 AND tenant_id = $2`,
		userID, tenantID, string(role),
	)
}

func (s *Store) DeactivateUser(ctx context.Context, userID, tenantID string) error {
	return s.db.Exec(ctx,
		`UPDATE users SET is_active = false WHERE id = $1 AND tenant_id = $2`,
		userID, tenantID,
	)
}

func (s *Store) ActivateUser(ctx context.Context, userID, tenantID string) error {
	return s.db.Exec(ctx,
		`UPDATE users SET is_active = true WHERE id = $1 AND tenant_id = $2`,
		userID, tenantID,
	)
}

// ---------------------------------------------------------------------------
// Audit log (EPIC-06)
// ---------------------------------------------------------------------------

func (s *Store) WriteAuditLog(ctx context.Context, tenantID, userID, action, resourceType, resourceID, ip, userAgent string, beforeState, afterState []byte) error {
	return s.db.Exec(ctx,
		`INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id, before_state, after_state, ip, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9)`,
		tenantID, nilIfEmpty(userID), action, resourceType, nilIfEmpty(resourceID),
		nilIfEmpty(string(beforeState)), nilIfEmpty(string(afterState)),
		nilIfEmpty(ip), nilIfEmpty(userAgent),
	)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
