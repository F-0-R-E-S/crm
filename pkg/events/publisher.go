package events

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

type Publisher struct {
	js nats.JetStreamContext
}

func NewPublisher(js nats.JetStreamContext) *Publisher {
	return &Publisher{js: js}
}

func (p *Publisher) Publish(eventType, source string, data interface{}) error {
	event := New(eventType, source, data)
	event.ID = uuid.New().String()

	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	_, err = p.js.Publish(eventType, payload)
	if err != nil {
		return fmt.Errorf("publish %s: %w", eventType, err)
	}
	return nil
}
