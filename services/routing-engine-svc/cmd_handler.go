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
	nc.Conn().Subscribe("cmd.routing-engine.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "list_rules":
			handleListRules(msg, store, cmd.TenantID)
		case "get_rule":
			handleGetRule(msg, store, inputBytes)
		case "adjust_weights":
			handleAdjustWeights(msg, store, inputBytes)
		case "pause_rule":
			handleSetRuleActive(msg, store, inputBytes, false)
		case "resume_rule":
			handleSetRuleActive(msg, store, inputBytes, true)
		case "update_rule_cap":
			handleUpdateRuleCap(msg, store, inputBytes)
		case "update_geo_filter":
			handleUpdateGeoFilter(msg, store, inputBytes)
		case "update_timeslots":
			handleUpdateTimeslots(msg, store, inputBytes)
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.routing-engine.*")
}

func handleListRules(msg *nats.Msg, store *Store, tenantID string) {
	ctx := contextWithTimeout()
	rules, err := store.GetActiveRules(ctx, tenantID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respondData(msg, rules)
}

func handleGetRule(msg *nats.Msg, store *Store, input []byte) {
	var params struct{ ID string `json:"id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	rules, err := store.GetActiveRules(ctx, "")
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	for _, r := range rules {
		if r.ID == params.ID {
			respondData(msg, r)
			return
		}
	}
	respond(msg, false, nil, "rule not found")
}

func handleAdjustWeights(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		RuleID  string `json:"rule_id"`
		Weights json.RawMessage `json:"weights"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.db.Exec(ctx,
		`UPDATE distribution_rules SET broker_targets = $1 WHERE id = $2`,
		params.Weights, params.RuleID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleSetRuleActive(msg *nats.Msg, store *Store, input []byte, active bool) {
	var params struct{ ID string `json:"id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.db.Exec(ctx,
		`UPDATE distribution_rules SET is_active = $1 WHERE id = $2`,
		active, params.ID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleUpdateRuleCap(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		RuleID   string `json:"rule_id"`
		DailyCap int    `json:"daily_cap"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.db.Exec(ctx,
		`UPDATE distribution_rules SET daily_cap = $1 WHERE id = $2`,
		params.DailyCap, params.RuleID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleUpdateGeoFilter(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		RuleID    string   `json:"rule_id"`
		Countries []string `json:"countries"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	conditions, _ := json.Marshal(map[string]interface{}{"countries": params.Countries})
	err := store.db.Exec(ctx,
		`UPDATE distribution_rules SET conditions = conditions || $1::jsonb WHERE id = $2`,
		string(conditions), params.RuleID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleUpdateTimeslots(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		RuleID string          `json:"rule_id"`
		Slots  json.RawMessage `json:"slots"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.db.Exec(ctx,
		`UPDATE distribution_rules SET timezone_slots = $1 WHERE id = $2`,
		params.Slots, params.RuleID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

// --- Shared helpers ---

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
