-- EPIC-13: Onboarding wizard state tracking

CREATE TABLE onboarding_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
    current_step VARCHAR(100) NOT NULL DEFAULT 'company_setup',
    completed_steps JSONB NOT NULL DEFAULT '[]',
    step_data JSONB NOT NULL DEFAULT '{}',
    template_id VARCHAR(100),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onboarding_tenant ON onboarding_state(tenant_id);

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_onboarding ON onboarding_state
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE TRIGGER trg_onboarding_updated_at BEFORE UPDATE ON onboarding_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Onboarding templates (pre-built configurations)
CREATE TABLE onboarding_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    steps JSONB NOT NULL,
    default_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO onboarding_templates (id, name, description, category, steps, default_config) VALUES
('quick-start', 'Quick Start', 'Get your first lead flowing in under 30 minutes', 'general',
 '["company_setup","first_broker","first_affiliate","first_rule","test_lead","notifications","complete"]',
 '{"estimated_minutes": 30}'),
('forex-standard', 'Forex Standard', 'Standard setup for forex lead distribution', 'forex',
 '["company_setup","broker_templates","affiliate_setup","routing_rules","fraud_config","notifications","test_lead","complete"]',
 '{"estimated_minutes": 45, "default_broker_templates": ["forex_generic"]}'),
('crypto-advanced', 'Crypto Advanced', 'Full setup for crypto affiliate networks', 'crypto',
 '["company_setup","broker_templates","affiliate_hierarchy","routing_rules","fraud_config","cap_setup","notifications","telegram_bot","test_lead","complete"]',
 '{"estimated_minutes": 60, "default_broker_templates": ["crypto_generic"]}'),
('enterprise', 'Enterprise', 'Full-featured setup with all modules', 'enterprise',
 '["company_setup","team_setup","broker_templates","affiliate_hierarchy","routing_rules","fraud_config","cap_setup","notifications","telegram_bot","api_keys","test_lead","complete"]',
 '{"estimated_minutes": 90}');
