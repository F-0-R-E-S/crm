//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/gambchamp/crm/pkg/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	infra       *Infra
	cluster     *ServiceCluster
	mockBroker  *MockBroker
	mockBroker2 *MockBroker
)

func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	var err error

	// 1. Connect to infrastructure
	infra, err = SetupInfra(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: setup infra: %v\n", err)
		fmt.Fprintln(os.Stderr, "Make sure Postgres, Redis, and NATS are running.")
		fmt.Fprintln(os.Stderr, "  docker compose up -d postgres redis nats")
		fmt.Fprintln(os.Stderr, "  createdb -U postgres gambchamp_e2e")
		os.Exit(1)
	}
	defer infra.Close()

	// 2. Run migrations
	if err := infra.RunMigrations(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: migrations: %v\n", err)
		os.Exit(1)
	}

	// 3. Initialize JetStream streams and consumers
	if err := infra.InitJetStream(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: jetstream: %v\n", err)
		os.Exit(1)
	}

	// 4. Start mock broker servers
	mockBroker = NewMockBroker()
	defer mockBroker.Close()
	mockBroker2 = NewMockBroker()
	defer mockBroker2.Close()

	// 5. Seed test data (broker endpoints point to mock servers)
	if err := infra.CleanDB(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "WARN: clean DB: %v\n", err)
	}
	if err := SeedTestData(ctx, infra.Pool, SeedOpts{
		BrokerEndpoint:  mockBroker.URL(),
		Broker2Endpoint: mockBroker2.URL(),
	}); err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: seed: %v\n", err)
		os.Exit(1)
	}

	// 6. Build and start all services as subprocesses
	cluster, err = StartServiceCluster(ctx, infra.pgDSN, infra.redisURL, infra.natsURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: start services: %v\n", err)
		os.Exit(1)
	}
	defer cluster.Stop()

	fmt.Printf("E2E test infrastructure ready:\n")
	fmt.Printf("  lead-intake:    %s\n", cluster.Intake.BaseURL)
	fmt.Printf("  routing-engine: %s\n", cluster.Routing.BaseURL)
	fmt.Printf("  broker-adapter: %s\n", cluster.Broker.BaseURL)
	fmt.Printf("  status-sync:    %s\n", cluster.StatusSync.BaseURL)
	fmt.Printf("  mock-broker:    %s\n", mockBroker.URL())
	fmt.Printf("  mock-broker-2:  %s\n", mockBroker2.URL())

	code := m.Run()
	cancel()
	os.Exit(code)
}

// ============================================================================
// Scenario 1: Happy Path — Lead submission → Routing → Delivery → FTD Postback
// ============================================================================

func TestE2E_HappyPath_LeadToFTD(t *testing.T) {
	cleanBetweenTests(t)

	email := uniqueEmail("happy")

	// Step 1: Submit lead via POST /api/v1/leads
	statusCode, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
		FirstName:   "Ivan",
		LastName:    "Petrov",
		Email:       email,
		Phone:       "+79991234567",
		Country:     "RU",
		IP:          "185.1.2.3",
		AffiliateID: TestAffiliateID,
	})
	require.Equal(t, http.StatusAccepted, statusCode, "expected 202, body: %s", body)

	resp := ParseLeadResponse(t, body)
	require.NotEmpty(t, resp.ID)
	assert.Equal(t, "new", resp.Status)
	t.Logf("lead created: %s", resp.ID)

	// Step 2: Wait for async pipeline: intake → routing → broker delivery
	WaitForLeadStatus(t, infra.Pool, resp.ID, models.LeadStatusDelivered, 20*time.Second)
	t.Log("lead delivered to broker")

	// Step 3: Verify mock broker received the request
	require.GreaterOrEqual(t, mockBroker.RequestCount(), 1)
	lastReq := mockBroker.LastRequest()
	assert.NotEmpty(t, lastReq.Body["email"])
	assert.NotEmpty(t, lastReq.Body["first_name"])

	// Step 4: Verify lead_events in DB trace the full pipeline
	events := GetLeadEvents(t, infra.Pool, resp.ID)
	types := EventTypes(events)
	assert.Contains(t, types, "lead.received", "should have intake event")
	assert.Contains(t, types, "lead.routed", "should have routing event")

	// Step 5: Simulate FTD postback from broker
	// Wait for status-sync to record delivery_success event (broker_lead_id mapping)
	time.Sleep(2 * time.Second)

	brokerLeadID := mockBroker.LastBrokerLeadID()
	require.NotEmpty(t, brokerLeadID)

	postbackCode, postbackBody := SendPostback(t, cluster.StatusSync.BaseURL, TestBrokerID, PostbackRequest{
		LeadID: brokerLeadID,
		Status: "ftd",
	})
	require.Equal(t, http.StatusOK, postbackCode, "postback: %s", postbackBody)

	// Step 6: Verify lead status updated to FTD
	WaitForLeadStatusString(t, infra.Pool, resp.ID, "ftd", 5*time.Second)

	// Step 7: Verify postback event recorded
	eventsAfter := GetLeadEvents(t, infra.Pool, resp.ID)
	typesAfter := EventTypes(eventsAfter)
	assert.Contains(t, typesAfter, "postback_received")

	t.Logf("PASS: full lifecycle new → routed → delivered → ftd for lead %s", resp.ID)
}

