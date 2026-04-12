package main

import (
	"log/slog"
	"sync"
)

type SSEChannel struct {
	Events chan SSEEvent
	Done   chan struct{}
}

type SSEEvent struct {
	Event string `json:"event"`
	Data  string `json:"data"`
}

type SessionManager struct {
	mu       sync.RWMutex
	sessions map[string]map[string]*SSEChannel // tenant_id -> session_id -> channel
	logger   *slog.Logger
}

func NewSessionManager(logger *slog.Logger) *SessionManager {
	return &SessionManager{
		sessions: make(map[string]map[string]*SSEChannel),
		logger:   logger,
	}
}

func (sm *SessionManager) Register(tenantID, sessionID string) *SSEChannel {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	ch := &SSEChannel{
		Events: make(chan SSEEvent, 100),
		Done:   make(chan struct{}),
	}

	if sm.sessions[tenantID] == nil {
		sm.sessions[tenantID] = make(map[string]*SSEChannel)
	}
	sm.sessions[tenantID][sessionID] = ch
	return ch
}

func (sm *SessionManager) Unregister(tenantID, sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if tenant, ok := sm.sessions[tenantID]; ok {
		if ch, ok := tenant[sessionID]; ok {
			close(ch.Done)
			delete(tenant, sessionID)
		}
		if len(tenant) == 0 {
			delete(sm.sessions, tenantID)
		}
	}
}

func (sm *SessionManager) PushEvent(tenantID string, event SSEEvent) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	tenant, ok := sm.sessions[tenantID]
	if !ok {
		return
	}

	for _, ch := range tenant {
		select {
		case ch.Events <- event:
		default:
			sm.logger.Warn("SSE channel full, dropping event", "tenant_id", tenantID)
		}
	}
}

func (sm *SessionManager) PushToSession(tenantID, sessionID string, event SSEEvent) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if tenant, ok := sm.sessions[tenantID]; ok {
		if ch, ok := tenant[sessionID]; ok {
			select {
			case ch.Events <- event:
			default:
			}
		}
	}
}

func (sm *SessionManager) CloseAll() {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	for tenantID, tenant := range sm.sessions {
		for sessionID, ch := range tenant {
			close(ch.Done)
			delete(tenant, sessionID)
		}
		delete(sm.sessions, tenantID)
	}
}
