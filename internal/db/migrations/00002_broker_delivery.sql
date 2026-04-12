-- 00002_broker_delivery.sql — Broker & Delivery stream (EPIC-03, 08, 12, 16)

CREATE TABLE broker_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  method          VARCHAR(10) NOT NULL DEFAULT 'POST',
  url_template    TEXT NOT NULL,
  headers         JSONB DEFAULT '{}',
  body_template   JSONB NOT NULL,
  auth_type       VARCHAR(50) NOT NULL DEFAULT 'api_key',
  response_mapping JSONB NOT NULL DEFAULT '{}',
  postback_config JSONB,
  is_public       BOOLEAN NOT NULL DEFAULT true,
  category        VARCHAR(100) DEFAULT 'general',
  description     TEXT,
  rating          DECIMAL(3,2) DEFAULT 0,
  install_count   INT DEFAULT 0,
  author          VARCHAR(255),
  tags            TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, version)
);

CREATE TABLE brokers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id),
  name                  VARCHAR(255) NOT NULL,
  status                VARCHAR(50) NOT NULL DEFAULT 'active',
  template_id           UUID REFERENCES broker_templates(id),
  endpoint              TEXT NOT NULL,
  credentials_enc       BYTEA,
  field_mapping         JSONB DEFAULT '{}',
  daily_cap             INT NOT NULL DEFAULT 0,
  total_cap             INT NOT NULL DEFAULT 0,
  country_caps          JSONB DEFAULT '{}',
  priority              INT NOT NULL DEFAULT 0,
  health_status         VARCHAR(50) NOT NULL DEFAULT 'healthy',
  last_health_check     TIMESTAMPTZ,
  opening_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  funnel_fallback       VARCHAR(50) NOT NULL DEFAULT 'use_original',
  default_funnel_name   VARCHAR(255),
  test_mode             BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  cloned_from           UUID,
  circuit_state         VARCHAR(20) NOT NULL DEFAULT 'closed',
  circuit_failure_count INT NOT NULL DEFAULT 0,
  circuit_opened_at     TIMESTAMPTZ,
  circuit_cooldown_sec  INT NOT NULL DEFAULT 300,
  health_check_url      TEXT,
  health_check_interval INT NOT NULL DEFAULT 60,
  maintenance_mode      BOOLEAN NOT NULL DEFAULT false,
  maintenance_until     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brokers_company ON brokers(company_id);
CREATE INDEX idx_brokers_status ON brokers(company_id, status);

CREATE TABLE broker_opening_hours (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id   UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TIME NOT NULL,
  close_time  TIME NOT NULL,
  timezone    VARCHAR(50) NOT NULL DEFAULT 'UTC',
  is_enabled  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(broker_id, day_of_week)
);

CREATE TABLE broker_funnel_mappings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id     UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  company_id    UUID NOT NULL REFERENCES companies(id),
  source_funnel VARCHAR(255) NOT NULL,
  target_funnel VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(broker_id, source_funnel)
);

CREATE TABLE broker_postback_configs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id          UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE UNIQUE,
  company_id         UUID NOT NULL REFERENCES companies(id),
  is_enabled         BOOLEAN NOT NULL DEFAULT true,
  verification_type  VARCHAR(20) NOT NULL DEFAULT 'none',
  hmac_secret        VARCHAR(255),
  hmac_algorithm     VARCHAR(20) DEFAULT 'sha256',
  hmac_header        VARCHAR(100) DEFAULT 'X-Signature',
  allowed_ips        TEXT[],
  status_mapping     JSONB NOT NULL DEFAULT '{}',
  variable_template  JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE broker_postback_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL,
  broker_id           UUID NOT NULL,
  lead_id             UUID,
  raw_payload         JSONB NOT NULL,
  parsed_status       VARCHAR(100),
  mapped_status       VARCHAR(100),
  verification_result VARCHAR(50),
  processing_result   VARCHAR(50) NOT NULL DEFAULT 'pending',
  error               TEXT,
  source_ip           VARCHAR(45),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_postback_log_broker ON broker_postback_log(broker_id, created_at DESC);

CREATE TABLE lead_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL,
  company_id    UUID NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  broker_id     UUID,
  request_body  JSONB,
  response_body JSONB,
  status_code   SMALLINT,
  duration_ms   INT,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_events_lead ON lead_events(lead_id, created_at DESC);

