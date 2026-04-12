package main

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"time"

	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
	"github.com/gambchamp/crm/pkg/rbac"
)

// ComplianceHandler handles GDPR, IP whitelist, and audit log endpoints.
type ComplianceHandler struct {
	store  *Store
	logger *slog.Logger
}

// NewComplianceHandler creates a new ComplianceHandler.
func NewComplianceHandler(store *Store, logger *slog.Logger) *ComplianceHandler {
	return &ComplianceHandler{store: store, logger: logger}
}

// Register adds compliance routes to the mux.
func (ch *ComplianceHandler) Register(mux *http.ServeMux) {
	// GDPR
	mux.HandleFunc("GET /api/v1/compliance/gdpr/requests", ch.ListGDPRRequests)
	mux.HandleFunc("POST /api/v1/compliance/gdpr/erasure", ch.CreateErasureRequest)
	mux.HandleFunc("POST /api/v1/compliance/gdpr/export", ch.CreateExportRequest)
	mux.HandleFunc("PUT /api/v1/compliance/gdpr/requests/{id}", ch.UpdateGDPRRequest)

	// IP Whitelist
	mux.HandleFunc("GET /api/v1/security/ip-whitelist", ch.ListIPWhitelist)
	mux.HandleFunc("POST /api/v1/security/ip-whitelist", ch.AddIPWhitelist)
	mux.HandleFunc("DELETE /api/v1/security/ip-whitelist/{id}", ch.RemoveIPWhitelist)

	// Audit Log
	mux.HandleFunc("GET /api/v1/compliance/audit-log", ch.ListAuditLog)
}

// ---------------------------------------------------------------------------
// GDPR endpoints
// ---------------------------------------------------------------------------

// ListGDPRRequests returns a paginated list of GDPR requests with optional
// status filter (?status=pending).
func (ch *ComplianceHandler) ListGDPRRequests(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.ComplianceRead) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	status := r.URL.Query().Get("status")
	limit, offset := ch.pagination(r)

	requests, total, err := ch.store.ListGDPRRequests(r.Context(), claims.TenantID, status, limit, offset)
	if err != nil {
		ch.logger.Error("list gdpr requests", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"requests": requests,
		"total":    total,
	})
}

type createErasureRequest struct {
	SubjectEmail string `json:"subject_email"`
	Notes        string `json:"notes,omitempty"`
}

// CreateErasureRequest creates a GDPR erasure (right to be forgotten) request.
func (ch *ComplianceHandler) CreateErasureRequest(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.ComplianceWrite) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	var req createErasureRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body").WriteJSON(w)
		return
	}
	if req.SubjectEmail == "" {
		apperrors.NewValidationError("subject_email is required").WriteJSON(w)
		return
	}

	gdprReq := &models.GDPRRequest{
		TenantID:     claims.TenantID,
		RequestType:  "erasure",
		SubjectEmail: req.SubjectEmail,
		Status:       "pending",
		RequestedBy:  claims.UserID,
		Notes:        req.Notes,
	}

	if err := ch.store.CreateGDPRRequest(r.Context(), gdprReq); err != nil {
		ch.logger.Error("create erasure request", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, gdprReq)
}

type createExportRequest struct {
	SubjectEmail string `json:"subject_email"`
	Notes        string `json:"notes,omitempty"`
}

// CreateExportRequest creates a GDPR data portability request.
func (ch *ComplianceHandler) CreateExportRequest(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.ComplianceWrite) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	var req createExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body").WriteJSON(w)
		return
	}
	if req.SubjectEmail == "" {
		apperrors.NewValidationError("subject_email is required").WriteJSON(w)
		return
	}

	gdprReq := &models.GDPRRequest{
		TenantID:     claims.TenantID,
		RequestType:  "portability",
		SubjectEmail: req.SubjectEmail,
		Status:       "pending",
		RequestedBy:  claims.UserID,
		Notes:        req.Notes,
	}

	if err := ch.store.CreateGDPRRequest(r.Context(), gdprReq); err != nil {
		ch.logger.Error("create export request", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, gdprReq)
}

type updateGDPRRequestBody struct {
	Status      string `json:"status"`
	ProcessedBy string `json:"processed_by,omitempty"`
	Notes       string `json:"notes,omitempty"`
}

