//go:build e2e

package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/gambchamp/crm/pkg/models"
)

type CreateLeadRequest struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	Country     string `json:"country"`
	IP          string `json:"ip"`
	AffiliateID string `json:"affiliate_id,omitempty"`
	FunnelName  string `json:"funnel_name,omitempty"`
}

type CreateLeadResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	PhoneE164 string `json:"phone_e164"`
}

type ErrorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type PostbackRequest struct {
	LeadID string `json:"lead_id"`
	Status string `json:"status"`
}

func PostLead(t *testing.T, baseURL string, req CreateLeadRequest) (int, []byte) {
	t.Helper()
	return PostLeadWithHeaders(t, baseURL, req, nil)
}

func PostLeadWithHeaders(t *testing.T, baseURL string, req CreateLeadRequest, extraHeaders map[string]string) (int, []byte) {
	t.Helper()

	body, err := json.Marshal(req)
	require.NoError(t, err)

	httpReq, err := http.NewRequest("POST", baseURL+"/api/v1/leads", bytes.NewReader(body))
	require.NoError(t, err)

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Tenant-ID", TestTenantID)
	httpReq.Header.Set("X-API-Key", "e2e-test-key")

	for k, v := range extraHeaders {
		httpReq.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(httpReq)
	require.NoError(t, err)
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp.StatusCode, respBody
}

func ParseLeadResponse(t *testing.T, body []byte) CreateLeadResponse {
	t.Helper()
	var resp CreateLeadResponse
	require.NoError(t, json.Unmarshal(body, &resp))
	return resp
}

func ParseErrorResponse(t *testing.T, body []byte) ErrorResponse {
	t.Helper()
	var resp ErrorResponse
	require.NoError(t, json.Unmarshal(body, &resp))
	return resp
}

func SendPostback(t *testing.T, baseURL, brokerID string, req PostbackRequest) (int, []byte) {
	t.Helper()

	body, err := json.Marshal(req)
	require.NoError(t, err)

	url := fmt.Sprintf("%s/api/v1/postback/%s", baseURL, brokerID)
	httpReq, err := http.NewRequest("POST", url, bytes.NewReader(body))
	require.NoError(t, err)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	require.NoError(t, err)
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp.StatusCode, respBody
}

func WaitForLeadStatus(t *testing.T, pool *pgxpool.Pool, leadID string, expected models.LeadStatus, timeout time.Duration) {
	t.Helper()
	ctx := context.Background()
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		var status string
		err := pool.QueryRow(ctx, "SELECT status FROM leads WHERE id = $1", leadID).Scan(&status)
		if err == nil && models.LeadStatus(status) == expected {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}

	var actual string
	pool.QueryRow(ctx, "SELECT status FROM leads WHERE id = $1", leadID).Scan(&actual)
	t.Fatalf("lead %s: expected status %q, got %q after %v", leadID, expected, actual, timeout)
}

func WaitForLeadStatusString(t *testing.T, pool *pgxpool.Pool, leadID string, expected string, timeout time.Duration) {
	t.Helper()
	ctx := context.Background()
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		var status string
		err := pool.QueryRow(ctx, "SELECT status FROM leads WHERE id = $1", leadID).Scan(&status)
		if err == nil && status == expected {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}

	var actual string
	pool.QueryRow(ctx, "SELECT status FROM leads WHERE id = $1", leadID).Scan(&actual)
	t.Fatalf("lead %s: expected status %q, got %q after %v", leadID, expected, actual, timeout)
}

func GetLeadEvents(t *testing.T, pool *pgxpool.Pool, leadID string) []models.LeadEvent {
	t.Helper()
	ctx := context.Background()

	rows, err := pool.Query(ctx,
		`SELECT id, lead_id, tenant_id, event_type, COALESCE(broker_id::text,''),
		        request_body, response_body, COALESCE(status_code,0), COALESCE(duration_ms,0), COALESCE(error,''),
		        created_at
		 FROM lead_events WHERE lead_id = $1 ORDER BY created_at ASC`, leadID)
	require.NoError(t, err)
	defer rows.Close()

	var events []models.LeadEvent
	for rows.Next() {
		var ev models.LeadEvent
		var durationMs int
		err := rows.Scan(
			&ev.ID, &ev.LeadID, &ev.TenantID, &ev.EventType, &ev.BrokerID,
			&ev.RequestBody, &ev.ResponseBody, &ev.StatusCode, &durationMs, &ev.Error,
			&ev.CreatedAt,
		)
		require.NoError(t, err)
		ev.Duration = time.Duration(durationMs) * time.Millisecond
		events = append(events, ev)
	}
	return events
}

func EventTypes(events []models.LeadEvent) []string {
	types := make([]string, len(events))
	for i, e := range events {
		types[i] = e.EventType
	}
	return types
}

func GetLeadStatus(t *testing.T, pool *pgxpool.Pool, leadID string) string {
	t.Helper()
	var status string
	err := pool.QueryRow(context.Background(), "SELECT status FROM leads WHERE id = $1", leadID).Scan(&status)
	require.NoError(t, err)
	return status
}
