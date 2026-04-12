package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const anthropicAPIURL = "https://api.anthropic.com/v1/messages"

type ClaudeClient struct {
	apiKey     string
	model      string
	httpClient *http.Client
	logger     *slog.Logger
}

func NewClaudeClient(apiKey, model string, logger *slog.Logger) *ClaudeClient {
	return &ClaudeClient{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 120 * time.Second,
		},
		logger: logger,
	}
}

// Claude API request/response types

type ClaudeRequest struct {
	Model     string           `json:"model"`
	MaxTokens int              `json:"max_tokens"`
	System    []SystemBlock    `json:"system,omitempty"`
	Messages  []ClaudeMessage  `json:"messages"`
	Tools     json.RawMessage  `json:"tools,omitempty"`
	Stream    bool             `json:"stream"`
}

type SystemBlock struct {
	Type         string        `json:"type"`
	Text         string        `json:"text"`
	CacheControl *CacheControl `json:"cache_control,omitempty"`
}

type CacheControl struct {
	Type string `json:"type"`
}

type ClaudeMessage struct {
	Role    string        `json:"role"`
	Content []ContentBlock `json:"content"`
}

type ContentBlock struct {
	Type      string          `json:"type"`
	Text      string          `json:"text,omitempty"`
	ID        string          `json:"id,omitempty"`
	Name      string          `json:"name,omitempty"`
	Input     json.RawMessage `json:"input,omitempty"`
	ToolUseID string          `json:"tool_use_id,omitempty"`
	Content   string          `json:"content,omitempty"`
	IsError   bool            `json:"is_error,omitempty"`
}

type ClaudeResponse struct {
	ID           string         `json:"id"`
	Type         string         `json:"type"`
	Role         string         `json:"role"`
	Content      []ContentBlock `json:"content"`
	Model        string         `json:"model"`
	StopReason   string         `json:"stop_reason"`
	Usage        Usage          `json:"usage"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens,omitempty"`
	CacheReadInputTokens     int `json:"cache_read_input_tokens,omitempty"`
}

// Streaming types

type StreamEvent struct {
	Type  string
	Data  json.RawMessage
}

type StreamDelta struct {
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
}

type StreamContentBlockStart struct {
	Index        int          `json:"index"`
	ContentBlock ContentBlock `json:"content_block"`
}

type StreamMessageDelta struct {
	Delta struct {
		StopReason string `json:"stop_reason"`
	} `json:"delta"`
	Usage Usage `json:"usage"`
}

// CreateMessage sends a non-streaming request to the Claude API
func (c *ClaudeClient) CreateMessage(ctx context.Context, req *ClaudeRequest) (*ClaudeResponse, error) {
	req.Model = c.model
	req.Stream = false
	if req.MaxTokens == 0 {
		req.MaxTokens = 4096
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", anthropicAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("api request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("api error %d: %s", resp.StatusCode, string(respBody))
	}

	var claudeResp ClaudeResponse
	if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &claudeResp, nil
}

// StreamMessage sends a streaming request and calls the handler for each event
func (c *ClaudeClient) StreamMessage(ctx context.Context, req *ClaudeRequest, handler func(event StreamEvent) error) (*Usage, error) {
	req.Model = c.model
	req.Stream = true
	if req.MaxTokens == 0 {
		req.MaxTokens = 4096
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", anthropicAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	c.setHeaders(httpReq)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("api request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("api error %d: %s", resp.StatusCode, string(respBody))
	}

	var totalUsage Usage
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var currentEvent string
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "event: ") {
			currentEvent = strings.TrimPrefix(line, "event: ")
			continue
		}

		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")

			if currentEvent == "message_delta" {
				var md StreamMessageDelta
				if json.Unmarshal([]byte(data), &md) == nil {
					totalUsage.OutputTokens = md.Usage.OutputTokens
				}
			}

			se := StreamEvent{
				Type: currentEvent,
				Data: json.RawMessage(data),
			}

			if err := handler(se); err != nil {
				return &totalUsage, err
			}

			if currentEvent == "message_stop" {
				break
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return &totalUsage, fmt.Errorf("read stream: %w", err)
	}

	return &totalUsage, nil
}

func (c *ClaudeClient) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")
	req.Header.Set("anthropic-beta", "prompt-caching-2024-07-31")
}

// BuildMessages converts stored messages to Claude API format
func BuildClaudeMessages(messages []Message) []ClaudeMessage {
	var claudeMsgs []ClaudeMessage

	for _, msg := range messages {
		switch msg.Role {
		case "user":
			claudeMsgs = append(claudeMsgs, ClaudeMessage{
				Role:    "user",
				Content: []ContentBlock{{Type: "text", Text: msg.Content}},
			})

		case "assistant":
			blocks := []ContentBlock{{Type: "text", Text: msg.Content}}
			claudeMsgs = append(claudeMsgs, ClaudeMessage{
				Role:    "assistant",
				Content: blocks,
			})

		case "tool_use":
			claudeMsgs = append(claudeMsgs, ClaudeMessage{
				Role: "assistant",
				Content: []ContentBlock{{
					Type:  "tool_use",
					ID:    msg.ID,
					Name:  *msg.ToolName,
					Input: msg.ToolInput,
				}},
			})

		case "tool_result":
			content := msg.Content
			if content == "" && len(msg.ToolResult) > 0 {
				content = string(msg.ToolResult)
			}
			claudeMsgs = append(claudeMsgs, ClaudeMessage{
				Role: "user",
				Content: []ContentBlock{{
					Type:      "tool_result",
					ToolUseID: *msg.ToolName,
					Content:   content,
				}},
			})
		}
	}

	return claudeMsgs
}

// PruneHistory keeps the last N messages in full, summarizes older ones
func PruneHistory(messages []ClaudeMessage, keepFull int) []ClaudeMessage {
	if len(messages) <= keepFull {
		return messages
	}

	pruned := messages[len(messages)-keepFull:]

	if len(pruned) > 0 && pruned[0].Role == "assistant" {
		pruned = append([]ClaudeMessage{{
			Role:    "user",
			Content: []ContentBlock{{Type: "text", Text: "[Earlier conversation history was pruned]"}},
		}}, pruned...)
	}

	return pruned
}
