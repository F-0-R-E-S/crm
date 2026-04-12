package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	apperrors "github.com/gambchamp/crm/pkg/errors"
)

// Wizard step definitions and their order.
var WizardSteps = map[string]StepDef{
	"company_setup":       {Label: "Company Setup", Description: "Configure your company name and plan"},
	"team_setup":          {Label: "Team Setup", Description: "Invite team members and assign roles"},
	"first_broker":        {Label: "Add Broker", Description: "Connect your first broker integration"},
	"broker_templates":    {Label: "Broker Templates", Description: "Select from 200+ pre-built broker templates"},
	"first_affiliate":     {Label: "Add Affiliate", Description: "Create your first affiliate with API key"},
	"affiliate_setup":     {Label: "Affiliate Setup", Description: "Configure affiliates and postbacks"},
	"affiliate_hierarchy": {Label: "Affiliate Hierarchy", Description: "Set up affiliate levels and sub-accounts"},
	"first_rule":          {Label: "Routing Rule", Description: "Create your first lead distribution rule"},
	"routing_rules":       {Label: "Routing Rules", Description: "Configure lead distribution rules"},
	"fraud_config":        {Label: "Fraud Settings", Description: "Configure anti-fraud checks"},
	"cap_setup":           {Label: "Cap Configuration", Description: "Set daily and total caps"},
	"notifications":       {Label: "Notifications", Description: "Set up Telegram, email, and webhook alerts"},
	"telegram_bot":        {Label: "Telegram Bot", Description: "Connect your Telegram bot for real-time alerts"},
	"api_keys":            {Label: "API Keys", Description: "Generate API keys for affiliate access"},
	"test_lead":           {Label: "Test Lead", Description: "Send a test lead to verify the flow"},
	"complete":            {Label: "Complete", Description: "Your setup is complete!"},
}

type StepDef struct {
	Label       string `json:"label"`
	Description string `json:"description"`
}

type OnboardingState struct {
	ID             string          `json:"id"`
	TenantID       string          `json:"tenant_id"`
	CurrentStep    string          `json:"current_step"`
	CompletedSteps []string        `json:"completed_steps"`
	StepData       json.RawMessage `json:"step_data"`
	TemplateID     string          `json:"template_id,omitempty"`
	StartedAt      time.Time       `json:"started_at"`
	CompletedAt    *time.Time      `json:"completed_at,omitempty"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type OnboardingTemplate struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Description   string          `json:"description"`
	Category      string          `json:"category"`
	Steps         []string        `json:"steps"`
	DefaultConfig json.RawMessage `json:"default_config"`
}

type OnboardingHandler struct {
	logger *slog.Logger
	store  *Store
}

func NewOnboardingHandler(logger *slog.Logger, store *Store) *OnboardingHandler {
	return &OnboardingHandler{logger: logger, store: store}
}

func (h *OnboardingHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/onboarding", h.GetState)
	mux.HandleFunc("POST /api/v1/onboarding/start", h.StartWizard)
	mux.HandleFunc("POST /api/v1/onboarding/step/{step}/complete", h.CompleteStep)
	mux.HandleFunc("PUT /api/v1/onboarding/step/{step}/data", h.SaveStepData)
	mux.HandleFunc("GET /api/v1/onboarding/templates", h.ListTemplates)
}

func (h *OnboardingHandler) GetState(w http.ResponseWriter, r *http.Request) {
	claims, ok := extractClaimsFromRequest(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	state, err := h.store.GetOnboardingState(r.Context(), claims.TenantID)
	if err != nil {
		h.logger.Error("get onboarding state", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	if state == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"status": "not_started",
			"templates": nil,
		})
		return
	}

	template, _ := h.store.GetOnboardingTemplate(r.Context(), state.TemplateID)
	var steps []map[string]interface{}
	if template != nil {
		for _, stepID := range template.Steps {
			def, ok := WizardSteps[stepID]
			if !ok {
				continue
			}
			completed := contains(state.CompletedSteps, stepID)
			steps = append(steps, map[string]interface{}{
				"id":          stepID,
				"label":       def.Label,
				"description": def.Description,
				"completed":   completed,
				"current":     stepID == state.CurrentStep,
			})
		}
	}

	totalSteps := 0
	if template != nil {
		totalSteps = len(template.Steps)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"state":           state,
		"steps":           steps,
		"progress_pct":    progressPct(len(state.CompletedSteps), totalSteps),
		"status":          onboardingStatus(state),
	})
}

func (h *OnboardingHandler) StartWizard(w http.ResponseWriter, r *http.Request) {
	claims, ok := extractClaimsFromRequest(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	var req struct {
		TemplateID string `json:"template_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperrors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}
	if req.TemplateID == "" {
		req.TemplateID = "quick-start"
	}

	template, err := h.store.GetOnboardingTemplate(r.Context(), req.TemplateID)
	if err != nil || template == nil {
		apperrors.NewValidationError("invalid template_id").WriteJSON(w)
		return
	}

	firstStep := "company_setup"
	if len(template.Steps) > 0 {
		firstStep = template.Steps[0]
	}

	state, err := h.store.CreateOnboardingState(r.Context(), claims.TenantID, firstStep, req.TemplateID)
	if err != nil {
		h.logger.Error("create onboarding state", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"state":    state,
		"template": template,
	})
}

