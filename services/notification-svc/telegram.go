package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

type TelegramSender struct {
	logger     *slog.Logger
	token      string
	httpClient *http.Client
	apiBase    string
}

func NewTelegramSender(logger *slog.Logger, token string) *TelegramSender {
	return &TelegramSender{
		logger:     logger,
		token:      token,
		httpClient: &http.Client{Timeout: 10 * time.Second},
		apiBase:    "https://api.telegram.org",
	}
}

func (t *TelegramSender) Enabled() bool {
	return t.token != ""
}

func (t *TelegramSender) Send(ctx context.Context, chatID, text string) error {
	if !t.Enabled() {
		return fmt.Errorf("telegram not configured")
	}

	url := fmt.Sprintf("%s/bot%s/sendMessage", t.apiBase, t.token)

	body, _ := json.Marshal(map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var result struct {
			OK          bool   `json:"ok"`
			Description string `json:"description"`
		}
		json.NewDecoder(resp.Body).Decode(&result)
		return fmt.Errorf("telegram API error %d: %s", resp.StatusCode, result.Description)
	}

	return nil
}

func (t *TelegramSender) FormatEvent(eventType string, data map[string]interface{}) string {
	switch eventType {
	case EventCapExhausted:
		return fmt.Sprintf("🚫 <b>Cap Exhausted</b>\nAffiliate: %v\nDaily cap: %v\nLeads today: %v",
			data["affiliate_id"], data["daily_cap"], data["count"])
	case EventCapThreshold80:
		return fmt.Sprintf("⚠️ <b>Cap 80%% Warning</b>\nAffiliate: %v\nDaily cap: %v\nLeads today: %v",
			data["affiliate_id"], data["daily_cap"], data["count"])
	case EventLeadReceived:
		return fmt.Sprintf("📥 <b>New Lead</b>\nEmail: %v\nCountry: %v\nAffiliate: %v",
			data["email"], data["country"], data["affiliate_id"])
	case EventLeadDelivered:
		return fmt.Sprintf("✅ <b>Lead Delivered</b>\nLead: %v\nBroker: %v",
			data["lead_id"], data["broker_id"])
	case EventLeadFailed:
		return fmt.Sprintf("❌ <b>Delivery Failed</b>\nLead: %v\nBroker: %v\nError: %v",
			data["lead_id"], data["broker_id"], data["error"])
	case EventLeadFraud:
		return fmt.Sprintf("🛡 <b>Fraud Detected</b>\nLead: %v\nScore: %v",
			data["lead_id"], data["quality_score"])
	case EventShaveDetected:
		return fmt.Sprintf("⚠️ <b>Shave Detected</b>\nLead: %v\nBroker: %v\nOld: %v → New: %v",
			data["lead_id"], data["broker_id"], data["old_status"], data["new_status"])
	case EventStatusUpdated:
		return fmt.Sprintf("🔄 <b>Status Update</b>\nLead: %v\n%v → %v",
			data["lead_id"], data["old_status"], data["new_status"])
	case EventBrokerHealthChanged:
		return fmt.Sprintf("🏥 <b>Broker Health</b>\nBroker: %v\nStatus: %v",
			data["broker_id"], data["health_status"])
	case EventUserRegistered:
		return fmt.Sprintf("👤 <b>New User</b>\nEmail: %v", data["email"])
	case EventUserLogin:
		return fmt.Sprintf("🔐 <b>User Login</b>\nEmail: %v\nIP: %v", data["email"], data["ip"])
	case EventUserInvited:
		return fmt.Sprintf("📧 <b>User Invited</b>\nEmail: %v\nRole: %v", data["email"], data["role"])
	case EventAffiliateCreated:
		return fmt.Sprintf("🤝 <b>New Affiliate</b>\nName: %v\nEmail: %v", data["name"], data["email"])
	case EventAutologinStarted:
		return fmt.Sprintf("🔑 <b>Autologin Started</b>\nLead: %v\nBroker: %v", data["lead_id"], data["broker_id"])
	case EventAutologinCompleted:
		return fmt.Sprintf("✅ <b>Autologin Complete</b>\nLead: %v\nDuration: %vms", data["lead_id"], data["duration_ms"])
	case EventAutologinFailed:
		return fmt.Sprintf("❌ <b>Autologin Failed</b>\nLead: %v\nError: %v", data["lead_id"], data["error"])
	case EventFTDReceived:
		return fmt.Sprintf("💰 <b>FTD Received!</b>\nLead: %v\nBroker: %v", data["lead_id"], data["broker_id"])
	default:
		return fmt.Sprintf("📌 <b>%s</b>\n%v", eventType, data)
	}
}
