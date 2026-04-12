# Декомпозиция на параллельные стримы — GambChamp CRM

**Цель:** Максимизировать параллельную работу 5-6 ботов с минимальными cross-stream блокировками.  
**Принцип:** Каждый стрим — автономная цепочка эпиков с чётким доменом. Синхронизация между стримами через контракты (API schemas, interfaces), а не через ожидание полной готовности.

---

## Сводка стримов

| # | Стрим | Эпики | Часы | Старт | Домен |
|---|-------|-------|------|-------|-------|
| 1 | **Lead Pipeline** | 01 → 02 → 09 → 17 | ~1,240h | Day 1 | Приём → маршрутизация → переотправка → AI |
| 2 | **Platform & Identity** | 06 → 04 → 11 → 13 | ~1,060h | Day 1 | Auth, аффилейты, уведомления, онбординг |
| 3 | **Broker & Delivery** | 03 → 08 → 12 → 16 | ~1,260h | Week 2 | Брокеры, автологин, P&L, маркетплейс |
| 4 | **Fraud & Security** | 07 → 18 → 22 → 23 | ~1,040h | Week 2 | Антифрод, шейв, compliance, ML |
| 5 | **Frontend & Analytics** | 05 → 10 → 14 → 15 | ~1,280h | Week 3 | Lead UI, дашборды, BI, мобайл |
| 6 | **Scale & DX** | 19 → 20 → 21 | ~760h | Week 10 | Dev portal, white-label, биллинг |
| | **ИТОГО** | **23 эпика** | **~6,640h** | | |

---

## Контракты синхронизации между стримами

Стримы работают параллельно, но им нужны **интерфейсные контракты** от других стримов. Контракт — это согласованная спецификация (OpenAPI schema, DB schema, event format), которую можно зафиксировать ДО полной реализации.

| Контракт | Кто создаёт | Кто ждёт | Когда нужен | Что содержит |
|----------|-------------|----------|-------------|--------------|
| **LeadSchema** | Stream 1 (EPIC-01) | Streams 3, 4, 5 | **Day 3-5** | Таблица `leads` DDL, LeadRequest/LeadResponse JSON schemas, event format для lead_events |
| **AuthAPI** | Stream 2 (EPIC-06) | Stream 5 | **Day 5-7** | JWT format, RBAC roles enum, middleware interface, user/company context |
| **BrokerAPI** | Stream 3 (EPIC-03) | Streams 1, 5 | **Week 3-4** | BrokerIntegration interface, send_lead() contract, status callback format |
| **FraudAPI** | Stream 4 (EPIC-07) | Streams 1, 3, 5 | **Week 3-4** | FraudCheck request/response, score format, verification card schema |
| **AffiliateAPI** | Stream 2 (EPIC-04) | Streams 3, 5 | **Week 5-6** | Affiliate model, API key format, postback config schema |
| **AnalyticsEvents** | Stream 5 (EPIC-10) | Streams 1, 4, 6 | **Week 8-10** | Event bus format, metric naming, ClickHouse schema |

**Правило:** Контракт фиксируется в `contracts/` директории проекта как OpenAPI/JSON Schema файл. Стрим-потребитель начинает работу по контракту с моками, а позже подключает реальную реализацию.

---

## Stream 1: Lead Pipeline 🔵

**Домен:** Ядро обработки лидов — от приёма до AI-оптимизации маршрутов.  
**Стек:** Go (backend), PostgreSQL, Redis (caps/cache).  
**Старт:** Day 1 (корневой стрим, без зависимостей).

### Последовательность эпиков

```
EPIC-01 ──▶ EPIC-02 ──▶ EPIC-09 ──▶ EPIC-17
Lead Intake   Routing     UAD         Smart Routing AI
320h          440h        280h        200h
Week 1-4      Week 4-10   Week 10-14  Week 16-20
```

