# 06 — Tech Stack Deep Analysis & Final Recommendation

**Версия:** 1.0 | **Дата:** Апрель 2026 | **Статус:** Final

Полный разбор каждого слоя стека: текущее предложение vs лучшие альтернативы vs финальный выбор.

---

## Критерии оценки

Для этого продукта важны в порядке приоритета:

1. **Скорость разработки** — startup, нужно шипить MVP за Q1
2. **Надёжность** — SLA 99.5% autologin, intake p99 < 200ms
3. **Runtime performance** — 500 req/sec intake, атомарные cap counters
4. **Операционная простота** — команда 5-10 человек, нет DevOps на fulltime
5. **Масштабируемость** — Q3+ рост без переписывания

---

## СЛОЙ 1: Backend Language

### Варианты

| Язык | Dev Speed | Performance | Reliability | Talent Pool | Вердикт |
|------|-----------|-------------|-------------|-------------|---------|
| **Go 1.22** | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ | ✅ **ВЫБОР** |
| Rust | ★★☆☆☆ | ★★★★★ | ★★★★★ | ★★☆☆☆ | ❌ Слишком медленная разработка |
| Elixir/Phoenix | ★★★★★ | ★★★★☆ | ★★★★★ | ★★☆☆☆ | ❌ Маленький пул разработчиков |
| Node.js/Bun | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★★★★ | ❌ Single-thread concerns на 500 rps |
| Python (FastAPI) | ★★★★★ | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ❌ Слишком медленный для intake |

**Почему Go:** I/O-bound workload (HTTP запросы к брокерам, DB) = goroutines идеальны. Нет GC пауз критичных для p99. Компилируется в один бинарник. Отличная стандартная библиотека для HTTP-серверов.

### HTTP Framework — важный выбор

| Framework | RPS (бенчмарк) | DX | OpenAPI | Вердикт |
|-----------|----------------|-----|---------|---------|
| **Fiber v3** | ~130,000 | ★★★★☆ | ✅ swagger | ✅ **ВЫБОР** |
| Chi | ~95,000 | ★★★★★ | manual | ❌ Медленнее |
| Echo | ~110,000 | ★★★★☆ | ✅ | 🟡 Альтернатива |
| stdlib net/http | ~80,000 | ★★★☆☆ | manual | ❌ Много boilerplate |
| Huma | ~70,000 | ★★★★★ | ✅ авто | 🟡 Хорош для API-first |

**Выбор: Fiber v3** — основан на fasthttp (в 2-5x быстрее net/http), отличный middleware, встроенный swagger. При 500 rps разница не критична, но Fiber даёт запас для роста до 50k+ rps без смены стека.

---

## СЛОЙ 2: Database Access (критически важно!)

Текущий стек не специфицирует этот слой явно. Это главная точка оптимизации.

### Варианты

| Инструмент | Type Safety | Dev Speed | Query Perf | Complex Queries | Вердикт |
|-----------|-------------|-----------|------------|-----------------|---------|
| **sqlc + pgx/v5** | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ | ✅ **ВЫБОР** |
| GORM | ★★★☆☆ | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ | ❌ N+1 проблемы, медленный |
| sqlx | ★★★☆☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | 🟡 Лучше GORM, но нет кодогенерации |
| Bun ORM | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | 🟡 Хороший баланс |
| raw database/sql | ★★☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★★★★ | ❌ Много boilerplate |

**Почему sqlc + pgx/v5:**
- sqlc читает `.sql` файлы и генерирует типизированный Go код
- Нулевые runtime аллокации vs GORM
- pgx/v5 — нативный PostgreSQL драйвер (в 3-5x быстрее database/sql для PG)
- pgxpool — встроенный connection pool, не нужен PgBouncer для одного инстанса
- Сложные routing queries пишутся на чистом SQL — максимальный контроль

```go
// sqlc генерирует из SQL:
// SELECT * FROM leads WHERE company_id=$1 AND status=$2
func (q *Queries) GetLeadsByStatus(ctx context.Context, arg GetLeadsByStatusParams) ([]Lead, error)
```

### Migrations: Atlas

| Инструмент | Declarative | Drift Detection | Team-friendly | Вердикт |
|-----------|-------------|-----------------|---------------|---------|
| **Atlas** | ✅ | ✅ | ✅ | ✅ **ВЫБОР** |
| goose | ❌ | ❌ | ✅ | 🟡 |
| golang-migrate | ❌ | ❌ | ✅ | 🟡 |
| Flyway | ❌ | ✅ | ✅ | 🟡 |

