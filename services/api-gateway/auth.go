package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// AuthInfo holds the identity information extracted from a JWT or API key.
type AuthInfo struct {
	TenantID string
	UserID   string
	Role     string
	Email    string
}

// Authenticator handles both local JWT validation and remote API key validation.
type Authenticator struct {
	jwtSecret   []byte
	identityURL string
	httpClient  *http.Client
}

// NewAuthenticator creates an Authenticator with the shared JWT secret and identity-svc base URL.
func NewAuthenticator(jwtSecret, identityURL string) *Authenticator {
	return &Authenticator{
		jwtSecret:   []byte(jwtSecret),
		identityURL: strings.TrimRight(identityURL, "/"),
		httpClient:  &http.Client{Timeout: 5 * time.Second},
	}
}

// ValidateJWT validates a Bearer token locally using the shared HMAC secret.
func (a *Authenticator) ValidateJWT(tokenString string) (*AuthInfo, error) {
	claims := &struct {
		jwt.RegisteredClaims
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
		Role     string `json:"role"`
		Email    string `json:"email"`
	}{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	return &AuthInfo{
		TenantID: claims.TenantID,
		UserID:   claims.UserID,
		Role:     claims.Role,
		Email:    claims.Email,
	}, nil
}

// ValidateAPIKey validates an API key by calling identity-svc /api/v1/auth/validate.
func (a *Authenticator) ValidateAPIKey(ctx context.Context, apiKey string) (*AuthInfo, error) {
	body, err := json.Marshal(map[string]string{"api_key": apiKey})
	if err != nil {
		return nil, fmt.Errorf("marshal api key request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", a.identityURL+"/api/v1/auth/validate", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("identity-svc request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid api key (status %d)", resp.StatusCode)
	}

	var result struct {
		Valid    bool   `json:"valid"`
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
		Role     string `json:"role"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode identity response: %w", err)
	}
	if !result.Valid {
		return nil, fmt.Errorf("invalid api key")
	}

	return &AuthInfo{
		TenantID: result.TenantID,
		UserID:   result.UserID,
		Role:     result.Role,
	}, nil
}
