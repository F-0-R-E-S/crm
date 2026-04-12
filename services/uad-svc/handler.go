package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	apperrors "github.com/gambchamp/crm/pkg/errors"
)

type Handler struct {
	logger *slog.Logger
	store  *Store
}

func NewHandler(logger *slog.Logger, store *Store) *Handler {
	return &Handler{logger: logger, store: store}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/uad/scenarios", h.ListScenarios)
	mux.HandleFunc("POST /api/v1/uad/scenarios", h.CreateScenario)
	mux.HandleFunc("GET /api/v1/uad/scenarios/{id}", h.GetScenario)
	mux.HandleFunc("PUT /api/v1/uad/scenarios/{id}", h.UpdateScenario)
	mux.HandleFunc("DELETE /api/v1/uad/scenarios/{id}", h.DeleteScenario)
	mux.HandleFunc("POST /api/v1/uad/scenarios/{id}/activate", h.ActivateScenario)
	mux.HandleFunc("POST /api/v1/uad/scenarios/{id}/deactivate", h.DeactivateScenario)
	mux.HandleFunc("GET /api/v1/uad/status", h.GetStatus)
	mux.HandleFunc("GET /internal/uad/status", h.GetStatus)
}

// ---------------------------------------------------------------------------
// GET /api/v1/uad/scenarios
// ---------------------------------------------------------------------------

func (h *Handler) ListScenarios(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	scenarios, err := h.store.ListScenarios(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("list scenarios failed", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if scenarios == nil {
		scenarios = []*Scenario{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"scenarios": scenarios, "total": len(scenarios)})
}

// ---------------------------------------------------------------------------
// POST /api/v1/uad/scenarios
// ---------------------------------------------------------------------------

func (h *Handler) CreateScenario(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var sc Scenario
	if err := json.NewDecoder(r.Body).Decode(&sc); err != nil {
		apperrors.NewBadRequest("invalid JSON: " + err.Error()).WriteJSON(w)
		return
	}

	if sc.Name == "" {
		apperrors.NewValidationError("name is required").WriteJSON(w)
		return
	}

	sc.TenantID = tenantID
	if sc.Mode == "" {
		sc.Mode = "batch"
	}
	if sc.BatchSize <= 0 {
		sc.BatchSize = 100
	}
	if sc.ThrottlePerMin <= 0 {
		sc.ThrottlePerMin = 50
	}
	if sc.MaxAttempts <= 0 {
		sc.MaxAttempts = 3
	}

	if err := h.store.CreateScenario(r.Context(), &sc); err != nil {
		h.logger.Error("create scenario failed", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	h.logger.Info("scenario created", "id", sc.ID, "name", sc.Name, "mode", sc.Mode)
	writeJSON(w, http.StatusCreated, sc)
}

// ---------------------------------------------------------------------------
// GET /api/v1/uad/scenarios/{id}
// ---------------------------------------------------------------------------

func (h *Handler) GetScenario(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	sc, err := h.store.GetScenario(r.Context(), id)
	if err != nil {
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if sc == nil {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, sc)
}

// ---------------------------------------------------------------------------
// PUT /api/v1/uad/scenarios/{id}
// ---------------------------------------------------------------------------

func (h *Handler) UpdateScenario(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	existing, err := h.store.GetScenario(r.Context(), id)
	if err != nil || existing == nil {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	var updates Scenario
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		apperrors.NewBadRequest("invalid JSON: " + err.Error()).WriteJSON(w)
		return
	}

	if updates.Name != "" {
		existing.Name = updates.Name
	}
	if updates.Mode != "" {
		existing.Mode = updates.Mode
	}
	if updates.Schedule != nil {
		existing.Schedule = updates.Schedule
	}
	if updates.BatchSize > 0 {
		existing.BatchSize = updates.BatchSize
	}
	if updates.ThrottlePerMin > 0 {
		existing.ThrottlePerMin = updates.ThrottlePerMin
	}
	if updates.MaxAttempts > 0 {
		existing.MaxAttempts = updates.MaxAttempts
	}
	if updates.SourceFilters != nil {
		existing.SourceFilters = updates.SourceFilters
	}
	if updates.TargetBrokers != nil {
		existing.TargetBrokers = updates.TargetBrokers
	}
	if updates.OverflowPool != nil {
		existing.OverflowPool = updates.OverflowPool
	}

	if err := h.store.UpdateScenario(r.Context(), existing); err != nil {
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

// ---------------------------------------------------------------------------
// DELETE /api/v1/uad/scenarios/{id}
// ---------------------------------------------------------------------------

func (h *Handler) DeleteScenario(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.store.DeleteScenario(r.Context(), id); err != nil {
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------------------------------------------------------------------------
// POST /api/v1/uad/scenarios/{id}/activate|deactivate
// ---------------------------------------------------------------------------

func (h *Handler) ActivateScenario(w http.ResponseWriter, r *http.Request) {
	h.setActive(w, r, true)
}

func (h *Handler) DeactivateScenario(w http.ResponseWriter, r *http.Request) {
	h.setActive(w, r, false)
}

func (h *Handler) setActive(w http.ResponseWriter, r *http.Request, active bool) {
	id := r.PathValue("id")
	sc, err := h.store.GetScenario(r.Context(), id)
	if err != nil || sc == nil {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}
	sc.IsActive = active
	if err := h.store.UpdateScenario(r.Context(), sc); err != nil {
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, sc)
}

// ---------------------------------------------------------------------------
// GET /internal/uad/status
// ---------------------------------------------------------------------------

type UADStatusResponse struct {
	QueueDepth   int    `json:"queue_depth"`
	Processing   int    `json:"processing"`
	Completed24h int    `json:"completed_24h"`
	Failed24h    int    `json:"failed_24h"`
	Status       string `json:"status"`
}

func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	pending, processing, completed, failed, err := h.store.GetQueueStats(r.Context())
	if err != nil {
		h.logger.Error("get queue stats failed", "error", err)
		writeJSON(w, http.StatusOK, UADStatusResponse{Status: "error"})
		return
	}

	status := "idle"
	if processing > 0 {
		status = "processing"
	} else if pending > 0 {
		status = "pending"
	}

	writeJSON(w, http.StatusOK, UADStatusResponse{
		QueueDepth:   pending,
		Processing:   processing,
		Completed24h: completed,
		Failed24h:    failed,
		Status:       status,
	})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
