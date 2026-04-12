package main

import (
	"encoding/json"
	"log/slog"

	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.analytics.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "get_dashboard":
			handleGetDashboard(msg, inputBytes)
		case "get_metrics":
			handleGetMetrics(msg, inputBytes)
		case "run_report":
			handleRunReport(msg, inputBytes)
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.analytics.*")
}

func handleGetDashboard(msg *nats.Msg, input []byte) {
	var params struct{ Period string `json:"period"` }
	json.Unmarshal(input, &params)
	if params.Period == "" {
		params.Period = "today"
	}
	respondData(msg, map[string]interface{}{
		"period":          params.Period,
		"total_leads":     0,
		"conversion_rate": 0.0,
		"revenue":         0.0,
		"top_brokers":     []interface{}{},
		"top_affiliates":  []interface{}{},
	})
}

func handleGetMetrics(msg *nats.Msg, input []byte) {
	var params struct {
		Metric string `json:"metric"`
		Period string `json:"period"`
	}
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{
		"metric": params.Metric,
		"period": params.Period,
		"value":  0,
		"data":   []interface{}{},
	})
}

func handleRunReport(msg *nats.Msg, input []byte) {
	var params struct {
		ReportType string `json:"report_type"`
	}
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{
		"report_type": params.ReportType,
		"status":      "generated",
		"rows":        []interface{}{},
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
