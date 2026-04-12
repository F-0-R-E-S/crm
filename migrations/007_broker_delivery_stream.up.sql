-- Stream 3: Broker & Delivery (EPIC-03, EPIC-08, EPIC-12, EPIC-16)

-- ============================================================
-- EPIC-03: Broker Integration Layer enhancements
-- ============================================================

-- Broker opening hours schedule
CREATE TABLE IF NOT EXISTS broker_opening_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(broker_id, day_of_week)
);
CREATE INDEX idx_broker_hours_broker ON broker_opening_hours(broker_id);

ALTER TABLE broker_opening_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_broker_hours ON broker_opening_hours
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Broker funnel name mapping
CREATE TABLE IF NOT EXISTS broker_funnel_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source_funnel VARCHAR(255) NOT NULL,
    target_funnel VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(broker_id, source_funnel)
);
CREATE INDEX idx_funnel_map_broker ON broker_funnel_mappings(broker_id);

ALTER TABLE broker_funnel_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_funnel_map ON broker_funnel_mappings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Extend brokers with new EPIC-03 fields
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS opening_hours_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS funnel_fallback VARCHAR(50) NOT NULL DEFAULT 'use_original'; -- use_original, reject, use_default
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS default_funnel_name VARCHAR(255);
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS cloned_from UUID;

-- Circuit breaker state per broker
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS circuit_state VARCHAR(20) NOT NULL DEFAULT 'closed'; -- closed, open, half_open
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS circuit_failure_count INT NOT NULL DEFAULT 0;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS circuit_opened_at TIMESTAMPTZ;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS circuit_cooldown_sec INT NOT NULL DEFAULT 300;

-- Health monitoring
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS health_check_url TEXT;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS health_check_interval_sec INT NOT NULL DEFAULT 60;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS maintenance_until TIMESTAMPTZ;

-- Postback configuration per broker
CREATE TABLE IF NOT EXISTS broker_postback_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    verification_type VARCHAR(20) NOT NULL DEFAULT 'none', -- none, hmac, ip_whitelist
    hmac_secret VARCHAR(255),
    hmac_algorithm VARCHAR(20) DEFAULT 'sha256', -- sha256, sha512, md5
    hmac_header VARCHAR(100) DEFAULT 'X-Signature',
    allowed_ips INET[],
    status_mapping JSONB NOT NULL DEFAULT '{}', -- {"broker_status": "our_status"}
    variable_template JSONB NOT NULL DEFAULT '{}', -- variable substitution config
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(broker_id)
);
CREATE INDEX idx_postback_config_broker ON broker_postback_configs(broker_id);

ALTER TABLE broker_postback_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_postback_config ON broker_postback_configs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Postback log for incoming broker postbacks
CREATE TABLE IF NOT EXISTS broker_postback_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    broker_id UUID NOT NULL,
    lead_id UUID,
    raw_payload JSONB NOT NULL,
    parsed_status VARCHAR(100),
    mapped_status VARCHAR(100),
    verification_result VARCHAR(50), -- passed, failed, skipped
    processing_result VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, failed, ignored
    error TEXT,
    source_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_postback_log_tenant ON broker_postback_log(tenant_id, created_at DESC);
CREATE INDEX idx_postback_log_broker ON broker_postback_log(broker_id, created_at DESC);
CREATE INDEX idx_postback_log_lead ON broker_postback_log(lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE broker_postback_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_postback_log ON broker_postback_log
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================================
-- EPIC-08: Autologin & Proxy Pipeline enhancements
-- ============================================================

-- Device fingerprint pool
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    profile_name VARCHAR(255) NOT NULL,
    webgl_renderer VARCHAR(500),
    canvas_hash VARCHAR(64),
    user_agent TEXT NOT NULL,
    timezone VARCHAR(100),
    screen_width INT,
    screen_height INT,
    language VARCHAR(20),
    platform VARCHAR(100),
    plugins JSONB DEFAULT '[]',
    usage_count_24h INT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fingerprints_tenant ON device_fingerprints(tenant_id, is_active);
CREATE INDEX idx_fingerprints_usage ON device_fingerprints(usage_count_24h) WHERE is_active = true;

ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fingerprints ON device_fingerprints
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Proxy pool
CREATE TABLE IF NOT EXISTS proxy_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    proxy_type VARCHAR(20) NOT NULL, -- residential, datacenter, mobile
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    username VARCHAR(255),
    password_enc BYTEA,
    country VARCHAR(3),
    city VARCHAR(100),
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    last_health_check TIMESTAMPTZ,
    latency_ms INT,
    concurrent_count INT NOT NULL DEFAULT 0,
    max_concurrent INT NOT NULL DEFAULT 5,
    failure_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_proxy_tenant ON proxy_pool(tenant_id, is_healthy);
CREATE INDEX idx_proxy_country ON proxy_pool(country, is_healthy) WHERE is_healthy = true;
CREATE INDEX idx_proxy_type ON proxy_pool(proxy_type, is_healthy) WHERE is_healthy = true;

ALTER TABLE proxy_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_proxy ON proxy_pool
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Extend autologin_sessions with pipeline detail
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS fingerprint_id UUID;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS proxy_id UUID;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS proxy_type VARCHAR(20);
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS proxy_country VARCHAR(3);
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS max_retries INT NOT NULL DEFAULT 2;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS retry_delay_ms INT NOT NULL DEFAULT 500;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS backoff_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.5;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS failover_broker_id UUID;
ALTER TABLE autologin_sessions ADD COLUMN IF NOT EXISTS failover_attempt INT NOT NULL DEFAULT 0;

-- Autologin per-broker config
CREATE TABLE IF NOT EXISTS broker_autologin_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    autologin_type VARCHAR(20) NOT NULL DEFAULT 'redirect', -- redirect, api, iframe
    url_template TEXT NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'GET',
    custom_headers JSONB DEFAULT '{}',
    auth_method VARCHAR(50) DEFAULT 'none',
    timeout_ms INT NOT NULL DEFAULT 8000,
    max_retries INT NOT NULL DEFAULT 2,
    retry_delay_ms INT NOT NULL DEFAULT 500,
    backoff_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(broker_id)
);
CREATE INDEX idx_autologin_config_broker ON broker_autologin_configs(broker_id);

