# 05 — Technology Stack

**Версия:** 1.0 | **Статус:** Draft

---

## Backend

### Go 1.22
**Почему:** Высокая производительность (необходимо 500 req/sec intake), малый memory footprint, goroutines для async pipeline, компилируется в один бинарник. Отличная поддержка HTTP-серверов и PostgreSQL.

**Фреймворк:** Chi (lightweight router) или Fiber (faster, Fasthttp-based)
- Chi: более идиоматичный Go, лучший middleware ecosystem
- Fiber: быстрее на benchmark, но нестандартный net/http

**Рекомендация Q1:** Chi — стабильность важнее максимальной скорости

### PostgreSQL 16
**Почему:**
- ACID транзакции для атомарных операций с капами
- JSONB для кастомных полей и field mapping
- Партиционирование нативное (leads по created_at)
- pg_partman для автоматической ротации партиций
- Row Level Security для tenant isolation
- Connection pooling через PgBouncer

**Критические настройки:**
```
max_connections = 200
shared_buffers = 25% RAM
effective_cache_size = 75% RAM
work_mem = 64MB
checkpoint_completion_target = 0.9
wal_level = replica  # для бэкапов
```

### Redis 7
**Почему:**
- Атомарный INCR для cap counters (race-free)
- Встроенный TTL для idempotency keys
- Redis Streams для async pipeline (легче Kafka в Q1)
- Pub/Sub для event bus между сервисами
- SETNX для distributed locks (Delayed Actions worker)

**Переход на Kafka в Q3** при объёме > 10k events/sec

### ClickHouse
**Почему:**
- Columnar storage = агрегаты на 1B+ rows за секунды
- MergeTree engine с партиционированием по месяцам
- Low cardinality типы для status/event_type
- TTL на уровне таблицы (2 года)
- Хорошая интеграция с Grafana для дашбордов

**Не подходит для:** точечных UPDATE/DELETE (используем только INSERT + SELECT)

---

## Frontend

### Next.js 14 + TypeScript
**Почему:**
- SSR для быстрой первой загрузки dashboard
- React Server Components снижают JS bundle
- TypeScript = меньше runtime ошибок
- Широкая экосистема UI компонентов

### UI Library: shadcn/ui + Tailwind CSS
**Почему:** shadcn/ui = копируемые компоненты (не зависимость), Radix UI primitives (accessible), легко кастомизируется под dark/light theme

### State Management: Zustand + React Query (TanStack Query)
- Zustand: простой global state (auth, user settings)
- React Query: server state, caching, optimistic updates

### Charts: Recharts или Tremor
- Tremor: готовые аналитические компоненты (KPI cards, time-series)
- Recharts: более гибкий для custom charts

---

## Infrastructure

### Docker + Docker Compose (Q1 local dev)
```yaml
services:
  api:       # Go binary
  postgres:  # PostgreSQL 16
  redis:     # Redis 7
  clickhouse: # ClickHouse
  minio:     # S3-compatible local storage
  grafana:   # Monitoring dashboards
  prometheus: # Metrics scraping
```

### Kubernetes (Q2 production)
- AWS EKS или DigitalOcean Kubernetes
- Horizontal Pod Autoscaler для Intake Service
- PersistentVolumes для PostgreSQL, Redis
- Secrets через Kubernetes Secrets + AWS Secrets Manager

### CI/CD: GitHub Actions
```
PR → lint + test → build Docker image → push ECR/GHCR → deploy staging → manual approve → deploy prod
```

---

## Monitoring & Observability

### Prometheus + Grafana
**Метрики сервисов:**
```go
// Intake Service
leads_created_total{company_id, affiliate_id}
lead_intake_duration_seconds{quantile}
leads_rejected_fraud_total{company_id, reason}
api_rate_limit_exceeded_total{api_key}

// Router Service
routing_decisions_total{result: routed|hold|rejected}
routing_duration_seconds{quantile}
cap_fill_ratio{flow_id, country}

// Autologin Service
autologin_attempts_total{company_id}
autologin_success_total{company_id}
autologin_stage_duration_seconds{stage, quantile}
```

**Dashboards:**
- System health (CPU, memory, disk, network)
- Lead pipeline (intake rate, routing rate, broker send rate)
- Autologin SLA (99.5% target визуализация)
- Fraud metrics (score distribution, block rate)
- Business KPIs (leads/hour, FTD/day, revenue)

### Structured Logging: Loki + JSON
```json
{
  "ts": "2026-05-01T12:00:00Z",
  "level": "info",
  "service": "intake",
  "trace_id": "uuid",
  "company_id": "uuid",
  "lead_id": "uuid",
  "event": "lead_created",
  "latency_ms": 45,
  "fraud_score": 20
}
```

### Distributed Tracing: OpenTelemetry
- Trace ID прокидывается через весь pipeline (HTTP header X-Trace-ID)
- Jaeger для просмотра traces
- Автоматически измеряет latency каждого этапа обработки лида

---

## Security

### Authentication
- JWT access token (15 min TTL) + refresh token (7 days)
- TOTP 2FA (Google Authenticator compatible)
- API keys для аффилейтов (SHA-256 хэш в БД, сравнение в Redis)

### Data Protection
- Все sensitive поля зашифрованы в БД (broker credentials, auth_config)
- TLS 1.3 на всех соединениях
- PgBouncer между app и PostgreSQL (меньше открытых соединений)
- Rate limiting на уровне nginx (100 req/sec per API key)
- Export только с 2FA (как у CRM Mate)

### Tenant Isolation
- `company_id` в каждом запросе к БД
- Middleware проверяет company_id из JWT против запрошенного ресурса
- Row Level Security в PostgreSQL как дополнительный слой