### EPIC-01: Lead Intake API (320h)
- 12 stories, 44 tasks
- REST API `POST /api/v1/leads`, валидация, E.164 нормализация, дедупликация, idempotency key
- **Выход → контракт LeadSchema (Day 3-5):** зафиксировать DB schema + JSON request/response ДО полной реализации, чтобы разблокировать стримы 3, 4, 5
- **Ключевые stories:** STORY-001 (REST endpoint), STORY-002 (валидация), STORY-003 (E.164), STORY-004 (дедупликация), STORY-005 (idempotency key), STORY-008 (CSV import)

### EPIC-02: Lead Routing Engine (440h)
- 11 stories, 41 tasks
- Weighted round-robin + SLOTS/CHANCE алгоритмы, визуальный редактор, GEO-фильтры, timezone-aware caps, per-country caps
- **Зависимость:** EPIC-01 (lead model)
- **Ключевые stories:** STORY-013 (routing core), STORY-014 (weighted RR), STORY-015 (SLOTS/CHANCE), STORY-016 (GEO фильтры), STORY-017 (caps engine), STORY-019 (visual editor)

### EPIC-09: Automated Lead Delivery — UAD (280h)
- 8 stories, 22 tasks
- Сценарный движок переотправки, расписание, интервалы, continuous mode, cold overflow pools
- **Зависимость:** EPIC-02 (routing engine), BrokerAPI контракт от Stream 3
- **Ключевые stories:** STORY-084 (scenario builder), STORY-085 (scheduling), STORY-088 (continuous mode)

### EPIC-17: Smart Routing AI/ML v1 (200h)
- 5 stories, 16 tasks
- Авто-оптимизация весов по CR, предсказание cap exhaustion, auto-failover
- **Зависимость:** EPIC-02 (routing), AnalyticsEvents контракт от Stream 5
- **Ключевые stories:** STORY-148 (weight recommendations), STORY-149 (cap prediction), STORY-150 (auto-failover)

### Критический путь стрима
```
Day 1 ─── LeadSchema contract (Day 3-5) ─── EPIC-01 done (Week 4) ─── EPIC-02 done (Week 10) ─── UAD (Week 14) ─── AI (Week 20)
```

---

## Stream 2: Platform & Identity 🟣

**Домен:** Пользователи, роли, аффилейты, уведомления, онбординг.  
**Стек:** Go/Node.js (backend), React (frontend), PostgreSQL.  
**Старт:** Day 1 (корневой стрим, без зависимостей).

### Последовательность эпиков

```
EPIC-06 ──▶ EPIC-04 ──▶ EPIC-11 ──▶ EPIC-13
RBAC         Affiliates   Notif.      Onboarding
320h         340h         200h        200h
Week 1-4     Week 4-8     Week 8-11   Week 12-14
```

### EPIC-06: User Accounts & RBAC (320h)
- 10 stories, 35 tasks
- JWT + refresh token auth, 7 ролей, per-column permissions, 2FA, multi-tenant isolation (PostgreSQL RLS), audit log
- **Выход → контракт AuthAPI (Day 5-7):** JWT format, roles enum, middleware interface
- **Ключевые stories:** STORY-052 (регистрация), STORY-053 (JWT auth), STORY-054 (RBAC), STORY-055 (per-column permissions), STORY-056 (2FA), STORY-057 (multi-tenant)

### EPIC-04: Affiliate Management (340h)
- 10 stories, 32 tasks
- Профили аффилейтов, API-ключи, постбеки с 20+ переменными, sub-accounts, иерархия, fraud profiles per affiliate
- **Зависимость:** EPIC-06 (auth + roles)
- **Выход → контракт AffiliateAPI (Week 5-6)**
- **Ключевые stories:** STORY-033 (профили), STORY-034 (API ключи), STORY-035 (постбеки), STORY-037 (иерархия)

### EPIC-11: Notifications & Alerts (200h)
- 7 stories, 21 tasks
- Telegram bot (17+ событий), email alerts, webhooks, in-app feed, per-affiliate/brand/GEO фильтры
- **Зависимость:** EPIC-06 (user preferences)
- **Ключевые stories:** STORY-105 (Telegram bot), STORY-106 (17 event types), STORY-108 (email), STORY-110 (in-app feed)

