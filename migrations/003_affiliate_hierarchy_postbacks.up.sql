-- EPIC-04: Affiliate hierarchy, sub-accounts, postback delivery queue

-- Add hierarchy support to affiliates
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES affiliates(id);
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS total_cap INT NOT NULL DEFAULT 0;
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS country_caps JSONB DEFAULT '{}';
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_affiliates_parent ON affiliates(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_affiliates_manager ON affiliates(tenant_id, manager_id) WHERE manager_id IS NOT NULL;

-- Postback delivery queue (async postback delivery with retries)
CREATE TABLE postback_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id),
    lead_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    last_error TEXT,
    last_status_code INT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_postback_pending ON postback_queue(next_attempt_at)
    WHERE status = 'pending';
CREATE INDEX idx_postback_tenant ON postback_queue(tenant_id, created_at DESC);
CREATE INDEX idx_postback_lead ON postback_queue(lead_id);

ALTER TABLE postback_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_postback ON postback_queue
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Affiliate API key rotation log
CREATE TABLE affiliate_api_key_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id),
    key_prefix VARCHAR(8) NOT NULL,
    action VARCHAR(50) NOT NULL,
    rotated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_key_log_affiliate ON affiliate_api_key_log(affiliate_id, created_at DESC);
