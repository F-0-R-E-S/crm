-- EPIC-06: RBAC enhancements, session management, user invites, password resets

-- Enhanced sessions table (replaces refresh_tokens for session tracking)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip INET,
    user_agent TEXT,
    device_name VARCHAR(255),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at) WHERE expires_at > NOW();

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sessions ON sessions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- User invitations
CREATE TABLE user_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_invites_tenant ON user_invites(tenant_id);
CREATE INDEX idx_user_invites_token ON user_invites(token_hash);
CREATE UNIQUE INDEX idx_user_invites_pending ON user_invites(tenant_id, email)
    WHERE accepted_at IS NULL AND expires_at > NOW();

ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_user_invites ON user_invites
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Password reset tokens
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_resets_token ON password_resets(token_hash);

-- Add custom_permissions override to users (JSONB array of extra permissions)
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT NULL;
