package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/models"
)

// DeliveryResult contains the outcome of a lead delivery attempt.
type DeliveryResult struct {
	Success       bool   `json:"success"`
	BrokerLeadID  string `json:"broker_lead_id,omitempty"`
	AutologinURL  string `json:"autologin_url,omitempty"`
	StatusCode    int    `json:"status_code"`
	RawResponse   string `json:"raw_response,omitempty"`
	Error         string `json:"error,omitempty"`
	Attempts      int    `json:"attempts"`
	TotalDuration int64  `json:"total_duration_ms"`
}

// Deliverer handles HTTP delivery of leads to broker APIs with retry logic
// and full request/response logging for transparency.
type Deliverer struct {
	client     *http.Client
	engine     *TemplateEngine
	store      *Store
	maxRetries int
	logger     *slog.Logger
}

func NewDeliverer(store *Store, engine *TemplateEngine, timeout time.Duration, maxRetries int, logger *slog.Logger) *Deliverer {
	return &Deliverer{
		client: &http.Client{
			Timeout: timeout,
			// Do not follow redirects automatically — capture the response as-is.
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
		engine:     engine,
		store:      store,
		maxRetries: maxRetries,
		logger:     logger,
	}
}

// Deliver builds a request from the template, sends it to the broker API with
// exponential backoff retries, and records each attempt as a lead_event.
func (d *Deliverer) Deliver(ctx context.Context, lead *models.Lead, bwt *BrokerWithTemplate) (*DeliveryResult, error) {
	broker := &bwt.Broker
	tmpl := &bwt.Template

	start := time.Now()
	var lastErr error
	var result *DeliveryResult

	for attempt := 1; attempt <= d.maxRetries; attempt++ {
		if attempt > 1 {
			// Exponential backoff: 1s, 2s, 4s, ...
			backoff := time.Duration(math.Pow(2, float64(attempt-2))) * time.Second
			d.logger.Info("retrying delivery",
				"lead_id", lead.ID,
				"broker_id", broker.ID,
				"attempt", attempt,
				"backoff", backoff,
			)

			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
			}
		}

		attemptStart := time.Now()
		result, lastErr = d.doDeliver(ctx, lead, broker, tmpl, attempt)
		attemptDuration := time.Since(attemptStart)

		// Record every attempt as a lead_event for transparency.
		d.recordAttempt(ctx, lead, broker, tmpl, result, attempt, attemptDuration, lastErr)

		if lastErr == nil && result.Success {
			result.TotalDuration = time.Since(start).Milliseconds()
			return result, nil
		}

		// Only retry on server errors (5xx) or timeouts, not on 4xx client errors.
		if result != nil && result.StatusCode >= 400 && result.StatusCode < 500 {
			result.TotalDuration = time.Since(start).Milliseconds()
			return result, nil
		}
	}

	// All retries exhausted.
	if result == nil {
		result = &DeliveryResult{
			Success: false,
			Error:   "all delivery attempts failed",
		}
	}
	if lastErr != nil {
		result.Error = lastErr.Error()
	}
	result.TotalDuration = time.Since(start).Milliseconds()
	return result, lastErr
}

