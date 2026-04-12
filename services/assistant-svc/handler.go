package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/google/uuid"
)

type Handler struct {
	logger       *slog.Logger
	store        *Store
	ctxMgr       *ContextManager
	sessionMgr   *SessionManager
	claude       *ClaudeClient
	promptBuilder *PromptBuilder
	executor     *ActionExecutor
	toolRegistry *ToolRegistry
	cfg          Config
}

func NewHandler(
	logger *slog.Logger,
	store *Store,
	ctxMgr *ContextManager,
	sessionMgr *SessionManager,
	claude *ClaudeClient,
	promptBuilder *PromptBuilder,
	executor *ActionExecutor,
	toolRegistry *ToolRegistry,
	cfg Config,
) *Handler {
	return &Handler{
		logger:       logger,
		store:        store,
		ctxMgr:       ctxMgr,
		sessionMgr:   sessionMgr,
		claude:       claude,
		promptBuilder: promptBuilder,
		executor:     executor,
		toolRegistry: toolRegistry,
		cfg:          cfg,
	}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/assistant/sessions", h.createSession)
	mux.HandleFunc("GET /api/v1/assistant/sessions", h.listSessions)
	mux.HandleFunc("GET /api/v1/assistant/sessions/{id}", h.getSession)
	mux.HandleFunc("DELETE /api/v1/assistant/sessions/{id}", h.deleteSession)
	mux.HandleFunc("POST /api/v1/assistant/chat", h.chat)
	mux.HandleFunc("GET /api/v1/assistant/ws", h.websocket)
}

// --- Session CRUD ---

