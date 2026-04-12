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
	// Update last_used_at (non-critical).
	_, _ = s.db.Pool.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1`, keyHash)
	return tenantID, scopes, nil
}
