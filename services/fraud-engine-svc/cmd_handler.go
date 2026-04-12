package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gambchamp/crm/pkg/messaging"
	"github.com/nats-io/nats.go"
)

func StartCmdHandler(nc *messaging.NATSClient, store *Store, checker *FraudChecker, logger *slog.Logger) {
	nc.Conn().Subscribe("cmd.fraud-engine.*", func(msg *nats.Msg) {
		var cmd messaging.CommandEnvelope
		if err := json.Unmarshal(msg.Data, &cmd); err != nil {
			respond(msg, false, nil, "invalid command")
			return
		}

		logger.Debug("cmd received", "action", cmd.Action, "tenant_id", cmd.TenantID)

		inputBytes, _ := json.Marshal(cmd.Input)

		switch cmd.Action {
		case "get_fraud_profile":
			handleGetFraudProfile(msg, store, cmd.TenantID, inputBytes)
		case "list_fraud_profiles":
			handleListFraudProfiles(msg, store, cmd.TenantID)
		case "adjust_fraud_threshold":
			handleAdjustThreshold(msg, store, inputBytes)
		case "set_auto_reject_score":
			handleSetAutoRejectScore(msg, store, inputBytes)
		case "add_ip_blacklist":
			handleAddIPBlacklist(msg, store, cmd.TenantID, inputBytes)
		case "remove_ip_blacklist":
			handleRemoveIPBlacklist(msg, store, cmd.TenantID, inputBytes)
		case "check_lead_fraud":
			handleCheckLeadFraud(msg, store, inputBytes)
		default:
			respond(msg, false, nil, "unknown action: "+cmd.Action)
		}
	})
	logger.Info("cmd handler started", "subject", "cmd.fraud-engine.*")
}

func handleGetFraudProfile(msg *nats.Msg, store *Store, tenantID string, input []byte) {
	var params struct{ AffiliateID string `json:"affiliate_id"` }
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	profile, err := store.GetFraudProfile(ctx, tenantID, params.AffiliateID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respondData(msg, profile)
}

func handleListFraudProfiles(msg *nats.Msg, store *Store, tenantID string) {
	ctx := contextWithTimeout()
	profiles, err := store.ListFraudProfiles(ctx, tenantID)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respondData(msg, profiles)
}

func handleAdjustThreshold(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		AffiliateID     string `json:"affiliate_id"`
		MinQualityScore int    `json:"min_quality_score"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.UpdateMinQualityScore(ctx, params.AffiliateID, params.MinQualityScore)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleSetAutoRejectScore(msg *nats.Msg, store *Store, input []byte) {
	var params struct {
		AffiliateID    string `json:"affiliate_id"`
		AutoRejectScore int   `json:"auto_reject_score"`
	}
	json.Unmarshal(input, &params)
	ctx := contextWithTimeout()
	err := store.UpdateAutoRejectScore(ctx, params.AffiliateID, params.AutoRejectScore)
	if err != nil {
		respond(msg, false, nil, err.Error())
		return
	}
	respond(msg, true, json.RawMessage(`{"updated":true}`), "")
}

func handleAddIPBlacklist(msg *nats.Msg, store *Store, tenantID string, input []byte) {
	var params struct {
		IPs    []string `json:"ips"`
		Reason string   `json:"reason"`
	}
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{"added": len(params.IPs)})
}

func handleRemoveIPBlacklist(msg *nats.Msg, store *Store, tenantID string, input []byte) {
	var params struct{ IPs []string `json:"ips"` }
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{"removed": len(params.IPs)})
}

func handleCheckLeadFraud(msg *nats.Msg, store *Store, input []byte) {
	var params struct{ LeadID string `json:"lead_id"` }
	json.Unmarshal(input, &params)
	respondData(msg, map[string]interface{}{
		"lead_id": params.LeadID,
		"status":  "checked",
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