ALTER TABLE broker_autologin_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_autologin_config ON broker_autologin_configs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Autologin failover chains
CREATE TABLE IF NOT EXISTS autologin_failover_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    rule_id UUID NOT NULL REFERENCES distribution_rules(id),
    primary_broker_id UUID NOT NULL REFERENCES brokers(id),
    backup_broker_id UUID NOT NULL REFERENCES brokers(id),
    priority INT NOT NULL DEFAULT 0,
    condition_type VARCHAR(50) NOT NULL DEFAULT 'any_failure', -- any_failure, timeout, error_codes
    condition_value JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(rule_id, primary_broker_id, backup_broker_id)
);
CREATE INDEX idx_failover_rule ON autologin_failover_chains(rule_id, primary_broker_id);

ALTER TABLE autologin_failover_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_failover ON autologin_failover_chains
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Autologin anomaly log
CREATE TABLE IF NOT EXISTS autologin_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    session_id UUID NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL, -- device_reuse, geo_mismatch, ip_velocity
    severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- info, warning, critical
    details JSONB NOT NULL DEFAULT '{}',
    action_taken VARCHAR(50) NOT NULL DEFAULT 'log_only', -- log_only, pause_pipeline, block_lead, notify_admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_anomalies_tenant ON autologin_anomalies(tenant_id, created_at DESC);
CREATE INDEX idx_anomalies_type ON autologin_anomalies(anomaly_type, created_at DESC);

ALTER TABLE autologin_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_anomalies ON autologin_anomalies
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Autologin SLA monthly snapshots
CREATE TABLE IF NOT EXISTS autologin_sla_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    month DATE NOT NULL,
    total_attempts INT NOT NULL DEFAULT 0,
    successful INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    sla_percent DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    avg_latency_ms INT,
    p95_latency_ms INT,
    breakdown_by_broker JSONB DEFAULT '{}',
    breakdown_by_geo JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, month)
);

ALTER TABLE autologin_sla_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sla ON autologin_sla_snapshots
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================================
-- EPIC-12: Conversions & P&L enhancements
-- ============================================================

-- Pricing rules (buy price / sell price hierarchies)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    rule_type VARCHAR(20) NOT NULL, -- buy, sell
    affiliate_id UUID REFERENCES affiliates(id),
    broker_id UUID REFERENCES brokers(id),
    country VARCHAR(3),
    funnel_name VARCHAR(255),
    deal_type VARCHAR(50),
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    priority INT NOT NULL DEFAULT 0, -- higher = more specific
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pricing_tenant ON pricing_rules(tenant_id, rule_type);
CREATE INDEX idx_pricing_affiliate ON pricing_rules(affiliate_id) WHERE affiliate_id IS NOT NULL;
CREATE INDEX idx_pricing_broker ON pricing_rules(broker_id) WHERE broker_id IS NOT NULL;

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_pricing ON pricing_rules
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Extend conversions table with reconciliation fields
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS broker_transaction_id VARCHAR(255);
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50) DEFAULT 'pending'; -- pending, matched, mismatch, disputed
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS is_fake BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS fake_reason VARCHAR(255);
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS fake_action VARCHAR(50); -- fire_postback, charge_client, accept
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_broker_txn ON conversions(tenant_id, broker_transaction_id) WHERE broker_transaction_id IS NOT NULL;

