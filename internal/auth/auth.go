// Package auth provides authentication and 2FA services.
package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"

	"github.com/gambchamp/crm/internal/config"
	"github.com/gambchamp/crm/internal/db/sqlc"
)

// ErrInvalidCredentials indicates wrong email/password.
var ErrInvalidCredentials = fmt.Errorf("invalid credentials")

// ErrTOTPRequired indicates the user has 2FA enabled.
var ErrTOTPRequired = fmt.Errorf("2fa required")

// ErrInvalidTOTP indicates a bad TOTP code.
var ErrInvalidTOTP = fmt.Errorf("invalid totp code")

// ErrSessionExpired indicates a refresh token's session is gone or expired.
var ErrSessionExpired = fmt.Errorf("session expired")

// TokenPair holds access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// Service handles authentication operations.
type Service struct {
	DB  *sqlc.Queries
	Cfg *config.Config
}

// NewService creates an auth service.
func NewService(db *sqlc.Queries, cfg *config.Config) *Service {
	return &Service{DB: db, Cfg: cfg}
}

// Login authenticates a user by email and password.
func (s *Service) Login(ctx context.Context, companyID uuid.UUID, email, password, ip, userAgent string) (*TokenPair, error) {
	user, err := s.DB.GetUserByEmail(ctx, sqlc.GetUserByEmailParams{
		Email:     email,
		CompanyID: companyID,
	})
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.Status != "active" {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	if user.TotpEnabled {
		return nil, ErrTOTPRequired
	}

	return s.issueTokens(ctx, user, ip, userAgent)
}

// LoginWithTOTP authenticates a user with email, password, and TOTP code.
func (s *Service) LoginWithTOTP(ctx context.Context, companyID uuid.UUID, email, password, code, ip, userAgent string) (*TokenPair, error) {
	user, err := s.DB.GetUserByEmail(ctx, sqlc.GetUserByEmailParams{
		Email:     email,
		CompanyID: companyID,
	})
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if user.Status != "active" {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	if user.TotpSecret == nil || !user.TotpEnabled {
		return nil, ErrInvalidTOTP
	}

	if !totp.Validate(code, *user.TotpSecret) {
		return nil, ErrInvalidTOTP
	}

	return s.issueTokens(ctx, user, ip, userAgent)
}

// Refresh issues a new token pair given a valid refresh token.
func (s *Service) Refresh(ctx context.Context, refreshToken, ip, userAgent string) (*TokenPair, error) {
	claims := &refreshClaims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(_ *jwt.Token) (any, error) {
		return []byte(s.Cfg.JWTRefreshSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrSessionExpired
	}

	hash := hashToken(refreshToken)
	session, err := s.DB.GetSessionByTokenHash(ctx, hash)
	if err != nil {
		return nil, ErrSessionExpired
	}

	_ = s.DB.DeleteSession(ctx, hash)

	user, err := s.DB.GetUserByID(ctx, sqlc.GetUserByIDParams{
		ID:        session.UserID,
		CompanyID: claims.CompanyID,
	})
	if err != nil {
		return nil, ErrSessionExpired
	}

	return s.issueTokens(ctx, user, ip, userAgent)
}

// Logout invalidates the session associated with the refresh token.
func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	hash := hashToken(refreshToken)
	return s.DB.DeleteSession(ctx, hash)
}

// SetupTOTP generates a TOTP secret and returns it along with a provisioning URL.
func (s *Service) SetupTOTP(ctx context.Context, userID, companyID uuid.UUID) (string, string, error) {
	user, err := s.DB.GetUserByID(ctx, sqlc.GetUserByIDParams{ID: userID, CompanyID: companyID})
	if err != nil {
		return "", "", fmt.Errorf("user not found: %w", err)
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "GambChamp",
		AccountName: user.Email,
	})
	if err != nil {
		return "", "", fmt.Errorf("generating totp key: %w", err)
	}

	secret := key.Secret()
	if err := s.DB.SetUserTOTP(ctx, sqlc.SetUserTOTPParams{
		ID:          userID,
		CompanyID:   companyID,
		TotpSecret:  &secret,
		TotpEnabled: false,
	}); err != nil {
		return "", "", fmt.Errorf("storing totp secret: %w", err)
	}

	return secret, key.URL(), nil
}

// VerifyAndEnableTOTP validates a code and enables 2FA.
func (s *Service) VerifyAndEnableTOTP(ctx context.Context, userID, companyID uuid.UUID, code string) error {
	user, err := s.DB.GetUserByID(ctx, sqlc.GetUserByIDParams{ID: userID, CompanyID: companyID})
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}
	if user.TotpSecret == nil {
		return fmt.Errorf("totp not set up")
	}
	if !totp.Validate(code, *user.TotpSecret) {
		return ErrInvalidTOTP
	}

	return s.DB.SetUserTOTP(ctx, sqlc.SetUserTOTPParams{
		ID:          userID,
		CompanyID:   companyID,
		TotpSecret:  user.TotpSecret,
		TotpEnabled: true,
	})
}

// DisableTOTP validates a code and disables 2FA.
func (s *Service) DisableTOTP(ctx context.Context, userID, companyID uuid.UUID, code string) error {
	user, err := s.DB.GetUserByID(ctx, sqlc.GetUserByIDParams{ID: userID, CompanyID: companyID})
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}
	if user.TotpSecret == nil || !user.TotpEnabled {
		return fmt.Errorf("totp not enabled")
	}
	if !totp.Validate(code, *user.TotpSecret) {
		return ErrInvalidTOTP
	}

	return s.DB.SetUserTOTP(ctx, sqlc.SetUserTOTPParams{
		ID:          userID,
		CompanyID:   companyID,
		TotpSecret:  nil,
		TotpEnabled: false,
	})
}

type refreshClaims struct {
	UserID    uuid.UUID `json:"user_id"`
	CompanyID uuid.UUID `json:"company_id"`
	SessionID uuid.UUID `json:"session_id"`
	jwt.RegisteredClaims
}

func (s *Service) issueTokens(ctx context.Context, user sqlc.User, ip, userAgent string) (*TokenPair, error) {
	now := time.Now()

	accessClaims := jwt.MapClaims{
		"user_id":    user.ID.String(),
		"company_id": user.CompanyID.String(),
		"role":       user.Role,
		"exp":        now.Add(s.Cfg.AccessTokenTTL()).Unix(),
		"iat":        now.Unix(),
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(s.Cfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("signing access token: %w", err)
	}

	refreshID := uuid.New()
	rc := refreshClaims{
		UserID:    user.ID,
		CompanyID: user.CompanyID,
		SessionID: refreshID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.Cfg.RefreshTokenTTL())),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, rc).SignedString([]byte(s.Cfg.JWTRefreshSecret))
	if err != nil {
		return nil, fmt.Errorf("signing refresh token: %w", err)
	}

	var ua *string
	if userAgent != "" {
		ua = &userAgent
	}

	_, err = s.DB.CreateSession(ctx, sqlc.CreateSessionParams{
		UserID:    user.ID,
		TokenHash: hashToken(refreshToken),
		ExpiresAt: now.Add(s.Cfg.RefreshTokenTTL()),
		Ip:        ip,
		UserAgent: ua,
	})
	if err != nil {
		return nil, fmt.Errorf("creating session: %w", err)
	}

	_ = s.DB.UpdateLastLogin(ctx, user.ID)

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
