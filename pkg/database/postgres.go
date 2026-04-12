package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func New(ctx context.Context, databaseURL string) (*DB, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 5
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &DB{Pool: pool}, nil
}

func (db *DB) Close() {
	db.Pool.Close()
}

func (db *DB) WithTenant(ctx context.Context, tenantID string) (pgx.Tx, error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}

	_, err = tx.Exec(ctx, "SET LOCAL app.tenant_id = $1", tenantID)
	if err != nil {
		tx.Rollback(ctx)
		return nil, fmt.Errorf("set tenant: %w", err)
	}

	return tx, nil
}

func (db *DB) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return db.Pool.QueryRow(ctx, sql, args...)
}

func (db *DB) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return db.Pool.Query(ctx, sql, args...)
}

func (db *DB) Exec(ctx context.Context, sql string, args ...interface{}) error {
	_, err := db.Pool.Exec(ctx, sql, args...)
	return err
}