-- Reconciliation sessions
CREATE TABLE IF NOT EXISTS reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    filename VARCHAR(500),
    period_from DATE,
    period_to DATE,
    total_rows INT NOT NULL DEFAULT 0,
    matched INT NOT NULL DEFAULT 0,
    amount_mismatch INT NOT NULL DEFAULT 0,
    missing_ours INT NOT NULL DEFAULT 0,
    missing_theirs INT NOT NULL DEFAULT 0,
    match_percent DECIMAL(5,2),
    status VARCHAR(50) NOT NULL DEFAULT 'processing', -- processing, completed, failed
    uploaded_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reconciliation_tenant ON reconciliation_sessions(tenant_id, created_at DESC);

ALTER TABLE reconciliation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_reconciliation ON reconciliation_sessions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Reconciliation line items
CREATE TABLE IF NOT EXISTS reconciliation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES reconciliation_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    conversion_id UUID REFERENCES conversions(id),
    broker_transaction_id VARCHAR(255),
    our_amount DECIMAL(12,2),
    their_amount DECIMAL(12,2),
    discrepancy_type VARCHAR(50) NOT NULL, -- matched, amount_mismatch, missing_ours, missing_theirs
    resolution VARCHAR(50), -- accept_theirs, accept_ours, dispute, ignore
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_recon_items_session ON reconciliation_items(session_id);

ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recon_items ON reconciliation_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Virtual wallets per broker
CREATE TABLE IF NOT EXISTS broker_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    balance DECIMAL(14,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    alert_threshold DECIMAL(14,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, broker_id)
);

ALTER TABLE broker_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_wallets ON broker_wallets
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES broker_wallets(id),
    tenant_id UUID NOT NULL,
    txn_type VARCHAR(50) NOT NULL, -- deposit, withdrawal, adjustment, fee
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- conversion_id, payout_id, etc
    reference_type VARCHAR(50), -- conversion, payout, adjustment
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wallet_txn_wallet ON wallet_transactions(wallet_id, created_at DESC);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_wallet_txn ON wallet_transactions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Affiliate payouts
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, approved, paid
    period_from DATE,
    period_to DATE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payouts_tenant ON affiliate_payouts(tenant_id, created_at DESC);
CREATE INDEX idx_payouts_affiliate ON affiliate_payouts(affiliate_id, status);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payouts ON affiliate_payouts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================================
-- EPIC-16: Integration Marketplace enhancements
-- ============================================================

-- Community-submitted integration templates
CREATE TABLE IF NOT EXISTS marketplace_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES broker_templates(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    author_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, under_review, approved, rejected
    rejection_reason TEXT,
    readme TEXT,
    logo_url TEXT,
    countries TEXT[],
    verticals TEXT[],
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_submissions_status ON marketplace_submissions(status);
CREATE INDEX idx_submissions_author ON marketplace_submissions(author_user_id);

ALTER TABLE marketplace_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_submissions ON marketplace_submissions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Template ratings & reviews
CREATE TABLE IF NOT EXISTS template_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES broker_templates(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    review_text VARCHAR(500),
    upvotes INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);
CREATE INDEX idx_reviews_template ON template_reviews(template_id, created_at DESC);

ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_reviews ON template_reviews
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Template version history
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES broker_templates(id) ON DELETE CASCADE,
    version INT NOT NULL,
    changelog TEXT,
    config_snapshot JSONB NOT NULL, -- full template config at this version
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, version)
);
CREATE INDEX idx_template_versions ON template_versions(template_id, version DESC);

-- Installed integrations per tenant
CREATE TABLE IF NOT EXISTS installed_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template_id UUID NOT NULL REFERENCES broker_templates(id),
    broker_id UUID REFERENCES brokers(id),
    installed_version INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, disabled, update_available
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, template_id)
);
CREATE INDEX idx_installed_tenant ON installed_integrations(tenant_id);

ALTER TABLE installed_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_installed ON installed_integrations
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Update broker_templates install_count trigger
CREATE OR REPLACE FUNCTION update_template_install_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE broker_templates SET install_count = COALESCE(install_count, 0) + 1 WHERE id = NEW.template_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE broker_templates SET install_count = GREATEST(COALESCE(install_count, 0) - 1, 0) WHERE id = OLD.template_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_install_count
    AFTER INSERT OR DELETE ON installed_integrations
    FOR EACH ROW EXECUTE FUNCTION update_template_install_count();

-- Update broker_templates average rating trigger
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE broker_templates SET rating = (
        SELECT COALESCE(AVG(rating), 0) FROM template_reviews
        WHERE template_id = COALESCE(NEW.template_id, OLD.template_id) AND is_visible = true
    ) WHERE id = COALESCE(NEW.template_id, OLD.template_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_template_rating
    AFTER INSERT OR UPDATE OR DELETE ON template_reviews
    FOR EACH ROW EXECUTE FUNCTION update_template_rating();