func (h *Handler) createSession(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")

	sess, err := h.store.CreateSession(r.Context(), tenantID, userID, h.cfg.Model)
	if err != nil {
		h.logger.Error("create session failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusCreated, sess)
}

func (h *Handler) listSessions(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")

	sessions, err := h.store.ListSessions(r.Context(), tenantID, userID, 50, 0)
	if err != nil {
		h.logger.Error("list sessions failed", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"sessions": sessions})
}

func (h *Handler) getSession(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	sessionID := r.PathValue("id")

	sess, err := h.store.GetSession(r.Context(), tenantID, sessionID)
	if err != nil {
		errors.ErrNotFound.WriteJSON(w)
		return
	}

	messages, err := h.store.GetMessages(r.Context(), tenantID, sessionID, 100)
	if err != nil {
		messages = []Message{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"session":  sess,
		"messages": messages,
	})
}

func (h *Handler) deleteSession(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	sessionID := r.PathValue("id")

	if err := h.store.DeleteSession(r.Context(), tenantID, sessionID); err != nil {
		errors.ErrInternal.WriteJSON(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Chat SSE Endpoint ---

type ChatRequest struct {
	SessionID         string `json:"session_id"`
	Message           string `json:"message"`
	ConfirmationToken string `json:"confirmation_token,omitempty"`
}

func (h *Handler) chat(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	role := r.Header.Get("X-Role")

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body").WriteJSON(w)
		return
	}

	if req.SessionID == "" || req.Message == "" {
		errors.NewBadRequest("session_id and message are required").WriteJSON(w)
		return
	}

	// Sanitize user input
	req.Message = sanitizeInput(req.Message)

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	flusher, ok := w.(http.Flusher)
	if !ok {
		errors.ErrInternal.WriteJSON(w)
		return
	}

	ctx := r.Context()

	// Save user message
	userMsg := &Message{
		ID:        uuid.New().String(),
		SessionID: req.SessionID,
		TenantID:  tenantID,
		Role:      "user",
		Content:   req.Message,
	}
	if err := h.store.SaveMessage(ctx, userMsg); err != nil {
		h.logger.Error("save user message failed", "error", err)
	}

	// Build context
	snap, err := h.ctxMgr.GetSnapshot(ctx, tenantID)
	if err != nil {
		h.logger.Error("build snapshot failed", "error", err)
		snap = &TenantContextSnapshot{TenantID: tenantID}
	}

	systemPrompt := h.promptBuilder.BuildSystemPrompt(snap, role)
	toolsJSON, _ := h.promptBuilder.BuildToolsJSON(role)

	// Load history
	history, err := h.store.GetMessages(ctx, tenantID, req.SessionID, 50)
	if err != nil {
		history = []Message{}
	}
	claudeMsgs := BuildClaudeMessages(history)
	claudeMsgs = PruneHistory(claudeMsgs, 20)

	// Tool-use loop
	toolCallCount := 0
	maxToolCalls := h.cfg.MaxToolCalls

	for {
		claudeReq := &ClaudeRequest{
			MaxTokens: 4096,
			System: []SystemBlock{
				{Type: "text", Text: systemPrompt, CacheControl: &CacheControl{Type: "ephemeral"}},
			},
			Messages: claudeMsgs,
			Tools:    toolsJSON,
		}

		var fullResponse strings.Builder
		var toolUseBlocks []ContentBlock

		usage, err := h.claude.StreamMessage(ctx, claudeReq, func(event StreamEvent) error {
			switch event.Type {
			case "content_block_start":
				var cbs StreamContentBlockStart
				if json.Unmarshal(event.Data, &cbs) == nil && cbs.ContentBlock.Type == "tool_use" {
					toolUseBlocks = append(toolUseBlocks, cbs.ContentBlock)
					sseWrite(w, flusher, "tool_use", map[string]interface{}{
						"tool": cbs.ContentBlock.Name,
						"id":   cbs.ContentBlock.ID,
					})
				}

			case "content_block_delta":
				var delta struct {
					Index int         `json:"index"`
					Delta StreamDelta `json:"delta"`
				}
				if json.Unmarshal(event.Data, &delta) == nil {
					if delta.Delta.Type == "text_delta" && delta.Delta.Text != "" {
						fullResponse.WriteString(delta.Delta.Text)
						sseWrite(w, flusher, "content_delta", map[string]string{
							"delta": delta.Delta.Text,
						})
					}
					if delta.Delta.Type == "input_json_delta" && len(toolUseBlocks) > 0 {
						last := &toolUseBlocks[len(toolUseBlocks)-1]
						last.Input = appendRawJSON(last.Input, []byte(delta.Delta.Text))
					}
				}
			}
			return nil
		})

		if err != nil {
			h.logger.Error("claude stream error", "error", err)
			sseWrite(w, flusher, "error", map[string]string{"error": "Assistant error"})
			break
		}

		// Save assistant text response
		if text := fullResponse.String(); text != "" {
			assistMsg := &Message{
				ID:           uuid.New().String(),
				SessionID:    req.SessionID,
				TenantID:     tenantID,
				Role:         "assistant",
				Content:      sanitizeOutput(text),
				InputTokens:  intPtr(usage.InputTokens),
				OutputTokens: intPtr(usage.OutputTokens),
			}
			_ = h.store.SaveMessage(ctx, assistMsg)
			_ = h.store.UpdateSessionTokens(ctx, tenantID, req.SessionID, usage.InputTokens, usage.OutputTokens)
		}

		// Process tool calls
		if len(toolUseBlocks) == 0 {
			break
		}

		toolCallCount += len(toolUseBlocks)
		if toolCallCount > maxToolCalls {
			sseWrite(w, flusher, "error", map[string]string{"error": "Tool call limit reached"})
			break
		}

		// Add assistant response with tool_use blocks to messages
		claudeMsgs = append(claudeMsgs, ClaudeMessage{
			Role:    "assistant",
			Content: toolUseBlocks,
		})

		// Execute each tool and collect results
		var toolResults []ContentBlock
		for _, tu := range toolUseBlocks {
			result := h.executeTool(ctx, tu, tenantID, userID, role, req.SessionID, req.ConfirmationToken)

			sseWrite(w, flusher, "tool_result", map[string]interface{}{
				"tool":   tu.Name,
				"id":     tu.ID,
				"result": json.RawMessage(result),
			})

			toolResults = append(toolResults, ContentBlock{
				Type:      "tool_result",
				ToolUseID: tu.ID,
				Content:   result,
			})
		}

		claudeMsgs = append(claudeMsgs, ClaudeMessage{
			Role:    "user",
			Content: toolResults,
		})
	}

	// Generate title for first message
	if len(history) == 0 {
		go h.generateTitle(context.Background(), tenantID, req.SessionID, req.Message)
	}

	sseWrite(w, flusher, "message_stop", map[string]string{
		"message_id": uuid.New().String(),
	})
}

func (h *Handler) executeTool(ctx context.Context, tu ContentBlock, tenantID, userID, role, sessionID, confirmToken string) string {
	tool, ok := h.toolRegistry.Get(tu.Name)
	if !ok {
		return `{"error": "Unknown tool"}`
	}

	if !h.toolRegistry.roleAllowed(tool, role) {
		return `{"error": "Insufficient permissions for this action"}`
	}

	result, err := h.executor.Execute(ctx, &ExecuteRequest{
		ToolName:          tu.Name,
		ToolInput:         tu.Input,
		TenantID:          tenantID,
		UserID:            userID,
		Role:              role,
		SessionID:         sessionID,
		MessageID:         tu.ID,
		ConfirmationToken: confirmToken,
	})
	if err != nil {
		h.logger.Error("tool execution failed", "tool", tu.Name, "error", err)
		return fmt.Sprintf(`{"error": %q}`, err.Error())
	}

	return string(result)
}

func (h *Handler) generateTitle(ctx context.Context, tenantID, sessionID, firstMessage string) {
	prompt := fmt.Sprintf("Generate a short title (max 6 words) for a conversation that starts with: %q. Return only the title, no quotes.", firstMessage)

	resp, err := h.claude.CreateMessage(ctx, &ClaudeRequest{
		MaxTokens: 30,
		Messages: []ClaudeMessage{{
			Role:    "user",
			Content: []ContentBlock{{Type: "text", Text: prompt}},
		}},
	})
	if err != nil {
		return
	}

	for _, c := range resp.Content {
		if c.Type == "text" && c.Text != "" {
			title := c.Text
			if len(title) > 255 {
				title = title[:255]
			}
			_ = h.store.UpdateSessionTitle(ctx, tenantID, sessionID, title)
			return
		}
	}
}

// --- WebSocket for real-time events ---

func (h *Handler) websocket(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		sessionID = "global"
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		errors.ErrInternal.WriteJSON(w)
		return
	}

	ch := h.sessionMgr.Register(tenantID, sessionID)
	defer h.sessionMgr.Unregister(tenantID, sessionID)

	// Keep-alive ticker
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ch.Done:
			return
		case event := <-ch.Events:
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Event, event.Data)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func sseWrite(w http.ResponseWriter, flusher http.Flusher, event string, data interface{}) {
	encoded, _ := json.Marshal(data)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, string(encoded))
	flusher.Flush()
}

func sanitizeInput(s string) string {
	s = strings.ReplaceAll(s, "<tool_use>", "")
	s = strings.ReplaceAll(s, "</tool_use>", "")
	s = strings.ReplaceAll(s, "<tool_result>", "")
	s = strings.ReplaceAll(s, "</tool_result>", "")
	s = strings.ReplaceAll(s, `"tool_name":`, "")
	return s
}

func sanitizeOutput(s string) string {
	s = strings.ReplaceAll(s, "system prompt", "***")
	s = strings.ReplaceAll(s, "System prompt", "***")
	return s
}

func appendRawJSON(existing json.RawMessage, additional []byte) json.RawMessage {
	if len(existing) == 0 {
		return json.RawMessage(additional)
	}
	return json.RawMessage(append([]byte(existing), additional...))
}

func intPtr(n int) *int {
	return &n
}
