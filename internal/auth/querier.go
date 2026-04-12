package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

// AuthQuerier is the subset of sqlc.Queries used by the auth package.
type AuthQuerier interface {
	GetUserByEmail(ctx context.Context, arg sqlc.GetUserByEmailParams) (sqlc.User, error)
	GetUserByID(ctx context.Context, arg sqlc.GetUserByIDParams) (sqlc.User, error)
	GetSessionByTokenHash(ctx context.Context, tokenHash string) (sqlc.Session, error)
	DeleteSession(ctx context.Context, tokenHash string) error
	CreateSession(ctx context.Context, arg sqlc.CreateSessionParams) (sqlc.Session, error)
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	SetUserTOTP(ctx context.Context, arg sqlc.SetUserTOTPParams) error
}
