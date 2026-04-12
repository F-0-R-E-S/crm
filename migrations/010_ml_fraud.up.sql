-- GambChamp CRM - ML Fraud & Intelligence
-- ML models, behavioral events, fraud intelligence pool, experiments, velocity rules

-- ML fraud models (global, no tenant)
CREATE TABLE ml_fraud_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_type VARCHAR(50) NOT NULL,
    version INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'training' CHECK (status IN ('training', 'evaluating', 'active', 'retired')),
    metrics JSONB,
    feature_importance JSONB,
    model_path TEXT,
    trained_on_rows INT,
    trained_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Behavioral events (partitioned by month)
CREATE TABLE behavioral_events (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    lead_id UUID,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    client_ts TIMESTAMPTZ,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_behavioral_events_session ON behavioral_events(tenant_id, session_id);
CREATE INDEX idx_behavioral_events_lead ON behavioral_events(lead_id) WHERE lead_id IS NOT NULL;

-- Create monthly partitions for 2026
CREATE TABLE behavioral_events_2026_01 PARTITION OF behavioral_events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE behavioral_events_2026_02 PARTITION OF behavioral_events FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE behavioral_events_2026_03 PARTITION OF behavioral_events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE behavioral_events_2026_04 PARTITION OF behavioral_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE behavioral_events_2026_05 PARTITION OF behavioral_events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE behavioral_events_2026_06 PARTITION OF behavioral_events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE behavioral_events_2026_07 PARTITION OF behavioral_events FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE behavioral_events_2026_08 PARTITION OF behavioral_events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE behavioral_events_2026_09 PARTITION OF behavioral_events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE behavioral_events_2026_10 PARTITION OF behavioral_events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE behavioral_events_2026_11 PARTITION OF behavioral_events FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE behavioral_events_2026_12 PARTITION OF behavioral_events FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

ALTER TABLE behavioral_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_behavioral_events ON behavioral_events
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Fraud intelligence pool (shared across tenants, no RLS)
CREATE TABLE fraud_intelligence_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contributor_tenant_id UUID,
    entry_type VARCHAR(50) NOT NULL,
    hashed_value TEXT NOT NULL,
    risk_score SMALLINT NOT NULL,
    confidence FLOAT,
    reports_count INT DEFAULT 1,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entry_type, hashed_value)
);

CREATE INDEX idx_fraud_intel_type_value ON fraud_intelligence_pool(entry_type, hashed_value);
CREATE INDEX idx_fraud_intel_risk ON fraud_intelligence_pool(risk_score DESC);

-- Fraud rule experiments
CREATE TABLE fraud_rule_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    control_config JSONB NOT NULL,
    variant_config JSONB NOT NULL,
    traffic_split FLOAT NOT NULL DEFAULT 0.1,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
    results JSONB,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fraud_rule_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fraud_rule_experiments ON fraud_rule_experiments
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Velocity rules
CREATE TABLE velocity_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    dimension VARCHAR(50) NOT NULL CHECK (dimension IN ('ip', 'email_domain', 'phone_prefix', 'affiliate', 'geo', 'device')),
    max_count INT NOT NULL,
    time_window_seconds INT NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'flag' CHECK (action IN ('block', 'flag', 'reduce_score', 'notify')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE velocity_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_velocity_rules ON velocity_rules
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Updated_at triggers
CREATE TRIGGER trg_fraud_rule_experiments_updated_at BEFORE UPDATE ON fraud_rule_experiments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_velocity_rules_updated_at BEFORE UPDATE ON velocity_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
