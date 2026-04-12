package main

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"

	"github.com/gambchamp/crm/pkg/events"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/gambchamp/crm/pkg/models"
)

type PostbackHandler struct {
	store  *Store
	nc     *messaging.NATSClient
	logger *slog.Logger
}

func NewPostbackHandler(store *Store, nc *messaging.NATSClient, logger *slog.Logger) *PostbackHandler {
	return &PostbackHandler{store: store, nc: nc, logger: logger}
}

func (ph *PostbackHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/postback/{broker_id}", ph.HandlePostback)
	mux.HandleFunc("GET /api/v1/postback/{broker_id}", ph.HandlePostback)
}

func (ph *PostbackHandler) HandlePostback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	brokerID := r.PathValue("broker_id")
	if brokerID == "" {
		http.Error(w, `{"error":"broker_id required"}`, http.StatusBadRequest)
		return
	}

	sourceIP, _, _ := net.SplitHostPort(r.RemoteAddr)

	// Read raw body for POST, or use query params for GET
	var rawPayload json.RawMessage
	if r.Method == "POST" {
		body, err := io.ReadAll(io.LimitReader(r.Body, 64*1024))
		if err != nil {
			http.Error(w, `{"error":"read body failed"}`, http.StatusBadRequest)
			return
		}
		if json.Valid(body) {
			rawPayload = body
		} else {
			wrapped, _ := json.Marshal(map[string]string{"raw": string(body)})
			rawPayload = wrapped
		}
	} else {
		params := make(map[string]string)
		for k, v := range r.URL.Query() {
			if len(v) > 0 {
				params[k] = v[0]
			}
		}
		rawPayload, _ = json.Marshal(params)
	}

	bwt, err := ph.store.GetBroker(ctx, brokerID)
	if err != nil || bwt == nil {
		ph.logger.Warn("postback for unknown broker", "broker_id", brokerID)
		http.Error(w, `{"error":"broker not found"}`, http.StatusNotFound)
		return
	}

	cfg, err := ph.store.GetBrokerPostbackConfig(ctx, brokerID)
	if err != nil || cfg == nil || !cfg.IsEnabled {
		ph.logger.Warn("postback not configured", "broker_id", brokerID)
		http.Error(w, `{"error":"postback not configured"}`, http.StatusNotFound)
		return
	}

	logEntry := &PostbackLogEntry{
		TenantID:         bwt.Broker.TenantID,
		BrokerID:         brokerID,
		RawPayload:       rawPayload,
		SourceIP:         sourceIP,
		ProcessingResult: "pending",
	}

	// Verify request
	verResult := "skipped"
	if cfg.VerificationType == "hmac" {
		verResult = ph.verifyHMAC(r, rawPayload, cfg)
	} else if cfg.VerificationType == "ip_whitelist" {
		verResult = ph.verifyIP(sourceIP, cfg.AllowedIPs)
	}
	logEntry.VerificationResult = verResult

	if verResult == "failed" {
		logEntry.ProcessingResult = "failed"
		logEntry.Error = "verification failed"
		ph.store.LogPostback(ctx, logEntry)
		http.Error(w, `{"error":"verification failed"}`, http.StatusForbidden)
		return
	}

	// Parse payload to extract status and lead info
	var payload map[string]interface{}
	json.Unmarshal(rawPayload, &payload)

	parsedStatus := extractString(payload, "status")
	leadID := extractString(payload, "lead_id")
	brokerLeadID := extractString(payload, "broker_lead_id")
	logEntry.ParsedStatus = parsedStatus
	logEntry.LeadID = leadID

	// Map broker status to our status
	mappedStatus := ph.mapStatus(parsedStatus, cfg.StatusMapping)
	logEntry.MappedStatus = mappedStatus

	// Try to find lead by lead_id or broker_lead_id
	if leadID == "" && brokerLeadID != "" {
		// TODO: lookup lead by broker_lead_id from lead_events
		ph.logger.Info("postback with broker_lead_id only", "broker_lead_id", brokerLeadID)
	}

	// Update lead status if we have a lead_id and mapped status
	if leadID != "" && mappedStatus != "" {
		leadStatus := models.LeadStatus(mappedStatus)
		if err := ph.store.UpdateLeadStatus(ctx, leadID, leadStatus); err != nil {
			ph.logger.Error("failed to update lead status from postback",
				"lead_id", leadID, "status", mappedStatus, "error", err)
			logEntry.Error = "lead status update failed: " + err.Error()
		}
	}

	logEntry.ProcessingResult = "processed"
	ph.store.LogPostback(ctx, logEntry)

	// Publish event
	if ph.nc != nil {
		ph.nc.Publish(ctx, events.LeadStatusUpdated, "broker-adapter-svc", map[string]interface{}{
			"lead_id":        leadID,
			"broker_id":      brokerID,
			"tenant_id":      bwt.Broker.TenantID,
			"status":         mappedStatus,
			"source":         "postback",
			"broker_lead_id": brokerLeadID,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func (ph *PostbackHandler) verifyHMAC(r *http.Request, body []byte, cfg *PostbackConfig) string {
	if cfg.HMACSecret == nil || *cfg.HMACSecret == "" {
		return "skipped"
	}

	headerName := "X-Signature"
	if cfg.HMACHeader != nil && *cfg.HMACHeader != "" {
		headerName = *cfg.HMACHeader
	}

	signature := r.Header.Get(headerName)
	if signature == "" {
		return "failed"
	}

	var h func() hash.Hash
	algo := "sha256"
	if cfg.HMACAlgorithm != nil {
		algo = *cfg.HMACAlgorithm
	}
	switch algo {
	case "sha512":
		h = sha512.New
	case "md5":
		h = md5.New
	default:
		h = sha256.New
	}

	mac := hmac.New(h, []byte(*cfg.HMACSecret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	if hmac.Equal([]byte(signature), []byte(expected)) {
		return "passed"
	}
	return "failed"
}

func (ph *PostbackHandler) verifyIP(sourceIP string, allowedIPs []string) string {
	if len(allowedIPs) == 0 {
		return "skipped"
	}
	for _, allowed := range allowedIPs {
		if strings.Contains(allowed, "/") {
			_, network, err := net.ParseCIDR(allowed)
			if err == nil && network.Contains(net.ParseIP(sourceIP)) {
				return "passed"
			}
		} else if allowed == sourceIP {
			return "passed"
		}
	}
	return "failed"
}

func (ph *PostbackHandler) mapStatus(brokerStatus string, statusMapping json.RawMessage) string {
	if len(statusMapping) == 0 || brokerStatus == "" {
		return brokerStatus
	}

	var mapping map[string]string
	if err := json.Unmarshal(statusMapping, &mapping); err != nil {
		return brokerStatus
	}

	if mapped, ok := mapping[brokerStatus]; ok {
		return mapped
	}
	if mapped, ok := mapping[strings.ToLower(brokerStatus)]; ok {
		return mapped
	}
	return brokerStatus
}

func (ph *PostbackHandler) SubstituteVariables(template string, lead *models.Lead, brokerID string, extra map[string]string) string {
	replacements := map[string]string{
		"lead_id":       lead.ID,
		"status":        string(lead.Status),
		"affiliate_id":  lead.AffiliateID,
		"country":       lead.Country,
		"funnel_name":   lead.FunnelName,
		"ip":            lead.IP,
		"email_masked":  maskEmail(lead.Email),
		"phone_masked":  maskPhone(lead.PhoneE164),
		"broker_id":     brokerID,
		"aff_sub1":      lead.AffSub1,
		"aff_sub2":      lead.AffSub2,
		"aff_sub3":      lead.AffSub3,
		"aff_sub4":      lead.AffSub4,
		"aff_sub5":      lead.AffSub5,
		"aff_sub6":      lead.AffSub6,
		"aff_sub7":      lead.AffSub7,
		"aff_sub8":      lead.AffSub8,
		"aff_sub9":      lead.AffSub9,
		"aff_sub10":     lead.AffSub10,
		"created_at":    lead.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	for k, v := range extra {
		replacements[k] = v
	}

	result := template
	for k, v := range replacements {
		result = strings.ReplaceAll(result, "{{"+k+"}}", v)
	}
	return result
}

func extractString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		return fmt.Sprintf("%v", v)
	}
	return ""
}

func maskEmail(email string) string {
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		return "***"
	}
	name := parts[0]
	if len(name) <= 2 {
		return name + "***@" + parts[1]
	}
	return name[:2] + "***@" + parts[1]
}

func maskPhone(phone string) string {
	if len(phone) <= 4 {
		return "***"
	}
	return phone[:3] + "****" + phone[len(phone)-2:]
}
