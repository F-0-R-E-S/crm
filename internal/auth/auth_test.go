package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"github.com/gambchamp/crm/internal/config"
	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

// ---- fake DB ----------------------------------------------------------------

type fakeAuthDB struct {
	mu       sync.Mutex
	users    map[string]sqlc.User    // key: email+companyID
	byID     map[uuid.UUID]sqlc.User // key: userID
	sessions map[string]sqlc.Session // key: tokenHash
}

func newFakeAuthDB() *fakeAuthDB {
	return &fakeAuthDB{
		users:    make(map[string]sqlc.User),
		byID:     make(map[uuid.UUID]sqlc.User),
		sessions: make(map[string]sqlc.Session),
	}
}

func (f *fakeAuthDB) userKey(email string, companyID uuid.UUID) string {
	return email + "|" + companyID.String()
}

func (f *fakeAuthDB) addUser(u sqlc.User) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.users[f.userKey(u.Email, u.CompanyID)] = u
	f.byID[u.ID] = u
}

func (f *fakeAuthDB) GetUserByEmail(_ context.Context, arg sqlc.GetUserByEmailParams) (sqlc.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[f.userKey(arg.Email, arg.CompanyID)]
	if !ok {
		return sqlc.User{}, pgx.ErrNoRows
	}
	return u, nil
}

func (f *fakeAuthDB) GetUserByID(_ context.Context, arg sqlc.GetUserByIDParams) (sqlc.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.byID[arg.ID]
	if !ok || u.CompanyID != arg.CompanyID {
		return sqlc.User{}, pgx.ErrNoRows
	}
	return u, nil
}

func (f *fakeAuthDB) GetSessionByTokenHash(_ context.Context, tokenHash string) (sqlc.Session, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.sessions[tokenHash]
	if !ok {
		return sqlc.Session{}, pgx.ErrNoRows
	}
	return s, nil
}

func (f *fakeAuthDB) DeleteSession(_ context.Context, tokenHash string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.sessions, tokenHash)
	return nil
}

func (f *fakeAuthDB) CreateSession(_ context.Context, arg sqlc.CreateSessionParams) (sqlc.Session, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s := sqlc.Session{
		ID: uuid.New(), UserID: arg.UserID, TokenHash: arg.TokenHash,
		ExpiresAt: arg.ExpiresAt, Ip: arg.Ip, UserAgent: arg.UserAgent,
		CreatedAt: time.Now(),
	}
	f.sessions[arg.TokenHash] = s
	return s, nil
}

func (f *fakeAuthDB) UpdateLastLogin(_ context.Context, _ uuid.UUID) error { return nil }

func (f *fakeAuthDB) SetUserTOTP(_ context.Context, arg sqlc.SetUserTOTPParams) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.byID[arg.ID]
	if !ok {
		return pgx.ErrNoRows
	}
	u.TotpSecret = arg.TotpSecret
	u.TotpEnabled = arg.TotpEnabled
	f.byID[arg.ID] = u
	f.users[f.userKey(u.Email, u.CompanyID)] = u
	return nil
}

// ---- helpers ----------------------------------------------------------------

func testConfig() *config.Config {
	return &config.Config{
		JWTSecret:        "test-access-secret",
		JWTRefreshSecret: "test-refresh-secret",
		BcryptCost:       bcrypt.MinCost,
	}
}

func hashPwd(t *testing.T, pwd string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.MinCost)
	require.NoError(t, err)
	return string(h)
}

func buildApp(svc *Service) *fiber.App {
	app := fiber.New(fiber.Config{})
	h := &Handler{Svc: svc}
	authMw := middleware.JWTAuth(svc.Cfg.JWTSecret)
	v1 := app.Group("/api/v1")
	RegisterRoutes(v1, h, authMw)
	return app
}

func postJSON(t *testing.T, app *fiber.App, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	_ = resp
	return nil // caller uses resp directly
}

// ---- tests ------------------------------------------------------------------

func TestLogin_Success(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	db.addUser(sqlc.User{
		ID: uuid.New(), CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "password123"), Role: "admin", Status: "active",
	})

	svc := NewService(db, testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "test@example.com", "password": "password123",
		"company_id": companyID.String(),
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.NotEmpty(t, result["access_token"])
	assert.NotEmpty(t, result["refresh_token"])
}

