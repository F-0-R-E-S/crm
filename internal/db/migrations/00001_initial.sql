-- 00001_initial.sql — S01 schema

CREATE TABLE companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) UNIQUE NOT NULL,
  plan       VARCHAR(50) NOT NULL DEFAULT 'starter',
  status     VARCHAR(20) NOT NULL DEFAULT 'active',
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'buyer',
  name          VARCHAR(255),
  totp_secret   VARCHAR(64),
  totp_enabled  BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

CREATE TABLE affiliates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  name             VARCHAR(255) NOT NULL,
  api_key          VARCHAR(64) UNIQUE NOT NULL,
  email            VARCHAR(255),
  status           VARCHAR(20) NOT NULL DEFAULT 'active',
  settings         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id               UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL,
  affiliate_id     UUID NOT NULL,
  first_name       VARCHAR(100) NOT NULL,
  last_name        VARCHAR(100),
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(30) NOT NULL,
  phone_raw        VARCHAR(50),
  country          CHAR(2) NOT NULL,
  ip               INET,
  language         VARCHAR(10),
  funnel_id        VARCHAR(100),
  click_id         VARCHAR(200),
  sub_id_1         VARCHAR(255),
  sub_id_2         VARCHAR(255),
  sub_id_3         VARCHAR(255),
  sub_id_4         VARCHAR(255),
  sub_id_5         VARCHAR(255),
  custom_fields    JSONB DEFAULT '{}',
  status           VARCHAR(30) NOT NULL DEFAULT 'new',
  fraud_score      SMALLINT,
  fraud_details    JSONB,
  idempotency_key  VARCHAR(128),
  source_api_key   VARCHAR(64),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE leads_2026_03 PARTITION OF leads
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE leads_2026_04 PARTITION OF leads
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE leads_2026_05 PARTITION OF leads
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE INDEX idx_leads_company_created ON leads(company_id, created_at DESC);
CREATE INDEX idx_leads_company_email ON leads(company_id, email);
CREATE INDEX idx_leads_company_phone ON leads(company_id, phone);
CREATE INDEX idx_leads_company_status ON leads(company_id, status);
CREATE INDEX idx_leads_affiliate ON leads(affiliate_id, created_at DESC);
CREATE UNIQUE INDEX idx_leads_idempotency
  ON leads(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE api_request_log (
  id           BIGSERIAL,
  request_id   UUID NOT NULL,
  company_id   UUID,
  api_key_id   UUID,
  endpoint     VARCHAR(100),
  method       VARCHAR(10),
  status_code  SMALLINT,
  latency_ms   INT,
  ip           INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE api_request_log_2026_03 PARTITION OF api_request_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE api_request_log_2026_04 PARTITION OF api_request_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE api_request_log_2026_05 PARTITION OF api_request_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip         INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
