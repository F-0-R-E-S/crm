//go:build e2e

package e2e

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	TestTenantID    = "00000000-0000-0000-0000-000000000001"
	TestAffiliateID = "00000000-0000-0000-0000-000000000010"
	TestBrokerID    = "00000000-0000-0000-0000-000000000020"
	TestBroker2ID   = "00000000-0000-0000-0000-000000000021"
	TestTemplateID  = "00000000-0000-0000-0000-000000000030"
	TestRuleID      = "00000000-0000-0000-0000-000000000040"
	TestUserID      = "00000000-0000-0000-0000-000000000050"
	TestAPIKeyID    = "00000000-0000-0000-0000-000000000060"
)

type SeedOpts struct {
	BrokerEndpoint  string
	Broker2Endpoint string
}

func SeedTestData(ctx context.Context, pool *pgxpool.Pool, opts SeedOpts) error {
	// Tenant
	if _, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, name, plan, is_active)
		VALUES ($1, 'E2E Test Tenant', 'pro', true)
		ON CONFLICT (id) DO NOTHING`,
		TestTenantID,
	); err != nil {
		return fmt.Errorf("seed tenant: %w", err)
	}

	// User
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active)
		VALUES ($1, $2, 'e2e@test.com', '$2a$10$dummyhash', 'E2E User', 'network_admin', true)
		ON CONFLICT DO NOTHING`,
		TestUserID, TestTenantID,
	); err != nil {
		return fmt.Errorf("seed user: %w", err)
	}

	// API Key (no hash validation in direct DB access test)
	if _, err := pool.Exec(ctx, `
		INSERT INTO api_keys (id, tenant_id, name, key_hash, key_prefix, scopes, is_active)
		VALUES ($1, $2, 'E2E Key', 'e2e-test-key-hash', 'e2e_', '["leads:write","leads:read"]'::jsonb, true)
		ON CONFLICT DO NOTHING`,
		TestAPIKeyID, TestTenantID,
	); err != nil {
		return fmt.Errorf("seed api_key: %w", err)
	}

	// Affiliate
	if _, err := pool.Exec(ctx, `
		INSERT INTO affiliates (id, tenant_id, name, email, status, daily_cap)
		VALUES ($1, $2, 'E2E Affiliate', 'aff@test.com', 'active', 1000)
		ON CONFLICT DO NOTHING`,
		TestAffiliateID, TestTenantID,
	); err != nil {
		return fmt.Errorf("seed affiliate: %w", err)
	}

	// Broker template — points to mock broker
	bodyTemplate, _ := json.Marshal(map[string]string{
		"first_name": "{{first_name}}",
		"last_name":  "{{last_name}}",
		"email":      "{{email}}",
		"phone":      "{{phone_e164}}",
		"country":    "{{country}}",
		"ip":         "{{ip}}",
	})
	responseMapping, _ := json.Marshal(map[string]string{
		"broker_lead_id": "lead_id",
		"autologin_url":  "autologin_url",
	})

	if _, err := pool.Exec(ctx, `
		INSERT INTO broker_templates (id, name, version, method, url_template, headers, body_template, auth_type, response_mapping, is_public)
		VALUES ($1, 'E2E Template', 1, 'POST', $2, '{"Content-Type":"application/json"}'::jsonb, $3, 'none', $4, true)
		ON CONFLICT (name, version) DO UPDATE SET url_template = $2, body_template = $3, response_mapping = $4`,
		TestTemplateID, opts.BrokerEndpoint+"/api/lead", string(bodyTemplate), string(responseMapping),
	); err != nil {
		return fmt.Errorf("seed broker_template: %w", err)
	}

	// Broker #1 (primary) — points to mock
	if _, err := pool.Exec(ctx, `
		INSERT INTO brokers (id, tenant_id, name, status, template_id, endpoint, credentials_enc, field_mapping, daily_cap, total_cap, priority)
		VALUES ($1, $2, 'E2E Broker', 'active', $3, $4, '{}', '{}', 10000, 0, 1)
		ON CONFLICT (id) DO UPDATE SET endpoint = $4, status = 'active'`,
		TestBrokerID, TestTenantID, TestTemplateID, opts.BrokerEndpoint+"/api/lead",
	); err != nil {
		return fmt.Errorf("seed broker: %w", err)
	}

	// Broker #2 (backup for UAD tests)
	if opts.Broker2Endpoint != "" {
		if _, err := pool.Exec(ctx, `
			INSERT INTO brokers (id, tenant_id, name, status, template_id, endpoint, credentials_enc, field_mapping, daily_cap, total_cap, priority)
			VALUES ($1, $2, 'E2E Broker 2', 'active', $3, $4, '{}', '{}', 10000, 0, 2)
			ON CONFLICT (id) DO UPDATE SET endpoint = $4, status = 'active'`,
			TestBroker2ID, TestTenantID, TestTemplateID, opts.Broker2Endpoint+"/api/lead",
		); err != nil {
			return fmt.Errorf("seed broker2: %w", err)
		}
	}

	// Distribution rule — routes all leads to broker #1
	targets, _ := json.Marshal([]map[string]interface{}{
		{"broker_id": TestBrokerID, "weight": 100},
	})

	if _, err := pool.Exec(ctx, `
		INSERT INTO distribution_rules (id, tenant_id, name, priority, is_active, conditions, broker_targets, algorithm, daily_cap, total_cap)
		VALUES ($1, $2, 'E2E Route All', 1, true, '{}'::jsonb, $3, 'weighted_round_robin', 0, 0)
		ON CONFLICT (id) DO UPDATE SET broker_targets = $3, is_active = true`,
		TestRuleID, TestTenantID, string(targets),
	); err != nil {
		return fmt.Errorf("seed distribution_rule: %w", err)
	}

	return nil
}
