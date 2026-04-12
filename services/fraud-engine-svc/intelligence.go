package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
)

// IntelligenceHandler manages shared fraud intelligence operations.
type IntelligenceHandler struct {
	store  *Store
	logger *slog.Logger
}

// NewIntelligenceHandler creates a new IntelligenceHandler.
func NewIntelligenceHandler(store *Store, logger *slog.Logger) *IntelligenceHandler {
	return &IntelligenceHandler{
		store:  store,
		logger: logger,
	}
}

// Contribute handles POST /api/v1/fraud/intelligence/contribute
// Accepts hashed entries and inserts/updates them in the fraud intelligence pool.
func (ih *IntelligenceHandler) Contribute(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var entry models.FraudIntelligenceEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if entry.EntryType == "" || entry.HashedValue == "" {
		errors.NewValidationError("entry_type and hashed_value are required").WriteJSON(w)
		return
	}

	entry.ContributorTenantID = tenantID

	if err := ih.store.UpsertFraudIntelligence(r.Context(), &entry); err != nil {
		ih.logger.Error("upsert fraud intelligence failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	ih.logger.Info("fraud intelligence contributed",
		"tenant_id", tenantID,
		"entry_type", entry.EntryType,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(entry)
}

// Check handles GET /api/v1/fraud/intelligence/check
// Queries the fraud intelligence pool by type and hashed value.
func (ih *IntelligenceHandler) Check(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		errors.NewValidationError("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	entryType := r.URL.Query().Get("type")
	hashedValue := r.URL.Query().Get("hash")

	if entryType == "" || hashedValue == "" {
		errors.NewValidationError("type and hash query parameters are required").WriteJSON(w)
		return
	}

	entry, err := ih.store.CheckFraudIntelligence(r.Context(), entryType, hashedValue)
	if err != nil {
		ih.logger.Error("check fraud intelligence failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if entry == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"found": false,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"found": true,
		"entry": entry,
	})
}
