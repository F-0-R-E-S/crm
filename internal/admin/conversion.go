package admin

import (
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/gambchamp/crm/internal/db/sqlc"
	"github.com/gambchamp/crm/internal/middleware"
)

type ConversionHandler struct {
	DB ConversionQuerier
}

// --- Conversions CRUD ---

func (h *ConversionHandler) ListConversions(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	companyID := middleware.GetCompanyID(c)
	var brokerFilter, affiliateFilter *uuid.UUID
	var statusFilter, typeFilter *string
	var fromFilter, toFilter *time.Time

	if s := c.Query("broker_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			brokerFilter = &id
		}
	}
	if s := c.Query("affiliate_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			affiliateFilter = &id
		}
	}
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}
	if s := c.Query("conversion_type"); s != "" {
		typeFilter = &s
	}
	if s := c.Query("from"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			fromFilter = &t
		}
	}
	if s := c.Query("to"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			toFilter = &t
		}
	}

	conversions, err := h.DB.ListConversions(c.Context(), sqlc.ListConversionsParams{
		CompanyID:      companyID,
		Limit:          int32(perPage),
		Offset:         int32((page - 1) * perPage),
		BrokerID:       brokerFilter,
		AffiliateID:    affiliateFilter,
		Status:         statusFilter,
		ConversionType: typeFilter,
		From:           fromFilter,
		To:             toFilter,
	})
	if err != nil {
		slog.Error("list conversions failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list conversions",
		})
	}

	total, _ := h.DB.CountConversions(c.Context(), sqlc.CountConversionsParams{
		CompanyID:   companyID,
		BrokerID:    brokerFilter,
		AffiliateID: affiliateFilter,
		Status:      statusFilter,
	})

	return c.JSON(fiber.Map{"conversions": conversions, "total": total, "page": page, "per_page": perPage})
}

func (h *ConversionHandler) GetConversion(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid conversion id",
		})
	}
	conv, err := h.DB.GetConversion(c.Context(), sqlc.GetConversionParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "conversion not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch conversion",
		})
	}
	return c.JSON(conv)
}

