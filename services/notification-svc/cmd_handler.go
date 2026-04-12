package main

import (
	"encoding/json"
	"log/slog"

	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.notification.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "send_alert":
			handleSendAlert(msg, inputBytes)
		case "list_notification_preferences":
			respondData(msg, []interface{}{})
		case "update_notification_preferences":
			respond(msg, true, json.RawMessage(`{"updated":true}`), "")
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.notification.*")
}

func handleSendAlert(msg *nats.Msg, input []byte) {
	var params struct {
		Title    string   `json:"title"`
		Body     string   `json:"body"`
		Channels []string `json:"channels"`
	}
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{
		"sent":     true,
		"channels": params.Channels,
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
