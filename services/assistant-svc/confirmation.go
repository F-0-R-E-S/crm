package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/google/uuid"
)

type ConfirmationManager struct {
	redis *cache.Redis
}

func NewConfirmationManager(redis *cache.Redis) *ConfirmationManager {
	return &ConfirmationManager{redis: redis}
}

type ConfirmationRecord struct {
	Token     string          `json:"token"`
	ToolName  string          `json:"tool_name"`
	ToolInput json.RawMessage `json:"tool_input"`
	TenantID  string          `json:"tenant_id"`
	UserID    string          `json:"user_id"`
	SessionID string          `json:"session_id"`
	CreatedAt time.Time       `json:"created_at"`
}

func (cm *ConfirmationManager) Create(ctx context.Context, toolName string, toolInput json.RawMessage, tenantID, userID, sessionID string) (string, error) {
	token := uuid.New().String()

	record := ConfirmationRecord{
		Token:     token,
		ToolName:  toolName,
		ToolInput: toolInput,
		TenantID:  tenantID,
		UserID:    userID,
		SessionID: sessionID,
		CreatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(record)
	if err != nil {
		return "", fmt.Errorf("marshal confirmation: %w", err)
	}

	key := fmt.Sprintf("assistant:confirm:%s", token)
	if err := cm.redis.Set(ctx, key, string(data), 5*time.Minute); err != nil {
		return "", fmt.Errorf("store confirmation: %w", err)
	}

	return token, nil
}

func (cm *ConfirmationManager) Validate(ctx context.Context, token, toolName string) (*ConfirmationRecord, error) {
	key := fmt.Sprintf("assistant:confirm:%s", token)

	data, err := cm.redis.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("confirmation not found or expired")
	}

	var record ConfirmationRecord
	if err := json.Unmarshal([]byte(data), &record); err != nil {
		return nil, fmt.Errorf("invalid confirmation data")
	}

	if record.ToolName != toolName {
		return nil, fmt.Errorf("confirmation tool mismatch")
	}

	// Single-use: delete after validation
	_ = cm.redis.Del(ctx, key)

	return &record, nil
}

func (cm *ConfirmationManager) Revoke(ctx context.Context, token string) error {
	key := fmt.Sprintf("assistant:confirm:%s", token)
	return cm.redis.Del(ctx, key)
}