### EPIC-13: Onboarding & Setup Wizard (200h)
- 8 stories, 21 tasks
- 6-step wizard, 5 шаблонов сценариев, тест-лид с визуализацией, цель: < 30 мин до первого лида
- **Зависимость:** Все P0 эпики должны быть функциональны (работает после интеграции всех стримов)
- **Ключевые stories:** STORY-119 (wizard flow), STORY-120 (шаблоны), STORY-122 (тест-лид)

### Критический путь стрима
```
Day 1 ─── AuthAPI contract (Day 5-7) ─── EPIC-06 done (Week 4) ─── AffiliateAPI (Week 5-6) ─── EPIC-04 done (Week 8) ─── Notifications (Week 11) ─── Onboarding (Week 14)
```

---

## Stream 3: Broker & Delivery 🟠

**Домен:** Всё, что связано с брокерами — интеграции, автологин, конверсии, маркетплейс.  
**Стек:** Go (backend), Node.js (webhook adapters), React (frontend), proxy infrastructure.  
**Старт:** Week 2 (нужен контракт LeadSchema от Stream 1).

### Последовательность эпиков

```
EPIC-03 ──▶ EPIC-08 ──▶ EPIC-12 ──▶ EPIC-16
Broker Intg.  Autologin   P&L         Marketplace
380h          360h        280h        240h
Week 2-6      Week 6-10   Week 10-14  Week 16-20
```

### EPIC-03: Broker Integration Layer (380h)
- 9 stories, 32 tasks
- 200+ broker templates, field mapping, тест-лид, opening hours, postback с 20+ переменными, funnel substitution, clone config
- **Зависимость:** LeadSchema контракт (Day 3-5)
- **Выход → контракт BrokerAPI (Week 3-4):** send_lead() interface, status callback format
- **Ключевые stories:** STORY-024 (template library), STORY-025 (field mapping), STORY-026 (тест-лид), STORY-027 (postback handler), STORY-029 (opening hours)

### EPIC-08: Autologin & Proxy Pipeline (360h)
- 9 stories, 34 tasks
- 4-stage pipeline, device fingerprint, proxy pool, SLA guarantee, failover, retry policy, anomaly detection
- **Зависимость:** EPIC-03 (broker connections)
- **ДИФФЕРЕНЦИАТОР:** SLA 99.5% на autologin (никто на рынке не даёт)
- **Ключевые stories:** STORY-075 (4-stage pipeline), STORY-076 (device fingerprint), STORY-077 (proxy pool), STORY-078 (SLA monitoring), STORY-079 (failover)

### EPIC-12: Conversions & Basic P&L (280h)
- 7 stories, 21 tasks
- Регистрация конверсий, buy/sell pricing, reconciliation, Fake FTD, virtual wallets, affiliate payouts
- **Зависимость:** EPIC-03 (broker status callbacks), AffiliateAPI контракт от Stream 2
- **Ключевые stories:** STORY-112 (conversion registration), STORY-113 (P&L calculation), STORY-114 (Fake FTD), STORY-115 (wallets)

### EPIC-16: Integration Marketplace (240h)
- 5 stories, 18 tasks
- Каталог 200+ шаблонов с поиском, one-click install, community submissions, рейтинг и reviews
- **Зависимость:** EPIC-03 (template system)
- **Ключевые stories:** STORY-143 (каталог), STORY-144 (one-click install), STORY-145 (community submissions)

### Критический путь стрима
```
LeadSchema (Day 3-5) ─── EPIC-03 start (Week 2) ─── BrokerAPI contract (Week 3-4) ─── EPIC-03 done (Week 6) ─── Autologin (Week 10) ─── P&L (Week 14) ─── Marketplace (Week 20)
```

---

## Stream 4: Fraud & Security 🔴

**Домен:** Антифрод, защита от шейва, compliance, ML-модели.  
**Стек:** Go (scoring pipeline), Python (ML), PostgreSQL, Redis.  
**Старт:** Week 2 (нужен контракт LeadSchema от Stream 1).

### Последовательность эпиков

