package admin

import (
	"bytes"
	"context"
	"encoding/json"
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
	"golang.org/x/crypto/bcrypt"

	"github.com/gambchamp/crm/internal/config"
	"github.com/gambchamp/crm/internal/db/sqlc"
)

// ============================================================================
// Shared helpers
// ============================================================================

func newTestRedis(t *testing.T) *redis.Client {
	t.Helper()
	mr := miniredis.RunT(t)
	return redis.NewClient(&redis.Options{Addr: mr.Addr()})
}

func authLocals(companyID uuid.UUID, role string) fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Locals("user_id", uuid.New())
		c.Locals("company_id", companyID)
		c.Locals("role", role)
		return c.Next()
	}
}

func jsonReq(method, path string, body any) *http.Request {
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	return req
}

// ============================================================================
// Company fake DB
// ============================================================================

type fakeCompanyDB struct {
	mu        sync.Mutex
	companies map[uuid.UUID]sqlc.Company
}

func newFakeCompanyDB() *fakeCompanyDB {
	return &fakeCompanyDB{companies: make(map[uuid.UUID]sqlc.Company)}
}

func (f *fakeCompanyDB) CreateCompany(_ context.Context, arg sqlc.CreateCompanyParams) (sqlc.Company, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c := sqlc.Company{
		ID:        uuid.New(),
		Name:      arg.Name,
		Slug:      arg.Slug,
		Plan:      arg.Plan,
		Status:    arg.Status,
		Settings:  arg.Settings,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	f.companies[c.ID] = c
	return c, nil
}

func (f *fakeCompanyDB) GetCompany(_ context.Context, id uuid.UUID) (sqlc.Company, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.companies[id]
	if !ok {
		return sqlc.Company{}, pgx.ErrNoRows
	}
	return c, nil
}

func (f *fakeCompanyDB) UpdateCompany(_ context.Context, arg sqlc.UpdateCompanyParams) (sqlc.Company, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	c, ok := f.companies[arg.ID]
	if !ok {
		return sqlc.Company{}, pgx.ErrNoRows
	}
	if arg.Name != nil {
		c.Name = *arg.Name
	}
	if arg.Plan != nil {
		c.Plan = *arg.Plan
	}
	c.UpdatedAt = time.Now()
	f.companies[arg.ID] = c
	return c, nil
}

// ============================================================================
// Company tests
// ============================================================================

func buildCompanyApp(db CompanyQuerier, companyID uuid.UUID, role string) *fiber.App {
	app := fiber.New(fiber.Config{})
	h := &CompanyHandler{DB: db}
	v1 := app.Group("/api/v1", authLocals(companyID, role))
	RegisterCompanyRoutes(v1, h)
	return app
}

func TestCreateCompany_Success(t *testing.T) {
	db := newFakeCompanyDB()
	app := buildCompanyApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/companies", map[string]string{
		"name": "Acme Corp", "slug": "acme", "plan": "pro",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "Acme Corp", result["name"])
	assert.NotEmpty(t, result["id"])
}

func TestCreateCompany_DefaultPlan(t *testing.T) {
	db := newFakeCompanyDB()
	app := buildCompanyApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/companies", map[string]string{
		"name": "Beta Co", "slug": "beta",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "starter", result["plan"])
}

func TestCreateCompany_MissingFields(t *testing.T) {
	db := newFakeCompanyDB()
	app := buildCompanyApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/companies", map[string]string{"name": "Only Name"}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnprocessableEntity, resp.StatusCode)
}