CREATE TABLE distribution_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            VARCHAR(255) NOT NULL,
  priority        INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  conditions      JSONB NOT NULL DEFAULT '{}',
  broker_targets  JSONB NOT NULL DEFAULT '[]',
  algorithm       VARCHAR(50) NOT NULL DEFAULT 'weighted_round_robin',
  daily_cap       INT NOT NULL DEFAULT 0,
  total_cap       INT NOT NULL DEFAULT 0,
  country_caps    JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EPIC-12: Conversions & P&L
CREATE TABLE conversions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL,
  lead_id               UUID NOT NULL,
  broker_id             UUID NOT NULL,
  affiliate_id          UUID,
  conversion_type       VARCHAR(50) NOT NULL DEFAULT 'ftd',
  amount                DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency              VARCHAR(3) NOT NULL DEFAULT 'USD',
  buy_price             DECIMAL(12,2) DEFAULT 0,
  sell_price            DECIMAL(12,2) DEFAULT 0,
  profit                DECIMAL(12,2) GENERATED ALWAYS AS (sell_price - buy_price) STORED,
  status                VARCHAR(50) NOT NULL DEFAULT 'pending',
  broker_transaction_id VARCHAR(255),
  external_id           VARCHAR(255),
  reconciliation_status VARCHAR(50) DEFAULT 'pending',
  is_fake               BOOLEAN NOT NULL DEFAULT false,
  fake_reason           VARCHAR(255),
  fake_action           VARCHAR(50),
  metadata              JSONB DEFAULT '{}',
  converted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversions_company ON conversions(company_id, converted_at DESC);
CREATE INDEX idx_conversions_lead ON conversions(lead_id);
CREATE INDEX idx_conversions_broker ON conversions(broker_id, converted_at DESC);

CREATE TABLE pricing_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  rule_type     VARCHAR(20) NOT NULL,
  affiliate_id  UUID,
  broker_id     UUID,
  country       VARCHAR(3),
  funnel_name   VARCHAR(255),
  deal_type     VARCHAR(50),
  price         DECIMAL(12,2) NOT NULL,
  currency      VARCHAR(3) NOT NULL DEFAULT 'USD',
  priority      INT NOT NULL DEFAULT 0,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE broker_wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  broker_id       UUID NOT NULL REFERENCES brokers(id),
  balance         DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  alert_threshold DECIMAL(14,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, broker_id)
);

CREATE TABLE wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID NOT NULL REFERENCES broker_wallets(id),
  company_id     UUID NOT NULL,
  txn_type       VARCHAR(50) NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  description    TEXT,
  reference_id   UUID,
  reference_type VARCHAR(50),
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  affiliate_id      UUID NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method    VARCHAR(100),
  payment_reference VARCHAR(255),
  status            VARCHAR(50) NOT NULL DEFAULT 'draft',
  period_from       DATE,
  period_to         DATE,
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reconciliation_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  broker_id       UUID NOT NULL REFERENCES brokers(id),
  filename        VARCHAR(500),
  period_from     DATE,
  period_to       DATE,
  total_rows      INT NOT NULL DEFAULT 0,
  matched         INT NOT NULL DEFAULT 0,
  amount_mismatch INT NOT NULL DEFAULT 0,
  missing_ours    INT NOT NULL DEFAULT 0,
  missing_theirs  INT NOT NULL DEFAULT 0,
  match_percent   DECIMAL(5,2),
  status          VARCHAR(50) NOT NULL DEFAULT 'processing',
  uploaded_by     UUID,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EPIC-16: Marketplace
CREATE TABLE template_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES broker_templates(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES companies(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  rating      DECIMAL(2,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  review_text VARCHAR(500),
  upvotes     INT NOT NULL DEFAULT 0,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

CREATE TABLE template_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES broker_templates(id) ON DELETE CASCADE,
  version         INT NOT NULL,
  changelog       TEXT,
  config_snapshot JSONB NOT NULL,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

CREATE TABLE installed_integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  template_id       UUID NOT NULL REFERENCES broker_templates(id),
  broker_id         UUID REFERENCES brokers(id),
  installed_version INT NOT NULL,
  status            VARCHAR(50) NOT NULL DEFAULT 'active',
  installed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, template_id)
);

CREATE TABLE marketplace_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID REFERENCES broker_templates(id),
  company_id      UUID NOT NULL REFERENCES companies(id),
  author_user_id  UUID NOT NULL REFERENCES users(id),
  status          VARCHAR(50) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT,
  readme          TEXT,
  logo_url        TEXT,
  countries       TEXT[],
  verticals       TEXT[],
  submitted_at    TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
