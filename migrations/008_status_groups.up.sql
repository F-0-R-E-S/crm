-- GambChamp CRM - Status Groups & Anomaly Detection
-- Unified status taxonomy, broker status mappings, anomaly rules

-- Status groups
CREATE TABLE status_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    rank INT NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6b7280',
    icon VARCHAR(50),
    is_terminal BOOLEAN DEFAULT false,
    is_negative BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

ALTER TABLE status_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_status_groups ON status_groups
    USING (tenant_id = current_setting('app.tenant_id')::uuid OR tenant_id IS NULL);

-- Seed system-default status groups (tenant_id IS NULL)
INSERT INTO status_groups (id, tenant_id, name, slug, rank, color, is_terminal, is_negative, is_system) VALUES
    (uuid_generate_v4(), NULL, 'New',            'new',        1,  '#3b82f6', false, false, true),
    (uuid_generate_v4(), NULL, 'Processing',     'processing', 2,  '#f59e0b', false, false, true),
    (uuid_generate_v4(), NULL, 'Callback',       'callback',   3,  '#8b5cf6', false, false, true),
    (uuid_generate_v4(), NULL, 'No Answer',      'no_answer',  4,  '#6b7280', false, false, true),
    (uuid_generate_v4(), NULL, 'Contacted',      'contacted',  5,  '#06b6d4', false, false, true),
    (uuid_generate_v4(), NULL, 'Active',         'active',     6,  '#22c55e', false, false, true),
    (uuid_generate_v4(), NULL, 'Deposited (FTD)','ftd',        7,  '#10b981', false, false, true),
    (uuid_generate_v4(), NULL, 'Converted',      'converted',  8,  '#059669', true,  false, true),
    (uuid_generate_v4(), NULL, 'Rejected',       'rejected',   -1, '#ef4444', true,  true,  true),
    (uuid_generate_v4(), NULL, 'Duplicate',      'duplicate',  -1, '#f97316', true,  true,  true),
    (uuid_generate_v4(), NULL, 'Wrong Info',     'wrong_info', -1, '#dc2626', true,  true,  true),
    (uuid_generate_v4(), NULL, 'Test',           'test',       0,  '#9ca3af', true,  false, true);

-- Broker status mappings
CREATE TABLE broker_status_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    broker_id UUID NOT NULL REFERENCES brokers(id),
    raw_status VARCHAR(255) NOT NULL,
    status_group_slug VARCHAR(50) NOT NULL,
    auto_mapped BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, broker_id, raw_status)
);

ALTER TABLE broker_status_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_broker_status_mappings ON broker_status_mappings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Status anomaly rules
CREATE TABLE status_anomaly_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('regression', 'velocity', 'stuck', 'pattern')),
    conditions JSONB NOT NULL DEFAULT '{}',
    alert_channel VARCHAR(50) DEFAULT 'in_app',
    severity VARCHAR(20) DEFAULT 'warning',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE status_anomaly_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_status_anomaly_rules ON status_anomaly_rules
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Status anomalies
CREATE TABLE status_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    rule_id UUID REFERENCES status_anomaly_rules(id),
    broker_id UUID,
    affiliate_id UUID,
    lead_id UUID,
    anomaly_type VARCHAR(50) NOT NULL,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'warning',
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_status_anomalies_detected ON status_anomalies(tenant_id, detected_at DESC);
CREATE INDEX idx_status_anomalies_unresolved ON status_anomalies(tenant_id, resolved) WHERE resolved = false;

ALTER TABLE status_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_status_anomalies ON status_anomalies
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Updated_at triggers
CREATE TRIGGER trg_status_groups_updated_at BEFORE UPDATE ON status_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_status_anomaly_rules_updated_at BEFORE UPDATE ON status_anomaly_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