// UpdateGDPRRequest updates the status, processed_by, and notes of a GDPR request.
func (ch *ComplianceHandler) UpdateGDPRRequest(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.ComplianceWrite) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	requestID := r.PathValue("id")
	if requestID == "" {
		apperrors.NewBadRequest("request id required").WriteJSON(w)
		return
	}

	var req updateGDPRRequestBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body").WriteJSON(w)
		return
	}

	validStatuses := map[string]bool{"pending": true, "processing": true, "completed": true, "rejected": true}
	if req.Status == "" || !validStatuses[req.Status] {
		apperrors.NewValidationError("status must be one of: pending, processing, completed, rejected").WriteJSON(w)
		return
	}

	processedBy := req.ProcessedBy
	if processedBy == "" {
		processedBy = claims.UserID
	}

	gdprReq := &models.GDPRRequest{
		ID:          requestID,
		TenantID:    claims.TenantID,
		Status:      req.Status,
		ProcessedBy: processedBy,
		Notes:       req.Notes,
	}

	if err := ch.store.UpdateGDPRRequest(r.Context(), gdprReq); err != nil {
		ch.logger.Error("update gdpr request", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "request updated"})
}

// ---------------------------------------------------------------------------
// IP Whitelist endpoints
// ---------------------------------------------------------------------------

// ListIPWhitelist returns all IP whitelist entries for the tenant.
func (ch *ComplianceHandler) ListIPWhitelist(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.SecurityRead) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	entries, err := ch.store.ListIPWhitelist(r.Context(), claims.TenantID)
	if err != nil {
		ch.logger.Error("list ip whitelist", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"entries": entries})
}

type addIPWhitelistRequest struct {
	IPRange     string     `json:"ip_range"`
	Description string     `json:"description,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// AddIPWhitelist creates a new IP whitelist entry.
func (ch *ComplianceHandler) AddIPWhitelist(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.SecurityWrite) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	var req addIPWhitelistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body").WriteJSON(w)
		return
	}
	if req.IPRange == "" {
		apperrors.NewValidationError("ip_range is required (CIDR notation, e.g. 10.0.0.0/24)").WriteJSON(w)
		return
	}

	// Validate CIDR format
	_, _, err := net.ParseCIDR(req.IPRange)
	if err != nil {
		apperrors.NewValidationError("invalid CIDR notation: " + err.Error()).WriteJSON(w)
		return
	}

	entry := &models.IPWhitelistEntry{
		TenantID:    claims.TenantID,
		IPRange:     req.IPRange,
		Description: req.Description,
		CreatedBy:   claims.UserID,
		ExpiresAt:   req.ExpiresAt,
	}

	if err := ch.store.AddIPWhitelist(r.Context(), entry); err != nil {
		ch.logger.Error("add ip whitelist", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, entry)
}

// RemoveIPWhitelist deletes an IP whitelist entry by id.
func (ch *ComplianceHandler) RemoveIPWhitelist(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.SecurityWrite) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	entryID := r.PathValue("id")
	if entryID == "" {
		apperrors.NewBadRequest("entry id required").WriteJSON(w)
		return
	}

	if err := ch.store.RemoveIPWhitelist(r.Context(), claims.TenantID, entryID); err != nil {
		ch.logger.Error("remove ip whitelist", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "entry removed"})
}

// ---------------------------------------------------------------------------
// Audit Log endpoint
// ---------------------------------------------------------------------------

// ListAuditLog returns a paginated, filtered list of audit log entries.
// Query params: user_id, action, resource_type, from, to, limit, offset.
func (ch *ComplianceHandler) ListAuditLog(w http.ResponseWriter, r *http.Request) {
	claims, ok := ch.extractClaims(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	if !ch.hasPermission(claims.Role, rbac.AuditRead) {
		apperrors.ErrForbidden.WriteJSON(w)
		return
	}

	limit, offset := ch.pagination(r)

	filters := AuditLogFilters{
		UserID:       r.URL.Query().Get("user_id"),
		Action:       r.URL.Query().Get("action"),
		ResourceType: r.URL.Query().Get("resource_type"),
	}
	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			filters.From = t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			filters.To = t
		}
	}

	entries, total, err := ch.store.ListAuditLog(r.Context(), claims.TenantID, filters, limit, offset)
	if err != nil {
		ch.logger.Error("list audit log", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"entries": entries,
		"total":   total,
	})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func (ch *ComplianceHandler) extractClaims(r *http.Request) (*Claims, bool) {
	return extractClaimsFromRequest(r)
}

func (ch *ComplianceHandler) hasPermission(role string, perm rbac.Permission) bool {
	perms := rbac.ForRole(models.Role(role))
	return perms.Has(perm)
}

func (ch *ComplianceHandler) pagination(r *http.Request) (limit, offset int) {
	limit = 20
	offset = 0
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return
}
