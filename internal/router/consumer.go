// Package router provides the routing NATS consumer.
package router

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"

	"github.com/gambchamp/crm/internal/db/sqlc"
)

// Consumer subscribes to leads.routing and assigns leads to brokers.
type Consumer struct {
	JS  nats.JetStreamContext
	DB  *sqlc.Queries
	Log *slog.Logger
	sub *nats.Subscription
}

// NewConsumer creates a routing consumer.
func NewConsumer(js nats.JetStreamContext, db *sqlc.Queries, log *slog.Logger) *Consumer {
	return &Consumer{JS: js, DB: db, Log: log}
}

// Start subscribes to leads.routing.
func (c *Consumer) Start(ctx context.Context) error {
	var err error
	c.sub, err = c.JS.Subscribe("leads.routing", func(msg *nats.Msg) {
		c.handleMessage(ctx, msg)
	}, nats.Durable("router"), nats.ManualAck(), nats.MaxDeliver(3))
	if err != nil {
		return err
	}

	c.Log.Info("routing consumer started")
	<-ctx.Done()
	return c.sub.Unsubscribe()
}

func (c *Consumer) handleMessage(ctx context.Context, msg *nats.Msg) {
	leadID, err := uuid.Parse(string(msg.Data))
	if err != nil {
		c.Log.Error("invalid lead id in routing message", "data", string(msg.Data))
		_ = msg.Nak()
		return
	}

	lead, err := c.DB.GetLeadUnscoped(ctx, leadID)
	if err != nil {
		c.Log.Error("lead not found for routing", "lead_id", leadID, "error", err)
		_ = msg.Nak()
		return
	}

	// S01 STUB: no routing configured, move to hold
	err = c.DB.UpdateLeadStatus(ctx, sqlc.UpdateLeadStatusParams{
		ID:        lead.ID,
		CompanyID: lead.CompanyID,
		Status:    "hold",
	})
	if err != nil {
		c.Log.Error("failed to update lead status to hold", "lead_id", leadID, "error", err)
		_ = msg.Nak()
		return
	}

	_ = msg.Ack()
	c.Log.Info("lead moved to hold (no routing configured)", "lead_id", leadID)
}
