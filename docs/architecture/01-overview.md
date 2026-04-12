# 01 — System Overview

**Версия:** 1.0 | **Статус:** Draft

---

## Архитектурная концепция

GambChamp CRM построен как **модульный монолит с чёткими сервисными границами**, готовый к декомпозиции на микросервисы при достижении 50+ RPS на модуль.

На старте (Q1–Q2) это один Go-бинарник с внутренними пакетами-сервисами, общей БД и Redis. С Q3 тяжёлые части (антифрод, аналитика) выносятся в отдельные процессы.

**Принципы:**
- **Reliability first** — SLA autologin 99.5%, intake p99 < 200ms
- **Observability** — каждое действие логируется, метрики в Prometheus
- **Tenant isolation** — все данные изолированы по `company_id`
- **API-first** — все фичи доступны через API до UI
- **Idempotency** — повторные запросы безопасны на всех уровнях

---

## Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                      EXTERNAL ACTORS                         │
│  Affiliates (API)   Brokers (API/Postback)   Telegram Bot   │
└──────────┬────────────────┬──────────────────────┬──────────┘
           │                │                      │
┌──────────▼────────────────▼──────────────────────▼──────────┐
│                      API GATEWAY                             │
│              nginx / rate limiting / TLS                     │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────┘
   │          │          │          │          │
┌──▼──┐  ┌───▼───┐  ┌───▼──┐  ┌───▼───┐  ┌───▼────┐
│Intake│  │Router │  │Admin │  │Notify │  │Analyt. │
│ Svc  │  │  Svc  │  │ API  │  │  Svc  │  │  Svc   │
└──┬──┘  └───┬───┘  └───────┘  └───────┘  └────────┘
   │          │
┌──▼──────────▼────────────────────────────────────────┐
│              INTEGRATION SERVICE                      │
│         Broker Adapters (200+ templates)             │
└──────────────────┬────────────────────────────────────┘
                   │
          ┌────────▼────────┐
          │ AUTOLOGIN SRVICE │
          │  Proxy Pipeline  │
          └─────────────────┘

┌─────────────────────────────────────────────────────┐
│                  DATA LAYER                          │
│  PostgreSQL  │  Redis  │  ClickHouse  │  S3/MinIO   │
└─────────────────────────────────────────────────────┘
```

---

## Сервисы

| Сервис | Отвечает за | Язык | БД |
|--------|------------|------|-----|
| **Intake Service** | Приём лидов, валидация, E.164, dedup, idempotency | Go | PostgreSQL + Redis |
| **Fraud Service** | Scoring, IP/phone/email/VOIP check, Status Pipe | Go | PostgreSQL + Redis |
| **Router Service** | Matching, weights, caps, timezone, waterfall | Go | PostgreSQL + Redis |
| **Integration Service** | Broker API adapters, field mapping, postback | Go | PostgreSQL |
| **Autologin Service** | Pipeline 4 stages, proxy pool, failover, SLA track | Go | PostgreSQL + Redis |
| **Notification Service** | Telegram bot, webhook, email, 15+ event types | Go | PostgreSQL |
| **Analytics Service** | KPI tiles, drill-down, BI reports, exports | Go | ClickHouse |
| **Admin API** | Все CRUD операции, RBAC, auth | Go | PostgreSQL |
| **UAD Service** | Cold overflows, scheduled resend, loop | Go | PostgreSQL + Redis |

---

## Технологический стек

| Слой | Технология | Обоснование |
|------|-----------|-------------|
| **Backend** | Go 1.22 | Высокая производительность, малый footprint, goroutines для async |
| **API framework** | Chi / Fiber | Lightweight, middleware-based, battle-tested |
| **Primary DB** | PostgreSQL 16 | ACID, партиционирование по времени, JSONB для кастом полей |
| **Cache / Queue** | Redis 7 | Idempotency keys, rate limiting, session store, work queue |
| **Analytics DB** | ClickHouse | Columnar, 1B+ rows, p99 < 100ms для агрегатов |
| **File storage** | S3 / MinIO | Экспорты, лендинги, бэкапы |
| **Message bus** | Redis Streams | Async pipeline между сервисами (Q1), Kafka (Q3+) |
| **Frontend** | Next.js 14 + TypeScript | SSR, React Server Components, Tailwind CSS |
| **Auth** | JWT + refresh tokens | Stateless, 2FA через TOTP |
| **Container** | Docker + Docker Compose | Локальная разработка |
| **Orchestration** | Kubernetes (Q2+) | Production, auto-scaling |
| **CI/CD** | GitHub Actions | Test → Build → Deploy |
| **Monitoring** | Prometheus + Grafana | Метрики SLO, алерты |
| **Logging** | Loki + structured JSON | Centralised log aggregation |
| **Tracing** | OpenTelemetry | Distributed tracing по request_id |

---

## SLO (Service Level Objectives)

| Метрика | Target | Измерение |
|---------|--------|----------|
| API intake latency p99 | < 200ms | Prometheus histogram |
| Lead routing latency p99 | < 500ms | Prometheus histogram |
| Autologin success rate | ≥ 99.5% | Counter / 24h rolling window |
| API uptime | ≥ 99.9% | Uptime monitor |
| Fraud check latency p99 | < 100ms | Prometheus histogram |
| Broker response timeout | 10s hard limit | Context deadline |
| Max intake throughput | 500 leads/sec | Load test |

---

## Границы данных

- Все таблицы имеют `company_id UUID NOT NULL` — полная мультитенантность
- Row-level security в PostgreSQL на уровне `company_id`
- Партиционирование `leads` по `created_at` (месячное)
- TTL для `api_request_log` — 90 дней
- TTL для `autologin_sessions` — 7 дней
- Аналитические события в ClickHouse — без TTL (дешёвое хранилище)
