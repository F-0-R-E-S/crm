package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, store *Store, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.broker-adapter.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "list_brokers":
			handleListBrokers(msg, store, cmd.TenantID)
		case "get_broker":
			handleGetBroker(msg, store, inputBytes)
		case "pause_broker":
			handleSetBrokerStatus(msg, store, inputBytes, "paused")
		case "resume_broker":
			handleSetBrokerStatus(msg, store, inputBytes, "active")
		case "update_broker_cap":
			handleUpdateBrokerCap(msg, store, inputBytes)
		case "check_broker_health":
			handleCheckHealth(msg, store, inputBytes)
		case "toggle_autologin":
			handleToggleAutologin(msg, store, inputBytes)
		case "get_cap_usage":
			handleGetCapUsage(msg, store, inputBytes)
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.broker-adapter.*")
}

func handleListBrokers(msg *nats.Msg, store *Store, tenantID string) {
	ctx := contextWithTimeout()
	brokers, err := store.GetActiveBrokers(ctx, tenantID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respondData(msg, brokers)
}

func handleGetBroker(msg *nats.Msg, store *Store, input []byte) {
	var params struct{ ID string `json:"id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	broker, err := store.GetBroker(ctx, params.ID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	if broker == nil {
		respond(msg, false, nil, "broker not found")
		return
	}
	respondData(msg, broker)
}

func handleSetBrokerStatus(msg *nats.Msg, store *Store, input []byte, status string) {
	var params struct{ ID string `json:"id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.UpdateBrokerStatus(ctx, params.ID, status)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true,"status":"`+status+`"}`), "")
}

func handleUpdateBrokerCap(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		BrokerID string `json:"broker_id"`
		DailyCap int    `json:"daily_cap"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.UpdateBrokerCap(ctx, params.BrokerID, params.DailyCap)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleCheckHealth(msg *nats.Msg, store *Store, input []byte) {
	var params struct{ ID string `json:"id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	broker, err := store.GetBroker(ctx, params.ID)
	if err != nil || broker == nil {
		respond(msg, false, nil, "broker not found")
		return
	}
	respondData(msg, map[string]interface{}{
		"broker_id":     broker.Broker.ID,
		"health_status": broker.Broker.HealthStatus,
		"status":        broker.Broker.Status,
	})
}

func handleToggleAutologin(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		BrokerID string `json:"broker_id"`
		Enabled  bool   `json:"enabled"`
	}
	json.Unmarshal(input, &params)
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleGetCapUsage(msg *nats.Msg, store *Store, input []byte) {
	var params struct{ ID string `json:"id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	broker, err := store.GetBroker(ctx, params.ID)
	if err != nil || broker == nil {
		respond(msg, false, nil, "broker not found")
		return
	}
	respondData(msg, map[string]interface{}{
		"broker_id": broker.Broker.ID,
		"daily_cap": broker.Broker.DailyCap,
	})
}

func respond(msg *nats.Msg, success bool, data json.RawMessage, errMsg string) {
	resp := messaging.CommandResponse{Success: success, Data: data, Error: errMsg}
	payload, _ := json.Marshal(resp)
	msg.Respond(payload)
}

func respondData(msg *nats.Msg, v interface{}) {
	data, _ := json.Marshal(v)
	respond(msg, true, data, "")
}

func contextWithTimeout() context.Context {
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	return ctx
}
