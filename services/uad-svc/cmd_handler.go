package main

import (
	"encoding/json"
	"log/slog"

	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.uad.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		switch cmd.Action {
		case "get_uad_status":
			respondData(msg, map[string]interface{}{
				"status":         "running",
				"pending_leads":  0,
				"processed_today": 0,
			})
		case "trigger_uad_run":
			respondData(msg, map[string]interface{}{"triggered": true})
		case "pause_uad":
			respond(msg, true, json.RawMessage(`{"paused":true}`), "")
		case "resume_uad":
			respond(msg, true, json.RawMessage(`{"resumed":true}`), "")
		case "set_uad_retry_schedule":
			respond(msg, true, json.RawMessage(`{"updated":true}`), "")
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.uad.*")
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
