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
	mux.Handle("GET /api/v1/analytics/dashboard", http.HandlerFunc(h.Dashboard))
}

type DashboardKPI struct {
	LeadsToday       int     `json:"leads_today"`
	LeadsWeek        int     `json:"leads_week"`
	LeadsMonth       int     `json:"leads_month"`
	ConversionRate   float64 `json:"conversion_rate"`
	AvgDeliveryMs    int64   `json:"avg_delivery_ms"`
	FraudRate        float64 `json:"fraud_rate"`
	TopCountry       string  `json:"top_country"`
	ActiveBrokers    int     `json:"active_brokers"`
	ActiveAffiliates int     `json:"active_affiliates"`
	Revenue          float64 `json:"revenue"`
}

type DashboardResponse struct {
	KPI       DashboardKPI `json:"kpi"`
	Period    string       `json:"period"`
	UpdatedAt string       `json:"updated_at"`
}

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	h.logger.Debug("dashboard KPIs requested")

	// TODO: query ClickHouse for real-time analytics, aggregate from DB
	resp := DashboardResponse{
		KPI: DashboardKPI{
			LeadsToday:       0,
			LeadsWeek:        0,
			LeadsMonth:       0,
			ConversionRate:   0.0,
			AvgDeliveryMs:    0,
			FraudRate:        0.0,
			TopCountry:       "n/a",
			ActiveBrokers:    0,
			ActiveAffiliates: 0,
			Revenue:          0.0,
		},
		Period:    "today",
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
