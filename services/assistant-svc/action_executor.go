package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/google/uuid"
)

type ActionExecutor struct {
	nc       *messaging.NATSClient
	redis    *cache.Redis
	store    *Store
	registry *ToolRegistry
	logger   *slog.Logger
	cfg      Config
}

func NewActionExecutor(nc *messaging.NATSClient, redis *cache.Redis, store *Store, registry *ToolRegistry, logger *slog.Logger, cfg Config) *ActionExecutor {
	return &ActionExecutor{nc: nc, redis: redis, store: store, registry: registry, logger: logger, cfg: cfg}
}

type ExecuteRequest struct {
	ToolName          string          `json:"tool_name"`
	ToolInput         json.RawMessage `json:"tool_input"`
	TenantID          string          `json:"tenant_id"`
	UserID            string          `json:"user_id"`
	Role              string          `json:"role"`
	SessionID         string          `json:"session_id"`
	MessageID         string          `json:"message_id"`
	ConfirmationToken string          `json:"confirmation_token,omitempty"`
}

func (ae *ActionExecutor) Execute(ctx context.Context, req *ExecuteRequest) (json.RawMessage, error) {
	tool, ok := ae.registry.Get(req.ToolName)
	if !ok {
		return nil, fmt.Errorf("unknown tool: %s", req.ToolName)
	}

	if !ae.registry.roleAllowed(tool, req.Role) {
		ae.logAction(ctx, req, "denied", nil, nil)
		return nil, fmt.Errorf("role %s does not have permission for %s", req.Role, req.ToolName)
	}

	// Read-only tools: execute immediately
	if tool.ConfirmLevel == ConfirmNone {
		return ae.executeCommand(ctx, tool, req)
	}

	// Mutation tools: check confirmation
	if req.ConfirmationToken == "" {
		return ae.requestConfirmation(ctx, tool, req)
	}

	// Validate confirmation token
	valid, err := ae.validateConfirmToken(ctx, req.ConfirmationToken, req.ToolName)
	if err != nil || !valid {
		return json.RawMessage(`{"error":"Invalid or expired confirmation token"}`), nil
	}

	return ae.executeCommand(ctx, tool, req)
}

func (ae *ActionExecutor) requestConfirmation(ctx context.Context, tool ToolDefinition, req *ExecuteRequest) (json.RawMessage, error) {
	token := uuid.New().String()

	tokenKey := fmt.Sprintf("assistant:confirm:%s", token)
	tokenData, _ := json.Marshal(map[string]string{
		"tool_name":  req.ToolName,
		"session_id": req.SessionID,
		"tenant_id":  req.TenantID,
		"user_id":    req.UserID,
	})
	_ = ae.redis.Set(ctx, tokenKey, string(tokenData), 5*time.Minute)

	ae.logAction(ctx, req, "pending_confirmation", nil, nil)

	response := map[string]interface{}{
		"requires_confirmation": true,
		"confirmation_token":    token,
		"confirm_level":         tool.ConfirmLevel,
		"tool_name":             req.ToolName,
		"tool_input":            json.RawMessage(req.ToolInput),
	}

	if tool.ConfirmLevel == ConfirmDangerous {
		impact := ae.assessImpact(ctx, tool, req)
		response["impact_analysis"] = impact
	}

	result, _ := json.Marshal(response)
	return result, nil
}

func (ae *ActionExecutor) validateConfirmToken(ctx context.Context, token, toolName string) (bool, error) {
	tokenKey := fmt.Sprintf("assistant:confirm:%s", token)

	data, err := ae.redis.Get(ctx, tokenKey)
	if err != nil {
		return false, err
	}

	var stored map[string]string
	if err := json.Unmarshal([]byte(data), &stored); err != nil {
		return false, err
	}

	if stored["tool_name"] != toolName {
		return false, nil
	}

	// Single-use: delete after validation
	_ = ae.redis.Del(ctx, tokenKey)
	return true, nil
}