// ============================================================================
// Scenario 2: Duplicate Detection
// ============================================================================

func TestE2E_DuplicateLead(t *testing.T) {
	cleanBetweenTests(t)

	email := uniqueEmail("dup")

	req := CreateLeadRequest{
		FirstName:   "Duplicate",
		LastName:    "Test",
		Email:       email,
		Phone:       "+79997654321",
		Country:     "RU",
		IP:          "185.1.2.3",
		AffiliateID: TestAffiliateID,
	}

	// First submission succeeds
	code1, body1 := PostLead(t, cluster.Intake.BaseURL, req)
	require.Equal(t, http.StatusAccepted, code1, "first: %s", body1)
	resp1 := ParseLeadResponse(t, body1)

	// Second submission with same email → 409 Conflict
	code2, body2 := PostLead(t, cluster.Intake.BaseURL, req)
	require.Equal(t, http.StatusConflict, code2, "second should be 409: %s", body2)

	errResp := ParseErrorResponse(t, body2)
	assert.Equal(t, "DUPLICATE_LEAD", errResp.Error.Code)

	t.Logf("PASS: duplicate detected, original=%s", resp1.ID)
}

// ============================================================================
// Scenario 3: Idempotency Key
// ============================================================================

func TestE2E_IdempotencyKey(t *testing.T) {
	cleanBetweenTests(t)

	email := uniqueEmail("idemp")
	idempKey := fmt.Sprintf("idemp-%d", time.Now().UnixNano())

	req := CreateLeadRequest{
		FirstName:   "Idempotent",
		LastName:    "Test",
		Email:       email,
		Phone:       "+79995551234",
		Country:     "RU",
		IP:          "185.1.2.3",
		AffiliateID: TestAffiliateID,
	}
	headers := map[string]string{"Idempotency-Key": idempKey}

	// First call → 202 Accepted
	code1, body1 := PostLeadWithHeaders(t, cluster.Intake.BaseURL, req, headers)
	require.Equal(t, http.StatusAccepted, code1, "first: %s", body1)
	resp1 := ParseLeadResponse(t, body1)

	// Second call with same key → 200 (idempotent replay)
	code2, body2 := PostLeadWithHeaders(t, cluster.Intake.BaseURL, req, headers)
	require.Equal(t, http.StatusOK, code2, "replay should be 200: %s", body2)
	resp2 := ParseLeadResponse(t, body2)

	assert.Equal(t, resp1.ID, resp2.ID, "same idempotency key must return same lead")

	t.Logf("PASS: idempotency key=%s, lead=%s", idempKey, resp1.ID)
}

// ============================================================================
// Scenario 4: Validation Errors
// ============================================================================

func TestE2E_ValidationErrors(t *testing.T) {
	cleanBetweenTests(t)

	// Missing required fields
	code, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
		LastName: "Only",
		Country:  "RU",
	})
	assert.Equal(t, http.StatusUnprocessableEntity, code, "should be 422: %s", body)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(body, &resp))
	errObj := resp["error"].(map[string]interface{})
	assert.Equal(t, "VALIDATION_ERROR", errObj["code"])

	fields := errObj["fields"].([]interface{})
	assert.GreaterOrEqual(t, len(fields), 2, "at least 2 field errors: email, phone")
}

