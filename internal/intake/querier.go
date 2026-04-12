package intake

import (
	"context"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

// IntakeQuerier is the subset of sqlc.Queries used by the intake package.
type IntakeQuerier interface {
	CheckDuplicate(ctx context.Context, arg sqlc.CheckDuplicateParams) (int32, error)
	CreateLead(ctx context.Context, arg sqlc.CreateLeadParams) (sqlc.Lead, error)
	ListLeads(ctx context.Context, arg sqlc.ListLeadsParams) ([]sqlc.Lead, error)
	CountLeads(ctx context.Context, arg sqlc.CountLeadsParams) (int64, error)
	GetLead(ctx context.Context, arg sqlc.GetLeadParams) (sqlc.Lead, error)
}
