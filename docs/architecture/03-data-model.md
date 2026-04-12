# 03 — Data Model

**Версия:** 1.0 | **Статус:** Draft

---

## Концептуальная ER-модель

```
companies ──< users
companies ──< affiliates ──< leads ──< lead_attempts
companies ──< brokers ──< integrations
companies ──< distributions ──< flows ──>─ integrations
flows ──< caps
leads >──< fraud_checks
leads ──< autologin_sessions
leads ──< conversions
affiliates ──< postbacks
companies ──< telegram_bots
leads ──> analytics_events (ClickHouse)
```

---

## Основные сущности

### companies (мультитенантность)
```sql
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,     -- для white-label subdomain
  plan          VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter/growth/enterprise
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  settings      JSONB NOT NULL DEFAULT '{}',       -- кастомные настройки
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### users (RBAC)
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL,   -- admin/manager/teamlead/buyer/viewer
  name          VARCHAR(255),
  totp_secret   VARCHAR(64),           -- 2FA
  totp_enabled  BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);
CREATE INDEX idx_users_company ON users(company_id);
```

### affiliates (источники трафика)
```sql
CREATE TABLE affiliates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          VARCHAR(255) NOT NULL,
  api_key       VARCHAR(64) UNIQUE NOT NULL,
  email         VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
  fraud_profile_id UUID REFERENCES fraud_profiles(id),
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliates_company ON affiliates(company_id);
CREATE INDEX idx_affiliates_api_key ON affiliates(api_key);
```

### leads (основная таблица, партиционирована)
```sql
CREATE TABLE leads (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  affiliate_id      UUID NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100),
  email             VARCHAR(255) NOT NULL,
  phone             VARCHAR(30) NOT NULL,           -- E.164 нормализованный
  phone_raw         VARCHAR(50),                    -- оригинальный
  country           CHAR(2) NOT NULL,               -- ISO 3166-1 alpha-2
  ip                INET,
  language          VARCHAR(10),
  funnel_id         VARCHAR(100),
  click_id          VARCHAR(200),
  sub_id_1          VARCHAR(255),
  sub_id_2          VARCHAR(255),
  sub_id_3          VARCHAR(255),
  sub_id_4          VARCHAR(255),
  sub_id_5          VARCHAR(255),
  custom_fields     JSONB DEFAULT '{}',
  status            VARCHAR(30) NOT NULL DEFAULT 'new',
  -- new / processing / routed / sent / rejected / hold / error
  fraud_score       SMALLINT,                       -- 0-100
  fraud_details     JSONB,                          -- per-field breakdown
  idempotency_key   VARCHAR(128),
  source_api_key    VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Индексы
CREATE INDEX idx_leads_company_created  ON leads(company_id, created_at DESC);
CREATE INDEX idx_leads_company_email    ON leads(company_id, email);
CREATE INDEX idx_leads_company_phone    ON leads(company_id, phone);
CREATE INDEX idx_leads_company_status   ON leads(company_id, status);
CREATE INDEX idx_leads_affiliate        ON leads(affiliate_id, created_at DESC);
CREATE UNIQUE INDEX idx_leads_idempotency ON leads(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### lead_attempts (Client History — уникальный дифференциатор)
```sql
CREATE TABLE lead_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL,
  company_id      UUID NOT NULL,
  integration_id  UUID NOT NULL REFERENCES integrations(id),
  broker_id       UUID NOT NULL,
  attempt_number  SMALLINT NOT NULL DEFAULT 1,
  result          VARCHAR(30) NOT NULL,
  -- success / cap_full / blocked_fraud / duplicate / broker_error /
  -- no_match / timeout / rejected_by_broker
  broker_lead_id  VARCHAR(255),          -- ID в системе брокера
  broker_response JSONB,                 -- raw response
  latency_ms      INT,
  autologin_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_lead       ON lead_attempts(lead_id, created_at);
CREATE INDEX idx_attempts_company    ON lead_attempts(company_id, created_at DESC);
CREATE INDEX idx_attempts_broker     ON lead_attempts(broker_id, created_at DESC);
```

### brokers (брокерские аккаунты)
```sql
CREATE TABLE brokers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id),
  name         VARCHAR(255) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  settings     JSONB DEFAULT '{}',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### integrations (подключения к брокерам)