Atlas позволяет описывать схему декларативно (как Terraform для БД) и автоматически генерирует миграции.

---

## СЛОЙ 3: Async Pipeline (ключевое решение)

Текущее предложение: Redis Streams → Kafka (Q3)

### Варианты

| Система | Performance | Ops Complexity | Go Support | Persistence | Вердикт |
|---------|-------------|----------------|------------|-------------|---------|
| **NATS JetStream** | ★★★★★ | ★★★★★ | ★★★★★ | ✅ | ✅ **ВЫБОР** |
| Redis Streams | ★★★★☆ | ★★★★★ | ★★★★★ | ✅ | 🟡 Достаточно для Q1 |
| Kafka | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ✅ | ❌ Overkill, сложно |
| RabbitMQ | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ✅ | ❌ AMQP, сложнее |
| SQS/SNS | ★★★★☆ | ★★★★★ | ★★★★☆ | ✅ | ❌ AWS vendor lock |

**Почему NATS JetStream:**
- Написан на Go (язык всего проекта), один бинарник
- 20-30 млн messages/sec на одном сервере (Redis Streams: ~2-3 млн)
- Built-in **message deduplication** (по Message ID) — идеально для idempotency
- At-least-once и exactly-once delivery из коробки
- Consumer groups (как у Kafka)
- Намного проще Kafka: нет ZooKeeper/KRaft, нет topic partition hell
- Не нужно мигрировать на Kafka в Q3 — NATS масштабируется до уровня Kafka

```go
// Publish
js.Publish("leads.intake", leadJSON)

// Subscribe (consumer group)
js.Subscribe("leads.intake", handler, nats.Durable("fraud-worker"))
```

### Background Jobs: Asynq

Для scheduled задач (Delayed Actions, Status Pipe Pending, UAD) нужен job scheduler:

| Инструмент | Redis-based | UI Dashboard | Cron | Вердикт |
|-----------|-------------|--------------|------|---------|
| **Asynq** | ✅ | ✅ Asynqmon | ✅ | ✅ **ВЫБОР** |
| River (PG) | ❌ PG | 🟡 | ✅ | 🟡 Если Redis не нужен |
| Temporal | ❌ own | ✅ | ✅ | ❌ Heavyweight |
| cron + Redis | ✅ | ❌ | ✅ | 🟡 Manual |

**Asynq** — Redis-backed task queue, отличный web UI (Asynqmon), cron задачи, retry логика, dead letter queue.

---

## СЛОЙ 4: Real-time (WebSocket/SSE)

Не был явно решён в текущем стеке.

### Варианты

| Подход | Complexity | Bidirectional | Browser Support | Вердикт |
|--------|-----------|---------------|-----------------|---------|
| **SSE (Server-Sent Events)** | ★★★★★ | ❌ (только сервер→клиент) | ✅ нативно | ✅ **ВЫБОР для дашборда** |
| Centrifugo | ★★★☆☆ | ✅ | ✅ | 🟡 Если нужен bi-directional |
| WebSocket native | ★★★☆☆ | ✅ | ✅ | 🟡 Сложнее |
| Polling | ★★★★★ | ❌ | ✅ | ❌ Нагрузка на сервер |

**SSE для дашборда** — реальный обновления cap counters, live lead feed, Telegram-like notifications в UI. Работает через HTTP/2, нативно в браузерах, не нужна отдельная инфраструктура. 95% задач CRM-дашборда — это обновления только от сервера к клиенту.

---

## СЛОЙ 5: Frontend

### Framework

| Framework | Performance | DX | Bundle Size | Экосистема | Вердикт |
|-----------|-------------|-----|-------------|-----------|---------|
| **Next.js 15** | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★★★ | ✅ **ВЫБОР** |
| SvelteKit | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ | 🟡 Меньше экосистема |
| Remix | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | 🟡 Хорош, но меньше контрибьюторов |
| Nuxt 3 | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | 🟡 Если команда знает Vue |

**Next.js 15** с App Router — правильный выбор. Server Components серьёзно снижают JS bundle. Edge Runtime для статических страниц.

### UI компоненты — критичный выбор для CRM