func (h *ConversionHandler) CreateConversion(c fiber.Ctx) error {
	var req struct {
		LeadID             string          `json:"lead_id"`
		BrokerID           string          `json:"broker_id"`
		AffiliateID        *string         `json:"affiliate_id"`
		ConversionType     string          `json:"conversion_type"`
		Amount             string          `json:"amount"`
		Currency           string          `json:"currency"`
		BrokerTransactionID *string        `json:"broker_transaction_id"`
		ExternalID         *string         `json:"external_id"`
		Metadata           json.RawMessage `json:"metadata"`
		ConvertedAt        *time.Time      `json:"converted_at"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	if req.LeadID == "" || req.BrokerID == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "lead_id and broker_id are required",
		})
	}

	companyID := middleware.GetCompanyID(c)
	leadID, _ := uuid.Parse(req.LeadID)
	brokerID, _ := uuid.Parse(req.BrokerID)

	var affiliateID *uuid.UUID
	if req.AffiliateID != nil {
		if id, err := uuid.Parse(*req.AffiliateID); err == nil {
			affiliateID = &id
		}
	}

	convType := req.ConversionType
	if convType == "" {
		convType = "ftd"
	}
	currency := req.Currency
	if currency == "" {
		currency = "USD"
	}
	meta := req.Metadata
	if meta == nil {
		meta = json.RawMessage(`{}`)
	}
	convertedAt := time.Now()
	if req.ConvertedAt != nil {
		convertedAt = *req.ConvertedAt
	}

	// Dedup by broker_transaction_id
	if req.BrokerTransactionID != nil && *req.BrokerTransactionID != "" {
		existing, err := h.DB.GetConversionByBrokerTxn(c.Context(), sqlc.GetConversionByBrokerTxnParams{
			CompanyID: companyID, BrokerTransactionID: *req.BrokerTransactionID,
		})
		if err == nil {
			return c.JSON(existing)
		}
	}

	// Resolve buy/sell prices
	buyPrice := "0"
	sellPrice := "0"
	if bp, err := h.DB.ResolveBuyPrice(c.Context(), sqlc.ResolveBuyPriceParams{
		CompanyID: companyID, AffiliateID: affiliateID,
	}); err == nil {
		buyPrice = bp
	}
	if sp, err := h.DB.ResolveSellPrice(c.Context(), sqlc.ResolveSellPriceParams{
		CompanyID: companyID, BrokerID: &brokerID,
	}); err == nil {
		sellPrice = sp
	}

	conv, err := h.DB.CreateConversion(c.Context(), sqlc.CreateConversionParams{
		CompanyID:           companyID,
		LeadID:              leadID,
		BrokerID:            brokerID,
		AffiliateID:         affiliateID,
		ConversionType:      convType,
		Amount:              req.Amount,
		Currency:            currency,
		BuyPrice:            buyPrice,
		SellPrice:           sellPrice,
		Status:              "pending",
		BrokerTransactionID: req.BrokerTransactionID,
		ExternalID:          req.ExternalID,
		Metadata:            meta,
		ConvertedAt:         convertedAt,
	})
	if err != nil {
		slog.Error("create conversion failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create conversion",
		})
	}

	// Auto-create/update broker wallet
	h.DB.UpsertBrokerWallet(c.Context(), sqlc.UpsertBrokerWalletParams{
		CompanyID: companyID, BrokerID: brokerID, Currency: currency,
	})

	return c.Status(fiber.StatusCreated).JSON(conv)
}

func (h *ConversionHandler) UpdateConversionStatus(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid conversion id",
		})
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.Bind().JSON(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "status is required",
		})
	}

	conv, err := h.DB.UpdateConversionStatus(c.Context(), sqlc.UpdateConversionStatusParams{
		ID: id, CompanyID: middleware.GetCompanyID(c), Status: req.Status,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "conversion not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update conversion",
		})
	}
	return c.JSON(conv)
}

func (h *ConversionHandler) MarkFake(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid conversion id",
		})
	}

	var req struct {
		Reason string `json:"reason"`
		Action string `json:"action"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.Action == "" {
		req.Action = "fire_postback"
	}

	conv, err := h.DB.MarkConversionFake(c.Context(), sqlc.MarkConversionFakeParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
		FakeReason: &req.Reason, FakeAction: &req.Action,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "conversion not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not mark conversion as fake",
		})
	}
	return c.JSON(conv)
}

// --- P&L Reports ---

func (h *ConversionHandler) GetPLSummary(c fiber.Ctx) error {
	companyID := middleware.GetCompanyID(c)
	var fromFilter, toFilter *time.Time
	if s := c.Query("from"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			fromFilter = &t
		}
	}
	if s := c.Query("to"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			toFilter = &t
		}
	}

	summary, err := h.DB.GetPLSummary(c.Context(), sqlc.GetPLSummaryParams{
		CompanyID: companyID, From: fromFilter, To: toFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not generate P&L summary",
		})
	}
	return c.JSON(fiber.Map{"pl_summary": summary})
}

func (h *ConversionHandler) GetPLByBroker(c fiber.Ctx) error {
	companyID := middleware.GetCompanyID(c)
	var fromFilter, toFilter *time.Time
	if s := c.Query("from"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			fromFilter = &t
		}
	}
	if s := c.Query("to"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			toFilter = &t
		}
	}

	data, err := h.DB.GetPLByBroker(c.Context(), sqlc.GetPLByBrokerParams{
		CompanyID: companyID, From: fromFilter, To: toFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not generate P&L by broker",
		})
	}
	return c.JSON(fiber.Map{"pl_by_broker": data})
}

func (h *ConversionHandler) GetPLByAffiliate(c fiber.Ctx) error {
	companyID := middleware.GetCompanyID(c)
	var fromFilter, toFilter *time.Time
	if s := c.Query("from"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			fromFilter = &t
		}
	}
	if s := c.Query("to"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			toFilter = &t
		}
	}

	data, err := h.DB.GetPLByAffiliate(c.Context(), sqlc.GetPLByAffiliateParams{
		CompanyID: companyID, From: fromFilter, To: toFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not generate P&L by affiliate",
		})
	}
	return c.JSON(fiber.Map{"pl_by_affiliate": data})
}

// --- Pricing Rules ---

