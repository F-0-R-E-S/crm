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

type PostbackWorker struct {
	logger     *slog.Logger
	store      *Store
	httpClient *http.Client
	batchSize  int
	interval   time.Duration
}

func NewPostbackWorker(logger *slog.Logger, store *Store) *PostbackWorker {
	return &PostbackWorker{
		logger: logger,
		store:  store,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		batchSize: 50,
		interval:  5 * time.Second,
	}
}

func (w *PostbackWorker) Run(ctx context.Context) {
	w.logger.Info("postback worker started", "batch_size", w.batchSize, "interval", w.interval)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("postback worker stopping")
			return
		case <-ticker.C:
			w.processBatch(ctx)
		}
	}
}

func (w *PostbackWorker) processBatch(ctx context.Context) {
	jobs, err := w.store.FetchPendingPostbacks(ctx, w.batchSize)
	if err != nil {
		w.logger.Error("fetch pending postbacks", "error", err)
		return
	}

	for _, job := range jobs {
		w.deliver(ctx, job)
	}
}

func (w *PostbackWorker) deliver(ctx context.Context, job PostbackJob) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, job.URL, bytes.NewReader(job.Payload))
	if err != nil {
		w.logger.Error("create postback request", "error", err, "job_id", job.ID)
		_ = w.store.MarkPostbackFailed(ctx, job.ID, fmt.Sprintf("build request: %v", err), 0)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "GambChamp-CRM/1.0 (Postback)")
	req.Header.Set("X-Event-Type", job.EventType)

	resp, err := w.httpClient.Do(req)
	if err != nil {
		w.logger.Warn("postback delivery failed",
			"job_id", job.ID,
			"url", job.URL,
			"attempt", job.Attempts+1,
			"error", err,
		)
		_ = w.store.MarkPostbackFailed(ctx, job.ID, err.Error(), 0)
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		_ = w.store.MarkPostbackComplete(ctx, job.ID)
		w.logger.Info("postback delivered",
			"job_id", job.ID,
			"affiliate_id", job.AffiliateID,
			"lead_id", job.LeadID,
			"event_type", job.EventType,
			"status_code", resp.StatusCode,
		)
	} else {
		_ = w.store.MarkPostbackFailed(ctx, job.ID, fmt.Sprintf("HTTP %d", resp.StatusCode), resp.StatusCode)
		w.logger.Warn("postback got non-2xx",
			"job_id", job.ID,
			"url", job.URL,
			"status_code", resp.StatusCode,
			"attempt", job.Attempts+1,
		)
	}
}

// EnqueueAffiliatePostback checks if the affiliate has a postback URL configured
// for this event type, and if so, enqueues a delivery job.
func (w *PostbackWorker) EnqueueAffiliatePostback(ctx context.Context, tenantID, affiliateID, leadID, eventType string, data map[string]interface{}) error {
	url, eventsJSON, err := w.store.GetAffiliatePostback(ctx, tenantID, affiliateID)
	if err != nil || url == "" {
		return err
	}

	var enabledEvents []string
	if err := json.Unmarshal(eventsJSON, &enabledEvents); err != nil {
		return nil
	}

	enabled := false
	for _, e := range enabledEvents {
		if e == eventType || e == "*" {
			enabled = true
			break
		}
	}
	if !enabled {
		return nil
	}

	payload, _ := json.Marshal(data)
	return w.store.EnqueuePostback(ctx, tenantID, affiliateID, leadID, eventType, url, payload)
}
