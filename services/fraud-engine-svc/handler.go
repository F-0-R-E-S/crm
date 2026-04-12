package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gambchamp/crm/pkg/errors"
	"github.com/gambchamp/crm/pkg/models"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) *Handler {
	return &Handler{logger: logger}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.Handle("POST /internal/check", http.HandlerFunc(h.CheckFraud))
}

type FraudCheckRequest struct {
	LeadID    string `json:"lead_id"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	IP        string `json:"ip"`
	Country   string `json:"country"`
	UserAgent string `json:"user_agent"`
}

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

	h.logger.Info("fraud check requested", "lead_id", req.LeadID, "ip", req.IP)

	// TODO: run IP geolocation (MaxMind), phone validation (Twilio), email risk (IPQS), etc.
	card := models.FraudVerificationCard{
		LeadID:       req.LeadID,
		OverallScore: 85,
		Verdict:      "pass",
		Checks: []models.FraudCheck{
			{
				Category:    "ip",
				CheckName:   "geo_match",
				Score:       20,
				MaxScore:    25,
				Result:      "pass",
				Explanation: "IP country matches declared country",
				Provider:    "maxmind",
			},
			{
				Category:    "email",
				CheckName:   "disposable_check",
				Score:       25,
				MaxScore:    25,
				Result:      "pass",
				Explanation: "Email domain is not disposable",
				Provider:    "ipqs",
			},
			{
				Category:    "phone",
				CheckName:   "carrier_lookup",
				Score:       20,
				MaxScore:    25,
				Result:      "pass",
				Explanation: "Phone number is a mobile carrier",
				Provider:    "twilio",
			},
			{
				Category:    "velocity",
				CheckName:   "duplicate_check",
				Score:       20,
				MaxScore:    25,
				Result:      "pass",
				Explanation: "No duplicates found in 24h window",
			},
		},
		CheckedAt: time.Now().UTC(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(card)
}
