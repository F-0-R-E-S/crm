package main

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
)

type Subscriber struct {
	logger   *slog.Logger
	nats     *messaging.NATSClient
	postback *PostbackWorker
}

func NewSubscriber(logger *slog.Logger, nats *messaging.NATSClient, postback *PostbackWorker) *Subscriber {
	return &Subscriber{
		logger:   logger,
		nats:     nats,
		postback: postback,
	}
}

func (s *Subscriber) Start(ctx context.Context) error {
	subjects := []string{
		events.LeadStatusUpdated,
		events.LeadDelivered,
		events.LeadDeliveryFailed,
		events.LeadFraudFlagged,
		events.LeadShaveDetected,
	}

	for _, subject := range subjects {
		subj := subject
		handler := func(ctx context.Context, event messaging.CloudEvent) error {
			return s.handleEvent(ctx, subj, event)
		}
		if err := s.nats.Subscribe(ctx, "leads", "status-sync-postback-"+subj, handler); err != nil {
			s.logger.Warn("subscribe failed, will retry on stream creation", "subject", subj, "error", err)
		} else {
			s.logger.Info("subscribed to NATS consumer", "subject", subj)
		}
	}

	return nil
}

func (s *Subscriber) handleEvent(ctx context.Context, eventType string, event messaging.CloudEvent) error {
	dataBytes, err := json.Marshal(event.Data)
	if err != nil {
		s.logger.Error("marshal event data", "event_type", eventType, "error", err)
		return nil
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(dataBytes, &payload); err != nil {
		s.logger.Error("unmarshal event data", "event_type", eventType, "error", err)
		return nil
	}

	tenantID, _ := payload["tenant_id"].(string)
	affiliateID, _ := payload["affiliate_id"].(string)
	leadID, _ := payload["lead_id"].(string)

	if tenantID == "" || affiliateID == "" || leadID == "" {
		s.logger.Warn("event missing required fields", "event_type", eventType)
		return nil
	}

	postbackEventType := mapToPostbackEvent(eventType)
	if postbackEventType == "" {
		return nil
	}

	if err := s.postback.EnqueueAffiliatePostback(ctx, tenantID, affiliateID, leadID, postbackEventType, payload); err != nil {
		s.logger.Error("enqueue postback", "event_type", eventType, "lead_id", leadID, "error", err)
	}
	return nil
}

func mapToPostbackEvent(natsEvent string) string {
	switch natsEvent {
	case events.LeadDelivered:
		return "delivered"
	case events.LeadDeliveryFailed:
		return "rejected"
	case events.LeadStatusUpdated:
		return "status_updated"
	case events.LeadFraudFlagged:
		return "fraud"
	case events.LeadShaveDetected:
		return "shave_detected"
	default:
		return ""
	}
}
