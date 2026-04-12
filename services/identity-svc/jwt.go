package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTManager struct {
	secretKey     []byte
	tokenExpiry   time.Duration
	refreshExpiry time.Duration
}

type Claims struct {
	jwt.RegisteredClaims
	TenantID string `json:"tenant_id"`
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	Email    string `json:"email"`
}

func NewJWTManager(secretKey string, tokenExpiry, refreshExpiry time.Duration) *JWTManager {
	return &JWTManager{
		secretKey:     []byte(secretKey),
		tokenExpiry:   tokenExpiry,
		refreshExpiry: refreshExpiry,
	}
}

func (j *JWTManager) GenerateToken(tenantID, userID, role, email string) (string, time.Time, error) {
	expiresAt := time.Now().Add(j.tokenExpiry)
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "gambchamp",
		},
		TenantID: tenantID,
		UserID:   userID,
		Role:     role,
		Email:    email,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(j.secretKey)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return tokenString, expiresAt, nil
}

func (j *JWTManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return j.secretKey, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}
	return claims, nil
}

// Validate satisfies the middleware.JWTValidator interface.
func (j *JWTManager) Validate(tokenString string) (tenantID, userID, role string, err error) {
	claims, err := j.ValidateToken(tokenString)
	if err != nil {
		return "", "", "", err
	}
	return claims.TenantID, claims.UserID, claims.Role, nil
}

func (j *JWTManager) GenerateRefreshToken() (string, time.Time, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", time.Time{}, err
	}
	token := hex.EncodeToString(bytes)
	return token, time.Now().Add(j.refreshExpiry), nil
}

// HashToken produces a SHA-256 hex digest of the given token string.
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