func (ae *ActionExecutor) executeCommand(ctx context.Context, tool ToolDefinition, req *ExecuteRequest) (json.RawMessage, error) {
	if tool.Service == "meta" {
		return ae.handleMetaAction(ctx, req)
	}

	subject := fmt.Sprintf("cmd.%s.%s", tool.Service, req.ToolName)

	cmd := &messaging.CommandEnvelope{
		Action:   req.ToolName,
		TenantID: req.TenantID,
		UserID:   req.UserID,
		Input:    json.RawMessage(req.ToolInput),
	}

	start := time.Now()
	resp, err := ae.nc.Request(ctx, subject, cmd, 10*time.Second)
	duration := time.Since(start)

	if err != nil {
		ae.logger.Error("command execution failed", "tool", req.ToolName, "subject", subject, "error", err, "duration_ms", duration.Milliseconds())
		ae.logAction(ctx, req, "failed", nil, nil)
		return nil, fmt.Errorf("execute %s: %w", req.ToolName, err)
	}

	if !resp.Success {
		ae.logAction(ctx, req, "failed", resp.Data, nil)
		return json.RawMessage(fmt.Sprintf(`{"error": %q}`, resp.Error)), nil
	}

	// For mutation tools, store previous state for rollback
	if tool.ConfirmLevel > ConfirmNone {
		ae.logAction(ctx, req, "executed", resp.Data, resp.Data)
	} else {
		ae.logAction(ctx, req, "executed", resp.Data, nil)
	}

	ae.logger.Info("tool executed", "tool", req.ToolName, "duration_ms", duration.Milliseconds())
	return resp.Data, nil
}

func (ae *ActionExecutor) handleMetaAction(ctx context.Context, req *ExecuteRequest) (json.RawMessage, error) {
	if req.ToolName == "undo_last_action" {
		return ae.undoLastAction(ctx, req.TenantID, req.SessionID, req.UserID)
	}
	return json.RawMessage(`{"error":"Unknown meta action"}`), nil
}

func (ae *ActionExecutor) undoLastAction(ctx context.Context, tenantID, sessionID, userID string) (json.RawMessage, error) {
	action, err := ae.store.GetLastAction(ctx, tenantID, sessionID)
	if err != nil {
		return json.RawMessage(`{"error":"No action to undo"}`), nil
	}

	if len(action.PreviousState) == 0 || string(action.PreviousState) == "{}" {
		return json.RawMessage(`{"error":"No previous state stored for this action"}`), nil
	}

	tool, ok := ae.registry.Get(action.ToolName)
	if !ok {
		return json.RawMessage(`{"error":"Original tool not found"}`), nil
	}

	subject := fmt.Sprintf("cmd.%s.%s", tool.Service, action.ToolName)
	cmd := &messaging.CommandEnvelope{
		Action:   "rollback_" + action.ToolName,
		TenantID: tenantID,
		UserID:   userID,
		Input:    action.PreviousState,
	}

	resp, err := ae.nc.Request(ctx, subject, cmd, 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("rollback failed: %w", err)
	}

	_ = ae.store.UpdateActionLogStatus(ctx, action.ID, "rolled_back", resp.Data)

	return json.RawMessage(`{"success":true,"message":"Action has been rolled back"}`), nil
}

func (ae *ActionExecutor) assessImpact(ctx context.Context, tool ToolDefinition, req *ExecuteRequest) map[string]interface{} {
	impact := map[string]interface{}{
		"tool":     req.ToolName,
		"severity": "high",
	}

	var input map[string]interface{}
	json.Unmarshal(req.ToolInput, &input)

	switch req.ToolName {
	case "pause_broker":
		impact["description"] = "Pausing this broker will stop all lead delivery to it. Leads currently in pipeline may need to be rerouted."
		impact["affected_entities"] = "All routing rules targeting this broker"
	case "pause_rule":
		impact["description"] = "Pausing this rule will stop all lead distribution through it."
		impact["affected_entities"] = "All affiliates and brokers linked to this rule"
	case "adjust_fraud_threshold":
		impact["description"] = "Changing the fraud threshold will affect which leads are accepted or rejected going forward."
		impact["reversible"] = true
	case "block_source":
		impact["description"] = "Blocking this source will immediately reject all incoming leads from it."
	case "pause_uad":
		impact["description"] = "Pausing UAD will stop all unsold lead redistribution."
	case "pause_broker_autologin":
		impact["description"] = "Pausing autologin for this broker means new leads will not get auto-logged in."
	default:
		impact["description"] = "This is a high-impact action that may affect live operations."
	}

	return impact
}

func (ae *ActionExecutor) logAction(ctx context.Context, req *ExecuteRequest, status string, result, previousState json.RawMessage) {
	log := &ActionLog{
		ID:        uuid.New().String(),
		SessionID: req.SessionID,
		MessageID: req.MessageID,
		TenantID:  req.TenantID,
		UserID:    req.UserID,
		ToolName:  req.ToolName,
		ToolInput: req.ToolInput,
		Status:    status,
		Result:    result,
		PreviousState: previousState,
	}

	if err := ae.store.SaveActionLog(ctx, log); err != nil {
		ae.logger.Error("failed to save action log", "error", err)
	}
}