// doDeliver executes a single delivery attempt.
func (d *Deliverer) doDeliver(ctx context.Context, lead *models.Lead, broker *models.Broker, tmpl *models.BrokerTemplate, attempt int) (*DeliveryResult, error) {
	// Build the HTTP request from template + lead data.
	req, err := d.engine.BuildRequest(lead, broker, tmpl)
	if err != nil {
		return &DeliveryResult{
			Success:  false,
			Attempts: attempt,
			Error:    fmt.Sprintf("build request: %s", err),
		}, err
	}
	req = req.WithContext(ctx)

	d.logger.Info("sending delivery request",
		"lead_id", lead.ID,
		"broker_id", broker.ID,
		"method", req.Method,
		"url", d.engine.SanitizeURL(req.URL.String()),
		"attempt", attempt,
	)

	// Execute the HTTP request.
	resp, err := d.client.Do(req)
	if err != nil {
		return &DeliveryResult{
			Success:  false,
			Attempts: attempt,
			Error:    fmt.Sprintf("http request: %s", err),
		}, err
	}
	defer resp.Body.Close()

	// Read and limit response body to 64KB for safety.
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return &DeliveryResult{
			Success:    false,
			StatusCode: resp.StatusCode,
			Attempts:   attempt,
			Error:      fmt.Sprintf("read response: %s", err),
		}, err
	}

	rawResponse := string(bodyBytes)

	// Check if delivery was successful (2xx status).
	success := resp.StatusCode >= 200 && resp.StatusCode < 300

	result := &DeliveryResult{
		Success:     success,
		StatusCode:  resp.StatusCode,
		RawResponse: rawResponse,
		Attempts:    attempt,
	}

	if !success {
		result.Error = fmt.Sprintf("broker returned HTTP %d", resp.StatusCode)
		return result, fmt.Errorf("broker returned HTTP %d: %s", resp.StatusCode, truncate(rawResponse, 200))
	}

	// Parse broker response to extract broker_lead_id and autologin_url.
	brokerLeadID, autologinURL, parseErr := d.engine.ParseResponse(
		bytes.NewReader(bodyBytes),
		tmpl.ResponseMapping,
	)
	if parseErr != nil {
		d.logger.Warn("failed to parse broker response",
			"lead_id", lead.ID,
			"broker_id", broker.ID,
			"error", parseErr,
		)
	}

	result.BrokerLeadID = brokerLeadID
	result.AutologinURL = autologinURL

	return result, nil
}

// recordAttempt persists a delivery attempt as a lead_event with full
// request/response bodies for transparency (inspired by Trackbox approach).
func (d *Deliverer) recordAttempt(ctx context.Context, lead *models.Lead, broker *models.Broker, tmpl *models.BrokerTemplate, result *DeliveryResult, attempt int, duration time.Duration, deliveryErr error) {
	eventType := "delivery_attempt"
	if result != nil && result.Success {
		eventType = "delivery_success"
	} else if attempt >= d.maxRetries {
		eventType = "delivery_failed"
	}

	// Build the request body log — reconstruct what was sent.
	reqLog := map[string]interface{}{
		"method":    tmpl.Method,
		"url":       d.engine.SanitizeURL(tmpl.URLTemplate),
		"broker_id": broker.ID,
		"attempt":   attempt,
	}
	if broker.Endpoint != "" {
		reqLog["endpoint"] = d.engine.SanitizeURL(broker.Endpoint)
	}
	reqBody, _ := json.Marshal(reqLog)

	// Response body log.
	var respBody json.RawMessage
	if result != nil && result.RawResponse != "" {
		respBody = json.RawMessage(result.RawResponse)
		// If it's not valid JSON, wrap it.
		if !json.Valid(respBody) {
			wrapped, _ := json.Marshal(map[string]string{"raw": result.RawResponse})
			respBody = wrapped
		}
	}

	statusCode := 0
	if result != nil {
		statusCode = result.StatusCode
	}

	errMsg := ""
	if deliveryErr != nil {
		errMsg = deliveryErr.Error()
	} else if result != nil && result.Error != "" {
		errMsg = result.Error
	}

	event := &models.LeadEvent{
		LeadID:       lead.ID,
		TenantID:     lead.TenantID,
		EventType:    eventType,
		BrokerID:     broker.ID,
		RequestBody:  reqBody,
		ResponseBody: respBody,
		StatusCode:   statusCode,
		Duration:     duration,
		Error:        errMsg,
	}

	if err := d.store.CreateLeadEvent(ctx, event); err != nil {
		d.logger.Error("failed to record delivery attempt",
			"lead_id", lead.ID,
			"broker_id", broker.ID,
			"attempt", attempt,
			"error", err,
		)
	}
}

// truncate limits a string to maxLen characters, appending "..." if truncated.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
