package main

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/middleware"
)

// Handler is the main HTTP handler that routes requests, applies auth, rate limiting, and CORS.
type Handler struct {
	logger        *slog.Logger
	cfg           Config
	auth          *Authenticator
	redis         *cache.Redis
	jwtLimiter    *middleware.RateLimiter // 120 req/min for JWT-authenticated users
	apiKeyLimiter *middleware.RateLimiter // 60 req/min for API key users
}

// NewHandler creates a Handler with the given config and authenticator.
func NewHandler(logger *slog.Logger, cfg Config, auth *Authenticator, redis *cache.Redis) *Handler {
	return &Handler{
		logger:        logger,
		cfg:           cfg,
		auth:          auth,
		redis:         redis,
		jwtLimiter:    middleware.NewRateLimiter(redis, 120, time.Minute),
		apiKeyLimiter: middleware.NewRateLimiter(redis, 60, time.Minute),
	}
}

// Register attaches all routes to the given mux.
func (h *Handler) Register(mux *http.ServeMux) {
	// Auth endpoints — NO authentication required (login, register, etc.)
	mux.Handle("/api/v1/auth/", h.cors(h.proxyTo(h.cfg.IdentityAddr)))

	// Postback/webhook endpoints — NO authentication required (broker callbacks)
	mux.Handle("/api/v1/postback/", h.cors(h.proxyTo(h.cfg.StatusSyncAddr)))

	// Lead intake — auth required
	mux.Handle("/api/v1/leads", h.cors(h.requireAuth(h.proxyTo(h.cfg.LeadIntakeAddr))))
	mux.Handle("/api/v1/leads/", h.cors(h.requireAuth(h.proxyTo(h.cfg.LeadIntakeAddr))))

	// Analytics — auth required
	mux.Handle("/api/v1/analytics/", h.cors(h.requireAuth(h.proxyTo(h.cfg.AnalyticsAddr))))

	// Notifications — auth required
	mux.Handle("/api/v1/notifications", h.cors(h.requireAuth(h.proxyTo(h.cfg.NotificationAddr))))
	mux.Handle("/api/v1/notifications/", h.cors(h.requireAuth(h.proxyTo(h.cfg.NotificationAddr))))

	// Fraud engine — auth required
	mux.Handle("/api/v1/fraud/", h.cors(h.requireAuth(h.proxyTo(h.cfg.FraudEngineAddr))))

	// Status groups & analytics — auth required
	mux.Handle("/api/v1/status-groups/", h.cors(h.requireAuth(h.proxyTo(h.cfg.StatusSyncAddr))))
	mux.Handle("/api/v1/status-groups", h.cors(h.requireAuth(h.proxyTo(h.cfg.StatusSyncAddr))))
	mux.Handle("/api/v1/status-analytics/", h.cors(h.requireAuth(h.proxyTo(h.cfg.StatusSyncAddr))))
	mux.Handle("/api/v1/shave-detection/", h.cors(h.requireAuth(h.proxyTo(h.cfg.StatusSyncAddr))))

	// Compliance & security — auth required
	mux.Handle("/api/v1/compliance/", h.cors(h.requireAuth(h.proxyTo(h.cfg.IdentityAddr))))
	mux.Handle("/api/v1/security/", h.cors(h.requireAuth(h.proxyTo(h.cfg.IdentityAddr))))

	// AI Assistant — auth required, SSE needs streaming support
	mux.Handle("/api/v1/assistant/", h.cors(h.requireAuth(h.proxyTo(h.cfg.AssistantAddr))))

	// Internal endpoints — blocked from external access
	mux.Handle("/internal/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errors.ErrForbidden.WriteJSON(w)
	}))
}

// cors wraps a handler with CORS headers.
func (h *Handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := h.cfg.CORSAllowOrigins
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key, X-Request-ID")
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID, X-RateLimit-Remaining")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// requireAuth is middleware that validates JWT or API key, sets identity headers,
// and applies rate limiting.
func (h *Handler) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var info *AuthInfo
		var authMethod string // "jwt" or "apikey"

		// 1. Check Authorization: Bearer <jwt>
		if authHeader := r.Header.Get("Authorization"); authHeader != "" {
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
				ai, err := h.auth.ValidateJWT(tokenStr)
				if err != nil {
					h.logger.Warn("jwt validation failed", "error", err, "path", r.URL.Path)
					errors.ErrUnauthorized.WriteJSON(w)
					return
				}
				info = ai
				authMethod = "jwt"
			}
		}

		// 2. If no Bearer token, check X-API-Key header
		if info == nil {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				errors.ErrUnauthorized.WriteJSON(w)
				return
			}
			ai, err := h.auth.ValidateAPIKey(r.Context(), apiKey)
			if err != nil {
				h.logger.Warn("api key validation failed", "error", err, "path", r.URL.Path)
				errors.ErrUnauthorized.WriteJSON(w)
				return
			}
			info = ai
			authMethod = "apikey"
		}

		// 3. Rate limiting based on auth method
		var rateLimitKey string
		var limiter *middleware.RateLimiter
		switch authMethod {
		case "jwt":
			rateLimitKey = "jwt:" + info.UserID
			limiter = h.jwtLimiter
		case "apikey":
			rateLimitKey = "apikey:" + r.Header.Get("X-API-Key")
			limiter = h.apiKeyLimiter
		}

		if !limiter.Allow(r.Context(), rateLimitKey) {
			h.logger.Warn("rate limit exceeded", "key", rateLimitKey, "path", r.URL.Path)
			errors.ErrRateLimit.WriteJSON(w)
			return
		}

		// 4. Set identity headers for upstream services
		r.Header.Set("X-Tenant-ID", info.TenantID)
		r.Header.Set("X-User-ID", info.UserID)
		r.Header.Set("X-Role", info.Role)

		next.ServeHTTP(w, r)
	})
}

// proxyTo creates a reverse proxy handler for the given upstream address.
func (h *Handler) proxyTo(target string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		h.logger.Error("invalid upstream URL", "target", target, "error", err)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
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
