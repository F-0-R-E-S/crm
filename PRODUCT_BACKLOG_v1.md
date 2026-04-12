# PRODUCT BACKLOG v1.0

**Продукт:** GambChamp CRM — платформа дистрибуции лидов для крипто/форекс affiliate-маркетинга
**Версия:** 1.0
**Дата:** Март 2026
**Статус:** Draft

---

## СВОДНАЯ ТАБЛИЦА ЭПИКОВ

| Epic ID | Название | Приоритет | Размер | Stories | Story Points | Статус |
|---------|----------|-----------|--------|---------|--------------|--------|
| EPIC-01 | Lead Intake API | P0 (MVP) | L | 12 | 68 | Draft |
| EPIC-02 | Lead Routing Engine | P0 (MVP) | XL | 13 | 89 | Draft |
| EPIC-03 | Broker Integration Layer | P0 (MVP) | XL | 10 | 76 | Draft |
| EPIC-04 | Affiliate Management | P0 (MVP) | L | 9 | 55 | Draft |
| EPIC-05 | Lead Management UI | P0 (MVP) | L | 10 | 62 | Draft |
| EPIC-06 | User Accounts & RBAC | P0 (MVP) | L | 11 | 71 | Draft |
| EPIC-07 | Anti-Fraud System | P0 (MVP) | XL | 10 | 74 | Draft |
| EPIC-08 | Autologin & Proxy Pipeline | P1 (Launch) | XL | 9 | 65 | Draft |
| EPIC-09 | Automated Lead Delivery (UAD) | P1 (Launch) | L | 7 | 44 | Draft |
| EPIC-10 | Analytics Dashboard v1 | P1 (Launch) | XL | 9 | 68 | Draft |
| EPIC-11 | Notifications & Alerts | P1 (Launch) | M | 7 | 39 | Draft |
| EPIC-12 | Conversions & Basic P&L | P1 (Launch) | L | 7 | 50 | Draft |
| EPIC-13 | Onboarding & Setup Wizard | P1 (Launch) | M | 7 | 41 | Draft |
| EPIC-14 | Advanced Analytics & BI | P2 (Growth) | XL | 10 | 72 | Draft |
| EPIC-15 | Mobile Dashboard | P2 (Growth) | L | 8 | 55 | Draft |
| EPIC-16 | Integration Marketplace | P2 (Growth) | L | 7 | 45 | Draft |
| EPIC-17 | Smart Routing (AI/ML v1) | P2 (Growth) | XL | 6 | 48 | Draft |
| EPIC-18 | Status Groups & Shave Detection | P2 (Growth) | L | 7 | 42 | Draft |
| EPIC-19 | Public API & Developer Portal | P2 (Growth) | L | 8 | 50 | Draft |
| EPIC-20 | White-Label & Multi-Tenant Platform | P3 (Scale) | XL | 8 | 55 | Draft |
| EPIC-21 | Billing & Subscription Management | P3 (Scale) | L | 8 | 52 | Draft |
| EPIC-22 | Compliance & Security Hardening | P3 (Scale) | L | 7 | 45 | Draft |
| EPIC-23 | Smart Fraud (AI/ML v2) | P3 (Scale) | XL | 6 | 48 | Draft |

**Итого:** 23 эпика | 196 stories | ~1,384 story points | ~4,500+ часов разработки

---

## ROADMAP

### Q1 (MVP): Минимально жизнеспособный продукт
- **EPIC-01** Lead Intake API
- **EPIC-02** Lead Routing Engine
- **EPIC-03** Broker Integration Layer
- **EPIC-04** Affiliate Management
- **EPIC-05** Lead Management UI
- **EPIC-06** User Accounts & RBAC
- **EPIC-07** Anti-Fraud System

### Q2 (Launch): Выход на рынок
- **EPIC-08** Autologin & Proxy Pipeline
- **EPIC-09** Automated Lead Delivery (UAD)
- **EPIC-10** Analytics Dashboard v1
- **EPIC-11** Notifications & Alerts
- **EPIC-12** Conversions & Basic P&L
- **EPIC-13** Onboarding & Setup Wizard

### Q3 (Growth): Рост и удержание
- **EPIC-14** Advanced Analytics & BI
- **EPIC-15** Mobile Dashboard
- **EPIC-16** Integration Marketplace
- **EPIC-17** Smart Routing (AI/ML v1)
- **EPIC-18** Status Groups & Shave Detection
- **EPIC-19** Public API & Developer Portal

### Q4 (Scale): Масштабирование платформы
- **EPIC-20** White-Label & Multi-Tenant Platform
- **EPIC-21** Billing & Subscription Management
- **EPIC-22** Compliance & Security Hardening
- **EPIC-23** Smart Fraud (AI/ML v2)

---
---

## [EPIC-01] Lead Intake API

**Цель:** Обеспечить надёжный приём лидов от аффилейтов через REST API с валидацией, дедупликацией и нормализацией данных (телефон, email, GEO). Это ядро платформы — без него ни один лид не попадёт в систему.

**Метрика успеха:**
- API принимает ≥ 500 лидов/сек при p99 latency < 200ms
- Доля невалидных лидов, прошедших валидацию = 0%
- Время от получения лида до готовности к роутингу < 500ms
- Uptime API > 99.9%

**Приоритет:** P0 (MVP)
**Зависит от:** [EPIC-06] (аутентификация по API-ключу)
**Оценка:** L (1-3 мес)

---

### Stories:

---

#### [STORY-001] Отправка лида через REST API

**Как** Developer (аффилейт-разработчик), **я хочу** отправить данные лида через POST-запрос на REST API, **чтобы** лид был зарегистрирован в системе и передан на маршрутизацию.

**Acceptance Criteria:**
- [ ] AC1: API принимает POST-запрос на `/api/v1/leads` с JSON-телом, содержащим обязательные поля: `first_name`, `last_name`, `email`, `phone`, `country`, `ip`. Опциональные поля: `language`, `funnel_id`, `click_id`, `sub_id_1`..`sub_id_5`, `custom_fields` (объект до 20 ключей)
- [ ] AC2: При успешном создании API возвращает HTTP 201 с телом `{ "id": "uuid", "status": "new", "created_at": "ISO8601" }` и latency < 200ms (p95)
- [ ] AC3: При невалидных данных API возвращает HTTP 422 с телом `{ "errors": [{ "field": "email", "code": "INVALID_FORMAT", "message": "..." }] }` — массив всех ошибок, не только первой
- [ ] AC4: При отсутствии/невалидном API-ключе в заголовке `X-API-Key` API возвращает HTTP 401 `{ "error": "UNAUTHORIZED", "message": "Invalid or missing API key" }`
- [ ] AC5: При превышении rate limit (по умолчанию 100 req/sec per API key) API возвращает HTTP 429 с заголовком `Retry-After` (в секундах)
- [ ] AC6: API поддерживает идемпотентность через заголовок `Idempotency-Key` — повторный запрос с тем же ключом в течение 24ч возвращает тот же результат без создания дубликата
- [ ] AC7: Все запросы логируются в таблицу `api_request_log` с полями: `request_id`, `api_key_id`, `endpoint`, `status_code`, `latency_ms`, `ip`, `created_at`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** —

##### Tasks для STORY-001:

**[TASK-0001] Спроектировать схему БД для лидов**
- **Тип:** Backend
- **Описание:** Создать миграцию PostgreSQL для таблицы `leads` с полями: `id` (UUID, PK), `company_id` (FK), `affiliate_id` (FK), `first_name` (varchar 100), `last_name` (varchar 100), `email` (varchar 255), `phone` (varchar 20, E.164), `country` (char 2, ISO 3166-1), `ip` (inet), `language` (char 2), `funnel_id` (varchar 50, nullable), `click_id` (varchar 100, nullable), `sub_id_1`..`sub_id_5` (varchar 255, nullable), `custom_fields` (jsonb, nullable), `status` (enum: new/processing/sent/rejected/error), `fraud_score` (smallint, nullable), `source_api_key_id` (FK), `idempotency_key` (varchar 64, unique per company, nullable), `created_at` (timestamptz), `updated_at` (timestamptz). Индексы: `(company_id, created_at)`, `(company_id, email)`, `(company_id, phone)`, `(company_id, status)`, `(idempotency_key, company_id)` UNIQUE.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется без ошибок
  - [ ] Rollback-миграция работает корректно
  - [ ] Индексы покрывают основные запросы (EXPLAIN ANALYZE подтверждает Index Scan)
  - [ ] Партиционирование по `created_at` (месячное) настроено для таблицы > 10M строк
- **Оценка:** 4h
- **Story:** [STORY-001]

**[TASK-0002] Спроектировать схему БД для API request log**
- **Тип:** Backend
- **Описание:** Создать миграцию для таблицы `api_request_log`: `id` (bigserial), `request_id` (UUID), `company_id` (FK), `api_key_id` (FK), `endpoint` (varchar 100), `method` (varchar 10), `status_code` (smallint), `request_body_hash` (varchar 64), `response_status` (varchar 20), `latency_ms` (int), `ip` (inet), `user_agent` (varchar 500), `created_at` (timestamptz). Партиционирование по `created_at` (ежедневное). TTL — 90 дней (pg_partman автоочистка).
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется
  - [ ] Автоочистка старых партиций настроена (pg_partman или cron)
  - [ ] Запись лога не блокирует основной запрос (асинхронная запись через очередь)
- **Оценка:** 4h
- **Story:** [STORY-001]

**[TASK-0003] Реализовать POST /api/v1/leads endpoint**
- **Тип:** Backend
- **Описание:** Реализовать Go-хэндлер для `POST /api/v1/leads`. Парсинг JSON-тела, базовая валидация обязательных полей (presence check), создание записи в БД со статусом `new`, возврат 201 с UUID. Middleware для API-key auth (из EPIC-06) — заглушка на этапе разработки. Асинхронная запись в `api_request_log` через канал/горутину. Metrics: prometheus counter `leads_created_total`, histogram `lead_intake_duration_seconds`.
- **Критерии готовности (DoD):**
  - [ ] Endpoint обрабатывает запрос за < 50ms (без учёта сети)
  - [ ] Тело ответа соответствует спецификации (201, 422, 401, 429)
  - [ ] Request log записывается асинхронно
  - [ ] Prometheus-метрики экспортируются
  - [ ] Unit-тесты покрывают happy path + все error codes
- **Оценка:** 8h
- **Story:** [STORY-001]

**[TASK-0004] Реализовать Idempotency-Key механизм**
- **Тип:** Backend
- **Описание:** Middleware, который проверяет заголовок `Idempotency-Key`. Если ключ уже существует для данного `company_id` — возвращает закешированный ответ из Redis (TTL 24ч). Если нет — обрабатывает запрос, кеширует ответ в Redis с ключом `idempotency:{company_id}:{key}`. При race condition (два запроса с одним ключом одновременно) — использовать Redis SETNX для lock.
- **Критерии готовности (DoD):**
  - [ ] Повторный запрос с тем же ключом возвращает идентичный ответ без создания дубликата
  - [ ] TTL ключа = 24 часа
  - [ ] Race condition обрабатывается корректно (только один лид создаётся)
  - [ ] Тест: 10 параллельных запросов с одним ключом → 1 лид в БД
- **Оценка:** 4h
- **Story:** [STORY-001]

**[TASK-0005] Реализовать rate limiting middleware**
- **Тип:** Backend
- **Описание:** Token bucket rate limiter на основе Redis. Ключ: `ratelimit:{api_key_id}`. Дефолтный лимит: 100 req/sec (настраивается per API key в БД). При превышении — HTTP 429 с заголовком `Retry-After` и телом `{ "error": "RATE_LIMIT_EXCEEDED", "retry_after": N }`. Prometheus-метрика `rate_limit_exceeded_total` по `api_key_id`.
- **Критерии готовности (DoD):**
  - [ ] Rate limit применяется per API key
  - [ ] Заголовок `Retry-After` корректен
  - [ ] Лимит настраивается per API key без рестарта сервиса
  - [ ] Тест: 150 запросов за 1 сек при лимите 100 → 50 получают 429
- **Оценка:** 4h
- **Story:** [STORY-001]

**[TASK-0006] Написать unit/integration тесты для Lead Intake API**
- **Тип:** QA
- **Описание:** Тест-сьют для POST /api/v1/leads: (1) Happy path — все поля валидны → 201, (2) Обязательное поле отсутствует → 422, (3) Невалидный email → 422, (4) Невалидный телефон → 422, (5) Невалидная страна → 422, (6) Множественные ошибки → 422 со всеми ошибками, (7) Нет API-ключа → 401, (8) Невалидный API-ключ → 401, (9) Rate limit → 429, (10) Idempotency — повтор → тот же ответ, (11) Большой custom_fields (> 20 ключей) → 422, (12) SQL injection в полях → безопасная обработка, (13) XSS в полях → санитизация
- **Критерии готовности (DoD):**
  - [ ] Покрытие > 90% по строкам для пакета lead intake
  - [ ] Integration-тесты с реальной PostgreSQL (testcontainers)
  - [ ] Integration-тесты с реальным Redis (testcontainers)
  - [ ] Все 13 кейсов проходят
- **Оценка:** 8h
- **Story:** [STORY-001]

**[TASK-0007] Создать OpenAPI-спецификацию для POST /api/v1/leads**
- **Тип:** Docs
- **Описание:** Написать OpenAPI 3.1 спецификацию для endpoint: request schema (с примерами), response schemas для 201/401/422/429, описание заголовков (`X-API-Key`, `Idempotency-Key`, `Retry-After`). Генерировать из аннотаций в Go-коде (swaggo/swag).
- **Критерии готовности (DoD):**
  - [ ] Спецификация валидна (проходит spectral lint)
  - [ ] Примеры запросов/ответов включены для каждого кода ответа
  - [ ] Swagger UI доступен по `/docs`
- **Оценка:** 2h
- **Story:** [STORY-001]

---

#### [STORY-002] Валидация данных лида

**Как** Network Admin, **я хочу** чтобы система автоматически валидировала все входящие данные лида по строгим правилам, **чтобы** в систему попадали только корректные данные и не тратились ресурсы на роутинг невалидных лидов.

**Acceptance Criteria:**
- [ ] AC1: Email валидируется по формату (RFC 5322), длина ≤ 255 символов. Не допускаются: disposable-домены (список 10K+ доменов, обновляемый еженедельно), домены без MX-записи (DNS-проверка с кешем 1ч)
- [ ] AC2: Телефон валидируется по формату E.164 (начинается с +, 7-15 цифр). Библиотека libphonenumber — проверка, что номер возможен для указанной страны
- [ ] AC3: Страна (`country`) — ISO 3166-1 alpha-2, проверяется по справочнику. При несовпадении IP-гео и указанной страны — лид принимается, но помечается флагом `geo_mismatch: true`
- [ ] AC4: `first_name` и `last_name` — от 1 до 100 символов, только буквы (Unicode), пробелы, дефисы, апострофы. Не допускаются: цифры, спецсимволы, строки из одного символа
- [ ] AC5: IP-адрес (`ip`) — валидный IPv4 или IPv6. Не допускаются: приватные диапазоны (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), localhost, 0.0.0.0
- [ ] AC6: `custom_fields` — максимум 20 ключей, ключ — строка 1-50 символов (alphanum + underscore), значение — строка до 500 символов. Общий размер JSON ≤ 10KB
- [ ] AC7: Все строковые поля проходят санитизацию: trim пробелов, удаление управляющих символов, HTML-тегов. Данные сохраняются в БД через параметризованные запросы (защита от SQL injection)
- [ ] AC8: При ошибке валидации ответ содержит ВСЕ ошибки (не только первую): `{ "errors": [{ "field": "email", "code": "DISPOSABLE_DOMAIN", "message": "..." }, { "field": "phone", "code": "INVALID_FOR_COUNTRY", "message": "..." }] }`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001]

##### Tasks для STORY-002:

**[TASK-0008] Реализовать валидатор email с DNS-проверкой**
- **Тип:** Backend
- **Описание:** Модуль валидации email: (1) формат RFC 5322 (regexp), (2) проверка домена в списке disposable (in-memory hashset, обновляется из GitHub-списка раз в неделю через cron), (3) DNS MX-lookup с таймаутом 2 сек и кешем в Redis (TTL 1 час). При недоступности DNS — лид принимается с флагом `email_mx_unchecked: true`.
- **Критерии готовности (DoD):**
  - [ ] Формат-валидация проходит 100% тестов из RFC 5322 примеров
  - [ ] Disposable-список содержит ≥ 10,000 доменов
  - [ ] DNS MX кеш работает (второй запрос того же домена < 1ms)
  - [ ] Graceful degradation при DNS-ошибке
- **Оценка:** 4h
- **Story:** [STORY-002]

**[TASK-0009] Реализовать валидатор телефонов (libphonenumber)**
- **Тип:** Backend
- **Описание:** Интеграция Go-порта libphonenumber. Валидация: (1) формат E.164, (2) номер возможен для указанной страны, (3) нормализация в E.164 формат (см. STORY-003). Выходные коды ошибок: `INVALID_FORMAT`, `INVALID_FOR_COUNTRY`, `TOO_SHORT`, `TOO_LONG`.
- **Критерии готовности (DoD):**
  - [ ] Корректно обрабатывает номера 50+ стран
  - [ ] Нормализует форматы: "+1 (555) 123-4567" → "+15551234567"
  - [ ] Ошибки содержат конкретный код причины
- **Оценка:** 4h
- **Story:** [STORY-002]

**[TASK-0010] Реализовать валидатор имён и страны**
- **Тип:** Backend
- **Описание:** (1) Имена: regexp `^[\p{L}\s'-]{2,100}$` + blacklist из очевидных тестовых значений ("test", "asdf", "aaaa"). (2) Страна: справочник ISO 3166-1 alpha-2 (in-memory map из 249 кодов). (3) IP: net.ParseIP + проверка на приватные диапазоны.
- **Критерии готовности (DoD):**
  - [ ] Принимает Unicode-имена (кириллица, арабская вязь, иероглифы)
  - [ ] Отклоняет тестовые/фейковые имена
  - [ ] ISO 3166-1 справочник полный (249 кодов)
- **Оценка:** 2h
- **Story:** [STORY-002]

**[TASK-0011] Реализовать валидатор custom_fields и санитизацию**
- **Тип:** Backend
- **Описание:** (1) Custom fields: проверка количества ключей ≤ 20, формат ключей (alphanum + underscore, 1-50 символов), длина значений ≤ 500, общий размер ≤ 10KB. (2) Санитизация всех строковых полей: `strings.TrimSpace`, удаление Unicode control characters (C0, C1), strip HTML-тегов (bluemonday или html.EscapeString). Параметризованные запросы к БД через sqlx/pgx.
- **Критерии готовности (DoD):**
  - [ ] Custom fields с 21 ключом → ошибка валидации
  - [ ] HTML-теги удаляются из всех строковых полей
  - [ ] SQL injection в любом поле не выполняется
  - [ ] XSS payload в custom_fields сохраняется безопасно
- **Оценка:** 4h
- **Story:** [STORY-002]

**[TASK-0012] Реализовать GEO-mismatch detection**
- **Тип:** Backend
- **Описание:** IP-геолокация через MaxMind GeoLite2 (локальная БД, обновление еженедельно). Сравнение определённой страны с полем `country` из запроса. При несовпадении — добавить `geo_mismatch: true` в метаданные лида. Не блокировать лид. Prometheus-метрика `leads_geo_mismatch_total`.
- **Критерии готовности (DoD):**
  - [ ] GeoLite2 БД загружена и обновляется по cron
  - [ ] Определение страны по IP работает для IPv4 и IPv6
  - [ ] При невозможности определить страну по IP — `geo_mismatch: null` (не true/false)
  - [ ] Лид не блокируется при mismatch
- **Оценка:** 4h
- **Story:** [STORY-002]

**[TASK-0013] Тесты валидации (unit + fuzz)**
- **Тип:** QA
- **Описание:** (1) Unit-тесты для каждого валидатора: позитивные + негативные кейсы (минимум 10 кейсов на валидатор). (2) Fuzz-тесты (Go native fuzzing) для email, phone, name валидаторов — поиск паник и edge cases. (3) Table-driven тесты с реальными данными из 20+ стран.
- **Критерии готовности (DoD):**
  - [ ] ≥ 80 тест-кейсов суммарно
  - [ ] Fuzz-тесты проходят 10 минут без паник
  - [ ] Покрытие валидаторов > 95%
- **Оценка:** 8h
- **Story:** [STORY-002]

---

#### [STORY-003] Нормализация данных лида

**Как** Network Admin, **я хочу** чтобы система автоматически нормализовала телефоны, email и страны при приёме лида, **чтобы** данные были в едином формате для корректной дедупликации и роутинга.

**Acceptance Criteria:**
- [ ] AC1: Телефон нормализуется в формат E.164: удаление пробелов, скобок, дефисов, определение кода страны. Примеры: "8 (925) 123-45-67" + country=RU → "+79251234567", "(555) 123-4567" + country=US → "+15551234567"
- [ ] AC2: Email нормализуется: lowercase, trim пробелов, удаление dots в локальной части для Gmail (user.name@gmail.com → username@gmail.com), удаление +suffix (user+tag@gmail.com → user@gmail.com)
- [ ] AC3: Страна определяется автоматически, если не указана: (1) по IP-адресу (GeoLite2), (2) по телефонному коду (+7 → RU/KZ, +1 → US/CA — используется IP для disambiguation). Если не удаётся определить — поле `country` остаётся `null`, лид принимается с флагом `country_unresolved: true`
- [ ] AC4: Оригинальные (до нормализации) данные сохраняются в поле `raw_data` (jsonb) для аудита и отладки
- [ ] AC5: Нормализация выполняется за < 10ms (без учёта DNS-запросов)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-002]

##### Tasks для STORY-003:

**[TASK-0014] Реализовать нормализатор телефонов**
- **Тип:** Backend
- **Описание:** Функция `NormalizePhone(phone string, countryHint string) (string, error)` на базе libphonenumber. Принимает любой формат, возвращает E.164. При неоднозначности (код +1 для US/CA) — использовать `countryHint`. При невозможности нормализации — вернуть ошибку с кодом `CANNOT_NORMALIZE`.
- **Критерии готовности (DoD):**
  - [ ] Корректно нормализует 20+ форматов из 10+ стран
  - [ ] Обрабатывает edge case: номер без кода страны + hint
  - [ ] Benchmark < 1ms на вызов
- **Оценка:** 4h
- **Story:** [STORY-003]

**[TASK-0015] Реализовать нормализатор email**
- **Тип:** Backend
- **Описание:** Функция `NormalizeEmail(email string) string`. Шаги: (1) lowercase, (2) trim, (3) для Gmail/Googlemail: удалить dots в local part, удалить +suffix, (4) для других провайдеров: удалить +suffix. Результат — каноническая форма для дедупликации.
- **Критерии готовности (DoD):**
  - [ ] Gmail dot-trick обрабатывается: "U.Ser.Name@gmail.com" → "username@gmail.com"
  - [ ] Plus-addressing: "user+tag@example.com" → "user@example.com"
  - [ ] Не ломает валидные email с точками в не-Gmail доменах
- **Оценка:** 2h
- **Story:** [STORY-003]

**[TASK-0016] Реализовать auto-detection страны и сохранение raw_data**
- **Тип:** Backend
- **Описание:** (1) Если `country` пустой — определить по IP (GeoLite2), fallback — по телефонному коду. (2) Добавить поле `raw_data` (jsonb) в таблицу leads, куда записываются оригинальные значения полей до нормализации. Миграция для добавления поля.
- **Критерии готовности (DoD):**
  - [ ] Country auto-detection работает для IP → country mapping
  - [ ] raw_data содержит оригинальные phone, email, country до нормализации
  - [ ] При отсутствии IP и телефонного кода — country = null, флаг country_unresolved = true
- **Оценка:** 4h
- **Story:** [STORY-003]

**[TASK-0017] Тесты нормализации**
- **Тип:** QA
- **Описание:** Table-driven тесты с реальными номерами из 20+ стран (RU, UA, US, UK, DE, FR, IL, TR, AE, BR, MX, IN, PH, NG, ZA, AU, JP, KR, TH, VN). Тесты нормализации email (Gmail dots, plus-addressing, Unicode domains). Тесты auto-detection country.
- **Критерии готовности (DoD):**
  - [ ] ≥ 40 тест-кейсов для телефонов (2 на страну)
  - [ ] ≥ 15 тест-кейсов для email
  - [ ] ≥ 10 тест-кейсов для auto-detection country
  - [ ] Все тесты проходят
- **Оценка:** 4h
- **Story:** [STORY-003]

---

#### [STORY-004] Дедупликация лидов

**Как** Affiliate Manager, **я хочу** чтобы система обнаруживала дубликаты лидов по email и телефону в рамках настраиваемого временного окна, **чтобы** не отправлять одного и того же лида брокеру дважды и не платить аффилейту за дубль.

**Acceptance Criteria:**
- [ ] AC1: Дедупликация проверяется по нормализованному email И/ИЛИ нормализованному телефону в рамках одного `company_id`
- [ ] AC2: Временное окно дедупликации настраивается per company (по умолчанию 30 дней, диапазон 1-365 дней) в настройках компании
- [ ] AC3: При обнаружении дубликата API возвращает HTTP 409 Conflict: `{ "error": "DUPLICATE_LEAD", "duplicate_of": "uuid оригинала", "matched_by": "email|phone|both", "original_created_at": "ISO8601" }`
- [ ] AC4: Дедупликация может быть настроена в режимах: `reject` (409, лид не создаётся), `accept_and_flag` (201, лид создаётся с `is_duplicate: true`), `off` (дедупликация выключена)
- [ ] AC5: Проверка дедупликации выполняется за < 10ms (индекс по нормализованному email/phone + company_id + created_at)
- [ ] AC6: Network Admin может вручную отметить лид как "не дубликат" через UI, что исключает его из дедупликации

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-003]

##### Tasks для STORY-004:

**[TASK-0018] Спроектировать схему дедупликации**
- **Тип:** Backend
- **Описание:** Добавить таблицу `lead_dedup_index`: `id` (bigserial), `company_id` (FK), `email_hash` (varchar 64, SHA256 от нормализованного email), `phone_hash` (varchar 64, SHA256 от нормализованного телефона), `lead_id` (FK), `created_at` (timestamptz). Составной индекс `(company_id, email_hash, created_at)`, `(company_id, phone_hash, created_at)`. Добавить поля в настройки компании: `dedup_window_days` (int, default 30), `dedup_mode` (enum: reject/accept_and_flag/off, default reject).
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется
  - [ ] Хеши используются вместо plaintext для privacy
  - [ ] Индексы покрывают lookup-запрос за < 5ms при 1M+ записей
- **Оценка:** 4h
- **Story:** [STORY-004]

**[TASK-0019] Реализовать dedup-checker сервис**
- **Тип:** Backend
- **Описание:** Функция `CheckDuplicate(companyID, normalizedEmail, normalizedPhone string) (*DedupResult, error)`. Запрос: `SELECT lead_id, created_at FROM lead_dedup_index WHERE company_id = $1 AND (email_hash = $2 OR phone_hash = $3) AND created_at > now() - interval '$4 days' LIMIT 1`. Учёт настройки `dedup_mode` компании. При `accept_and_flag` — создать лид с полем `is_duplicate: true`, `duplicate_of: original_lead_id`.
- **Критерии готовности (DoD):**
  - [ ] Все 3 режима работают корректно: reject, accept_and_flag, off
  - [ ] Matched_by корректно определяет: email, phone или both
  - [ ] Запрос < 10ms при 1M записей в индексе (benchmark)
- **Оценка:** 4h
- **Story:** [STORY-004]

**[TASK-0020] Интегрировать дедупликацию в Lead Intake pipeline**
- **Тип:** Backend
- **Описание:** Встроить dedup-check в pipeline обработки лида: (1) Validate → (2) Normalize → (3) Dedup Check → (4) Save. При dedup_mode=reject: вернуть 409 до создания записи. При accept_and_flag: создать запись с флагами. Добавить запись в `lead_dedup_index` после успешного создания лида.
- **Критерии готовности (DoD):**
  - [ ] Pipeline работает в правильном порядке
  - [ ] Дубль по email через 1 секунду → 409 (при режиме reject)
  - [ ] Дубль по email через dedup_window + 1 день → 201 (не дубль)
  - [ ] Prometheus-метрика `leads_duplicates_total` по company и matched_by
- **Оценка:** 4h
- **Story:** [STORY-004]

**[TASK-0021] Тесты дедупликации**
- **Тип:** QA
- **Описание:** Тесты: (1) Дубль по email → 409, (2) Дубль по phone → 409, (3) Дубль по email+phone → 409 с matched_by=both, (4) Тот же email за пределами окна → 201, (5) Режим accept_and_flag → 201 с is_duplicate=true, (6) Режим off → 201 всегда, (7) Разные company_id → не дубль, (8) Race condition: два запроса одновременно → один 201, один 409, (9) Нормализация email/phone перед проверкой.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Race condition тестируется через goroutines
  - [ ] Integration тест с реальной PostgreSQL
- **Оценка:** 4h
- **Story:** [STORY-004]

---

#### [STORY-005] Аутентификация по API-ключу

**Как** Developer (аффилейт-разработчик), **я хочу** аутентифицироваться в API с помощью уникального API-ключа, **чтобы** мои лиды были привязаны к моему аккаунту аффилейта и я мог безопасно интегрироваться с системой.

**Acceptance Criteria:**
- [ ] AC1: API-ключ передаётся в заголовке `X-API-Key`. Формат ключа: `gc_live_` + 32 символа (hex). Пример: `gc_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`
- [ ] AC2: Для тестового окружения формат: `gc_test_` + 32 hex. Лиды с тестовым ключом помечаются `is_test: true` и не попадают в роутинг
- [ ] AC3: Каждый API-ключ привязан к конкретному `affiliate_id` и `company_id`. При валидации ключа — эти ID добавляются в контекст запроса
- [ ] AC4: API-ключи хранятся в БД как SHA256-хеш. При создании ключ показывается один раз (полный), затем — только последние 4 символа
- [ ] AC5: Аффилейт может иметь до 5 активных API-ключей одновременно (для ротации). Каждый ключ может быть деактивирован без удаления
- [ ] AC6: При использовании деактивированного ключа — HTTP 401 с `{ "error": "API_KEY_DISABLED", "message": "This API key has been disabled" }`
- [ ] AC7: Lookup ключа по хешу в БД — < 5ms (индекс по `key_hash`)
- [ ] AC8: Каждый API-вызов с ключом логируется: `api_key_id`, `endpoint`, `timestamp`, `ip`

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001], [EPIC-06]

##### Tasks для STORY-005:

**[TASK-0022] Спроектировать схему БД для API-ключей**
- **Тип:** Backend
- **Описание:** Таблица `api_keys`: `id` (UUID), `company_id` (FK), `affiliate_id` (FK), `key_hash` (varchar 64, SHA256, unique), `key_prefix` (varchar 12, "gc_live_" или "gc_test_"), `key_last4` (char 4), `label` (varchar 100, optional, для удобства: "Production Key 1"), `is_active` (bool, default true), `is_test` (bool), `rate_limit` (int, default 100), `created_at`, `last_used_at`, `deactivated_at`. Индекс: `(key_hash)` unique, `(company_id, affiliate_id)`.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется
  - [ ] Полный ключ нигде не хранится в БД
  - [ ] Индекс по key_hash обеспечивает lookup < 1ms
- **Оценка:** 2h
- **Story:** [STORY-005]

**[TASK-0023] Реализовать генерацию и валидацию API-ключей**
- **Тип:** Backend
- **Описание:** (1) Генерация: `crypto/rand` для 32 hex символов, prefix "gc_live_" или "gc_test_", сохранение SHA256 хеша в БД. Возврат полного ключа один раз при создании. (2) Валидация middleware: извлечь `X-API-Key`, вычислить SHA256, SELECT по хешу, проверить is_active, добавить company_id/affiliate_id в request context. (3) Кеш в Redis: `apikey:{hash} → {company_id, affiliate_id, is_active, is_test, rate_limit}` с TTL 5 мин для снижения нагрузки на БД.
- **Критерии готовности (DoD):**
  - [ ] Ключ генерируется криптографически стойко
  - [ ] Lookup с Redis-кешем < 1ms
  - [ ] Cache invalidation при деактивации ключа
  - [ ] Тестовый ключ корректно помечает лиды `is_test: true`
- **Оценка:** 4h
- **Story:** [STORY-005]

**[TASK-0024] Реализовать UI управления API-ключами**
- **Тип:** Frontend
- **Описание:** Компонент в панели аффилейта: (1) Список ключей: label, prefix + last4, статус (active/disabled), created_at, last_used_at. (2) Кнопка "Create Key" — модальное окно с label input, тип (live/test), подтверждение → показ полного ключа с кнопкой copy + предупреждение "сохраните ключ, он больше не будет показан". (3) Кнопка "Disable" на каждом ключе с подтверждением.
- **Критерии готовности (DoD):**
  - [ ] Полный ключ показывается только один раз при создании
  - [ ] Copy-to-clipboard работает
  - [ ] Disable требует подтверждения
  - [ ] Максимум 5 активных ключей — при попытке создать 6-й → ошибка
- **Оценка:** 4h
- **Story:** [STORY-005]

**[TASK-0025] Тесты аутентификации по API-ключу**
- **Тип:** QA
- **Описание:** Тесты: (1) Валидный ключ → 201, context содержит правильные IDs, (2) Отсутствие заголовка → 401, (3) Невалидный формат → 401, (4) Несуществующий ключ → 401, (5) Деактивированный ключ → 401 с API_KEY_DISABLED, (6) Тестовый ключ → лид с is_test=true, (7) Ротация: создать 5 ключей, деактивировать 1, создать новый → ok, (8) Rate limit привязан к конкретному ключу.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Cache invalidation тестируется
- **Оценка:** 4h
- **Story:** [STORY-005]

---

#### [STORY-006] Постбеки (Postback/Callback) при изменении статуса лида

**Как** Developer (аффилейт-разработчик), **я хочу** получать HTTP-уведомления (постбеки) при изменении статуса моих лидов, **чтобы** автоматически обновлять данные в своём трекере без необходимости постоянного polling.

**Acceptance Criteria:**
- [ ] AC1: Аффилейт настраивает postback URL в профиле. URL может содержать макросы: `{lead_id}`, `{status}`, `{click_id}`, `{sub_id_1}`..`{sub_id_5}`, `{payout}`, `{currency}`, `{country}`, `{created_at}`, `{updated_at}`. Пример: `https://tracker.com/postback?clickid={click_id}&status={status}&payout={payout}`
- [ ] AC2: Постбек отправляется HTTP GET (по умолчанию) или POST (настраивается per affiliate) при каждом изменении статуса лида. Поддерживаемые статусы для постбека: `sent`, `callback`, `ftd` (first time deposit), `rejected`, `invalid`, `duplicate`
- [ ] AC3: Макросы в URL заменяются на реальные значения. Незнакомые макросы — удаляются. Значения URL-encode-ятся
- [ ] AC4: При HTTP 200-299 от приёмника — постбек считается доставленным. При ошибке (4xx, 5xx, timeout 10 sec, connection error) — система делает retry: 3 попытки с интервалами 30 сек, 2 мин, 10 мин. После 3 неудачных попыток — статус `failed`, алерт в Telegram
- [ ] AC5: Все постбеки логируются в таблицу `postback_log`: URL (с подставленными макросами), response_code, response_body (первые 1000 символов), attempt_number, latency_ms, status (sent/failed), created_at
- [ ] AC6: Аффилейт может настроить до 3 postback URL (например, основной трекер + резервный + кастомный)
- [ ] AC7: Аффилейт может просмотреть лог постбеков с фильтрами: по статусу доставки, по дате, по лиду

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001], [STORY-005]

##### Tasks для STORY-006:

**[TASK-0026] Спроектировать схему постбеков**
- **Тип:** Backend
- **Описание:** (1) Таблица `affiliate_postbacks`: `id`, `affiliate_id`, `company_id`, `url_template` (varchar 2000), `method` (enum GET/POST), `events` (text[] — список статусов для отправки), `is_active`, `priority` (1-3), `created_at`. (2) Таблица `postback_log`: `id` (bigserial), `postback_config_id` (FK), `lead_id` (FK), `event` (varchar 20), `url_rendered` (varchar 2000), `method`, `response_code` (smallint), `response_body` (text, first 1000 chars), `attempt` (smallint), `latency_ms` (int), `status` (enum: pending/sent/failed), `next_retry_at` (timestamptz, nullable), `created_at`. Партиционирование postback_log по created_at (ежедневно), TTL 30 дней.
- **Критерии готовности (DoD):**
  - [ ] Миграции созданы и применяются
  - [ ] Индексы для быстрого lookup по lead_id и affiliate_id
  - [ ] Партиционирование и автоочистка настроены
- **Оценка:** 4h
- **Story:** [STORY-006]

**[TASK-0027] Реализовать postback renderer (макросы → значения)**
- **Тип:** Backend
- **Описание:** Функция `RenderPostbackURL(template string, lead Lead) string`. Парсинг макросов `{...}` в шаблоне, замена на значения из лида, URL-encoding каждого значения. Незнакомые макросы — удалить (пустая строка). Поддерживаемые макросы: lead_id, status, click_id, sub_id_1..sub_id_5, payout, currency, country, email, phone, first_name, last_name, created_at, updated_at.
- **Критерии готовности (DoD):**
  - [ ] Все макросы корректно заменяются
  - [ ] Значения URL-encoded (спецсимволы, Unicode)
  - [ ] Незнакомые макросы удаляются
  - [ ] Benchmark < 0.1ms на вызов
- **Оценка:** 2h
- **Story:** [STORY-006]

**[TASK-0028] Реализовать postback sender с retry-логикой**
- **Тип:** Backend
- **Описание:** Worker (горутина-пул), который обрабатывает очередь постбеков из Redis (BRPOP). При изменении статуса лида — publish в Redis queue. Worker: (1) render URL, (2) HTTP GET/POST с timeout 10 sec, (3) при ошибке — schedule retry (30s, 2m, 10m) через Redis Sorted Set (ZADD с timestamp). (4) Retry worker — отдельная горутина, проверяющая Sorted Set каждые 10 сек. (5) После 3 неудачных попыток — status=failed, publish событие для Telegram-алерта. Concurrency: до 50 параллельных HTTP-запросов (настраивается).
- **Критерии готовности (DoD):**
  - [ ] Постбек отправляется < 1 сек после изменения статуса (при пустой очереди)
  - [ ] Retry-интервалы корректны: 30s, 2m, 10m
  - [ ] После 3 неудач — failed + alert event
  - [ ] Connection timeout 10 sec не блокирует другие постбеки
  - [ ] Prometheus-метрики: postbacks_sent_total, postbacks_failed_total, postback_latency_seconds
- **Оценка:** 8h
- **Story:** [STORY-006]

**[TASK-0029] Реализовать UI настройки постбеков**
- **Тип:** Frontend
- **Описание:** В профиле аффилейта: (1) Секция "Postbacks" — список настроенных URL (до 3). (2) Форма добавления/редактирования: URL template с подсказкой доступных макросов, метод (GET/POST), чекбоксы по событиям (sent, callback, ftd, rejected, invalid, duplicate), toggle active/inactive. (3) "Test Postback" кнопка — отправляет фейковый постбек на указанный URL с тестовыми данными и показывает результат (status code, response).
- **Критерии готовности (DoD):**
  - [ ] Список макросов отображается как справка при редактировании URL
  - [ ] Test Postback работает и показывает результат в модальном окне
  - [ ] Валидация URL формата при сохранении
  - [ ] Не более 3 активных postback URL
- **Оценка:** 8h
- **Story:** [STORY-006]

**[TASK-0030] Реализовать UI лога постбеков**
- **Тип:** Frontend
- **Описание:** Страница "Postback Log" для аффилейта: таблица с колонками: lead_id (ссылка), event, URL (truncated), method, status (sent/failed, цветовой индикатор), response_code, latency_ms, attempt, created_at. Фильтры: по статусу доставки, по событию, по дате. Пагинация: 50 записей на страницу. Кнопка "Retry" для failed постбеков (ручной ре-send).
- **Критерии готовности (DoD):**
  - [ ] Таблица с фильтрами и пагинацией работает
  - [ ] Кнопка Retry отправляет постбек повторно
  - [ ] Полный URL виден по клику (expandable row)
  - [ ] Response body показывается в tooltip/modal
- **Оценка:** 8h
- **Story:** [STORY-006]

**[TASK-0031] Тесты постбеков**
- **Тип:** QA
- **Описание:** (1) Макросы: все 15+ макросов корректно подставляются. (2) URL-encoding: спецсимволы в email (+, @) корректно кодируются. (3) Retry: mock HTTP-сервер возвращает 500 → 3 ретрая с правильными интервалами → failed. (4) Success: mock HTTP → 200 → status=sent, 1 attempt. (5) Timeout: mock HTTP задержка 15 сек → timeout error → retry. (6) Concurrent: 100 постбеков одновременно → все обработаны. (7) Disabled postback config → не отправляется.
- **Критерии готовности (DoD):**
  - [ ] 7+ тест-кейсов проходят
  - [ ] Mock HTTP-сервер для integration-тестов
  - [ ] Покрытие > 85%
- **Оценка:** 4h
- **Story:** [STORY-006]

---

#### [STORY-007] Приём лидов в batch-режиме

**Как** Developer (аффилейт-разработчик), **я хочу** отправлять несколько лидов одним API-запросом (batch), **чтобы** снизить количество HTTP-запросов при массовой загрузке лидов из файлов или при миграции с другой платформы.

**Acceptance Criteria:**
- [ ] AC1: API принимает POST на `/api/v1/leads/batch` с JSON-массивом лидов. Максимум 100 лидов в одном запросе
- [ ] AC2: Каждый лид в массиве обрабатывается независимо (валидация, нормализация, дедупликация). Ошибка одного лида не блокирует остальные
- [ ] AC3: Ответ HTTP 207 Multi-Status с массивом результатов: `{ "results": [{ "index": 0, "status": 201, "id": "uuid" }, { "index": 1, "status": 422, "errors": [...] }, { "index": 2, "status": 409, "duplicate_of": "uuid" }] }`. Порядок результатов соответствует порядку входного массива
- [ ] AC4: При пустом массиве или > 100 элементов — HTTP 400 `{ "error": "INVALID_BATCH_SIZE", "message": "Batch must contain 1-100 leads" }`
- [ ] AC5: Rate limit для batch — 10 req/sec per API key (отдельно от single-lead rate limit)
- [ ] AC6: Общее время обработки batch ≤ 5 секунд для 100 лидов
- [ ] AC7: Метрики: `leads_batch_size` (histogram), `leads_batch_duration_seconds` (histogram)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001], [STORY-002], [STORY-003], [STORY-004]

##### Tasks для STORY-007:

**[TASK-0032] Реализовать POST /api/v1/leads/batch endpoint**
- **Тип:** Backend
- **Описание:** Хэндлер для batch-приёма. Парсинг JSON-массива, валидация размера (1-100). Параллельная обработка каждого лида через существующий pipeline (validate → normalize → dedup → save) с использованием goroutine pool (semaphore 10). Сбор результатов в indexed-массив. Возврат 207 Multi-Status.
- **Критерии готовности (DoD):**
  - [ ] 100 лидов обрабатываются за < 5 сек
  - [ ] Ошибка одного лида не влияет на другие
  - [ ] Порядок результатов = порядок входного массива
  - [ ] Goroutine pool ограничивает concurrency
- **Оценка:** 8h
- **Story:** [STORY-007]

**[TASK-0033] Тесты batch-приёма**
- **Тип:** QA
- **Описание:** (1) Happy path: 10 валидных лидов → 207, все 201. (2) Mixed: 5 валидных + 3 невалидных + 2 дубликата → 207, правильные статусы. (3) Пустой массив → 400. (4) 101 лид → 400. (5) Один лид → 207. (6) Performance: 100 лидов за < 5 сек. (7) Rate limit batch: 11 запросов за 1 сек → 429 на 11-й.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Performance-тест подтверждает < 5 сек
- **Оценка:** 4h
- **Story:** [STORY-007]

**[TASK-0034] OpenAPI-спецификация для batch endpoint**
- **Тип:** Docs
- **Описание:** Добавить endpoint POST /api/v1/leads/batch в OpenAPI спецификацию. Request: массив lead-объектов. Response 207: массив результатов с индексами. Примеры для mixed results (201 + 422 + 409).
- **Критерии готовности (DoD):**
  - [ ] Спецификация валидна
  - [ ] Примеры для всех сценариев включены
- **Оценка:** 1h
- **Story:** [STORY-007]

---

#### [STORY-008] Получение статуса лида по API

**Как** Developer (аффилейт-разработчик), **я хочу** запрашивать текущий статус моего лида через API, **чтобы** проверить его состояние без ожидания постбека (fallback-механизм).

**Acceptance Criteria:**
- [ ] AC1: API: `GET /api/v1/leads/{lead_id}` — возвращает HTTP 200 с полным объектом лида: `id`, `status`, `sub_statuses` (массив всех изменений), `created_at`, `updated_at`, `country`, `is_duplicate`, `is_test`, `fraud_score` (если проверялся)
- [ ] AC2: API-ключ аффилейта даёт доступ только к его собственным лидам. Чужой лид → HTTP 404 (не 403, чтобы не раскрывать существование)
- [ ] AC3: `GET /api/v1/leads?status=new&country=DE&date_from=2026-01-01&date_to=2026-01-31&page=1&per_page=50` — фильтрация и пагинация. Поддерживаемые фильтры: status, country, date_from, date_to, is_duplicate, is_test, click_id, sub_id_1..sub_id_5. Сортировка: created_at DESC (по умолчанию)
- [ ] AC4: Пагинация через cursor-based подход: ответ содержит `next_cursor` и `prev_cursor`. `per_page` по умолчанию 50, максимум 200
- [ ] AC5: Latency < 100ms для GET по ID, < 300ms для filtered list (при 1M+ лидов в БД)
- [ ] AC6: Аффилейт НЕ видит чувствительные поля: email и phone маскируются (u***@gmail.com, +7***4567) в ответе API, если не его лид (но для своих — полные данные)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001], [STORY-005]

##### Tasks для STORY-008:

**[TASK-0035] Реализовать GET /api/v1/leads/{id} и GET /api/v1/leads**
- **Тип:** Backend
- **Описание:** (1) GET by ID: SELECT lead + JOIN на sub_statuses. Проверка ownership (affiliate_id из API-ключа). (2) GET list: dynamic query builder с фильтрами. Cursor-based pagination через `(created_at, id)` composite cursor (base64-encoded). Лимит per_page 1-200. Response включает `meta: { total: N, next_cursor: "...", prev_cursor: "..." }`.
- **Критерии готовности (DoD):**
  - [ ] GET by ID < 50ms
  - [ ] GET list < 300ms при 1M лидов
  - [ ] Cursor pagination работает корректно (нет пропусков/дублей)
  - [ ] Все фильтры работают и комбинируются (AND логика)
- **Оценка:** 8h
- **Story:** [STORY-008]

**[TASK-0036] Тесты для GET endpoints**
- **Тип:** QA
- **Описание:** (1) GET by ID: свой лид → 200 с полными данными, (2) Чужой лид → 404, (3) Несуществующий ID → 404, (4) GET list: фильтр по status → только нужные, (5) Фильтр по country → корректный, (6) Date range → корректный, (7) Пагинация: 150 лидов, per_page=50 → 3 страницы через cursor, (8) Без API-ключа → 401.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Пагинация тестируется end-to-end
- **Оценка:** 4h
- **Story:** [STORY-008]

---

#### [STORY-009] Webhook на приём лида для внутренней автоматизации

**Как** Network Admin, **я хочу** настраивать внутренние вебхуки, которые срабатывают при поступлении нового лида, **чтобы** интегрировать CRM с внутренними системами (Slack, Google Sheets, кастомные сервисы).

**Acceptance Criteria:**
- [ ] AC1: Network Admin может создать webhook URL в настройках компании. При создании генерируется `webhook_secret` для подписи (HMAC-SHA256)
- [ ] AC2: При поступлении нового лида система отправляет POST на webhook URL с JSON-телом: `{ "event": "lead.created", "timestamp": "ISO8601", "data": { ...full lead object... } }`. Заголовок `X-Webhook-Signature: sha256=HMAC(secret, body)`
- [ ] AC3: Поддерживаемые события: `lead.created`, `lead.status_changed`, `lead.duplicate_detected`, `lead.fraud_detected`
- [ ] AC4: Retry-политика: 3 попытки (1 мин, 5 мин, 30 мин). Логирование в `webhook_delivery_log`
- [ ] AC5: Можно настроить до 5 webhook endpoints per company. Каждый можно фильтровать по событиям
- [ ] AC6: UI показывает delivery log: event, URL, response_code, latency, status, retry count

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001], [EPIC-06]

##### Tasks для STORY-009:

**[TASK-0037] Спроектировать схему и реализовать webhook dispatcher**
- **Тип:** Backend
- **Описание:** (1) Таблица `webhooks`: id, company_id, url, secret_hash, events (text[]), is_active, created_at. (2) Таблица `webhook_delivery_log`: id, webhook_id, event, lead_id, response_code, response_body (first 500 chars), latency_ms, attempt, status, next_retry_at, created_at. (3) Dispatcher: при событии — найти все активные webhooks для company_id, фильтровать по events, отправить POST с HMAC подписью. Retry через Redis Sorted Set.
- **Критерии готовности (DoD):**
  - [ ] HMAC-SHA256 подпись корректна и верифицируема
  - [ ] Retry работает по расписанию
  - [ ] Webhook не блокирует основной pipeline (асинхронная отправка)
- **Оценка:** 8h
- **Story:** [STORY-009]

**[TASK-0038] UI управления и лога вебхуков**
- **Тип:** Frontend
- **Описание:** Страница "Webhooks" в настройках компании: (1) Список вебхуков: URL (truncated), events, status (active/disabled). (2) Создание: URL + выбор событий (чекбоксы) → показ secret (один раз). (3) Delivery log: таблица с фильтрами по событию и статусу доставки. (4) Кнопка "Test" — отправить тестовый payload.
- **Критерии готовности (DoD):**
  - [ ] Secret показывается один раз с copy-to-clipboard
  - [ ] Test webhook работает и показывает результат
  - [ ] Delivery log с пагинацией
- **Оценка:** 8h
- **Story:** [STORY-009]

**[TASK-0039] Тесты webhook dispatcher**
- **Тип:** QA
- **Описание:** (1) HMAC подпись корректна (verify на стороне получателя). (2) Фильтрация по events: webhook с events=[lead.created] не получает lead.status_changed. (3) Retry: 3 попытки с правильными интервалами. (4) Disabled webhook → не отправляется. (5) 5 webhook endpoints → все получают event.
- **Критерии готовности (DoD):**
  - [ ] 5 тест-кейсов проходят
  - [ ] Mock HTTP-сервер для интеграционных тестов
- **Оценка:** 4h
- **Story:** [STORY-009]

---

#### [STORY-010] Мониторинг и health check Lead Intake API

**Как** Network Admin, **я хочу** видеть состояние Lead Intake API в реальном времени и получать алерты при деградации, **чтобы** оперативно реагировать на проблемы и не терять лиды.

**Acceptance Criteria:**
- [ ] AC1: Endpoint `GET /health` возвращает HTTP 200 `{ "status": "ok", "checks": { "database": "ok", "redis": "ok", "geoip": "ok" }, "version": "1.0.0", "uptime_seconds": N }`. При любом check=fail → HTTP 503
- [ ] AC2: Endpoint `GET /ready` для Kubernetes readiness probe — проверяет подключение к БД и Redis. Отдельно от /health
- [ ] AC3: Prometheus-метрики доступны на `/metrics`: leads_created_total, leads_validation_errors_total, leads_duplicates_total, leads_processing_duration_seconds, api_requests_total (by endpoint, status_code), rate_limit_exceeded_total, postbacks_sent_total, postbacks_failed_total
- [ ] AC4: Grafana dashboard с ключевыми графиками: RPS, error rate, p50/p95/p99 latency, queue depth, active connections
- [ ] AC5: Alerting rules: error rate > 5% за 5 мин → PagerDuty alert; p99 latency > 1 sec за 5 мин → warning; database connection pool exhaustion → critical
- [ ] AC6: Structured logging (JSON) с полями: request_id, company_id, affiliate_id, action, duration_ms, error (если есть)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-01]
**Зависит от:** [STORY-001]

##### Tasks для STORY-010:

**[TASK-0040] Реализовать /health и /ready endpoints**
- **Тип:** Backend
- **Описание:** (1) `/health`: проверка PostgreSQL (SELECT 1), Redis (PING), GeoIP DB (file exists + age < 14 days). Агрегация результатов. 200 если всё ok, 503 если любой check failed. (2) `/ready`: только PostgreSQL + Redis. Для Kubernetes readiness probe. (3) Оба endpoint без аутентификации, с rate limit 10 req/sec.
- **Критерии готовности (DoD):**
  - [ ] /health корректно отображает статус каждого dependency
  - [ ] /ready возвращает 503 если БД недоступна → pod снимается с балансировки
  - [ ] Таймаут проверки каждого dependency: 2 секунды
- **Оценка:** 2h
- **Story:** [STORY-010]

**[TASK-0041] Настроить Prometheus-метрики и Grafana dashboard**
- **Тип:** DevOps
- **Описание:** (1) Prometheus: добавить /metrics endpoint (promhttp), зарегистрировать все метрики из AC3. (2) Grafana: импортировать/создать dashboard "Lead Intake API" с panels: RPS (counter), Error rate (rate), Latency percentiles (histogram), Queue depth (gauge), DB connections (gauge). (3) Alertmanager rules: error_rate > 5%, p99_latency > 1s, db_pool_exhaustion.
- **Критерии готовности (DoD):**
  - [ ] Dashboard с 6+ panels создан
  - [ ] Alerting rules настроены и тестируются
  - [ ] Метрики обновляются в реальном времени
- **Оценка:** 8h
- **Story:** [STORY-010]

**[TASK-0042] Настроить structured logging**
- **Тип:** Backend
- **Описание:** Интеграция библиотеки логирования (zerolog или zap). Формат: JSON. Обязательные поля в каждом запросе: request_id (UUID, генерируется в middleware), company_id, affiliate_id, action ("lead_created", "lead_validated", "lead_deduplicated"), duration_ms, error (string, nullable). Log levels: DEBUG (detailed pipeline steps), INFO (lead created/rejected), WARN (rate limit, geo mismatch), ERROR (DB/Redis errors, unhandled panics).
- **Критерии готовности (DoD):**
  - [ ] Все API-запросы логируются в JSON-формате
  - [ ] request_id прокидывается через весь pipeline
  - [ ] Логи парсятся в ELK/Loki без дополнительных преобразований
- **Оценка:** 4h
- **Story:** [STORY-010]

**[TASK-0043] Тесты health check и метрик**
- **Тип:** QA
- **Описание:** (1) /health с рабочими dependencies → 200. (2) /health с недоступным Redis → 503 с redis: "fail". (3) /ready с недоступной БД → 503. (4) Метрика leads_created_total увеличивается при создании лида. (5) Метрика leads_validation_errors_total увеличивается при ошибке валидации.
- **Критерии готовности (DoD):**
  - [ ] 5 тест-кейсов проходят
  - [ ] Метрики проверяются через /metrics endpoint
- **Оценка:** 2h
- **Story:** [STORY-010]

---

#### [STORY-011] Массовый импорт лидов из CSV-файла

**Как** Affiliate Manager, **я хочу** загрузить CSV-файл с лидами через UI, **чтобы** быстро импортировать историческую базу при миграции с другой платформы или загрузить лиды из offline-источника.

**Acceptance Criteria:**
- [ ] AC1: В UI "Lead Management" есть кнопка "Import CSV". Загрузка файла до 10 MB (до 50,000 строк)
- [ ] AC2: После загрузки — preview первых 10 строк с маппингом колонок: система автоматически определяет маппинг по заголовкам (email → email, phone → phone, и т.д.), пользователь может скорректировать
- [ ] AC3: Импорт выполняется фоновым процессом. Прогресс отображается: X из Y обработано, Z ошибок. По завершении — уведомление (UI toast + опционально Telegram)
- [ ] AC4: Каждая строка проходит тот же pipeline: валидация → нормализация → дедупликация. Ошибочные строки не блокируют остальные
- [ ] AC5: По завершении импорта — скачиваемый отчёт (CSV): строки с ошибками + причина ошибки для каждой
- [ ] AC6: Импорт привязан к конкретному аффилейту (выбирается в UI). Все импортированные лиды помечаются `source: "csv_import"`, `import_batch_id: UUID`

**Story Points:** 8
**Приоритет:** Could
**Epic:** [EPIC-01]
**Зависит от:** [STORY-002], [STORY-003], [STORY-004]

##### Tasks для STORY-011:

**[TASK-0044] Backend для CSV-импорта**
- **Тип:** Backend
- **Описание:** (1) POST /api/v1/leads/import — multipart/form-data, файл + affiliate_id + column_mapping (JSON). (2) Фоновый worker: парсинг CSV (gocsv), маппинг колонок, обработка каждой строки через pipeline. (3) Прогресс записывается в Redis: `import:{batch_id}` → `{ total, processed, errors, status }`. (4) По завершении — генерация error report CSV и сохранение в S3/MinIO с signed URL на 24ч.
- **Критерии готовности (DoD):**
  - [ ] 50,000 строк обрабатываются за < 5 минут
  - [ ] Прогресс доступен в реальном времени через GET /api/v1/leads/import/{batch_id}
  - [ ] Error report скачивается по signed URL
  - [ ] Поддержка UTF-8 BOM, Windows CRLF, различных разделителей (;,\t)
- **Оценка:** 8h
- **Story:** [STORY-011]

**[TASK-0045] Frontend для CSV-импорта**
- **Тип:** Frontend
- **Описание:** (1) Drag-and-drop зона для файла или кнопка "Choose file". (2) Column mapping wizard: таблица с preview первых 10 строк, dropdown для маппинга каждой колонки CSV к полю лида. Auto-detection по заголовкам. (3) Progress bar: обновляется каждые 2 сек через polling GET /import/{id}. (4) Result: total imported, errors count, download error report button.
- **Критерии готовности (DoD):**
  - [ ] Drag-and-drop работает
  - [ ] Preview первых 10 строк отображается корректно
  - [ ] Auto-detection маппинга для стандартных заголовков
  - [ ] Progress bar обновляется в реальном времени
  - [ ] Error report скачивается
- **Оценка:** 8h
- **Story:** [STORY-011]

**[TASK-0046] Тесты CSV-импорта**
- **Тип:** QA
- **Описание:** (1) Валидный CSV 100 строк → все импортированы. (2) Mixed: 80 ok + 20 errors → 80 импортированы, error report содержит 20 строк. (3) Пустой файл → ошибка. (4) > 10 MB → ошибка. (5) CSV с BOM → корректный парсинг. (6) CSV с разделителем ";" → ошибка (или auto-detect). (7) Дубликаты внутри файла → обрабатываются по dedup_mode.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Тестовые CSV-файлы подготовлены для каждого кейса
- **Оценка:** 4h
- **Story:** [STORY-011]

---

#### [STORY-012] Конфигурация pipeline обработки лида per company

**Как** Network Admin, **я хочу** настраивать параметры pipeline обработки лидов для моей компании (дедупликация, валидация, нормализация), **чтобы** адаптировать поведение системы под специфику моего бизнеса.

**Acceptance Criteria:**
- [ ] AC1: В настройках компании есть секция "Lead Processing Pipeline" с toggle'ами и параметрами для каждого шага:
  - Дедупликация: mode (reject/accept_and_flag/off), window (1-365 дней), поля для проверки (email, phone, both)
  - Валидация email: disposable check (on/off), MX check (on/off)
  - Нормализация email: gmail dots (on/off), plus-addressing (on/off)
  - GEO mismatch: action (flag_only/reject/off)
- [ ] AC2: Изменения применяются мгновенно (без рестарта, без деплоя). Конфигурация кешируется в Redis с инвалидацией по event
- [ ] AC3: При сохранении настроек — audit log запись: кто изменил, что изменилось (diff), когда
- [ ] AC4: Есть кнопка "Reset to Defaults" для возврата к настройкам по умолчанию
- [ ] AC5: Есть preview: "как обработается лид с этими настройками" — тестовая обработка с фейковыми данными, показывающая каждый шаг

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-01]
**Зависит от:** [STORY-002], [STORY-003], [STORY-004], [EPIC-06]

##### Tasks для STORY-012:

**[TASK-0047] Спроектировать модель конфигурации pipeline**
- **Тип:** Backend
- **Описание:** Таблица `company_lead_config`: `company_id` (PK, FK), `dedup_mode`, `dedup_window_days`, `dedup_fields` (text[]), `validate_disposable_email` (bool), `validate_mx` (bool), `normalize_gmail_dots` (bool), `normalize_plus_addressing` (bool), `geo_mismatch_action` (enum: flag_only/reject/off), `updated_at`, `updated_by` (FK users). Значения по умолчанию через DEFAULT в schema. API: GET/PUT `/api/v1/settings/lead-processing`. Кеш в Redis: `company_config:{company_id}` с TTL 5 мин, инвалидация при PUT.
- **Критерии готовности (DoD):**
  - [ ] Миграция с sensible defaults
  - [ ] API GET/PUT с валидацией допустимых значений
  - [ ] Кеш с инвалидацией работает
  - [ ] Audit log при изменении
- **Оценка:** 4h
- **Story:** [STORY-012]

**[TASK-0048] Frontend настроек pipeline**
- **Тип:** Frontend
- **Описание:** Страница "Lead Processing Settings" в настройках компании. Секции с toggle'ами и input'ами для каждого параметра из AC1. Кнопки: "Save", "Reset to Defaults", "Test Pipeline" (открывает модалку с тестовыми данными и пошаговым результатом обработки). Unsaved changes warning.
- **Критерии готовности (DoD):**
  - [ ] Все параметры отображаются и сохраняются
  - [ ] "Test Pipeline" показывает пошаговый результат
  - [ ] "Reset to Defaults" требует подтверждения
  - [ ] Unsaved changes предупреждение при навигации
- **Оценка:** 8h
- **Story:** [STORY-012]

**[TASK-0049] Интегрировать конфигурацию в Lead Intake pipeline**
- **Тип:** Backend
- **Описание:** Рефакторинг pipeline обработки лида: загрузка конфигурации компании (из кеша или БД) в начале обработки. Каждый шаг pipeline проверяет соответствующий флаг/параметр конфигурации. При `geo_mismatch_action=reject` — лид отклоняется с ошибкой `GEO_MISMATCH`. При `dedup_mode=off` — шаг дедупликации пропускается.
- **Критерии готовности (DoD):**
  - [ ] Все конфигурируемые параметры влияют на pipeline
  - [ ] Изменение конфига вступает в силу в течение 5 мин (TTL кеша)
  - [ ] Тест: dedup off → дубликат принимается
  - [ ] Тест: geo_mismatch=reject → мисматч отклоняется
- **Оценка:** 4h
- **Story:** [STORY-012]

**[TASK-0050] Тесты конфигурации pipeline**
- **Тип:** QA
- **Описание:** (1) Дефолтная конфигурация → стандартное поведение. (2) dedup_mode=off → дубли принимаются. (3) validate_mx=off → email без MX-записи принимается. (4) geo_mismatch_action=reject → мисматч → 422. (5) Изменение конфига → новый лид обрабатывается по новым правилам (после инвалидации кеша). (6) Reset to defaults → поведение возвращается к стандартному.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Тесты покрывают invalidation кеша
- **Оценка:** 4h
- **Story:** [STORY-012]

---

### Сводка по EPIC-01

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 12 |
| **Story Points** | 68 (итого) |
| **Must** | 7 stories (44 SP) |
| **Should** | 3 stories (15 SP) |
| **Could** | 2 stories (9 SP) |
| **Всего Tasks** | 50 |
| **Backend tasks** | 27 |
| **Frontend tasks** | 6 |
| **QA tasks** | 12 |
| **DevOps tasks** | 1 |
| **Docs tasks** | 2 |
| **Design tasks** | 2 (не детализированы, включены в Frontend) |
| **Оценка (часы)** | ~222h |

---
# PRODUCT BACKLOG P0 (MVP) — EPIC-02 through EPIC-07

**Продукт:** GambChamp CRM — платформа дистрибуции лидов для крипто/форекс affiliate-маркетинга
**Версия:** 1.0
**Дата:** Март 2026
**Нумерация:** Stories начинаются с STORY-013, Tasks с TASK-0051

---

## [EPIC-02] Lead Routing Engine

**Цель:** Создать ядро маршрутизации лидов к брокерам с поддержкой двух алгоритмов распределения (Weighted Round-Robin и SLOTS vs CHANCE), визуальным редактором потоков, GEO-фильтрацией, расписанием, капами и fallback-логикой. Это главный конкурентный модуль платформы — аналог HyperOne routing + Leadgreed visual editor в одном продукте.

**Метрика успеха:**
- Время маршрутизации лида (от приёма до отправки брокеру) < 300ms (p95)
- Корректность распределения: отклонение от заданных весов ≤ 2% на выборке 10,000+ лидов
- SLOTS vs CHANCE: статистическое распределение соответствует конфигурации с p-value > 0.95 (χ²-тест)
- Fallback срабатывает в 100% случаев при отказе primary-брокера
- Визуальный редактор загружается < 2 сек, drag-and-drop работает при 50+ элементах без лагов

**Приоритет:** P0 (MVP)
**Зависит от:** [EPIC-01], [EPIC-03]
**Оценка:** XL (3+ мес)

---

### Stories:

---

#### [STORY-013] Создание и настройка routing-потоков (flows)

**Как** Network Admin, **я хочу** создавать routing-потоки (flows) с именем, описанием и выбором алгоритма распределения, **чтобы** организовать маршрутизацию лидов по разным бизнес-логикам для разных GEO, вертикалей или аффилейтов.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/routing/flows` создаёт поток с полями: `name` (varchar 100, уникальное per company), `description` (varchar 500, optional), `algorithm` (enum: `weighted_round_robin` | `slots_chance`), `status` (enum: `active` | `paused` | `draft`, default `draft`), `priority` (int 1-100, default 50 — для выбора при пересечении правил). Ответ HTTP 201 с UUID потока
- [ ] AC2: API `GET /api/v1/routing/flows` возвращает список потоков с пагинацией (cursor-based, per_page 20-100). Фильтры: status, algorithm. Сортировка: priority DESC, name ASC
- [ ] AC3: API `PUT /api/v1/routing/flows/{id}` обновляет поток. Изменение algorithm допускается только в статусе `draft` — при попытке изменить algorithm у active потока → HTTP 409 `ALGORITHM_CHANGE_REQUIRES_DRAFT`
- [ ] AC4: API `DELETE /api/v1/routing/flows/{id}` — soft delete (is_deleted=true). Активный поток нельзя удалить → HTTP 409 `CANNOT_DELETE_ACTIVE_FLOW`
- [ ] AC5: Максимум 50 потоков per company. При попытке создать 51-й → HTTP 422 `FLOW_LIMIT_EXCEEDED`
- [ ] AC6: Каждый поток принадлежит одной company (multi-tenant isolation). Другая company не видит чужие потоки → HTTP 404

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-013:

**[TASK-0051] Спроектировать схему БД для routing flows**
- **Тип:** Backend
- **Описание:** Создать миграцию PostgreSQL для таблицы `routing_flows`: `id` (UUID, PK), `company_id` (FK), `name` (varchar 100), `description` (varchar 500, nullable), `algorithm` (enum: weighted_round_robin, slots_chance), `status` (enum: active, paused, draft, default draft), `priority` (smallint, default 50), `is_deleted` (bool, default false), `created_by` (FK users), `created_at` (timestamptz), `updated_at` (timestamptz). Индексы: `(company_id, is_deleted, status)`, `(company_id, name)` UNIQUE WHERE is_deleted=false.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется без ошибок
  - [ ] Rollback-миграция работает корректно
  - [ ] Уникальность name per company проверяется на уровне БД
  - [ ] Soft delete через is_deleted работает с уникальным constraint (partial unique index)
- **Оценка:** 2h
- **Story:** [STORY-013]

**[TASK-0052] Реализовать CRUD API для routing flows**
- **Тип:** Backend
- **Описание:** Go-хэндлеры для POST/GET/PUT/DELETE `/api/v1/routing/flows`. Валидация: name required 1-100 chars, algorithm required enum, priority 1-100. Company_id из JWT-контекста. Проверка лимита 50 потоков при создании. Бизнес-правила: нельзя удалить active, нельзя менять algorithm у не-draft. Audit log для всех операций.
- **Критерии готовности (DoD):**
  - [ ] Все 4 HTTP-метода работают согласно AC
  - [ ] Бизнес-правила (AC3, AC4, AC5) проверены
  - [ ] Multi-tenant изоляция подтверждена тестами
  - [ ] Audit log записывает create/update/delete действия
- **Оценка:** 8h
- **Story:** [STORY-013]

**[TASK-0053] Реализовать Frontend — список и создание потоков**
- **Тип:** Frontend
- **Описание:** Страница "Routing Flows": (1) Таблица потоков: name, algorithm (badge), status (цветовой индикатор: зелёный/жёлтый/серый), priority, broker count, leads routed today. (2) Кнопка "Create Flow" → модальное окно: name, description, algorithm (radio buttons с описанием каждого), priority (slider). (3) Inline actions: Edit, Duplicate, Delete (с подтверждением). (4) Фильтры: status, algorithm.
- **Критерии готовности (DoD):**
  - [ ] Таблица с пагинацией и фильтрами отображается корректно
  - [ ] Создание потока через модальное окно работает
  - [ ] Описание алгоритмов понятно для пользователя (tooltips)
  - [ ] Delete требует подтверждения, показывает ошибку при active
- **Оценка:** 8h
- **Story:** [STORY-013]

**[TASK-0054] Тесты CRUD routing flows**
- **Тип:** QA
- **Описание:** (1) Создание потока → 201. (2) Дублирующее имя → 422. (3) 51-й поток → 422. (4) Удаление active → 409. (5) Изменение algorithm у active → 409. (6) Soft delete → GET не возвращает. (7) Другая company → 404. (8) Список с фильтрами → корректный. (9) Пагинация через cursor → без дублей.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Integration тесты с реальной PostgreSQL
- **Оценка:** 4h
- **Story:** [STORY-013]

---

#### [STORY-014] Визуальный drag-and-drop редактор потоков

**Как** Network Admin, **я хочу** настраивать routing-поток через визуальный drag-and-drop редактор (как в Leadgreed), **чтобы** наглядно видеть структуру распределения, перетаскивать брокеров, менять веса и правила без написания кода.

**Acceptance Criteria:**
- [ ] AC1: При открытии потока отображается визуальный canvas (на базе React Flow / xyflow) с нодами: входной лид (слева), ноды-брокеры (справа), connection-линии между ними с отображением веса/шанса
- [ ] AC2: Drag-and-drop: перетаскивание брокеров из палитры (sidebar) на canvas. Подключение к потоку через визуальное соединение (edge). Удаление через контекстное меню или клавишу Delete
- [ ] AC3: При наведении на ноду-брокера — tooltip с основной информацией: name, status, current cap usage (15/100 today), acceptance rate (85%), avg response time (320ms)
- [ ] AC4: Canvas поддерживает zoom (10%-400%), pan (перетаскивание фона), minimap (обзорная карта при 10+ нодах), auto-layout (кнопка для автоматического выравнивания)
- [ ] AC5: Изменения на canvas сохраняются через кнопку "Save" (не auto-save). Unsaved changes indicator. Кнопка "Discard Changes" для отмены
- [ ] AC6: Производительность: canvas с 50 нодами-брокерами рендерится < 500ms, drag-and-drop работает при 60 FPS на нодах ≤ 100
- [ ] AC7: Конфигурация canvas сохраняется как JSON в БД (позиции нод, connections, параметры). API `PUT /api/v1/routing/flows/{id}/canvas` принимает JSON ≤ 500KB

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-013]

##### Tasks для STORY-014:

**[TASK-0055] Интеграция React Flow (xyflow) и базовый canvas**
- **Тип:** Frontend
- **Описание:** Установить @xyflow/react. Создать компонент `FlowEditor` с базовым canvas: zoom, pan, minimap. Кастомные типы нод: `LeadInputNode` (entry point, не удаляемый), `BrokerNode` (с конфигурацией). Кастомные edges с отображением weight/chance на линии. Sidebar palette с доступными брокерами (из API GET /brokers) для drag-and-drop.
- **Критерии готовности (DoD):**
  - [ ] Canvas рендерится с zoom/pan/minimap
  - [ ] Кастомные ноды отображают правильные данные
  - [ ] Drag из sidebar на canvas создаёт ноду
  - [ ] Производительность: 50 нод < 500ms рендеринг
- **Оценка:** 16h
- **Story:** [STORY-014]

**[TASK-0056] Реализовать кастомные ноды и edges**
- **Тип:** Frontend
- **Описание:** (1) `BrokerNode`: аватар/иконка, имя, статус (цветной dot), weight/chance input (inline editable), cap usage bar (progress), кнопки expand/settings/delete. (2) `LeadInputNode`: иконка входящего лида, счётчик "today's leads", неудаляемый. (3) `WeightEdge`: линия с label показывающим вес (15%) или шанс (slot 3/10), толщина пропорциональна весу. (4) Tooltips при hover с детальной статистикой.
- **Критерии готовности (DoD):**
  - [ ] Все типы нод визуально отличимы
  - [ ] Inline editing весов работает
  - [ ] Tooltip показывает актуальные метрики
  - [ ] Edge label обновляется при изменении веса
- **Оценка:** 16h
- **Story:** [STORY-014]

**[TASK-0057] Save/Load canvas конфигурации**
- **Тип:** Backend
- **Описание:** API `PUT /api/v1/routing/flows/{id}/canvas` — принимает JSON (nodes с позициями, edges с параметрами, viewport state). Валидация: JSON ≤ 500KB, валидные broker_ids в нодах, веса суммируются до 100% для WRR. Сохранение в JSONB-поле `canvas_config` таблицы routing_flows. API `GET /api/v1/routing/flows/{id}/canvas` — возвращает конфигурацию.
- **Критерии готовности (DoD):**
  - [ ] Save/Load работает корректно
  - [ ] Валидация broker_ids — несуществующий broker → ошибка
  - [ ] JSON ≤ 500KB — при превышении → 413
  - [ ] Версионирование canvas_config (поле version для миграций)
- **Оценка:** 4h
- **Story:** [STORY-014]

**[TASK-0058] Auto-layout и UX-улучшения canvas**
- **Тип:** Frontend
- **Описание:** (1) Auto-layout: кнопка "Auto Arrange" использует dagre/ELK layout engine для красивого расположения нод. (2) Unsaved changes detection: при изменении нод/edges — показать indicator "Unsaved changes" и block navigation (beforeunload). (3) Undo/Redo (ctrl+z/ctrl+shift+z) через стек состояний (последние 50 действий). (4) Keyboard shortcuts: Delete (удалить ноду), Ctrl+S (save), Ctrl+A (select all).
- **Критерии готовности (DoD):**
  - [ ] Auto-layout создаёт визуально чистое расположение
  - [ ] Undo/Redo работает для всех операций (add/delete/move/edit)
  - [ ] Keyboard shortcuts работают
  - [ ] Unsaved changes предупреждение при уходе со страницы
- **Оценка:** 8h
- **Story:** [STORY-014]

**[TASK-0059] Design — UI-kit для flow editor**
- **Тип:** Design
- **Описание:** Figma-макеты: (1) Flow editor canvas с нодами и connections. (2) Sidebar palette с поиском брокеров. (3) Broker node в трёх состояниях: normal, selected, error (cap exceeded). (4) Edge с weight label. (5) Toolbar: zoom controls, minimap toggle, auto-layout, save/discard. (6) Settings panel (slide-out) для выбранной ноды.
- **Критерии готовности (DoD):**
  - [ ] Figma-макеты для desktop (1280px+) готовы
  - [ ] Состояния всех элементов описаны
  - [ ] Color scheme и typography соответствуют design system
- **Оценка:** 8h
- **Story:** [STORY-014]

**[TASK-0060] E2E-тесты визуального редактора**
- **Тип:** QA
- **Описание:** Playwright E2E: (1) Открыть flow editor → canvas рендерится. (2) Drag broker из sidebar → нода появляется на canvas. (3) Создать edge между LeadInput и Broker → connection видна. (4) Изменить вес на edge → label обновляется. (5) Save → reload → состояние сохранено. (6) Delete ноды → edge удаляется. (7) Zoom/pan → работает. (8) 50 нод → нет лагов (FPS ≥ 30).
- **Критерии готовности (DoD):**
  - [ ] 8 E2E-тестов проходят
  - [ ] Performance-тест с 50 нодами
  - [ ] Тесты стабильны (не flaky)
- **Оценка:** 8h
- **Story:** [STORY-014]

---

#### [STORY-015] Настройка весов и приоритетов брокеров в потоке

**Как** Network Admin, **я хочу** задавать вес (процент) каждому брокеру внутри потока, **чтобы** контролировать, какую долю лидов получает каждый брокер.

**Acceptance Criteria:**
- [ ] AC1: Каждый брокер в потоке имеет `weight` (int 1-100). Сумма весов всех активных брокеров в потоке ДОЛЖНА быть 100 ± 0. При сохранении потока — валидация: если сумма ≠ 100 → ошибка `WEIGHTS_MUST_SUM_TO_100`
- [ ] AC2: API `POST /api/v1/routing/flows/{flow_id}/brokers` добавляет брокера в поток: `{ "broker_id": "uuid", "weight": 30, "priority": 1, "is_fallback": false }`. Priority (1-10): при равных условиях лид идёт к брокеру с меньшим priority числом
- [ ] AC3: API `PUT /api/v1/routing/flows/{flow_id}/brokers/{broker_id}` обновляет weight/priority/is_fallback
- [ ] AC4: При удалении брокера из потока — оставшиеся веса НЕ перерасчитываются автоматически. UI показывает warning "Total weight: 70%. Please redistribute"
- [ ] AC5: Quick action "Distribute equally" — кнопка, которая устанавливает равные веса всем брокерам (100/N, остаток первому)
- [ ] AC6: Один брокер может участвовать в нескольких потоках одновременно с разными весами

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-013], [EPIC-03]

##### Tasks для STORY-015:

**[TASK-0061] Схема БД для broker-flow привязки**
- **Тип:** Backend
- **Описание:** Таблица `flow_brokers`: `id` (UUID), `flow_id` (FK routing_flows), `broker_id` (FK brokers), `weight` (smallint 1-100), `priority` (smallint 1-10, default 5), `is_fallback` (bool, default false), `is_active` (bool, default true), `created_at`, `updated_at`. Уникальный constraint: `(flow_id, broker_id)`. Индекс: `(flow_id, is_active, priority)`.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана, unique constraint работает
  - [ ] Один брокер не может быть добавлен в поток дважды
- **Оценка:** 2h
- **Story:** [STORY-015]

**[TASK-0062] API для управления брокерами в потоке**
- **Тип:** Backend
- **Описание:** CRUD для `flow_brokers`: POST (add broker), PUT (update weight/priority), DELETE (remove broker). Валидация: weight 1-100, при save flow — сумма весов активных брокеров = 100. Endpoint для "distribute equally": `POST /api/v1/routing/flows/{flow_id}/brokers/distribute-equally` — пересчитывает веса.
- **Критерии готовности (DoD):**
  - [ ] Добавление/обновление/удаление брокеров работает
  - [ ] Валидация суммы весов = 100 при активации потока
  - [ ] Distribute equally корректно распределяет (100/N, остаток первому)
  - [ ] Audit log для всех операций
- **Оценка:** 4h
- **Story:** [STORY-015]

**[TASK-0063] Frontend — настройка весов в редакторе**
- **Тип:** Frontend
- **Описание:** В BrokerNode на canvas: (1) Input поле weight (number, 1-100) с валидацией. (2) Индикатор суммы весов внизу canvas: "Total: 85/100" (красный если ≠ 100, зелёный если = 100). (3) Кнопка "Distribute Equally" в toolbar. (4) При изменении weight одного брокера — остальные не меняются (ручное управление). (5) Settings panel для выбранного брокера: weight slider, priority dropdown, is_fallback toggle.
- **Критерии готовности (DoD):**
  - [ ] Weight input работает с валидацией
  - [ ] Индикатор суммы обновляется в реальном времени
  - [ ] Distribute equally работает корректно
  - [ ] Save блокируется если сумма ≠ 100 (для WRR)
- **Оценка:** 4h
- **Story:** [STORY-015]

**[TASK-0064] Тесты управления весами**
- **Тип:** QA
- **Описание:** (1) Добавить 3 брокера с весами 50+30+20 → ok. (2) Веса 50+30+10 = 90 → save error. (3) Distribute equally 3 брокера → 34+33+33. (4) Удалить брокера → warning о неполных весах. (5) Один брокер в 2 потоках → разные веса → ok. (6) Дублирующий broker в потоке → 409.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Edge cases для distribute equally (1 брокер → 100, 7 брокеров → 15+15+14+14+14+14+14)
- **Оценка:** 4h
- **Story:** [STORY-015]

---

#### [STORY-016] GEO-фильтрация (правила маршрутизации по странам)

**Как** Network Admin, **я хочу** настроить для каждого брокера в потоке списки разрешённых и запрещённых стран (include/exclude GEO), **чтобы** лиды из определённых стран направлялись только к брокерам с лицензией на эту юрисдикцию.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера в потоке можно задать `geo_include` (белый список стран, ISO 3166-1 alpha-2) ИЛИ `geo_exclude` (чёрный список). Оба одновременно → ошибка `GEO_INCLUDE_EXCLUDE_CONFLICT`
- [ ] AC2: При маршрутизации: если у брокера задан geo_include — лид с страной не из списка пропускает этого брокера. Если geo_exclude — лид с страной из списка пропускает этого брокера. Если ничего не задано — брокер принимает любую страну
- [ ] AC3: API `PUT /api/v1/routing/flows/{flow_id}/brokers/{broker_id}/geo` принимает: `{ "mode": "include|exclude|any", "countries": ["DE", "AT", "CH"] }`. Коды стран валидируются по ISO 3166-1 (249 кодов)
- [ ] AC4: UI: при клике на брокер-ноду → в settings panel секция "GEO Rules" с radio (Any/Include/Exclude) и мультиселект стран с поиском и группировкой по регионам (Europe, Asia, etc.)
- [ ] AC5: При конфликте (все брокеры для потока исключают определённую страну) — warning в UI: "No broker available for GEO: NG, ZA". Лиды из этих стран попадут в fallback или в очередь
- [ ] AC6: GEO-правила применяются за < 1ms (in-memory lookup, не DB query на каждый лид)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-015]

##### Tasks для STORY-016:

**[TASK-0065] Схема БД и API для GEO-правил**
- **Тип:** Backend
- **Описание:** Добавить в таблицу `flow_brokers` поля: `geo_mode` (enum: any, include, exclude, default any), `geo_countries` (text[], nullable — массив ISO 3166-1 alpha-2 кодов). API endpoint PUT для обновления. Валидация: все коды стран валидны, include+exclude одновременно → ошибка. При загрузке flow config — ГЕО-правила кешируются в in-memory map: `flowBrokerGeo[flow_id][broker_id] = {mode, countries_set}`.
- **Критерии готовности (DoD):**
  - [ ] GEO-режимы сохраняются и загружаются корректно
  - [ ] In-memory кеш обновляется при изменении правил (event-driven)
  - [ ] Невалидные коды стран отклоняются
- **Оценка:** 4h
- **Story:** [STORY-016]

**[TASK-0066] GEO-фильтр в routing engine**
- **Тип:** Backend
- **Описание:** Функция `FilterBrokersByGeo(brokers []FlowBroker, country string) []FlowBroker`. Фильтрует список брокеров: (1) any → пропускает, (2) include && country in set → пропускает, (3) exclude && country not in set → пропускает. Результат — отфильтрованный список для дальнейшего routing. Prometheus-метрика: `routing_geo_filtered_total{flow_id, country, reason}`.
- **Критерии готовности (DoD):**
  - [ ] Lookup по in-memory set < 1ms
  - [ ] Include-фильтр корректен
  - [ ] Exclude-фильтр корректен
  - [ ] Пустой результат → метрика + fallback trigger
- **Оценка:** 2h
- **Story:** [STORY-016]

**[TASK-0067] Frontend — GEO-настройки в settings panel**
- **Тип:** Frontend
- **Описание:** В settings panel брокер-ноды: (1) Radio группа: Any Country / Include Countries / Exclude Countries. (2) При Include/Exclude — мультиселект с поиском и группировкой (Regions: Europe → DE, FR, IT...; Asia → JP, KR...). (3) Chip-компоненты для выбранных стран с флагами. (4) Warning badge на ноде если есть GEO-ограничения. (5) Overlay на canvas: при наведении на страну в глобальном фильтре — подсвечиваются брокеры, принимающие эту GEO.
- **Критерии готовности (DoD):**
  - [ ] Мультиселект с группировкой по регионам работает
  - [ ] Chips с флагами стран отображаются
  - [ ] Warning при no-broker-for-geo ситуации
- **Оценка:** 8h
- **Story:** [STORY-016]

**[TASK-0068] Тесты GEO-фильтрации**
- **Тип:** QA
- **Описание:** (1) Include [DE, AT] → лид DE → ok, лид FR → skip. (2) Exclude [US, CA] → лид US → skip, лид UK → ok. (3) Any → любой лид ok. (4) Include+Exclude → ошибка. (5) Все брокеры exclude NG → warning, fallback. (6) Невалидный код "XX" → ошибка. (7) Performance: фильтрация 100 брокеров < 1ms.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Performance benchmark подтверждён
- **Оценка:** 4h
- **Story:** [STORY-016]

---

#### [STORY-017] Расписание работы брокеров (time-based scheduling)

**Как** Network Admin, **я хочу** настроить расписание приёма лидов для каждого брокера (например, Пн-Пт 9:00-18:00 по их timezone), **чтобы** лиды отправлялись только в рабочее время брокера и не отклонялись из-за отсутствия операторов.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера в потоке задаётся расписание: массив слотов `[{ "day": "mon", "from": "09:00", "to": "18:00" }]`. Дни: mon-sun. Время в формате HH:MM (24h). Поддерживается множество слотов в день (например, 09:00-13:00 и 14:00-18:00 — перерыв на обед)
- [ ] AC2: Расписание привязано к timezone брокера (из профиля брокера). Поддерживаемые timezone: IANA (Europe/London, America/New_York, etc.). Маршрутизатор конвертирует текущее UTC-время в timezone брокера для проверки
- [ ] AC3: Если текущее время вне расписания — брокер пропускается при routing (аналогично GEO-фильтру). Лид уходит другим брокерам по весам или в fallback
- [ ] AC4: Специальный режим "24/7" — брокер принимает лиды круглосуточно (default)
- [ ] AC5: API `PUT /api/v1/routing/flows/{flow_id}/brokers/{broker_id}/schedule` принимает массив слотов. Валидация: from < to, слоты не пересекаются в рамках одного дня, время валидно (00:00-23:59)
- [ ] AC6: Проверка расписания выполняется за < 1ms (in-memory)
- [ ] AC7: UI: визуальная недельная сетка (7 дней × 24 часа) для настройки — drag для выделения рабочих часов

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-02]
**Зависит от:** [STORY-015]

##### Tasks для STORY-017:

**[TASK-0069] Схема БД и API для schedule**
- **Тип:** Backend
- **Описание:** Таблица `flow_broker_schedules`: `id` (UUID), `flow_broker_id` (FK flow_brokers), `day_of_week` (smallint 0-6, 0=Mon), `time_from` (time), `time_to` (time). Уникальный constraint на `(flow_broker_id, day_of_week, time_from)` для предотвращения дублей. API PUT принимает массив слотов, валидирует, удаляет старые и вставляет новые (replace). In-memory кеш: `schedule[flow_broker_id] = []TimeSlot`, обновляется при изменении.
- **Критерии готовности (DoD):**
  - [ ] Слоты сохраняются и загружаются корректно
  - [ ] Пересечение слотов в одном дне → ошибка
  - [ ] from >= to → ошибка
  - [ ] In-memory кеш обновляется через event bus
- **Оценка:** 4h
- **Story:** [STORY-017]

**[TASK-0070] Schedule checker в routing engine**
- **Тип:** Backend
- **Описание:** Функция `IsBrokerAvailable(flowBrokerID uuid, now time.Time, brokerTimezone string) bool`. Конвертирует `now` в timezone брокера, определяет day_of_week, проверяет попадание в любой time slot для этого дня. Если нет слотов (24/7) → true. Prometheus-метрика: `routing_schedule_skipped_total{flow_id, broker_id}`.
- **Критерии готовности (DoD):**
  - [ ] Конвертация timezone корректна (DST переходы)
  - [ ] 24/7 режим (пустое расписание) → always available
  - [ ] Проверка < 1ms
  - [ ] DST edge case: если переход DST во время рабочего слота → корректная обработка
- **Оценка:** 4h
- **Story:** [STORY-017]

**[TASK-0071] Frontend — визуальная недельная сетка расписания**
- **Тип:** Frontend
- **Описание:** Компонент `WeeklyScheduleGrid`: сетка 7 дней × 24 часа (шаг 30 мин). Drag-select для выделения рабочих часов (как в Google Calendar). Цветовая заливка активных слотов. Toggle "24/7" для быстрой настройки. Отображение timezone брокера. Шаблоны: "Business hours Mon-Fri 9-18", "Extended Mon-Sat 8-22".
- **Критерии готовности (DoD):**
  - [ ] Drag-select работает корректно (начало-конец)
  - [ ] 24/7 toggle заполняет/очищает всю сетку
  - [ ] Шаблоны применяются одним кликом
  - [ ] Timezone отображается рядом с grid
- **Оценка:** 8h
- **Story:** [STORY-017]

**[TASK-0072] Тесты scheduling**
- **Тип:** QA
- **Описание:** (1) Брокер Mon-Fri 9-18 UTC+2 → лид в Tue 10:00 UTC (12:00 broker time) → available. (2) Тот же → лид в Tue 20:00 UTC (22:00 broker time) → not available. (3) Sat → not available. (4) 24/7 → always available. (5) DST transition → корректно. (6) Два слота в день: 9-13 + 14-18 → лид в 13:30 → not available. (7) Пересечение слотов → ошибка валидации.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] DST тестируется для Europe/London и America/New_York
- **Оценка:** 4h
- **Story:** [STORY-017]

---

#### [STORY-018] Cap management (ежедневные/еженедельные/месячные лимиты)

**Как** Network Admin, **я хочу** задавать лимиты (капы) на количество лидов для каждого брокера (дневной, недельный, месячный), **чтобы** не превышать договорённые объёмы и автоматически перенаправлять лиды другим брокерам при достижении капа.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера в потоке настраиваются капы: `daily_cap` (0 = unlimited), `weekly_cap` (0 = unlimited), `monthly_cap` (0 = unlimited). Тип: количество принятых (accepted) лидов, не отправленных
- [ ] AC2: При достижении любого капа — брокер автоматически пропускается при routing. Статус в UI: "Cap reached (45/45 today)". Prometheus alert при достижении 90% капа
- [ ] AC3: Капы сбрасываются: daily — в 00:00 UTC (или timezone компании, настраиваемо), weekly — в понедельник 00:00, monthly — 1-го числа 00:00
- [ ] AC4: Счётчики капов хранятся в Redis (atomic increment) для производительности. Persist в PostgreSQL каждые 5 минут для durability
- [ ] AC5: API `PUT /api/v1/routing/flows/{flow_id}/brokers/{broker_id}/caps` — обновляет капы. `GET /api/v1/routing/flows/{flow_id}/brokers/{broker_id}/caps` — текущее использование: `{ "daily": { "limit": 100, "used": 45, "remaining": 55 }, ... }`
- [ ] AC6: UI: progress bar на BrokerNode показывающий cap usage. Цвета: зелёный < 70%, жёлтый 70-90%, красный > 90%, серый = reached
- [ ] AC7: Ручной reset капа (кнопка "Reset Daily Cap") — для экстренных случаев, с audit log

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-015]

##### Tasks для STORY-018:

**[TASK-0073] Схема данных и Redis-счётчики для caps**
- **Тип:** Backend
- **Описание:** Добавить в `flow_brokers`: `daily_cap` (int, default 0), `weekly_cap` (int, default 0), `monthly_cap` (int, default 0), `cap_timezone` (varchar 50, default 'UTC'). Redis-ключи: `cap:{flow_broker_id}:daily:{YYYY-MM-DD}` (INCR, TTL 48h), `cap:{flow_broker_id}:weekly:{YYYY-WW}` (INCR, TTL 8d), `cap:{flow_broker_id}:monthly:{YYYY-MM}` (INCR, TTL 32d). Фоновый worker: каждые 5 мин → persist текущие значения в PostgreSQL таблицу `cap_snapshots`.
- **Критерии готовности (DoD):**
  - [ ] Redis INCR атомарно увеличивает счётчик
  - [ ] TTL ключей предотвращает утечку памяти
  - [ ] Persist worker сохраняет в PostgreSQL для durability
  - [ ] При перезапуске Redis — восстановление из PostgreSQL snapshot
- **Оценка:** 4h
- **Story:** [STORY-018]

**[TASK-0074] Cap checker в routing engine**
- **Тип:** Backend
- **Описание:** Функция `CheckBrokerCap(flowBrokerID uuid, caps CapConfig) (bool, CapStatus)`. Проверяет все 3 уровня капов через Redis GET. Если любой кап достигнут → return false. Возвращает CapStatus с usage для каждого уровня. При отправке лида → INCR всех 3 счётчиков атомарно (Redis MULTI/EXEC). При отклонении лида брокером → DECR (не считать rejected). Prometheus: `routing_cap_reached_total{flow_id, broker_id, level}`.
- **Критерии готовности (DoD):**
  - [ ] Все 3 уровня капов проверяются
  - [ ] INCR/DECR атомарны
  - [ ] Race condition: 2 лида одновременно, кап 1 → один проходит, один skip
  - [ ] Performance: < 2ms на проверку (3 Redis GET)
- **Оценка:** 4h
- **Story:** [STORY-018]

**[TASK-0075] API и Frontend для cap management**
- **Тип:** Frontend
- **Описание:** (1) API endpoints GET/PUT для caps. (2) В settings panel брокера: 3 input поля (daily/weekly/monthly cap, 0=unlimited). (3) На BrokerNode: progress bar с cap usage (daily по умолчанию). Tooltip: все 3 уровня. (4) Цветовая индикация: green/yellow/red/grey. (5) Кнопка "Reset Cap" в dropdown menu ноды → confirmation → API call → audit log.
- **Критерии готовности (DoD):**
  - [ ] Progress bar обновляется в реальном времени (WebSocket или polling 30 sec)
  - [ ] Reset cap работает с подтверждением
  - [ ] Цветовая индикация корректна
- **Оценка:** 8h
- **Story:** [STORY-018]

**[TASK-0076] Тесты cap management**
- **Тип:** QA
- **Описание:** (1) Daily cap 10 → 10 лидов → cap reached → 11-й skip. (2) Weekly cap 50 → проверка после 7 дней → reset. (3) Monthly cap → reset 1-го числа. (4) Cap 0 (unlimited) → no limit. (5) Manual reset → counter = 0. (6) Race condition: 2 concurrent leads, cap = 1 → один accepted, один skipped. (7) DECR при rejection → cap usage корректен. (8) Redis restart → restore from PostgreSQL.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Race condition тестируется через goroutines
  - [ ] Redis failover тестируется
- **Оценка:** 4h
- **Story:** [STORY-018]

---

#### [STORY-019] Алгоритм Weighted Round-Robin

**Как** Network Admin, **я хочу** использовать алгоритм Weighted Round-Robin для равномерного распределения лидов между брокерами согласно заданным весам, **чтобы** каждый брокер получал предсказуемую долю трафика без статистических выбросов.

**Acceptance Criteria:**
- [ ] AC1: Weighted Round-Robin (WRR) распределяет лиды циклически: если брокер A = 60%, B = 30%, C = 10%, то из каждых 10 лидов A получает ~6, B ~3, C ~1. Отклонение от заданных весов ≤ 2% на выборке 1,000+ лидов
- [ ] AC2: Алгоритм smooth WRR (алгоритм Nginx): не "6 подряд для A, 3 для B, 1 для C", а interleaved — A,A,B,A,A,C,A,B,A,B — для равномерной нагрузки
- [ ] AC3: Состояние WRR (текущая позиция в цикле) хранится в Redis per flow для consistency между инстансами сервиса. Ключ: `wrr_state:{flow_id}`
- [ ] AC4: При добавлении/удалении брокера из потока — WRR-цикл пересчитывается автоматически без потери текущей позиции
- [ ] AC5: При пропуске брокера (cap reached, schedule off, GEO mismatch) — алгоритм переходит к следующему по циклу без нарушения пропорций для оставшихся
- [ ] AC6: WRR обрабатывает edge case: один брокер с весом 100% (все лиды ему), все брокеры на капе (→ fallback/queue)
- [ ] AC7: Latency WRR routing decision < 5ms

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-015], [STORY-016], [STORY-017], [STORY-018]

##### Tasks для STORY-019:

**[TASK-0077] Реализовать Smooth Weighted Round-Robin (SWRR)**
- **Тип:** Backend
- **Описание:** Реализовать SWRR (алгоритм Nginx): каждый брокер имеет `current_weight` (начально 0) и `effective_weight` (= configured weight). На каждом шаге: (1) для каждого eligible брокера: current_weight += effective_weight, (2) выбрать брокера с max current_weight, (3) current_weight -= total_weight. Состояние (массив current_weights) хранится в Redis hash `wrr_state:{flow_id}` → `{broker_id: current_weight}`. Atomic операции через Lua script.
- **Критерии готовности (DoD):**
  - [ ] Распределение 10,000 лидов отклоняется от весов ≤ 2%
  - [ ] Smooth distribution: нет "пакетов" (max 3 подряд одному брокеру при весе ≤ 60%)
  - [ ] Redis Lua script обеспечивает atomicity
  - [ ] Benchmark: < 3ms per decision
- **Оценка:** 8h
- **Story:** [STORY-019]

**[TASK-0078] Интеграция WRR с фильтрами (GEO, schedule, cap)**
- **Тип:** Backend
- **Описание:** Pipeline routing: (1) Load flow config, (2) Filter by GEO → eligible brokers, (3) Filter by schedule → eligible, (4) Filter by cap → eligible, (5) Apply WRR to eligible list. При пропуске брокера WRR не ломается — алгоритм пересчитывает для доступных. Если eligible list пуст → trigger fallback. Метрики: `routing_wrr_decisions_total{flow_id}`, `routing_wrr_no_eligible_total{flow_id}`.
- **Критерии готовности (DoD):**
  - [ ] Pipeline применяет все фильтры перед WRR
  - [ ] WRR корректно работает с reduced eligible list
  - [ ] Пустой eligible list → fallback без паники
  - [ ] Все метрики экспортируются
- **Оценка:** 4h
- **Story:** [STORY-019]

**[TASK-0079] Тесты WRR**
- **Тип:** QA
- **Описание:** (1) 3 брокера 60/30/10 → 10,000 лидов → отклонение ≤ 2%. (2) Smooth: нет > 3 подряд при весе ≤ 60%. (3) Один брокер removed → оставшиеся перераспределяются. (4) Все на капе → empty eligible → fallback. (5) GEO filter убирает 1 из 3 → WRR по оставшимся 2. (6) Один брокер 100% → все лиды ему. (7) Concurrent: 100 goroutines routing → race-free. (8) Redis state persistence: restart → state preserved.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Статистический тест (χ²) для распределения
  - [ ] Concurrency тест без data race
- **Оценка:** 8h
- **Story:** [STORY-019]

---

#### [STORY-020] Алгоритм SLOTS vs CHANCE

**Как** Network Admin, **я хочу** использовать алгоритм SLOTS vs CHANCE (как в Leadgreed) для статистически корректного распределения лидов, **чтобы** иметь альтернативу Round-Robin — вероятностное распределение, где каждый лид получает "шанс" попасть к конкретному брокеру независимо от предыдущих решений.

**Acceptance Criteria:**
- [ ] AC1: В режиме SLOTS: каждый брокер получает фиксированное количество "слотов" из общего пула. Пример: 10 слотов, A=5, B=3, C=2. Каждый лид "вытягивает" случайный слот. При опустошении пула — пул обновляется. Гарантированное распределение в рамках каждого пула
- [ ] AC2: В режиме CHANCE: каждый брокер имеет "шанс" (вероятность) 0.01-1.00. При каждом лиде — random() сравнивается с порогами. Пример: A=0.50, B=0.30, C=0.20. Каждый лид независим — нет памяти о предыдущих решениях
- [ ] AC3: Network Admin выбирает sub-mode (SLOTS или CHANCE) при создании потока с algorithm=slots_chance
- [ ] AC4: Для SLOTS: pool size настраивается (10-1000, default 100). При полном исчерпании пула — автоматическая перегенерация (shuffle нового пула)
- [ ] AC5: Для CHANCE: сумма шансов всех брокеров ДОЛЖНА быть 1.00 (100%). Точность до 0.01 (1%)
- [ ] AC6: Статистическая корректность: χ²-тест на выборке 10,000 лидов с p-value > 0.05 для обоих sub-modes
- [ ] AC7: Latency: < 3ms per decision для обоих sub-modes

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-015], [STORY-016], [STORY-017], [STORY-018]

##### Tasks для STORY-020:

**[TASK-0080] Реализовать SLOTS sub-mode**
- **Тип:** Backend
- **Описание:** Механизм SLOTS: (1) Создание пула: массив [A,A,A,A,A,B,B,B,C,C] (по количеству слотов). Fisher-Yates shuffle. Сохранение в Redis list `slots_pool:{flow_id}`. (2) При routing: LPOP из Redis → broker_id. (3) При пустом списке → regenerate pool. (4) При добавлении/удалении брокера → regenerate pool. Поле `pool_size` в routing_flows (int, 10-1000, default 100). Lua script для atomic pop + regenerate-if-empty.
- **Критерии готовности (DoD):**
  - [ ] Pool генерируется с правильными пропорциями
  - [ ] Fisher-Yates shuffle (crypto/rand)
  - [ ] Atomic LPOP через Redis
  - [ ] Auto-regeneration при empty pool
  - [ ] Benchmark: < 2ms per decision
- **Оценка:** 8h
- **Story:** [STORY-020]

**[TASK-0081] Реализовать CHANCE sub-mode**
- **Тип:** Backend
- **Описание:** Механизм CHANCE: (1) Для каждого eligible брокера — chance (float64, 0.01-1.00). (2) При routing: random float [0, 1), cumulative probability: A=[0, 0.50), B=[0.50, 0.80), C=[0.80, 1.00). Бинарный поиск по cumulative distribution. (3) Stateless — никакого Redis state, всё вычисляется на лету из конфигурации. (4) При изменении eligible list (GEO/schedule/cap) — chance нормализуется до суммы 1.00 среди eligible.
- **Критерии готовности (DoD):**
  - [ ] Распределение соответствует конфигурации (χ²-тест, p > 0.05)
  - [ ] Нормализация при reduced eligible корректна
  - [ ] Crypto-random для unpredictability
  - [ ] Benchmark: < 1ms per decision (no Redis, in-memory)
- **Оценка:** 4h
- **Story:** [STORY-020]

**[TASK-0082] Frontend — переключение SLOTS/CHANCE и настройка**
- **Тип:** Frontend
- **Описание:** При algorithm=slots_chance в flow editor: (1) Sub-mode toggle: SLOTS / CHANCE. (2) Для SLOTS: pool size input (10-1000), на BrokerNode — отображение slots (5/10). Индикатор текущего состояния пула: "Pool: 34/100 remaining". (3) Для CHANCE: на BrokerNode — chance input (0.01-1.00 или 1%-100%). Индикатор суммы: "Total: 100%". (4) Visual difference: edges в SLOTS-mode — discrete (counts), в CHANCE-mode — probabilistic (%).
- **Критерии готовности (DoD):**
  - [ ] Sub-mode toggle переключает UI корректно
  - [ ] Slots count / chance % отображаются на BrokerNode
  - [ ] Валидация суммы (slots total = pool_size, chance total = 100%)
- **Оценка:** 8h
- **Story:** [STORY-020]

**[TASK-0083] Тесты SLOTS vs CHANCE**
- **Тип:** QA
- **Описание:** SLOTS: (1) Pool 10, A=5/B=3/C=2 → 10 лидов → ровно 5/3/2. (2) Pool exhausted → regenerate → new 10. (3) Broker removed → pool regenerated. CHANCE: (4) A=0.50/B=0.30/C=0.20 → 10,000 лидов → χ²-тест p > 0.05. (5) Chance sum ≠ 1.00 → error. (6) GEO filter removes B → A/C normalized to 0.71/0.29. Both: (7) All brokers capped → fallback. (8) Concurrent routing → thread-safe.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Статистический тест с scipy.stats или Go equivalent
  - [ ] Concurrency safety подтверждена
- **Оценка:** 8h
- **Story:** [STORY-020]

---

#### [STORY-021] Fallback routing (резервная маршрутизация)

**Как** Network Admin, **я хочу** настроить fallback-цепочку для каждого потока (если primary-брокер отклоняет лид → попробовать backup-брокеров), **чтобы** максимизировать конверсию лидов и не терять трафик при отказах.

**Acceptance Criteria:**
- [ ] AC1: Каждый брокер в потоке может быть помечен как `is_fallback: true`. Fallback-брокеры не участвуют в основном распределении (WRR/SLOTS/CHANCE), а используются только при отказе primary
- [ ] AC2: Fallback-цепочка работает по приоритету: если primary-брокер отклоняет лид (HTTP 4xx от broker API, timeout 30 sec, или явный reject в ответе) → следующий fallback-брокер по priority. Максимум 5 fallback-попыток (настраиваемо per flow, default 3)
- [ ] AC3: Fallback-брокеры также проходят фильтры (GEO, schedule, cap). Если fallback-брокер не eligible → skip к следующему
- [ ] AC4: Время между fallback-попытками: 0 (immediate) — первые 2, затем 5 сек для 3-й и далее (настраиваемые delays)
- [ ] AC5: Если все fallback-брокеры также отклонили — лид переходит в статус `unrouted` и попадает в очередь (см. STORY-024)
- [ ] AC6: Каждая fallback-попытка логируется: `routing_attempts` таблица с `lead_id`, `broker_id`, `attempt_number`, `result` (accepted/rejected/timeout/error), `response_code`, `latency_ms`
- [ ] AC7: UI: fallback-нода обозначается пунктирной линией и иконкой "backup". Лог попыток виден в lead detail view

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-02]
**Зависит от:** [STORY-019], [STORY-020]

##### Tasks для STORY-021:

**[TASK-0084] Реализовать fallback routing engine**
- **Тип:** Backend
- **Описание:** После основного routing decision (WRR/SLOTS/CHANCE): (1) Отправить лид primary broker (через Broker Integration Layer). (2) Если rejection/timeout/error → запустить fallback loop: отсортировать fallback-брокеров по priority, фильтровать по GEO/schedule/cap, попытаться отправить. (3) Max attempts из flow config (default 3). (4) Delays: 0ms для attempt 1-2, 5000ms для 3+. (5) Запись каждой попытки в `routing_attempts`. (6) Если все failed → lead.status = `unrouted`, push в queue.
- **Критерии готовности (DoD):**
  - [ ] Fallback цепочка работает корректно по priority
  - [ ] Фильтры (GEO/schedule/cap) применяются к fallback
  - [ ] Max attempts limit работает
  - [ ] Delays между попытками корректны
  - [ ] Все попытки логируются в routing_attempts
- **Оценка:** 8h
- **Story:** [STORY-021]

**[TASK-0085] Схема БД для routing attempts log**
- **Тип:** Backend
- **Описание:** Таблица `routing_attempts`: `id` (bigserial), `lead_id` (FK), `flow_id` (FK), `broker_id` (FK), `attempt_number` (smallint), `is_fallback` (bool), `result` (enum: accepted, rejected, timeout, error, cap_reached, geo_filtered, schedule_off), `response_code` (smallint, nullable), `response_body` (text, first 500 chars, nullable), `latency_ms` (int), `created_at` (timestamptz). Индексы: `(lead_id)`, `(flow_id, created_at)`, `(broker_id, result)`. Партиционирование по created_at (ежедневно), TTL 90 дней.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана, индексы покрывают основные запросы
  - [ ] Партиционирование и автоочистка настроены
  - [ ] Запись в лог не блокирует routing (async write)
- **Оценка:** 2h
- **Story:** [STORY-021]

**[TASK-0086] Frontend — fallback-ноды и лог попыток**
- **Тип:** Frontend
- **Описание:** (1) В flow editor: fallback-брокеры соединяются пунктирной линией (dashed edge), иконка shield/backup на ноде. (2) В lead detail view: секция "Routing Attempts" — таблица: attempt#, broker, result (цветной badge), response_code, latency. (3) Flow settings: "Max Fallback Attempts" input (1-5), "Fallback Delay" inputs.
- **Критерии готовности (DoD):**
  - [ ] Fallback-брокеры визуально отличаются на canvas
  - [ ] Routing attempts таблица в lead detail показывает все попытки
  - [ ] Flow settings для fallback работают
- **Оценка:** 4h
- **Story:** [STORY-021]

**[TASK-0087] Тесты fallback routing**
- **Тип:** QA
- **Описание:** (1) Primary accepts → no fallback triggered. (2) Primary rejects → fallback#1 accepts → ok. (3) Primary + fallback#1 reject → fallback#2 accepts → ok. (4) All reject → lead status = unrouted. (5) Fallback broker GEO-filtered → skip to next. (6) Fallback broker at cap → skip to next. (7) Max attempts = 2 → only 2 fallback tries. (8) Delay: attempt 3+ → wait 5 sec. (9) Concurrent leads → fallback не мешает другим лидам.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Mock broker API для simulate reject/accept/timeout
- **Оценка:** 8h
- **Story:** [STORY-021]

---

#### [STORY-022] Тестирование и симуляция потока (dry-run)

**Как** Network Admin, **я хочу** протестировать routing-поток в режиме симуляции (dry-run) без реальной отправки лидов брокерам, **чтобы** убедиться в корректности настроек перед запуском потока в production.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/routing/flows/{flow_id}/simulate` принимает тестовый лид (или массив до 100 лидов) и возвращает результат маршрутизации БЕЗ реальной отправки: `{ "lead": {...}, "routing_decision": { "broker_id": "...", "broker_name": "...", "reason": "WRR weight 40%", "filters_applied": ["GEO: passed", "Schedule: passed", "Cap: 15/100 — passed"] }, "fallback_chain": [...], "would_queue": false }`
- [ ] AC2: Симуляция проходит все этапы routing: GEO-фильтр, schedule check, cap check, algorithm decision, fallback chain — но не отправляет HTTP-запрос к брокеру и не инкрементирует счётчики
- [ ] AC3: Поддерживается bulk simulation: массив до 100 лидов с разными GEO/параметрами → массив результатов. Цель: проверить распределение по всем GEO
- [ ] AC4: UI: кнопка "Test Flow" → модальное окно с формой тестового лида (country, ip, и др.) + кнопка "Simulate 100 random leads" (генерация случайных лидов из разных GEO). Результат: таблица с routing decisions
- [ ] AC5: Симуляция доступна для потоков в любом статусе (draft, paused, active)
- [ ] AC6: Latency симуляции 1 лида < 50ms, 100 лидов < 2 sec

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-02]
**Зависит от:** [STORY-019], [STORY-020], [STORY-021]

##### Tasks для STORY-022:

**[TASK-0088] Реализовать simulation engine**
- **Тип:** Backend
- **Описание:** Функция `SimulateRouting(flow Flow, lead Lead) SimulationResult`. Проходит весь routing pipeline в read-only режиме: (1) GEO filter → отчёт, (2) Schedule check → отчёт, (3) Cap check (читает Redis без INCR) → отчёт, (4) Algorithm decision (для WRR — виртуальный step без обновления state, для SLOTS — peek без pop, для CHANCE — random decision) → broker. (5) Fallback chain simulation. API endpoint с batch support.
- **Критерии готовности (DoD):**
  - [ ] Simulation не изменяет state (caps, WRR position, pools)
  - [ ] Результат включает детализацию каждого шага
  - [ ] Batch 100 лидов < 2 sec
  - [ ] Results JSON содержит все поля из AC1
- **Оценка:** 8h
- **Story:** [STORY-022]

**[TASK-0089] Frontend — simulate modal**
- **Тип:** Frontend
- **Описание:** (1) Кнопка "Test Flow" в toolbar flow editor. (2) Модалка: tab "Single Lead" (форма: country dropdown, IP input, other lead fields) + tab "Bulk Simulation" (кнопка "Generate 100 random", или upload CSV). (3) Результат: таблица/accordion с routing decision для каждого лида. (4) Визуализация: подсветка выбранного брокера на canvas, animation of lead flowing through the pipeline.
- **Критерии готовности (DoD):**
  - [ ] Single lead simulation работает
  - [ ] Bulk simulation 100 лидов отображается в таблице
  - [ ] Подсветка выбранного брокера на canvas
- **Оценка:** 8h
- **Story:** [STORY-022]

**[TASK-0090] Тесты simulation**
- **Тип:** QA
- **Описание:** (1) Simulate → correct broker selected. (2) Simulate doesn't change cap counters. (3) Simulate doesn't change WRR state. (4) GEO-filtered broker shows "filtered" in result. (5) Schedule-off broker shows "schedule off". (6) All brokers filtered → "would_queue: true". (7) Bulk 100 → all return results. (8) Draft flow → simulation works.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] State immutability verified (before/after comparison)
- **Оценка:** 4h
- **Story:** [STORY-022]

---

#### [STORY-023] Real-time routing метрики и мониторинг

**Как** Network Admin, **я хочу** видеть метрики маршрутизации в реальном времени (сколько лидов получил каждый брокер, rejection rate, latency), **чтобы** оперативно реагировать на проблемы и оптимизировать распределение.

**Acceptance Criteria:**
- [ ] AC1: Dashboard "Routing Overview" показывает для каждого активного потока: leads routed today, success rate (%), avg routing latency (ms), active brokers / total
- [ ] AC2: Per-broker метрики (в потоке): leads received (today/week/month), acceptance rate (%), avg response time (ms), cap usage (%). Данные обновляются каждые 30 сек (WebSocket push)
- [ ] AC3: Real-time feed: последние 100 routing events (lead_id, broker, result, latency) с auto-scroll. Фильтр по потоку и брокеру
- [ ] AC4: Графики (time series): leads/min за последние 24ч (per flow), rejection rate за последние 24ч (per broker), avg latency за последние 24ч
- [ ] AC5: Alerting: настраиваемые алерты — rejection rate > X% за Y мин, avg latency > Z ms, broker offline > N мин. Каналы: UI notification, Telegram, email
- [ ] AC6: API `GET /api/v1/routing/metrics?flow_id=...&period=24h` возвращает агрегированные метрики. Latency < 500ms

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-02]
**Зависит от:** [STORY-019], [STORY-020]

##### Tasks для STORY-023:

**[TASK-0091] Реализовать сбор и агрегацию routing-метрик**
- **Тип:** Backend
- **Описание:** (1) При каждом routing decision — publish event в Redis Stream: `{flow_id, broker_id, result, latency_ms, timestamp}`. (2) Aggregator worker: читает stream, агрегирует per-minute stats в Redis hash: `routing_stats:{flow_id}:{broker_id}:{YYYY-MM-DD-HH-mm}` → `{total, accepted, rejected, avg_latency}`. TTL 48h. (3) API endpoint читает из Redis hashes и агрегирует per period. (4) WebSocket endpoint `/ws/routing/metrics` push обновления каждые 30 sec.
- **Критерии готовности (DoD):**
  - [ ] Per-minute агрегация работает
  - [ ] API возвращает данные за 24h < 500ms
  - [ ] WebSocket push каждые 30 sec
  - [ ] Redis memory usage < 100MB для 100 flows × 50 brokers × 48h
- **Оценка:** 8h
- **Story:** [STORY-023]

**[TASK-0092] Frontend — routing metrics dashboard**
- **Тип:** Frontend
- **Описание:** (1) Page "Routing Metrics": selector потока, overview cards (leads today, success rate, avg latency, active brokers). (2) Per-broker table: sortable columns (name, leads, acceptance rate, avg latency, cap usage). (3) Time series charts (Recharts/Chart.js): leads/min, rejection rate, latency. (4) Real-time feed: auto-scrolling list of last 100 events. (5) WebSocket connection for live updates.
- **Критерии готовности (DoD):**
  - [ ] Overview cards обновляются в реальном времени
  - [ ] Графики рендерятся за < 1 sec
  - [ ] Real-time feed работает через WebSocket
  - [ ] Фильтры по flow и broker работают
- **Оценка:** 16h
- **Story:** [STORY-023]

**[TASK-0093] Alerting для routing метрик**
- **Тип:** Backend
- **Описание:** (1) Таблица `routing_alerts`: id, company_id, flow_id (nullable, null=all flows), metric (enum: rejection_rate, avg_latency, broker_offline), threshold (float), window_minutes (int), channels (text[]: ui, telegram, email), is_active. (2) Alert evaluator: cron каждые 1 мин, проверяет метрики за window, сравнивает с threshold, при срабатывании — notify через channels. (3) Deduplication: не слать повторный алерт за то же окно.
- **Критерии готовности (DoD):**
  - [ ] Алерт срабатывает корректно при превышении threshold
  - [ ] Дедупликация работает (не спамит)
  - [ ] Telegram/email/UI notification отправляются
- **Оценка:** 8h
- **Story:** [STORY-023]

**[TASK-0094] Тесты routing metrics**
- **Тип:** QA
- **Описание:** (1) 100 routing events → aggregation correct. (2) API returns correct stats for 24h. (3) WebSocket sends updates. (4) Alert: rejection_rate > 20% → trigger. (5) Alert: dedup → no second alert in same window. (6) Empty flow → zero metrics, no errors.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] WebSocket tested with client mock
- **Оценка:** 4h
- **Story:** [STORY-023]

---

#### [STORY-024] Очередь лидов при недоступности брокеров (lead queuing)

**Как** Network Admin, **я хочу** чтобы лиды, которые не удалось отправить ни одному брокеру (все на капе или offline), помещались в очередь и автоматически отправлялись при появлении доступных брокеров, **чтобы** не терять трафик.

**Acceptance Criteria:**
- [ ] AC1: Если после основного routing + fallback ни один брокер не принял лид — лид помещается в очередь `lead_queue` со статусом `queued`. Очередь per flow
- [ ] AC2: Queue processor: каждые 60 сек (настраиваемо) проверяет очередь и пытается отправить queued лиды. Приоритет: FIFO (самые старые первыми)
- [ ] AC3: Максимальное время в очереди (queue TTL): настраиваемо per flow, default 24ч. По истечении — лид переходит в статус `expired`, удаляется из очереди
- [ ] AC4: Лимит очереди: максимум 10,000 лидов per flow (настраиваемо). При превышении — новые лиды сразу получают статус `unrouted` (не queued)
- [ ] AC5: UI: виджет "Queued Leads" на routing dashboard: количество в очереди, oldest lead age, estimated wait time. Кнопка "Flush Queue" (manual retry all now)
- [ ] AC6: При сбросе капа (новый день, manual reset) — queue processor сразу пытается отправить queued лиды (event-triggered, а не только по cron)
- [ ] AC7: Метрика: `routing_queue_depth{flow_id}` (gauge), `routing_queue_expired_total{flow_id}` (counter)

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-02]
**Зависит от:** [STORY-021]

##### Tasks для STORY-024:

**[TASK-0095] Реализовать lead queue**
- **Тип:** Backend
- **Описание:** Redis Sorted Set `lead_queue:{flow_id}` с score = timestamp (FIFO). При unrouted lead: ZADD. Queue processor goroutine: каждые 60 sec → ZRANGEBYSCORE (oldest first, batch 100) → attempt routing → ZREM при success. TTL check: ZRANGEBYSCORE score < now()-queue_ttl → move to expired. Таблица `flow_queue_config`: flow_id, check_interval_sec (default 60), ttl_hours (default 24), max_size (default 10000). Event listener: на cap_reset event → trigger immediate queue processing.
- **Критерии готовности (DoD):**
  - [ ] FIFO ordering корректен
  - [ ] TTL expiration работает
  - [ ] Max size limit работает
  - [ ] Event-triggered processing при cap reset
  - [ ] Concurrent queue processing → no duplicate sends
- **Оценка:** 8h
- **Story:** [STORY-024]

**[TASK-0096] Frontend — queue widget и management**
- **Тип:** Frontend
- **Описание:** (1) На routing dashboard: card "Queued Leads" — count, oldest age ("2h 15m"), flow breakdown. (2) Кнопка "Flush Queue" → confirm → API call POST /routing/flows/{id}/queue/flush. (3) Expandable: список queued leads с basic info (lead_id, country, queued_at, wait time). (4) Queue settings in flow config: TTL, max size, check interval.
- **Критерии готовности (DoD):**
  - [ ] Queue count обновляется в реальном времени
  - [ ] Flush queue работает
  - [ ] Queue settings сохраняются
- **Оценка:** 4h
- **Story:** [STORY-024]

**[TASK-0097] Тесты lead queue**
- **Тип:** QA
- **Описание:** (1) All brokers capped → lead queued. (2) Cap resets → queued lead sent. (3) Queue TTL expired → lead status = expired. (4) Queue max size → new leads = unrouted. (5) FIFO: oldest sent first. (6) Flush queue → all sent immediately. (7) Concurrent processing → no duplicates. (8) Event-triggered processing on cap reset.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Race condition тестируется
- **Оценка:** 4h
- **Story:** [STORY-024]

---

#### [STORY-025] Priority routing (VIP GEO → конкретные брокеры)

**Как** Network Admin, **я хочу** настроить приоритетную маршрутизацию для VIP-стран (например, DE, UK, AU), направляя их к определённым "премиум" брокерам с наивысшим приоритетом, **чтобы** максимизировать конверсию и revenue с высокодоходных GEO.

**Acceptance Criteria:**
- [ ] AC1: В потоке можно создать "Priority Rules" — правила вида: `IF country IN [DE, AT, CH] THEN route to [Broker A, Broker B] FIRST (priority override)`. Эти правила проверяются ДО основного алгоритма (WRR/SLOTS/CHANCE)
- [ ] AC2: Priority rules поддерживают условия: country (list), language (list), fraud_score (range), custom_field (key=value). Условия комбинируются через AND
- [ ] AC3: Если priority broker недоступен (cap/schedule/reject) → fallback к основному алгоритму (не к другому priority broker). Это "try first, fallback to default"
- [ ] AC4: Максимум 20 priority rules per flow. Rules проверяются в порядке приоритета (priority 1-20). Первое совпавшее правило применяется
- [ ] AC5: API `POST /api/v1/routing/flows/{flow_id}/priority-rules` — CRUD для правил
- [ ] AC6: UI: секция "Priority Rules" в flow editor — таблица правил с drag-and-drop для сортировки по приоритету

**Story Points:** 5
**Приоритет:** Could
**Epic:** [EPIC-02]
**Зависит от:** [STORY-019], [STORY-020]

##### Tasks для STORY-025:

**[TASK-0098] Схема и API для priority rules**
- **Тип:** Backend
- **Описание:** Таблица `flow_priority_rules`: `id` (UUID), `flow_id` (FK), `priority` (smallint 1-20), `conditions` (jsonb — `[{"field": "country", "op": "in", "value": ["DE","AT","CH"]}, {"field": "fraud_score", "op": "lte", "value": 30}]`), `target_broker_ids` (UUID[]), `is_active` (bool), `created_at`. API CRUD. Валидация: max 20 rules, conditions schema, target brokers exist in flow.
- **Критерии готовности (DoD):**
  - [ ] CRUD API работает
  - [ ] Conditions schema валидируется
  - [ ] Max 20 rules per flow
  - [ ] Target brokers валидируются
- **Оценка:** 4h
- **Story:** [STORY-025]

**[TASK-0099] Priority rules evaluation в routing engine**
- **Тип:** Backend
- **Описание:** В начале routing pipeline (перед WRR/SLOTS/CHANCE): (1) Загрузить priority rules для flow (in-memory cache). (2) Для каждого rule по priority: evaluate conditions against lead. (3) Первое совпадение → route to target broker (с проверкой GEO/schedule/cap). (4) Если target broker unavailable → skip rule, go to next rule или default algorithm. Evaluation < 2ms.
- **Критерии готовности (DoD):**
  - [ ] Priority rules evaluatируются перед основным алгоритмом
  - [ ] Conditions: country IN, fraud_score LTE/GTE, custom_field EQ работают
  - [ ] Fallback к основному алгоритму при unavailable target
  - [ ] Performance < 2ms для 20 rules
- **Оценка:** 4h
- **Story:** [STORY-025]

**[TASK-0100] Frontend — priority rules UI**
- **Тип:** Frontend
- **Описание:** Секция "Priority Rules" в flow settings: (1) Таблица rules: priority#, conditions (human-readable), target brokers, status. (2) Drag-and-drop для reorder. (3) Add/Edit rule modal: condition builder (field dropdown + operator dropdown + value input/multiselect), target broker multiselect. (4) Визуализация на canvas: priority route edges в другом цвете (золотой).
- **Критерии готовности (DoD):**
  - [ ] Drag-and-drop reorder работает
  - [ ] Condition builder интуитивен
  - [ ] Priority routes визуально отличаются на canvas
- **Оценка:** 8h
- **Story:** [STORY-025]

**[TASK-0101] Тесты priority rules**
- **Тип:** QA
- **Описание:** (1) Lead DE + rule country IN [DE] → priority broker. (2) Priority broker capped → fallback to default algorithm. (3) No matching rule → default algorithm. (4) Multiple rules: first match wins. (5) Combined conditions: country=DE AND fraud_score<30 → match. (6) 20 rules → all evaluated < 2ms.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Performance benchmark
- **Оценка:** 4h
- **Story:** [STORY-025]

---

### Сводка по EPIC-02

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 13 |
| **Story Points** | 89 (итого) |
| **Must** | 7 stories (55 SP) |
| **Should** | 4 stories (29 SP) |
| **Could** | 2 stories (10 SP) |
| **Всего Tasks** | 51 |
| **Backend tasks** | 23 |
| **Frontend tasks** | 14 |
| **QA tasks** | 11 |
| **Design tasks** | 1 |
| **Docs tasks** | 0 |
| **DevOps tasks** | 0 |
| **Оценка (часы)** | ~304h |

---

## [EPIC-03] Broker Integration Layer

**Цель:** Обеспечить интеграцию с 200+ брокерскими платформами через унифицированный адаптерный слой — управление профилями брокеров, библиотека шаблонов интеграций, маппинг полей, тестирование подключений, синхронизация статусов и обработка ошибок. Этот модуль — мост между routing engine и реальными брокерами.

**Метрика успеха:**
- 200+ шаблонов интеграций к моменту запуска
- Время подключения нового брокера по шаблону < 5 минут (UX benchmark)
- Успешная доставка лида брокеру ≥ 99.5% (без учёта reject по бизнес-причинам)
- Latency отправки лида брокеру < 3 sec (p95, включая network)
- Status sync задержка < 5 мин от момента изменения у брокера

**Приоритет:** P0 (MVP)
**Зависит от:** [EPIC-06]
**Оценка:** XL (3+ мес)

---

### Stories:

---

#### [STORY-026] Управление профилями брокеров (Broker CRUD)

**Как** Network Admin, **я хочу** создавать и управлять профилями брокеров (название, API-учётные данные, endpoint URL, статус), **чтобы** подключать новых брокеров к платформе и управлять существующими подключениями.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/brokers` создаёт профиль: `name` (varchar 100, уникальное per company), `api_url` (varchar 2000, URL endpoint), `auth_type` (enum: api_key, bearer_token, basic_auth, oauth2, custom_header), `auth_credentials` (jsonb, encrypted — `{"api_key": "xxx"}` или `{"username": "x", "password": "y"}`), `status` (enum: active, paused, testing, disabled, default testing), `timezone` (IANA timezone, default UTC), `contact_email` (varchar 255, optional), `notes` (text, optional). Ответ HTTP 201
- [ ] AC2: `auth_credentials` шифруются AES-256-GCM перед сохранением в БД. Расшифровка только при отправке лида. В GET-ответах credentials маскируются: `{"api_key": "***last4"}`
- [ ] AC3: API `GET /api/v1/brokers` — список с пагинацией, фильтры: status, search by name. `GET /api/v1/brokers/{id}` — полный профиль (credentials masked)
- [ ] AC4: API `PUT /api/v1/brokers/{id}` — обновление. При изменении auth_credentials — старые перезаписываются, audit log фиксирует факт изменения (не значения)
- [ ] AC5: API `DELETE /api/v1/brokers/{id}` — soft delete. Нельзя удалить брокера, который участвует в активных потоках → HTTP 409 `BROKER_IN_ACTIVE_FLOWS`
- [ ] AC6: Максимум 200 брокеров per company
- [ ] AC7: Multi-tenant: брокеры изолированы по company_id

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-026:

**[TASK-0102] Схема БД для брокеров с шифрованием credentials**
- **Тип:** Backend
- **Описание:** Таблица `brokers`: `id` (UUID, PK), `company_id` (FK), `name` (varchar 100), `api_url` (varchar 2000), `auth_type` (enum), `auth_credentials_encrypted` (bytea — AES-256-GCM encrypted), `auth_credentials_nonce` (bytea), `status` (enum: active, paused, testing, disabled), `timezone` (varchar 50, default 'UTC'), `contact_email` (varchar 255, nullable), `notes` (text, nullable), `template_id` (FK, nullable — ссылка на шаблон интеграции), `is_deleted` (bool, default false), `created_by` (FK users), `created_at`, `updated_at`. Уникальный индекс `(company_id, name)` WHERE is_deleted=false. Модуль шифрования: AES-256-GCM с ключом из env variable `ENCRYPTION_KEY`.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана, шифрование работает
  - [ ] Ключ шифрования не хранится в БД (env/secrets manager)
  - [ ] Расшифровка credentials < 1ms
  - [ ] Маскирование в GET-ответах
- **Оценка:** 4h
- **Story:** [STORY-026]

**[TASK-0103] Реализовать CRUD API для брокеров**
- **Тип:** Backend
- **Описание:** Go-хэндлеры для POST/GET/PUT/DELETE `/api/v1/brokers`. Encrypt credentials на POST/PUT, decrypt на внутреннее использование (routing). Mask credentials на GET. Проверка лимита 200 per company. Проверка active flows при delete. Audit log для всех операций. Валидация URL формата, auth_type и соответствующих credentials.
- **Критерии готовности (DoD):**
  - [ ] Все 4 HTTP-метода работают
  - [ ] Credentials encrypted in DB, masked in API response
  - [ ] Delete blocked for broker in active flows
  - [ ] Audit log записывает все операции
- **Оценка:** 8h
- **Story:** [STORY-026]

**[TASK-0104] Frontend — управление профилями брокеров**
- **Тип:** Frontend
- **Описание:** Страница "Brokers": (1) Таблица: name, status (badge), API URL (truncated), auth type, template, last connected, leads today. (2) Кнопка "Add Broker" → wizard: Step 1: name + template (optional), Step 2: API URL + auth type + credentials inputs (password fields), Step 3: timezone + contact. (3) Edit modal: все поля, credentials show "••••" с кнопкой "Update Credentials". (4) Actions: Edit, Pause, Test Connection, Delete.
- **Критерии готовности (DoD):**
  - [ ] Wizard для создания брокера работает
  - [ ] Credentials не показываются в открытом виде
  - [ ] Status toggle (active/paused) работает inline
  - [ ] Delete показывает предупреждение о связанных flows
- **Оценка:** 8h
- **Story:** [STORY-026]

**[TASK-0105] Тесты broker CRUD**
- **Тип:** QA
- **Описание:** (1) Create broker → 201, credentials encrypted in DB. (2) GET → credentials masked. (3) Duplicate name → 422. (4) 201-й broker → 422 limit. (5) Delete active flow broker → 409. (6) Soft delete → GET doesn't return. (7) Update credentials → old overwritten, audit log created. (8) Other company → 404.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Шифрование проверяется: raw DB value ≠ plaintext
- **Оценка:** 4h
- **Story:** [STORY-026]

---

#### [STORY-027] Библиотека шаблонов интеграций (Integration Templates)

**Как** Network Admin, **я хочу** выбрать брокера из библиотеки готовых шаблонов (pre-built configs для популярных брокеров), **чтобы** подключить нового брокера за 5 минут без ручной настройки API-маппинга.

**Acceptance Criteria:**
- [ ] AC1: Библиотека шаблонов — системный ресурс, доступный всем компаниям. Минимум 50 шаблонов на старте, цель — 200+ к запуску
- [ ] AC2: Каждый шаблон содержит: `name` (e.g. "XM Trading"), `broker_type` (forex, crypto, binary, CFD), `api_url_template` (с плейсхолдерами: `https://api.broker.com/v1/leads`), `auth_type`, `request_format` (JSON schema маппинга полей), `response_parsing` (JSONPath для извлечения lead_id, status, error из ответа), `status_mapping` (маппинг статусов брокера → системные статусы), `version`, `last_updated`
- [ ] AC3: API `GET /api/v1/integration-templates` — список шаблонов с поиском по имени и фильтром по broker_type. `GET /api/v1/integration-templates/{id}` — детали шаблона
- [ ] AC4: При создании брокера с template_id — автозаполнение всех настроек из шаблона. Network Admin только вводит свои credentials
- [ ] AC5: Шаблоны обновляются централизованно (admin push). При обновлении шаблона — уведомление компаниям, использующим его. Обновление не применяется автоматически — требует ручного "Apply Update"
- [ ] AC6: Network Admin может создать custom template из существующего брокера ("Save as Template") — сохраняется per company

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026]

##### Tasks для STORY-027:

**[TASK-0106] Схема БД и seed-данные для templates**
- **Тип:** Backend
- **Описание:** Таблица `integration_templates`: `id` (UUID), `name` (varchar 100), `broker_type` (enum: forex, crypto, binary, cfd, other), `logo_url` (varchar 500, nullable), `api_url_template` (varchar 2000), `auth_type` (enum), `request_format` (jsonb — field mapping schema), `response_parsing` (jsonb — JSONPath rules), `status_mapping` (jsonb — broker_status → system_status), `default_headers` (jsonb, nullable), `version` (varchar 20, semver), `is_system` (bool — true для системных, false для company-created), `company_id` (FK, nullable — null для системных), `is_active` (bool, default true), `created_at`, `updated_at`. Seed script для первых 50 шаблонов (XM, IC Markets, Pepperstone, eToro и т.д.).
- **Критерии готовности (DoD):**
  - [ ] Миграция создана
  - [ ] Seed с 50+ шаблонами подготовлен
  - [ ] Системные шаблоны доступны всем, company-specific — только своей company
- **Оценка:** 8h
- **Story:** [STORY-027]

**[TASK-0107] API для integration templates**
- **Тип:** Backend
- **Описание:** (1) `GET /api/v1/integration-templates` — list с фильтрами (broker_type, search), пагинация. Возвращает системные + company-specific templates. (2) `GET /api/v1/integration-templates/{id}` — details. (3) `POST /api/v1/integration-templates` — create company-specific template (is_system=false, company_id from JWT). (4) `POST /api/v1/brokers/{id}/save-as-template` — создаёт template из конфигурации существующего брокера. (5) Template update notification: при обновлении системного template → создать запись в `template_update_notifications` для компаний, использующих его.
- **Критерии готовности (DoD):**
  - [ ] Listing показывает системные + свои шаблоны
  - [ ] Поиск по имени работает (ILIKE)
  - [ ] Save as Template создаёт корректную копию
  - [ ] Update notifications создаются
- **Оценка:** 8h
- **Story:** [STORY-027]

**[TASK-0108] Frontend — библиотека шаблонов**
- **Тип:** Frontend
- **Описание:** (1) При создании брокера Step 1: "Choose Template" — grid/list шаблонов с логотипами, поиском, фильтром по типу. Кнопка "Skip — Manual Setup". (2) При выборе шаблона → auto-fill всех полей кроме credentials. (3) Страница "Integration Templates" в настройках: список company-specific шаблонов, кнопка "Create from Scratch". (4) Badge "Update Available" на брокерах с обновлённым шаблоном → кнопка "Review & Apply Update".
- **Критерии готовности (DoD):**
  - [ ] Grid шаблонов с поиском загружается < 1 sec
  - [ ] Auto-fill при выборе шаблона работает
  - [ ] Update notification badge отображается
  - [ ] "Save as Template" из брокер-профиля работает
- **Оценка:** 8h
- **Story:** [STORY-027]

**[TASK-0109] Тесты integration templates**
- **Тип:** QA
- **Описание:** (1) List templates → includes system templates. (2) Create broker with template → auto-fill. (3) Company-specific template → visible only to that company. (4) Save as template → correct copy created. (5) Template update → notification created. (6) Search by name → correct results. (7) Filter by broker_type → correct.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Seed данные для тестов подготовлены
- **Оценка:** 4h
- **Story:** [STORY-027]

---

#### [STORY-028] Маппинг полей (Field Mapping Editor)

**Как** Network Admin, **я хочу** настраивать маппинг полей CRM → API брокера с трансформациями (переименование, форматирование, конкатенация), **чтобы** адаптировать данные лида под формат конкретного брокера.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера настраивается field mapping: `[{ "source": "first_name", "target": "fname", "transform": null }, { "source": "phone", "target": "telephone", "transform": "remove_plus" }, { "source": "first_name+last_name", "target": "full_name", "transform": "concat_space" }]`
- [ ] AC2: Поддерживаемые source fields: все поля лида (first_name, last_name, email, phone, country, ip, language, click_id, sub_id_1..5, custom_fields.*) + вычисляемые: `full_name`, `phone_local` (без кода страны), `country_name` (ISO → полное название)
- [ ] AC3: Поддерживаемые трансформации: `none`, `uppercase`, `lowercase`, `remove_plus` (удалить + из телефона), `concat_space` (конкатенация через пробел), `concat_dash`, `phone_local` (убрать код страны), `country_to_name`, `country_to_alpha3`, `date_format` (ISO → custom format), `static_value` (подставить фиксированное значение)
- [ ] AC4: UI: visual field mapping editor — два столбца (CRM Fields | Broker Fields), drag-and-drop или dropdown для маппинга. Preview: "How the data will look" с примером лида
- [ ] AC5: Маппинг валидируется: все обязательные поля брокера (из template) должны быть замаплены. Warning при незамапленных optional полях
- [ ] AC6: API `PUT /api/v1/brokers/{id}/field-mapping` — сохраняет маппинг. `GET` — возвращает текущий маппинг

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026], [STORY-027]

##### Tasks для STORY-028:

**[TASK-0110] Реализовать field mapping engine**
- **Тип:** Backend
- **Описание:** Модуль `FieldMapper`: (1) Загрузка mapping config для брокера. (2) Функция `MapLead(lead Lead, mapping []FieldMapping) map[string]interface{}`. Для каждого mapping entry: извлечь source value, применить transform, записать в target key. (3) Трансформации: switch по типу. (4) Вычисляемые поля: full_name = first_name + " " + last_name, phone_local через libphonenumber, country_to_name через ISO map. (5) Результат — JSON-объект для отправки брокеру. Benchmark: < 1ms per lead.
- **Критерии готовности (DoD):**
  - [ ] Все source fields поддерживаются
  - [ ] Все 10+ трансформаций реализованы
  - [ ] Вычисляемые поля работают
  - [ ] Benchmark < 1ms
  - [ ] Missing source field → null или пустая строка (configurable)
- **Оценка:** 8h
- **Story:** [STORY-028]

**[TASK-0111] API для field mapping**
- **Тип:** Backend
- **Описание:** API `GET/PUT /api/v1/brokers/{id}/field-mapping`. PUT принимает массив mapping entries с валидацией: source field exists, transform valid, no duplicate target fields. Хранение в `broker_field_mappings` JSONB поле в таблице brokers. При использовании template — наследуется mapping, можно override.
- **Критерии готовности (DoD):**
  - [ ] GET/PUT работают
  - [ ] Валидация mapping entries
  - [ ] Template mapping наследуется и можно override
- **Оценка:** 4h
- **Story:** [STORY-028]

**[TASK-0112] Frontend — visual field mapping editor**
- **Тип:** Frontend
- **Описание:** Компонент `FieldMappingEditor`: (1) Два столбца: слева "CRM Fields" (draggable items), справа "Broker Fields" (target inputs). (2) Drag CRM field → drop on broker field, или dropdown select. (3) Transform selector per mapping (dropdown). (4) "Add Custom Mapping" для полей не из шаблона. (5) Preview panel: показывает example lead → transformed data в JSON. (6) Валидация: required broker fields highlighted if unmapped. (7) "Reset to Template" кнопка.
- **Критерии готовности (DoD):**
  - [ ] Drag-and-drop маппинг работает
  - [ ] Transform dropdown работает
  - [ ] Preview с примером лида обновляется в реальном времени
  - [ ] Required fields validation работает
- **Оценка:** 16h
- **Story:** [STORY-028]

**[TASK-0113] Тесты field mapping**
- **Тип:** QA
- **Описание:** (1) Basic mapping: first_name → fname → correct. (2) Transform remove_plus: "+79001234567" → "79001234567". (3) Concat: first_name + last_name → "John Doe". (4) Phone_local: "+79001234567" → "9001234567". (5) Country_to_name: "DE" → "Germany". (6) Static value → always same value. (7) Missing source → null. (8) Duplicate target → error. (9) Template inheritance + override.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Трансформации протестированы с edge cases
- **Оценка:** 4h
- **Story:** [STORY-028]

---

#### [STORY-029] Тестирование подключения к брокеру (Connection Test)

**Как** Network Admin, **я хочу** отправить тестовый лид брокеру и увидеть полный response (status code, body, headers, latency), **чтобы** убедиться в корректности настроек перед запуском в production.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/brokers/{id}/test` отправляет тестовый лид брокеру. Тестовый лид содержит фейковые данные (configurable или default: John Test, test@example.com, +12025551234). Тестовый лид помечается маркером (если broker API поддерживает тестовый режим)
- [ ] AC2: Response содержит: `{ "success": bool, "status_code": 200, "response_headers": {...}, "response_body": "...", "latency_ms": 320, "mapped_request": {...показывает какой JSON был отправлен...}, "errors": [...если есть...] }`
- [ ] AC3: Тест не создаёт реальный лид в системе (не записывается в leads, не инкрементирует caps)
- [ ] AC4: При ошибке подключения (DNS, timeout 30 sec, TLS error) — детальное описание ошибки: `"error_type": "CONNECTION_TIMEOUT", "error_detail": "Timeout after 30s connecting to api.broker.com:443"`
- [ ] AC5: UI: кнопка "Test Connection" в профиле брокера → модальное окно с результатом (syntax-highlighted JSON для request/response), статус-badge (green checkmark / red X)
- [ ] AC6: История тестов: последние 10 тестов сохраняются для каждого брокера

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026], [STORY-028]

##### Tasks для STORY-029:

**[TASK-0114] Реализовать test connection engine**
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/brokers/{id}/test`. (1) Генерация фейкового лида (or accept custom in body). (2) Применение field mapping. (3) HTTP request к broker API с auth credentials (decrypt). (4) Capture: status_code, headers, body, latency. (5) Parse response через broker's response_parsing rules. (6) Сохранить результат в `broker_test_log`: broker_id, request_json, response_code, response_body, latency_ms, success, created_at. Limit 10 per broker. (7) Timeout 30 sec. (8) TLS verification (с опцией skip для тестовых серверов).
- **Критерии готовности (DoD):**
  - [ ] Тестовый запрос отправляется с корректными credentials
  - [ ] Response captured полностью
  - [ ] Ошибки подключения описаны детально
  - [ ] Тест не создаёт реальный лид
  - [ ] Log хранит последние 10 тестов
- **Оценка:** 4h
- **Story:** [STORY-029]

**[TASK-0115] Frontend — test connection UI**
- **Тип:** Frontend
- **Описание:** (1) Кнопка "Test Connection" в broker profile. (2) Модальное окно: tabs "Request" (syntax-highlighted JSON) / "Response" (status badge + headers + body JSON) / "History" (последние 10). (3) Custom test lead form (expandable: по умолчанию default, можно кастомизировать). (4) Loading spinner во время теста. (5) Цветовые индикаторы: green (2xx), yellow (3xx), red (4xx/5xx/error).
- **Критерии готовности (DoD):**
  - [ ] JSON syntax highlighting работает
  - [ ] Status badge корректен
  - [ ] History tab показывает последние 10 тестов
  - [ ] Custom test lead form работает
- **Оценка:** 4h
- **Story:** [STORY-029]

**[TASK-0116] Тесты connection test**
- **Тип:** QA
- **Описание:** (1) Mock broker API returns 200 → success=true. (2) Mock returns 400 → success=false, error captured. (3) Mock timeout → CONNECTION_TIMEOUT error. (4) Invalid URL → DNS_ERROR. (5) Test doesn't create real lead (check DB). (6) History stores max 10. (7) Field mapping applied correctly in request.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Mock broker API для всех сценариев
- **Оценка:** 4h
- **Story:** [STORY-029]

---

#### [STORY-030] Синхронизация статусов (Status Pull)

**Как** Network Admin, **я хочу** чтобы система периодически запрашивала обновлённые статусы лидов у брокера, **чтобы** CRM содержала актуальную информацию о конверсиях, FTD и других статусах без необходимости ручной проверки.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера настраивается status sync: endpoint URL (GET или POST), auth, маппинг ответа. Поддерживаемые стратегии: `pull_all` (запросить все лиды за период), `pull_by_id` (запрос статуса per lead), `none` (только postback, без pull)
- [ ] AC2: Pull scheduler: настраиваемый интервал per broker (15 мин — 24ч, default 1ч). Cron-задача вызывает broker API для получения обновлений
- [ ] AC3: При получении обновлённого статуса — обновление `leads.status`, создание записи в `lead_status_history`, отправка постбеков аффилейтам и webhook-событий
- [ ] AC4: Status mapping: статусы брокера (произвольные строки) маппятся на системные статусы CRM (new, contacted, callback, ftd, rejected, invalid, no_answer, not_interested). Маппинг настраивается per broker
- [ ] AC5: Conflict resolution: если status pull и postback обновляют один лид одновременно — более новый timestamp побеждает. При одинаковом timestamp — postback имеет приоритет (реальное время)
- [ ] AC6: Метрики: `status_sync_total{broker_id}`, `status_sync_errors_total{broker_id}`, `status_sync_duration_seconds{broker_id}`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026]

##### Tasks для STORY-030:

**[TASK-0117] Реализовать status pull engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `broker_sync_config`: broker_id, strategy (pull_all/pull_by_id/none), sync_url, sync_method (GET/POST), sync_auth (reuse broker auth or separate), interval_minutes, last_sync_at, response_parsing (jsonb — how to extract lead updates from response). (2) Scheduler: go-cron или Redis-based, запускает sync для каждого broker по интервалу. (3) Pull_all: GET broker_url?from={last_sync_at} → parse response → update leads. (4) Pull_by_id: for each lead sent to broker in last 24h → GET broker_url/leads/{broker_lead_id} → parse → update. (5) Status mapping: broker_status → system_status через config.
- **Критерии готовности (DoD):**
  - [ ] Pull_all strategy работает
  - [ ] Pull_by_id strategy работает
  - [ ] Status mapping применяется
  - [ ] Scheduler запускает sync по расписанию
  - [ ] Conflict resolution: newer timestamp wins
- **Оценка:** 16h
- **Story:** [STORY-030]

**[TASK-0118] Frontend — настройка status sync**
- **Тип:** Frontend
- **Описание:** В профиле брокера, tab "Status Sync": (1) Strategy selector (Pull All / Pull by ID / None — only postback). (2) Sync URL input + method. (3) Interval selector (15min, 30min, 1h, 2h, 6h, 12h, 24h). (4) Status mapping table: broker status (input) → system status (dropdown). (5) "Sync Now" кнопка для ручного запуска. (6) Sync history: last 20 sync runs with stats (updated, errors, duration).
- **Критерии готовности (DoD):**
  - [ ] Strategy selection работает
  - [ ] Status mapping table работает с add/remove
  - [ ] "Sync Now" запускает немедленную синхронизацию
  - [ ] Sync history отображается
- **Оценка:** 8h
- **Story:** [STORY-030]

**[TASK-0119] Тесты status sync**
- **Тип:** QA
- **Описание:** (1) Pull_all: mock broker returns 3 updates → 3 leads updated. (2) Pull_by_id: 5 leads → 5 requests → updates. (3) Status mapping: "deposited" → "ftd". (4) Unknown status → warning log, no update. (5) Conflict: pull says "contacted" at T1, postback says "ftd" at T2 > T1 → ftd wins. (6) Sync error (broker down) → logged, retry next interval. (7) Interval: scheduled every 1h → runs at correct times.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Mock broker для status API
- **Оценка:** 4h
- **Story:** [STORY-030]

---

#### [STORY-031] Postback-приёмник от брокера (Broker Postback Receiver)

**Как** Network Admin, **я хочу** чтобы система принимала постбеки от брокеров (webhook от брокера о статусе лида), **чтобы** обновлять статусы лидов в реальном времени, не дожидаясь периодической синхронизации.

**Acceptance Criteria:**
- [ ] AC1: Уникальный postback URL per broker: `POST /api/v1/postback/{broker_postback_token}`. Token — crypto-random 32 hex, не содержит broker_id напрямую (безопасность)
- [ ] AC2: Поддерживаемые форматы входящих данных: JSON body, form-encoded body, URL query parameters. Формат настраивается per broker
- [ ] AC3: Маппинг полей входящего постбека: настраивается per broker — где в запросе брокера находится lead_id (или broker_lead_id), status, payout, currency. JSONPath для JSON, field name для form/query
- [ ] AC4: При получении постбека: (1) найти лид по lead_id или broker_lead_id, (2) применить status mapping, (3) обновить lead.status, (4) записать в lead_status_history, (5) отправить постбек аффилейту, (6) отправить webhook
- [ ] AC5: Безопасность: IP-whitelist per broker (optional), signature verification (HMAC, optional), rate limit 100 req/sec per token
- [ ] AC6: Всё логируется: `broker_postback_log` с raw request, parsed data, result
- [ ] AC7: Latency обработки постбека < 200ms (p95)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026]

##### Tasks для STORY-031:

**[TASK-0120] Реализовать postback receiver endpoint**
- **Тип:** Backend
- **Описание:** (1) Endpoint `POST /api/v1/postback/{token}` — без стандартной auth (token-based). (2) Token lookup в Redis cache (token → broker_id, company_id, config), fallback to DB. (3) Parse request based on broker's postback_format (json/form/query). (4) Extract fields via configured paths (JSONPath для JSON, field names для form). (5) Find lead: by lead_id or broker_lead_id. (6) Update pipeline: status mapping → update lead → status_history → trigger affiliate postback → trigger webhook. (7) IP whitelist check (if configured). (8) Log raw request + result.
- **Критерии готовности (DoD):**
  - [ ] Все 3 формата (JSON, form, query) парсятся корректно
  - [ ] Lead found and updated
  - [ ] Cascade: affiliate postback + webhook triggered
  - [ ] IP whitelist работает
  - [ ] Latency < 200ms p95
- **Оценка:** 8h
- **Story:** [STORY-031]

**[TASK-0121] Frontend — postback настройка**
- **Тип:** Frontend
- **Описание:** В профиле брокера, tab "Postback Settings": (1) Postback URL (read-only, copy button): отображается уникальный URL. Кнопка "Regenerate Token" с предупреждением. (2) Format selector (JSON/Form/Query). (3) Field mapping: lead_id_field, status_field, payout_field, currency_field — input fields. (4) IP Whitelist: textarea для IP addresses/CIDRs. (5) Postback log: таблица последних 100 постбеков с raw data viewer.
- **Критерии готовности (DoD):**
  - [ ] Postback URL отображается и копируется
  - [ ] Regenerate token работает с предупреждением
  - [ ] Field mapping настраивается
  - [ ] Postback log отображается
- **Оценка:** 4h
- **Story:** [STORY-031]

**[TASK-0122] Тесты postback receiver**
- **Тип:** QA
- **Описание:** (1) JSON postback → lead updated. (2) Form-encoded postback → lead updated. (3) Query params postback → lead updated. (4) Invalid token → 404. (5) IP not in whitelist → 403. (6) Unknown lead_id → log + 200 (no error to broker). (7) Status mapping applied. (8) Affiliate postback triggered after broker postback. (9) Rate limit: 101 req/sec → 429 on 101st.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] All 3 formats tested
- **Оценка:** 4h
- **Story:** [STORY-031]

---

#### [STORY-032] Парсинг ответов брокера (Response Parsing)

**Как** Network Admin, **я хочу** настроить правила парсинга ответов broker API (разные брокеры возвращают разные форматы), **чтобы** система корректно извлекала broker_lead_id, статус и ошибки из ответа.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера настраиваются parsing rules: `success_indicator` (JSONPath, проверка успешности — e.g. `$.status == "ok"` или `HTTP 200`), `lead_id_path` (JSONPath для извлечения broker_lead_id — e.g. `$.data.id`), `error_message_path` (e.g. `$.error.message`), `status_path` (e.g. `$.data.status`)
- [ ] AC2: Поддерживаемые форматы ответов: JSON (основной), XML (legacy-брокеры), plain text (простые API). Формат определяется Content-Type или настройкой per broker
- [ ] AC3: При парсинге: success=true → сохранить broker_lead_id, lead.status=sent. Success=false → lead.status=rejected, сохранить error message
- [ ] AC4: Fallback parsing: если JSONPath не найден — log warning, not error. Lead.status=sent (optimistic)
- [ ] AC5: UI: "Response Parser" editor с возможностью тестировать парсинг на реальном ответе (вставить response JSON → показать извлечённые значения)
- [ ] AC6: Parsing выполняется за < 5ms

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026]

##### Tasks для STORY-032:

**[TASK-0123] Реализовать response parser engine**
- **Тип:** Backend
- **Описание:** Модуль `ResponseParser`: (1) JSONPath evaluator (библиотека gjson или jsonpath). (2) XML parser (encoding/xml + xpath). (3) Plain text parser (regex-based). (4) Функция `ParseBrokerResponse(body []byte, contentType string, rules ParsingRules) ParsedResponse`. ParsedResponse: `{success bool, broker_lead_id string, status string, error_message string, raw map[string]interface{}}`. (5) При ошибке парсинга — log warning, return optimistic result. Benchmark < 5ms.
- **Критерии готовности (DoD):**
  - [ ] JSON parsing через JSONPath работает
  - [ ] XML parsing работает для основных структур
  - [ ] Plain text regex parsing работает
  - [ ] Fallback при ошибке парсинга
  - [ ] Benchmark < 5ms
- **Оценка:** 8h
- **Story:** [STORY-032]

**[TASK-0124] Frontend — response parser editor**
- **Тип:** Frontend
- **Описание:** В настройках брокера, tab "Response Parsing": (1) Format selector (JSON/XML/Text). (2) JSONPath inputs: success indicator, lead_id path, error path, status path — с подсказками формата. (3) "Test Parser" area: textarea для вставки sample response → кнопка "Test" → результат (extracted values highlighted). (4) Pre-fill из template при использовании шаблона.
- **Критерии готовности (DoD):**
  - [ ] JSONPath inputs с подсказками
  - [ ] Test Parser работает для JSON и XML
  - [ ] Pre-fill из template
- **Оценка:** 4h
- **Story:** [STORY-032]

**[TASK-0125] Тесты response parsing**
- **Тип:** QA
- **Описание:** (1) JSON success → broker_lead_id extracted. (2) JSON error → error_message extracted. (3) XML response → parsed correctly. (4) Plain text "OK:12345" → parsed with regex. (5) Missing JSONPath → warning, optimistic result. (6) Invalid JSON → error, status=error. (7) Empty body → error. (8) Various real broker responses (5+ formats).
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Real broker response samples tested
- **Оценка:** 4h
- **Story:** [STORY-032]

---

#### [STORY-033] Обработка ошибок и retry-логика для Broker API

**Как** Network Admin, **я хочу** чтобы система автоматически повторяла отправку лида при временных ошибках broker API (timeout, 5xx) с настраиваемой retry-политикой, **чтобы** не терять лиды из-за временных сбоев.

**Acceptance Criteria:**
- [ ] AC1: Retry policy per broker: `max_retries` (0-5, default 3), `retry_delays` (массив задержек: [1s, 5s, 30s] default), `retry_on` (список кодов: [500, 502, 503, 504, timeout, connection_error] default)
- [ ] AC2: При ошибке из retry_on списка — retry с экспоненциальным backoff + jitter. НЕ retry для: 400, 401, 403, 404 (клиентские ошибки)
- [ ] AC3: Каждая попытка логируется в `routing_attempts` с attempt_number
- [ ] AC4: При исчерпании retries — fallback to next broker (если есть), иначе lead.status=error
- [ ] AC5: Circuit breaker: если broker отвечает ошибками > 50% за последние 5 минут (минимум 10 запросов) — broker автоматически помечается `circuit_open`, лиды не отправляются. Auto-close через 60 sec (half-open: 1 тестовый запрос, если ok → close)
- [ ] AC6: Метрики: `broker_retries_total{broker_id}`, `broker_circuit_state{broker_id}` (closed/open/half_open)
- [ ] AC7: UI: индикатор circuit breaker состояния на broker node

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026]

##### Tasks для STORY-033:

**[TASK-0126] Реализовать retry engine с circuit breaker**
- **Тип:** Backend
- **Описание:** (1) Retry: wrapper вокруг broker HTTP client. Config per broker: max_retries, delays, retry_on codes. Exponential backoff: delay * 2^attempt + jitter (random 0-500ms). (2) Circuit Breaker: per broker, in Redis: `circuit:{broker_id}` → `{state, failure_count, success_count, last_failure, opened_at}`. State machine: closed → open (failure_rate > 50%, min 10 requests in 5 min) → half_open (after 60 sec, send 1 test) → closed (if success) / open (if fail). (3) Log каждый attempt в routing_attempts.
- **Критерии готовности (DoD):**
  - [ ] Retry с exponential backoff работает
  - [ ] Jitter предотвращает thundering herd
  - [ ] Не retry на 4xx
  - [ ] Circuit breaker state machine корректна
  - [ ] Half-open → 1 test request → close/reopen
- **Оценка:** 8h
- **Story:** [STORY-033]

**[TASK-0127] Frontend — retry config и circuit breaker indicator**
- **Тип:** Frontend
- **Описание:** (1) В настройках брокера: "Retry Policy" section — max retries input, delay inputs (array), retry_on codes checkboxes. (2) На BrokerNode в canvas: circuit breaker badge — green dot (closed), yellow (half-open), red (open) с tooltip "Circuit open since 14:32, auto-retry at 14:33". (3) Кнопка "Reset Circuit" для manual force-close.
- **Критерии готовности (DoD):**
  - [ ] Retry config сохраняется
  - [ ] Circuit breaker badge обновляется real-time (via WebSocket)
  - [ ] Reset Circuit работает
- **Оценка:** 4h
- **Story:** [STORY-033]

**[TASK-0128] Тесты retry и circuit breaker**
- **Тип:** QA
- **Описание:** (1) 503 → retry 3 times → success on 3rd. (2) 503 × 4 (max_retries=3) → fallback. (3) 400 → no retry. (4) Timeout → retry. (5) Circuit: 10 requests, 6 fail → circuit open. (6) Circuit open → requests skipped. (7) 60 sec → half-open → 1 request → success → closed. (8) Half-open → fail → reopen. (9) Backoff delays correct. (10) Jitter present.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Mock broker API с контролируемыми ошибками
- **Оценка:** 8h
- **Story:** [STORY-033]

---

#### [STORY-034] Мониторинг здоровья брокеров (Broker Health Monitoring)

**Как** Network Admin, **я хочу** видеть статус здоровья всех подключённых брокеров в реальном времени и получать алерты при деградации, **чтобы** оперативно реагировать на проблемы с API брокеров.

**Acceptance Criteria:**
- [ ] AC1: Health dashboard для брокеров: таблица со столбцами — name, status (active/paused/circuit_open), uptime % (last 24h), avg response time (ms), success rate (%), leads today, last error (timestamp + message)
- [ ] AC2: Health check: периодический ping broker API (configurable endpoint, e.g., /health or custom). Интервал: 60 sec per broker. При 3 consecutive failures → алерт
- [ ] AC3: Алерты: broker offline > 5 min, success rate < 90% за 10 мин, avg response time > 5 sec за 10 мин. Каналы: UI notification, Telegram, email
- [ ] AC4: Uptime calculation: per broker, rolling 24h window, calculated from routing_attempts success/fail
- [ ] AC5: API `GET /api/v1/brokers/health` — all brokers health summary
- [ ] AC6: Historical health data: 30 дней retention, графики uptime и response time

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-03]
**Зависит от:** [STORY-026], [STORY-033]

##### Tasks для STORY-034:

**[TASK-0129] Реализовать health check worker и метрики**
- **Тип:** Backend
- **Описание:** (1) Health check worker: горутина, каждые 60 sec для каждого active broker → HTTP GET/HEAD к health endpoint (настраивается per broker, default = broker API URL). (2) Запись результатов в `broker_health_checks`: broker_id, status_code, latency_ms, success, checked_at. (3) Alerting: 3 consecutive failures → create alert. (4) API `GET /api/v1/brokers/health`: aggregate per broker — uptime %, avg latency, success rate, circuit state. (5) Prometheus: `broker_health_check_success`, `broker_health_check_latency_seconds`.
- **Критерии готовности (DoD):**
  - [ ] Health check runs every 60 sec per broker
  - [ ] 3 consecutive failures → alert
  - [ ] API returns correct aggregated data
  - [ ] Prometheus metrics exported
- **Оценка:** 8h
- **Story:** [STORY-034]

**[TASK-0130] Frontend — broker health dashboard**
- **Тип:** Frontend
- **Описание:** (1) Page "Broker Health": sortable table — name, status badge (green/yellow/red), uptime % (24h bar chart sparkline), avg response (ms), success rate (%), leads today, last error. (2) Click on broker → slide-out detail: health check history chart (last 24h), response time chart, recent errors list. (3) Alert configuration per broker: thresholds form. (4) "Check Now" button.
- **Критерии готовности (DoD):**
  - [ ] Table with all metrics renders < 1 sec
  - [ ] Sparkline charts for uptime
  - [ ] Detail slide-out with historical data
  - [ ] Alert configuration works
- **Оценка:** 8h
- **Story:** [STORY-034]

**[TASK-0131] Тесты broker health**
- **Тип:** QA
- **Описание:** (1) Health check success → status ok. (2) 3 failures → alert triggered. (3) Recovery → alert cleared. (4) Uptime calc: 23 of 24 hours ok → 95.8%. (5) Avg latency calculation correct. (6) API returns all brokers health.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-034]

---

#### [STORY-035] Версионирование и обновление шаблонов

**Как** Network Admin, **я хочу** получать уведомления об обновлениях шаблонов интеграций и безопасно обновлять конфигурацию брокера, **чтобы** поддерживать интеграции в актуальном состоянии при изменении API брокеров.

**Acceptance Criteria:**
- [ ] AC1: Каждый шаблон имеет версию (semver). При обновлении шаблона — создаётся новая версия с changelog
- [ ] AC2: При наличии обновления для шаблона, используемого брокером — UI-нотификация: badge "Update Available" на странице брокеров и в профиле конкретного брокера
- [ ] AC3: "Review Update" показывает diff: что изменилось (поля, маппинг, URL, parsing rules). Network Admin решает — применить или пропустить
- [ ] AC4: "Apply Update" обновляет конфигурацию брокера. Перед этим — автоматический test connection с новыми настройками. При ошибке теста — warning, можно применить принудительно
- [ ] AC5: "Skip Update" — помечает версию как просмотренную, badge исчезает. При следующем обновлении — badge появляется снова
- [ ] AC6: Rollback: в течение 24ч после обновления — кнопка "Rollback to Previous". Хранится 1 предыдущая версия конфигурации

**Story Points:** 5
**Приоритет:** Could
**Epic:** [EPIC-03]
**Зависит от:** [STORY-027]

##### Tasks для STORY-035:

**[TASK-0132] Реализовать template versioning и update flow**
- **Тип:** Backend
- **Описание:** (1) Таблица `template_versions`: template_id, version, changelog, config_snapshot (jsonb — полная конфигурация), created_at. (2) При обновлении шаблона → create new version, create notifications для компаний. (3) API `GET /api/v1/brokers/{id}/template-updates` → available update с diff. (4) `POST /api/v1/brokers/{id}/apply-update` → backup current config в `broker_config_history`, apply new config, run test. (5) `POST /api/v1/brokers/{id}/rollback` → restore from backup (24h limit). (6) `POST /api/v1/brokers/{id}/skip-update` → mark as seen.
- **Критерии готовности (DoD):**
  - [ ] Versioning с changelog работает
  - [ ] Diff генерируется корректно
  - [ ] Apply + auto test работает
  - [ ] Rollback в течение 24h работает
  - [ ] Skip update убирает badge
- **Оценка:** 8h
- **Story:** [STORY-035]

**[TASK-0133] Frontend — update review и apply flow**
- **Тип:** Frontend
- **Описание:** (1) Badge "Update Available" на broker list и profile. (2) "Review Update" modal: changelog, diff view (old → new for changed fields, highlighted). (3) Кнопки: "Apply Update" (runs test first, shows result), "Skip", "Cancel". (4) After apply: "Rollback" button visible for 24h in broker profile. (5) Notification in bell icon для новых обновлений.
- **Критерии готовности (DoD):**
  - [ ] Diff view показывает изменения наглядно
  - [ ] Apply runs test и показывает результат
  - [ ] Rollback доступен 24h
- **Оценка:** 8h
- **Story:** [STORY-035]

**[TASK-0134] Тесты template versioning**
- **Тип:** QA
- **Описание:** (1) Template updated → notification created. (2) Review → diff correct. (3) Apply → config updated, test run. (4) Rollback → previous config restored. (5) Rollback after 24h → error. (6) Skip → badge removed. (7) New update after skip → badge returns.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-035]

---

### Сводка по EPIC-03

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 10 |
| **Story Points** | 68 (итого) |
| **Must** | 7 stories (50 SP) |
| **Should** | 1 story (5 SP) |
| **Could** | 2 stories (10 SP) |
| **Всего Tasks** | 33 |
| **Backend tasks** | 15 |
| **Frontend tasks** | 10 |
| **QA tasks** | 8 |
| **Оценка (часы)** | ~216h |

---

## [EPIC-04] Affiliate Management

**Цель:** Обеспечить полноценное управление аффилейтами — профили, API-ключи (UI-часть), настройка трафик-источников, постбеков, группировка, лимиты, статусы и суб-аффилейты. Affiliate Manager должен иметь все инструменты для ежедневного управления партнёрской сетью.

**Метрика успеха:**
- Создание нового аффилейта (full setup) < 3 мин (UX benchmark)
- Affiliate dashboard показывает ключевые метрики за < 2 sec
- Sub-affiliate поддержка: до 100 суб-аккаунтов per affiliate
- Все действия по управлению аффилейтами залогированы в audit trail

**Приоритет:** P0 (MVP)
**Зависит от:** [EPIC-06]
**Оценка:** L (1-3 мес)

---

### Stories:

---

#### [STORY-036] CRUD профиля аффилейта

**Как** Affiliate Manager, **я хочу** создавать, редактировать и управлять профилями аффилейтов (имя, компания, контакты, платёжные реквизиты), **чтобы** вести структурированную базу всех партнёров.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/affiliates` создаёт аффилейта: `name` (varchar 100, required), `company_name` (varchar 200, optional), `email` (varchar 255, required, unique per company), `phone` (varchar 20, optional), `messenger` (jsonb — `{"telegram": "@handle", "skype": "live:id"}`), `payment_details` (jsonb, encrypted — `{"method": "wire", "bank": "...", "iban": "..."}` или `{"method": "crypto", "wallet": "0x...", "network": "ETH"}`), `notes` (text, optional), `status` (enum: active, paused, suspended, blocked, default active). HTTP 201
- [ ] AC2: `payment_details` шифруются AES-256-GCM (аналогично broker credentials). В GET-ответах маскируются: `{"method": "wire", "bank": "***", "iban": "DE89***4567"}`
- [ ] AC3: API `GET /api/v1/affiliates` — список с пагинацией (cursor, per_page 20-100), фильтры: status, search (name/email), tags. `GET /api/v1/affiliates/{id}` — полный профиль
- [ ] AC4: API `PUT /api/v1/affiliates/{id}` — обновление. `DELETE /api/v1/affiliates/{id}` — soft delete (нельзя удалить если есть active API keys → 409)
- [ ] AC5: Максимум 5,000 аффилейтов per company
- [ ] AC6: Audit log для всех операций

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-04]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-036:

**[TASK-0135] Схема БД для аффилейтов**
- **Тип:** Backend
- **Описание:** Таблица `affiliates`: `id` (UUID, PK), `company_id` (FK), `name` (varchar 100), `company_name` (varchar 200, nullable), `email` (varchar 255), `phone` (varchar 20, nullable), `messenger` (jsonb, nullable), `payment_details_encrypted` (bytea), `payment_details_nonce` (bytea), `status` (enum: active, paused, suspended, blocked), `notes` (text, nullable), `is_deleted` (bool, default false), `created_by` (FK users), `created_at`, `updated_at`. Уникальный индекс `(company_id, email)` WHERE is_deleted=false. Индекс `(company_id, status)`.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана, уникальность email per company работает
  - [ ] Шифрование payment_details работает
  - [ ] Soft delete с partial unique index
- **Оценка:** 2h
- **Story:** [STORY-036]

**[TASK-0136] CRUD API для аффилейтов**
- **Тип:** Backend
- **Описание:** Go-хэндлеры POST/GET/PUT/DELETE `/api/v1/affiliates`. Encrypt payment_details на write, mask на read. Проверка лимита 5000. Проверка active API keys при delete. Search: ILIKE по name + email. Audit log.
- **Критерии готовности (DoD):**
  - [ ] Все 4 метода работают
  - [ ] Payment details encrypted/masked
  - [ ] Search и фильтры работают
  - [ ] Audit log записывается
- **Оценка:** 8h
- **Story:** [STORY-036]

**[TASK-0137] Frontend — управление аффилейтами**
- **Тип:** Frontend
- **Описание:** (1) Страница "Affiliates": таблица (name, company, email, status badge, tags, leads today, conversion rate). Search bar + status filter. (2) "Add Affiliate" → modal/page: form с полями из AC1. Payment details — secure inputs. (3) Edit modal: все поля, payment details show "••••" + "Update" button. (4) Quick actions: Pause/Activate toggle, view API keys, view stats. (5) Bulk actions: select multiple → change status.
- **Критерии готовности (DoD):**
  - [ ] Таблица с пагинацией, поиском и фильтрами
  - [ ] Add/Edit формы работают
  - [ ] Payment details не показываются в открытом виде
  - [ ] Bulk status change работает
- **Оценка:** 8h
- **Story:** [STORY-036]

**[TASK-0138] Тесты affiliate CRUD**
- **Тип:** QA
- **Описание:** (1) Create → 201. (2) Duplicate email → 422. (3) Limit 5000 → 422. (4) Delete with active keys → 409. (5) Soft delete → not in GET list. (6) Payment encrypted in DB. (7) Payment masked in GET. (8) Search by name → correct. (9) Filter by status → correct. (10) Other company → 404.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-036]

---

#### [STORY-037] UI управления API-ключами аффилейта

**Как** Affiliate Manager, **я хочу** управлять API-ключами аффилейтов через удобный UI (генерация, ротация, отзыв), **чтобы** контролировать доступ аффилейтов к системе и обеспечивать безопасность.

**Acceptance Criteria:**
- [ ] AC1: На странице профиля аффилейта — секция "API Keys" со списком всех ключей: label, prefix + last 4, status (active/disabled), created, last used
- [ ] AC2: "Generate Key" → modal: label (optional), type (live/test), confirm → показать полный ключ ОДИН раз с copy button и предупреждением
- [ ] AC3: "Rotate Key" — создаёт новый ключ и деактивирует старый. Grace period: старый ключ работает ещё 24ч (настраиваемо) для бесшовной миграции
- [ ] AC4: "Revoke Key" — немедленная деактивация с подтверждением. После revoke — ключ перестаёт работать мгновенно (cache invalidation < 5 sec)
- [ ] AC5: Rate limit per key отображается и настраивается (slider 10-1000 req/sec)
- [ ] AC6: Usage stats per key: requests today, last 7 days chart (sparkline), errors count

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036], [STORY-005 из EPIC-01]

##### Tasks для STORY-037:

**[TASK-0139] Реализовать key rotation с grace period**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/affiliates/{id}/api-keys/rotate`: (1) Create new key. (2) Mark old key as `rotating` (not disabled). (3) Schedule deactivation: Redis key `key_rotation:{old_key_hash}` TTL = grace_period (default 24h). (4) Cron или TTL callback: deactivate old key when grace period expires. (5) During grace period: both keys work. (6) API `POST /api/v1/affiliates/{id}/api-keys/{key_id}/revoke` — immediate deactivation + Redis cache invalidation.
- **Критерии готовности (DoD):**
  - [ ] Rotation создаёт новый ключ, старый работает grace period
  - [ ] Revoke — мгновенная деактивация (< 5 sec)
  - [ ] Cache invalidation при revoke
- **Оценка:** 4h
- **Story:** [STORY-037]

**[TASK-0140] Frontend — API keys management UI**
- **Тип:** Frontend
- **Описание:** (1) Секция "API Keys" в профиле аффилейта. (2) Таблица: label, key (prefix+last4), status (active/rotating/disabled badges), rate limit, created, last used, requests today. (3) Actions: Generate, Rotate (с grace period info), Revoke (red, confirmation). (4) Generate modal: label + type → show full key once. (5) Rate limit slider per key. (6) Usage sparkline chart per key (last 7 days).
- **Критерии готовности (DoD):**
  - [ ] Все действия (generate, rotate, revoke) работают через UI
  - [ ] Full key показывается только при generate
  - [ ] Rate limit slider сохраняет значение
  - [ ] Usage stats отображаются
- **Оценка:** 8h
- **Story:** [STORY-037]

**[TASK-0141] Тесты API key management**
- **Тип:** QA
- **Описание:** (1) Generate → key shown once. (2) Rotate → new key works, old works during grace. (3) Grace period expired → old key disabled. (4) Revoke → immediate disable (test within 5 sec). (5) Max 5 active keys. (6) Rate limit change → applied.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-037]

---

#### [STORY-038] Конфигурация трафик-источников per affiliate

**Как** Affiliate Manager, **я хочу** настраивать для каждого аффилейта разрешённые GEO и вертикали, **чтобы** ограничить трафик от конкретного аффилейта только согласованными параметрами и предотвратить нежелательный трафик.

**Acceptance Criteria:**
- [ ] AC1: Для каждого аффилейта настраивается: `allowed_geos` (ISO 3166-1 alpha-2 массив, пустой = все), `blocked_geos` (массив, пустой = нет блокировок), `allowed_verticals` (enum[]: forex, crypto, binary, cfd, пустой = все)
- [ ] AC2: При приёме лида: если страна лида не в allowed_geos (или в blocked_geos) → reject с кодом `GEO_NOT_ALLOWED`. Если вертикаль не в allowed_verticals → reject `VERTICAL_NOT_ALLOWED`
- [ ] AC3: API `PUT /api/v1/affiliates/{id}/traffic-config` — обновляет настройки. `GET` — текущие настройки
- [ ] AC4: UI: в профиле аффилейта tab "Traffic Sources" — multiselect для GEOs (с регионами) и checkboxes для verticals
- [ ] AC5: При попытке аффилейта отправить лид из запрещённой GEO — в ответе API понятная ошибка для разработчика аффилейта
- [ ] AC6: Метрика: `leads_geo_blocked_total{affiliate_id, country}`, `leads_vertical_blocked_total{affiliate_id, vertical}`

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036]

##### Tasks для STORY-038:

**[TASK-0142] Реализовать traffic config и validation**
- **Тип:** Backend
- **Описание:** (1) Добавить в таблицу affiliates (или отдельная таблица `affiliate_traffic_config`): allowed_geos (text[]), blocked_geos (text[]), allowed_verticals (text[]). (2) API GET/PUT `/api/v1/affiliates/{id}/traffic-config`. (3) В Lead Intake pipeline: после auth → load affiliate traffic config → check GEO and vertical → reject if not allowed. (4) In-memory cache с TTL 5 мин. (5) Prometheus метрики.
- **Критерии готовности (DoD):**
  - [ ] GEO-фильтрация для аффилейта работает (allowed + blocked)
  - [ ] Vertical фильтрация работает
  - [ ] Ошибки понятны для разработчика аффилейта
  - [ ] Cache с invalidation
- **Оценка:** 4h
- **Story:** [STORY-038]

**[TASK-0143] Frontend — traffic sources tab**
- **Тип:** Frontend
- **Описание:** Tab "Traffic Sources" в профиле аффилейта: (1) GEO section: Radio (All / Allowed / Blocked) + multiselect с регионами и странами (chips + flags). (2) Verticals: checkboxes (Forex, Crypto, Binary, CFD) — all checked = all allowed. (3) Save button. (4) Stats: "Blocked leads last 30 days" counter for this affiliate.
- **Критерии готовности (DoD):**
  - [ ] GEO multiselect с регионами работает
  - [ ] Verticals checkboxes работают
  - [ ] Save + load работает
- **Оценка:** 4h
- **Story:** [STORY-038]

**[TASK-0144] Тесты traffic config**
- **Тип:** QA
- **Описание:** (1) Allowed_geos = [DE, AT] → lead DE → ok, lead US → reject GEO_NOT_ALLOWED. (2) Blocked_geos = [RU] → lead RU → reject, lead DE → ok. (3) Empty (all) → any geo ok. (4) Allowed_verticals = [forex] → crypto lead → reject. (5) Cache invalidation: update config → next lead uses new config. (6) Concurrent leads → no race condition.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-038]

---

#### [STORY-039] Настройка постбеков per affiliate (UI)

**Как** Affiliate Manager, **я хочу** настраивать postback URL'ы для каждого аффилейта через удобный UI с подсказками макросов и тестированием, **чтобы** аффилейты получали уведомления о статусах лидов в свои трекеры.

**Acceptance Criteria:**
- [ ] AC1: В профиле аффилейта tab "Postbacks" — управление postback URL'ами (до 3 per affiliate). Всё из STORY-006 (EPIC-01), но с удобным UI: (1) macro helper — кнопки-шорткаты для вставки макросов `{lead_id}`, `{status}`, `{click_id}` и др.
- [ ] AC2: "Test Postback" кнопка: выбрать реальный лид из списка → отправить постбек → показать результат (status code, response body)
- [ ] AC3: Event filter: для каждого postback URL — checkboxes какие события отправлять (sent, callback, ftd, rejected, duplicate)
- [ ] AC4: Global toggle: "Pause all postbacks" — временно отключить все постбеки для этого аффилейта
- [ ] AC5: Postback log: последние 200 постбеков для этого аффилейта с фильтрами
- [ ] AC6: Validation: URL формат, macros syntax check, max URL length 2000 chars

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036], [STORY-006 из EPIC-01]

##### Tasks для STORY-039:

**[TASK-0145] Frontend — postback management UI для аффилейта**
- **Тип:** Frontend
- **Описание:** Tab "Postbacks" в профиле аффилейта: (1) Список postback URLs (cards, max 3). Каждый: URL (editable), method toggle (GET/POST), event checkboxes, active/inactive toggle. (2) Macro helper: sidebar/toolbar с кнопками доступных макросов — клик → вставка в URL input at cursor position. (3) "Test" button per URL → modal: select real lead → send postback → show response. (4) "Pause All" toggle at top. (5) "Add Postback URL" button.
- **Критерии готовности (DoD):**
  - [ ] Macro helper вставляет макросы корректно
  - [ ] Test postback с реальным лидом работает
  - [ ] Event checkboxes фильтруют события
  - [ ] Pause All отключает все постбеки
- **Оценка:** 8h
- **Story:** [STORY-039]

**[TASK-0146] Frontend — postback log для аффилейта**
- **Тип:** Frontend
- **Описание:** Вложенная страница "Postback Log" в профиле аффилейта: таблица последних 200 постбеков. Columns: lead_id (link), event, URL (truncated), method, status (sent/failed badge), response_code, latency_ms, attempt, timestamp. Фильтры: event type, delivery status, date range. Expandable row: full URL, response body.
- **Критерии готовности (DoD):**
  - [ ] Таблица с 200 записями рендерится < 1 sec
  - [ ] Фильтры работают
  - [ ] Expandable row показывает детали
- **Оценка:** 4h
- **Story:** [STORY-039]

**[TASK-0147] Тесты postback UI**
- **Тип:** QA
- **Описание:** E2E: (1) Add postback URL → saved. (2) Insert macro via helper → macro in URL. (3) Test postback → result shown. (4) Pause all → postbacks not sent. (5) Event filter: uncheck "ftd" → ftd postback not sent. (6) Max 3 URLs → 4th blocked.
- **Критерии готовности (DoD):**
  - [ ] 6 E2E-тестов проходят
- **Оценка:** 4h
- **Story:** [STORY-039]

---

#### [STORY-040] Группировка и тегирование аффилейтов

**Как** Affiliate Manager, **я хочу** группировать аффилейтов по тегам и группам, **чтобы** фильтровать, анализировать и применять массовые действия к категориям аффилейтов (VIP, новые, проблемные).

**Acceptance Criteria:**
- [ ] AC1: Tags — свободные метки (строки 1-50 chars, alphanumeric + space + dash). Аффилейту можно присвоить до 20 тегов. Теги создаются on-the-fly (autocomplete из существующих или новый)
- [ ] AC2: Groups — иерархические группы (дерево, max 3 уровня): e.g. "VIP" → "VIP/Tier1", "VIP/Tier2". Аффилейт может быть в нескольких группах (max 5)
- [ ] AC3: Фильтрация в списке аффилейтов по тегам и группам (AND/OR комбинации)
- [ ] AC4: Массовые действия по группе/тегу: "Pause all affiliates with tag 'fraud_risk'" или "Set daily cap 100 for group 'VIP/Tier2'"
- [ ] AC5: API `POST /api/v1/affiliates/{id}/tags` — добавить теги. `DELETE` — убрать. `GET /api/v1/affiliate-groups` — CRUD для групп. `POST /api/v1/affiliates/{id}/groups` — добавить в группу
- [ ] AC6: Tag/group statistics: count of affiliates per tag, per group

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036]

##### Tasks для STORY-040:

**[TASK-0148] Схема БД и API для tags/groups**
- **Тип:** Backend
- **Описание:** (1) Таблица `affiliate_tags`: affiliate_id (FK), tag (varchar 50), created_at. Unique: (affiliate_id, tag). (2) Таблица `affiliate_groups`: id (UUID), company_id (FK), name (varchar 100), parent_id (FK self, nullable), level (smallint 1-3), created_at. (3) Таблица `affiliate_group_members`: affiliate_id (FK), group_id (FK), created_at. Unique (affiliate_id, group_id). (4) CRUD API для tags, groups, memberships. (5) Bulk actions API: `POST /api/v1/affiliates/bulk-action` — `{"filter": {"tags": ["vip"]}, "action": "set_status", "params": {"status": "paused"}}`.
- **Критерии готовности (DoD):**
  - [ ] Tags CRUD работает
  - [ ] Groups hierarchy (3 levels) работает
  - [ ] Bulk actions по filter работают
  - [ ] Statistics per tag/group
- **Оценка:** 8h
- **Story:** [STORY-040]

**[TASK-0149] Frontend — tags и groups UI**
- **Тип:** Frontend
- **Описание:** (1) Tags: на карточке аффилейта — chips с тегами, клик "+" → autocomplete input. В списке аффилейтов — фильтр по тегам (multiselect). (2) Groups: sidebar tree-view (collapsible), drag affiliate → group. Group management page: create/edit/delete groups. (3) Bulk actions toolbar: при выборе нескольких аффилейтов или фильтре по group/tag → dropdown "Actions": Set Status, Set Daily Cap, Add Tag, Remove Tag.
- **Критерии готовности (DoD):**
  - [ ] Tags autocomplete работает
  - [ ] Group tree-view с drag-and-drop
  - [ ] Filter by tag/group работает
  - [ ] Bulk actions выполняются
- **Оценка:** 8h
- **Story:** [STORY-040]

**[TASK-0150] Тесты tags и groups**
- **Тип:** QA
- **Описание:** (1) Add tag → appears on affiliate. (2) Max 20 tags → 21st rejected. (3) Create group hierarchy 3 levels → ok. (4) 4th level → rejected. (5) Filter by tag → correct results. (6) Bulk action by group → all members affected. (7) Remove from group → no longer in filter.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-040]

---

#### [STORY-041] Лимиты и капы трафика per affiliate

**Как** Affiliate Manager, **я хочу** устанавливать дневные и месячные лимиты на количество лидов от каждого аффилейта, **чтобы** контролировать объёмы трафика и предотвращать перерасход бюджета.

**Acceptance Criteria:**
- [ ] AC1: Для каждого аффилейта настраиваются: `daily_lead_limit` (0 = unlimited), `monthly_lead_limit` (0 = unlimited). Считаются только accepted лиды (не rejected/invalid)
- [ ] AC2: При достижении лимита: API возвращает HTTP 429 `{ "error": "AFFILIATE_DAILY_LIMIT_REACHED", "limit": 500, "used": 500, "resets_at": "2026-03-05T00:00:00Z" }`
- [ ] AC3: Счётчики в Redis (аналогично broker caps): atomic INCR, reset по расписанию (daily 00:00 UTC, monthly 1-го числа)
- [ ] AC4: При достижении 90% лимита → уведомление Affiliate Manager (UI + optional Telegram)
- [ ] AC5: UI: в профиле аффилейта — limit inputs + progress bars (usage / limit)
- [ ] AC6: API `GET /api/v1/affiliates/{id}/usage` — текущее usage: `{ "daily": { "limit": 500, "used": 423, "remaining": 77 }, "monthly": { ... } }`
- [ ] AC7: Manual reset кнопка (с audit log)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036]

##### Tasks для STORY-041:

**[TASK-0151] Реализовать affiliate traffic limits**
- **Тип:** Backend
- **Описание:** (1) Добавить в affiliates: daily_lead_limit (int, default 0), monthly_lead_limit (int, default 0). (2) Redis counters: `aff_limit:{affiliate_id}:daily:{YYYY-MM-DD}` (INCR, TTL 48h), `aff_limit:{affiliate_id}:monthly:{YYYY-MM}` (INCR, TTL 32d). (3) В Lead Intake pipeline (после auth, перед validation): check limits → reject if exceeded. (4) API GET /usage. (5) Notification: при INCR → if used >= limit*0.9 → publish alert event. (6) Manual reset: API `POST /api/v1/affiliates/{id}/reset-limits` → DEL Redis keys.
- **Критерии готовности (DoD):**
  - [ ] Limits enforced in Lead Intake pipeline
  - [ ] Redis counters atomic
  - [ ] 90% alert works
  - [ ] Manual reset works
  - [ ] Usage API returns correct data
- **Оценка:** 4h
- **Story:** [STORY-041]

**[TASK-0152] Frontend — affiliate limits UI**
- **Тип:** Frontend
- **Описание:** В профиле аффилейта: (1) "Limits" section: daily limit input + monthly limit input (0=unlimited). (2) Progress bars: daily (423/500, green/yellow/red), monthly (2,150/10,000). (3) "Reset Daily" и "Reset Monthly" кнопки с confirm. (4) Stats: "Limits reached last 30 days" counter.
- **Критерии готовности (DoD):**
  - [ ] Limit inputs save correctly
  - [ ] Progress bars update in real-time (polling 30 sec)
  - [ ] Reset works with confirmation
- **Оценка:** 4h
- **Story:** [STORY-041]

**[TASK-0153] Тесты affiliate limits**
- **Тип:** QA
- **Описание:** (1) Daily limit 10 → 10 leads ok → 11th rejected 429. (2) Monthly limit → correct tracking. (3) Unlimited (0) → no limit. (4) Reset → counter = 0, next lead ok. (5) 90% alert triggered. (6) Concurrent leads at limit → only limit passed through.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Concurrency tested
- **Оценка:** 4h
- **Story:** [STORY-041]

---

#### [STORY-042] Управление статусом аффилейта

**Как** Affiliate Manager, **я хочу** переводить аффилейтов между статусами (active → paused → suspended → blocked) с каскадными эффектами (блокировка API-ключей, остановка постбеков), **чтобы** оперативно управлять проблемными партнёрами.

**Acceptance Criteria:**
- [ ] AC1: Статусы и переходы: active ↔ paused ↔ suspended → blocked. Blocked → unblock only by Network Admin. Разблокировка → paused (не active, чтобы требовалось явное включение)
- [ ] AC2: Каскадные эффекты при смене статуса:
  - `paused`: API-ключи работают, но лиды НЕ роутятся (ставятся в очередь). Постбеки продолжают приходить
  - `suspended`: API-ключи отвечают 403 `AFFILIATE_SUSPENDED`. Лиды не принимаются. Постбеки приостановлены
  - `blocked`: API-ключи отвечают 403 `AFFILIATE_BLOCKED`. Лиды не принимаются. Постбеки остановлены. Все данные сохраняются для audit
- [ ] AC3: При смене статуса — обязательный комментарий (reason, varchar 500). Записывается в `affiliate_status_history`
- [ ] AC4: UI: status badge с dropdown → select new status → reason input → confirm
- [ ] AC5: Email notification аффилейту при suspend/block (if email configured)
- [ ] AC6: Массовая смена статуса: через bulk actions (STORY-040)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036]

##### Tasks для STORY-042:

**[TASK-0154] Реализовать status transitions и cascading effects**
- **Тип:** Backend
- **Описание:** (1) State machine: valid transitions map. (2) API `PUT /api/v1/affiliates/{id}/status` — body: `{status, reason}`. (3) Cascade effects: paused → set flag in Redis `aff_paused:{affiliate_id}` (routing checks this). Suspended → update API key cache to return 403. Blocked → same + stop postback worker for affiliate. (4) Status history table: `affiliate_status_history`: affiliate_id, old_status, new_status, reason, changed_by (FK users), created_at. (5) Email notification for suspend/block.
- **Критерии готовности (DoD):**
  - [ ] Valid transitions enforced (invalid → 422)
  - [ ] Cascade effects work for each status
  - [ ] Status history recorded with reason
  - [ ] Email sent on suspend/block
  - [ ] Cache updated immediately (< 5 sec)
- **Оценка:** 8h
- **Story:** [STORY-042]

**[TASK-0155] Frontend — status management**
- **Тип:** Frontend
- **Описание:** (1) Status badge on affiliate card: colored (green/yellow/orange/red). (2) Click badge → dropdown with available transitions. (3) Select new status → modal: reason textarea (required) + confirm/cancel. (4) Status history: timeline in affiliate profile — each change with reason, actor, timestamp.
- **Критерии готовности (DoD):**
  - [ ] Only valid transitions shown in dropdown
  - [ ] Reason required before confirm
  - [ ] Status history timeline displays correctly
- **Оценка:** 4h
- **Story:** [STORY-042]

**[TASK-0156] Тесты status management**
- **Тип:** QA
- **Описание:** (1) Active → paused → ok, leads queued. (2) Paused → suspended → ok, API returns 403. (3) Suspended → blocked → ok. (4) Blocked → active → invalid transition. (5) Blocked → paused (unblock by admin) → ok. (6) No reason → 422. (7) Status history recorded. (8) Email sent on suspend.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-042]

---

#### [STORY-043] Affiliate performance dashboard (мини-статистика)

**Как** Affiliate Manager, **я хочу** видеть мини-дашборд с ключевыми метриками каждого аффилейта (лиды, конверсии, качество), **чтобы** быстро оценивать эффективность партнёра без перехода в полную аналитику.

**Acceptance Criteria:**
- [ ] AC1: В профиле аффилейта tab "Performance": KPI-карточки — Leads Today, Leads This Month, Conversion Rate (FTD/Total), Avg Fraud Score, Rejection Rate, Active Since (дата)
- [ ] AC2: Графики: leads per day (last 30 days bar chart), conversion rate trend (last 30 days line), fraud score distribution (histogram)
- [ ] AC3: Comparison: "vs Average" — показывает метрики аффилейта в сравнении с средним по всем аффилейтам компании (e.g., "Conversion: 12% vs avg 8%")
- [ ] AC4: Quick filters: date range picker, GEO filter, vertical filter
- [ ] AC5: Data refreshes every 60 sec (auto-refresh toggle)
- [ ] AC6: Export: "Download Report" — PDF/CSV с метриками за выбранный период

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036]

##### Tasks для STORY-043:

**[TASK-0157] API для affiliate performance metrics**
- **Тип:** Backend
- **Описание:** API `GET /api/v1/affiliates/{id}/performance?period=30d&geo=DE&vertical=forex`. Агрегация из leads таблицы: total leads, FTD count, rejection count, avg fraud score. Per-day breakdown для charts. Company average для comparison. Response < 500ms (с индексами). Export API: `GET /api/v1/affiliates/{id}/performance/export?format=csv&period=30d`.
- **Критерии готовности (DoD):**
  - [ ] Все KPI рассчитываются корректно
  - [ ] Per-day data для графиков
  - [ ] Company average для comparison
  - [ ] Response < 500ms при 100K leads
  - [ ] Export CSV работает
- **Оценка:** 8h
- **Story:** [STORY-043]

**[TASK-0158] Frontend — performance dashboard**
- **Тип:** Frontend
- **Описание:** Tab "Performance" в профиле аффилейта: (1) KPI cards row: 6 карточек с числами и trend arrows (↑↓). (2) Charts: Recharts/Chart.js — bar chart (leads/day), line chart (conversion trend), histogram (fraud score). (3) "vs Average" labels on KPI cards (green if better, red if worse). (4) Filters: date range picker, GEO multiselect, vertical checkboxes. (5) Auto-refresh toggle (60 sec). (6) "Download Report" button → CSV/PDF.
- **Критерии готовности (DoD):**
  - [ ] KPI cards render with correct data
  - [ ] Charts render < 1 sec
  - [ ] Comparison vs average works
  - [ ] Filters affect all data
  - [ ] Export works
- **Оценка:** 16h
- **Story:** [STORY-043]

**[TASK-0159] Тесты performance dashboard**
- **Тип:** QA
- **Описание:** (1) KPI values correct (manual calculation check). (2) Date filter changes data. (3) GEO filter correct. (4) Export CSV contains correct data. (5) Comparison: affiliate with 15% conversion vs company avg 10% → shows "+5%". (6) Empty data (new affiliate) → shows zeros, no errors.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-043]

---

#### [STORY-044] Суб-аффилейты (Sub-accounts)

**Как** Affiliate Manager, **я хочу** чтобы аффилейт мог иметь суб-аккаунты (суб-аффилейтов), **чтобы** крупные аффилейтские сети могли отслеживать трафик по отдельным media buyers внутри одного аффилейт-аккаунта.

**Acceptance Criteria:**
- [ ] AC1: Аффилейт может иметь до 100 суб-аффилейтов. Суб-аффилейт имеет: name, email (optional), собственный API-ключ (или shared с parent), sub_affiliate_id (string, unique per affiliate)
- [ ] AC2: Лиды от суб-аффилейта помечаются `sub_affiliate_id` для отдельной статистики. Маркер передаётся через поле `sub_id` при отправке лида или через отдельный API-ключ
- [ ] AC3: Parent affiliate видит статистику по всем своим суб-аффилейтам: leads per sub, conversion per sub, fraud score per sub
- [ ] AC4: Affiliate Manager видит иерархию: affiliate → sub-affiliates с агрегированными метриками
- [ ] AC5: Лимиты могут быть установлены per sub-affiliate (дополнительно к лимитам parent). Sub-affiliate лимит не может превышать parent лимит
- [ ] AC6: API `POST /api/v1/affiliates/{id}/sub-affiliates` — CRUD для суб-аффилейтов
- [ ] AC7: Sub-affiliate наследует traffic config (allowed GEOs/verticals) от parent, можно override (более строгий, но не менее)

**Story Points:** 8
**Приоритет:** Could
**Epic:** [EPIC-04]
**Зависит от:** [STORY-036], [STORY-037], [STORY-041]

##### Tasks для STORY-044:

**[TASK-0160] Схема БД и API для sub-affiliates**
- **Тип:** Backend
- **Описание:** Таблица `sub_affiliates`: `id` (UUID), `affiliate_id` (FK), `company_id` (FK), `sub_affiliate_id` (varchar 100 — custom identifier), `name` (varchar 100), `email` (varchar 255, nullable), `api_key_id` (FK, nullable — own key or null=use parent), `daily_lead_limit` (int, default 0), `monthly_lead_limit` (int, default 0), `traffic_config_override` (jsonb, nullable), `status` (enum: active, paused, disabled), `created_at`, `updated_at`. Unique: (affiliate_id, sub_affiliate_id). API CRUD. В Lead Intake: resolve sub_affiliate from sub_id field or API key.
- **Критерии готовности (DoD):**
  - [ ] CRUD API работает
  - [ ] Max 100 per affiliate
  - [ ] Sub limits don't exceed parent
  - [ ] Traffic config inheritance + override
- **Оценка:** 8h
- **Story:** [STORY-044]

**[TASK-0161] Frontend — sub-affiliate management**
- **Тип:** Frontend
- **Описание:** (1) В профиле аффилейта tab "Sub-Affiliates": таблица (sub_id, name, leads today, conversion, status). (2) Add/Edit modal: name, sub_id, email, own API key toggle, limits, traffic config overrides. (3) Expandable row: mini-stats per sub-affiliate. (4) In affiliate list: show count of sub-affiliates, expandable tree view.
- **Критерии готовности (DoD):**
  - [ ] Sub-affiliate table in affiliate profile
  - [ ] Add/Edit works
  - [ ] Stats per sub-affiliate display
- **Оценка:** 8h
- **Story:** [STORY-044]

**[TASK-0162] Тесты sub-affiliates**
- **Тип:** QA
- **Описание:** (1) Create sub → 201. (2) Max 100 → 101st rejected. (3) Lead with sub_id → attributed to sub. (4) Sub limit < parent limit → ok. (5) Sub limit > parent limit → error. (6) Sub inherits parent GEO config. (7) Sub override (stricter) → works. (8) Sub override (looser) → rejected.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-044]

---

### Сводка по EPIC-04

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 9 |
| **Story Points** | 51 (итого) |
| **Must** | 6 stories (30 SP) |
| **Should** | 2 stories (13 SP) |
| **Could** | 1 story (8 SP) |
| **Всего Tasks** | 28 |
| **Backend tasks** | 11 |
| **Frontend tasks** | 11 |
| **QA tasks** | 6 |
| **Оценка (часы)** | ~164h |

---

## [EPIC-05] Lead Management UI

**Цель:** Предоставить пользователям мощный интерфейс для работы с лидами — поиск, фильтрация, детальный просмотр, массовые операции, экспорт и real-time обновления. Это основной рабочий инструмент для Affiliate Manager и Network Admin на ежедневной основе.

**Метрика успеха:**
- Таблица лидов (10,000 строк) рендерится < 1.5 sec
- Фильтрация по любой комбинации фильтров < 500ms
- Full-text search < 300ms
- Real-time обновления (новые лиды) без перезагрузки страницы (WebSocket, задержка < 2 sec)
- Экспорт 100,000 лидов в CSV < 30 sec

**Приоритет:** P0 (MVP)
**Зависит от:** [EPIC-01], [EPIC-06]
**Оценка:** L (1-3 мес)

---

### Stories:

---

#### [STORY-045] Таблица лидов с расширенными фильтрами

**Как** Affiliate Manager, **я хочу** видеть таблицу всех лидов с фильтрами по статусу, стране, аффилейту, брокеру, дате и fraud score, **чтобы** быстро находить нужные лиды и оценивать текущее состояние трафика.

**Acceptance Criteria:**
- [ ] AC1: Таблица отображает: Lead ID (short UUID), Status (colored badge), Country (flag + code), Affiliate (name), Broker (name), Email (masked для non-owner roles: u***@g***.com), Phone (masked: +7***4567), Fraud Score (0-100 colored bar), Created At (relative time + full on hover), Source (API/CSV/Manual)
- [ ] AC2: Фильтры (sidebar или top bar, persistent per session): Status (multiselect), Country (multiselect with search), Affiliate (multiselect with search), Broker (multiselect), Date Range (preset: today, yesterday, last 7d, last 30d, custom), Fraud Score (range slider 0-100), Source, Is Duplicate (toggle), Is Test (toggle)
- [ ] AC3: Фильтры комбинируются через AND. Активные фильтры отображаются как chips с кнопкой "×". Кнопка "Clear All Filters"
- [ ] AC4: Пагинация: server-side, cursor-based, per_page 25/50/100. Infinite scroll option
- [ ] AC5: Сортировка по столбцам: created_at (default DESC), fraud_score, country, status. Клик на header → sort
- [ ] AC6: API `GET /api/v1/leads` с query params для всех фильтров. Response < 500ms при 1M+ лидов

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [EPIC-01], [EPIC-06]

##### Tasks для STORY-045:

**[TASK-0163] Оптимизировать API для списка лидов с фильтрами**
- **Тип:** Backend
- **Описание:** Расширить `GET /api/v1/leads` (из STORY-008): добавить фильтры — affiliate_id, broker_id, fraud_score_min/max, source, is_duplicate, is_test. Добавить sorting: `sort_by` (created_at, fraud_score, country, status), `sort_order` (asc/desc). Composite index: `(company_id, status, country, created_at)` для покрытия частых фильтров. Query builder: dynamic WHERE clauses. EXPLAIN ANALYZE для проверки Index Scan при 1M rows.
- **Критерии готовности (DoD):**
  - [ ] Все фильтры работают и комбинируются
  - [ ] Sorting по 4 полям работает
  - [ ] Response < 500ms при 1M leads (benchmark)
  - [ ] Индексы покрывают top-5 filter combinations
- **Оценка:** 8h
- **Story:** [STORY-045]

**[TASK-0164] Frontend — таблица лидов**
- **Тип:** Frontend
- **Описание:** Компонент `LeadsTable` (TanStack Table / AG Grid): (1) Virtual scrolling для производительности. (2) Столбцы из AC1: colored status badges, country flags (flag-icons), masked emails/phones, fraud score mini-bar. (3) Filter panel (sidebar collapsible): multiselect components для каждого фильтра, date range picker, range slider для fraud score. (4) Active filters as chips. (5) Pagination footer: page info, per_page selector. (6) Sortable column headers.
- **Критерии готовности (DoD):**
  - [ ] Таблица с 1000 строк рендерится < 1 sec (virtual scroll)
  - [ ] Все фильтры работают
  - [ ] Filter chips с remove
  - [ ] Sorting по click на header
  - [ ] Country flags отображаются
- **Оценка:** 16h
- **Story:** [STORY-045]

**[TASK-0165] Тесты таблицы лидов**
- **Тип:** QA
- **Описание:** (1) Filter by status=ftd → only FTD leads. (2) Filter by country=DE + status=new → intersection. (3) Date range yesterday → correct. (4) Fraud score 80-100 → only high fraud. (5) Clear all → full list. (6) Sort by fraud_score DESC → descending. (7) Pagination: 100 leads, per_page 25 → 4 pages via cursor. (8) Masked email for viewer role.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-045]

---

#### [STORY-046] Детальный просмотр лида (Lead Detail View)

**Как** Affiliate Manager, **я хочу** открыть полную карточку лида со всеми данными, историей событий и постбеков, **чтобы** расследовать проблемы и видеть полный lifecycle лида.

**Acceptance Criteria:**
- [ ] AC1: Lead detail page (`/leads/{id}`) содержит секции: Profile (все поля лида), Status (текущий + history timeline), Routing (через какой flow, какому брокеру отправлен, все попытки), Fraud (fraud score breakdown по проверкам), Postbacks (все отправленные/полученные), Raw Data (original data before normalization), Notes (комментарии команды)
- [ ] AC2: Status timeline: вертикальная линия с событиями — created → validated → routed → sent → callback → ftd. Каждое событие: timestamp, actor (system/user), details
- [ ] AC3: Routing attempts section: таблица из routing_attempts — attempt#, broker, result, latency, response
- [ ] AC4: Fraud section: карточка каждой проверки (IP, Email, Phone) с результатом (pass/fail/warning) и деталями
- [ ] AC5: Side panel mode: lead detail открывается как slide-out panel (не full page), чтобы не терять контекст таблицы
- [ ] AC6: Breadcrumb navigation: Leads → Lead #abc123
- [ ] AC7: Загрузка карточки < 1 sec (все данные одним API-запросом или параллельными)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045]

##### Tasks для STORY-046:

**[TASK-0166] API для lead detail (aggregated endpoint)**
- **Тип:** Backend
- **Описание:** API `GET /api/v1/leads/{id}/detail` — returns aggregated data: (1) Lead profile (all fields). (2) Status history (from lead_status_history). (3) Routing attempts (from routing_attempts). (4) Fraud checks (from fraud_check_results). (5) Postback log (from postback_log + broker_postback_log). (6) Notes (from lead_notes). (7) Raw data (from leads.raw_data). All in one response. Parallel DB queries for performance < 300ms.
- **Критерии готовности (DoD):**
  - [ ] Single API call returns all data
  - [ ] Response < 300ms
  - [ ] Access control: only own company data
  - [ ] Masked PII for viewer roles
- **Оценка:** 8h
- **Story:** [STORY-046]

**[TASK-0167] Frontend — lead detail panel**
- **Тип:** Frontend
- **Описание:** (1) SlideOut panel (70% width) opened from lead table row click. (2) Tabs: Overview (profile + quick status), Timeline (vertical event timeline), Routing (attempts table), Fraud (check cards), Postbacks (log table), Raw Data (JSON viewer), Notes (list + add form). (3) Timeline component: vertical line, event dots (colored by type), expandable details. (4) Fraud cards: icon per check type, pass/fail badge, details expandable. (5) Close panel → return to table (state preserved).
- **Критерии готовности (DoD):**
  - [ ] SlideOut panel opens/closes smoothly
  - [ ] All 7 tabs render correctly
  - [ ] Timeline is chronologically correct
  - [ ] Table state preserved when panel closes
- **Оценка:** 16h
- **Story:** [STORY-046]

**[TASK-0168] Тесты lead detail**
- **Тип:** QA
- **Описание:** (1) Open lead detail → all sections load. (2) Timeline shows all events in order. (3) Routing attempts match routing_attempts table. (4) Fraud checks display with correct pass/fail. (5) Postback log shows all postbacks. (6) Raw data shows original values. (7) Add note → appears in notes. (8) Viewer role → PII masked.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-046]

---

#### [STORY-047] Quick actions: переотправка, смена статуса, заметки

**Как** Affiliate Manager, **я хочу** быстро переотправить лид другому брокеру, изменить статус лида или добавить заметку прямо из таблицы или карточки, **чтобы** оперативно решать проблемы без многошаговых действий.

**Acceptance Criteria:**
- [ ] AC1: "Resend to Broker" action: dropdown с доступными брокерами → отправить лид новому брокеру (через Broker Integration Layer). Создаёт новую запись в routing_attempts. Лид может быть отправлен повторно максимум 5 раз
- [ ] AC2: "Change Status" action: dropdown с доступными статусами → select → optional reason → confirm. Создаёт запись в status_history. Триггерит постбек аффилейту
- [ ] AC3: "Add Note" action: inline textarea → save. Заметки видны в lead detail. Каждая заметка: author, timestamp, text (max 2000 chars). Максимум 50 заметок per lead
- [ ] AC4: Actions доступны: (1) из контекстного меню строки таблицы (right-click или "..." button), (2) из lead detail panel
- [ ] AC5: Все actions требуют подтверждения (confirm modal) кроме "Add Note"
- [ ] AC6: Permissions: Resend — Manager+, Change Status — Manager+, Add Note — Viewer+

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [STORY-046]

##### Tasks для STORY-047:

**[TASK-0169] API для lead quick actions**
- **Тип:** Backend
- **Описание:** (1) `POST /api/v1/leads/{id}/resend` — body: `{broker_id}`. Validate: lead exists, broker exists and active, resend count < 5. Send via Broker Integration Layer. Create routing_attempt. (2) `PUT /api/v1/leads/{id}/status` — body: `{status, reason}`. Validate transition. Create status_history. Trigger affiliate postback. (3) `POST /api/v1/leads/{id}/notes` — body: `{text}`. (4) `GET /api/v1/leads/{id}/notes` — list. Permission checks per action.
- **Критерии готовности (DoD):**
  - [ ] Resend works, routing_attempt created
  - [ ] Status change works, postback triggered
  - [ ] Notes CRUD works
  - [ ] Max 5 resends enforced
  - [ ] Permissions checked
- **Оценка:** 8h
- **Story:** [STORY-047]

**[TASK-0170] Frontend — quick actions UI**
- **Тип:** Frontend
- **Описание:** (1) Row action menu ("..." button): Resend, Change Status, Add Note, Copy Lead ID. (2) Resend modal: broker dropdown (searchable, shows status + cap), confirm button. (3) Change Status modal: status dropdown, reason textarea, confirm. (4) Add Note: inline form in lead detail panel or quick modal. (5) Confirmation dialogs for destructive actions. (6) Toast notifications: "Lead resent to Broker X" / "Status changed to FTD".
- **Критерии готовности (DoD):**
  - [ ] All 3 actions work from table row menu
  - [ ] All 3 actions work from lead detail panel
  - [ ] Confirmation modals for Resend and Status Change
  - [ ] Toast notifications on success
- **Оценка:** 8h
- **Story:** [STORY-047]

**[TASK-0171] Тесты quick actions**
- **Тип:** QA
- **Описание:** (1) Resend → new routing_attempt. (2) Resend 6th time → error. (3) Change status → history recorded, postback sent. (4) Invalid status transition → error. (5) Add note → visible in detail. (6) Max 50 notes → 51st error. (7) Viewer role → cannot resend.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-047]

---

#### [STORY-048] Массовые операции с лидами (Bulk Operations)

**Как** Affiliate Manager, **я хочу** выбирать несколько лидов и применять к ним массовые действия (переотправка, смена статуса, экспорт), **чтобы** эффективно обрабатывать большие объёмы лидов.

**Acceptance Criteria:**
- [ ] AC1: Checkbox в каждой строке таблицы. "Select All" checkbox в header (выбирает текущую страницу). "Select All Matching Filters" — выбирает все лиды по текущему фильтру (показывает count)
- [ ] AC2: Bulk actions toolbar (appears on selection): "Resend Selected" (dropdown с брокером), "Change Status" (dropdown), "Export Selected", "Add Tag/Note"
- [ ] AC3: "Resend Selected": отправить все выбранные лиды одному брокеру. Асинхронная обработка: progress bar, результат (X sent, Y failed). Максимум 1000 лидов за операцию
- [ ] AC4: "Change Status": применить статус ко всем выбранным. Async, progress bar, results
- [ ] AC5: "Export Selected": CSV/Excel с выбранными лидами (или всеми matching filters). Генерация в background, download link по готовности
- [ ] AC6: Bulk operations logged in audit trail: who, what, how many, when
- [ ] AC7: API `POST /api/v1/leads/bulk-action` — body: `{ "lead_ids": [...] OR "filter": {...}, "action": "resend|change_status|export", "params": {...} }`. Returns job_id, status checked via `GET /api/v1/jobs/{id}`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045], [STORY-047]

##### Tasks для STORY-048:

**[TASK-0172] Реализовать bulk operations engine**
- **Тип:** Backend
- **Описание:** (1) API `POST /api/v1/leads/bulk-action`: accept lead_ids (max 1000) or filter criteria. Create background job in `jobs` table: id, type, params, status (pending/processing/completed/failed), progress (int 0-100), result_summary (jsonb), created_by, created_at. (2) Worker goroutine: process leads in batches of 50. For resend: call broker API per lead. For status change: batch UPDATE. For export: generate CSV to S3. (3) Progress: update job.progress every batch. (4) `GET /api/v1/jobs/{id}` — returns current status + progress + result.
- **Критерии готовности (DoD):**
  - [ ] All 3 bulk actions work
  - [ ] Progress tracking via jobs API
  - [ ] Max 1000 leads per operation enforced
  - [ ] Filter-based selection works (not just IDs)
  - [ ] Audit trail for bulk operations
- **Оценка:** 16h
- **Story:** [STORY-048]

**[TASK-0173] Frontend — bulk operations UI**
- **Тип:** Frontend
- **Описание:** (1) Checkboxes on table rows. Select all (page) / Select all matching (count). (2) Floating action bar on selection: "X leads selected" + action buttons. (3) Resend modal: broker select, confirm, progress bar + results. (4) Status change modal: status select, confirm, progress. (5) Export: confirm → "Generating..." → download link. (6) Job progress: poll `GET /jobs/{id}` every 2 sec, show progress bar.
- **Критерии готовности (DoD):**
  - [ ] Selection with select all works
  - [ ] All 3 bulk actions UI works
  - [ ] Progress bar updates in real-time
  - [ ] Results summary shown on completion
- **Оценка:** 8h
- **Story:** [STORY-048]

**[TASK-0174] Тесты bulk operations**
- **Тип:** QA
- **Описание:** (1) Select 10, resend → 10 routing_attempts. (2) Select all matching (filter status=new) → correct count. (3) Bulk change status → all updated. (4) Bulk export → CSV with correct data. (5) Max 1001 → error. (6) Progress updates correctly. (7) Partial failure (5 ok, 3 failed) → result summary correct. (8) Audit log created.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 8h
- **Story:** [STORY-048]

---

#### [STORY-049] Экспорт лидов (CSV/Excel)

**Как** Affiliate Manager, **я хочу** экспортировать лиды в CSV или Excel с выбранными колонками и применёнными фильтрами, **чтобы** анализировать данные в внешних инструментах (Excel, Google Sheets) или отправлять отчёты клиентам.

**Acceptance Criteria:**
- [ ] AC1: "Export" кнопка в таблице лидов. Экспортируются лиды по текущим фильтрам (не только текущая страница)
- [ ] AC2: Export wizard: Step 1 — format (CSV, Excel XLSX). Step 2 — columns selector (checkboxes, default all visible, можно добавить hidden). Step 3 — confirm (estimated rows count)
- [ ] AC3: Генерация в background: для < 10,000 rows — inline download (< 5 sec). Для > 10,000 — background job + email/notification с download link (24h expiry)
- [ ] AC4: CSV: UTF-8 BOM (for Excel compatibility), configurable delimiter (comma/semicolon). Excel: formatting (headers bold, dates formatted, status colored)
- [ ] AC5: PII handling: export respects user role — Viewer gets masked data, Manager gets full data. Export audit: кто, что, когда, сколько строк
- [ ] AC6: Max export: 500,000 rows. При превышении → suggest adding more filters
- [ ] AC7: API `POST /api/v1/leads/export` — body: `{format, columns, filters}`. Returns download URL (signed, 24h expiry)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045]

##### Tasks для STORY-049:

**[TASK-0175] Реализовать export engine**
- **Тип:** Backend
- **Описание:** (1) API `POST /api/v1/leads/export`: validate filters, estimate row count. If < 10K → sync generate, stream response. If > 10K → create background job, generate file to S3/MinIO. (2) CSV writer: encoding/csv with UTF-8 BOM, delimiter config. (3) Excel writer: excelize library, headers bold, date formatting, status color coding. (4) Column selection: dynamic based on request. (5) PII masking based on user role. (6) Signed URL for download (24h expiry). (7) Audit log: export event with row count.
- **Критерии готовности (DoD):**
  - [ ] CSV export with BOM works
  - [ ] Excel with formatting works
  - [ ] 100K rows < 30 sec
  - [ ] PII masking per role
  - [ ] Download link expires after 24h
  - [ ] Max 500K enforced
- **Оценка:** 8h
- **Story:** [STORY-049]

**[TASK-0176] Frontend — export wizard**
- **Тип:** Frontend
- **Описание:** (1) "Export" button in leads table toolbar. (2) Wizard modal: Step 1 format radio (CSV/XLSX). Step 2 columns checkboxes (grouped: Profile, Status, Routing, Fraud). Step 3 confirm: "Export ~15,423 leads as CSV?" (3) For small exports: direct download on confirm. (4) For large: "Export started! We'll notify you when ready." → notification bell + email → download link.
- **Критерии готовности (DoD):**
  - [ ] Wizard 3-step flow works
  - [ ] Column selection works
  - [ ] Small export → instant download
  - [ ] Large export → notification + download link
- **Оценка:** 4h
- **Story:** [STORY-049]

**[TASK-0177] Тесты export**
- **Тип:** QA
- **Описание:** (1) CSV export 100 leads → valid CSV with BOM. (2) Excel export → valid XLSX with formatting. (3) Column selection: only selected columns in output. (4) Filter applied: export with status=ftd → only FTD in file. (5) PII masked for viewer role. (6) 500,001 rows → error message. (7) Download link expires after 24h. (8) Delimiter semicolon → correct CSV.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-049]

---

#### [STORY-050] Аудит-трейл лида (Lead Timeline / Audit Log)

**Как** Network Admin, **я хочу** видеть полный аудит-трейл каждого лида (все действия с отметкой времени и актором), **чтобы** расследовать инциденты и доказывать корректность обработки при спорах с аффилейтами и брокерами.

**Acceptance Criteria:**
- [ ] AC1: Каждое действие с лидом записывается в `lead_audit_log`: lead_id, action (created, validated, normalized, dedup_checked, fraud_checked, routed, sent_to_broker, broker_responded, status_changed, postback_sent, postback_received, resent, exported, note_added, viewed), actor_type (system/user/api), actor_id, details (jsonb — specifics of action), ip_address (for user actions), created_at
- [ ] AC2: Timeline view в lead detail: хронологический список всех событий, иконки по типу действия, expandable details
- [ ] AC3: Фильтр по типу действия и временному диапазону в timeline
- [ ] AC4: Export audit log per lead: CSV/PDF для disputes
- [ ] AC5: Audit log immutable: no UPDATE, no DELETE (append-only table)
- [ ] AC6: Retention: 1 year. Архивация в cold storage after 90 days (partitioning)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [STORY-046]

##### Tasks для STORY-050:

**[TASK-0178] Реализовать audit log system**
- **Тип:** Backend
- **Описание:** (1) Таблица `lead_audit_log`: id (bigserial), lead_id (FK), company_id (FK), action (varchar 50), actor_type (enum: system, user, api, cron), actor_id (varchar 100 — user_id or api_key_id or "system"), details (jsonb), ip_address (inet, nullable), created_at (timestamptz). (2) No UPDATE/DELETE permissions on this table (REVOKE). (3) Partitioning by created_at (monthly). (4) Archive partition older than 90 days to separate tablespace. (5) Audit writer: async via channel/goroutine (don't block main flow). (6) API `GET /api/v1/leads/{id}/audit-log?action=status_changed&from=&to=` — filtered + paginated.
- **Критерии готовности (DoD):**
  - [ ] All 15+ action types logged
  - [ ] Append-only enforced (no UPDATE/DELETE)
  - [ ] Async write doesn't block main flow
  - [ ] Partitioning and archival configured
  - [ ] API returns filtered results < 200ms
- **Оценка:** 8h
- **Story:** [STORY-050]

**[TASK-0179] Frontend — audit timeline in lead detail**
- **Тип:** Frontend
- **Описание:** Enhanced timeline in lead detail "Timeline" tab: (1) Each event: icon (per action type), timestamp (relative + absolute), actor name/system, action description (human-readable). (2) Expandable details per event (JSON viewer for technical details). (3) Filter dropdown by action type. (4) Date range filter. (5) "Export Audit Log" button → PDF/CSV.
- **Критерии готовности (DoD):**
  - [ ] Timeline renders all event types with correct icons
  - [ ] Filter by action type works
  - [ ] Export to PDF/CSV works
  - [ ] Expandable details show JSON
- **Оценка:** 8h
- **Story:** [STORY-050]

**[TASK-0180] Тесты audit log**
- **Тип:** QA
- **Описание:** (1) Create lead → "created" event logged. (2) Status change → "status_changed" event with old/new. (3) Resend → "resent" event with broker details. (4) API call → actor_type=api, actor_id=api_key_id. (5) User action → actor_type=user, ip logged. (6) Filter by action type → correct. (7) Export PDF → contains all events. (8) Immutability: attempt DELETE → permission denied.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Immutability verified
- **Оценка:** 4h
- **Story:** [STORY-050]

---

#### [STORY-051] Real-time обновления через WebSocket

**Как** Affiliate Manager, **я хочу** видеть новые лиды и обновления статусов в таблице в реальном времени без перезагрузки страницы, **чтобы** не пропускать важные события и работать с актуальными данными.

**Acceptance Criteria:**
- [ ] AC1: WebSocket endpoint `ws://.../ws/leads` — подписка на события лидов для текущей company. События: `lead.created`, `lead.status_changed`, `lead.routed`, `lead.fraud_checked`
- [ ] AC2: При `lead.created`: новая строка появляется вверху таблицы с highlight-анимацией (fade-in yellow → white за 3 sec). Counter "New leads" badge если пользователь scroll не вверху
- [ ] AC3: При `lead.status_changed`: status badge в строке обновляется с animation (flash). Если lead detail открыт — timeline обновляется
- [ ] AC4: Фильтры уважаются: если фильтр status=ftd, а новый лид status=new → не показывается. Если лид сменил статус на ftd → появляется
- [ ] AC5: Reconnection: при разрыве WebSocket — auto-reconnect с exponential backoff (1s, 2s, 4s, max 30s). Indicator "Connected" / "Reconnecting..." в footer
- [ ] AC6: Rate limiting: при > 50 events/sec — batch updates every 2 sec (не обновлять каждый лид отдельно)
- [ ] AC7: Authorization: WebSocket handshake с JWT token. Company-scoped events

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045]

##### Tasks для STORY-051:

**[TASK-0181] Реализовать WebSocket server для lead events**
- **Тип:** Backend
- **Описание:** (1) WebSocket endpoint `/ws/leads` с JWT auth в handshake. (2) Redis Pub/Sub: при lead event → publish to channel `leads:{company_id}`. (3) WS server subscribes to company channel, forwards to connected clients. (4) Event format: `{"type": "lead.created|lead.status_changed", "data": {...lead fields...}}`. (5) Gorilla/websocket or nhooyr/websocket. (6) Connection management: heartbeat ping/pong every 30s, cleanup stale connections. (7) Rate limiting: buffer events, send batch if > 50/sec.
- **Критерии готовности (DoD):**
  - [ ] WebSocket connects with JWT auth
  - [ ] Events delivered < 2 sec after DB write
  - [ ] Heartbeat keeps connection alive
  - [ ] Batch mode at high rate
  - [ ] Cleanup stale connections
- **Оценка:** 8h
- **Story:** [STORY-051]

**[TASK-0182] Frontend — real-time updates integration**
- **Тип:** Frontend
- **Описание:** (1) WebSocket hook: connect on page mount, reconnect on disconnect (exponential backoff). (2) On `lead.created`: if matches current filters → prepend row with highlight animation. If doesn't match → ignore. Badge "5 new leads" if scrolled. (3) On `lead.status_changed`: find row, update status badge with flash animation. Update lead detail if open. (4) Connection indicator in footer: green dot "Live" / yellow "Reconnecting..." / red "Disconnected". (5) Debounce: batch DOM updates if many events arrive simultaneously.
- **Критерии готовности (DoD):**
  - [ ] New leads appear without refresh
  - [ ] Status updates animate correctly
  - [ ] Filter-aware: new leads respect active filters
  - [ ] Reconnection works transparently
  - [ ] Connection indicator shows correct state
- **Оценка:** 8h
- **Story:** [STORY-051]

**[TASK-0183] Тесты WebSocket**
- **Тип:** QA
- **Описание:** (1) Connect → receive events. (2) New lead created → appears in real-time. (3) Status changed → badge updates. (4) Filter active → non-matching leads not shown. (5) Disconnect → reconnect → events resume. (6) Unauthorized → connection refused. (7) High volume (100 events/sec) → batched, no lag.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] WebSocket client mock for tests
- **Оценка:** 4h
- **Story:** [STORY-051]

---

#### [STORY-052] Сохранённые фильтры и кастомные представления

**Как** Affiliate Manager, **я хочу** сохранять часто используемые комбинации фильтров как именованные представления ("VIP Leads", "Today's FTDs", "Fraud Alerts"), **чтобы** быстро переключаться между рабочими контекстами.

**Acceptance Criteria:**
- [ ] AC1: "Save View" кнопка: сохраняет текущую комбинацию фильтров + сортировку + видимые колонки как именованное view. Name (varchar 50), icon/color (optional)
- [ ] AC2: Saved views отображаются как tabs над таблицей (до 10 tabs). Клик → применяет все настройки. "All Leads" — default view (no filters)
- [ ] AC3: Views per user (персональные) или shared (видны всей команде). Toggle при создании
- [ ] AC4: Edit/Delete view через контекстное меню таба
- [ ] AC5: API: `POST/GET/PUT/DELETE /api/v1/saved-views`. Хранение: user_id (or null for shared), company_id, name, config (jsonb: filters + sort + columns)
- [ ] AC6: Максимум 20 views per user + 20 shared views per company
- [ ] AC7: Default views (system-created): "Today's Leads", "FTD Leads", "High Fraud (80+)", "Rejected Leads"

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045]

##### Tasks для STORY-052:

**[TASK-0184] Реализовать saved views API**
- **Тип:** Backend
- **Описание:** Таблица `saved_views`: id (UUID), company_id (FK), user_id (FK, nullable for shared), name (varchar 50), config (jsonb — {filters, sort, columns, per_page}), is_shared (bool), icon (varchar 20, nullable), color (varchar 7 — hex, nullable), position (smallint — tab order), is_default (bool), created_at, updated_at. CRUD API. Seed default views. Max 20 per user + 20 shared.
- **Критерии готовности (DoD):**
  - [ ] CRUD works
  - [ ] Default views seeded
  - [ ] Shared vs personal scoping
  - [ ] Limits enforced
- **Оценка:** 4h
- **Story:** [STORY-052]

**[TASK-0185] Frontend — saved views tabs**
- **Тип:** Frontend
- **Описание:** (1) Tabs bar above leads table: "All Leads" + saved views. (2) Click tab → apply config (filters, sort, columns). (3) "+" button → "Save Current View" modal: name, shared toggle, icon/color picker. (4) Right-click tab → Edit, Delete, Reorder. (5) Drag-and-drop tabs for reorder. (6) Badge on tab: count of matching leads (optional, lazy-loaded).
- **Критерии готовности (DoD):**
  - [ ] Tabs render and switch correctly
  - [ ] Save view captures all current settings
  - [ ] Edit/Delete via context menu
  - [ ] Drag reorder works
- **Оценка:** 8h
- **Story:** [STORY-052]

**[TASK-0186] Тесты saved views**
- **Тип:** QA
- **Описание:** (1) Save view → tab appears. (2) Click tab → filters applied. (3) Shared view → visible to teammates. (4) Personal view → only owner sees it. (5) Delete view → tab removed. (6) Max 20 → 21st rejected. (7) Default views present on first login.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-052]

---

#### [STORY-053] Настройка колонок таблицы (Column Customization)

**Как** Affiliate Manager, **я хочу** показывать/скрывать и переупорядочивать колонки в таблице лидов, **чтобы** адаптировать рабочее пространство под свои задачи и видеть только релевантную информацию.

**Acceptance Criteria:**
- [ ] AC1: "Columns" кнопка в toolbar → dropdown/modal: список всех доступных колонок с чекбоксами (visible/hidden). Минимум 5 visible колонок
- [ ] AC2: Drag-and-drop для переупорядочивания колонок в dropdown
- [ ] AC3: Column resize: drag край колонки для изменения ширины. Минимальная ширина 80px
- [ ] AC4: Column pinning: pin колонку слева (фиксированная при горизонтальном скролле). Максимум 3 pinned
- [ ] AC5: Настройки колонок сохраняются per user (localStorage + server sync)
- [ ] AC6: "Reset Columns" → вернуть к настройкам по умолчанию
- [ ] AC7: Доступные колонки (20+): Lead ID, Status, Country, Affiliate, Broker, Email, Phone, Fraud Score, Created, Updated, Source, IP, Language, Click ID, Sub ID 1-5, Is Duplicate, Is Test, Routing Flow, Notes Count

**Story Points:** 3
**Приоритет:** Should
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045]

##### Tasks для STORY-053:

**[TASK-0187] Frontend — column customization**
- **Тип:** Frontend
- **Описание:** (1) "Columns" button in toolbar → modal/dropdown: checkboxes for all 20+ columns, drag handles for reorder. (2) Column resize: drag on column border (CSS resize or custom handler). Min width 80px. (3) Pin column: right-click column header → "Pin Left". Pinned columns always visible on scroll. (4) Persist config: save to localStorage on change, sync to server API `PUT /api/v1/user-preferences/lead-columns`. (5) "Reset" button → default config.
- **Критерии готовности (DoD):**
  - [ ] Show/hide columns works
  - [ ] Drag reorder works
  - [ ] Column resize works
  - [ ] Pin left works (max 3)
  - [ ] Preferences persist across sessions
- **Оценка:** 8h
- **Story:** [STORY-053]

**[TASK-0188] Тесты column customization**
- **Тип:** QA
- **Описание:** (1) Hide column → not visible. (2) Reorder → correct new order. (3) Resize → width changes. (4) Pin → fixed on scroll. (5) Reload page → settings preserved. (6) Reset → default config. (7) Min 5 visible → can't uncheck below 5.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-053]

---

#### [STORY-054] Полнотекстовый поиск (Full-text Search)

**Как** Affiliate Manager, **я хочу** быстро искать лиды по email, телефону, имени или Lead ID через поисковую строку, **чтобы** найти конкретный лид за секунды.

**Acceptance Criteria:**
- [ ] AC1: Поисковая строка в таблице лидов (top, prominent). Placeholder: "Search by email, phone, name, or Lead ID..."
- [ ] AC2: Поиск работает по: email (exact + partial), phone (exact + last 4 digits), first_name + last_name (prefix match), lead_id (exact UUID match), click_id (exact)
- [ ] AC3: Search-as-you-type: debounce 300ms, minimum 3 characters. Показывать "Searching..." indicator
- [ ] AC4: Results < 300ms при 1M+ leads
- [ ] AC5: Поиск комбинируется с активными фильтрами (search AND filters)
- [ ] AC6: Подсветка matching text в результатах (bold/highlight)
- [ ] AC7: Поиск по маскированным данным для Viewer роли (ищет по полным данным, но отображает маскированно)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-05]
**Зависит от:** [STORY-045]

##### Tasks для STORY-054:

**[TASK-0189] Реализовать full-text search backend**
- **Тип:** Backend
- **Описание:** (1) GIN index на `(email, phone, first_name, last_name)` в таблице leads. (2) Search logic: IF input is UUID → match lead_id. IF input looks like email → ILIKE on email. IF input is digits → match phone (last N digits). ELSE → pg_trgm similarity search on first_name, last_name. (3) Combined with existing filters (AND). (4) API param: `search=query` on `GET /api/v1/leads`. (5) pg_trgm extension for fuzzy matching. (6) Index: `gin (first_name gin_trgm_ops, last_name gin_trgm_ops)`.
- **Критерии готовности (DoD):**
  - [ ] Search by email, phone, name, lead_id, click_id works
  - [ ] Response < 300ms at 1M leads
  - [ ] Combines with filters
  - [ ] Fuzzy matching for names (typo-tolerant)
- **Оценка:** 8h
- **Story:** [STORY-054]

**[TASK-0190] Frontend — search bar with highlighting**
- **Тип:** Frontend
- **Описание:** (1) Search input in leads table toolbar (icon + input, expandable). (2) Debounce 300ms, min 3 chars. (3) "Searching..." spinner. (4) Results in same table (replaces content). (5) Highlight matching text: wrap matched substring in `<mark>` tag. (6) "X" clear button → reset search. (7) Search persists with other filters.
- **Критерии готовности (DoD):**
  - [ ] Search-as-you-type works with debounce
  - [ ] Highlighting works for all field types
  - [ ] Clear button resets search
  - [ ] Combined with filters works
- **Оценка:** 4h
- **Story:** [STORY-054]

**[TASK-0191] Тесты full-text search**
- **Тип:** QA
- **Описание:** (1) Search by exact email → found. (2) Search by partial email "john@" → found. (3) Search by phone last 4 digits → found. (4) Search by name (fuzzy) "Jhon" → finds "John". (5) Search by UUID → found. (6) Search by click_id → found. (7) Search + filter: search "john" + status=ftd → only matching. (8) Min 3 chars → no search before 3. (9) Performance: 1M leads, search < 300ms.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Performance benchmark
- **Оценка:** 4h
- **Story:** [STORY-054]

---

### Сводка по EPIC-05

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 10 |
| **Story Points** | 60 (итого) |
| **Must** | 6 stories (36 SP) |
| **Should** | 4 stories (24 SP) |
| **Could** | 0 stories |
| **Всего Tasks** | 32 |
| **Backend tasks** | 11 |
| **Frontend tasks** | 12 |
| **QA tasks** | 9 |
| **Оценка (часы)** | ~216h |

---

## [EPIC-06] User Accounts & RBAC

**Цель:** Реализовать систему аутентификации, авторизации и управления пользователями — регистрация, JWT-сессии, 2FA, ролевая модель доступа (RBAC), multi-company workspaces, аудит и командное управление. Это фундаментальный эпик, от которого зависят все остальные модули.

**Метрика успеха:**
- Регистрация → вход < 2 мин (UX benchmark)
- JWT token refresh без прерывания сессии (seamless)
- 2FA снижает unauthorized access на 99%+
- RBAC: zero privilege escalation через API (penetration test)
- Multi-company switch < 1 sec

**Приоритет:** P0 (MVP)
**Зависит от:** —
**Оценка:** L (1-3 мес)

---

### Stories:

---

#### [STORY-055] Регистрация пользователя

**Как** новый пользователь, **я хочу** зарегистрироваться по email и паролю с подтверждением email, **чтобы** получить доступ к платформе и начать работу.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/auth/register` принимает: `email` (unique globally), `password` (min 8 chars, must contain uppercase + lowercase + digit + special char), `first_name`, `last_name`, `company_name` (создаёт новую company). Ответ HTTP 201 (user created, pending email verification)
- [ ] AC2: Email verification: при регистрации отправляется email с link: `/verify-email?token={token}`. Token — crypto-random 64 hex, TTL 24ч. При клике → API `POST /api/v1/auth/verify-email` → account activated
- [ ] AC3: До верификации email — login невозможен (HTTP 403 `EMAIL_NOT_VERIFIED`)
- [ ] AC4: Password хешируется bcrypt (cost 12). Plaintext password нигде не хранится и не логируется
- [ ] AC5: Duplicate email → HTTP 409 `EMAIL_ALREADY_EXISTS`
- [ ] AC6: При регистрации автоматически создаётся: company (company_name), user с ролью Super Admin, workspace для company
- [ ] AC7: Rate limit: 5 registrations per IP per hour (anti-spam)
- [ ] AC8: UI: Registration page с формой, password strength indicator, terms of service checkbox

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** —

##### Tasks для STORY-055:

**[TASK-0192] Схема БД для users, companies, workspaces**
- **Тип:** Backend
- **Описание:** Таблицы: (1) `companies`: id (UUID), name (varchar 200), slug (varchar 100, unique — for URL), plan (enum: free, pro, enterprise, default free), is_active (bool), created_at, updated_at. (2) `users`: id (UUID), email (varchar 255, unique), password_hash (varchar 255), first_name (varchar 100), last_name (varchar 100), avatar_url (varchar 500, nullable), timezone (varchar 50, default 'UTC'), language (varchar 5, default 'en'), is_email_verified (bool, default false), email_verification_token (varchar 128, nullable), email_verification_expires_at (timestamptz, nullable), is_active (bool, default true), last_login_at (timestamptz, nullable), created_at, updated_at. (3) `company_members`: user_id (FK), company_id (FK), role (enum: super_admin, admin, manager, viewer, affiliate), joined_at. PK: (user_id, company_id).
- **Критерии готовности (DoD):**
  - [ ] Миграции созданы и применяются
  - [ ] Email unique globally
  - [ ] User can belong to multiple companies
  - [ ] Rollback работает
- **Оценка:** 4h
- **Story:** [STORY-055]

**[TASK-0193] Реализовать registration endpoint**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/auth/register`: (1) Validate inputs (email format, password complexity, name length). (2) Check email uniqueness. (3) Hash password (bcrypt cost 12). (4) Create company. (5) Create user with is_email_verified=false. (6) Create company_member with role=super_admin. (7) Generate verification token (crypto/rand 64 hex), store hash in DB, set expiry 24h. (8) Send verification email (async via queue). (9) Rate limit: 5/IP/hour via Redis.
- **Критерии готовности (DoD):**
  - [ ] Registration creates user + company + membership
  - [ ] Password hashed with bcrypt
  - [ ] Verification email queued
  - [ ] Rate limit works
  - [ ] Duplicate email → 409
- **Оценка:** 8h
- **Story:** [STORY-055]

**[TASK-0194] Реализовать email verification**
- **Тип:** Backend
- **Описание:** (1) API `POST /api/v1/auth/verify-email` — body: `{token}`. Find user by token hash, check expiry, set is_email_verified=true, clear token. (2) Resend verification: `POST /api/v1/auth/resend-verification` — body: `{email}`. Rate limit: 3 per email per hour. (3) Email template: HTML email with CTA button "Verify Email", link with token.
- **Критерии готовности (DoD):**
  - [ ] Verification activates account
  - [ ] Expired token → error
  - [ ] Used token → error (one-time use)
  - [ ] Resend works with rate limit
- **Оценка:** 4h
- **Story:** [STORY-055]

**[TASK-0195] Frontend — registration page**
- **Тип:** Frontend
- **Описание:** Page `/register`: (1) Form: email, password (with show/hide toggle), confirm password, first name, last name, company name. (2) Password strength meter (zxcvbn library): weak/fair/strong/very strong. (3) Terms of Service checkbox (link to TOS). (4) Submit → loading → success page: "Check your email to verify your account". (5) Error handling: inline validation, server errors displayed. (6) Link to login page.
- **Критерии готовности (DoD):**
  - [ ] Form validation (client-side + server-side errors)
  - [ ] Password strength meter works
  - [ ] Success page displayed
  - [ ] Responsive (mobile-friendly)
- **Оценка:** 8h
- **Story:** [STORY-055]

**[TASK-0196] Тесты регистрации**
- **Тип:** QA
- **Описание:** (1) Valid registration → 201, email sent. (2) Weak password → 422. (3) Duplicate email → 409. (4) Verify email → account active. (5) Expired token → error. (6) Login before verify → 403. (7) Rate limit: 6th registration from same IP → 429. (8) Resend verification → new email sent. (9) SQL injection in email → safe.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-055]

---

#### [STORY-056] Логин и JWT-сессии

**Как** зарегистрированный пользователь, **я хочу** войти по email и паролю и получить JWT-токен для доступа к API, **чтобы** безопасно использовать платформу.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/auth/login` — body: `{email, password}`. При успехе: HTTP 200 `{ "access_token": "jwt...", "refresh_token": "opaque-token", "expires_in": 900, "token_type": "Bearer" }`
- [ ] AC2: Access Token: JWT (RS256), payload: `{user_id, company_id, role, exp}`. TTL: 15 мин. Передаётся в header `Authorization: Bearer {token}`
- [ ] AC3: Refresh Token: opaque (crypto-random 64 hex), stored hashed in DB, TTL 30 дней. API `POST /api/v1/auth/refresh` — body: `{refresh_token}` → new access + refresh tokens (rotation). Старый refresh token инвалидируется
- [ ] AC4: При невалидном email/password → HTTP 401 `INVALID_CREDENTIALS` (generic, не указывать что именно неверно)
- [ ] AC5: Brute force protection: после 5 неудачных попыток за 15 мин → account locked на 30 мин. Unlock через email link или admin action
- [ ] AC6: Login event записывается: user_id, ip, user_agent, success/fail, timestamp
- [ ] AC7: Multi-company: при login user принадлежит нескольким companies → response включает `companies: [{id, name, role}]`. Client выбирает company → access_token содержит выбранный company_id

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-055]

##### Tasks для STORY-056:

**[TASK-0197] Реализовать login endpoint и JWT**
- **Тип:** Backend
- **Описание:** (1) API `POST /api/v1/auth/login`: validate email/password (bcrypt compare), check is_email_verified, check is_active, check brute force lock. (2) Generate JWT (RS256): payload {user_id, company_id, role, iat, exp}. Private key from env/secrets. TTL 15 min. (3) Generate refresh token (crypto/rand 64 hex), store SHA256 hash in `refresh_tokens` table (user_id, token_hash, expires_at, is_revoked, created_at). (4) Multi-company: if user in multiple companies → return company list, require company_id selection. (5) Login event log.
- **Критерии готовности (DoD):**
  - [ ] JWT generated with correct payload
  - [ ] Refresh token stored securely
  - [ ] Brute force lock after 5 failures
  - [ ] Multi-company selection works
  - [ ] Login events logged
- **Оценка:** 8h
- **Story:** [STORY-056]

**[TASK-0198] Реализовать token refresh и rotation**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/auth/refresh`: (1) Validate refresh token (hash lookup in DB). (2) Check not revoked, not expired. (3) Generate new access + refresh tokens. (4) Revoke old refresh token. (5) Reuse detection: if revoked token used → revoke ALL tokens for user (potential theft). Log security event.
- **Критерии готовности (DoD):**
  - [ ] Token rotation works (new access + refresh)
  - [ ] Old refresh token revoked after use
  - [ ] Reuse detection → revoke all (security)
  - [ ] Expired token → 401
- **Оценка:** 4h
- **Story:** [STORY-056]

**[TASK-0199] Frontend — login page и token management**
- **Тип:** Frontend
- **Описание:** (1) Page `/login`: email input, password input (show/hide), "Remember me" checkbox, "Forgot password?" link, "Register" link. (2) On success: store access_token in memory (not localStorage), refresh_token in httpOnly cookie (if SSR) or secure storage. (3) Axios/fetch interceptor: attach Bearer token, on 401 → attempt refresh → retry original request. (4) Multi-company: if multiple companies → company selector modal after login. (5) Auto-refresh: refresh token 1 min before access_token expires.
- **Критерии готовности (DoD):**
  - [ ] Login form works
  - [ ] Token stored securely (not in localStorage for access_token)
  - [ ] Auto-refresh transparent to user
  - [ ] Company selector for multi-company users
- **Оценка:** 8h
- **Story:** [STORY-056]

**[TASK-0200] Тесты auth**
- **Тип:** QA
- **Описание:** (1) Valid login → 200 + tokens. (2) Wrong password → 401. (3) Unverified email → 403. (4) 5 failed attempts → locked 30 min. (5) Refresh token → new tokens. (6) Used refresh token → 401 (reuse detection). (7) Expired access token → 401. (8) Expired refresh token → 401. (9) Multi-company selection → correct company_id in JWT.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Security test: JWT tampering → rejected
- **Оценка:** 4h
- **Story:** [STORY-056]

---

#### [STORY-057] Двухфакторная аутентификация (2FA / TOTP)

**Как** пользователь, **я хочу** включить двухфакторную аутентификацию через Google Authenticator / TOTP, **чтобы** защитить свой аккаунт от несанкционированного доступа даже при утечке пароля.

**Acceptance Criteria:**
- [ ] AC1: В настройках профиля — кнопка "Enable 2FA". При включении: генерация TOTP secret (base32, 160 bit), QR-код (otpauth:// URI), показать backup codes (8 одноразовых кодов по 8 символов)
- [ ] AC2: Подтверждение: user вводит текущий TOTP-код из приложения → если верный → 2FA включена. Secret сохраняется (encrypted) в БД
- [ ] AC3: При login с включённым 2FA: после email+password → дополнительный шаг: ввод TOTP-кода. API: `POST /api/v1/auth/verify-2fa` — body: `{mfa_token (из первого шага), totp_code}` → access + refresh tokens
- [ ] AC4: Backup codes: каждый код одноразовый, работает вместо TOTP-кода. При использовании — помечается как used. Хранятся как bcrypt hashes
- [ ] AC5: "Disable 2FA" — требует текущий пароль + TOTP-код. Удаляет secret из БД
- [ ] AC6: Recovery: если пользователь потерял доступ к authenticator + использовал все backup codes → admin может reset 2FA через admin panel
- [ ] AC7: 2FA обязательна для Super Admin и Admin ролей (enforce policy)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-056]

##### Tasks для STORY-057:

**[TASK-0201] Реализовать TOTP 2FA backend**
- **Тип:** Backend
- **Описание:** (1) Library: pquerna/otp. (2) Enable: generate TOTP key (crypto/rand, SHA1, 6 digits, 30 sec period), return base32 secret + otpauth URI + QR SVG. (3) Confirm: validate TOTP code, save encrypted secret in `user_2fa` table (user_id, secret_encrypted, backup_codes_hashes, is_enabled, enabled_at). (4) Login flow: if 2FA enabled → return `{mfa_required: true, mfa_token: "temporary-token"}` instead of access_token. (5) Verify-2fa: validate TOTP code (allow ±1 time step for clock skew), return tokens. (6) Backup codes: generate 8 codes, store as bcrypt hashes, mark used on verification. (7) Disable: require password + TOTP, delete 2FA record.
- **Критерии готовности (DoD):**
  - [ ] TOTP generation and validation works
  - [ ] QR code generated correctly
  - [ ] Backup codes work as alternative
  - [ ] Clock skew tolerance ±1 step (±30 sec)
  - [ ] Disable requires password + TOTP
- **Оценка:** 8h
- **Story:** [STORY-057]

**[TASK-0202] Frontend — 2FA setup и login flow**
- **Тип:** Frontend
- **Описание:** (1) Settings > Security > "Enable 2FA" button. (2) Setup wizard: Step 1 — QR code display + manual secret. Step 2 — enter TOTP code to confirm. Step 3 — show backup codes (copy all, download as text). (3) Login flow: if mfa_required → show TOTP input page. "Use backup code" link → backup code input. (4) "Disable 2FA" in settings → confirm with password + TOTP. (5) 2FA badge on user profile.
- **Критерии готовности (DoD):**
  - [ ] QR code displays and scans correctly
  - [ ] Backup codes displayed with copy/download
  - [ ] Login 2FA step works
  - [ ] Disable works with confirmation
- **Оценка:** 8h
- **Story:** [STORY-057]

**[TASK-0203] Тесты 2FA**
- **Тип:** QA
- **Описание:** (1) Enable 2FA → secret stored. (2) Login with 2FA → requires TOTP step. (3) Valid TOTP → access granted. (4) Invalid TOTP → rejected. (5) Backup code works. (6) Used backup code → rejected second time. (7) Disable 2FA → login without TOTP. (8) Clock skew ±30 sec → accepted. (9) Admin enforced 2FA → must enable before access.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-057]

---

#### [STORY-058] Ролевая модель доступа (RBAC)

**Как** Network Admin, **я хочу** назначать пользователям роли с определёнными permissions, **чтобы** каждый пользователь видел и мог делать только то, что соответствует его роли.

**Acceptance Criteria:**
- [ ] AC1: Предустановленные роли и permissions:
  - **Super Admin**: полный доступ, управление компанией, billing, удаление данных
  - **Admin**: всё кроме billing и company deletion. Может приглашать пользователей
  - **Manager**: управление лидами, аффилейтами, брокерами. Не может менять настройки компании
  - **Viewer**: read-only доступ. Видит маскированные PII. Не может менять данные
  - **Affiliate**: доступ только к своим лидам и настройкам. Отдельный UI
- [ ] AC2: Каждый permission = string: `leads.read`, `leads.write`, `leads.export`, `leads.delete`, `brokers.read`, `brokers.write`, `affiliates.read`, `affiliates.write`, `routing.read`, `routing.write`, `settings.read`, `settings.write`, `users.read`, `users.write`, `analytics.read`, `audit.read`, `billing.read`, `billing.write`
- [ ] AC3: Permission check middleware: на каждом API endpoint — проверка permission из JWT-роли. При отсутствии → HTTP 403 `FORBIDDEN`
- [ ] AC4: Permissions настраиваются per company: Super Admin может создать custom role с произвольным набором permissions
- [ ] AC5: UI: каждый элемент (кнопка, страница, action) показывается/скрывается на основе permissions пользователя
- [ ] AC6: API `GET /api/v1/me/permissions` — возвращает список permissions текущего пользователя

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-055], [STORY-056]

##### Tasks для STORY-058:

**[TASK-0204] Реализовать RBAC engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `roles`: id (UUID), company_id (FK, nullable for system roles), name (varchar 50), permissions (text[] — массив permission strings), is_system (bool — true для предустановленных), is_default (bool — role для новых приглашённых), created_at. Seed system roles. (2) Таблица `custom_roles`: company_id, name, permissions. (3) Permission check middleware: extract role from JWT → load permissions (cached in Redis 5 min) → check if required permission in list. (4) Permission decorator for handlers: `RequirePermission("leads.write")`. (5) API `GET /api/v1/me/permissions`.
- **Критерии готовности (DoD):**
  - [ ] 5 system roles seeded with correct permissions
  - [ ] Permission middleware works on all endpoints
  - [ ] Custom roles CRUD works
  - [ ] Permission cache in Redis
  - [ ] 403 for insufficient permissions
- **Оценка:** 8h
- **Story:** [STORY-058]

**[TASK-0205] Интегрировать permissions в существующие endpoints**
- **Тип:** Backend
- **Описание:** Добавить RequirePermission middleware ко всем существующим API endpoints: leads.* endpoints → leads.read/write/export, brokers.* → brokers.read/write, affiliates.* → affiliates.read/write, routing.* → routing.read/write, settings.* → settings.read/write. Viewer role: только .read permissions + PII masking. Affiliate role: scoped to own data (affiliate_id from JWT).
- **Критерии готовности (DoD):**
  - [ ] All endpoints have permission checks
  - [ ] Viewer cannot write
  - [ ] Affiliate sees only own data
  - [ ] PII masked for Viewer
- **Оценка:** 8h
- **Story:** [STORY-058]

**[TASK-0206] Frontend — permission-based UI rendering**
- **Тип:** Frontend
- **Описание:** (1) Auth context/provider: load permissions on login, store in React context. (2) `<PermissionGate permission="leads.write">` component — renders children only if user has permission. (3) Apply to all pages: hide write actions for Viewer, hide admin pages for non-admin. (4) Navigation: menu items filtered by permissions. (5) Redirect unauthorized access to 403 page.
- **Критерии готовности (DoD):**
  - [ ] PermissionGate component works
  - [ ] All write actions gated
  - [ ] Navigation filtered by role
  - [ ] 403 page for direct URL access
- **Оценка:** 8h
- **Story:** [STORY-058]

**[TASK-0207] Тесты RBAC**
- **Тип:** QA
- **Описание:** (1) Super Admin → all permissions. (2) Viewer → only read, no write. (3) Manager → leads+brokers+affiliates write, no settings. (4) Affiliate → only own data. (5) Custom role → correct permissions. (6) Missing permission → 403. (7) PII masked for Viewer. (8) Permission change → reflected after cache TTL.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Penetration test: no privilege escalation
- **Оценка:** 8h
- **Story:** [STORY-058]

---

#### [STORY-059] Multi-company workspaces

**Как** пользователь, **я хочу** принадлежать к нескольким компаниям и переключаться между ними, **чтобы** работать с несколькими клиентами/проектами из одного аккаунта.

**Acceptance Criteria:**
- [ ] AC1: User может принадлежать к нескольким companies (через company_members). В каждой company — своя роль
- [ ] AC2: Company switcher в header: dropdown с company name + role badge. Переключение → новый access_token с другим company_id. Без re-login
- [ ] AC3: Данные полностью изолированы между companies: leads, brokers, affiliates, settings, flows, metrics — всё scoped по company_id
- [ ] AC4: API `POST /api/v1/auth/switch-company` — body: `{company_id}`. Validates membership → returns new access_token
- [ ] AC5: Каждая company имеет: name, logo URL, timezone (default), currency (default), billing plan
- [ ] AC6: Company settings page (Super Admin only): name, logo upload, timezone, default currency, billing info

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-056]

##### Tasks для STORY-059:

**[TASK-0208] Реализовать company switching**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/auth/switch-company`: (1) Validate user is member of target company. (2) Load role for user in target company. (3) Generate new JWT with new company_id + role. (4) Return new access + refresh tokens. (5) Log switch event. Ensure all data queries include company_id filter (middleware enforced).
- **Критерии готовности (DoD):**
  - [ ] Switch generates new JWT with correct company_id
  - [ ] Role correct for target company
  - [ ] Non-member → 403
  - [ ] All data queries scoped by company_id
- **Оценка:** 4h
- **Story:** [STORY-059]

**[TASK-0209] Frontend — company switcher и company settings**
- **Тип:** Frontend
- **Описание:** (1) Header: company name + logo → click → dropdown with all companies (name, role badge). (2) Click company → call switch API → reload dashboard with new context. (3) Company settings page (Super Admin): name, logo upload (drag-and-drop, max 2MB, jpg/png), timezone dropdown, currency dropdown, domain settings. (4) Loading state during switch.
- **Критерии готовности (DoD):**
  - [ ] Switcher shows all companies with roles
  - [ ] Switch reloads context < 1 sec
  - [ ] Company settings save correctly
  - [ ] Logo upload works
- **Оценка:** 8h
- **Story:** [STORY-059]

**[TASK-0210] Тесты multi-company**
- **Тип:** QA
- **Описание:** (1) User in 2 companies → switcher shows both. (2) Switch → new JWT, different company data. (3) Data isolation: company A leads not visible from company B. (4) Non-member → 403 on switch. (5) Different roles: admin in A, viewer in B → permissions change on switch.
- **Критерии готовности (DoD):**
  - [ ] 5 тест-кейсов проходят
  - [ ] Data isolation verified
- **Оценка:** 4h
- **Story:** [STORY-059]

---

#### [STORY-060] Профиль пользователя и настройки

**Как** пользователь, **я хочу** управлять своим профилем (аватар, timezone, язык, уведомления), **чтобы** персонализировать платформу под себя.

**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/me` — текущий профиль: id, email, first_name, last_name, avatar_url, timezone, language, role (in current company), companies list, 2fa_enabled, created_at
- [ ] AC2: API `PUT /api/v1/me` — update: first_name, last_name, timezone, language, notification_preferences (jsonb: `{email_notifications: bool, telegram_bot_id: string, push_enabled: bool}`)
- [ ] AC3: Avatar upload: `POST /api/v1/me/avatar` — multipart, jpg/png, max 2MB, resize to 200x200. Store in S3/MinIO
- [ ] AC4: Language support: en, ru (initial). All UI strings externalized (i18n). Timezone affects date display in UI
- [ ] AC5: Notification preferences: email (on/off per event type), Telegram (connect bot), browser push (on/off)
- [ ] AC6: "Change Email" — requires current password + new email verification
- [ ] AC7: "Change Password" — requires current password, new password with same complexity rules

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-055]

##### Tasks для STORY-060:

**[TASK-0211] Реализовать profile API**
- **Тип:** Backend
- **Описание:** (1) GET /api/v1/me — aggregate from users + company_members. (2) PUT /api/v1/me — update allowed fields (not email, not role). (3) POST /api/v1/me/avatar — accept multipart file, validate type (jpg/png) and size (≤ 2MB), resize to 200x200 (imaging library), upload to S3/MinIO, update avatar_url. (4) PUT /api/v1/me/email — require password, send verification to new email, switch on verify. (5) PUT /api/v1/me/password — require current password, validate new, hash, update.
- **Критерии готовности (DoD):**
  - [ ] Profile CRUD works
  - [ ] Avatar upload + resize works
  - [ ] Email change requires verification
  - [ ] Password change requires current password
- **Оценка:** 8h
- **Story:** [STORY-060]

**[TASK-0212] Frontend — profile page**
- **Тип:** Frontend
- **Описание:** Page `/settings/profile`: (1) Avatar: circular image with "Change" overlay → file picker or drag-and-drop. (2) Personal info: first/last name inputs, email (display + "Change" button). (3) Preferences: timezone dropdown (searchable, 400+ timezones), language radio (en/ru). (4) Notifications: toggles per channel (email, telegram, push) per event type (leads, alerts, reports). (5) Security section: "Change Password" form, 2FA status.
- **Критерии готовности (DoD):**
  - [ ] Avatar upload with preview
  - [ ] All fields editable and saveable
  - [ ] Timezone selector with search
  - [ ] Notification toggles work
- **Оценка:** 8h
- **Story:** [STORY-060]

**[TASK-0213] Тесты profile**
- **Тип:** QA
- **Описание:** (1) GET /me → correct data. (2) Update name → saved. (3) Upload avatar → URL updated. (4) Avatar > 2MB → error. (5) Change email → verification sent. (6) Change password with wrong current → error. (7) Change password → new password works for login.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-060]

---

#### [STORY-061] Сброс пароля (Password Reset)

**Как** пользователь, **я хочу** сбросить пароль через email, если я его забыл, **чтобы** восстановить доступ к аккаунту.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/auth/forgot-password` — body: `{email}`. ALWAYS returns 200 (не раскрывать существование email). Если email существует → отправить reset link
- [ ] AC2: Reset link: `/reset-password?token={token}`. Token: crypto-random 64 hex, TTL 1 час, одноразовый
- [ ] AC3: API `POST /api/v1/auth/reset-password` — body: `{token, new_password}`. Validate token, validate password complexity, hash, update, revoke ALL refresh tokens for user (force re-login)
- [ ] AC4: Rate limit: 3 forgot-password requests per email per hour, 10 per IP per hour
- [ ] AC5: After reset → email notification "Your password was changed. If this wasn't you, contact support"
- [ ] AC6: UI: "Forgot password?" link on login page → email input → submit → success message

**Story Points:** 3
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-055]

##### Tasks для STORY-061:

**[TASK-0214] Реализовать password reset backend**
- **Тип:** Backend
- **Описание:** (1) POST /auth/forgot-password: lookup email, if exists → generate token (crypto/rand), store hash in `password_reset_tokens` (user_id, token_hash, expires_at, is_used), send email. Always return 200. (2) POST /auth/reset-password: validate token hash, check expiry, check not used. Update password. Mark token used. Revoke all refresh_tokens for user. Send confirmation email. (3) Rate limits via Redis.
- **Критерии готовности (DoD):**
  - [ ] Reset flow works end-to-end
  - [ ] Token one-time use
  - [ ] Token expires after 1h
  - [ ] All sessions revoked after reset
  - [ ] Rate limits work
- **Оценка:** 4h
- **Story:** [STORY-061]

**[TASK-0215] Frontend — forgot/reset password pages**
- **Тип:** Frontend
- **Описание:** (1) `/forgot-password`: email input, submit → "If this email exists, we've sent a reset link." (2) `/reset-password?token=...`: new password input + confirm, strength meter, submit → "Password reset! Redirecting to login..." (3) Error states: invalid/expired token.
- **Критерии готовности (DoD):**
  - [ ] Both pages work
  - [ ] Password strength meter
  - [ ] Error states handled
- **Оценка:** 4h
- **Story:** [STORY-061]

**[TASK-0216] Тесты password reset**
- **Тип:** QA
- **Описание:** (1) Forgot password → email sent. (2) Non-existent email → 200 (no email sent). (3) Reset with valid token → password changed. (4) Expired token → error. (5) Used token → error. (6) After reset → old password doesn't work. (7) After reset → old refresh tokens revoked. (8) Rate limit: 4th request → 429.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-061]

---

#### [STORY-062] Управление сессиями

**Как** пользователь, **я хочу** видеть активные сессии и иметь возможность завершить любую из них, **чтобы** контролировать доступ к моему аккаунту и отзывать скомпрометированные сессии.

**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/me/sessions` — список активных сессий: id, ip, user_agent (parsed: browser + OS), location (GeoIP), created_at, last_active_at, is_current (bool)
- [ ] AC2: API `DELETE /api/v1/me/sessions/{id}` — revoke specific session (delete refresh token). If current session → logout
- [ ] AC3: API `DELETE /api/v1/me/sessions` — revoke ALL sessions except current ("Sign out everywhere else")
- [ ] AC4: Auto-expire: sessions inactive > 30 days auto-revoked (cron cleanup)
- [ ] AC5: UI: Settings > Security > "Active Sessions" — list with device info, "Revoke" button, "Sign Out Everywhere" button
- [ ] AC6: New login from unusual location/device → email alert "New sign-in from Chrome on Windows, IP: x.x.x.x"

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-06]
**Зависит от:** [STORY-056]

##### Tasks для STORY-062:

**[TASK-0217] Реализовать session management**
- **Тип:** Backend
- **Описание:** (1) Extend `refresh_tokens` table: add ip (inet), user_agent (varchar 500), device_info (jsonb — parsed UA: browser, os, device), location (jsonb — GeoIP: city, country), last_active_at (update on token refresh). (2) API GET /me/sessions: return non-revoked, non-expired tokens with parsed info. Mark current. (3) DELETE by id: mark revoked. (4) DELETE all: revoke all except current session's token. (5) Cron: daily cleanup of tokens where last_active_at > 30 days ago. (6) New device detection: if IP/UA doesn't match any existing session → send email alert.
- **Критерии готовности (DoD):**
  - [ ] Session list with device info works
  - [ ] Revoke specific session works
  - [ ] Revoke all except current works
  - [ ] Auto-expire after 30 days
  - [ ] New device email alert
- **Оценка:** 8h
- **Story:** [STORY-062]

**[TASK-0218] Frontend — sessions page**
- **Тип:** Frontend
- **Описание:** Settings > Security > "Active Sessions": (1) Cards per session: device icon (desktop/mobile/tablet), browser + OS, location (city, country), IP, last active (relative), "Current" badge. (2) "Revoke" button per session (red). (3) "Sign Out Everywhere Else" button at top. (4) Email alert preference toggle.
- **Критерии готовности (DoD):**
  - [ ] Session cards with parsed device info
  - [ ] Revoke works per session
  - [ ] "Sign Out Everywhere" works
  - [ ] Current session marked
- **Оценка:** 4h
- **Story:** [STORY-062]

**[TASK-0219] Тесты session management**
- **Тип:** QA
- **Описание:** (1) Login → session created. (2) GET sessions → list includes current. (3) Revoke other session → that session's refresh token invalid. (4) Revoke all → only current survives. (5) Auto-expire: old session cleaned up. (6) New device → email alert sent.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-062]

---

#### [STORY-063] Аудит-лог (глобальный)

**Как** Network Admin, **я хочу** видеть аудит-лог всех действий пользователей в системе (кто, что, когда), **чтобы** расследовать инциденты и обеспечивать compliance.

**Acceptance Criteria:**
- [ ] AC1: Все пользовательские действия записываются в `audit_log`: user_id, company_id, action (e.g., "user.login", "lead.created", "broker.updated", "settings.changed"), resource_type (user, lead, broker, etc.), resource_id, details (jsonb — what changed: before/after), ip_address, user_agent, created_at
- [ ] AC2: API `GET /api/v1/audit-log` — фильтры: user_id, action, resource_type, date range. Пагинация cursor-based. Only Admin+ access
- [ ] AC3: UI: "Audit Log" page — таблица с human-readable descriptions: "John Doe changed broker 'XM Trading' status from active to paused". Filters, date range picker, export to CSV
- [ ] AC4: Immutable: append-only (no UPDATE/DELETE). Retention: 2 years
- [ ] AC5: Real-time: new audit events appear via WebSocket (for admins viewing audit page)
- [ ] AC6: Partitioned by month, archived after 90 days to cold storage

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-06]
**Зависит от:** [STORY-058]

##### Tasks для STORY-063:

**[TASK-0220] Реализовать global audit log system**
- **Тип:** Backend
- **Описание:** (1) Таблица `audit_log`: id (bigserial), company_id (FK), user_id (FK), action (varchar 100), resource_type (varchar 50), resource_id (varchar 100), details (jsonb — {before: {...}, after: {...}, diff: [...]}), ip_address (inet), user_agent (varchar 500), created_at (timestamptz). No UPDATE/DELETE permissions. Partition by month. (2) Audit middleware: intercept all write operations, compute diff (before → after), write to audit_log async. (3) API with filters and cursor pagination. (4) WebSocket channel for real-time audit feed.
- **Критерии готовности (DoD):**
  - [ ] All write actions logged with before/after diff
  - [ ] Append-only enforced
  - [ ] API filters work
  - [ ] Partitioning configured
  - [ ] Async write (no latency impact)
- **Оценка:** 8h
- **Story:** [STORY-063]

**[TASK-0221] Frontend — audit log page**
- **Тип:** Frontend
- **Описание:** Page "Audit Log" (Admin+): (1) Table: timestamp, user (avatar + name), action (human-readable), resource (type + ID, linked), IP. (2) Expandable row: full details (before/after diff, JSON). (3) Filters: user selector, action type, resource type, date range. (4) Export CSV button. (5) Real-time: new events appear at top via WebSocket.
- **Критерии готовности (DoD):**
  - [ ] Table with filters works
  - [ ] Diff view shows before/after
  - [ ] Export CSV works
  - [ ] Real-time updates via WebSocket
- **Оценка:** 8h
- **Story:** [STORY-063]

**[TASK-0222] Тесты audit log**
- **Тип:** QA
- **Описание:** (1) Create lead → audit event logged. (2) Update broker → diff contains old/new values. (3) Delete affiliate → logged. (4) Filter by user → correct. (5) Filter by resource_type → correct. (6) Viewer role → 403 on audit page. (7) Immutability: SQL DELETE → permission denied.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-063]

---

#### [STORY-064] Управление командой (Team Management)

**Как** Admin, **я хочу** приглашать новых пользователей в компанию по email и назначать им роли, **чтобы** давать доступ коллегам и контролировать их полномочия.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/team/invite` — body: `{email, role, message (optional)}`. Отправляет email с invite link: `/accept-invite?token={token}`. Token TTL: 7 дней
- [ ] AC2: Если email уже зарегистрирован в системе → добавляет в company сразу (если принял invite). Если не зарегистрирован → invite link ведёт на registration page с pre-filled company
- [ ] AC3: API `GET /api/v1/team` — список участников команды: name, email, role, status (active/invited/disabled), last_active, joined_at
- [ ] AC4: API `PUT /api/v1/team/{user_id}/role` — изменить роль. Super Admin может менять роли всех. Admin может менять roles ≤ manager
- [ ] AC5: API `DELETE /api/v1/team/{user_id}` — удалить из company (не удалить аккаунт). Cannot remove last Super Admin
- [ ] AC6: Invite status: pending → accepted / expired. Max 50 pending invites per company
- [ ] AC7: UI: "Team" page — member list, "Invite" button, role change dropdown, remove button

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-06]
**Зависит от:** [STORY-055], [STORY-058]

##### Tasks для STORY-064:

**[TASK-0223] Реализовать team invite system**
- **Тип:** Backend
- **Описание:** (1) Таблица `team_invites`: id (UUID), company_id (FK), email (varchar 255), role (enum), invited_by (FK users), token_hash (varchar 128), message (text, nullable), status (enum: pending, accepted, expired), expires_at, created_at. (2) POST /team/invite: generate token, send email, create invite. (3) POST /team/accept-invite: validate token → if user exists: add company_member. If not: redirect to register with invite context → after register: auto-add to company. (4) GET /team: list company_members + pending invites. (5) PUT /team/{id}/role: role change with permission check. (6) DELETE /team/{id}: remove membership (not account). Check: cannot remove last super_admin.
- **Критерии готовности (DoD):**
  - [ ] Invite email sent
  - [ ] Accept for existing user works
  - [ ] Accept for new user → register + auto-join
  - [ ] Role change with permission hierarchy
  - [ ] Cannot remove last Super Admin
- **Оценка:** 8h
- **Story:** [STORY-064]

**[TASK-0224] Frontend — team management page**
- **Тип:** Frontend
- **Описание:** Page "Team": (1) Members table: avatar, name, email, role (dropdown for change), status badge, last active, actions (remove). (2) Pending invites section: email, role, invited by, expires, actions (resend, cancel). (3) "Invite Member" button → modal: email input, role selector, optional message textarea. (4) Role change dropdown: shows only roles user can assign. (5) Remove button with confirmation.
- **Критерии готовности (DoD):**
  - [ ] Members table with role management
  - [ ] Invite modal works
  - [ ] Pending invites displayed
  - [ ] Permission-aware role dropdown
- **Оценка:** 8h
- **Story:** [STORY-064]

**[TASK-0225] Тесты team management**
- **Тип:** QA
- **Описание:** (1) Invite → email sent. (2) Accept (existing user) → added to company. (3) Accept (new user) → register + join. (4) Expired invite → error. (5) Change role → updated. (6) Admin cannot set Super Admin role. (7) Remove member → removed from company. (8) Remove last Super Admin → error. (9) Max 50 pending invites.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-064]

---

#### [STORY-065] API Token Management (service-to-service auth)

**Как** Developer, **я хочу** создавать долгоживущие API-токены для service-to-service интеграций (CI/CD, внешние скрипты), **чтобы** автоматизировать взаимодействие с CRM без использования user credentials.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/api-tokens` — создаёт service token: `name` (label), `permissions` (subset of user's permissions), `expires_at` (optional, default no expiry). Returns full token ONCE: `gcs_` + 64 hex
- [ ] AC2: Service token работает в header `Authorization: Bearer gcs_...`. Middleware определяет тип (JWT vs service token) и обрабатывает соответственно
- [ ] AC3: Service tokens имеют explicit permissions (не наследуют роль пользователя). User может дать token только те permissions, которые сам имеет
- [ ] AC4: API `GET /api/v1/api-tokens` — list (name, permissions, last used, created_at). `DELETE /api/v1/api-tokens/{id}` — revoke
- [ ] AC5: Максимум 10 service tokens per user
- [ ] AC6: Audit: все действия service token логируются с token_id (не user_id)
- [ ] AC7: UI: "API Tokens" page in settings — list, create, revoke

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-06]
**Зависит от:** [STORY-058]

##### Tasks для STORY-065:

**[TASK-0226] Реализовать service token system**
- **Тип:** Backend
- **Описание:** (1) Таблица `service_tokens`: id (UUID), user_id (FK), company_id (FK), name (varchar 100), token_hash (varchar 128, unique), permissions (text[]), expires_at (timestamptz, nullable), last_used_at, is_revoked (bool), created_at. (2) Generate: `gcs_` + crypto/rand 64 hex. Store SHA256 hash. (3) Auth middleware extension: if header starts with "gcs_" → lookup by hash, check not revoked/expired, extract permissions. (4) Permission check: service token permissions checked same as role permissions. (5) Audit: log actions with actor_type=service_token, actor_id=token_id.
- **Критерии готовности (DoD):**
  - [ ] Token generation and authentication works
  - [ ] Permission scoping works
  - [ ] Cannot create token with more permissions than user has
  - [ ] Max 10 per user
  - [ ] Audit logging works
- **Оценка:** 8h
- **Story:** [STORY-065]

**[TASK-0227] Frontend — API tokens page**
- **Тип:** Frontend
- **Описание:** Settings > "API Tokens": (1) Table: name, permissions (badges), last used, created, expiry, actions (revoke). (2) "Create Token" modal: name, permission checkboxes (only user's permissions available), expiry date (optional). (3) After create: show full token once with copy button + warning. (4) "Revoke" with confirmation.
- **Критерии готовности (DoD):**
  - [ ] Create with permissions works
  - [ ] Full token shown once
  - [ ] Revoke works
  - [ ] Permission checkboxes filtered to user's permissions
- **Оценка:** 4h
- **Story:** [STORY-065]

**[TASK-0228] Тесты API tokens**
- **Тип:** QA
- **Описание:** (1) Create token → works with Bearer header. (2) Token with leads.read → can read leads. (3) Token without leads.write → 403 on write. (4) Revoked token → 401. (5) Expired token → 401. (6) Max 10 → 11th rejected. (7) Token cannot have permission user doesn't have.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-065]

---

### Сводка по EPIC-06

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 11 |
| **Story Points** | 68 (итого) |
| **Must** | 7 stories (45 SP) |
| **Should** | 4 stories (20 SP) |
| **Could** | 0 stories |
| **Всего Tasks** | 37 |
| **Backend tasks** | 16 |
| **Frontend tasks** | 11 |
| **QA tasks** | 10 |
| **Оценка (часы)** | ~232h |

---

## [EPIC-07] Anti-Fraud System

**Цель:** Создать комплексную систему обнаружения мошенничества — анализ IP, email, телефона, composite fraud scoring, настраиваемые профили, real-time проверки в pipeline приёма лидов, детальные отчёты по проверкам и dashboards. КРИТИЧЕСКИЙ ДИФФЕРЕНЦИАТОР: БЕЗЛИМИТНЫЕ проверки в базовом плане (конкуренты HyperOne ограничивают 100-4000 проверок/мес по тарифу). Наш подход: unlimited anti-fraud — ключевое преимущество в маркетинге.

**Метрика успеха:**
- Fraud detection rate ≥ 95% (true positive) при false positive < 3%
- Все проверки (IP + Email + Phone) выполняются суммарно < 500ms (p95) per lead
- 0 ограничений на количество проверок (unlimited) — подтверждено нагрузочным тестом 10,000 leads/min
- Fraud score коррелирует с реальными rejection rates (r > 0.7)
- "Provable Anti-Fraud" PDF отчёт генерируется < 3 sec

**Приоритет:** P0 (MVP)
**Зависит от:** [EPIC-01]
**Оценка:** XL (3+ мес)

---

### Stories:

---

#### [STORY-066] IP-анализ (VPN/TOR/Proxy/Bot detection)

**Как** Network Admin, **я хочу** чтобы система автоматически проверяла IP-адрес каждого лида на VPN, TOR, proxy и bot-сети, **чтобы** выявлять мошеннический трафик на этапе приёма лида.

**Acceptance Criteria:**
- [ ] AC1: Каждый входящий лид проверяется по IP: (1) GeoIP lookup (страна, город, ISP, ASN), (2) VPN detection, (3) TOR exit node check, (4) Proxy/datacenter detection, (5) Bot/spam IP database check. Все проверки параллельны
- [ ] AC2: Используемые базы: MaxMind GeoIP2 (локальная), IP2Proxy (локальная или API), TOR exit nodes (публичный список, обновление каждые 6ч), AbuseIPDB (API, кеш 24ч), custom blacklists
- [ ] AC3: Результат IP-анализа: `{ "ip": "1.2.3.4", "country": "DE", "city": "Berlin", "isp": "AWS", "asn": 16509, "is_vpn": true, "is_tor": false, "is_proxy": false, "is_datacenter": true, "is_bot": false, "abuse_score": 85, "risk_level": "high", "details": "AWS datacenter IP, VPN detected via IP2Proxy" }`
- [ ] AC4: Latency всех IP-проверок суммарно < 200ms (при использовании локальных баз + кешированных API)
- [ ] AC5: Обновление баз: GeoIP — еженедельно, TOR nodes — каждые 6ч, IP2Proxy — ежемесячно, AbuseIPDB кеш — 24ч
- [ ] AC6: БЕЗЛИМИТНО: никаких ограничений на количество проверок. Все проверки на локальных базах (без per-check API costs для основных проверок). AbuseIPDB API вызывается с кешем для экономии API quota
- [ ] AC7: Partial failure: если одна из проверок timeout — остальные результаты возвращаются с пометкой `ip2proxy_check: "unavailable"`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [EPIC-01]

##### Tasks для STORY-066:

**[TASK-0229] Реализовать IP analysis engine**
- **Тип:** Backend
- **Описание:** Модуль `IPAnalyzer`: (1) GeoIP: MaxMind GeoIP2 City + ASN databases (локальные .mmdb файлы). Lookup < 1ms. (2) VPN/Proxy: IP2Proxy Lite database (локальный .bin файл) или IP2Proxy API (fallback, cached). (3) TOR: download TOR exit node list (https://check.torproject.org/exit-addresses), parse, store in Redis Set. Check: SISMEMBER. Update cron every 6h. (4) AbuseIPDB: API call с кешем в Redis (key: `abuseipdb:{ip}`, TTL 24h). Rate limit: 1000 req/day (free tier). (5) Parallel execution: все проверки через goroutines + WaitGroup, timeout 200ms per check. (6) Result aggregation into IPAnalysisResult struct.
- **Критерии готовности (DoD):**
  - [ ] GeoIP lookup works (country, city, ISP, ASN)
  - [ ] VPN detection works
  - [ ] TOR detection works
  - [ ] Proxy/datacenter detection works
  - [ ] AbuseIPDB check with cache works
  - [ ] All checks < 200ms total
  - [ ] Partial failure handled gracefully
- **Оценка:** 16h
- **Story:** [STORY-066]

**[TASK-0230] Настройка обновления IP-баз**
- **Тип:** DevOps
- **Описание:** (1) GeoIP: cron job weekly → download MaxMind GeoIP2-City.mmdb + GeoIP2-ASN.mmdb via geoipupdate tool (license key from env). Hot-reload without restart. (2) IP2Proxy: monthly download (if using local DB). (3) TOR: cron every 6h → curl exit-addresses → parse → SADD to Redis set (atomic swap). (4) Health check: verify databases are fresh (age < threshold) in /health endpoint.
- **Критерии готовности (DoD):**
  - [ ] Automatic updates configured and tested
  - [ ] Hot-reload without service restart
  - [ ] /health reports database freshness
  - [ ] Alert if database update fails
- **Оценка:** 4h
- **Story:** [STORY-066]

**[TASK-0231] Тесты IP analysis**
- **Тип:** QA
- **Описание:** (1) Known TOR IP → is_tor=true. (2) AWS IP → is_datacenter=true. (3) Regular residential IP → all false. (4) High abuse score IP → abuse_score > 50. (5) Unknown/private IP → error handled. (6) All checks < 200ms (benchmark). (7) AbuseIPDB API down → partial result with unavailable marker. (8) Cache hit → no API call. (9) GeoIP: US IP → country=US.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Performance benchmark
  - [ ] Known IP datasets for testing
- **Оценка:** 8h
- **Story:** [STORY-066]

---

#### [STORY-067] Верификация email (DNS/SMTP/Disposable/Catch-all)

**Как** Network Admin, **я хочу** чтобы система проверяла email каждого лида на валидность (DNS, SMTP, disposable домены, catch-all), **чтобы** отсеивать мошеннические и несуществующие email-адреса.

**Acceptance Criteria:**
- [ ] AC1: Проверки email: (1) DNS MX record exists, (2) SMTP verification (HELO → MAIL FROM → RCPT TO, без отправки письма), (3) Disposable domain check (10K+ доменов), (4) Catch-all domain detection (RCPT TO random@domain → accept = catch-all), (5) Free email provider detection (gmail, yahoo, hotmail, etc.)
- [ ] AC2: Результат: `{ "email": "user@example.com", "domain": "example.com", "has_mx": true, "is_smtp_valid": true, "is_disposable": false, "is_catch_all": false, "is_free_provider": true, "is_role_account": false, "risk_level": "low", "details": "Valid Gmail address" }`
- [ ] AC3: `is_role_account` — проверка на role-based emails (info@, admin@, support@, etc.) — обычно не реальные пользователи
- [ ] AC4: Все проверки < 200ms (DNS cached, SMTP с timeout 5 sec → если timeout, пометить smtp_check: "timeout", не блокировать)
- [ ] AC5: БЕЗЛИМИТНО: DNS и disposable check полностью локальные. SMTP-check может быть отключен per company (если бизнес-процесс не требует)
- [ ] AC6: SMTP verification respectful: не чаще 1 req/sec per domain (rate limit), правильный EHLO hostname, не отправлять RCPT с невалидным MAIL FROM

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [EPIC-01]

##### Tasks для STORY-067:

**[TASK-0232] Реализовать email verification engine**
- **Тип:** Backend
- **Описание:** Модуль `EmailVerifier`: (1) DNS MX: net.LookupMX с кешем Redis (TTL 1h). (2) Disposable: in-memory HashSet из 10K+ доменов (GitHub list), обновление weekly. (3) SMTP check: dial MX host:25, EHLO, MAIL FROM (valid bounce address), RCPT TO (target email), check response code (250=valid, 550=invalid). Timeout 5 sec per connection. Rate limit: per-domain semaphore (1 concurrent per domain). (4) Catch-all: RCPT TO random-uuid@domain → 250 = catch-all. Cache result per domain (1h). (5) Free provider: HashSet (gmail.com, yahoo.com, etc., 50+ domains). (6) Role account: regex (info, admin, support, sales, noreply, etc.). (7) Parallel execution.
- **Критерии готовности (DoD):**
  - [ ] All 5 checks implemented
  - [ ] DNS cached (Redis 1h)
  - [ ] SMTP rate-limited per domain
  - [ ] Disposable list 10K+ domains
  - [ ] Catch-all detection works
  - [ ] Total < 200ms (with caching)
- **Оценка:** 16h
- **Story:** [STORY-067]

**[TASK-0233] Тесты email verification**
- **Тип:** QA
- **Описание:** (1) Valid Gmail → all pass. (2) Non-existent domain (no MX) → has_mx=false. (3) Disposable (guerrillamail.com) → is_disposable=true. (4) Catch-all domain → is_catch_all=true. (5) Role account (admin@) → is_role_account=true. (6) Free provider (gmail) → is_free_provider=true. (7) SMTP timeout → smtp_check: "timeout", other checks still work. (8) DNS cached → second call < 1ms. (9) Rate limit per domain → no concurrent SMTP to same domain.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Real email domains tested (with SMTP mock for reliability)
- **Оценка:** 8h
- **Story:** [STORY-067]

---

#### [STORY-068] Верификация телефона (VOIP/Line type/Carrier)

**Как** Network Admin, **я хочу** чтобы система проверяла телефон каждого лида на тип линии (mobile/landline/VOIP), определяла оператора, **чтобы** выявлять VOIP-номера и виртуальные телефоны, часто используемые мошенниками.

**Acceptance Criteria:**
- [ ] AC1: Проверки телефона: (1) Line type detection (mobile, landline, VOIP, toll-free, premium), (2) Carrier/operator lookup, (3) VOIP provider detection (Twilio, Google Voice, Skype, etc.), (4) Number portability check (если номер перенесён — к другому оператору)
- [ ] AC2: Результат: `{ "phone": "+79001234567", "country": "RU", "carrier": "MegaFon", "line_type": "mobile", "is_voip": false, "is_ported": false, "risk_level": "low", "details": "Valid Russian mobile (MegaFon)" }`
- [ ] AC3: Провайдеры: Twilio Lookup API (primary, кеш 30 дней), libphonenumber (offline carrier detection как fallback), Numverify API (backup)
- [ ] AC4: БЕЗЛИМИТНО: offline checks (libphonenumber) — unlimited. API checks (Twilio/Numverify) — кешируются по номеру (Redis, TTL 30 дней) для минимизации API costs. Расчёт: при 100K лидов/мес и 80% cache hit → 20K API calls/мес → $10-15 (Twilio Lookup $0.005/call)
- [ ] AC5: При недоступности API: fallback to libphonenumber (менее точный, но работает offline)
- [ ] AC6: Latency: < 100ms (с кешем), < 2 sec (без кеша, API call)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [EPIC-01]

##### Tasks для STORY-068:

**[TASK-0234] Реализовать phone verification engine**
- **Тип:** Backend
- **Описание:** Модуль `PhoneVerifier`: (1) libphonenumber: offline carrier detection, line type guess (mobile vs landline by prefix). Free, unlimited. (2) Twilio Lookup API: `GET /v2/PhoneNumbers/{phone}?Fields=line_type_intelligence,carrier`. Parse response: line_type, carrier_name, is_voip. Cache в Redis: `phone_verify:{hash(phone)}` → result JSON, TTL 30 дней. (3) VOIP provider list: known VOIP ASN/carrier names → is_voip=true. (4) Fallback chain: Redis cache → Twilio API → libphonenumber. (5) Numverify as secondary fallback if Twilio down.
- **Критерии готовности (DoD):**
  - [ ] Twilio integration works
  - [ ] Cache hit → no API call, < 1ms
  - [ ] libphonenumber fallback works
  - [ ] VOIP detection works
  - [ ] Carrier lookup correct for 20+ countries
- **Оценка:** 8h
- **Story:** [STORY-068]

**[TASK-0235] Тесты phone verification**
- **Тип:** QA
- **Описание:** (1) Russian mobile → line_type=mobile, carrier=MegaFon/MTS/etc. (2) Twilio VOIP number → is_voip=true. (3) US landline → line_type=landline. (4) Google Voice number → is_voip=true. (5) Cached number → no API call. (6) Twilio API down → libphonenumber fallback. (7) Invalid number → error graceful. (8) Performance: 100 cached lookups < 100ms.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] API mock for Twilio/Numverify
- **Оценка:** 4h
- **Story:** [STORY-068]

---

#### [STORY-069] Fraud Scoring Engine (composite score 0-100)

**Как** Network Admin, **я хочу** чтобы система рассчитывала composite fraud score (0-100) на основе всех проверок (IP, email, phone), **чтобы** автоматически классифицировать лиды по уровню риска и принимать решения о маршрутизации.

**Acceptance Criteria:**
- [ ] AC1: Fraud score = weighted sum of risk signals: IP checks (weight 40%), Email checks (weight 35%), Phone checks (weight 25%). Configurable weights per company
- [ ] AC2: Scoring rules (default):
  - IP: VPN detected +20, TOR detected +40, Proxy +15, Datacenter +10, Abuse score > 50 +15, GEO mismatch +10
  - Email: Disposable +30, No MX +25, Catch-all +10, Role account +10, SMTP invalid +20
  - Phone: VOIP +25, Invalid format +20, Carrier unknown +10
- [ ] AC3: Final score 0-100: 0-30 = Low risk (green), 31-60 = Medium (yellow), 61-80 = High (orange), 81-100 = Critical (red)
- [ ] AC4: Actions per threshold (configurable per company): score < 30 → auto-accept, 30-60 → accept with flag, 60-80 → manual review queue, > 80 → auto-reject
- [ ] AC5: Score saved in leads.fraud_score (smallint). Full check results saved in `fraud_check_results` (jsonb)
- [ ] AC6: Scoring engine executes all checks in parallel, total < 500ms (IP + Email + Phone)
- [ ] AC7: БЕЗЛИМИТНО: scoring выполняется для КАЖДОГО лида, без ограничений по количеству. Это конкурентное преимущество vs HyperOne (100/2000/4000 checks per month)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [STORY-066], [STORY-067], [STORY-068]

##### Tasks для STORY-069:

**[TASK-0236] Реализовать fraud scoring engine**
- **Тип:** Backend
- **Описание:** Модуль `FraudScorer`: (1) Orchestrator: запускает IPAnalyzer, EmailVerifier, PhoneVerifier параллельно (goroutines). Global timeout 500ms. (2) Score calculation: для каждого check result → apply scoring rules → weighted sum. Configurable scoring rules from `fraud_scoring_config` table (company_id, check, signal, points, weight_category). (3) Default rules seeded from AC2. (4) Final score = Σ(IP_signals × IP_weight + Email_signals × Email_weight + Phone_signals × Phone_weight). Clamp to 0-100. (5) Save to leads.fraud_score + `fraud_check_results` table (lead_id, check_results jsonb, score, risk_level, checked_at). (6) Action resolver: based on company thresholds → set lead status (accepted/flagged/review/rejected).
- **Критерии готовности (DoD):**
  - [ ] All 3 check modules run in parallel
  - [ ] Total < 500ms (benchmark at 10K leads)
  - [ ] Score calculation matches configured rules
  - [ ] Thresholds trigger correct actions
  - [ ] Results saved to DB
  - [ ] UNLIMITED: no per-check counter, no billing
- **Оценка:** 8h
- **Story:** [STORY-069]

**[TASK-0237] Интегрировать fraud scoring в Lead Intake pipeline**
- **Тип:** Backend
- **Описание:** Расширить pipeline: Validate → Normalize → Dedup → **Fraud Check** → Route. Fraud check: (1) Call FraudScorer. (2) Save results. (3) Apply threshold actions. (4) If auto-reject → stop pipeline, return 200 with status=rejected (not 422 — the lead is valid but fraudulent). (5) If manual review → set status=review, don't route (queue for human). (6) If accept with flag → continue routing with fraud_score in lead context. (7) Prometheus: `fraud_score_histogram`, `fraud_check_duration_seconds`, `fraud_auto_rejected_total`.
- **Критерии готовности (DoD):**
  - [ ] Fraud check runs in pipeline for every lead
  - [ ] Auto-reject works at configured threshold
  - [ ] Manual review queue works
  - [ ] Accept-with-flag continues to routing
  - [ ] Prometheus metrics exported
- **Оценка:** 4h
- **Story:** [STORY-069]

**[TASK-0238] Тесты fraud scoring**
- **Тип:** QA
- **Описание:** (1) Clean lead (residential IP, valid email, mobile phone) → score < 30. (2) TOR IP + disposable email → score > 80. (3) VOIP phone + datacenter IP → score 50-80. (4) Custom weights: company changes IP weight to 60% → score changes. (5) Auto-reject: score > 80 → lead rejected. (6) Manual review: score 60-80 → status=review. (7) All checks < 500ms (benchmark). (8) Partial failure: email check timeout → score calculated from IP + phone only. (9) 10,000 leads → all scored without limits.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Load test: 10K leads/min, all scored
  - [ ] Statistical validation: score correlates with known fraud patterns
- **Оценка:** 8h
- **Story:** [STORY-069]

---

#### [STORY-070] Настраиваемые fraud-профили (per GEO/affiliate/broker)

**Как** Network Admin, **я хочу** настраивать разные пороги fraud score для разных GEO, аффилейтов и брокеров, **чтобы** адаптировать чувствительность системы под специфику каждого рынка и партнёра.

**Acceptance Criteria:**
- [ ] AC1: Fraud profiles: набор правил (scoring weights + thresholds), привязанный к условиям. Иерархия: Broker-specific → GEO-specific → Affiliate-specific → Company default. Более специфичный профиль имеет приоритет
- [ ] AC2: Пример: для GEO=NG (Nigeria) → порог reject снижен до 60 (вместо 80 default), для Broker "XM" → reject порог повышен до 90 (более tolerant)
- [ ] AC3: API CRUD: `POST /api/v1/fraud-profiles` — `{ "name": "Nigeria Strict", "conditions": {"geo": ["NG", "GH"]}, "scoring_weights": {...}, "thresholds": {"auto_reject": 60, "manual_review": 40, "accept_flag": 20} }`
- [ ] AC4: Максимум 50 fraud profiles per company
- [ ] AC5: UI: "Fraud Profiles" page — list, create/edit wizard, conditions builder, threshold sliders
- [ ] AC6: При matching нескольких profiles (lead из NG отправленный affiliate X к broker Y) → используется профиль с наивысшим приоритетом (broker > geo > affiliate > default)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-07]
**Зависит от:** [STORY-069]

##### Tasks для STORY-070:

**[TASK-0239] Реализовать fraud profiles engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `fraud_profiles`: id (UUID), company_id (FK), name (varchar 100), conditions (jsonb — {geo: [], affiliate_ids: [], broker_ids: []}), scoring_weights (jsonb — {ip: 0.4, email: 0.35, phone: 0.25}), thresholds (jsonb — {auto_reject: 80, manual_review: 60, accept_flag: 30}), priority (smallint), is_active (bool), created_at. (2) Profile matcher: given lead (geo, affiliate_id, broker_id) → find matching profiles → sort by specificity (broker > geo > affiliate) → return first. (3) CRUD API. (4) Cache profiles in-memory with event-driven invalidation.
- **Критерии готовности (DoD):**
  - [ ] Profile matching works with priority hierarchy
  - [ ] CRUD API works
  - [ ] Max 50 profiles enforced
  - [ ] Cache with invalidation
- **Оценка:** 8h
- **Story:** [STORY-070]

**[TASK-0240] Frontend — fraud profiles management**
- **Тип:** Frontend
- **Описание:** Page "Fraud Profiles": (1) Table: name, conditions summary, thresholds, priority, status. (2) Create wizard: Step 1 — name + conditions builder (GEO multiselect, affiliate multiselect, broker multiselect). Step 2 — scoring weights (sliders, sum=100%). Step 3 — thresholds (sliders: auto_reject, manual_review, accept_flag). (3) Edit/Delete. (4) "Default Profile" — always present, editable but not deletable.
- **Критерии готовности (DoD):**
  - [ ] Wizard creates profiles correctly
  - [ ] Conditions builder intuitive
  - [ ] Threshold sliders work
  - [ ] Default profile always present
- **Оценка:** 8h
- **Story:** [STORY-070]

**[TASK-0241] Тесты fraud profiles**
- **Тип:** QA
- **Описание:** (1) Lead from NG + profile for NG → uses NG profile. (2) Lead from DE + no DE profile → uses default. (3) Lead from NG to broker XM + both profiles exist → broker profile wins. (4) Max 50 profiles. (5) Profile change → next lead uses new profile. (6) Disabled profile → not matched.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-070]

---

#### [STORY-071] Real-time fraud check в pipeline (< 500ms)

**Как** Network Admin, **я хочу** чтобы все fraud-проверки выполнялись inline в pipeline приёма лида за < 500ms, **чтобы** не замедлять процесс приёма трафика и давать мгновенные результаты аффилейту.

**Acceptance Criteria:**
- [ ] AC1: Fraud check выполняется synchronously в lead intake pipeline. Общее время (IP + Email + Phone + Scoring) < 500ms (p95)
- [ ] AC2: При timeout одной из проверок (> 200ms) — проверка прерывается, score считается по доступным данным с пометкой "partial"
- [ ] AC3: Кеширование: IP → 1ч, Email domain MX → 1ч, Email SMTP → 24ч, Phone → 30 дней. При cache hit → < 10ms per check
- [ ] AC4: API response для лида включает fraud info: `{ "id": "uuid", "status": "new", "fraud_score": 42, "fraud_risk": "medium", "fraud_checks_partial": false }`
- [ ] AC5: Configurable: company может отключить real-time fraud check (accept all, check async). Async mode: lead accepted immediately, fraud check runs in background, result appears in 1-2 sec
- [ ] AC6: Prometheus: `fraud_check_duration_seconds` (histogram), `fraud_check_cache_hit_rate` (gauge), `fraud_check_timeout_total`
- [ ] AC7: БЕЗЛИМИТНО: confirmed in load test — 10,000 leads/min, 100% scored, no degradation

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [STORY-069]

##### Tasks для STORY-071:

**[TASK-0242] Оптимизировать fraud pipeline для < 500ms**
- **Тип:** Backend
- **Описание:** (1) Parallel execution: all 3 check modules run concurrently via goroutines. Context with 450ms timeout (50ms buffer for scoring). (2) Cache layer: before each check → Redis GET. Cache hit → skip external call. Cache miss → perform check → cache result. (3) Async mode: if company config `fraud_check_mode = "async"` → return lead immediately, publish check job to Redis queue. Worker picks up, runs checks, updates lead. WebSocket notification when done. (4) Response enrichment: add fraud_score, fraud_risk to lead creation response.
- **Критерии готовности (DoD):**
  - [ ] p95 < 500ms confirmed by benchmark
  - [ ] Cache hit rate > 60% (measured)
  - [ ] Partial results on timeout
  - [ ] Async mode works
  - [ ] Response includes fraud info
- **Оценка:** 8h
- **Story:** [STORY-071]

**[TASK-0243] Load test: 10K leads/min unlimited fraud checks**
- **Тип:** QA
- **Описание:** Load test: (1) Generate 10,000 test leads with diverse IPs, emails, phones. (2) Send via API at rate 10K/min (166/sec). (3) Verify: all leads scored, no 429 from fraud system, no resource exhaustion. (4) Measure: p50/p95/p99 fraud check latency, cache hit rate, API error rate, memory usage, CPU usage. (5) Compare with competitor benchmark: HyperOne allows max 4000 checks/month (Enterprise plan). We process 10K in 1 minute.
- **Критерии готовности (DoD):**
  - [ ] 10K/min sustained for 10 minutes
  - [ ] p95 < 500ms maintained
  - [ ] No errors or degradation
  - [ ] Memory/CPU within acceptable limits
  - [ ] Report with metrics generated
- **Оценка:** 8h
- **Story:** [STORY-071]

---

#### [STORY-072] Provable Anti-Fraud карточка (детальный отчёт)

**Как** Affiliate Manager, **я хочу** видеть детальный отчёт по каждой fraud-проверке лида (какие именно проверки прошёл/не прошёл) и экспортировать его как PDF, **чтобы** использовать как доказательство при спорах с брокерами о качестве трафика.

**Acceptance Criteria:**
- [ ] AC1: В lead detail view секция "Fraud Report": карточка для каждой проверки — IP Analysis (результат каждого check с icon pass/fail/warning), Email Verification (каждый check), Phone Verification (каждый check). Composite score prominently displayed
- [ ] AC2: Каждый check показывает: check name, result (pass/fail/warning), value (e.g., "ISP: MegaFon"), risk contribution (e.g., "+0 points"), timestamp
- [ ] AC3: "Export as PDF" кнопка: генерирует PDF-отчёт с: (1) Lead info (ID, date, affiliate), (2) Summary (score, risk level, verdict), (3) Detailed checks (all results in tables), (4) GambChamp branding + "Verified by GambChamp Anti-Fraud Engine" watermark, (5) Unique report ID + QR code (for verification)
- [ ] AC4: PDF генерируется < 3 sec
- [ ] AC5: Report URL: `GET /api/v1/fraud-reports/{report_id}` — public (with token) for broker verification. Expiry: 90 days
- [ ] AC6: Bulk report: generate PDF for multiple leads (up to 50)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [STORY-069]

##### Tasks для STORY-072:

**[TASK-0244] Реализовать fraud report PDF generator**
- **Тип:** Backend
- **Описание:** (1) PDF generator (wkhtmltopdf или go-pdf library): HTML template → PDF. (2) Template: branded header, lead summary, score gauge graphic, detailed check tables (3 sections: IP, Email, Phone), each check as row (name, result icon, value, points). (3) QR code: encode report verification URL. Unique report_id stored in `fraud_reports` table (id, lead_id, pdf_url, token, expires_at). (4) API `POST /api/v1/leads/{id}/fraud-report` → generate PDF, upload to S3, return URL. (5) Public API `GET /api/v1/fraud-reports/{id}?token={token}` → return PDF (for broker verification). (6) Bulk: `POST /api/v1/fraud-reports/bulk` → generate ZIP with PDFs.
- **Критерии готовности (DoD):**
  - [ ] PDF generates with all check results
  - [ ] QR code works (scanned → verification page)
  - [ ] PDF generation < 3 sec
  - [ ] Public URL with token works
  - [ ] Bulk generation (50 leads) < 60 sec
  - [ ] Branded with GambChamp identity
- **Оценка:** 16h
- **Story:** [STORY-072]

**[TASK-0245] Frontend — fraud report card in lead detail**
- **Тип:** Frontend
- **Описание:** Tab "Fraud Report" in lead detail: (1) Score gauge (circular, colored by risk level). (2) Three sections (collapsible): IP Analysis, Email Verification, Phone Verification. (3) Each check: icon (checkmark green / X red / ! yellow), name, value, points (+N colored). (4) Summary: total score, risk level badge, verdict (accepted/flagged/rejected). (5) "Export PDF" button → loading → download. (6) "Share Report Link" → copy public URL.
- **Критерии готовности (DoD):**
  - [ ] Score gauge renders correctly
  - [ ] All checks displayed with icons
  - [ ] PDF download works
  - [ ] Share link works
- **Оценка:** 8h
- **Story:** [STORY-072]

**[TASK-0246] Тесты fraud report**
- **Тип:** QA
- **Описание:** (1) Generate PDF for scored lead → PDF valid, contains all checks. (2) QR code → links to verification URL. (3) Public URL with token → PDF accessible. (4) Expired URL → 404. (5) Invalid token → 404. (6) Bulk 50 leads → ZIP with 50 PDFs. (7) PDF < 3 sec.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] PDF visual QA (human review of template)
- **Оценка:** 4h
- **Story:** [STORY-072]

---

#### [STORY-073] Fraud Statistics Dashboard

**Как** Network Admin, **я хочу** видеть fraud-статистику в агрегированном виде (fraud rate по аффилейтам, по GEO, по типу проверки), **чтобы** выявлять паттерны мошенничества и принимать стратегические решения.

**Acceptance Criteria:**
- [ ] AC1: Dashboard "Fraud Analytics": KPI cards — Total Fraud Score Avg (today), Fraud Rate (leads with score > 60 / total), Auto-Rejected Count (today), Top Fraud GEO (country with highest avg fraud score)
- [ ] AC2: Charts: (1) Fraud score distribution (histogram, buckets 0-20, 20-40, 40-60, 60-80, 80-100). (2) Fraud rate trend (line chart, last 30 days). (3) Top 10 fraud affiliates (bar chart, by avg fraud score). (4) Top 10 fraud GEOs (bar chart)
- [ ] AC3: Breakdowns: by check type — "IP fraud signals" (VPN rate, TOR rate), "Email fraud signals" (disposable rate, SMTP invalid rate), "Phone fraud signals" (VOIP rate)
- [ ] AC4: Filters: date range, affiliate, GEO, broker
- [ ] AC5: Drill-down: click on affiliate → see their fraud breakdown. Click on GEO → see leads from that GEO sorted by fraud score
- [ ] AC6: Data loads < 2 sec for 100K leads/month volume

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-07]
**Зависит от:** [STORY-069]

##### Tasks для STORY-073:

**[TASK-0247] API для fraud analytics**
- **Тип:** Backend
- **Описание:** API `GET /api/v1/fraud/analytics?period=30d&geo=&affiliate_id=`: (1) KPI aggregation: AVG(fraud_score), COUNT(fraud_score > 60) / COUNT(*), COUNT(status=rejected AND fraud_score > threshold), GEO with MAX(AVG(fraud_score)). (2) Distribution: GROUP BY score bucket, COUNT per bucket. (3) Per-affiliate: GROUP BY affiliate_id, AVG fraud_score, COUNT. (4) Per-GEO: GROUP BY country. (5) Per-check-type: parse fraud_check_results jsonb, aggregate signals (VPN count, disposable count, etc.). (6) Pre-aggregated: cron job every hour aggregates into `fraud_stats_hourly` table for fast queries.
- **Критерии готовности (DoD):**
  - [ ] All KPIs calculated correctly
  - [ ] Distribution histogram data correct
  - [ ] Per-affiliate and per-GEO breakdowns work
  - [ ] Response < 2 sec for 100K leads
  - [ ] Pre-aggregation cron works
- **Оценка:** 8h
- **Story:** [STORY-073]

**[TASK-0248] Frontend — fraud analytics dashboard**
- **Тип:** Frontend
- **Описание:** Page "Fraud Analytics": (1) KPI cards row: 4 cards with numbers + trend arrows. (2) Score distribution histogram (Recharts). (3) Fraud rate trend line chart (30 days). (4) Top 10 affiliates bar chart (horizontal, with fraud rate %). (5) Top 10 GEOs bar chart. (6) Check type breakdown: 3 mini-charts (IP signals, Email signals, Phone signals). (7) Filters: date range, affiliate, GEO. (8) Click on affiliate/GEO → navigate to filtered leads table.
- **Критерии готовности (DoD):**
  - [ ] All charts render < 1 sec
  - [ ] Filters affect all charts
  - [ ] Drill-down navigation works
  - [ ] Responsive layout
- **Оценка:** 16h
- **Story:** [STORY-073]

**[TASK-0249] Тесты fraud analytics**
- **Тип:** QA
- **Описание:** (1) KPI values match manual calculation. (2) Distribution histogram adds up to total. (3) Top 10 affiliates sorted correctly. (4) Date filter changes data. (5) Drill-down navigates to leads table with correct filters. (6) Empty data (no leads) → zeros, no errors.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-073]

---

#### [STORY-074] Whitelist/Blacklist Management

**Как** Network Admin, **я хочу** управлять белыми и чёрными списками (IP, email domain, phone prefix), **чтобы** обходить fraud checks для доверенных источников и автоматически блокировать известных мошенников.

**Acceptance Criteria:**
- [ ] AC1: Whitelist: IP addresses/CIDRs, email domains, phone prefixes. Leads matching whitelist → fraud score = 0 (bypass all checks). Это для known good traffic (internal testing, VIP affiliates)
- [ ] AC2: Blacklist: IP addresses/CIDRs, email domains, phone prefixes. Leads matching blacklist → fraud score = 100, auto-reject. Это для known bad actors
- [ ] AC3: API CRUD: `POST /api/v1/fraud/whitelist` / `POST /api/v1/fraud/blacklist` — entries with type (ip, ip_cidr, email_domain, phone_prefix), value, reason, added_by, expires_at (optional)
- [ ] AC4: UI: "Whitelist/Blacklist" page with tabs, add entry form, bulk import (CSV), search, expire management
- [ ] AC5: Limits: 10,000 whitelist entries, 100,000 blacklist entries per company
- [ ] AC6: Check performance: whitelist/blacklist lookup < 1ms (Redis Sets)
- [ ] AC7: Auto-blacklist: option to auto-add IPs/emails that triggered fraud score > 95 more than 3 times in 24h

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [STORY-069]

##### Tasks для STORY-074:

**[TASK-0250] Реализовать whitelist/blacklist engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `fraud_lists`: id, company_id, list_type (whitelist/blacklist), entry_type (ip, ip_cidr, email_domain, phone_prefix), value (varchar 255), reason (varchar 500), added_by (FK users), expires_at (nullable), is_active (bool), created_at. (2) Redis sync: on change → update Redis Sets: `whitelist:{company_id}:ip`, `blacklist:{company_id}:email_domain`, etc. CIDR → expand to /24 blocks or use custom CIDR matcher. (3) Check in fraud pipeline (before individual checks): if whitelist match → score=0, skip checks. If blacklist match → score=100, reject. (4) Auto-blacklist: cron checks leads with score > 95, groups by IP/email, if count >= 3 in 24h → add to blacklist with reason "Auto-blacklisted". (5) CRUD API with bulk import (CSV upload).
- **Критерии готовности (DoD):**
  - [ ] Whitelist bypass works (score=0)
  - [ ] Blacklist auto-reject works (score=100)
  - [ ] Redis lookup < 1ms
  - [ ] CIDR matching works
  - [ ] Auto-blacklist triggers correctly
  - [ ] Bulk import CSV works
- **Оценка:** 8h
- **Story:** [STORY-074]

**[TASK-0251] Frontend — whitelist/blacklist management**
- **Тип:** Frontend
- **Описание:** Page "Fraud Lists": (1) Tabs: Whitelist / Blacklist. (2) Table: type (icon), value, reason, added by, expires, actions (remove). (3) "Add Entry" form: type dropdown (IP, CIDR, Email Domain, Phone Prefix), value input, reason textarea, expiry date (optional). (4) "Bulk Import" button → CSV upload (type, value, reason per row). (5) Search bar. (6) "Auto-Blacklist" toggle in settings with threshold config.
- **Критерии готовности (DoD):**
  - [ ] Both lists manageable
  - [ ] Bulk import CSV works
  - [ ] Search works
  - [ ] Auto-blacklist toggle works
- **Оценка:** 8h
- **Story:** [STORY-074]

**[TASK-0252] Тесты whitelist/blacklist**
- **Тип:** QA
- **Описание:** (1) Whitelisted IP → score=0, no checks run. (2) Blacklisted email domain → score=100, rejected. (3) CIDR whitelist 10.0.0.0/24 → 10.0.0.5 matches. (4) Expired entry → not matched. (5) Auto-blacklist: 3 leads with score>95 from same IP → IP auto-blacklisted. (6) Bulk import 100 entries → all added. (7) Lookup < 1ms (benchmark).
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-074]

---

#### [STORY-075] Unlimited Fraud Checks — позиционирование и реализация

**Как** Network Admin, **я хочу** быть уверен, что fraud-проверки не имеют ограничений по количеству (в отличие от конкурентов), **чтобы** каждый лид проверялся без исключений и мне не нужно было выбирать, какие лиды проверять.

**Acceptance Criteria:**
- [ ] AC1: В системе НЕТ: счётчика fraud checks, per-check billing, тарифных ограничений на количество проверок. Fraud check = часть pipeline, выполняется для 100% лидов
- [ ] AC2: В UI: badge "Unlimited Anti-Fraud" на dashboard. Tooltip: "All leads are automatically checked. No limits, no extra charges."
- [ ] AC3: Pricing page / marketing: comparison table showing GambChamp unlimited vs HyperOne 100/2000/4000 per month
- [ ] AC4: Technical: no `fraud_checks_remaining` counter, no check-before-check logic, no degradation at high volume
- [ ] AC5: Cost optimization: primary checks use local databases (zero marginal cost). API-based checks (Twilio, AbuseIPDB) are cached aggressively. Cost projection: < $0.001 per lead at 100K leads/month
- [ ] AC6: Performance at scale: stress test 50K leads in 10 min → all scored, p95 < 500ms maintained

**Story Points:** 3
**Приоритет:** Must
**Epic:** [EPIC-07]
**Зависит от:** [STORY-069], [STORY-071]

##### Tasks для STORY-075:

**[TASK-0253] Аудит кода на отсутствие ограничений**
- **Тип:** Backend
- **Описание:** Code review: (1) Verify no fraud_checks_remaining counter anywhere in codebase. (2) Verify no conditional logic that skips fraud checks based on plan/quota. (3) Verify pipeline always calls FraudScorer. (4) Add CI check: grep for "fraud_limit", "checks_remaining", "fraud_quota" — fail if found. (5) Document architecture: explain why unlimited is possible (local DBs, caching, no per-check API cost for primary checks).
- **Критерии готовности (DoD):**
  - [ ] No limiting code found
  - [ ] CI check added
  - [ ] Architecture documented
- **Оценка:** 2h
- **Story:** [STORY-075]

**[TASK-0254] Frontend — "Unlimited Anti-Fraud" badge и comparison**
- **Тип:** Frontend
- **Описание:** (1) Badge "Unlimited Anti-Fraud" on fraud dashboard header (with shield icon). Tooltip: "Every lead is checked. No limits. No extra charges." (2) Stats: "X leads checked today — all of them" (counter). (3) If future pricing page exists: comparison table component showing unlimited vs competitor limits.
- **Критерии готовности (DoD):**
  - [ ] Badge displays on dashboard
  - [ ] Tooltip informative
  - [ ] Counter shows actual checked leads
- **Оценка:** 2h
- **Story:** [STORY-075]

**[TASK-0255] Stress test 50K leads in 10 min**
- **Тип:** QA
- **Описание:** Load test: 50,000 leads in 10 minutes (5,000/min = 83/sec). Verify: (1) All 50K leads scored (0 skipped). (2) p95 latency < 500ms maintained throughout. (3) No OOM, no Redis saturation. (4) Cache hit rate reported. (5) API cost estimation (how many external API calls vs cache hits). Generate report for marketing.
- **Критерии готовности (DoD):**
  - [ ] 50K leads, 100% scored
  - [ ] p95 < 500ms
  - [ ] System stable (no degradation over time)
  - [ ] Report generated with metrics
- **Оценка:** 8h
- **Story:** [STORY-075]

---

### Сводка по EPIC-07

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 10 |
| **Story Points** | 66 (итого) |
| **Must** | 7 stories (45 SP) |
| **Should** | 2 stories (13 SP) |
| **Could** | 1 story (8 SP) |
| **Всего Tasks** | 27 |
| **Backend tasks** | 12 |
| **Frontend tasks** | 6 |
| **QA tasks** | 8 |
| **DevOps tasks** | 1 |
| **Оценка (часы)** | ~196h |

---

## ОБЩАЯ СВОДКА EPIC-02 — EPIC-07

| Epic | Stories | Story Points | Tasks | Estimated Hours |
|------|---------|-------------|-------|----------------|
| EPIC-02 Lead Routing Engine | 13 | 89 | 51 | ~304h |
| EPIC-03 Broker Integration Layer | 10 | 68 | 33 | ~216h |
| EPIC-04 Affiliate Management | 9 | 51 | 28 | ~164h |
| EPIC-05 Lead Management UI | 10 | 60 | 32 | ~216h |
| EPIC-06 User Accounts & RBAC | 11 | 68 | 37 | ~232h |
| EPIC-07 Anti-Fraud System | 10 | 66 | 27 | ~196h |
| **ИТОГО** | **63** | **402** | **208** | **~1,328h** |

**Нумерация:** STORY-013 — STORY-075 (63 stories), TASK-0051 — TASK-0255 (205 tasks)
# PRODUCT BACKLOG P1 (Launch) — EPIC-08 through EPIC-13

**Продукт:** GambChamp CRM — платформа дистрибуции лидов для крипто/форекс affiliate-маркетинга
**Версия:** 1.0
**Дата:** Март 2026
**Нумерация:** Stories начинаются с STORY-076, Tasks с TASK-0256

---

## [EPIC-08] Autologin & Proxy Pipeline

**Цель:** Реализовать полностью автоматическую авторизацию лидов на платформах брокеров через 4-стадийный pipeline (получение credentials → открытие browser session с fingerprint → заполнение формы → верификация логина). Включает управление пулом прокси с GEO-matching, генерацию уникальных device fingerprint, anomaly detection (переиспользование устройства, GEO-несоответствие) и failover-логику при неудачных попытках. Аналог функциональности CRM Mate (autologin на реальных Android-устройствах), но реализованный через headless-браузеры с продвинутым fingerprinting.

**Метрика успеха:**
- Autologin success rate ≥ 85% при первой попытке (p95)
- Время полного pipeline (от получения credentials до подтверждённого логина) < 15 сек (p95)
- Proxy health check latency < 200ms
- GEO-match accuracy: 100% (лид из DE → DE proxy)
- Anomaly detection false positive rate < 1%
- Failover recovery rate ≥ 95% (успешный логин после retry или смены брокера)
- Session recording доступна в течение 72 часов для debugging

**Приоритет:** P1 (Launch)
**Зависит от:** [EPIC-03]
**Оценка:** XL

---

### Stories:

---

#### [STORY-076] 4-стадийный Autologin Pipeline

**Как** Network Admin, **я хочу** чтобы система автоматически авторизовывала лидов на платформах брокеров через 4-стадийный pipeline (credentials → browser session → form fill → verify), **чтобы** лиды мгновенно попадали на торговую платформу брокера без ручной работы.

**Acceptance Criteria:**
- [ ] AC1: Pipeline принимает входные данные от broker API response: `login_url` (URL), `username` (string), `password` (string), `lead_id` (UUID). API endpoint `POST /api/v1/autologin/execute` — ответ HTTP 202 Accepted с `session_id` (UUID) и WebSocket channel для отслеживания прогресса
- [ ] AC2: Стадия 1 (Credentials): валидация входных данных — login_url доступен (HTTP HEAD < 5 сек), username/password не пустые. При невалидных данных → статус `CREDENTIALS_INVALID`, HTTP callback брокеру
- [ ] AC3: Стадия 2 (Browser Session): запуск headless Chromium через Playwright/Puppeteer с уникальным fingerprint (см. STORY-077). Timeout на запуск сессии: 10 сек. При timeout → retry 1 раз, затем статус `SESSION_FAILED`
- [ ] AC4: Стадия 3 (Form Fill): навигация на login_url, автоматический поиск полей username/password (по атрибутам `name`, `id`, `type`, `placeholder` — матчинг по паттернам: login/email/user + password/pass). Заполнение + клик Submit. Timeout на заполнение: 15 сек
- [ ] AC5: Стадия 4 (Verify): проверка успешности логина — определение по: (a) URL redirect на dashboard/cabinet, (b) отсутствие error-элементов на странице, (c) наличие характерных элементов авторизованной зоны. Timeout на верификацию: 10 сек
- [ ] AC6: Общий timeout на весь pipeline: 45 сек. При превышении → статус `PIPELINE_TIMEOUT`
- [ ] AC7: Статусы pipeline: `QUEUED` → `CREDENTIALS_RECEIVED` → `SESSION_STARTED` → `FORM_FILLED` → `LOGIN_VERIFIED` / `LOGIN_FAILED`. Каждая смена статуса отправляется через WebSocket
- [ ] AC8: Concurrent autologin sessions: максимум 50 одновременных сессий per company. При превышении — очередь (FIFO)

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-08]
**Зависит от:** [EPIC-03]

##### Tasks для STORY-076:

**[TASK-0256] Спроектировать архитектуру autologin pipeline**
- **Тип:** Backend
- **Описание:** Спроектировать event-driven pipeline с 4 стадиями. Каждая стадия — отдельный шаг в state machine (QUEUED → CREDENTIALS_RECEIVED → SESSION_STARTED → FORM_FILLED → LOGIN_VERIFIED / LOGIN_FAILED). Использовать Redis для очереди задач и управления concurrency (max 50 sessions per company). Определить gRPC/HTTP контракты между компонентами. Схема БД: таблица `autologin_sessions` (id UUID, lead_id FK, broker_id FK, company_id FK, status enum, stage_timings JSONB, error_details TEXT, created_at, updated_at).
- **Критерии готовности (DoD):**
  - [ ] Архитектурный документ (ADR) утверждён
  - [ ] Миграция БД создана и применена
  - [ ] Redis queue настроен с concurrency limiter
  - [ ] State machine реализован с корректными переходами
- **Оценка:** 8h
- **Story:** [STORY-076]

**[TASK-0257] Реализовать стадию 1 — Credentials Validation**
- **Тип:** Backend
- **Описание:** Сервис валидации credentials: (1) Проверка формата login_url (valid URL, HTTPS), (2) HTTP HEAD запрос к login_url с timeout 5 сек, (3) Проверка username/password не пустые и не содержат управляющих символов. При невалидации — обновление статуса в БД, отправка webhook callback брокеру. Логирование всех валидаций (без паролей — маскировка `***`).
- **Критерии готовности (DoD):**
  - [ ] Валидация URL, username, password реализована
  - [ ] HTTP HEAD проверка с timeout 5 сек работает
  - [ ] Пароли не логируются в plaintext
  - [ ] Невалидные credentials → корректный статус и callback
- **Оценка:** 4h
- **Story:** [STORY-076]

**[TASK-0258] Реализовать стадию 2 — Browser Session Launch**
- **Тип:** Backend
- **Описание:** Интеграция с Playwright (headless Chromium). Запуск browser context с применением fingerprint (из STORY-077) и proxy (из STORY-079). Конфигурация: viewport (случайный из распространённых: 1920x1080, 1366x768, 1440x900), user-agent (из пула актуальных), locale (по GEO лида), timezone (по GEO лида). Timeout на запуск: 10 сек. Retry: 1 попытка с новым proxy при неудаче.
- **Критерии готовности (DoD):**
  - [ ] Browser context запускается с fingerprint и proxy
  - [ ] Viewport, user-agent, locale, timezone устанавливаются корректно
  - [ ] Timeout 10 сек срабатывает, retry работает
  - [ ] Ресурсы (browser instance) освобождаются после завершения
- **Оценка:** 8h
- **Story:** [STORY-076]

**[TASK-0259] Реализовать стадию 3 — Form Detection и Auto-Fill**
- **Тип:** Backend
- **Описание:** Алгоритм поиска login-формы на странице: (1) Найти все `<form>` элементы, (2) В каждой форме найти input[type=text/email] и input[type=password] по атрибутам name/id/placeholder (паттерны: login, email, user, username для логина; password, pass, pwd для пароля), (3) Если формы нет — поиск по shadow DOM. Заполнение: type() с задержкой 50-150ms между символами (имитация человека). Клик Submit: поиск button[type=submit] или input[type=submit]. Fallback: Enter key. Timeout: 15 сек на весь процесс.
- **Критерии готовности (DoD):**
  - [ ] Детекция формы работает на 10+ тестовых broker-платформах
  - [ ] Заполнение с человекоподобной задержкой реализовано
  - [ ] Submit-клик с fallback на Enter работает
  - [ ] Shadow DOM поддерживается
- **Оценка:** 16h
- **Story:** [STORY-076]

**[TASK-0260] Реализовать стадию 4 — Login Verification**
- **Тип:** Backend
- **Описание:** Верификация успешности логина: (1) Ожидание navigation event (URL change) до 10 сек, (2) Проверка URL — не содержит /login, /error, /failed, (3) Поиск error-элементов (class: error, alert-danger; text: wrong password, invalid credentials, etc.), (4) Проверка наличия элементов авторизованной зоны (dashboard, cabinet, balance, deposit). Если 2 из 3 проверок (URL redirect + отсутствие ошибок / наличие dashboard-элементов) positive → LOGIN_VERIFIED.
- **Критерии готовности (DoD):**
  - [ ] Верификация по URL redirect работает
  - [ ] Детекция error-элементов на странице реализована
  - [ ] Детекция dashboard-элементов работает
  - [ ] Комбинированная оценка (2 из 3) корректна
- **Оценка:** 8h
- **Story:** [STORY-076]

**[TASK-0261] WebSocket канал для отслеживания прогресса pipeline**
- **Тип:** Backend
- **Описание:** WebSocket endpoint `ws://.../autologin/sessions/{session_id}/progress`. При каждой смене стадии pipeline отправляется JSON: `{stage: string, status: string, timestamp: ISO8601, details: object}`. Аутентификация через JWT token в query parameter. Auto-close при завершении pipeline. Heartbeat каждые 30 сек.
- **Критерии готовности (DoD):**
  - [ ] WebSocket подключение с JWT аутентификацией работает
  - [ ] Все смены стадий транслируются клиенту
  - [ ] Heartbeat и auto-close реализованы
  - [ ] Reconnect logic на клиенте работает
- **Оценка:** 4h
- **Story:** [STORY-076]

**[TASK-0262] Frontend — запуск и мониторинг autologin**
- **Тип:** Frontend
- **Описание:** UI компонент для мониторинга autologin: (1) Кнопка "Autologin" на карточке лида (если broker поддерживает), (2) Progress indicator с 4 стадиями (stepper), (3) Статус текущей стадии в реальном времени (WebSocket), (4) Результат: успех (зелёная галочка + redirect URL) или ошибка (красный крест + описание). (5) Batch autologin для множества лидов одновременно.
- **Критерии готовности (DoD):**
  - [ ] Кнопка Autologin отображается для брокеров с поддержкой
  - [ ] Stepper показывает прогресс в реальном времени
  - [ ] Ошибки отображаются с понятным описанием
  - [ ] Batch mode позволяет выбрать множество лидов
- **Оценка:** 8h
- **Story:** [STORY-076]

**[TASK-0263] E2E тесты autologin pipeline**
- **Тип:** QA
- **Описание:** (1) Полный pipeline с mock broker login page → LOGIN_VERIFIED. (2) Невалидный login_url → CREDENTIALS_INVALID. (3) Timeout на browser launch → retry → success. (4) Неизвестная форма (нет стандартных полей) → FORM_DETECTION_FAILED. (5) Неверные credentials (error на странице) → LOGIN_FAILED. (6) Concurrent sessions > 50 → очередь, FIFO порядок. (7) Общий timeout 45 сек → PIPELINE_TIMEOUT. (8) WebSocket доставляет все стадии.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов написаны и проходят
  - [ ] Mock broker login page создан для тестов
  - [ ] Тесты стабильны (не flaky) на CI
- **Оценка:** 8h
- **Story:** [STORY-076]

---

#### [STORY-077] Генерация уникальных Device Fingerprint

**Как** Network Admin, **я хочу** чтобы каждый autologin-сеанс использовал уникальный device fingerprint (WebGL, Canvas, аудио, шрифты, screen resolution), **чтобы** брокерские anti-fraud системы не определяли автоматическую авторизацию и не блокировали лидов.

**Acceptance Criteria:**
- [ ] AC1: Каждый fingerprint включает: WebGL renderer/vendor (из пула 50+ реальных комбинаций), Canvas hash (уникальный per session), AudioContext fingerprint, список шрифтов (из пула 200+ комбинаций), screen resolution + color depth, navigator.plugins (реалистичный набор), navigator.languages (по GEO лида)
- [ ] AC2: Fingerprint генерируется детерминированно по seed = hash(lead_id + broker_id + timestamp) — один и тот же лид на одном брокере получает одинаковый fingerprint в течение 24 часов (для повторных попыток)
- [ ] AC3: Fingerprint injection в browser context через Playwright page.addInitScript() — перехват Canvas.toDataURL(), WebGLRenderingContext.getParameter(), AudioContext.createOscillator() и т.д.
- [ ] AC4: Валидация fingerprint через внешние сервисы (CreepJS, BrowserLeaks) — детекция автоматизации < 5% (тестируется при релизе)
- [ ] AC5: Пул fingerprint-данных обновляется ежемесячно (user-agent strings, WebGL renderers, популярные screen resolutions)
- [ ] AC6: API `GET /api/v1/autologin/fingerprints/stats` возвращает: количество уникальных fingerprints за период, повторное использование (должно быть 0 для разных лидов)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-08]
**Зависит от:** —

##### Tasks для STORY-077:

**[TASK-0264] Разработать fingerprint generation engine**
- **Тип:** Backend
- **Описание:** Go-сервис генерации fingerprint. Входные данные: lead_id, broker_id, geo, timestamp. Алгоритм: (1) seed = SHA256(lead_id + broker_id + floor(timestamp / 86400)), (2) PRNG на основе seed для детерминированного выбора из пулов, (3) Выбор WebGL renderer/vendor из пула (привязка к OS — NVIDIA для Windows, Apple для macOS), (4) Генерация Canvas noise parameters, (5) Выбор шрифтов (привязка к OS + GEO), (6) Screen resolution + color depth (привязка к популярным в данном GEO). Результат: JSON-объект fingerprint.
- **Критерии готовности (DoD):**
  - [ ] Детерминированная генерация: один seed → один fingerprint
  - [ ] Привязка к OS и GEO реалистична
  - [ ] Пул данных содержит 50+ WebGL, 200+ шрифтов, 20+ resolutions
  - [ ] Benchmark: генерация < 5ms
- **Оценка:** 16h
- **Story:** [STORY-077]

**[TASK-0265] Реализовать fingerprint injection в browser context**
- **Тип:** Backend
- **Описание:** Playwright addInitScript() скрипт, который перехватывает: (1) HTMLCanvasElement.prototype.toDataURL — добавляет noise к canvas data, (2) WebGLRenderingContext.getParameter — подменяет RENDERER, VENDOR, (3) AudioContext — модифицирует frequency response, (4) navigator.plugins — инжектирует реалистичный набор, (5) navigator.languages — устанавливает по GEO, (6) screen.width/height/colorDepth — подменяет значения. Скрипт должен быть неотличим от реального браузера (Object.getOwnPropertyDescriptor не выдаёт proxy).
- **Критерии готовности (DoD):**
  - [ ] Все 6 точек перехвата работают
  - [ ] Object.getOwnPropertyDescriptor возвращает native function
  - [ ] Fingerprint устойчив к CreepJS detection (manual test)
  - [ ] Скрипт не ломает работу целевых страниц
- **Оценка:** 16h
- **Story:** [STORY-077]

**[TASK-0266] Создать и поддерживать пулы fingerprint-данных**
- **Тип:** Backend
- **Описание:** JSON-файлы с пулами: (1) `webgl_renderers.json` — 50+ реальных комбинаций renderer/vendor с привязкой к OS, (2) `fonts.json` — 200+ комбинаций шрифтов по OS и GEO, (3) `user_agents.json` — 100+ актуальных UA strings по браузерам и OS, (4) `screen_resolutions.json` — 20+ популярных resolutions с market share. Скрипт автоматического обновления из открытых источников (StatCounter, CanIUse). Версионирование пулов.
- **Критерии готовности (DoD):**
  - [ ] Все 4 пула созданы с минимальным количеством записей
  - [ ] Скрипт обновления работает
  - [ ] Версионирование (дата обновления в JSON)
- **Оценка:** 8h
- **Story:** [STORY-077]

**[TASK-0267] Тесты fingerprint generation**
- **Тип:** QA
- **Описание:** (1) Детерминированность: один seed → идентичный fingerprint. (2) Уникальность: разные lead_id → разные fingerprints (проверить 1000 генераций, 0 коллизий). (3) GEO-привязка: DE лид → немецкие шрифты, DE languages. (4) OS-привязка: Windows → NVIDIA renderers. (5) Пул coverage: все записи из пула используются (статистический тест на 10000 генераций). (6) Injection test: запуск Playwright с fingerprint → проверка через JS что Canvas, WebGL, navigator отдают подменённые значения.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Injection тест в реальном Playwright работает
- **Оценка:** 8h
- **Story:** [STORY-077]

---

#### [STORY-078] Управление пулом прокси (Proxy Pool Management)

**Как** Network Admin, **я хочу** управлять пулом прокси-серверов (добавлять, удалять, проверять здоровье, задавать тип и GEO), **чтобы** autologin-сессии использовали качественные прокси, соответствующие географии лида.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/proxies` добавляет прокси: `host` (string), `port` (int), `username` (string, optional), `password` (string, optional), `type` (enum: `residential`, `datacenter`, `mobile`), `geo` (ISO 3166-1 alpha-2), `provider` (string, optional). Batch добавление: до 100 прокси за один запрос. Ответ HTTP 201
- [ ] AC2: API `GET /api/v1/proxies` — список с фильтрами: type, geo, status (active/unhealthy/disabled), provider. Пагинация cursor-based
- [ ] AC3: API `DELETE /api/v1/proxies/{id}` — удаление. Нельзя удалить прокси, используемый в активной autologin-сессии → HTTP 409
- [ ] AC4: Health check каждого прокси каждые 5 минут: (a) TCP connect < 2 сек, (b) HTTP request через прокси к test endpoint < 5 сек, (c) Проверка реального IP-адреса (GEO match). При 3 неудачных health check подряд → статус `unhealthy`, уведомление в Telegram
- [ ] AC5: Dashboard: общее количество прокси, breakdown по типу/GEO/статусу, latency percentiles (p50, p95, p99), uptime за 24h/7d/30d
- [ ] AC6: Максимум 10,000 прокси per company
- [ ] AC7: Импорт прокси из CSV/TXT файла (формат: host:port:username:password per line)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-08]
**Зависит от:** —

##### Tasks для STORY-078:

**[TASK-0268] Схема БД и CRUD API для прокси**
- **Тип:** Backend
- **Описание:** Таблица `proxies`: id (UUID), company_id (FK), host (varchar 255), port (int), username (varchar 100, nullable, encrypted), password (varchar 100, nullable, encrypted), type (enum: residential, datacenter, mobile), geo (char 2), provider (varchar 100, nullable), status (enum: active, unhealthy, disabled), last_health_check (timestamptz), avg_latency_ms (int), uptime_percent (decimal 5,2), created_at, updated_at. Индексы: (company_id, geo, type, status), (company_id, status). CRUD endpoints с валидацией и batch insert.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана, credentials зашифрованы (AES-256)
  - [ ] CRUD API работает с валидацией
  - [ ] Batch insert до 100 записей за запрос
  - [ ] Лимит 10,000 прокси проверяется
- **Оценка:** 8h
- **Story:** [STORY-078]

**[TASK-0269] Health check сервис для прокси**
- **Тип:** Backend
- **Описание:** Фоновый сервис (goroutine pool, 20 concurrent checks). Каждые 5 минут: (1) TCP connect к host:port с timeout 2 сек, (2) HTTP GET через прокси к https://api.ipify.org с timeout 5 сек, (3) GeoIP lookup ответа — сравнение с заявленным GEO. При 3 неудачах подряд: status = unhealthy, отправка уведомления через notification service. Метрики: avg_latency_ms, uptime_percent (скользящее окно 30 дней). Результат health check записывается в таблицу `proxy_health_logs`.
- **Критерии готовности (DoD):**
  - [ ] Health check выполняется каждые 5 минут
  - [ ] 3 неудачи → unhealthy + уведомление
  - [ ] GEO validation работает
  - [ ] Метрики latency и uptime обновляются
- **Оценка:** 8h
- **Story:** [STORY-078]

**[TASK-0270] Импорт прокси из CSV/TXT**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/proxies/import` принимает multipart/form-data с файлом. Парсинг форматов: (1) host:port, (2) host:port:user:pass, (3) CSV с заголовками. Параметры в body: type (enum), geo (char 2), provider (string). Валидация каждой строки. Ответ: `{imported: N, failed: N, errors: [{line: N, error: string}]}`. Максимум 1000 строк в файле.
- **Критерии готовности (DoD):**
  - [ ] Парсинг 3 форматов работает
  - [ ] Валидация строк с детальными ошибками
  - [ ] Лимит 1000 строк проверяется
  - [ ] Ответ содержит статистику импорта
- **Оценка:** 4h
- **Story:** [STORY-078]

**[TASK-0271] Frontend — управление прокси**
- **Тип:** Frontend
- **Описание:** Страница "Proxy Pool": (1) Таблица прокси: host:port, type (badge), GEO (флаг + код), status (цветовой индикатор), latency, uptime, provider, last check. (2) Кнопки: Add Proxy (форма), Import (upload файла), Delete selected. (3) Фильтры: type, geo, status, provider. (4) Bulk actions: enable/disable selected. (5) Dashboard-карточки наверху: total proxies, active %, avg latency, unhealthy count.
- **Критерии готовности (DoD):**
  - [ ] Таблица с фильтрами и пагинацией работает
  - [ ] Добавление через форму и импорт файла работают
  - [ ] Dashboard-карточки отображают актуальные данные
  - [ ] Bulk enable/disable работает
- **Оценка:** 8h
- **Story:** [STORY-078]

**[TASK-0272] Тесты proxy pool management**
- **Тип:** QA
- **Описание:** (1) CRUD прокси — создание, чтение, обновление, удаление. (2) Batch insert 100 прокси → 201. (3) Import CSV с 3 форматами → корректный результат. (4) Удаление прокси в активной сессии → 409. (5) Health check: healthy proxy → active, 3 fails → unhealthy. (6) GEO mismatch в health check → unhealthy. (7) Лимит 10,000 → 422. (8) Multi-tenant: другая company → 404.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Integration тесты с реальным proxy mock
- **Оценка:** 4h
- **Story:** [STORY-078]

---

#### [STORY-079] GEO-matched Proxy Selection

**Как** Network Admin, **я хочу** чтобы система автоматически выбирала прокси из той же страны, что и лид, **чтобы** IP-адрес при autologin соответствовал географии лида и не вызывал подозрений у anti-fraud систем брокера.

**Acceptance Criteria:**
- [ ] AC1: При выборе прокси для autologin-сессии: (1) фильтр по GEO лида, (2) из отфильтрованных — только status=active, (3) сортировка по latency ASC, (4) round-robin среди top-10 по latency для равномерной нагрузки
- [ ] AC2: Fallback стратегия: если нет прокси для exact GEO → (a) прокси из того же региона (DE → EU), (b) любой residential прокси. Каждый fallback логируется с warning
- [ ] AC3: Sticky session: один лид на одном брокере использует один и тот же прокси в течение 24 часов (для consistency при retry). Key: hash(lead_id + broker_id)
- [ ] AC4: Прокси не назначается, если он уже используется в 5+ concurrent сессиях (overload protection)
- [ ] AC5: API `GET /api/v1/proxies/coverage` — карта покрытия: список GEO с количеством active прокси в каждом. Предупреждение если coverage < 3 прокси для GEO с активным трафиком
- [ ] AC6: Время выбора прокси < 10ms (p99)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-08]
**Зависит от:** [STORY-078]

##### Tasks для STORY-079:

**[TASK-0273] Реализовать алгоритм GEO-matched proxy selection**
- **Тип:** Backend
- **Описание:** Go-сервис выбора прокси: (1) Redis-кэш активных прокси по GEO (обновляется при health check), (2) Алгоритм: exact GEO → region fallback → any residential, (3) Round-robin среди top-10 по latency (Redis counter per proxy), (4) Sticky session: Redis key `proxy_sticky:{lead_id}:{broker_id}` с TTL 24h, (5) Concurrent session counter: Redis INCR/DECR, проверка < 5. Benchmark: < 10ms p99.
- **Критерии готовности (DoD):**
  - [ ] GEO-match с fallback работает корректно
  - [ ] Round-robin равномерно распределяет нагрузку
  - [ ] Sticky session сохраняется 24 часа
  - [ ] Overload protection (max 5 concurrent) работает
  - [ ] Benchmark < 10ms p99 пройден
- **Оценка:** 8h
- **Story:** [STORY-079]

**[TASK-0274] API coverage map и предупреждения**
- **Тип:** Backend
- **Описание:** Endpoint `GET /api/v1/proxies/coverage` — возвращает массив `[{geo: "DE", active_count: 15, residential: 10, datacenter: 5, avg_latency: 120}]`. Отдельный cron-job каждый час: для каждого GEO с трафиком за последние 24h проверить количество active прокси. Если < 3 → создать alert (notification service) с severity=warning.
- **Критерии готовности (DoD):**
  - [ ] Coverage API возвращает корректные данные
  - [ ] Cron-job проверяет coverage и создаёт alerts
  - [ ] Alerts отправляются через notification service
- **Оценка:** 4h
- **Story:** [STORY-079]

**[TASK-0275] Тесты GEO-matched proxy selection**
- **Тип:** QA
- **Описание:** (1) Лид из DE → прокси из DE. (2) Нет прокси в DE → прокси из EU. (3) Нет прокси в EU → residential из любого GEO + warning. (4) Sticky session: повторный запрос за 24h → тот же прокси. (5) 5 concurrent → следующая сессия получает другой прокси. (6) Производительность: 1000 запросов → p99 < 10ms.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Performance test на 1000 запросов пройден
- **Оценка:** 4h
- **Story:** [STORY-079]

---

#### [STORY-080] Anomaly Detection для Autologin

**Как** Network Admin, **я хочу** чтобы система обнаруживала аномалии (переиспользование device fingerprint, несоответствие GEO между лидом и прокси, подозрительные паттерны), **чтобы** предотвратить блокировки лидов на стороне брокера и обнаружить потенциальный фрод.

**Acceptance Criteria:**
- [ ] AC1: Детекция device fingerprint reuse: если fingerprint (Canvas + WebGL hash) совпадает для разных lead_id → alert с severity=high. Проверка по базе за последние 30 дней
- [ ] AC2: Детекция GEO mismatch: если GEO прокси (по реальному IP) не совпадает с GEO лида → alert + block autologin session до manual review
- [ ] AC3: Детекция velocity anomaly: если с одного прокси-IP выполнено > 10 autologin за 1 час → alert + throttle (увеличить интервал до 5 мин между сессиями)
- [ ] AC4: Детекция timing anomaly: если form fill занял < 500ms (слишком быстро для человека) → пересчитать задержки и повторить
- [ ] AC5: Все аномалии записываются в таблицу `autologin_anomalies` с полями: type, severity, session_id, details (JSONB), resolved (bool), resolved_by, resolved_at
- [ ] AC6: API `GET /api/v1/autologin/anomalies` — список аномалий с фильтрами (type, severity, resolved). Rate: false positive < 1% на выборке 1000+ сессий
- [ ] AC7: Порог срабатывания настраивается per company через `PUT /api/v1/autologin/anomaly-settings`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-08]
**Зависит от:** [STORY-076], [STORY-077]

##### Tasks для STORY-080:

**[TASK-0276] Реализовать anomaly detection engine**
- **Тип:** Backend
- **Описание:** Go-сервис, обрабатывающий события autologin pipeline (через Redis pub/sub). Правила: (1) Fingerprint reuse: Bloom filter для быстрой проверки + точная проверка в PostgreSQL при positive, (2) GEO mismatch: GeoIP lookup реального IP прокси vs lead.geo, (3) Velocity: Redis sliding window counter per proxy IP, (4) Timing: проверка stage_timings из pipeline. Настройки порогов хранятся в Redis с fallback на defaults. При срабатывании — запись в `autologin_anomalies` + уведомление.
- **Критерии готовности (DoD):**
  - [ ] 4 типа аномалий детектируются корректно
  - [ ] Bloom filter обеспечивает O(1) проверку fingerprint
  - [ ] Настраиваемые пороги работают per company
  - [ ] False positive rate < 1% на тестовых данных
- **Оценка:** 16h
- **Story:** [STORY-080]

**[TASK-0277] API и Frontend для anomaly management**
- **Тип:** Frontend
- **Описание:** (1) API: GET /api/v1/autologin/anomalies с фильтрами, PUT /api/v1/autologin/anomalies/{id}/resolve. (2) UI: таблица аномалий с колонками: type (badge), severity (цвет), session link, details, timestamp, resolved. Фильтры. Кнопка "Resolve" с комментарием. (3) Настройки порогов: форма с полями (velocity threshold, timing threshold и т.д.) per company.
- **Критерии готовности (DoD):**
  - [ ] API с фильтрами и resolve работает
  - [ ] Таблица аномалий отображается корректно
  - [ ] Настройки порогов сохраняются и применяются
- **Оценка:** 8h
- **Story:** [STORY-080]

**[TASK-0278] Тесты anomaly detection**
- **Тип:** QA
- **Описание:** (1) Fingerprint reuse: два лида с одним fingerprint → alert. (2) GEO mismatch: DE лид + US proxy → alert + block. (3) Velocity: 11 сессий с одного IP за 1 час → alert + throttle. (4) Timing: form fill 200ms → пересчёт задержек. (5) Custom пороги: изменить velocity threshold на 20 → срабатывание на 21. (6) Resolve workflow: resolve anomaly → resolved=true. (7) False positive test: 1000 нормальных сессий → 0 аномалий.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] False positive test на 1000 сессий пройден
- **Оценка:** 4h
- **Story:** [STORY-080]

---

#### [STORY-081] Failover и Retry логика для Autologin

**Как** Network Admin, **я хочу** чтобы при неудачном autologin система автоматически повторяла попытку (с новым прокси или fingerprint), а при исчерпании попыток — перенаправляла лида другому брокеру, **чтобы** максимизировать success rate и не терять лидов.

**Acceptance Criteria:**
- [ ] AC1: При LOGIN_FAILED — автоматический retry: (1) смена прокси (другой IP, тот же GEO), (2) пересоздание fingerprint (новый seed с timestamp), (3) увеличение задержек form fill на 50%. Максимум 3 retry
- [ ] AC2: Между retry — задержка с exponential backoff: 5 сек, 15 сек, 45 сек
- [ ] AC3: Если 3 retry неудачны → failover: перенаправление лида другому брокеру из того же routing flow (через Routing Engine EPIC-02). Новый брокер выбирается по приоритету, исключая текущего
- [ ] AC4: Failover логируется с причиной: `{original_broker, attempts: 3, errors: [...], failover_broker, result}`
- [ ] AC5: API `GET /api/v1/autologin/sessions/{id}/attempts` — история всех попыток для сессии: номер попытки, прокси, fingerprint hash, результат, время, ошибка
- [ ] AC6: Настройки retry per broker: max_retries (1-5, default 3), backoff_multiplier (1-10, default 3), failover_enabled (bool, default true)
- [ ] AC7: Circuit breaker per broker: если success rate < 30% за последние 50 сессий → остановить отправку на этого брокера + alert

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-08]
**Зависит от:** [STORY-076], [EPIC-02]

##### Tasks для STORY-081:

**[TASK-0279] Реализовать retry engine с exponential backoff**
- **Тип:** Backend
- **Описание:** При получении LOGIN_FAILED: (1) Проверить retry count < max_retries (настройка per broker), (2) Рассчитать задержку: base_delay * backoff_multiplier^attempt (5s, 15s, 45s при multiplier=3), (3) Запланировать retry в Redis delayed queue, (4) При retry: новый прокси (другой IP, тот же GEO), новый fingerprint seed, увеличенные задержки form fill. Таблица `autologin_attempts`: session_id, attempt_number, proxy_id, fingerprint_hash, status, error, duration_ms, created_at.
- **Критерии готовности (DoD):**
  - [ ] Retry выполняется с exponential backoff
  - [ ] Новый прокси и fingerprint при каждом retry
  - [ ] Max retries настраивается per broker
  - [ ] Все попытки записываются в autologin_attempts
- **Оценка:** 8h
- **Story:** [STORY-081]

**[TASK-0280] Реализовать failover к альтернативному брокеру**
- **Тип:** Backend
- **Описание:** После исчерпания retry: (1) Вызов Routing Engine API для получения alternative broker (исключая текущего), (2) Создание новой autologin_session для нового брокера, (3) Запуск pipeline для нового брокера. Failover log: JSON в таблице autologin_sessions с полной историей. Настройка failover_enabled per broker.
- **Критерии готовности (DoD):**
  - [ ] Failover запрашивает альтернативного брокера через Routing Engine
  - [ ] Новая сессия создаётся и запускается
  - [ ] Failover log содержит полную историю
  - [ ] failover_enabled=false → нет failover, статус FINAL_FAILED
- **Оценка:** 8h
- **Story:** [STORY-081]

**[TASK-0281] Circuit breaker per broker**
- **Тип:** Backend
- **Описание:** Redis sliding window: последние 50 autologin sessions per broker. Если success rate < 30% → (1) Установить broker autologin_status = `circuit_open`, (2) Остановить новые autologin для этого брокера, (3) Alert через notification service, (4) Автоматический half-open через 30 минут: пропускать 1 из 10 сессий для проверки. При 3 успехах подряд в half-open → circuit_closed.
- **Критерии готовности (DoD):**
  - [ ] Circuit breaker открывается при success rate < 30%
  - [ ] Новые сессии блокируются при open circuit
  - [ ] Half-open через 30 минут работает
  - [ ] Recovery до closed при 3 успехах
- **Оценка:** 8h
- **Story:** [STORY-081]

**[TASK-0282] Тесты failover и retry**
- **Тип:** QA
- **Описание:** (1) Retry 3 раза с разными proxy → success на 2-й попытке. (2) Retry 3 раза → все failed → failover к другому брокеру → success. (3) Exponential backoff: проверить задержки 5s, 15s, 45s. (4) failover_enabled=false → FINAL_FAILED после 3 retry. (5) Circuit breaker: 35 fails из 50 → open → block. (6) Half-open → 3 success → closed. (7) Concurrent failovers: 10 одновременных → все корректно обработаны.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Timing тесты корректны (backoff)
- **Оценка:** 4h
- **Story:** [STORY-081]

---

#### [STORY-082] Мониторинг Autologin Dashboard

**Как** Network Admin, **я хочу** видеть dashboard с метриками autologin (success rate per broker, среднее время pipeline, количество anomalies, статус circuit breakers), **чтобы** контролировать качество autologin и быстро реагировать на проблемы.

**Acceptance Criteria:**
- [ ] AC1: KPI-карточки (обновление каждые 30 сек через WebSocket): total sessions today, success rate %, avg pipeline time, active sessions now, anomalies today, circuit breakers open
- [ ] AC2: Таблица "Success Rate per Broker": broker name, sessions today, success rate (цветовой индикатор: зелёный >85%, жёлтый 60-85%, красный <60%), avg time, circuit breaker status
- [ ] AC3: Time-series график: autologin sessions per hour за последние 24h, линии success/failed/retry
- [ ] AC4: Breakdown по стадиям pipeline: % сессий, завершившихся на каждой стадии (credentials → session → form → verify). Позволяет определить bottleneck
- [ ] AC5: Фильтры: broker, GEO, date range. Данные обновляются без перезагрузки страницы
- [ ] AC6: Загрузка dashboard < 2 сек, обновление через WebSocket < 500ms

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-08]
**Зависит от:** [STORY-076], [STORY-081]

##### Tasks для STORY-082:

**[TASK-0283] Backend API для autologin analytics**
- **Тип:** Backend
- **Описание:** Endpoints: (1) `GET /api/v1/autologin/dashboard/kpis` — агрегации за сегодня (total, success_rate, avg_time, active_now, anomalies, open_circuits), (2) `GET /api/v1/autologin/dashboard/brokers` — per-broker metrics, (3) `GET /api/v1/autologin/dashboard/timeseries?period=24h&interval=1h` — временные ряды, (4) `GET /api/v1/autologin/dashboard/stages` — breakdown по стадиям. ClickHouse для analytics queries. WebSocket для real-time KPIs.
- **Критерии готовности (DoD):**
  - [ ] 4 API endpoints возвращают корректные данные
  - [ ] ClickHouse queries оптимизированы (< 500ms)
  - [ ] WebSocket обновления каждые 30 сек
- **Оценка:** 8h
- **Story:** [STORY-082]

**[TASK-0284] Frontend — Autologin Monitoring Dashboard**
- **Тип:** Frontend
- **Описание:** Страница "Autologin Monitor": (1) 6 KPI-карточек наверху с анимацией при обновлении, (2) Таблица per-broker с сортировкой и цветовыми индикаторами, (3) Line chart (Recharts/Chart.js) для time-series, (4) Funnel chart для breakdown по стадиям, (5) Фильтры broker/GEO/date range. Auto-refresh через WebSocket.
- **Критерии готовности (DoD):**
  - [ ] Все 4 секции dashboard отображаются корректно
  - [ ] Real-time обновление через WebSocket работает
  - [ ] Фильтры применяются без перезагрузки
  - [ ] Загрузка < 2 сек
- **Оценка:** 8h
- **Story:** [STORY-082]

**[TASK-0285] Тесты autologin dashboard**
- **Тип:** QA
- **Описание:** (1) KPI-карточки: данные совпадают с сырыми данными в БД. (2) Per-broker таблица: цветовые индикаторы корректны (>85% зелёный). (3) Time-series: данные за 24h отображаются, zoom работает. (4) Фильтры: broker filter → данные обновляются. (5) Empty state: нет сессий → корректное сообщение. (6) WebSocket: обновление отображается без перезагрузки.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Тесты с mock данными в ClickHouse
- **Оценка:** 4h
- **Story:** [STORY-082]

---

#### [STORY-083] Session Recording для Debugging

**Как** Network Admin, **я хочу** просматривать запись autologin-сессии (скриншоты и действия на каждом шаге), **чтобы** диагностировать причины неудачных autologin и оптимизировать form detection.

**Acceptance Criteria:**
- [ ] AC1: При каждой autologin-сессии сохраняются скриншоты: (a) после загрузки login_url, (b) после заполнения формы (перед Submit), (c) после Submit (результат). Формат: PNG, max 1280x720, сжатие до 200KB per screenshot
- [ ] AC2: Помимо скриншотов — лог действий: `[{timestamp, action: "navigate", url: "..."}, {timestamp, action: "fill", selector: "#email", value: "j***@example.com"}, {timestamp, action: "click", selector: "button[type=submit]"}]`. Значения маскируются (email → j***@, password → ***)
- [ ] AC3: Хранение записей: 72 часа для неудачных сессий, 24 часа для успешных. Автоматическая очистка по cron
- [ ] AC4: API `GET /api/v1/autologin/sessions/{id}/recording` — возвращает: screenshots (URLs), action_log (JSON array), stage_timings
- [ ] AC5: Frontend: timeline view — слева скриншоты, справа action log с timestamps. Кликабельные стадии pipeline
- [ ] AC6: Максимум 10 concurrent session recordings (для экономии ресурсов). Остальные — только action log без screenshots

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-08]
**Зависит от:** [STORY-076]

##### Tasks для STORY-083:

**[TASK-0286] Реализовать screenshot capture в pipeline**
- **Тип:** Backend
- **Описание:** В каждой стадии pipeline (после navigate, после fill, после submit): (1) Playwright page.screenshot({type: 'png', fullPage: false}), (2) Resize до 1280x720, (3) Сжатие до < 200KB (libvips/sharp), (4) Upload в S3-совместимое хранилище (MinIO/S3), (5) Сохранить URL в таблицу `autologin_recordings` (session_id, stage, screenshot_url, action_log JSONB, created_at). Concurrent recording limiter: семафор на 10.
- **Критерии готовности (DoD):**
  - [ ] Скриншоты снимаются на 3 стадиях
  - [ ] Resize и сжатие до 200KB работают
  - [ ] Upload в S3 работает
  - [ ] Лимит 10 concurrent recordings соблюдается
- **Оценка:** 8h
- **Story:** [STORY-083]

**[TASK-0287] Action log и маскировка данных**
- **Тип:** Backend
- **Описание:** Interceptor для всех Playwright действий: navigate, fill, click, waitForSelector. Каждое действие записывается в JSON array: `{timestamp, action, selector, value (masked), duration_ms}`. Маскировка: email → первая буква + *** + @domain, password → ***, phone → +XX***XXXX. Лог сохраняется в таблицу `autologin_recordings`.
- **Критерии готовности (DoD):**
  - [ ] Все действия Playwright логируются
  - [ ] Маскировка email, password, phone работает
  - [ ] JSON структура валидна
- **Оценка:** 4h
- **Story:** [STORY-083]

**[TASK-0288] Автоматическая очистка старых записей**
- **Тип:** DevOps
- **Описание:** Cron-job каждые 6 часов: (1) Удалить записи успешных сессий старше 24h, (2) Удалить записи неудачных сессий старше 72h, (3) Удалить соответствующие файлы из S3. Логирование: количество удалённых записей и освобождённое место.
- **Критерии готовности (DoD):**
  - [ ] Cron-job работает по расписанию
  - [ ] Записи и файлы S3 удаляются корректно
  - [ ] Лог очистки записывается
- **Оценка:** 2h
- **Story:** [STORY-083]

**[TASK-0289] Frontend — Session Recording Viewer**
- **Тип:** Frontend
- **Описание:** Компонент timeline viewer: (1) Горизонтальная timeline с точками для каждого действия, (2) При клике на точку — скриншот (если есть) + детали действия, (3) Слева: список скриншотов (thumbnail gallery), (4) Справа: action log с timestamps и duration, (5) Pipeline stages как заголовки секций. Кнопка "Play" — автоматическое переключение с задержкой.
- **Критерии готовности (DoD):**
  - [ ] Timeline с точками действий отображается
  - [ ] Скриншоты загружаются и показываются
  - [ ] Action log с маскированными данными отображается
  - [ ] Play mode работает
- **Оценка:** 8h
- **Story:** [STORY-083]

**[TASK-0290] Тесты session recording**
- **Тип:** QA
- **Описание:** (1) Успешная сессия → 3 скриншота + action log. (2) Неудачная сессия → скриншоты до точки failure. (3) Маскировка: email, password, phone не видны в action log. (4) 11-я concurrent сессия → recording без screenshots (только action log). (5) Очистка: записи старше TTL удалены. (6) API recording endpoint: корректный JSON с URLs.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Mock S3 для тестов настроен
- **Оценка:** 4h
- **Story:** [STORY-083]

---

#### [STORY-084] Proxy Health Dashboard и Rotation

**Как** Network Admin, **я хочу** видеть состояние здоровья каждого прокси в реальном времени и настраивать автоматическую ротацию нездоровых прокси, **чтобы** обеспечить стабильность autologin pipeline.

**Acceptance Criteria:**
- [ ] AC1: Dashboard показывает: общее количество прокси по статусам (active/unhealthy/disabled), uptime per proxy за 24h/7d, latency heatmap по GEO (карта мира с цветовыми зонами)
- [ ] AC2: Автоматическая ротация: если прокси unhealthy > 30 минут → автоматически disabled + уведомление. Если прокси восстановился (3 successful health checks подряд) → автоматически active
- [ ] AC3: Manual override: admin может force-disable или force-enable прокси через UI
- [ ] AC4: Proxy usage statistics: количество сессий per proxy за период, success rate per proxy, avg latency per proxy
- [ ] AC5: Alert при: (a) более 20% прокси в GEO стали unhealthy одновременно, (b) общий uptime упал ниже 90%

**Story Points:** 5
**Приоритет:** Could
**Epic:** [EPIC-08]
**Зависит от:** [STORY-078]

##### Tasks для STORY-084:

**[TASK-0291] Backend — proxy health analytics и auto-rotation**
- **Тип:** Backend
- **Описание:** (1) ClickHouse таблица proxy_health_metrics (proxy_id, timestamp, latency_ms, status, geo_match). (2) Auto-rotation logic: unhealthy > 30 min → disabled (cron каждые 5 мин). Recovery: 3 consecutive healthy → active. (3) API endpoints: GET /proxies/health/dashboard (aggregated stats), GET /proxies/{id}/health/history (timeline), PUT /proxies/{id}/force-status. (4) Alerts через notification service.
- **Критерии готовности (DoD):**
  - [ ] Auto-rotation работает (unhealthy → disabled → recovered → active)
  - [ ] ClickHouse metrics записываются
  - [ ] API endpoints возвращают корректные данные
  - [ ] Alerts отправляются при критических событиях
- **Оценка:** 8h
- **Story:** [STORY-084]

**[TASK-0292] Frontend — Proxy Health Dashboard**
- **Тип:** Frontend
- **Описание:** (1) Pie chart: breakdown по статусам, (2) World map heatmap: latency по GEO (leaflet.js), (3) Таблица per-proxy: host, GEO, status, uptime, latency, sessions, success rate, last check. (4) Кнопки force-enable/disable. (5) Timeline график uptime per proxy за выбранный период.
- **Критерии готовности (DoD):**
  - [ ] Pie chart, heatmap, таблица отображаются
  - [ ] Force enable/disable работает
  - [ ] Auto-refresh данных
- **Оценка:** 8h
- **Story:** [STORY-084]

**[TASK-0293] Тесты proxy health dashboard**
- **Тип:** QA
- **Описание:** (1) Auto-rotation: unhealthy > 30 min → disabled. (2) Recovery: 3 healthy checks → active. (3) Force-disable: admin override работает. (4) Alert: 20% unhealthy в GEO → alert отправлен. (5) Dashboard данные совпадают с raw data.
- **Критерии готовности (DoD):**
  - [ ] 5 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-084]

---

### Сводка EPIC-08

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 9 |
| **Story Points** | 65 (итого) |
| **Must** | 6 stories (50 SP) |
| **Should** | 2 stories (10 SP) |
| **Could** | 1 story (5 SP) |
| **Всего Tasks** | 38 |
| **Backend tasks** | 18 |
| **Frontend tasks** | 8 |
| **QA tasks** | 10 |
| **DevOps tasks** | 1 |
| **Docs tasks** | 1 |
| **Оценка (часы)** | ~256h |

---

## [EPIC-09] Automated Lead Delivery (UAD)

**Цель:** Реализовать движок автоматической повторной доставки лидов (UAD — Unified Auto Delivery), аналог UAD Manager от HyperOne. Система позволяет создавать сценарии автоматической переотправки отклонённых или необработанных лидов по расписанию, с фильтрацией по статусу, GEO, аффилейту, возрасту лида. Поддержка cron-based, interval-based и continuous режимов доставки. Интеграция с Routing Engine (EPIC-02) для маршрутизации переотправляемых лидов.

**Метрика успеха:**
- Время подбора лидов для UAD-сценария < 2 сек на 100,000 лидов в базе
- Успешная переотправка (accepted by broker) ≥ 15% отклонённых лидов
- Cron-точность: срабатывание сценария в пределах ±5 сек от запланированного времени
- Continuous mode: обработка нового подходящего лида < 30 сек после его появления
- Максимум 50 активных UAD-сценариев per company
- UI загрузка страницы сценариев < 1.5 сек

**Приоритет:** P1 (Launch)
**Зависит от:** [EPIC-02], [EPIC-03]
**Оценка:** L

---

### Stories:

---

#### [STORY-085] Создание и настройка UAD-сценариев

**Как** Network Admin, **я хочу** создавать UAD-сценарии с названием, описанием, расписанием, фильтрами лидов и целевыми брокерами, **чтобы** автоматизировать повторную отправку лидов, которые были отклонены или не обработаны, без ручного вмешательства.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/uad/scenarios` создаёт сценарий: `name` (varchar 100, уникальное per company), `description` (varchar 500, optional), `mode` (enum: `scheduled`, `interval`, `continuous`), `schedule` (cron expression для mode=scheduled, например "0 */2 * * *" — каждые 2 часа), `interval_minutes` (int для mode=interval, min 5, max 1440), `filters` (JSONB — см. STORY-087), `target_flow_id` (FK routing_flows — через какой flow переотправлять), `max_attempts_per_lead` (int 1-10, default 3), `status` (enum: `active`, `paused`, `draft`), `priority` (int 1-100). Ответ HTTP 201
- [ ] AC2: API `GET /api/v1/uad/scenarios` — список с пагинацией, фильтры: status, mode. Сортировка: priority DESC, name ASC
- [ ] AC3: API `PUT /api/v1/uad/scenarios/{id}` — обновление. Изменение mode допускается только в status=paused. При изменении filters — пересчёт matching leads count (async)
- [ ] AC4: API `DELETE /api/v1/uad/scenarios/{id}` — soft delete. Нельзя удалить active → HTTP 409
- [ ] AC5: Максимум 50 сценариев per company. При превышении → HTTP 422 `SCENARIO_LIMIT_EXCEEDED`
- [ ] AC6: Валидация cron expression: не чаще чем раз в 5 минут. Невалидный cron → HTTP 422 с описанием ошибки
- [ ] AC7: API `GET /api/v1/uad/scenarios/{id}/preview` — предпросмотр: сколько лидов подходят под текущие фильтры (count), sample 10 лидов. Время выполнения < 2 сек

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-09]
**Зависит от:** [EPIC-02]

##### Tasks для STORY-085:

**[TASK-0294] Схема БД для UAD-сценариев**
- **Тип:** Backend
- **Описание:** Миграция PostgreSQL: таблица `uad_scenarios` (id UUID PK, company_id FK, name varchar 100, description varchar 500 nullable, mode enum(scheduled, interval, continuous), schedule varchar 100 nullable, interval_minutes int nullable, filters JSONB, target_flow_id FK routing_flows, max_attempts_per_lead smallint default 3, status enum(active, paused, draft) default draft, priority smallint default 50, is_deleted bool default false, last_run_at timestamptz nullable, next_run_at timestamptz nullable, created_by FK users, created_at timestamptz, updated_at timestamptz). Индексы: (company_id, is_deleted, status), (company_id, name) UNIQUE WHERE NOT is_deleted, (status, next_run_at) WHERE status='active'. Таблица `uad_scenario_runs` (id UUID, scenario_id FK, started_at, completed_at, leads_processed int, leads_sent int, leads_accepted int, leads_rejected int, status enum(running, completed, failed, cancelled), error text nullable).
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется
  - [ ] Rollback работает
  - [ ] Индексы оптимальны для основных запросов
  - [ ] Partial unique index для name + company работает
- **Оценка:** 4h
- **Story:** [STORY-085]

**[TASK-0295] CRUD API для UAD-сценариев**
- **Тип:** Backend
- **Описание:** Go-хэндлеры: POST/GET/PUT/DELETE /api/v1/uad/scenarios. Валидация: cron expression через library (robfig/cron), interval min 5 max 1440, target_flow_id exists и active, max_attempts 1-10. Лимит 50 per company. Soft delete для active → 409. При создании/обновлении: рассчитать next_run_at. Preview endpoint: SQL COUNT с EXPLAIN проверкой (< 2 сек). Audit log для всех операций.
- **Критерии готовности (DoD):**
  - [ ] CRUD работает согласно AC
  - [ ] Валидация cron expression корректна
  - [ ] Preview возвращает count и sample за < 2 сек
  - [ ] next_run_at рассчитывается при создании
- **Оценка:** 8h
- **Story:** [STORY-085]

**[TASK-0296] Frontend — управление UAD-сценариями**
- **Тип:** Frontend
- **Описание:** Страница "UAD Scenarios": (1) Таблица: name, mode (badge), status (цветовой индикатор), filters summary, target flow, last run, next run, leads processed, success rate. (2) Кнопка "Create Scenario" → multi-step form: Step 1 — name, description, mode; Step 2 — filters (см. STORY-087); Step 3 — target flow, max attempts; Step 4 — preview (matching leads count). (3) Inline actions: Edit, Duplicate, Pause/Resume, Delete. (4) Cron expression builder: UI-виджет для выбора расписания (dropdown: every N hours/minutes, specific times) с human-readable preview ("Every 2 hours starting at 00:00").
- **Критерии готовности (DoD):**
  - [ ] Таблица с пагинацией и фильтрами работает
  - [ ] Multi-step создание с preview работает
  - [ ] Cron builder генерирует валидный cron expression
  - [ ] Pause/Resume переключает статус
- **Оценка:** 8h
- **Story:** [STORY-085]

**[TASK-0297] Тесты CRUD UAD-сценариев**
- **Тип:** QA
- **Описание:** (1) Создание сценария → 201 + next_run_at рассчитан. (2) Дублирующее имя → 422. (3) 51-й сценарий → 422. (4) Удаление active → 409. (5) Изменение mode у active → 409. (6) Невалидный cron (каждую минуту) → 422. (7) Preview: count совпадает с реальным количеством лидов. (8) Multi-tenant: другая company → 404.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Integration тесты с PostgreSQL
- **Оценка:** 4h
- **Story:** [STORY-085]

---

#### [STORY-086] Schedule Engine (cron, interval, continuous)

**Как** Network Admin, **я хочу** чтобы UAD-сценарии запускались автоматически по расписанию (cron), через интервал или в непрерывном режиме, **чтобы** повторная отправка лидов происходила без ручного вмешательства в нужное время.

**Acceptance Criteria:**
- [ ] AC1: Scheduled mode: cron-based запуск. Точность: ±5 сек от запланированного времени. Поддержка часовых зон (UTC по умолчанию, настраивается per scenario)
- [ ] AC2: Interval mode: запуск каждые N минут (от 5 до 1440). Отсчёт от момента завершения предыдущего запуска (не от начала, чтобы избежать overlap)
- [ ] AC3: Continuous mode: постоянный мониторинг новых лидов, подходящих под фильтры. При появлении подходящего лида — отправка в течение < 30 сек. Реализация через PostgreSQL LISTEN/NOTIFY или Redis pub/sub
- [ ] AC4: Overlap prevention: если предыдущий запуск ещё выполняется — новый запуск откладывается. Максимум 1 concurrent execution per scenario
- [ ] AC5: Graceful shutdown: при остановке сервиса — текущие запуски завершаются (timeout 60 сек), незавершённые leads возвращаются в очередь
- [ ] AC6: Scheduler persistent: при перезапуске сервиса — все active сценарии возобновляются. next_run_at восстанавливается из БД

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-09]
**Зависит от:** [STORY-085]

##### Tasks для STORY-086:

**[TASK-0298] Реализовать Schedule Engine**
- **Тип:** Backend
- **Описание:** Go-сервис на базе robfig/cron (v3) для scheduled mode. Interval mode: custom goroutine с time.After, отсчёт от completion time. Continuous mode: Redis pub/sub listener на события lead_status_changed — фильтрация по сценарию, отправка подходящих лидов. Shared: distributed lock через Redis (SETNX) для overlap prevention — один инстанс обрабатывает один сценарий. При старте сервиса: загрузка всех active сценариев из БД, регистрация в scheduler. Graceful shutdown: context.WithTimeout(60s), ожидание текущих выполнений.
- **Критерии готовности (DoD):**
  - [ ] Cron-based запуск с точностью ±5 сек
  - [ ] Interval mode с отсчётом от completion
  - [ ] Continuous mode реагирует на новые лиды < 30 сек
  - [ ] Distributed lock предотвращает overlap
  - [ ] Graceful shutdown с timeout 60 сек
  - [ ] Recovery при перезапуске из БД
- **Оценка:** 16h
- **Story:** [STORY-086]

**[TASK-0299] Тесты Schedule Engine**
- **Тип:** QA
- **Описание:** (1) Cron "0 */2 * * *" → запуск каждые 2 часа (ускоренный тест с mock clock). (2) Interval 10 min → отсчёт от completion, не от start. (3) Continuous: новый лид matching filters → обработка < 30 сек. (4) Overlap: предыдущий run ещё идёт → новый не запускается. (5) Recovery: перезапуск сервиса → сценарии восстановлены. (6) Graceful shutdown: текущий run завершается до 60 сек.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
  - [ ] Mock clock для ускорения time-based тестов
- **Оценка:** 8h
- **Story:** [STORY-086]

---

#### [STORY-087] Фильтрация лидов для UAD

**Как** Network Admin, **я хочу** настраивать гибкие фильтры для UAD-сценариев (по статусу, GEO, аффилейту, брокеру, возрасту лида, количеству предыдущих попыток), **чтобы** точно определять, какие лиды подлежат повторной отправке.

**Acceptance Criteria:**
- [ ] AC1: Фильтры в JSONB: `statuses` (массив: rejected, no_answer, callback, invalid — множественный выбор), `geos` (массив ISO кодов, до 50), `affiliate_ids` (массив UUID, до 100), `exclude_broker_ids` (массив UUID — не отправлять тем, кто уже отклонил), `lead_age_min_hours` (int, min 0) и `lead_age_max_hours` (int, max 8760 = 1 год), `max_previous_attempts` (int — не брать лиды с N+ попытками UAD), `created_after` (datetime, optional), `created_before` (datetime, optional), `tags` (массив string, optional)
- [ ] AC2: Все фильтры опциональны. Без фильтров — все лиды со статусом rejected/no_answer
- [ ] AC3: SQL-запрос с фильтрами выполняется < 2 сек на таблице 100,000+ лидов (проверить через EXPLAIN ANALYZE, использовать индексы)
- [ ] AC4: Фильтр exclude_broker_ids: исключает лидов, которых уже отправляли указанным брокерам (проверка по таблице lead_deliveries)
- [ ] AC5: Фильтр lead_age: рассчитывается как NOW() - lead.created_at. Позволяет не отправлять слишком свежие (< 1h) или слишком старые (> 72h) лиды
- [ ] AC6: UI preview: при изменении любого фильтра — автоматический пересчёт matching leads count (debounce 500ms)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-09]
**Зависит от:** [STORY-085]

##### Tasks для STORY-087:

**[TASK-0300] Реализовать filter builder для UAD**
- **Тип:** Backend
- **Описание:** Go-сервис для построения SQL WHERE clause из JSONB фильтров. Каждый фильтр → SQL fragment: statuses → `status IN (...)`, geos → `geo IN (...)`, affiliate_ids → `affiliate_id IN (...)`, exclude_broker_ids → `NOT EXISTS (SELECT 1 FROM lead_deliveries WHERE lead_id = leads.id AND broker_id IN (...))`, lead_age → `created_at BETWEEN NOW() - interval 'Xh' AND NOW() - interval 'Yh'`, max_previous_attempts → subquery на uad_lead_attempts. SQL injection protection через parameterized queries. EXPLAIN ANALYZE check в CI для запросов на тестовой БД с 100K leads.
- **Критерии готовности (DoD):**
  - [ ] Все 8 типов фильтров генерируют корректный SQL
  - [ ] Parameterized queries (без SQL injection)
  - [ ] EXPLAIN ANALYZE < 2 сек на 100K leads
  - [ ] Комбинация всех фильтров работает
- **Оценка:** 8h
- **Story:** [STORY-087]

**[TASK-0301] Frontend — filter UI для UAD-сценариев**
- **Тип:** Frontend
- **Описание:** Компонент filter builder: (1) Statuses: multi-select с чекбоксами, (2) GEOs: searchable multi-select с флагами, (3) Affiliates: searchable dropdown (API autocomplete), (4) Exclude Brokers: searchable dropdown, (5) Lead Age: range slider (min/max hours) с preview ("от 1 часа до 72 часов"), (6) Max Previous Attempts: number input, (7) Tags: tag input с autocomplete. Preview count обновляется при изменении фильтра (debounce 500ms). Clear all filters button.
- **Критерии готовности (DoD):**
  - [ ] Все 7 типов фильтров отображаются и работают
  - [ ] Preview count обновляется с debounce 500ms
  - [ ] Autocomplete для affiliates и brokers работает
  - [ ] Clear all сбрасывает все фильтры
- **Оценка:** 8h
- **Story:** [STORY-087]

**[TASK-0302] Тесты фильтрации UAD**
- **Тип:** QA
- **Описание:** (1) Фильтр по status=rejected → только rejected лиды. (2) Фильтр по GEO=[DE, AT] → только DE и AT. (3) exclude_broker_ids → лиды, отправленные указанным брокерам, исключены. (4) lead_age 1h-72h → лиды в диапазоне. (5) Комбинация всех фильтров → корректный результат. (6) Без фильтров → rejected + no_answer. (7) Performance: 100K leads, все фильтры → < 2 сек. (8) Preview count = actual count.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Performance test на 100K записей пройден
- **Оценка:** 4h
- **Story:** [STORY-087]

---

#### [STORY-088] UAD Execution Engine

**Как** Network Admin, **я хочу** чтобы при срабатывании UAD-сценария система автоматически подбирала подходящие лиды, отправляла их через routing engine и записывала результат, **чтобы** весь процесс переотправки был полностью автоматизирован.

**Acceptance Criteria:**
- [ ] AC1: При запуске сценария: (1) Применить фильтры → получить список lead_ids, (2) Для каждого лида: отправить через routing engine (target_flow_id), (3) Записать результат в `uad_lead_attempts` (lead_id, scenario_id, run_id, broker_id, status, response, created_at)
- [ ] AC2: Batch processing: отправка лидов пачками по 50. Между пачками — пауза 1 сек (configurable). Максимум 1000 лидов per run (configurable per scenario)
- [ ] AC3: Throttling per broker: не более 10 leads/sec к одному брокеру (уважение rate limits)
- [ ] AC4: При получении ответа от брокера: если accepted → обновить lead.status = `accepted`, если rejected → increment attempt counter, если error → retry через 30 сек (max 2 retries per lead within run)
- [ ] AC5: Run statistics записываются в `uad_scenario_runs`: leads_processed, leads_sent, leads_accepted, leads_rejected, duration_sec
- [ ] AC6: Если broker cap reached (HTTP 429) → skip этого брокера до следующего run, отправить notification
- [ ] AC7: Execution timeout: максимум 30 минут per run. При превышении → cancel оставшихся, записать partial results

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-09]
**Зависит от:** [STORY-086], [STORY-087], [EPIC-02]

##### Tasks для STORY-088:

**[TASK-0303] Реализовать UAD execution engine**
- **Тип:** Backend
- **Описание:** Go-сервис: (1) Получение лидов через filter builder (STORY-087), (2) Chunking по 50, (3) Для каждого chunk: отправка через Routing Engine API (POST /api/v1/routing/route с source=uad), (4) Rate limiter per broker: golang.org/x/time/rate, 10 rps, (5) Обработка ответов: accepted → update lead, rejected → increment attempts, error → retry queue, cap_reached → skip broker, (6) Запись run statistics. Таблица `uad_lead_attempts`: id, lead_id FK, scenario_id FK, run_id FK, broker_id FK, attempt_number, status (sent, accepted, rejected, error), broker_response JSONB, created_at. Execution timeout через context.WithTimeout(30min).
- **Критерии готовности (DoD):**
  - [ ] Batch processing по 50 с паузой работает
  - [ ] Rate limiting per broker (10 rps) работает
  - [ ] Все статусы ответов обрабатываются корректно
  - [ ] Run statistics записываются
  - [ ] Timeout 30 min работает с partial results
- **Оценка:** 16h
- **Story:** [STORY-088]

**[TASK-0304] Интеграция UAD с Routing Engine**
- **Тип:** Backend
- **Описание:** Расширение Routing Engine API: (1) Добавить параметр `source` (enum: manual, api, uad) к POST /api/v1/routing/route, (2) При source=uad: исключить брокеров из exclude_broker_ids сценария, (3) Учёт uad_lead_attempts: не отправлять лид тому же брокеру, который уже отклонил, (4) Логирование source=uad в audit trail.
- **Критерии готовности (DoD):**
  - [ ] Routing Engine принимает source=uad
  - [ ] Exclude логика работает
  - [ ] Audit trail содержит source
- **Оценка:** 4h
- **Story:** [STORY-088]

**[TASK-0305] Тесты UAD execution**
- **Тип:** QA
- **Описание:** (1) Run с 100 matching leads → 2 chunks по 50, пауза между ними. (2) Rate limit: > 10 leads/sec к одному брокеру → throttle. (3) Broker accepted → lead status updated. (4) Broker rejected → attempt counter incremented. (5) Broker error → retry через 30 сек, max 2 retries. (6) Cap reached (429) → skip broker + notification. (7) Timeout 30 min → partial results recorded. (8) Max 1000 leads per run → остальные пропускаются.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Integration test с mock Routing Engine
- **Оценка:** 8h
- **Story:** [STORY-088]

---

#### [STORY-089] Мониторинг UAD (активные сценарии, статистика)

**Как** Network Admin, **я хочу** видеть dashboard активных UAD-сценариев с метриками (обработано лидов, accepted, rejected, success rate), **чтобы** оценивать эффективность автоматической переотправки и корректировать настройки.

**Acceptance Criteria:**
- [ ] AC1: Dashboard UAD: KPI-карточки — active scenarios, total leads processed today, overall success rate, next scheduled runs (timeline)
- [ ] AC2: Таблица активных сценариев: name, mode, last run (time + status), leads processed (последний run), success rate (7d rolling), next run, actions
- [ ] AC3: Drill-down по сценарию: история запусков (runs) с графиком leads processed / accepted / rejected per run
- [ ] AC4: Time-series: leads processed by UAD per hour за последние 7 дней
- [ ] AC5: Обновление данных: auto-refresh каждые 60 сек. Active run indicator (spinner) для сценариев, выполняющихся прямо сейчас
- [ ] AC6: Загрузка dashboard < 1.5 сек

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-09]
**Зависит от:** [STORY-085], [STORY-088]

##### Tasks для STORY-089:

**[TASK-0306] API для UAD monitoring dashboard**
- **Тип:** Backend
- **Описание:** Endpoints: (1) GET /api/v1/uad/dashboard/kpis — today's totals, (2) GET /api/v1/uad/dashboard/scenarios — per-scenario metrics (join uad_scenarios + uad_scenario_runs, rolling 7d avg), (3) GET /api/v1/uad/scenarios/{id}/runs — paginated runs history, (4) GET /api/v1/uad/dashboard/timeseries?period=7d&interval=1h. ClickHouse для time-series, PostgreSQL для scenario metadata.
- **Критерии готовности (DoD):**
  - [ ] 4 API endpoints работают
  - [ ] Rolling 7d success rate рассчитывается корректно
  - [ ] Время ответа < 500ms для всех endpoints
- **Оценка:** 8h
- **Story:** [STORY-089]

**[TASK-0307] Frontend — UAD Monitoring Dashboard**
- **Тип:** Frontend
- **Описание:** Страница "UAD Monitor": (1) 4 KPI-карточки, (2) Таблица сценариев с success rate (цветовой индикатор: >20% зелёный, 10-20% жёлтый, <10% красный), spinner для active run, (3) Drill-down: bar chart (Recharts) runs per scenario, (4) Line chart — leads processed per hour за 7d. Auto-refresh 60 сек.
- **Критерии готовности (DoD):**
  - [ ] Dashboard загружается < 1.5 сек
  - [ ] Drill-down по сценарию работает
  - [ ] Auto-refresh обновляет данные
  - [ ] Active run indicator отображается
- **Оценка:** 8h
- **Story:** [STORY-089]

**[TASK-0308] Тесты UAD monitoring**
- **Тип:** QA
- **Описание:** (1) KPI карточки — данные совпадают с БД. (2) Per-scenario success rate: корректный rolling 7d avg. (3) Drill-down: runs history отображается с пагинацией. (4) Time-series: данные за 7d без пропусков. (5) Empty state: нет сценариев → корректное сообщение. (6) Active run spinner: отображается для running сценария.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-089]

---

#### [STORY-090] Управление UAD — Pause/Resume/Stop

**Как** Network Admin, **я хочу** ставить UAD-сценарии на паузу, возобновлять и останавливать их (включая принудительную остановку текущего run), **чтобы** гибко контролировать процесс автоматической переотправки.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/uad/scenarios/{id}/pause` — ставит сценарий на паузу. Если run выполняется — дожидается завершения текущего run (graceful), но не запускает новый. Ответ HTTP 200
- [ ] AC2: API `POST /api/v1/uad/scenarios/{id}/resume` — возобновляет сценарий. Рассчитывает next_run_at от текущего времени. Ответ HTTP 200
- [ ] AC3: API `POST /api/v1/uad/scenarios/{id}/stop` — принудительная остановка текущего run (cancel context). Незавершённые лиды не обрабатываются. Статус run → `cancelled`. Сценарий → paused
- [ ] AC4: API `POST /api/v1/uad/scenarios/{id}/run-now` — принудительный немедленный запуск (вне расписания). Ответ HTTP 202 Accepted с run_id. Не сбрасывает next_run_at
- [ ] AC5: Bulk actions: pause/resume для нескольких сценариев одновременно. API `POST /api/v1/uad/scenarios/bulk` с body `{action: "pause"|"resume", scenario_ids: [...]}`
- [ ] AC6: Audit log: все действия (pause, resume, stop, run-now) записываются с user_id и timestamp

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-09]
**Зависит от:** [STORY-085], [STORY-086]

##### Tasks для STORY-090:

**[TASK-0309] API Pause/Resume/Stop/Run-now**
- **Тип:** Backend
- **Описание:** Go-хэндлеры: (1) POST .../pause — status = paused, cancel scheduler registration (не текущий run), (2) POST .../resume — status = active, register в scheduler, calc next_run_at, (3) POST .../stop — cancel context текущего run (через Redis pub/sub: send cancel signal), set run status = cancelled, scenario status = paused, (4) POST .../run-now — создать run запись, отправить task в execution queue (не влияет на schedule), (5) POST .../bulk — loop с транзакцией. Audit log для каждого действия.
- **Критерии готовности (DoD):**
  - [ ] Pause останавливает future runs, не прерывает текущий
  - [ ] Resume восстанавливает schedule
  - [ ] Stop немедленно отменяет текущий run
  - [ ] Run-now запускает вне расписания
  - [ ] Bulk actions работают транзакционно
  - [ ] Audit log записывается
- **Оценка:** 8h
- **Story:** [STORY-090]

**[TASK-0310] Frontend — контролы UAD**
- **Тип:** Frontend
- **Описание:** (1) Кнопки на каждом сценарии: Pause (если active), Resume (если paused), Stop (если running), Run Now (если active/paused). (2) Confirmation dialog для Stop ("Это отменит текущую обработку"). (3) Bulk actions: чекбоксы на таблице + dropdown "Actions" → Pause Selected, Resume Selected. (4) Toast notifications при успешном действии.
- **Критерии готовности (DoD):**
  - [ ] Все кнопки отображаются по состоянию сценария
  - [ ] Stop с confirmation dialog
  - [ ] Bulk actions работают
  - [ ] Toast notifications отображаются
- **Оценка:** 4h
- **Story:** [STORY-090]

**[TASK-0311] Тесты Pause/Resume/Stop**
- **Тип:** QA
- **Описание:** (1) Pause active → status paused, no future runs. (2) Resume paused → status active, next_run_at calculated. (3) Stop running → current run cancelled, leads not processed. (4) Run-now → immediate execution + schedule preserved. (5) Bulk pause 5 scenarios → all paused. (6) Pause already paused → idempotent (200, no error). (7) Stop when not running → 409.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-090]

---

#### [STORY-091] История и логи UAD

**Как** Network Admin, **я хочу** просматривать подробную историю каждого UAD-запуска (какие лиды были обработаны, кому отправлены, с каким результатом), **чтобы** анализировать эффективность сценариев и выявлять проблемы.

**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/uad/scenarios/{id}/runs` — список запусков с пагинацией: run_id, started_at, completed_at, duration, leads_processed, leads_accepted, leads_rejected, status
- [ ] AC2: API `GET /api/v1/uad/runs/{run_id}/leads` — список лидов в запуске с пагинацией: lead_id, lead email (masked), GEO, broker sent to, attempt number, status, broker response (truncated), timestamp
- [ ] AC3: Export: CSV download для runs и leads. Endpoint `GET /api/v1/uad/runs/{run_id}/export?format=csv`
- [ ] AC4: Retention: история хранится 90 дней, затем архивируется в cold storage. Детали лидов (uad_lead_attempts) — 30 дней
- [ ] AC5: Search по run_id или lead_id внутри истории UAD. Время поиска < 1 сек
- [ ] AC6: Фильтры для списка runs: status (completed, failed, cancelled), date range

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-09]
**Зависит от:** [STORY-088]

##### Tasks для STORY-091:

**[TASK-0312] API для UAD history и export**
- **Тип:** Backend
- **Описание:** Endpoints: (1) GET /api/v1/uad/scenarios/{id}/runs — cursor-based pagination, фильтры status/date_range, (2) GET /api/v1/uad/runs/{run_id}/leads — cursor-based pagination, join с leads table для email/GEO, маскировка email (j***@example.com), (3) GET /api/v1/uad/runs/{run_id}/export?format=csv — streaming CSV response (не загружать всё в память). Cron-job для архивации: runs > 90 дней → move to archive table, lead_attempts > 30 дней → delete.
- **Критерии готовности (DoD):**
  - [ ] Runs list с фильтрами и пагинацией работает
  - [ ] Leads list с маскировкой email работает
  - [ ] CSV export streaming работает для 10K+ leads
  - [ ] Архивация cron-job настроен
- **Оценка:** 8h
- **Story:** [STORY-091]

**[TASK-0313] Frontend — UAD History**
- **Тип:** Frontend
- **Описание:** (1) Страница runs history: таблица с фильтрами и пагинацией, (2) Drill-down по run: таблица лидов с масками, status badges, (3) Export CSV кнопка с progress indicator, (4) Search bar для поиска по run_id/lead_id, (5) Date range picker для фильтрации runs.
- **Критерии готовности (DoD):**
  - [ ] Runs table с drill-down работает
  - [ ] CSV export скачивается корректно
  - [ ] Search и фильтры работают
- **Оценка:** 8h
- **Story:** [STORY-091]

**[TASK-0314] Тесты UAD history**
- **Тип:** QA
- **Описание:** (1) Runs list: пагинация и фильтры корректны. (2) Leads list: email masked. (3) CSV export: содержит все колонки, 10K leads → файл < 60 сек. (4) Search: по run_id → найден, по lead_id → найден. (5) Retention: runs > 90 дней → archived, leads > 30 дней → deleted. (6) Empty state: нет runs → сообщение.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-091]

---

### Сводка EPIC-09

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 7 |
| **Story Points** | 44 (итого) |
| **Must** | 5 stories (34 SP) |
| **Should** | 2 stories (10 SP) |
| **Could** | 0 stories |
| **Всего Tasks** | 21 |
| **Backend tasks** | 11 |
| **Frontend tasks** | 6 |
| **QA tasks** | 7 |
| **Оценка (часы)** | ~152h |

---

## [EPIC-10] Analytics Dashboard v1

**Цель:** Создать аналитический BI-слой платформы — главное конкурентное преимущество. Ни один конкурент (HyperOne 6/10, Leadgreed, CRM Mate, Elnopy) не имеет полноценной аналитики с time-series, drill-down, P&L, cohort analysis и предиктивными предупреждениями. Мы строим "BI for affiliate marketing" — real-time дашборд с KPI tiles (WebSocket), временными рядами с drill-down до уровня отдельного лида, Affiliate P&L, ROI сравнение хабов/брокеров, обнаружение shave (уменьшение подтверждённых лидов брокером), предсказание исчерпания капов, кастомизируемый layout и comparison mode.

**Метрика успеха:**
- KPI tiles обновляются в реальном времени с задержкой < 2 сек (WebSocket)
- Загрузка dashboard (initial render) < 3 сек при 100K+ лидов в базе
- ClickHouse queries для time-series < 500ms (p95) на 1M+ записей
- Drill-down от summary до individual lead < 1 сек
- Shave detection accuracy ≥ 90% (precision), false positive < 5%
- Cap exhaustion prediction: предупреждение за ≥ 1 час до исчерпания (accuracy ≥ 80%)
- NPS аналитического модуля > 8/10 в опросе beta-пользователей

**Приоритет:** P1 (Launch)
**Зависит от:** [EPIC-01], [EPIC-02], [EPIC-03]
**Оценка:** XL

---

### Stories:

---

#### [STORY-092] Real-time KPI Tiles

**Как** Network Admin, **я хочу** видеть ключевые метрики в реальном времени (лиды сегодня, конверсия, выручка, активные капы, отклонения), **чтобы** мгновенно оценивать состояние бизнеса без обновления страницы.

**Acceptance Criteria:**
- [ ] AC1: 8 KPI tiles на главном dashboard: (1) Leads Today (total + delta vs yesterday), (2) Conversion Rate % (accepted/total), (3) Revenue Today (сумма sell_price accepted leads), (4) Active Caps (X out of Y, с прогресс-баром), (5) Rejected Rate %, (6) Avg Response Time (broker), (7) Top GEO (по количеству лидов), (8) FTD Today (first time deposits)
- [ ] AC2: WebSocket обновление: каждый tile обновляется в реальном времени (< 2 сек от события). При новом лиде → Leads Today ++. При FTD → Revenue обновляется. Анимация при изменении значения (count-up)
- [ ] AC3: Delta indicators: стрелка вверх/вниз + процент изменения vs тот же период вчера (или прошлой недели — настраивается)
- [ ] AC4: Клик на tile → переход к детальному отчёту по этой метрике (drill-down, см. STORY-093)
- [ ] AC5: Tiles адаптивны: desktop — 4 в ряд, tablet — 2 в ряд, mobile — 1 в ряд
- [ ] AC6: Загрузка initial values: API endpoint `GET /api/v1/analytics/kpis?date=today` < 300ms
- [ ] AC7: WebSocket reconnect: при потере соединения — автоматический reconnect с exponential backoff (1s, 2s, 4s, max 30s). Индикатор "offline" при отключении

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-10]
**Зависит от:** [EPIC-01], [EPIC-02]

##### Tasks для STORY-092:

**[TASK-0315] ClickHouse таблицы для analytics**
- **Тип:** Backend
- **Описание:** Создать ClickHouse таблицы: (1) `lead_events` (event_id UUID, lead_id UUID, company_id UUID, event_type Enum('created','sent','accepted','rejected','ftd'), affiliate_id UUID, broker_id UUID, geo String, sell_price Decimal64(2), buy_price Decimal64(2), response_time_ms UInt32, created_at DateTime) — MergeTree ORDER BY (company_id, created_at, event_type). (2) Materialized views для pre-aggregation: `kpi_daily` (company_id, date, leads_total, leads_accepted, leads_rejected, revenue, ftd_count), обновляется при INSERT. (3) Kafka → ClickHouse pipeline: lead events из Kafka topic → ClickHouse Kafka engine → materialized view.
- **Критерии готовности (DoD):**
  - [ ] ClickHouse таблицы созданы
  - [ ] Materialized views для daily KPIs работают
  - [ ] Kafka → ClickHouse pipeline настроен
  - [ ] Benchmark: INSERT 1000 events/sec без потерь
- **Оценка:** 8h
- **Story:** [STORY-092]

**[TASK-0316] API для KPI tiles**
- **Тип:** Backend
- **Описание:** Endpoint `GET /api/v1/analytics/kpis?date=today&compare=yesterday`. Возвращает JSON: для каждого из 8 KPI — `{value, previous_value, delta_percent, delta_direction}`. Источник: ClickHouse materialized view kpi_daily (current) + kpi_daily (compare period). Cache: Redis с TTL 10 сек для снижения нагрузки на ClickHouse. Время ответа < 300ms.
- **Критерии готовности (DoD):**
  - [ ] 8 KPI возвращаются с delta
  - [ ] Cache в Redis работает (TTL 10s)
  - [ ] Время ответа < 300ms
  - [ ] Compare period настраивается
- **Оценка:** 4h
- **Story:** [STORY-092]

**[TASK-0317] WebSocket сервис для real-time KPI**
- **Тип:** Backend
- **Описание:** WebSocket endpoint `ws://.../analytics/kpis/live`. (1) При подключении: отправить текущие KPI значения, (2) Подписка на Redis pub/sub канал `analytics:kpi_updates:{company_id}`, (3) При каждом lead event (из Kafka consumer): инкрементировать соответствующий KPI в Redis, publish update. (4) Debounce: отправлять обновления не чаще 1 раз в 500ms (batch multiple changes). (5) JWT аутентификация. (6) Heartbeat каждые 30 сек.
- **Критерии готовности (DoD):**
  - [ ] WebSocket отправляет initial KPIs при подключении
  - [ ] Real-time updates при новых lead events
  - [ ] Debounce 500ms работает
  - [ ] JWT auth и heartbeat реализованы
- **Оценка:** 8h
- **Story:** [STORY-092]

**[TASK-0318] Frontend — KPI Tiles компонент**
- **Тип:** Frontend
- **Описание:** React компонент `KpiTiles`: (1) Grid layout: 8 tiles, responsive (4/2/1 columns), (2) Каждый tile: icon, label, value (с count-up анимацией при изменении — react-countup), delta badge (зелёный ↑ / красный ↓ + %), (3) WebSocket hook: подключение, reconnect с backoff, offline indicator (жёлтый banner "Reconnecting..."), (4) Клик на tile → router.push к детальному отчёту, (5) Skeleton loader при загрузке.
- **Критерии готовности (DoD):**
  - [ ] 8 tiles отображаются с данными
  - [ ] Count-up анимация при обновлении
  - [ ] WebSocket reconnect с offline indicator
  - [ ] Responsive layout работает
  - [ ] Click → drill-down навигация
- **Оценка:** 8h
- **Story:** [STORY-092]

**[TASK-0319] Тесты KPI tiles**
- **Тип:** QA
- **Описание:** (1) Initial load: 8 KPI с корректными значениями. (2) Delta: today 100, yesterday 80 → +25% ↑. (3) WebSocket: новый лид → Leads Today +1. (4) FTD event → Revenue обновляется. (5) WebSocket disconnect → offline indicator → reconnect → data synced. (6) Empty state: нет лидов сегодня → все KPI = 0 с корректным отображением. (7) Performance: API < 300ms, WebSocket update < 2 сек.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] WebSocket тесты стабильны
- **Оценка:** 4h
- **Story:** [STORY-092]

---

#### [STORY-093] Time-series графики с Drill-down

**Как** Network Admin, **я хочу** видеть временные ряды (лиды, конверсии, revenue по часам/дням/неделям) с возможностью drill-down от общей картины до отдельного лида, **чтобы** анализировать тренды и находить аномалии — это то, чего НЕТ у конкурентов.

**Acceptance Criteria:**
- [ ] AC1: Line/Area chart с временными рядами. Метрики: leads (total, accepted, rejected), conversion rate, revenue, FTD count, avg response time. Выбор метрики через dropdown
- [ ] AC2: Granularity: auto (выбирается по range), manual override: hourly, daily, weekly, monthly. Range > 7d → daily default, range ≤ 7d → hourly default
- [ ] AC3: Drill-down Level 1: клик на точку графика → breakdown по dimensions (affiliate, broker, GEO). Отображается как stacked bar chart или таблица
- [ ] AC4: Drill-down Level 2: клик на affiliate/broker/GEO → список отдельных лидов (таблица с пагинацией: lead_id, email masked, GEO, affiliate, broker, status, created_at)
- [ ] AC5: Zoom: выделение области на графике (brush selection) → увеличение + автоматическое уменьшение granularity
- [ ] AC6: Multiple series: отображение до 5 серий одновременно (например: 3 брокера на одном графике)
- [ ] AC7: ClickHouse query time < 500ms для диапазона 30 дней при 1M+ записей
- [ ] AC8: Tooltip на hover: дата/время, значение, delta vs предыдущий период

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092]

##### Tasks для STORY-093:

**[TASK-0320] ClickHouse queries для time-series**
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/timeseries?metric=leads&granularity=hourly&from=2026-03-01&to=2026-03-07&dimensions=broker_id`. ClickHouse queries: (1) Hourly: `SELECT toStartOfHour(created_at) as ts, count() as value FROM lead_events WHERE ... GROUP BY ts ORDER BY ts`, (2) Daily/Weekly/Monthly аналогично, (3) С dimensions: добавить GROUP BY broker_id/affiliate_id/geo, (4) Drill-down level 2: `SELECT * FROM lead_events WHERE company_id=? AND created_at BETWEEN ? AND ? AND broker_id=? ORDER BY created_at DESC LIMIT 100 OFFSET ?`. Индексы ClickHouse оптимизированы для (company_id, created_at). Benchmark: < 500ms на 1M records.
- **Критерии готовности (DoD):**
  - [ ] Time-series для всех метрик и granularity
  - [ ] Dimensions breakdown работает
  - [ ] Drill-down level 2 с пагинацией
  - [ ] Benchmark < 500ms на 1M records пройден
- **Оценка:** 8h
- **Story:** [STORY-093]

**[TASK-0321] Frontend — Time-series Chart с Drill-down**
- **Тип:** Frontend
- **Описание:** Компонент `TimeSeriesChart` (Recharts): (1) Line/Area chart с выбором metric и granularity, (2) Brush selection для zoom, (3) onClick точки → Level 1 drill-down (stacked bar / table toggle), (4) onClick dimension → Level 2 (leads table, paginated), (5) Multiple series: до 5 линий с легендой и toggle, (6) Tooltip с date, value, delta, (7) Loading skeleton, error state, empty state.
- **Критерии готовности (DoD):**
  - [ ] Chart рендерится с данными
  - [ ] Brush zoom работает
  - [ ] 2 уровня drill-down работают
  - [ ] Multiple series с toggle
  - [ ] Tooltip информативен
- **Оценка:** 16h
- **Story:** [STORY-093]

**[TASK-0322] Тесты time-series**
- **Тип:** QA
- **Описание:** (1) Hourly granularity за 24h → 24 точки. (2) Daily за 30d → 30 точек. (3) Auto granularity: 3d → hourly, 14d → daily. (4) Drill-down L1: клик → breakdown корректный. (5) Drill-down L2: leads list с масками. (6) Brush zoom: выделение → увеличение. (7) Multiple series: 5 брокеров на одном графике. (8) ClickHouse: query < 500ms на 1M records. (9) Empty period: нет данных → пустая точка, не разрыв линии.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
- **Оценка:** 8h
- **Story:** [STORY-093]

---

#### [STORY-094] Breakdown по Affiliates/Brokers/GEO

**Как** Affiliate Manager, **я хочу** видеть детальный breakdown по аффилейтам, брокерам и GEO (с drill-down до отдельных лидов), **чтобы** понимать, кто из партнёров приносит лучший трафик и где есть проблемы.

**Acceptance Criteria:**
- [ ] AC1: Три вкладки breakdown: "By Affiliate", "By Broker", "By GEO". Каждая содержит таблицу с агрегированными метриками
- [ ] AC2: Таблица "By Affiliate": affiliate name, leads sent, accepted, rejected, conversion %, revenue, buy cost, profit, avg response time, quality score. Сортировка по любой колонке
- [ ] AC3: Таблица "By Broker": broker name, leads received, accepted, rejected, conversion %, revenue, cap usage (progress bar), avg response time, uptime %. Сортировка по любой колонке
- [ ] AC4: Таблица "By GEO": flag + country, leads, conversion %, revenue, top affiliate, top broker. Карта мира (choropleth) с цветовой шкалой по conversion rate
- [ ] AC5: Drill-down: клик на строку → список лидов этого affiliate/broker/GEO с пагинацией
- [ ] AC6: Date range picker применяется ко всем вкладкам. Presets: today, yesterday, last 7 days, last 30 days, this month, custom
- [ ] AC7: Export: CSV и Excel для каждой таблицы
- [ ] AC8: Загрузка каждой вкладки < 1 сек при 50,000+ лидов за период

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092]

##### Tasks для STORY-094:

**[TASK-0323] API для breakdowns**
- **Тип:** Backend
- **Описание:** Endpoints: (1) `GET /api/v1/analytics/breakdown/affiliates?from=&to=&sort=revenue&order=desc&limit=50&offset=0` — ClickHouse query с GROUP BY affiliate_id, JOIN с PostgreSQL affiliates для names, (2) `/breakdown/brokers` — аналогично с GROUP BY broker_id, (3) `/breakdown/geo` — GROUP BY geo, (4) `/breakdown/{type}/{id}/leads` — drill-down, paginated leads list. Export: `/breakdown/{type}/export?format=csv|xlsx`. Все queries < 500ms на ClickHouse.
- **Критерии готовности (DoD):**
  - [ ] 3 breakdown endpoints работают
  - [ ] Drill-down с пагинацией
  - [ ] CSV и Excel export
  - [ ] Queries < 500ms на 50K+ leads
- **Оценка:** 8h
- **Story:** [STORY-094]

**[TASK-0324] Frontend — Breakdown Tabs**
- **Тип:** Frontend
- **Описание:** Компонент `BreakdownView`: (1) Tab navigation: Affiliates / Brokers / GEO, (2) Sortable table с метриками (AG Grid или custom), (3) GEO tab: choropleth карта (react-simple-maps) + таблица, (4) Drill-down: row click → side panel или sub-page с leads table, (5) Date range picker (react-datepicker) с presets, (6) Export buttons (CSV/Excel) с loading indicator.
- **Критерии готовности (DoD):**
  - [ ] 3 вкладки с таблицами работают
  - [ ] Choropleth карта для GEO
  - [ ] Drill-down до лидов
  - [ ] Date range picker с presets
  - [ ] Export CSV/Excel скачивается
- **Оценка:** 16h
- **Story:** [STORY-094]

**[TASK-0325] Тесты breakdowns**
- **Тип:** QA
- **Описание:** (1) Affiliates breakdown: данные совпадают с raw. (2) Brokers breakdown: cap usage рассчитан правильно. (3) GEO breakdown: карта отображается. (4) Sort by revenue DESC → правильный порядок. (5) Drill-down: клик affiliate → его лиды. (6) Date range: last 7 days → данные за 7 дней. (7) Export CSV: колонки и данные корректны. (8) Empty state: нет данных за период → сообщение.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-094]

---

#### [STORY-095] Affiliate P&L Dashboard

**Как** Finance Manager, **я хочу** видеть P&L (Profit & Loss) по каждому аффилейту (revenue, costs, profit, margin), **чтобы** понимать рентабельность каждого источника трафика и принимать финансовые решения.

**Acceptance Criteria:**
- [ ] AC1: Таблица P&L per affiliate: affiliate name, leads total, FTD count, revenue (sell_price * FTD), cost (buy_price * leads), profit (revenue - cost), margin % (profit/revenue * 100), ROI % (profit/cost * 100)
- [ ] AC2: Summary row: итоги по всем аффилейтам (total revenue, total cost, total profit, avg margin)
- [ ] AC3: Trend columns: profit this month vs last month (delta %, arrow)
- [ ] AC4: Drill-down: клик на affiliate → breakdown по брокерам (куда уходили лиды этого affiliate) + P&L per broker
- [ ] AC5: Chart: stacked bar chart — revenue vs cost per affiliate (top 10), line — margin %
- [ ] AC6: Фильтры: date range, GEO, min leads threshold (скрыть мелких affiliate)
- [ ] AC7: Export: Excel с формулами (margin = revenue - cost в ячейке), PDF для отчёта руководству
- [ ] AC8: Доступ: только Finance Manager и Network Admin (RBAC check)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092], [EPIC-12]

##### Tasks для STORY-095:

**[TASK-0326] API для Affiliate P&L**
- **Тип:** Backend
- **Описание:** Endpoint `GET /api/v1/analytics/pnl/affiliates?from=&to=&geo=&min_leads=10&sort=profit&order=desc`. ClickHouse query: GROUP BY affiliate_id, SUM(sell_price) WHERE event_type='ftd' AS revenue, SUM(buy_price) WHERE event_type='created' AS cost, profit = revenue - cost, margin = profit/revenue*100. Summary: aggregate without GROUP BY. Trend: сравнение с предыдущим аналогичным периодом. RBAC middleware: role IN (finance_manager, network_admin). Drill-down: GET /api/v1/analytics/pnl/affiliates/{id}/brokers.
- **Критерии готовности (DoD):**
  - [ ] P&L per affiliate с summary работает
  - [ ] Trend (month over month) рассчитывается
  - [ ] RBAC: только finance_manager и network_admin
  - [ ] Drill-down по брокерам работает
- **Оценка:** 8h
- **Story:** [STORY-095]

**[TASK-0327] Frontend — Affiliate P&L Dashboard**
- **Тип:** Frontend
- **Описание:** Компонент `AffiliatePnl`: (1) Summary cards: total revenue, total cost, total profit, avg margin, (2) Sortable table с P&L per affiliate, trend arrows, (3) Stacked bar chart (top 10) revenue vs cost + line margin, (4) Drill-down: клик → sub-table brokers, (5) Фильтры: date range, GEO, min leads, (6) Export: Excel (xlsx с формулами — используя exceljs), PDF (html-to-pdf).
- **Критерии готовности (DoD):**
  - [ ] Table и chart отображаются
  - [ ] Summary cards корректны
  - [ ] Drill-down до brokers работает
  - [ ] Export Excel с формулами и PDF
- **Оценка:** 16h
- **Story:** [STORY-095]

**[TASK-0328] Тесты Affiliate P&L**
- **Тип:** QA
- **Описание:** (1) P&L расчёт: revenue=500, cost=300, profit=200, margin=40%. (2) Summary: сумма по всем. (3) Trend: this month 200, last month 150 → +33%. (4) Drill-down: affiliate → brokers P&L. (5) RBAC: media_buyer → 403. (6) Export Excel: формулы работают. (7) Min leads filter: affiliate с 5 leads + min_leads=10 → скрыт.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-095]

---

#### [STORY-096] Shave Detection Analytics

**Как** Network Admin, **я хочу** чтобы система автоматически обнаруживала shave (когда брокер занижает количество подтверждённых лидов/FTD), **чтобы** защитить наш доход и иметь данные для переговоров с брокерами.

**Acceptance Criteria:**
- [ ] AC1: Shave detection алгоритм: сравнение наших данных (leads sent, statuses) vs данных брокера (через reconciliation API или manual upload). Если расхождение > 5% в пользу брокера → shave alert
- [ ] AC2: Statistical analysis: для каждого брокера — rolling 30-day conversion rate. Если текущая неделя значительно ниже (z-score > 2 стандартных отклонения) → potential shave alert
- [ ] AC3: Dashboard: таблица брокеров с shave risk score (0-100), columns: broker, our_leads, broker_confirmed, discrepancy %, shave_risk, trend (7d/30d), last reconciliation date
- [ ] AC4: Drill-down: клик на broker → список конкретных лидов с расхождением (наш статус vs брокерский)
- [ ] AC5: Alert: при shave_risk > 70 → notification (Telegram/email) + выделение красным в dashboard
- [ ] AC6: Historical shave data: график shave % per broker за последние 90 дней (trend line)
- [ ] AC7: Export: reconciliation report per broker (Excel)

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092], [EPIC-12]

##### Tasks для STORY-096:

**[TASK-0329] Shave detection engine**
- **Тип:** Backend
- **Описание:** Go-сервис: (1) Reconciliation comparison: join наших lead_events (status=accepted) vs broker_confirmations table. Discrepancy = (our_count - broker_count) / our_count * 100. (2) Statistical method: rolling 30d conversion rate per broker, calculate mean + stddev, z-score для текущей недели. If z > 2 → alert. (3) Shave risk score: weighted combination (60% discrepancy + 40% statistical anomaly), normalized to 0-100. (4) Cron: ежедневный пересчёт shave scores. (5) Alerts при risk > 70. Результат хранится в таблице `shave_analysis` (broker_id, date, our_count, broker_count, discrepancy_pct, z_score, risk_score).
- **Критерии готовности (DoD):**
  - [ ] Reconciliation comparison работает
  - [ ] Statistical z-score рассчитывается
  - [ ] Risk score 0-100 корректен
  - [ ] Alerts при risk > 70 отправляются
- **Оценка:** 16h
- **Story:** [STORY-096]

**[TASK-0330] Frontend — Shave Detection Dashboard**
- **Тип:** Frontend
- **Описание:** (1) Таблица брокеров с shave metrics: risk score (цветовой bar: зелёный <30, жёлтый 30-70, красный >70), discrepancy %, trend arrow, (2) Drill-down: leads с расхождением, (3) Line chart: shave % per broker за 90d, (4) Export Excel.
- **Критерии готовности (DoD):**
  - [ ] Таблица с risk scores отображается
  - [ ] Drill-down до расходящихся лидов
  - [ ] Trend chart за 90 дней
  - [ ] Export работает
- **Оценка:** 8h
- **Story:** [STORY-096]

**[TASK-0331] Тесты shave detection**
- **Тип:** QA
- **Описание:** (1) Discrepancy 10% → risk > 50. (2) Z-score > 2 → alert. (3) Risk > 70 → notification sent. (4) Drill-down: конкретные расходящиеся лиды. (5) No discrepancy → risk 0. (6) Historical data: 90d chart корректен. (7) False positive: нормальное колебание 3% → no alert.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-096]

---

#### [STORY-097] Predictive Cap Exhaustion Warnings

**Как** Network Admin, **я хочу** получать предупреждения о скором исчерпании капов (на основе текущей скорости заполнения), **чтобы** заранее подключить альтернативных брокеров или скорректировать routing.

**Acceptance Criteria:**
- [ ] AC1: Prediction алгоритм: для каждого активного кап-ограничения (daily cap) рассчитать: текущее заполнение (leads_today / cap_limit), скорость (leads per hour за последние 2 часа), прогноз исчерпания (cap_limit - leads_today) / speed_per_hour = hours_remaining
- [ ] AC2: Warning levels: (a) hours_remaining < 4h → yellow warning, (b) hours_remaining < 1h → red critical, (c) cap_usage > 90% → orange warning
- [ ] AC3: Dashboard widget: список капов с прогнозом исчерпания: broker name, cap (daily/weekly), current usage, speed, ETA exhaustion, status (badge)
- [ ] AC4: Notification: при переходе в yellow/red → alert через notification service (EPIC-11). Не чаще 1 раз в 30 минут per cap (rate limit)
- [ ] AC5: Accuracy: prediction ETA отклоняется от реального времени исчерпания не более чем на 20% (тестируется на исторических данных)
- [ ] AC6: Обновление прогноза каждые 5 минут

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092], [EPIC-02]

##### Tasks для STORY-097:

**[TASK-0332] Cap exhaustion prediction engine**
- **Тип:** Backend
- **Описание:** Go-сервис: (1) Каждые 5 мин: для каждого active cap → query ClickHouse: leads_today count + leads per hour (last 2h avg), (2) ETA = (cap_limit - current) / speed_per_hour, (3) Warning classification: <4h → yellow, <1h → red, usage >90% → orange, (4) Store in Redis: `cap_prediction:{cap_id}` with TTL 10min, (5) Notification: при transition (OK→yellow, yellow→red) → send alert, rate limit 30min per cap. API: GET /api/v1/analytics/caps/predictions.
- **Критерии готовности (DoD):**
  - [ ] Prediction рассчитывается каждые 5 мин
  - [ ] Warning levels корректны
  - [ ] Notifications с rate limit 30min
  - [ ] API endpoint возвращает predictions
- **Оценка:** 8h
- **Story:** [STORY-097]

**[TASK-0333] Frontend — Cap Exhaustion Widget**
- **Тип:** Frontend
- **Описание:** Dashboard widget: (1) Таблица: broker, cap type, limit, current, speed (leads/h), ETA, status badge (green/yellow/orange/red), (2) Progress bar per cap, (3) Sort by ETA ASC (most urgent first), (4) Auto-refresh каждые 5 мин.
- **Критерии готовности (DoD):**
  - [ ] Таблица с predictions отображается
  - [ ] Progress bar и status badges корректны
  - [ ] Sort by urgency
  - [ ] Auto-refresh
- **Оценка:** 4h
- **Story:** [STORY-097]

**[TASK-0334] Тесты cap exhaustion prediction**
- **Тип:** QA
- **Описание:** (1) Cap 100, current 50, speed 20/h → ETA ~2.5h → yellow. (2) Cap 100, current 95, speed 10/h → ETA 30min → red. (3) Cap 100, current 91 → orange (>90%). (4) Speed 0 → ETA = infinity → green. (5) Notification при yellow: отправлена. Повторная через 20 мин → не отправлена (rate limit). (6) Accuracy test: исторические данные, prediction ETA vs actual ≤ 20%.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-097]

---

#### [STORY-098] Date Range Picker, Comparison Mode и Auto-refresh

**Как** Network Admin, **я хочу** выбирать произвольный период для аналитики, сравнивать два периода бок о бок и настраивать автообновление, **чтобы** гибко анализировать данные и отслеживать тренды в реальном времени.

**Acceptance Criteria:**
- [ ] AC1: Date range picker: presets (Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, This Quarter, Custom). Custom: calendar с выбором start/end date, time picker (часы:минуты)
- [ ] AC2: Comparison mode: кнопка "Compare" → выбор второго периода (same length, previous period auto-suggested). Данные отображаются side-by-side: два столбца в таблицах, две линии на графиках (solid = current, dashed = compare)
- [ ] AC3: Auto-refresh: toggle с выбором интервала (Off, 30s, 1m, 5m, 10m). Индикатор: "Last updated: 30 sec ago". При auto-refresh — мягкое обновление без мигания (fade animation)
- [ ] AC4: Date range сохраняется в URL query params (для sharing: `/analytics?from=2026-03-01&to=2026-03-07&compare_from=2026-02-22&compare_to=2026-02-28`)
- [ ] AC5: Timezone selector: UTC (default), user local timezone, specific timezone. Влияет на все даты в analytics
- [ ] AC6: Все analytics компоненты (KPIs, time-series, breakdowns, P&L) реагируют на изменение date range без перезагрузки страницы

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092]

##### Tasks для STORY-098:

**[TASK-0335] Frontend — Date Range Picker и Comparison Mode**
- **Тип:** Frontend
- **Описание:** (1) DateRangePicker компонент: calendar dropdown с presets, custom range, time picker. react-datepicker или custom. (2) Comparison: toggle "Compare", second date range selector, auto-suggest "Previous period". (3) URL sync: useSearchParams для from/to/compare. (4) Context provider: AnalyticsDateContext — все child компоненты читают range из context. (5) Timezone selector: dropdown, хранится в localStorage.
- **Критерии готовности (DoD):**
  - [ ] Presets и custom range работают
  - [ ] Comparison mode с side-by-side
  - [ ] URL params сохраняются и восстанавливаются
  - [ ] Timezone selector влияет на все даты
- **Оценка:** 8h
- **Story:** [STORY-098]

**[TASK-0336] Frontend — Auto-refresh**
- **Тип:** Frontend
- **Описание:** (1) Toggle button: Off / 30s / 1m / 5m / 10m, (2) useInterval hook с выбранным интервалом, (3) При refresh: fetch данные, apply с fade transition (opacity 0.5 → 1), (4) "Last updated" timestamp, (5) Pause auto-refresh при focus loss (document.hidden), resume при focus.
- **Критерии готовности (DoD):**
  - [ ] Auto-refresh работает с выбранным интервалом
  - [ ] Fade animation при обновлении
  - [ ] Pause/resume при visibility change
  - [ ] Last updated отображается
- **Оценка:** 4h
- **Story:** [STORY-098]

**[TASK-0337] Тесты date range и comparison**
- **Тип:** QA
- **Описание:** (1) Preset "Last 7 days" → корректный range. (2) Custom range → from/to в URL. (3) Comparison: previous period auto-suggested correctly. (4) Side-by-side: таблица с двумя колонками. (5) Auto-refresh 30s: данные обновляются. (6) Timezone UTC → local → dates shift correctly. (7) Page reload → range restored from URL.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-098]

---

#### [STORY-099] Dashboard Customization (Drag & Resize Widgets)

**Как** Network Admin, **я хочу** кастомизировать layout аналитического dashboard (перетаскивать виджеты, изменять размеры, скрывать ненужные), **чтобы** настроить рабочее пространство под свои задачи.

**Acceptance Criteria:**
- [ ] AC1: Dashboard состоит из виджетов (widgets): KPI tiles, time-series chart, breakdown table, P&L, cap predictions, shave detection. Каждый — отдельный resizable/draggable блок
- [ ] AC2: Drag-and-drop: перетаскивание виджетов для изменения порядка (react-grid-layout). Grid: 12 columns, responsive breakpoints (desktop 12col, tablet 6col, mobile 1col)
- [ ] AC3: Resize: перетягивание угла виджета для изменения размера (min 2x2, max 12x8 grid units). Chart виджеты автоматически масштабируются
- [ ] AC4: Hide/Show: кнопка "×" скрывает виджет. Sidebar "Add Widget" для добавления скрытых обратно
- [ ] AC5: Layout сохраняется per user в БД (API PUT /api/v1/analytics/dashboard/layout). Восстанавливается при входе
- [ ] AC6: Presets: "Default", "Finance View" (P&L focused), "Operations View" (caps + quality). Кнопка "Reset to Default"
- [ ] AC7: Performance: drag-and-drop работает при 60 FPS с 10+ виджетами

**Story Points:** 8
**Приоритет:** Could
**Epic:** [EPIC-10]
**Зависит от:** [STORY-092], [STORY-093], [STORY-094]

##### Tasks для STORY-099:

**[TASK-0338] Backend — сохранение layout**
- **Тип:** Backend
- **Описание:** Таблица `dashboard_layouts`: id UUID, user_id FK, company_id FK, name varchar 50, layout JSONB (react-grid-layout format: [{i: "kpi", x: 0, y: 0, w: 12, h: 2}, ...]), is_default bool, created_at, updated_at. API: GET /api/v1/analytics/dashboard/layout (current user's layout), PUT (save layout), POST /api/v1/analytics/dashboard/layout/reset (reset to default). Presets: seed data для 3 preset layouts.
- **Критерии готовности (DoD):**
  - [ ] CRUD layout API работает
  - [ ] Layout per user сохраняется и восстанавливается
  - [ ] 3 presets доступны
  - [ ] Reset to default работает
- **Оценка:** 4h
- **Story:** [STORY-099]

**[TASK-0339] Frontend — Customizable Dashboard**
- **Тип:** Frontend
- **Описание:** (1) react-grid-layout integration: drag, resize, responsive breakpoints, (2) Widget wrapper: title bar с "×" close, drag handle, (3) "Add Widget" sidebar: список скрытых виджетов с preview, (4) "Edit Mode" toggle: включает drag/resize handles, (5) Preset selector: dropdown с 3 presets + "Save Current" + "Reset". (6) Auto-save layout при изменении (debounce 2s).
- **Критерии готовности (DoD):**
  - [ ] Drag-and-drop работает
  - [ ] Resize с auto-scaling charts
  - [ ] Hide/Show widgets
  - [ ] Presets и save/reset
  - [ ] 60 FPS при drag с 10+ виджетами
- **Оценка:** 16h
- **Story:** [STORY-099]

**[TASK-0340] Тесты dashboard customization**
- **Тип:** QA
- **Описание:** (1) Drag widget → position saved. (2) Resize → size saved. (3) Hide widget → removed from view, available in "Add". (4) Preset "Finance" → P&L prominent. (5) Reset → default layout. (6) Logout + login → layout restored. (7) Responsive: desktop → tablet → layout adapts. (8) Performance: 10 widgets, drag at 60 FPS.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-099]

---

#### [STORY-100] Hub/Broker ROI Comparison

**Как** Network Admin, **я хочу** сравнивать ROI разных брокеров и хабов (revenue per lead, conversion rate, avg FTD value), **чтобы** оптимизировать распределение трафика в пользу наиболее прибыльных партнёров.

**Acceptance Criteria:**
- [ ] AC1: Comparison table: broker/hub name, leads sent, accepted, FTD count, FTD rate %, revenue, revenue per lead, avg FTD value, ROI %, response time avg
- [ ] AC2: Radar chart: сравнение 2-5 выбранных брокеров по 6 осям (conversion, FTD rate, revenue per lead, speed, acceptance rate, uptime)
- [ ] AC3: Scatter plot: X = leads sent, Y = revenue per lead, bubble size = total revenue. Позволяет визуально определить "лучших" брокеров
- [ ] AC4: Ranking: автоматическое ранжирование брокеров по composite score (weighted: 40% revenue per lead + 30% FTD rate + 20% acceptance rate + 10% speed)
- [ ] AC5: Recommendation badge: "Best Performer", "Under-utilized", "Low ROI" на основе ranking + volume
- [ ] AC6: Фильтры: date range, GEO (сравнение ROI per GEO — один брокер может быть лучшим для DE, но худшим для UK)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-10]
**Зависит от:** [STORY-094], [EPIC-12]

##### Tasks для STORY-100:

**[TASK-0341] API для Broker ROI Comparison**
- **Тип:** Backend
- **Описание:** Endpoint `GET /api/v1/analytics/roi/brokers?from=&to=&geo=&broker_ids=`. ClickHouse queries: per-broker aggregations (leads, accepted, FTD, revenue, costs). Calculated fields: revenue_per_lead, ftd_rate, roi_pct. Composite score calculation. Ranking sort. Recommendation logic: top 20% → "Best Performer", bottom 20% with >100 leads → "Low ROI", top 20% with <50 leads → "Under-utilized".
- **Критерии готовности (DoD):**
  - [ ] ROI per broker рассчитывается корректно
  - [ ] Composite score и ranking работают
  - [ ] Recommendation badges назначаются
  - [ ] GEO filter работает
- **Оценка:** 8h
- **Story:** [STORY-100]

**[TASK-0342] Frontend — ROI Comparison View**
- **Тип:** Frontend
- **Описание:** (1) Comparison table с recommendation badges, (2) Radar chart (Recharts RadarChart): multi-select 2-5 брокеров, 6 осей, (3) Scatter/bubble plot, (4) GEO selector, date range. (5) Export PDF для презентации.
- **Критерии готовности (DoD):**
  - [ ] Table, radar, scatter charts работают
  - [ ] Multi-select для radar comparison
  - [ ] Recommendation badges отображаются
  - [ ] Export PDF
- **Оценка:** 8h
- **Story:** [STORY-100]

**[TASK-0343] Тесты ROI comparison**
- **Тип:** QA
- **Описание:** (1) ROI calculation correct. (2) Ranking: highest score = rank 1. (3) Badge "Best Performer" для top 20%. (4) Radar: 3 brokers → 3 shapes on chart. (5) GEO filter: DE → different ranking than all GEOs. (6) Empty: no FTD → ROI = 0%.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-100]

---

### Сводка EPIC-10

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 9 |
| **Story Points** | 68 (итого) |
| **Must** | 5 stories (42 SP) |
| **Should** | 3 stories (18 SP) |
| **Could** | 1 story (8 SP) |
| **Всего Tasks** | 29 |
| **Backend tasks** | 13 |
| **Frontend tasks** | 11 |
| **QA tasks** | 9 |
| **Оценка (часы)** | ~228h |

---

## [EPIC-11] Notifications & Alerts

**Цель:** Реализовать многоканальную систему уведомлений (Telegram, Email, Webhook) с 20+ типами событий, гибкой фильтрацией и настройками per user. HyperOne имеет Telegram-бот с 17 типами событий — мы покрываем все 17 и добавляем email, webhooks, фильтрацию по affiliate/brand/GEO, quiet hours и DND mode. Система уведомлений используется всеми другими модулями (cap exhaustion, fraud detection, autologin failures, shave detection и т.д.).

**Метрика успеха:**
- Доставка Telegram уведомления < 3 сек от момента события
- Доставка Email < 30 сек от момента события
- Webhook delivery < 5 сек, retry при failure (3 попытки)
- 20+ типов событий покрыты
- 0% потерянных уведомлений (at-least-once delivery)
- Telegram bot uptime ≥ 99.5%

**Приоритет:** P1 (Launch)
**Зависит от:** [EPIC-01], [EPIC-02]
**Оценка:** M

---

### Stories:

---

#### [STORY-101] Telegram Bot Integration

**Как** Network Admin, **я хочу** подключить Telegram-бот к платформе и получать уведомления о важных событиях (кап исчерпан, новый FTD, лид отклонён, брокер недоступен) прямо в Telegram, **чтобы** мгновенно реагировать на критические ситуации, даже когда я не за компьютером.

**Acceptance Criteria:**
- [ ] AC1: Telegram Bot создан через BotFather. Пользователь подключает бот: (1) в UI нажимает "Connect Telegram", (2) получает уникальный 6-значный код, (3) отправляет код боту в Telegram, (4) бот подтверждает подключение. Timeout кода: 10 минут
- [ ] AC2: API `POST /api/v1/notifications/telegram/connect` → возвращает `{code, expires_at}`. API `GET /api/v1/notifications/telegram/status` → `{connected, chat_id_masked, connected_at}`
- [ ] AC3: API `DELETE /api/v1/notifications/telegram/disconnect` — отключение. Бот отправляет "Вы отключены от уведомлений GambChamp CRM"
- [ ] AC4: Доставка уведомления: формат Markdown с emoji-иконками по типу события. Пример: "🔴 Cap Reached\nBroker: XYZ\nGEO: DE\nUsage: 100/100\nTime: 2026-03-04 14:30 UTC"
- [ ] AC5: Команды бота: `/status` — текущие подписки, `/mute 2h` — тихий режим на 2 часа, `/unmute` — включить обратно, `/help` — список команд
- [ ] AC6: Rate limit: максимум 30 сообщений в минуту per user (Telegram API limit). При превышении — batch (группировка в одно сообщение)
- [ ] AC7: Fallback при Telegram API error: retry 3 раза с backoff (1s, 5s, 15s). Если все failed → записать в dead letter queue + alert в UI

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-11]
**Зависит от:** [EPIC-01]

##### Tasks для STORY-101:

**[TASK-0344] Создать Telegram Bot и webhook handler**
- **Тип:** Backend
- **Описание:** (1) Зарегистрировать бот через BotFather (в конфиге: bot token из env variable), (2) Webhook endpoint: POST /webhooks/telegram — обработка incoming messages от Telegram API, (3) Обработка команд: /start → приветствие + инструкция, /status, /mute, /unmute, /help, (4) Обработка 6-значного кода → lookup в Redis (code → user_id, TTL 10min), при совпадении → сохранить chat_id в таблицу `user_telegram_connections` (user_id, chat_id encrypted, connected_at). (5) Таблица в PostgreSQL с encrypted chat_id (AES-256).
- **Критерии готовности (DoD):**
  - [ ] Bot отвечает на команды
  - [ ] Код подключения работает (generate → send → verify)
  - [ ] chat_id зашифрован в БД
  - [ ] Webhook handler обрабатывает все команды
- **Оценка:** 8h
- **Story:** [STORY-101]

**[TASK-0345] Сервис отправки Telegram уведомлений**
- **Тип:** Backend
- **Описание:** Go-сервис: (1) Входящие события из internal message queue (Redis pub/sub), (2) Для каждого события: lookup user subscriptions → get chat_ids → format message (Markdown), (3) Send via Telegram Bot API (sendMessage). Rate limiter: token bucket, 30 msg/min per user, batch при overflow. (4) Retry: 3 attempts, backoff 1s/5s/15s. (5) Dead letter queue при 3 failures. (6) Mute check: if user muted → skip.
- **Критерии готовности (DoD):**
  - [ ] Отправка Telegram сообщений работает
  - [ ] Rate limit 30/min соблюдается
  - [ ] Retry с backoff работает
  - [ ] Mute/unmute проверяется
  - [ ] Dead letter queue при failures
- **Оценка:** 8h
- **Story:** [STORY-101]

**[TASK-0346] Frontend — подключение Telegram**
- **Тип:** Frontend
- **Описание:** В Settings → Notifications: (1) Секция "Telegram": статус (Connected/Not connected), (2) Кнопка "Connect" → модальное окно с 6-значным кодом + QR код для перехода к боту + инструкция "Send this code to @GambChampBot in Telegram", (3) Polling status каждые 3 сек (ожидание подключения), (4) После подключения: "Connected" badge + "Disconnect" кнопка с confirmation.
- **Критерии готовности (DoD):**
  - [ ] Connect flow с кодом и QR работает
  - [ ] Polling определяет подключение
  - [ ] Disconnect с confirmation
  - [ ] Статус отображается корректно
- **Оценка:** 4h
- **Story:** [STORY-101]

**[TASK-0347] Тесты Telegram integration**
- **Тип:** QA
- **Описание:** (1) Generate code → send to bot → connected. (2) Wrong code → "Invalid code" response. (3) Expired code (>10 min) → "Code expired". (4) Send notification → delivered < 3 сек. (5) Mute 2h → no notifications for 2h. (6) Rate limit: 31st message → batched. (7) Telegram API error → retry 3x → dead letter queue. (8) Disconnect → no more notifications.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят (с mock Telegram API)
- **Оценка:** 4h
- **Story:** [STORY-101]

---

#### [STORY-102] Email Alerts

**Как** Network Admin, **я хочу** получать email-уведомления о событиях платформы, **чтобы** иметь официальный канал коммуникации с полной историей уведомлений.

**Acceptance Criteria:**
- [ ] AC1: Email отправляется через настраиваемый SMTP (или API: SendGrid/SES). Конфигурация SMTP в admin settings: host, port, username, password, from_address, from_name. Тестовая отправка через UI
- [ ] AC2: HTML шаблоны email (responsive, работают в Outlook/Gmail/Apple Mail): (a) Alert template (красный header), (b) Warning template (жёлтый header), (c) Info template (синий header), (d) Daily Summary template (таблица KPIs)
- [ ] AC3: Каждый email содержит: logo, event type, details, timestamp, CTA button ("View in Dashboard"), unsubscribe link
- [ ] AC4: Доставка < 30 сек от момента события. Batch mode для non-critical events: группировка за 5 минут → один email
- [ ] AC5: Unsubscribe: one-click unsubscribe (RFC 8058) + unsubscribe link в footer → снимает подписку на конкретный тип события
- [ ] AC6: Bounce handling: если email bounce → пометить email как invalid, alert в UI, не отправлять повторно
- [ ] AC7: Rate limit: максимум 100 emails в час per user

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-11]
**Зависит от:** [EPIC-01]

##### Tasks для STORY-102:

**[TASK-0348] Email delivery service**
- **Тип:** Backend
- **Описание:** Go-сервис: (1) SMTP client (net/smtp) с TLS, connection pool (5 connections), (2) SendGrid/SES adapter (configurable), (3) Template engine: Go html/template с 4 base templates (alert, warning, info, summary), (4) Queue: Redis list для email queue, worker pool (3 workers), (5) Batch mode: для non-critical events — accumulate 5 min → merge into single email, (6) Rate limiter: 100/hour per user, (7) Bounce webhook handler: POST /webhooks/email/bounce — mark email invalid.
- **Критерии готовности (DoD):**
  - [ ] SMTP и API (SendGrid) отправка работает
  - [ ] 4 HTML шаблона рендерятся корректно
  - [ ] Batch mode группирует non-critical
  - [ ] Rate limit и bounce handling работают
- **Оценка:** 8h
- **Story:** [STORY-102]

**[TASK-0349] HTML email templates**
- **Тип:** Design
- **Описание:** 4 responsive HTML email шаблона: (1) Alert (красная полоса, критический стиль), (2) Warning (жёлтая), (3) Info (синяя), (4) Daily Summary (таблица с KPIs). Все шаблоны: (a) responsive (320px-800px), (b) совместимы с Outlook (table layout), Gmail (no `<style>` block, inline styles), Apple Mail, (c) Logo + branding, (d) CTA button, (e) Unsubscribe footer. Тестирование через Litmus/Email on Acid.
- **Критерии готовности (DoD):**
  - [ ] 4 шаблона созданы
  - [ ] Тестирование в 3+ email клиентах
  - [ ] Responsive от 320px до 800px
  - [ ] Inline styles для Gmail compatibility
- **Оценка:** 8h
- **Story:** [STORY-102]

**[TASK-0350] Frontend — SMTP настройки и тестовая отправка**
- **Тип:** Frontend
- **Описание:** В Admin Settings → Email: (1) Форма SMTP: host, port, username, password (hidden), from_address, from_name, encryption (TLS/SSL/None), (2) Кнопка "Test Connection" → проверка SMTP connect, (3) Кнопка "Send Test Email" → отправка тестового email текущему пользователю, (4) Альтернатива: dropdown "Provider" → SendGrid/SES → API key field.
- **Критерии готовности (DoD):**
  - [ ] SMTP форма с валидацией работает
  - [ ] Test connection и test email работают
  - [ ] SendGrid/SES альтернатива
  - [ ] Password field скрыт
- **Оценка:** 4h
- **Story:** [STORY-102]

**[TASK-0351] Тесты email alerts**
- **Тип:** QA
- **Описание:** (1) SMTP send → email delivered. (2) HTML template renders correctly (snapshot test). (3) Batch: 5 non-critical events → 1 email after 5 min. (4) Rate limit: 101st email → queued, not sent. (5) Bounce → email marked invalid. (6) Unsubscribe link → event type unsubscribed. (7) Test connection: valid SMTP → success, invalid → error message.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Mock SMTP для тестов
- **Оценка:** 4h
- **Story:** [STORY-102]

---

#### [STORY-103] Webhook Notifications

**Как** Developer, **я хочу** получать уведомления о событиях через webhook (HTTP POST), **чтобы** интегрировать CRM-события с внешними системами (Slack, собственные дашборды, алерт-менеджеры).

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/notifications/webhooks` — создать webhook endpoint: `url` (HTTPS required), `events` (массив event types), `secret` (auto-generated HMAC secret для верификации), `headers` (custom headers JSONB, optional). Максимум 10 webhooks per company
- [ ] AC2: Delivery: HTTP POST к URL с JSON body: `{event_type, timestamp, data: {...}, company_id}`. Header: `X-Signature: HMAC-SHA256(body, secret)` для верификации подлинности
- [ ] AC3: Retry policy: при non-2xx response → retry 3 раза с exponential backoff (10s, 60s, 300s). При 3 failures → webhook disabled + notification
- [ ] AC4: Delivery log: для каждого webhook — история доставок: timestamp, event_type, http_status, response_time, retry_count. Retention: 7 дней
- [ ] AC5: API `POST /api/v1/notifications/webhooks/{id}/test` — отправить тестовое событие для проверки
- [ ] AC6: Timeout: 10 сек на ответ. При timeout → считается failure
- [ ] AC7: Webhook URL validation: HTTPS only, не localhost, не private IPs (10.x, 192.168.x, 172.16-31.x)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-11]
**Зависит от:** [EPIC-01]

##### Tasks для STORY-103:

**[TASK-0352] Webhook delivery service**
- **Тип:** Backend
- **Описание:** (1) Таблица `webhooks`: id, company_id, url, events (JSONB array), secret (encrypted), headers (JSONB), status (active/disabled), failure_count, created_at. (2) Таблица `webhook_deliveries`: id, webhook_id, event_type, request_body, response_status, response_body (truncated 1KB), duration_ms, retry_count, created_at. (3) Delivery: HTTP POST with HMAC-SHA256 signature, custom headers, timeout 10s. (4) Retry: async queue (Redis), 3 attempts backoff. (5) URL validation: HTTPS, no private IPs (net.IP.IsPrivate()), no localhost. (6) Auto-disable after 3 consecutive failures. (7) Cleanup: deliveries > 7 days → delete.
- **Критерии готовности (DoD):**
  - [ ] Webhook delivery с HMAC signature работает
  - [ ] Retry 3x с backoff
  - [ ] URL validation (HTTPS, no private IPs)
  - [ ] Auto-disable при failures
  - [ ] Delivery log с retention 7 дней
- **Оценка:** 8h
- **Story:** [STORY-103]

**[TASK-0353] Frontend — Webhook management**
- **Тип:** Frontend
- **Описание:** В Settings → Webhooks: (1) Список webhooks: URL, events count, status, last delivery status, failure count, (2) "Add Webhook" → form: URL, events (multi-select checkboxes), custom headers (key-value pairs), (3) Secret: shown once at creation (copy button), regenerate option, (4) "Test" button → send test event → show result, (5) Delivery log: expandable row → last 20 deliveries.
- **Критерии готовности (DoD):**
  - [ ] CRUD webhooks через UI
  - [ ] Secret shown once + copy
  - [ ] Test webhook delivery
  - [ ] Delivery log отображается
- **Оценка:** 4h
- **Story:** [STORY-103]

**[TASK-0354] Тесты webhook notifications**
- **Тип:** QA
- **Описание:** (1) Create webhook + deliver event → POST received with correct signature. (2) HMAC verification: tampered body → signature mismatch. (3) Non-2xx response → retry 3x. (4) 3 failures → webhook disabled. (5) Test endpoint → test event delivered. (6) URL validation: HTTP → rejected, private IP → rejected. (7) Timeout > 10s → failure. (8) Max 10 webhooks → 11th rejected.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Mock HTTP server для webhook testing
- **Оценка:** 4h
- **Story:** [STORY-103]

---

#### [STORY-104] Event Types и конфигурация подписок (20+ событий)

**Как** Network Admin, **я хочу** подписаться на конкретные типы событий (из 20+ доступных) и настроить канал доставки для каждого, **чтобы** получать только релевантные уведомления через удобный канал.

**Acceptance Criteria:**
- [ ] AC1: 22 типа событий, сгруппированных по категориям:
  - Leads (6): lead_created, lead_accepted, lead_rejected, lead_duplicate, lead_ftd, lead_status_changed
  - Caps (3): cap_reached, cap_warning_80, cap_warning_90
  - Brokers (4): broker_down, broker_recovered, broker_response_slow, broker_error_rate_high
  - Fraud (3): fraud_detected, fraud_score_high, shave_suspected
  - UAD (2): uad_scenario_completed, uad_scenario_failed
  - System (2): daily_summary, weekly_report
  - Autologin (2): autologin_circuit_open, autologin_success_rate_low
- [ ] AC2: API `GET /api/v1/notifications/event-types` — список всех типов с описанием, категорией, default severity (critical/warning/info)
- [ ] AC3: API `PUT /api/v1/notifications/preferences` — настройка per user: для каждого event type → channels (telegram, email, webhook), enabled (bool). Body: `{preferences: [{event_type: "cap_reached", channels: ["telegram", "email"], enabled: true}, ...]}`
- [ ] AC4: Default preferences при создании пользователя: critical events → все каналы, warning → telegram, info → none
- [ ] AC5: Bulk toggle: "Enable all", "Disable all", "Reset to defaults"
- [ ] AC6: Validation: нельзя отключить critical events полностью (минимум 1 канал) → HTTP 422

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-11]
**Зависит от:** [STORY-101], [STORY-102], [STORY-103]

##### Tasks для STORY-104:

**[TASK-0355] Event types registry и notification dispatcher**
- **Тип:** Backend
- **Описание:** (1) Таблица `notification_event_types`: type (varchar PK), category (enum), description, severity (enum: critical, warning, info), is_active bool. Seed data для 22 типов. (2) Таблица `user_notification_preferences`: user_id FK, event_type FK, channels (JSONB array), enabled bool. (3) Default preferences trigger: при INSERT в users → INSERT default preferences. (4) Notification Dispatcher: при получении события → lookup user preferences → route to appropriate channel(s) (telegram/email/webhook). Fan-out через goroutine pool.
- **Критерии готовности (DoD):**
  - [ ] 22 типа событий зарегистрированы
  - [ ] Preferences per user работают
  - [ ] Default preferences при создании user
  - [ ] Dispatcher роутит в правильные каналы
  - [ ] Validation: critical events не отключаемы полностью
- **Оценка:** 8h
- **Story:** [STORY-104]

**[TASK-0356] Frontend — Notification Preferences**
- **Тип:** Frontend
- **Описание:** В Settings → Notifications → Preferences: (1) Таблица по категориям (accordion): event type name, description, severity badge, toggle per channel (Telegram checkbox, Email checkbox, Webhook checkbox), (2) Bulk actions: "Enable All Telegram", "Disable All Email", "Reset to Defaults", (3) Save button (batch PUT), (4) Tooltip при hover на event type: описание + пример уведомления, (5) Validation: red warning при попытке отключить все каналы для critical event.
- **Критерии готовности (DoD):**
  - [ ] Таблица 22 событий по категориям
  - [ ] Toggle per channel работает
  - [ ] Bulk actions работают
  - [ ] Validation critical events
- **Оценка:** 8h
- **Story:** [STORY-104]

**[TASK-0357] Тесты event types и preferences**
- **Тип:** QA
- **Описание:** (1) 22 event types зарегистрированы. (2) Default preferences для нового user: critical → all channels. (3) Custom preferences: disable email for cap_reached → email not sent. (4) Bulk enable all telegram → all events have telegram. (5) Disable all channels for critical → 422. (6) Dispatcher: event "cap_reached" + user pref telegram+email → both sent.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-104]

---

#### [STORY-105] Фильтрация уведомлений по Affiliate/Brand/GEO

**Как** Affiliate Manager, **я хочу** получать уведомления только по моим аффилейтам или определённым GEO, **чтобы** не быть завалённым уведомлениями о нерелевантных событиях.

**Acceptance Criteria:**
- [ ] AC1: Notification filters per user: `affiliate_ids` (массив — уведомления только по этим аффилейтам), `broker_ids` (массив), `geos` (массив ISO кодов). Пустой массив = все
- [ ] AC2: API `PUT /api/v1/notifications/filters` — сохранить фильтры. Валидация: affiliate_ids и broker_ids должны существовать и быть доступны данному user (RBAC)
- [ ] AC3: При отправке уведомления: если событие содержит affiliate_id/broker_id/geo → проверить filters пользователя. Если не совпадает → skip для данного пользователя
- [ ] AC4: "Watch" feature: кнопка "Watch" на странице affiliate/broker/GEO → автоматически добавляет в фильтр уведомлений
- [ ] AC5: Filter scope: per event type или global. Например: "cap_reached" → filter by broker_ids; "lead_rejected" → filter by affiliate_ids + geos

**Story Points:** 3
**Приоритет:** Should
**Epic:** [EPIC-11]
**Зависит от:** [STORY-104]

##### Tasks для STORY-105:

**[TASK-0358] Notification filter engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `user_notification_filters`: user_id FK, affiliate_ids (UUID array), broker_ids (UUID array), geos (text array), per_event_overrides (JSONB: {event_type: {affiliate_ids, broker_ids, geos}}). (2) В Notification Dispatcher: перед отправкой → check filters. Event context содержит affiliate_id, broker_id, geo. If filter set and event value NOT IN filter → skip. (3) "Watch" API: POST /api/v1/notifications/watch — body: {entity_type: "affiliate"|"broker"|"geo", entity_id}. Adds to filter array.
- **Критерии готовности (DoD):**
  - [ ] Фильтрация по affiliate/broker/geo работает
  - [ ] Per-event overrides работают
  - [ ] Watch API добавляет в фильтры
  - [ ] Пустой фильтр = получать все
- **Оценка:** 4h
- **Story:** [STORY-105]

**[TASK-0359] Frontend — notification filters**
- **Тип:** Frontend
- **Описание:** (1) Settings → Notifications → Filters: multi-select для affiliates, brokers, GEOs, (2) "Watch" button на страницах Affiliate detail, Broker detail, GEO pages, (3) Filter preview: "You will receive notifications for: Affiliate A, Affiliate B, GEO: DE, AT".
- **Критерии готовности (DoD):**
  - [ ] Filter selectors работают
  - [ ] Watch button на entity pages
  - [ ] Preview text корректен
- **Оценка:** 4h
- **Story:** [STORY-105]

**[TASK-0360] Тесты notification filters**
- **Тип:** QA
- **Описание:** (1) Filter affiliate A → events for A delivered, events for B not delivered. (2) Filter GEO DE → DE events delivered, UK not. (3) Per-event override: cap_reached filter broker X → only broker X cap events. (4) Watch affiliate → added to filters. (5) Empty filters → all events delivered.
- **Критерии готовности (DoD):**
  - [ ] 5 тест-кейсов проходят
- **Оценка:** 2h
- **Story:** [STORY-105]

---

#### [STORY-106] Quiet Hours и DND Mode

**Как** Network Admin, **я хочу** настроить тихие часы (не получать уведомления ночью) и режим DND (полная тишина на заданное время), **чтобы** не быть разбуженным некритическими уведомлениями.

**Acceptance Criteria:**
- [ ] AC1: Quiet Hours: настройка per user — start time (HH:MM), end time (HH:MM), timezone, дни недели (checkboxes Mon-Sun). Во время quiet hours: critical events → доставляются, warning/info → буферизируются и доставляются после quiet hours одним batch
- [ ] AC2: DND mode: мгновенное включение с duration: 1h, 2h, 4h, 8h, until tomorrow, custom datetime. Все events (включая critical) буферизируются
- [ ] AC3: DND override: если событие имеет override_dnd=true (например, system down) → доставляется даже в DND
- [ ] AC4: API `PUT /api/v1/notifications/quiet-hours` — настройка. `POST /api/v1/notifications/dnd` — включить DND. `DELETE /api/v1/notifications/dnd` — выключить
- [ ] AC5: UI indicator: иконка "Do Not Disturb" в header когда DND активен, клик → отключить
- [ ] AC6: Buffered notifications: после окончания quiet hours/DND → один summary email/telegram с количеством пропущенных + top 5 critical events

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-11]
**Зависит от:** [STORY-104]

##### Tasks для STORY-106:

**[TASK-0361] Quiet Hours и DND engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `user_quiet_hours`: user_id, start_time TIME, end_time TIME, timezone varchar, days_of_week int[] (1=Mon, 7=Sun). (2) Redis key `dnd:{user_id}` с TTL = duration. (3) В Notification Dispatcher: перед отправкой → check quiet hours (current time in user TZ, day of week), check DND (Redis EXISTS). If quiet hours + non-critical → buffer in Redis list `buffered:{user_id}`. If DND + not override → buffer. (4) Cron каждые 1 мин: check if any user's quiet hours just ended → flush buffer (send summary). (5) DND end: similar flush.
- **Критерии готовности (DoD):**
  - [ ] Quiet hours блокирует non-critical
  - [ ] DND блокирует all (except override)
  - [ ] Buffer flush после окончания
  - [ ] Summary содержит count + top 5
- **Оценка:** 8h
- **Story:** [STORY-106]

**[TASK-0362] Frontend — Quiet Hours и DND**
- **Тип:** Frontend
- **Описание:** (1) Settings → Notifications → Quiet Hours: time pickers (start/end), timezone dropdown, days checkboxes, (2) Header icon: "DND" bell with slash, dropdown: "Enable DND for: 1h, 2h, 4h, 8h, Until tomorrow, Custom", (3) Active DND: red badge on bell icon, click → "Disable DND" option, (4) Tooltip: "DND active until 08:00 UTC. 12 notifications buffered".
- **Критерии готовности (DoD):**
  - [ ] Quiet hours form сохраняется
  - [ ] DND toggle в header работает
  - [ ] Active DND визуально обозначен
  - [ ] Tooltip с buffered count
- **Оценка:** 4h
- **Story:** [STORY-106]

**[TASK-0363] Тесты Quiet Hours и DND**
- **Тип:** QA
- **Описание:** (1) Quiet hours 22:00-08:00, event at 23:00 warning → buffered. (2) Event at 23:00 critical → delivered. (3) Quiet hours end 08:00 → summary с buffered events. (4) DND 2h → all events buffered for 2h. (5) DND override event → delivered. (6) DND disable early → buffer flushed immediately. (7) Timezone: user in UTC+3, quiet hours 22:00 → check at 22:00 UTC+3, not UTC.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-106]

---

#### [STORY-107] Daily Summary и Notification History

**Как** Team Lead, **я хочу** получать ежедневный summary (итоги дня) и видеть историю всех уведомлений, **чтобы** не пропустить важные события и анализировать паттерны.

**Acceptance Criteria:**
- [ ] AC1: Daily Summary: автоматическая отправка в настраиваемое время (default 09:00 по timezone пользователя). Содержит: leads today (total/accepted/rejected), top 3 affiliates, top 3 brokers, revenue, FTD count, cap status, anomalies count, comparison vs yesterday
- [ ] AC2: Weekly Report: отправка по понедельникам. Содержит: 7-day trends, week-over-week comparison, top/bottom performers
- [ ] AC3: Notification History: API `GET /api/v1/notifications/history?from=&to=&type=&channel=` — список всех уведомлений per user с пагинацией. Retention: 90 дней
- [ ] AC4: Frontend: страница "Notification Center": (1) Bell icon в header с badge (unread count), (2) Dropdown: last 10 notifications, (3) Full page: filterable history table
- [ ] AC5: Mark as read: individual и bulk. API `POST /api/v1/notifications/read` с body `{notification_ids: []}` или `{all: true}`
- [ ] AC6: Notification Center загрузка < 500ms, unread count обновляется через WebSocket

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-11]
**Зависит от:** [STORY-104]

##### Tasks для STORY-107:

**[TASK-0364] Daily/Weekly summary generator**
- **Тип:** Backend
- **Описание:** (1) Cron: ежедневно в user-configured time → для каждого подписанного user: query ClickHouse для daily KPIs, top affiliates, top brokers, anomalies. Format as HTML (email) + Markdown (Telegram). (2) Weekly: Monday cron → 7-day aggregation. (3) Таблица `notification_log`: id, user_id, event_type, channel, payload (JSONB), status (sent/failed/buffered), is_read bool, created_at. Retention: 90 days.
- **Критерии готовности (DoD):**
  - [ ] Daily summary генерируется и отправляется
  - [ ] Weekly report генерируется по понедельникам
  - [ ] Notification log записывается
  - [ ] Retention 90 дней (cron cleanup)
- **Оценка:** 8h
- **Story:** [STORY-107]

**[TASK-0365] Frontend — Notification Center**
- **Тип:** Frontend
- **Описание:** (1) Bell icon в header: unread badge (WebSocket), (2) Dropdown: last 10, Mark All Read, View All, (3) Full page /notifications: table с filters (type, channel, date range, read/unread), (4) Mark as read: click → read, bulk checkboxes, (5) Notification item: icon (by type), title, description (truncated), timestamp, channel badge.
- **Критерии готовности (DoD):**
  - [ ] Bell icon с badge работает
  - [ ] Dropdown с last 10
  - [ ] Full page с filters и pagination
  - [ ] Mark read (individual + bulk)
- **Оценка:** 8h
- **Story:** [STORY-107]

**[TASK-0366] Тесты notification history**
- **Тип:** QA
- **Описание:** (1) Daily summary содержит все KPIs. (2) Weekly report отправляется по понедельникам. (3) History: 100 notifications, filter by type → correct subset. (4) Mark as read → is_read = true, badge count decremented. (5) Retention: notifications > 90 days → deleted. (6) Unread count via WebSocket: new notification → badge +1.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-107]

---

### Сводка EPIC-11

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 7 |
| **Story Points** | 39 (итого) |
| **Must** | 4 stories (26 SP) |
| **Should** | 3 stories (13 SP) |
| **Could** | 0 stories |
| **Всего Tasks** | 23 |
| **Backend tasks** | 11 |
| **Frontend tasks** | 7 |
| **QA tasks** | 7 |
| **Design tasks** | 1 |
| **Оценка (часы)** | ~134h |

---

## [EPIC-12] Conversions & Basic P&L

**Цель:** Реализовать регистрацию конверсий (FTD — First Time Deposit) от брокерских callback-ов, атрибуцию конверсии к аффилейту и лиду, настройку buy/sell price, расчёт базового P&L (Profit & Loss) per lead / per affiliate / per broker, reconciliation с данными брокера и управление выплатами аффилейтам. Это финансовое ядро платформы, обеспечивающее transparency и accountability для всех сторон.

**Метрика успеха:**
- FTD callback обработка < 500ms (p95)
- Attribution accuracy: 100% — каждый FTD привязан к корректному lead и affiliate
- P&L расчёт: расхождение с ручным расчётом < 0.01%
- Reconciliation report генерируется < 5 сек на 10,000 leads
- Financial export соответствует бухгалтерским стандартам (все суммы, даты, ID)
- Payout tracking: 100% выплат отслеживаются

**Приоритет:** P1 (Launch)
**Зависит от:** [EPIC-03], [EPIC-04]
**Оценка:** L

---

### Stories:

---

#### [STORY-108] FTD Tracking — приём конверсий от брокеров

**Как** Network Admin, **я хочу** чтобы система автоматически принимала FTD (First Time Deposit) callbacks от брокеров и привязывала их к соответствующим лидам, **чтобы** в реальном времени отслеживать конверсии и рассчитывать выручку.

**Acceptance Criteria:**
- [ ] AC1: API endpoint `POST /api/v1/conversions/callback` — принимает FTD от брокера. Payload: `{lead_id (UUID or external_id), broker_id, event_type: "ftd", deposit_amount (decimal), currency (ISO 4217), deposited_at (ISO 8601), metadata (JSONB)}`. Authentication: по API key broker-а (из EPIC-03)
- [ ] AC2: Дедупликация: если FTD для данного lead_id + broker_id уже существует → HTTP 409 `DUPLICATE_FTD`. Идемпотентность через `idempotency_key` в header (optional)
- [ ] AC3: Attribution: по lead_id найти affiliate_id, campaign, sub_id, GEO. Если lead_id не найден → HTTP 404 `LEAD_NOT_FOUND`, записать в `unmatched_conversions` для manual review
- [ ] AC4: При успешном FTD: (a) обновить lead.status = `ftd`, (b) создать запись в `conversions` table, (c) отправить event в Kafka (для analytics и notifications), (d) HTTP 200 с `{conversion_id}`
- [ ] AC5: Обработка < 500ms (p95). Rate limit: 100 req/sec per broker
- [ ] AC6: Альтернативный приём: POST /api/v1/conversions/import — bulk import CSV с FTD данными (для брокеров без API callback). Max 5000 rows
- [ ] AC7: Postback URL генерируется per broker: `https://crm.example.com/api/v1/conversions/callback?broker_key={key}&lead_id={lead_id}` — для настройки на стороне брокера

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-12]
**Зависит от:** [EPIC-03]

##### Tasks для STORY-108:

**[TASK-0367] Схема БД для conversions**
- **Тип:** Backend
- **Описание:** Миграция PostgreSQL: (1) Таблица `conversions`: id UUID PK, lead_id FK, affiliate_id FK, broker_id FK, company_id FK, event_type enum('ftd', 'qualification', 'retention'), deposit_amount decimal(12,2), currency char(3), deposited_at timestamptz, sell_price decimal(12,2) nullable, buy_price decimal(12,2) nullable, profit decimal(12,2) nullable, idempotency_key varchar(64) nullable, metadata JSONB, created_at timestamptz. (2) Таблица `unmatched_conversions`: id, broker_id, payload JSONB, reason varchar, resolved bool, resolved_at, created_at. Индексы: conversions(company_id, lead_id), conversions(company_id, affiliate_id, created_at), conversions(idempotency_key) UNIQUE WHERE NOT NULL, unmatched(company_id, resolved).
- **Критерии готовности (DoD):**
  - [ ] Миграции созданы и применены
  - [ ] Unique constraint на idempotency_key
  - [ ] Индексы оптимальны для основных queries
- **Оценка:** 4h
- **Story:** [STORY-108]

**[TASK-0368] API callback handler для FTD**
- **Тип:** Backend
- **Описание:** Go handler: (1) Auth: lookup broker by API key (from header or query param), (2) Validation: lead_id required, event_type required, deposit_amount >= 0, currency valid ISO 4217, (3) Dedup: check idempotency_key or (lead_id + broker_id + event_type) → 409 if exists, (4) Attribution: query leads table by lead_id → get affiliate_id, campaign, geo. If not found → insert into unmatched_conversions, return 404, (5) Insert conversion, update lead status, publish Kafka event. (6) Postback URL generator: GET /api/v1/brokers/{id}/postback-url — generates URL with placeholders.
- **Критерии готовности (DoD):**
  - [ ] Callback handler с auth, validation, dedup работает
  - [ ] Attribution через lead_id → affiliate_id
  - [ ] Unmatched conversions записываются
  - [ ] Kafka event published
  - [ ] Postback URL generator работает
- **Оценка:** 8h
- **Story:** [STORY-108]

**[TASK-0369] Bulk CSV Import для FTD**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/conversions/import` — multipart/form-data. CSV format: lead_id, deposit_amount, currency, deposited_at. Парсинг с валидацией каждой строки. Batch insert. Ответ: `{imported: N, duplicates: N, not_found: N, errors: [{row, error}]}`. Max 5000 rows. Background processing для больших файлов (> 1000 rows): HTTP 202 + job_id, polling endpoint GET /api/v1/conversions/import/{job_id}/status.
- **Критерии готовности (DoD):**
  - [ ] CSV парсинг с валидацией работает
  - [ ] Batch insert с dedup
  - [ ] Background processing для > 1000 rows
  - [ ] Job status polling работает
- **Оценка:** 8h
- **Story:** [STORY-108]

**[TASK-0370] Frontend — Conversions management**
- **Тип:** Frontend
- **Описание:** (1) Страница "Conversions": таблица с колонками — conversion_id, lead email (masked), affiliate, broker, deposit amount, currency, status, date. Фильтры: broker, affiliate, date range, currency. (2) "Import CSV" button → upload form с drag-and-drop, progress bar, результат (imported/errors), (3) "Unmatched" tab: список unmatched conversions с кнопкой "Match" (manual assign lead_id), (4) Postback URL: на странице broker settings → copy-to-clipboard.
- **Критерии готовности (DoD):**
  - [ ] Conversions table с фильтрами и пагинацией
  - [ ] CSV import с UI feedback
  - [ ] Unmatched resolution UI
  - [ ] Postback URL copy
- **Оценка:** 8h
- **Story:** [STORY-108]

**[TASK-0371] Тесты FTD tracking**
- **Тип:** QA
- **Описание:** (1) Callback: valid FTD → 200, conversion created, lead status=ftd. (2) Duplicate FTD → 409. (3) Unknown lead → 404, unmatched saved. (4) Invalid broker API key → 401. (5) CSV import 100 rows → 95 imported, 3 dupes, 2 not found. (6) Rate limit: 101 req/sec → 429. (7) Idempotency key: same key twice → 409. (8) Kafka event published on FTD.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-108]

---

#### [STORY-109] Настройка Buy Price и Sell Price

**Как** Finance Manager, **я хочу** настраивать buy price (что платим аффилейту за лид) и sell price (что брокер платит нам) для различных комбинаций affiliate/broker/GEO, **чтобы** система корректно рассчитывала P&L.

**Acceptance Criteria:**
- [ ] AC1: Price configuration hierarchy (от общего к частному, более конкретное переопределяет общее): Level 1: default per company, Level 2: per affiliate, Level 3: per broker, Level 4: per affiliate + broker, Level 5: per affiliate + broker + GEO. Lookup: от L5 к L1 — используется наиболее конкретная конфигурация
- [ ] AC2: API `POST /api/v1/pricing/rules` — создать правило: `affiliate_id` (nullable), `broker_id` (nullable), `geo` (nullable), `buy_price` (decimal), `sell_price` (decimal), `currency` (ISO 4217), `price_model` (enum: `cpa` — за accepted lead, `cpl` — за каждый lead, `revshare` — % от deposit). Ответ 201
- [ ] AC3: API `GET /api/v1/pricing/rules` — список правил с фильтрами. `GET /api/v1/pricing/calculate?lead_id=X` — рассчитать buy/sell price для конкретного лида (preview)
- [ ] AC4: При конверсии (FTD callback): автоматически рассчитать sell_price и buy_price на основе pricing rules и записать в conversion. Для revshare: sell_price = deposit_amount * revshare_percent
- [ ] AC5: Pricing history: при изменении правила — старое сохраняется с effective_until. Конверсии рассчитываются по правилу, действовавшему на момент lead creation (не текущему)
- [ ] AC6: Валидация: buy_price < sell_price per rule (предупреждение, не блокировка — бывают loss-leader стратегии)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-12]
**Зависит от:** [EPIC-03], [EPIC-04]

##### Tasks для STORY-109:

**[TASK-0372] Pricing rules engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `pricing_rules`: id UUID, company_id FK, affiliate_id FK nullable, broker_id FK nullable, geo char(2) nullable, buy_price decimal(10,2), sell_price decimal(10,2), currency char(3), price_model enum(cpa, cpl, revshare), revshare_percent decimal(5,2) nullable, effective_from timestamptz, effective_until timestamptz nullable, created_by FK, created_at. (2) Pricing lookup: function `getPricing(affiliate_id, broker_id, geo, date) → {buy_price, sell_price, price_model}`. Алгоритм: query rules WHERE (affiliate_id=? OR affiliate_id IS NULL) AND (broker_id=? OR broker_id IS NULL) AND (geo=? OR geo IS NULL) AND effective_from <= date AND (effective_until IS NULL OR effective_until > date) ORDER BY specificity DESC LIMIT 1. Specificity score = count of non-null fields. (3) Cache: Redis with TTL 5min, invalidate on rule change.
- **Критерии готовности (DoD):**
  - [ ] Pricing rules CRUD API работает
  - [ ] Hierarchical lookup (L1-L5) корректен
  - [ ] History с effective_from/until
  - [ ] Redis cache с invalidation
  - [ ] Revshare calculation works
- **Оценка:** 8h
- **Story:** [STORY-109]

**[TASK-0373] Интеграция pricing с conversion pipeline**
- **Тип:** Backend
- **Описание:** В FTD callback handler (TASK-0368): после attribution → вызвать getPricing(affiliate_id, broker_id, geo, lead.created_at). Для CPA: sell_price = rule.sell_price, buy_price = rule.buy_price. Для CPL: аналогично. Для Revshare: sell_price = deposit_amount * revshare_percent / 100, buy_price = rule.buy_price (fixed). Записать в conversion: sell_price, buy_price, profit = sell_price - buy_price.
- **Критерии готовности (DoD):**
  - [ ] CPA pricing applied correctly
  - [ ] CPL pricing applied correctly
  - [ ] Revshare рассчитывается от deposit amount
  - [ ] Profit = sell - buy
- **Оценка:** 4h
- **Story:** [STORY-109]

**[TASK-0374] Frontend — Pricing Rules Management**
- **Тип:** Frontend
- **Описание:** Страница "Pricing": (1) Таблица правил: affiliate (or "All"), broker (or "All"), GEO (or "All"), model (badge), buy price, sell price, revshare %, effective from, status (active/expired). Sort by specificity. (2) "Add Rule" → form: affiliate dropdown (optional), broker dropdown (optional), GEO dropdown (optional), model radio, prices, effective from. (3) Warning: buy_price > sell_price → yellow banner "Negative margin". (4) Calculator: "Calculate for Lead" → select lead → show applied rule + calculated prices. (5) History: click rule → versions timeline.
- **Критерии готовности (DoD):**
  - [ ] Rules table с фильтрами
  - [ ] Add rule form с validation
  - [ ] Negative margin warning
  - [ ] Price calculator работает
  - [ ] History timeline отображается
- **Оценка:** 8h
- **Story:** [STORY-109]

**[TASK-0375] Тесты pricing rules**
- **Тип:** QA
- **Описание:** (1) Default rule (company level) → applied when no specific rule. (2) Affiliate-specific rule overrides default. (3) Affiliate + Broker + GEO rule overrides all. (4) Revshare: deposit 1000, revshare 20% → sell_price 200. (5) History: change rule → old rule has effective_until, new rule used for new leads. (6) Old lead uses old pricing (by lead.created_at). (7) Calculate preview → correct prices. (8) buy > sell → warning, but saved.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-109]

---

#### [STORY-110] P&L Calculation per Lead / Affiliate / Broker

**Как** Finance Manager, **я хочу** видеть P&L (Profit & Loss) на уровне отдельного лида, аффилейта и брокера, **чтобы** детально анализировать прибыльность каждого направления.

**Acceptance Criteria:**
- [ ] AC1: P&L per lead: на карточке лида — sell_price, buy_price, profit, margin %. Если FTD нет → "Pending conversion"
- [ ] AC2: P&L per affiliate (aggregated): total leads, total FTD, total revenue (sum sell_price), total cost (sum buy_price), total profit, margin %, ROI %. Date range filter
- [ ] AC3: P&L per broker (aggregated): total leads received, total accepted, total FTD, total revenue, avg sell_price per FTD, ROI %
- [ ] AC4: Cross-table: affiliate vs broker matrix — profit в каждой ячейке. Позволяет увидеть, какая комбинация affiliate+broker наиболее прибыльна
- [ ] AC5: P&L данные обновляются в ClickHouse при каждой конверсии (event-driven). Задержка < 5 сек от FTD до отражения в P&L
- [ ] AC6: API endpoints: `GET /api/v1/analytics/pnl/leads?lead_id=X`, `GET /api/v1/analytics/pnl/summary?group_by=affiliate|broker&from=&to=`, `GET /api/v1/analytics/pnl/matrix?from=&to=`
- [ ] AC7: RBAC: P&L доступен только для ролей finance_manager, network_admin, team_lead (read-only для team_lead)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-12]
**Зависит от:** [STORY-108], [STORY-109]

##### Tasks для STORY-110:

**[TASK-0376] ClickHouse materialized views для P&L**
- **Тип:** Backend
- **Описание:** (1) ClickHouse materialized view `pnl_by_affiliate`: GROUP BY company_id, affiliate_id, toDate(created_at) → sum sell_price, sum buy_price, sum profit, count leads, count ftd. (2) `pnl_by_broker`: аналогично GROUP BY broker_id. (3) `pnl_matrix`: GROUP BY affiliate_id, broker_id, toDate(created_at). (4) Данные поступают из Kafka при FTD event → INSERT INTO lead_events с sell_price, buy_price. (5) API endpoints с ClickHouse queries, RBAC middleware.
- **Критерии готовности (DoD):**
  - [ ] 3 materialized views созданы
  - [ ] API endpoints работают < 500ms
  - [ ] RBAC проверяется
  - [ ] Data lag < 5 сек
- **Оценка:** 8h
- **Story:** [STORY-110]

**[TASK-0377] Frontend — P&L Views**
- **Тип:** Frontend
- **Описание:** (1) Lead detail: P&L section (sell, buy, profit, margin badge), (2) P&L Summary page: toggle affiliate/broker, sortable table, summary row, date range, (3) Matrix view: heatmap table (affiliate rows x broker columns, cell = profit, color intensity), (4) Charts: bar chart profit by affiliate (top 10), bar chart profit by broker (top 10). (5) RBAC: hide P&L from unauthorized roles.
- **Критерии готовности (DoD):**
  - [ ] Lead P&L section в detail page
  - [ ] Summary tables для affiliate и broker
  - [ ] Matrix heatmap отображается
  - [ ] Charts работают
  - [ ] RBAC скрывает от unauthorized
- **Оценка:** 16h
- **Story:** [STORY-110]

**[TASK-0378] Тесты P&L**
- **Тип:** QA
- **Описание:** (1) Per lead: sell 100, buy 60, profit 40, margin 40%. (2) Per affiliate: sum of all leads' P&L. (3) Per broker: sum correct. (4) Matrix: affiliate A + broker X = profit 500. (5) Date range: last 7d → only 7d data. (6) RBAC: media_buyer → 403. (7) Real-time: FTD → P&L updated < 5 сек.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-110]

---

#### [STORY-111] Reconciliation с брокером

**Как** Finance Manager, **я хочу** сравнивать наши данные о лидах и конверсиях с данными брокера, **чтобы** выявлять расхождения (missing leads, missing FTD, shave) и вести обоснованные переговоры.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/reconciliation/upload` — загрузка broker report (CSV/Excel): columns — lead_id (or external_id), status, deposit_amount, date. Привязка к нашим данным по lead_id/external_id
- [ ] AC2: Reconciliation report: для каждого лида — наш статус vs брокерский статус. Categories: (a) Match — оба совпадают, (b) Missing at broker — мы отправили, брокер не видит, (c) Missing at us — брокер видит, мы не отправляли, (d) Status mismatch — разный статус, (e) Amount mismatch — разная сумма deposit
- [ ] AC3: Summary: total leads matched, discrepancy count, discrepancy % by category. Financial impact: sum of missing FTDs * avg sell_price = estimated lost revenue
- [ ] AC4: API `GET /api/v1/reconciliation/{id}/report` — скачать reconciliation report. Время генерации < 5 сек на 10,000 leads
- [ ] AC5: History: список reconciliation runs per broker с date, discrepancy %, resolved status
- [ ] AC6: Dispute resolution: mark individual discrepancies as "disputed", "resolved", "written off" с комментарием

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-12]
**Зависит от:** [STORY-108]

##### Tasks для STORY-111:

**[TASK-0379] Reconciliation engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `reconciliation_runs`: id UUID, broker_id FK, company_id FK, upload_file_url, our_leads_count int, broker_leads_count int, match_count int, discrepancy_count int, estimated_lost_revenue decimal, status enum(processing, completed, failed), created_by FK, created_at. (2) Таблица `reconciliation_items`: id, run_id FK, lead_id FK nullable, our_status, broker_status, our_amount decimal nullable, broker_amount decimal nullable, category enum(match, missing_at_broker, missing_at_us, status_mismatch, amount_mismatch), dispute_status enum(none, disputed, resolved, written_off), dispute_comment text, resolved_by FK nullable. (3) Engine: parse uploaded CSV, LEFT JOIN with our leads by lead_id/external_id, classify each pair. Background job for processing.
- **Критерии готовности (DoD):**
  - [ ] CSV upload и parsing работает
  - [ ] LEFT JOIN matching по lead_id/external_id
  - [ ] 5 categories правильно классифицированы
  - [ ] Summary metrics рассчитаны
  - [ ] Background processing для > 1000 leads
- **Оценка:** 16h
- **Story:** [STORY-111]

**[TASK-0380] Frontend — Reconciliation UI**
- **Тип:** Frontend
- **Описание:** (1) Page "Reconciliation": broker selector + "Upload Report" (CSV/Excel drag-and-drop), (2) After processing: summary cards (matched, discrepancies by category, estimated lost revenue), (3) Table: lead_id, our status, broker status, category badge (color-coded), amount diff, dispute status. Фильтры по category, (4) Dispute actions: "Dispute" / "Resolve" / "Write Off" buttons per item, (5) History: list of runs per broker with charts (discrepancy trend).
- **Критерии готовности (DoD):**
  - [ ] Upload и processing flow
  - [ ] Summary cards и detailed table
  - [ ] Dispute resolution workflow
  - [ ] History с trend chart
- **Оценка:** 8h
- **Story:** [STORY-111]

**[TASK-0381] Тесты reconciliation**
- **Тип:** QA
- **Описание:** (1) Upload CSV 100 rows → 90 match, 5 missing at broker, 3 status mismatch, 2 amount mismatch. (2) Missing at us: broker has lead we don't → correctly categorized. (3) Estimated lost revenue: 5 missing FTDs * avg $100 = $500. (4) Dispute → status updated, comment saved. (5) Resolve → resolved_by set. (6) Performance: 10,000 leads < 5 сек. (7) Invalid CSV → error message. (8) History: 3 runs → trend shows decreasing discrepancy.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-111]

---

#### [STORY-112] Financial Report Export

**Как** Finance Manager, **я хочу** экспортировать финансовые отчёты (revenue, costs, profit, payouts) в CSV и Excel, **чтобы** загружать данные в бухгалтерскую систему и готовить отчётность.

**Acceptance Criteria:**
- [ ] AC1: Report types: (a) Revenue Report: per lead — lead_id, affiliate, broker, GEO, sell_price, date, (b) Cost Report: per lead — lead_id, affiliate, buy_price, date, (c) Profit Report: per affiliate — total revenue, total cost, profit, margin, (d) Payout Report: per affiliate — amount owed, amount paid, balance
- [ ] AC2: Filters: date range, affiliate, broker, GEO, currency
- [ ] AC3: Formats: CSV (UTF-8 BOM for Excel compatibility), Excel (.xlsx с формулами для totals), PDF (formatted report with company logo)
- [ ] AC4: API `GET /api/v1/reports/financial?type=revenue&from=&to=&format=csv` — streaming download. Для > 10,000 rows → background generation, download link via email/notification
- [ ] AC5: Scheduled reports: auto-generate and email weekly/monthly. Configurable per user
- [ ] AC6: RBAC: только finance_manager и network_admin
- [ ] AC7: Audit trail: каждый export записывается (who, when, what type, filters)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-12]
**Зависит от:** [STORY-110]

##### Tasks для STORY-112:

**[TASK-0382] Financial report generator**
- **Тип:** Backend
- **Описание:** Go-сервис: (1) Report builder: для каждого type → SQL/ClickHouse query с фильтрами, (2) CSV writer: encoding/csv с UTF-8 BOM (0xEF, 0xBB, 0xBF), streaming response, (3) Excel writer: excelize library, formulas в summary row (=SUM), formatted headers, (4) PDF: go-wkhtmltopdf или chromedp → HTML → PDF, company logo + branding. (5) Background job: для > 10K rows → generate file → upload S3 → send download link via notification. (6) Scheduled reports: cron per user config. (7) Audit log: report_exports table.
- **Критерии готовности (DoD):**
  - [ ] 4 типа отчётов генерируются
  - [ ] CSV, Excel, PDF форматы работают
  - [ ] Background generation для больших reports
  - [ ] Scheduled auto-export работает
  - [ ] Audit trail записывается
- **Оценка:** 16h
- **Story:** [STORY-112]

**[TASK-0383] Frontend — Financial Reports**
- **Тип:** Frontend
- **Описание:** Страница "Financial Reports": (1) Report type selector (4 types), (2) Filters: date range, affiliate, broker, GEO, currency, (3) Preview: first 20 rows inline, (4) Download buttons: CSV, Excel, PDF, (5) Scheduled reports settings: frequency (weekly/monthly), recipients, format. (6) Export history: table of past exports.
- **Критерии готовности (DoD):**
  - [ ] Report type selector и filters
  - [ ] Preview first 20 rows
  - [ ] Download в 3 форматах
  - [ ] Scheduled reports config
  - [ ] Export history
- **Оценка:** 8h
- **Story:** [STORY-112]

**[TASK-0384] Тесты financial reports**
- **Тип:** QA
- **Описание:** (1) Revenue report CSV: all columns present, amounts correct. (2) Excel: formulas work (SUM). (3) PDF: company logo, formatted. (4) Filter by date range → correct subset. (5) > 10K rows → background, link via notification. (6) RBAC: media_buyer → 403. (7) Audit: export recorded.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-112]

---

#### [STORY-113] Revenue и Cost Dashboard

**Как** Finance Manager, **я хочу** видеть dashboard с revenue, costs и profit в реальном времени (графики, тренды, breakdown), **чтобы** контролировать финансовое состояние бизнеса без ручных расчётов.

**Acceptance Criteria:**
- [ ] AC1: KPI cards: Total Revenue (today + MTD), Total Cost (today + MTD), Profit (today + MTD), Margin % (with delta vs previous period)
- [ ] AC2: Time-series chart: revenue, cost, profit lines за выбранный период. Granularity: daily/weekly/monthly
- [ ] AC3: Revenue breakdown: pie/donut chart по источникам (top 5 affiliates + "Other")
- [ ] AC4: Cost breakdown: pie/donut chart по назначению (top 5 affiliates + "Other")
- [ ] AC5: Cumulative chart: running total profit MTD vs target (if target set)
- [ ] AC6: Currency handling: все суммы конвертируются в base currency (настройка company). Exchange rates обновляются daily
- [ ] AC7: Date range picker, comparison mode (this month vs last month), auto-refresh

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-12]
**Зависит от:** [STORY-110]

##### Tasks для STORY-113:

**[TASK-0385] API для revenue/cost dashboard**
- **Тип:** Backend
- **Описание:** Endpoints: (1) GET /api/v1/analytics/financial/kpis — today + MTD revenue/cost/profit/margin, (2) GET /api/v1/analytics/financial/timeseries — revenue/cost/profit lines, (3) GET /api/v1/analytics/financial/breakdown?type=revenue|cost — top 5 + other. Currency conversion: exchange_rates table (currency_from, currency_to, rate, date), daily update from Open Exchange Rates API or manual input.
- **Критерии готовности (DoD):**
  - [ ] 3 API endpoints работают
  - [ ] Currency conversion корректна
  - [ ] MTD и daily aggregations
- **Оценка:** 8h
- **Story:** [STORY-113]

**[TASK-0386] Frontend — Financial Dashboard**
- **Тип:** Frontend
- **Описание:** (1) 4 KPI cards с delta, (2) Line chart revenue/cost/profit, (3) Donut charts для breakdowns, (4) Cumulative profit chart with target line, (5) Base currency selector, (6) Date range + comparison mode.
- **Критерии готовности (DoD):**
  - [ ] KPI cards, charts, breakdowns отображаются
  - [ ] Currency conversion в UI
  - [ ] Comparison mode работает
- **Оценка:** 8h
- **Story:** [STORY-113]

**[TASK-0387] Тесты financial dashboard**
- **Тип:** QA
- **Описание:** (1) KPIs correct (today, MTD). (2) Time-series: data points match raw data. (3) Breakdowns: top 5 + Other correct. (4) Currency conversion: 100 EUR * 1.08 = 108 USD. (5) Comparison: this month vs last month side-by-side.
- **Критерии готовности (DoД):**
  - [ ] 5 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-113]

---

#### [STORY-114] Payout Management (выплаты аффилейтам)

**Как** Finance Manager, **я хочу** отслеживать выплаты аффилейтам (задолженность, оплаченные суммы, баланс) и помечать выплаты как совершённые, **чтобы** контролировать финансовые обязательства перед партнёрами.

**Acceptance Criteria:**
- [ ] AC1: Payout balance per affiliate: total_owed (sum buy_price for converted leads), total_paid (sum of payments), balance (owed - paid)
- [ ] AC2: API `POST /api/v1/payouts` — создать запись о выплате: affiliate_id, amount, currency, payment_method (wire, crypto, paypal), reference (transaction ID), notes, paid_at. Ответ 201
- [ ] AC3: API `GET /api/v1/payouts?affiliate_id=&from=&to=` — список выплат с пагинацией
- [ ] AC4: Payout overview: таблица аффилейтов — name, total owed, total paid, balance, last payment date, payment frequency. Sort by balance DESC (кому больше должны)
- [ ] AC5: Bulk payout: выбрать нескольких аффилейтов → "Generate Payout Batch" → список с суммами → confirm → mark all as paid
- [ ] AC6: Payout statement: per affiliate — PDF/Excel с детализацией (leads, FTDs, amounts, payments). Отправка по email аффилейту
- [ ] AC7: Minimum payout threshold: настройка per company (e.g., $100). Аффилейты с balance < threshold → не включаются в payout batch

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-12]
**Зависит от:** [STORY-108], [STORY-109]

##### Tasks для STORY-114:

**[TASK-0388] Payout tracking system**
- **Тип:** Backend
- **Описание:** (1) Таблица `payouts`: id UUID, company_id FK, affiliate_id FK, amount decimal(12,2), currency char(3), payment_method enum(wire, crypto, paypal, other), reference varchar(200), notes text, paid_at timestamptz, created_by FK, created_at. (2) Balance calculation: total_owed = SUM(buy_price) FROM conversions WHERE affiliate_id=? AND event_type='ftd', total_paid = SUM(amount) FROM payouts WHERE affiliate_id=?. (3) API: CRUD payouts, GET /api/v1/payouts/balances — per affiliate balances, POST /api/v1/payouts/batch — bulk create. (4) Minimum payout threshold: company setting.
- **Критерии готовности (DoD):**
  - [ ] Payout CRUD API работает
  - [ ] Balance calculation корректен
  - [ ] Batch payout создаёт несколько записей
  - [ ] Minimum threshold фильтрует
- **Оценка:** 8h
- **Story:** [STORY-114]

**[TASK-0389] Payout statement generator**
- **Тип:** Backend
- **Описание:** Endpoint GET /api/v1/payouts/statement?affiliate_id=&from=&to=&format=pdf|xlsx. Содержит: affiliate info, period, leads (id, date, broker, status, buy_price), FTDs (lead_id, deposit, sell_price), subtotals, payments in period, balance. PDF: branded template. Excel: с формулами. Option: POST /api/v1/payouts/statement/send — отправить по email аффилейту.
- **Критерии готовности (DoD):**
  - [ ] Statement PDF и Excel генерируются
  - [ ] Все данные корректны (leads, FTDs, payments)
  - [ ] Email отправка работает
- **Оценка:** 8h
- **Story:** [STORY-114]

**[TASK-0390] Frontend — Payout Management**
- **Тип:** Frontend
- **Описание:** (1) Page "Payouts": overview table — affiliate, owed, paid, balance, last payment. Sort by balance. (2) "Record Payment" button → form: affiliate, amount, method, reference, date. (3) Batch payout: select affiliates → "Generate Batch" → review table → "Confirm & Record". (4) Statement: per affiliate → "Generate Statement" → preview + download + send email button. (5) Payout history: expandable row → list of payments.
- **Критерии готовности (DoD):**
  - [ ] Overview table с balances
  - [ ] Record payment form
  - [ ] Batch payout flow
  - [ ] Statement generation и email
- **Оценка:** 8h
- **Story:** [STORY-114]

**[TASK-0391] Тесты payout management**
- **Тип:** QA
- **Описание:** (1) Balance: owed 1000, paid 600, balance 400. (2) Record payment 400 → balance 0. (3) Batch: 3 affiliates → 3 payout records. (4) Min threshold 100: affiliate with balance 50 → excluded from batch. (5) Statement: PDF contains correct data. (6) Email send: statement delivered. (7) RBAC: media_buyer → 403 for payout creation.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-114]

---

### Сводка EPIC-12

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 7 |
| **Story Points** | 50 (итого) |
| **Must** | 5 stories (40 SP) |
| **Should** | 2 stories (10 SP) |
| **Could** | 0 stories |
| **Всего Tasks** | 25 |
| **Backend tasks** | 14 |
| **Frontend tasks** | 7 |
| **QA tasks** | 7 |
| **Оценка (часы)** | ~188h |

---

## [EPIC-13] Onboarding & Setup Wizard

**Цель:** Обеспечить путь "от регистрации до первого отправленного лида за < 30 минут". HyperOne требует 7+ шагов без подсказок (создать vertical → affiliate → brand → integration → hub → flow → test lead). Мы создаём пошаговый wizard с шаблонами, контекстными подсказками, видео-тултипами, guided tours по ключевым функциям и onboarding checklist. Цель — минимизировать time-to-value и снизить churn новых пользователей.

**Метрика успеха:**
- Time to first lead sent: < 30 минут (median для новых пользователей)
- Wizard completion rate: ≥ 80% (из начавших wizard, 80% завершают все шаги)
- Onboarding checklist completion: ≥ 60% пунктов выполнены в первые 7 дней
- Support tickets от новых пользователей: снижение на 40% vs без wizard
- User satisfaction: post-onboarding survey score ≥ 4.2/5
- Template usage: ≥ 50% новых пользователей используют template

**Приоритет:** P1 (Launch)
**Зависит от:** [EPIC-02], [EPIC-03], [EPIC-04], [EPIC-06]
**Оценка:** M

---

### Stories:

---

#### [STORY-115] Step-by-Step Setup Wizard (5 шагов)

**Как** Network Admin (новый пользователь), **я хочу** пройти пошаговый wizard при первом входе (5 шагов: профиль компании → добавить брокера → добавить аффилейта → настроить routing flow → отправить тестовый лид), **чтобы** быстро настроить платформу и начать работать, не разбираясь в документации.

**Acceptance Criteria:**
- [ ] AC1: Wizard запускается автоматически при первом входе Network Admin (после регистрации). Отображается fullscreen overlay с progress bar (5 шагов)
- [ ] AC2: Step 1 — Company Profile: company name, base currency, timezone, logo upload. Валидация: name required. Time estimate: "1 minute". Skip optional fields
- [ ] AC3: Step 2 — Add First Broker: (a) выбор из каталога популярных брокеров (top 10 + search), или (b) manual add (name, API URL, API key). Quick connect: для каталожных брокеров — предзаполненные API URLs. Валидация: test API connection. Time estimate: "3 minutes"
- [ ] AC4: Step 3 — Add First Affiliate: name, email, source type (dropdown), generate API key для affiliate. Объяснение: "Affiliate — это источник лидов (media buyer, website, etc.)". Time estimate: "2 minutes"
- [ ] AC5: Step 4 — Create Routing Flow: simplified flow builder (не full visual editor): выбрать algorithm (WRR recommended for beginners), привязать брокера из Step 2, установить daily cap. Time estimate: "2 minutes"
- [ ] AC6: Step 5 — Send Test Lead: форма с тестовыми данными (предзаполнено: John Doe, test@example.com, DE). Кнопка "Send Test Lead". Отображение результата в реальном времени: ✓ Lead created → ✓ Routed to Broker X → ✓ Accepted / ✗ Rejected (with explanation). Time estimate: "1 minute"
- [ ] AC7: Каждый шаг имеет: title, description, time estimate, contextual help link, video tooltip (30-60 sec). "Back" и "Next" кнопки. "Skip this step" option (с warning)
- [ ] AC8: Wizard state сохраняется: если пользователь закрыл браузер — при следующем входе продолжает с того же шага
- [ ] AC9: Completion screen: конфетти animation, "Your CRM is ready! You just sent your first lead in X minutes", CTA: "Go to Dashboard" или "Continue Setup (add more brokers, affiliates)"

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-13]
**Зависит от:** [EPIC-02], [EPIC-03], [EPIC-04], [EPIC-06]

##### Tasks для STORY-115:

**[TASK-0392] Backend — Wizard State Management**
- **Тип:** Backend
- **Описание:** (1) Таблица `onboarding_wizard`: user_id FK PK, company_id FK, current_step int (1-5), step_data JSONB (данные каждого завершённого шага), status enum(in_progress, completed, skipped), started_at timestamptz, completed_at timestamptz nullable, time_spent_seconds int. (2) API: GET /api/v1/onboarding/wizard — текущее состояние, PUT /api/v1/onboarding/wizard/step/{N} — сохранить данные шага, POST /api/v1/onboarding/wizard/complete — завершить wizard. (3) Trigger: при первом login Network Admin → если wizard не completed → redirect к wizard.
- **Критерии готовности (DoD):**
  - [ ] Wizard state сохраняется между сессиями
  - [ ] API для чтения/обновления состояния
  - [ ] Redirect при первом входе
  - [ ] Time tracking per step
- **Оценка:** 4h
- **Story:** [STORY-115]

**[TASK-0393] Backend — Broker Catalog для wizard**
- **Тип:** Backend
- **Описание:** (1) Таблица `broker_catalog`: id, name, logo_url, api_url_template, api_docs_url, integration_type (enum), popularity_rank int, supported_geos (text array). Seed data: 10 популярных крипто/форекс брокеров с предзаполненными URL. (2) API: GET /api/v1/onboarding/broker-catalog — список каталога с поиском. (3) Quick connect: при выборе из каталога — автозаполнение полей API URL, оставить user только ввод API key.
- **Критерии готовности (DoD):**
  - [ ] 10 брокеров в каталоге
  - [ ] Search по имени работает
  - [ ] Автозаполнение API URL при выборе
- **Оценка:** 4h
- **Story:** [STORY-115]

**[TASK-0394] Frontend — 5-step Wizard UI**
- **Тип:** Frontend
- **Описание:** Fullscreen wizard overlay: (1) Progress bar наверху (5 шагов, номера + названия), (2) Step 1: form (company name, currency dropdown, timezone dropdown, logo upload), (3) Step 2: broker catalog grid (cards с logo + name) + "Add Custom" tab, API connection test button с realtime status, (4) Step 3: affiliate form + generated API key (copy button), (5) Step 4: simplified flow builder (algorithm radio + broker select + cap input), (6) Step 5: test lead form (prefilled) + "Send" button + realtime pipeline visualization (stepper: created → routed → accepted/rejected), (7) Each step: help link, video tooltip (play button → embedded short video), time estimate badge, Skip button, (8) Completion: confetti (canvas-confetti), time summary, CTAs.
- **Критерии готовности (DoD):**
  - [ ] 5 шагов с forms и валидацией
  - [ ] Broker catalog с quick connect
  - [ ] Test lead с realtime результатом
  - [ ] Progress bar и navigation (back/next/skip)
  - [ ] Completion screen с animation
  - [ ] State persistence: reload → same step
- **Оценка:** 16h
- **Story:** [STORY-115]

**[TASK-0395] Design — Wizard UI/UX и Video Tooltips**
- **Тип:** Design
- **Описание:** (1) Figma mockups для каждого из 5 шагов, (2) Дизайн broker catalog cards, (3) Дизайн test lead pipeline visualization, (4) Completion screen с confetti, (5) Скрипт для 5 video tooltips (30 сек каждый): что делает каждый шаг, зачем это нужно. Production: screen recording с voiceover.
- **Критерии готовности (DoD):**
  - [ ] Figma mockups для всех 5 шагов утверждены
  - [ ] Video tooltips записаны (5 x 30 сек)
  - [ ] Completion screen design
- **Оценка:** 16h
- **Story:** [STORY-115]

**[TASK-0396] Тесты Setup Wizard**
- **Тип:** QA
- **Описание:** (1) Full flow: 5 шагов → completion → time < 10 min (automated test with prefilled data). (2) Step 2: broker from catalog → API URL prefilled. (3) Step 2: custom broker → manual fill → test connection success. (4) Step 5: test lead sent → accepted. (5) Step 5: test lead → rejected → explanation shown. (6) Skip step → warning shown, wizard continues. (7) Close browser → reopen → resume from same step. (8) Already completed → no redirect, wizard accessible from menu.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] E2E test полного flow
- **Оценка:** 8h
- **Story:** [STORY-115]

---

#### [STORY-116] Pre-built Templates

**Как** Network Admin, **я хочу** выбрать из готовых шаблонов конфигурации ("Crypto network с 3 брокерами", "Forex team из 5 buyers"), **чтобы** не настраивать всё с нуля, а начать с проверенной конфигурации и адаптировать под себя.

**Acceptance Criteria:**
- [ ] AC1: Минимум 5 templates: (1) "Solo Crypto Buyer" — 1 affiliate (self), 2 broker slots, WRR routing, basic caps, (2) "Crypto Network 3 Brokers" — 3 affiliate slots, 3 broker slots, WRR, GEO-based routing (DACH, Nordics, UK), (3) "Forex Team 5 Buyers" — 5 affiliate (team members), 2 brokers, SLOTS_CHANCE, team-level caps, (4) "High Volume Operation" — 10 affiliates, 5 brokers, WRR + fallback, advanced caps, fraud rules, (5) "Testing & QA" — sandbox mode, test broker, all features enabled for exploration
- [ ] AC2: Template preview: при выборе template → показать что будет создано (entities list), estimated setup time, difficulty level (beginner/intermediate/advanced)
- [ ] AC3: Template apply: создаёт placeholder entities (affiliates, brokers, flows) с naming convention (e.g., "Broker 1 — configure me"). User затем заменяет placeholder данными на реальные
- [ ] AC4: Templates в Step 1 wizard (optional): "Start from Template" или "Start from Scratch"
- [ ] AC5: API `GET /api/v1/onboarding/templates` — список, `POST /api/v1/onboarding/templates/{id}/apply` — применить template
- [ ] AC6: Custom templates: admin может сохранить текущую конфигурацию как template для переиспользования

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-13]
**Зависит от:** [STORY-115]

##### Tasks для STORY-116:

**[TASK-0397] Backend — Templates engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `onboarding_templates`: id, name, description, category enum(crypto, forex, testing), difficulty enum(beginner, intermediate, advanced), config JSONB (blueprint: {affiliates: [{name, type}], brokers: [{name, placeholder: true}], flows: [{name, algorithm, rules}], caps: [...], pricing: [...]}), estimated_minutes int, is_system bool (system templates не удаляются), company_id FK nullable (null для system), created_at. (2) Seed data: 5 system templates. (3) API: GET /templates, POST /templates/{id}/apply — create entities from blueprint (в транзакции), POST /templates/save-current — snapshot текущей конфигурации.
- **Критерии готовности (DoD):**
  - [ ] 5 system templates в seed data
  - [ ] Apply creates all entities from blueprint
  - [ ] Save current config as template
  - [ ] Transaction: all-or-nothing apply
- **Оценка:** 8h
- **Story:** [STORY-116]

**[TASK-0398] Frontend — Template Selection UI**
- **Тип:** Frontend
- **Описание:** (1) Template gallery: cards с name, description, difficulty badge, estimated time, entity counts (3 brokers, 5 affiliates, etc.), category filter, (2) Preview modal: detailed view — что будет создано (list of entities), diagram, (3) "Apply Template" button → confirmation → progress bar → "Template Applied!". (4) Integration в wizard Step 1: "Start from Template" section. (5) "Save as Template" button на Dashboard settings.
- **Критерии готовности (DoD):**
  - [ ] Gallery с 5 templates отображается
  - [ ] Preview показывает entities
  - [ ] Apply с progress bar
  - [ ] Integration в wizard
  - [ ] Save as template
- **Оценка:** 8h
- **Story:** [STORY-116]

**[TASK-0399] Тесты templates**
- **Тип:** QA
- **Описание:** (1) Apply "Crypto Network 3 Brokers" → 3 affiliates, 3 brokers, 1 flow created. (2) Placeholder names: "Broker 1 — configure me". (3) Apply with existing data → no conflicts (new entities added). (4) Save current as template → template contains current config. (5) System template → cannot delete. (6) Preview matches actual creation.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-116]

---

#### [STORY-117] Contextual Help, Examples и Video Tooltips

**Как** Network Admin, **я хочу** видеть контекстные подсказки, примеры и короткие видео-тултипы на каждом экране платформы, **чтобы** понимать назначение каждой функции без обращения к документации.

**Acceptance Criteria:**
- [ ] AC1: Help icon (?) рядом с каждым полем формы и заголовком секции. При hover → tooltip с кратким описанием (до 100 символов). При клике → expanded help с примером и ссылкой на docs
- [ ] AC2: "Learn more" links: на каждой странице — ссылка на соответствующую статью в Knowledge Base
- [ ] AC3: Video tooltips: 15-30 секундные видео для ключевых концепций (что такое routing flow, как работает cap, что такое affiliate). Встроенный player (HTML5 video, не YouTube). Минимум 10 видео
- [ ] AC4: Examples on empty states: когда таблица пуста — не просто "No data", а пример ("Example: Create your first routing flow to start distributing leads") с CTA button
- [ ] AC5: Contextual help content хранится в CMS-like structure: API `GET /api/v1/help/context/{screen_id}` возвращает tips для конкретного экрана
- [ ] AC6: Help content на русском и английском (i18n). Language switch в UI

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-13]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-117:

**[TASK-0400] Backend — Help Content CMS**
- **Тип:** Backend
- **Описание:** (1) Таблица `help_content`: id, screen_id varchar (e.g., "routing_flows", "broker_settings"), field_id varchar nullable (specific field), content_type enum(tooltip, expanded, video, empty_state, learn_more), content_ru text, content_en text, video_url varchar nullable, docs_url varchar nullable, sort_order int, is_active bool, created_at, updated_at. (2) Seed data: help content для всех экранов (минимум 50 записей). (3) API: GET /api/v1/help/context/{screen_id}?lang=ru — все help items для экрана. (4) Admin API: CRUD для help content (для редактирования без деплоя).
- **Критерии готовности (DoD):**
  - [ ] 50+ help content записей created
  - [ ] API возвращает content по screen_id
  - [ ] i18n: ru и en
  - [ ] Admin CRUD для content
- **Оценка:** 8h
- **Story:** [STORY-117]

**[TASK-0401] Frontend — Help Components**
- **Тип:** Frontend
- **Описание:** (1) `HelpIcon` component: (?) icon, hover → tooltip (Radix UI Tooltip), click → popover с expanded help + video + docs link, (2) `VideoTooltip` component: play button → inline video player (HTML5, max 30 sec, autoplay on open, pause on close), (3) `EmptyState` component: illustration + example text + CTA button, (4) `LearnMore` component: link styled consistently. (5) Integration: добавить HelpIcon к каждому form field и section header (через wrapper component). (6) Language toggle: useI18n hook, content loaded from API.
- **Критерии готовности (DoD):**
  - [ ] HelpIcon с tooltip и expanded help
  - [ ] VideoTooltip с inline player
  - [ ] EmptyState с examples и CTA
  - [ ] i18n (ru/en) переключается
- **Оценка:** 8h
- **Story:** [STORY-117]

**[TASK-0402] Создание 10 видео-тултипов**
- **Тип:** Design
- **Описание:** Записать 10 screen-recording видео (15-30 сек каждое): (1) Что такое Lead и как он попадает в систему, (2) Routing Flow — визуальное объяснение, (3) Broker Integration — как подключить брокера, (4) Affiliate — кто это и зачем, (5) Caps — дневные/недельные лимиты, (6) GEO Targeting — как работает, (7) Autologin Pipeline — что происходит, (8) UAD — автоматическая переотправка, (9) P&L — как считается прибыль, (10) Anti-Fraud — защита от фрода. Формат: MP4, 720p, < 5MB each. Voiceover на русском и английском.
- **Критерии готовности (DoD):**
  - [ ] 10 видео записаны и отредактированы
  - [ ] Два языка (ru + en)
  - [ ] Каждое < 5MB, 720p
  - [ ] Загружены в CDN/S3
- **Оценка:** 16h
- **Story:** [STORY-117]

**[TASK-0403] Тесты contextual help**
- **Тип:** QA
- **Описание:** (1) HelpIcon present on all form fields (audit 10 pages). (2) Tooltip shows correct content for field. (3) Video tooltip plays and pauses. (4) Empty state: no flows → example shown with CTA. (5) Language switch: ru → en → content changes. (6) Learn more link: navigates to correct docs page.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-117]

---

#### [STORY-118] Progress Indicator и Skip/Return Navigation

**Как** Network Admin, **я хочу** видеть свой прогресс в wizard и иметь возможность пропускать шаги и возвращаться к ним позже, **чтобы** не быть заблокированным на шаге, если у меня пока нет нужных данных.

**Acceptance Criteria:**
- [ ] AC1: Progress bar: горизонтальный stepper с 5 шагами. Каждый шаг: номер, название, статус (completed ✓ / current → / skipped ⊘ / pending ○). Кликабельные завершённые шаги для возврата
- [ ] AC2: Skip: кнопка "Skip this step" на каждом шаге (кроме Step 1 — company profile обязателен). При skip → warning "You can complete this step later from Settings". Skipped step отображается в onboarding checklist
- [ ] AC3: Return: из любого места платформы → меню "Setup Wizard" → возврат к wizard с текущим состоянием. Skipped steps подсвечены
- [ ] AC4: Completion states: wizard считается completed если all required steps (Step 1 обязательный) + at least 3 из 5 steps done. При полном skip → "Your setup is incomplete. Complete remaining steps for best experience"
- [ ] AC5: Time tracking per step: записывается время на каждый шаг. На completion screen: "You set up your CRM in 12 minutes!"

**Story Points:** 3
**Приоритет:** Must
**Epic:** [EPIC-13]
**Зависит от:** [STORY-115]

##### Tasks для STORY-118:

**[TASK-0404] Backend — Step status tracking**
- **Тип:** Backend
- **Описание:** Расширить таблицу onboarding_wizard: step_statuses JSONB `[{step: 1, status: "completed", time_seconds: 120}, {step: 2, status: "skipped"}, ...]`. API: PUT /api/v1/onboarding/wizard/step/{N}/skip — mark as skipped. GET /api/v1/onboarding/wizard — возвращает full state с step_statuses. Completion logic: step 1 required + >= 3 completed.
- **Критерии готовности (DoD):**
  - [ ] Step statuses tracked per step
  - [ ] Skip API works
  - [ ] Completion logic correct
  - [ ] Time per step recorded
- **Оценка:** 2h
- **Story:** [STORY-118]

**[TASK-0405] Frontend — Progress Stepper и Skip/Return**
- **Тип:** Frontend
- **Описание:** (1) Stepper component: 5 steps, icons per status (check/arrow/skip/circle), clickable completed steps, (2) Skip button per step (except step 1) → confirmation dialog, (3) Menu item "Setup Wizard" in sidebar → return to wizard, (4) Completion screen: total time, step-by-step timing, incomplete steps highlighted with "Complete Now" links.
- **Критерии готовности (DoD):**
  - [ ] Stepper с правильными статусами
  - [ ] Skip с confirmation
  - [ ] Return navigation из menu
  - [ ] Time summary на completion
- **Оценка:** 4h
- **Story:** [STORY-118]

**[TASK-0406] Тесты progress и navigation**
- **Тип:** QA
- **Описание:** (1) Complete step 1, 2, 3, skip 4, complete 5 → wizard completed (4 of 5 ≥ 3). (2) Click completed step → return to that step (view only or edit). (3) Skip step 2 → onboarding checklist shows "Add Broker" as pending. (4) Close browser, reopen → resume from correct step. (5) Skip all except step 1 → "setup incomplete" warning.
- **Критерии готовности (DoD):**
  - [ ] 5 тест-кейсов проходят
- **Оценка:** 2h
- **Story:** [STORY-118]

---

#### [STORY-119] Тестовый лид как финальный шаг Wizard

**Как** Network Admin, **я хочу** отправить тестовый лид на финальном шаге wizard и увидеть весь путь лида в реальном времени, **чтобы** убедиться, что настройка работает корректно, и понять, как платформа обрабатывает лидов.

**Acceptance Criteria:**
- [ ] AC1: Test lead form: предзаполненные данные (John Doe, test@example.com, +49123456789, DE). Пользователь может изменить любое поле. Badge "Test Lead" — не учитывается в аналитике и caps
- [ ] AC2: Real-time visualization pipeline: vertical stepper с анимацией: (1) ✓ Lead Created (with lead_id), (2) ↻ Routing... (show which flow), (3) ✓ Matched Broker: [broker name] (or ✗ No Match — with explanation why), (4) ↻ Sending to Broker... (5) ✓ Accepted / ✗ Rejected (show broker response). Каждый шаг с timestamp и duration
- [ ] AC3: При ошибке на любом шаге: понятное объяснение ("Broker X rejected because: Invalid GEO") + suggestion ("Try changing GEO to UK") + "Retry" button
- [ ] AC4: После успешного test lead: "Congratulations! Your platform is ready. Here's what happened:" → timeline recap
- [ ] AC5: Test lead помечается флагом `is_test=true` в БД. Фильтруется из аналитики, не считается в caps, не отправляет notifications (кроме wizard)
- [ ] AC6: Rate limit: max 5 test leads per wizard session (prevent abuse)

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-13]
**Зависит от:** [STORY-115], [EPIC-02], [EPIC-03]

##### Tasks для STORY-119:

**[TASK-0407] Backend — Test Lead Pipeline**
- **Тип:** Backend
- **Описание:** (1) API POST /api/v1/onboarding/test-lead — создаёт лид с is_test=true. Использует routing engine но: skip cap check, skip fraud check, skip analytics event (или отдельный event type 'test'). (2) Real-time feedback через WebSocket: ws://.../onboarding/test-lead/{lead_id}/progress — каждый шаг pipeline отправляется клиенту. (3) Error handling: detailed error messages для каждого failure point, suggestion engine (простые правила: GEO mismatch → suggest correct GEO). (4) Rate limit: max 5 per session (Redis counter).
- **Критерии готовности (DoD):**
  - [ ] Test lead создаётся с is_test=true
  - [ ] Skip caps, fraud, analytics для test leads
  - [ ] WebSocket progress работает
  - [ ] Error suggestions генерируются
  - [ ] Rate limit 5 per session
- **Оценка:** 8h
- **Story:** [STORY-119]

**[TASK-0408] Frontend — Test Lead Visualization**
- **Тип:** Frontend
- **Описание:** (1) Form: prefilled fields, editable, "Test Lead" badge, (2) "Send Test Lead" button → vertical animated stepper: each step appears with animation (slide down + fade in), icon changes (spinner → check/cross), (3) Error state: red step + explanation + suggestion + "Retry" button, (4) Success: confetti + timeline recap (each step with time), (5) Counter: "4 test leads remaining".
- **Критерии готовности (DoD):**
  - [ ] Form с предзаполненными данными
  - [ ] Animated stepper с realtime progress
  - [ ] Error state с suggestions
  - [ ] Success с timeline recap
  - [ ] Rate limit counter
- **Оценка:** 8h
- **Story:** [STORY-119]

**[TASK-0409] Тесты test lead**
- **Тип:** QA
- **Описание:** (1) Send test lead → full pipeline success → animated visualization. (2) Test lead: is_test=true in DB, not in analytics. (3) Caps not affected by test lead. (4) Error: broker rejects → explanation shown. (5) Suggestion: wrong GEO → "Try DE" suggested. (6) Rate limit: 6th lead → "limit reached" message. (7) WebSocket delivers all stages.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-119]

---

#### [STORY-120] In-app Guided Tours для ключевых функций

**Как** Network Admin, **я хочу** пройти guided tour по каждому ключевому разделу платформы (routing, brokers, analytics), **чтобы** быстро освоить интерфейс после wizard.

**Acceptance Criteria:**
- [ ] AC1: Guided tours для 6 разделов: Dashboard, Routing Flows, Broker Management, Affiliate Management, Analytics, Notifications. Каждый tour — 5-8 шагов
- [ ] AC2: Tour mechanics: highlight элемент на странице (dim остальное), tooltip с описанием, "Next"/"Back"/"Skip" кнопки, step counter (3 of 7)
- [ ] AC3: Tours запускаются: (a) автоматически при первом посещении раздела (one-time), (b) вручную из меню "Help → Guided Tours"
- [ ] AC4: Tour progress сохраняется per user: какие tours пройдены, какие нет. Непройденные подсвечиваются в меню
- [ ] AC5: Tour не блокирует навигацию: пользователь может закрыть tour в любой момент
- [ ] AC6: Tour content: на русском и английском. Привязка к DOM-элементам по data-tour-id атрибутам (устойчиво к изменению CSS)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-13]
**Зависит от:** [STORY-115]

##### Tasks для STORY-120:

**[TASK-0410] Backend — Tour state tracking**
- **Тип:** Backend
- **Описание:** (1) Таблица `user_tours`: user_id FK, tour_id varchar, status enum(not_started, in_progress, completed, dismissed), current_step int, completed_at timestamptz nullable. (2) API: GET /api/v1/onboarding/tours — список tours с status per user, PUT /api/v1/onboarding/tours/{tour_id} — update status/step. (3) Tour definitions: JSON config файлы (не в БД — в codebase): tour_id, steps [{target: "data-tour-id", title_ru, title_en, content_ru, content_en, position: top/bottom/left/right}].
- **Критерии готовности (DoD):**
  - [ ] Tour state per user сохраняется
  - [ ] 6 tour definitions созданы
  - [ ] API работает
- **Оценка:** 4h
- **Story:** [STORY-120]

**[TASK-0411] Frontend — Guided Tour Engine**
- **Тип:** Frontend
- **Описание:** Использовать react-joyride или custom: (1) Tour provider: reads tour definition, renders highlight overlay + tooltip, (2) Highlight: target element by data-tour-id, dimmed overlay (z-index management), (3) Tooltip: title, description, step counter, Next/Back/Skip buttons, (4) Auto-start: при первом посещении раздела (check tour status), (5) Manual start: "Help → Guided Tours" menu, (6) data-tour-id атрибуты на всех target элементах. (7) i18n: content по текущему языку.
- **Критерии готовности (DoD):**
  - [ ] 6 tours работают (5-8 steps each)
  - [ ] Highlight + tooltip корректно позиционируются
  - [ ] Auto-start при первом визите
  - [ ] Manual start из Help menu
  - [ ] i18n (ru/en)
- **Оценка:** 8h
- **Story:** [STORY-120]

**[TASK-0412] Тесты guided tours**
- **Тип:** QA
- **Описание:** (1) First visit Dashboard → tour auto-starts. (2) Complete tour → status=completed, not shown again. (3) Dismiss → status=dismissed, not shown again. (4) Manual start from menu → tour starts. (5) Step navigation: Next → next step, Back → previous step. (6) Tour content matches actual UI elements.
- **Критерии готовности (DoD):**
  - [ ] 6 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-120]

---

#### [STORY-121] Onboarding Checklist (persistent)

**Как** Network Admin, **я хочу** видеть persistent checklist с задачами по настройке платформы (с процентом выполнения), **чтобы** всегда знать, что ещё нужно сделать для полной настройки CRM.

**Acceptance Criteria:**
- [ ] AC1: Checklist items (12 пунктов): (1) Set up company profile, (2) Add first broker, (3) Add first affiliate, (4) Create routing flow, (5) Send first real lead, (6) Configure caps, (7) Set up pricing rules, (8) Connect Telegram notifications, (9) Complete first reconciliation, (10) Set up anti-fraud rules, (11) Customize dashboard layout, (12) Invite team member
- [ ] AC2: Auto-detection: items автоматически отмечаются как completed при выполнении действия (event-driven: при добавлении брокера → item 2 completed). Нет manual checkbox
- [ ] AC3: Progress indicator: circular progress (67% → 8 of 12) visible в sidebar или header. Clickable → expand checklist panel
- [ ] AC4: Checklist panel: sidebar panel с items, each with: title, status (completed ✓ / pending ○), CTA link ("Add Broker →") для pending items
- [ ] AC5: Dismissible: кнопка "I'm all set, hide checklist" → скрывается навсегда (с confirmation). Can be re-enabled from Settings
- [ ] AC6: Gamification: при 100% completion → celebration notification ("You're a CRM pro!"), badge в профиле

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-13]
**Зависит от:** [STORY-115]

##### Tasks для STORY-121:

**[TASK-0413] Backend — Checklist engine**
- **Тип:** Backend
- **Описание:** (1) Таблица `onboarding_checklist`: user_id FK PK, items JSONB `[{id: "add_broker", completed: true, completed_at: "..."}]`, progress_percent int, dismissed bool, dismissed_at timestamptz nullable. (2) Event listeners: при создании broker → update item "add_broker" completed. При создании affiliate → "add_affiliate". И т.д. для всех 12 items. (3) API: GET /api/v1/onboarding/checklist — текущее состояние, PUT /api/v1/onboarding/checklist/dismiss, PUT /api/v1/onboarding/checklist/restore.
- **Критерии готовности (DoD):**
  - [ ] 12 checklist items зарегистрированы
  - [ ] Auto-detection через events для каждого item
  - [ ] Progress percent рассчитывается
  - [ ] Dismiss/restore работает
- **Оценка:** 8h
- **Story:** [STORY-121]

**[TASK-0414] Frontend — Onboarding Checklist Panel**
- **Тип:** Frontend
- **Описание:** (1) Progress circle в sidebar: процент completion, клик → expand panel, (2) Panel: list of 12 items, check/circle icons, CTA links for pending, (3) 100% → celebration confetti + badge, (4) "Hide Checklist" button → confirmation → dismissed. Settings → "Show Checklist" to restore. (5) Smooth animation: item completed → checkmark animation (Lottie or CSS).
- **Критерии готовности (DoD):**
  - [ ] Progress circle в sidebar
  - [ ] Panel с 12 items и CTA links
  - [ ] Auto-update при completion
  - [ ] 100% celebration
  - [ ] Dismiss/restore
- **Оценка:** 8h
- **Story:** [STORY-121]

**[TASK-0415] Тесты onboarding checklist**
- **Тип:** QA
- **Описание:** (1) New user → 0% complete, 12 pending items. (2) Add broker → "Add first broker" auto-checked, progress = 8%. (3) CTA link: "Add Broker →" → navigates to broker page. (4) 12/12 complete → 100%, celebration. (5) Dismiss → checklist hidden. (6) Restore from settings → checklist shown with current state. (7) Duplicate action (add 2nd broker) → no change to checklist.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
- **Оценка:** 4h
- **Story:** [STORY-121]

---

### Сводка EPIC-13

| Метрика | Значение |
|---------|----------|
| **Всего Stories** | 7 |
| **Story Points** | 41 (итого) |
| **Must** | 4 stories (26 SP) |
| **Should** | 3 stories (15 SP) |
| **Could** | 0 stories |
| **Всего Tasks** | 24 |
| **Backend tasks** | 9 |
| **Frontend tasks** | 8 |
| **QA tasks** | 7 |
| **Design tasks** | 2 |
| **Оценка (часы)** | ~172h |

---

## ОБЩАЯ СВОДКА EPIC-08 — EPIC-13

| Epic | Stories | Story Points | Tasks | Estimated Hours |
|------|---------|-------------|-------|----------------|
| EPIC-08 Autologin & Proxy Pipeline | 9 | 65 | 38 | ~256h |
| EPIC-09 Automated Lead Delivery (UAD) | 7 | 44 | 21 | ~152h |
| EPIC-10 Analytics Dashboard v1 | 9 | 68 | 29 | ~228h |
| EPIC-11 Notifications & Alerts | 7 | 39 | 23 | ~134h |
| EPIC-12 Conversions & Basic P&L | 7 | 50 | 25 | ~188h |
| EPIC-13 Onboarding & Setup Wizard | 7 | 41 | 24 | ~172h |
| **ИТОГО** | **46** | **307** | **160** | **~1,130h** |

**Нумерация:** STORY-076 — STORY-121 (46 stories), TASK-0256 — TASK-0415 (160 tasks)
# PRODUCT BACKLOG P2 (Growth) — EPIC-14 through EPIC-19

**Продукт:** GambChamp CRM — платформа дистрибуции лидов для крипто/форекс affiliate-маркетинга
**Версия:** 2.0
**Дата:** Март 2026
**Нумерация:** Stories начинаются с STORY-130, Tasks с TASK-0500

---

## [EPIC-14] Advanced Analytics & BI
**Цель:** Предоставить power-users полноценный BI-слой: кастомный конструктор отчётов с drag-and-drop, настраиваемые дашборды из виджетов, когортный анализ качества трафика, P&L по аффилейтам с историческими трендами, сравнение периодов, автоматическая рассылка отчётов и воронка конверсий. Это закрывает главную слабость HyperOne (analytics 6/10) и создаёт конкурентное преимущество.
**Метрика успеха:**
- 50% enterprise-клиентов используют кастомные отчёты еженедельно в течение 60 дней после запуска
- Время создания кастомного отчёта (report builder) < 10 минут для нового пользователя
- Генерация preview отчёта < 3 сек (p95) на датасете до 1M строк
- Загрузка кастомного дашборда < 2 сек (p95) при 20 виджетах
- Scheduled reports delivery success rate >= 99.5%
- Экспорт PDF/CSV/Excel выполняется < 15 сек для отчёта до 100K строк
**Приоритет:** P2 (Growth)
**Зависит от:** [EPIC-10], [EPIC-12]
**Оценка:** XL

### Stories:

---

#### [STORY-130] Custom Report Builder (конструктор отчётов)
**Как** Team Lead, **я хочу** собирать кастомные отчёты, выбирая метрики и измерения через drag-and-drop интерфейс, **чтобы** получать ответы на конкретные бизнес-вопросы без привлечения разработчиков.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/bi/reports` принимает конфигурацию: `metrics[]` (до 10 штук), `dimensions[]` (до 8 штук), `filters[]` (до 20), `time_range` (from/to, preset: today/yesterday/last_7d/last_30d/this_month/last_month/custom), `sort_by`, `limit` (max 10000 строк). Ответ HTTP 201 с UUID отчёта
- [ ] AC2: Доступные метрики: leads_count, sent_count, ftd_count, conversion_rate, revenue, cost, profit, avg_response_time, rejection_rate, callback_rate. Доступные dimensions: date, hour, affiliate, broker, geo, offer, flow, status, device_type, source
- [ ] AC3: Preview отчёта (API `POST /api/v1/bi/reports/preview`) генерируется < 3 сек (p95) на датасете до 1M строк. Возвращает первые 100 строк + total count
- [ ] AC4: Frontend предоставляет drag-and-drop интерфейс: левая панель с доступными метриками и измерениями, центральная область для построения, правая панель с настройками фильтров. Перетаскивание полей между зонами работает плавно (60 FPS)
- [ ] AC5: Валидация несовместимых комбинаций: если пользователь выбирает metric=hourly_breakdown + dimension=month → предупреждение о потере гранулярности. Максимум 10 метрик × 8 измерений — при превышении → UI-блокировка с tooltip
- [ ] AC6: Пустой результат (0 строк) отображает empty state с рекомендациями изменить фильтры. Ошибка timeout (>30 сек) — отображает предложение сузить time_range или уменьшить количество dimensions
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-14]
**Зависит от:** —

##### Tasks для STORY-130:
**[TASK-0500] Спроектировать схему БД для кастомных отчётов**
- **Тип:** Backend
- **Описание:** Создать миграцию PostgreSQL для таблицы `bi_reports`: `id` (UUID, PK), `company_id` (FK), `created_by` (FK users), `name` (varchar 200), `description` (text, nullable), `config` (JSONB — metrics, dimensions, filters, time_range, sort_by, limit), `is_template` (bool, default false), `is_deleted` (bool, default false), `created_at` (timestamptz), `updated_at` (timestamptz). Индексы: `(company_id, is_deleted, created_by)`, `(company_id, is_template)`. Ограничение: максимум 200 отчётов per company.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется без ошибок (up + down)
  - [ ] Partial unique index на name per company WHERE is_deleted=false
  - [ ] JSONB config проходит JSON Schema валидацию на уровне приложения
  - [ ] Seed-данные с 5 примерными отчётами для dev-окружения
- **Оценка:** 2h
- **Story:** [STORY-130]

**[TASK-0501] Реализовать BI query engine для построения отчётов**
- **Тип:** Backend
- **Описание:** Создать универсальный движок построения SQL-запросов из конфигурации отчёта. Принимает metrics[], dimensions[], filters[] и генерирует оптимизированный SQL для ClickHouse/PostgreSQL. Поддержка агрегатных функций (SUM, COUNT, AVG, COUNT DISTINCT), GROUP BY, HAVING, ORDER BY. Параметризованные запросы для защиты от SQL-injection. Query timeout 30 сек — при превышении возвращает ошибку QUERY_TIMEOUT. Rate limit: 10 запросов/мин per user.
- **Критерии готовности (DoD):**
  - [ ] Поддержаны все 10 метрик и 10 dimensions из AC2
  - [ ] SQL-injection невозможен (все параметры — bind variables)
  - [ ] Query plan анализируется, отсутствуют full table scans на > 100K строк
  - [ ] Timeout 30 сек корректно прерывает запрос
  - [ ] Unit-тесты на 20+ комбинаций metrics/dimensions
- **Оценка:** 16h
- **Story:** [STORY-130]

**[TASK-0502] Реализовать API CRUD для кастомных отчётов**
- **Тип:** Backend
- **Описание:** Go-хэндлеры для POST/GET/PUT/DELETE `/api/v1/bi/reports`. POST создаёт отчёт, GET список с пагинацией (cursor-based, per_page 20-100), PUT обновляет конфигурацию, DELETE soft-delete. POST `/api/v1/bi/reports/preview` — выполняет запрос и возвращает первые 100 строк + total. Audit log для всех операций. Multi-tenant изоляция через company_id из JWT.
- **Критерии готовности (DoD):**
  - [ ] Все CRUD-операции работают согласно AC
  - [ ] Preview возвращает данные < 3 сек (p95) на тестовом датасете 1M строк
  - [ ] Rate limit 10 запросов/мин per user на preview
  - [ ] Multi-tenant: чужие отчёты возвращают 404
- **Оценка:** 8h
- **Story:** [STORY-130]

**[TASK-0503] Реализовать Frontend — drag-and-drop report builder**
- **Тип:** Frontend
- **Описание:** React-компонент ReportBuilder: (1) Левая панель: список доступных metrics (иконка графика) и dimensions (иконка таблицы), группированные по категориям. (2) Центральная drop-зона: "Rows" (dimensions), "Values" (metrics), "Filters". Drag из левой панели в зоны. (3) Правая панель: настройки выбранного элемента (aggregation type, sort direction, filter conditions). (4) Верхняя панель: time range picker, кнопки Preview / Save / Export. (5) Нижняя часть: таблица результатов с виртуализацией (react-virtualized) для 10K+ строк. Использовать @dnd-kit для drag-and-drop.
- **Критерии готовности (DoD):**
  - [ ] Drag-and-drop работает плавно (60 FPS) с 10 метриками + 8 dimensions
  - [ ] Preview загружает данные и отображает таблицу
  - [ ] Фильтры применяются в реальном времени
  - [ ] Empty state при 0 строк с рекомендациями
  - [ ] Responsive layout для экранов >= 1280px
- **Оценка:** 16h
- **Story:** [STORY-130]

**[TASK-0504] QA тесты для report builder**
- **Тип:** QA
- **Описание:** (1) Создание отчёта с 1 метрикой + 1 dimension → корректные данные. (2) Максимум 10 метрик + 8 dimensions → работает. (3) 11 метрик → блокировка. (4) Пустой результат → empty state. (5) Timeout на тяжёлом запросе → сообщение об ошибке. (6) Drag-and-drop: переупорядочивание dimensions меняет GROUP BY. (7) Фильтры: geo=US → только US данные. (8) Multi-tenant: чужой отчёт → 404. (9) Rate limit: 11-й preview за минуту → 429. (10) SQL injection через filter value → безопасно.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Integration-тесты с реальной БД
  - [ ] Нагрузочный тест: 50 concurrent preview запросов — p95 < 5 сек
- **Оценка:** 8h
- **Story:** [STORY-130]

---

#### [STORY-131] Dashboard Constructor (конструктор дашбордов)
**Как** Team Lead, **я хочу** создавать собственные дашборды из виджетов (KPI-карточки, графики, таблицы), **чтобы** мониторить именно те KPI, которые важны для моей команды.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/bi/dashboards` создаёт дашборд с полями: `name` (varchar 200), `description` (text), `layout` (JSONB — позиции и размеры виджетов в grid 12-колоночном). Максимум 20 виджетов на дашборд. Максимум 30 дашбордов per company
- [ ] AC2: Типы виджетов: KPI-карточка (число + delta + sparkline), Line chart, Bar chart, Pie chart, Table, Heatmap, Funnel. Каждый виджет привязан к сохранённому отчёту или inline-конфигурации (metrics + dimensions + filters)
- [ ] AC3: Grid layout с drag-and-drop перемещением и resize виджетов (react-grid-layout). Минимальный размер виджета: 2×2 ячейки. Максимальный: 12×8
- [ ] AC4: Загрузка дашборда с 20 виджетами < 2 сек (p95). Виджеты загружаются параллельно с skeleton-анимацией. Ошибка одного виджета не блокирует остальные
- [ ] AC5: Sharing: дашборд можно расшарить по ссылке (read-only, token с TTL 7 дней) другим пользователям внутри company. Чужая company → 404
- [ ] AC6: Auto-refresh: настраиваемый интервал 30 сек / 1 мин / 5 мин / off. Refresh обновляет только изменившиеся данные (ETag/Last-Modified)
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-131:
**[TASK-0505] Спроектировать схему БД для дашбордов и виджетов**
- **Тип:** Backend
- **Описание:** Таблица `bi_dashboards`: `id` (UUID), `company_id` (FK), `created_by` (FK), `name` (varchar 200), `description` (text), `layout` (JSONB), `is_default` (bool), `auto_refresh_interval` (int, nullable, seconds), `share_token` (varchar 64, nullable, unique), `share_token_expires_at` (timestamptz), `is_deleted` (bool), `created_at`, `updated_at`. Таблица `bi_widgets`: `id` (UUID), `dashboard_id` (FK), `type` (enum: kpi/line/bar/pie/table/heatmap/funnel), `title` (varchar 100), `config` (JSONB — report_id или inline metrics/dimensions/filters), `position` (JSONB — x, y, w, h в grid), `created_at`, `updated_at`. Индексы: dashboards `(company_id, is_deleted)`, widgets `(dashboard_id)`.
- **Критерии готовности (DoD):**
  - [ ] Миграции up/down работают
  - [ ] Ограничение 20 виджетов per dashboard на уровне приложения
  - [ ] Ограничение 30 дашбордов per company
  - [ ] Share token генерируется криптографически безопасно (crypto/rand)
- **Оценка:** 4h
- **Story:** [STORY-131]

**[TASK-0506] Реализовать CRUD API для дашбордов и виджетов**
- **Тип:** Backend
- **Описание:** REST API: POST/GET/PUT/DELETE для `/api/v1/bi/dashboards` и вложенные `/api/v1/bi/dashboards/{id}/widgets`. GET dashboard возвращает layout + все widgets с данными (parallel query execution). Share endpoint: POST `/api/v1/bi/dashboards/{id}/share` генерирует token. GET `/api/v1/bi/dashboards/shared/{token}` — read-only доступ (без auth, но проверка TTL и company).
- **Критерии готовности (DoD):**
  - [ ] CRUD для дашбордов и виджетов работает
  - [ ] Параллельное выполнение запросов для виджетов (goroutines + errgroup)
  - [ ] Share token с TTL 7 дней
  - [ ] Expired token → 410 Gone
  - [ ] Audit log для create/update/delete/share
- **Оценка:** 8h
- **Story:** [STORY-131]

**[TASK-0507] Реализовать Frontend — dashboard constructor**
- **Тип:** Frontend
- **Описание:** (1) Страница Dashboard List: карточки дашбордов с preview (thumbnail), кнопка Create. (2) Dashboard Editor: react-grid-layout для grid 12 колонок. Toolbar: Add Widget (выбор типа → модальное окно конфигурации), Save, Share, Auto-refresh toggle. (3) Widget render: KPI — число с delta и sparkline (recharts), Line/Bar/Pie — recharts, Table — virtualized, Heatmap — кастомный canvas, Funnel — recharts funnel. (4) Edit mode: drag/resize виджеты, delete (крестик), configure (шестерёнка). View mode: только просмотр. (5) Skeleton loading для каждого виджета при загрузке данных.
- **Критерии готовности (DoD):**
  - [ ] Grid layout с drag-and-drop и resize работает
  - [ ] Все 7 типов виджетов рендерятся корректно
  - [ ] Skeleton loading при загрузке данных
  - [ ] Ошибка одного виджета показывает error state, остальные работают
  - [ ] Auto-refresh обновляет данные без полной перерисовки
- **Оценка:** 16h
- **Story:** [STORY-131]

**[TASK-0508] QA тесты для dashboard constructor**
- **Тип:** QA
- **Описание:** (1) Создание дашборда с 1 виджетом → отображается. (2) 20 виджетов → работает. (3) 21-й виджет → ошибка. (4) Drag-and-drop перемещение → позиция сохраняется. (5) Resize виджета → данные перерисовываются. (6) Share → token работает. (7) Expired share token → 410. (8) Чужая company → 404. (9) Auto-refresh → данные обновляются. (10) Один виджет с ошибкой → остальные работают.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Перформанс-тест: 20 виджетов загружаются < 2 сек
  - [ ] E2E тест: create → add widgets → save → reload → layout сохранён
- **Оценка:** 8h
- **Story:** [STORY-131]

---

#### [STORY-132] Когортный анализ качества трафика
**Как** Affiliate Manager, **я хочу** анализировать когорты трафика по аффилейтам (качество лидов по неделям/месяцам), **чтобы** выявлять деградацию качества трафика и принимать решения о продолжении работы с аффилейтом.
**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/bi/cohorts` принимает: `cohort_dimension` (affiliate, geo, offer, source), `cohort_period` (day, week, month), `metric` (conversion_rate, ftd_rate, avg_deposit, retention_d7, revenue_per_lead), `time_range` (до 12 месяцев). Ответ: матрица когорт (rows = cohort period, columns = age periods 0..N)
- [ ] AC2: Визуализация: heatmap-таблица с цветовым кодированием (зелёный → высокая конверсия, красный → низкая). Hover на ячейке показывает абсолютные числа (лидов в когорте, FTD count, revenue)
- [ ] AC3: Аномалии автоматически подсвечиваются: если метрика когорты отклоняется > 2 стандартных отклонений от среднего → жёлтая рамка. > 3 SD → красная рамка
- [ ] AC4: Фильтрация по конкретным аффилейтам (до 20 одновременно) для сравнения когорт side-by-side
- [ ] AC5: Генерация когорт < 5 сек (p95) для периода 12 месяцев и 50 аффилейтов
- [ ] AC6: Экспорт когортной таблицы в CSV/Excel с сохранением цветового кодирования (conditional formatting в Excel)
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-132:
**[TASK-0509] Реализовать backend когортного анализа**
- **Тип:** Backend
- **Описание:** Создать сервис CohortAnalyzer. SQL-запрос группирует лиды по cohort_period (дата первой отправки), вычисляет метрику для каждого age bucket (0, 1, 2... периодов после когорты). Использовать materialized view или pre-aggregated таблицу для ускорения. Поддержка 5 метрик: conversion_rate (FTD/sent), ftd_rate (FTD/leads), avg_deposit (sum deposits/FTD count), retention_d7 (active after 7 days/FTD), revenue_per_lead (total revenue/leads). Расчёт mean и SD для anomaly detection.
- **Критерии готовности (DoD):**
  - [ ] API возвращает корректную когортную матрицу
  - [ ] Anomaly detection: > 2 SD и > 3 SD правильно определяются
  - [ ] Запрос выполняется < 5 сек для 12 месяцев × 50 аффилейтов
  - [ ] Edge case: когорта с 0 лидов → пустая строка, не ошибка
- **Оценка:** 16h
- **Story:** [STORY-132]

**[TASK-0510] Реализовать Frontend — когортный heatmap**
- **Тип:** Frontend
- **Описание:** Компонент CohortHeatmap: (1) Выбор параметров: dimension (dropdown), period (radio), metric (dropdown). (2) Heatmap-таблица: строки — когортные периоды, колонки — возраст (Age 0, Age 1...). Ячейки с цветовым градиентом (d3-scale-chromatic). (3) Tooltip при hover: абсолютные числа (leads: 150, FTD: 23, revenue: $4,500). (4) Аномалии: жёлтая/красная рамка вокруг ячеек. (5) Multi-affiliate selector: chipset с autocomplete (до 20). (6) Кнопка Export → CSV/Excel.
- **Критерии готовности (DoD):**
  - [ ] Heatmap отображает корректные данные с цветовым кодированием
  - [ ] Anomaly рамки отображаются для > 2 SD и > 3 SD
  - [ ] Tooltip показывает абсолютные числа
  - [ ] Multi-affiliate filter работает (до 20)
  - [ ] Export в CSV/Excel с conditional formatting
- **Оценка:** 16h
- **Story:** [STORY-132]

**[TASK-0511] QA тесты когортного анализа**
- **Тип:** QA
- **Описание:** (1) Когорта по affiliate + week + conversion_rate → корректные данные (ручная проверка на seed-данных). (2) Аномалия > 2 SD → жёлтая рамка. (3) Аномалия > 3 SD → красная рамка. (4) 0 лидов в когорте → пустая строка. (5) 12 месяцев × 50 аффилейтов < 5 сек. (6) Multi-affiliate: 20 выбранных → данные корректны. (7) 21-й аффилейт → блокировка. (8) Export CSV → данные совпадают с UI.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Ручная сверка когортных данных с raw-данными (минимум 3 когорты)
  - [ ] Перформанс-тест на production-like датасете
- **Оценка:** 8h
- **Story:** [STORY-132]

---

#### [STORY-133] P&L по аффилейтам с историческими трендами
**Как** Finance Manager, **я хочу** видеть P&L (profit & loss) по каждому аффилейту с историческими трендами, **чтобы** определять наиболее прибыльных партнёров и выявлять тренды снижения маржинальности.
**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/bi/pnl/affiliates` возвращает для каждого аффилейта: revenue (сумма payouts от брокеров), cost (выплаты аффилейту), profit (revenue - cost), margin_pct ((profit/revenue) × 100), leads_count, ftd_count, cost_per_lead, cost_per_ftd, revenue_per_ftd. Агрегация по day/week/month
- [ ] AC2: Тренд-линии: для каждого аффилейта отображается sparkline за последние 90 дней по метрике profit. Если profit падает > 20% за последние 2 недели → warning-иконка
- [ ] AC3: Сортировка по любому полю. Фильтры: date range (до 12 месяцев), минимальный leads_count (default 10 — убираем шум мелких аффилейтов), geo, offer
- [ ] AC4: Drill-down по аффилейту: клик → детальная страница с разбивкой по брокерам, geo, offers и daily chart (revenue, cost, profit overlaid)
- [ ] AC5: Загрузка таблицы P&L для 200 аффилейтов < 2 сек (p95). Drill-down страница < 1.5 сек
- [ ] AC6: Отрицательный profit подсвечивается красным фоном. Margin < 10% → жёлтый. Margin >= 30% → зелёный
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-133:
**[TASK-0512] Реализовать backend P&L расчётов**
- **Тип:** Backend
- **Описание:** Сервис PnLCalculator. Агрегация revenue (из broker postback данных), cost (из affiliate payout конфигурации × leads/FTD). Расчёт всех метрик из AC1. Materialized view для ускорения (refresh каждые 15 мин). Trend calculation: линейная регрессия за 14 дней для определения slope (падение > 20% → warning). API endpoint с пагинацией (cursor-based), сортировкой, фильтрами. Drill-down API: `/api/v1/bi/pnl/affiliates/{id}/breakdown`.
- **Критерии готовности (DoD):**
  - [ ] Все метрики из AC1 рассчитываются корректно
  - [ ] Warning при падении profit > 20% за 14 дней
  - [ ] Materialized view обновляется каждые 15 мин
  - [ ] < 2 сек для 200 аффилейтов (p95)
  - [ ] Drill-down возвращает breakdown по broker/geo/offer
- **Оценка:** 16h
- **Story:** [STORY-133]

**[TASK-0513] Реализовать Frontend — P&L таблица и drill-down**
- **Тип:** Frontend
- **Описание:** (1) Страница Affiliate P&L: таблица с колонками из AC1, sparkline в колонке Trend (recharts Sparkline), warning icon при падении. Цветовое кодирование: красный/жёлтый/зелёный для margin. (2) Фильтры: date range picker, min leads slider, geo multi-select, offer multi-select. (3) Сортировка: клик по заголовку колонки. (4) Drill-down: клик по строке → страница с tabs (By Broker, By GEO, By Offer) и daily overlay chart (3 линии: revenue, cost, profit). (5) Export: кнопка → CSV/Excel.
- **Критерии готовности (DoD):**
  - [ ] Таблица с sparklines и цветовым кодированием отображается
  - [ ] Фильтры и сортировка работают
  - [ ] Drill-down с tabs и charts
  - [ ] Export в CSV/Excel
  - [ ] Warning icon при падении profit > 20%
- **Оценка:** 16h
- **Story:** [STORY-133]

**[TASK-0514] QA тесты P&L**
- **Тип:** QA
- **Описание:** (1) Revenue + cost + profit рассчитываются корректно (ручная сверка на 5 аффилейтах). (2) Margin < 10% → жёлтый. (3) Profit < 0 → красный. (4) Падение > 20% → warning icon. (5) Фильтр min_leads=10 → аффилейты с < 10 лидов скрыты. (6) Drill-down: сумма по брокерам = total. (7) Export CSV → данные совпадают с UI. (8) 200 аффилейтов < 2 сек.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Ручная сверка P&L на seed-данных
  - [ ] Edge case: аффилейт с 0 revenue → margin = 0%, не NaN
- **Оценка:** 8h
- **Story:** [STORY-133]

---

#### [STORY-134] Сравнение периодов (Period Comparison)
**Как** Finance Manager, **я хочу** сравнивать метрики за разные периоды (этот месяц vs прошлый, неделя к неделе, YoY), **чтобы** оценивать динамику бизнеса и выявлять сезонные паттерны.
**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/bi/compare` принимает: `period_a` (from/to), `period_b` (from/to), `metrics[]`, `dimensions[]`, `comparison_type` (side_by_side, overlay, delta_only). Preset shortcuts: WoW, MoM, QoQ, YoY
- [ ] AC2: Ответ содержит для каждой строки: value_a, value_b, absolute_delta (b - a), relative_delta_pct ((b - a) / a × 100). Edge case: value_a = 0 → relative_delta = null (не Infinity)
- [ ] AC3: Визуализация side-by-side: две колонки с одинаковыми dimensions, delta-колонка с цветовым индикатором (зелёная стрелка вверх / красная вниз). Overlay chart: две линии на одном графике с легендой (Period A / Period B)
- [ ] AC4: API отвечает < 2 сек (p95) за сравнение 1 года vs 1 года данных на 1M строк
- [ ] AC5: Relative delta отображается с точностью до 1 знака после запятой. Абсолютные числа форматируются с разделителями тысяч
**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-134:
**[TASK-0515] Реализовать backend сравнения периодов**
- **Тип:** Backend
- **Описание:** Сервис PeriodComparator. Два параллельных SQL-запроса (period_a и period_b) с одинаковой структурой GROUP BY. Merge результатов по dimension keys. Расчёт absolute_delta и relative_delta_pct. Обработка edge cases: value_a=0 → relative_delta=null, оба нулевые → delta=0. Preset shortcuts: WoW (this week vs prev), MoM, QoQ, YoY — автоматический расчёт period_a/b из текущей даты. Cache: identical comparison кэшируется 5 мин (Redis).
- **Критерии готовности (DoD):**
  - [ ] Параллельные запросы выполняются корректно
  - [ ] Edge case value_a=0 → relative_delta=null
  - [ ] Presets WoW/MoM/QoQ/YoY корректно рассчитывают даты
  - [ ] Cache 5 мин работает (повторный запрос < 100ms)
  - [ ] < 2 сек (p95) на 1M строк
- **Оценка:** 8h
- **Story:** [STORY-134]

**[TASK-0516] Реализовать Frontend — UI сравнения периодов**
- **Тип:** Frontend
- **Описание:** (1) Period selector: два date range picker-а (Period A, Period B) + preset buttons (WoW, MoM, QoQ, YoY). (2) Comparison type toggle: Side-by-Side | Overlay | Delta Only. (3) Side-by-side view: таблица с колонками [Dimension | Period A Value | Period B Value | Δ Absolute | Δ %]. Delta с цветовым кодированием и стрелками. (4) Overlay view: recharts LineChart с двумя линиями, общая ось X (нормализованная по дням периода). (5) Delta Only: bar chart с positive/negative bars.
- **Критерии готовности (DoD):**
  - [ ] Все 3 типа визуализации работают
  - [ ] Presets корректно заполняют date pickers
  - [ ] Цветовое кодирование delta (зелёный/красный)
  - [ ] Overlay chart с двумя линиями и легендой
  - [ ] Форматирование чисел: разделители тысяч, 1 знак после запятой для %
- **Оценка:** 8h
- **Story:** [STORY-134]

**[TASK-0517] QA тесты сравнения периодов**
- **Тип:** QA
- **Описание:** (1) WoW preset → корректные даты периодов. (2) value_a=0 → relative_delta=null, не Infinity. (3) Оба периода пустые → empty state. (4) Side-by-side → delta рассчитывается верно. (5) Overlay → 2 линии отображаются. (6) 1 год vs 1 год < 2 сек. (7) Cache hit → < 100ms. (8) Форматирование: 1234567 → 1,234,567.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Ручная сверка delta на seed-данных (5 метрик)
- **Оценка:** 4h
- **Story:** [STORY-134]

---

#### [STORY-135] Scheduled Email Reports (рассылка отчётов по расписанию)
**Как** Team Lead, **я хочу** настроить автоматическую рассылку отчётов по email (daily/weekly/monthly), **чтобы** стейкхолдеры получали свежую аналитику без необходимости логиниться в систему.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/bi/schedules` создаёт расписание: `report_id` (FK), `frequency` (daily/weekly/monthly), `day_of_week` (0-6, для weekly), `day_of_month` (1-28, для monthly), `time` (HH:MM), `timezone` (IANA, напр. Europe/Moscow), `recipients[]` (email, до 20), `format` (csv/xlsx/pdf), `subject_template` (varchar 200, с переменными {{report_name}}, {{date}})
- [ ] AC2: Отправка email через очередь (Redis + worker). Retry: 3 попытки с exponential backoff (1 мин, 5 мин, 15 мин). После 3 неудач → alert в Slack/Telegram и статус failed
- [ ] AC3: PDF содержит: логотип company (если загружен), заголовок отчёта, дата генерации, таблица данных, charts (если применимо). Размер PDF < 10 MB
- [ ] AC4: Scheduled reports delivery success rate >= 99.5% (метрика за 30 дней). Отправка происходит в пределах ±5 минут от запланированного времени
- [ ] AC5: Unsubscribe ссылка в каждом email. Recipient может отписаться → статус `unsubscribed` для этого schedule. Admin видит unsubscribed recipients
- [ ] AC6: Максимум 50 активных schedules per company. При превышении → HTTP 422
**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-135:
**[TASK-0518] Спроектировать схему и backend для scheduled reports**
- **Тип:** Backend
- **Описание:** Таблица `bi_schedules`: id, company_id, report_id (FK bi_reports), frequency (enum), day_of_week, day_of_month, time, timezone, format (enum csv/xlsx/pdf), subject_template, is_active, created_by, created_at, updated_at. Таблица `bi_schedule_recipients`: id, schedule_id (FK), email, status (active/unsubscribed), unsubscribed_at. Таблица `bi_schedule_runs`: id, schedule_id (FK), status (pending/running/success/failed), started_at, completed_at, file_url, error_message, retry_count. Cron job (каждую минуту) проверяет schedules и создаёт runs. Worker берёт run, генерирует отчёт, отправляет email через SendGrid/SES.
- **Критерии готовности (DoD):**
  - [ ] Миграции работают
  - [ ] Cron корректно учитывает timezone и DST
  - [ ] Retry 3 раза с exponential backoff
  - [ ] Alert после 3 неудач
  - [ ] Unsubscribe token → recipient status updated
  - [ ] Лимит 50 schedules per company
- **Оценка:** 16h
- **Story:** [STORY-135]

**[TASK-0519] Генерация PDF отчётов**
- **Тип:** Backend
- **Описание:** Сервис ReportRenderer. Генерация PDF через headless Chrome (puppeteer/chromedp) или wkhtmltopdf. Шаблон: логотип company (из S3), заголовок, дата, таблица данных (с пагинацией если > 50 строк), charts (SVG → PNG embed). Размер < 10 MB (сжатие изображений, ограничение строк до 10000). Fallback: если генерация PDF > 30 сек → timeout, отправить CSV вместо PDF с пометкой.
- **Критерии готовности (DoD):**
  - [ ] PDF генерируется с логотипом, заголовком, данными
  - [ ] Charts рендерятся корректно
  - [ ] Размер < 10 MB для отчёта до 10K строк
  - [ ] Timeout 30 сек → fallback на CSV
  - [ ] Кириллица/UTF-8 отображается корректно
- **Оценка:** 16h
- **Story:** [STORY-135]

**[TASK-0520] Реализовать Frontend — управление расписаниями**
- **Тип:** Frontend
- **Описание:** (1) Страница Scheduled Reports: таблица расписаний (report name, frequency, next run time, last status, recipients count). (2) Create/Edit: модальное окно с формой (report selector, frequency radio, day/time pickers, timezone dropdown, recipients email input с chip UI, format radio, subject template с preview). (3) Run history: раскрывающаяся секция с логом runs (status badge, time, download link). (4) Toggle active/inactive. (5) Recipients: показать unsubscribed с пометкой.
- **Критерии готовности (DoD):**
  - [ ] Создание/редактирование/удаление расписаний работает
  - [ ] Next run time рассчитывается и отображается с учётом timezone
  - [ ] Run history с статусами и download links
  - [ ] Unsubscribed recipients помечены
  - [ ] Subject template preview с подстановкой переменных
- **Оценка:** 8h
- **Story:** [STORY-135]

**[TASK-0521] QA тесты scheduled reports**
- **Тип:** QA
- **Описание:** (1) Создание daily schedule → run в указанное время ±5 мин. (2) Weekly schedule day_of_week=1 → срабатывает только по понедельникам. (3) Monthly day_of_month=31 в феврале → срабатывает 28/29. (4) Retry: имитация ошибки email → 3 retry → alert. (5) Unsubscribe → recipient не получает следующие отчёты. (6) 51-й schedule → HTTP 422. (7) PDF с кириллицей → корректный. (8) CSV: данные совпадают с UI. (9) DST переход → время корректно.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Integration test с реальной отправкой email (staging)
  - [ ] DST edge case проверен (Europe/Moscow, US/Eastern)
- **Оценка:** 8h
- **Story:** [STORY-135]

---

#### [STORY-136] Экспорт отчётов с брендированием (CSV/Excel/PDF)
**Как** Finance Manager, **я хочу** экспортировать любой отчёт в CSV, Excel или PDF с брендированием компании, **чтобы** делиться аналитикой с внешними партнёрами и инвесторами в профессиональном формате.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/bi/reports/{id}/export` принимает `format` (csv/xlsx/pdf), возвращает HTTP 202 с `export_id`. GET `/api/v1/bi/exports/{export_id}` → статус (pending/processing/ready/failed) и download URL (pre-signed S3, TTL 24 часа). После 24h → HTTP 410 Gone
- [ ] AC2: CSV: UTF-8 BOM, разделитель `;` (настраиваемый), заголовки колонок. Excel: sheet с данными + sheet с метаданными (report name, date, filters applied). PDF: обложка с логотипом, оглавление для multi-page, таблица данных, charts
- [ ] AC3: Экспорт до 100,000 строк. Для > 100K → HTTP 422 с предложением сузить фильтры. Время генерации < 15 сек для 100K строк (p95)
- [ ] AC4: Branding: company logo, company name, custom footer text — настраиваются в Settings. Если не настроены → default layout без лого
- [ ] AC5: Concurrent exports: максимум 3 одновременных экспорта per user. 4-й → HTTP 429 с Retry-After header
- [ ] AC6: Файлы экспорта автоматически удаляются через 7 дней (S3 lifecycle policy)
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-136:
**[TASK-0522] Реализовать backend асинхронного экспорта**
- **Тип:** Backend
- **Описание:** Таблица `bi_exports`: id, company_id, user_id, report_id, format, status (pending/processing/ready/failed), file_key (S3 key), file_size_bytes, error_message, created_at, completed_at, expires_at (created_at + 24h). Worker: берёт pending export → выполняет query → генерирует файл → upload S3 → status=ready. Timeout 60 сек → failed. Rate limit: 3 concurrent per user (Redis semaphore). Pre-signed URL с TTL 24h для download.
- **Критерии готовности (DoD):**
  - [ ] Async export pipeline работает (pending → processing → ready)
  - [ ] CSV: UTF-8 BOM, корректные разделители
  - [ ] Excel: 2 sheets (data + metadata)
  - [ ] Pre-signed URL c TTL 24h
  - [ ] Rate limit: 4-й concurrent → 429
  - [ ] S3 lifecycle: TTL 7 дней
- **Оценка:** 8h
- **Story:** [STORY-136]

**[TASK-0523] Реализовать Frontend — кнопка Export и статус**
- **Тип:** Frontend
- **Описание:** (1) Кнопка Export в header отчёта: dropdown с вариантами CSV/Excel/PDF. (2) При клике → toast notification "Export started". (3) Polling статуса каждые 2 сек (или WebSocket). (4) Ready → toast с кнопкой Download. (5) Failed → toast с ошибкой. (6) Export history: drawer со списком последних 20 экспортов (format icon, size, status, download link, expires in). (7) Rate limit: при 429 → disabled button с tooltip "Max 3 concurrent exports".
- **Критерии готовности (DoD):**
  - [ ] Export запускается и polling работает
  - [ ] Download файла по ready-ссылке
  - [ ] Rate limit UI feedback
  - [ ] Export history с download links
  - [ ] Expired exports помечены (greyed out)
- **Оценка:** 8h
- **Story:** [STORY-136]

**[TASK-0524] QA тесты экспорта**
- **Тип:** QA
- **Описание:** (1) CSV export → UTF-8, корректные данные. (2) Excel export → 2 sheets. (3) PDF export → логотип, таблица, charts. (4) 100K строк < 15 сек. (5) 100,001 строка → 422. (6) 4-й concurrent export → 429. (7) Download после 24h → 410. (8) Branding settings → отображаются в PDF. (9) Без branding → default layout.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Файлы открываются в Excel/Acrobat без ошибок
  - [ ] Кириллица корректна во всех форматах
- **Оценка:** 4h
- **Story:** [STORY-136]

---

#### [STORY-137] Воронка конверсий (Funnel Visualization)
**Как** Affiliate Manager, **я хочу** видеть воронку конверсий (Lead → Sent → Callback → FTD → Retained), **чтобы** определять, на каком этапе теряются лиды и оптимизировать процесс.
**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/bi/funnel` принимает: `stages[]` (по умолчанию: lead_created, sent_to_broker, callback_received, ftd, retained_d30), `filters` (affiliate, broker, geo, date_range), `group_by` (optional: affiliate, broker, geo). Возвращает для каждого stage: count, conversion_from_previous_pct, conversion_from_first_pct
- [ ] AC2: Визуализация: горизонтальная или вертикальная воронка (трапецеидальные блоки). Каждый блок: stage name, absolute count, % от предыдущего шага, % от первого шага. Цвет: градиент от зелёного (первый) к красному (последний)
- [ ] AC3: Hover на блоке: детализация по top-5 значениям group_by (если указан). Пример: при group_by=broker → top 5 брокеров с counts
- [ ] AC4: Сравнение воронок: до 3 воронок side-by-side (напр., разные аффилейты или периоды)
- [ ] AC5: Custom stages: пользователь может добавить или убрать стадии из воронки (минимум 2, максимум 8 stages)
- [ ] AC6: API отвечает < 2 сек (p95). Кэширование 5 мин
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-137:
**[TASK-0525] Реализовать backend funnel analytics**
- **Тип:** Backend
- **Описание:** Сервис FunnelCalculator. Для каждого stage — COUNT с фильтрами по status progression. Lead → Sent: leads с хотя бы одной отправкой. Sent → Callback: leads со статусом callback. Callback → FTD: leads со статусом deposited. FTD → Retained: leads с активностью через 30 дней. Расчёт conversion rates. Group_by: sub-query для top-5 values. Parallel queries для сравнения (до 3 воронок). Redis cache 5 мин.
- **Критерии готовности (DoD):**
  - [ ] Все 5 default stages рассчитываются корректно
  - [ ] Custom stages (2-8) поддерживаются
  - [ ] Group_by → top-5 values корректны
  - [ ] Сравнение 3 воронок параллельно
  - [ ] Cache 5 мин, < 2 сек (p95)
- **Оценка:** 8h
- **Story:** [STORY-137]

**[TASK-0526] Реализовать Frontend — funnel chart**
- **Тип:** Frontend
- **Описание:** Компонент FunnelChart: (1) Recharts FunnelChart или кастомный SVG. Трапецеидальные блоки с labels: stage name, count (bold), % from previous (↓ arrow), % from first. (2) Цветовой градиент. (3) Hover tooltip: top-5 breakdown (если group_by). (4) Comparison mode: 2-3 воронки рядом с одинаковым масштабом. (5) Stage editor: drag-and-drop для reorder, add/remove stages. (6) Фильтры: affiliate, broker, geo, date range. (7) Toggle: горизонтальная/вертикальная ориентация.
- **Критерии готовности (DoD):**
  - [ ] Воронка рендерится с корректными данными
  - [ ] Hover tooltip с top-5 breakdown
  - [ ] Comparison mode (до 3 воронок)
  - [ ] Stage editor: добавление/удаление/reorder
  - [ ] Горизонтальная и вертикальная ориентация
- **Оценка:** 8h
- **Story:** [STORY-137]

**[TASK-0527] QA тесты воронки**
- **Тип:** QA
- **Описание:** (1) Default 5 stages → корректные counts и %. (2) Custom 2 stages → работает. (3) Custom 9 stages → блокировка. (4) Comparison 3 воронок → side-by-side. (5) Group_by=broker → top-5 в tooltip. (6) Пустой stage (0 leads) → 0% без ошибок. (7) Cache: повторный запрос < 100ms. (8) Conversion % от первого stage рассчитан корректно.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Ручная сверка conversion rates на seed-данных
- **Оценка:** 4h
- **Story:** [STORY-137]

---

#### [STORY-138] Сохранённые шаблоны отчётов (Saved Report Templates)
**Как** Network Admin, **я хочу** сохранять конфигурации отчётов как шаблоны и делиться ими с командой, **чтобы** стандартизировать аналитику и экономить время на настройку типовых отчётов.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/bi/templates` создаёт шаблон из существующего отчёта: копирует config (metrics, dimensions, filters), добавляет `name`, `description`, `category` (performance/financial/quality/custom). Максимум 100 шаблонов per company
- [ ] AC2: Шаблон можно применить к новому отчёту: API `POST /api/v1/bi/reports/from-template/{template_id}` создаёт отчёт с конфигурацией шаблона. Пользователь может изменить параметры после создания
- [ ] AC3: Системные шаблоны (5-10 предустановленных): "Daily Affiliate Performance", "Weekly P&L Summary", "Monthly Conversion Funnel", "Broker Quality Scorecard", "Traffic Source Comparison". Их нельзя удалить или редактировать
- [ ] AC4: Sharing: шаблон видим всем пользователям company. Создатель и Admin могут редактировать/удалять
- [ ] AC5: UI: галерея шаблонов с preview (thumbnail), поиск по имени, фильтр по category. Кнопка "Use Template" → создаёт отчёт
**Story Points:** 3
**Приоритет:** Could
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-138:
**[TASK-0528] Реализовать backend шаблонов отчётов**
- **Тип:** Backend
- **Описание:** Таблица `bi_templates`: id, company_id (nullable для системных), created_by, name, description, category (enum), config (JSONB — копия report config), is_system (bool), usage_count (int), is_deleted, created_at, updated_at. CRUD API. POST `/from-template/{id}` — deep copy config в новый report. Seed 5-10 системных шаблонов (is_system=true, company_id=null). Системные шаблоны: PUT/DELETE → 403.
- **Критерии готовности (DoD):**
  - [ ] CRUD для custom шаблонов работает
  - [ ] Системные шаблоны доступны всем, не удаляемы
  - [ ] From-template создаёт корректную копию
  - [ ] usage_count инкрементируется при использовании
  - [ ] Лимит 100 шаблонов per company
- **Оценка:** 8h
- **Story:** [STORY-138]

**[TASK-0529] Реализовать Frontend — галерея шаблонов**
- **Тип:** Frontend
- **Описание:** (1) Страница Templates: grid карточек (name, description, category badge, usage count, thumbnail preview, "Use" button). (2) Поиск по имени (debounced 300ms). (3) Фильтр по category (tabs или dropdown). (4) Системные шаблоны: badge "System", no edit/delete buttons. (5) Custom шаблоны: edit/delete для creator и admin. (6) "Use Template" → redirect к Report Builder с предзаполненной конфигурацией. (7) "Save as Template" button в Report Builder → модальное окно (name, description, category).
- **Критерии готовности (DoD):**
  - [ ] Галерея с карточками отображается
  - [ ] Поиск и фильтрация работают
  - [ ] Use Template → Report Builder с конфигурацией
  - [ ] Save as Template из Report Builder
  - [ ] Системные шаблоны не редактируемы
- **Оценка:** 8h
- **Story:** [STORY-138]

**[TASK-0530] QA тесты шаблонов**
- **Тип:** QA
- **Описание:** (1) Создание шаблона → появляется в галерее. (2) Use Template → корректная конфигурация в новом отчёте. (3) Системный шаблон: edit → 403. (4) Системный шаблон: delete → 403. (5) 101-й шаблон → 422. (6) Поиск по имени → фильтрация корректна. (7) Usage count: инкрементируется при use. (8) Другой user в company → видит шаблон, не может edit (если не admin).
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Системные шаблоны присутствуют в fresh install
- **Оценка:** 4h
- **Story:** [STORY-138]

---

#### [STORY-139] Политики хранения и архивирования данных (Data Retention)
**Как** Network Admin, **я хочу** настроить политики хранения аналитических данных (retention period, архивирование), **чтобы** соблюдать требования к хранению данных и оптимизировать стоимость инфраструктуры.
**Acceptance Criteria:**
- [ ] AC1: API `PUT /api/v1/settings/data-retention` позволяет настроить: `raw_data_retention_days` (30-730, default 365), `aggregated_data_retention_days` (365-2555 т.е. до 7 лет, default 730), `archive_enabled` (bool), `archive_format` (parquet/csv.gz). Только роль Network Admin
- [ ] AC2: Автоматический процесс: ежедневно в 03:00 UTC проверяет raw данные старше retention period → архивирует в S3 (если archive_enabled) → удаляет из primary DB. Лог каждого архивирования сохраняется
- [ ] AC3: Архивные данные доступны для загрузки через UI (список архивов с date range, size, download link). Pre-signed URL с TTL 1 час
- [ ] AC4: Dashboard показывает: текущий объём данных (GB), estimated monthly cost, retention timeline (визуальная шкала), next scheduled archiving run
- [ ] AC5: Предупреждение при уменьшении retention period: "X записей будут заархивированы/удалены". Требуется подтверждение (ввести "CONFIRM" в текстовое поле)
- [ ] AC6: Архивирование не влияет на performance production БД: выполняется batch по 10,000 записей с паузой 1 сек между batch
**Story Points:** 5
**Приоритет:** Could
**Epic:** [EPIC-14]
**Зависит от:** [STORY-130]

##### Tasks для STORY-139:
**[TASK-0531] Реализовать backend data retention engine**
- **Тип:** Backend
- **Описание:** Таблица `data_retention_config`: company_id (PK), raw_retention_days, aggregated_retention_days, archive_enabled, archive_format, updated_by, updated_at. Таблица `data_archive_runs`: id, company_id, run_date, records_archived, records_deleted, archive_file_key (S3), archive_size_bytes, status (running/completed/failed), started_at, completed_at, error_message. Cron job: daily 03:00 UTC, для каждой company: SELECT records older than retention → batch INSERT into archive (Parquet/CSV.GZ via S3) → DELETE from primary. Batch size 10K, 1 sec pause. Logging каждого batch.
- **Критерии готовности (DoD):**
  - [ ] Config API работает (только admin)
  - [ ] Cron корректно определяет записи для архивирования
  - [ ] Batch processing 10K + 1 sec pause
  - [ ] Archive files создаются в S3 (Parquet или CSV.GZ)
  - [ ] Run log записывается
  - [ ] При ошибке → status=failed, partial archive сохраняется
- **Оценка:** 16h
- **Story:** [STORY-139]

**[TASK-0532] Реализовать Frontend — Data Retention Settings**
- **Тип:** Frontend
- **Описание:** Страница Settings > Data Retention: (1) Sliders: Raw Data Retention (30-730 дней), Aggregated Data (365-2555 дней). (2) Toggle: Archive Enabled + format selector (Parquet/CSV.GZ). (3) Dashboard: current DB size (GB), estimated monthly cost, retention timeline (visual), next archive run datetime. (4) Archive list: таблица (date range, records, file size, download button). (5) Confirmation modal при уменьшении retention: "X records will be archived/deleted. Type CONFIRM to proceed."
- **Критерии готовности (DoD):**
  - [ ] Settings UI с sliders и toggles
  - [ ] Dashboard с текущими метриками
  - [ ] Archive list с download links
  - [ ] Confirmation modal с "CONFIRM" input
  - [ ] Только admin видит и может редактировать
- **Оценка:** 8h
- **Story:** [STORY-139]

**[TASK-0533] QA тесты data retention**
- **Тип:** QA
- **Описание:** (1) Установить retention 30 дней → запустить archive → записи старше 30 дней удалены. (2) Archive file в S3 содержит правильные данные. (3) Download archive → файл открывается. (4) Не-admin → 403 на settings. (5) Уменьшение retention без CONFIRM → отмена. (6) Batch processing: при ошибке на batch 3 из 10 → partial archive + status failed. (7) Performance: архивирование 100K записей не влияет на API latency (< 5% degradation).
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Проверен Parquet и CSV.GZ формат
  - [ ] Performance test во время архивирования
- **Оценка:** 8h
- **Story:** [STORY-139]

---

## [EPIC-15] Mobile Dashboard (PWA)
**Цель:** Создать PWA мобильное приложение с real-time KPI дашбордом, push-уведомлениями, быстрым управлением капами и биометрической аутентификацией. Ни один конкурент (HyperOne, Leadgreed, CRM Mate, Elnopy) не имеет мобильного приложения — это уникальное конкурентное преимущество.
**Метрика успеха:**
- 40% активных пользователей устанавливают PWA в течение 30 дней после запуска
- Lighthouse PWA score >= 90
- Time to Interactive (TTI) на мобильном 4G < 3 сек
- Push notification delivery rate >= 95%
- Offline mode: кэшированные данные отображаются < 1 сек при отсутствии сети
- Cap management action (increase/decrease/pause) выполняется < 2 тапа
**Приоритет:** P2 (Growth)
**Зависит от:** [EPIC-10]
**Оценка:** L

### Stories:

---

#### [STORY-140] PWA установка и offline-поддержка
**Как** Affiliate Manager, **я хочу** установить CRM как мобильное приложение на телефон с поддержкой offline-режима, **чтобы** иметь быстрый доступ к данным даже при нестабильном интернете.
**Acceptance Criteria:**
- [ ] AC1: Web App Manifest настроен: `name`, `short_name`, `icons` (192x192, 512x512 PNG), `start_url`, `display: standalone`, `theme_color`, `background_color`. Приложение устанавливается через "Add to Home Screen" на iOS Safari и Android Chrome
- [ ] AC2: Service Worker (Workbox) кэширует: app shell (HTML/CSS/JS) → cache-first strategy, API данные → stale-while-revalidate с TTL 5 мин, изображения → cache-first с TTL 24 часа. Общий размер cache < 50 MB
- [ ] AC3: Offline mode: при потере соединения отображаются последние кэшированные данные с banner "Offline mode — data as of HH:MM". Навигация между кэшированными страницами работает. Действия (cap change, etc.) ставятся в queue и синхронизируются при восстановлении связи (Background Sync API)
- [ ] AC4: Lighthouse PWA score >= 90. Performance score >= 80 на mobile 4G (throttled). TTI < 3 сек
- [ ] AC5: Update flow: при обновлении Service Worker — toast "New version available" с кнопкой "Update". Auto-update через 24 часа если пользователь не обновил
- [ ] AC6: Splash screen с логотипом при запуске приложения. Корректно работает на iOS 15+ и Android 10+
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-15]
**Зависит от:** —

##### Tasks для STORY-140:
**[TASK-0534] Настроить Web App Manifest и Service Worker**
- **Тип:** Frontend
- **Описание:** (1) Создать manifest.json: name "GambChamp CRM", short_name "GambChamp", icons в 5 размерах (72, 96, 128, 192, 512), start_url "/", display "standalone", theme_color бренда, background_color белый. (2) Зарегистрировать Service Worker (Workbox): precache app shell, runtime cache стратегии (stale-while-revalidate для /api/*, cache-first для /static/*). (3) Background Sync registration для offline actions queue. (4) Cache storage quota < 50 MB с eviction policy (LRU).
- **Критерии готовности (DoD):**
  - [ ] Manifest валидный (Chrome DevTools > Application > Manifest без ошибок)
  - [ ] Service Worker регистрируется и активируется
  - [ ] Cache стратегии работают (Network tab: served from SW)
  - [ ] Install prompt появляется на Android Chrome и iOS Safari
  - [ ] Background Sync registered для offline queue
- **Оценка:** 8h
- **Story:** [STORY-140]

**[TASK-0535] Реализовать offline data sync engine**
- **Тип:** Frontend
- **Описание:** (1) IndexedDB store для кэшированных API responses (using idb library). (2) При online: API response → сохраняется в IndexedDB с timestamp. (3) При offline: читать из IndexedDB, показывать banner с timestamp. (4) Action queue: мутации (cap changes, etc.) сохраняются в IndexedDB queue. (5) При восстановлении связи: Background Sync → replay queue в порядке FIFO. (6) Conflict resolution: если server state изменился → показать diff и спросить пользователя. (7) Queue max size: 50 actions, при превышении → warning.
- **Критерии готовности (DoD):**
  - [ ] Offline banner отображается при потере сети
  - [ ] Кэшированные данные читаются из IndexedDB
  - [ ] Action queue записывается и воспроизводится
  - [ ] Conflict detection работает
  - [ ] Max queue 50 items
- **Оценка:** 16h
- **Story:** [STORY-140]

**[TASK-0536] QA тесты PWA и offline**
- **Тип:** QA
- **Описание:** (1) Install на Android Chrome → app icon на home screen. (2) Install на iOS Safari → app icon. (3) Offline: отключить сеть → данные отображаются. (4) Offline action → queue → online → sync. (5) Conflict: изменить cap offline, кто-то другой изменил online → conflict dialog. (6) Lighthouse PWA >= 90. (7) Cache < 50 MB после 7 дней использования. (8) Update toast при новой версии SW.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят на Android и iOS
  - [ ] Lighthouse аудит: PWA >= 90, Performance >= 80
  - [ ] Тест на real devices (минимум: iPhone 13, Samsung Galaxy S22)
- **Оценка:** 8h
- **Story:** [STORY-140]

---

#### [STORY-141] Real-time KPI дашборд для мобильных
**Как** Team Lead, **я хочу** видеть ключевые KPI в реальном времени на мобильном телефоне, **чтобы** мониторить производительность команды в любом месте.
**Acceptance Criteria:**
- [ ] AC1: Мобильный дашборд отображает KPI-карточки (вертикальный scroll): Leads Today (count + delta vs yesterday), Sent Today, FTD Today, Conversion Rate, Revenue Today, Active Caps (X/Y used), Top Affiliate (by leads), Top Broker (by FTD). Каждая карточка: число, delta (стрелка + %), sparkline за 24 часа
- [ ] AC2: Real-time обновление через WebSocket (SSE fallback): данные обновляются < 5 сек после изменения. Индикатор "Live" с пульсирующим зелёным dot. При потере WS → reconnect с exponential backoff (1с, 2с, 4с, max 30с)
- [ ] AC3: Pull-to-refresh (touch gesture) для принудительного обновления всех KPI. Refresh < 1.5 сек (p95)
- [ ] AC4: Viewport-optimized: карточки адаптируются под ширину 320px-428px (iPhone SE → iPhone Pro Max). Текст читаем без zoom (минимум 14px). Sparkline масштабируется
- [ ] AC5: Тёмная тема: поддержка prefers-color-scheme: dark. Автоматическое переключение или manual toggle
- [ ] AC6: Время загрузки дашборда < 2 сек на 4G (p95). Skeleton loading для каждой карточки
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-15]
**Зависит от:** [STORY-140]

##### Tasks для STORY-141:
**[TASK-0537] Реализовать мобильный KPI dashboard layout**
- **Тип:** Frontend
- **Описание:** React компонент MobileDashboard: (1) Vertical scroll container с KPI cards (8 карточек). (2) KPICard компонент: label (14px, secondary color), value (28px, bold, primary), delta badge (зелёный/красный, 12px), sparkline (recharts Sparkline, 60x20px). (3) Grid: 1 колонка на 320-374px, 2 колонки на 375-428px. (4) Pull-to-refresh: react-pull-to-refresh или custom touch handler. (5) Skeleton loading: 8 placeholder карточек при загрузке. (6) Dark theme: CSS variables для light/dark. Auto-detect + manual toggle в header.
- **Критерии готовности (DoD):**
  - [ ] 8 KPI карточек отображаются корректно
  - [ ] Responsive: 1-2 колонки в зависимости от ширины
  - [ ] Pull-to-refresh работает
  - [ ] Skeleton loading при первой загрузке
  - [ ] Dark theme переключается и auto-detects
- **Оценка:** 16h
- **Story:** [STORY-141]

**[TASK-0538] Интегрировать WebSocket real-time обновления**
- **Тип:** Backend
- **Описание:** WebSocket endpoint `wss://api/v1/ws/mobile-dashboard`. При подключении: отправить текущие KPI данные. При изменении (новый лид, FTD, cap change) → push delta update (только изменённые поля). SSE fallback endpoint `/api/v1/sse/mobile-dashboard` для клиентов без WS. Heartbeat каждые 30 сек для keep-alive. Max concurrent WS connections per user: 3. Auth через token в query param (one-time, expires 60 sec).
- **Критерии готовности (DoD):**
  - [ ] WS подключается и получает initial data
  - [ ] Delta updates приходят < 5 сек после изменения
  - [ ] SSE fallback работает
  - [ ] Reconnect с exponential backoff
  - [ ] Auth token one-time use
  - [ ] Max 3 connections per user
- **Оценка:** 8h
- **Story:** [STORY-141]

**[TASK-0539] QA тесты мобильного дашборда**
- **Тип:** QA
- **Описание:** (1) Загрузка 8 KPI < 2 сек на throttled 4G. (2) WebSocket: новый лид → Leads Today обновляется < 5 сек. (3) WS disconnect → reconnect → данные синхронизированы. (4) Pull-to-refresh → данные обновлены. (5) Dark theme toggle → все элементы читаемы. (6) iPhone SE (320px) → 1 колонка, контент не обрезан. (7) iPhone Pro Max (428px) → 2 колонки. (8) Offline → cached data + banner.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Тест на 3 разных устройствах (BrowserStack)
  - [ ] Performance profiling: no jank при scroll (60 FPS)
- **Оценка:** 8h
- **Story:** [STORY-141]

---

#### [STORY-142] Push-уведомления (Cap Alerts, FTD, Broker Down)
**Как** Affiliate Manager, **я хочу** получать push-уведомления о критических событиях (cap исчерпан, новый FTD, брокер недоступен), **чтобы** немедленно реагировать на важные изменения.
**Acceptance Criteria:**
- [ ] AC1: Push notifications через Web Push API (VAPID keys). Поддержка: Chrome Android, Safari iOS 16.4+, Chrome Desktop. Запрос разрешения при первом входе с объяснением ценности
- [ ] AC2: Типы уведомлений (настраиваемые per user): `cap_alert` (cap usage >= 80%, >= 95%, exhausted), `ftd_received` (новый FTD от брокера), `broker_down` (брокер не отвечает > 5 мин), `daily_summary` (сводка за день в 18:00 по timezone пользователя), `revenue_milestone` (revenue достиг X за день). Каждый тип можно включить/выключить
- [ ] AC3: Delivery rate >= 95%. Уведомление доставляется < 10 сек после события. При недоставке → retry 1 раз через 30 сек
- [ ] AC4: Notification payload: title (событие), body (детали), icon (тип события), click action (deep link на страницу). Badge count обновляется
- [ ] AC5: Quiet hours: пользователь настраивает время, когда уведомления не отправляются (напр., 22:00-08:00). Уведомления за quiet hours доставляются после окончания quiet period
- [ ] AC6: Максимум 50 уведомлений/час per user (throttle). При превышении → группировка: "15 new FTDs in the last hour"
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-15]
**Зависит от:** [STORY-140]

##### Tasks для STORY-142:
**[TASK-0540] Реализовать backend push notification service**
- **Тип:** Backend
- **Описание:** Сервис PushNotifier. (1) Таблица `push_subscriptions`: id, user_id, endpoint, keys_p256dh, keys_auth, user_agent, created_at, last_used_at. (2) Таблица `notification_preferences`: user_id (PK), prefs (JSONB: {cap_alert: bool, ftd_received: bool, broker_down: bool, daily_summary: bool, revenue_milestone: bool}), quiet_hours_start (time), quiet_hours_end (time), timezone. (3) Таблица `notification_log`: id, user_id, type, title, body, status (sent/delivered/failed/queued), sent_at, delivered_at. (4) Web Push через web-push library (VAPID). (5) Event listeners: на cap change → check threshold → push. На postback FTD → push. На broker health check fail → push. (6) Throttle: Redis counter per user per hour, max 50. При превышении → batch в одно уведомление. (7) Quiet hours: check timezone + window → queue if in quiet period.
- **Критерии готовности (DoD):**
  - [ ] Push доставляется на Chrome Android и Safari iOS
  - [ ] 5 типов уведомлений генерируются корректно
  - [ ] Throttle 50/час работает с группировкой
  - [ ] Quiet hours: уведомления queued и доставлены после
  - [ ] Retry 1 раз при failure
  - [ ] Notification log записывается
- **Оценка:** 16h
- **Story:** [STORY-142]

**[TASK-0541] Реализовать Frontend — notification preferences и display**
- **Тип:** Frontend
- **Описание:** (1) Permission request: при первом визите → modal с объяснением ("Get instant alerts about caps, FTDs and broker issues") + кнопка "Enable Notifications". (2) Settings > Notifications: toggles для каждого типа, quiet hours picker (2 time inputs + timezone). (3) In-app notification center (bell icon → dropdown): список последних 50 уведомлений, unread count badge, mark as read. (4) Push click → deep link: cap_alert → Caps page, ftd → Leads page с фильтром, broker_down → Broker status page.
- **Критерии готовности (DoD):**
  - [ ] Permission request flow корректный
  - [ ] Settings toggles сохраняются
  - [ ] Notification center с bell icon и badge
  - [ ] Deep links работают из push и in-app
  - [ ] Quiet hours picker с timezone
- **Оценка:** 8h
- **Story:** [STORY-142]

**[TASK-0542] QA тесты push-уведомлений**
- **Тип:** QA
- **Описание:** (1) Enable → cap exhausted → push received < 10 сек. (2) Disable cap_alert → cap exhausted → no push. (3) Quiet hours 22-08 → event at 23:00 → push at 08:00. (4) Throttle: 51 events → 50th push + 1 batched. (5) Click notification → deep link correct page. (6) iOS Safari 16.4 → push works. (7) Chrome Android → push works. (8) Offline → push queued → online → delivered. (9) Multiple devices → push to all subscribed.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Tested on iOS real device и Android real device
  - [ ] Delivery rate measurement setup (track sent vs delivered)
- **Оценка:** 8h
- **Story:** [STORY-142]

---

#### [STORY-143] Быстрое управление капами с мобильного
**Как** Network Admin, **я хочу** увеличивать, уменьшать или ставить на паузу капы брокеров прямо с телефона, **чтобы** быстро реагировать на изменения без доступа к компьютеру.
**Acceptance Criteria:**
- [ ] AC1: Страница Caps (мобильная): список брокеров с текущим cap status (progress bar: used/total, процент, цвет: зелёный < 70%, жёлтый 70-90%, красный > 90%). Сортировка по cap usage DESC (критичные сверху)
- [ ] AC2: Quick actions (swipe или tap): (1) +10 / +50 / +100 / custom increase. (2) -10 / -50 / custom decrease. (3) Pause (моментальная остановка приёма лидов). (4) Resume. Действие выполняется в 1-2 тапа
- [ ] AC3: Confirmation: для Pause → "Pause [Broker Name]? No new leads will be sent." Для decrease ниже current usage → "Cap will be below current usage. X leads already sent." Для increase — без подтверждения (безопасное действие)
- [ ] AC4: API response < 500ms (p95). Оптимистичное обновление UI (показать новый cap сразу, откатить при ошибке)
- [ ] AC5: Offline queue: cap changes ставятся в очередь и применяются при восстановлении связи. Показывать pending badge на изменённом broкере
- [ ] AC6: Audit log: каждое изменение капа с мобильного помечается source=mobile в audit trail
**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-15]
**Зависит от:** [STORY-140], [STORY-141]

##### Tasks для STORY-143:
**[TASK-0543] Реализовать мобильный UI управления капами**
- **Тип:** Frontend
- **Описание:** (1) Страница MobileCaps: list view с карточками брокеров. Каждая карточка: broker name, cap progress bar (цветовое кодирование), "45/100 (45%)", status badge (Active/Paused). (2) Tap на карточку → expand: quick action buttons (+10, +50, +100, Custom, -10, -50, Custom, Pause/Resume). (3) Custom: number input с numpad. (4) Swipe right → quick +50. Swipe left → Pause. (5) Confirmation dialog для Pause и decrease below usage. (6) Optimistic update: UI обновляется сразу, spinner на кнопке, rollback при ошибке с toast. (7) Pending badge для offline queued changes.
- **Критерии готовности (DoD):**
  - [ ] List view с progress bars отображается
  - [ ] Quick actions работают в 1-2 тапа
  - [ ] Swipe gestures работают
  - [ ] Confirmation для Pause/dangerous decrease
  - [ ] Optimistic update + rollback
  - [ ] Pending badge для offline queue
- **Оценка:** 8h
- **Story:** [STORY-143]

**[TASK-0544] Backend: аудит cap changes с мобильного**
- **Тип:** Backend
- **Описание:** Модифицировать API `PUT /api/v1/brokers/{id}/caps`: добавить optional field `source` (web/mobile/api, default web). Mobile client передаёт source=mobile. Audit log таблица фиксирует source. API latency для cap change < 500ms (p95) — оптимизировать: прямой UPDATE без лишних JOIN, кэшировать broker lookup.
- **Критерии готовности (DoD):**
  - [ ] Source field записывается в audit log
  - [ ] API < 500ms для cap change
  - [ ] Валидация: decrease below 0 → 422
  - [ ] Pause/Resume toggle корректно блокирует/разблокирует роутинг
- **Оценка:** 4h
- **Story:** [STORY-143]

**[TASK-0545] QA тесты мобильного cap management**
- **Тип:** QA
- **Описание:** (1) +10 → cap увеличен, progress bar обновлён. (2) -50 ниже usage → confirmation dialog. (3) Pause → broker paused, leads не отправляются. (4) Resume → broker active. (5) Swipe right → +50. (6) Swipe left → Pause confirmation. (7) Offline: cap change → pending badge → online → applied. (8) Audit: source=mobile записан. (9) API < 500ms на throttled 4G. (10) Concurrent: два пользователя меняют cap → last write wins, оба видят актуальное значение.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Тест на touch devices (не симулятор)
  - [ ] Conflict resolution проверен
- **Оценка:** 8h
- **Story:** [STORY-143]

---

#### [STORY-144] Мобильный список лидов с swipe-действиями
**Как** Media Buyer, **я хочу** просматривать список лидов на телефоне с быстрыми swipe-действиями, **чтобы** отслеживать статусы отправленных лидов в реальном времени.
**Acceptance Criteria:**
- [ ] AC1: List view лидов: карточка лида (name, email masked: j***@gmail.com, phone masked: +7***1234, country flag, broker name, status badge, time ago). Виртуализированный список (react-window) для 10,000+ лидов
- [ ] AC2: Фильтры (collapsible top bar): status (multi-select), broker (multi-select), date range (today/yesterday/last7d/custom), search (по email/phone/name, debounce 300ms)
- [ ] AC3: Swipe right → показать детали лида (expand card: full info, status history timeline, postback data). Swipe left → quick actions: Resend (повторная отправка), Flag (пометить как подозрительный)
- [ ] AC4: Infinite scroll: загрузка по 20 лидов, next page при scroll к концу. Общее время загрузки первой страницы < 1 сек (p95)
- [ ] AC5: Status badge цвета: New (серый), Sent (синий), Callback (жёлтый), FTD (зелёный), Rejected (красный), Duplicate (оранжевый)
- [ ] AC6: PII masking: email и phone маскируются на мобильном по умолчанию. Tap для reveal (с подтверждением если роль не admin)
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-15]
**Зависит от:** [STORY-140], [STORY-141]

##### Tasks для STORY-144:
**[TASK-0546] Реализовать мобильный lead list view**
- **Тип:** Frontend
- **Описание:** (1) MobileLeadList: react-window FixedSizeList с height auto. Item renderer: LeadCard (name, masked email/phone, country flag emoji, broker chip, status badge, "2h ago" time). (2) Filters bar: collapsible (chevron toggle), status chips, broker dropdown, date presets + custom, search input. (3) Infinite scroll: IntersectionObserver на last item → fetch next page. (4) Loading: skeleton cards (5 items). Empty state: "No leads matching filters". (5) PII masking: email j***@gmail.com, phone +7***1234. Tap → if admin: reveal. If non-admin: confirmation modal → reveal for 10 sec → re-mask.
- **Критерии готовности (DoD):**
  - [ ] Виртуализированный список скроллится плавно (10K items)
  - [ ] Фильтры работают и комбинируются
  - [ ] Infinite scroll загружает следующие 20
  - [ ] PII masking с reveal flow
  - [ ] Status badges с правильными цветами
- **Оценка:** 8h
- **Story:** [STORY-144]

**[TASK-0547] Реализовать swipe actions для lead cards**
- **Тип:** Frontend
- **Описание:** Использовать react-swipeable или framer-motion для gesture handling. (1) Swipe right (> 50px): expand card — показать full details inline (status timeline, postback data, broker response). Повторный swipe или tap → collapse. (2) Swipe left (> 50px): action panel (красный фон) — Resend button (API call PUT /api/v1/leads/{id}/resend) и Flag button (API call POST /api/v1/leads/{id}/flag). (3) Haptic feedback (navigator.vibrate) при swipe threshold. (4) Animation: spring physics для bounce-back.
- **Критерии готовности (DoD):**
  - [ ] Swipe right → expand с деталями
  - [ ] Swipe left → action buttons
  - [ ] Resend и Flag API calls работают
  - [ ] Haptic feedback на supported devices
  - [ ] Smooth animations (60 FPS)
- **Оценка:** 8h
- **Story:** [STORY-144]

**[TASK-0548] QA тесты мобильного lead list**
- **Тип:** QA
- **Описание:** (1) Загрузка 20 лидов < 1 сек. (2) Scroll до 100-го лида → infinite scroll загружает страницы. (3) Filter по status=FTD → только FTD лиды. (4) Search по email → находит. (5) Swipe right → details. (6) Swipe left → Resend → лид переотправлен. (7) PII: non-admin tap reveal → confirmation → reveal 10 sec → re-mask. (8) 10K лидов → no jank при scroll.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Performance: scroll 10K items at 60 FPS (Chrome Performance tab)
  - [ ] Touch test on real devices
- **Оценка:** 4h
- **Story:** [STORY-144]

---

#### [STORY-145] Биометрическая аутентификация (FaceID / TouchID)
**Как** Network Admin, **я хочу** входить в мобильное приложение через FaceID/TouchID, **чтобы** обеспечить быстрый и безопасный доступ без ввода пароля.
**Acceptance Criteria:**
- [ ] AC1: Web Authentication API (WebAuthn) для биометрической аутентификации. Поддержка: FaceID (iOS 14+), TouchID (iOS/macOS), Fingerprint (Android). Регистрация biometric credential привязывается к текущему аккаунту
- [ ] AC2: Setup flow: Settings > Security > "Enable Biometric Login" → WebAuthn registration ceremony → credential сохраняется на сервере. Максимум 5 credentials per user (разные устройства)
- [ ] AC3: Login flow: при открытии PWA → если biometric enabled → prompt FaceID/TouchID → WebAuthn assertion → JWT token. Fallback: кнопка "Use password instead". Timeout биометрического prompt: 30 сек → fallback
- [ ] AC4: Session lock: после 5 мин неактивности → lock screen с biometric prompt (или password). JWT token не expiry'd — lock только UI-уровень для дополнительной безопасности
- [ ] AC5: Revoke: пользователь может удалить credentials из Settings. Admin может сбросить все credentials пользователя
- [ ] AC6: Security: credential private key хранится в Secure Enclave устройства (не на сервере). Challenge nonce одноразовый (replay protection). Audit log для biometric auth events
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-15]
**Зависит от:** [STORY-140]

##### Tasks для STORY-145:
**[TASK-0549] Реализовать backend WebAuthn (FIDO2)**
- **Тип:** Backend
- **Описание:** Использовать go-webauthn/webauthn library. (1) Таблица `webauthn_credentials`: id, user_id, credential_id (bytes), public_key (bytes), attestation_type, transport, aaguid, sign_count, created_at, last_used_at, device_name (varchar 100). (2) Registration endpoints: POST `/api/v1/auth/webauthn/register/begin` → PublicKeyCredentialCreationOptions. POST `/api/v1/auth/webauthn/register/complete` → verify attestation, save credential. (3) Authentication endpoints: POST `/api/v1/auth/webauthn/login/begin` → PublicKeyCredentialRequestOptions (challenge, allowCredentials). POST `/api/v1/auth/webauthn/login/complete` → verify assertion, return JWT. (4) Challenge store: Redis с TTL 60 сек. (5) Max 5 credentials per user. (6) Audit log для register/login/revoke events.
- **Критерии готовности (DoD):**
  - [ ] Registration ceremony работает (begin + complete)
  - [ ] Authentication ceremony работает
  - [ ] Challenge nonce одноразовый (replay → 401)
  - [ ] Max 5 credentials per user
  - [ ] Audit log для всех biometric events
  - [ ] sign_count проверяется (cloned authenticator detection)
- **Оценка:** 8h
- **Story:** [STORY-145]

**[TASK-0550] Реализовать Frontend биометрического login**
- **Тип:** Frontend
- **Описание:** (1) Setup: Settings > Security > "Biometric Login" section. Button "Register this device" → navigator.credentials.create() → send to /register/complete. Device list: показать зарегистрированные устройства (device_name, last_used, revoke button). (2) Login: при открытии PWA, если credential exists → navigator.credentials.get() → send to /login/complete → set JWT. Fallback link: "Use password instead". (3) Lock screen: после 5 мин idle → overlay с biometric prompt + password fallback. (4) Error states: biometric unavailable → show password form. User cancelled → show password form. Device not registered → show setup prompt.
- **Критерии готовности (DoD):**
  - [ ] Registration flow на iOS FaceID и Android Fingerprint
  - [ ] Login через biometric → JWT → dashboard
  - [ ] Lock screen после 5 мин idle
  - [ ] Fallback на password во всех error cases
  - [ ] Device list с revoke
- **Оценка:** 8h
- **Story:** [STORY-145]

**[TASK-0551] QA тесты биометрической аутентификации**
- **Тип:** QA
- **Описание:** (1) Register FaceID → credential saved. (2) Login FaceID → JWT issued. (3) Replay challenge → 401. (4) 6th credential → 422. (5) Revoke credential → login fails → password fallback. (6) 5 min idle → lock screen → biometric → unlock. (7) Cancel biometric → password form. (8) Admin revoke → user credentials cleared. (9) Different device → separate credential.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Tested on real iOS device (FaceID) и Android (Fingerprint)
  - [ ] Security audit: no credential leakage
- **Оценка:** 8h
- **Story:** [STORY-145]

---

#### [STORY-146] Мобильные графики и визуализации
**Как** Team Lead, **я хочу** видеть аналитические графики, оптимизированные для мобильного экрана, **чтобы** анализировать тренды на ходу.
**Acceptance Criteria:**
- [ ] AC1: Мобильные версии графиков: Line chart (leads/FTD/revenue по дням), Bar chart (top affiliates/brokers), Pie chart (traffic by GEO). Использовать recharts с responsive container. Минимальная высота графика: 200px
- [ ] AC2: Touch interactions: pinch-to-zoom на line charts (до 4x), pan (scroll горизонтально по timeline), tap на data point → tooltip с деталями. Double-tap → reset zoom
- [ ] AC3: Chart selector: horizontal scroll tabs (Overview, Leads, Conversions, Revenue, GEO). Каждый tab — свой набор графиков
- [ ] AC4: Date range presets: sticky bar с кнопками Today / 7D / 30D / 90D / Custom. Смена range → graphs reload < 1.5 сек
- [ ] AC5: Landscape mode: при повороте устройства → график занимает full screen (immersive). Кнопка exit full screen
- [ ] AC6: Chart data загружается incremental: skeleton → axis → data points. Анимация появления данных (300ms ease-out)
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-15]
**Зависит от:** [STORY-141]

##### Tasks для STORY-146:
**[TASK-0552] Реализовать мобильные chart компоненты**
- **Тип:** Frontend
- **Описание:** (1) MobileLineChart: recharts ResponsiveContainer, height 200-300px. Custom tooltip (card style, tap-activated). X-axis: dates (auto-format: HH:mm for today, MMM DD for > 1 day, MMM for > 90 days). Y-axis: auto-scale with abbreviated numbers (1K, 1.2M). (2) MobileBarChart: horizontal bars for top-10 lists. (3) MobilePieChart: donut chart with center label (total). (4) Tab bar: horizontal scroll, active tab indicator. (5) Date range: sticky top bar с preset buttons + custom date picker. (6) Landscape detection: window.matchMedia('(orientation: landscape)') → fullscreen chart mode.
- **Критерии готовности (DoD):**
  - [ ] 3 типа графиков рендерятся на мобильном
  - [ ] Touch: pinch-to-zoom на line charts
  - [ ] Tabs и date range работают
  - [ ] Landscape → fullscreen
  - [ ] Skeleton → axis → data animation
- **Оценка:** 16h
- **Story:** [STORY-146]

**[TASK-0553] QA тесты мобильных графиков**
- **Тип:** QA
- **Описание:** (1) Line chart с 30 data points → отображается корректно. (2) Pinch-to-zoom → zoom in/out. (3) Tap data point → tooltip. (4) Tab switch → correct chart. (5) Date range 7D → 30D → data reloads < 1.5 сек. (6) Landscape → fullscreen. (7) Abbreviated numbers: 1500 → 1.5K. (8) Empty data → "No data for this period" message.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Performance: chart render < 500ms
  - [ ] Touch interactions on real devices
- **Оценка:** 4h
- **Story:** [STORY-146]

---

#### [STORY-147] Мобильная навигация и app shell
**Как** Media Buyer, **я хочу** удобную мобильную навигацию с bottom tab bar и быстрым переключением между разделами, **чтобы** эффективно работать с CRM на телефоне.
**Acceptance Criteria:**
- [ ] AC1: Bottom tab bar (fixed, 5 tabs): Dashboard, Leads, Caps, Charts, Settings. Активный tab: filled icon + label. Неактивный: outline icon. Badge count на Dashboard (unread notifications) и Leads (new leads today)
- [ ] AC2: Page transitions: slide animation (250ms ease-out). Back gesture (swipe from left edge → previous page). Кнопка Back в header для drill-down pages
- [ ] AC3: App shell загружается из cache < 500ms. Content рендерится < 1 сек (skeleton → data). Total TTI < 2 сек на 4G
- [ ] AC4: Status bar: время, signal, battery видны (safe area insets). Notch/Dynamic Island compatible (env(safe-area-inset-*))
- [ ] AC5: Gesture conflicts resolved: horizontal swipe для lead cards не конфликтует с page back gesture (threshold 20px from edge для back)
- [ ] AC6: Accessibility: минимальный touch target 44x44px (WCAG). VoiceOver/TalkBack labels на всех элементах навигации. Contrast ratio >= 4.5:1
**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-15]
**Зависит от:** [STORY-140]

##### Tasks для STORY-147:
**[TASK-0554] Реализовать mobile app shell и navigation**
- **Тип:** Frontend
- **Описание:** (1) AppShell layout: header (logo, notification bell, profile avatar), content area (page router), bottom tab bar. (2) BottomTabBar: 5 tabs, framer-motion для active indicator animation. Badge: react-spring для count animation. (3) Router: React Router с page transitions (AnimatePresence). Slide-left for forward, slide-right for back. (4) Safe area: CSS env(safe-area-inset-*) для notch/Dynamic Island. (5) Back gesture: custom touch handler, 20px from left edge threshold, 100px swipe distance to trigger. (6) Accessibility: aria-labels, role="navigation", min touch 44x44.
- **Критерии готовности (DoD):**
  - [ ] Bottom tabs с animations и badges
  - [ ] Page transitions (slide)
  - [ ] Back gesture работает, не конфликтует с swipe actions
  - [ ] Safe area для notch devices
  - [ ] Accessibility: VoiceOver navigation работает
  - [ ] TTI < 2 сек
- **Оценка:** 8h
- **Story:** [STORY-147]

**[TASK-0555] QA тесты мобильной навигации**
- **Тип:** QA
- **Описание:** (1) Tab switch → правильная страница с animation. (2) Badge count обновляется при новых данных. (3) Back gesture → previous page. (4) Back gesture near lead card → no conflict (only from edge). (5) Notch device (iPhone 14 Pro) → content not obscured. (6) VoiceOver: все tabs озвучиваются. (7) Touch target < 44px → найти и исправить. (8) TTI < 2 сек на 4G throttled.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Accessibility audit (Lighthouse a11y >= 90)
  - [ ] Tested on notch и non-notch devices
- **Оценка:** 4h
- **Story:** [STORY-147]

---

## [EPIC-16] Integration Marketplace
**Цель:** Создать публичный маркетплейс шаблонов интеграций с брокерами, где пользователи могут находить, устанавливать и публиковать готовые connector-ы. Это ускоряет onboarding новых брокеров с нескольких часов до нескольких минут и создаёт community-эффект (пользователи помогают друг другу, создавая шаблоны). Ни у одного конкурента нет marketplace.
**Метрика успеха:**
- 80% новых подключений брокеров используют marketplace-шаблон (а не ручную настройку)
- Среднее время подключения нового брокера через шаблон < 5 минут (vs 2-4 часа вручную)
- 30+ шаблонов от community за первые 6 месяцев
- Средний рейтинг community-шаблонов >= 4.0/5.0
- Install success rate >= 95% (шаблон устанавливается без ошибок)
**Приоритет:** P2 (Growth)
**Зависит от:** [EPIC-03]
**Оценка:** L

### Stories:

---

#### [STORY-148] Marketplace UI (поиск, фильтрация, каталог)
**Как** Network Admin, **я хочу** просматривать каталог шаблонов интеграций с поиском и фильтрацией по стране, вертикали и типу, **чтобы** быстро найти подходящий шаблон для нужного брокера.
**Acceptance Criteria:**
- [ ] AC1: Страница Marketplace: grid карточек шаблонов (name, broker logo, description truncated 100 chars, rating stars, install count, author, supported GEOs flags, category badge). Пагинация: 24 карточки per page, infinite scroll
- [ ] AC2: Поиск: full-text search по name, description, broker name, tags. Debounce 300ms. Результаты подсвечивают совпадения. Пустой результат → "No templates found. Try different keywords or [submit a request]"
- [ ] AC3: Фильтры (sidebar на desktop, bottom sheet на mobile): Country/GEO (multi-select с флагами, до 20), Vertical (crypto/forex/binary/sports), Type (CRM push/pull, postback, API), Category (tier1_broker, tier2_broker, payment_system, tracker), Rating (>= 3, >= 4 stars), Sort (popular/newest/highest_rated/most_installed)
- [ ] AC4: Загрузка страницы каталога < 1.5 сек (p95). Search results < 500ms
- [ ] AC5: "Official" badge для шаблонов созданных командой GambChamp. "Verified" badge для community шаблонов прошедших review
- [ ] AC6: SEO: каждый шаблон имеет уникальный URL (/marketplace/templates/{slug}), meta tags для Google indexing
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-16]
**Зависит от:** —

##### Tasks для STORY-148:
**[TASK-0556] Спроектировать схему БД для marketplace**
- **Тип:** Backend
- **Описание:** Таблица `marketplace_templates`: id (UUID), slug (varchar 200, unique), name (varchar 200), description (text), long_description (text, markdown), author_id (FK users, nullable for official), author_type (enum: official, community), broker_name (varchar 200), broker_logo_url (varchar 500), category (enum: tier1_broker, tier2_broker, payment_system, tracker), vertical (enum: crypto, forex, binary, sports, multi), type (enum: crm_push, crm_pull, postback, api), supported_geos (text[] — ISO 3166 codes), tags (text[]), config_template (JSONB — field mapping, endpoints, auth template), version (varchar 20, semver), install_count (int, default 0), avg_rating (decimal 2,1), review_count (int), status (enum: draft, pending_review, published, deprecated), is_verified (bool), is_deleted (bool), created_at, updated_at, published_at. Индексы: GIN на tags, GIN на supported_geos, full-text index на (name, description, broker_name, tags).
- **Критерии готовности (DoD):**
  - [ ] Миграция up/down работает
  - [ ] Full-text search index создан (tsvector)
  - [ ] GIN indexes для array columns
  - [ ] Slug unique constraint
  - [ ] Seed 10-15 official templates
- **Оценка:** 4h
- **Story:** [STORY-148]

**[TASK-0557] Реализовать Marketplace API (поиск и каталог)**
- **Тип:** Backend
- **Описание:** (1) GET `/api/v1/marketplace/templates` — список с пагинацией (cursor), фильтрами (geo, vertical, type, category, min_rating), сортировкой (popular, newest, highest_rated, most_installed), full-text search (query param `q`). (2) GET `/api/v1/marketplace/templates/{slug}` — детальная информация. (3) Search: PostgreSQL ts_rank для ранжирования. (4) Public endpoints (без auth) для SEO. Authenticated endpoints показывают is_installed для текущей company. Rate limit: 100 req/min для public, 300 для authenticated.
- **Критерии готовности (DoD):**
  - [ ] Каталог с фильтрами и сортировкой работает
  - [ ] Full-text search < 500ms
  - [ ] Public access без auth для SEO
  - [ ] Rate limiting
  - [ ] is_installed flag для authenticated users
- **Оценка:** 8h
- **Story:** [STORY-148]

**[TASK-0558] Реализовать Frontend — Marketplace каталог**
- **Тип:** Frontend
- **Описание:** (1) MarketplacePage: grid layout (3 колонки desktop, 2 tablet, 1 mobile). (2) TemplateCard: broker logo, name, description (2 lines truncated), rating stars (SVG), install count, author badge (Official/Verified/Community), GEO flags (top 5 + "+X more"). (3) Search bar: magnifying glass icon, debounced input, highlight matches. (4) Filters sidebar: collapsible sections (GEO, Vertical, Type, Category, Rating). Applied filters → chips above grid. (5) Sort dropdown. (6) Infinite scroll с skeleton loading. (7) SEO: Next.js SSR или prerender для template pages.
- **Критерии готовности (DoD):**
  - [ ] Grid layout responsive (1-3 колонки)
  - [ ] Search с подсветкой результатов
  - [ ] Фильтры комбинируются корректно
  - [ ] Infinite scroll с skeleton
  - [ ] Official/Verified badges отображаются
- **Оценка:** 16h
- **Story:** [STORY-148]

**[TASK-0559] QA тесты Marketplace каталога**
- **Тип:** QA
- **Описание:** (1) Каталог загружается < 1.5 сек. (2) Search "binance" → шаблоны Binance. (3) Filter geo=US → только US templates. (4) Filter vertical=crypto + type=api → intersection. (5) Sort by popular → highest install_count first. (6) Empty search → "No templates found". (7) Official badge → correct templates. (8) Infinite scroll → next page loads. (9) SEO: template page has meta tags.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Cross-browser: Chrome, Safari, Firefox
  - [ ] Mobile responsive проверен
- **Оценка:** 4h
- **Story:** [STORY-148]

---

#### [STORY-149] Детальная страница шаблона
**Как** Network Admin, **я хочу** видеть полную информацию о шаблоне (описание, field mapping, отзывы, install count), **чтобы** принять решение об установке.
**Acceptance Criteria:**
- [ ] AC1: Страница шаблона: header (name, broker logo, author, rating, install count, "Install" button), tabs (Overview, Field Mapping, Reviews, Changelog). Overview: markdown description, screenshots (до 5), supported GEOs (full list с флагами), requirements/prerequisites
- [ ] AC2: Field Mapping tab: таблица (Source Field → Target Field, Type, Required, Default Value). Визуальная схема маппинга (source → target arrows)
- [ ] AC3: Reviews tab: список отзывов (user avatar, name, rating stars, date, text). Средний рейтинг + distribution bar (5★: 70%, 4★: 20%, etc.). Pagination по 10 отзывов
- [ ] AC4: Changelog tab: версионная история (version number, date, changes list). Шаблоны с новой версией показывают "Update available" badge
- [ ] AC5: "Install" button: если не установлен → зелёная кнопка "Install". Если установлен → серая "Installed ✓" + "Uninstall". Если есть update → "Update to v2.1"
- [ ] AC6: Related templates: sidebar с 4 похожими шаблонами (same broker, same GEO, same category)
**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-16]
**Зависит от:** [STORY-148]

##### Tasks для STORY-149:
**[TASK-0560] Реализовать backend для template details и reviews**
- **Тип:** Backend
- **Описание:** (1) GET `/api/v1/marketplace/templates/{slug}` — full details (long_description, screenshots[], field_mapping, requirements, changelog[]). (2) GET `/api/v1/marketplace/templates/{slug}/reviews` — paginated reviews. (3) POST `/api/v1/marketplace/templates/{slug}/reviews` — create review (rating 1-5, text max 1000 chars). One review per user per template. (4) Related templates: SQL query same category OR same broker_name, exclude current, ORDER BY install_count DESC LIMIT 4. (5) install_count: increment on install, decrement on uninstall (atomic counter).
- **Критерии готовности (DoD):**
  - [ ] Detail endpoint возвращает full data
  - [ ] Reviews CRUD (create, list, delete own)
  - [ ] One review per user validation
  - [ ] Related templates algorithm корректен
  - [ ] Atomic install_count increment/decrement
- **Оценка:** 8h
- **Story:** [STORY-149]

**[TASK-0561] Реализовать Frontend — template detail page**
- **Тип:** Frontend
- **Описание:** (1) Header: broker logo (64px), template name (h1), author badge, rating (stars + number), install count, Install/Installed/Update button. (2) Tabs: Overview (markdown renderer, image gallery lightbox), Field Mapping (table + visual arrows diagram), Reviews (list + write review form), Changelog (timeline). (3) Install button states: Install (green) / Installed (grey + checkmark) / Update (blue). (4) Related templates: sidebar cards (4 items). (5) Breadcrumbs: Marketplace > Category > Template Name.
- **Критерии готовности (DoD):**
  - [ ] Все tabs рендерятся с данными
  - [ ] Markdown description рендерится (sanitized HTML)
  - [ ] Image gallery с lightbox
  - [ ] Review form с rating stars picker
  - [ ] Install button states корректны
- **Оценка:** 8h
- **Story:** [STORY-149]

**[TASK-0562] QA тесты detail page**
- **Тип:** QA
- **Описание:** (1) Overview tab → markdown рендерится. (2) Field Mapping → таблица корректна. (3) Submit review → appears in list. (4) Second review → 422. (5) Changelog → versions listed. (6) Install button → green before, grey after install. (7) Related templates → 4 items, не включает current. (8) XSS в markdown → sanitized.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Security: XSS через markdown description проверен
- **Оценка:** 4h
- **Story:** [STORY-149]

---

#### [STORY-150] Установка шаблона в один клик
**Как** Network Admin, **я хочу** установить шаблон интеграции одним кликом, **чтобы** подключить нового брокера за минуты вместо часов.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/marketplace/templates/{slug}/install` — создаёт broker integration на основе template config. Копирует: field mapping, endpoints, auth template, default settings. Возвращает `integration_id` созданной интеграции
- [ ] AC2: Installation wizard (3 шага): Step 1: Review — показать что будет создано (endpoints, fields). Step 2: Configure — заполнить переменные (API key, base URL, credentials). Step 3: Test — тестовый запрос к брокеру → success/fail
- [ ] AC3: Install < 30 сек (от клика до рабочей интеграции, без учёта ввода credentials). Тестовый запрос < 10 сек
- [ ] AC4: Rollback: если тест провалился → кнопка "Undo Installation" удаляет созданную интеграцию. Если пользователь закрыл wizard на шаге 2 → partial install удаляется автоматически (cleanup job через 1 час)
- [ ] AC5: Таблица `marketplace_installations`: id, company_id, template_id, template_version, integration_id (FK), installed_by, installed_at, status (active/uninstalled), uninstalled_at. Для analytics: какие шаблоны самые популярные
- [ ] AC6: Uninstall: удаляет связанную интеграцию (soft delete), декрементирует install_count. Confirmation: "This will deactivate the broker integration. Active leads will stop being sent."
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-16]
**Зависит от:** [STORY-148], [STORY-149]

##### Tasks для STORY-150:
**[TASK-0563] Реализовать backend installation engine**
- **Тип:** Backend
- **Описание:** (1) POST `/api/v1/marketplace/templates/{slug}/install` — transaction: create broker_integration from template config (deep copy field_mapping, endpoints), create marketplace_installation record, increment install_count. (2) POST `/api/v1/marketplace/installations/{id}/test` — выполнить тестовый запрос к брокеру с dummy data (или ping endpoint). Return success/fail + response details. (3) DELETE `/api/v1/marketplace/installations/{id}` — uninstall: soft-delete integration, decrement install_count, set status=uninstalled. (4) Cleanup job: каждый час удалять installations без завершённого wizard (status=pending, created > 1h ago). (5) Variables в template config: {{API_KEY}}, {{BASE_URL}} — заменяются на user input.
- **Критерии готовности (DoD):**
  - [ ] Install создаёт рабочую интеграцию
  - [ ] Test endpoint отправляет запрос и возвращает результат
  - [ ] Uninstall корректно деактивирует
  - [ ] Cleanup job удаляет partial installs
  - [ ] Template variables подставляются
  - [ ] install_count atomic increment/decrement
- **Оценка:** 16h
- **Story:** [STORY-150]

**[TASK-0564] Реализовать Frontend — installation wizard**
- **Тип:** Frontend
- **Описание:** (1) Step 1 Review: read-only preview (endpoints list, field mapping table, settings). Кнопка "Continue". (2) Step 2 Configure: dynamic form generated from template variables. Fields: text inputs for API_KEY/BASE_URL, select for auth_type, password field for secrets (masked). Validation: required fields, URL format for BASE_URL. (3) Step 3 Test: "Run Test" button → loading spinner → success (green checkmark + response preview) / fail (red X + error details + "Retry" button). (4) Navigation: step indicator (1-2-3), Back/Continue buttons. (5) Success: "Installation complete! Start sending leads to [Broker]" + link to integration settings. (6) Undo: if test fails → "Undo Installation" button.
- **Критерии готовности (DoD):**
  - [ ] 3-step wizard работает end-to-end
  - [ ] Dynamic form из template variables
  - [ ] Test: success и fail states
  - [ ] Undo installation при провале теста
  - [ ] Step indicator и навигация
- **Оценка:** 8h
- **Story:** [STORY-150]

**[TASK-0565] QA тесты one-click installation**
- **Тип:** QA
- **Описание:** (1) Install → integration создана с correct mapping. (2) Test → success → integration active. (3) Test → fail → Undo → integration deleted. (4) Close wizard on step 2 → cleanup через 1 час. (5) Uninstall → integration deactivated, leads stop. (6) Re-install after uninstall → новая integration. (7) Install count: +1 after install, -1 after uninstall. (8) Invalid API_KEY → test fail с readable error.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] End-to-end: install → send test lead → verify at broker
  - [ ] Cleanup job verified
- **Оценка:** 8h
- **Story:** [STORY-150]

---

#### [STORY-151] Community submissions (публикация шаблонов пользователями)
**Как** Developer, **я хочу** опубликовать свой шаблон интеграции в marketplace, **чтобы** помочь другим пользователям и получить признание community.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/marketplace/templates/submit` — submit шаблон: name, description, long_description (markdown, max 10000 chars), broker_name, category, vertical, type, supported_geos[], field_mapping (JSONB), config_template (JSONB с variables), tags[], screenshots (до 5, upload to S3, max 2MB each). Status → pending_review
- [ ] AC2: Review flow: submitted → pending_review → (approved → published) | (rejected → author notified с причиной). Review выполняет GambChamp team (admin panel). SLA: review < 48 часов
- [ ] AC3: Author dashboard: "My Templates" page — список submitted templates с статусами (draft, pending, published, rejected). Edit draft. View stats (installs, rating, reviews) для published
- [ ] AC4: Guidelines: страница с правилами публикации (naming, description quality, testing requirements). Auto-validation при submit: name unique, description > 50 chars, field_mapping non-empty, at least 1 GEO
- [ ] AC5: Версионирование: author может submit new version. Existing installations получают "Update available" notification. Update не ломает existing installations (backward compatible field mapping)
- [ ] AC6: Security: submitted config_template проходит sanitization (no script injection, no external URLs кроме broker endpoints). Code review для JSONB config
**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-16]
**Зависит от:** [STORY-148], [STORY-150]

##### Tasks для STORY-151:
**[TASK-0566] Реализовать backend для community submissions**
- **Тип:** Backend
- **Описание:** (1) POST `/api/v1/marketplace/templates/submit` — create template с status=pending_review. Validation: name unique, description > 50 chars, field_mapping non-empty, geos non-empty, screenshots max 5 × 2MB. (2) Screenshot upload: pre-signed S3 URL for client-side upload. (3) PUT `/api/v1/marketplace/templates/{id}` — edit only if status=draft or rejected. (4) Admin endpoints: GET `/api/v1/admin/marketplace/pending` — list pending reviews. POST `/api/v1/admin/marketplace/templates/{id}/review` — approve (status=published, is_verified=true) or reject (status=rejected, rejection_reason). (5) Sanitization: strip script tags, validate URLs against allowlist patterns, validate JSONB structure against schema. (6) Versioning: POST `/api/v1/marketplace/templates/{id}/versions` — new version, existing installs notified.
- **Критерии готовности (DoD):**
  - [ ] Submit → pending_review flow работает
  - [ ] Admin review: approve/reject
  - [ ] Rejection notification to author
  - [ ] Sanitization: XSS vectors blocked
  - [ ] Version submit и notification
  - [ ] Screenshot upload to S3
- **Оценка:** 16h
- **Story:** [STORY-151]

**[TASK-0567] Реализовать Frontend — submit template и author dashboard**
- **Тип:** Frontend
- **Описание:** (1) "Submit Template" page: multi-step form (Basic Info → Field Mapping Editor → Config Variables → Screenshots → Preview → Submit). (2) Field Mapping Editor: visual table editor (add row, source field input, target field dropdown, type select, required toggle). (3) Config Variables: define {{VARIABLE_NAME}} with label, type (text/password/url/select), required, description. (4) Screenshot upload: drag-and-drop zone, preview thumbnails, max 5. (5) Author Dashboard: "My Templates" tab in Marketplace. Card per template: name, status badge (Draft/Pending/Published/Rejected), stats (installs, rating), Edit/Delete buttons. (6) Rejection: show reason, "Edit & Resubmit" button.
- **Критерии готовности (DoD):**
  - [ ] Submit form с field mapping editor
  - [ ] Config variables editor
  - [ ] Screenshot upload (drag-and-drop)
  - [ ] Author dashboard с статусами
  - [ ] Rejection reason отображается
- **Оценка:** 16h
- **Story:** [STORY-151]

**[TASK-0568] QA тесты community submissions**
- **Тип:** QA
- **Описание:** (1) Submit valid template → status pending_review. (2) Submit without description → validation error. (3) Admin approve → status published, visible in marketplace. (4) Admin reject → author sees reason. (5) Edit rejected → resubmit → pending again. (6) XSS в description → sanitized. (7) Screenshot > 2MB → error. (8) New version → existing installs see "Update". (9) Duplicate name → 422.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Security: XSS и injection vectors проверены
  - [ ] Full flow: submit → review → publish → install by other user
- **Оценка:** 8h
- **Story:** [STORY-151]

---

#### [STORY-152] Рейтинги и отзывы
**Как** Network Admin, **я хочу** оставлять отзывы и рейтинги на шаблоны интеграций, **чтобы** помочь другим пользователям выбрать качественные шаблоны.
**Acceptance Criteria:**
- [ ] AC1: Rating: 1-5 звёзд (обязательно), текст отзыва (10-1000 символов, обязательно). Один отзыв per user per template. Редактирование собственного отзыва разрешено
- [ ] AC2: Rating distribution: bar chart (5★: XX%, 4★: XX%, ...) + average rating (1 decimal). Пересчёт avg_rating при каждом create/update/delete review
- [ ] AC3: Sort reviews: newest first (default), highest rated, lowest rated, most helpful. "Helpful" button (upvote) на каждом review. Top 3 "Most helpful" reviews pinned сверху
- [ ] AC4: Moderation: отзывы с <3 stars от нового аккаунта (< 7 дней) → auto-flag для модерации. Admin может hide review с причиной (spam, inappropriate, off-topic)
- [ ] AC5: Author response: template author может ответить на отзыв (1 ответ per review, max 500 chars). Отображается под review с пометкой "Author"
- [ ] AC6: Review eligibility: только пользователи с active installation могут оставить отзыв. Uninstall → review остаётся с пометкой "Reviewed while installed"
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-16]
**Зависит от:** [STORY-149]

##### Tasks для STORY-152:
**[TASK-0569] Реализовать backend рейтингов и отзывов**
- **Тип:** Backend
- **Описание:** Таблица `marketplace_reviews`: id, template_id (FK), user_id (FK), company_id (FK), rating (smallint 1-5), text (varchar 1000), helpful_count (int default 0), is_hidden (bool), hidden_reason (varchar 200), author_response (varchar 500), author_responded_at, has_active_install (bool), created_at, updated_at. Таблица `marketplace_review_votes`: review_id + user_id (composite PK), created_at. API: POST/PUT/DELETE reviews. POST `/reviews/{id}/helpful` — toggle vote. POST `/reviews/{id}/respond` — author only. Trigger: recalculate avg_rating и review_count on template after CUD. Auto-flag: review with rating < 3 from account < 7 days → is_flagged=true.
- **Критерии готовности (DoD):**
  - [ ] CRUD reviews работает
  - [ ] One review per user per template
  - [ ] avg_rating пересчитывается атомарно
  - [ ] Helpful voting (toggle)
  - [ ] Author response
  - [ ] Auto-flag для новых аккаунтов
  - [ ] Only installed users can review
- **Оценка:** 8h
- **Story:** [STORY-152]

**[TASK-0570] Реализовать Frontend — reviews UI**
- **Тип:** Frontend
- **Описание:** (1) Reviews tab: rating distribution chart (horizontal bars), average rating (large number + stars), review count. (2) Write review: star picker (hover highlight), text area (10-1000 chars counter), submit button. Only visible if has_active_install. (3) Review card: user avatar, name, rating stars, date, text, helpful button (thumbs up + count), author response (indented, "Author" badge). (4) Sort: dropdown (newest, highest, lowest, most helpful). (5) Most helpful: top 3 pinned with "Most Helpful" badge. (6) Edit own review: pencil icon. (7) Admin: hide button with reason input.
- **Критерии готовности (DoD):**
  - [ ] Rating distribution chart
  - [ ] Write review с star picker
  - [ ] Review cards с helpful voting
  - [ ] Author response display
  - [ ] Sort options
  - [ ] Edit own review
- **Оценка:** 8h
- **Story:** [STORY-152]

**[TASK-0571] QA тесты рейтингов**
- **Тип:** QA
- **Описание:** (1) Submit 5★ review → avg updated. (2) Second review → 422. (3) Edit review 5→3 → avg recalculated. (4) Helpful vote → count +1. (5) Double helpful → toggle off. (6) Non-installed user → no review button. (7) New account (<7d) + <3★ → flagged. (8) Author respond → response shown. (9) Admin hide → review hidden with reason. (10) Delete review → avg recalculated.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] avg_rating математически корректен (ручная сверка)
- **Оценка:** 4h
- **Story:** [STORY-152]

---

#### [STORY-153] Категории, теги и таксономия шаблонов
**Как** Network Admin, **я хочу** просматривать шаблоны по категориям и тегам, **чтобы** быстро ориентироваться в большом каталоге.
**Acceptance Criteria:**
- [ ] AC1: Категории (фиксированные): Tier 1 Brokers, Tier 2 Brokers, Payment Systems, Trackers. Каждая категория: иконка, description, template count. Страница категории: filtered grid
- [ ] AC2: Теги (свободные, создаются авторами): max 10 тегов per template, max 30 chars per tag, lowercase normalized. Popular tags cloud на главной Marketplace (top 20 tags по template count)
- [ ] AC3: Tag page: /marketplace/tags/{tag} — filtered grid шаблонов с этим тегом. Breadcrumbs: Marketplace > Tags > {tag}
- [ ] AC4: Admin может управлять категориями: rename, merge, reorder. Merge: все шаблоны старой категории переносятся в новую
- [ ] AC5: Auto-suggest тегов при submit: при вводе тега → autocomplete из existing tags (fuzzy match, top 5 suggestions)
- [ ] AC6: Category counters обновляются real-time (pub/sub или materialized counter)
**Story Points:** 3
**Приоритет:** Could
**Epic:** [EPIC-16]
**Зависит от:** [STORY-148]

##### Tasks для STORY-153:
**[TASK-0572] Реализовать backend категорий и тегов**
- **Тип:** Backend
- **Описание:** (1) Таблица `marketplace_categories`: id, name, slug, icon, description, display_order, template_count (materialized counter). (2) Tags: используем text[] в marketplace_templates. API: GET `/api/v1/marketplace/tags` — aggregation SELECT UNNEST(tags) as tag, COUNT(*) FROM templates GROUP BY tag ORDER BY count DESC LIMIT 20. (3) GET `/api/v1/marketplace/tags/{tag}/templates` — filtered list. (4) Tag autocomplete: GET `/api/v1/marketplace/tags/suggest?q=bin` → fuzzy match existing tags. (5) Admin: PUT `/api/v1/admin/marketplace/categories/{id}`, POST `/api/v1/admin/marketplace/categories/merge` (source_id, target_id). (6) Counter update: trigger или event-driven на template publish/unpublish.
- **Критерии готовности (DoD):**
  - [ ] Category CRUD для admin
  - [ ] Tags aggregation и suggest
  - [ ] Tag page filtering
  - [ ] Category merge переносит templates
  - [ ] Counters корректны
- **Оценка:** 8h
- **Story:** [STORY-153]

**[TASK-0573] Реализовать Frontend — categories и tags UI**
- **Тип:** Frontend
- **Описание:** (1) Category bar on Marketplace page: horizontal scroll cards (icon + name + count). Click → filtered grid. (2) Tag cloud: weighted tags (font-size proportional to count). Click → tag page. (3) Tag input при submit: text input с autocomplete dropdown (debounced 200ms). Chips for added tags. Max 10 tags indicator. (4) Category page: header (icon, name, description, count), filtered grid. (5) Admin: category management page (reorder drag-and-drop, merge modal).
- **Критерии готовности (DoD):**
  - [ ] Category cards с counters
  - [ ] Tag cloud weighted
  - [ ] Tag autocomplete при submit
  - [ ] Category и tag pages
  - [ ] Admin category management
- **Оценка:** 8h
- **Story:** [STORY-153]

**[TASK-0574] QA тесты категорий и тегов**
- **Тип:** QA
- **Описание:** (1) Category click → filtered templates. (2) Tag cloud → top 20 tags. (3) Tag click → tag page. (4) Autocomplete "bin" → "binance", "binary". (5) 11th tag → blocked. (6) Admin merge categories → templates moved. (7) Counter accuracy после publish/unpublish.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Counter accuracy verified
- **Оценка:** 4h
- **Story:** [STORY-153]

---

#### [STORY-154] Версионирование и уведомления об обновлениях
**Как** Network Admin, **я хочу** получать уведомления об обновлениях установленных шаблонов и обновлять их без потери своих настроек, **чтобы** всегда использовать актуальные интеграции.
**Acceptance Criteria:**
- [ ] AC1: Каждая версия шаблона: semver (major.minor.patch), changelog (markdown, max 2000 chars), breaking_changes (bool). Новая версия не перезаписывает старую — обе хранятся
- [ ] AC2: Update notification: при публикации новой версии → in-app notification и email (если включён) всем users с active installation. Badge "Update available" на installed template card
- [ ] AC3: Update flow: "Update" button → comparison view (current config vs new config, diff highlighted). "Apply Update" → merge: новые поля добавляются, удалённые помечаются deprecated, изменённые показывают conflict. User resolves conflicts manually
- [ ] AC4: Breaking changes (major version): yellow warning "This update contains breaking changes. Review carefully." Список breaking changes. Require checkbox confirmation
- [ ] AC5: Rollback: после update → "Rollback to v1.x" кнопка доступна 7 дней. Rollback восстанавливает предыдущую конфигурацию
- [ ] AC6: Auto-update option (per installation): if enabled, minor/patch versions apply automatically. Major versions always require manual approval
**Story Points:** 5
**Приоритет:** Could
**Epic:** [EPIC-16]
**Зависит от:** [STORY-150], [STORY-151]

##### Tasks для STORY-154:
**[TASK-0575] Реализовать backend версионирования шаблонов**
- **Тип:** Backend
- **Описание:** Таблица `marketplace_template_versions`: id, template_id (FK), version (varchar 20, semver), changelog (text), breaking_changes (bool), config_template (JSONB), field_mapping (JSONB), created_at, published_at. (1) POST `/api/v1/marketplace/templates/{id}/versions` — create new version. (2) GET `/api/v1/marketplace/templates/{id}/versions` — list versions. (3) POST `/api/v1/marketplace/installations/{id}/update` — apply update: diff current config vs new version, merge non-conflicting, return conflicts for manual resolution. (4) POST `/api/v1/marketplace/installations/{id}/rollback` — restore previous version config (stored in installation_history). (5) Auto-update: cron check new versions → if minor/patch + auto_update_enabled → apply. (6) Notifications: event on new version → notify all installed users.
- **Критерии готовности (DoD):**
  - [ ] Version create и list
  - [ ] Update с diff и conflict detection
  - [ ] Rollback в течение 7 дней
  - [ ] Auto-update для minor/patch
  - [ ] Notifications отправляются
- **Оценка:** 16h
- **Story:** [STORY-154]

**[TASK-0576] Реализовать Frontend — update и rollback flow**
- **Тип:** Frontend
- **Описание:** (1) "Update available" badge на installed template card. (2) Update page: side-by-side diff (current vs new). Green: added fields. Red: removed. Yellow: changed. (3) Conflict resolution: for each conflict → radio buttons (Keep current / Accept new). (4) Breaking changes warning: yellow banner, checkbox "I understand this update contains breaking changes". (5) Apply Update button → progress → success. (6) Rollback button (visible 7 days): confirmation → restore. (7) Auto-update toggle in installation settings.
- **Критерии готовности (DoD):**
  - [ ] Update badge и notification
  - [ ] Diff view с цветовым кодированием
  - [ ] Conflict resolution UI
  - [ ] Breaking changes warning
  - [ ] Rollback flow
  - [ ] Auto-update toggle
- **Оценка:** 8h
- **Story:** [STORY-154]

**[TASK-0577] QA тесты версионирования**
- **Тип:** QA
- **Описание:** (1) New patch version → notification to installed users. (2) Update non-breaking → auto-merge. (3) Update breaking → warning + checkbox required. (4) Conflict → manual resolution. (5) Rollback → previous config restored. (6) Rollback after 7 days → disabled. (7) Auto-update minor → applied automatically. (8) Auto-update major → not applied, notification only.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] End-to-end: v1 → v2 update → rollback → v1 restored
- **Оценка:** 4h
- **Story:** [STORY-154]

---

## [EPIC-17] Smart Routing (AI/ML v1)
**Цель:** Внедрить AI/ML оптимизацию маршрутизации лидов: автоматическая корректировка весов брокеров на основе конверсий, предсказание исчерпания капов, автоматический failover при деградации брокера, рекомендации по оптимизации, A/B тестирование конфигураций и ML-скоринг лидов. Leadgreed не имеет AI/ML — это наш ключевой дифференциатор.
**Метрика успеха:**
- Увеличение общей conversion rate (FTD/sent) на >= 15% по сравнению с manual routing за 90 дней
- Точность предсказания исчерпания капов >= 85% (предсказание за 2+ часа до события)
- Время автоматического failover при деградации брокера < 60 сек
- Lead scoring: top-20% scored leads конвертируются >= 3x чаще чем bottom-20%
- A/B тест конфигураций определяет winner с statistical significance (p < 0.05) за 7 дней
**Приоритет:** P2 (Growth)
**Зависит от:** [EPIC-02], [EPIC-10]
**Оценка:** XL

### Stories:

---

#### [STORY-155] Автоматическая оптимизация весов роутинга
**Как** Network Admin, **я хочу** чтобы система автоматически корректировала веса распределения лидов между брокерами на основе их conversion rate, **чтобы** больше лидов отправлялось к брокерам с лучшей конверсией.
**Acceptance Criteria:**
- [ ] AC1: ML-модель (Multi-Armed Bandit, Thompson Sampling) анализирует conversion rate каждого брокера за скользящее окно (configurable: 7/14/30 дней, default 14). Весовые коэффициенты пересчитываются каждые 15 мин на основе posterior distribution
- [ ] AC2: API `PUT /api/v1/routing/flows/{id}/auto-optimize` — включить/выключить auto-optimization. Параметры: `learning_rate` (0.01-0.5, default 0.1 — насколько агрессивно менять веса), `exploration_rate` (0.05-0.3, default 0.1 — доля трафика на exploration), `min_sample_size` (50-1000 leads per broker, default 100 — минимум данных перед оптимизацией)
- [ ] AC3: Guardrails: вес брокера не может измениться > 10% за один цикл (15 мин). Минимальный вес: 5% (брокер не может быть полностью отключён оптимизатором). Максимальный: 60%. Network Admin может переопределить (override) веса вручную — auto-optimization паузится на 24 часа
- [ ] AC4: Dashboard: график весов во времени (area chart, stacked). Текущие vs рекомендуемые веса. "Reason" для каждого изменения (напр. "Broker X conversion rate increased from 12% to 18%")
- [ ] AC5: Warm-up период: первые 7 дней или первые 500 лидов — используются равные веса (uniform distribution) для сбора baseline данных. Индикатор "Warming up (3/7 days)"
- [ ] AC6: Performance: пересчёт весов для flow с 20 брокерами < 5 сек. Не влияет на latency routing (async process)
**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-17]
**Зависит от:** —

##### Tasks для STORY-155:
**[TASK-0578] Реализовать ML модель Thompson Sampling для routing optimization**
- **Тип:** Backend
- **Описание:** Реализовать Thompson Sampling для Multi-Armed Bandit. Каждый broker — "arm" с Beta distribution (alpha=successes, beta=failures). Success = FTD, Failure = sent but no FTD. Каждые 15 мин (cron): (1) Для каждого flow с auto-optimize=on: collect conversion data за window. (2) Update Beta parameters. (3) Sample from posteriors. (4) Normalize samples to weights. (5) Apply guardrails (max 10% change, min 5%, max 60%). (6) Update routing weights. (7) Log: old_weights, new_weights, reason, sample_values. Модель хранится в Redis (alpha/beta per broker per flow) для быстрого доступа. Warm-up: if total_leads < min_sample_size → uniform weights.
- **Критерии готовности (DoD):**
  - [ ] Thompson Sampling корректно реализован (unit test: Beta distribution sampling)
  - [ ] Guardrails: max 10% change per cycle
  - [ ] Min 5% / Max 60% weight enforced
  - [ ] Warm-up период работает
  - [ ] Log каждого пересчёта сохраняется
  - [ ] Async: не влияет на routing latency
  - [ ] Пересчёт для 20 брокеров < 5 сек
- **Оценка:** 16h
- **Story:** [STORY-155]

**[TASK-0579] Реализовать API auto-optimization settings**
- **Тип:** Backend
- **Описание:** PUT `/api/v1/routing/flows/{id}/auto-optimize`: {enabled: bool, learning_rate: float, exploration_rate: float, min_sample_size: int, window_days: int}. GET — текущие настройки + статус (warming_up/optimizing/paused/manual_override). Manual override detection: если admin меняет weights через PUT `/flows/{id}/weights` при active auto-optimize → set status=manual_override, resume auto-optimize через 24 часа (configurable). GET `/api/v1/routing/flows/{id}/optimization-history` — список изменений весов с reasons, timestamps, before/after values.
- **Критерии готовности (DoD):**
  - [ ] Settings API работает с validation
  - [ ] Status correctly reflects state
  - [ ] Manual override pauses optimization for 24h
  - [ ] History API с pagination
- **Оценка:** 8h
- **Story:** [STORY-155]

**[TASK-0580] Реализовать Frontend — auto-optimization dashboard**
- **Тип:** Frontend
- **Описание:** (1) Flow Editor: toggle "Auto-Optimize" с settings panel (sliders: learning_rate, exploration_rate, min_sample_size, window). (2) Status badge: Warming Up (yellow, progress), Optimizing (green, pulsing), Paused (grey), Manual Override (orange, countdown). (3) Weights Timeline: recharts AreaChart (stacked, one area per broker). X-axis: time. Hover: weights at that point. (4) Current vs Recommended: side-by-side bars (current blue, recommended green). "Apply Recommendations" button. (5) Change log: table (timestamp, broker, old_weight, new_weight, reason). (6) Override warning: when admin manually changes weights → "Auto-optimization will pause for 24h. Continue?"
- **Критерии готовности (DoD):**
  - [ ] Toggle и settings panel
  - [ ] Status badge с правильными states
  - [ ] Weights timeline chart
  - [ ] Current vs Recommended comparison
  - [ ] Change log table
  - [ ] Override warning modal
- **Оценка:** 16h
- **Story:** [STORY-155]

**[TASK-0581] QA тесты auto-optimization**
- **Тип:** QA
- **Описание:** (1) Enable auto-optimize → status "Warming Up". (2) After min_sample_size → status "Optimizing", weights change. (3) Broker A: 20% conversion, Broker B: 10% → A gets higher weight. (4) Weight change > 10% per cycle → capped at 10%. (5) Manual override → paused 24h → auto resumes. (6) Min weight 5%: low-performing broker not dropped below 5%. (7) History log: all changes recorded. (8) 20 brokers: recalc < 5 сек.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Statistical test: over 10K leads, weight distribution follows conversion rates (chi-squared p > 0.05)
  - [ ] Performance test: recalc does not affect routing p95
- **Оценка:** 8h
- **Story:** [STORY-155]

---

#### [STORY-156] Предсказание исчерпания капов (Predictive Cap Exhaustion)
**Как** Affiliate Manager, **я хочу** получать предупреждения о скором исчерпании капов за 2+ часа, **чтобы** заранее договориться с брокером об увеличении капа или перенаправить трафик.
**Acceptance Criteria:**
- [ ] AC1: ML-модель (Linear Regression + Seasonal ARIMA) предсказывает время исчерпания каждого капа на основе: текущий cap usage, скорость поступления лидов за последние 1/4/12/24 часа, исторические паттерны (день недели, время суток), сезонность. Предсказание обновляется каждые 5 мин
- [ ] AC2: Alert levels: Yellow (predicted exhaustion in 4-8 hours), Orange (2-4 hours), Red (< 2 hours), Critical (< 30 min). Notification через push и in-app
- [ ] AC3: API `GET /api/v1/routing/caps/predictions` — для всех брокеров: current_usage, cap_limit, predicted_exhaustion_time (ISO 8601), confidence_interval (low/high), alert_level. Только для брокеров с usage > 50%
- [ ] AC4: Dashboard widget: список брокеров с predicted exhaustion time, color-coded. Countdown timer для Red/Critical
- [ ] AC5: Accuracy: предсказание за 2+ часа имеет accuracy >= 85% (± 30 мин от реального времени исчерпания). Измеряется на rolling 30-day window
- [ ] AC6: Auto-action (optional): при alert_level=Critical → автоматически перенаправить трафик к backup broker (если настроен). Требует явного включения per flow
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-17]
**Зависит от:** [STORY-155]

##### Tasks для STORY-156:
**[TASK-0582] Реализовать ML модель предсказания исчерпания капов**
- **Тип:** Backend
- **Описание:** (1) Feature engineering: current_usage_pct, lead_rate_1h, lead_rate_4h, lead_rate_24h, day_of_week (one-hot), hour_of_day (cyclical sin/cos), historical_same_dow_same_hour (avg rate). (2) Model: Weighted Linear Regression для short-term (< 4h) + ARIMA(1,1,1) для seasonal component. Fallback: if insufficient data (< 3 days) → simple linear extrapolation. (3) Prediction pipeline: каждые 5 мин для каждого broker с usage > 50%: calculate features → predict → store prediction. (4) Confidence interval: bootstrap (100 samples) → 10th/90th percentile. (5) Store predictions: Redis (TTL 10 мин). Historical predictions: PostgreSQL (для accuracy tracking). (6) Accuracy tracker: compare predicted_time vs actual_exhaustion_time → log accuracy metrics.
- **Критерии готовности (DoD):**
  - [ ] Model предсказывает exhaustion time
  - [ ] Confidence interval рассчитывается
  - [ ] Alert levels определяются корректно
  - [ ] Accuracy >= 85% на test dataset (backtesting)
  - [ ] Predictions обновляются каждые 5 мин
  - [ ] Fallback для insufficient data
- **Оценка:** 16h
- **Story:** [STORY-156]

**[TASK-0583] Реализовать API и notifications для cap predictions**
- **Тип:** Backend
- **Описание:** (1) GET `/api/v1/routing/caps/predictions` — list predictions для all brokers с usage > 50%. Response: [{broker_id, broker_name, current_usage, cap_limit, usage_pct, predicted_exhaustion_time, confidence_low, confidence_high, alert_level, auto_action_enabled}]. (2) Notification service: при alert level change → push notification (если enabled). Dedup: same alert level for same broker → don't re-notify within 30 мин. (3) Auto-action: при Critical + auto_action_enabled → trigger failover to backup broker. Log action.
- **Критерии готовности (DoD):**
  - [ ] Predictions API возвращает корректные данные
  - [ ] Notifications при level change
  - [ ] Dedup: no spam (30 мин cooldown per broker per level)
  - [ ] Auto-action failover работает
- **Оценка:** 8h
- **Story:** [STORY-156]

**[TASK-0584] Реализовать Frontend — cap predictions dashboard**
- **Тип:** Frontend
- **Описание:** (1) Cap Predictions widget (desktop dashboard и mobile): таблица/карточки брокеров sorted by predicted_exhaustion ASC. Columns: broker, usage bar (progress + percentage), predicted time (relative: "in 2h 15m"), confidence range, alert level badge (Yellow/Orange/Red/Critical с иконками). (2) Critical brokers: countdown timer (MM:SS), pulsing red border. (3) Click → broker detail: prediction chart (line: actual usage + predicted trend line + confidence band, shaded area). X-axis: now → future 24h. (4) Auto-action toggle per broker. (5) Accuracy metrics (admin only): accuracy % over last 30 days, chart of predicted vs actual.
- **Критерии готовности (DoD):**
  - [ ] Prediction table с alert level badges
  - [ ] Countdown timer для Critical
  - [ ] Prediction chart с confidence band
  - [ ] Auto-action toggle
  - [ ] Accuracy metrics для admin
- **Оценка:** 8h
- **Story:** [STORY-156]

**[TASK-0585] QA тесты cap predictions**
- **Тип:** QA
- **Описание:** (1) Broker at 60% usage, steady rate → predicted exhaustion calculated. (2) Rate increase → predicted time moves closer. (3) Alert Yellow → notification sent. (4) Alert escalation Yellow → Orange → Red → notifications at each step. (5) Same level within 30 min → no duplicate notification. (6) Critical + auto-action → failover triggered. (7) Accuracy test: backtesting on 30 days historical data → >= 85%. (8) Broker < 50% usage → not in predictions list.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Backtesting accuracy verified (minimum 30 days data)
  - [ ] Auto-action failover integration test
- **Оценка:** 8h
- **Story:** [STORY-156]

---

#### [STORY-157] Автоматический failover при деградации брокера
**Как** Network Admin, **я хочу** чтобы система автоматически перенаправляла лиды при деградации performance брокера, **чтобы** минимизировать потери конверсий.
**Acceptance Criteria:**
- [ ] AC1: Health monitor: каждые 60 сек проверяет для каждого активного брокера: response_time_p95, error_rate_5min, acceptance_rate_5min, timeout_rate_5min. Сравнивает с baseline (rolling 24h average)
- [ ] AC2: Degradation detection: если любая метрика отклоняется > 2x от baseline в течение 3 consecutive checks (3 мин) → broker status = degraded. Если error_rate > 50% или timeout_rate > 30% за 5 мин → broker status = critical
- [ ] AC3: Auto-failover: при status=degraded → уменьшить вес брокера на 50%. При status=critical → вес = 0% (полная остановка), перенаправить на fallback brokers. При восстановлении (3 consecutive healthy checks) → постепенно увеличивать вес (+10% каждые 5 мин до восстановления original weight)
- [ ] AC4: Notification: при degradation → push + email + Slack/Telegram (если настроены). При recovery → notification "Broker X recovered. Weight restoring."
- [ ] AC5: Time to failover: от обнаружения degradation до перенаправления трафика < 60 сек. Recovery time: от восстановления брокера до полного восстановления веса < 30 мин
- [ ] AC6: Manual override: admin может disable auto-failover per broker. "Force Healthy" button для ситуаций когда broker API changed но работает (false positive detection)
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-17]
**Зависит от:** [STORY-155]

##### Tasks для STORY-157:
**[TASK-0586] Реализовать broker health monitor**
- **Тип:** Backend
- **Описание:** Сервис BrokerHealthMonitor. (1) Каждые 60 сек для каждого active broker: query metrics из time-series store (response_time_p95, error_rate, acceptance_rate, timeout_rate) за последние 5 мин. (2) Baseline: rolling 24h average (materialized, updated hourly). (3) Degradation rules: response_time_p95 > 2x baseline OR error_rate > 2x baseline OR timeout_rate > 2x baseline → increment degradation_counter. 3 consecutive → status=degraded. error_rate > 50% OR timeout_rate > 30% → status=critical (immediate). (4) Recovery: 3 consecutive healthy checks → status=recovering → gradual weight restore. (5) Store health status: Redis (broker_id → {status, degradation_counter, last_check_at, baseline}).
- **Критерии готовности (DoD):**
  - [ ] Health checks каждые 60 сек
  - [ ] Degradation detection: 3 consecutive anomalies → degraded
  - [ ] Critical detection: immediate on threshold breach
  - [ ] Recovery: 3 healthy → recovering
  - [ ] All metrics tracked и сохранены
- **Оценка:** 16h
- **Story:** [STORY-157]

**[TASK-0587] Реализовать auto-failover engine**
- **Тип:** Backend
- **Описание:** Сервис AutoFailover. (1) On degraded: reduce broker weight by 50%, redistribute to other brokers proportionally. (2) On critical: set weight to 0%, redistribute 100% to fallback brokers. If no fallback → redistribute to all remaining brokers by their current proportions. (3) On recovering: increase weight +10% every 5 min (cron) until original weight reached. Store original_weight for restoration. (4) Notification: event → notification service (push, email, Slack webhook, Telegram bot API). (5) Manual override: per-broker flag `auto_failover_enabled`. `force_healthy` API: reset degradation_counter, set status=healthy. (6) Audit log: every failover action logged (broker, old_weight, new_weight, reason, auto/manual).
- **Критерии готовности (DoD):**
  - [ ] Degraded → weight -50%
  - [ ] Critical → weight 0%, traffic redistributed
  - [ ] Recovery → gradual +10% per 5 min
  - [ ] Notifications sent (push + Slack/Telegram)
  - [ ] Manual override и force_healthy
  - [ ] Audit log
  - [ ] Time to failover < 60 сек
- **Оценка:** 16h
- **Story:** [STORY-157]

**[TASK-0588] Реализовать Frontend — broker health и failover UI**
- **Тип:** Frontend
- **Описание:** (1) Broker Health Status page: table (broker, status badge [Healthy/Degraded/Critical/Recovering], response_time, error_rate, timeout_rate, weight, auto-failover toggle). (2) Status badge: green=Healthy, yellow=Degraded, red=Critical, blue=Recovering (with progress). (3) Broker detail: health timeline chart (4 metrics over 24h, baseline line, anomaly zones highlighted). (4) Failover history: timeline of events (degradation, failover, recovery). (5) Alert: in-app toast при status change. (6) Force Healthy button с confirmation.
- **Критерии готовности (DoD):**
  - [ ] Health status table с real-time badges
  - [ ] Health timeline chart с baseline
  - [ ] Failover history timeline
  - [ ] Auto-failover toggle per broker
  - [ ] Force Healthy button
- **Оценка:** 8h
- **Story:** [STORY-157]

**[TASK-0589] QA тесты auto-failover**
- **Тип:** QA
- **Описание:** (1) Broker error_rate > 2x baseline × 3 checks → status=degraded, weight -50%. (2) error_rate > 50% → status=critical, weight=0. (3) Critical → traffic goes to fallback brokers (verify leads routed correctly). (4) Recovery: 3 healthy → gradual restore. (5) Full restore to original weight. (6) Notification on degradation → received. (7) Force Healthy → status reset. (8) Auto-failover disabled → no action on degradation. (9) Failover time < 60 сек (measure from anomaly to weight change).
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] End-to-end: simulate broker failure → verify failover → simulate recovery → verify restore
  - [ ] Timing: failover < 60 sec measured
- **Оценка:** 8h
- **Story:** [STORY-157]

---

#### [STORY-158] Рекомендации по оптимизации роутинга
**Как** Network Admin, **я хочу** получать AI-рекомендации по улучшению routing конфигурации, **чтобы** принимать data-driven решения без глубокого анализа данных.
**Acceptance Criteria:**
- [ ] AC1: Recommendation engine анализирует: conversion rates, response times, rejection patterns, cap utilization, GEO performance, time-of-day patterns. Генерирует рекомендации еженедельно (воскресенье 06:00 UTC) и по запросу
- [ ] AC2: Типы рекомендаций: (1) "Increase weight for Broker X: conversion 18% vs avg 12%", (2) "Decrease weight for Broker Y: response time 3x slower than avg", (3) "Add GEO filter: Broker Z performs 4x better for DE traffic", (4) "Adjust schedule: Broker W converts 2x better during 09:00-18:00 UTC", (5) "Remove broker: Broker V rejected 80% of leads last 30 days", (6) "Increase cap: Broker U hit cap 15 times this month"
- [ ] AC3: Каждая рекомендация содержит: type, priority (high/medium/low), description, data evidence (numbers), expected impact ("+X% conversion"), one-click apply button, dismiss button
- [ ] AC4: API `GET /api/v1/routing/recommendations` — list active recommendations. POST `/{id}/apply` — apply. POST `/{id}/dismiss` — dismiss с reason (not_relevant, will_do_later, disagree)
- [ ] AC5: Максимум 10 active recommendations per flow (не перегружать). Dismissed recommendations не повторяются в течение 30 дней
- [ ] AC6: Recommendation accuracy: >= 70% applied recommendations должны привести к improvement (measured 7 days after apply)
**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-17]
**Зависит от:** [STORY-155]

##### Tasks для STORY-158:
**[TASK-0590] Реализовать recommendation engine**
- **Тип:** Backend
- **Описание:** Сервис RecommendationEngine. (1) Data collection: aggregate 30 days of routing data per broker per flow (conversion_rate, response_time_avg, rejection_rate, cap_utilization, per-GEO breakdown, per-hour breakdown). (2) Rule-based analysis (v1, not ML): Rule 1: if broker CR > avg * 1.3 → recommend weight increase. Rule 2: if response_time > avg * 2 → recommend weight decrease. Rule 3: if per-GEO CR differs > 2x → recommend GEO filter. Rule 4: if per-hour CR differs > 1.5x → recommend schedule. Rule 5: if rejection_rate > 70% for 30 days → recommend remove. Rule 6: if cap_hit_count > 10/month → recommend cap increase. (3) Priority: high (expected impact > 10%), medium (5-10%), low (< 5%). (4) Expected impact calculation: simulation based on historical data. (5) Store: PostgreSQL table `routing_recommendations`. (6) Cron: Sunday 06:00 UTC. On-demand: API trigger.
- **Критерии готовности (DoD):**
  - [ ] 6 типов рекомендаций генерируются
  - [ ] Priority и expected impact рассчитываются
  - [ ] Max 10 per flow
  - [ ] Dismissed не повторяются 30 дней
  - [ ] Weekly cron и on-demand trigger
- **Оценка:** 16h
- **Story:** [STORY-158]

**[TASK-0591] Реализовать Frontend — recommendations UI**
- **Тип:** Frontend
- **Описание:** (1) Recommendations panel в Flow Editor (sidebar или card list). (2) Recommendation card: priority badge (High red, Medium yellow, Low blue), type icon, description text, evidence numbers (highlighted), expected impact (green badge "+12% conversion"), buttons: "Apply" (green) и "Dismiss" (grey). (3) Apply → confirmation: "This will change weight of Broker X from 15% to 25%. Proceed?" → API call → success toast → recommendation moves to "Applied" history. (4) Dismiss → dropdown: reason select → API call → card removed. (5) Empty state: "No recommendations. Your routing is well-optimized!" (6) Badge on Flow Editor tab: "3 recommendations" count.
- **Критерии готовности (DoD):**
  - [ ] Recommendation cards с priority badges
  - [ ] Apply с confirmation и API call
  - [ ] Dismiss с reason selection
  - [ ] Applied history section
  - [ ] Badge count на tab
- **Оценка:** 8h
- **Story:** [STORY-158]

**[TASK-0592] QA тесты recommendations**
- **Тип:** QA
- **Описание:** (1) Broker with high CR → "Increase weight" recommendation. (2) Broker with high response time → "Decrease weight". (3) Apply recommendation → weight changed. (4) Dismiss "not_relevant" → not shown for 30 days. (5) Max 10 recommendations per flow. (6) On-demand generation → fresh recommendations. (7) Applied recommendation: measure impact after 7 days → accuracy tracked.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Rules generate correct recommendations on test data
- **Оценка:** 4h
- **Story:** [STORY-158]

---

#### [STORY-159] A/B тестирование routing конфигураций
**Как** Network Admin, **я хочу** запускать A/B тесты для сравнения разных routing конфигураций, **чтобы** статистически доказать какая конфигурация эффективнее.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/routing/ab-tests` создаёт тест: `flow_id`, `name`, `variant_a` (control — current config), `variant_b` (treatment — modified config), `traffic_split` (50/50 default, configurable 10-90%), `primary_metric` (conversion_rate/ftd_rate/revenue_per_lead), `min_sample_size` (per variant, 100-10000, default 500), `max_duration_days` (7-90, default 30)
- [ ] AC2: Traffic splitting: deterministic hash (lead_id % 100) для consistency — один лид всегда попадает в одну и ту же variant. Split точность: ±2% от заданного соотношения
- [ ] AC3: Statistical analysis: z-test для proportions (conversion_rate) или t-test для means (revenue_per_lead). Confidence level 95% (p < 0.05). Power analysis: минимальный sample size для detectable effect size рассчитывается при создании теста
- [ ] AC4: Auto-completion: тест завершается когда: (a) оба варианта достигли min_sample_size И statistical significance достигнута, ИЛИ (b) max_duration достигнут. Winner определяется по primary_metric
- [ ] AC5: Safety: если variant_b показывает conversion rate < 50% от variant_a после min_sample_size → auto-stop с reason "significant underperformance" и rollback к variant_a
- [ ] AC6: Dashboard: live results (variant A vs B: metric value, sample size, confidence interval, p-value, current winner). Progress bar (X/min_sample_size). Cumulative chart
**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-17]
**Зависит от:** [STORY-155]

##### Tasks для STORY-159:
**[TASK-0593] Реализовать backend A/B testing engine**
- **Тип:** Backend
- **Описание:** Таблица `routing_ab_tests`: id, flow_id, name, variant_a_config (JSONB), variant_b_config (JSONB), traffic_split_pct (int, variant_b %), primary_metric, min_sample_size, max_duration_days, status (running/completed/stopped), winner (a/b/inconclusive), p_value, started_at, completed_at, stopped_reason. (1) Traffic split: hash(lead_id) % 100 < traffic_split_pct → variant_b, else variant_a. Apply corresponding routing config. (2) Statistics: every 15 min recalculate z-test (for rates) or Welch's t-test (for means). Store running counts per variant (successes, failures, sum, count). (3) Auto-complete: check conditions every 15 min. (4) Safety stop: if variant_b_rate / variant_a_rate < 0.5 after min_sample → stop. (5) Tag leads with ab_test_id и variant для tracking.
- **Критерии готовности (DoD):**
  - [ ] Traffic split deterministic и accurate ±2%
  - [ ] Statistical tests (z-test, t-test) корректны
  - [ ] Auto-completion при significance
  - [ ] Safety stop при underperformance
  - [ ] Leads tagged with test/variant
  - [ ] Multiple tests per flow не допускаются (conflict check)
- **Оценка:** 16h
- **Story:** [STORY-159]

**[TASK-0594] Реализовать Frontend — A/B test management**
- **Тип:** Frontend
- **Описание:** (1) A/B Tests page: list of tests (name, flow, status, progress, current winner). (2) Create test wizard: select flow, configure variant B (modify weights), set split %, select metric, set sample size, set duration. Power analysis: auto-calculate min sample for detectable effect. (3) Live results: two-column comparison (Variant A | Variant B). Per column: metric value, sample size (progress bar), confidence interval (error bar chart). P-value badge (significant: green "p<0.05", not yet: grey). Winner indicator. (4) Cumulative chart: two lines (variant A, variant B) over time. Confidence bands. (5) Stop test button (with confirmation). (6) Results summary after completion.
- **Критерии готовности (DoD):**
  - [ ] Create wizard с power analysis
  - [ ] Live results с statistical indicators
  - [ ] Cumulative comparison chart
  - [ ] Stop test flow
  - [ ] Results summary
- **Оценка:** 8h
- **Story:** [STORY-159]

**[TASK-0595] QA тесты A/B testing**
- **Тип:** QA
- **Описание:** (1) Create test → traffic split 50/50 → leads distributed ±2%. (2) After min_sample + significance → auto-complete with winner. (3) No significance after max_duration → complete as "inconclusive". (4) Variant B < 50% of A → safety stop. (5) Deterministic: same lead_id always in same variant. (6) Power analysis: calculated sample size reasonable for 5% effect. (7) Cannot create 2 tests for same flow simultaneously.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Statistical correctness verified (simulated data with known effect → correct winner)
  - [ ] Traffic split accuracy measured on 10K leads
- **Оценка:** 8h
- **Story:** [STORY-159]

---

#### [STORY-160] Smart Lead Scoring (ML-скоринг лидов)
**Как** Network Admin, **я хочу** чтобы система предсказывала вероятность конверсии каждого лида, **чтобы** направлять высококачественные лиды к лучшим брокерам.
**Acceptance Criteria:**
- [ ] AC1: ML-модель (Gradient Boosting — XGBoost/LightGBM) оценивает каждый входящий лид по вероятности FTD: score 0.0-1.0. Features: GEO, device_type, browser, OS, traffic_source, affiliate_id, affiliate_historical_conversion_rate, time_of_day, day_of_week, landing_page, form_fill_time_sec, IP reputation score
- [ ] AC2: Score рассчитывается при приёме лида (inline, < 50ms добавка к latency). Score сохраняется как поле лида. API `GET /api/v1/leads/{id}` включает `ml_score` и `score_factors` (top-3 contributing features с SHAP values)
- [ ] AC3: Score-based routing: в routing rules можно использовать score threshold (напр., "if score > 0.7 → send to Tier 1 broker, else → Tier 2"). Настраивается в Flow Editor как condition node
- [ ] AC4: Model accuracy: top-20% scored leads конвертируются >= 3x чаще чем bottom-20% (measured on holdout set). AUC-ROC >= 0.75
- [ ] AC5: Model retraining: автоматический retrain каждые 7 дней на latest data (last 90 days). A/B test: new model vs current, auto-deploy if new model AUC >= current. Rollback if new model AUC < current - 0.02
- [ ] AC6: Score distribution dashboard: histogram (score ranges 0-0.1, 0.1-0.2, ..., 0.9-1.0) с actual conversion rate per bucket. Model health metrics: AUC, precision, recall, feature importance chart
**Story Points:** 13
**Приоритет:** Should
**Epic:** [EPIC-17]
**Зависит от:** [STORY-155]

##### Tasks для STORY-160:
**[TASK-0596] Реализовать ML pipeline для lead scoring**
- **Тип:** Backend
- **Описание:** (1) Feature extraction service: при приёме лида → extract features (GEO from IP, device/browser/OS from User-Agent, affiliate stats from cache, IP reputation from external API or local DB, form timing from client). (2) Model serving: загрузить XGBoost/LightGBM model (ONNX format) в memory. Predict per lead. Latency < 50ms. (3) SHAP explanation: precompute SHAP TreeExplainer → top-3 features per prediction. (4) Feature store: Redis cache для affiliate_conversion_rate и IP reputation (TTL 1 hour). (5) Training pipeline (offline): Python script → fetch 90 days data → feature engineering → train XGBoost → evaluate (AUC, precision@k) → export ONNX → upload to S3. (6) Auto-retrain: weekly cron → train → compare with current (shadow mode 24h) → if AUC >= current → deploy → if AUC < current - 0.02 → rollback.
- **Критерии готовности (DoD):**
  - [ ] Feature extraction < 10ms
  - [ ] Model inference < 50ms (including feature extraction)
  - [ ] SHAP top-3 features calculated
  - [ ] Training pipeline generates valid model
  - [ ] Auto-retrain weekly
  - [ ] Rollback mechanism
  - [ ] AUC >= 0.75 on holdout
- **Оценка:** 16h
- **Story:** [STORY-160]

**[TASK-0597] Интегрировать lead score в routing engine**
- **Тип:** Backend
- **Описание:** (1) При приёме лида: extract features → score → save ml_score to lead record. (2) Routing engine: new condition type "lead_score". Flow Editor node: "If ml_score > threshold → Route A, else → Route B". (3) API: GET `/api/v1/leads/{id}` includes ml_score (float) и score_factors (array of {feature_name, contribution, direction}). (4) Bulk API: GET `/api/v1/leads?min_score=0.7` — filter by score. (5) Model versioning: store model_version_id with each score for retroactive analysis.
- **Критерии готовности (DoD):**
  - [ ] Score saved with every lead
  - [ ] Score-based routing condition works
  - [ ] API returns score и factors
  - [ ] Filter by score works
  - [ ] Model version tracked
- **Оценка:** 8h
- **Story:** [STORY-160]

**[TASK-0598] Реализовать Frontend — lead scoring UI и model health**
- **Тип:** Frontend
- **Описание:** (1) Lead detail: score badge (0.0-1.0 with color: red < 0.3, yellow 0.3-0.6, green > 0.6), score factors list (feature name, contribution bar, positive/negative indicator). (2) Lead list: score column, sortable, filterable (range slider 0.0-1.0). (3) Flow Editor: new condition node "Lead Score" (threshold slider, visual indicator of how much traffic goes each way based on historical distribution). (4) Model Health dashboard (admin): AUC chart over time (per model version), feature importance bar chart (SHAP), score distribution histogram + actual conversion overlay, precision-recall curve. (5) Retrain status: last retrain date, current model version, pending retrain schedule.
- **Критерии готовности (DoD):**
  - [ ] Score badge на lead detail
  - [ ] Score column в lead list с filter
  - [ ] Lead Score condition node в Flow Editor
  - [ ] Model health dashboard с metrics
  - [ ] Retrain status display
- **Оценка:** 16h
- **Story:** [STORY-160]

**[TASK-0599] QA тесты lead scoring**
- **Тип:** QA
- **Описание:** (1) New lead → score assigned (0.0-1.0). (2) Score factors: top-3 features present. (3) Score-based routing: score > 0.7 → Tier 1, score < 0.3 → Tier 2. (4) Top-20% vs bottom-20%: verify 3x conversion difference on test data. (5) Model retrain → new model deployed if better. (6) Model degradation → rollback to previous. (7) Scoring latency < 50ms (p95). (8) Lead list filter by score → correct results.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Model quality: AUC >= 0.75 verified
  - [ ] Latency < 50ms measured under load
- **Оценка:** 8h
- **Story:** [STORY-160]

---

## [EPIC-18] Status Groups & Shave Detection
**Цель:** Создать единую систему классификации статусов лидов с маппингом уникальных статусов каждого брокера в унифицированные группы, и внедрить алгоритм обнаружения shaving (когда брокер откатывает или занижает статусы лидов для снижения выплат). Это критически важная функция для защиты revenue аффилейтов и платформы.
**Метрика успеха:**
- 100% брокерских статусов замаплены в unified groups в течение 48 часов после подключения
- Shave detection: обнаружение аномалий с precision >= 80% и recall >= 70%
- False positive rate для shave alerts < 15%
- Время от shave detection до alert < 5 мин
- Cross-broker analytics по unified statuses загружается < 2 сек
**Приоритет:** P2 (Growth)
**Зависит от:** [EPIC-03], [EPIC-10]
**Оценка:** L

### Stories:

---

#### [STORY-161] Конфигурация маппинга статусов (Status Mapping)
**Как** Network Admin, **я хочу** настроить маппинг уникальных статусов каждого брокера в единые унифицированные группы, **чтобы** сравнивать аналитику по всем брокерам в одном формате.
**Acceptance Criteria:**
- [ ] AC1: Unified Status Groups (предустановленные, не редактируемые): `new` (лид создан), `sent` (отправлен брокеру), `callback_scheduled` (запланирован обратный звонок), `contacted` (связались с лидом), `interested` (проявил интерес), `deposited` (сделал первый депозит / FTD), `active_trader` (активно торгует), `rejected` (отклонён брокером), `invalid` (невалидный номер/email), `duplicate` (дубликат), `no_answer` (не отвечает), `not_interested` (не заинтересован), `chargeback` (возврат средств)
- [ ] AC2: API `POST /api/v1/status-mapping/rules` создаёт правило маппинга: `broker_id`, `broker_status` (varchar 100, exact string от брокера), `unified_status` (enum из AC1), `is_ftd` (bool — считается ли FTD), `is_positive` (bool — позитивный outcome для P&L). Пример: Broker A "DEPOSITED_100" → unified "deposited", is_ftd=true
- [ ] AC3: Auto-detect: при получении нового неизвестного статуса от брокера → статус попадает в "Unmapped" queue. Notification: "Broker X sent unknown status 'NEW_STATUS'. Map it now." Unmapped статусы блокируют точную аналитику (warning badge на дашборде)
- [ ] AC4: Bulk mapping: импорт CSV (broker_status, unified_status) для быстрой настройки. Drag-and-drop UI: перетаскивание broker status в unified group
- [ ] AC5: Mapping coverage: dashboard показывает % mapped statuses per broker. 100% = green, < 90% = yellow, < 70% = red. Target: 100% для всех active brokers
- [ ] AC6: Версионирование: изменение маппинга не ретроактивно (старые лиды сохраняют свой unified status на момент маппинга). Новые лиды используют текущий маппинг. Audit log для изменений
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-18]
**Зависит от:** —

##### Tasks для STORY-161:
**[TASK-0600] Спроектировать схему БД для status mapping**
- **Тип:** Backend
- **Описание:** Таблица `unified_status_groups`: id (serial), code (varchar 50, unique — 'new', 'sent', etc.), name (varchar 100), description, is_ftd (bool), is_positive (bool), display_order (int), color (varchar 7, hex), icon (varchar 50). Seed 13 groups из AC1. Таблица `status_mapping_rules`: id (UUID), company_id (FK), broker_id (FK), broker_status (varchar 100), unified_status_code (FK), is_ftd_override (bool, nullable — override group default), created_by (FK), created_at, updated_at. Unique: (company_id, broker_id, broker_status). Таблица `unmapped_statuses`: id, company_id, broker_id, broker_status, first_seen_at, lead_count (counter), is_resolved (bool), resolved_at.
- **Критерии готовности (DoD):**
  - [ ] Миграции up/down
  - [ ] 13 unified groups seeded
  - [ ] Unique constraint на broker_status per broker per company
  - [ ] Unmapped statuses table для queue
- **Оценка:** 4h
- **Story:** [STORY-161]

**[TASK-0601] Реализовать API status mapping**
- **Тип:** Backend
- **Описание:** (1) GET `/api/v1/status-mapping/groups` — list unified groups. (2) CRUD `/api/v1/status-mapping/rules` — create/list/update/delete mapping rules. Bulk create: POST with array body. (3) GET `/api/v1/status-mapping/unmapped` — list unmapped statuses sorted by lead_count DESC. POST `/{id}/resolve` — map и remove from queue. (4) GET `/api/v1/status-mapping/coverage` — per broker: total_broker_statuses, mapped_count, coverage_pct. (5) CSV import: POST `/api/v1/status-mapping/import` (multipart CSV). Validation: unknown unified_status → error. Duplicate → skip/override option. (6) При postback от брокера: lookup mapping rule → set lead.unified_status. If no rule found → add to unmapped queue, set lead.unified_status = null.
- **Критерии готовности (DoD):**
  - [ ] CRUD для mapping rules
  - [ ] Unmapped queue с resolution
  - [ ] CSV import с validation
  - [ ] Coverage calculation per broker
  - [ ] Postback integration: auto-map или queue unmapped
  - [ ] Audit log для изменений
- **Оценка:** 8h
- **Story:** [STORY-161]

**[TASK-0602] Реализовать Frontend — status mapping UI**
- **Тип:** Frontend
- **Описание:** (1) Status Mapping page: left panel — broker selector. Right panel — mapping table. (2) Mapping table: two columns: "Broker Status" (list от брокера), "Unified Status" (dropdown или drag target). (3) Drag-and-drop: broker status cards draggable into unified group containers. (4) Unmapped queue: alert banner "5 unmapped statuses from Broker X" → click → modal с list, каждый → dropdown для mapping. (5) Coverage dashboard: per-broker cards (broker name, progress bar % coverage, green/yellow/red). (6) CSV import: upload zone + preview table + "Import" button. (7) Bulk actions: select multiple broker statuses → assign to same unified group.
- **Критерии готовности (DoD):**
  - [ ] Mapping table с drag-and-drop
  - [ ] Unmapped queue alert и resolution modal
  - [ ] Coverage dashboard
  - [ ] CSV import с preview
  - [ ] Bulk mapping
- **Оценка:** 8h
- **Story:** [STORY-161]

**[TASK-0603] QA тесты status mapping**
- **Тип:** QA
- **Описание:** (1) Create mapping rule → postback with that status → lead gets unified status. (2) Unknown status → unmapped queue. (3) Resolve unmapped → future leads mapped correctly. (4) CSV import 50 rules → all created. (5) CSV with unknown unified_status → error. (6) Coverage: 10/12 mapped → 83% → yellow. (7) Duplicate rule → 422. (8) Audit log: change recorded. (9) Old leads keep old mapping after rule change.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Integration test: postback → mapping → unified status set
- **Оценка:** 4h
- **Story:** [STORY-161]

---

#### [STORY-162] Алгоритм обнаружения Shaving
**Как** Affiliate Manager, **я хочу** чтобы система автоматически обнаруживала shaving (когда брокер откатывает статусы лидов для занижения выплат), **чтобы** защитить revenue платформы и аффилейтов.
**Acceptance Criteria:**
- [ ] AC1: Shave Detection Algorithm анализирует: (1) Status rollback: если unified_status понижается (deposited → contacted → rejected), (2) Conversion rate anomaly: если CR брокера внезапно падает > 30% от 30-day average для того же GEO/affiliate, (3) Status timing: если статус меняется на negative через > 48h после positive (suspiciously late reversal), (4) Pattern: если rollbacks коррелируют с payout periods (конец месяца)
- [ ] AC2: Severity levels: `low` (единичный rollback — может быть легитимным), `medium` (3+ rollbacks за 24h от одного брокера), `high` (systematic pattern: > 10% лидов shaved за неделю ИЛИ timing коррелирует с payout period). Confidence score 0.0-1.0
- [ ] AC3: API `GET /api/v1/shave-detection/alerts` — список alerts с фильтрами (broker, severity, date_range, status). Alert содержит: broker_id, severity, confidence, affected_leads_count, estimated_revenue_loss, evidence (JSON: rollback details), created_at
- [ ] AC4: Detection runs каждые 15 мин (near real-time). Alert создаётся в течение 5 мин после обнаружения pattern
- [ ] AC5: False positive rate < 15% (measured by admin review: dismiss as "not_shaving" → tracked). Tunable thresholds per broker
- [ ] AC6: Automatic actions (configurable): при severity=high → auto-pause sending leads to broker + notification to admin. При severity=medium → notification only. При severity=low → log only (visible in dashboard)
**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-18]
**Зависит от:** [STORY-161]

##### Tasks для STORY-162:
**[TASK-0604] Реализовать shave detection algorithm**
- **Тип:** Backend
- **Описание:** Сервис ShaveDetector. (1) Status Rollback Detector: subscribe to status change events. If new unified_status rank < previous rank (deposited=6 → contacted=4 = rollback) → create evidence record. Ranking: new=1, sent=2, callback=3, contacted=4, interested=5, deposited=6, active_trader=7 (higher = more positive). (2) Conversion Anomaly Detector: every 15 min, per broker per GEO: calculate CR last 24h vs 30-day avg. If drop > 30% AND sample_size > 50 → anomaly. (3) Timing Detector: rollback > 48h after positive status → suspicious. (4) Payout Correlation: detect if rollbacks cluster in last 3 days of month (payout period). Chi-squared test: if rollback rate in payout period > 2x non-payout period → pattern. (5) Severity calculation: low = single rollback, medium = 3+ in 24h, high = systematic (>10% shaved OR payout correlation). Confidence: weighted score from multiple signals. (6) Store: `shave_alerts` table, `shave_evidence` table.
- **Критерии готовности (DoD):**
  - [ ] 4 detection methods реализованы
  - [ ] Severity levels рассчитываются корректно
  - [ ] Confidence score 0.0-1.0
  - [ ] Detection < 5 мин от события
  - [ ] Evidence сохраняется для каждого alert
  - [ ] Tunable thresholds per broker
- **Оценка:** 16h
- **Story:** [STORY-162]

**[TASK-0605] Реализовать API и automatic actions для shave alerts**
- **Тип:** Backend
- **Описание:** (1) GET `/api/v1/shave-detection/alerts` — paginated list. Filters: broker_id, severity, status (active/dismissed/confirmed), date_range. (2) POST `/api/v1/shave-detection/alerts/{id}/dismiss` — dismiss с reason (not_shaving/legitimate_reversal/false_positive). (3) POST `/api/v1/shave-detection/alerts/{id}/confirm` — confirm shaving → link to dispute. (4) Automatic actions: configurable per broker via `/api/v1/shave-detection/config`. severity=high + auto_pause_enabled → set broker routing weight to 0, create notification. (5) Estimated revenue loss: sum of (lead payout) for each rolled-back lead. (6) Notifications: push + email + Slack for medium и high severity.
- **Критерии готовности (DoD):**
  - [ ] Alerts API с фильтрами
  - [ ] Dismiss и confirm flows
  - [ ] Auto-pause при high severity
  - [ ] Revenue loss estimation
  - [ ] Notifications отправляются
  - [ ] Config per broker
- **Оценка:** 8h
- **Story:** [STORY-162]

**[TASK-0606] Реализовать Frontend — shave detection dashboard**
- **Тип:** Frontend
- **Описание:** (1) Shave Detection page: alert cards sorted by severity DESC, then date DESC. Card: severity badge (Low grey, Medium yellow, High red), broker name, affected leads count, estimated revenue loss ($), confidence (%), created_at, action buttons (View Details, Dismiss, Confirm). (2) Alert detail: evidence list (lead ID, old status, new status, timestamp, time since positive status), timeline visualization of status changes. (3) Statistics: total alerts this month, confirmed shave %, estimated total losses, top offending brokers. (4) Configuration: per-broker settings (auto-pause toggle, custom thresholds). (5) False positive rate tracker: chart of dismissed vs confirmed over time.
- **Критерии готовности (DoD):**
  - [ ] Alert cards с severity badges
  - [ ] Detail view с evidence timeline
  - [ ] Statistics dashboard
  - [ ] Per-broker configuration
  - [ ] False positive rate chart
- **Оценка:** 8h
- **Story:** [STORY-162]

**[TASK-0607] QA тесты shave detection**
- **Тип:** QA
- **Описание:** (1) Status rollback deposited → rejected → alert created. (2) 3 rollbacks in 24h → severity medium. (3) >10% shaved in week → severity high. (4) Late reversal (>48h) → suspicious flag. (5) End-of-month cluster → payout correlation detected. (6) High severity + auto-pause → broker paused. (7) Dismiss as false_positive → tracked. (8) Confirm → linked to dispute. (9) Revenue loss calculated correctly. (10) Detection < 5 мин from event.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Simulated shave scenario: 50 leads → correct detection
  - [ ] False positive measurement on historical data
- **Оценка:** 8h
- **Story:** [STORY-162]

---

#### [STORY-163] Shave Alerts и нотификации
**Как** Network Admin, **я хочу** получать мгновенные уведомления при обнаружении shaving, **чтобы** немедленно реагировать и защитить revenue.
**Acceptance Criteria:**
- [ ] AC1: Alert channels: in-app notification (bell icon), push notification (PWA), email, Slack webhook, Telegram bot. Каждый channel настраивается per user per severity level
- [ ] AC2: Alert content: broker name, severity, affected leads count, estimated revenue loss, evidence summary (top 3 examples), action buttons (View in CRM, Contact Broker)
- [ ] AC3: Escalation: если alert severity=high не reviewed в течение 2 часов → escalate: re-notify + отправить email всем Network Admins компании
- [ ] AC4: Alert aggregation: если > 5 alerts от одного брокера за 1 час → группировать в один summary alert "Broker X: 8 shave alerts detected, est. loss $2,500"
- [ ] AC5: Alert lifecycle: created → acknowledged (admin viewed) → resolved (dismissed/confirmed). SLA tracking: time from created to acknowledged, time to resolved
- [ ] AC6: Weekly digest: каждый понедельник — summary email: total alerts last week, top offending brokers, total estimated losses, false positive rate
**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-18]
**Зависит от:** [STORY-162]

##### Tasks для STORY-163:
**[TASK-0608] Реализовать multi-channel notification service для shave alerts**
- **Тип:** Backend
- **Описание:** (1) Notification preferences: table `shave_notification_prefs` (user_id, channel, min_severity). Channels: in_app (always on), push, email, slack_webhook, telegram_bot_id. (2) Notification dispatcher: on new alert → check all users with access → for each user → for each enabled channel where severity >= min_severity → send. (3) Slack: POST to webhook URL with formatted message (rich attachment). (4) Telegram: POST /sendMessage to bot API with markdown. (5) Escalation: cron every 5 min → check high alerts not acknowledged within 2h → re-notify all admins. (6) Aggregation: buffer alerts per broker, batch window 15 min → if > 5 → send summary instead of individual. (7) Weekly digest: cron Monday 09:00 UTC → generate summary → email.
- **Критерии готовности (DoD):**
  - [ ] 5 channels работают (in_app, push, email, Slack, Telegram)
  - [ ] Severity-based filtering
  - [ ] Escalation после 2 часов
  - [ ] Aggregation при > 5 alerts
  - [ ] Weekly digest отправляется
- **Оценка:** 8h
- **Story:** [STORY-163]

**[TASK-0609] Реализовать Frontend — alert notification preferences и lifecycle**
- **Тип:** Frontend
- **Описание:** (1) Settings > Shave Alerts: per-channel toggles (Push, Email, Slack, Telegram) с severity threshold dropdown (Low/Medium/High) per channel. Slack: webhook URL input. Telegram: bot token + chat_id input + "Test" button. (2) Alert lifecycle UI: alert card states: New (red dot), Acknowledged (blue), Resolved (grey). Click "Acknowledge" → status change. (3) SLA indicators: "Created 45 min ago, not yet acknowledged" (yellow if > 1h, red if > 2h). (4) Alert history: filterable table с lifecycle timestamps.
- **Критерии готовности (DoD):**
  - [ ] Channel preferences с severity thresholds
  - [ ] Slack/Telegram test button
  - [ ] Alert lifecycle states in UI
  - [ ] SLA indicators
  - [ ] Alert history filterable
- **Оценка:** 8h
- **Story:** [STORY-163]

**[TASK-0610] QA тесты shave alert notifications**
- **Тип:** QA
- **Описание:** (1) High severity → all enabled channels notified. (2) Low severity + user set min=medium → no notification. (3) Slack webhook → message received. (4) Telegram → message received. (5) Escalation: high not ack'd 2h → re-notify admins. (6) Aggregation: 6 alerts in 1h → 1 summary notification. (7) Acknowledge → SLA timer stops. (8) Weekly digest → summary correct.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Integration test с Slack и Telegram (test webhooks)
- **Оценка:** 4h
- **Story:** [STORY-163]

---

#### [STORY-164] Cross-broker аналитика по unified статусам
**Как** Team Lead, **я хочу** видеть аналитику по всем брокерам в единых статусных группах, **чтобы** сравнивать performance брокеров в одном формате.
**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/analytics/unified-statuses` — aggregated data: для каждого unified status group → lead count, percentage of total, by broker breakdown. Фильтры: date_range, affiliate, broker, geo
- [ ] AC2: Visualization: stacked bar chart (X-axis: brokers, Y-axis: lead count, segments: unified status groups color-coded). Sankey diagram: flow from affiliate → status group → broker
- [ ] AC3: Comparison table: brokers as rows, unified statuses as columns (count + %). Highlight: best performer per status (green cell), worst (red). Sortable by any column
- [ ] AC4: Trend: line chart showing unified status distribution over time (weekly). Detect shifts: if "rejected" grows > 5% week-over-week → warning
- [ ] AC5: Загрузка аналитики < 2 сек (p95) для 20 брокеров × 90 дней
- [ ] AC6: Export: CSV/Excel с unified status columns
**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-18]
**Зависит от:** [STORY-161]

##### Tasks для STORY-164:
**[TASK-0611] Реализовать backend unified status analytics**
- **Тип:** Backend
- **Описание:** (1) Materialized view `mv_unified_status_stats`: aggregate leads GROUP BY (company_id, broker_id, unified_status_code, date_trunc('day', created_at)). Refresh every 15 min. (2) API endpoint: query materialized view with filters, GROUP BY as needed (by broker, by status, by date). (3) Sankey data: affiliate → status → broker flows (3-level aggregation). (4) Trend detection: week-over-week comparison, flag if rejected_pct increased > 5pp. (5) Best/worst highlighting: per status, rank brokers by conversion to that status. (6) Export endpoint: same data as CSV/Excel.
- **Критерии готовности (DoD):**
  - [ ] Materialized view создана и обновляется
  - [ ] API с фильтрами работает < 2 сек
  - [ ] Sankey data structure корректна
  - [ ] Trend detection works
  - [ ] Export CSV/Excel
- **Оценка:** 8h
- **Story:** [STORY-164]

**[TASK-0612] Реализовать Frontend — unified status analytics**
- **Тип:** Frontend
- **Описание:** (1) Unified Analytics page: tabs (Comparison Table, Charts, Trends, Sankey). (2) Comparison table: brokers × statuses, counts + %, best green / worst red highlighting. (3) Stacked bar chart: recharts StackedBarChart, one bar per broker, segments per status. (4) Sankey diagram: using recharts Sankey or d3-sankey. (5) Trend chart: line chart per status group over weeks. Warning badge if rejected grows > 5%. (6) Filters: date range, affiliate, broker, geo. (7) Export button → CSV/Excel.
- **Критерии готовности (DoD):**
  - [ ] Comparison table с highlighting
  - [ ] Stacked bar chart
  - [ ] Sankey diagram
  - [ ] Trend chart с warning
  - [ ] Filters и export
- **Оценка:** 16h
- **Story:** [STORY-164]

**[TASK-0613] QA тесты unified analytics**
- **Тип:** QA
- **Описание:** (1) Table: counts match raw data (manual verification). (2) Best/worst highlighting correct. (3) Stacked bar: segments sum to total. (4) Sankey: flows conserve totals (in = out per node). (5) Trend: rejected +6% WoW → warning shown. (6) Filter by geo=US → only US data. (7) Export CSV → data matches UI. (8) 20 brokers × 90 days < 2 сек.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Data accuracy verified on seed data
- **Оценка:** 4h
- **Story:** [STORY-164]

---

#### [STORY-165] История изменений статусов с подсветкой аномалий
**Как** Affiliate Manager, **я хочу** видеть полную историю изменений статусов каждого лида с подсветкой подозрительных изменений, **чтобы** быстро идентифицировать конкретные случаи shaving.
**Acceptance Criteria:**
- [ ] AC1: API `GET /api/v1/leads/{id}/status-history` — полная история: [{timestamp, broker_status, unified_status, previous_unified_status, source (postback/manual/api), is_rollback (bool), is_anomaly (bool), anomaly_reason}]. Sorted by timestamp ASC
- [ ] AC2: Timeline visualization: вертикальная timeline с dots (зелёный: positive change, красный: negative/rollback, жёлтый: lateral). Anomaly: пульсирующая красная рамка с tooltip (причина аномалии)
- [ ] AC3: Anomaly types: (1) Rollback (статус понизился), (2) Late reversal (> 48h после positive), (3) Rapid changes (> 3 изменения за 1 час), (4) Weekend/off-hours change (вне рабочих часов брокера)
- [ ] AC4: Bulk view: страница "Status Changes" — таблица всех status changes за период с фильтром is_anomaly=true. Для быстрого поиска подозрительных изменений среди тысяч лидов
- [ ] AC5: Загрузка истории per lead < 500ms. Bulk view загрузка < 2 сек для 10K changes
- [ ] AC6: "Report Shaving" button на anomaly: создаёт shave alert с pre-filled evidence из этого лида
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-18]
**Зависит от:** [STORY-161], [STORY-162]

##### Tasks для STORY-165:
**[TASK-0614] Реализовать backend status history с anomaly detection**
- **Тип:** Backend
- **Описание:** (1) Таблица `lead_status_history` (если не существует): id, lead_id, broker_status, unified_status, previous_unified_status, source (postback/manual/api), is_rollback, is_anomaly, anomaly_type (enum: rollback, late_reversal, rapid_change, off_hours), created_at. (2) Trigger: при каждом status change → insert в history, calculate is_rollback (new rank < previous rank), detect anomalies inline. (3) API: GET per lead (sorted ASC). GET bulk: `/api/v1/status-history/anomalies` — filtered by is_anomaly=true, paginated. (4) "Report Shaving": POST `/api/v1/shave-detection/alerts/from-lead/{lead_id}` — create alert с evidence from status history.
- **Критерии готовности (DoD):**
  - [ ] Status history записывается при каждом изменении
  - [ ] Anomaly detection inline (rollback, late_reversal, rapid_change, off_hours)
  - [ ] Per-lead API < 500ms
  - [ ] Bulk anomalies API < 2 сек
  - [ ] Report Shaving создаёт alert
- **Оценка:** 8h
- **Story:** [STORY-165]

**[TASK-0615] Реализовать Frontend — status history timeline и bulk view**
- **Тип:** Frontend
- **Описание:** (1) Lead Detail > Status History tab: vertical timeline. Each dot: timestamp, broker_status → unified_status, source badge. Color: green (positive), red (rollback), yellow (lateral), grey (no change). Anomaly: red pulsing border + anomaly type label + tooltip with details. (2) "Report Shaving" button on anomaly dots → confirmation → creates alert. (3) Bulk view page: table (lead ID, broker, old status, new status, anomaly type, timestamp). Filter: is_anomaly toggle, broker, date_range, anomaly_type. (4) Inline link to lead detail from bulk view.
- **Критерии готовности (DoD):**
  - [ ] Timeline с цветовыми dot'ами
  - [ ] Anomaly highlighting с pulsing border
  - [ ] Report Shaving button
  - [ ] Bulk view с фильтрами
  - [ ] Link to lead detail
- **Оценка:** 8h
- **Story:** [STORY-165]

**[TASK-0616] QA тесты status history**
- **Тип:** QA
- **Описание:** (1) Status change → history record created. (2) Rollback (deposited → rejected) → is_rollback=true, is_anomaly=true. (3) Late reversal (>48h) → anomaly_type=late_reversal. (4) 4 changes in 1h → rapid_change anomaly. (5) Timeline: dots colored correctly. (6) Bulk view: filter anomalies only → only anomalous records. (7) Report Shaving → alert created with lead evidence. (8) Per-lead history < 500ms.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Anomaly types correctly detected
- **Оценка:** 4h
- **Story:** [STORY-165]

---

#### [STORY-166] Генерация shave-отчётов для dispute resolution
**Как** Finance Manager, **я хочу** генерировать детальные отчёты о shaving для предъявления брокеру, **чтобы** иметь доказательную базу при dispute и recovery потерянного revenue.
**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/shave-detection/reports` создаёт dispute report: broker_id, date_range, include_evidence (bool). Report содержит: summary (total leads affected, total estimated loss, shave rate %), detailed evidence table (lead_id, original_status, rolled_back_status, timestamps, time_delta), pattern analysis (clustering around payout dates, affected GEOs, affected affiliates)
- [ ] AC2: PDF export: branded document (company logo, date, "Shave Report for [Broker Name]"), executive summary, evidence table, pattern visualizations (charts), appendix с raw data. Professional format suitable for dispute
- [ ] AC3: Report templates: "Standard Dispute" (summary + top 20 evidence items), "Full Audit" (all evidence + pattern analysis), "Quick Summary" (numbers only, 1 page)
- [ ] AC4: Historical reports: saved in system, accessible for 2 years. List of generated reports with download links
- [ ] AC5: Signature: option to add digital timestamp (proof that report was generated at specific time — non-repudiation for legal purposes). SHA-256 hash of report content stored
- [ ] AC6: Generation < 30 сек for report covering 90 days × 500 affected leads
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-18]
**Зависит от:** [STORY-162]

##### Tasks для STORY-166:
**[TASK-0617] Реализовать backend shave report generator**
- **Тип:** Backend
- **Описание:** (1) Таблица `shave_reports`: id, company_id, broker_id, date_range_from, date_range_to, template (standard/full/quick), total_leads_affected, estimated_loss, shave_rate_pct, report_hash (SHA-256), file_key (S3), generated_by, generated_at, expires_at (2 years). (2) Report generation: query shave evidence for broker + date_range → aggregate summary → format evidence table → pattern analysis (date clustering, GEO distribution, affiliate distribution) → generate PDF (using headless Chrome/wkhtmltopdf) → upload S3 → store hash. (3) Templates: Standard (summary + 20 items, ~3 pages), Full (all items + charts, up to 50 pages), Quick (1 page summary). (4) Hash: SHA-256 of PDF content for integrity verification. (5) Async generation: return 202, poll status.
- **Критерии готовности (DoD):**
  - [ ] 3 report templates генерируются
  - [ ] PDF с logos, charts, evidence tables
  - [ ] SHA-256 hash stored
  - [ ] Generation < 30 сек for 500 leads
  - [ ] S3 storage с 2-year retention
  - [ ] Async generation pipeline
- **Оценка:** 16h
- **Story:** [STORY-166]

**[TASK-0618] Реализовать Frontend — shave report generation UI**
- **Тип:** Frontend
- **Описание:** (1) "Generate Report" button на Shave Detection page (per broker или selected alerts). (2) Report wizard: select broker, date range, template (Standard/Full/Quick), include digital timestamp checkbox. (3) Generation status: progress indicator. (4) Report list: table (broker, date range, template, leads affected, loss, generated date, download button, verify hash button). (5) Download: PDF. (6) Verify: upload any PDF → compare hash → "Authentic" or "Modified" badge.
- **Критерии готовности (DoD):**
  - [ ] Report generation wizard
  - [ ] Progress indicator
  - [ ] Report list с downloads
  - [ ] Hash verification tool
- **Оценка:** 8h
- **Story:** [STORY-166]

**[TASK-0619] QA тесты shave reports**
- **Тип:** QA
- **Описание:** (1) Generate Standard report → PDF с summary + 20 items. (2) Generate Full report → all evidence + charts. (3) Quick report → 1 page. (4) Hash verification: original PDF → "Authentic". Modified PDF → "Modified". (5) 500 leads × 90 days < 30 сек. (6) Branding: company logo in PDF. (7) Report accessible for 2 years. (8) Кириллица в PDF корректна.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] PDF opens correctly in multiple viewers
  - [ ] Hash verification works
- **Оценка:** 4h
- **Story:** [STORY-166]

---

#### [STORY-167] Настраиваемые пороги и правила shave detection per broker
**Как** Network Admin, **я хочу** настраивать пороги и правила shave detection индивидуально для каждого брокера, **чтобы** учитывать специфику работы разных брокеров и уменьшить false positives.
**Acceptance Criteria:**
- [ ] AC1: API `PUT /api/v1/shave-detection/config/{broker_id}` — per-broker config: `rollback_threshold_pct` (min % rollbacks to trigger, default 5%), `conversion_drop_threshold_pct` (default 30%), `late_reversal_hours` (default 48h), `payout_correlation_enabled` (default true), `auto_pause_enabled` (default false для medium, true для high), `whitelist_statuses[]` (статусы, rollback которых не считается shaving — напр. "callback_scheduled" → "no_answer" может быть легитимно)
- [ ] AC2: Global defaults: конфигурация по умолчанию для всех новых брокеров. Per-broker config overrides global
- [ ] AC3: A/B тестирование пороги: возможность запустить два набора thresholds параллельно (shadow mode) для сравнения detection rates → выбрать оптимальный набор
- [ ] AC4: Threshold recommendations: система предлагает оптимальные пороги на основе исторических данных (analyzed false positive rate per threshold level)
- [ ] AC5: UI: per-broker settings page с sliders, toggles, whitelist editor. Preview: "With these settings, X alerts would have been generated last 30 days (Y confirmed shaving, Z false positives)"
- [ ] AC6: Audit log для изменений конфигурации
**Story Points:** 5
**Приоритет:** Could
**Epic:** [EPIC-18]
**Зависит от:** [STORY-162]

##### Tasks для STORY-167:
**[TASK-0620] Реализовать backend configurable thresholds**
- **Тип:** Backend
- **Описание:** (1) Таблица `shave_detection_config`: id, company_id, broker_id (nullable for global default), rollback_threshold_pct, conversion_drop_threshold_pct, late_reversal_hours, payout_correlation_enabled, auto_pause_enabled, whitelist_statuses (text[]), updated_by, updated_at. (2) Config resolution: per-broker config || global config || system defaults. (3) Preview endpoint: POST `/api/v1/shave-detection/config/preview` — accepts config, runs detection algorithm on last 30 days data → returns would-be alerts count, estimated FP rate. (4) Threshold recommendations: analyze historical alerts + admin actions (dismiss/confirm) → suggest thresholds that minimize FP while maintaining detection. (5) Shadow mode: run two configs in parallel, compare results, store both for analysis.
- **Критерии готовности (DoD):**
  - [ ] Per-broker и global config
  - [ ] Config resolution cascade
  - [ ] Preview endpoint
  - [ ] Threshold recommendations
  - [ ] Shadow mode
  - [ ] Audit log
- **Оценка:** 8h
- **Story:** [STORY-167]

**[TASK-0621] Реализовать Frontend — shave detection config UI**
- **Тип:** Frontend
- **Описание:** (1) Global Settings page: sliders for each threshold, toggles, whitelist editor (add/remove status chips). (2) Per-broker override: on broker detail page > "Shave Detection" tab. Same controls with "Override global" toggle per parameter. (3) Preview panel: "With these settings: X alerts last 30 days (Y confirmed, Z false positives)". Auto-refresh on parameter change (debounced 1s). (4) Recommendations: "Recommended" badge next to suggested values. "Apply Recommended" button. (5) Shadow mode: toggle "Run in shadow mode" → results comparison table after 7 days.
- **Критерии готовности (DoD):**
  - [ ] Global и per-broker config UI
  - [ ] Preview с live update
  - [ ] Recommendations display
  - [ ] Shadow mode toggle
  - [ ] Whitelist editor
- **Оценка:** 8h
- **Story:** [STORY-167]

**[TASK-0622] QA тесты configurable thresholds**
- **Тип:** QA
- **Описание:** (1) Set rollback_threshold=10% → only trigger if > 10% rollbacks. (2) Per-broker override → uses broker config, not global. (3) Whitelist "no_answer" → callback→no_answer rollback not flagged. (4) Preview: matches actual detection on historical data. (5) Recommendations: suggested values reduce FP vs current. (6) Shadow mode: two configs produce different alert counts. (7) Audit log: config change recorded.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Preview accuracy verified against actual detection
- **Оценка:** 4h
- **Story:** [STORY-167]

---

## [EPIC-19] Public API & Developer Portal
**Цель:** Создать полноценный Developer Experience: auto-generated OpenAPI/Swagger документацию, публичный developer portal с guides и tutorials, SDK для популярных языков (JavaScript, Python, PHP), sandbox-окружение для тестирования, интерактивный API Explorer в браузере, changelog с версионированием и инструменты для тестирования webhook-ов. Слабая документация — главная проблема Elnopy (weak docs). Мы создадим лучший DX в индустрии.
**Метрика успеха:**
- Time to first successful API call для нового разработчика < 15 минут (measured from portal landing to successful request)
- API documentation coverage: 100% endpoints documented с примерами
- SDK adoption: >= 50% API-клиентов используют SDK (а не raw HTTP)
- Sandbox usage: >= 70% новых интеграций протестированы в sandbox перед production
- Developer NPS >= 50
- Среднее время решения issue через portal (docs + sandbox) < 30 мин
**Приоритет:** P2 (Growth)
**Зависит от:** [EPIC-01], [EPIC-06]
**Оценка:** L

### Stories:

---

#### [STORY-168] Автогенерация OpenAPI/Swagger документации
**Как** Developer, **я хочу** иметь актуальную OpenAPI 3.0 спецификацию, автоматически генерируемую из кода, **чтобы** всегда работать с точной и свежей документацией API.
**Acceptance Criteria:**
- [ ] AC1: OpenAPI 3.0 spec генерируется автоматически из Go-кода (annotations/comments или struct tags). Каждый endpoint: path, method, summary, description, parameters, request body (JSON Schema), responses (200/400/401/403/404/422/429/500), security requirements
- [ ] AC2: Спецификация доступна по URL: `/api/v1/openapi.json` и `/api/v1/openapi.yaml`. Swagger UI доступен по `/api/docs` (embedded, не требует отдельного деплоя). ReDoc альтернатива по `/api/redoc`
- [ ] AC3: 100% coverage: все API endpoints документированы. CI check: если endpoint не имеет OpenAPI annotations → build fails с ошибкой "Endpoint X missing documentation"
- [ ] AC4: Examples: каждый endpoint имеет минимум 1 request example и 1 response example (success + error). Examples генерируются из unit test fixtures или вручную
- [ ] AC5: Versioning: spec включает API version (v1). При добавлении нового endpoint → spec обновляется автоматически при следующем deploy. Breaking changes помечаются deprecated с sunset date
- [ ] AC6: Authentication documentation: описание всех auth flows (API key, JWT, OAuth2). "Try it out" в Swagger UI работает с реальным API key
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-19]
**Зависит от:** —

##### Tasks для STORY-168:
**[TASK-0623] Настроить автогенерацию OpenAPI из Go-кода**
- **Тип:** Backend
- **Описание:** (1) Интегрировать swaggo/swag или go-swagger для генерации OpenAPI 3.0 spec из Go struct tags и comments. (2) Для каждого handler: добавить annotations (@Summary, @Description, @Param, @Success, @Failure, @Security, @Router). (3) Настроить CI pipeline: `swag init` → generate spec → validate (openapi-generator validate) → commit spec file. (4) Serve spec: GET `/api/v1/openapi.json` — return generated spec. (5) Embed Swagger UI: static files served at `/api/docs` (swagger-ui-dist npm package embedded). (6) Embed ReDoc: served at `/api/redoc`. (7) CI check: custom script verifies all routes in router have corresponding annotations → fail if missing.
- **Критерии готовности (DoD):**
  - [ ] OpenAPI spec генерируется из кода
  - [ ] Swagger UI работает по /api/docs
  - [ ] ReDoc работает по /api/redoc
  - [ ] CI check: no undocumented endpoints
  - [ ] Spec validates without errors
- **Оценка:** 16h
- **Story:** [STORY-168]

**[TASK-0624] Добавить annotations ко всем существующим endpoints**
- **Тип:** Backend
- **Описание:** Пройти по всем существующим API handlers и добавить OpenAPI annotations: summary, description, param descriptions, request/response schemas, error responses, security tags. Приоритет: (1) Lead API (intake, list, detail), (2) Routing API, (3) Broker API, (4) Analytics API, (5) Settings API. Для каждого endpoint: минимум 1 request example, 1 success response example, 1 error response example.
- **Критерии готовности (DoD):**
  - [ ] 100% endpoints annotated
  - [ ] Examples для каждого endpoint
  - [ ] CI check passes (no missing annotations)
  - [ ] Generated spec has 0 validation errors
- **Оценка:** 16h
- **Story:** [STORY-168]

**[TASK-0625] QA тесты OpenAPI spec**
- **Тип:** QA
- **Описание:** (1) /api/v1/openapi.json → valid OpenAPI 3.0. (2) /api/docs → Swagger UI loads. (3) /api/redoc → ReDoc loads. (4) "Try it out" в Swagger UI → real API call works with valid API key. (5) All endpoints present in spec (compare with router). (6) Request/response examples valid JSON. (7) Error responses documented (400, 401, 403, 404, 422, 429, 500). (8) Deprecated endpoints marked with sunset date.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Spec validation: 0 errors, 0 warnings
  - [ ] Cross-check: routes in code == endpoints in spec
- **Оценка:** 4h
- **Story:** [STORY-168]

---

#### [STORY-169] Developer Portal Website
**Как** Developer, **я хочу** иметь developer portal с документацией, guides и tutorials, **чтобы** быстро разобраться в API и начать интеграцию.
**Acceptance Criteria:**
- [ ] AC1: Static site (Next.js/Docusaurus/Mintlify): pages: Getting Started, Authentication, API Reference (auto-generated from OpenAPI), Guides (step-by-step), Tutorials, SDKs, Changelog, FAQ, Support. Hosted на developers.gambchamp.com
- [ ] AC2: Getting Started guide: от регистрации до первого API call за 5 шагов (< 15 мин). Copy-paste готовые примеры для curl, JavaScript, Python, PHP
- [ ] AC3: Search: full-text search по всей документации. Результаты < 500ms. Highlight совпадений. Keyboard shortcut Cmd+K для поиска
- [ ] AC4: Code examples: для каждого endpoint — examples на 4 языках (curl, JavaScript, Python, PHP). Tabs для переключения языка. Syntax highlighting. Copy button
- [ ] AC5: Interactive: code examples с "Run" button (отправляет запрос в sandbox environment). Response отображается inline
- [ ] AC6: Versioning: documentation versioned by API version (v1, v2...). Version selector dropdown. Old versions accessible but marked as deprecated
- [ ] AC7: SEO: все страницы индексируются, meta tags, sitemap.xml, structured data (HowTo schema)
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168]

##### Tasks для STORY-169:
**[TASK-0626] Настроить developer portal infrastructure**
- **Тип:** DevOps
- **Описание:** (1) Выбрать и настроить SSG: Docusaurus 3 или Mintlify. (2) Domain: developers.gambchamp.com (DNS + SSL). (3) CI/CD: push to docs repo → build → deploy to CDN (Vercel/Cloudflare Pages/S3+CloudFront). (4) OpenAPI spec sync: auto-import openapi.json from main API repo → generate API Reference pages. (5) Search: Algolia DocSearch или built-in search. (6) Analytics: track page views, time on page, search queries (for improving docs).
- **Критерии готовности (DoD):**
  - [ ] Site builds and deploys
  - [ ] Custom domain с SSL
  - [ ] CI/CD pipeline
  - [ ] API Reference auto-generated from spec
  - [ ] Search работает < 500ms
- **Оценка:** 8h
- **Story:** [STORY-169]

**[TASK-0627] Написать документацию (Getting Started, Guides, Tutorials)**
- **Тип:** Docs
- **Описание:** (1) Getting Started: 5-step guide (Create Account → Get API Key → Install SDK → Send First Lead → Check Status). Code examples in 4 languages. (2) Authentication Guide: API Key management, JWT tokens, OAuth2 flow, security best practices. (3) Lead Integration Guide: send leads, check statuses, handle postbacks, error handling. (4) Routing Guide: create flows, configure weights, manage caps. (5) Webhook Guide: setup endpoints, signature verification, retry handling. (6) Analytics Guide: query reports, export data. (7) FAQ: top 20 questions (from support tickets analysis). Каждый guide: step-by-step, screenshots, code examples, common errors section.
- **Критерии готовности (DoD):**
  - [ ] 7 guides написаны
  - [ ] Code examples на 4 языках для каждого guide
  - [ ] Screenshots/diagrams для сложных flows
  - [ ] FAQ с 20 вопросами
  - [ ] Reviewed by dev team (technical accuracy)
- **Оценка:** 16h
- **Story:** [STORY-169]

**[TASK-0628] Реализовать multi-language code examples component**
- **Тип:** Frontend
- **Описание:** React component CodeExample: (1) Language tabs (curl, JavaScript, Python, PHP). (2) Syntax highlighting (Prism.js или Shiki). (3) Copy button (top-right corner, "Copied!" toast). (4) "Run" button (отправляет запрос в sandbox → показывает response inline). (5) Response panel: syntax-highlighted JSON, status code badge, timing. (6) Error state: если sandbox unavailable → grey out Run button с tooltip. (7) Persistent language preference: last selected language saved in localStorage.
- **Критерии готовности (DoD):**
  - [ ] 4 language tabs
  - [ ] Syntax highlighting
  - [ ] Copy button
  - [ ] Run button → sandbox request
  - [ ] Language preference persistent
- **Оценка:** 8h
- **Story:** [STORY-169]

**[TASK-0629] QA тесты developer portal**
- **Тип:** QA
- **Описание:** (1) All pages load without errors. (2) Search: query "lead" → relevant results < 500ms. (3) Code examples: 4 languages present for key endpoints. (4) Copy button → clipboard correct. (5) "Run" button → sandbox response. (6) API Reference matches current API spec. (7) Mobile responsive: readable on phone. (8) SEO: sitemap.xml valid, meta tags present. (9) Broken links: 0 broken internal links.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Link checker: 0 broken links
  - [ ] Lighthouse: Performance >= 90, SEO >= 95
- **Оценка:** 4h
- **Story:** [STORY-169]

---

#### [STORY-170] SDKs (JavaScript, Python, PHP)
**Как** Developer, **я хочу** использовать official SDK на моём языке программирования, **чтобы** интегрироваться быстрее и с меньшим количеством ошибок.
**Acceptance Criteria:**
- [ ] AC1: SDKs для 3 языков: JavaScript/TypeScript (npm package), Python (PyPI package), PHP (Composer/Packagist). Генерируются из OpenAPI spec (openapi-generator или custom) + ручная доработка для удобства использования
- [ ] AC2: SDK функциональность: (1) Authentication (API key setup), (2) Lead operations (create, list, get, update status), (3) Routing (flows CRUD, caps management), (4) Analytics (query reports), (5) Webhooks (signature verification helper). Typed responses (TypeScript types, Python dataclasses, PHP typed arrays)
- [ ] AC3: Error handling: SDK оборачивает HTTP errors в typed exceptions (RateLimitError, AuthenticationError, ValidationError, NotFoundError). Retry logic: automatic retry on 429 и 503 с exponential backoff (configurable, default 3 retries)
- [ ] AC4: Documentation: README.md в каждом SDK repo с Quick Start, API reference (auto-generated), code examples. Published to package registries
- [ ] AC5: Версионирование: SDK version follows API version. Breaking changes в SDK → major version bump. Deprecation warnings для removed features
- [ ] AC6: Quality: >= 80% test coverage. CI: lint + tests + build on every PR. Published automatically on tag push
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168]

##### Tasks для STORY-170:
**[TASK-0630] Генерировать и доработать JavaScript/TypeScript SDK**
- **Тип:** Backend
- **Описание:** (1) Генерация из OpenAPI spec: openapi-generator с template typescript-fetch или custom. (2) Доработка: GambChampClient class с constructor(apiKey, options?). Methods: leads.create(), leads.list(), leads.get(), routing.flows.list(), caps.update(), analytics.query(), etc. (3) TypeScript types: full typing for all request/response objects. (4) Retry logic: configurable retries on 429/503. (5) Webhook helper: verifySignature(payload, signature, secret). (6) Tests: Jest, >= 80% coverage. (7) Build: tsup → ESM + CJS. (8) Publish: npm package @gambchamp/sdk.
- **Критерии готовности (DoD):**
  - [ ] npm package publishes
  - [ ] All major API operations covered
  - [ ] TypeScript types complete
  - [ ] Retry logic works
  - [ ] Webhook signature verification
  - [ ] Tests >= 80% coverage
  - [ ] README с Quick Start
- **Оценка:** 16h
- **Story:** [STORY-170]

**[TASK-0631] Генерировать и доработать Python SDK**
- **Тип:** Backend
- **Описание:** (1) Генерация из OpenAPI spec. (2) Доработка: GambChampClient(api_key, base_url, options). Methods: client.leads.create(), client.leads.list(), etc. (3) Python typing: dataclasses для request/response, type hints на всех methods. (4) Async support: asyncio compatible (aiohttp). (5) Retry: tenacity library, configurable. (6) Webhook: verify_signature(payload, signature, secret). (7) Tests: pytest, >= 80% coverage. (8) Publish: PyPI package gambchamp-sdk.
- **Критерии готовности (DoD):**
  - [ ] PyPI package publishes
  - [ ] Sync и async clients
  - [ ] Typed dataclasses
  - [ ] Retry logic
  - [ ] Tests >= 80%
  - [ ] README
- **Оценка:** 16h
- **Story:** [STORY-170]

**[TASK-0632] Генерировать и доработать PHP SDK**
- **Тип:** Backend
- **Описание:** (1) Генерация из OpenAPI spec. (2) Доработка: GambChampClient(apiKey, options). Methods: $client->leads()->create(), $client->leads()->list(), etc. (3) PHP 8.1+ typing: typed properties, union types, enums. (4) Guzzle HTTP client. (5) Retry middleware: configurable. (6) Webhook: WebhookValidator::verify($payload, $signature, $secret). (7) Tests: PHPUnit, >= 80% coverage. (8) Publish: Packagist gambchamp/sdk.
- **Критерии готовности (DoD):**
  - [ ] Packagist package publishes
  - [ ] PHP 8.1+ typed
  - [ ] Guzzle HTTP
  - [ ] Retry middleware
  - [ ] Tests >= 80%
  - [ ] README
- **Оценка:** 16h
- **Story:** [STORY-170]

**[TASK-0633] QA тесты SDKs**
- **Тип:** QA
- **Описание:** (1) JS SDK: create lead → success. (2) Python SDK: list leads → correct data. (3) PHP SDK: update cap → cap changed. (4) JS: rate limit → auto-retry → success. (5) Python: invalid API key → AuthenticationError. (6) PHP: webhook signature → verified. (7) All SDKs: test against real sandbox API (integration test). (8) Version compatibility: SDK works with current API version.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят (integration tests against sandbox)
  - [ ] All 3 SDKs pass their own test suites
  - [ ] README instructions: follow step-by-step → works
- **Оценка:** 8h
- **Story:** [STORY-170]

---

#### [STORY-171] Sandbox Environment (тестовое окружение)
**Как** Developer, **я хочу** иметь sandbox-окружение для тестирования API без влияния на production данные, **чтобы** безопасно разрабатывать и тестировать интеграции.
**Acceptance Criteria:**
- [ ] AC1: Sandbox environment: отдельный instance API (sandbox.api.gambchamp.com) с собственной БД. Sandbox API key отличается от production (prefix `sb_` vs `pk_`). Sandbox данные изолированы от production
- [ ] AC2: Sandbox limitations: максимум 1000 лидов per sandbox account. Данные автоматически удаляются через 30 дней. Postbacks не отправляются реальным брокерам — используются mock brokers (simulate responses)
- [ ] AC3: Mock brokers: 5 предустановленных mock brokers с разным поведением: "Always Accept", "50% Accept", "Slow Responder (3s delay)", "Random Errors (20%)", "Cap Limited (10/day)". Разработчик может настроить custom mock поведение
- [ ] AC4: Sandbox management: API `/api/v1/sandbox/reset` — сброс всех sandbox данных. `/api/v1/sandbox/seed` — заполнить тестовыми данными (100 лидов, 5 affiliates, 3 flows)
- [ ] AC5: Sandbox доступен бесплатно для всех зарегистрированных пользователей. Rate limit: 100 req/min (vs 1000 production)
- [ ] AC6: Sandbox API идентичен production API (same endpoints, same validation, same error codes). Единственное отличие: mock brokers и data isolation
**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168]

##### Tasks для STORY-171:
**[TASK-0634] Развернуть sandbox infrastructure**
- **Тип:** DevOps
- **Описание:** (1) Separate Kubernetes namespace `sandbox` или отдельный ECS cluster. (2) Separate PostgreSQL instance (smaller: db.t3.medium). (3) Separate Redis instance. (4) DNS: sandbox.api.gambchamp.com → sandbox load balancer. (5) Same Docker image as production, но с env ENVIRONMENT=sandbox. (6) Sandbox-specific config: mock broker endpoints, reduced rate limits, auto-cleanup cron. (7) Monitoring: basic (no PagerDuty, only Slack alerts for downtime). (8) Auto-deploy: sandbox deploys from main branch, same as production but 1h earlier (canary).
- **Критерии готовности (DoD):**
  - [ ] Sandbox environment running и accessible
  - [ ] DNS configured
  - [ ] Isolated DB и Redis
  - [ ] Auto-deploy pipeline
  - [ ] Monitoring setup
- **Оценка:** 16h
- **Story:** [STORY-171]

**[TASK-0635] Реализовать mock broker service и sandbox management API**
- **Тип:** Backend
- **Описание:** (1) Mock Broker Service: HTTP server accepting lead pushes. 5 preset behaviors (configurable via JSONB config): AlwaysAccept (return 200, random FTD after 1-24h), HalfAccept (50% 200, 50% rejection), SlowResponder (3s delay then 200), RandomErrors (20% 500), CapLimited (accept first 10/day then 422). (2) Custom mock: API to configure response_code, delay_ms, acceptance_rate, ftd_probability, response_body_template. (3) Sandbox management API: POST `/api/v1/sandbox/reset` — truncate all user data. POST `/api/v1/sandbox/seed` — insert 100 leads, 5 affiliates, 3 flows, 5 mock broker integrations. (4) Cleanup cron: daily, delete data older than 30 days. (5) Limits: 1000 leads per account (check on lead create). (6) API key prefix: sandbox keys start with `sb_`, production with `pk_`. Middleware check: sb_ key only works on sandbox URL.
- **Критерии готовности (DoD):**
  - [ ] 5 mock broker behaviors work
  - [ ] Custom mock configuration
  - [ ] Reset и Seed APIs
  - [ ] 30-day auto-cleanup
  - [ ] 1000 lead limit
  - [ ] API key prefix validation
- **Оценка:** 16h
- **Story:** [STORY-171]

**[TASK-0636] QA тесты sandbox**
- **Тип:** QA
- **Описание:** (1) Sandbox API key works on sandbox URL. (2) Production API key rejected on sandbox. (3) Create lead → sent to mock broker → status updated. (4) AlwaysAccept mock → all leads accepted. (5) CapLimited mock → 11th lead rejected. (6) Reset → all data deleted. (7) Seed → test data created. (8) 1001st lead → limit error. (9) 31-day-old data → auto-deleted. (10) Same endpoints as production (compare route lists).
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] API parity: sandbox routes == production routes
  - [ ] Mock broker behaviors verified
- **Оценка:** 8h
- **Story:** [STORY-171]

---

#### [STORY-172] API Explorer (интерактивный тестер в браузере)
**Как** Developer, **я хочу** тестировать API endpoints прямо в браузере без установки инструментов, **чтобы** быстро экспериментировать и отлаживать интеграцию.
**Acceptance Criteria:**
- [ ] AC1: API Explorer page на developer portal: список всех endpoints (grouped by resource: Leads, Routing, Brokers, Analytics, etc.). Каждый endpoint: method badge (GET green, POST blue, PUT orange, DELETE red), path, summary
- [ ] AC2: Request builder: при клике на endpoint → form: (1) Parameters (path, query) с type validation, (2) Headers (Authorization pre-filled), (3) Request Body (JSON editor с syntax highlighting и validation against schema), (4) "Send" button
- [ ] AC3: Response viewer: status code (color badge), headers (collapsible), body (formatted JSON, syntax highlighted), timing (ms). Error responses: highlighted с описанием ошибки из документации
- [ ] AC4: Environment selector: Sandbox / Production. Default: Sandbox. Warning при switch to Production: "Caution: this will send real requests to production"
- [ ] AC5: Request history: последние 50 requests per session (method, path, status, time). Click → replay request. "Save as example" → save to personal collection
- [ ] AC6: Code generation: после успешного request → "Generate Code" button → curl / JavaScript / Python / PHP code для повторения этого request. Copy button
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168], [STORY-171]

##### Tasks для STORY-172:
**[TASK-0637] Реализовать API Explorer frontend**
- **Тип:** Frontend
- **Описание:** (1) Endpoint List: sidebar с grouped endpoints (collapsible resource sections). Search/filter. Method badges. (2) Request Builder: dynamic form generated from OpenAPI spec. Path params: inline inputs in URL. Query params: key-value editor. Headers: key-value with Authorization pre-filled. Body: Monaco Editor (JSON mode, schema validation, autocomlete from spec). (3) Send button → fetch to selected environment. (4) Response Viewer: status badge, timing, headers toggle, body (Monaco Editor readonly, JSON formatted). (5) Environment selector: radio (Sandbox/Production) с warning modal for production. (6) History panel: bottom drawer, 50 items, click to reload, "Generate Code" button per item.
- **Критерии готовности (DoD):**
  - [ ] Endpoint list из OpenAPI spec
  - [ ] Request builder с validation
  - [ ] Monaco Editor для body и response
  - [ ] Environment selector с warning
  - [ ] Request history (50 items)
  - [ ] Generate Code (4 languages)
- **Оценка:** 16h
- **Story:** [STORY-172]

**[TASK-0638] Реализовать code generation service**
- **Тип:** Backend
- **Описание:** POST `/api/v1/developer/generate-code` — принимает: method, url, headers, body. Возвращает: code snippets на 4 языках. (1) curl: с headers, body (--data-raw), auth. (2) JavaScript: fetch API с async/await. (3) Python: requests library. (4) PHP: Guzzle. Templates: Handlebars или Go templates. Proper escaping для каждого языка. Alternatively: client-side generation (OpenAPI spec → HTTPSnippet library).
- **Критерии готовности (DoD):**
  - [ ] 4 языка генерируются
  - [ ] Proper escaping (спецсимволы в body)
  - [ ] Generated code работает (verified: copy-paste → run → same response)
- **Оценка:** 4h
- **Story:** [STORY-172]

**[TASK-0639] QA тесты API Explorer**
- **Тип:** QA
- **Описание:** (1) Select endpoint → form matches OpenAPI schema. (2) Send to sandbox → response displayed. (3) Invalid body → validation error before send. (4) Switch to production → warning shown. (5) History: 50 items stored, click replays. (6) Generate Code → curl → copy → run → same response. (7) Generate Code → Python → works. (8) Auth header pre-filled correctly.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Generated code verified on 3 languages
- **Оценка:** 4h
- **Story:** [STORY-172]

---

#### [STORY-173] API Changelog и версионирование
**Как** Developer, **я хочу** видеть changelog API изменений и получать уведомления о breaking changes, **чтобы** своевременно обновлять свои интеграции.
**Acceptance Criteria:**
- [ ] AC1: Changelog page: хронологический список изменений (newest first). Каждая запись: date, version tag, type (added/changed/deprecated/removed/fixed/security), description, affected endpoints list. Markdown formatting
- [ ] AC2: Types color-coded: Added (green), Changed (blue), Deprecated (yellow), Removed (red), Fixed (grey), Security (purple). Filter by type
- [ ] AC3: Breaking changes highlighted: red banner "Breaking Change" с migration guide. Email notification to all developers с active API keys за 30 дней до deprecation deadline
- [ ] AC4: API versioning: URL-based (/api/v1/, /api/v2/). Old version supported минимум 12 месяцев после release нового. Sunset header в responses для deprecated versions
- [ ] AC5: Programmatic changelog: API `GET /api/v1/changelog` — JSON list of changes. RSS feed `/api/changelog.rss` для подписки в feed readers
- [ ] AC6: Status page integration: ссылка на API status page (uptime, incidents). Embedded status widget в developer portal header
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168], [STORY-169]

##### Tasks для STORY-173:
**[TASK-0640] Реализовать changelog system**
- **Тип:** Backend
- **Описание:** (1) Таблица `api_changelog`: id, version (varchar 20), date (date), type (enum: added, changed, deprecated, removed, fixed, security), title (varchar 200), description (text, markdown), affected_endpoints (text[]), is_breaking (bool), migration_guide (text, nullable), created_by, created_at. (2) API: GET `/api/v1/changelog` — paginated list. Filters: type, from_date, to_date, is_breaking. (3) RSS feed: GET `/api/changelog.rss` — Atom/RSS XML. (4) Admin API: POST/PUT/DELETE changelog entries. (5) Notification trigger: при is_breaking=true → queue email to all users с active API keys. Send 30 days before sunset date. (6) Sunset header: middleware checks endpoint deprecation → add Sunset: <date> header to responses.
- **Критерии готовности (DoD):**
  - [ ] Changelog CRUD для admin
  - [ ] Public API и RSS feed
  - [ ] Breaking change email notifications
  - [ ] Sunset header middleware
  - [ ] Filters by type и date
- **Оценка:** 8h
- **Story:** [STORY-173]

**[TASK-0641] Реализовать Frontend — changelog page**
- **Тип:** Frontend
- **Описание:** (1) Changelog page: timeline layout (date groups). Each entry: type badge (color-coded), title, description (markdown rendered), affected endpoints (code badges), migration guide (expandable). (2) Breaking changes: red banner at top of entry, "Migration Guide" button → expandable section. (3) Filters: type checkboxes, date range. (4) RSS subscribe button (link to /api/changelog.rss). (5) Search: full-text across all entries. (6) API version tabs: v1, v2 (when available). (7) Status widget: embedded in header (green dot "All systems operational" / red dot "Incident").
- **Критерии готовности (DoD):**
  - [ ] Timeline layout с type badges
  - [ ] Breaking changes highlighted
  - [ ] Migration guide expandable
  - [ ] Filters и search
  - [ ] RSS link
  - [ ] Status widget
- **Оценка:** 8h
- **Story:** [STORY-173]

**[TASK-0642] QA тесты changelog**
- **Тип:** QA
- **Описание:** (1) Changelog page loads with entries. (2) Filter by type=breaking → only breaking shown. (3) RSS feed valid (RSS validator). (4) Breaking change → email sent to API key holders. (5) Deprecated endpoint → Sunset header present. (6) Migration guide renders markdown. (7) API GET /changelog → JSON response. (8) Status widget reflects current status.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] RSS feed validates
  - [ ] Email delivery verified
- **Оценка:** 4h
- **Story:** [STORY-173]

---

#### [STORY-174] Rate Limiting документация и дашборд
**Как** Developer, **я хочу** видеть документацию по rate limits и мониторить своё текущее использование, **чтобы** планировать нагрузку и избегать 429 ошибок.
**Acceptance Criteria:**
- [ ] AC1: Rate limit documentation page: таблица endpoint groups с лимитами (requests/min, requests/hour, burst). Пример: Lead Create 100/min, Lead List 300/min, Analytics 30/min. Описание поведения при превышении (429 response, Retry-After header)
- [ ] AC2: Rate limit headers в каждом API response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix timestamp). При 429: `Retry-After` (seconds)
- [ ] AC3: Usage dashboard (developer portal): real-time charts per endpoint group: current usage vs limit (gauge chart), usage over last 24h (line chart), 429 errors count. Данные обновляются каждые 30 сек
- [ ] AC4: Alert configuration: developer может настроить warning email при usage > 80% лимита. "Approaching rate limit for Lead Create: 85/100 used"
- [ ] AC5: Rate limit increase request: form в portal для запроса повышения лимита. Fields: endpoint, current limit, requested limit, justification. Submit → creates ticket → admin reviews
- [ ] AC6: Rate limit tiers: Free (100/min), Starter (500/min), Professional (2000/min), Enterprise (custom). Tier shown in dashboard
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168], [STORY-169]

##### Tasks для STORY-174:
**[TASK-0643] Реализовать rate limit headers и usage tracking**
- **Тип:** Backend
- **Описание:** (1) Rate limit middleware: уже существует (EPIC-06), добавить response headers X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. При 429: Retry-After header. (2) Usage tracking: Redis sorted set per API key per endpoint group. Store request counts per minute (TTL 24h для history). (3) API: GET `/api/v1/developer/rate-limits` — current limits per endpoint group. GET `/api/v1/developer/usage` — usage history last 24h (per endpoint group, per minute aggregated to per hour). (4) Alert: check usage every minute, if > 80% → email (debounce: once per hour per endpoint group). (5) Rate limit increase: POST `/api/v1/developer/rate-limit-requests` — create ticket. Admin API: list, approve (update limits), reject.
- **Критерии готовности (DoD):**
  - [ ] Rate limit headers в всех responses
  - [ ] Usage tracking per endpoint group
  - [ ] Usage API с 24h history
  - [ ] Alert при > 80%
  - [ ] Rate limit increase request flow
- **Оценка:** 8h
- **Story:** [STORY-174]

**[TASK-0644] Реализовать Frontend — rate limit documentation и dashboard**
- **Тип:** Frontend
- **Описание:** (1) Docs page: table (Endpoint Group, Requests/min, Requests/hour, Burst, Description). Behavior section: 429 response format, Retry-After usage, backoff recommendations. (2) Dashboard page: per endpoint group: gauge chart (current usage/limit, color: green < 70%, yellow < 90%, red >= 90%), line chart (usage last 24h vs limit line). (3) 429 errors chart: bar chart per hour. (4) Alert settings: toggle + email input per endpoint group. (5) Rate limit increase: form (endpoint group, justification, requested limit) → submit → status tracking. (6) Tier display: current tier badge, comparison table of tiers.
- **Критерии готовности (DoD):**
  - [ ] Documentation table complete
  - [ ] Usage gauges и charts
  - [ ] 429 error tracking
  - [ ] Alert configuration
  - [ ] Increase request form
  - [ ] Tier display
- **Оценка:** 8h
- **Story:** [STORY-174]

**[TASK-0645] QA тесты rate limits**
- **Тип:** QA
- **Описание:** (1) API response contains X-RateLimit-* headers. (2) Exceed limit → 429 + Retry-After. (3) Dashboard shows current usage matching actual requests. (4) Usage > 80% → alert email. (5) Rate limit increase request → admin sees ticket. (6) Admin approve → limits updated. (7) Usage history chart covers 24h. (8) Tier badge matches account.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Headers verified on all endpoint groups
- **Оценка:** 4h
- **Story:** [STORY-174]

---

#### [STORY-175] Webhook Testing Tools
**Как** Developer, **я хочу** иметь инструменты для тестирования и отладки webhook-ов, **чтобы** убедиться что мой endpoint корректно обрабатывает события от CRM.
**Acceptance Criteria:**
- [ ] AC1: Webhook Tester page: temporary public URL (https://hooks.gambchamp.com/{uuid}) для приёма webhook-ов. Показывает все входящие requests в real-time (method, headers, body, timestamp). URL живёт 24 часа. Максимум 5 active URLs per user
- [ ] AC2: Manual trigger: кнопка "Send Test Event" — выбрать event type (lead_status_changed, ftd_received, cap_exhausted, broker_down) → отправить на настроенный webhook URL. Показать request sent и response received
- [ ] AC3: Signature verification tester: input fields (payload, signature, secret) → "Verify" button → "Valid" / "Invalid" с объяснением. Code examples для реализации verification на 4 языках
- [ ] AC4: Webhook delivery log: последние 100 webhook deliveries (target URL, event type, status code, response time, retry count). Expand → full request/response (headers + body). Filter by status (success/failure) и event type
- [ ] AC5: Retry simulator: показать как работает retry logic (1st attempt → failure → 2nd after 60s → failure → 3rd after 300s → success). Visual timeline
- [ ] AC6: Webhook health: uptime % вашего endpoint за 30 дней. Average response time. Failure rate. Alert если failure rate > 10%
**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-19]
**Зависит от:** [STORY-168], [STORY-171]

##### Tasks для STORY-175:
**[TASK-0646] Реализовать webhook testing backend**
- **Тип:** Backend
- **Описание:** (1) Temporary webhook receiver: create unique URL `https://hooks.gambchamp.com/{uuid}`. Store incoming requests in Redis (list, TTL 24h). WebSocket push to frontend for real-time display. Max 5 URLs per user, max 100 requests per URL. (2) Manual trigger: POST `/api/v1/developer/webhooks/test` — accepts event_type, target_url → generate mock event payload → send HTTP POST → return request + response. (3) Signature verification: POST `/api/v1/developer/webhooks/verify-signature` — accepts payload, signature, secret → verify HMAC-SHA256 → return valid/invalid + expected signature. (4) Delivery log: GET `/api/v1/webhooks/deliveries` — paginated, filterable. Store: webhook_deliveries table (url, event_type, request_headers, request_body, response_status, response_body, response_time_ms, retry_count, created_at). (5) Webhook health: aggregate delivery success rate per user endpoint per 30 days.
- **Критерии готовности (DoD):**
  - [ ] Temporary URL receiver works
  - [ ] Real-time display via WebSocket
  - [ ] Manual trigger sends и shows response
  - [ ] Signature verification correct
  - [ ] Delivery log с full request/response
  - [ ] Health metrics calculated
- **Оценка:** 16h
- **Story:** [STORY-175]

**[TASK-0647] Реализовать Frontend — webhook testing tools**
- **Тип:** Frontend
- **Описание:** (1) Webhook Tester tab: "Create Test URL" button → show URL with copy button. Real-time feed: as requests arrive (WebSocket) → card appears (method, timestamp, body preview). Click card → full details (headers, body formatted). (2) Manual Trigger tab: event type selector, target URL input (pre-filled with user's webhook URL), "Send" button → show sent request + received response side-by-side. (3) Signature Tester tab: 3 inputs (payload, signature, secret), "Verify" button, result badge. Code examples below (4 languages). (4) Delivery Log tab: table (event, target, status badge, time, retries), expand for details. Filter: status, event_type. (5) Health tab: uptime gauge, response time chart, failure rate chart, alert toggle.
- **Критерии готовности (DoD):**
  - [ ] Temporary URL creation и real-time display
  - [ ] Manual trigger с request/response view
  - [ ] Signature tester
  - [ ] Delivery log с filters
  - [ ] Health dashboard
- **Оценка:** 8h
- **Story:** [STORY-175]

**[TASK-0648] QA тесты webhook tools**
- **Тип:** QA
- **Описание:** (1) Create test URL → send POST → request appears in real-time. (2) Manual trigger: send lead_status_changed → webhook received. (3) Signature verify: valid → "Valid". (4) Signature verify: wrong secret → "Invalid". (5) Delivery log: 100 deliveries stored. (6) Filter failures only → correct. (7) 6th test URL → error. (8) URL expired after 24h → 404. (9) Health: success rate calculated correctly. (10) Alert at > 10% failure rate.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Real-time WebSocket tested under load (10 rapid requests)
  - [ ] Signature verification matches SDK implementation
- **Оценка:** 4h
- **Story:** [STORY-175]

---
# PRODUCT BACKLOG P3 (Scale) — EPIC-20 through EPIC-23

**Продукт:** GambChamp CRM — платформа дистрибуции лидов для крипто/форекс affiliate-маркетинга
**Версия:** 1.0
**Дата:** Март 2026
**Нумерация:** Stories начинаются с STORY-180, Tasks с TASK-0700

---

## [EPIC-20] White-Label & Multi-Tenant Platform

**Цель:** Предоставить enterprise-клиентам и реселлерам полноценный white-label режим с кастомными доменами, брендингом, изолированными инстансами и parent-account иерархией, чтобы платформа могла продаваться под чужим брендом и масштабироваться через партнёрскую сеть реселлеров.

**Метрика успеха:**
- Время запуска нового white-label клиента (от заявки до работающего инстанса) < 4 часов
- 0 инцидентов cross-tenant data leakage за 12 месяцев
- 10+ активных reseller-аккаунтов в первые 6 месяцев после релиза
- SSL-сертификат для кастомного домена выпускается автоматически < 15 минут
- 95% white-label клиентов настраивают брендинг самостоятельно без обращения в поддержку

**Приоритет:** P3 (Scale)
**Зависит от:** [EPIC-06]
**Оценка:** XL

---

### Stories:

---

#### [STORY-180] Подключение кастомного домена с автоматическим SSL

**Как** Network Admin, **я хочу** подключить кастомный домен (client.customdomain.com) с автоматическим выпуском SSL-сертификата, **чтобы** CRM выглядела как собственный продукт клиента и работала на его домене по HTTPS.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/whitelabel/domains` принимает `domain` (varchar 253, валидация RFC 1035), `tenant_id` (UUID). Возвращает HTTP 201 с `domain_id`, `status: pending_verification`, `dns_records: [{type: CNAME, name: ..., value: ...}]`. Максимум 5 доменов на tenant — при превышении HTTP 422 `DOMAIN_LIMIT_EXCEEDED`
- [ ] AC2: Система возвращает DNS-записи (CNAME), которые клиент должен добавить у регистратора. Фоновый worker проверяет DNS каждые 60 секунд в течение 72 часов. При успешной верификации — статус `dns_verified`
- [ ] AC3: После DNS-верификации автоматически запускается выпуск SSL-сертификата через Let's Encrypt / ACME. Сертификат выпускается < 15 минут. Статус переходит в `ssl_provisioned` → `active`
- [ ] AC4: API `GET /api/v1/whitelabel/domains` возвращает список доменов с пагинацией. Фильтры: status (pending_verification | dns_verified | ssl_provisioned | active | failed). Показывает оставшееся время на DNS-верификацию
- [ ] AC5: Автоматический renewal сертификата за 30 дней до истечения. При неудачном renewal — alert в Slack/email. Если renewal не удался за 7 дней до истечения — critical alert
- [ ] AC6: При удалении домена (`DELETE /api/v1/whitelabel/domains/{id}`) — revoke сертификата, удаление из reverse proxy конфигурации. Активный домен нельзя удалить без подтверждения force=true
- [ ] AC7: Multi-tenant изоляция: домен принадлежит только одному tenant. Попытка добавить уже занятый домен → HTTP 409 `DOMAIN_ALREADY_REGISTERED`

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-20]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-180:

**[TASK-0700] Спроектировать схему БД для white-label доменов**
- **Тип:** Backend
- **Описание:** Создать миграцию PostgreSQL для таблицы `whitelabel_domains`: `id` (UUID, PK), `tenant_id` (FK tenants), `domain` (varchar 253, unique), `status` (enum: pending_verification, dns_verified, ssl_provisioned, active, failed), `dns_records` (JSONB — массив записей для клиента), `ssl_certificate_id` (varchar, nullable — ID сертификата в vault), `ssl_expires_at` (timestamptz, nullable), `verified_at` (timestamptz, nullable), `verification_deadline` (timestamptz — created_at + 72h), `created_by` (FK users), `created_at` (timestamptz), `updated_at` (timestamptz). Индексы: `(tenant_id, status)`, `(domain)` UNIQUE, `(ssl_expires_at)` для renewal cron, `(status, verification_deadline)` для cleanup.
- **Критерии готовности (DoD):**
  - [ ] Миграция создана и применяется без ошибок на пустой и на существующей БД
  - [ ] Rollback-миграция работает корректно
  - [ ] Уникальность domain гарантируется на уровне БД (глобально, не per tenant)
  - [ ] Индексы покрывают основные query patterns
- **Оценка:** 2h
- **Story:** [STORY-180]

**[TASK-0701] Реализовать CRUD API для управления доменами**
- **Тип:** Backend
- **Описание:** Go-хэндлеры для POST/GET/DELETE `/api/v1/whitelabel/domains`. POST: валидация домена (RFC 1035, не localhost, не IP, не reserved TLD), проверка лимита 5 доменов per tenant, генерация CNAME-записей. GET: список с пагинацией (cursor-based, per_page 20-100), фильтр по status. DELETE: soft delete с force flag для active доменов. Tenant_id из JWT-контекста. Audit log для всех операций.
- **Критерии готовности (DoD):**
  - [ ] Все HTTP-методы работают согласно AC
  - [ ] Валидация домена отклоняет невалидные форматы (> 253 символов, спецсимволы, IP-адреса)
  - [ ] Лимит 5 доменов per tenant проверен с race condition protection (SELECT FOR UPDATE)
  - [ ] Multi-tenant изоляция: tenant A не видит домены tenant B
- **Оценка:** 8h
- **Story:** [STORY-180]

**[TASK-0702] Реализовать DNS verification worker**
- **Тип:** Backend
- **Описание:** Background worker (goroutine + ticker), который каждые 60 секунд проверяет домены в статусе `pending_verification`. Для каждого домена выполняет DNS lookup (CNAME) и сравнивает с ожидаемым значением. При совпадении — переводит статус в `dns_verified` и запускает SSL provisioning. При истечении 72 часов — переводит в `failed` с причиной `dns_timeout`. Retry логика: 3 попытки с exponential backoff при DNS ошибках. Метрики: dns_checks_total, dns_checks_success, dns_checks_timeout.
- **Критерии готовности (DoD):**
  - [ ] Worker проверяет DNS каждые 60 сек для pending доменов
  - [ ] Корректно обрабатывает DNS propagation delay (не фейлит при временных NXDOMAIN)
  - [ ] Таймаут 72 часа соблюдается
  - [ ] Prometheus метрики экспортируются
- **Оценка:** 8h
- **Story:** [STORY-180]

**[TASK-0703] Интеграция ACME/Let's Encrypt для автоматического SSL**
- **Тип:** Backend
- **Описание:** Сервис автоматического выпуска SSL через ACME протокол (Let's Encrypt). При переходе домена в `dns_verified` — инициирует ACME challenge (HTTP-01 или DNS-01), получает сертификат, сохраняет в secret manager (Vault / AWS Secrets Manager), обновляет reverse proxy конфигурацию (nginx/envoy). Auto-renewal cron job: за 30 дней до ssl_expires_at запускает renewal. Alert при failure: webhook в Slack + email.
- **Критерии готовности (DoD):**
  - [ ] SSL-сертификат выпускается < 15 минут после DNS verification
  - [ ] Сертификаты хранятся в secret manager, а не на файловой системе
  - [ ] Auto-renewal работает без downtime (hot reload в reverse proxy)
  - [ ] Alert при failure renewal отправляется корректно
- **Оценка:** 16h
- **Story:** [STORY-180]

**[TASK-0704] Frontend — UI мастер подключения домена**
- **Тип:** Frontend
- **Описание:** Страница "White-Label > Domains": (1) Таблица доменов: domain, status (цветной badge: зелёный active, жёлтый pending, красный failed), ssl_expires_at, actions. (2) Кнопка "Add Domain" → пошаговый wizard: шаг 1 — ввод домена с валидацией, шаг 2 — отображение DNS-записей с кнопкой "Copy to clipboard", шаг 3 — индикатор ожидания DNS verification (auto-refresh каждые 30 сек). (3) Детальная страница домена: статус, DNS-записи, SSL info, кнопка удаления с confirmation modal.
- **Критерии готовности (DoD):**
  - [ ] Wizard проходит все 3 шага без ошибок
  - [ ] DNS-записи копируются в clipboard одним кликом
  - [ ] Auto-refresh показывает прогресс верификации в реальном времени
  - [ ] Удаление active домена требует force confirmation с текстовым вводом имени домена
- **Оценка:** 8h
- **Story:** [STORY-180]

**[TASK-0705] DevOps — конфигурация reverse proxy для multi-domain**
- **Тип:** DevOps
- **Описание:** Настройка nginx/envoy для динамического routing по кастомным доменам. При добавлении нового домена — автоматическое обновление конфигурации через config reload (не restart). Поддержка wildcard для поддоменов. Health check endpoint для каждого домена. Rate limiting per domain: 1000 req/min. Мониторинг: Grafana dashboard с SSL expiry, domain health, request rates per domain.
- **Критерии готовности (DoD):**
  - [ ] Новый домен обслуживается без restart reverse proxy
  - [ ] Health check endpoint `/healthz` доступен на каждом кастомном домене
  - [ ] Rate limiting работает per domain
  - [ ] Grafana dashboard показывает все кастомные домены со статусами
- **Оценка:** 8h
- **Story:** [STORY-180]

**[TASK-0706] QA — тестирование полного цикла подключения домена**
- **Тип:** QA
- **Описание:** Тест-кейсы: (1) Happy path: добавление домена → DNS verification → SSL → active. (2) Невалидный домен → 422. (3) Занятый домен → 409. (4) 6-й домен → 422. (5) Таймаут DNS 72 часа → failed. (6) Удаление active домена без force → 409. (7) Удаление с force → success. (8) SSL renewal за 30 дней → success. (9) Multi-tenant isolation: tenant A не видит домены tenant B. (10) Race condition: два запроса на один домен одновременно.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Integration тесты с реальным DNS (staging zone)
  - [ ] Load test: 100 доменов одновременно без деградации
- **Оценка:** 8h
- **Story:** [STORY-180]

---

#### [STORY-181] Кастомизация брендинга (логотип, цвета, favicon, email-шаблоны)

**Как** Affiliate Manager, **я хочу** настроить логотип, цветовую схему, favicon и email-шаблоны для white-label инстанса, **чтобы** интерфейс и коммуникации полностью соответствовали бренду клиента.

**Acceptance Criteria:**
- [ ] AC1: API `PUT /api/v1/whitelabel/branding` принимает: `logo_url` (PNG/SVG, max 2MB, min 200x50px), `favicon_url` (ICO/PNG, max 100KB, 32x32 или 16x16), `primary_color` (hex), `secondary_color` (hex), `accent_color` (hex), `app_name` (varchar 50), `support_email` (email). Валидация WCAG AA контраста между primary_color и белым фоном (ratio >= 4.5:1)
- [ ] AC2: Изменения брендинга применяются ко всем сессиям данного tenant < 5 минут (через CDN invalidation + polling)
- [ ] AC3: API `PUT /api/v1/whitelabel/email-templates` позволяет кастомизировать email-шаблоны: welcome, password_reset, notification, invoice. Поддержка HTML + Handlebars-переменных. Preview endpoint `POST /api/v1/whitelabel/email-templates/preview` возвращает rendered HTML
- [ ] AC4: Версионирование брендинга: каждое изменение сохраняет предыдущую версию. API `GET /api/v1/whitelabel/branding/history` возвращает последние 20 версий с diff. Rollback через `POST /api/v1/whitelabel/branding/rollback/{version_id}`
- [ ] AC5: Default branding (GambChamp) применяется автоматически при создании нового tenant. Сброс к default через `POST /api/v1/whitelabel/branding/reset`
- [ ] AC6: Favicon и logo загружаются через `POST /api/v1/whitelabel/assets` с multipart upload. Автоматический resize и оптимизация (WebP conversion). CDN delivery с cache TTL 1 час

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-20]
**Зависит от:** [STORY-180]

##### Tasks для STORY-181:

**[TASK-0707] Backend — API брендинга и версионирование**
- **Тип:** Backend
- **Описание:** Таблица `whitelabel_branding`: `id` (UUID), `tenant_id` (FK, unique — один active branding per tenant), `logo_url`, `favicon_url`, `primary_color`, `secondary_color`, `accent_color`, `app_name`, `support_email`, `version` (int, auto-increment per tenant), `is_active` (bool), `created_by`, `created_at`. PUT endpoint сохраняет новую версию и помечает её active. History endpoint возвращает последние 20. Rollback создаёт новую версию с данными из указанной. Валидация WCAG AA контраста через формулу relative luminance.
- **Критерии готовности (DoD):**
  - [ ] PUT создаёт новую версию, не перезаписывает старую
  - [ ] Rollback работает корректно для любой из 20 последних версий
  - [ ] Контраст >= 4.5:1 проверяется для primary_color vs #FFFFFF
  - [ ] Audit log записывает все изменения брендинга
- **Оценка:** 8h
- **Story:** [STORY-181]

**[TASK-0708] Backend — загрузка и обработка ассетов (logo, favicon)**
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/whitelabel/assets` принимает multipart upload. Валидация: logo (PNG/SVG, max 2MB, min 200x50px), favicon (ICO/PNG, max 100KB). Pipeline обработки: resize (logo → 200x50, 400x100, 800x200; favicon → 16x16, 32x32, 180x180), конвертация в WebP (кроме favicon .ico), upload в S3 с CDN prefix. Возвращает массив URL для каждого размера. Удаление старых ассетов через background job через 24 часа после замены.
- **Критерии готовности (DoD):**
  - [ ] Upload и resize работают для всех форматов
  - [ ] Файлы > 2MB отклоняются с 413
  - [ ] CDN URL доступны глобально < 5 минут после загрузки
  - [ ] Старые ассеты удаляются через 24 часа
- **Оценка:** 8h
- **Story:** [STORY-181]

**[TASK-0709] Backend — кастомизация email-шаблонов**
- **Тип:** Backend
- **Описание:** Таблица `whitelabel_email_templates`: `id`, `tenant_id`, `template_type` (enum: welcome, password_reset, notification, invoice), `subject` (varchar 200 с Handlebars), `body_html` (text, max 100KB), `version`, `is_active`. Доступные переменные: `{{app_name}}`, `{{logo_url}}`, `{{user_name}}`, `{{support_email}}`, `{{primary_color}}`. Preview endpoint рендерит шаблон с sample data и возвращает HTML. Sanitization: DOMPurify для HTML, запрет `<script>`, `onclick`, `javascript:` URL.
- **Критерии готовности (DoD):**
  - [ ] 4 типа шаблонов поддерживаются
  - [ ] Preview рендерит корректный HTML с sample data
  - [ ] XSS-опасный контент sanitized
  - [ ] Default шаблоны создаются при provisioning tenant
- **Оценка:** 8h
- **Story:** [STORY-181]

**[TASK-0710] Frontend — редактор брендинга с live preview**
- **Тип:** Frontend
- **Описание:** Страница "White-Label > Branding": (1) Секция "Visual Identity": upload logo/favicon с drag-and-drop, color pickers для primary/secondary/accent с live preview панели навигации и кнопок. (2) Секция "App Info": app_name, support_email. (3) Live preview: правая колонка показывает mock интерфейса с применёнными настройками в реальном времени. (4) Кнопки "Save", "Reset to Default", "View History". (5) Секция "Email Templates": выбор шаблона → HTML-редактор (CodeMirror/Monaco) с вкладками Code/Preview. (6) WCAG контраст warning: если контраст < 4.5:1 → жёлтый warning badge рядом с color picker.
- **Критерии готовности (DoD):**
  - [ ] Live preview обновляется в реальном времени при изменении цветов
  - [ ] Drag-and-drop upload для logo/favicon работает
  - [ ] WCAG warning отображается при низком контрасте
  - [ ] Email template editor с syntax highlighting и preview
- **Оценка:** 16h
- **Story:** [STORY-181]

**[TASK-0711] QA — тестирование брендинга и email-шаблонов**
- **Тип:** QA
- **Описание:** Тест-кейсы: (1) Upload logo PNG 1.5MB → success. (2) Upload logo 3MB → 413. (3) Upload SVG с embedded script → sanitized. (4) Цвет с контрастом < 4.5:1 → 422. (5) Rollback к версии 3 из 5 → branding v3 применён. (6) Email template с `<script>` → sanitized. (7) Preview email с sample data → корректный HTML. (8) Изменения применяются < 5 минут на другой сессии. (9) Reset to default → GambChamp branding. (10) Concurrent updates от двух admins → last-write-wins с version check.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Visual regression тесты для 3 разных брендингов
  - [ ] Email rendering проверен в Gmail, Outlook, Apple Mail
- **Оценка:** 8h
- **Story:** [STORY-181]

---

#### [STORY-182] Изоляция данных для enterprise-клиентов (tenant_id / schema isolation)

**Как** Network Admin, **я хочу** полную изоляцию данных между tenant-ами (на уровне tenant_id с Row-Level Security или отдельных schema), **чтобы** данные одного клиента были гарантированно недоступны другому клиенту.

**Acceptance Criteria:**
- [ ] AC1: Все таблицы с бизнес-данными (leads, brokers, routing_flows, campaigns, transactions) содержат колонку `tenant_id` (UUID, NOT NULL, FK tenants). Row-Level Security (RLS) policy на PostgreSQL: `USING (tenant_id = current_setting('app.current_tenant')::uuid)`
- [ ] AC2: Middleware автоматически устанавливает `app.current_tenant` из JWT при каждом запросе. Запрос без tenant context → HTTP 403 `TENANT_CONTEXT_REQUIRED`
- [ ] AC3: Enterprise-клиенты (план Scale/Enterprise) могут опционально использовать dedicated schema: `schema_{tenant_id}`. Provisioning отдельной schema через `POST /api/v1/tenants/{id}/isolate` (async, < 2 часов)
- [ ] AC4: Cross-tenant query невозможен даже через SQL injection: RLS не отключается на application level. Superuser queries требуют MFA + audit log entry
- [ ] AC5: Тесты изоляции: automated suite из 25+ тест-кейсов, которые запускаются при каждом deploy и проверяют невозможность cross-tenant access на всех endpoints
- [ ] AC6: Метрики per tenant: storage usage, query count, lead volume. API `GET /api/v1/tenants/{id}/usage` доступен Network Admin

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-20]
**Зависит от:** [STORY-180]

##### Tasks для STORY-182:

**[TASK-0712] Добавить tenant_id и RLS policies во все бизнес-таблицы**
- **Тип:** Backend
- **Описание:** Миграция: добавить `tenant_id` (UUID, NOT NULL, FK tenants) во все таблицы без этой колонки. Создать RLS policies: `CREATE POLICY tenant_isolation ON {table} USING (tenant_id = current_setting('app.current_tenant')::uuid)`. Включить RLS: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY`. Затронутые таблицы: leads, brokers, routing_flows, campaigns, transactions, whitelabel_domains, whitelabel_branding, api_keys, webhooks, reports. Индексы: добавить tenant_id в начало всех составных индексов.
- **Критерии готовности (DoD):**
  - [ ] RLS включен на всех 10+ бизнес-таблицах
  - [ ] Миграция обратно совместима (не ломает существующие данные)
  - [ ] Индексы обновлены для query performance с tenant_id prefix
  - [ ] Superuser bypass RLS требует explicit SET ROLE
- **Оценка:** 16h
- **Story:** [STORY-182]

**[TASK-0713] Middleware для автоматической установки tenant context**
- **Тип:** Backend
- **Описание:** Go middleware, который извлекает `tenant_id` из JWT claims, устанавливает PostgreSQL session variable `SET LOCAL app.current_tenant = '{tenant_id}'` в начале каждой транзакции. Если tenant_id отсутствует в JWT → HTTP 403. Если tenant деактивирован → HTTP 403 `TENANT_SUSPENDED`. Логирование: каждый запрос содержит tenant_id в structured log (для debugging и audit). Performance: overhead middleware < 1ms.
- **Критерии готовности (DoD):**
  - [ ] Tenant context устанавливается автоматически для каждого запроса
  - [ ] Запросы без tenant context отклоняются с 403
  - [ ] Suspended tenant не может выполнять API-вызовы
  - [ ] Overhead < 1ms (benchmark)
- **Оценка:** 8h
- **Story:** [STORY-182]

**[TASK-0714] Provisioning dedicated schema для enterprise tenant**
- **Тип:** Backend
- **Описание:** Async job для создания dedicated schema: (1) Создать schema `tenant_{uuid}`. (2) Скопировать все таблицы из public schema. (3) Мигрировать данные tenant из shared таблиц в dedicated schema. (4) Обновить routing layer — запросы для этого tenant идут в его schema. (5) Удалить данные tenant из shared таблиц. Rollback при ошибке: откатить на shared mode. Status tracking: API `GET /api/v1/tenants/{id}/isolation-status` возвращает progress (0-100%).
- **Критерии готовности (DoD):**
  - [ ] Provisioning завершается < 2 часов для tenant с 1M лидов
  - [ ] Zero downtime во время миграции (dual-write period)
  - [ ] Rollback работает при сбое на любом этапе
  - [ ] Progress tracking обновляется каждые 30 секунд
- **Оценка:** 16h
- **Story:** [STORY-182]

**[TASK-0715] Frontend — панель управления tenant isolation**
- **Тип:** Frontend
- **Описание:** Страница "Settings > Data Isolation": (1) Текущий режим: Shared (с RLS) или Dedicated Schema. (2) Для shared: badge "Row-Level Security Active" с зелёной иконкой. (3) Для enterprise: кнопка "Upgrade to Dedicated Schema" → confirmation dialog с описанием процесса и estimated time. (4) Progress bar во время provisioning с этапами: Creating schema → Migrating data → Switching routing → Cleanup. (5) Usage metrics: storage, queries/day, lead count.
- **Критерии готовности (DoD):**
  - [ ] Текущий режим изоляции отображается корректно
  - [ ] Progress bar обновляется в реальном времени через polling/SSE
  - [ ] Usage metrics загружаются и отображаются
  - [ ] Кнопка upgrade доступна только для Scale/Enterprise планов
- **Оценка:** 8h
- **Story:** [STORY-182]

**[TASK-0716] QA — автоматизированный suite тестов изоляции (25+ кейсов)**
- **Тип:** QA
- **Описание:** Automated test suite: (1) Tenant A создаёт lead → Tenant B GET /leads не видит его. (2-10) Повторить для brokers, flows, campaigns, transactions, domains, branding, api_keys, webhooks, reports. (11) SQL injection attempt с tenant_id → blocked by RLS. (12) API call без tenant context → 403. (13) Suspended tenant → 403 на всех endpoints. (14) Dedicated schema: данные не в public schema. (15) Cross-schema join невозможен. (16-25) Edge cases: bulk operations, export, search, audit logs — все с tenant isolation.
- **Критерии готовности (DoD):**
  - [ ] 25+ тест-кейсов проходят в CI/CD при каждом deploy
  - [ ] Тесты запускаются < 10 минут
  - [ ] Покрытие: все API endpoints с бизнес-данными
  - [ ] Zero false positives за 30 дней
- **Оценка:** 16h
- **Story:** [STORY-182]

---

#### [STORY-183] Parent-account для реселлеров (управление дочерними клиентами)

**Как** Network Admin (реселлер), **я хочу** parent-account с возможностью создавать и управлять дочерними клиентскими инстансами, **чтобы** продавать платформу под своим брендом своим клиентам и видеть агрегированную аналитику.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/reseller/children` создаёт child tenant с параметрами: name, plan, domain, admin_email. Parent может создать до 100 child tenants. Child создаётся в статусе `provisioning` → `active` (< 5 минут)
- [ ] AC2: Parent видит агрегированную аналитику по всем children: total leads, total revenue, active users. API `GET /api/v1/reseller/analytics` с возможностью drill-down в конкретного child
- [ ] AC3: Parent может приостановить/возобновить child tenant: `PUT /api/v1/reseller/children/{id}/status`. Suspended child → все API-вызовы возвращают 403
- [ ] AC4: Child tenants полностью изолированы друг от друга. Child не знает о существовании parent или siblings. Child admin видит только свои данные
- [ ] AC5: Parent может задавать лимиты для child: max_leads_per_day (1-100000), max_users (1-500), max_integrations (1-200). При превышении — child получает HTTP 429 с описанием лимита
- [ ] AC6: Контекстный переключатель (context switcher) в UI: parent может "войти" в любой child tenant для просмотра (read-only impersonation). Все действия в impersonation mode логируются с пометкой `impersonated_by: parent_admin_id`

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-20]
**Зависит от:** [STORY-182]

##### Tasks для STORY-183:

**[TASK-0717] Backend — модель parent-child hierarchy**
- **Тип:** Backend
- **Описание:** Расширить таблицу `tenants`: добавить `parent_tenant_id` (FK tenants, nullable), `tenant_type` (enum: standalone, parent, child), `limits` (JSONB: max_leads_per_day, max_users, max_integrations). API endpoints: POST/GET/PUT/DELETE для `/api/v1/reseller/children`. Бизнес-правила: parent может иметь max 100 children, child не может создавать sub-children (depth = 1), suspended parent → все children suspended. Audit log для всех операций hierarchy.
- **Критерии готовности (DoD):**
  - [ ] Parent-child relationship модель работает
  - [ ] Лимит 100 children per parent проверен
  - [ ] Cascade suspend работает корректно
  - [ ] Depth ограничен 1 уровнем (child не может быть parent)
- **Оценка:** 8h
- **Story:** [STORY-183]

**[TASK-0718] Backend — агрегированная аналитика для реселлера**
- **Тип:** Backend
- **Описание:** API `GET /api/v1/reseller/analytics` — агрегация метрик по всем children: total_leads (today/week/month), total_revenue, active_users, children_count по статусам. Параметры: period (today/7d/30d/custom), child_id (optional для drill-down). Данные из materialized view, обновляемого каждые 15 минут. Response time < 500ms для parent с 100 children.
- **Критерии готовности (DoD):**
  - [ ] Агрегация корректна для 100 children
  - [ ] Drill-down в конкретного child работает
  - [ ] Materialized view обновляется каждые 15 минут
  - [ ] Response time < 500ms (benchmark с 100 children)
- **Оценка:** 8h
- **Story:** [STORY-183]

**[TASK-0719] Backend — impersonation (read-only вход в child tenant)**
- **Тип:** Backend
- **Описание:** API `POST /api/v1/reseller/impersonate/{child_id}` — генерирует temporary JWT token (TTL 1 час) с claims: `tenant_id: child_id`, `impersonated_by: parent_admin_id`, `permissions: read_only`. Все write-операции с этим token → HTTP 403 `READ_ONLY_IMPERSONATION`. Каждый API-вызов в impersonation mode записывается в audit log с `impersonated_by`. Revoke через `POST /api/v1/reseller/impersonate/revoke`.
- **Критерии готовности (DoD):**
  - [ ] Impersonation token генерируется и работает для read operations
  - [ ] Write operations заблокированы с 403
  - [ ] Audit log записывает impersonated_by для каждого вызова
  - [ ] Token expires через 1 час автоматически
- **Оценка:** 8h
- **Story:** [STORY-183]

**[TASK-0720] Frontend — консоль реселлера с context switcher**
- **Тип:** Frontend
- **Описание:** (1) Dashboard реселлера: карточки с KPI (total children, total leads, revenue), таблица children с name, status, plan, leads today, actions. (2) Context switcher в header: dropdown с children list, при выборе — UI переключается на child tenant (read-only badge). (3) Создание child: modal с name, plan, admin email, domain, limits. (4) Child detail page: usage metrics, limits editor, suspend/resume toggle. (5) Impersonation banner: жёлтая полоса сверху "You are viewing [child_name] in read-only mode. [Exit]".
- **Критерии готовности (DoD):**
  - [ ] Dashboard показывает агрегированные метрики
  - [ ] Context switcher переключает tenant контекст
  - [ ] Read-only impersonation banner всегда видим
  - [ ] Создание child проходит весь flow
- **Оценка:** 16h
- **Story:** [STORY-183]

**[TASK-0721] QA — тестирование reseller hierarchy**
- **Тип:** QA
- **Описание:** (1) Создание 100 children → success. (2) Создание 101-го → 422. (3) Child пытается создать sub-child → 403. (4) Suspend parent → все children suspended. (5) Resume parent → children restored. (6) Impersonation: read → success, write → 403. (7) Impersonation audit log записан. (8) Child A не видит данные child B. (9) Parent analytics корректны для 50+ children. (10) Token impersonation expire через 1 час.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Performance тест: analytics для 100 children < 500ms
  - [ ] Security тест: impersonation write → blocked
- **Оценка:** 8h
- **Story:** [STORY-183]

---

#### [STORY-184] White-label биллинг для реселлеров (собственные цены)

**Как** Network Admin (реселлер), **я хочу** устанавливать собственные цены для дочерних клиентов и получать margin, **чтобы** зарабатывать на перепродаже платформы.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/reseller/pricing` позволяет parent создавать кастомные pricing plans для children: name, monthly_price (USD, min $50, max $10000), features (JSON — список включённых модулей), limits (leads/day, users, integrations). Максимум 10 pricing plans per parent
- [ ] AC2: Margin рассчитывается автоматически: `margin = child_price - platform_cost`. Platform cost определяется планом parent. Dashboard показывает total margin per month, per child
- [ ] AC3: Инвойсы для children генерируются от имени parent (с branding parent-а). API `GET /api/v1/reseller/invoices` — инвойсы по всем children с фильтрами status, child_id, period
- [ ] AC4: Parent получает consolidated invoice от GambChamp за все children. Скидка за volume: 10+ children → 10% discount, 50+ → 20%, 100 → 30%
- [ ] AC5: Child не видит platform cost, только цену, назначенную parent-ом

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-20]
**Зависит от:** [STORY-183], [EPIC-21]

##### Tasks для STORY-184:

**[TASK-0722] Backend — кастомные pricing plans для реселлера**
- **Тип:** Backend
- **Описание:** Таблица `reseller_pricing_plans`: `id`, `parent_tenant_id`, `name` (varchar 100), `monthly_price` (decimal, 50-10000), `features` (JSONB), `limits` (JSONB), `is_active`, `created_at`. CRUD API: POST/GET/PUT/DELETE `/api/v1/reseller/pricing`. Лимит 10 plans per parent. При назначении plan child-у — валидация что features не превышают features parent-а (нельзя продать то, чего нет у parent).
- **Критерии готовности (DoD):**
  - [ ] CRUD для pricing plans работает
  - [ ] Валидация: child plan features <= parent plan features
  - [ ] Лимит 10 plans per parent проверен
  - [ ] Price range $50-$10000 валидируется
- **Оценка:** 8h
- **Story:** [STORY-184]

**[TASK-0723] Backend — расчёт margin и volume discounts**
- **Тип:** Backend
- **Описание:** Сервис расчёта margin: `margin = sum(child_prices) - platform_cost_for_parent`. Volume discounts: 10+ children → 10%, 50+ → 20%, 100 → 30% от platform cost. API `GET /api/v1/reseller/financials` — monthly margin, per-child breakdown, volume discount applied. Данные обновляются daily batch job. Хранение в таблице `reseller_financials`: month, parent_tenant_id, total_child_revenue, platform_cost, discount_rate, net_margin.
- **Критерии готовности (DoD):**
  - [ ] Margin рассчитывается корректно для всех volume tiers
  - [ ] Volume discount применяется автоматически при изменении числа children
  - [ ] Financial data обновляется daily
  - [ ] Audit trail для изменений pricing
- **Оценка:** 8h
- **Story:** [STORY-184]

**[TASK-0724] Frontend — панель финансов реселлера**
- **Тип:** Frontend
- **Описание:** Страница "Reseller > Financials": (1) KPI cards: total monthly revenue from children, platform cost, net margin, volume discount %. (2) Таблица children: name, plan, price, margin, last payment status. (3) Chart: monthly margin trend за 12 месяцев. (4) Pricing plans manager: список plans с edit/delete, create new plan modal. (5) Consolidated invoice download.
- **Критерии готовности (DoD):**
  - [ ] KPI cards показывают корректные суммы
  - [ ] Chart рендерится за 12 месяцев
  - [ ] Pricing plans CRUD работает из UI
  - [ ] Invoice download в PDF
- **Оценка:** 8h
- **Story:** [STORY-184]

**[TASK-0725] QA — тестирование reseller billing**
- **Тип:** QA
- **Описание:** (1) Создание 10 plans → success, 11-й → 422. (2) Child plan features > parent → 422. (3) Margin calculation: 5 children x $500 - parent cost $1199 = correct margin. (4) Volume discount: 10 children → 10% discount applied. (5) Child не видит platform cost. (6) Consolidated invoice корректен. (7) Price change mid-month → proration.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Financial calculations verified с точностью до цента
  - [ ] Volume discount tiers проверены на границах (9→10, 49→50, 99→100)
- **Оценка:** 4h
- **Story:** [STORY-184]

---

#### [STORY-185] Кастомный email sender (from: noreply@clientdomain.com)

**Как** Network Admin, **я хочу** отправлять системные email с адреса на домене клиента (noreply@clientdomain.com), **чтобы** получатели видели письма от бренда клиента, а не от GambChamp.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/whitelabel/email-sender` принимает: `from_email` (email на кастомном домене), `from_name` (varchar 100), `reply_to` (email, optional). Система возвращает DNS-записи для настройки: SPF, DKIM, DMARC
- [ ] AC2: Верификация домена для email: проверка SPF и DKIM записей. Статусы: pending → spf_verified → dkim_verified → active. Полная верификация < 24 часа
- [ ] AC3: При отправке email используется verified sender. Если sender не verified → fallback на default GambChamp sender с warning в UI
- [ ] AC4: Email deliverability monitoring: bounce rate, spam complaints. Alert при bounce rate > 5% или spam complaint > 0.1%. API `GET /api/v1/whitelabel/email-sender/stats`
- [ ] AC5: Поддержка нескольких sender-ов per tenant (max 3). Каждый sender привязан к типу email (transactional, marketing, notification)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-20]
**Зависит от:** [STORY-180], [STORY-181]

##### Tasks для STORY-185:

**[TASK-0726] Backend — настройка и верификация email sender**
- **Тип:** Backend
- **Описание:** Таблица `whitelabel_email_senders`: `id`, `tenant_id`, `from_email`, `from_name`, `reply_to`, `sender_type` (enum: transactional, marketing, notification), `status` (pending, spf_verified, dkim_verified, active, failed), `dns_records` (JSONB — SPF/DKIM/DMARC записи), `dkim_private_key` (encrypted), `bounce_rate`, `spam_complaint_rate`. CRUD API. Background worker для DNS verification (проверка SPF/DKIM каждые 5 минут для pending senders). DKIM key generation (RSA 2048-bit).
- **Критерии готовности (DoD):**
  - [ ] DKIM ключи генерируются и хранятся encrypted
  - [ ] SPF и DKIM verification работают
  - [ ] Fallback на default sender при unverified
  - [ ] Max 3 senders per tenant
- **Оценка:** 8h
- **Story:** [STORY-185]

**[TASK-0727] Frontend — UI настройки email sender**
- **Тип:** Frontend
- **Описание:** Страница "White-Label > Email Senders": (1) Список сконфигурированных senders с status badge. (2) Add sender wizard: ввод email → показ DNS-записей (SPF, DKIM, DMARC) с copy buttons → verification status tracker. (3) Stats per sender: delivered, bounced, spam complaints (chart за 30 дней). (4) Alert banner при bounce rate > 5%.
- **Критерии готовности (DoD):**
  - [ ] Wizard проходит все шаги
  - [ ] DNS записи копируются в clipboard
  - [ ] Stats chart отображает данные за 30 дней
  - [ ] Alert при высоком bounce rate
- **Оценка:** 8h
- **Story:** [STORY-185]

**[TASK-0728] QA — тестирование email sender**
- **Тип:** QA
- **Описание:** (1) Add sender → DNS records generated. (2) Verify SPF → status update. (3) Verify DKIM → active. (4) Send email from verified sender → correct From header. (5) Send from unverified → fallback to default. (6) 4-й sender → 422. (7) Bounce rate > 5% → alert. (8) DKIM signature validation passes.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Email headers проверены (SPF pass, DKIM pass, DMARC pass)
  - [ ] Deliverability тест: письмо не попадает в spam на Gmail/Outlook
- **Оценка:** 4h
- **Story:** [STORY-185]

---

#### [STORY-186] Визуальный редактор темы (цветовая схема, шрифты, layout)

**Как** Affiliate Manager, **я хочу** визуальный редактор темы с возможностью менять цветовую схему, шрифты и layout-опции, **чтобы** полностью адаптировать интерфейс CRM под стиль бренда клиента.

**Acceptance Criteria:**
- [ ] AC1: API `PUT /api/v1/whitelabel/theme` принимает: `color_scheme` (JSONB: primary, secondary, accent, background, surface, text, error, warning, success — 9 цветов), `typography` (JSONB: font_family из whitelist 20 Google Fonts, heading_size_scale 0.8-1.5, body_font_size 12-18px), `layout` (JSONB: sidebar_position left|right, sidebar_collapsed_default bool, header_height 48-80px, border_radius 0-16px)
- [ ] AC2: Live preview: изменения отображаются мгновенно в preview iframe без сохранения. Кнопка "Apply" фиксирует изменения
- [ ] AC3: Preset themes: минимум 5 встроенных тем (Light, Dark, Corporate Blue, Green Finance, Minimal). Пользователь может создать до 10 custom themes и переключаться между ними
- [ ] AC4: Export/Import theme as JSON файл (для переноса между tenants). Валидация imported theme: все обязательные поля присутствуют, цвета валидные hex, шрифты из whitelist
- [ ] AC5: WCAG AA compliance: автоматическая проверка контраста для всех комбинаций text/background. Warning при нарушении, block при critical violations (contrast < 3:1)

**Story Points:** 8
**Приоритет:** Could
**Epic:** [EPIC-20]
**Зависит от:** [STORY-181]

##### Tasks для STORY-186:

**[TASK-0729] Backend — API тем и preset management**
- **Тип:** Backend
- **Описание:** Таблица `whitelabel_themes`: `id`, `tenant_id`, `name` (varchar 50), `color_scheme` (JSONB), `typography` (JSONB), `layout` (JSONB), `is_preset` (bool), `is_active` (bool), `created_at`. 5 seed presets (is_preset=true, tenant_id=null). CRUD API для custom themes. Валидация: 9 hex colors, font_family в whitelist (20 Google Fonts), числовые ranges. WCAG check endpoint: `POST /api/v1/whitelabel/theme/validate` возвращает массив violations.
- **Критерии готовности (DoD):**
  - [ ] 5 preset themes загружены seed-ом
  - [ ] Custom themes CRUD работает (лимит 10 per tenant)
  - [ ] WCAG validation endpoint возвращает violations
  - [ ] Export/Import JSON работает с валидацией
- **Оценка:** 8h
- **Story:** [STORY-186]

**[TASK-0730] Frontend — визуальный theme editor**
- **Тип:** Frontend
- **Описание:** Страница "White-Label > Theme Editor": (1) Левая панель: color pickers для 9 цветов, font selector (dropdown с preview), sliders для typography и layout параметров. (2) Правая панель: live preview в iframe с mock данными (таблица лидов, dashboard, формы). (3) Toolbar: "Save as...", "Apply", "Reset", "Export JSON", "Import JSON". (4) Preset gallery: карточки с превью 5 preset тем + custom themes. (5) WCAG badge: зелёный (all pass), жёлтый (warnings), красный (critical violations) с clickable list проблем.
- **Критерии готовности (DoD):**
  - [ ] 9 color pickers с live preview работают
  - [ ] Font preview показывает реальный шрифт
  - [ ] Preset themes применяются одним кликом
  - [ ] WCAG violations отображаются с описанием
- **Оценка:** 16h
- **Story:** [STORY-186]

**[TASK-0731] QA — тестирование theme editor**
- **Тип:** QA
- **Описание:** (1) Apply preset theme → all UI elements updated. (2) Custom theme: все 9 цветов → saved correctly. (3) Font change → applies to all text. (4) Export JSON → valid file. (5) Import valid JSON → theme applied. (6) Import invalid JSON → validation errors. (7) 11-я custom theme → 422. (8) WCAG violation → warning displayed. (9) Critical WCAG violation (contrast < 3:1) → save blocked. (10) Layout changes: sidebar position, border radius → UI updates.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Visual regression тесты для 5 preset themes
  - [ ] Cross-browser: Chrome, Firefox, Safari
- **Оценка:** 8h
- **Story:** [STORY-186]

---

#### [STORY-187] White-label аудит и governance

**Как** Network Admin, **я хочу** видеть полную историю изменений white-label конфигурации (домены, брендинг, темы, hierarchy), **чтобы** контролировать безопасность и соответствие бренд-политикам.

**Acceptance Criteria:**
- [ ] AC1: Любое изменение домена, брендинга, темы, email sender, parent-child hierarchy записывается в audit log с полями: actor_id, actor_email, action (create/update/delete), resource_type, resource_id, old_value (JSONB), new_value (JSONB), ip_address, user_agent, timestamp
- [ ] AC2: API `GET /api/v1/whitelabel/audit` с фильтрами: actor, action, resource_type, date_from, date_to. Пагинация cursor-based. Response time < 2 секунды для запросов за последние 90 дней
- [ ] AC3: Export audit log в CSV (до 10000 записей) и PDF (до 1000 записей). Генерация async — по готовности отправляется email с download link (TTL 24 часа)
- [ ] AC4: Real-time notifications: при critical changes (domain deletion, branding reset, child tenant suspend) — instant webhook + email к Network Admin
- [ ] AC5: Retention: 1 год в hot storage (fast search), 7 лет в archive (cold storage, retrieval < 4 часа)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-20]
**Зависит от:** [STORY-180], [STORY-181], [STORY-183]

##### Tasks для STORY-187:

**[TASK-0732] Backend — white-label audit log service**
- **Тип:** Backend
- **Описание:** Таблица `whitelabel_audit_log`: `id` (UUID), `tenant_id`, `actor_id`, `actor_email`, `action` (enum), `resource_type` (enum: domain, branding, theme, email_sender, reseller_hierarchy), `resource_id`, `old_value` (JSONB), `new_value` (JSONB), `ip_address` (inet), `user_agent` (varchar 500), `created_at` (timestamptz). Partitioning по месяцам. Индексы: (tenant_id, created_at DESC), (actor_id, created_at DESC), (resource_type, resource_id). Event listeners на все white-label сущности — автоматическая запись в audit при любом изменении.
- **Критерии готовности (DoD):**
  - [ ] Все white-label изменения записываются автоматически
  - [ ] old_value и new_value содержат полные данные для diff
  - [ ] Query за 90 дней < 2 секунды
  - [ ] Partitioning работает корректно
- **Оценка:** 8h
- **Story:** [STORY-187]

**[TASK-0733] Frontend — UI аудит-лога white-label**
- **Тип:** Frontend
- **Описание:** Страница "White-Label > Audit Log": (1) Таблица: timestamp, actor (avatar + email), action (badge), resource type, summary (truncated diff). (2) Фильтры: actor dropdown, action type, resource type, date range picker. (3) Detail modal: полный diff (old → new) в side-by-side view с подсветкой изменений. (4) Export buttons: CSV, PDF с индикатором прогресса. (5) Real-time: новые записи появляются через SSE без refresh.
- **Критерии готовности (DoD):**
  - [ ] Таблица с фильтрами и пагинацией работает
  - [ ] Diff view показывает изменения наглядно
  - [ ] Export CSV/PDF запускается и отправляет email
  - [ ] Real-time обновления через SSE
- **Оценка:** 8h
- **Story:** [STORY-187]

**[TASK-0734] QA — тестирование white-label аудита**
- **Тип:** QA
- **Описание:** (1) Создание домена → audit entry с correct old/new values. (2) Изменение брендинга → diff показывает changed fields. (3) Фильтр по actor → только записи этого actor. (4) Фильтр по date range → корректная выборка. (5) Export 5000 записей CSV → файл скачивается. (6) Critical change (domain delete) → webhook + email received. (7) Query за 90 дней < 2 сек. (8) Archive retrieval (данные старше 1 года) → доступны < 4 часов.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Audit completeness: 100% white-label операций логируются
  - [ ] Performance: 100K записей → query < 2 сек
- **Оценка:** 4h
- **Story:** [STORY-187]

---

## [EPIC-21] Billing & Subscription Management

**Цель:** Создать встроенную систему биллинга с тарифными планами (Starter $399/мес, Growth $699/мес, Scale $1199/мес, Enterprise от $2500/мес), usage-based add-ons, интеграцией Stripe, автоматической генерацией инвойсов, управлением trial-периодом и dunning-процессом для неудачных платежей. Полная монетизация платформы без внешних биллинговых систем.

**Метрика успеха:**
- 95% инвойсов генерируются и отправляются автоматически без ручного вмешательства
- Ошибки биллинга (incorrect charges, double billing) < 0.1% от общего числа транзакций
- Trial-to-paid conversion rate >= 25% (из 14-дневного trial)
- Involuntary churn (из-за failed payments) < 2% monthly благодаря dunning
- DSO (Days Sales Outstanding) < 15 дней

**Приоритет:** P3 (Scale)
**Зависит от:** [EPIC-06]
**Оценка:** L

---

### Stories:

---

#### [STORY-188] Управление тарифными планами и подписками

**Как** Network Admin, **я хочу** создавать и редактировать тарифные планы с набором функций и лимитов, а также управлять подписками клиентов, **чтобы** гибко монетизировать разные сегменты пользователей.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/billing/plans` создаёт план: `name` (varchar 100), `slug` (unique), `monthly_price` (decimal, USD), `annual_price` (decimal, optional — скидка до 20%), `features` (JSONB: массив feature flags), `limits` (JSONB: max_buyers int, max_leads_per_day int, max_integrations int, max_users int), `is_public` (bool — показывать на pricing page), `sort_order` (int). Seed 4 плана: Starter ($399, 1-3 buyers, 50 leads/day, 5 integrations), Growth ($699, 3-15 buyers, unlimited leads, 50 integrations), Scale ($1199, 15+ buyers, white-label, financial module), Enterprise (from $2500, custom)
- [ ] AC2: API `POST /api/v1/billing/subscriptions` создаёт подписку tenant: `plan_id`, `billing_cycle` (monthly|quarterly|annual), `starts_at`. Только одна active подписка per tenant. При создании новой — предыдущая cancels (effective end of current period)
- [ ] AC3: API `PUT /api/v1/billing/subscriptions/{id}/change-plan` — upgrade или downgrade. Upgrade: immediate, proration credit за оставшиеся дни текущего плана. Downgrade: effective at end of current billing period, immediate confirmation email
- [ ] AC4: Feature gating: middleware проверяет plan features при каждом API-вызове. Запрос на функцию, не включённую в план → HTTP 403 `FEATURE_NOT_AVAILABLE` с описанием нужного плана. Проверка лимитов: при достижении max_leads_per_day → HTTP 429 `DAILY_LEAD_LIMIT_REACHED`
- [ ] AC5: Plan comparison API: `GET /api/v1/billing/plans/compare` — возвращает таблицу сравнения всех публичных планов с feature matrix

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-21]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-188:

**[TASK-0735] Спроектировать схему БД для billing**
- **Тип:** Backend
- **Описание:** Миграции для таблиц: (1) `billing_plans`: id, name, slug (unique), monthly_price (decimal 10,2), annual_price, features (JSONB), limits (JSONB), is_public, sort_order, is_active, created_at, updated_at. (2) `billing_subscriptions`: id, tenant_id (FK, unique active constraint), plan_id (FK), billing_cycle (enum: monthly, quarterly, annual), status (enum: active, past_due, canceled, trialing), current_period_start, current_period_end, cancel_at_period_end (bool), stripe_subscription_id (varchar, nullable), created_at, updated_at. (3) `billing_plan_changes`: id, subscription_id, from_plan_id, to_plan_id, change_type (upgrade/downgrade), effective_at, proration_amount, created_at. Seed 4 default plans.
- **Критерии готовности (DoD):**
  - [ ] Миграции применяются без ошибок
  - [ ] 4 seed плана создаются при первом запуске
  - [ ] Unique constraint: только одна active подписка per tenant
  - [ ] Индексы покрывают основные queries
- **Оценка:** 4h
- **Story:** [STORY-188]

**[TASK-0736] Backend — CRUD API для тарифных планов и подписок**
- **Тип:** Backend
- **Описание:** Go-хэндлеры: (1) Plans CRUD: POST/GET/PUT для `/api/v1/billing/plans`. Только Network Admin может создавать/редактировать планы. Удаление плана → soft delete (нельзя удалить план с active подписками). (2) Subscriptions: POST создаёт подписку, GET возвращает текущую, PUT change-plan с proration calculation. Формула proration: `credit = (days_remaining / total_days) * current_plan_price`. (3) Plan compare: GET endpoint, возвращает feature matrix. (4) Feature gating middleware: проверка plan features и limits на каждом request.
- **Критерии готовности (DoD):**
  - [ ] Plans CRUD работает с seed данными
  - [ ] Подписка создаётся с корректным billing period
  - [ ] Proration рассчитывается с точностью до цента
  - [ ] Feature gating блокирует unauthorized features
- **Оценка:** 16h
- **Story:** [STORY-188]

**[TASK-0737] Frontend — страница тарифных планов и управление подпиской**
- **Тип:** Frontend
- **Описание:** (1) Страница "Billing > Plans": карточки планов (Starter, Growth, Scale, Enterprise) с feature list, price, "Current Plan" badge, "Upgrade"/"Downgrade" buttons. Comparison table toggle. (2) Страница "Billing > Subscription": текущий план, billing cycle, next billing date, projected cost. Change plan flow: выбор нового плана → confirmation modal с proration summary → submit. (3) Admin panel (Network Admin): CRUD для планов, drag-and-drop сортировка, feature/limits editor.
- **Критерии готовности (DoD):**
  - [ ] Карточки планов отображают актуальные данные
  - [ ] Comparison table показывает feature matrix
  - [ ] Change plan flow с proration preview работает
  - [ ] Admin plan editor: создание и редактирование планов
- **Оценка:** 16h
- **Story:** [STORY-188]

**[TASK-0738] QA — тестирование планов и подписок**
- **Тип:** QA
- **Описание:** (1) Создание подписки Starter → active. (2) Upgrade Starter → Growth mid-month → proration correct. (3) Downgrade Growth → Starter → effective end of period. (4) Feature gating: Starter tenant → white-label API → 403. (5) Lead limit: 51-й лид на Starter → 429. (6) Удаление плана с active subscriptions → 409. (7) Два active subscriptions → impossible (DB constraint). (8) Annual billing cycle → correct period end. (9) Plan compare → all 4 plans returned.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Proration расчёты верифицированы для 5 сценариев (mid-month, end-month, quarterly, annual, same-day)
  - [ ] Feature gating проверен на всех gated endpoints
- **Оценка:** 8h
- **Story:** [STORY-188]

---

#### [STORY-189] Трекинг использования (leads, integrations, users)

**Как** Finance Manager, **я хочу** видеть детальный трекинг использования платформы (количество обработанных лидов, активных интеграций, активных пользователей), **чтобы** контролировать расходы и понимать утилизацию подписки.

**Acceptance Criteria:**
- [ ] AC1: Usage metrics трекаются в реальном времени (обновление < 5 минут): `leads_processed_today` (count), `leads_processed_month` (count), `active_integrations` (count), `active_users_month` (unique count), `api_calls_today` (count), `storage_used_gb` (decimal)
- [ ] AC2: API `GET /api/v1/billing/usage` возвращает текущий usage с процентом от лимитов плана. Пример: `{leads_today: 45, limit: 50, percentage: 90}`. При usage >= 80% → warning flag, >= 100% → blocked flag
- [ ] AC3: Usage history API: `GET /api/v1/billing/usage/history?period=30d` — daily breakdown за указанный период (max 365 дней). Response time < 1 секунда для 365 дней
- [ ] AC4: Usage alerts: автоматические email/webhook при достижении 80% и 95% от лимитов. Настраиваемые пороги per tenant
- [ ] AC5: Usage данные агрегируются из event stream (Kafka/Redis Streams), не из прямых DB queries. Точность: расхождение с реальными данными < 0.5%

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-21]
**Зависит от:** [STORY-188]

##### Tasks для STORY-189:

**[TASK-0739] Backend — usage metering service**
- **Тип:** Backend
- **Описание:** Сервис сбора usage metrics: consumer из event stream (lead_created, integration_activated, user_login events). Агрегация в таблице `billing_usage`: tenant_id, metric_name (enum), metric_value (bigint), period_start (date), period_end (date), granularity (enum: hourly, daily, monthly). Redis counter для real-time текущего дня (INCR с TTL 25h). Daily batch job для reconciliation Redis → PostgreSQL. Alerts engine: проверка thresholds каждые 5 минут, отправка email/webhook при пересечении 80%/95%.
- **Критерии готовности (DoD):**
  - [ ] Real-time counters обновляются < 5 минут от события
  - [ ] Daily reconciliation: Redis vs PostgreSQL расхождение < 0.5%
  - [ ] Alerts отправляются при 80% и 95% thresholds
  - [ ] History API возвращает данные за 365 дней < 1 сек
- **Оценка:** 16h
- **Story:** [STORY-189]

**[TASK-0740] Frontend — dashboard использования**
- **Тип:** Frontend
- **Описание:** Страница "Billing > Usage": (1) Gauge charts для каждого metric: leads today (45/50), integrations (3/5), users (8/15) с цветовой индикацией (зелёный < 80%, жёлтый 80-95%, красный > 95%). (2) Line chart: daily usage trend за выбранный период (7d/30d/90d/365d). (3) Usage breakdown table: metric, current value, limit, percentage, trend (up/down arrow). (4) Alert settings: toggles для email/webhook, threshold sliders. (5) Export usage report: CSV за выбранный период.
- **Критерии готовности (DoD):**
  - [ ] Gauge charts обновляются при каждом refresh
  - [ ] Line chart рендерится за 365 дней без лагов
  - [ ] Alert settings сохраняются и применяются
  - [ ] Export CSV работает для любого периода
- **Оценка:** 8h
- **Story:** [STORY-189]

**[TASK-0741] QA — тестирование usage tracking**
- **Тип:** QA
- **Описание:** (1) Создание лида → leads_processed_today увеличивается < 5 мин. (2) Usage 80% → warning email sent. (3) Usage 95% → critical alert sent. (4) Usage 100% → new leads blocked (429). (5) History за 30 дней → correct daily values. (6) History за 365 дней → response < 1 сек. (7) Reconciliation: Redis counter = DB value (расхождение < 0.5%). (8) Custom alert threshold (70%) → alert at 70%.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Load test: 10000 events/minute → counters accurate
  - [ ] Alert delivery: < 2 минуты от пересечения threshold
- **Оценка:** 8h
- **Story:** [STORY-189]

---

#### [STORY-190] Usage-based billing add-ons (proxy, extra integrations)

**Как** Finance Manager, **я хочу** автоматическое начисление за usage-based add-ons (proxy usage, дополнительные интеграции сверх плана), **чтобы** монетизация отражала реальное потребление ресурсов.

**Acceptance Criteria:**
- [ ] AC1: Add-on types: `extra_integrations` ($10/шт/мес сверх лимита плана), `proxy_usage` ($0.05/GB bandwidth), `sms_verification` ($0.03/SMS), `premium_support` ($199/мес flat). API `GET /api/v1/billing/addons` — список доступных add-ons с ценами
- [ ] AC2: Usage-based add-ons рассчитываются автоматически в конце billing period. API `GET /api/v1/billing/addons/usage-preview` — preview стоимости add-ons на текущий момент
- [ ] AC3: Flat add-ons (premium_support) активируются/деактивируются через `PUT /api/v1/billing/addons/{addon_id}/toggle`. Proration при mid-cycle activation
- [ ] AC4: Add-on charges включаются в единый инвойс вместе с plan subscription. Line items breakdown: plan base + каждый add-on отдельной строкой
- [ ] AC5: Budget alerts: tenant может установить monthly budget cap для usage add-ons ($50-$10000). При достижении cap → usage блокируется + alert. Override возможен через API с explicit confirmation

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-21]
**Зависит от:** [STORY-188], [STORY-189]

##### Tasks для STORY-190:

**[TASK-0742] Backend — add-on catalog и usage billing engine**
- **Тип:** Backend
- **Описание:** Таблицы: (1) `billing_addons`: id, name, slug, type (usage_based | flat), unit_price (decimal), unit (per_item | per_gb | per_sms | per_month), description, is_active. (2) `billing_addon_subscriptions`: id, tenant_id, addon_id, status, activated_at, deactivated_at. (3) `billing_addon_usage`: id, tenant_id, addon_id, quantity (decimal), period_start, period_end, calculated_amount. Usage billing engine: end-of-period job агрегирует usage и создаёт line items для инвойса. Proration для flat add-ons: `(remaining_days / total_days) * monthly_price`.
- **Критерии готовности (DoD):**
  - [ ] 4 add-on типа seed-ятся в БД
  - [ ] Usage-based calculation точен до $0.01
  - [ ] Flat add-on proration корректен
  - [ ] Budget cap enforcement работает
- **Оценка:** 16h
- **Story:** [STORY-190]

**[TASK-0743] Frontend — управление add-ons**
- **Тип:** Frontend
- **Описание:** Страница "Billing > Add-ons": (1) Карточки add-ons: название, цена, тип (usage/flat), toggle activate/deactivate. (2) Usage preview: текущее потребление и estimated cost к концу периода. (3) Budget cap settings: input с slider, warning при приближении (80%). (4) History: помесячная таблица расходов по add-ons с drill-down в daily breakdown.
- **Критерии готовности (DoD):**
  - [ ] Activate/deactivate toggle работает с confirmation
  - [ ] Usage preview обновляется в реальном времени
  - [ ] Budget cap input сохраняется и отображается в gauge
  - [ ] History таблица с drill-down работает
- **Оценка:** 8h
- **Story:** [STORY-190]

**[TASK-0744] QA — тестирование usage-based billing**
- **Тип:** QA
- **Описание:** (1) Extra integration beyond plan → $10/шт charged. (2) Proxy 2.5GB → $0.125 charged. (3) SMS 100 → $3.00 charged. (4) Premium support mid-month → prorated. (5) Budget cap $100 → at $100 usage blocked. (6) Budget cap override → usage continues. (7) End-of-period invoice includes all add-on line items. (8) Deactivate add-on mid-month → prorated credit.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Billing amounts verified с точностью $0.01
  - [ ] Budget cap enforcement < 5 минут от пересечения
- **Оценка:** 8h
- **Story:** [STORY-190]

---

#### [STORY-191] Интеграция Stripe для обработки платежей

**Как** Network Admin, **я хочу** принимать платежи через Stripe (карты, bank transfer), **чтобы** автоматизировать сбор оплаты и сократить ручную работу.

**Acceptance Criteria:**
- [ ] AC1: Интеграция Stripe Billing API: создание Stripe Customer при регистрации tenant, Stripe Subscription при создании подписки, Stripe Price для каждого плана. Синхронизация plan changes через Stripe Subscription Update API
- [ ] AC2: Stripe Checkout Session для добавления payment method. Поддержка: cards (Visa, MC, Amex), SEPA Direct Debit, bank transfer (wire). API `POST /api/v1/billing/payment-methods/setup` → redirect to Stripe Checkout
- [ ] AC3: Webhook handler для Stripe events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. Webhook signature verification (Stripe-Signature header). Idempotency: повторная обработка одного event → no-op
- [ ] AC4: Payment method management: API `GET /api/v1/billing/payment-methods` — список методов. `DELETE /api/v1/billing/payment-methods/{id}` — удаление (нельзя удалить последний метод при active subscription). `PUT /api/v1/billing/payment-methods/{id}/default` — установить default
- [ ] AC5: PCI DSS compliance: карточные данные НИКОГДА не проходят через наш backend. Только Stripe.js / Stripe Elements на frontend. Наш сервер хранит только Stripe token/ID

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-21]
**Зависит от:** [STORY-188]

##### Tasks для STORY-191:

**[TASK-0745] Backend — Stripe integration layer**
- **Тип:** Backend
- **Описание:** Go-пакет `stripe` с wrapper-ами: (1) Customer: CreateCustomer, UpdateCustomer, GetCustomer. (2) Subscription: CreateSubscription, UpdateSubscription, CancelSubscription. (3) Price: SyncPrices (создание/обновление Stripe Prices из billing_plans). (4) PaymentMethod: AttachToCustomer, Detach, SetDefault. (5) Checkout: CreateCheckoutSession для setup mode. Все вызовы с retry (3 попытки, exponential backoff). Stripe API key из env variable, не hardcoded. Structured logging всех Stripe API calls.
- **Критерии готовности (DoD):**
  - [ ] Все Stripe API операции работают в sandbox
  - [ ] Retry логика для transient errors
  - [ ] API keys из environment, не в коде
  - [ ] Все Stripe вызовы логируются с correlation ID
- **Оценка:** 16h
- **Story:** [STORY-191]

**[TASK-0746] Backend — Stripe webhook handler**
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/webhooks/stripe` — принимает Stripe webhook events. Signature verification через `stripe.ConstructEvent()`. Обработка events: `invoice.paid` → update subscription status + create billing_transaction, `invoice.payment_failed` → start dunning flow, `customer.subscription.updated` → sync local subscription, `customer.subscription.deleted` → cancel local subscription. Idempotency key: event ID + хранение processed_events (deduplcation 7 дней). Dead letter queue для failed event processing.
- **Критерии готовности (DoD):**
  - [ ] Webhook signature verification работает
  - [ ] 4 event types обрабатываются корректно
  - [ ] Idempotency: повторный event → no-op
  - [ ] Dead letter queue для failed processing
- **Оценка:** 8h
- **Story:** [STORY-191]

**[TASK-0747] Frontend — управление payment methods**
- **Тип:** Frontend
- **Описание:** (1) Страница "Billing > Payment Methods": список карт/методов с last4, brand, exp date, default badge. (2) "Add Payment Method" → Stripe Elements (Card Element) встроенный в modal. Stripe.js загружается async. (3) Actions: Set as Default, Remove (с confirmation, blocked для последнего метода). (4) Stripe Checkout redirect для bank transfer setup. (5) PCI compliance badge: "Payments secured by Stripe".
- **Критерии готовности (DoD):**
  - [ ] Stripe Elements рендерятся корректно
  - [ ] Карточные данные НЕ касаются нашего сервера
  - [ ] Add/Remove/Set Default работают
  - [ ] Удаление последнего метода при active subscription → blocked
- **Оценка:** 8h
- **Story:** [STORY-191]

**[TASK-0748] QA — тестирование Stripe integration**
- **Тип:** QA
- **Описание:** Stripe test mode: (1) Create subscription → Stripe subscription created. (2) Upgrade plan → Stripe subscription updated with proration. (3) Add card (4242 4242 4242 4242) → payment method attached. (4) Payment success → invoice.paid webhook → transaction recorded. (5) Payment failure (4000 0000 0000 0002) → invoice.payment_failed → dunning started. (6) Remove last payment method with active sub → blocked. (7) Webhook replay → idempotent. (8) Invalid webhook signature → 401.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят в Stripe test mode
  - [ ] E2E flow: signup → subscribe → pay → invoice generated
  - [ ] Webhook reliability: 100% events processed without loss
- **Оценка:** 8h
- **Story:** [STORY-191]

---

#### [STORY-192] Генерация инвойсов и история платежей

**Как** Finance Manager, **я хочу** автоматическую генерацию инвойсов в PDF с детализацией, а также историю всех платежей, **чтобы** вести финансовый учёт и предоставлять документы бухгалтерии.

**Acceptance Criteria:**
- [ ] AC1: Инвойс генерируется автоматически в день billing: plan subscription + add-on line items + taxes (если applicable). PDF с полями: invoice number (INV-2026-XXXXX sequential), date, due date, company details (seller/buyer), line items, subtotal, tax, total, payment status
- [ ] AC2: API `GET /api/v1/billing/invoices` — список инвойсов с пагинацией. Фильтры: status (draft | open | paid | void | uncollectible), date range, amount range. API `GET /api/v1/billing/invoices/{id}/pdf` — download PDF
- [ ] AC3: Инвойс statuses: `draft` (до finalization) → `open` (отправлен, ожидает оплату) → `paid` (оплачен) / `void` (отменён) / `uncollectible` (списан)
- [ ] AC4: Payment history: API `GET /api/v1/billing/transactions` — все транзакции (charges, refunds, credits) с amount, date, status, payment method, invoice link. Пагинация cursor-based
- [ ] AC5: Auto-email: при генерации инвойса — email с PDF attachment на billing_email tenant-а. Customizable email template (from white-label branding)
- [ ] AC6: Credit notes: API `POST /api/v1/billing/invoices/{id}/credit-note` для частичного или полного возврата. Credit note уменьшает следующий инвойс

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-21]
**Зависит от:** [STORY-188], [STORY-190], [STORY-191]

##### Tasks для STORY-192:

**[TASK-0749] Backend — invoice generation engine**
- **Тип:** Backend
- **Описание:** Таблицы: (1) `billing_invoices`: id, tenant_id, invoice_number (sequential, format INV-YYYY-NNNNN), status (enum), subtotal, tax_amount, total, currency (USD), issued_at, due_at (issued_at + 14 days), paid_at, stripe_invoice_id, pdf_url, created_at. (2) `billing_invoice_line_items`: id, invoice_id, description, quantity, unit_price, amount, addon_id (nullable). (3) `billing_transactions`: id, tenant_id, invoice_id (nullable), type (charge | refund | credit), amount, payment_method_last4, stripe_charge_id, status, created_at. Cron job: в billing day для каждого active subscription → create invoice with line items → sync to Stripe → send email.
- **Критерии готовности (DoD):**
  - [ ] Invoice numbers sequential без gaps
  - [ ] Line items включают plan + all active add-ons
  - [ ] PDF генерируется с корректным layout
  - [ ] Auto-email отправляется при генерации
- **Оценка:** 16h
- **Story:** [STORY-192]

**[TASK-0750] Backend — PDF template engine**
- **Тип:** Backend
- **Описание:** Go-пакет для генерации PDF инвойсов: шаблон с company logo (из white-label branding), seller/buyer details, line items table, subtotal/tax/total, payment instructions, footer. Библиотека: go-wkhtmltopdf или chromedp для HTML→PDF. HTML template с CSS для print. White-label support: logo и цвета из tenant branding. Файлы сохраняются в S3 с presigned URL (TTL 7 дней). Размер PDF < 500KB.
- **Критерии готовности (DoD):**
  - [ ] PDF рендерится корректно с white-label branding
  - [ ] Все обязательные поля инвойса присутствуют
  - [ ] PDF < 500KB
  - [ ] Presigned URL работает 7 дней
- **Оценка:** 8h
- **Story:** [STORY-192]

**[TASK-0751] Frontend — страница инвойсов и истории платежей**
- **Тип:** Frontend
- **Описание:** (1) Страница "Billing > Invoices": таблица — invoice number, date, amount, status (badge: зелёный paid, жёлтый open, красный overdue, серый void), actions (download PDF, view details). Фильтры: status, date range. (2) Invoice detail: line items breakdown, payment timeline, credit notes. (3) Страница "Billing > Transactions": полная история платежей — date, type, amount, method, status, linked invoice.
- **Критерии готовности (DoD):**
  - [ ] Таблица инвойсов с фильтрами и пагинацией
  - [ ] PDF download работает
  - [ ] Transaction history с linking к инвойсам
  - [ ] Status badges визуально различимы
- **Оценка:** 8h
- **Story:** [STORY-192]

**[TASK-0752] QA — тестирование инвойсов и платежей**
- **Тип:** QA
- **Описание:** (1) Billing day → invoice auto-generated with correct line items. (2) PDF содержит все обязательные поля. (3) Email с PDF attachment отправлен. (4) Invoice number sequential: INV-2026-00001, INV-2026-00002. (5) Filter by status → correct results. (6) Credit note → reduces next invoice. (7) Void invoice → status void, не учитывается в revenue. (8) White-label branding в PDF → correct logo/colors.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] PDF validated: правильный формат, читаемый текст, корректный layout
  - [ ] Financial accuracy: суммы в инвойсе = суммы в Stripe
- **Оценка:** 8h
- **Story:** [STORY-192]

---

#### [STORY-193] Управление trial-периодом (14 дней, auto-convert)

**Как** Network Admin, **я хочу** предоставлять 14-дневный бесплатный trial новым клиентам с автоматической конвертацией в платный план, **чтобы** снизить барьер входа и увеличить конверсию.

**Acceptance Criteria:**
- [ ] AC1: При регистрации нового tenant автоматически создаётся trial subscription: plan = Growth (полный функционал для демонстрации), duration = 14 дней, status = `trialing`. Никакой payment method не требуется для начала trial
- [ ] AC2: Trial countdown: API `GET /api/v1/billing/trial` → days_remaining, trial_end_date, features_available, conversion_options (list of plans). UI banner "X days remaining in trial"
- [ ] AC3: Trial notifications: email за 7 дней до окончания ("Explore premium features"), за 3 дня ("Add payment method to continue"), за 1 день ("Last day of trial"), в день окончания ("Trial ended — upgrade now")
- [ ] AC4: Auto-convert: если payment method добавлен до окончания trial → автоматическая конвертация в выбранный план (или Growth по умолчанию). Если payment method не добавлен → account переходит в `restricted` mode (read-only, no new leads)
- [ ] AC5: Trial extension: Network Admin может продлить trial на 7/14/30 дней через API `POST /api/v1/billing/trial/extend`. Максимум 2 extension per tenant. Audit log для extensions
- [ ] AC6: Trial analytics: conversion rate, average trial duration, feature usage during trial. API `GET /api/v1/billing/trial/analytics` (Network Admin only)

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-21]
**Зависит от:** [STORY-188], [STORY-191]

##### Tasks для STORY-193:

**[TASK-0753] Backend — trial lifecycle management**
- **Тип:** Backend
- **Описание:** Расширить billing_subscriptions: добавить `trial_end_at` (timestamptz), `trial_extended_count` (int, max 2), `trial_extended_by` (FK users, nullable). При создании tenant → auto-create subscription с status=trialing, trial_end_at = now + 14 days, plan_id = Growth. Cron job (каждый час): проверять trial_end_at. За 7/3/1/0 дней → trigger notification. При trial_end_at <= now: если payment method exists → convert to paid (status=active), иначе → restricted mode. Extension API: validate max 2 extensions, update trial_end_at.
- **Критерии готовности (DoD):**
  - [ ] Auto-create trial при регистрации
  - [ ] 4 notification triggers работают (7d, 3d, 1d, 0d)
  - [ ] Auto-convert с payment method работает
  - [ ] Restricted mode без payment method работает
  - [ ] Extension max 2 per tenant enforced
- **Оценка:** 8h
- **Story:** [STORY-193]

**[TASK-0754] Frontend — trial experience и conversion flow**
- **Тип:** Frontend
- **Описание:** (1) Trial banner (top of every page): "You have X days left in your free trial. [Add Payment Method] [View Plans]". Цвет: зелёный (>7 дней), жёлтый (3-7 дней), красный (<3 дней). (2) Trial dashboard widget: countdown timer, feature highlights, "What you'll lose" section. (3) Conversion modal: план comparison, "Start subscription" flow → Stripe Checkout. (4) Restricted mode UI: серый overlay, "Your trial has ended. [Upgrade Now]" blocking modal, read-only data access.
- **Критерии готовности (DoD):**
  - [ ] Banner отображается на всех страницах во время trial
  - [ ] Цвет banner меняется по countdown
  - [ ] Conversion flow проходит до оплаты
  - [ ] Restricted mode блокирует write-операции
- **Оценка:** 8h
- **Story:** [STORY-193]

**[TASK-0755] QA — тестирование trial lifecycle**
- **Тип:** QA
- **Описание:** (1) New tenant → trial 14 days, Growth features. (2) Day 7 → email notification. (3) Day 14, payment method present → auto-convert to paid. (4) Day 14, no payment method → restricted mode. (5) Restricted mode: GET /leads → works, POST /leads → 403. (6) Extension 1 → +7 days, extension 2 → +14 days, extension 3 → 422. (7) Add payment after restricted → restored < 10 min. (8) Trial analytics: correct conversion rate.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Email delivery timing verified (± 1 час)
  - [ ] Restricted mode enforcement проверен на 10+ endpoints
- **Оценка:** 4h
- **Story:** [STORY-193]

---

#### [STORY-194] Plan upgrade/downgrade flow с proration

**Как** Network Admin, **я хочу** менять тарифный план (upgrade/downgrade) с автоматическим расчётом proration, **чтобы** платить только за реально использованный период каждого плана.

**Acceptance Criteria:**
- [ ] AC1: Upgrade (Starter → Growth): немедленная активация нового плана. Proration credit за оставшиеся дни старого плана. Формула: `credit = (remaining_days / total_period_days) * old_plan_price`. Charge: `new_plan_price - credit` (если positive) или credit balance (если negative)
- [ ] AC2: Downgrade (Growth → Starter): подтверждение features loss warning (список функций, которые будут отключены). Downgrade effective at end of current billing period. Email confirmation с датой вступления в силу
- [ ] AC3: Preview API: `POST /api/v1/billing/subscriptions/change-preview` — возвращает: `{current_plan, new_plan, proration_credit, immediate_charge, features_gained, features_lost, effective_date}` без выполнения изменения
- [ ] AC4: Mid-cycle billing change limit: max 3 plan changes per billing period. При превышении → HTTP 429 `PLAN_CHANGE_LIMIT_EXCEEDED`
- [ ] AC5: Confirm API: `POST /api/v1/billing/subscriptions/change-confirm` — выполняет изменение после preview. Требует explicit `confirm: true` в body

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-21]
**Зависит от:** [STORY-188], [STORY-191]

##### Tasks для STORY-194:

**[TASK-0756] Backend — proration engine и plan change API**
- **Тип:** Backend
- **Описание:** Proration calculator: (1) Определить remaining_days в текущем billing period. (2) Рассчитать credit за unused days старого плана. (3) Для upgrade: create Stripe proration invoice item. (4) Для downgrade: schedule cancel_at_period_end + create new subscription starting at period end. Plan change tracking: таблица billing_plan_changes (subscription_id, from_plan, to_plan, type, proration_amount, effective_at). Change limit: counter per subscription per period, max 3. Preview endpoint: calculate without executing. Confirm endpoint: execute with idempotency key.
- **Критерии готовности (DoD):**
  - [ ] Proration расчёт корректен для monthly/quarterly/annual
  - [ ] Upgrade immediate, downgrade end-of-period
  - [ ] Preview → Confirm flow с idempotency
  - [ ] Change limit 3 per period enforced
- **Оценка:** 8h
- **Story:** [STORY-194]

**[TASK-0757] Frontend — plan change wizard**
- **Тип:** Frontend
- **Описание:** Flow: (1) Click "Change Plan" → plan selection page с current plan highlighted. (2) Select new plan → preview page: side-by-side comparison (current vs new), proration calculation breakdown, features gained/lost (зелёный/красный), effective date, amount due today. (3) For downgrade: warning banner "You will lose access to: [feature list]" with acknowledge checkbox. (4) Confirm button → loading → success/error. (5) Success: updated subscription badge, confirmation email.
- **Критерии готовности (DoD):**
  - [ ] Preview показывает корректную proration
  - [ ] Features gained/lost чётко выделены цветом
  - [ ] Downgrade warning с acknowledge checkbox
  - [ ] Confirm → success flow работает end-to-end
- **Оценка:** 8h
- **Story:** [STORY-194]

**[TASK-0758] QA — тестирование plan changes с proration**
- **Тип:** QA
- **Описание:** (1) Upgrade Starter→Growth day 15 of 30 → credit $199.50, charge $699 - $199.50 = $499.50. (2) Downgrade Growth→Starter → effective end of period. (3) Annual billing upgrade → correct proration. (4) 4th plan change in period → 429. (5) Preview → amounts match confirm. (6) Downgrade features lost → correct list. (7) Stripe invoice matches our calculation.
- **Критерии готовности (DoD):**
  - [ ] 7 тест-кейсов проходят
  - [ ] Proration verified: 10 scenarios с разными днями/циклами
  - [ ] Stripe reconciliation: наш расчёт = Stripe charge
- **Оценка:** 4h
- **Story:** [STORY-194]

---

#### [STORY-195] Dunning management (failed payments, grace period, suspension)

**Как** Finance Manager, **я хочу** автоматический dunning-процесс для неудачных платежей с grace period и пошаговой эскалацией, **чтобы** минимизировать involuntary churn и восстанавливать оплату без ручного вмешательства.

**Acceptance Criteria:**
- [ ] AC1: Dunning workflow при `invoice.payment_failed`: Step 1 (T+0): immediate retry + email "Payment failed, please update your card". Step 2 (T+3): second retry + email "Action required: update payment method". Step 3 (T+7): third retry + email "Your account will be restricted in 7 days". Step 4 (T+14): account → restricted mode, email "Account restricted"
- [ ] AC2: Grace period: T+0 до T+14 — полный доступ к платформе. После T+14 — restricted mode (read-only, no new leads, no API access except billing endpoints)
- [ ] AC3: Recovery: успешная оплата на любом шаге → immediate восстановление полного доступа < 10 минут. Status: `past_due` → `active`. Email "Payment received, access restored"
- [ ] AC4: API `GET /api/v1/billing/dunning/status` — текущий dunning stage, next retry date, days until restriction. API `PUT /api/v1/billing/dunning/settings` — настройка интервалов (T+X configurable), email templates
- [ ] AC5: Dunning analytics: recovery rate per step (% успешных retry на каждом шаге), total recovered amount, churn rate from dunning. Dashboard для Finance Manager
- [ ] AC6: Manual override: Network Admin может отменить dunning (grant access despite failed payment) или запустить immediate retry через `POST /api/v1/billing/dunning/retry-now`

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-21]
**Зависит от:** [STORY-191], [STORY-192]

##### Tasks для STORY-195:

**[TASK-0759] Backend — dunning workflow engine**
- **Тип:** Backend
- **Описание:** Таблица `billing_dunning`: id, tenant_id, invoice_id, current_step (1-4), next_retry_at, restrict_at (T+14 from first failure), status (active, recovered, restricted, overridden), retry_count, created_at, updated_at. State machine: payment_failed → step1 (retry now) → step2 (T+3) → step3 (T+7) → step4 (T+14 restrict). Cron job (каждый час): проверять next_retry_at, выполнять Stripe retry, обновлять step. Webhook handler: invoice.paid during dunning → recover immediately. Manual override: set status=overridden, log in audit.
- **Критерии готовности (DoD):**
  - [ ] 4-step state machine работает корректно
  - [ ] Retry timing соблюдается (± 1 час)
  - [ ] Recovery < 10 минут от успешной оплаты
  - [ ] Manual override работает с audit log
- **Оценка:** 8h
- **Story:** [STORY-195]

**[TASK-0760] Frontend — dunning status и recovery UI**
- **Тип:** Frontend
- **Описание:** (1) Billing page: dunning status banner — красный для past_due, с описанием текущего шага и next action. (2) Payment retry button: "Retry Payment Now" (manual trigger). (3) Update payment method shortcut: "Update Card" → Stripe Elements. (4) Restricted mode overlay: серый экран с "Your account is restricted due to unpaid invoice. [Pay Now] [Contact Support]". (5) Admin dunning dashboard: список tenants в dunning, current step, amount due, actions (override, retry, contact).
- **Критерии готовности (DoD):**
  - [ ] Dunning banner отображается на всех страницах
  - [ ] Manual retry запускает Stripe charge
  - [ ] Restricted mode overlay блокирует UI
  - [ ] Admin dashboard показывает все dunning cases
- **Оценка:** 8h
- **Story:** [STORY-195]

**[TASK-0761] QA — тестирование dunning lifecycle**
- **Тип:** QA
- **Описание:** (1) Payment failed → step 1 email + retry. (2) T+3 → step 2 email + retry. (3) T+7 → step 3 email + retry. (4) T+14 → restricted mode activated. (5) Payment during step 2 → recovered, full access < 10 min. (6) Payment in restricted mode → restored < 10 min. (7) Manual override → access granted despite failed payment. (8) Manual retry → Stripe charge attempted. (9) Recovery analytics: correct rates per step.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Email delivery verified на каждом шаге
  - [ ] Recovery timing < 10 минут verified
- **Оценка:** 8h
- **Story:** [STORY-195]

---

## [EPIC-22] Compliance & Security Hardening

**Цель:** Подготовить платформу к прохождению SOC 2 Type II аудита и полному соответствию GDPR, усилить security baseline через tamper-proof audit logs, IP whitelisting, advanced session management, программу penetration testing и шифрование данных на всех уровнях (AES-256 at rest, TLS 1.3 in transit).

**Метрика успеха:**
- Готовность к SOC 2 Type II аудиту: 100% контролей задокументированы с evidence, 0 critical findings при pre-audit
- GDPR Data Subject Requests обрабатываются в SLA < 30 дней, 100% completion rate
- High/Critical уязвимости закрываются < 7 дней от обнаружения
- 100% критичных действий записываются в immutable audit log
- 0 security incidents уровня P1/P2 за 12 месяцев после hardening
- Penetration test score >= 85/100 (по OWASP methodology)

**Приоритет:** P3 (Scale)
**Зависит от:** [EPIC-06]
**Оценка:** L

---

### Stories:

---

#### [STORY-196] Подготовка к SOC 2 Type II (политики, процедуры, evidence collection)

**Как** Network Admin, **я хочу** внедрить SOC 2 контроли с автоматическим сбором evidence, **чтобы** пройти SOC 2 Type II аудит без блокеров и продемонстрировать enterprise-клиентам надёжность платформы.

**Acceptance Criteria:**
- [ ] AC1: Реестр контролей (controls registry): API `GET /api/v1/compliance/controls` — список из 50+ контролей, сгруппированных по Trust Service Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy). Каждый контроль: id, category, title, description, owner, status (compliant | partially_compliant | non_compliant | not_assessed), last_assessed_at
- [ ] AC2: Evidence collection: для каждого контроля — список evidence items. Автоматический сбор evidence через scheduled jobs: access review logs (monthly), change management records, incident response logs, backup verification, uptime metrics. API `POST /api/v1/compliance/controls/{id}/evidence` для manual evidence upload (PDF/screenshot, max 10MB)
- [ ] AC3: Compliance scorecard: API `GET /api/v1/compliance/scorecard` — aggregate score (0-100%), breakdown по категориям, trend за 12 месяцев. Auto-generated monthly с email notification. Score: (compliant controls / total controls) * 100
- [ ] AC4: Remediation tracking: для non-compliant контролей — remediation plan с owner, deadline, status. API `PUT /api/v1/compliance/controls/{id}/remediation`. Overdue remediations → alert
- [ ] AC5: Policy documents: CRUD API для policies (Information Security, Access Control, Incident Response, Change Management, etc.). Version control: каждое изменение создаёт новую версию. Employee acknowledgment tracking

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-22]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-196:

**[TASK-0762] Backend — controls registry и evidence management**
- **Тип:** Backend
- **Описание:** Таблицы: (1) `compliance_controls`: id, category (enum: security, availability, processing_integrity, confidentiality, privacy), code (varchar 20, e.g. CC6.1), title, description, owner_id (FK users), status (enum), frequency (enum: continuous, daily, weekly, monthly, quarterly, annual), last_assessed_at, created_at. (2) `compliance_evidence`: id, control_id, type (automatic | manual), source (enum: access_logs, change_mgmt, incident_response, backup, uptime, manual_upload), file_url (nullable), metadata (JSONB), collected_at, period_start, period_end. (3) `compliance_remediations`: id, control_id, description, owner_id, deadline, status (open, in_progress, completed, overdue), completed_at. Seed 50+ controls по SOC 2 TSC. Scheduled jobs: monthly access review evidence, weekly change mgmt evidence, daily uptime evidence.
- **Критерии готовности (DoD):**
  - [ ] 50+ контролей загружены seed-ом по SOC 2 TSC
  - [ ] Automatic evidence collection для 5+ sources работает
  - [ ] Manual evidence upload до 10MB
  - [ ] Remediation tracking с overdue alerts
- **Оценка:** 16h
- **Story:** [STORY-196]

**[TASK-0763] Backend — compliance scorecard и policy management**
- **Тип:** Backend
- **Описание:** Scorecard calculation: aggregate по категориям и общий score. Monthly snapshot в таблице `compliance_scorecards`: id, month, total_score, category_scores (JSONB), controls_compliant, controls_total, created_at. Auto-generated первого числа каждого месяца. Policy management: таблица `compliance_policies`: id, title, type (enum), content_html (text), version (int), is_active, published_at, created_by. Policy acknowledgments: `compliance_policy_acks`: user_id, policy_id, version, acknowledged_at.
- **Критерии готовности (DoD):**
  - [ ] Scorecard рассчитывается корректно
  - [ ] Monthly snapshot создаётся автоматически
  - [ ] Policy versioning работает
  - [ ] Acknowledgment tracking для всех пользователей
- **Оценка:** 8h
- **Story:** [STORY-196]

**[TASK-0764] Frontend — compliance dashboard**
- **Тип:** Frontend
- **Описание:** Страница "Compliance > Dashboard": (1) Scorecard: общий score (gauge chart), breakdown по 5 категориям (horizontal bar chart). (2) Controls table: filterable по category, status, owner. Click → detail page с evidence list, remediation plan. (3) Evidence timeline: chronological view, auto-collected vs manual uploaded badge. (4) Policy library: список policies с version, acknowledgment rate (%). "Acknowledge" button для текущего user. (5) Monthly trend chart: score за 12 месяцев.
- **Критерии готовности (DoD):**
  - [ ] Scorecard gauge обновляется при изменении control status
  - [ ] Controls table с 50+ записями работает без лагов
  - [ ] Evidence timeline показывает auto/manual items
  - [ ] Policy acknowledgment flow работает
- **Оценка:** 16h
- **Story:** [STORY-196]

**[TASK-0765] QA — тестирование SOC 2 compliance framework**
- **Тип:** QA
- **Описание:** (1) 50+ controls seed → all visible in API/UI. (2) Auto-evidence collection: access logs → evidence created monthly. (3) Manual evidence upload 5MB PDF → success. (4) Manual evidence 15MB → 413. (5) Scorecard: 40/50 compliant → 80%. (6) Remediation overdue → alert triggered. (7) Policy publish → acknowledgment tracking starts. (8) Policy version 2 → re-acknowledgment required. (9) Monthly scorecard auto-generated.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Scorecard calculation verified для edge cases (0%, 100%, partial)
  - [ ] Auto-evidence collection verified для all sources
- **Оценка:** 8h
- **Story:** [STORY-196]

---

#### [STORY-197] GDPR compliance (data deletion requests, consent management, DPA)

**Как** Network Admin, **я хочу** обрабатывать GDPR Data Subject Requests (export, delete, rectify) и управлять consent, **чтобы** соблюдать требования GDPR и защитить платформу от штрафов.

**Acceptance Criteria:**
- [ ] AC1: API `POST /api/v1/privacy/requests` создаёт DSR: type (export | delete | rectify | access), data_subject_email, requester_details, notes. Status flow: submitted → verified → processing → completed / rejected. SLA: completed < 30 дней от submission
- [ ] AC2: Data export (type=export): собирает все персональные данные data subject из всех систем (leads, transactions, communications, audit logs) в JSON + CSV archive. Download link с TTL 48 часов. Encrypted archive (AES-256, пароль отправляется отдельным email)
- [ ] AC3: Data deletion (type=delete): каскадное удаление/анонимизация из всех хранилищ — PostgreSQL (UPDATE set email='deleted', name='deleted', phone=null), Redis (DEL keys matching subject), S3 (delete uploaded files), Elasticsearch (delete documents), backup exclusion list. Verification: post-deletion search confirms 0 results
- [ ] AC4: Consent management: API `GET /api/v1/privacy/consents/{email}` — все active consents для data subject. `PUT /api/v1/privacy/consents/{email}` — update consent (marketing, analytics, third_party_sharing). Consent stored with timestamp, IP, user_agent
- [ ] AC5: DPA (Data Processing Agreement): template generator API `POST /api/v1/privacy/dpa/generate` с параметрами (company name, processing purposes, data categories). PDF output. Signed DPAs stored in compliance evidence
- [ ] AC6: Privacy audit trail: все DSR operations logged separately from main audit log. Immutable, retention 5 years

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-22]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-197:

**[TASK-0766] Backend — Data Subject Request workflow**
- **Тип:** Backend
- **Описание:** Таблицы: (1) `privacy_requests`: id, tenant_id, type (enum), data_subject_email, requester_name, requester_email, status (enum: submitted, verified, processing, completed, rejected), sla_deadline (submitted_at + 30 days), notes, completed_at, completed_by, created_at. (2) `privacy_request_logs`: id, request_id, action, details (JSONB), actor_id, created_at. API: POST create, GET list/detail, PUT update status. Email verification: при создании DSR → email с confirmation link к data subject. Processing orchestrator: async job координирует deletion/export across systems.
- **Критерии готовности (DoD):**
  - [ ] Full lifecycle: submitted → verified → processing → completed
  - [ ] SLA tracking: warning at 20 days, critical at 25 days
  - [ ] Email verification prevents unauthorized requests
  - [ ] All actions logged in privacy_request_logs
- **Оценка:** 16h
- **Story:** [STORY-197]

**[TASK-0767] Backend — data export и deletion orchestrator**
- **Тип:** Backend
- **Описание:** Export orchestrator: (1) Query all systems for data_subject_email: leads table, transactions, communications, audit entries. (2) Compile into JSON + CSV. (3) Encrypt archive (AES-256-GCM, random password). (4) Upload to S3 (TTL 48h presigned URL). (5) Send download link to requester, password separately. Deletion orchestrator: (1) PostgreSQL: anonymize (email→deleted_HASH, name→'[DELETED]', phone→NULL, ip→NULL) in leads, transactions, communications. (2) Redis: scan and DEL keys matching email pattern. (3) S3: delete files uploaded by subject. (4) Elasticsearch: delete docs by email. (5) Add to backup exclusion list. (6) Verification scan: search all systems → 0 PII results. Report: list of systems processed, records affected.
- **Критерии готовности (DoD):**
  - [ ] Export includes data from all 5+ systems
  - [ ] Encrypted archive с separate password delivery
  - [ ] Deletion covers PostgreSQL, Redis, S3, Elasticsearch
  - [ ] Post-deletion verification confirms 0 PII results
  - [ ] Backup exclusion list updated
- **Оценка:** 16h
- **Story:** [STORY-197]

**[TASK-0768] Backend — consent management и DPA generator**
- **Тип:** Backend
- **Описание:** Таблица `privacy_consents`: id, tenant_id, data_subject_email, consent_type (enum: marketing, analytics, third_party_sharing, data_processing), status (granted | revoked), granted_at, revoked_at, ip_address, user_agent. API: GET consents by email, PUT update consent. DPA generator: Go template → HTML → PDF. Template variables: company_name, processing_purposes (array), data_categories (array), sub_processors (array), dpo_contact, effective_date. PDF stored in S3, linked to compliance evidence.
- **Критерии готовности (DoD):**
  - [ ] Consent CRUD с полной audit trail
  - [ ] Consent revocation немедленно влияет на обработку
  - [ ] DPA PDF генерируется с корректным содержимым
  - [ ] DPA linked to compliance evidence
- **Оценка:** 8h
- **Story:** [STORY-197]

**[TASK-0769] Frontend — Privacy Center**
- **Тип:** Frontend
- **Описание:** Страница "Compliance > Privacy Center": (1) DSR inbox: таблица requests с status badge, SLA countdown (days remaining), action buttons (verify, process, complete, reject). (2) Request detail: timeline, affected systems, data export download, deletion report. (3) Consent viewer: search by email → list of consents с toggle grant/revoke. (4) DPA generator: form → preview → generate PDF → download. (5) Privacy metrics: open requests, average processing time, overdue count.
- **Критерии готовности (DoD):**
  - [ ] DSR inbox с SLA countdown отображается корректно
  - [ ] Request processing flow работает end-to-end
  - [ ] Consent viewer и toggle работают
  - [ ] DPA PDF генерируется и скачивается
- **Оценка:** 8h
- **Story:** [STORY-197]

**[TASK-0770] QA — тестирование GDPR compliance**
- **Тип:** QA
- **Описание:** (1) Create DSR export → archive with all data generated. (2) Archive encrypted → can't open without password. (3) Download link expires after 48h. (4) DSR delete → PII removed from PostgreSQL, Redis, S3, ES. (5) Post-deletion verification → 0 PII results. (6) Consent revoke → marketing emails stopped. (7) DPA generated → PDF valid with correct data. (8) SLA 30 days → overdue alert at day 25. (9) Privacy audit trail → all actions logged. (10) Unauthorized DSR (no email verification) → rejected.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Deletion completeness verified across all storage systems
  - [ ] Consent enforcement verified for all processing types
- **Оценка:** 8h
- **Story:** [STORY-197]

---

#### [STORY-198] Enhanced audit logs (tamper-proof, searchable, exportable)

**Как** Finance Manager, **я хочу** неизменяемые (tamper-proof) audit logs с быстрым поиском и экспортом, **чтобы** расследования и аудиторские проверки имели юридическую силу.

**Acceptance Criteria:**
- [ ] AC1: Tamper-proof mechanism: каждая запись содержит `hash` = SHA-256(previous_hash + record_data). Hash-chain: изменение или удаление любой записи разрывает цепочку. Background integrity checker: каждые 6 часов проверяет целостность цепочки. При обнаружении разрыва → P1 alert
- [ ] AC2: API `GET /api/v1/audit/search` с full-text search (Elasticsearch). Фильтры: actor, action, resource_type, resource_id, date_range, severity (info | warning | critical). Response time < 2 секунды для запросов за 90 дней при 10M+ записей
- [ ] AC3: Export: CSV (до 100K записей, async), PDF report (до 10K записей, formatted). Download link с TTL 24 часа. API `POST /api/v1/audit/export` → returns job_id → `GET /api/v1/audit/export/{job_id}/status`
- [ ] AC4: Retention: hot storage (Elasticsearch) 1 год, warm storage (S3 compressed) 7 лет. Automatic tiering: records > 1 year moved daily. Archive search: `POST /api/v1/audit/archive-search` → async, results < 4 часа
- [ ] AC5: Structured format: каждая запись содержит: timestamp, actor_id, actor_email, actor_role, action (enum 50+ actions), resource_type, resource_id, resource_name, old_value, new_value, ip_address, user_agent, session_id, tenant_id, severity, request_id (correlation)
- [ ] AC6: Critical actions (user deletion, role change, payment, data export) automatically tagged severity=critical. Webhook notification при critical events

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-22]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-198:

**[TASK-0771] Backend — tamper-proof audit log с hash-chain**
- **Тип:** Backend
- **Описание:** Таблица `audit_logs` (append-only, no UPDATE/DELETE permissions for app user): id (bigserial), tenant_id, actor_id, actor_email, actor_role, action (varchar 100), resource_type, resource_id, resource_name, old_value (JSONB), new_value (JSONB), ip_address (inet), user_agent, session_id, request_id, severity (enum: info, warning, critical), hash (varchar 64 — SHA-256), previous_hash (varchar 64), created_at (timestamptz). Hash calculation: SHA-256(previous_hash || tenant_id || actor_id || action || resource_type || resource_id || old_value || new_value || created_at). DB user for audit: separate role with INSERT only, no UPDATE/DELETE. Integrity checker: cron job каждые 6 часов — traverse chain, verify hashes, alert on mismatch.
- **Критерии готовности (DoD):**
  - [ ] Hash-chain строится корректно
  - [ ] DB user не может UPDATE/DELETE audit записи
  - [ ] Integrity checker обнаруживает tampering
  - [ ] P1 alert при нарушении целостности
- **Оценка:** 16h
- **Story:** [STORY-198]

**[TASK-0772] Backend — Elasticsearch indexing и search API**
- **Тип:** Backend
- **Описание:** Elasticsearch index `audit_logs` с mapping: all fields from DB + full-text на actor_email, resource_name, old_value, new_value. Async indexing pipeline: PostgreSQL → CDC (Debezium/WAL) → Kafka → Elasticsearch consumer. Search API: `GET /api/v1/audit/search` с query DSL: full_text (string), filters (actor, action, resource_type, date_range, severity), sort (created_at DESC default), pagination (cursor-based, page_size 20-100). Export API: async job → S3 → presigned URL. Archive: daily job moves records > 1 year from ES → S3 (gzip compressed JSON Lines).
- **Критерии готовности (DoD):**
  - [ ] CDC pipeline: PostgreSQL → ES latency < 30 секунд
  - [ ] Search < 2 сек на 10M+ записей
  - [ ] Export async job с progress tracking
  - [ ] Archive tiering: daily автоматически
- **Оценка:** 16h
- **Story:** [STORY-198]

**[TASK-0773] Frontend — audit log search interface**
- **Тип:** Frontend
- **Описание:** Страница "Security > Audit Logs": (1) Search bar с full-text search + advanced filters (actor dropdown, action type multiselect, resource type, date range, severity). (2) Results table: timestamp, actor (avatar + email), action (badge colored by severity), resource, summary (truncated). (3) Detail drawer: full record — old/new values diff, hash, previous_hash, IP, user agent, session ID. (4) Export buttons: CSV (100K limit), PDF report (10K limit) с progress indicator. (5) Integrity status: badge "Chain Verified" (green) or "Integrity Alert" (red) с last check timestamp. (6) Real-time: new critical events highlighted with yellow flash.
- **Критерии готовности (DoD):**
  - [ ] Search с фильтрами возвращает результаты < 2 сек
  - [ ] Detail drawer показывает полную запись с diff
  - [ ] Export с progress indicator
  - [ ] Integrity badge актуален
- **Оценка:** 8h
- **Story:** [STORY-198]

**[TASK-0774] QA — тестирование tamper-proof audit logs**
- **Тип:** QA
- **Описание:** (1) Create lead → audit entry with correct hash. (2) Verify hash chain: 100 sequential records → chain valid. (3) Tamper test: direct DB update on audit record → integrity checker detects → P1 alert. (4) Search by actor → correct results < 2 sec. (5) Search by date range 90 days → < 2 sec. (6) Full-text search "deleted user" → relevant results. (7) Export 50K records CSV → file generated < 5 min. (8) Archive search (records > 1 year) → results < 4 hours. (9) Critical action → severity=critical + webhook notification. (10) 10M records load test → search < 2 sec.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Tamper detection verified с 3 different tampering scenarios
  - [ ] Performance: 10M records → search < 2 sec
- **Оценка:** 8h
- **Story:** [STORY-198]

---

#### [STORY-199] IP whitelist per account (ограничение API-доступа)

**Как** Network Admin, **я хочу** настроить IP whitelist для ограничения API-доступа к платформе, **чтобы** только авторизованные IP-адреса/подсети могли взаимодействовать с API и снизить риск несанкционированного доступа.

**Acceptance Criteria:**
- [ ] AC1: API `PUT /api/v1/security/ip-whitelist` принимает массив IP-адресов и CIDR-подсетей (IPv4 и IPv6). Максимум 50 записей per tenant. Валидация: корректный IP формат, private IP ranges allowed (для VPN), не допускать 0.0.0.0/0 (all traffic)
- [ ] AC2: Enforcement modes: `audit` (log violations, don't block), `enforce` (block + log). API `PUT /api/v1/security/ip-whitelist/mode` — переключение. Default mode: audit (первые 7 дней после включения)
- [ ] AC3: При enforce mode: запрос с IP вне whitelist → HTTP 403 `IP_NOT_WHITELISTED` с логированием (IP, user, endpoint, timestamp). UI login с non-whitelisted IP → blocked с "Contact your administrator"
- [ ] AC4: Whitelist bypass для emergency: Network Admin может создать temporary bypass token (TTL 1-24 часа) через `POST /api/v1/security/ip-whitelist/bypass`. Audit log entry для каждого использования bypass. Max 3 active bypass tokens
- [ ] AC5: IP whitelist analytics: blocked requests per day (chart), top blocked IPs, geo distribution of blocks. API `GET /api/v1/security/ip-whitelist/analytics`

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-22]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-199:

**[TASK-0775] Backend — IP whitelist management и enforcement**
- **Тип:** Backend
- **Описание:** Таблица `security_ip_whitelist`: id, tenant_id, ip_address (inet — supports IPv4/IPv6 + CIDR), label (varchar 100, optional — e.g. "Office NYC"), created_by, created_at. Таблица `security_ip_whitelist_config`: tenant_id (unique), mode (audit | enforce), enabled_at, enforce_starts_at (enabled_at + 7 days for auto-transition). Middleware: на каждый request проверять IP клиента (X-Forwarded-For с trust proxy) против whitelist. Redis cache для whitelist (TTL 60s, invalidate on change). При enforce + IP not in whitelist → 403. При audit → log + allow. Bypass: таблица `security_ip_bypass_tokens`: token (UUID), tenant_id, expires_at, created_by, used_count.
- **Критерии готовности (DoD):**
  - [ ] IPv4 и IPv6 с CIDR поддерживаются
  - [ ] Audit mode логирует без блокировки
  - [ ] Enforce mode блокирует с 403
  - [ ] Redis cache с 60s TTL для performance
  - [ ] Bypass tokens работают с audit trail
- **Оценка:** 8h
- **Story:** [STORY-199]

**[TASK-0776] Frontend — IP whitelist management UI**
- **Тип:** Frontend
- **Описание:** Страница "Security > IP Whitelist": (1) Toggle: Enable/Disable whitelist. (2) Mode switch: Audit / Enforce с warning about 7-day grace period. (3) IP list: table с IP/CIDR, label, added by, date. "Add IP" modal с validation. "Add My Current IP" quick button. (4) Bypass tokens section: active tokens, create new (TTL selector), revoke. (5) Analytics tab: blocked requests chart (30 days), top 10 blocked IPs, geo map of blocked attempts.
- **Критерии готовности (DoD):**
  - [ ] IP добавляется с валидацией формата
  - [ ] "Add My Current IP" определяет и добавляет текущий IP
  - [ ] Mode switch с confirmation dialog
  - [ ] Analytics charts рендерятся
- **Оценка:** 8h
- **Story:** [STORY-199]

**[TASK-0777] QA — тестирование IP whitelist**
- **Тип:** QA
- **Описание:** (1) Add IP 192.168.1.1 → whitelist updated. (2) Add CIDR 10.0.0.0/24 → all IPs in range allowed. (3) Enforce mode + non-whitelisted IP → 403. (4) Audit mode + non-whitelisted IP → allowed + logged. (5) 51st IP entry → 422. (6) 0.0.0.0/0 → 422 (blocked). (7) Bypass token → non-whitelisted IP allowed. (8) Expired bypass → 403. (9) 4th bypass token → 422. (10) IPv6 address → supported. (11) X-Forwarded-For spoofing → trusted proxy only.
- **Критерии готовности (DoD):**
  - [ ] 11 тест-кейсов проходят
  - [ ] Performance: whitelist check < 1ms (Redis cache)
  - [ ] Security: X-Forwarded-For spoofing blocked
- **Оценка:** 4h
- **Story:** [STORY-199]

---

#### [STORY-200] Advanced session management (concurrent limits, geo-alerts)

**Как** Network Admin, **я хочу** управлять сессиями пользователей с лимитами на concurrent sessions и alert-ами при подозрительных geo-входах, **чтобы** предотвращать account takeover и обеспечить security compliance.

**Acceptance Criteria:**
- [ ] AC1: Concurrent session limit: configurable per tenant (1-10, default 3). При превышении — oldest session terminated (LIFO) или login denied (configurable strategy: terminate_oldest | deny_new). API `PUT /api/v1/security/session-policy`
- [ ] AC2: Active sessions list: API `GET /api/v1/security/sessions` — все active сессии current user: session_id, ip_address, geo (country, city), device (browser + OS from user-agent), created_at, last_active_at. "Terminate" action per session + "Terminate All Other Sessions"
- [ ] AC3: Geo-based alerts: при login с нового country (не виденного за последние 90 дней) → email alert "Login from new location: {country}, {city}". При login с 2+ countries в течение 1 часа (impossible travel) → critical alert + require MFA re-verification
- [ ] AC4: Session timeout: configurable idle timeout (15 min - 24 hours, default 4 hours). Absolute session lifetime: configurable (1 hour - 30 days, default 7 days). На frontend: warning modal за 5 минут до timeout с "Extend Session" button
- [ ] AC5: Session audit: все session events (login, logout, timeout, terminated, geo_alert) записываются в audit log с full context (IP, geo, device)
- [ ] AC6: Admin session overview: Network Admin видит all active sessions across tenant. Force terminate any session. Bulk terminate по фильтру (e.g., all sessions from specific country)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-22]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-200:

**[TASK-0778] Backend — session management service**
- **Тип:** Backend
- **Описание:** Расширить таблицу `user_sessions`: добавить `ip_address` (inet), `geo_country` (varchar 2, ISO 3166), `geo_city` (varchar 100), `device_info` (JSONB: browser, os, device_type), `last_active_at` (timestamptz), `terminated_at` (nullable), `terminated_reason` (enum: logout, timeout, admin, concurrent_limit). Session policy: таблица `security_session_policies`: tenant_id, max_concurrent (int 1-10), strategy (terminate_oldest | deny_new), idle_timeout_minutes (int), absolute_lifetime_hours (int). Middleware: на каждом request — update last_active_at, check idle timeout, check absolute lifetime. Geo lookup: MaxMind GeoIP2 database (updated weekly).
- **Критерии готовности (DoD):**
  - [ ] Concurrent session limit enforced
  - [ ] Idle timeout и absolute lifetime работают
  - [ ] Geo lookup корректен (accuracy level: country)
  - [ ] Session termination мгновенна (JWT blacklist + Redis)
- **Оценка:** 16h
- **Story:** [STORY-200]

**[TASK-0779] Backend — geo-based alerts и impossible travel detection**
- **Тип:** Backend
- **Описание:** При каждом login: (1) Lookup geo country/city. (2) Compare с login history за 90 дней. (3) Если новый country → email alert "New location login". (4) Impossible travel check: если login из country A и login из country B в течение 1 часа, и расстояние > 500km → critical alert + flag session as suspicious + require MFA. Geo history: таблица `user_login_history`: user_id, ip, country, city, created_at. Alert через email + webhook + in-app notification.
- **Критерии готовности (DoD):**
  - [ ] New country alert отправляется корректно
  - [ ] Impossible travel detection: distance calculation работает
  - [ ] MFA re-verification required при impossible travel
  - [ ] Alerts доставляются по всем каналам
- **Оценка:** 8h
- **Story:** [STORY-200]

**[TASK-0780] Frontend — session management UI**
- **Тип:** Frontend
- **Описание:** (1) Страница "Security > Sessions" (per user): list active sessions — current session (highlighted), other sessions с IP, location (flag + city), device (icon + browser/OS), last active. "Terminate" per session, "Terminate All Others". (2) Session timeout warning: modal за 5 минут "Your session will expire in 5:00. [Extend] [Logout]" с countdown. (3) Admin view: "Security > All Sessions" — all tenant sessions, filterable by user, country, device. Bulk actions: terminate selected, terminate by country. (4) Session policy settings: concurrent limit slider, strategy radio, timeout inputs. (5) Geo alert settings: enable/disable, notification channels.
- **Критерии готовности (DoD):**
  - [ ] Active sessions list с geo/device info
  - [ ] Terminate session работает мгновенно
  - [ ] Timeout warning modal с countdown
  - [ ] Admin bulk actions работают
- **Оценка:** 8h
- **Story:** [STORY-200]

**[TASK-0781] QA — тестирование session management**
- **Тип:** QA
- **Описание:** (1) Max 3 concurrent sessions → 4th login → oldest terminated (or denied). (2) Idle 4 hours → session expired. (3) Absolute lifetime 7 days → session expired. (4) Timeout warning at 5 min → modal shown. (5) Extend session → timeout reset. (6) New country login → email alert. (7) Impossible travel (2 countries, 30 min) → critical alert + MFA required. (8) Admin terminate session → user immediately logged out. (9) Bulk terminate by country → all sessions from country terminated. (10) Session audit: all events logged.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Concurrent session enforcement verified with race conditions
  - [ ] Impossible travel detection: 5 scenarios с разными расстояниями/временем
- **Оценка:** 8h
- **Story:** [STORY-200]

---

#### [STORY-201] Программа penetration testing и bug bounty

**Как** Network Admin, **я хочу** регулярные penetration tests и программу bug bounty с отслеживанием уязвимостей и SLA на remediation, **чтобы** проактивно находить и устранять уязвимости до того, как их найдут злоумышленники.

**Acceptance Criteria:**
- [ ] AC1: Vulnerability registry: API `GET /api/v1/security/vulnerabilities` — список уязвимостей с полями: id, source (pentest | bug_bounty | sast | dast | dependency_scan), severity (critical | high | medium | low | info), title, description, affected_component, cvss_score (0.0-10.0), status (open | in_progress | resolved | accepted_risk | false_positive), assignee, discovered_at, resolved_at
- [ ] AC2: SLA по severity: Critical < 24 часа, High < 7 дней, Medium < 30 дней, Low < 90 дней. Auto-escalation при просрочке SLA: email → Slack → PagerDuty
- [ ] AC3: Pentest scheduling: quarterly pentests. API `POST /api/v1/security/pentests` для создания pentest record: vendor, scope, start_date, end_date, report_url. Status: scheduled → in_progress → completed. Findings auto-imported в vulnerability registry
- [ ] AC4: CI/CD integration: SAST (static analysis), DAST (dynamic analysis), dependency scan при каждом deploy. Findings severity High/Critical → deploy blocked. API `GET /api/v1/security/scan-results` — results per deploy
- [ ] AC5: Security dashboard: open vulnerabilities by severity (pie chart), SLA compliance rate (%), vulnerability trend (monthly, last 12 months), mean time to remediation (MTTR) per severity

**Story Points:** 5
**Приоритет:** Should
**Epic:** [EPIC-22]
**Зависит от:** [STORY-196]

##### Tasks для STORY-201:

**[TASK-0782] Backend — vulnerability registry и SLA tracking**
- **Тип:** Backend
- **Описание:** Таблица `security_vulnerabilities`: id, tenant_id (nullable — platform-wide), source (enum), severity (enum), title (varchar 200), description (text), affected_component (varchar 200), cvss_score (decimal 3,1), status (enum), assignee_id (FK users), sla_deadline (calculated from severity + discovered_at), escalation_level (0-3), discovered_at, resolved_at, created_at. SLA calculator: critical=24h, high=7d, medium=30d, low=90d. Cron job (hourly): check SLA deadlines, escalate overdue (level 0: email, level 1: Slack, level 2: PagerDuty). Pentest records: table `security_pentests` with CRUD API.
- **Критерии готовности (DoD):**
  - [ ] Vulnerability CRUD с all fields
  - [ ] SLA deadlines calculated automatically
  - [ ] Escalation at 3 levels works
  - [ ] Pentest records с findings import
- **Оценка:** 8h
- **Story:** [STORY-201]

**[TASK-0783] DevOps — CI/CD security scanning pipeline**
- **Тип:** DevOps
- **Описание:** Интеграция в CI/CD: (1) SAST: Semgrep/SonarQube — static analysis Go/TypeScript code. (2) DAST: OWASP ZAP — dynamic scan staging environment. (3) Dependency scan: Trivy/Snyk — check dependencies for known CVEs. Pipeline: на каждый PR → SAST + dependency scan. На каждый deploy to staging → DAST. Results → POST to vulnerability registry API. High/Critical findings → block PR merge / deploy. Notifications: findings summary в PR comment.
- **Критерии готовности (DoD):**
  - [ ] SAST runs on every PR < 5 minutes
  - [ ] DAST runs on staging deploy < 15 minutes
  - [ ] Dependency scan detects known CVEs
  - [ ] High/Critical findings block merge/deploy
- **Оценка:** 16h
- **Story:** [STORY-201]

**[TASK-0784] Frontend — security vulnerability dashboard**
- **Тип:** Frontend
- **Описание:** Страница "Security > Vulnerabilities": (1) KPI cards: open critical, open high, SLA compliance %, MTTR. (2) Vulnerability table: severity badge, title, component, status, assignee, SLA countdown, actions (assign, update status, comment). (3) Vulnerability detail: description, affected component, CVSS score, timeline (discovered → assigned → fixed), related pentest. (4) Charts: open by severity (donut), monthly trend (line), MTTR by severity (bar). (5) Pentest tab: list of pentests, status, findings count, report download.
- **Критерии готовности (DoD):**
  - [ ] KPI cards показывают корректные значения
  - [ ] SLA countdown отображается с цветовой индикацией
  - [ ] Charts рендерятся за 12 месяцев
  - [ ] Pentest records manageable from UI
- **Оценка:** 8h
- **Story:** [STORY-201]

**[TASK-0785] QA — тестирование vulnerability management**
- **Тип:** QA
- **Описание:** (1) Create critical vulnerability → SLA 24h. (2) SLA overdue → level 1 escalation (email). (3) Still overdue → level 2 (Slack). (4) Resolve vulnerability → resolved_at set, MTTR calculated. (5) SAST finding High → PR merge blocked. (6) Dependency CVE detected → vulnerability auto-created. (7) Dashboard: correct counts and charts. (8) Pentest completed → findings imported.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Escalation chain verified for all 3 levels
  - [ ] CI/CD blocking verified for High/Critical
- **Оценка:** 4h
- **Story:** [STORY-201]

---

#### [STORY-202] Шифрование данных at rest и in transit (AES-256, TLS 1.3)

**Как** Network Admin, **я хочу** шифрование всех данных at rest (AES-256) и in transit (TLS 1.3), **чтобы** обеспечить confidentiality данных и соответствовать требованиям SOC 2 и enterprise-клиентов.

**Acceptance Criteria:**
- [ ] AC1: Data at rest: PostgreSQL Transparent Data Encryption (TDE) или column-level encryption для PII полей (email, phone, name, ip_address). Encryption key management через AWS KMS / HashiCorp Vault. Key rotation: automatic каждые 90 дней. Decryption transparent для application layer
- [ ] AC2: Data in transit: TLS 1.3 обязателен для всех внешних connections. TLS 1.2 minimum для internal service-to-service (с mutual TLS). HTTP strict transport security (HSTS) max-age 31536000. Certificate pinning для mobile clients
- [ ] AC3: S3 storage: Server-Side Encryption (SSE-KMS) с customer-managed key. Bucket policy: deny unencrypted uploads
- [ ] AC4: Backup encryption: все backups encrypted с separate key from production. Key stored in different region/account. Recovery testing: monthly restore from encrypted backup → data accessible
- [ ] AC5: Encryption status dashboard: API `GET /api/v1/security/encryption/status` — shows: database encryption (enabled/disabled), TLS version in use, S3 encryption, backup encryption, key rotation status, next rotation date. All green → compliance badge
- [ ] AC6: Performance: encryption overhead < 5% on query latency (benchmark comparison encrypted vs unencrypted)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-22]
**Зависит от:** [EPIC-06]

##### Tasks для STORY-202:

**[TASK-0786] Backend — column-level encryption для PII**
- **Тип:** Backend
- **Описание:** Go-пакет `encryption`: AES-256-GCM encryption/decryption с key from Vault/KMS. Encrypted columns в leads, users, transactions: email, phone, name, ip_address. Migration: добавить `_encrypted` columns, backfill job (encrypt existing data), rename columns, drop plaintext. Application layer: transparent encrypt on write, decrypt on read через custom GORM hooks. Search on encrypted fields: encrypted index (blind index с HMAC-SHA256 для exact match) или dedicated search field с partial hash.
- **Критерии готовности (DoD):**
  - [ ] PII fields encrypted in DB (not readable in raw SQL)
  - [ ] Application reads/writes transparently
  - [ ] Search на encrypted fields работает (email lookup)
  - [ ] Migration backfill для existing data completed
- **Оценка:** 16h
- **Story:** [STORY-202]

**[TASK-0787] DevOps — TLS 1.3, key rotation и encryption infrastructure**
- **Тип:** DevOps
- **Описание:** (1) TLS 1.3: nginx/envoy config — enforce TLS 1.3 для external, minimum TLS 1.2 internal. HSTS header max-age=31536000 includeSubDomains. (2) mTLS для internal services: certificate issuance через cert-manager, auto-rotation. (3) KMS/Vault setup: create encryption keys for DB, S3, backup. Key rotation policy: 90 days. Rotation job: automated key rotation with re-encryption. (4) S3: enable SSE-KMS, bucket policy deny PutObject without encryption. (5) Backup: encrypted with separate key, stored cross-region. Monthly restore test job.
- **Критерии готовности (DoD):**
  - [ ] TLS 1.3 enforced (test: connection with TLS 1.1 → rejected)
  - [ ] mTLS between all internal services
  - [ ] Key rotation every 90 days automated
  - [ ] S3 encryption enforced (unencrypted upload → denied)
  - [ ] Monthly backup restore test passes
- **Оценка:** 16h
- **Story:** [STORY-202]

**[TASK-0788] Frontend — encryption status dashboard**
- **Тип:** Frontend
- **Описание:** Страница "Security > Encryption": (1) Status cards: Database Encryption (green/red), TLS Version (1.3 badge), S3 Encryption (green/red), Backup Encryption (green/red), Key Rotation (next date, days until). (2) Compliance badge: all green → "Fully Encrypted" badge. Any red → "Action Required" with details. (3) Key rotation history: timeline of rotations with status. (4) TLS report: connections by TLS version (pie chart), deprecated protocol usage alerts.
- **Критерии готовности (DoD):**
  - [ ] All encryption statuses displayed correctly
  - [ ] Compliance badge logic works
  - [ ] Key rotation timeline shows history
  - [ ] TLS version chart renders
- **Оценка:** 4h
- **Story:** [STORY-202]

**[TASK-0789] QA — тестирование encryption**
- **Тип:** QA
- **Описание:** (1) PII in DB → encrypted (raw SQL shows ciphertext). (2) Application read → decrypted (API returns plaintext). (3) Email search → works on encrypted data. (4) TLS 1.1 connection → rejected. (5) TLS 1.3 connection → accepted. (6) S3 upload without encryption header → denied. (7) Key rotation → data still accessible with new key. (8) Backup restore → data decrypted and accessible. (9) Performance: encrypted queries < 5% slower than unencrypted baseline.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Performance benchmark: overhead documented
  - [ ] Key rotation tested with data continuity verification
- **Оценка:** 8h
- **Story:** [STORY-202]

---

## [EPIC-23] Smart Fraud (AI/ML v2)

**Цель:** Создать ML-powered систему fraud detection второго поколения, обученную на собственных исторических данных платформы: ML-модель для fraud scoring, behavioral analysis (скорость заполнения форм, паттерны мыши, паттерны набора текста), velocity checks (слишком много лидов с одного IP/device за короткое время), shared fraud intelligence между клиентами (opt-in анонимизированный blacklist), automated retraining pipeline и визуализация fraud-паттернов.

**Метрика успеха:**
- ML model AUC >= 0.92 на hold-out test set
- False positive rate снижена на 20% по сравнению с rule-based подходом (EPIC-07)
- Fraud detection latency (от получения лида до fraud score) < 150ms (p95)
- Behavioral analysis обнаруживает на 30% больше sophisticated fraud (bot-generated leads) по сравнению с v1
- Model retraining pipeline: automated monthly, zero-downtime model swap
- Shared intelligence: opt-in участие >= 40% клиентов в первые 6 месяцев

**Приоритет:** P3 (Scale)
**Зависит от:** [EPIC-07], [EPIC-10]
**Оценка:** XL

---

### Stories:

---

#### [STORY-203] ML-модель fraud scoring на исторических данных

**Как** Network Admin, **я хочу** ML-модель для fraud scoring, обученную на исторических данных платформы (лиды с известным fraud/legitimate outcome), **чтобы** обнаруживать фрод точнее, чем rule-based система, и адаптироваться к новым паттернам мошенничества.

**Acceptance Criteria:**
- [ ] AC1: Training pipeline: подготовка labeled dataset из таблицы leads (label: fraud/legitimate из поля `fraud_status`, determined by broker feedback + manual review). Минимальный dataset: 100K leads, из них >= 5% fraud positive. Features: geo (country, city), timing (hour, day_of_week, time_since_last_lead), source (affiliate_id, offer_id, landing_url), contact info patterns (email domain, phone format), device fingerprint, IP reputation score
- [ ] AC2: Model: Gradient Boosted Trees (LightGBM/XGBoost) как baseline. Feature engineering: 50+ features. Метрики валидации на hold-out 20%: AUC >= 0.92, Precision(high-risk) >= 80%, Recall(high-risk) >= 85%, F1 >= 0.82
- [ ] AC3: Inference endpoint: `POST /api/v1/fraud/ml-score` принимает lead data, возвращает: `{score: 0.0-1.0, band: "low"|"medium"|"high", model_version: "v2.3", features_used: 52, top_features: [{name, importance, value}], latency_ms: 45}`. Latency < 150ms p95
- [ ] AC4: Score bands configurable per tenant: low (0.0-0.3), medium (0.3-0.7), high (0.7-1.0) — пороги настраиваются. API `PUT /api/v1/fraud/ml-config` для изменения thresholds
- [ ] AC5: A/B testing: возможность параллельно запускать v1 (rule-based) и v2 (ML) и сравнивать результаты. Shadow mode: ML score рассчитывается но не влияет на routing. API `PUT /api/v1/fraud/ml-config/mode` — modes: disabled, shadow, active
- [ ] AC6: Model registry: хранение всех model versions с метриками, training date, dataset size. API `GET /api/v1/fraud/models` — list all versions. Rollback: `POST /api/v1/fraud/models/{version}/activate`

**Story Points:** 13
**Приоритет:** Must
**Epic:** [EPIC-23]
**Зависит от:** [EPIC-07], [EPIC-10]

##### Tasks для STORY-203:

**[TASK-0790] Backend — ML training pipeline и feature engineering**
- **Тип:** Backend
- **Описание:** Python pipeline (отдельный сервис/job): (1) Data extraction: SQL query из leads table с fraud_status, join с affiliate, offer, device fingerprint data. (2) Feature engineering: 50+ features — temporal (hour, dow, time_delta), geo (country_risk_score, geo_mismatch), contact (email_disposable, phone_valid, name_length), source (affiliate_fraud_rate_30d, offer_conversion_rate), device (device_age, browser_fingerprint_uniqueness), IP (proxy_score, asn_risk). (3) Label: fraud_status = confirmed_fraud → 1, legitimate → 0, pending → exclude. (4) Train/test split: 80/20, stratified by fraud label. (5) Model: LightGBM with hyperparameter tuning (Optuna, 100 trials). (6) Output: model artifact (pickle/ONNX), metrics report (JSON), feature importance (JSON).
- **Критерии готовности (DoD):**
  - [ ] Pipeline runs end-to-end on 100K+ leads dataset
  - [ ] 50+ features computed correctly
  - [ ] AUC >= 0.92 on hold-out set
  - [ ] Model artifact exported in ONNX format for serving
- **Оценка:** 16h
- **Story:** [STORY-203]

**[TASK-0791] Backend — ML inference service**
- **Тип:** Backend
- **Описание:** Go service wrapping ONNX runtime (или gRPC call to Python serving): (1) Load model from model registry (S3 path). (2) Feature computation in real-time: receive lead data → compute 50+ features → run inference → return score. (3) Response: score, band (based on configurable thresholds), model_version, top_features (SHAP values precomputed or approximated). (4) Caching: feature values для repeated leads (Redis, TTL 5 min). (5) Circuit breaker: если ML service down → fallback на rule-based score (EPIC-07). (6) Metrics: inference_latency_ms (histogram), model_predictions (counter by band), fallback_count.
- **Критерии готовности (DoD):**
  - [ ] Inference < 150ms p95 для single lead
  - [ ] Fallback to rule-based при ML service failure
  - [ ] Score bands configurable per tenant
  - [ ] Top features returned с каждым prediction
- **Оценка:** 16h
- **Story:** [STORY-203]

**[TASK-0792] Backend — model registry и A/B testing**
- **Тип:** Backend
- **Описание:** Таблица `fraud_ml_models`: id, version (varchar, semver), model_path (S3 URL), training_date, dataset_size, metrics (JSONB: auc, precision, recall, f1), feature_count, status (training | ready | active | retired), activated_at, created_at. Таблица `fraud_ml_config`: tenant_id, mode (disabled | shadow | active), thresholds (JSONB: low_max, medium_max), active_model_version, shadow_model_version. A/B: если shadow mode → compute both rule-based и ML scores, log both, use only rule-based for routing. Comparison report: `GET /api/v1/fraud/ml-comparison` — confusion matrix comparison v1 vs v2.
- **Критерии готовности (DoD):**
  - [ ] Model registry tracks all versions with metrics
  - [ ] Shadow mode: ML computed but not used
  - [ ] Active mode: ML score used for routing decisions
  - [ ] A/B comparison report generated correctly
- **Оценка:** 8h
- **Story:** [STORY-203]

**[TASK-0793] Frontend — ML fraud scoring dashboard**
- **Тип:** Frontend
- **Описание:** (1) Lead detail page: ML score gauge (0-1.0 с цветом по band), model version badge, top 5 contributing features (horizontal bar chart). Shadow mode: "ML Score (Shadow)" label, side-by-side с rule-based score. (2) Settings > Fraud ML: mode toggle (disabled/shadow/active), threshold sliders с distribution preview (histogram of scores), model version selector. (3) Model management page (admin): table of model versions, metrics comparison, activate/rollback buttons. (4) A/B comparison dashboard: confusion matrices side-by-side, precision/recall curves, score distribution histograms.
- **Критерии готовности (DoD):**
  - [ ] ML score gauge с top features отображается на lead detail
  - [ ] Shadow mode label visible когда shadow active
  - [ ] Threshold sliders с preview distribution
  - [ ] Model management и A/B comparison dashboards работают
- **Оценка:** 16h
- **Story:** [STORY-203]

**[TASK-0794] QA — тестирование ML fraud scoring**
- **Тип:** QA
- **Описание:** (1) Submit lead → ML score returned < 150ms. (2) Score within 0.0-1.0 range. (3) High-risk lead (known fraud pattern) → score > 0.7. (4) Shadow mode: ML score logged but routing uses rule-based. (5) Active mode: ML score used for routing. (6) ML service down → fallback to rule-based (no error to client). (7) Custom thresholds: set medium_max=0.5 → score 0.49 = low band. (8) Model rollback → previous version activated. (9) A/B comparison → correct confusion matrices. (10) Top features returned and non-empty.
- **Критерии готовности (DoD):**
  - [ ] 10 тест-кейсов проходят
  - [ ] Load test: 1000 concurrent predictions → p95 < 150ms
  - [ ] Fallback reliability: ML service killed → 100% fallback success
- **Оценка:** 8h
- **Story:** [STORY-203]

---

#### [STORY-204] Behavioral analysis (form fill speed, mouse patterns, typing patterns)

**Как** Affiliate Manager, **я хочу** анализ поведенческих сигналов (скорость заполнения формы, паттерны мыши, паттерны набора текста), **чтобы** обнаруживать бот-трафик и автоматизированное заполнение форм, которые не ловятся rule-based системой.

**Acceptance Criteria:**
- [ ] AC1: JavaScript SDK (lightweight, < 15KB gzipped) для сбора behavioral data на лендинге аффилейта. Данные: form_fill_time_ms (от focus первого поля до submit), field_fill_times[] (per field), mouse_movements_count, mouse_distance_px, mouse_speed_avg, key_press_intervals[], paste_events_count, tab_switches_count, scroll_depth_pct
- [ ] AC2: Behavioral data отправляется вместе с лидом через API: `POST /api/v1/leads` → дополнительное поле `behavioral_data` (JSONB, max 50KB). Если SDK не установлен — поле отсутствует, lead обрабатывается без behavioral signals
- [ ] AC3: Behavioral anomaly detection: (a) Form fill < 3 секунд для 5+ полей → suspicious (human avg 15-30 sec). (b) Zero mouse movements → likely bot. (c) Uniform key intervals (std dev < 10ms) → automated input. (d) Copy-paste в email/phone fields → elevated risk. (e) No scroll events на long page → suspicious
- [ ] AC4: Behavioral signals нормализуются в score 0.0-1.0 и включаются в итоговый fraud score (как features для ML модели). Weight configurable per tenant
- [ ] AC5: Behavioral analytics dashboard: distribution of form fill times (histogram), bot vs human classification (pie), anomalous patterns detected per day (trend)

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-23]
**Зависит от:** [STORY-203]

##### Tasks для STORY-204:

**[TASK-0795] Frontend — JavaScript SDK для behavioral tracking**
- **Тип:** Frontend
- **Описание:** Lightweight JavaScript SDK (vanilla JS, no dependencies, < 15KB gzipped): (1) Auto-detect form fields, attach event listeners. (2) Track: form_fill_time (first focus → submit), per-field fill times, mouse events (moves, clicks, distance, speed), keyboard events (key intervals, paste detection), scroll events (depth, direction changes), tab visibility changes. (3) Data aggregation: compute summary metrics client-side. (4) API: `GambChampSDK.init({apiKey, formSelector})` → auto-start tracking. `GambChampSDK.getData()` → return behavioral_data JSON. (5) Privacy: no PII collected, only behavioral metrics. Opt-out: `GambChampSDK.disable()`.
- **Критерии готовности (DoD):**
  - [ ] SDK < 15KB gzipped
  - [ ] All behavioral metrics collected accurately
  - [ ] No PII in behavioral_data
  - [ ] Works on Chrome, Firefox, Safari, Edge (last 2 versions)
  - [ ] Opt-out mechanism works
- **Оценка:** 16h
- **Story:** [STORY-204]

**[TASK-0796] Backend — behavioral data ingestion и anomaly detection**
- **Тип:** Backend
- **Описание:** Расширить POST /api/v1/leads: принимать `behavioral_data` (JSONB, max 50KB). Store в таблице `lead_behavioral_data`: lead_id, form_fill_time_ms, field_fill_times (JSONB), mouse_movements_count, mouse_distance_px, key_intervals_stddev, paste_events_count, scroll_depth_pct, raw_data (JSONB). Anomaly detection rules engine: configurable per tenant, default rules: (a) form_fill_time < 3000ms AND fields >= 5 → anomaly_fast_fill. (b) mouse_movements = 0 → anomaly_no_mouse. (c) key_intervals_stddev < 10 → anomaly_uniform_typing. (d) paste_events > 2 → anomaly_excessive_paste. Output: behavioral_score (0.0-1.0), detected_anomalies[] (array of anomaly types).
- **Критерии готовности (DoD):**
  - [ ] behavioral_data accepted and stored
  - [ ] 5 anomaly detection rules configured
  - [ ] behavioral_score computed and included in fraud pipeline
  - [ ] Leads without behavioral_data processed normally (score = neutral 0.5)
- **Оценка:** 8h
- **Story:** [STORY-204]

**[TASK-0797] Frontend — behavioral analytics dashboard**
- **Тип:** Frontend
- **Описание:** Страница "Fraud > Behavioral Analysis": (1) Distribution chart: form fill time histogram (buckets: <3s, 3-10s, 10-30s, 30-60s, >60s) с highlighted suspicious zone (<3s). (2) Bot vs Human pie chart: classified based on behavioral score threshold. (3) Daily anomaly trend: stacked area chart (fast_fill, no_mouse, uniform_typing, excessive_paste) за 30 дней. (4) Lead detail enrichment: behavioral signals section — timeline of form interaction, mouse heatmap (if data available), typing rhythm visualization. (5) SDK integration guide: code snippet, configuration docs.
- **Критерии готовности (DoD):**
  - [ ] Histogram form fill time с suspicious zone highlight
  - [ ] Daily anomaly trend chart рендерится
  - [ ] Lead detail shows behavioral signals
  - [ ] SDK integration guide с copy-paste code snippet
- **Оценка:** 8h
- **Story:** [STORY-204]

**[TASK-0798] QA — тестирование behavioral analysis**
- **Тип:** QA
- **Описание:** (1) SDK captures form_fill_time accurately (measured: fill form in 5 sec → data shows ~5000ms). (2) Bot simulation: automated fill < 1 sec → anomaly_fast_fill detected. (3) No mouse movement → anomaly_no_mouse. (4) Uniform key intervals (robot) → anomaly_uniform_typing. (5) Lead without behavioral_data → processed normally, score neutral. (6) behavioral_data > 50KB → 422. (7) SDK opt-out → no data collected. (8) Behavioral score included in ML features. (9) Dashboard charts render with real data.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] SDK accuracy: form_fill_time ± 100ms of actual
  - [ ] Anomaly detection: 0 false negatives on known bot patterns
- **Оценка:** 8h
- **Story:** [STORY-204]

---

#### [STORY-205] Velocity checks (IP/device rate limiting за короткий период)

**Как** Affiliate Manager, **я хочу** velocity checks для обнаружения аномально высокой частоты лидов с одного IP, device или email-паттерна за короткий период, **чтобы** блокировать массовый fraud-трафик в реальном времени.

**Acceptance Criteria:**
- [ ] AC1: Velocity rules engine: configurable rules per tenant. Default rules: (a) Same IP: > 5 leads / 5 min → flag, > 20 leads / 1 hour → block. (b) Same device fingerprint: > 3 leads / 10 min → flag, > 10 leads / 1 hour → block. (c) Same email domain (disposable): > 10 leads / 1 hour → flag. (d) Same phone prefix (first 7 digits): > 5 leads / 30 min → flag
- [ ] AC2: API `PUT /api/v1/fraud/velocity/rules` — CRUD для velocity rules: metric (ip | device | email_domain | phone_prefix), threshold (int), window (seconds), action (flag | block | require_review). Max 20 rules per tenant
- [ ] AC3: Real-time enforcement: velocity check выполняется < 10ms (Redis INCR + EXPIRE). Blocked leads → HTTP 429 `VELOCITY_LIMIT_EXCEEDED` с описанием violated rule. Flagged leads → processed but с elevated fraud score
- [ ] AC4: Velocity dashboard: real-time counters (current leads/min), velocity violations chart (by rule type), top flagged IPs/devices table, geographic heat map of high-velocity sources
- [ ] AC5: Whitelist для velocity: trusted IPs/devices exempt from velocity checks. API `PUT /api/v1/fraud/velocity/whitelist`. Use case: known office IPs для manual testing

**Story Points:** 5
**Приоритет:** Must
**Epic:** [EPIC-23]
**Зависит от:** [STORY-203]

##### Tasks для STORY-205:

**[TASK-0799] Backend — velocity checks engine с Redis**
- **Тип:** Backend
- **Описание:** Redis-based velocity checking: (1) На каждый incoming lead — extract velocity keys: `velocity:{tenant}:ip:{ip}`, `velocity:{tenant}:device:{fingerprint}`, `velocity:{tenant}:email_domain:{domain}`, `velocity:{tenant}:phone:{prefix7}`. (2) Redis pipeline: MULTI → INCR key → EXPIRE key {window} → EXEC → check count vs threshold. (3) Rules table: `fraud_velocity_rules`: id, tenant_id, metric (enum), threshold (int), window_seconds (int), action (enum: flag, block, require_review), is_active. (4) Whitelist table: `fraud_velocity_whitelist`: id, tenant_id, type (ip | device), value (varchar), created_by, created_at. (5) Result: array of triggered rules → aggregate into velocity_score, merge into fraud pipeline.
- **Критерии готовности (DoD):**
  - [ ] Velocity check < 10ms (Redis round-trip)
  - [ ] Default rules seed-ятся для нового tenant
  - [ ] Block action → 429 response
  - [ ] Flag action → elevated score, lead processed
  - [ ] Whitelist exemption works
- **Оценка:** 8h
- **Story:** [STORY-205]

**[TASK-0800] Frontend — velocity rules management и dashboard**
- **Тип:** Frontend
- **Описание:** (1) Settings > Fraud > Velocity Rules: таблица rules — metric, threshold, window, action, toggle active/inactive. "Add Rule" modal с validation. (2) Whitelist section: IP/device list с add/remove. (3) Dashboard: real-time leads/min counter (websocket), violations timeline (stacked bar per rule type, 24h), top 10 flagged IPs table с geo info, geographic heat map (leaflet.js) с high-velocity sources highlighted. (4) Alert banners: при spike > 3x normal velocity → red banner "Unusual traffic detected from {source}".
- **Критерии готовности (DoD):**
  - [ ] Rules CRUD работает
  - [ ] Real-time counter обновляется через WebSocket
  - [ ] Heat map рендерится с geo data
  - [ ] Spike alert отображается
- **Оценка:** 8h
- **Story:** [STORY-205]

**[TASK-0801] QA — тестирование velocity checks**
- **Тип:** QA
- **Описание:** (1) 5 leads from same IP in 5 min → flagged. (2) 21 leads from same IP in 1 hour → blocked (429). (3) Same device fingerprint 4 leads in 10 min → flagged. (4) Whitelisted IP → velocity checks skipped. (5) Custom rule: 3 leads/2 min → triggered. (6) Velocity score included in fraud pipeline. (7) Real-time counter: send 10 leads/sec → counter shows correct rate. (8) Latency: velocity check < 10ms under 1000 concurrent requests.
- **Критерии готовности (DoD):**
  - [ ] 8 тест-кейсов проходят
  - [ ] Load test: 10000 velocity checks/sec → < 10ms each
  - [ ] No false positives for whitelisted sources
- **Оценка:** 4h
- **Story:** [STORY-205]

---

#### [STORY-206] Shared fraud intelligence между клиентами (opt-in blacklist)

**Как** Network Admin, **я хочу** опционально участвовать в shared fraud intelligence network, где клиенты анонимно обмениваются данными о fraud-паттернах, **чтобы** обнаруживать мошенников, которые атакуют несколько платформ одновременно.

**Acceptance Criteria:**
- [ ] AC1: Opt-in participation: API `PUT /api/v1/fraud/shared-intelligence/opt-in` с explicit consent confirmation (requires typing "I AGREE"). Opt-out: `PUT /api/v1/fraud/shared-intelligence/opt-out` → данные tenant удаляются из shared pool < 24 часа. Consent записывается в audit log с timestamp, IP, user_agent
- [ ] AC2: Data contribution: при обнаружении confirmed fraud → anonymized signal отправляется в shared pool. Anonymization: email → SHA-256 hash, phone → SHA-256 hash, IP → /24 subnet mask (убрать последний октет), device fingerprint → as-is (уже anonymous). NO PII в shared data. Независимый privacy audit подтверждает anonymization
- [ ] AC3: Data consumption: при получении нового lead → check against shared blacklist: email_hash, phone_hash, ip_subnet, device_fingerprint. Match → elevated fraud score (+0.3 bonus к ML score). API `GET /api/v1/fraud/shared-intelligence/stats` — number of signals contributed, signals consumed, match rate
- [ ] AC4: Shared blacklist size visible: total entries, update frequency (real-time), contributing clients count (anonymized). Blacklist entries TTL: 90 дней (fraud signals older than 90 days removed automatically)
- [ ] AC5: Transparency report: per tenant — what data is shared (schema, example), what data is consumed, opt-out instructions. API `GET /api/v1/fraud/shared-intelligence/transparency`

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-23]
**Зависит от:** [STORY-203], [STORY-197]

##### Tasks для STORY-206:

**[TASK-0802] Backend — shared intelligence service и anonymization pipeline**
- **Тип:** Backend
- **Описание:** Separate microservice `fraud-intelligence`: (1) Contribution endpoint: receives fraud signal from tenant service → anonymize (SHA-256 email/phone, mask IP /24, keep device fingerprint) → store in shared Redis cluster. Key format: `si:{type}:{hash}`, value: `{count, first_seen, last_seen}`, TTL 90 days. (2) Lookup endpoint: receives lead identifiers → check against shared pool → return matches. (3) Opt-in/opt-out management: table `shared_intelligence_consents`: tenant_id, status, consented_at, opted_out_at, data_deleted_at. Opt-out job: delete all contributions from tenant < 24h. (4) Stats: per-tenant contribution count, consumption count, match rate. Global: total entries, active contributors.
- **Критерии готовности (DoD):**
  - [ ] Anonymization: NO PII in shared data (verified by unit tests)
  - [ ] Lookup < 5ms per lead (Redis)
  - [ ] Opt-out deletes all contributions < 24 hours
  - [ ] TTL 90 days enforced
- **Оценка:** 16h
- **Story:** [STORY-206]

**[TASK-0803] Frontend — shared intelligence opt-in и transparency**
- **Тип:** Frontend
- **Описание:** (1) Settings > Fraud > Shared Intelligence: opt-in section с description, data schema example, privacy explanation. "Enable Shared Intelligence" button → confirmation modal requiring typing "I AGREE". (2) Dashboard (after opt-in): contributed signals count, consumed matches count, match rate %, blacklist size, contributing clients count. (3) Transparency page: schema of shared data (email_hash, phone_hash, ip_subnet, device_fingerprint), sample anonymized record, data retention (90 days), opt-out instructions. (4) Opt-out: "Disable" button → confirmation → data deletion progress bar.
- **Критерии готовности (DoD):**
  - [ ] Opt-in requires typing confirmation
  - [ ] Dashboard metrics load after opt-in
  - [ ] Transparency page clearly explains data sharing
  - [ ] Opt-out с data deletion progress
- **Оценка:** 8h
- **Story:** [STORY-206]

**[TASK-0804] QA — тестирование shared intelligence**
- **Тип:** QA
- **Описание:** (1) Opt-in → consent recorded in audit. (2) Fraud confirmed → anonymized signal in shared pool. (3) Signal anonymization: no raw email/phone/full IP in Redis. (4) New lead matching shared signal → fraud score elevated (+0.3). (5) Opt-out → all tenant contributions deleted < 24h. (6) After opt-out → no new contributions from tenant. (7) Signal TTL 90 days → expired signal not in lookups. (8) Transparency report → correct schema and counts. (9) Privacy audit: scan shared data for PII → 0 PII found.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] PII scan: automated tool confirms 0 PII in shared pool
  - [ ] Opt-out completeness: 100% contributions removed
- **Оценка:** 8h
- **Story:** [STORY-206]

---

#### [STORY-207] Pipeline переобучения модели (automated monthly retraining)

**Как** Network Admin, **я хочу** автоматический pipeline для ежемесячного переобучения ML-модели на свежих данных с approval workflow перед promotion, **чтобы** модель не деградировала и адаптировалась к новым fraud-паттернам.

**Acceptance Criteria:**
- [ ] AC1: Monthly retraining job: первое число каждого месяца → trigger training pipeline на данных за последние 6 месяцев. Dataset refresh: новые confirmed fraud/legitimate labels. Pipeline: data extraction → feature engineering → model training → evaluation → artifact storage
- [ ] AC2: Model evaluation gates: новая модель должна пройти: AUC >= baseline - 0.02 (не ухудшилась более чем на 2%), Precision >= baseline - 5%, Recall >= baseline - 3%. Если gates не пройдены → alert, модель не промоутится, текущая остаётся active
- [ ] AC3: Drift monitoring: ежедневная проверка feature distributions (PSI — Population Stability Index). PSI > 0.2 для любой feature → warning alert. PSI > 0.5 → critical alert + trigger emergency retraining
- [ ] AC4: Approval workflow: после успешного training + evaluation → модель в статусе `candidate`. Notification к Network Admin: "New model v2.4 ready. AUC: 0.94 (baseline: 0.92). [Approve] [Reject] [Compare]". Approve → model promoted to active. Reject → remains candidate, training log saved
- [ ] AC5: Zero-downtime model swap: при activation новой модели — gradual rollout: 10% traffic → 50% → 100% over 2 hours. Automatic rollback если error rate > 1% на любом этапе
- [ ] AC6: Retraining history: API `GET /api/v1/fraud/retraining/history` — all training runs с metrics, status, duration, approver. Comparison charts: model performance over time

**Story Points:** 8
**Приоритет:** Must
**Epic:** [EPIC-23]
**Зависит от:** [STORY-203]

##### Tasks для STORY-207:

**[TASK-0805] Backend — automated retraining pipeline**
- **Тип:** Backend
- **Описание:** Orchestrated pipeline (Airflow/Prefect or custom Go scheduler): (1) Monthly cron (1st of month, 02:00 UTC) → trigger retraining job. (2) Data extraction: last 6 months of labeled leads (configurable window). (3) Feature engineering: reuse feature pipeline from TASK-0790. (4) Training: LightGBM with same hyperparameter space. (5) Evaluation: compute AUC, Precision, Recall, F1 on hold-out. (6) Gates check: compare vs current active model metrics. (7) If passed → save artifact to S3, create model record (status: candidate), send notification. If failed → save report, alert, no promotion. (8) Emergency retraining trigger: API `POST /api/v1/fraud/retraining/trigger` (manual or from drift alert). Table `fraud_retraining_runs`: id, trigger (monthly | manual | drift_alert), status (running, completed, failed, gates_failed), metrics, model_version, duration_seconds, approved_by, approved_at, created_at.
- **Критерии готовности (DoD):**
  - [ ] Monthly retraining runs automatically
  - [ ] Evaluation gates block promotion of degraded model
  - [ ] Emergency retraining trigger works
  - [ ] All runs logged with metrics and status
- **Оценка:** 16h
- **Story:** [STORY-207]

**[TASK-0806] Backend — drift monitoring и gradual rollout**
- **Тип:** Backend
- **Описание:** Drift monitor: daily job computes PSI (Population Stability Index) for each of 50+ features. Reference distribution: training data. Current distribution: last 7 days production data. PSI calculation: `PSI = Σ (actual% - expected%) * ln(actual% / expected%)`. Thresholds: 0.1 (acceptable), 0.2 (warning), 0.5 (critical). Gradual rollout: при model activation → traffic split: 10% new model / 90% old for 30 min, then 50/50 for 30 min, then 100% new. During rollout: monitor error rate, latency, score distribution. Automatic rollback: if error rate > 1% or latency p95 > 200ms → revert to old model.
- **Критерии готовности (DoD):**
  - [ ] PSI computed daily for all features
  - [ ] Alerts at 0.2 and 0.5 thresholds
  - [ ] Gradual rollout: 10% → 50% → 100% over 2 hours
  - [ ] Automatic rollback при degradation
- **Оценка:** 8h
- **Story:** [STORY-207]

**[TASK-0807] Frontend — model governance dashboard**
- **Тип:** Frontend
- **Описание:** Страница "Fraud > Model Governance": (1) Active model card: version, AUC, training date, dataset size, age (days since training). (2) Candidate model card (if exists): version, metrics comparison vs active (green/red arrows), "Approve" / "Reject" / "Compare" buttons. (3) Drift monitor: heatmap of feature PSI values (green/yellow/red), trend chart per feature. (4) Retraining history: timeline of training runs — status, metrics, duration, approver. Click → detailed report. (5) Rollout progress: during gradual rollout — progress bar (10/50/100%), live metrics (error rate, latency).
- **Критерии готовности (DoD):**
  - [ ] Active и candidate model cards с metrics
  - [ ] Approve/Reject workflow из UI
  - [ ] Drift heatmap рендерится для 50+ features
  - [ ] Rollout progress bar с live metrics
- **Оценка:** 8h
- **Story:** [STORY-207]

**[TASK-0808] QA — тестирование retraining pipeline**
- **Тип:** QA
- **Описание:** (1) Monthly trigger → training starts, completes < 2 hours. (2) Evaluation gates pass → model candidate created. (3) Gates fail (AUC dropped 5%) → model not promoted, alert sent. (4) Drift PSI > 0.2 → warning alert. (5) Drift PSI > 0.5 → critical alert + emergency retrain triggered. (6) Approve candidate → gradual rollout starts. (7) Rollout 10% → no errors → proceed to 50%. (8) Rollout with high error rate → automatic rollback. (9) Reject candidate → status rejected, active model unchanged.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Retraining pipeline end-to-end < 2 hours
  - [ ] Automatic rollback verified with simulated degradation
- **Оценка:** 8h
- **Story:** [STORY-207]

---

#### [STORY-208] Визуализация fraud-паттернов (cluster analysis, network graphs)

**Как** Team Lead, **я хочу** визуализацию fraud-паттернов через cluster analysis и network graphs, **чтобы** видеть связи между подозрительными лидами, обнаруживать организованные fraud-кампании и принимать обоснованные решения по блокировке.

**Acceptance Criteria:**
- [ ] AC1: Network graph: визуализация связей между лидами по общим атрибутам (same IP, same device, same email domain, same phone prefix, same affiliate). Nodes: leads (colored by fraud score band). Edges: shared attributes (labeled). API `GET /api/v1/fraud/network-graph?center_lead_id={id}&depth=2` — returns graph data (nodes + edges) для 2 уровней связей. Max 500 nodes per query
- [ ] AC2: Cluster analysis: автоматическая группировка подозрительных лидов в кластеры (DBSCAN на feature vectors). API `GET /api/v1/fraud/clusters?min_size=5&date_from=...&date_to=...`. Каждый cluster: id, size, avg_fraud_score, common_attributes, top_affiliates, geo_distribution
- [ ] AC3: Fraud campaign detection: если cluster > 20 leads с avg_fraud_score > 0.7 за 24 часа → автоматический alert "Potential fraud campaign detected" с cluster details. API `GET /api/v1/fraud/campaigns` — detected campaigns list
- [ ] AC4: Interactive visualization: D3.js или vis.js network graph с zoom, pan, node click (→ lead detail), highlight paths, filter by attribute type. Cluster view: bubble chart (size = cluster size, color = avg fraud score)
- [ ] AC5: Export: graph data в JSON (для external analysis), cluster report в PDF, campaign details в CSV
- [ ] AC6: Performance: graph для 500 nodes рендерится < 3 секунды. Cluster analysis для 100K leads за 30 дней выполняется < 30 секунд

**Story Points:** 8
**Приоритет:** Should
**Epic:** [EPIC-23]
**Зависит от:** [STORY-203], [STORY-204], [STORY-205]

##### Tasks для STORY-208:

**[TASK-0809] Backend — network graph и cluster analysis engine**
- **Тип:** Backend
- **Описание:** (1) Network graph builder: для заданного lead_id → find related leads by shared IP, device, email_domain, phone_prefix, affiliate_id. BFS traversal до depth=2. Limit 500 nodes (closest by fraud_score DESC). Return: nodes (lead_id, fraud_score, band, geo, timestamp), edges (source, target, relation_type, shared_value). (2) Cluster analysis: scheduled daily job. Extract feature vectors for high-risk leads (score > 0.5, last 30 days). DBSCAN (epsilon=0.3, min_samples=5). Store clusters in `fraud_clusters`: id, size, avg_score, common_attributes (JSONB), leads_ids (array), detected_at. (3) Campaign detection: after clustering → check if any cluster size > 20 AND avg_score > 0.7 AND time_span < 24h → create campaign alert.
- **Критерии готовности (DoD):**
  - [ ] Network graph returns correct relationships
  - [ ] BFS depth=2, max 500 nodes enforced
  - [ ] DBSCAN clustering produces meaningful clusters
  - [ ] Campaign detection alerts triggered correctly
- **Оценка:** 16h
- **Story:** [STORY-208]

**[TASK-0810] Frontend — interactive fraud visualization**
- **Тип:** Frontend
- **Описание:** (1) Fraud Network Graph page: vis.js/D3.js force-directed graph. Nodes colored by fraud band (green/yellow/red), sized by connection count. Edges labeled with relation type (IP, device, email, phone, affiliate). Controls: zoom, pan, search node, filter by relation type, highlight shortest path between 2 nodes. Node click → sidebar with lead details. (2) Cluster Analysis page: bubble chart (D3) — each bubble = cluster, size = lead count, color = avg fraud score. Click bubble → cluster detail: member list, common attributes, timeline, geographic distribution map. (3) Campaigns page: alert cards with cluster summary, "Investigate" button → network graph pre-filtered for campaign leads. (4) Export buttons: JSON, PDF, CSV.
- **Критерии готовности (DoD):**
  - [ ] Network graph рендерится с 500 nodes < 3 sec
  - [ ] Node interactions (click, hover, filter) работают smoothly
  - [ ] Bubble chart кластеров кликабелен
  - [ ] Campaign alerts с investigation flow
- **Оценка:** 16h
- **Story:** [STORY-208]

**[TASK-0811] QA — тестирование fraud visualization**
- **Тип:** QA
- **Описание:** (1) Lead with 3 shared-IP leads → graph shows 4 nodes, 3 edges. (2) Depth=2: second-level connections shown. (3) Max 500 nodes → graph truncated, no errors. (4) DBSCAN: 50 similar fraud leads → cluster created. (5) Cluster > 20 leads, avg score > 0.7, 24h → campaign alert triggered. (6) Graph render 500 nodes < 3 sec (performance test). (7) Cluster analysis 100K leads < 30 sec. (8) Export JSON → valid structure. (9) Export PDF → readable report with graph screenshot.
- **Критерии готовности (DoD):**
  - [ ] 9 тест-кейсов проходят
  - [ ] Performance: 500 nodes graph < 3 sec render
  - [ ] Cluster analysis: verified with synthetic fraud data
- **Оценка:** 8h
- **Story:** [STORY-208]

---