func TestLogin_WrongPassword(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	db.addUser(sqlc.User{
		ID: uuid.New(), CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "password123"), Role: "admin", Status: "active",
	})

	svc := NewService(db, testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "test@example.com", "password": "wrongpassword",
		"company_id": companyID.String(),
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestLogin_UserNotFound(t *testing.T) {
	db := newFakeAuthDB()
	svc := NewService(db, testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "nobody@example.com", "password": "pass",
		"company_id": uuid.New().String(),
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestLogin_InactiveUser(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	db.addUser(sqlc.User{
		ID: uuid.New(), CompanyID: companyID, Email: "inactive@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "inactive",
	})

	svc := NewService(db, testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "inactive@example.com", "password": "pass",
		"company_id": companyID.String(),
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestLogin_TOTPRequired(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP"
	db.addUser(sqlc.User{
		ID: uuid.New(), CompanyID: companyID, Email: "totp@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
		TotpEnabled: true, TotpSecret: &secret,
	})

	svc := NewService(db, testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "totp@example.com", "password": "pass",
		"company_id": companyID.String(),
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, true, result["requires_2fa"])
}

func TestLogin_InvalidBody(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestLogin_InvalidCompanyID(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "x@x.com", "password": "pass", "company_id": "not-a-uuid",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestRefresh_Success(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	userID := uuid.New()
	db.addUser(sqlc.User{
		ID: userID, CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
	})

	svc := NewService(db, testConfig())
	// first login to get tokens
	tokens, err := svc.Login(context.Background(), companyID, "test@example.com", "pass", "127.0.0.1", "test")
	require.NoError(t, err)

	app := buildApp(svc)
	body, _ := json.Marshal(map[string]string{"refresh_token": tokens.RefreshToken})
	req := httptest.NewRequest("POST", "/api/v1/auth/refresh", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.NotEmpty(t, result["access_token"])
}

func TestRefresh_InvalidToken(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{"refresh_token": "invalid.token.here"})
	req := httptest.NewRequest("POST", "/api/v1/auth/refresh", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestLogout_Success(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{"refresh_token": "any-token"})
	req := httptest.NewRequest("POST", "/api/v1/auth/logout", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "logged out", result["message"])
}

func TestSetupTOTP_RequiresAuth(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	req := httptest.NewRequest("POST", "/api/v1/auth/2fa/setup", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestSetupTOTP_WithAuth(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	userID := uuid.New()
	db.addUser(sqlc.User{
		ID: userID, CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
	})

	cfg := testConfig()
	svc := NewService(db, cfg)
	app := buildApp(svc)

	// get a valid access token
	tokens, err := svc.Login(context.Background(), companyID, "test@example.com", "pass", "127.0.0.1", "test")
	require.NoError(t, err)

	req := httptest.NewRequest("POST", "/api/v1/auth/2fa/setup", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.NotEmpty(t, result["secret"])
	assert.NotEmpty(t, result["qr_url"])
}

func TestLoginWithTOTP_InvalidBody(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	req := httptest.NewRequest("POST", "/api/v1/auth/login/2fa", bytes.NewReader([]byte("bad")))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestLoginWithTOTP_InvalidCompanyID(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "x@x.com", "password": "pass",
		"company_id": "not-a-uuid", "totp_code": "123456",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login/2fa", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestLoginWithTOTP_WrongCredentials(t *testing.T) {
	svc := NewService(newFakeAuthDB(), testConfig())
	app := buildApp(svc)

	body, _ := json.Marshal(map[string]string{
		"email": "nobody@example.com", "password": "pass",
		"company_id": uuid.New().String(), "totp_code": "123456",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/login/2fa", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)
}

func TestVerifyTOTP_InvalidBody(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	userID := uuid.New()
	db.addUser(sqlc.User{
		ID: userID, CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
	})

	cfg := testConfig()
	svc := NewService(db, cfg)
	app := buildApp(svc)

	tokens, err := svc.Login(context.Background(), companyID, "test@example.com", "pass", "127.0.0.1", "ua")
	require.NoError(t, err)

	req := httptest.NewRequest("POST", "/api/v1/auth/2fa/verify", bytes.NewReader([]byte("bad")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestDisableTOTP_InvalidBody(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	userID := uuid.New()
	db.addUser(sqlc.User{
		ID: userID, CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
	})

	cfg := testConfig()
	svc := NewService(db, cfg)
	app := buildApp(svc)

	tokens, err := svc.Login(context.Background(), companyID, "test@example.com", "pass", "127.0.0.1", "ua")
	require.NoError(t, err)

	req := httptest.NewRequest("POST", "/api/v1/auth/2fa/disable", bytes.NewReader([]byte("bad")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestDisableTOTP_InvalidCode(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	userID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP"
	db.addUser(sqlc.User{
		ID: userID, CompanyID: companyID, Email: "test@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
		TotpEnabled: true, TotpSecret: &secret,
	})

	cfg := testConfig()
	svc := NewService(db, cfg)
	app := buildApp(svc)

	// Build a valid access token directly via JWT (bypass TOTP for login)
	claims := jwt.MapClaims{
		"user_id":    userID.String(),
		"company_id": companyID.String(),
		"role":       "admin",
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(cfg.JWTSecret))
	require.NoError(t, err)

	body, _ := json.Marshal(map[string]string{"code": "000000"})
	req := httptest.NewRequest("POST", "/api/v1/auth/2fa/disable", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

// ---- service-level tests ----------------------------------------------------

func TestService_Login_TOTPRequired(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	secret := "JBSWY3DPEHPK3PXP"
	db.addUser(sqlc.User{
		ID: uuid.New(), CompanyID: companyID, Email: "totp@example.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
		TotpEnabled: true, TotpSecret: &secret,
	})

	svc := NewService(db, testConfig())
	_, err := svc.Login(context.Background(), companyID, "totp@example.com", "pass", "127.0.0.1", "test")
	assert.ErrorIs(t, err, ErrTOTPRequired)
}

func TestService_Refresh_SessionNotFound(t *testing.T) {
	db := newFakeAuthDB()
	companyID := uuid.New()
	userID := uuid.New()
	db.addUser(sqlc.User{
		ID: userID, CompanyID: companyID, Email: "x@x.com",
		PasswordHash: hashPwd(t, "pass"), Role: "admin", Status: "active",
	})

	cfg := testConfig()
	svc := NewService(db, cfg)

	tokens, err := svc.Login(context.Background(), companyID, "x@x.com", "pass", "127.0.0.1", "ua")
	require.NoError(t, err)

	// delete session manually
	hash := hashToken(tokens.RefreshToken)
	_ = db.DeleteSession(context.Background(), hash)

	_, err = svc.Refresh(context.Background(), tokens.RefreshToken, "127.0.0.1", "ua")
	assert.ErrorIs(t, err, ErrSessionExpired)
}
