package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	logger *slog.Logger
	store  *Store
	jwt    *JWTManager
}

func NewHandler(logger *slog.Logger, store *Store, jwt *JWTManager) *Handler {
	return &Handler{logger: logger, store: store, jwt: jwt}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/auth/register", h.HandleRegister)
	mux.HandleFunc("POST /api/v1/auth/login", h.HandleLogin)
	mux.HandleFunc("POST /api/v1/auth/refresh", h.HandleRefresh)
	mux.HandleFunc("POST /api/v1/auth/logout", h.HandleLogout)
	mux.HandleFunc("GET /api/v1/auth/me", h.HandleMe)
	mux.HandleFunc("POST /api/v1/auth/api-keys", h.HandleCreateAPIKey)
	mux.HandleFunc("POST /api/v1/auth/validate", h.HandleValidate)
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

type RegisterRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	Name         string `json:"name"`
	TenantName   string `json:"tenant_name"`
	Plan         string `json:"plan"`
}

type RegisterResponse struct {
	Token        string         `json:"token"`
	RefreshToken string         `json:"refresh_token"`
	ExpiresAt    time.Time      `json:"expires_at"`
	User         *models.User   `json:"user"`
	Tenant       *models.Tenant `json:"tenant"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token        string       `json:"token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresAt    time.Time    `json:"expires_at"`
	User         *models.User `json:"user"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type CreateAPIKeyRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes"`
}

type CreateAPIKeyResponse struct {
	Key       string      `json:"key"` // returned only once
	ID        string      `json:"id"`
	TenantID  string      `json:"tenant_id"`
	Name      string      `json:"name"`
	KeyPrefix string      `json:"key_prefix"`
	Scopes    interface{} `json:"scopes"`
	IsActive  bool        `json:"is_active"`
	CreatedAt time.Time   `json:"created_at"`
}

type ValidateRequest struct {
	Token  string `json:"token,omitempty"`
	APIKey string `json:"api_key,omitempty"`
}