```
EPIC-07 ──▶ EPIC-18 ──▶ EPIC-22 ──▶ EPIC-23
Anti-Fraud   Shave Det.   Compliance   ML Fraud
400h         160h         200h         280h
Week 2-7     Week 7-9     Week 10-13   Week 16-22
```

### EPIC-07: Anti-Fraud System (400h)
- 9 stories, ~35 tasks
- Real-time scoring 0-100 (<200ms), IP/email/phone/VOIP проверки, blacklists, per-affiliate fraud profiles, Provable Anti-Fraud (PDF карточка), Status Pipe Pending
- **Зависимость:** LeadSchema контракт (Day 3-5)
- **Выход → контракт FraudAPI (Week 3-4):** FraudCheck request/response, score format
- **ДИФФЕРЕНЦИАТОР:** Unlimited fraud checks (HyperOne лимитирует по тарифу), PDF карточка верификации для споров с брокерами
- **Ключевые stories:** STORY-062 (scoring pipeline), STORY-063 (IP check), STORY-064 (email/phone), STORY-065 (blacklists), STORY-066 (fraud profiles), STORY-067 (verification card PDF)

### EPIC-18: Status Groups & Shave Detection (160h)
- 5 stories, 15 tasks
- Нормализация статусов, детекция shaving, алерты при аномалиях, кросс-брокерная аналитика
- **Зависимость:** EPIC-07 (fraud infrastructure), BrokerAPI контракт от Stream 3
- **Ключевые stories:** STORY-153 (status mapping), STORY-154 (shave detection engine), STORY-155 (anomaly alerts)

### EPIC-22: Compliance & Security Hardening (200h)
- 5 stories, 16 tasks
- SOC 2 Type II prep, GDPR, audit logs, IP whitelist, session management, encryption at rest
- **Зависимость:** EPIC-06 AuthAPI контракт (audit infrastructure)
- **Ключевые stories:** STORY-173 (audit logging), STORY-174 (IP whitelist + sessions), STORY-175 (GDPR)

### EPIC-23: Smart Fraud AI/ML v2 (280h)
- 6 stories, 22 tasks
- ML-модель (XGBoost + SHAP), behavioural analysis, velocity checks, shared fraud intelligence (opt-in)
- **Зависимость:** EPIC-07 (fraud data), AnalyticsEvents от Stream 5 (training data)
- **Ключевые stories:** STORY-178 (ML model), STORY-179 (behavioural analysis), STORY-180 (velocity checks), STORY-181 (shared intelligence)

### Критический путь стрима
```
LeadSchema (Day 3-5) ─── EPIC-07 start (Week 2) ─── FraudAPI contract (Week 3-4) ─── EPIC-07 done (Week 7) ─── Shave (Week 9) ─── Compliance (Week 13) ─── ML Fraud (Week 22)
```

---

## Stream 5: Frontend & Analytics 🔵‍🟢

**Домен:** Все пользовательские интерфейсы, дашборды, аналитика, мобайл.  
**Стек:** React + TypeScript (frontend), ClickHouse (analytics), PWA.  
**Старт:** Week 3 (нужны контракты LeadSchema + AuthAPI).

### Последовательность эпиков

```
EPIC-05 ──▶ EPIC-10 ──▶ EPIC-14 ──▶ EPIC-15
Lead UI      Analytics    BI          Mobile PWA
360h         400h        320h        200h
Week 3-7     Week 7-12   Week 13-17  Week 18-21
```

### EPIC-05: Lead Management UI (360h)
- 12 stories, ~35 tasks
- Таблица 10K+ строк (virtual scroll), 46+ колонок, 18 фильтров, lead profile (5 табов), Client History, Q-Leads, bulk operations, export, saved views
- **Зависимость:** LeadSchema + AuthAPI контракты. Работает с моками до готовности backend.
- **Ключевые stories:** STORY-040 (таблица), STORY-041 (колонки), STORY-042 (фильтры), STORY-043 (lead profile), STORY-044 (Client History), STORY-045 (Q-Leads), STORY-046 (bulk ops), STORY-048 (export)

