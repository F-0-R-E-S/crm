package main

import (
	"encoding/json"
	"log/slog"
	"net/http"

	apperrors "github.com/gambchamp/crm/pkg/errors"
)

type Handler struct {
	logger    *slog.Logger
	optimizer *Optimizer
}

func NewHandler(logger *slog.Logger, optimizer *Optimizer) *Handler {
	return &Handler{logger: logger, optimizer: optimizer}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/smart-routing/recommendations", h.GetRecommendations)
	mux.HandleFunc("GET /api/v1/smart-routing/cap-predictions", h.GetCapPredictions)
	mux.HandleFunc("POST /api/v1/smart-routing/analyze", h.RunAnalysis)
}

// GET /api/v1/smart-routing/recommendations
func (h *Handler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	// Try cache first
	cached, err := h.optimizer.redis.Get(r.Context(), "smart:weights:"+tenantID)
	if err == nil && cached != "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"recommendations":` + cached + `,"source":"cache"}`))
		return
	}

	recs, err := h.optimizer.GenerateWeightRecommendations(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("generate recommendations failed", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if recs == nil {
		recs = []WeightRecommendation{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"recommendations": recs,
		"source":          "live",
	})
}

// GET /api/v1/smart-routing/cap-predictions
func (h *Handler) GetCapPredictions(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	cached, err := h.optimizer.redis.Get(r.Context(), "smart:caps:"+tenantID)
	if err == nil && cached != "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"predictions":` + cached + `,"source":"cache"}`))
		return
	}

	preds, err := h.optimizer.PredictCapExhaustion(r.Context(), tenantID)
	if err != nil {
		h.logger.Error("predict cap exhaustion failed", "error", err)
		apperrors.ErrInternal.WriteJSON(w)
		return
	}
	if preds == nil {
		preds = []CapPrediction{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"predictions": preds,
		"source":      "live",
	})
}

// POST /api/v1/smart-routing/analyze — triggers immediate analysis
func (h *Handler) RunAnalysis(w http.ResponseWriter, r *http.Request) {
	tenantID := r.Header.Get("X-Tenant-ID")
	if tenantID == "" {
		apperrors.NewBadRequest("X-Tenant-ID header is required").WriteJSON(w)
		return
	}

	recs, recErr := h.optimizer.GenerateWeightRecommendations(r.Context(), tenantID)
	preds, predErr := h.optimizer.PredictCapExhaustion(r.Context(), tenantID)

	if recErr != nil && predErr != nil {
		apperrors.ErrInternal.WriteJSON(w)
		return
	}

	if recs == nil { recs = []WeightRecommendation{} }
	if preds == nil { preds = []CapPrediction{} }

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"recommendations": recs,
		"predictions":     preds,
		"analyzed_at":     "now",
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
