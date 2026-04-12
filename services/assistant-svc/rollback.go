package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/gambchamp/crm/pkg/messaging"
)

type RollbackManager struct {
	nc       *messaging.NATSClient
	store    *Store
	registry *ToolRegistry
	logger   *slog.Logger
}

func NewRollbackManager(nc *messaging.NATSClient, store *Store, registry *ToolRegistry, logger *slog.Logger) *RollbackManager {
	return &RollbackManager{nc: nc, store: store, registry: registry, logger: logger}
}

type RollbackResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func (rm *RollbackManager) RollbackAction(ctx context.Context, tenantID, sessionID, userID string) (*RollbackResult, error) {
	action, err := rm.store.GetLastAction(ctx, tenantID, sessionID)
	if err != nil {
		return &RollbackResult{Success: false, Message: "No action to undo"}, nil
	}

	if action.Status != "executed" {
		return &RollbackResult{Success: false, Message: fmt.Sprintf("Cannot undo action with status: %s", action.Status)}, nil
	}

	if len(action.PreviousState) == 0 || string(action.PreviousState) == "{}" {
		return &RollbackResult{Success: false, Message: "No previous state available for rollback"}, nil
	}

	tool, ok := rm.registry.Get(action.ToolName)
	if !ok {
		return &RollbackResult{Success: false, Message: "Original tool definition not found"}, nil
	}

	rollbackAction := resolveRollbackAction(action.ToolName)

	subject := fmt.Sprintf("cmd.%s.%s", tool.Service, rollbackAction)
	cmd := &messaging.CommandEnvelope{
		Action:   rollbackAction,
		TenantID: tenantID,
		UserID:   userID,
		Input:    json.RawMessage(action.PreviousState),
	}

	resp, err := rm.nc.Request(ctx, subject, cmd, 10*60e6)
	if err != nil {
		rm.logger.Error("rollback command failed", "tool", action.ToolName, "error", err)
		return nil, fmt.Errorf("rollback command: %w", err)
	}

	if !resp.Success {
		_ = rm.store.UpdateActionLogStatus(ctx, action.ID, "rollback_failed", resp.Data)
		return &RollbackResult{Success: false, Message: resp.Error}, nil
	}

	_ = rm.store.UpdateActionLogStatus(ctx, action.ID, "rolled_back", resp.Data)

	rm.logger.Info("action rolled back", "tool", action.ToolName, "action_id", action.ID)
	return &RollbackResult{Success: true, Message: fmt.Sprintf("Successfully rolled back: %s", action.ToolName)}, nil
}

func resolveRollbackAction(toolName string) string {
	rollbackMap := map[string]string{
		"pause_broker":            "resume_broker",
		"resume_broker":           "pause_broker",
		"pause_rule":              "resume_rule",
		"resume_rule":             "pause_rule",
		"pause_uad":               "resume_uad",
		"resume_uad":              "pause_uad",
		"pause_broker_autologin":  "resume_broker_autologin",
		"block_source":            "unblock_source",
		"unblock_source":          "block_source",
	}

	if mapped, ok := rollbackMap[toolName]; ok {
		return mapped
	}

	return "restore_" + toolName
}
