package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/gambchamp/crm/pkg/messaging"
)

type EventHandler struct {
	ctxMgr     *ContextManager
	sessionMgr *SessionManager
	nc         *messaging.NATSClient
	logger     *slog.Logger
}

func NewEventHandler(ctxMgr *ContextManager, sessionMgr *SessionManager, nc *messaging.NATSClient, logger *slog.Logger) *EventHandler {
	return &EventHandler{ctxMgr: ctxMgr, sessionMgr: sessionMgr, nc: nc, logger: logger}
}

func (eh *EventHandler) Start(ctx context.Context) error {
	return eh.nc.Subscribe(ctx, "leads", "assistant-svc", func(subCtx context.Context, event messaging.CloudEvent) error {
		return eh.handleEvent(subCtx, event)
	})
}

func (eh *EventHandler) handleEvent(ctx context.Context, event messaging.CloudEvent) error {
	tenantID := eh.extractTenantID(event)
	if tenantID == "" {
		return nil
	}

	// Update the cached context snapshot
	eh.ctxMgr.ApplyEvent(ctx, tenantID, event)

	// Push to active SSE sessions for this tenant
	summary := eh.eventToSSE(event)
	eh.sessionMgr.PushEvent(tenantID, summary)

	return nil
}

func (eh *EventHandler) extractTenantID(event messaging.CloudEvent) string {
	dataBytes, err := json.Marshal(event.Data)
	if err != nil {
		return ""
	}

	var payload struct {
		TenantID string `json:"tenant_id"`
	}
	if err := json.Unmarshal(dataBytes, &payload); err != nil {
		return ""
	}
	return payload.TenantID
}

func (eh *EventHandler) eventToSSE(event messaging.CloudEvent) SSEEvent {
	dataBytes, _ := json.Marshal(event.Data)

	sseData := map[string]interface{}{
		"type":      event.Type,
		"source":    event.Source,
		"timestamp": event.Time,
		"data":      json.RawMessage(dataBytes),
	}
	encoded, _ := json.Marshal(sseData)

	eventName := "realtime_event"
	switch event.Type {
	case "cap.exhausted", "broker.integration.health_changed":
		eventName = "alert"
	case "lead.fraud.flagged":
		eventName = "fraud_alert"
	}

	return SSEEvent{
		Event: eventName,
		Data:  string(encoded),
	}
}

func (eh *EventHandler) formatEventSummary(event messaging.CloudEvent) string {
	dataBytes, _ := json.Marshal(event.Data)
	var payload map[string]interface{}
	json.Unmarshal(dataBytes, &payload)

	switch event.Type {
	case "lead.received":
		return fmt.Sprintf("New lead received from affiliate %v", payload["affiliate_id"])
	case "lead.routed":
		return fmt.Sprintf("Lead routed to broker %v via rule %v", payload["broker_id"], payload["rule_id"])
	case "lead.delivered":
		return fmt.Sprintf("Lead delivered to broker %v", payload["broker_id"])
	case "lead.fraud.flagged":
		return fmt.Sprintf("Lead flagged as fraud (score: %v)", payload["score"])
	case "cap.exhausted":
		return fmt.Sprintf("Cap exhausted for %v", payload["entity_id"])
	case "broker.integration.health_changed":
		return fmt.Sprintf("Broker %v health: %v", payload["broker_id"], payload["status"])
	default:
		return event.Type
	}
}
