package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/messaging"
)

// 17+ event types matching HyperOne standard.
const (
	EventLeadReceived        = "lead.received"
	EventLeadRouted          = "lead.routed"
	EventLeadDelivered       = "lead.delivered"
	EventLeadFailed          = "lead.delivery_failed"
	EventStatusUpdated       = "lead.status_updated"
	EventLeadFraud           = "lead.fraud.flagged"
	EventShaveDetected       = "lead.shave_detected"
	EventCapThreshold80      = "cap.threshold.80pct"
	EventCapExhausted        = "cap.exhausted"
	EventAffiliateCreated    = "affiliate.created"
	EventBrokerHealthChanged = "broker.integration.health_changed"
	EventAutologinStarted    = "lead.autologin.started"
	EventAutologinCompleted  = "lead.autologin.completed"
	EventAutologinFailed     = "lead.autologin.failed"
	EventUserRegistered      = "user.registered"
	EventUserLogin           = "user.login"
	EventUserInvited         = "user.invited"
	EventFTDReceived         = "lead.ftd"
)

var AllEventTypes = []string{
	EventLeadReceived, EventLeadRouted, EventLeadDelivered, EventLeadFailed,
	EventStatusUpdated, EventLeadFraud, EventShaveDetected,
	EventCapThreshold80, EventCapExhausted,
	EventAffiliateCreated, EventBrokerHealthChanged,
	EventAutologinStarted, EventAutologinCompleted, EventAutologinFailed,
	EventUserRegistered, EventUserLogin, EventUserInvited,
	EventFTDReceived,
}

type EventRouter struct {
	logger   *slog.Logger
	store    *Store
	nats     *messaging.NATSClient
	telegram *TelegramSender
	email    *EmailSender
	webhook  *WebhookSender
}

func NewEventRouter(logger *slog.Logger, store *Store, nats *messaging.NATSClient, telegram *TelegramSender, email *EmailSender, webhook *WebhookSender) *EventRouter {
	return &EventRouter{
		logger:   logger,
		store:    store,
		nats:     nats,
		telegram: telegram,
		email:    email,
		webhook:  webhook,
	}
}

func (r *EventRouter) Start(ctx context.Context) error {
	for _, eventType := range AllEventTypes {
		et := eventType
		consumerName := "notification-" + et
		handler := func(ctx context.Context, event messaging.CloudEvent) error {
			return r.routeEvent(ctx, et, event)
		}
		if err := r.nats.Subscribe(ctx, "leads", consumerName, handler); err != nil {
			r.logger.Warn("subscribe failed, consumer may not exist yet", "event_type", et, "error", err)
		} else {
			r.logger.Info("subscribed to event", "event_type", et)
		}
	}
	return nil
}

func (r *EventRouter) routeEvent(ctx context.Context, eventType string, event messaging.CloudEvent) error {
	dataBytes, err := json.Marshal(event.Data)
	if err != nil {
		return nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal(dataBytes, &data); err != nil {
		return nil
	}

	tenantID, _ := data["tenant_id"].(string)
	if tenantID == "" {
		return nil
	}

	prefs, err := r.store.ListTenantPreferences(ctx, tenantID)
	if err != nil {
		r.logger.Error("get tenant preferences", "tenant_id", tenantID, "error", err)
		return nil
	}

	for _, pref := range prefs {
		if !r.eventMatchesFilter(eventType, data, pref) {
			continue
		}

		if pref.TelegramEnabled && pref.TelegramChatID != "" && r.telegram.Enabled() {
			text := r.telegram.FormatEvent(eventType, data)
			if err := r.telegram.Send(ctx, pref.TelegramChatID, text); err != nil {
				r.logger.Warn("telegram send failed", "chat_id", pref.TelegramChatID, "error", err)
			} else {
				r.saveNotification(ctx, tenantID, pref.UserID, "telegram", eventType, text, data)
			}
		}

		if pref.EmailEnabled {
			subject, body := r.email.FormatEvent(eventType, data)
			// TODO: look up user email from users table
			r.logger.Debug("email notification prepared", "user_id", pref.UserID, "subject", subject)
			_ = subject
			_ = body
		}

		if pref.WebhookEnabled && pref.WebhookURL != "" {
			if err := r.webhook.Send(ctx, pref.WebhookURL, eventType, data); err != nil {
				r.logger.Warn("webhook send failed", "url", pref.WebhookURL, "error", err)
			} else {
				r.saveNotification(ctx, tenantID, pref.UserID, "webhook", eventType, "", data)
			}
		}
	}

	return nil
}

func (r *EventRouter) eventMatchesFilter(eventType string, data map[string]interface{}, pref NotificationPrefs) bool {
	if len(pref.EventFilters) == 0 || string(pref.EventFilters) == "{}" {
		return true
	}

	var filters struct {
		Events     []string `json:"events"`
		Affiliates []string `json:"affiliates"`
		Countries  []string `json:"countries"`
		Brands     []string `json:"brands"`
	}
	if err := json.Unmarshal(pref.EventFilters, &filters); err != nil {
		return true
	}

	if len(filters.Events) > 0 {
		matched := false
		for _, e := range filters.Events {
			if e == eventType || e == "*" {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}

	if len(filters.Affiliates) > 0 {
		affiliateID, _ := data["affiliate_id"].(string)
		if affiliateID != "" {
			matched := false
			for _, a := range filters.Affiliates {
				if a == affiliateID {
					matched = true
					break
				}
			}
			if !matched {
				return false
			}
		}
	}

	if len(filters.Countries) > 0 {
		country, _ := data["country"].(string)
		if country != "" {
			matched := false
			for _, c := range filters.Countries {
				if c == country {
					matched = true
					break
				}
			}
			if !matched {
				return false
			}
		}
	}

	return true
}

func (r *EventRouter) saveNotification(ctx context.Context, tenantID, userID, channel, eventType, body string, data map[string]interface{}) {
	metadata, _ := json.Marshal(data)
	now := time.Now()
	n := &NotificationRecord{
		TenantID:  tenantID,
		UserID:    userID,
		Channel:   channel,
		EventType: eventType,
		Title:     eventType,
		Body:      body,
		Metadata:  metadata,
		SentAt:    &now,
	}
	if err := r.store.SaveNotification(ctx, n); err != nil {
		r.logger.Warn("save notification record", "error", err)
	}
}
