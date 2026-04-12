package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("GET /api/v1/notifications", http.HandlerFunc(h.ListNotifications))
}

type Notification struct {
	ID        string `json:"id"`
	TenantID  string `json:"tenant_id"`
	Channel   string `json:"channel"`
	EventType string `json:"event_type"`
	Subject   string `json:"subject"`
	Body      string `json:"body"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type NotificationListResponse struct {
	Data       []Notification `json:"data"`
	TotalCount int            `json:"total_count"`
	Page       int            `json:"page"`
	PageSize   int            `json:"page_size"`
}

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("listing notifications")

	// TODO: read from DB with pagination, filter by tenant from JWT context
	resp := NotificationListResponse{
		Data:       []Notification{},
		TotalCount: 0,
		Page:       1,
		PageSize:   50,
	}

	_ = time.Now()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
