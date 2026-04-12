package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
)

type Handler struct {
	logger *slog.Logger
	store  *Store
}

func NewHandler(logger *slog.Logger, store *Store) *Handler {
	return &Handler{logger: logger, store: store}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/notifications", h.ListNotifications)
	mux.HandleFunc("POST /api/v1/notifications/{id}/read", h.MarkRead)
	mux.HandleFunc("POST /api/v1/notifications/read-all", h.MarkAllRead)
	mux.HandleFunc("GET /api/v1/notifications/preferences", h.GetPreferences)
	mux.HandleFunc("PUT /api/v1/notifications/preferences", h.UpdatePreferences)
	mux.HandleFunc("GET /api/v1/notifications/event-types", h.ListEventTypes)
}

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	if tenantID == "" || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	limit := parseIntQuery(r, "limit", 50)
	offset := parseIntQuery(r, "offset", 0)

	nots, total, err := h.store.ListNotifications(r.Context(), tenantID, userID, limit, offset)
	if err != nil {
		h.logger.Error("list notifications", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if nots == nil {
		nots = []NotificationRecord{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data":       nots,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	id := r.PathValue("id")
	if tenantID == "" || id == "" {
		writeError(w, http.StatusBadRequest, "missing parameters")
		return
	}

	if err := h.store.MarkRead(r.Context(), tenantID, id); err != nil {
		h.logger.Error("mark read", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "marked as read"})
}

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	if tenantID == "" || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	if err := h.store.MarkAllRead(r.Context(), tenantID, userID); err != nil {
		h.logger.Error("mark all read", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "all marked as read"})
}

func (h *Handler) GetPreferences(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	if tenantID == "" || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	prefs, err := h.store.GetPreferences(r.Context(), tenantID, userID)
	if err != nil {
		h.logger.Error("get preferences", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if prefs == nil {
		prefs = &NotificationPrefs{
			TenantID:     tenantID,
			UserID:       userID,
			EmailEnabled: true,
		}
	}
	writeJSON(w, http.StatusOK, prefs)
}

func (h *Handler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	userID := r.Header.Get("X-User-ID")
	if tenantID == "" || userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var prefs NotificationPrefs
	if err := json.NewDecoder(r.Body).Decode(&prefs); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	prefs.TenantID = tenantID
	prefs.UserID = userID

	if err := h.store.UpsertPreferences(r.Context(), &prefs); err != nil {
		h.logger.Error("update preferences", "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "preferences updated"})
}

func (h *Handler) ListEventTypes(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"event_types": AllEventTypes,
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func parseIntQuery(r *http.Request, key string, def int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 0 {
		return def
	}
	return n
}
