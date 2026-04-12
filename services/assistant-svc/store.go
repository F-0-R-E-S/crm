package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gambchamp/crm/pkg/database"
)

type Store struct {
	db *database.DB
}

func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// --- Sessions ---

type Session struct {
	ID                string    `json:"id"`
	TenantID          string    `json:"tenant_id"`
	UserID            string    `json:"user_id"`
	Title             string    `json:"title"`
	Model             string    `json:"model"`
	TotalInputTokens  int64     `json:"total_input_tokens"`
	TotalOutputTokens int64     `json:"total_output_tokens"`
	MessageCount      int       `json:"message_count"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

func (s *Store) CreateSession(ctx context.Context, tenantID, userID, model string) (*Session, error) {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sess Session
	err = tx.QueryRow(ctx,
		`INSERT INTO assistant_sessions (tenant_id, user_id, model) VALUES ($1, $2, $3)
		 RETURNING id, tenant_id, user_id, title, model, total_input_tokens, total_output_tokens,
		           message_count, is_active, created_at, updated_at`,
		tenantID, userID, model,
	).Scan(&sess.ID, &sess.TenantID, &sess.UserID, &sess.Title, &sess.Model,
		&sess.TotalInputTokens, &sess.TotalOutputTokens, &sess.MessageCount,
		&sess.IsActive, &sess.CreatedAt, &sess.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return &sess, nil
}

func (s *Store) ListSessions(ctx context.Context, tenantID, userID string, limit, offset int) ([]Session, error) {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx,
		`SELECT id, tenant_id, user_id, title, model, total_input_tokens, total_output_tokens,
		        message_count, is_active, created_at, updated_at
		 FROM assistant_sessions WHERE user_id = $1
		 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.ID, &sess.TenantID, &sess.UserID, &sess.Title, &sess.Model,
			&sess.TotalInputTokens, &sess.TotalOutputTokens, &sess.MessageCount,
			&sess.IsActive, &sess.CreatedAt, &sess.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *Store) GetSession(ctx context.Context, tenantID, sessionID string) (*Session, error) {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sess Session
	err = tx.QueryRow(ctx,
		`SELECT id, tenant_id, user_id, title, model, total_input_tokens, total_output_tokens,
		        message_count, is_active, created_at, updated_at
		 FROM assistant_sessions WHERE id = $1`,
		sessionID,
	).Scan(&sess.ID, &sess.TenantID, &sess.UserID, &sess.Title, &sess.Model,
		&sess.TotalInputTokens, &sess.TotalOutputTokens, &sess.MessageCount,
		&sess.IsActive, &sess.CreatedAt, &sess.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return &sess, nil
}

func (s *Store) DeleteSession(ctx context.Context, tenantID, sessionID string) error {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM assistant_sessions WHERE id = $1`, sessionID)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return tx.Commit(ctx)
}

func (s *Store) UpdateSessionTitle(ctx context.Context, tenantID, sessionID, title string) error {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `UPDATE assistant_sessions SET title = $1 WHERE id = $2`, title, sessionID)
	if err != nil {
		return fmt.Errorf("update title: %w", err)
	}
	return tx.Commit(ctx)
}

func (s *Store) UpdateSessionTokens(ctx context.Context, tenantID, sessionID string, inputTokens, outputTokens int) error {
	return s.db.Exec(ctx,
		`UPDATE assistant_sessions
		 SET total_input_tokens = total_input_tokens + $1,
		     total_output_tokens = total_output_tokens + $2,
		     message_count = message_count + 1
		 WHERE id = $3 AND tenant_id = $4`,
		inputTokens, outputTokens, sessionID, tenantID)
}

// --- Messages ---

type Message struct {
	ID           string          `json:"id"`
	SessionID    string          `json:"session_id"`
	TenantID     string          `json:"tenant_id"`
	Role         string          `json:"role"`
	Content      string          `json:"content"`
	ToolName     *string         `json:"tool_name,omitempty"`
	ToolInput    json.RawMessage `json:"tool_input,omitempty"`
	ToolResult   json.RawMessage `json:"tool_result,omitempty"`
	InputTokens  *int            `json:"input_tokens,omitempty"`
	OutputTokens *int            `json:"output_tokens,omitempty"`
	DurationMs   *int            `json:"duration_ms,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

func (s *Store) SaveMessage(ctx context.Context, msg *Message) error {
	return s.db.Exec(ctx,
		`INSERT INTO assistant_messages
		 (id, session_id, tenant_id, role, content, tool_name, tool_input, tool_result, input_tokens, output_tokens, duration_ms)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		msg.ID, msg.SessionID, msg.TenantID, msg.Role, msg.Content,
		msg.ToolName, ensureJSON(msg.ToolInput), ensureJSON(msg.ToolResult),
		msg.InputTokens, msg.OutputTokens, msg.DurationMs)
}

func (s *Store) GetMessages(ctx context.Context, tenantID, sessionID string, limit int) ([]Message, error) {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx,
		`SELECT id, session_id, tenant_id, role, content, tool_name, tool_input, tool_result,
		        input_tokens, output_tokens, duration_ms, created_at
		 FROM assistant_messages WHERE session_id = $1
		 ORDER BY created_at ASC LIMIT $2`,
		sessionID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("get messages: %w", err)
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var m Message
		if err := rows.Scan(&m.ID, &m.SessionID, &m.TenantID, &m.Role, &m.Content,
			&m.ToolName, &m.ToolInput, &m.ToolResult,
			&m.InputTokens, &m.OutputTokens, &m.DurationMs, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		messages = append(messages, m)
	}
	return messages, nil
}

// --- Action Log ---

type ActionLog struct {
	ID                  string          `json:"id"`
	SessionID           string          `json:"session_id"`
	MessageID           string          `json:"message_id"`
	TenantID            string          `json:"tenant_id"`
	UserID              string          `json:"user_id"`
	ToolName            string          `json:"tool_name"`
	ToolInput           json.RawMessage `json:"tool_input"`
	Status              string          `json:"status"`
	Result              json.RawMessage `json:"result,omitempty"`
	PreviousState       json.RawMessage `json:"previous_state,omitempty"`
	RollbackID          *string         `json:"rollback_id,omitempty"`
	ConfirmationToken   *string         `json:"confirmation_token,omitempty"`
	ExecutionDurationMs *int            `json:"execution_duration_ms,omitempty"`
	LLMReasoning        *string         `json:"llm_reasoning,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
}

func (s *Store) SaveActionLog(ctx context.Context, log *ActionLog) error {
	return s.db.Exec(ctx,
		`INSERT INTO assistant_action_log
		 (id, session_id, message_id, tenant_id, user_id, tool_name, tool_input, status,
		  result, previous_state, rollback_id, confirmation_token, execution_duration_ms, llm_reasoning)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		log.ID, log.SessionID, log.MessageID, log.TenantID, log.UserID,
		log.ToolName, log.ToolInput, log.Status,
		ensureJSON(log.Result), ensureJSON(log.PreviousState),
		log.RollbackID, log.ConfirmationToken, log.ExecutionDurationMs, log.LLMReasoning)
}

func (s *Store) UpdateActionLogStatus(ctx context.Context, id, status string, result json.RawMessage) error {
	return s.db.Exec(ctx,
		`UPDATE assistant_action_log SET status = $1, result = $2 WHERE id = $3`,
		status, ensureJSON(result), id)
}

func (s *Store) GetLastAction(ctx context.Context, tenantID, sessionID string) (*ActionLog, error) {
	tx, err := s.db.WithTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var a ActionLog
	err = tx.QueryRow(ctx,
		`SELECT id, session_id, message_id, tenant_id, user_id, tool_name, tool_input, status,
		        result, previous_state, rollback_id, confirmation_token, execution_duration_ms, llm_reasoning, created_at
		 FROM assistant_action_log WHERE session_id = $1 AND status = 'executed'
		 ORDER BY created_at DESC LIMIT 1`,
		sessionID,
	).Scan(&a.ID, &a.SessionID, &a.MessageID, &a.TenantID, &a.UserID,
		&a.ToolName, &a.ToolInput, &a.Status,
		&a.Result, &a.PreviousState, &a.RollbackID, &a.ConfirmationToken,
		&a.ExecutionDurationMs, &a.LLMReasoning, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func ensureJSON(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return json.RawMessage(`{}`)
	}
	return raw
}
