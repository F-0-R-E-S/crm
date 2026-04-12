package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

type WebhookSender struct {
	logger     *slog.Logger
	httpClient *http.Client
}

func NewWebhookSender(logger *slog.Logger) *WebhookSender {
	return &WebhookSender{
		logger:     logger,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (w *WebhookSender) Send(ctx context.Context, url, eventType string, data map[string]interface{}) error {
	payload := map[string]interface{}{
		"event_type": eventType,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"data":       data,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal webhook payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create webhook request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "GambChamp-CRM/1.0 (Webhook)")
	req.Header.Set("X-Event-Type", eventType)

	resp, err := w.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("webhook delivery: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		w.logger.Info("webhook delivered", "url", url, "event_type", eventType, "status", resp.StatusCode)
		return nil
	}

	return fmt.Errorf("webhook returned %d", resp.StatusCode)
}
