package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	apperrors "github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
)

// Handler exposes HTTP endpoints for the broker-adapter service.
type Handler struct {
	logger    *slog.Logger
	store     *Store
	deliverer *Deliverer
}

func NewHandler(logger *slog.Logger, store *Store, deliverer *Deliverer) *Handler {
	return &Handler{
		logger:    logger,
		store:     store,
		deliverer: deliverer,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/brokers", h.ListBrokers)
	mux.HandleFunc("POST /api/v1/brokers", h.CreateBroker)
	mux.HandleFunc("PATCH /api/v1/brokers/{id}", h.UpdateBroker)
	mux.HandleFunc("GET /api/v1/broker-templates", h.ListBrokerTemplates)
	mux.HandleFunc("POST /internal/deliver", h.DeliverLead)
}

func (h *Handler) ListBrokers(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	brokers, err := h.store.GetActiveBrokers(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("failed to list brokers", "error", err, "tenant_id", tenantID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if brokers == nil {
		brokers = []*models.Broker{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"brokers": brokers,
		"total":   len(brokers),
	})
}

func (h *Handler) ListBrokerTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.store.ListBrokerTemplates(r.Context())
	if err != nil {
		h.logger.Error("failed to list broker templates", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if templates == nil {
		templates = []*models.BrokerTemplate{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"templates": templates,
		"total":     len(templates),
	})
}

func (h *Handler) CreateBroker(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	var req struct {
		Name         string          `json:"name"`
		TemplateID   string          `json:"template_id"`
		Endpoint     string          `json:"endpoint"`
		Credentials  json.RawMessage `json:"credentials"`
		FieldMapping json.RawMessage `json:"field_mapping"`
		DailyCap     int             `json:"daily_cap"`
		TotalCap     int             `json:"total_cap"`
		Priority     int             `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	if req.Name == "" || req.TemplateID == "" || req.Endpoint == "" {
		apperrors.NewValidationError("name, template_id, and endpoint are required").WriteJSON(w)
		return
	}

	broker := &models.Broker{
		TenantID:     tenantID,
		Name:         req.Name,
		Status:       models.BrokerStatusActive,
		TemplateID:   req.TemplateID,
		Endpoint:     req.Endpoint,
		Credentials:  req.Credentials,
		FieldMapping: req.FieldMapping,
		DailyCap:     req.DailyCap,
		TotalCap:     req.TotalCap,
		Priority:     req.Priority,
		HealthStatus: "healthy",
	}

	if err := h.store.CreateBroker(r.Context(), broker); err != nil {
		h.logger.Error("failed to create broker", "error", err, "tenant_id", tenantID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, broker)
}

func (h *Handler) UpdateBroker(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	brokerID := r.PathValue("id")
	if brokerID == "" {
		apperrors.NewValidationError("broker id is required").WriteJSON(w)
		return
	}

	var req struct {
		Name         *string              `json:"name"`
		Status       *models.BrokerStatus `json:"status"`
		TemplateID   *string              `json:"template_id"`
		Endpoint     *string              `json:"endpoint"`
		Credentials  json.RawMessage      `json:"credentials"`
		FieldMapping json.RawMessage      `json:"field_mapping"`
		DailyCap     *int                 `json:"daily_cap"`
		TotalCap     *int                 `json:"total_cap"`
		Priority     *int                 `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	current, err := h.store.GetBroker(r.Context(), brokerID)
	if err != nil {
		h.logger.Error("failed to fetch broker for update", "error", err, "broker_id", brokerID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if current == nil || current.Broker.TenantID != tenantID {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	broker := current.Broker
	broker.ID = brokerID
	broker.TenantID = tenantID

	if req.Name != nil {
		broker.Name = *req.Name
	}
	if req.Status != nil {
		broker.Status = *req.Status
	}
	if req.TemplateID != nil {
		broker.TemplateID = *req.TemplateID
	}
	if req.Endpoint != nil {
		broker.Endpoint = *req.Endpoint
	}
	if req.Credentials != nil {
		broker.Credentials = req.Credentials
	}
	if req.FieldMapping != nil {
		broker.FieldMapping = req.FieldMapping
	}
	if req.DailyCap != nil {
		broker.DailyCap = *req.DailyCap
	}
	if req.TotalCap != nil {
		broker.TotalCap = *req.TotalCap
	}
	if req.Priority != nil {
		broker.Priority = *req.Priority
	}

	if broker.Name == "" || broker.TemplateID == "" || broker.Endpoint == "" {
		apperrors.NewValidationError("name, template_id, and endpoint are required").WriteJSON(w)
		return
	}

	if err := h.store.UpdateBroker(r.Context(), &broker); err != nil {
		h.logger.Error("failed to update broker", "error", err, "broker_id", brokerID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, broker)
}

// ---------------------------------------------------------------------------
// POST /internal/deliver
// ---------------------------------------------------------------------------

// DeliverRequest is the payload for the delivery endpoint.
type DeliverRequest struct {
	LeadID   string `json:"lead_id"`
	BrokerID string `json:"broker_id"`
	TenantID string `json:"tenant_id"`
}

// DeliverResponse is returned after a delivery attempt.
type DeliverResponse struct {
	LeadID       string `json:"lead_id"`
	BrokerID     string `json:"broker_id"`
	TenantID     string `json:"tenant_id"`
	Status       string `json:"status"`
	BrokerLeadID string `json:"broker_lead_id,omitempty"`
	AutologinURL string `json:"autologin_url,omitempty"`
	StatusCode   int    `json:"status_code"`
	Attempts     int    `json:"attempts"`
	DurationMs   int64  `json:"duration_ms"`
	Error        string `json:"error,omitempty"`
}

// DeliverLead handles POST /internal/deliver. It loads the lead and broker
// from the database, executes the delivery via the Deliverer, updates the
// lead status, and returns the result.
func (h *Handler) DeliverLead(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req DeliverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" || req.BrokerID == "" {
		apperrors.NewValidationError("lead_id and broker_id are required").WriteJSON(w)
		return
	}

	h.logger.Info("delivery request received",
		"lead_id", req.LeadID,
		"broker_id", req.BrokerID,
		"tenant_id", req.TenantID,
	)

	// Fetch lead.
	lead, err := h.store.GetLead(ctx, req.LeadID)
	if err != nil {
		h.logger.Error("failed to fetch lead", "error", err, "lead_id", req.LeadID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if lead == nil {
		apperrors.ErrNotFound.WriteJSON(w)
		return
	}

	// Fetch broker with its template.
	bwt, err := h.store.GetBroker(ctx, req.BrokerID)
	if err != nil {
		h.logger.Error("failed to fetch broker", "error", err, "broker_id", req.BrokerID)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if bwt == nil {
		(&apperrors.AppError{
			Code:       "BROKER_NOT_FOUND",
			Message:    "broker not found",
			Detail:     "broker_id: " + req.BrokerID,
			HTTPStatus: http.StatusNotFound,
		}).WriteJSON(w)
		return
	}

	// Check broker is active.
	if bwt.Broker.Status != models.BrokerStatusActive {
		(&apperrors.AppError{
			Code:       "BROKER_INACTIVE",
			Message:    "broker is not active",
			Detail:     "broker status: " + string(bwt.Broker.Status),
			HTTPStatus: http.StatusUnprocessableEntity,
		}).WriteJSON(w)
		return
	}

	// Execute delivery.
	result, deliveryErr := h.deliverer.Deliver(ctx, lead, bwt)

	// Determine status.
	status := "delivered"
	leadStatus := models.LeadStatusDelivered
	if !result.Success {
		status = "failed"
		leadStatus = models.LeadStatusRejected
	}

	// Update lead status.
	if err := h.store.UpdateLeadStatus(ctx, lead.ID, leadStatus); err != nil {
		h.logger.Error("failed to update lead status",
			"lead_id", lead.ID,
			"status", leadStatus,
			"error", err,
		)
	}

	resp := DeliverResponse{
		LeadID:       lead.ID,
		BrokerID:     bwt.Broker.ID,
		TenantID:     lead.TenantID,
		Status:       status,
		BrokerLeadID: result.BrokerLeadID,
		AutologinURL: result.AutologinURL,
		StatusCode:   result.StatusCode,
		Attempts:     result.Attempts,
		DurationMs:   result.TotalDuration,
	}

	if deliveryErr != nil {
		resp.Error = deliveryErr.Error()
	}

	httpStatus := http.StatusOK
	if !result.Success {
		httpStatus = http.StatusBadGateway
	}

	h.logger.Info("delivery completed",
		"lead_id", lead.ID,
		"broker_id", bwt.Broker.ID,
		"status", status,
		"status_code", result.StatusCode,
		"attempts", result.Attempts,
		"duration_ms", result.TotalDuration,
	)

	writeJSON(w, httpStatus, resp)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
