package main

import (
	"encoding/json"
	"log/slog"

	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.autologin.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "retry_autologin_session":
			handleRetrySession(msg, inputBytes)
		case "pause_broker_autologin":
			handlePauseBrokerAutologin(msg, inputBytes)
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.autologin.*")
}

func handleRetrySession(msg *nats.Msg, input []byte) {
	var params struct{ SessionID string `json:"session_id"` }
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{
		"session_id": params.SessionID,
		"retried":    true,
	})
}

func handlePauseBrokerAutologin(msg *nats.Msg, input []byte) {
	var params struct{ BrokerID string `json:"broker_id"` }
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{
		"broker_id": params.BrokerID,
		"paused":    true,
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
