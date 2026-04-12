//go:build e2e

package e2e

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/redis/go-redis/v9"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/database"
	"github.com/gambchamp/crm/pkg/messaging"
)

type Infra struct {
	DB    *database.DB
	Pool  *pgxpool.Pool
	Redis *cache.Redis
	NATS  *messaging.NATSClient
	JS    jetstream.JetStream

	pgDSN    string
	redisURL string
	natsURL  string
	logger   *slog.Logger
}

func SetupInfra(ctx context.Context) (*Infra, error) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	pgDSN := envOrDefault("E2E_PG_DSN", "postgres://postgres:postgres@localhost:5432/gambchamp_e2e?sslmode=disable")
	redisURL := envOrDefault("E2E_REDIS_URL", "redis://localhost:6379/15")
	natsURL := envOrDefault("E2E_NATS_URL", "nats://localhost:4222")

	db, err := database.New(ctx, pgDSN)
	if err != nil {
		return nil, fmt.Errorf("connect to postgres: %w", err)
	}

	rdb, err := cache.NewRedis(ctx, redisURL)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("connect to redis: %w", err)
	}

	nc, err := messaging.NewNATS(ctx, natsURL, logger)
	if err != nil {
		db.Close()
		rdb.Close()
		return nil, fmt.Errorf("connect to nats: %w", err)
	}

	infra := &Infra{
		DB:       db,
		Pool:     db.Pool,
		Redis:    rdb,
		NATS:     nc,
		JS:       nc.JetStream(),
		pgDSN:    pgDSN,
		redisURL: redisURL,
		natsURL:  natsURL,
		logger:   logger,
	}

	return infra, nil
}

func (inf *Infra) Close() {
	inf.NATS.Close()
	inf.Redis.Close()
	inf.DB.Close()
}

func (inf *Infra) RunMigrations(ctx context.Context) error {
	migrationsDir := "../../migrations"

	orderedFiles := []string{
		"001_initial_schema.up.sql",
		"002_rbac_sessions_invites.up.sql",
		"003_affiliate_hierarchy_postbacks.up.sql",
		"003_seed_broker_templates.up.sql",
		"004_add_lead_sub_params.up.sql",
	}

	for _, file := range orderedFiles {
		path := migrationsDir + "/" + file
		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}
		if _, err := inf.Pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("run migration %s: %w", file, err)
		}
		inf.logger.Info("applied migration", "file", file)
	}

	return nil
}

func (inf *Infra) InitJetStream(ctx context.Context) error {
	js := inf.JS

	streamCfg := jetstream.StreamConfig{
		Name:       "leads",
		Subjects:   []string{"lead.>"},
		Retention:  jetstream.LimitsPolicy,
		MaxAge:     720 * time.Hour,
		Storage:    jetstream.MemoryStorage,
		Replicas:   1,
		Discard:    jetstream.DiscardOld,
		Duplicates: 2 * time.Minute,
	}
	if _, err := js.CreateOrUpdateStream(ctx, streamCfg); err != nil {
		return fmt.Errorf("create stream 'leads': %w", err)
	}

	consumers := []struct {
		Name   string
		Filter string
		MaxDel int
	}{
		{"routing-engine", "lead.received", 5},
		{"broker-adapter", "lead.routed", 5},
		{"status-sync-delivered", "lead.delivered", 3},
		{"uad-delivery-failed", "lead.delivery_failed", 10},
	}

	for _, c := range consumers {
		cfg := jetstream.ConsumerConfig{
			Name:          c.Name,
			Durable:       c.Name,
			FilterSubject: c.Filter,
			AckPolicy:     jetstream.AckExplicitPolicy,
			DeliverPolicy: jetstream.DeliverAllPolicy,
			MaxDeliver:    c.MaxDel,
			AckWait:       30 * time.Second,
		}
		if _, err := js.CreateOrUpdateConsumer(ctx, "leads", cfg); err != nil {
			return fmt.Errorf("create consumer %s: %w", c.Name, err)
		}
	}

	inf.logger.Info("jetstream initialized", "consumers", len(consumers))
	return nil
}

func (inf *Infra) CleanDB(ctx context.Context) error {
	tables := []string{
		"lead_events", "leads", "postback_queue",
		"uad_queue", "autologin_sessions", "fraud_profiles",
		"distribution_rules", "brokers", "broker_templates",
		"affiliates", "api_keys", "refresh_tokens",
		"notification_preferences", "notifications",
		"audit_log", "users", "tenants",
	}
	for _, t := range tables {
		if _, err := inf.Pool.Exec(ctx, "DELETE FROM "+t); err != nil {
			inf.logger.Warn("clean table", "table", t, "error", err)
		}
	}
	return nil
}

func (inf *Infra) FlushRedis(ctx context.Context) error {
	return inf.Redis.Client.FlushDB(ctx).Err()
}

func (inf *Infra) PurgeStreams(ctx context.Context) error {
	stream, err := inf.JS.Stream(ctx, "leads")
	if err != nil {
		return err
	}
	return stream.Purge(ctx)
}

func ConnectRawRedis(ctx context.Context, url string) *redis.Client {
	opts, err := redis.ParseURL(url)
	if err != nil {
		panic(err)
	}
	return redis.NewClient(opts)
}

func ConnectRawNATS(url string) *nats.Conn {
	conn, err := nats.Connect(url)
	if err != nil {
		panic(err)
	}
	return conn
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