func (h *ConversionHandler) ListPricingRules(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	if perPage < 1 || perPage > 100 {
		perPage = 50
	}

	var ruleTypeFilter *string
	if s := c.Query("rule_type"); s != "" {
		ruleTypeFilter = &s
	}

	rules, err := h.DB.ListPricingRules(c.Context(), sqlc.ListPricingRulesParams{
		CompanyID: middleware.GetCompanyID(c),
		Limit:     int32(perPage),
		Offset:    int32((page - 1) * perPage),
		RuleType:  ruleTypeFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list pricing rules",
		})
	}
	return c.JSON(fiber.Map{"pricing_rules": rules, "page": page, "per_page": perPage})
}

func (h *ConversionHandler) CreatePricingRule(c fiber.Ctx) error {
	var req struct {
		RuleType      string     `json:"rule_type"`
		AffiliateID   *uuid.UUID `json:"affiliate_id"`
		BrokerID      *uuid.UUID `json:"broker_id"`
		Country       *string    `json:"country"`
		FunnelName    *string    `json:"funnel_name"`
		DealType      *string    `json:"deal_type"`
		Price         string     `json:"price"`
		Currency      string     `json:"currency"`
		Priority      int32      `json:"priority"`
		EffectiveFrom *time.Time `json:"effective_from"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}
	if req.RuleType == "" || req.Price == "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "rule_type and price are required",
		})
	}
	if req.Currency == "" {
		req.Currency = "USD"
	}
	effectiveFrom := time.Now()
	if req.EffectiveFrom != nil {
		effectiveFrom = *req.EffectiveFrom
	}

	rule, err := h.DB.UpsertPricingRule(c.Context(), sqlc.UpsertPricingRuleParams{
		CompanyID:     middleware.GetCompanyID(c),
		RuleType:      req.RuleType,
		AffiliateID:   req.AffiliateID,
		BrokerID:      req.BrokerID,
		Country:       req.Country,
		FunnelName:    req.FunnelName,
		DealType:      req.DealType,
		Price:         req.Price,
		Currency:      req.Currency,
		Priority:      req.Priority,
		EffectiveFrom: effectiveFrom,
	})
	if err != nil {
		slog.Error("create pricing rule failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create pricing rule",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(rule)
}

func (h *ConversionHandler) DeletePricingRule(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid pricing rule id",
		})
	}
	if err := h.DB.DeletePricingRule(c.Context(), sqlc.DeletePricingRuleParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not delete pricing rule",
		})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// --- Wallets ---

func (h *ConversionHandler) GetBrokerWallet(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("broker_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	wallet, err := h.DB.GetBrokerWallet(c.Context(), sqlc.GetBrokerWalletParams{
		CompanyID: middleware.GetCompanyID(c), BrokerID: brokerID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "wallet not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not fetch wallet",
		})
	}
	return c.JSON(wallet)
}

func (h *ConversionHandler) ListWalletTransactions(c fiber.Ctx) error {
	brokerID, err := uuid.Parse(c.Params("broker_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid broker id",
		})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	companyID := middleware.GetCompanyID(c)
	wallet, err := h.DB.GetBrokerWallet(c.Context(), sqlc.GetBrokerWalletParams{
		CompanyID: companyID, BrokerID: brokerID,
	})
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "NOT_FOUND", "message": "wallet not found",
		})
	}

	txns, err := h.DB.ListWalletTransactions(c.Context(), sqlc.ListWalletTransactionsParams{
		WalletID:  wallet.ID,
		CompanyID: companyID,
		Limit:     int32(perPage),
		Offset:    int32((page - 1) * perPage),
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list transactions",
		})
	}
	return c.JSON(fiber.Map{
		"wallet":       wallet,
		"transactions": txns,
		"page":         page,
		"per_page":     perPage,
	})
}

// --- Payouts ---

func (h *ConversionHandler) ListPayouts(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	var affFilter *uuid.UUID
	var statusFilter *string
	if s := c.Query("affiliate_id"); s != "" {
		if id, err := uuid.Parse(s); err == nil {
			affFilter = &id
		}
	}
	if s := c.Query("status"); s != "" {
		statusFilter = &s
	}

	payouts, err := h.DB.ListAffiliatePayouts(c.Context(), sqlc.ListAffiliatePayoutsParams{
		CompanyID:   middleware.GetCompanyID(c),
		Limit:       int32(perPage),
		Offset:      int32((page - 1) * perPage),
		AffiliateID: affFilter,
		Status:      statusFilter,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not list payouts",
		})
	}
	return c.JSON(fiber.Map{"payouts": payouts, "page": page, "per_page": perPage})
}

func (h *ConversionHandler) CreatePayout(c fiber.Ctx) error {
	var req struct {
		AffiliateID   string  `json:"affiliate_id"`
		Amount        string  `json:"amount"`
		Currency      string  `json:"currency"`
		PaymentMethod *string `json:"payment_method"`
		PeriodFrom    *string `json:"period_from"`
		PeriodTo      *string `json:"period_to"`
		Notes         *string `json:"notes"`
	}
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_BODY", "message": "invalid request body",
		})
	}

	affID, err := uuid.Parse(req.AffiliateID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "valid affiliate_id is required",
		})
	}

	currency := req.Currency
	if currency == "" {
		currency = "USD"
	}

	payout, err := h.DB.CreateAffiliatePayout(c.Context(), sqlc.CreateAffiliatePayoutParams{
		CompanyID:     middleware.GetCompanyID(c),
		AffiliateID:   affID,
		Amount:        req.Amount,
		Currency:      currency,
		PaymentMethod: req.PaymentMethod,
		Status:        "draft",
		Notes:         req.Notes,
	})
	if err != nil {
		slog.Error("create payout failed", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not create payout",
		})
	}
	return c.Status(fiber.StatusCreated).JSON(payout)
}

func (h *ConversionHandler) UpdatePayoutStatus(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid payout id",
		})
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.Bind().JSON(&req); err != nil || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "VALIDATION_ERROR", "message": "status is required",
		})
	}

	var approvedBy *uuid.UUID
	if req.Status == "approved" || req.Status == "paid" {
		userID := middleware.GetUserID(c)
		approvedBy = &userID
	}

	payout, err := h.DB.UpdatePayoutStatus(c.Context(), sqlc.UpdatePayoutStatusParams{
		ID: id, CompanyID: middleware.GetCompanyID(c),
		Status: req.Status, ApprovedBy: approvedBy,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "NOT_FOUND", "message": "payout not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "INTERNAL_ERROR", "message": "could not update payout",
		})
	}
	return c.JSON(payout)
}

func (h *ConversionHandler) GetAffiliateBalance(c fiber.Ctx) error {
	affID, err := uuid.Parse(c.Params("affiliate_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "INVALID_ID", "message": "invalid affiliate id",
		})
	}

	companyID := middleware.GetCompanyID(c)
	accrued, _ := h.DB.GetAffiliateAccruedAmount(c.Context(), sqlc.GetAffiliateAccruedAmountParams{
		CompanyID: companyID, AffiliateID: affID,
	})
	paid, _ := h.DB.GetAffiliatePaidAmount(c.Context(), sqlc.GetAffiliatePaidAmountParams{
		CompanyID: companyID, AffiliateID: affID,
	})

	return c.JSON(fiber.Map{
		"affiliate_id": affID,
		"accrued":      accrued,
		"paid":         paid,
	})
}

func RegisterConversionRoutes(router fiber.Router, h *ConversionHandler) {
	router.Get("/conversions", h.ListConversions)
	router.Post("/conversions", h.CreateConversion)
	router.Get("/conversions/:id", h.GetConversion)
	router.Patch("/conversions/:id/status", h.UpdateConversionStatus)
	router.Post("/conversions/:id/fake", h.MarkFake)

	router.Get("/pl/summary", h.GetPLSummary)
	router.Get("/pl/by-broker", h.GetPLByBroker)
	router.Get("/pl/by-affiliate", h.GetPLByAffiliate)

	router.Get("/pricing-rules", h.ListPricingRules)
	router.Post("/pricing-rules", h.CreatePricingRule)
	router.Delete("/pricing-rules/:id", h.DeletePricingRule)

	router.Get("/wallets/:broker_id", h.GetBrokerWallet)
	router.Get("/wallets/:broker_id/transactions", h.ListWalletTransactions)

	router.Get("/payouts", h.ListPayouts)
	router.Post("/payouts", h.CreatePayout)
	router.Patch("/payouts/:id/status", h.UpdatePayoutStatus)
	router.Get("/affiliates/:affiliate_id/balance", h.GetAffiliateBalance)
}