// ============================================================================
// Scenario 5: Broker Rejects Lead (HTTP 400)
// ============================================================================

func TestE2E_BrokerReject(t *testing.T) {
	cleanBetweenTests(t)

	mockBroker.SetStatusCode(400)
	defer mockBroker.SetStatusCode(200)

	email := uniqueEmail("reject")

	code, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
		FirstName:   "Rejected",
		LastName:    "Lead",
		Email:       email,
		Phone:       "+79990001122",
		Country:     "RU",
		IP:          "185.1.2.3",
		AffiliateID: TestAffiliateID,
	})
	require.Equal(t, http.StatusAccepted, code, "%s", body)
	resp := ParseLeadResponse(t, body)

	// Broker returns 400 → no retry (4xx) → lead rejected
	WaitForLeadStatus(t, infra.Pool, resp.ID, models.LeadStatusRejected, 20*time.Second)

	events := GetLeadEvents(t, infra.Pool, resp.ID)
	types := EventTypes(events)
	assert.Contains(t, types, "delivery_failed")

	t.Logf("PASS: lead %s correctly rejected after broker 400", resp.ID)
}

// ============================================================================
// Scenario 6: Postback Lookup by Broker Reference and by Internal ID
// ============================================================================

func TestE2E_PostbackLookup(t *testing.T) {
	cleanBetweenTests(t)

	email := uniqueEmail("postback")

	code, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
		FirstName:   "Postback",
		LastName:    "Test",
		Email:       email,
		Phone:       "+79998887766",
		Country:     "RU",
		IP:          "185.1.2.3",
		AffiliateID: TestAffiliateID,
	})
	require.Equal(t, http.StatusAccepted, code, "%s", body)
	resp := ParseLeadResponse(t, body)

	WaitForLeadStatus(t, infra.Pool, resp.ID, models.LeadStatusDelivered, 20*time.Second)

	// Wait for delivery_success event to be recorded
	time.Sleep(2 * time.Second)

	// Postback by broker_lead_id
	brokerLeadID := mockBroker.LastBrokerLeadID()
	require.NotEmpty(t, brokerLeadID)

	postbackCode, _ := SendPostback(t, cluster.StatusSync.BaseURL, TestBrokerID, PostbackRequest{
		LeadID: brokerLeadID,
		Status: "rejected",
	})
	assert.Equal(t, http.StatusOK, postbackCode)
	WaitForLeadStatusString(t, infra.Pool, resp.ID, "rejected", 5*time.Second)

	// Reset and test postback by internal lead ID (fallback path)
	infra.Pool.Exec(context.Background(), "UPDATE leads SET status = 'delivered' WHERE id = $1", resp.ID)

	postbackCode2, _ := SendPostback(t, cluster.StatusSync.BaseURL, TestBrokerID, PostbackRequest{
		LeadID: resp.ID,
		Status: "ftd",
	})
	assert.Equal(t, http.StatusOK, postbackCode2)
	WaitForLeadStatusString(t, infra.Pool, resp.ID, "ftd", 5*time.Second)

	t.Logf("PASS: postback lookup works by both broker ref and internal ID")
}

// ============================================================================
// Scenario 7: Multiple Leads Processed Concurrently
// ============================================================================

func TestE2E_MultipleLeads(t *testing.T) {
	cleanBetweenTests(t)

	const n = 5
	leadIDs := make([]string, n)

	for i := 0; i < n; i++ {
		email := uniqueEmail(fmt.Sprintf("multi%d", i))
		code, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
			FirstName:   fmt.Sprintf("Multi%d", i),
			LastName:    "Test",
			Email:       email,
			Phone:       fmt.Sprintf("+7999000%04d", i),
			Country:     "RU",
			IP:          "185.1.2.3",
			AffiliateID: TestAffiliateID,
		})
		require.Equal(t, http.StatusAccepted, code, "lead %d: %s", i, body)
		leadIDs[i] = ParseLeadResponse(t, body).ID
	}

	for i, id := range leadIDs {
		WaitForLeadStatus(t, infra.Pool, id, models.LeadStatusDelivered, 25*time.Second)
		t.Logf("lead %d (%s) delivered", i, id)
	}

	assert.GreaterOrEqual(t, mockBroker.RequestCount(), n)

	t.Logf("PASS: %d leads processed through full pipeline", n)
}

