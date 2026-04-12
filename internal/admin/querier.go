package admin

import (
	"context"

	"github.com/google/uuid"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

// CompanyQuerier is the subset of sqlc.Queries used by CompanyHandler.
type CompanyQuerier interface {
	CreateCompany(ctx context.Context, arg sqlc.CreateCompanyParams) (sqlc.Company, error)
	GetCompany(ctx context.Context, id uuid.UUID) (sqlc.Company, error)
	UpdateCompany(ctx context.Context, arg sqlc.UpdateCompanyParams) (sqlc.Company, error)
}

// UserQuerier is the subset of sqlc.Queries used by UserHandler.
type UserQuerier interface {
	ListUsers(ctx context.Context, arg sqlc.ListUsersParams) ([]sqlc.User, error)
	CountUsers(ctx context.Context, companyID uuid.UUID) (int64, error)
	CreateUser(ctx context.Context, arg sqlc.CreateUserParams) (sqlc.User, error)
	GetUserByID(ctx context.Context, arg sqlc.GetUserByIDParams) (sqlc.User, error)
	UpdateUser(ctx context.Context, arg sqlc.UpdateUserParams) (sqlc.User, error)
	DeactivateUser(ctx context.Context, arg sqlc.DeactivateUserParams) error
}

// AffiliateQuerier is the subset of sqlc.Queries used by AffiliateHandler.
type AffiliateQuerier interface {
	ListAffiliates(ctx context.Context, arg sqlc.ListAffiliatesParams) ([]sqlc.Affiliate, error)
	CountAffiliates(ctx context.Context, companyID uuid.UUID) (int64, error)
	CreateAffiliate(ctx context.Context, arg sqlc.CreateAffiliateParams) (sqlc.Affiliate, error)
	GetAffiliate(ctx context.Context, arg sqlc.GetAffiliateParams) (sqlc.Affiliate, error)
	UpdateAffiliate(ctx context.Context, arg sqlc.UpdateAffiliateParams) (sqlc.Affiliate, error)
	UpdateAffiliateAPIKey(ctx context.Context, arg sqlc.UpdateAffiliateAPIKeyParams) (sqlc.Affiliate, error)
}