| Библиотека | Components | Table | Charts | Вердикт |
|-----------|------------|-------|--------|---------|
| shadcn/ui | ✅ копируемые | ❌ базовый | ❌ | ✅ Основа |
| **TanStack Table v8** | — | ★★★★★ | — | ✅ **ОБЯЗАТЕЛЬНО** |
| AG Grid Community | — | ★★★★★ | — | 🟡 Тяжелее, но тоже вариант |
| **ECharts / Apache ECharts** | — | — | ★★★★★ | ✅ **ВЫБОР для графиков** |
| Tremor | ★★★★☆ | ★★★☆☆ | ★★★★☆ | 🟡 Хорош для KPI cards |
| Recharts | — | — | ★★★☆☆ | ❌ Медленнее ECharts |

**Почему TanStack Table v8:**
- Виртуализация строк (100k+ лидов без лагов через `@tanstack/virtual`)
- Бесконечная прокрутка
- Server-side сортировка/фильтрация из коробки
- Полный контроль над рендерингом (headless)

**Почему ECharts:**
- Рендеринг 100k+ точек без тормозов (Canvas, не SVG)
- Zoom, brush selection для аналитики
- Лучше Recharts по производительности в 5-10x на больших датасетах

### State Management

| Подход | Dev Speed | Performance | Вердикт |
|--------|-----------|-------------|---------|
| **Zustand + TanStack Query v5** | ★★★★★ | ★★★★★ | ✅ **ВЫБОР** |
| Redux Toolkit | ★★★☆☆ | ★★★★☆ | ❌ Много boilerplate |
| Jotai | ★★★★☆ | ★★★★★ | 🟡 Хороший атомарный state |
| SWR | ★★★★★ | ★★★★☆ | 🟡 Проще чем TQ, меньше фич |

---

## СЛОЙ 6: Infrastructure

Текущее предложение: Docker → K8s в Q2. **Это слишком рано для Kubernetes.**

### Рекомендуемый путь

```
Q1 Local Dev:     Docker Compose (api + postgres + redis + nats + clickhouse)
Q1-Q2 Staging:    Fly.io (простой деплой Go + managed DBs)
Q3+ Production:   AWS ECS или Fly.io Machines (в зависимости от роста)
Q4+ Scale:        AWS EKS только если явно нужно (10+ сервисов, 100+ pods)
```

### Managed Databases (Production)

| Сервис | PostgreSQL | Redis | ClickHouse | Вердикт |
|--------|-----------|-------|-----------|---------|
| **Fly.io** | ✅ Fly Postgres | ✅ Upstash | ❌ | ✅ Простейший старт |
| **Neon.tech** | ✅★★★★★ | ❌ | ❌ | ✅ **Лучший serverless PG** |
| **Upstash** | ❌ | ✅★★★★★ | ❌ | ✅ Serverless Redis |
| **ClickHouse Cloud** | ❌ | ❌ | ✅★★★★★ | ✅ Managed CH |
| AWS RDS | ✅★★★★☆ | ❌ | ❌ | 🟡 Q3+ |
| Supabase | ✅★★★★☆ | ❌ | ❌ | 🟡 + Auth + Storage |

**Рекомендуемый production stack Q1-Q2:**
- **Fly.io** для Go сервисов (мультирегион из коробки, fast deploys, ~$20-50/мес)
- **Neon** для PostgreSQL (database branches = отдельные БД на каждый PR, платишь только за использование)
- **Upstash Redis** (serverless, $0.2 per 100k commands)
- **NATS** self-hosted на Fly.io (легковесный)
- **ClickHouse Cloud** (managed, $50/мес на старте)

**Итого инфраструктура Q1:** ~$150-300/мес вместо ~$500+ за K8s cluster.

### CI/CD

| Инструмент | Speed | DX | Вердикт |
|-----------|-------|----|---------|
| **GitHub Actions** | ★★★★☆ | ★★★★★ | ✅ **ВЫБОР** |
| GitLab CI | ★★★★☆ | ★★★★☆ | 🟡 Если не GitHub |
| Dagger | ★★★★★ | ★★★☆☆ | 🟡 Portable pipelines |

Pipeline: `lint → test → sqlc generate → build → push → deploy fly.io`

---

## СЛОЙ 7: Monitoring & Observability

### Metrics