// ============================================================================
// Scenario 8: GET /api/v1/leads/{id} returns lead + events
// ============================================================================

func TestE2E_GetLeadWithEvents(t *testing.T) {
	cleanBetweenTests(t)

	email := uniqueEmail("getlead")

	code, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
		FirstName:   "GetLead",
		LastName:    "Test",
		Email:       email,
		Phone:       "+79993334455",
		Country:     "RU",
		IP:          "185.1.2.3",
		AffiliateID: TestAffiliateID,
	})
	require.Equal(t, http.StatusAccepted, code, "%s", body)
	resp := ParseLeadResponse(t, body)

	WaitForLeadStatus(t, infra.Pool, resp.ID, models.LeadStatusDelivered, 20*time.Second)

	getReq, _ := http.NewRequest("GET", cluster.Intake.BaseURL+"/api/v1/leads/"+resp.ID, nil)
	getReq.Header.Set("X-Tenant-ID", TestTenantID)
	getResp, err := http.DefaultClient.Do(getReq)
	require.NoError(t, err)
	defer getResp.Body.Close()

	assert.Equal(t, http.StatusOK, getResp.StatusCode)

	var leadResp struct {
		Lead   json.RawMessage `json:"lead"`
		Events []interface{}   `json:"events"`
	}
	require.NoError(t, json.NewDecoder(getResp.Body).Decode(&leadResp))

	assert.NotEmpty(t, leadResp.Lead)
	assert.NotEmpty(t, leadResp.Events, "should have events after delivery")
}

// ============================================================================
// Scenario 9: GET /api/v1/leads — listing with pagination
// ============================================================================

func TestE2E_ListLeads(t *testing.T) {
	cleanBetweenTests(t)

	for i := 0; i < 3; i++ {
		email := uniqueEmail(fmt.Sprintf("list%d", i))
		code, body := PostLead(t, cluster.Intake.BaseURL, CreateLeadRequest{
			FirstName:   fmt.Sprintf("List%d", i),
			LastName:    "Test",
			Email:       email,
			Phone:       fmt.Sprintf("+7999111%04d", i),
			Country:     "RU",
			IP:          "185.1.2.3",
			AffiliateID: TestAffiliateID,
		})
		require.Equal(t, http.StatusAccepted, code, "lead %d: %s", i, body)
	}

	time.Sleep(500 * time.Millisecond)

	listReq, _ := http.NewRequest("GET", cluster.Intake.BaseURL+"/api/v1/leads?limit=10", nil)
	listReq.Header.Set("X-Tenant-ID", TestTenantID)
	listResp, err := http.DefaultClient.Do(listReq)
	require.NoError(t, err)
	defer listResp.Body.Close()

	assert.Equal(t, http.StatusOK, listResp.StatusCode)

	var listBody struct {
		Leads  []interface{} `json:"leads"`
		Total  int           `json:"total"`
		Limit  int           `json:"limit"`
		Offset int           `json:"offset"`
	}
	require.NoError(t, json.NewDecoder(listResp.Body).Decode(&listBody))

	assert.GreaterOrEqual(t, listBody.Total, 3)
	assert.GreaterOrEqual(t, len(listBody.Leads), 3)
}

// ============================================================================
// Scenario 10: Postback 404 for unknown lead
// ============================================================================

func TestE2E_PostbackUnknownLead(t *testing.T) {
	cleanBetweenTests(t)

	code, _ := SendPostback(t, cluster.StatusSync.BaseURL, TestBrokerID, PostbackRequest{
		LeadID: "nonexistent-broker-ref",
		Status: "ftd",
	})
	assert.Equal(t, http.StatusNotFound, code)
}

// ============================================================================
// Helpers
// ============================================================================

func cleanBetweenTests(t *testing.T) {
	t.Helper()
	ctx := context.Background()

	infra.Pool.Exec(ctx, "DELETE FROM lead_events")
	infra.Pool.Exec(ctx, "DELETE FROM leads")
	infra.FlushRedis(ctx)
	infra.PurgeStreams(ctx)
	mockBroker.Reset()
	mockBroker2.Reset()

	time.Sleep(200 * time.Millisecond)
}

func uniqueEmail(prefix string) string {
	return fmt.Sprintf("%s+%d@example.com", prefix, time.Now().UnixNano())
}
