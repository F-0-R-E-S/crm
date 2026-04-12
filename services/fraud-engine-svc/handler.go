package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/gambchamp/crm/pkg/errors"
)

// Handler handles HTTP requests for the fraud engine service.
type Handler struct {
	logger  *slog.Logger
	checker *FraudChecker
	store   *Store
}

// NewHandler creates a new fraud engine handler.
func NewHandler(logger *slog.Logger, checker *FraudChecker, store *Store) *Handler {
	return &Handler{
		logger:  logger,
		checker: checker,
		store:   store,
	}
}

// Register registers HTTP routes on the given mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/check", http.HandlerFunc(h.CheckFraud))
}

// FraudCheckRequest is the JSON body for the POST /internal/check endpoint.
type FraudCheckRequest struct {
	LeadID      string `json:"lead_id"`
	TenantID    string `json:"tenant_id"`
	AffiliateID string `json:"affiliate_id"`
	IP          string `json:"ip"`
	Email       string `json:"email"`
	PhoneE164   string `json:"phone_e164"`
	Country     string `json:"country"`
}

// CheckFraud handles the POST /internal/check endpoint.
// It loads the affiliate's fraud profile, runs all configured checks,
// and returns a FraudVerificationCard.
func (h *Handler) CheckFraud(w http.ResponseWriter, r *http.Request) {
	var req FraudCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errors.NewBadRequest("invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	if req.LeadID == "" {
		errors.NewValidationError("lead_id is required").WriteJSON(w)
		return
	}
	if req.TenantID == "" {
		errors.NewValidationError("tenant_id is required").WriteJSON(w)
		return
	}

	h.logger.Info("fraud check requested",
		"lead_id", req.LeadID,
		"tenant_id", req.TenantID,
		"affiliate_id", req.AffiliateID,
		"ip", req.IP,
	)

	// Load affiliate-specific fraud profile (returns defaults if not found)
	profile, err := h.store.GetFraudProfile(r.Context(), req.TenantID, req.AffiliateID)
	if err != nil {
		h.logger.Error("failed to load fraud profile", "error", err)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// Build the check request
	checkReq := &CheckRequest{
		LeadID:      req.LeadID,
		TenantID:    req.TenantID,
		AffiliateID: req.AffiliateID,
		IP:          req.IP,
		Email:       req.Email,
		PhoneE164:   req.PhoneE164,
		Country:     req.Country,
	}

	// Run fraud checks
	card, err := h.checker.CheckLead(r.Context(), checkReq)
	if err != nil {
		h.logger.Error("fraud check failed", "error", err, "lead_id", req.LeadID)
		errors.ErrInternal.WriteJSON(w)
		return
	}

	// Apply affiliate profile overrides to the verdict
	if card.OverallScore <= profile.AutoRejectScore {
		card.Verdict = "rejected"
	} else if card.OverallScore < profile.MinQualityScore && card.Verdict == "approved" {
		card.Verdict = "review"
	}

	h.logger.Info("fraud check completed",
		"lead_id", req.LeadID,
		"score", card.OverallScore,
		"verdict", card.Verdict,
		"profile_min_score", profile.MinQualityScore,
		"profile_auto_reject", profile.AutoRejectScore,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(card)
}