func (h *OnboardingHandler) CompleteStep(w http.ResponseWriter, r *http.Request) {
	claims, ok := extractClaimsFromRequest(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	step := r.PathValue("step")
	if _, ok := WizardSteps[step]; !ok {
		apperrors.NewValidationError("unknown step: " + step).WriteJSON(w)
		return
	}

	state, err := h.store.GetOnboardingState(r.Context(), claims.TenantID)
	if err != nil || state == nil {
		apperrors.NewBadRequest("onboarding not started").WriteJSON(w)
		return
	}

	if contains(state.CompletedSteps, step) {
		writeJSON(w, http.StatusOK, map[string]string{"message": "step already completed"})
		return
	}

	state.CompletedSteps = append(state.CompletedSteps, step)

	template, _ := h.store.GetOnboardingTemplate(r.Context(), state.TemplateID)
	nextStep := findNextStep(template, state.CompletedSteps)

	if nextStep == "" || step == "complete" {
		now := time.Now()
		state.CompletedAt = &now
		state.CurrentStep = "complete"
	} else {
		state.CurrentStep = nextStep
	}

	if err := h.store.UpdateOnboardingState(r.Context(), state); err != nil {
		h.logger.Error("update onboarding state", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"current_step":    state.CurrentStep,
		"completed_steps": state.CompletedSteps,
		"completed":       state.CompletedAt != nil,
	})
}

func (h *OnboardingHandler) SaveStepData(w http.ResponseWriter, r *http.Request) {
	claims, ok := extractClaimsFromRequest(r)
	if !ok {
		apperrors.ErrUnauthorized.WriteJSON(w)
		return
	}

	step := r.PathValue("step")

	var data json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		apperrors.NewBadRequest("invalid JSON").WriteJSON(w)
		return
	}

	if err := h.store.SaveStepData(r.Context(), claims.TenantID, step, data); err != nil {
		h.logger.Error("save step data", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "step data saved"})
}

func (h *OnboardingHandler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.store.ListOnboardingTemplates(r.Context())
	if err != nil {
		h.logger.Error("list templates", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"templates": templates})
}

// ---------------------------------------------------------------------------
// Store methods for onboarding
// ---------------------------------------------------------------------------

