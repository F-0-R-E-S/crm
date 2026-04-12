package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gambchamp/crm/pkg/database"
)

// AuditWriter is the interface for persisting audit log entries.
type AuditWriter interface {
	WriteAuditLog(ctx context.Context, entry *AuditEntry) error
}

// AuditEntry represents a single audit log entry for CUD operations.
type AuditEntry struct {
	TenantID     string          `json:"tenant_id"`
	UserID       string          `json:"user_id"`
	Action       string          `json:"action"`
	ResourceType string          `json:"resource_type"`
	ResourceID   string          `json:"resource_id"`
	BeforeState  json.RawMessage `json:"before_state,omitempty"`
	AfterState   json.RawMessage `json:"after_state,omitempty"`
	IP           string          `json:"ip"`
	UserAgent    string          `json:"user_agent"`
	RequestID    string          `json:"request_id"`
	SessionID    string          `json:"session_id"`
	DurationMs   int             `json:"duration_ms"`
}

// DBAuditWriter writes audit entries to PostgreSQL.
type DBAuditWriter struct {
	db *database.DB
}

// NewDBAuditWriter creates a new DBAuditWriter backed by the given database.
func NewDBAuditWriter(db *database.DB) *DBAuditWriter {
	return &DBAuditWriter{db: db}
}

// WriteAuditLog persists an audit entry to the audit_log table.
func (w *DBAuditWriter) WriteAuditLog(ctx context.Context, entry *AuditEntry) error {
	_, err := w.db.Pool.Exec(ctx,
		`INSERT INTO audit_log
            (tenant_id, user_id, action, resource_type, resource_id,
             before_state, after_state, ip, user_agent, request_id, session_id, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		nilIfEmpty(entry.TenantID), nilIfEmpty(entry.UserID),
		entry.Action, entry.ResourceType, nilIfEmpty(entry.ResourceID),
		nullJSON(entry.BeforeState), nullJSON(entry.AfterState),
		nilIfEmpty(entry.IP), nilIfEmpty(entry.UserAgent),
		nilIfEmpty(entry.RequestID), nilIfEmpty(entry.SessionID),
		entry.DurationMs,
	)
	return err
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func nullJSON(data json.RawMessage) interface{} {
	if len(data) == 0 {
		return nil
	}
	return data
}

// AuditMiddleware logs CUD operations (POST, PUT, PATCH, DELETE) to the audit log.
func AuditMiddleware(writer AuditWriter, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only audit mutating methods
			if r.Method == http.MethodGet || r.Method == http.MethodOptions || r.Method == http.MethodHead {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			requestID := r.Header.Get("X-Request-ID")
			if requestID == "" {
				requestID = uuid.New().String()
				r.Header.Set("X-Request-ID", requestID)
			}

			// Capture request body for audit
			var bodyBytes []byte
			if r.Body != nil {
				bodyBytes, _ = io.ReadAll(io.LimitReader(r.Body, 64*1024))
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}

			// Wrap response writer to capture status and body
			rw := &responseCapture{ResponseWriter: w, statusCode: 200}
			next.ServeHTTP(rw, r)

			// Determine resource type from path
			resourceType, resourceID := extractResource(r.URL.Path)
			action := methodToAction(r.Method)

			entry := &AuditEntry{
				TenantID:     r.Header.Get("X-Tenant-ID"),
				UserID:       r.Header.Get("X-User-ID"),
				Action:       action,
				ResourceType: resourceType,
				ResourceID:   resourceID,
				AfterState:   bodyBytes,
				IP:           extractIP(r),
				UserAgent:    r.UserAgent(),
				RequestID:    requestID,
				SessionID:    r.Header.Get("X-Session-ID"),
				DurationMs:   int(time.Since(start).Milliseconds()),
			}

			// Write async to not block the response
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()
				if err := writer.WriteAuditLog(ctx, entry); err != nil {
					logger.Error("failed to write audit log", "error", err, "action", action, "resource", resourceType)
				}
			}()
		})
	}
}

type responseCapture struct {
	http.ResponseWriter
	statusCode int
	body       []byte
}

func (rc *responseCapture) WriteHeader(code int) {
	rc.statusCode = code
	rc.ResponseWriter.WriteHeader(code)
}

func (rc *responseCapture) Write(b []byte) (int, error) {
	rc.body = append(rc.body, b...)
	return rc.ResponseWriter.Write(b)
}

func methodToAction(method string) string {
	switch method {
	case http.MethodPost:
		return "create"
	case http.MethodPut, http.MethodPatch:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return method
	}
}

// extractResource parses /api/v1/{resource}/{id} or /api/v1/{resource} patterns.
func extractResource(path string) (resourceType, resourceID string) {
	// Strip /api/v1/ prefix
	parts := strings.Split(strings.TrimPrefix(path, "/api/v1/"), "/")
	if len(parts) >= 1 {
		resourceType = parts[0]
	}
	if len(parts) >= 2 {
		resourceID = parts[1]
	}
	return
}

func extractIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	return host
}
