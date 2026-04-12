package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/google/uuid"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /api/v1/auth/register", http.HandlerFunc(h.Register_))
	mux.Handle("POST /api/v1/auth/login", http.HandlerFunc(h.Login))
	mux.Handle("POST /api/v1/auth/refresh", http.HandlerFunc(h.Refresh))
}

// --- Register ---

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type RegisterResponse struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

func (h *Handler) Register_(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		errors.NewValidationError("email, password, and name are required").WriteJSON(w)
		return
	}

	h.logger.Info("user registration", "email", req.Email)

	// TODO: hash password, create user + tenant, persist to DB
	resp := RegisterResponse{
		UserID:    uuid.New().String(),
		Email:     req.Email,
		Name:      req.Name,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// --- Login ---

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.Email == "" || req.Password == "" {
		errors.NewValidationError("email and password are required").WriteJSON(w)
		return
	}

	h.logger.Info("user login attempt", "email", req.Email)

	// TODO: verify credentials, generate JWT
	resp := TokenResponse{
		AccessToken:  "stub-access-token-" + uuid.New().String(),
		RefreshToken: "stub-refresh-token-" + uuid.New().String(),
		TokenType:    "Bearer",
		ExpiresIn:    3600,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// --- Refresh ---

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.RefreshToken == "" {
		errors.NewValidationError("refresh_token is required").WriteJSON(w)
		return
	}

	h.logger.Info("token refresh requested")

	// TODO: validate refresh token, issue new pair
	resp := TokenResponse{
		AccessToken:  "stub-access-token-" + uuid.New().String(),
		RefreshToken: "stub-refresh-token-" + uuid.New().String(),
		TokenType:    "Bearer",
		ExpiresIn:    3600,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