| Инструмент | Memory | PromQL | Алерты | Вердикт |
|-----------|--------|--------|--------|---------|
| **VictoriaMetrics** | ★★★★★ (10x меньше) | ✅ | ✅ VMAlert | ✅ **ВЫБОР** |
| Prometheus | ★★☆☆☆ | ✅ | ✅ AlertManager | 🟡 Стандарт, но прожорлив |
| Grafana Cloud | ★★★★★ | ✅ | ✅ | 🟡 Managed = проще |
| Datadog | ★★★★★ | ✅ | ✅ | ❌ Дорого ($50+/хост) |

**VictoriaMetrics** — полная совместимость с Prometheus (те же метрики, те же Grafana дашборды), но 10x меньше памяти и 5x быстрее запросы. Drop-in replacement.

### Logs

| Инструмент | Cost | DX | Query | Вердикт |
|-----------|------|-----|-------|---------|
| **Loki** | ★★★★★ (self-hosted) | ★★★★☆ | LogQL | ✅ **ВЫБОР** |
| Better Stack | ★★★☆☆ (managed) | ★★★★★ | SQL | 🟡 Проще, платный |
| Datadog Logs | ★☆☆☆☆ | ★★★★★ | — | ❌ Дорого |
| CloudWatch | ★★★☆☆ | ★★★☆☆ | — | 🟡 Если AWS |

### Tracing

| Инструмент | Вердикт |
|-----------|---------|
| **OpenTelemetry SDK** → **Tempo** (Grafana) | ✅ **ВЫБОР** |
| Jaeger | 🟡 Старше, тяжелее |
| Zipkin | 🟡 Проще, меньше фич |

**Grafana + Loki + Tempo + VictoriaMetrics** — единый стек наблюдаемости через один Grafana (Explore для всех трёх источников).

---

## СЛОЙ 8: Code Generation & Developer Tools

Это то, что максимально ускоряет разработку.

| Инструмент | Для чего | Необходим |
|-----------|---------|-----------|
| **sqlc** | SQL → типизированный Go | ✅ ОБЯЗАТЕЛЬНО |
| **oapi-codegen** | OpenAPI spec → Go server/client | ✅ ОБЯЗАТЕЛЬНО |
| **mockery v2** | Auto-generated mocks из interfaces | ✅ ОБЯЗАТЕЛЬНО |
| **golangci-lint** | 50+ линтеров в одном | ✅ ОБЯЗАТЕЛЬНО |
| **air** | Live reload для Go в dev | ✅ ОБЯЗАТЕЛЬНО |
| **Atlas** | Декларативные миграции | ✅ ОБЯЗАТЕЛЬНО |
| **testcontainers-go** | Real PG/Redis/NATS в тестах | ✅ ОБЯЗАТЕЛЬНО |
| **Buf CLI** | Protobuf lint + breaking change detection | 🟡 Если gRPC |

---

## ФИНАЛЬНЫЙ РЕКОМЕНДУЕМЫЙ СТЕК