type ValidateResponse struct {
	Valid    bool   `json:"valid"`
	TenantID string `json:"tenant_id,omitempty"`
	UserID   string `json:"user_id,omitempty"`
	Role     string `json:"role,omitempty"`
	Email    string `json:"email,omitempty"`
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------

func (h *Handler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		errors.NewValidationError("email, password, and name are required").WriteJSON(w)
		return
	}
	if len(req.Password) < 8 {
		errors.NewValidationError("password must be at least 8 characters").WriteJSON(w)
		return
	}

	tenantName := req.TenantName
	if tenantName == "" {
		tenantName = req.Name + "'s Team"
	}
	plan := req.Plan
	if plan == "" {
		plan = "starter"
	}

	ctx := r.Context()

	// Check if user already exists.
	existing, err := h.store.GetUserByEmail(ctx, req.Email)
	if err != nil {
		h.logger.Error("register: check existing user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if existing != nil {
		errors.NewValidationError("email already registered").WriteJSON(w)
		return
	}

	// 1. Create tenant.
	tenant, err := h.store.CreateTenant(ctx, tenantName, plan)
	if err != nil {
		h.logger.Error("register: create tenant", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// 2. Create user with super_admin role.
	user, err := h.store.CreateUser(ctx, tenant.ID, req.Email, req.Password, req.Name, models.RoleSuperAdmin)
	if err != nil {
		h.logger.Error("register: create user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// 3. Generate JWT.
	token, expiresAt, err := h.jwt.GenerateToken(tenant.ID, user.ID, string(user.Role), user.Email)
	if err != nil {
		h.logger.Error("register: generate token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// 4. Generate and store refresh token.
	refreshToken, refreshExpiry, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("register: generate refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if err := h.store.SaveRefreshToken(ctx, user.ID, tenant.ID, HashToken(refreshToken), refreshExpiry); err != nil {
		h.logger.Error("register: save refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.logger.Info("user registered", "email", req.Email, "tenant_id", tenant.ID, "user_id", user.ID)

	writeJSON(w, http.StatusCreated, RegisterResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User:         user,
		Tenant:       tenant,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------

func (h *Handler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.Email == "" || req.Password == "" {
		errors.NewValidationError("email and password are required").WriteJSON(w)
		return
	}

	ctx := r.Context()

	// 1. Find user by email.
	user, err := h.store.GetUserByEmail(ctx, req.Email)
	if err != nil {
		h.logger.Error("login: get user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if user == nil {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	// 2. Verify password.
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	// 3. Check if user is active.
	if !user.IsActive {
		(&errors.AppError{
			Code:       "ACCOUNT_DISABLED",
			Message:    "your account has been disabled",
			HTTPStatus: http.StatusForbidden,
		}).WriteJSON(w)
		return
	}

	// 4. Generate JWT.
	token, expiresAt, err := h.jwt.GenerateToken(user.TenantID, user.ID, string(user.Role), user.Email)
	if err != nil {
		h.logger.Error("login: generate token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// 5. Generate and store refresh token.
	refreshToken, refreshExpiry, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("login: generate refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if err := h.store.SaveRefreshToken(ctx, user.ID, user.TenantID, HashToken(refreshToken), refreshExpiry); err != nil {
		h.logger.Error("login: save refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// 6. Update last_login.
	if err := h.store.UpdateLastLogin(ctx, user.ID); err != nil {
		h.logger.Warn("login: update last_login", "error", err)
		// Non-critical, continue.
	}

	h.logger.Info("user logged in", "email", req.Email, "user_id", user.ID)

	// Clear password hash from response.
	user.PasswordHash = ""

	writeJSON(w, http.StatusOK, LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User:         user,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------

func (h *Handler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.RefreshToken == "" {
		errors.NewValidationError("refresh_token is required").WriteJSON(w)
		return
	}

	ctx := r.Context()
	tokenHash := HashToken(req.RefreshToken)

	// 1. Look up the refresh token.
	userID, tenantID, err := h.store.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		h.logger.Error("refresh: get token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if userID == "" {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	// 2. Get user to include role/email in the new JWT.
	user, err := h.store.GetUserByID(ctx, userID)
	if err != nil {
		h.logger.Error("refresh: get user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if user == nil || !user.IsActive {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	// 3. Rotate: delete old, issue new.
	if err := h.store.DeleteRefreshToken(ctx, tokenHash); err != nil {
		h.logger.Error("refresh: delete old token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	newToken, expiresAt, err := h.jwt.GenerateToken(tenantID, userID, string(user.Role), user.Email)
	if err != nil {
		h.logger.Error("refresh: generate token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	newRefresh, refreshExpiry, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("refresh: generate refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if err := h.store.SaveRefreshToken(ctx, userID, tenantID, HashToken(newRefresh), refreshExpiry); err != nil {
		h.logger.Error("refresh: save refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, RefreshResponse{
		Token:        newToken,
		RefreshToken: newRefresh,
		ExpiresAt:    expiresAt,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------

func (h *Handler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.RefreshToken == "" {
		errors.NewValidationError("refresh_token is required").WriteJSON(w)
		return
	}

	ctx := r.Context()
	tokenHash := HashToken(req.RefreshToken)

	if err := h.store.DeleteRefreshToken(ctx, tokenHash); err != nil {
		h.logger.Error("logout: delete refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------

func (h *Handler) HandleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	user, err := h.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		h.logger.Error("me: get user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if user == nil {
		errors.ErrNotFound.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/api-keys (admin only)
// ---------------------------------------------------------------------------

func (h *Handler) HandleCreateAPIKey(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	// Only super_admin and network_admin can create API keys.
	if claims.Role != string(models.RoleSuperAdmin) && claims.Role != string(models.RoleNetworkAdmin) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	var req CreateAPIKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	if req.Name == "" {
		errors.NewValidationError("name is required").WriteJSON(w)
		return
	}
	if len(req.Scopes) == 0 {
		req.Scopes = []string{"leads:write"}
	}

	key, record, err := h.store.CreateAPIKey(r.Context(), claims.TenantID, req.Name, req.Scopes)
	if err != nil {
		h.logger.Error("create api key", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, CreateAPIKeyResponse{
		Key:       key,
		ID:        record.ID,
		TenantID:  record.TenantID,
		Name:      record.Name,
		KeyPrefix: record.KeyPrefix,
		Scopes:    record.Scopes,
		IsActive:  record.IsActive,
		CreatedAt: record.CreatedAt,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/validate (internal, used by api-gateway)
// ---------------------------------------------------------------------------

func (h *Handler) HandleValidate(w http.ResponseWriter, r *http.Request) {
	var req ValidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	// Validate JWT token.
	if req.Token != "" {
		claims, err := h.jwt.ValidateToken(req.Token)
		if err != nil {
			writeJSON(w, http.StatusOK, ValidateResponse{Valid: false})
			return
		}
		writeJSON(w, http.StatusOK, ValidateResponse{
			Valid:    true,
			TenantID: claims.TenantID,
			UserID:   claims.UserID,
			Role:     claims.Role,
			Email:    claims.Email,
		})
		return
	}

	// Validate API key.
	if req.APIKey != "" {
		tenantID, _, err := h.store.ValidateAPIKey(r.Context(), req.APIKey)
		if err != nil {
			h.logger.Error("validate: api key", "error", err)
			writeJSON(w, http.StatusOK, ValidateResponse{Valid: false})
			return
		}
		if tenantID == "" {
			writeJSON(w, http.StatusOK, ValidateResponse{Valid: false})
			return
		}
		writeJSON(w, http.StatusOK, ValidateResponse{
			Valid:    true,
			TenantID: tenantID,
			Role:     "api_key",
		})
		return
	}

	errors.NewValidationError("token or api_key is required").WriteJSON(w)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// extractClaims reads and validates the JWT from the Authorization header.
func (h *Handler) extractClaims(r *http.Request) (*Claims, bool) {
	auth := r.Header.Get("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return nil, false
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	claims, err := h.jwt.ValidateToken(token)
	if err != nil {
		return nil, false
	}
	return claims, true
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
