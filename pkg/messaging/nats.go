package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

type NATSClient struct {
	conn   *nats.Conn
	js     jetstream.JetStream
	logger *slog.Logger
}

func NewNATS(ctx context.Context, natsURL string, logger *slog.Logger) (*NATSClient, error) {
	conn, err := nats.Connect(natsURL,
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(10),
		nats.ReconnectWait(2*time.Second),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			if err != nil {
				logger.Warn("nats disconnected", "error", err)
			}
		}),
		nats.ReconnectHandler(func(_ *nats.Conn) {
			logger.Info("nats reconnected")
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("connect to nats: %w", err)
	}

	js, err := jetstream.New(conn)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("create jetstream context: %w", err)
	}

	return &NATSClient{conn: conn, js: js, logger: logger}, nil
}

func (n *NATSClient) Close() {
	n.conn.Close()
}

type CloudEvent struct {
	SpecVersion     string      `json:"specversion"`
	Type            string      `json:"type"`
	Source          string      `json:"source"`
	ID              string      `json:"id"`
	Time            time.Time   `json:"time"`
	DataContentType string      `json:"datacontenttype"`
	Subject         string      `json:"subject,omitempty"`
	Data            interface{} `json:"data"`
}

func (n *NATSClient) Publish(ctx context.Context, eventType, source string, data interface{}) error {
	event := CloudEvent{
		SpecVersion:     "1.0",
		Type:            eventType,
		Source:          source,
		ID:              uuid.New().String(),
		Time:            time.Now().UTC(),
		DataContentType: "application/json",
		Data:            data,
	}

	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	_, err = n.js.Publish(ctx, eventType, payload)
	if err != nil {
		return fmt.Errorf("publish %s: %w", eventType, err)
	}

	n.logger.Debug("event published", "type", eventType, "id", event.ID)
	return nil
}

type MessageHandler func(ctx context.Context, event CloudEvent) error

func (n *NATSClient) Subscribe(ctx context.Context, stream, consumer string, handler MessageHandler) error {
	cons, err := n.js.Consumer(ctx, stream, consumer)
	if err != nil {
		return fmt.Errorf("get consumer %s/%s: %w", stream, consumer, err)
	}

	cc, err := cons.Consume(func(msg jetstream.Msg) {
		var event CloudEvent
		if err := json.Unmarshal(msg.Data(), &event); err != nil {
			n.logger.Error("unmarshal event", "error", err, "subject", msg.Subject())
			msg.Term()
			return
		}

		if err := handler(ctx, event); err != nil {
			n.logger.Error("handle event", "error", err, "type", event.Type, "id", event.ID)
			msg.Nak()
			return
		}

		msg.Ack()
	})
	if err != nil {
		return fmt.Errorf("consume %s/%s: %w", stream, consumer, err)
	}

	go func() {
		<-ctx.Done()
		cc.Stop()
	}()

	return nil
}

func (n *NATSClient) JetStream() jetstream.JetStream {
	return n.js
}
