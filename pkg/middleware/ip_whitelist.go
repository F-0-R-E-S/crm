package middleware

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/errors"
)

// IPWhitelist restricts access based on allowed IP ranges per tenant.
type IPWhitelist struct {
	db        *database.DB
	logger    *slog.Logger
	mu        sync.RWMutex
	allowList map[string][]*net.IPNet // tenantID -> allowed networks
	lastLoad  time.Time
	cacheTTL  time.Duration
}

// NewIPWhitelist creates a new IP whitelist checker backed by the database.
func NewIPWhitelist(db *database.DB, logger *slog.Logger) *IPWhitelist {
	return &IPWhitelist{
		db:        db,
		logger:    logger,
		allowList: make(map[string][]*net.IPNet),
		cacheTTL:  60 * time.Second,
	}
}

// Middleware returns an HTTP middleware that checks the client IP against
// the tenant's whitelist. If the tenant has no whitelist entries, all IPs
// are allowed.
func (iw *IPWhitelist) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := r.Header.Get("X-Tenant-ID")
			if tenantID == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Refresh cache if stale
			if time.Since(iw.lastLoad) > iw.cacheTTL {
				go iw.loadAll(context.Background())
			}

			iw.mu.RLock()
			networks, hasEntries := iw.allowList[tenantID]
			iw.mu.RUnlock()

			if !hasEntries || len(networks) == 0 {
				next.ServeHTTP(w, r)
				return
			}

			clientIP := extractIP(r)
			ip := net.ParseIP(clientIP)
			if ip == nil {
				next.ServeHTTP(w, r)
				return
			}

			allowed := false
			for _, n := range networks {
				if n.Contains(ip) {
					allowed = true
					break
				}
			}

			if !allowed {
				iw.logger.Warn("ip not whitelisted", "ip", clientIP, "tenant_id", tenantID)
				errors.NewForbiddenError("IP address not in whitelist").WriteJSON(w)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func (iw *IPWhitelist) loadAll(ctx context.Context) {
	rows, err := iw.db.Pool.Query(ctx,
		`SELECT tenant_id, ip_range FROM ip_whitelist WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())`)
	if err != nil {
		iw.logger.Error("failed to load ip whitelist", "error", err)
		return
	}
	defer rows.Close()

	newList := make(map[string][]*net.IPNet)
	for rows.Next() {
		var tenantID, ipRange string
		if err := rows.Scan(&tenantID, &ipRange); err != nil {
			continue
		}
		_, network, err := net.ParseCIDR(ipRange)
		if err != nil {
			continue
		}
		newList[tenantID] = append(newList[tenantID], network)
	}

	iw.mu.Lock()
	iw.allowList = newList
	iw.lastLoad = time.Now()
	iw.mu.Unlock()
}