```sql
CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  broker_id       UUID NOT NULL REFERENCES brokers(id),
  template_id     VARCHAR(100),              -- ссылка на шаблон из каталога
  name            VARCHAR(255) NOT NULL,
  endpoint_url    TEXT NOT NULL,
  method          VARCHAR(10) DEFAULT 'POST',
  auth_type       VARCHAR(30),               -- api_key / basic / oauth2 / custom
  auth_config     JSONB,                     -- зашифрованные credentials
  field_mapping   JSONB NOT NULL DEFAULT '{}', -- наше поле → поле брокера
  status_mapping  JSONB DEFAULT '{}',        -- статус брокера → наш статус
  autologin_url   TEXT,
  autologin_type  VARCHAR(30),
  status          VARCHAR(20) DEFAULT 'active',
  last_tested_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### distributions (конфигурации роутинга)
```sql
CREATE TABLE distributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  name            VARCHAR(255) NOT NULL,
  country         CHAR(2),                   -- NULL = global
  affiliate_id    UUID REFERENCES affiliates(id), -- NULL = all
  match_params    JSONB DEFAULT '{}',        -- sub_id матчинг
  algorithm       VARCHAR(20) DEFAULT 'slots', -- slots / chance
  timezone        VARCHAR(50) DEFAULT 'UTC',
  reject_outside_hours BOOLEAN DEFAULT false,
  status          VARCHAR(20) DEFAULT 'active',
  priority        SMALLINT DEFAULT 0,        -- специфичность
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### flows (брокеры внутри дистрибуции)
```sql
CREATE TABLE flows (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL,
  distribution_id  UUID NOT NULL REFERENCES distributions(id),
  integration_id   UUID NOT NULL REFERENCES integrations(id),
  weight           SMALLINT NOT NULL DEFAULT 1,
  priority_group   SMALLINT NOT NULL DEFAULT 1,  -- waterfall уровень
  geo_filter       CHAR(2)[],                    -- массив стран
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### caps (лимиты)
```sql
CREATE TABLE caps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  flow_id         UUID NOT NULL REFERENCES flows(id),
  cap_type        VARCHAR(20) NOT NULL,     -- daily / total
  cap_value       INT NOT NULL,
  country         CHAR(2),                  -- NULL = global для flow
  timezone        VARCHAR(50) DEFAULT 'UTC',
  reset_at        TIME DEFAULT '00:00:00',
  current_count   INT NOT NULL DEFAULT 0,
  last_reset_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_caps_flow_country ON caps(flow_id, cap_type, country)
  WHERE country IS NOT NULL;
```

### timeslots (расписание)
```sql
CREATE TABLE timeslots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id      UUID NOT NULL REFERENCES flows(id),
  day_of_week  SMALLINT NOT NULL,   -- 0=Mon..6=Sun
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  active       BOOLEAN DEFAULT true
);
```

### fraud_profiles
```sql
CREATE TABLE fraud_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL,
  name         VARCHAR(255) NOT NULL,
  max_score    SMALLINT DEFAULT 70,
  rules        JSONB NOT NULL DEFAULT '{}',
  -- {ip: {vpn: block, tor: block}, phone: {voip: block}, email: {...}}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### conversions (FTD / депозиты)
```sql
CREATE TABLE conversions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL,
  lead_id        UUID NOT NULL,
  broker_id      UUID NOT NULL,
  type           VARCHAR(20) NOT NULL,  -- ftd / deposit / registration
  amount         DECIMAL(12,2),
  currency       CHAR(3) DEFAULT 'USD',
  is_fake        BOOLEAN DEFAULT false,
  fire_postback  BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversions_company ON conversions(company_id, created_at DESC);
CREATE INDEX idx_conversions_lead    ON conversions(lead_id);
```

### autologin_sessions
```sql
CREATE TABLE autologin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  lead_id         UUID NOT NULL,
  integration_id  UUID NOT NULL,
  token           VARCHAR(128) UNIQUE NOT NULL,
  url             TEXT NOT NULL,
  stage           VARCHAR(30) DEFAULT 'generated',
  -- generated / link_clicked / page_loaded / fingerprint_verified / submitted
  ip_at_submit    INET,
  ip_at_click     INET,
  ip_mismatch     BOOLEAN DEFAULT false,
  geo_mismatch    BOOLEAN DEFAULT false,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_autologin_token     ON autologin_sessions(token);
CREATE INDEX idx_autologin_lead      ON autologin_sessions(lead_id);
```

### delayed_actions (уникальная фича)
```sql
CREATE TABLE delayed_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL,
  flow_id         UUID REFERENCES flows(id),
  execute_at      TIMESTAMPTZ NOT NULL,
  action_type     VARCHAR(50) NOT NULL,   -- update_funnels / update_countries / update_caps
  payload         JSONB NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',  -- pending / executed / failed
  executed_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_delayed_pending ON delayed_actions(execute_at) WHERE status = 'pending';
```

---

## ClickHouse — аналитические события

```sql
CREATE TABLE analytics_events (
  event_id        UUID,
  company_id      UUID,
  event_type      LowCardinality(String),  -- lead_received / lead_routed / lead_sent / ftd / autologin_click
  lead_id         UUID,
  affiliate_id    UUID,
  broker_id       UUID,
  country         FixedString(2),
  funnel_id       String,
  source          String,
  sub_id_1        String,
  fraud_score     UInt8,
  result          LowCardinality(String),
  latency_ms      UInt32,
  created_at      DateTime64(3, 'UTC')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (company_id, created_at, event_type)
TTL created_at + INTERVAL 2 YEAR;
```

---

## Redis — ключевые паттерны

| Ключ | Тип | TTL | Назначение |
|------|-----|-----|-----------|
| `idem:{company_id}:{key}` | String | 24h | Idempotency check |
| `ratelimit:{api_key}:{window}` | Counter | 1s | Rate limiting |
| `cap:{flow_id}:{date}:{country}` | Counter | 25h | Дневные капы |
| `session:{token}` | Hash | 7d | Auth sessions |
| `autologin:{token}` | Hash | 48h | Autologin state |
| `lead:processing:{lead_id}` | String | 60s | Distributed lock |
| `fraud:cache:{hash}` | String | 1h | Fraud check cache |
| `queue:lead_routing` | Stream | — | Async routing queue |
