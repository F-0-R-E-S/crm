-- Streams 2-6: Platform, Broker, Fraud, Analytics, Scale
-- EPIC-06: RBAC enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- EPIC-04: Affiliate hierarchy and sub-accounts
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES affiliates(id);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'standard'; -- standard, silver, gold, platinum
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS tracking_domain VARCHAR(255);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS traffic_limits JSONB DEFAULT '{}';
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_affiliates_parent ON affiliates(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_affiliates_tier ON affiliates(tenant_id, tier);

-- EPIC-12: Conversions & P&L
CREATE TABLE IF NOT EXISTS conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    broker_id UUID NOT NULL,
    affiliate_id UUID,
    conversion_type VARCHAR(50) NOT NULL DEFAULT 'ftd', -- ftd, deposit, trade, revenue_share
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    buy_price DECIMAL(12,2) DEFAULT 0,
    sell_price DECIMAL(12,2) DEFAULT 0,
    profit DECIMAL(12,2) GENERATED ALWAYS AS (sell_price - buy_price) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, confirmed, rejected, chargeback
    external_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conversions_tenant ON conversions(tenant_id, converted_at DESC);
CREATE INDEX idx_conversions_lead ON conversions(lead_id);
CREATE INDEX idx_conversions_broker ON conversions(broker_id, converted_at DESC);
CREATE INDEX idx_conversions_affiliate ON conversions(affiliate_id, converted_at DESC);

ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversions ON conversions USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- EPIC-16: Marketplace
ALTER TABLE broker_templates ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';
ALTER TABLE broker_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE broker_templates ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE broker_templates ADD COLUMN IF NOT EXISTS install_count INT DEFAULT 0;
ALTER TABLE broker_templates ADD COLUMN IF NOT EXISTS author VARCHAR(255);
ALTER TABLE broker_templates ADD COLUMN IF NOT EXISTS tags TEXT[];

-- EPIC-22: Compliance & Audit
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    check_type VARCHAR(100) NOT NULL, -- gdpr_consent, data_retention, encryption_audit, access_review
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, passed, failed, waived
    details JSONB DEFAULT '{}',
    checked_by UUID,
    checked_at TIMESTAMPTZ,
    next_check_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_compliance_tenant ON compliance_checks(tenant_id, check_type);

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_compliance ON compliance_checks USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- EPIC-21: Billing
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}', -- max_leads_month, max_brokers, max_users
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL UNIQUE,
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- trial, active, past_due, canceled
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_subscriptions ON subscriptions USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Seed billing plans
INSERT INTO billing_plans (name, slug, price_monthly, price_yearly, features, limits) VALUES
('Starter', 'starter', 399, 3990, '{"support_sla":"24h","anti_fraud":true,"analytics":"basic"}', '{"max_leads_month":10000,"max_brokers":10,"max_users":5}'),
('Professional', 'professional', 699, 6990, '{"support_sla":"4h","anti_fraud":true,"analytics":"advanced","autologin":true,"uad":true}', '{"max_leads_month":50000,"max_brokers":50,"max_users":20}'),
('Enterprise', 'enterprise', 1199, 11990, '{"support_sla":"1h","anti_fraud":true,"analytics":"full","autologin":true,"uad":true,"ai_routing":true,"white_label":true}', '{"max_leads_month":-1,"max_brokers":-1,"max_users":-1}')
ON CONFLICT (slug) DO NOTHING;

-- EPIC-20: White-Label
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'; -- logo_url, primary_color, favicon, custom_domain
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID; -- reseller hierarchy
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id) WHERE parent_tenant_id IS NOT NULL;