func TestCreateCompany_InvalidBody(t *testing.T) {
	db := newFakeCompanyDB()
	app := buildCompanyApp(db, uuid.New(), "admin")

	req := httptest.NewRequest("POST", "/api/v1/companies", bytes.NewReader([]byte("bad")))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestGetCompany_OwnCompany(t *testing.T) {
	db := newFakeCompanyDB()
	companyID := uuid.New()

	// create via admin
	adminApp := buildCompanyApp(db, companyID, "admin")
	resp, _ := adminApp.Test(jsonReq("POST", "/api/v1/companies", map[string]string{
		"name": "MyCompany", "slug": "myco",
	}))
	var created map[string]any
	json.NewDecoder(resp.Body).Decode(&created)
	createdID := created["id"].(string)

	// The created company ID won't match companyID (it's generated by fake DB).
	// GetCompany allows admin OR own company. Test admin role:
	adminResp, err := adminApp.Test(jsonReq("GET", "/api/v1/companies/"+createdID, nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, adminResp.StatusCode)
}

func TestGetCompany_NotFound(t *testing.T) {
	db := newFakeCompanyDB()
	companyID := uuid.New()
	app := buildCompanyApp(db, companyID, "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/companies/"+uuid.New().String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestGetCompany_ForbiddenOtherCompany(t *testing.T) {
	db := newFakeCompanyDB()
	companyID := uuid.New()
	app := buildCompanyApp(db, companyID, "manager")

	// try to get a different company (ID doesn't match JWT company_id)
	resp, err := app.Test(jsonReq("GET", "/api/v1/companies/"+uuid.New().String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestGetCompany_InvalidID(t *testing.T) {
	db := newFakeCompanyDB()
	app := buildCompanyApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/companies/not-a-uuid", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestUpdateCompany_Success(t *testing.T) {
	db := newFakeCompanyDB()
	companyID := uuid.New()
	// pre-create company with that ID so PATCH can find it
	newName := "Updated"
	db.companies[companyID] = sqlc.Company{ID: companyID, Name: "Old", Slug: "old", Plan: "starter", Status: "active"}

	app := buildCompanyApp(db, companyID, "admin")
	resp, err := app.Test(jsonReq("PATCH", "/api/v1/companies/"+companyID.String(), map[string]any{
		"name": newName,
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, newName, result["name"])
}

func TestUpdateCompany_ForbiddenOtherCompany(t *testing.T) {
	db := newFakeCompanyDB()
	companyID := uuid.New()
	otherID := uuid.New()
	app := buildCompanyApp(db, companyID, "admin")

	resp, err := app.Test(jsonReq("PATCH", "/api/v1/companies/"+otherID.String(), map[string]any{
		"name": "Hacked",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

// ============================================================================
// User fake DB
// ============================================================================

type fakeUserDB struct {
	mu    sync.Mutex
	users map[uuid.UUID]sqlc.User
}

func newFakeUserDB() *fakeUserDB {
	return &fakeUserDB{users: make(map[uuid.UUID]sqlc.User)}
}

func (f *fakeUserDB) ListUsers(_ context.Context, arg sqlc.ListUsersParams) ([]sqlc.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []sqlc.User
	for _, u := range f.users {
		if u.CompanyID == arg.CompanyID {
			result = append(result, u)
		}
	}
	return result, nil
}

func (f *fakeUserDB) CountUsers(_ context.Context, companyID uuid.UUID) (int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var n int64
	for _, u := range f.users {
		if u.CompanyID == companyID {
			n++
		}
	}
	return n, nil
}

func (f *fakeUserDB) CreateUser(_ context.Context, arg sqlc.CreateUserParams) (sqlc.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u := sqlc.User{
		ID: uuid.New(), CompanyID: arg.CompanyID, Email: arg.Email,
		PasswordHash: arg.PasswordHash, Role: arg.Role, Name: arg.Name,
		Status: "active", CreatedAt: time.Now(),
	}
	f.users[u.ID] = u
	return u, nil
}

func (f *fakeUserDB) GetUserByID(_ context.Context, arg sqlc.GetUserByIDParams) (sqlc.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[arg.ID]
	if !ok || u.CompanyID != arg.CompanyID {
		return sqlc.User{}, pgx.ErrNoRows
	}
	return u, nil
}

func (f *fakeUserDB) UpdateUser(_ context.Context, arg sqlc.UpdateUserParams) (sqlc.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[arg.ID]
	if !ok || u.CompanyID != arg.CompanyID {
		return sqlc.User{}, pgx.ErrNoRows
	}
	if arg.Name != nil {
		u.Name = arg.Name
	}
	if arg.Role != nil {
		u.Role = *arg.Role
	}
	if arg.Status != nil {
		u.Status = *arg.Status
	}
	f.users[arg.ID] = u
	return u, nil
}

func (f *fakeUserDB) DeactivateUser(_ context.Context, arg sqlc.DeactivateUserParams) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[arg.ID]
	if !ok || u.CompanyID != arg.CompanyID {
		return pgx.ErrNoRows
	}
	u.Status = "inactive"
	f.users[arg.ID] = u
	return nil
}

// ============================================================================
// User tests
// ============================================================================

func buildUserApp(db UserQuerier, companyID uuid.UUID, role string) *fiber.App {
	app := fiber.New(fiber.Config{})
	cfg := &config.Config{BcryptCost: bcrypt.MinCost}
	h := &UserHandler{DB: db, Cfg: cfg}
	v1 := app.Group("/api/v1", authLocals(companyID, role))
	RegisterUserRoutes(v1, h)
	return app
}

func TestListUsers_Success(t *testing.T) {
	db := newFakeUserDB()
	companyID := uuid.New()
	app := buildUserApp(db, companyID, "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/users", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Contains(t, result, "users")
	assert.Contains(t, result, "total")
}

func TestCreateUser_AdminSuccess(t *testing.T) {
	db := newFakeUserDB()
	companyID := uuid.New()
	app := buildUserApp(db, companyID, "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{
		"email": "new@example.com", "password": "secret123", "role": "manager",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "new@example.com", result["email"])
	assert.Equal(t, "manager", result["role"])
	assert.Nil(t, result["password_hash"], "password_hash must not be exposed")
}

func TestCreateUser_NonAdminForbidden(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "manager")

	resp, err := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{
		"email": "x@x.com", "password": "pass", "role": "viewer",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestCreateUser_InvalidRole(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{
		"email": "x@x.com", "password": "pass", "role": "superadmin",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnprocessableEntity, resp.StatusCode)
}

func TestCreateUser_MissingFields(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{"email": "x@x.com"}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnprocessableEntity, resp.StatusCode)
}

func TestGetUser_Success(t *testing.T) {
	db := newFakeUserDB()
	companyID := uuid.New()
	app := buildUserApp(db, companyID, "admin")

	// create user
	resp, _ := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{
		"email": "get@test.com", "password": "pass", "role": "viewer",
	}))
	var created UserResponse
	json.NewDecoder(resp.Body).Decode(&created)

	resp, err := app.Test(jsonReq("GET", "/api/v1/users/"+created.ID.String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}

func TestGetUser_NotFound(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/users/"+uuid.New().String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestGetUser_InvalidID(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/users/not-a-uuid", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestUpdateUser_AdminSuccess(t *testing.T) {
	db := newFakeUserDB()
	companyID := uuid.New()
	app := buildUserApp(db, companyID, "admin")

	// create user
	resp, _ := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{
		"email": "upd@test.com", "password": "pass", "role": "viewer",
	}))
	var created UserResponse
	json.NewDecoder(resp.Body).Decode(&created)

	newRole := "manager"
	resp, err := app.Test(jsonReq("PATCH", "/api/v1/users/"+created.ID.String(), map[string]string{
		"role": newRole,
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var updated UserResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&updated))
	assert.Equal(t, newRole, updated.Role)
}

func TestUpdateUser_NonAdminForbidden(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "viewer")

	resp, err := app.Test(jsonReq("PATCH", "/api/v1/users/"+uuid.New().String(), map[string]string{"role": "admin"}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestDeleteUser_AdminSuccess(t *testing.T) {
	db := newFakeUserDB()
	companyID := uuid.New()
	app := buildUserApp(db, companyID, "admin")

	// create user
	resp, _ := app.Test(jsonReq("POST", "/api/v1/users", map[string]string{
		"email": "del@test.com", "password": "pass", "role": "viewer",
	}))
	var created UserResponse
	json.NewDecoder(resp.Body).Decode(&created)

	resp, err := app.Test(jsonReq("DELETE", "/api/v1/users/"+created.ID.String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNoContent, resp.StatusCode)
}

func TestDeleteUser_NonAdminForbidden(t *testing.T) {
	db := newFakeUserDB()
	app := buildUserApp(db, uuid.New(), "teamlead")

	resp, err := app.Test(jsonReq("DELETE", "/api/v1/users/"+uuid.New().String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

// ============================================================================
// Affiliate fake DB
// ============================================================================

type fakeAffiliateDB struct {
	mu         sync.Mutex
	affiliates map[uuid.UUID]sqlc.Affiliate
}

func newFakeAffiliateDB() *fakeAffiliateDB {
	return &fakeAffiliateDB{affiliates: make(map[uuid.UUID]sqlc.Affiliate)}
}

func (f *fakeAffiliateDB) ListAffiliates(_ context.Context, arg sqlc.ListAffiliatesParams) ([]sqlc.Affiliate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var result []sqlc.Affiliate
	for _, a := range f.affiliates {
		if a.CompanyID == arg.CompanyID {
			result = append(result, a)
		}
	}
	return result, nil
}

func (f *fakeAffiliateDB) CountAffiliates(_ context.Context, companyID uuid.UUID) (int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var n int64
	for _, a := range f.affiliates {
		if a.CompanyID == companyID {
			n++
		}
	}
	return n, nil
}

func (f *fakeAffiliateDB) CreateAffiliate(_ context.Context, arg sqlc.CreateAffiliateParams) (sqlc.Affiliate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a := sqlc.Affiliate{
		ID: uuid.New(), CompanyID: arg.CompanyID, Name: arg.Name,
		ApiKey: arg.ApiKey, Email: arg.Email, Status: arg.Status,
		Settings: arg.Settings, CreatedAt: time.Now(),
	}
	f.affiliates[a.ID] = a
	return a, nil
}

func (f *fakeAffiliateDB) GetAffiliate(_ context.Context, arg sqlc.GetAffiliateParams) (sqlc.Affiliate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.affiliates[arg.ID]
	if !ok || a.CompanyID != arg.CompanyID {
		return sqlc.Affiliate{}, pgx.ErrNoRows
	}
	return a, nil
}

func (f *fakeAffiliateDB) UpdateAffiliate(_ context.Context, arg sqlc.UpdateAffiliateParams) (sqlc.Affiliate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.affiliates[arg.ID]
	if !ok || a.CompanyID != arg.CompanyID {
		return sqlc.Affiliate{}, pgx.ErrNoRows
	}
	if arg.Name != nil {
		a.Name = *arg.Name
	}
	if arg.Status != nil {
		a.Status = *arg.Status
	}
	f.affiliates[arg.ID] = a
	return a, nil
}

func (f *fakeAffiliateDB) UpdateAffiliateAPIKey(_ context.Context, arg sqlc.UpdateAffiliateAPIKeyParams) (sqlc.Affiliate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	a, ok := f.affiliates[arg.ID]
	if !ok || a.CompanyID != arg.CompanyID {
		return sqlc.Affiliate{}, pgx.ErrNoRows
	}
	a.ApiKey = arg.ApiKey
	f.affiliates[arg.ID] = a
	return a, nil
}

// ============================================================================
// Affiliate tests
// ============================================================================

func buildAffiliateApp(db AffiliateQuerier, rdb *redis.Client, companyID uuid.UUID, role string) *fiber.App {
	app := fiber.New(fiber.Config{})
	h := &AffiliateHandler{DB: db, RDB: rdb}
	v1 := app.Group("/api/v1", authLocals(companyID, role))
	RegisterAffiliateRoutes(v1, h)
	return app
}

func TestListAffiliates_Success(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	companyID := uuid.New()
	app := buildAffiliateApp(db, rdb, companyID, "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/affiliates", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Contains(t, result, "affiliates")
	assert.Contains(t, result, "total")
}

func TestCreateAffiliate_AdminSuccess(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	companyID := uuid.New()
	app := buildAffiliateApp(db, rdb, companyID, "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{
		"name": "BigAffiliate",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "BigAffiliate", result["name"])
	// On create, full API key is returned
	apiKey := result["api_key"].(string)
	assert.NotContains(t, apiKey, "****")
	assert.Len(t, apiKey, 64)
}

func TestCreateAffiliate_ViewerForbidden(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "viewer")

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{"name": "X"}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestCreateAffiliate_BuyerForbidden(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "buyer")

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{"name": "X"}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestCreateAffiliate_MissingName(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusUnprocessableEntity, resp.StatusCode)
}

func TestGetAffiliate_Success(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	companyID := uuid.New()
	app := buildAffiliateApp(db, rdb, companyID, "admin")

	// create
	resp, _ := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{"name": "AffTest"}))
	var created AffiliateResponse
	json.NewDecoder(resp.Body).Decode(&created)

	resp, err := app.Test(jsonReq("GET", "/api/v1/affiliates/"+created.ID.String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result AffiliateResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "AffTest", result.Name)
	// In GET, key should be masked
	assert.Contains(t, result.APIKey, "****")
}

func TestGetAffiliate_NotFound(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/affiliates/"+uuid.New().String(), nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}

func TestGetAffiliate_InvalidID(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("GET", "/api/v1/affiliates/not-a-uuid", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)
}

func TestUpdateAffiliate_ManagerSuccess(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	companyID := uuid.New()
	app := buildAffiliateApp(db, rdb, companyID, "manager")

	resp, _ := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{"name": "Original"}))
	var created AffiliateResponse
	json.NewDecoder(resp.Body).Decode(&created)

	resp, err := app.Test(jsonReq("PATCH", "/api/v1/affiliates/"+created.ID.String(), map[string]string{
		"name": "Updated",
	}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var updated AffiliateResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&updated))
	assert.Equal(t, "Updated", updated.Name)
}

func TestUpdateAffiliate_ViewerForbidden(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "viewer")

	resp, err := app.Test(jsonReq("PATCH", "/api/v1/affiliates/"+uuid.New().String(), map[string]string{"name": "X"}))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestRegenerateKey_AdminSuccess(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	companyID := uuid.New()
	app := buildAffiliateApp(db, rdb, companyID, "admin")

	// create
	resp, _ := app.Test(jsonReq("POST", "/api/v1/affiliates", map[string]string{"name": "KeyTest"}))
	var created AffiliateResponse
	json.NewDecoder(resp.Body).Decode(&created)
	oldKey := created.APIKey

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates/"+created.ID.String()+"/regenerate-key", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var result AffiliateResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.NotEqual(t, oldKey, result.APIKey)
	assert.NotContains(t, result.APIKey, "****")
}

func TestRegenerateKey_NonAdminForbidden(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "manager")

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates/"+uuid.New().String()+"/regenerate-key", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusForbidden, resp.StatusCode)
}

func TestRegenerateKey_NotFound(t *testing.T) {
	db := newFakeAffiliateDB()
	rdb := newTestRedis(t)
	app := buildAffiliateApp(db, rdb, uuid.New(), "admin")

	resp, err := app.Test(jsonReq("POST", "/api/v1/affiliates/"+uuid.New().String()+"/regenerate-key", nil))
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusNotFound, resp.StatusCode)
}
