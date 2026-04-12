package intake

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
	"github.com/gambchamp/crm/pkg/idempotency"
)

// ---- fake DB ----------------------------------------------------------------

type fakeIntakeDB struct {
	mu         sync.Mutex
	leads      map[uuid.UUID]sqlc.Lead
	duplicates map[string]bool // key: email|phone
}

func newFakeIntakeDB() *fakeIntakeDB {
	return &fakeIntakeDB{
		leads:      make(map[uuid.UUID]sqlc.Lead),
		duplicates: make(map[string]bool),
	}
}

func (f *fakeIntakeDB) dupKey(email, phone string) string { return email + "|" + phone }

func (f *fakeIntakeDB) CheckDuplicate(_ context.Context, arg sqlc.CheckDuplicateParams) (int32, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.duplicates[f.dupKey(arg.Email, arg.Phone)] {
		return 1, nil
	}
	return 0, pgx.ErrNoRows
}

func (f *fakeIntakeDB) CreateLead(_ context.Context, arg sqlc.CreateLeadParams) (sqlc.Lead, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	lead := sqlc.Lead{
		ID:          uuid.New(),
		CompanyID:   arg.CompanyID,
		AffiliateID: arg.AffiliateID,
		FirstName:   arg.FirstName,
		Email:       arg.Email,
		Phone:       arg.Phone,
		Country:     arg.Country,
		Status:      arg.Status,
		CreatedAt:   time.Now(),
	}
	f.leads[lead.ID] = lead
	f.duplicates[f.dupKey(lead.Email, lead.Phone)] = true
	return lead, nil
}

func (f *fakeIntakeDB) ListLeads(_ context.Context, arg sqlc.ListLeadsParams) ([]sqlc.Lead, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	result := []sqlc.Lead{}
	for _, l := range f.leads {
		if l.CompanyID == arg.CompanyID {
			result = append(result, l)
		}
	}
	return result, nil
}

func (f *fakeIntakeDB) CountLeads(_ context.Context, arg sqlc.CountLeadsParams) (int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var n int64
	for _, l := range f.leads {
		if l.CompanyID == arg.CompanyID {
			n++
		}
	}
	return n, nil
}

func (f *fakeIntakeDB) GetLead(_ context.Context, arg sqlc.GetLeadParams) (sqlc.Lead, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	l, ok := f.leads[arg.ID]
	if !ok || l.CompanyID != arg.CompanyID {
		return sqlc.Lead{}, pgx.ErrNoRows
	}
	return l, nil
}

// ---- helpers ----------------------------------------------------------------