### EPIC-10: Analytics Dashboard v1 (400h)
- 13 stories, 32 tasks
- KPI tiles, time-series с drill-down, affiliate P&L, broker ROI, cohort analysis, shave detection analytics, cap prediction, 15+ фильтров, saved presets, compare periods
- **Зависимость:** Backend APIs от Streams 1, 2, 3
- **ГЛАВНОЕ КОНКУРЕНТНОЕ ПРЕИМУЩЕСТВО** — ни один конкурент не делает time-series + drill-down + cohorts хорошо
- **Выход → контракт AnalyticsEvents (Week 8-10)**
- **Ключевые stories:** STORY-092 (KPI tiles), STORY-093 (time-series), STORY-094 (affiliate P&L), STORY-095 (broker ROI), STORY-096 (cohorts), STORY-097 (shave analytics), STORY-098 (cap prediction), STORY-100 (compare periods)

### EPIC-14: Advanced Analytics & BI (320h)
- 8 stories, 31 tasks
- Custom report builder, dashboard constructor, scheduled email reports, CSV/Excel/PDF export, shared filters
- **Зависимость:** EPIC-10 (analytics infrastructure)
- **Ключевые stories:** STORY-130 (report builder), STORY-131 (dashboard constructor), STORY-133 (scheduled reports)

### EPIC-15: Mobile Dashboard — PWA (200h)
- 5 stories, 17 tasks
- PWA с KPI дашбордом, push notifications, управление капами, мобильные графики
- **Зависимость:** EPIC-10 (analytics APIs), EPIC-11 (push infrastructure)
- **УНИКАЛЬНОЕ ПРЕИМУЩЕСТВО** — ни один конкурент не имеет мобильного интерфейса
- **Ключевые stories:** STORY-138 (KPI dashboard), STORY-139 (push), STORY-140 (cap management)

### Критический путь стрима
```
Contracts (Week 2-3) ─── Lead UI (Week 3-7) ─── Analytics (Week 7-12) ─── BI (Week 13-17) ─── Mobile (Week 18-21)
```

---

## Stream 6: Scale & DX 🔘

**Домен:** Developer experience, white-label, биллинг.  
**Стек:** React (portal), Go (backend), Stripe, PostgreSQL.  
**Старт:** Week 10 (после стабилизации P0). Этот стрим может быть назначен боту, завершившему свой основной стрим раньше.

### Последовательность эпиков

```
EPIC-19 ──▶ EPIC-20 ──▶ EPIC-21
Dev Portal   White-Label  Billing
240h         320h         200h
Week 10-13   Week 14-18   Week 19-22
```

### EPIC-19: Public API & Developer Portal (240h)
- 5 stories, 18 tasks
- OpenAPI docs, SDK (JS, Python, PHP), sandbox, API explorer, changelog
- **Зависимость:** Все P0 API стабильны
- **Ключевые stories:** STORY-158 (OpenAPI docs), STORY-159 (SDKs), STORY-160 (sandbox)

### EPIC-20: White-Label & Multi-Tenant (320h)
- 5 stories, 18 tasks
- Custom domain/branding, data isolation, reseller parent-child, white-label email
- **Зависимость:** EPIC-06 (tenant infrastructure)
- **Ключевые stories:** STORY-163 (custom branding), STORY-164 (data isolation), STORY-165 (reseller accounts)

### EPIC-21: Billing & Subscription Management (200h)
- 5 stories, 15 tasks
- 3 тарифа ($399/$699/$1199), Stripe + crypto payments, usage-based billing, invoicing
- **Зависимость:** EPIC-20 (tenant model)
- **Ключевые stories:** STORY-168 (pricing tiers), STORY-169 (Stripe integration), STORY-170 (usage billing)

---

## Таймлайн параллельной работы

