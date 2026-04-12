-- GambChamp CRM - Initial Schema v1
-- Multi-tenant with Row Level Security

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'media_buyer',
    is_2fa_enabled BOOLEAN NOT NULL DEFAULT false,
    totp_secret_enc BYTEA,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(8) NOT NULL,
    scopes JSONB NOT NULL DEFAULT '["leads:write"]',
    allowed_ips INET[],
    rate_limit_per_min INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- Affiliates
CREATE TABLE affiliates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    api_key_hash VARCHAR(255),
    postback_url TEXT,
    postback_events JSONB DEFAULT '["delivered", "ftd", "rejected"]',
    allowed_ips INET[],
    fraud_profile JSONB DEFAULT '{}',
    daily_cap INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_affiliates_tenant ON affiliates(tenant_id);

-- Broker templates (shared across tenants)
CREATE TABLE broker_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    method VARCHAR(10) NOT NULL DEFAULT 'POST',
    url_template TEXT NOT NULL,
    headers JSONB DEFAULT '{}',
    body_template JSONB NOT NULL,
    auth_type VARCHAR(50) NOT NULL DEFAULT 'api_key',
    response_mapping JSONB NOT NULL DEFAULT '{}',
    postback_config JSONB,
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, version)
);

-- Brokers (per-tenant)
CREATE TABLE brokers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    template_id UUID REFERENCES broker_templates(id),
    endpoint TEXT NOT NULL,
    credentials_enc BYTEA,
    field_mapping JSONB DEFAULT '{}',
    daily_cap INT NOT NULL DEFAULT 0,
    total_cap INT NOT NULL DEFAULT 0,
    country_caps JSONB DEFAULT '{}',
    priority INT NOT NULL DEFAULT 0,
    health_status VARCHAR(50) NOT NULL DEFAULT 'healthy',
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brokers_tenant ON brokers(tenant_id);
CREATE INDEX idx_brokers_status ON brokers(tenant_id, status);

-- Distribution rules
CREATE TABLE distribution_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '{}',
    broker_targets JSONB NOT NULL DEFAULT '[]',
    algorithm VARCHAR(50) NOT NULL DEFAULT 'weighted_round_robin',
    daily_cap INT NOT NULL DEFAULT 0,
    total_cap INT NOT NULL DEFAULT 0,
    country_caps JSONB DEFAULT '{}',
    delayed_actions JSONB DEFAULT '[]',
    cr_limits JSONB,
    timezone_slots JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_distribution_rules_tenant ON distribution_rules(tenant_id);
CREATE INDEX idx_distribution_rules_active ON distribution_rules(tenant_id, is_active) WHERE is_active = true;

-- Leads (partitioned by month)
CREATE TABLE leads (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    affiliate_id UUID NOT NULL,
    idempotency_key VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    phone_e164 VARCHAR(20),
    country VARCHAR(3),
    ip INET,
    user_agent TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    quality_score SMALLINT NOT NULL DEFAULT 0,
    fraud_card JSONB,
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_leads_tenant ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_leads_affiliate ON leads(tenant_id, affiliate_id, created_at DESC);
CREATE INDEX idx_leads_status ON leads(tenant_id, status, created_at DESC);
CREATE INDEX idx_leads_country ON leads(tenant_id, country, created_at DESC);
CREATE INDEX idx_leads_email ON leads(tenant_id, email);
CREATE INDEX idx_leads_idempotency ON leads(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX idx_leads_idempotency_unique ON leads(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Create partitions for 2026
CREATE TABLE leads_2026_01 PARTITION OF leads FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE leads_2026_02 PARTITION OF leads FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE leads_2026_03 PARTITION OF leads FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE leads_2026_04 PARTITION OF leads FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE leads_2026_05 PARTITION OF leads FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE leads_2026_06 PARTITION OF leads FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE leads_2026_07 PARTITION OF leads FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE leads_2026_08 PARTITION OF leads FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE leads_2026_09 PARTITION OF leads FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE leads_2026_10 PARTITION OF leads FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE leads_2026_11 PARTITION OF leads FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE leads_2026_12 PARTITION OF leads FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Lead events (Client History - every delivery attempt, status change)
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    broker_id UUID,
    request_body JSONB,
    response_body JSONB,
    status_code SMALLINT,
    duration_ms INT,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_events_lead ON lead_events(lead_id, created_at DESC);
CREATE INDEX idx_lead_events_tenant ON lead_events(tenant_id, created_at DESC);
CREATE INDEX idx_lead_events_type ON lead_events(tenant_id, event_type, created_at DESC);

-- Fraud profiles (per-affiliate fraud settings)
CREATE TABLE fraud_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id),
    ip_check_enabled BOOLEAN NOT NULL DEFAULT true,
    email_check_enabled BOOLEAN NOT NULL DEFAULT true,
    phone_check_enabled BOOLEAN NOT NULL DEFAULT true,
    velocity_check_enabled BOOLEAN NOT NULL DEFAULT true,
    device_check_enabled BOOLEAN NOT NULL DEFAULT false,
    min_quality_score SMALLINT NOT NULL DEFAULT 50,
    auto_reject_score SMALLINT NOT NULL DEFAULT 20,
    custom_rules JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, affiliate_id)
);

-- Autologin sessions
CREATE TABLE autologin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    broker_id UUID NOT NULL,
    stage VARCHAR(50) NOT NULL DEFAULT 'pending',
    device_id VARCHAR(255),
    proxy_used VARCHAR(255),
    autologin_url TEXT,
    navigate_at TIMESTAMPTZ,
    fingerprint_at TIMESTAMPTZ,
    submit_at TIMESTAMPTZ,
    verify_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_autologin_tenant ON autologin_sessions(tenant_id, created_at DESC);
CREATE INDEX idx_autologin_lead ON autologin_sessions(lead_id);
CREATE INDEX idx_autologin_stage ON autologin_sessions(stage) WHERE stage != 'completed';

-- UAD queue (unsold lead re-distribution)
CREATE TABLE uad_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    original_broker_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ,
    filters JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uad_pending ON uad_queue(next_attempt_at) WHERE status = 'pending';
CREATE INDEX idx_uad_tenant ON uad_queue(tenant_id, status);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    channel VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    body TEXT,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(tenant_id, user_id, is_read) WHERE is_read = false;

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    telegram_chat_id VARCHAR(100),
    telegram_enabled BOOLEAN NOT NULL DEFAULT false,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    webhook_url TEXT,
    webhook_enabled BOOLEAN NOT NULL DEFAULT false,
    event_filters JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Audit log (append-only)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log(tenant_id, resource_type, resource_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE autologin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uad_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies (app sets current_setting('app.tenant_id'))
CREATE POLICY tenant_isolation_users ON users USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_affiliates ON affiliates USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_brokers ON brokers USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_rules ON distribution_rules USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_leads ON leads USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_lead_events ON lead_events USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_fraud ON fraud_profiles USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_autologin ON autologin_sessions USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_uad ON uad_queue USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_notifications ON notifications USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_notif_prefs ON notification_preferences USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_audit ON audit_log USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_refresh ON refresh_tokens USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_api_keys ON api_keys USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_affiliates_updated_at BEFORE UPDATE ON affiliates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_brokers_updated_at BEFORE UPDATE ON brokers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_distribution_rules_updated_at BEFORE UPDATE ON distribution_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_fraud_profiles_updated_at BEFORE UPDATE ON fraud_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
