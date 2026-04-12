// Package fraud provides the fraud check NATS consumer.
package fraud

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nats-io/nats.go"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

// Consumer subscribes to leads.intake and performs fraud checks.
type Consumer struct {
	JS  nats.JetStreamContext
	DB  *sqlc.Queries
	Log *slog.Logger
	sub *nats.Subscription
}

// NewConsumer creates a fraud check consumer.
func NewConsumer(js nats.JetStreamContext, db *sqlc.Queries, log *slog.Logger) *Consumer {
	return &Consumer{JS: js, DB: db, Log: log}
}

// Start creates the LEADS stream and subscribes to leads.intake.
func (c *Consumer) Start(ctx context.Context) error {
	_, err := c.JS.AddStream(&nats.StreamConfig{
		Name:     "LEADS",
		Subjects: []string{"leads.intake", "leads.fraud", "leads.routing"},
	})
	if err != nil {
		c.Log.Warn("stream creation (may already exist)", "error", err)
	}

	c.sub, err = c.JS.Subscribe("leads.intake", func(msg *nats.Msg) {
		c.handleMessage(ctx, msg)
	}, nats.Durable("fraud-checker"), nats.ManualAck(), nats.MaxDeliver(3))
	if err != nil {
		return err
	}

	c.Log.Info("fraud consumer started")
	<-ctx.Done()
	return c.sub.Unsubscribe()
}

func (c *Consumer) handleMessage(ctx context.Context, msg *nats.Msg) {
	leadID, err := uuid.Parse(string(msg.Data))
	if err != nil {
		c.Log.Error("invalid lead id in message", "data", string(msg.Data), "error", err)
		_ = msg.Nak()
		return
	}

	lead, err := c.DB.GetLeadUnscoped(ctx, leadID)
	if err != nil {
		c.Log.Error("lead not found for fraud check", "lead_id", leadID, "error", err)
		_ = msg.Nak()
		return
	}

	// S01 STUB: all leads pass fraud check with score 0
	var score int16
	details, _ := json.Marshal(map[string]any{"result": "clean", "score": 0})

	err = c.DB.UpdateLeadFraud(ctx, sqlc.UpdateLeadFraudParams{
		ID:           lead.ID,
		CompanyID:    lead.CompanyID,
		FraudScore:   &score,
		FraudDetails: details,
		Status:       "processing",
	})
	if err != nil {
		c.Log.Error("failed to update lead fraud", "lead_id", leadID, "error", err)
		_ = msg.Nak()
		return
	}

	_ = c.JS.Publish("leads.routing", msg.Data)
	_ = msg.Ack()

	c.Log.Info("fraud check complete", "lead_id", leadID, "fraud_score", 0)
}

// Ensure pgconn is imported (used by sqlc generated code dependencies).
var _ pgconn.CommandTag