func newMiniRedis(t *testing.T) *redis.Client {
	t.Helper()
	mr := miniredis.RunT(t)
	return redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func buildIntakeApp(t *testing.T, db IntakeQuerier, rdb *redis.Client, companyID, affiliateID uuid.UUID) *fiber.App {
	t.Helper()
	app := fiber.New(fiber.Config{})
	h := &Handler{
		DB:   db,
		RDB:  rdb,
		NC:   nil,
		Idem: idempotency.NewStore(rdb),
		Log:  slog.Default(),
	}

	// apiKey middleware stub — injects companyID + affiliateID via locals
	apiKeyMw := func(c fiber.Ctx) error {
		c.Locals("company_id", companyID)
		c.Locals("affiliate_id", affiliateID)
		return c.Next()
	}
	// JWT middleware stub
	authMw := func(c fiber.Ctx) error {
		c.Locals("company_id", companyID)
		c.Locals("user_id", uuid.New())
		c.Locals("role", "admin")
		return c.Next()
	}

	v1 := app.Group("/api/v1")
	RegisterRoutes(v1, h, apiKeyMw, authMw)
	return app
}

func leadBody(overrides map[string]any) []byte {
	body := map[string]any{
		"first_name": "John",
		"email":      "john@example.com",
		"phone":      "+12125551234",
		"country":    "US",
	}
	for k, v := range overrides {
		body[k] = v
	}
	b, _ := json.Marshal(body)
	return b
}

func postLead(t *testing.T, app *fiber.App, body []byte) *http.Response {
	t.Helper()
	req := httptest.NewRequest("POST", "/api/v1/leads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "test-api-key")
	resp, err := app.Test(req)
	require.NoError(t, err)
	return resp
}

// ---- tests ------------------------------------------------------------------

func TestCreateLead_Success(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID, affiliateID := uuid.New(), uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	resp := postLead(t, app, leadBody(nil))
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.NotEmpty(t, result["id"])
	assert.Equal(t, "new", result["status"])
}

func TestCreateLead_MissingFields(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	app := buildIntakeApp(t, db, rdb, uuid.New(), uuid.New())

	// missing email, phone, country
	body, _ := json.Marshal(map[string]string{"first_name": "John"})
	resp := postLead(t, app, body)
	assert.Equal(t, fiber.StatusUnprocessableEntity, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "VALIDATION_ERROR", result["error"])
	details := result["details"].([]any)
	assert.GreaterOrEqual(t, len(details), 1)
}

func TestCreateLead_MissingFirstName(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	app := buildIntakeApp(t, db, rdb, uuid.New(), uuid.New())

	body, _ := json.Marshal(map[string]string{
		"email": "x@x.com", "phone": "+12125551234", "country": "US",
	})
	resp := postLead(t, app, body)
	assert.Equal(t, fiber.StatusUnprocessableEntity, resp.StatusCode)
}

func TestCreateLead_DuplicateLead(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID, affiliateID := uuid.New(), uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	// first submission
	resp := postLead(t, app, leadBody(nil))
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

	// second submission — same email+phone → duplicate
	resp = postLead(t, app, leadBody(nil))
	assert.Equal(t, fiber.StatusConflict, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "DUPLICATE", result["error"])
}

func TestCreateLead_InvalidBody(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	app := buildIntakeApp(t, db, rdb, uuid.New(), uuid.New())

	req := httptest.NewRequest("POST", "/api/v1/leads", bytes.NewReader([]byte("not-json")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", "key")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestCreateLead_Idempotency(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID, affiliateID := uuid.New(), uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	idemKey := "my-idempotency-key-123"
	doReq := func() *http.Response {
		req := httptest.NewRequest("POST", "/api/v1/leads", bytes.NewReader(leadBody(nil)))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-API-Key", "key")
		req.Header.Set("Idempotency-Key", idemKey)
		resp, err := app.Test(req)
		require.NoError(t, err)
		return resp
	}

	// First call creates
	resp1 := doReq()
	assert.Equal(t, fiber.StatusCreated, resp1.StatusCode)

	// Second call with same key is idempotent (returns 200, not 201)
	resp2 := doReq()
	assert.Equal(t, fiber.StatusOK, resp2.StatusCode)
	var r2 map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&r2))
	assert.Equal(t, true, r2["idempotent"])
}

func TestListLeads_Success(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID, affiliateID := uuid.New(), uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	// create a lead first
	postLead(t, app, leadBody(nil))

	req := httptest.NewRequest("GET", "/api/v1/leads", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Contains(t, result, "leads")
	assert.Contains(t, result, "total")
	assert.Contains(t, result, "page")
}

func TestListLeads_Pagination(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID, affiliateID := uuid.New(), uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	req := httptest.NewRequest("GET", "/api/v1/leads?page=2&per_page=5", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, float64(2), result["page"])
	assert.Equal(t, float64(5), result["per_page"])
}

func TestGetLead_Success(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID, affiliateID := uuid.New(), uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	// create a lead
	resp := postLead(t, app, leadBody(nil))
	require.Equal(t, fiber.StatusCreated, resp.StatusCode)
	var created map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	leadID := created["id"].(string)

	// fetch it
	req := httptest.NewRequest("GET", "/api/v1/leads/"+leadID, nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestGetLead_NotFound(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	app := buildIntakeApp(t, db, rdb, uuid.New(), uuid.New())

	req := httptest.NewRequest("GET", "/api/v1/leads/"+uuid.New().String(), nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestGetLead_InvalidID(t *testing.T) {
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	app := buildIntakeApp(t, db, rdb, uuid.New(), uuid.New())

	req := httptest.NewRequest("GET", "/api/v1/leads/not-a-uuid", nil)
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestCreateLead_WithMiddlewareLocals(t *testing.T) {
	// Verify middleware.GetAffiliateID works through Fiber's locals system
	db := newFakeIntakeDB()
	rdb := newMiniRedis(t)
	companyID := uuid.New()
	affiliateID := uuid.New()
	app := buildIntakeApp(t, db, rdb, companyID, affiliateID)

	resp := postLead(t, app, leadBody(map[string]any{"country": "DE", "phone": "+4915123456789"}))
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)
}

var _ = middleware.GetAffiliateID // ensure import is used