```
Week:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22
       │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
S1:    ██EPIC-01███████ ██████EPIC-02██████████████ █EPIC-09████████ ····EPIC-17█████████
S2:    ██EPIC-06███████ ██████EPIC-04██████████ █EPIC-11█████ █EPIC-13█████
S3:    ·  ██EPIC-03████████████ ████EPIC-08████████ ██EPIC-12██████ ····EPIC-16█████████
S4:    ·  ██EPIC-07████████████████ █E-18██ ███EPIC-22█████ ········EPIC-23█████████████
S5:    ·  ·  ████EPIC-05██████████ █████EPIC-10████████████ █EPIC-14████████ █EPIC-15████
S6:    ·  ·  ·  ·  ·  ·  ·  ·  ·  ██EPIC-19█████ ██EPIC-20██████████ ██EPIC-21████
       │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
       ▲   ▲           ▲                       ▲                                           ▲
       │   │           │                       │                                           │
   Day 1   LeadSchema  BrokerAPI +          P0 done                                    All done
   Start   contract    FraudAPI             (MVP)                                      Week 22
```

---

## Правила работы между стримами

### 1. Contract-First Development
- Перед началом кодирования эпика стрим-владелец публикует **контракт** (OpenAPI schema / JSON Schema / DB DDL) в `contracts/` директории
- Стримы-потребители начинают работу по контракту с **моками/стабами**
- При изменении контракта — уведомление в общий канал + миграционный период 48h

### 2. Интеграционные точки
- **Неделя 4:** Streams 1+2 → первый end-to-end тест (приём лида с авторизацией)
- **Неделя 6:** Streams 1+3 → первый лид отправлен реальному брокеру
- **Неделя 7:** Streams 1+4 → лид проходит fraud scoring перед маршрутизацией
- **Неделя 8:** Streams 2+5 → Lead UI работает с реальными данными и RBAC
- **Неделя 10:** **Все P0 стримы** → MVP integration testing
- **Неделя 12:** Streams 3+5 → Analytics показывает данные по брокерам
- **Неделя 14:** Full P1 integration

### 3. Приоритет блокировок
Если стрим заблокирован ожиданием контракта:
1. Работать над stories внутри эпика, не зависящими от контракта (UI/Design/QA prep)
2. Создавать моки/стабы по предварительному контракту
3. Помогать стриму-блокеру с его задачами
4. Работать над документацией и тестами

### 4. Код-ревью
- Внутри стрима: ревью между tasks (бот ревьюит свои PR самостоятельно)
- Между стримами: ревью на **интеграционных точках** (неделя 4, 6, 7, 8, 10)

---

## Назначение ботов

| Бот | Стрим | Скиллы | Первый эпик |
|-----|-------|--------|-------------|
| Bot 1 | Lead Pipeline | Go backend, PostgreSQL, Redis | EPIC-01 (Day 1) |
| Bot 2 | Platform & Identity | Go/Node.js backend, React, PostgreSQL | EPIC-06 (Day 1) |
| Bot 3 | Broker & Delivery | Go backend, webhook patterns, proxy infra | EPIC-03 (Week 2) |
| Bot 4 | Fraud & Security | Go backend, Python ML, security | EPIC-07 (Week 2) |
| Bot 5 | Frontend & Analytics | React, TypeScript, ClickHouse, D3/Recharts | EPIC-05 (Week 3) |
| Bot 6 | Scale & DX | React, Go, Stripe, docs | EPIC-19 (Week 10) |

**Примечание:** Bot 6 может быть назначен позже (когда один из ботов 1-5 освободится), либо работать с Week 1 на подготовку инфраструктуры (CI/CD, Docker, staging environment, shared libraries).

---

## Раннее освобождение ботов

| Стрим | Заканчивает | Переключается на |
|-------|-------------|-------------------|
| Stream 2 (Platform) | ~Week 14 | → Stream 6 (Scale) или помощь Stream 5 |
| Stream 4 (Fraud) | ~Week 13 (до EPIC-23) | → EPIC-23 начинается Week 16, gap можно заполнить помощью другим стримам |
| Stream 1 (Lead Pipeline) | ~Week 14 (до EPIC-17) | → EPIC-17 начинается Week 16, можно помочь Stream 3 |

---

*Документ создан: Апрель 2026 | На основе PRODUCT_BACKLOG_v1.md (23 эпика, 176 stories, 602 tasks)*
