package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/jackc/pgx/v5"
)

// ExperimentHandler manages fraud rule A/B testing experiments.
type ExperimentHandler struct {
	store  *Store
	logger *slog.Logger
}

// NewExperimentHandler creates a new ExperimentHandler.
func NewExperimentHandler(store *Store, logger *slog.Logger) *ExperimentHandler {
	return &ExperimentHandler{
		store:  store,
		logger: logger,
	}
}

// List handles GET /api/v1/fraud/experiments
func (eh *ExperimentHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	exps, err := eh.store.ListExperiments(r.Context(), tenantID)
	if err != nil {
		eh.logger.Error("list experiments failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": exps,
	})
}

// Create handles POST /api/v1/fraud/experiments
func (eh *ExperimentHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var exp models.FraudRuleExperiment
	if err := json.NewDecoder(r.Body).Decode(&exp); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	exp.TenantID = tenantID

	if exp.Name == "" {
		errors.NewValidationError("name is required").WriteJSON(w)
		return
	}
	if exp.Status == "" {
		exp.Status = "draft"
	}
	if exp.TrafficSplit <= 0 || exp.TrafficSplit > 1 {
		exp.TrafficSplit = 0.5
	}

	if err := eh.store.CreateExperiment(r.Context(), &exp); err != nil {
		eh.logger.Error("create experiment failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	eh.logger.Info("experiment created",
		"tenant_id", tenantID,
		"experiment_id", exp.ID,
		"name", exp.Name,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(exp)
}

// Update handles PUT /api/v1/fraud/experiments/{id}
func (eh *ExperimentHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		errors.NewValidationError("id is required").WriteJSON(w)
		return
	}

	var exp models.FraudRuleExperiment
	if err := json.NewDecoder(r.Body).Decode(&exp); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	exp.ID = id
	exp.TenantID = tenantID

	if err := eh.store.UpdateExperiment(r.Context(), &exp); err != nil {
		if err == pgx.ErrNoRows {
			errors.ErrNotFound.WriteJSON(w)
			return
		}
		eh.logger.Error("update experiment failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exp)
}

// GetResults handles GET /api/v1/fraud/experiments/{id}/results
func (eh *ExperimentHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		errors.NewValidationError("id is required").WriteJSON(w)
		return
	}

	exp, err := eh.store.GetExperiment(r.Context(), tenantID, id)
	if err != nil {
		eh.logger.Error("get experiment failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}
	if exp == nil {
		errors.ErrNotFound.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"experiment": exp,
		"results":    exp.Results,
	})
}
