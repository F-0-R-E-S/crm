-- ClickHouse Analytics Schema (applied separately to ClickHouse)
-- Reference file - not executed against PostgreSQL

CREATE DATABASE IF NOT EXISTS gambchamp;

CREATE TABLE gambchamp.lead_events_analytics (
    event_id UUID,
    tenant_id UUID,
    lead_id UUID,
    affiliate_id UUID,
    broker_id Nullable(UUID),
    event_type LowCardinality(String),
    country LowCardinality(String),
    status LowCardinality(String),
    quality_score UInt8,
    fraud_score UInt8,
    response_time_ms UInt32,
    is_fraud UInt8,
    is_duplicate UInt8,
    revenue Decimal(10, 2),
    cost Decimal(10, 2),
    created_at DateTime64(3, 'UTC'),
    event_date Date MATERIALIZED toDate(created_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (tenant_id, created_at, lead_id)
TTL created_at + INTERVAL 2 YEAR;

CREATE TABLE gambchamp.cap_utilization (
    tenant_id UUID,
    broker_id UUID,
    rule_id Nullable(UUID),
    country LowCardinality(String),
    cap_type LowCardinality(String),
    cap_limit UInt32,
    cap_used UInt32,
    utilization_pct Float32,
    snapshot_at DateTime64(3, 'UTC'),
    snapshot_date Date MATERIALIZED toDate(snapshot_at)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(snapshot_at)
ORDER BY (tenant_id, snapshot_at, broker_id)
TTL snapshot_at + INTERVAL 1 YEAR;

CREATE TABLE gambchamp.autologin_metrics (
    tenant_id UUID,
    session_id UUID,
    lead_id UUID,
    broker_id UUID,
    device_id String,
    stage LowCardinality(String),
    success UInt8,
    duration_ms UInt32,
    error_type Nullable(String),
    created_at DateTime64(3, 'UTC')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (tenant_id, created_at)
TTL created_at + INTERVAL 1 YEAR;