```
╔══════════════════════════════════════════════════════════════╗
║                    GAMBCHAMP CRM STACK                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  BACKEND              Go 1.22 + Fiber v3                     ║
║  DB ACCESS            sqlc + pgx/v5 + pgxpool                ║
║  MIGRATIONS           Atlas (declarative)                     ║
║  BACKGROUND JOBS      Asynq (Redis-backed)                    ║
║  REAL-TIME            SSE (Server-Sent Events)                ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  PRIMARY DB           PostgreSQL 16 (Neon in prod)           ║
║  CACHE                Redis 7 (Upstash in prod)              ║
║  ASYNC PIPELINE       NATS JetStream                         ║
║  ANALYTICS DB         ClickHouse (ClickHouse Cloud in prod)  ║
║  FILE STORAGE         S3 / MinIO                             ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  FRONTEND             Next.js 15 + TypeScript                ║
║  UI COMPONENTS        shadcn/ui + Radix UI + Tailwind v4     ║
║  DATA TABLES          TanStack Table v8 + Virtual            ║
║  CHARTS               ECharts (large datasets) + Tremor KPIs ║
║  STATE                Zustand + TanStack Query v5            ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  DEPLOY (Q1-Q2)       Fly.io (Go services + NATS)           ║
║  DEPLOY (Q3+)         AWS ECS Fargate или Fly.io Machines    ║
║  CI/CD                GitHub Actions                          ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  METRICS              VictoriaMetrics (not Prometheus)        ║
║  DASHBOARDS           Grafana                                 ║
║  LOGS                 Loki + structured JSON                  ║
║  TRACING              OpenTelemetry → Tempo                   ║
║  ALERTS               VMAlert → Telegram/PagerDuty           ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  CODE GEN             sqlc + oapi-codegen + mockery v2       ║
║  LINTING              golangci-lint                           ║
║  LIVE RELOAD          air (dev only)                          ║
║  TESTING              testcontainers-go + gotest.tools        ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Что изменилось vs текущее предложение

| Компонент | Было | Стало | Причина |
|-----------|------|-------|---------|
| HTTP Framework | Chi | **Fiber v3** | 2-5x быстрее, fasthttp-based |
| DB Access | не определено | **sqlc + pgx/v5** | Type-safe, нулевые аллокации, 5x быстрее GORM |
| Migrations | не определено | **Atlas** | Declarative, drift detection |
| Async Pipeline | Redis Streams → Kafka | **NATS JetStream** | Go-native, 10x быстрее RS, не нужен Kafka |
| Background Jobs | не определено | **Asynq** | Redis-backed, UI, retry, cron |
| Real-time | не определено | **SSE** | Достаточно для дашборда, нулевая инфра |
| Data Tables | не определено | **TanStack Table v8** | 100k+ строк без лагов |
| Charts | Recharts/Tremor | **ECharts + Tremor** | ECharts в 5-10x быстрее на больших данных |
| Metrics | Prometheus | **VictoriaMetrics** | 10x меньше RAM, те же PromQL запросы |
| Tracing | Jaeger | **Tempo** | Нативно в Grafana стеке |
| Production Deploy | K8s Q2 | **Fly.io Q1** | Проще, дешевле, не нужен DevOps |
| PG Connection Pool | PgBouncer | **pgxpool built-in** | Для монолита не нужен PgBouncer |

---

## Производительность

Ожидаемые характеристики финального стека:

| Метрика | Target SLO | Ожидаемый результат |
|---------|-----------|---------------------|
| Intake API p99 | < 200ms | **~15-30ms** (sqlc + pgx + Redis) |
| Routing decision p99 | < 500ms | **~50-100ms** (Redis cap check + DB query) |
| Fraud check p99 | < 100ms | **~20-40ms** (80% cache hit → Redis) |
| Broker send (excl. broker) | < 100ms | **~30ms** overhead нашей части |
| Analytics query p99 | < 2s | **~100-500ms** (ClickHouse columnar) |
| Max intake throughput | 500 req/sec | **5,000+ req/sec** (Fiber + pgxpool) |

**Главный bottleneck** — не наша система, а ответ брокеров (до 10 сек). Наш overhead на 500 rps — это сотни миллисекунд на всём pipeline.

---

## Инфраструктура стоимость

### Q1-Q2 Production (Fly.io + managed DBs)
| Сервис | Стоимость/мес |
|--------|--------------|
| Fly.io Machines (2x Go API, 1x NATS, 1x jobs) | ~$50 |
| Neon PostgreSQL (serverless) | ~$25 |
| Upstash Redis (serverless) | ~$10 |
| ClickHouse Cloud (dev tier) | ~$50 |
| Fly.io static IPs + networking | ~$10 |
| GitHub Actions | Free (public) / $4 |
| **Итого** | **~$150/мес** |

### Q3+ Production (AWS ECS)
| Сервис | Стоимость/мес |
|--------|--------------|
| AWS ECS Fargate (4 tasks) | ~$150 |
| AWS RDS PostgreSQL (db.t3.medium) | ~$50 |
| AWS ElastiCache Redis | ~$50 |
| ClickHouse Cloud (standard) | ~$150 |
| AWS Load Balancer | ~$20 |
| **Итого** | **~$420/мес** |

---

## Быстрый старт (Q1 Week 1)

```bash
# 1. Init project
mkdir gambchamp-crm && cd gambchamp-crm
go mod init github.com/gambchamp/crm

# 2. Install tools
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
go install github.com/vektra/mockery/v2@latest
go install github.com/air-verse/air@latest
curl -sSf https://atlasgo.sh | sh

# 3. Core dependencies
go get github.com/gofiber/fiber/v3
go get github.com/jackc/pgx/v5
go get github.com/redis/go-redis/v9
go get github.com/nats-io/nats.go
go get github.com/hibiken/asynq
go get github.com/golang-jwt/jwt/v5

# 4. Dev environment
docker compose up -d  # postgres + redis + nats + clickhouse

# 5. Generate types from SQL
sqlc generate

# 6. Live reload
air
```
