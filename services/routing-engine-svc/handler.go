package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
)

type Handler struct {
	logger *slog.Logger
	router *Router
	store  *Store
}

func NewHandler(logger *slog.Logger, router *Router, store *Store) *Handler {
	return &Handler{logger: logger, router: router, store: store}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/rules", h.ListRules)
	mux.HandleFunc("POST /api/v1/rules", h.CreateRule)
	mux.HandleFunc("POST /internal/route", h.RouteLead)
	mux.HandleFunc("GET /internal/rules", h.ListRules)
	mux.HandleFunc("POST /internal/rules", h.CreateRule)
}

// ---------------------------------------------------------------------------
// POST /internal/route
// ---------------------------------------------------------------------------

type RouteRequest struct {
	LeadID   string       `json:"lead_id"`
	TenantID string       `json:"tenant_id"`
	Lead     *models.Lead `json:"lead,omitempty"`
}

func (h *Handler) RouteLead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req RouteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	var lead *models.Lead

	if req.Lead != nil {
		// Full lead provided inline
		lead = req.Lead
		if lead.TenantID == "" {
			lead.TenantID = req.TenantID
		}
		if lead.ID == "" {
			lead.ID = req.LeadID
		}
	} else {
		// Fetch by lead_id
		if req.LeadID == "" {
			apperrors.NewValidationError("lead_id is required when lead object is not provided").WriteJSON(w)
			return
		}

		var err error
		lead, err = h.store.GetLead(ctx, req.LeadID)
		if err != nil {
			h.logger.Error("failed to fetch lead", "error", err, "lead_id", req.LeadID)
			apperrors.ErrInternal.WriteJSON(w)
			return
		}
		if lead == nil {
			apperrors.ErrNotFound.WriteJSON(w)
			return
		}
	}

	decision, err := h.router.Route(ctx, lead)
	if err != nil {
		h.logger.Warn("routing failed", "lead_id", lead.ID, "error", err)
		(&apperrors.AppError{
			Code:       "NO_ROUTE",
			Message:    "no matching route found",
			Detail:     err.Error(),
			HTTPStatus: http.StatusUnprocessableEntity,
		}).WriteJSON(w)
		return
	}

	h.logger.Info("lead routed",
		"lead_id", decision.LeadID,
		"broker_id", decision.BrokerID,
		"rule_id", decision.RuleID,
		"algorithm", decision.Algorithm,
		"latency_ms", decision.LatencyMs,
	)

	writeJSON(w, http.StatusOK, decision)
}

// ---------------------------------------------------------------------------
// GET /internal/rules?tenant_id=...&limit=...&offset=...
// ---------------------------------------------------------------------------

type ListRulesResponse struct {
	Rules []*models.DistributionRule `json:"rules"`
	Total int                        `json:"total"`
}

func (h *Handler) ListRules(w http.ResponseWriter, r *http.Request) {
	tenantID := r.URL.Query().Get("tenant_id")
	if tenantID == "" {
		tenantID = r.Header.Get("X-Tenant-ID")
	}
	if tenantID == "" {
		apperrors.NewValidationError("tenant_id query param or X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	rules, err := h.store.GetActiveRules(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("failed to list rules", "error", err, "tenant_id", tenantID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if rules == nil {
		rules = []*models.DistributionRule{}
	}

	writeJSON(w, http.StatusOK, ListRulesResponse{
		Rules: rules,
		Total: len(rules),
	})
}

// ---------------------------------------------------------------------------
// POST /internal/rules
// ---------------------------------------------------------------------------

type CreateRuleRequest struct {
	TenantID      string          `json:"tenant_id"`
	Name          string          `json:"name"`
	Priority      int             `json:"priority"`
	IsActive      bool            `json:"is_active"`
	Conditions    json.RawMessage `json:"conditions"`
	BrokerTargets json.RawMessage `json:"broker_targets"`
	Algorithm     string          `json:"algorithm"`
	DailyCap      int             `json:"daily_cap"`
	TotalCap      int             `json:"total_cap"`
	CountryCaps   json.RawMessage `json:"country_caps,omitempty"`
	TimezoneSlots json.RawMessage `json:"timezone_slots,omitempty"`
}

func (h *Handler) CreateRule(w http.ResponseWriter, r *http.Request) {
	var req CreateRuleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.TenantID == "" {
		req.TenantID = r.Header.Get("X-Tenant-ID")
	}
	if req.TenantID == "" {
		apperrors.NewValidationError("tenant_id is required").WriteJSON(w)
		return
	}
	if req.Name == "" {
		apperrors.NewValidationError("name is required").WriteJSON(w)
		return
	}
	if req.BrokerTargets == nil || len(req.BrokerTargets) == 0 {
		apperrors.NewValidationError("broker_targets is required").WriteJSON(w)
		return
	}

	// Validate algorithm
	switch req.Algorithm {
	case "weighted_round_robin", "priority", "slots_chance", "":
		if req.Algorithm == "" {
			req.Algorithm = "weighted_round_robin"
		}
	default:
		apperrors.NewValidationError("algorithm must be 'weighted_round_robin', 'priority', or 'slots_chance'").WriteJSON(w)
		return
	}

	rule := &models.DistributionRule{
		TenantID:      req.TenantID,
		Name:          req.Name,
		Priority:      req.Priority,
		IsActive:      req.IsActive,
		Conditions:    req.Conditions,
		BrokerTargets: req.BrokerTargets,
		Algorithm:     req.Algorithm,
		DailyCap:      req.DailyCap,
		TotalCap:      req.TotalCap,
		CountryCaps:   req.CountryCaps,
		TimezoneSlots: req.TimezoneSlots,
	}

	if err := h.store.CreateRule(r.Context(), rule); err != nil {
		h.logger.Error("failed to create rule", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	h.logger.Info("rule created",
		"rule_id", rule.ID,
		"tenant_id", rule.TenantID,
		"name", rule.Name,
		"priority", rule.Priority,
	)

	writeJSON(w, http.StatusCreated, rule)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func parseIntParam(r *http.Request, key string, defaultVal int) int {
	s := r.URL.Query().Get(key)
	if s == "" {
		return defaultVal
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return defaultVal
	}
	return v
}
