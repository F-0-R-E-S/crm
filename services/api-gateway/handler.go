package main

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
)

type Handler struct {
	logger *slog.Logger
	cfg    Config
}

func NewHandler(logger *slog.Logger, cfg Config) *Handler {
	return &Handler{logger: logger, cfg: cfg}
}

func (h *Handler) Register(mux *http.ServeMux) {
	// Lead intake routes
	mux.Handle("/api/v1/leads", h.proxyTo(h.cfg.LeadIntakeAddr))
	mux.Handle("/api/v1/leads/", h.proxyTo(h.cfg.LeadIntakeAddr))

	// Status/postback routes
	mux.Handle("/api/v1/postback/", h.proxyTo(h.cfg.StatusSyncAddr))

	// Auth/identity routes
	mux.Handle("/api/v1/auth/", h.proxyTo(h.cfg.IdentityAddr))

	// Notification routes
	mux.Handle("/api/v1/notifications", h.proxyTo(h.cfg.NotificationAddr))
	mux.Handle("/api/v1/notifications/", h.proxyTo(h.cfg.NotificationAddr))

	// Analytics routes
	mux.Handle("/api/v1/analytics/", h.proxyTo(h.cfg.AnalyticsAddr))
}

func (h *Handler) proxyTo(target string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		h.logger.Error("invalid upstream URL", "target", target, "error", err)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, `{"error":"bad gateway"}`, http.StatusBadGateway)
		})
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	originalDirector := proxy.Director
	proxy.Director = func(r *http.Request) {
		originalDirector(r)
		r.Host = targetURL.Host
		h.logger.Debug("proxying request",
			"method", r.Method,
			"path", r.URL.Path,
			"upstream", target,
		)
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		h.logger.Error("proxy error",
			"method", r.Method,
			"path", r.URL.Path,
			"upstream", target,
			"error", err,
		)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error":"upstream service unavailable"}`))
	}

	return proxy
}