func (s *Store) GetOnboardingState(ctx context.Context, tenantID string) (*OnboardingState, error) {
	state := &OnboardingState{}
	var completedJSON []byte
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, current_step, completed_steps, step_data, COALESCE(template_id,''),
		        started_at, completed_at, updated_at
		 FROM onboarding_state WHERE tenant_id = $1`,
		tenantID,
	).Scan(
		&state.ID, &state.TenantID, &state.CurrentStep, &completedJSON,
		&state.StepData, &state.TemplateID, &state.StartedAt, &state.CompletedAt, &state.UpdatedAt,
	)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("get onboarding state: %w", err)
	}
	json.Unmarshal(completedJSON, &state.CompletedSteps)
	if state.CompletedSteps == nil {
		state.CompletedSteps = []string{}
	}
	return state, nil
}

func (s *Store) CreateOnboardingState(ctx context.Context, tenantID, firstStep, templateID string) (*OnboardingState, error) {
	state := &OnboardingState{}
	var completedJSON []byte
	err := s.db.Pool.QueryRow(ctx,
		`INSERT INTO onboarding_state (tenant_id, current_step, template_id)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (tenant_id) DO UPDATE SET current_step = $2, template_id = $3, updated_at = NOW()
		 RETURNING id, tenant_id, current_step, completed_steps, step_data, template_id, started_at, completed_at, updated_at`,
		tenantID, firstStep, templateID,
	).Scan(
		&state.ID, &state.TenantID, &state.CurrentStep, &completedJSON,
		&state.StepData, &state.TemplateID, &state.StartedAt, &state.CompletedAt, &state.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create onboarding state: %w", err)
	}
	json.Unmarshal(completedJSON, &state.CompletedSteps)
	if state.CompletedSteps == nil {
		state.CompletedSteps = []string{}
	}
	return state, nil
}

func (s *Store) UpdateOnboardingState(ctx context.Context, state *OnboardingState) error {
	completedJSON, _ := json.Marshal(state.CompletedSteps)
	return s.db.Exec(ctx,
		`UPDATE onboarding_state
		 SET current_step = $2, completed_steps = $3::jsonb, completed_at = $4
		 WHERE tenant_id = $1`,
		state.TenantID, state.CurrentStep, completedJSON, state.CompletedAt,
	)
}

func (s *Store) SaveStepData(ctx context.Context, tenantID, step string, data json.RawMessage) error {
	return s.db.Exec(ctx,
		`UPDATE onboarding_state
		 SET step_data = jsonb_set(COALESCE(step_data,'{}'::jsonb), ARRAY[$2], $3::jsonb)
		 WHERE tenant_id = $1`,
		tenantID, step, data,
	)
}

func (s *Store) GetOnboardingTemplate(ctx context.Context, templateID string) (*OnboardingTemplate, error) {
	t := &OnboardingTemplate{}
	var stepsJSON []byte
	err := s.db.Pool.QueryRow(ctx,
		`SELECT id, name, COALESCE(description,''), category, steps, default_config
		 FROM onboarding_templates WHERE id = $1 AND is_active = true`,
		templateID,
	).Scan(&t.ID, &t.Name, &t.Description, &t.Category, &stepsJSON, &t.DefaultConfig)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, nil
		}
		return nil, fmt.Errorf("get template: %w", err)
	}
	json.Unmarshal(stepsJSON, &t.Steps)
	return t, nil
}

func (s *Store) ListOnboardingTemplates(ctx context.Context) ([]OnboardingTemplate, error) {
	rows, err := s.db.Pool.Query(ctx,
		`SELECT id, name, COALESCE(description,''), category, steps, default_config
		 FROM onboarding_templates WHERE is_active = true ORDER BY id`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []OnboardingTemplate
	for rows.Next() {
		var t OnboardingTemplate
		var stepsJSON []byte
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.Category, &stepsJSON, &t.DefaultConfig); err != nil {
			return nil, err
		}
		json.Unmarshal(stepsJSON, &t.Steps)
		templates = append(templates, t)
	}
	return templates, rows.Err()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func extractClaimsFromRequest(r *http.Request) (*Claims, bool) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		// Fallback to gateway-injected headers.
		tenantID := r.Header.Get("X-Tenant-ID")
		userID := r.Header.Get("X-User-ID")
		role := r.Header.Get("X-Role")
		if tenantID != "" && userID != "" {
			return &Claims{TenantID: tenantID, UserID: userID, Role: role}, true
		}
		return nil, false
	}
	return nil, false
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func findNextStep(template *OnboardingTemplate, completed []string) string {
	if template == nil {
		return ""
	}
	completedSet := make(map[string]bool, len(completed))
	for _, s := range completed {
		completedSet[s] = true
	}
	for _, step := range template.Steps {
		if !completedSet[step] {
			return step
		}
	}
	return ""
}

func progressPct(completed, total int) int {
	if total == 0 {
		return 0
	}
	pct := (completed * 100) / total
	if pct > 100 {
		pct = 100
	}
	return pct
}

func onboardingStatus(state *OnboardingState) string {
	if state.CompletedAt != nil {
		return "completed"
	}
	if len(state.CompletedSteps) == 0 {
		return "started"
	}
	return "in_progress"
}
