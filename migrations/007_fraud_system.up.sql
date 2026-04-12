-- GambChamp CRM - Fraud System
-- Blacklists, fraud check results, shave detection

-- Blacklists
CREATE TABLE blacklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    list_type VARCHAR(20) NOT NULL CHECK (list_type IN ('ip', 'email', 'phone', 'domain')),
    value TEXT NOT NULL,
    pattern TEXT,
    reason TEXT,
    source VARCHAR(50) DEFAULT 'manual',
    expires_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blacklists_tenant_type_value ON blacklists(tenant_id, list_type, value);
CREATE INDEX idx_blacklists_tenant_expires ON blacklists(tenant_id, expires_at) WHERE expires_at IS NOT NULL;

ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_blacklists ON blacklists USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Fraud check results
CREATE TABLE fraud_check_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    overall_score SMALLINT NOT NULL,
    verdict VARCHAR(20) NOT NULL,
    checks JSONB NOT NULL DEFAULT '[]',
    ip_data JSONB,
    phone_data JSONB,
    profile_id UUID,
    checked_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_check_results_lead ON fraud_check_results(tenant_id, lead_id);
CREATE INDEX idx_fraud_check_results_verdict ON fraud_check_results(tenant_id, verdict, checked_at DESC);
CREATE INDEX idx_fraud_check_results_score ON fraud_check_results(tenant_id, overall_score);

ALTER TABLE fraud_check_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fraud_check_results ON fraud_check_results USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Shave events
CREATE TABLE shave_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    broker_id UUID NOT NULL,
    affiliate_id UUID,
    old_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    old_rank INT,
    new_rank INT,
    raw_status TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_shave_events_detected ON shave_events(tenant_id, detected_at DESC);
CREATE INDEX idx_shave_events_broker ON shave_events(tenant_id, broker_id, detected_at DESC);
CREATE INDEX idx_shave_events_unacknowledged ON shave_events(tenant_id, acknowledged) WHERE acknowledged = false;

ALTER TABLE shave_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_shave_events ON shave_events USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Alter fraud_profiles: add new check columns and preset
ALTER TABLE fraud_profiles ADD COLUMN blacklist_check_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE fraud_profiles ADD COLUMN vpn_check_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE fraud_profiles ADD COLUMN voip_check_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fraud_profiles ADD COLUMN bot_check_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fraud_profiles ADD COLUMN preset_name VARCHAR(50) DEFAULT 'standard';
ALTER TABLE fraud_profiles ADD COLUMN geo_overrides JSONB DEFAULT '[]';

-- Alter leads: add fraud verdict and score
ALTER TABLE leads ADD COLUMN fraud_verdict VARCHAR(20);
ALTER TABLE leads ADD COLUMN fraud_score SMALLINT;

CREATE INDEX idx_leads_fraud_verdict ON leads(tenant_id, fraud_verdict);

-- Updated_at triggers
CREATE TRIGGER trg_blacklists_updated_at BEFORE UPDATE ON blacklists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
