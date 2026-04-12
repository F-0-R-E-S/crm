package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("GET /internal/uad/status", http.HandlerFunc(h.GetStatus))
}

type UADStatusResponse struct {
	QueueDepth     int    `json:"queue_depth"`
	Processing     int    `json:"processing"`
	Completed24h   int    `json:"completed_24h"`
	Failed24h      int    `json:"failed_24h"`
	AvgLatencyMs   int64  `json:"avg_latency_ms"`
	Status         string `json:"status"`
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("uad status requested")

	// TODO: read queue metrics from Redis/NATS, aggregate stats from DB
	resp := UADStatusResponse{
		QueueDepth:   0,
		Processing:   0,
		Completed24h: 0,
		Failed24h:    0,
		AvgLatencyMs: 0,
		Status:       "idle",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
