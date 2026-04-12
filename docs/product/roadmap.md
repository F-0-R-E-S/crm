# Дорожная карта

## Приоритеты

Бэклог организован в 4 приоритетных волны, 23 эпика, ~127 историй.

### P0 — MVP (Q1 2026)

Минимальный жизнеспособный продукт. Всё необходимое для приёма и маршрутизации лидов.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-01 | Lead Intake API | REST API для приёма лидов, валидация, E.164, idempotency |
| EPIC-02 | Lead Routing Engine | Правила маршрутизации, капы, GEO-фильтры, алгоритмы |
| EPIC-03 | Broker Integration | Шаблоны интеграций, field mapping, доставка лидов |
| EPIC-04 | Affiliate Management | Аккаунты аффилейтов, API-ключи, postback-и |
| EPIC-05 | Lead Management UI | Веб-интерфейс для управления лидами |
| EPIC-06 | RBAC & Auth | Роли, права, JWT, мультитенантность |
| EPIC-07 | Anti-Fraud Basic | Базовый антифрод: IP check, velocity, quality scoring |

### P1 — Launch (Q2 2026)

Запуск с полным набором функций для первых клиентов.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-08 | Autologin | Автологин-пайплайн, proxy, device fingerprint |
| EPIC-09 | UAD (Reinjection) | Повторная дистрибуция непроданных лидов |
| EPIC-10 | Analytics & Reporting | ClickHouse аналитика, дашборды, конверсии |
| EPIC-11 | Notifications | Telegram (17+ событий), Email, Webhook |
| EPIC-12 | P&L Tracking | Profit & Loss по аффилейтам, брокерам, GEO |
| EPIC-13 | Onboarding Wizard | Setup wizard, шаблоны, быстрый старт |

### P2 — Growth (Q3 2026)

Рост и расширение. Продвинутые функции для масштабирования.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-14 | BI & Advanced Analytics | BI-layer, time-series, cohort-анализ |
| EPIC-15 | Mobile Monitoring | Мобильный интерфейс для мониторинга |
| EPIC-16 | Marketplace | Маркетплейс брокерских интеграций |
| EPIC-17 | AI-Driven Routing | ML-оптимизация маршрутизации |
| EPIC-18 | Shave Detection | Обнаружение кражи лидов брокерами |
| EPIC-19 | Public API & SDK | Публичная документация API, SDK |

### P3 — Scale (Q4 2026)

Масштабирование и enterprise-функции.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-20 | White-Label | Кастомизация под брендинг клиента |
| EPIC-21 | Billing & Subscriptions | Встроенный биллинг, планы, инвойсы |
| EPIC-22 | Compliance & Audit | GDPR, KYC, полный аудит-трейл |
| EPIC-23 | AI Fraud v2 | Продвинутый AI-антифрод, ML-модели |

## Метрики бэклога

| Метрика | Значение |
|---------|----------|
| Эпиков | 23 |
| Историй | 176 |
| Задач | 602 |
| Оценка трудозатрат | ~6,640 часов |
| Параллельных потоков | 6 |
| Период | Март 2026 — Февраль 2027 |

## Потоки реализации (STREAMS.md)

Бэклог декомпозирован в 6 параллельных потоков:

| Поток | Домен | Эпики | Часов | Старт |
|-------|-------|-------|-------|-------|
| 1: Lead Pipeline | Core lead flow | EPIC-01→02→09→17 | 1,240 | Day 1 |
| 2: Platform & Identity | Auth, users, notifications | EPIC-06→04→11→13 | 1,060 | Day 1 |
| 3: Broker & Delivery | Brokers, autologin, P&L | EPIC-03→08→12→16 | 1,260 | Week 2 |
| 4: Fraud & Security | Anti-fraud, compliance | EPIC-07→18→22→23 | 1,040 | Week 2 |
| 5: Frontend & Analytics | UI, dashboards, mobile | EPIC-05→10→14→15 | 1,280 | Week 3 |
| 6: Scale & DX | DevOps, billing, white-label | EPIC-19→20→21 | 760 | Week 10 |

### Контрактные handoff-ы между потоками

- **LeadSchema** (Day 3-5) → Streams 3, 4, 5
- **AuthAPI** (Day 5-7) → JWT, RBAC roles
- **BrokerAPI** (Week 3-4) → Integration interface
- **FraudAPI** (Week 3-4) → Check request/response
- **AffiliateAPI** (Week 5-6) → Postback config
- **AnalyticsEvents** (Week 8-10) → Event schema

Контракт лида: `contracts/lead-schema.yaml`

## Связанные документы

- **Полный бэклог:** [`PRODUCT_BACKLOG_v1.md`](../../PRODUCT_BACKLOG_v1.md) — 23 эпика, 176 историй, 602 задачи
- **Потоки реализации:** [`STREAMS.md`](../../STREAMS.md) — 6 параллельных потоков
- **Контракт лида:** `contracts/lead-schema.yaml`
- **Промпт генерации:** `Transcript_videos/prompt_stage4_product_backlog.md`

## Текущий статус реализации

### Реализовано

- **13 микросервисов** — включая assistant-svc (AI) и smart-routing-svc (ML)
- **15 страниц Web UI** — полное покрытие P0/P1 + UAD, Smart Routing, Users, Sessions, Onboarding
- **Liquid Glass UI** — iOS 26 / macOS 26 стиль
- **Мобильное приложение** — Expo React Native (Dashboard, Leads, Brokers, Analytics, Settings)
- **AI Assistant** — Claude API + 40 инструментов + RBAC + streaming
- **RBAC** — 6 ролей, 32 разрешения, PermissionGate в UI
- **Схема БД** — 6 миграций (PostgreSQL + ClickHouse)
- **Unit-тесты** — admin, auth, intake, middleware
- **CI/CD** — GitHub Actions + Docker deploy pipeline
- **Docker Compose** — development + production (docker-compose.deploy.yml)

### Прогресс по потокам

| Поток | Статус |
|-------|--------|
| 1: Lead Pipeline (EPIC-01, 02, 09, 17) | ✅ Бэкенд + фронтенд реализованы |
| 2: Platform & Identity (EPIC-06, 04, 11, 13) | ✅ Бэкенд + фронтенд реализованы |
| 3: Broker & Delivery | 🟡 Базовая структура |
| 4: Fraud & Security | 🟡 Fraud Engine + базовый compliance |
| 5: Frontend & Analytics | ✅ UI, analytics, mobile app |
| 6: Scale & DX | 🟡 Deploy pipeline готов |
