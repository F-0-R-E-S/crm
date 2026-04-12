# База данных

## PostgreSQL 16

Основное хранилище данных с Row Level Security (RLS) для мультитенантной изоляции.

### Таблицы

| Таблица | Назначение | Партиционирование |
|---------|------------|-------------------|
| `tenants` | Тенанты / компании | — |
| `users` | Пользователи (мультитенантные) | — |
| `api_keys` | API-ключи с rate limit и IP whitelist | — |
| `refresh_tokens` | JWT refresh tokens | — |
| `affiliates` | Аккаунты аффилейтов | — |
| `broker_templates` | Shared-шаблоны интеграций брокеров | — |
| `brokers` | Per-tenant инстансы брокеров | — |
| `distribution_rules` | Правила маршрутизации | — |
| `leads` | Записи лидов | BY RANGE (created_at), помесячно |
| `lead_events` | Аудит-трейл событий лида | — |
| `fraud_profiles` | Per-affiliate настройки антифрода | — |
| `autologin_sessions` | Сессии автологина | — |
| `uad_queue` | Очередь повторной дистрибуции | — |
| `notifications` | Системные нотификации | — |
| `notification_preferences` | Каналы нотификации пользователя | — |
| `audit_log` | Append-only аудит | — |

### Ключевые таблицы — детали

#### tenants
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
domain          TEXT UNIQUE
plan            TEXT DEFAULT 'starter'
settings        JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ
```

#### users
```sql
id              UUID PRIMARY KEY
tenant_id       UUID REFERENCES tenants
email           TEXT NOT NULL
password_hash   TEXT NOT NULL
role            TEXT DEFAULT 'viewer'
two_factor      BOOLEAN DEFAULT FALSE
last_login      TIMESTAMPTZ
```

#### leads (партиционированная)
```sql
id              UUID
tenant_id       UUID REFERENCES tenants
affiliate_id    UUID REFERENCES affiliates
idempotency_key TEXT
name            TEXT
email           TEXT
phone           TEXT
phone_e164      TEXT            -- нормализованный E.164
country         TEXT
ip              INET
user_agent      TEXT
status          TEXT DEFAULT 'new'
quality_score   INTEGER         -- 0-100, от Fraud Engine
fraud_card      JSONB           -- детали антифрод-проверок
extra           JSONB           -- произвольные параметры
created_at      TIMESTAMPTZ
```
Партиции созданы помесячно на весь 2026 год.

#### distribution_rules
```sql
id              UUID PRIMARY KEY
tenant_id       UUID
name            TEXT
conditions      JSONB          -- GEO, affiliate, параметры
broker_targets  JSONB          -- список брокеров с весами
algorithm       TEXT           -- 'weight', 'waterfall', 'round-robin'
caps            JSONB          -- daily_cap, total_cap, per_source
timezone_slots  JSONB          -- расписание работы
priority        INTEGER
active          BOOLEAN
```

#### broker_templates (shared, без tenant_id)
```sql
id              UUID PRIMARY KEY
name            TEXT           -- 'binomo', 'quotex', etc.
version         TEXT
method          TEXT           -- 'POST', 'GET'
url_template    TEXT           -- с плейсхолдерами
body_template   JSONB          -- шаблон тела запроса
auth_type       TEXT           -- 'bearer', 'basic', 'api_key'
```

### Row Level Security (RLS)

Все таблицы с `tenant_id` защищены RLS-политиками:

```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

API Gateway устанавливает `app.tenant_id` в контексте PostgreSQL-сессии перед каждым запросом.

### Индексы

Составные индексы на `(tenant_id, ...)` для всех основных запросов:
- `leads`: `(tenant_id, created_at)`, `(tenant_id, status)`, `(tenant_id, affiliate_id)`
- `affiliates`: `(tenant_id, api_key_hash)`
- `distribution_rules`: `(tenant_id, active, priority)`

### Миграции

Файлы миграций в `migrations/`:

| Файл | Содержание |
|------|------------|
| `001_initial_schema.up.sql` | Полная начальная схема (все таблицы, RLS, индексы) |
| `001_initial_schema.down.sql` | Откат начальной схемы |
| `002_clickhouse_schema.sql` | Справочная схема ClickHouse |
| `003_seed_broker_templates.up.sql` | Начальные шаблоны брокеров |
| `003_seed_broker_templates.down.sql` | Откат шаблонов |

Миграции управляются через Atlas (`atlas.hcl`).

---

## ClickHouse 24.1

OLAP-хранилище для аналитики. Не заменяет PostgreSQL — дополняет его для тяжёлых агрегаций.

### Таблицы

#### lead_events_analytics
```sql
CREATE TABLE lead_events_analytics (
    event_id       UUID,
    tenant_id      UUID,
    lead_id        UUID,
    affiliate_id   UUID,
    broker_id      UUID,
    event_type     String,
    country        String,
    status         String,
    quality_score  UInt8,
    duration_ms    UInt32,
    created_at     DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (tenant_id, created_at, event_type)
TTL created_at + INTERVAL 2 YEAR;
```

#### cap_utilization
Снапшоты утилизации капов для отчётности.

#### autologin_metrics
Метрики производительности автологина (latency, success rate).

---

## SQLC

Генерация Go-кода из SQL-запросов (`sqlc.yaml`):

- **Queries:** `internal/db/queries/*.sql`
- **Output:** `internal/db/sqlc/*.go`
- **Driver:** `pgx/v5`

Файлы запросов:
- `affiliates.sql` — CRUD аффилейтов
- `companies.sql` — управление тенантами
- `leads.sql` — поиск и управление лидами
- `sessions.sql` — refresh tokens
- `users.sql` — пользователи

Type overrides:
- `uuid` → `github.com/google/uuid.UUID`
- `timestamptz` → `time.Time`
- `jsonb` → `json.RawMessage`
- `inet` → `*string`
