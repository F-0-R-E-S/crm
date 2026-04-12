-- AI Assistant schema
-- Sessions, messages, and action audit log for the assistant-svc

CREATE TABLE assistant_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL DEFAULT 'New conversation',
    model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    total_input_tokens BIGINT DEFAULT 0,
    total_output_tokens BIGINT DEFAULT 0,
    message_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assistant_sessions_tenant ON assistant_sessions(tenant_id, created_at DESC);
CREATE INDEX idx_assistant_sessions_user ON assistant_sessions(tenant_id, user_id, created_at DESC);

CREATE TABLE assistant_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tool_name VARCHAR(100),
    tool_input JSONB,
    tool_result JSONB,
    input_tokens INT,
    output_tokens INT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assistant_messages_session ON assistant_messages(session_id, created_at ASC);
CREATE INDEX idx_assistant_messages_tenant ON assistant_messages(tenant_id, created_at DESC);

CREATE TABLE assistant_action_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES assistant_sessions(id),
    message_id UUID NOT NULL REFERENCES assistant_messages(id),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    tool_input JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    result JSONB,
    previous_state JSONB,
    rollback_id UUID,
    confirmation_token VARCHAR(255),
    execution_duration_ms INT,
    llm_reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assistant_action_log_session ON assistant_action_log(session_id, created_at DESC);
CREATE INDEX idx_assistant_action_log_tenant ON assistant_action_log(tenant_id, created_at DESC);
CREATE INDEX idx_assistant_action_log_status ON assistant_action_log(tenant_id, status);

-- Row Level Security
ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_assistant_sessions ON assistant_sessions USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_assistant_messages ON assistant_messages USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY tenant_isolation_assistant_action_log ON assistant_action_log USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Updated_at trigger
CREATE TRIGGER trg_assistant_sessions_updated_at BEFORE UPDATE ON assistant_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
