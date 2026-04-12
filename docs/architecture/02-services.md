# 02 — Services

**Версия:** 1.0 | **Статус:** Draft

---

## Intake Service

**Пакет:** `internal/intake`  
**Endpoints:** `POST /api/v1/leads`, `POST /api/v1/leads/batch`  
**SLO:** p99 < 200ms, throughput 500 req/sec

Отвечает за первый контакт с лидом: аутентификацию аффилейта, парсинг, валидацию, E.164 нормализацию, дедупликацию, idempotency check, сохранение и публикацию в async pipeline.

**Ключевые решения:**
- Sync часть (validate + store): < 50ms
- Async часть (fraud + routing): Redis Stream
- Idempotency window: 24h по `company_id + idempotency_key`
- Dedup window: 30 дней по `company_id + email + phone`

---

## Fraud Service

**Пакет:** `internal/fraud`  
**Triggers:** Redis Stream consumer  
**SLO:** p99 < 100ms per check

Многоуровневая система оценки: IP (VPN/TOR/Proxy/datacenter), phone (VOIP detection, carrier lookup), email (disposable, MX), дубликаты, blacklists. Возвращает `fraud_score 0-100` с детальным объяснением по каждому полю.

**Внешние сервисы (настраиваемые):**
- IP: ipinfo.io / ip-api.com / локальная MaxMind GeoIP2
- Phone: Twilio Lookup / numverify / локальная VOIP база
- Email: ZeroBounce / Hunter.io / локальная проверка MX

**Кеширование:** Redis 1h по hash(email+phone+ip) — до 80% cache hit rate

---

## Router Service

**Пакет:** `internal/router`  
**Triggers:** Redis Stream consumer  
**SLO:** p99 < 200ms routing decision

Сердце системы. Реализует:
- Специфичность матчинга дистрибуций (GEO + affiliate + sub params)
- Алгоритмы SLOTS (историческое балансирование) и CHANCE (случайный выбор)
- Waterfall через priority_groups
- Per-country caps с timezone-aware reset
- Timeslot фильтрацию
- Fallback логику при cap full / broker error

**Критический инвариант:** каждое изменение cap атомарно через Redis INCR + PostgreSQL eventual sync (каждые 5 мин)

---

## Integration Service

**Пакет:** `internal/integration`  
**Triggers:** Redis Stream consumer + HTTP (test lead)  
**SLO:** broker timeout 10s hard limit

Адаптерный слой для 200+ брокеров. Каждый шаблон содержит:
- Endpoint URL + метод + auth тип
- Field mapping (наше → брокерское)
- Funnel substitution правила
- Status mapping (broker status → internal status)
- Autologin URL паттерн

**Паттерн добавления нового брокера:**
1. Создать JSON-шаблон в `/templates/{broker_slug}.json`
2. Протестировать через `POST /api/v1/integrations/test`
3. Активировать в UI

---

## Autologin Service

**Пакет:** `internal/autologin`  
**Endpoints:** `GET /al/{token}` (public)  
**SLO:** 99.5% success rate (24h rolling)

Управляет 4-стадийным pipeline перенаправления лида на платформу брокера. Хранит состояние в Redis + PostgreSQL. Отслеживает IP mismatch, geo mismatch, device fingerprint аномалии. SLA monitoring через Redis counters с алертингом в Telegram при падении ниже порога.

**Proxy pool (Q2):** пул собственных residential proxy для маскировки origin IP autologin запросов. Failover: если proxied request fails → direct fallback.

---

## Notification Service

**Пакет:** `internal/notification`  
**Triggers:** Event bus (Redis Pub/Sub)

Обрабатывает 15+ типов событий и доставляет их через:
- **Telegram Bot:** основной канал (медиабайеры живут в Telegram)
- **Webhook:** HTTP POST на URL аффилейта
- **Email:** transactional (SendGrid / Postmark)
- **In-app:** Bell icon feed в UI

**События:**
`lead_received`, `lead_sent`, `lead_rejected`, `lead_fraud_blocked`, `cap_filled_80pct`, `cap_filled_100pct`, `broker_error`, `autologin_success`, `autologin_failed`, `ftd_received`, `shave_detected`, `delayed_action_executed`, `new_funnel_detected`, `conversion_received`, `daily_summary`

---

## Analytics Service

**Пакет:** `internal/analytics`  
**DB:** ClickHouse (read), PostgreSQL (config)  
**SLO:** p99 < 2s для агрегатных запросов

Два режима:
1. **Operational** (PostgreSQL): real-time KPI tiles, cap status, last 24h activity
2. **BI** (ClickHouse): исторические тренды, drill-down, custom reports, экспорт

**Отчёты Q1:**
- KPI Dashboard (leads, FTD, CR, fraud rate)
- Lead table с 15+ фильтрами + Client History
- Cap Report (fill status всех flow)

**Отчёты Q2:**
- Funnel Report (CR по фанелам)
- Affiliate P&L
- UTM breakdown

**Отчёты Q3:**
- BI Builder (custom group-by, любые колонки)
- Period compare (этот месяц vs прошлый)

---

## Admin API

**Пакет:** `internal/admin`  
**Auth:** JWT Bearer token + role check

CRUD для всех сущностей системы. Реализует RBAC с ролями:
- `admin` — полный доступ
- `manager` — управление кампаниями и аффилейтами
- `teamlead` — просмотр своей команды
- `buyer` — только свои лиды и статистика
- `viewer` — read-only

---

## UAD Service (Automated Delivery)

**Пакет:** `internal/uad`  
**Triggers:** Cron scheduler

Управляет автоматической переотправкой лидов из Hold pool:
- Cold Overflow: по расписанию, с интервалом между батчами
- Continuous mode (HyperOne-inspired): бесконечный цикл до исчерпания пула
- Фильтрация по: country, funnel, affiliate, source, date range
- Каждая попытка записывается в lead_attempts (Client History)
