package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/cache"
	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, store *Store, rdb *cache.Redis, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.lead-intake.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "get_lead":
			handleGetLead(msg, store, inputBytes)
		case "search_leads":
			handleSearchLeads(msg, store, cmd.TenantID, inputBytes)
		case "block_source":
			handleBlockSource(msg, rdb, cmd.TenantID, inputBytes)
		case "unblock_source":
			handleUnblockSource(msg, rdb, cmd.TenantID, inputBytes)
		case "set_dedup_window":
			handleSetDedupWindow(msg, rdb, cmd.TenantID, inputBytes)
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.lead-intake.*")
}

func handleGetLead(msg *nats.Msg, store *Store, input []byte) {
	var params struct{ LeadID string `json:"lead_id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	lead, err := store.GetLead(ctx, params.LeadID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	if lead == nil {
		respond(msg, false, nil, "lead not found")
		return
	}
	respondData(msg, lead)
}

func handleSearchLeads(msg *nats.Msg, store *Store, tenantID string, input []byte) {
	var params struct {
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Country     string `json:"country"`
		AffiliateID string `json:"affiliate_id"`
		Status      string `json:"status"`
		Limit       int    `json:"limit"`
	}
	json.Unmarshal(input, &params)
	if params.Limit == 0 || params.Limit > 100 {
		params.Limit = 20
	}
	ctx := contextWithTimeout()
	leads, err := store.SearchLeads(ctx, tenantID, params.Email, params.Country, params.Status, params.Limit)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respondData(msg, leads)
}

func handleBlockSource(msg *nats.Msg, rdb *cache.Redis, tenantID string, input []byte) {
	var params struct {
		SourceType string `json:"source_type"`
		Value      string `json:"value"`
		Reason     string `json:"reason"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	key := "block:" + tenantID + ":" + params.SourceType + ":" + params.Value
	_ = rdb.Set(ctx, key, params.Reason, 0)
	respond(msg, true, json.RawMessage(`{"blocked":true}`), "")
}

func handleUnblockSource(msg *nats.Msg, rdb *cache.Redis, tenantID string, input []byte) {
	var params struct {
		SourceType string `json:"source_type"`
		Value      string `json:"value"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	key := "block:" + tenantID + ":" + params.SourceType + ":" + params.Value
	_ = rdb.Del(ctx, key)
	respond(msg, true, json.RawMessage(`{"unblocked":true}`), "")
}

func handleSetDedupWindow(msg *nats.Msg, rdb *cache.Redis, tenantID string, input []byte) {
	var params struct{ WindowMinutes int `json:"window_minutes"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	key := "dedup_window:" + tenantID
	_ = rdb.Set(ctx, key, params.WindowMinutes, 0)
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
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
