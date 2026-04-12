//go:build e2e

package e2e

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"

	"github.com/google/uuid"
)

type ReceivedLead struct {
	Body          map[string]interface{}
	RawBody       []byte
	BrokerLeadID  string
	Headers       http.Header
}

type MockBroker struct {
	Server *httptest.Server

	mu           sync.Mutex
	requests     []ReceivedLead
	statusCode   int
	responseBody func(req ReceivedLead) (int, map[string]interface{})
}

func NewMockBroker() *MockBroker {
	mb := &MockBroker{
		statusCode: 200,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/lead", mb.handleLead)
	mb.Server = httptest.NewServer(mux)

	return mb
}

func (mb *MockBroker) handleLead(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	defer r.Body.Close()

	var parsed map[string]interface{}
	json.Unmarshal(body, &parsed)

	brokerLeadID := uuid.New().String()
	received := ReceivedLead{
		Body:         parsed,
		RawBody:      body,
		BrokerLeadID: brokerLeadID,
		Headers:      r.Header.Clone(),
	}

	mb.mu.Lock()
	mb.requests = append(mb.requests, received)

	var statusCode int
	var respBody map[string]interface{}

	if mb.responseBody != nil {
		statusCode, respBody = mb.responseBody(received)
	} else {
		statusCode = mb.statusCode
		respBody = map[string]interface{}{
			"lead_id":       brokerLeadID,
			"status":        "accepted",
			"autologin_url": "https://broker.test/autologin/" + brokerLeadID,
		}
	}
	mb.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(respBody)
}

func (mb *MockBroker) URL() string {
	return mb.Server.URL
}

func (mb *MockBroker) RequestCount() int {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	return len(mb.requests)
}

func (mb *MockBroker) Requests() []ReceivedLead {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	cp := make([]ReceivedLead, len(mb.requests))
	copy(cp, mb.requests)
	return cp
}

func (mb *MockBroker) LastRequest() ReceivedLead {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	if len(mb.requests) == 0 {
		return ReceivedLead{}
	}
	return mb.requests[len(mb.requests)-1]
}

func (mb *MockBroker) LastBrokerLeadID() string {
	return mb.LastRequest().BrokerLeadID
}

func (mb *MockBroker) SetStatusCode(code int) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.statusCode = code
	mb.responseBody = nil
}

func (mb *MockBroker) SetCustomResponse(fn func(req ReceivedLead) (int, map[string]interface{})) {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.responseBody = fn
}

func (mb *MockBroker) Reset() {
	mb.mu.Lock()
	defer mb.mu.Unlock()
	mb.requests = nil
	mb.statusCode = 200
	mb.responseBody = nil
}

func (mb *MockBroker) Close() {
	mb.Server.Close()
}
