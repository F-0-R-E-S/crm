-- UAD Scenarios table for automated lead redistribution (EPIC-09)
CREATE TABLE uad_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    mode VARCHAR(50) NOT NULL DEFAULT 'batch', -- batch, continuous, scheduled
    schedule JSONB DEFAULT '{}',       -- cron-like: {"timezone":"UTC","days":["MON"],"times":["09:00","18:00"]}
    batch_size INT NOT NULL DEFAULT 100,
    throttle_per_min INT NOT NULL DEFAULT 50,
    max_attempts INT NOT NULL DEFAULT 3,
    source_filters JSONB DEFAULT '{}', -- {"statuses":["rejected","no_answer"],"countries":["US"],"age_days_max":30,"brokers":["uuid"]}
    target_brokers JSONB DEFAULT '[]', -- [{"broker_id":"uuid","weight":50}]
    overflow_pool JSONB DEFAULT '[]',  -- fallback broker list for cold leads
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_uad_scenarios_tenant ON uad_scenarios(tenant_id, is_active);

-- Add scenario_id reference to uad_queue
ALTER TABLE uad_queue ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES uad_scenarios(id);
ALTER TABLE uad_queue ADD COLUMN IF NOT EXISTS target_broker_id UUID;
ALTER TABLE uad_queue ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE uad_queue ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_uad_queue_scenario ON uad_queue(scenario_id, status);

ALTER TABLE uad_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_uad_scenarios ON uad_scenarios USING (tenant_id = current_setting('app.tenant_id')::uuid);
