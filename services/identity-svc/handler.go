package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/rbac"
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

	// EPIC-06: Sessions
	mux.HandleFunc("GET /api/v1/auth/sessions", h.HandleListSessions)
	mux.HandleFunc("DELETE /api/v1/auth/sessions/{id}", h.HandleRevokeSession)
	mux.HandleFunc("DELETE /api/v1/auth/sessions", h.HandleRevokeOtherSessions)

	// EPIC-06: Invites
	mux.HandleFunc("POST /api/v1/auth/invites", h.HandleCreateInvite)
	mux.HandleFunc("GET /api/v1/auth/invites", h.HandleListInvites)
	mux.HandleFunc("DELETE /api/v1/auth/invites/{id}", h.HandleDeleteInvite)
	mux.HandleFunc("POST /api/v1/auth/accept-invite", h.HandleAcceptInvite)

	// EPIC-06: Password management
	mux.HandleFunc("POST /api/v1/auth/change-password", h.HandleChangePassword)
	mux.HandleFunc("POST /api/v1/auth/forgot-password", h.HandleForgotPassword)
	mux.HandleFunc("POST /api/v1/auth/reset-password", h.HandleResetPassword)

	// EPIC-06: Roles & permissions
	mux.HandleFunc("GET /api/v1/auth/permissions", h.HandleMyPermissions)
	mux.HandleFunc("GET /api/v1/roles", h.HandleListRoles)

	// EPIC-06: User management
	mux.HandleFunc("GET /api/v1/users", h.HandleListUsers)
	mux.HandleFunc("PATCH /api/v1/users/{id}/role", h.HandleUpdateUserRole)
	mux.HandleFunc("POST /api/v1/users/{id}/deactivate", h.HandleDeactivateUser)
	mux.HandleFunc("POST /api/v1/users/{id}/activate", h.HandleActivateUser)
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

	// 4. Generate refresh token and create session.
	refreshToken, refreshExpiry, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("register: generate refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.Header.Get("User-Agent")
	if _, err := h.store.CreateSession(ctx, user.ID, tenant.ID, HashToken(refreshToken), ip, ua, parseDeviceName(ua), refreshExpiry); err != nil {
		h.logger.Error("register: create session", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(ctx, tenant.ID, user.ID, "user.registered", "user", user.ID, r)

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

	// 5. Generate refresh token and create session.
	refreshToken, refreshExpiry, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("login: generate refresh token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.Header.Get("User-Agent")
	if _, err := h.store.CreateSession(ctx, user.ID, user.TenantID, HashToken(refreshToken), ip, ua, parseDeviceName(ua), refreshExpiry); err != nil {
		h.logger.Error("login: create session", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// 6. Update last_login.
	if err := h.store.UpdateLastLogin(ctx, user.ID); err != nil {
		h.logger.Warn("login: update last_login", "error", err)
	}

	h.auditLog(ctx, user.TenantID, user.ID, "user.login", "user", user.ID, r)

	h.logger.Info("user logged in", "email", req.Email, "user_id", user.ID)

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

	userID, tenantID, err := h.store.GetSessionByTokenHash(ctx, tokenHash)
	if err != nil {
		h.logger.Error("refresh: get session", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if userID == "" {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

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

	// Rotate: delete old session, create new.
	_ = h.store.DeleteSessionByTokenHash(ctx, tokenHash)

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

	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.Header.Get("User-Agent")
	if _, err := h.store.CreateSession(ctx, userID, tenantID, HashToken(newRefresh), ip, ua, parseDeviceName(ua), refreshExpiry); err != nil {
		h.logger.Error("refresh: create session", "error", err)
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

	if err := h.store.DeleteSessionByTokenHash(ctx, tokenHash); err != nil {
		h.logger.Error("logout: delete session", "error", err)
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
// GET /api/v1/auth/sessions
// ---------------------------------------------------------------------------

func (h *Handler) HandleListSessions(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	sessions, err := h.store.ListUserSessions(r.Context(), claims.UserID, claims.TenantID)
	if err != nil {
		h.logger.Error("list sessions", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// Mark current session.
	currentHash := h.currentTokenHash(r)
	for _, s := range sessions {
		// We can't compare directly since we only have access token, not refresh token hash.
		// Mark by IP+UA match as best-effort.
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.RemoteAddr
		}
		if s.IP == ip && s.UserAgent == r.Header.Get("User-Agent") {
			s.Current = true
		}
	}
	_ = currentHash

	writeJSON(w, http.StatusOK, map[string]interface{}{"sessions": sessions})
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/auth/sessions/{id}
// ---------------------------------------------------------------------------

func (h *Handler) HandleRevokeSession(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	sessionID := r.PathValue("id")
	if sessionID == "" {
		errors.NewBadRequest("session id required").WriteJSON(w)
		return
	}

	if err := h.store.DeleteSessionByID(r.Context(), sessionID, claims.UserID); err != nil {
		h.logger.Error("revoke session", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(r.Context(), claims.TenantID, claims.UserID, "session.revoked", "session", sessionID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "session revoked"})
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/auth/sessions (revoke all except current)
// ---------------------------------------------------------------------------

func (h *Handler) HandleRevokeOtherSessions(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	currentHash := h.currentTokenHash(r)
	if err := h.store.DeleteOtherSessions(r.Context(), claims.UserID, currentHash); err != nil {
		h.logger.Error("revoke other sessions", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(r.Context(), claims.TenantID, claims.UserID, "sessions.revoked_all", "user", claims.UserID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "other sessions revoked"})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/invites
// ---------------------------------------------------------------------------

type InviteRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	Name  string `json:"name"`
}

func (h *Handler) HandleCreateInvite(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersInvite) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	var req InviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}
	if req.Email == "" || req.Role == "" {
		errors.NewValidationError("email and role are required").WriteJSON(w)
		return
	}
	if !models.ValidRoles[models.Role(req.Role)] {
		errors.NewValidationError("invalid role").WriteJSON(w)
		return
	}

	// Generate invite token.
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		errors.ErrInternal.WriteJSON(w)
		return
	}
	token := hex.EncodeToString(tokenBytes)
	tokenHash := HashToken(token)

	expiresAt := time.Now().Add(72 * time.Hour)

	invite, err := h.store.CreateInvite(r.Context(), claims.TenantID, req.Email, req.Role, req.Name, tokenHash, claims.UserID, expiresAt)
	if err != nil {
		h.logger.Error("create invite", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(r.Context(), claims.TenantID, claims.UserID, "user.invited", "invite", invite.ID, r)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"invite":      invite,
		"invite_token": token,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/auth/invites
// ---------------------------------------------------------------------------

func (h *Handler) HandleListInvites(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersRead) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	invites, err := h.store.ListPendingInvites(r.Context(), claims.TenantID)
	if err != nil {
		h.logger.Error("list invites", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"invites": invites})
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/auth/invites/{id}
// ---------------------------------------------------------------------------

func (h *Handler) HandleDeleteInvite(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersInvite) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	inviteID := r.PathValue("id")
	if err := h.store.DeleteInvite(r.Context(), inviteID, claims.TenantID); err != nil {
		h.logger.Error("delete invite", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "invite deleted"})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/accept-invite
// ---------------------------------------------------------------------------

type AcceptInviteRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (h *Handler) HandleAcceptInvite(w http.ResponseWriter, r *http.Request) {
	var req AcceptInviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}
	if req.Token == "" || req.Password == "" {
		errors.NewValidationError("token and password are required").WriteJSON(w)
		return
	}
	if len(req.Password) < 8 {
		errors.NewValidationError("password must be at least 8 characters").WriteJSON(w)
		return
	}

	ctx := r.Context()
	tokenHash := HashToken(req.Token)

	invite, err := h.store.GetInviteByToken(ctx, tokenHash)
	if err != nil {
		h.logger.Error("accept invite: get invite", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if invite == nil {
		errors.NewBadRequest("invalid or expired invite").WriteJSON(w)
		return
	}

	name := req.Name
	if name == "" {
		name = invite.Name
	}
	if name == "" {
		name = invite.Email
	}

	user, err := h.store.CreateUser(ctx, invite.TenantID, invite.Email, req.Password, name, models.Role(invite.Role))
	if err != nil {
		h.logger.Error("accept invite: create user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	if err := h.store.AcceptInvite(ctx, invite.ID); err != nil {
		h.logger.Error("accept invite: mark accepted", "error", err)
	}

	// Auto-login the new user.
	token, expiresAt, err := h.jwt.GenerateToken(invite.TenantID, user.ID, string(user.Role), user.Email)
	if err != nil {
		h.logger.Error("accept invite: generate token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	refreshToken, refreshExpiry, err := h.jwt.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("accept invite: generate refresh", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	ua := r.Header.Get("User-Agent")
	h.store.CreateSession(ctx, user.ID, invite.TenantID, HashToken(refreshToken), ip, ua, parseDeviceName(ua), refreshExpiry)

	h.auditLog(ctx, invite.TenantID, user.ID, "user.invite_accepted", "user", user.ID, r)

	writeJSON(w, http.StatusCreated, LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		User:         user,
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/change-password
// ---------------------------------------------------------------------------

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) HandleChangePassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		errors.NewValidationError("current_password and new_password are required").WriteJSON(w)
		return
	}
	if len(req.NewPassword) < 8 {
		errors.NewValidationError("new password must be at least 8 characters").WriteJSON(w)
		return
	}

	ctx := r.Context()
	user, err := h.store.GetUserByEmail(ctx, claims.Email)
	if err != nil || user == nil {
		h.logger.Error("change password: get user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		errors.NewValidationError("current password is incorrect").WriteJSON(w)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		errors.ErrInternal.WriteJSON(w)
		return
	}

	if err := h.store.UpdatePassword(ctx, claims.UserID, string(hash)); err != nil {
		h.logger.Error("change password: update", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(ctx, claims.TenantID, claims.UserID, "user.password_changed", "user", claims.UserID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "password changed"})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// ---------------------------------------------------------------------------

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

func (h *Handler) HandleForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}

	// Always return success to prevent email enumeration.
	ctx := r.Context()
	user, _ := h.store.GetUserByEmail(ctx, req.Email)
	if user == nil || !user.IsActive {
		writeJSON(w, http.StatusOK, map[string]string{"message": "if an account exists, a reset link has been sent"})
		return
	}

	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)
	tokenHash := HashToken(token)

	expiresAt := time.Now().Add(1 * time.Hour)
	if err := h.store.CreatePasswordReset(ctx, user.ID, user.TenantID, tokenHash, expiresAt); err != nil {
		h.logger.Error("forgot password: create reset", "error", err)
	}

	// TODO: Send email with reset token via notification-svc.
	h.logger.Info("password reset requested", "email", req.Email, "reset_token", token)

	h.auditLog(ctx, user.TenantID, user.ID, "user.password_reset_requested", "user", user.ID, r)
	writeJSON(w, http.StatusOK, map[string]string{
		"message":     "if an account exists, a reset link has been sent",
		"reset_token": token, // Remove in production — only for dev/testing.
	})
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/reset-password
// ---------------------------------------------------------------------------

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) HandleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}
	if req.Token == "" || req.NewPassword == "" {
		errors.NewValidationError("token and new_password are required").WriteJSON(w)
		return
	}
	if len(req.NewPassword) < 8 {
		errors.NewValidationError("password must be at least 8 characters").WriteJSON(w)
		return
	}

	ctx := r.Context()
	tokenHash := HashToken(req.Token)

	userID, tenantID, err := h.store.GetPasswordReset(ctx, tokenHash)
	if err != nil {
		h.logger.Error("reset password: get token", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if userID == "" {
		errors.NewBadRequest("invalid or expired reset token").WriteJSON(w)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		errors.ErrInternal.WriteJSON(w)
		return
	}

	if err := h.store.UpdatePassword(ctx, userID, string(hash)); err != nil {
		h.logger.Error("reset password: update", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	_ = h.store.MarkPasswordResetUsed(ctx, tokenHash)

	// Invalidate all existing sessions for security.
	_ = h.store.DeleteUserRefreshTokens(ctx, userID)

	h.auditLog(ctx, tenantID, userID, "user.password_reset", "user", userID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "password reset successfully"})
}

// ---------------------------------------------------------------------------
// GET /api/v1/auth/permissions
// ---------------------------------------------------------------------------

func (h *Handler) HandleMyPermissions(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := rbac.PermissionsForRole(models.Role(claims.Role))
	permStrings := make([]string, len(perms))
	for i, p := range perms {
		permStrings[i] = string(p)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"role":        claims.Role,
		"permissions": permStrings,
	})
}

// ---------------------------------------------------------------------------
// GET /api/v1/roles
// ---------------------------------------------------------------------------

func (h *Handler) HandleListRoles(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermRolesRead) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"roles": ListRoles()})
}

// ---------------------------------------------------------------------------
// GET /api/v1/users
// ---------------------------------------------------------------------------

func (h *Handler) HandleListUsers(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersRead) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	limit := 20
	offset := 0
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	users, total, err := h.store.ListUsers(r.Context(), claims.TenantID, limit, offset)
	if err != nil {
		h.logger.Error("list users", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
		"total": total,
	})
}

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/{id}/role
// ---------------------------------------------------------------------------

type UpdateRoleRequest struct {
	Role string `json:"role"`
}

func (h *Handler) HandleUpdateUserRole(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersWrite) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	userID := r.PathValue("id")
	if userID == claims.UserID {
		errors.NewValidationError("cannot change your own role").WriteJSON(w)
		return
	}

	var req UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}
	if !models.ValidRoles[models.Role(req.Role)] {
		errors.NewValidationError("invalid role").WriteJSON(w)
		return
	}

	if err := h.store.UpdateUserRole(r.Context(), userID, claims.TenantID, models.Role(req.Role)); err != nil {
		h.logger.Error("update user role", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(r.Context(), claims.TenantID, claims.UserID, "user.role_changed", "user", userID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "role updated"})
}

// ---------------------------------------------------------------------------
// POST /api/v1/users/{id}/deactivate
// ---------------------------------------------------------------------------

func (h *Handler) HandleDeactivateUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersDelete) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	userID := r.PathValue("id")
	if userID == claims.UserID {
		errors.NewValidationError("cannot deactivate yourself").WriteJSON(w)
		return
	}

	if err := h.store.DeactivateUser(r.Context(), userID, claims.TenantID); err != nil {
		h.logger.Error("deactivate user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// Invalidate all sessions for deactivated user.
	_ = h.store.DeleteUserRefreshTokens(r.Context(), userID)

	h.auditLog(r.Context(), claims.TenantID, claims.UserID, "user.deactivated", "user", userID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "user deactivated"})
}

// ---------------------------------------------------------------------------
// POST /api/v1/users/{id}/activate
// ---------------------------------------------------------------------------

func (h *Handler) HandleActivateUser(w http.ResponseWriter, r *http.Request) {
	claims, ok := h.extractClaims(r)
	if !ok {
		errors.ErrUnauthorized.WriteJSON(w)
		return
	}

	perms := PermissionsForRole(models.Role(claims.Role))
	if !perms.Has(PermUsersWrite) {
		errors.ErrForbidden.WriteJSON(w)
		return
	}

	userID := r.PathValue("id")
	if err := h.store.ActivateUser(r.Context(), userID, claims.TenantID); err != nil {
		h.logger.Error("activate user", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	h.auditLog(r.Context(), claims.TenantID, claims.UserID, "user.activated", "user", userID, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "user activated"})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

func (h *Handler) currentTokenHash(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return ""
	}
	return HashToken(strings.TrimPrefix(auth, "Bearer "))
}

func (h *Handler) auditLog(ctx context.Context, tenantID, userID, action, resourceType, resourceID string, r *http.Request) {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	if err := h.store.WriteAuditLog(ctx, tenantID, userID, action, resourceType, resourceID, ip, r.Header.Get("User-Agent"), nil, nil); err != nil {
		h.logger.Warn("audit log write failed", "action", action, "error", err)
	}
}

func parseDeviceName(userAgent string) string {
	ua := strings.ToLower(userAgent)
	switch {
	case strings.Contains(ua, "mobile") || strings.Contains(ua, "android") || strings.Contains(ua, "iphone"):
		return "Mobile"
	case strings.Contains(ua, "tablet") || strings.Contains(ua, "ipad"):
		return "Tablet"
	case strings.Contains(ua, "postman"):
		return "Postman"
	case strings.Contains(ua, "curl"):
		return "curl"
	case userAgent != "":
		return "Desktop"
	default:
		return "Unknown"
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
