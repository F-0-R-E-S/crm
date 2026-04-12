-- GambChamp CRM - Compliance & Security
-- IP whitelist, GDPR, consent records, encryption key management

-- IP whitelist
CREATE TABLE ip_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ip_range CIDR NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ip_whitelist_tenant_active ON ip_whitelist(tenant_id, is_active);

ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_ip_whitelist ON ip_whitelist
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- GDPR requests
CREATE TABLE gdpr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('erasure', 'portability', 'access', 'rectification')),
    subject_email VARCHAR(255) NOT NULL,
    subject_data JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    completed_at TIMESTAMPTZ,
    requested_by UUID,
    processed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gdpr_requests_status ON gdpr_requests(tenant_id, status);
CREATE INDEX idx_gdpr_requests_email ON gdpr_requests(tenant_id, subject_email);

ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_gdpr_requests ON gdpr_requests
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Consent records
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    ip INET,
    user_agent TEXT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_consent_records_lead ON consent_records(tenant_id, lead_id);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_consent_records ON consent_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Encryption keys (may be system-wide, no RLS)
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    key_purpose VARCHAR(50) NOT NULL,
    key_version INT NOT NULL DEFAULT 1,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    key_reference TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    rotated_at TIMESTAMPTZ,
    next_rotation_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_encryption_keys_purpose ON encryption_keys(tenant_id, key_purpose, is_active);

-- Alter audit_log: add tracking columns
ALTER TABLE audit_log ADD COLUMN request_id UUID;
ALTER TABLE audit_log ADD COLUMN session_id UUID;
ALTER TABLE audit_log ADD COLUMN changes JSONB;
ALTER TABLE audit_log ADD COLUMN duration_ms INT;

-- Updated_at triggers
CREATE TRIGGER trg_gdpr_requests_updated_at BEFORE UPDATE ON gdpr_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
