package admin

import (
	"context"

	"github.com/google/uuid"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

type BrokerQuerier interface {
	ListBrokers(ctx context.Context, arg sqlc.ListBrokersParams) ([]sqlc.Broker, error)
	CountBrokers(ctx context.Context, arg sqlc.CountBrokersParams) (int64, error)
	CreateBroker(ctx context.Context, arg sqlc.CreateBrokerParams) (sqlc.Broker, error)
	GetBroker(ctx context.Context, arg sqlc.GetBrokerParams) (sqlc.Broker, error)
	UpdateBroker(ctx context.Context, arg sqlc.UpdateBrokerParams) (sqlc.Broker, error)
	DeleteBroker(ctx context.Context, arg sqlc.DeleteBrokerParams) error
	CloneBroker(ctx context.Context, arg sqlc.CloneBrokerParams) (sqlc.Broker, error)
	UpdateBrokerCircuitState(ctx context.Context, arg sqlc.UpdateBrokerCircuitStateParams) error
	UpdateBrokerHealth(ctx context.Context, arg sqlc.UpdateBrokerHealthParams) error
	GetBrokersByHealth(ctx context.Context, arg sqlc.GetBrokersByHealthParams) ([]sqlc.Broker, error)
	SetBrokerMaintenanceMode(ctx context.Context, arg sqlc.SetBrokerMaintenanceModeParams) error
	GetBrokerCapUsageToday(ctx context.Context, arg sqlc.GetBrokerCapUsageTodayParams) (int64, error)
}

type BrokerConfigQuerier interface {
	GetBrokerOpeningHours(ctx context.Context, arg sqlc.GetBrokerOpeningHoursParams) ([]sqlc.BrokerOpeningHour, error)
	UpsertBrokerOpeningHours(ctx context.Context, arg sqlc.UpsertBrokerOpeningHoursParams) (sqlc.BrokerOpeningHour, error)
	DeleteBrokerOpeningHours(ctx context.Context, arg sqlc.DeleteBrokerOpeningHoursParams) error
	ListFunnelMappings(ctx context.Context, arg sqlc.ListFunnelMappingsParams) ([]sqlc.BrokerFunnelMapping, error)
	UpsertFunnelMapping(ctx context.Context, arg sqlc.UpsertFunnelMappingParams) (sqlc.BrokerFunnelMapping, error)
	DeleteFunnelMapping(ctx context.Context, arg sqlc.DeleteFunnelMappingParams) error
	GetPostbackConfig(ctx context.Context, arg sqlc.GetPostbackConfigParams) (sqlc.BrokerPostbackConfig, error)
	UpsertPostbackConfig(ctx context.Context, arg sqlc.UpsertPostbackConfigParams) (sqlc.BrokerPostbackConfig, error)
	CreatePostbackLog(ctx context.Context, arg sqlc.CreatePostbackLogParams) (sqlc.BrokerPostbackLog, error)
	ListPostbackLog(ctx context.Context, arg sqlc.ListPostbackLogParams) ([]sqlc.BrokerPostbackLog, error)
}

type BrokerTemplateQuerier interface {
	ListBrokerTemplates(ctx context.Context, arg sqlc.ListBrokerTemplatesParams) ([]sqlc.BrokerTemplate, error)
	CountBrokerTemplates(ctx context.Context, arg sqlc.CountBrokerTemplatesParams) (int64, error)
	GetBrokerTemplate(ctx context.Context, id uuid.UUID) (sqlc.BrokerTemplate, error)
	CreateBrokerTemplate(ctx context.Context, arg sqlc.CreateBrokerTemplateParams) (sqlc.BrokerTemplate, error)
	UpdateBrokerTemplate(ctx context.Context, arg sqlc.UpdateBrokerTemplateParams) (sqlc.BrokerTemplate, error)
	DeleteBrokerTemplate(ctx context.Context, id uuid.UUID) error
}

type ConversionQuerier interface {
	CreateConversion(ctx context.Context, arg sqlc.CreateConversionParams) (sqlc.Conversion, error)
	GetConversion(ctx context.Context, arg sqlc.GetConversionParams) (sqlc.Conversion, error)
	ListConversions(ctx context.Context, arg sqlc.ListConversionsParams) ([]sqlc.Conversion, error)
	CountConversions(ctx context.Context, arg sqlc.CountConversionsParams) (int64, error)
	UpdateConversionStatus(ctx context.Context, arg sqlc.UpdateConversionStatusParams) (sqlc.Conversion, error)
	MarkConversionFake(ctx context.Context, arg sqlc.MarkConversionFakeParams) (sqlc.Conversion, error)
	GetConversionByBrokerTxn(ctx context.Context, arg sqlc.GetConversionByBrokerTxnParams) (sqlc.Conversion, error)
	GetPLSummary(ctx context.Context, arg sqlc.GetPLSummaryParams) ([]sqlc.GetPLSummaryRow, error)
	GetPLByBroker(ctx context.Context, arg sqlc.GetPLByBrokerParams) ([]sqlc.GetPLByBrokerRow, error)
	GetPLByAffiliate(ctx context.Context, arg sqlc.GetPLByAffiliateParams) ([]sqlc.GetPLByAffiliateRow, error)
	UpsertPricingRule(ctx context.Context, arg sqlc.UpsertPricingRuleParams) (sqlc.PricingRule, error)
	ListPricingRules(ctx context.Context, arg sqlc.ListPricingRulesParams) ([]sqlc.PricingRule, error)
	DeletePricingRule(ctx context.Context, arg sqlc.DeletePricingRuleParams) error
	ResolveBuyPrice(ctx context.Context, arg sqlc.ResolveBuyPriceParams) (string, error)
	ResolveSellPrice(ctx context.Context, arg sqlc.ResolveSellPriceParams) (string, error)
	GetBrokerWallet(ctx context.Context, arg sqlc.GetBrokerWalletParams) (sqlc.BrokerWallet, error)
	UpsertBrokerWallet(ctx context.Context, arg sqlc.UpsertBrokerWalletParams) (sqlc.BrokerWallet, error)
	UpdateWalletBalance(ctx context.Context, arg sqlc.UpdateWalletBalanceParams) error
	CreateWalletTransaction(ctx context.Context, arg sqlc.CreateWalletTransactionParams) (sqlc.WalletTransaction, error)
	ListWalletTransactions(ctx context.Context, arg sqlc.ListWalletTransactionsParams) ([]sqlc.WalletTransaction, error)
	CreateAffiliatePayout(ctx context.Context, arg sqlc.CreateAffiliatePayoutParams) (sqlc.AffiliatePayout, error)
	ListAffiliatePayouts(ctx context.Context, arg sqlc.ListAffiliatePayoutsParams) ([]sqlc.AffiliatePayout, error)
	UpdatePayoutStatus(ctx context.Context, arg sqlc.UpdatePayoutStatusParams) (sqlc.AffiliatePayout, error)
	GetAffiliateAccruedAmount(ctx context.Context, arg sqlc.GetAffiliateAccruedAmountParams) (string, error)
	GetAffiliatePaidAmount(ctx context.Context, arg sqlc.GetAffiliatePaidAmountParams) (string, error)
}

type MarketplaceQuerier interface {
	ListBrokerTemplates(ctx context.Context, arg sqlc.ListBrokerTemplatesParams) ([]sqlc.BrokerTemplate, error)
	CountBrokerTemplates(ctx context.Context, arg sqlc.CountBrokerTemplatesParams) (int64, error)
	GetBrokerTemplate(ctx context.Context, id uuid.UUID) (sqlc.BrokerTemplate, error)
}
