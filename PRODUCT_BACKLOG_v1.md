# PRODUCT BACKLOG v1.0 — GambChamp CRM

**Продукт:** GambChamp CRM — B2B SaaS платформа дистрибуции лидов для крипто/форекс аффилейт-маркетинга  
**Дата:** Апрель 2026  
**Версия:** 1.0  
**Автор:** Product Team  
**Источники:** Конкурентный анализ 6 платформ (CRM Mate, Elnopy, HyperOne, Leadgreed, GetLinked, trackbox.ai), GAP-анализ, стратегический отчёт

---

## СВОДНАЯ ТАБЛИЦА ЭПИКОВ

| Epic ID | Название | Приоритет | Размер | Stories | Оценка (часы) | Зависимости |
|---------|----------|-----------|--------|---------|---------------|-------------|
| EPIC-01 | Lead Intake API | P0 (MVP) | L | 12 | ~320h | — |
| EPIC-02 | Lead Routing Engine | P0 (MVP) | XL | 11 | ~440h | EPIC-01 |
| EPIC-03 | Broker Integration Layer | P0 (MVP) | XL | 9 | ~380h | EPIC-01 |
| EPIC-04 | Affiliate Management | P0 (MVP) | L | 10 | ~340h | EPIC-06 |
| EPIC-05 | Lead Management UI | P0 (MVP) | L | 12 | ~360h | EPIC-01, EPIC-06 |
| EPIC-06 | User Accounts & RBAC | P0 (MVP) | L | 10 | ~320h | — |
| EPIC-07 | Anti-Fraud System | P0 (MVP) | XL | 9 | ~400h | EPIC-01 |
| EPIC-08 | Autologin & Proxy Pipeline | P1 (Launch) | XL | 9 | ~360h | EPIC-03 |
| EPIC-09 | Automated Lead Delivery (UAD) | P1 (Launch) | L | 8 | ~280h | EPIC-02, EPIC-03 |
| EPIC-10 | Analytics Dashboard v1 | P1 (Launch) | XL | 13 | ~400h | EPIC-01, EPIC-03, EPIC-04 |
| EPIC-11 | Notifications & Alerts | P1 (Launch) | M | 7 | ~200h | EPIC-06 |
| EPIC-12 | Conversions & Basic P&L | P1 (Launch) | L | 7 | ~280h | EPIC-03, EPIC-04 |
| EPIC-13 | Onboarding & Setup Wizard | P1 (Launch) | M | 8 | ~200h | EPIC-01..07 |
| EPIC-14 | Advanced Analytics & BI | P2 (Growth) | XL | 8 | ~320h | EPIC-10 |
| EPIC-15 | Mobile Dashboard | P2 (Growth) | L | 5 | ~200h | EPIC-10, EPIC-11 |
| EPIC-16 | Integration Marketplace | P2 (Growth) | L | 5 | ~240h | EPIC-03 |
| EPIC-17 | Smart Routing (AI/ML v1) | P2 (Growth) | L | 5 | ~200h | EPIC-02, EPIC-10 |
| EPIC-18 | Status Groups & Shave Detection | P2 (Growth) | M | 5 | ~160h | EPIC-03, EPIC-07 |
| EPIC-19 | Public API & Developer Portal | P2 (Growth) | L | 5 | ~240h | EPIC-01..07 |
| EPIC-20 | White-Label & Multi-Tenant | P3 (Scale) | XL | 5 | ~320h | EPIC-06 |
| EPIC-21 | Billing & Subscription Management | P3 (Scale) | L | 5 | ~200h | EPIC-06, EPIC-20 |
| EPIC-22 | Compliance & Security Hardening | P3 (Scale) | L | 5 | ~200h | EPIC-06 |
| EPIC-23 | Smart Fraud (AI/ML v2) | P3 (Scale) | XL | 6 | ~280h | EPIC-07, EPIC-10 |
| **ИТОГО** | **23 эпика** | | | **~179 stories** | **~6,640h** | |

---

## ROADMAP ПО КВАРТАЛАМ

### Q1 2026 (Март — Май): MVP — P0
**Цель:** Работающий контур приёма → маршрутизации → отправки лидов

| Спринт | Эпики | Ключевые deliverables |
|--------|-------|----------------------|
| Sprint 1-2 | EPIC-06, EPIC-01 | Регистрация, JWT auth, RBAC; REST API приёма лидов |
| Sprint 3-4 | EPIC-02, EPIC-03 | Движок маршрутизации, первые брокерские шаблоны |
| Sprint 5-6 | EPIC-04, EPIC-05, EPIC-07 | Управление аффилейтами, UI лидов, антифрод |

**Milestone:** Первый live лид от реального аффилейта → брокеру. 5 paying клиентов.

### Q2 2026 (Июнь — Август): Launch — P1
**Цель:** Feature parity с конкурентами + ключевые дифференциаторы

| Спринт | Эпики | Ключевые deliverables |
|--------|-------|----------------------|
| Sprint 7-8 | EPIC-08, EPIC-09 | Автологин pipeline, UAD переотправка |
| Sprint 9-10 | EPIC-10, EPIC-12 | Аналитический дашборд, P&L модуль |
| Sprint 11-12 | EPIC-11, EPIC-13 | Telegram-бот + уведомления, Onboarding wizard |

**Milestone:** 20 клиентов. Публичный прайс. Первый кейс-стади. NPS > 50.

### Q3 2026 (Сентябрь — Ноябрь): Growth — P2
**Цель:** Расширение функциональности для удержания и роста

| Спринт | Эпики | Ключевые deliverables |
|--------|-------|----------------------|
| Sprint 13-14 | EPIC-14, EPIC-18 | BI-аналитика, нормализация статусов |
| Sprint 15-16 | EPIC-15, EPIC-16 | Мобильный дашборд (PWA), маркетплейс интеграций |
| Sprint 17-18 | EPIC-17, EPIC-19 | AI-роутинг v1, Developer portal + SDK |

**Milestone:** 50 клиентов. Мобильное приложение. 200+ верифицированных интеграций.

### Q4 2026 (Декабрь) — Q1 2027 (Февраль): Scale — P3
**Цель:** Enterprise-функции и платформенный рост

| Спринт | Эпики | Ключевые deliverables |
|--------|-------|----------------------|
| Sprint 19-20 | EPIC-20, EPIC-21 | White-label, биллинг + подписки |
| Sprint 21-22 | EPIC-22, EPIC-23 | SOC 2 prep, GDPR, ML fraud scoring |
| Sprint 23-24 | Стабилизация | Penetration testing, оптимизация, документация |

**Milestone:** Первый Enterprise контракт ($2,500+/мес). ARR $400K+. White-label клиент.

---

## РОЛИ В USER STORIES

| Роль | Описание |
|------|----------|
| **Network Admin** | Управляет всей платформой, настраивает глобальные параметры |
| **Affiliate Manager** | Настраивает аффилейтов, маршруты, капы |
| **Media Buyer** | Отправляет лиды через API, смотрит статусы и конверсии |
| **Team Lead** | Смотрит аналитику команды, управляет доступами |
| **Developer** | Интегрирует по API, работает с документацией |
| **Finance Manager** | Смотрит P&L, управляет выплатами и reconciliation |

---

## РАЗМЕРЫ ЭПИКОВ

| Размер | Описание | Часы |
|--------|----------|------|
| S | 1-2 недели | 40-80h |
| M | 2-4 недели | 80-200h |
| L | 1-3 месяца | 200-400h |
| XL | 3+ месяца | 400h+ |

---
---

# P0 — MVP (EPIC-01 → EPIC-07)
*Без этих эпиков продукт не функционирует. Приоритет: максимальный.*

---

## EPIC-01: Lead Intake API

**ID:** EPIC-01
**Name:** Lead Intake API -- Приём и валидация лидов
**Goal:** Предоставить аффилейтам надёжный REST API для отправки лидов с полной валидацией, E.164-нормализацией телефона, дедупликацией и идемпотентностью, обеспечивая время ответа <500ms на p95 и детальное объяснение причин отклонения.
**Success Metric:** p95 latency <500ms; 99.9% uptime endpoint; 0% потерь лидов при retry (idempotency); >98% корректная E.164-нормализация; <2% false-positive дедупликации.
**Priority:** P0 (MVP)
**Dependencies:** Нет (корневой эпик)
**Size Estimate:** 320 часов (8 спринтов-участников)

---

### [STORY-001] REST API endpoint для приёма лидов

**"As an** Affiliate Manager, **I want** отправлять лиды через POST /api/v1/leads с JSON-телом, **so that** я могу интегрировать свои источники трафика с CRM за минуты без ручной работы."

**Acceptance Criteria:**
- [ ] POST /api/v1/leads принимает JSON payload с полями: first_name, last_name, email, phone, country, ip, user_agent, funnel_name, aff_sub1..aff_sub10, extra (произвольный JSONB); Content-Type: application/json
- [ ] Успешный ответ 201 Created возвращает: `{ "id": "uuid", "status": "new|processing|delivered|rejected", "created_at": "ISO8601" }` с latency <200ms на p50 и <500ms на p95 при нагрузке до 500 RPS
- [ ] Ответ 400 Bad Request при невалидном JSON или отсутствии обязательных полей (first_name, last_name, email, phone) возвращает массив ошибок: `{ "errors": [{"field": "email", "code": "INVALID_FORMAT", "message": "..."}] }`
- [ ] Ответ 401 Unauthorized при отсутствии или невалидном API-ключе в заголовке X-API-Key
- [ ] Все входящие лиды записываются в таблицу leads с партиционированием по месяцу; запись в БД подтверждается до отправки 201

**Story Points:** 8
**Priority:** Must
**Dependencies:** --

#### Tasks:

[TASK-0001] Реализация HTTP handler POST /api/v1/leads | Type: Backend | Создать handler в lead-intake-svc: парсинг JSON body, маппинг на внутреннюю структуру LeadRequest, вызов сервисного слоя. Максимальный размер body -- 64KB. | DoD: handler зарегистрирован в роутере; unit-тесты на парсинг валидного/невалидного JSON (>=5 кейсов); benchmark <1ms на парсинг | Estimate: 8h

[TASK-0002] Слой валидации входящего payload | Type: Backend | Реализовать валидатор с правилами: first_name/last_name -- 1-100 символов, UTF-8, без спецсимволов кроме дефиса и апострофа; email -- RFC 5322 формат; phone -- минимум 7 цифр; country -- ISO 3166-1 alpha-2/alpha-3. Возвращать массив ВСЕХ ошибок, а не первую. | DoD: валидатор покрыт тестами (>=15 кейсов включая edge cases: пустые строки, unicode, SQL injection попытки); 100% ошибок возвращаются одним ответом | Estimate: 6h

[TASK-0003] Сервис записи лида в PostgreSQL | Type: Backend | Создать LeadRepository.Create() с INSERT в партиционированную таблицу leads. Использовать prepared statements. Генерация UUID на стороне приложения (uuid v7 для сортируемости). Запись fraud_card = null на этом этапе. | DoD: интеграционный тест с реальной БД (testcontainers); проверка записи во все поля; проверка корректной партиции по created_at | Estimate: 6h

[TASK-0004] Запись события в lead_events (Client History) | Type: Backend | При каждом приёме лида создавать запись в lead_events с event_type="intake", request_body (sanitized -- без полного phone/email), duration_ms. | DoD: событие создаётся атомарно с лидом (одна транзакция); тест на наличие события после создания лида | Estimate: 4h

[TASK-0005] OpenAPI 3.0 спецификация endpoint | Type: Backend | Написать полную OpenAPI 3.0 spec для POST /api/v1/leads: request schema, response schemas (201, 400, 401, 409, 429, 500), примеры, описание полей на EN и RU. | DoD: спецификация валидна по OpenAPI 3.0 validator; Swagger UI рендерит без ошибок; все коды ответов описаны с примерами | Estimate: 4h

[TASK-0006] Интеграционные тесты endpoint | Type: QA | Написать e2e тесты: успешное создание лида, невалидный JSON, отсутствие обязательных полей, невалидный API-ключ, превышение размера body (>64KB), SQL injection в полях, XSS в полях, unicode в именах. Minimum 20 test cases. | DoD: все 20+ тестов проходят; CI pipeline включает эти тесты; coverage отчёт | Estimate: 10h

[TASK-0007] Нагрузочное тестирование endpoint | Type: QA | Создать k6/vegeta сценарий: 500 RPS в течение 5 минут, проверка p50 <200ms, p95 <500ms, p99 <1000ms, 0% ошибок 5xx. | DoD: скрипт в репо; отчёт с графиками latency; baseline зафиксирован | Estimate: 6h

---

### [STORY-002] Нормализация телефонного номера в E.164

**"As a** Network Admin, **I want** чтобы все телефоны автоматически нормализовались в формат E.164 при приёме, **so that** дедупликация работала корректно независимо от формата ввода аффилейта (+38067, 067, 38067 => +380671234567)."

**Acceptance Criteria:**
- [ ] Телефон нормализуется в E.164 (+ country code + subscriber number) с использованием libphonenumber; исходный телефон сохраняется в поле phone, нормализованный -- в phone_e164
- [ ] При наличии country в payload -- используется как hint для парсинга; при отсутствии -- определяется по IP геолокации; при невозможности определить -- попытка парсинга без hint с fallback на rejection
- [ ] Поддержка минимум 200 стран (все страны из libphonenumber); корректная обработка: мобильных, стационарных, toll-free номеров
- [ ] При невозможности нормализации -- лид НЕ отклоняется, а записывается с phone_e164=null и флагом quality_score -= 20; в ответе warning: `"warnings": [{"field": "phone", "code": "NORMALIZATION_FAILED", "message": "..."}]`
- [ ] Нормализация добавляет <10ms к общему времени обработки (бенчмарк на 10K номеров)

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0008] Интеграция библиотеки нормализации телефонов | Type: Backend | Подключить Go-порт libphonenumber (github.com/nyaruka/phonenumbers). Создать сервис PhoneNormalizer с методом Normalize(phone, countryHint) -> (e164, lineType, error). Кэширование metadata не требуется (in-memory по умолчанию). | DoD: сервис возвращает корректный E.164 для 50+ тестовых номеров из 15 стран; benchmark <5ms per call | Estimate: 6h

[TASK-0009] Определение страны по IP для phone hint | Type: Backend | Использовать GeoIP2 (MaxMind) для определения country code по IP адресу лида. Результат используется как fallback hint для нормализации телефона. База GeoLite2-Country обновляется еженедельно через cron. | DoD: корректное определение страны для 95%+ реальных IP; graceful fallback при отсутствии БД или неизвестном IP; тест с mock GeoIP | Estimate: 4h

[TASK-0010] Unit-тесты нормализации для edge cases | Type: QA | Покрыть: номера без кода страны (067...), с кодом (38067...), с плюсом (+38067...), с пробелами/скобками (+38 (067) 123-45-67), короткие номера (<7 цифр), слишком длинные (>15 цифр), буквы в номере, VOIP-номера, satellite номера. Минимум 50 test cases по 15 странам. | DoD: 50+ тестов проходят; включая Россию, Украину, Казахстан, Германию, UK, US, Бразилию, Индию, ОАЭ, Саудовскую Аравию, Турцию, Индонезию, Таиланд, ЮАР, Нигерию | Estimate: 8h

---

### [STORY-003] Валидация email с DNS и SMTP проверкой

**"As a** Network Admin, **I want** чтобы система проверяла email адреса при приёме лида на уровне формата, DNS MX-записи и опционально SMTP, **so that** процент невалидных email в системе не превышал 1%."

**Acceptance Criteria:**
- [ ] Трёхуровневая валидация: (1) RFC 5322 формат, (2) DNS MX lookup с таймаутом 2 секунды, (3) опциональная SMTP RCPT TO проверка с таймаутом 5 секунд (конфигурируется на уровне tenant)
- [ ] Блокировка одноразовых email-доменов (disposable): встроенный список 10,000+ доменов + ежемесячное обновление; при попадании -- reject с кодом DISPOSABLE_EMAIL
- [ ] Email приводится к lowercase; удаление dots в gmail.com (john.doe@gmail.com == johndoe@gmail.com); удаление +tag (john+tag@gmail.com == john@gmail.com) -- конфигурируется
- [ ] DNS/SMTP-проверка выполняется асинхронно и НЕ блокирует ответ 201; результат обновляет quality_score лида через фоновый worker в течение 30 секунд
- [ ] Rate limiting на DNS/SMTP проверки: максимум 100 lookups/sec глобально для предотвращения блокировки DNS-серверами

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0011] Синхронная валидация формата и disposable check | Type: Backend | Реализовать EmailValidator.ValidateFormat(email) -- RFC 5322 regex + lowercase + canonical form + disposable domain check из embedded списка. Результат: valid/invalid + причина. | DoD: тесты на 30+ edge cases (unicode domain, IDN, длинные local part >64 символов, пустой, double @, точка в начале/конце); disposable список загружается из embedded ресурса | Estimate: 6h

[TASK-0012] Асинхронный DNS MX + SMTP worker | Type: Backend | Создать background worker, читающий из очереди (Redis Stream или channel) email-адреса для проверки. MX lookup -> SMTP HELO/MAIL FROM/RCPT TO. Результат обновляет leads.quality_score и пишет в lead_events. Circuit breaker на SMTP-проверки: при 5 consecutive failures -- выключить SMTP на 5 минут. | DoD: worker обрабатывает до 100 email/sec; graceful shutdown; circuit breaker тесты; метрики в Prometheus (checked_total, failed_total, latency_histogram) | Estimate: 10h

[TASK-0013] Список disposable email доменов | Type: Backend | Встроить список из открытого источника (disposable-email-domains, 10K+). Добавить CLI-команду для обновления. Хранение: embedded Go file, генерируемый при сборке. | DoD: список содержит 10K+ доменов; go generate команда обновляет; тест на наличие известных доменов (guerrillamail, tempmail, throwaway) | Estimate: 3h

[TASK-0014] Тестирование email-валидации | Type: QA | Edge cases: IDN-домены (кириллица), длинные адреса (>254 символа), отсутствующий MX (fallback на A-запись), таймаут DNS, SMTP reject, SMTP greylisting. | DoD: 25+ тестов; mock DNS/SMTP серверы; coverage >90% для email пакета | Estimate: 6h

---

### [STORY-004] Дедупликация лидов по телефону и email

**"As a** Media Buyer, **I want** чтобы система отклоняла дубликаты лидов по комбинации phone_e164 + email, **so that** я не платил за повторную отправку одного и того же клиента и брокер не жаловался на дубли."

**Acceptance Criteria:**
- [ ] Дедупликация по phone_e164 OR email (конфигурируется per-tenant): если лид с таким phone_e164 ИЛИ canonical email уже существует в рамках tenant за настраиваемый период (default 90 дней) -- reject с кодом DUPLICATE_LEAD и ссылкой на original_lead_id
- [ ] Окно дедупликации конфигурируется per-tenant: от 1 часа до 365 дней; по умолчанию 90 дней
- [ ] Проверка дедупликации выполняется <50ms даже при 10M+ записей (использование индексов на phone_e164 и email с условием по created_at)
- [ ] Ответ при дубликате содержит: `{ "error": "DUPLICATE_LEAD", "duplicate_of": "uuid", "matched_on": "phone_e164", "original_created_at": "ISO8601" }` -- аффилейт точно знает что и когда было дублём
- [ ] Дедупликация учитывает нормализованные значения: phone -- E.164 форма, email -- canonical форма (lowercase, без +tag, без dots в gmail)

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-002, STORY-003

#### Tasks:

[TASK-0015] Сервис дедупликации с конфигурируемым окном | Type: Backend | Создать DeduplicationService.Check(tenantID, phoneE164, canonicalEmail) -> (isDuplicate, originalLeadID, matchedField). Запрос к leads с индексами по phone_e164 и email, фильтр по created_at >= now() - window. Tenant-level настройка окна в таблице tenants.settings. | DoD: корректный результат при дублях по phone, по email, по обоим; корректная работа с NULL phone_e164; benchmark <50ms на таблице с 10M записей (explain analyze) | Estimate: 8h

[TASK-0016] Индексы для быстрой дедупликации | Type: DevOps | Создать partial composite индексы: (tenant_id, phone_e164, created_at DESC) WHERE phone_e164 IS NOT NULL; (tenant_id, email, created_at DESC). Проверить query plan при 10M записей. Миграция 004_dedup_indexes. | DoD: EXPLAIN ANALYZE показывает Index Scan (не Seq Scan) при 10M записей; миграция идемпотентна (IF NOT EXISTS) | Estimate: 4h

[TASK-0017] Интеграционные тесты дедупликации | Type: QA | Кейсы: дубль по phone, дубль по email, дубль по обоим, лид за пределами окна (не дубль), разные tenant_id (не дубль), phone без E.164 нормализации (fallback на raw phone), canonical email vs raw email. | DoD: 15+ тестов на testcontainers с реальной PostgreSQL | Estimate: 6h

---

### [STORY-005] Поддержка idempotency key

**"As a** Developer, **I want** передавать заголовок Idempotency-Key при отправке лида, **so that** при network retry я гарантированно не создам дубликат и получу тот же ответ что и при первом запросе."

**Acceptance Criteria:**
- [ ] Заголовок Idempotency-Key (строка до 255 символов) сохраняется в leads.idempotency_key; уникальный индекс per-tenant гарантирует уникальность
- [ ] При повторном запросе с тем же Idempotency-Key: если оригинальный запрос завершился -- возвращается тот же ответ (201 с тем же body) с заголовком Idempotency-Replayed: true; HTTP-статус НЕ 409, а 201 (семантика идемпотентности)
- [ ] Если оригинальный запрос ещё в процессе (race condition) -- возвращается 409 Conflict с заголовком Retry-After: 1
- [ ] Idempotency key хранится 72 часа; после этого тот же ключ может быть использован повторно (TTL через pg_cron или application-level cleanup)
- [ ] При отсутствии заголовка -- лид обрабатывается без idempotency (backward compatible); idempotency key не влияет на дедупликацию по phone/email (это разные механизмы)

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0018] Реализация idempotency middleware | Type: Backend | Создать middleware, извлекающий Idempotency-Key из заголовка. Логика: (1) SELECT по idempotency_key + tenant_id, (2) если найден и processed -- вернуть cached response, (3) если найден и processing -- 409, (4) если не найден -- INSERT с status=processing, продолжить обработку, UPDATE status=processed + cached response после завершения. Использовать SELECT FOR UPDATE SKIP LOCKED для обработки race condition. | DoD: корректная обработка concurrent requests (test с goroutines); тест на replay; тест на conflict; benchmark: overhead <5ms | Estimate: 10h

[TASK-0019] Таблица хранения idempotency responses | Type: Backend | Создать таблицу idempotency_keys: (tenant_id, key, status, response_status_code, response_body JSONB, created_at, expires_at). Index: UNIQUE (tenant_id, key). pg_cron job или background goroutine для очистки записей старше 72 часов. Миграция 004_idempotency. | DoD: миграция применяется без даунтайма; cleanup удаляет expired записи batch по 1000; тест на TTL | Estimate: 4h

[TASK-0020] Тесты идемпотентности | Type: QA | Сценарии: первый запрос (201), повторный с тем же ключом (201 + Idempotency-Replayed), конкурентные запросы с тем же ключом (один 201, другой 409), запрос после TTL (новый 201), разные tenant_id с одинаковым ключом (оба 201), запрос без ключа (201, без idempotency). | DoD: 10+ тестов включая concurrent; CI-стабильные (не flaky) | Estimate: 6h

---

### [STORY-006] IP-геолокация при приёме лида

**"As a** Network Admin, **I want** чтобы при приёме лида автоматически определялась страна, город и ISP по IP-адресу, **so that** маршрутизация могла использовать реальную гео-информацию, а не только заявленную аффилейтом."

**Acceptance Criteria:**
- [ ] При наличии IP в payload -- определяются: country (ISO 3166-1 alpha-2), city, region, ISP, is_vpn, is_proxy, is_tor, is_datacenter; результат записывается в leads.extra.geo
- [ ] Если country в payload не указана -- country из GeoIP используется как основная; если указана -- GeoIP-country записывается отдельно в geo.ip_country для сравнения (мисматч = fraud signal)
- [ ] Мисматч between заявленной страной и GeoIP-страной добавляет fraud_signal: `"geo_mismatch": true` в leads.fraud_card и уменьшает quality_score на 15 пунктов
- [ ] GeoIP lookup добавляет <5ms к обработке (in-memory БД MaxMind GeoLite2); при недоступности GeoIP БД -- лид принимается без geo-данных (graceful degradation)
- [ ] VPN/Proxy/TOR/Datacenter флаги используют отдельную БД (MaxMind GeoIP2-Anonymous-IP или аналог); при отсутствии платной БД -- поля не заполняются

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0021] Интеграция MaxMind GeoLite2 | Type: Backend | Создать сервис GeoIPService с методом Lookup(ip) -> GeoResult. Загрузка mmdb файла при старте приложения (in-memory reader). Автоматическое обновление через отдельный goroutine раз в неделю (MaxMind account ID + license key из конфига). | DoD: корректное определение страны для 95%+ публичных IP; graceful при отсутствии файла; метрика geoip_lookup_duration_seconds | Estimate: 6h

[TASK-0022] Обогащение лида geo-данными | Type: Backend | В pipeline обработки лида после валидации: вызов GeoIPService.Lookup(lead.IP), запись результата в leads.extra.geo, проверка мисматча country, обновление fraud_card и quality_score. | DoD: тест с mock GeoIP; проверка мисматча; проверка graceful degradation; проверка записи всех полей | Estimate: 4h

[TASK-0023] DevOps: автоматическое обновление GeoIP БД | Type: DevOps | Настроить скачивание GeoLite2-Country.mmdb и GeoLite2-City.mmdb при старте контейнера (init container или download при старте). Fallback: bundled версия в Docker image. | DoD: контейнер стартует с актуальной БД; при ошибке скачивания -- использует bundled; health check включает наличие GeoIP | Estimate: 4h

---

### [STORY-007] Rate limiting по API-ключу

**"As a** Network Admin, **I want** ограничить количество запросов на приём лидов per API-key и per IP, **so that** один аффилейт не мог перегрузить систему и другие аффилейты не страдали от noisy neighbor."

**Acceptance Criteria:**
- [ ] Rate limit per API key: конфигурируется в api_keys.rate_limit_per_min (default 60); при превышении -- 429 Too Many Requests с заголовками X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset (Unix timestamp), Retry-After (секунды)
- [ ] Rate limit per IP: глобальный 300 req/min per IP (не зависит от API key); защита от brute-force без API key -- 10 req/min на неаутентифицированные запросы
- [ ] Алгоритм: sliding window (Redis ZSET) с точностью до секунды; не token bucket (более предсказуемое поведение для клиентов)
- [ ] Rate limit headers возвращаются в КАЖДОМ ответе (не только при 429), чтобы клиент мог адаптировать скорость отправки
- [ ] Burst: допускается кратковременное превышение до 2x от лимита в течение 5 секунд для обработки batch-отправок

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0024] Реализация sliding window rate limiter на Redis | Type: Backend | Создать RateLimiter с методом Allow(key, limit, window) -> (allowed bool, remaining int, resetAt time). Использовать Redis ZSET: ZADD с текущим timestamp, ZREMRANGEBYSCORE для очистки, ZCARD для подсчёта. Один roundtrip через Lua script. | DoD: корректный подсчёт в sliding window; benchmark: <1ms per call; тест с concurrent goroutines (100 concurrent); тест burst логики | Estimate: 8h

[TASK-0025] Middleware rate limiting в API gateway | Type: Backend | Создать middleware, применяющий rate limiter перед обработкой запроса. Извлечение ключа: API key (из X-API-Key) или IP (для неаутентифицированных). Инъекция заголовков X-RateLimit-* в каждый ответ. При 429 -- JSON body с error code RATE_LIMIT_EXCEEDED и Retry-After. | DoD: заголовки присутствуют в каждом ответе; 429 при превышении; тест с разными API keys (изолированные лимиты) | Estimate: 4h

[TASK-0026] Конфигурация rate limits per API key в UI | Type: Frontend | На странице управления API-ключами (EPIC-04) добавить поле "Rate limit (req/min)" с валидацией: min 10, max 10000, default 60. Показывать текущий usage (gauge) в реальном времени. | DoD: поле сохраняется; валидация на фронте и бэкенде; usage gauge обновляется каждые 10 секунд | Estimate: 4h

[TASK-0027] Нагрузочный тест rate limiting | Type: QA | Сценарий: 5 API keys с лимитами 60, 120, 300, 600, 1000 req/min; отправка на 150% от лимита в течение 2 минут; проверка что 429 возвращается корректно; проверка что не-exceeded ключи продолжают работать; проверка Redis memory usage. | DoD: отчёт с графиками; подтверждение изоляции между ключами; Redis memory <100MB при 10K ключей | Estimate: 6h

---

### [STORY-008] Аутентификация по API-ключу

**"As a** Developer, **I want** аутентифицировать запросы через API-ключ в заголовке X-API-Key, **so that** только авторизованные аффилейты могли отправлять лиды, и каждый запрос был привязан к конкретному аффилейту."

**Acceptance Criteria:**
- [ ] API-ключ передаётся в заголовке X-API-Key; формат: `gc_live_` + 32 символа hex (пример: gc_live_a1b2c3d4e5f6...); prefix `gc_test_` для тестовых ключей
- [ ] Ключ хешируется при хранении (SHA-256); lookup по prefix (первые 8 символов хранятся plain text в key_prefix для быстрого поиска); сам ключ НИКОГДА не хранится в plain text
- [ ] При невалидном ключе -- 401 с телом `{"error": "INVALID_API_KEY", "message": "API key is invalid or deactivated"}`; НЕ указывать, существует ли ключ (защита от enumeration)
- [ ] Поддержка IP whitelist: если api_keys.allowed_ips не пустой -- запросы с других IP получают 403 Forbidden с кодом IP_NOT_WHITELISTED
- [ ] Каждый успешный запрос обновляет api_keys.last_used_at; запись в audit_log при первом использовании нового ключа

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0028] Middleware аутентификации по API-ключу | Type: Backend | Извлечение X-API-Key из заголовка; lookup по key_prefix (первые 8 символов); SHA-256 hash comparison; проверка is_active; проверка allowed_ips; установка tenant_id и affiliate_id в context. Timing-safe comparison для предотвращения timing attacks. | DoD: аутентификация <5ms (с кэшированием в Redis, TTL 60s); timing-safe; тесты: валидный ключ, невалидный ключ, деактивированный ключ, IP не в whitelist | Estimate: 8h

[TASK-0029] Генерация и управление API-ключами | Type: Backend | API endpoints: POST /api/v1/api-keys (create), DELETE /api/v1/api-keys/:id (revoke), GET /api/v1/api-keys (list -- без самого ключа, только prefix и metadata). Ключ показывается ТОЛЬКО при создании (один раз). Scopes: leads:write, leads:read, analytics:read. | DoD: полный CRUD; ключ возвращается только при создании; revoke немедленно инвалидирует кэш; audit_log при каждой операции | Estimate: 6h

[TASK-0030] Тесты безопасности аутентификации | Type: QA | Сценарии: brute-force API key (проверка rate limit на неаутентифицированные), timing attack (измерение разницы ответа для существующего vs несуществующего prefix), enumeration (одинаковые ответы на невалидный ключ), replay с отозванным ключом, запрос после изменения IP whitelist. | DoD: 10+ security-тестов; отчёт о timing attack (разница <1ms между кейсами) | Estimate: 6h

---

### [STORY-009] CSV / Bulk Import лидов

**"As an** Affiliate Manager, **I want** загружать лиды массово из CSV-файла через UI, **so that** я мог мигрировать исторические данные или загрузить offline-собранные лиды без ручного ввода."

**Acceptance Criteria:**
- [ ] Upload CSV через POST /api/v1/leads/import (multipart/form-data); максимальный размер файла 50MB; максимум 100,000 строк за один импорт
- [ ] Поддерживаемые разделители: запятая, точка с запятой, tab; автоопределение; кодировки: UTF-8, Windows-1251, ISO-8859-1 с автодетектом
- [ ] Каждая строка проходит ту же валидацию, нормализацию и дедупликацию, что и единичный POST; результат: `{"total": 1000, "imported": 950, "duplicates": 30, "errors": 20, "error_rows": [{"row": 5, "errors": [...]}]}`
- [ ] Импорт выполняется асинхронно: ответ 202 Accepted с job_id; статус проверяется через GET /api/v1/leads/import/:job_id; по завершении -- уведомление в UI и Telegram (если настроен)
- [ ] Маппинг колонок: первая строка -- заголовки; автоматический маппинг стандартных имён (first_name, email, phone) + ручной маппинг нестандартных через UI-экран перед запуском

**Story Points:** 13
**Priority:** Should
**Dependencies:** STORY-001, STORY-002, STORY-003, STORY-004

#### Tasks:

[TASK-0031] Backend: парсинг и валидация CSV | Type: Backend | Сервис CSVImporter: парсинг файла с автодетектом разделителя и кодировки (golang.org/x/text/encoding); стриминговое чтение (не загружать весь файл в память); валидация заголовков; маппинг колонок по конфигу. | DoD: парсинг файлов 50MB за <30 секунд; корректный детект кодировок; тест с 100K строк | Estimate: 10h

[TASK-0032] Backend: асинхронная обработка импорта | Type: Backend | Job система: создание записи import_jobs (id, tenant_id, status, total, processed, imported, errors, result_url, created_at). Background worker обрабатывает строки batch по 100, каждая через тот же pipeline что POST /api/v1/leads. Progress обновляется в Redis (для polling). | DoD: обработка 100K строк за <5 минут; progress корректный; при crash -- job помечается как failed; retry логика | Estimate: 12h

[TASK-0033] Frontend: UI импорта CSV | Type: Frontend | Страница импорта: (1) drag&drop загрузка файла, (2) превью первых 10 строк, (3) экран маппинга колонок (dropdown для каждого заголовка), (4) прогресс-бар во время импорта, (5) результат с количеством и ссылкой на скачивание ошибок (error_rows.csv). | DoD: макет согласован с дизайном; drag&drop работает; маппинг сохраняется как шаблон; прогресс обновляется каждые 2 секунды | Estimate: 16h

[TASK-0034] Скачивание отчёта об ошибках | Type: Backend | GET /api/v1/leads/import/:job_id/errors возвращает CSV с ошибочными строками + колонка "error" с описанием. Файл генерируется по завершении импорта и хранится 7 дней. | DoD: файл скачивается корректно; кодировка UTF-8 BOM (для Excel); тест на файл с 1000 ошибок | Estimate: 4h

---

### [STORY-010] Детальный ответ с причиной отклонения лида

**"As a** Media Buyer, **I want** получать детальное объяснение причины отклонения лида в ответе API, **so that** я мог исправить данные на своей стороне или понять проблему с трафиком без обращения в поддержку."

**Acceptance Criteria:**
- [ ] При отклонении лида (status=rejected) -- ответ содержит массив причин: `"rejection_reasons": [{"code": "DUPLICATE_LEAD", "field": "phone_e164", "message": "...", "details": {"duplicate_of": "uuid"}}]`
- [ ] Коды причин (полный список): INVALID_FORMAT, MISSING_REQUIRED_FIELD, DUPLICATE_LEAD, DISPOSABLE_EMAIL, PHONE_NORMALIZATION_FAILED, RATE_LIMIT_EXCEEDED, IP_BLACKLISTED, FRAUD_SCORE_TOO_LOW, GEO_RESTRICTED, AFFILIATE_SUSPENDED, CAP_REACHED, BROKER_UNAVAILABLE
- [ ] Каждая причина содержит: code (enum), field (какое поле вызвало проблему, nullable), message (human-readable на языке tenant -- RU/EN), details (дополнительная информация, зависит от кода)
- [ ] Настройка уровня детализации per-tenant: "full" (все детали включая duplicate_of), "standard" (код + message), "minimal" (только код); default: "standard"
- [ ] Rejection reasons записываются в lead_events для аналитики: топ причин отклонения за период, per-affiliate rejection rate

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001, STORY-004

#### Tasks:

[TASK-0035] Система кодов отклонения | Type: Backend | Создать пакет rejection с enum кодов, структурой RejectionReason и builder-паттерном. Каждый код привязан к HTTP status (400 для валидации, 409 для дубликатов, 403 для ограничений, 503 для недоступности). Локализация: RU/EN messages в embedded JSON. | DoD: все 12 кодов реализованы; локализация RU/EN; тест на каждый код | Estimate: 6h

[TASK-0036] Интеграция rejection reasons в pipeline | Type: Backend | В каждом шаге pipeline (валидация, нормализация, дедупликация, fraud check, routing) -- при отклонении добавлять RejectionReason в коллектор. Финальный ответ содержит все собранные причины. Уровень детализации определяется из tenant.settings.rejection_detail_level. | DoD: тест: лид с невалидным email + дубль телефона = обе причины в ответе; тест уровней детализации | Estimate: 6h

[TASK-0037] Аналитика причин отклонения | Type: Backend | Запись каждой причины отклонения в lead_events (event_type=rejection, details=причины). Endpoint GET /api/v1/analytics/rejections с фильтрами: period, affiliate_id, rejection_code. Ответ: `[{"code": "DUPLICATE_LEAD", "count": 150, "percentage": 15.5}]`. | DoD: агрегация корректна; фильтры работают; benchmark <500ms на 1M events | Estimate: 8h

---

### [STORY-011] Webhook уведомления о статусе лида

**"As a** Developer, **I want** настроить webhook URL для получения уведомлений об изменении статуса лида, **so that** моя система могла автоматически реагировать на delivered/rejected/ftd события без polling."

**Acceptance Criteria:**
- [ ] Настройка webhook URL per affiliate (affiliates.postback_url) и per event type (affiliates.postback_events): delivered, rejected, ftd, deposited, callback, hold; по умолчанию: delivered, rejected, ftd
- [ ] Webhook payload: POST с JSON body содержащим 20+ переменных: lead_id, status, affiliate_id, aff_sub1..aff_sub10, country, broker_id (если разрешён), payout, created_at, updated_at, rejection_reasons (если rejected), funnel_name, ip, click_id
- [ ] Retry политика: 3 попытки с exponential backoff (5s, 30s, 120s); при 3 неудачах -- событие помечается как failed; webhook не отключается (только алерт Network Admin)
- [ ] Подпись: каждый webhook подписан HMAC-SHA256 с секретом аффилейта; заголовок X-GambChamp-Signature содержит `sha256=hex_digest`; документация по верификации
- [ ] Latency: webhook отправляется в течение 5 секунд после изменения статуса; не блокирует основной flow обработки лида

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0038] Webhook dispatcher service | Type: Backend | Сервис WebhookDispatcher: подписка на события изменения статуса лида (через Redis Pub/Sub или internal channel); формирование payload с 20+ переменными; HTTP POST на postback_url; HMAC-SHA256 подпись. Timeout на отправку: 10 секунд. | DoD: отправка в течение 5 секунд; подпись верифицируема; тест с mock HTTP server; метрики: webhook_sent_total, webhook_failed_total, webhook_latency | Estimate: 10h

[TASK-0039] Retry queue для failed webhooks | Type: Backend | При ошибке отправки (timeout, 4xx, 5xx) -- добавить в retry queue (Redis sorted set по next_attempt_at). Worker пробует 3 раза с backoff. После 3 неудач -- создать notification для Network Admin. Хранение истории попыток в lead_events. | DoD: retry корректный; backoff корректный; notification создаётся; тест с mock сервером возвращающим 500 трижды | Estimate: 6h

[TASK-0040] UI настройки webhook per affiliate | Type: Frontend | В карточке аффилейта: поле webhook URL, чекбоксы событий (delivered, rejected, ftd, deposited, callback, hold), кнопка "Test webhook" (отправляет тестовый payload), лог последних 20 доставок с статусом. | DoD: настройки сохраняются; тест webhook отправляет реальный запрос и показывает результат; лог обновляется в реальном времени | Estimate: 8h

---

### [STORY-012] Health check и мониторинг Lead Intake

**"As a** Team Lead, **I want** иметь health check endpoint и Prometheus метрики для Lead Intake сервиса, **so that** я мог мониторить здоровье системы, настроить алерты и быстро диагностировать проблемы."

**Acceptance Criteria:**
- [ ] GET /health возвращает 200 OK с `{"status": "healthy", "version": "1.0.0", "uptime": "...", "checks": {"postgres": "ok", "redis": "ok", "geoip": "ok"}}` или 503 при проблемах с зависимостями
- [ ] Prometheus метрики на /metrics: leads_received_total (counter, labels: tenant, affiliate, status), lead_processing_duration_seconds (histogram), api_errors_total (counter, labels: status_code, error_code), dedup_checks_total, email_validations_total, geoip_lookups_total
- [ ] Latency SLO dashboard: процент запросов <500ms за последние 24 часа; алерт при падении ниже 99%
- [ ] Structured logging (JSON) с correlation_id (X-Request-ID из заголовка или generated UUID); все этапы pipeline логируются с одним correlation_id

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0041] Health check endpoint | Type: Backend | GET /health с проверками: PostgreSQL ping (<100ms), Redis ping (<50ms), GeoIP database loaded, disk space >10%. Каждая проверка с timeout 2 секунды. Общий статус: healthy (все ok), degraded (некритичные failed), unhealthy (PostgreSQL или Redis failed). | DoD: health check возвращает корректный статус; Kubernetes readiness/liveness probe совместимость; тест при отключённом Redis (degraded) | Estimate: 4h

[TASK-0042] Prometheus метрики | Type: Backend | Инструментация всех handlers и сервисов: request_duration_seconds (histogram), requests_total (counter), active_requests (gauge). Business метрики: leads_received_total, leads_rejected_total, dedup_hits_total. Cardinality: не более 100 label combinations per metric. | DoD: все метрики экспортируются на /metrics; Grafana dashboard JSON в репо; тест на наличие метрик | Estimate: 6h

[TASK-0043] Structured logging с correlation_id | Type: Backend | Middleware: извлечение X-Request-ID или генерация UUID v4; injection в context; все логи через zerolog с полями: correlation_id, tenant_id, affiliate_id, duration_ms. Уровни: DEBUG (pipeline steps), INFO (intake result), WARN (degraded), ERROR (failures). | DoD: все логи содержат correlation_id; JSON format; тест на trace через pipeline (один ID на все шаги) | Estimate: 4h

[TASK-0044] Grafana dashboard и алерты | Type: DevOps | Dashboard: intake throughput (RPS), latency percentiles (p50/p95/p99), error rate, rejection reasons breakdown, top affiliates by volume. Алерты: p95 >500ms (warn), p99 >1s (critical), error rate >1% (warn), >5% (critical). | DoD: dashboard импортируется в Grafana; алерты настроены; скриншот в документации | Estimate: 6h

---

---

## EPIC-02: Lead Routing Engine

**ID:** EPIC-02
**Name:** Lead Routing Engine -- Движок маршрутизации лидов
**Goal:** Реализовать гибкий движок маршрутизации лидов к брокерам с поддержкой двух алгоритмов (Weighted Round-Robin и Slots vs Chance), раздельных капов по странам, timezone-aware сброса, приоритетных групп (waterfall), таймслотов и визуального drag-and-drop редактора правил.
**Success Metric:** Latency маршрутизации <100ms на p95; 99.9% правильный routing (соответствие правилам); 0% over-cap delivery; поддержка 100+ активных правил на tenant.
**Priority:** P0 (MVP)
**Dependencies:** EPIC-01
**Size Estimate:** 440 часов (11 спринтов-участников)

---

### [STORY-013] Weighted Round-Robin алгоритм маршрутизации

**"As a** Network Admin, **I want** настраивать маршрутизацию по алгоритму Weighted Round-Robin, **so that** лиды распределялись между брокерами пропорционально назначенным весам (например, 60% брокеру A, 30% брокеру B, 10% брокеру C)."

**Acceptance Criteria:**
- [ ] Алгоритм Weighted Round-Robin: каждому брокеру в правиле назначается weight (1-1000); лиды распределяются пропорционально весам; отклонение от целевого распределения <2% при выборке >100 лидов
- [ ] При недоступности брокера (cap full, offline, error) -- его вес перераспределяется между оставшимися пропорционально их весам; перераспределение мгновенное (не требует перезагрузки правила)
- [ ] Stateful: текущая позиция round-robin хранится в Redis (INCR атомарная операция); при перезапуске сервиса -- продолжение с текущей позиции
- [ ] Поддержка "sticky" routing: если настроено, лиды от одного аффилейта всегда идут к одному брокеру (consistent hashing по affiliate_id)
- [ ] Routing decision записывается в lead_events: выбранный алгоритм, рассмотренные брокеры с весами, итоговый выбор, причина (weight selection / fallback / sticky)

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-001

#### Tasks:

[TASK-0045] Реализация WRR алгоритма | Type: Backend | Создать WeightedRoundRobin struct с методом Next(candidates []BrokerTarget) -> BrokerTarget. Использовать smooth weighted round-robin (алгоритм NGINX) для равномерного распределения. State в Redis: hash с current_weight per broker. Атомарность через Lua script. | DoD: отклонение <2% при 1000 выборках; тест с 3, 5, 10 брокерами; benchmark <1ms per decision | Estimate: 10h

[TASK-0046] Fallback при недоступности брокера | Type: Backend | При cap full / offline / error -- исключить брокера из candidates; пересчитать weights; выбрать следующего. Если все брокеры недоступны -- вернуть NO_AVAILABLE_BROKER. Логика: (1) check cap, (2) check health, (3) check schedule, (4) select by WRR. | DoD: тест: один из трёх offline -- оставшиеся получают его долю; тест: все offline -- корректный error; lead_event с деталями fallback | Estimate: 8h

[TASK-0047] Sticky routing (consistent hashing) | Type: Backend | Опциональный режим: consistent hashing по affiliate_id (ketama algorithm с 150 virtual nodes per broker). При добавлении/удалении брокера -- минимальное перераспределение (~1/n ключей). Конфигурируется per-rule: `"sticky": true`. | DoD: один affiliate всегда идёт к одному брокеру при неизменном наборе; добавление брокера перемещает ~1/n аффилейтов; тест с 1000 affiliate IDs | Estimate: 6h

[TASK-0048] Unit и integration тесты WRR | Type: QA | Тесты: распределение при равных весах; распределение 70/20/10; брокер с weight=0 (исключён); все брокеры с weight=0 (ошибка); concurrent routing (10 goroutines); перезапуск сервиса (state сохраняется). | DoD: 15+ тестов; статистические тесты на распределение (chi-squared test, p>0.05) | Estimate: 8h

---

### [STORY-014] Алгоритм Slots vs Chance

**"As a** Network Admin, **I want** использовать алгоритм Slots vs Chance (как в Leadgreed), **so that** я мог выбирать между гарантированным количеством лидов (slots) и вероятностным распределением (chance) для каждого брокера в рамках одного flow."

**Acceptance Criteria:**
- [ ] Два режима per-broker в правиле: SLOTS (фиксированное количество лидов: "дай этому брокеру ровно 50 лидов в день") и CHANCE (процент вероятности: "40% шанс что лид уйдёт к этому брокеру")
- [ ] Slots-брокеры обрабатываются первыми: если у брокера осталось N slots -- он получает лид; когда slots=0 -- пропускается; после заполнения всех slots -- оставшиеся лиды идут по Chance-алгоритму
- [ ] Chance-алгоритм: random selection с заданными процентами (sum может быть <100% -- остаток = rejected/overflow); при sum >100% -- нормализация до 100%
- [ ] Микс Slots и Chance в одном правиле: 3 брокера на slots (50+30+20 лидов) + 2 брокера на chance (60%+40% от остатка)
- [ ] Dashboard виджет: текущий прогресс заполнения slots для каждого брокера (gauge: 35/50 slots filled)

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-013

#### Tasks:

[TASK-0049] Реализация Slots алгоритма | Type: Backend | SlotsAllocator: счётчик consumed slots per broker в Redis (INCR). Check: если consumed < allocated_slots -- assign. При исчерпании -- skip. Reset при смене дня (по timezone правила). Atomicity через Lua script. | DoD: корректное заполнение slots; тест concurrent assignment (race condition); тест ровно N лидов в slots; тест reset at midnight | Estimate: 8h

[TASK-0050] Реализация Chance алгоритма | Type: Backend | ChanceSelector: weighted random selection на основе процентов. Криптографически стойкий PRNG (crypto/rand). При sum <100% -- оставшийся процент = no_match (лид идёт дальше по waterfall или rejected). | DoD: распределение статистически корректно (chi-squared, 10000 выборок, p>0.05); тест с sum=80% (20% not matched); тест с sum=150% (нормализация) | Estimate: 6h

[TASK-0051] Комбинированный Slots+Chance engine | Type: Backend | Orchestrator: (1) попытать slots-брокеров в порядке приоритета, (2) если все slots заполнены -- перейти к chance-брокерам, (3) если chance не сматчил -- overflow/reject. Конфигурация per-broker: `{"mode": "slots", "value": 50}` или `{"mode": "chance", "value": 40}`. | DoD: тест: 2 slots (10+5) + 2 chance (60%+40%); первые 15 лидов -- в slots; последующие -- по chance; lead_event с полным audit trail | Estimate: 8h

[TASK-0052] Тесты алгоритма Slots vs Chance | Type: QA | Edge cases: все slots заполнены; chance 0% (skip); единственный broker с chance 100%; slots + chance с одним offline broker; concurrent slots filling (100 goroutines, ровно N slots). | DoD: 20+ тестов; stress test на 10K лидов | Estimate: 8h

---

### [STORY-015] GEO-фильтры и раздельные капы по странам

**"As a** Network Admin, **I want** настраивать разрешённые/запрещённые страны per-правило и устанавливать отдельный кап для каждой страны, **so that** я мог ограничить брокера до 50 лидов из Германии и 100 из Австрии в рамках одного правила."

**Acceptance Criteria:**
- [ ] GEO-фильтр per-правило: include list (лид проходит только если country в списке) ИЛИ exclude list (лид проходит если country НЕ в списке); поддержка Country Groups (например, "DACH" = DE+AT+CH, "Nordics" = SE+NO+DK+FI+IS)
- [ ] Раздельные капы по странам per-broker per-rule: `"country_caps": {"DE": 50, "AT": 100, "CH": 30, "default": 20}`; "default" -- для стран не указанных явно; если country_caps пуст -- используется общий daily_cap
- [ ] Кап проверяется атомарно с assignment (Redis INCR + проверка): нет race condition при concurrent requests; при cap full -- broker пропускается; оставшийся лимит возвращается в API `GET /api/v1/rules/:id/caps`
- [ ] Country Groups CRUD: POST/GET/PUT/DELETE /api/v1/country-groups; предустановленные группы: DACH, Nordics, LATAM, MENA, SEA, CIS, EU, Anglosphere; пользователь может создавать свои
- [ ] UI: визуальное отображение заполненности капов по странам (heatmap или progress bars с цветовой индикацией: зелёный <70%, жёлтый 70-90%, красный >90%)

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-013

#### Tasks:

[TASK-0053] GEO-фильтр в routing engine | Type: Backend | Добавить GeoFilter в pipeline маршрутизации: проверка lead.country против rule.conditions.geo_include / geo_exclude. Поддержка Country Groups: разворачивание группы в список стран при оценке. Cache resolved groups в memory (invalidate on change). | DoD: тест include/exclude; тест country groups; тест с неизвестной страной (reject/pass configurable); benchmark <0.1ms | Estimate: 6h

[TASK-0054] Раздельные капы по странам | Type: Backend | CountryCapManager: Redis hash per rule per broker: `cap:{rule_id}:{broker_id}:daily:{country}` -> INCR. Проверка: if current >= cap -> skip broker for this country. Поддержка "default" cap. Atomic check+increment через Lua. | DoD: тест: DE=50, AT=100; 51-й лид из DE -> skip; лид из AT -> pass; concurrent тест; тест default cap | Estimate: 10h

[TASK-0055] Country Groups CRUD | Type: Backend | API endpoints: CRUD для country_groups (tenant-scoped). Предустановленные (is_system=true) не удаляемые. Таблица: country_groups (id, tenant_id, name, countries JSONB, is_system, created_at). Seed migration с 8 стандартными группами. | DoD: CRUD работает; system groups нельзя удалить; валидация ISO 3166-1 кодов стран; тесты | Estimate: 4h

[TASK-0056] Frontend: GEO-фильтры и капы в rule editor | Type: Frontend | В редакторе правила: (1) секция GEO -- multiselect стран с поиском + select country groups; toggle include/exclude. (2) Per-broker caps -- таблица: страна | кап | заполнено; кнопка "Add country cap". (3) Heatmap заполненности. | DoD: UX согласован с дизайном; данные сохраняются через API; heatmap обновляется real-time (websocket) | Estimate: 12h

[TASK-0057] API endpoint статуса капов | Type: Backend | GET /api/v1/rules/:id/caps -> `{"brokers": [{"id": "...", "name": "...", "daily_cap": 100, "consumed": 45, "country_caps": {"DE": {"cap": 50, "consumed": 30}, ...}}]}`. Данные из Redis. Cache: 5 секунд. | DoD: ответ корректный; обновляется при routing; тест | Estimate: 4h

---

### [STORY-016] Timezone-aware капы с автосбросом

**"As a** Network Admin, **I want** чтобы daily капы сбрасывались в полночь по таймзоне целевой страны или по настроенной таймзоне правила, **so that** австралийский кап сбрасывался в 00:00 AEST, а немецкий -- в 00:00 CET."

**Acceptance Criteria:**
- [ ] Каждое правило имеет поле timezone (IANA, например "Europe/Berlin", "Australia/Sydney"); по умолчанию -- timezone тенанта; если не задано -- UTC
- [ ] Daily cap сбрасывается в 00:00 по timezone правила; для country_caps -- в полночь по timezone СТРАНЫ (определяется из embedded таблицы country->timezone); если у страны несколько таймзон (Россия, США) -- используется столичная
- [ ] Total cap НЕ сбрасывается (только manual reset через API или UI)
- [ ] Сброс атомарный: Redis key имеет TTL = до следующей полночи по timezone; при истечении -- Redis автоматически удаляет ключ; новый INCR создаёт новый ключ
- [ ] Алерт в Telegram при достижении 90% и 100% капа (конфигурируется per-rule); формат: "Rule X, Broker Y: DE cap 45/50 (90%) -- скоро заполнится"

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-015

#### Tasks:

[TASK-0058] Timezone-aware cap reset механизм | Type: Backend | Ключ Redis: `cap:{rule_id}:{broker_id}:{country}:{date_in_tz}` -- дата вычисляется по timezone правила/страны. TTL = секунды до следующей полночи в этом timezone + 1 час buffer. При INCR на новый ключ (после reset) -- начинается с 1. | DoD: тест: кап для Europe/Berlin сбрасывается в 00:00 CET; кап для Australia/Sydney -- в 00:00 AEST; тест с DST transition | Estimate: 10h

[TASK-0059] Embedded таблица country -> timezone | Type: Backend | Embedded map: ISO 3166-1 alpha-2 -> IANA timezone (столичная). 250 стран. Источник: Unicode CLDR. Go generate для обновления. | DoD: все 250 стран; тест на 20 ключевых стран; RU -> Europe/Moscow, US -> America/New_York, AU -> Australia/Sydney, etc. | Estimate: 3h

[TASK-0060] Telegram алерт при достижении порога капа | Type: Backend | Подписка на события cap increment. При достижении 90% и 100% -- отправка уведомления в Telegram (через notification service). Throttle: не чаще 1 раза в 5 минут per rule+broker+country. Формат: emoji + rule name + broker name + country + current/max. | DoD: алерт отправляется при 90% и 100%; throttle работает; тест с mock notification service | Estimate: 6h

[TASK-0061] Тесты timezone-aware caps | Type: QA | Сценарии: reset в UTC, reset в UTC+3, reset в UTC-8, reset при DST (spring forward / fall back), concurrent cap increment at midnight boundary, total cap не сбрасывается, country cap с timezone страны отличным от timezone правила. | DoD: 12+ тестов; тесты детерминированные (inject time.Now) | Estimate: 6h

---

### [STORY-017] Приоритетные группы (Waterfall)

**"As a** Network Admin, **I want** организовать брокеров в приоритетные группы (waterfall), **so that** лиды сначала уходили в группу 1 (premium брокеры), при cap full -- в группу 2, и так далее."

**Acceptance Criteria:**
- [ ] Правило содержит priority_groups: массив групп, каждая с priority (1 = highest), алгоритмом (WRR или Slots/Chance) и списком брокеров; минимум 1, максимум 10 групп
- [ ] Обработка: лид проходит через группы в порядке приоритета; в каждой группе применяется выбранный алгоритм; если ни один брокер в группе не принял лид (cap/offline/geo mismatch) -- лид переходит в следующую группу
- [ ] Если ни одна группа не приняла лид -- статус overflow (для UAD queue, EPIC будущий) или rejected (конфигурируется)
- [ ] Каждая группа может иметь свои GEO-фильтры и cap settings, НЕЗАВИСИМЫЕ от общих settings правила
- [ ] lead_event записывает полный trace: "Группа 1: Broker A (cap full), Broker B (geo mismatch) -> Группа 2: Broker C (selected)"

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-013, STORY-014, STORY-015

#### Tasks:

[TASK-0062] Waterfall routing orchestrator | Type: Backend | Создать WaterfallRouter: iterate priority_groups sorted by priority; для каждой группы -- apply group-level geo filter -> select algorithm (WRR/SlotsChance) -> attempt routing; если все brokers в группе fail -> next group; если все groups exhausted -> overflow/reject. | DoD: тест: 3 группы, лид проходит через все; тест: первая группа accepts; тест: все groups exhausted -> overflow; trace корректный | Estimate: 10h

[TASK-0063] Структура данных priority groups | Type: Backend | JSON schema для distribution_rules.broker_targets: `[{"priority": 1, "algorithm": "wrr", "geo_filter": {...}, "brokers": [{"id": "...", "weight": 60, "mode": "wrr"}, ...], "fallback_action": "next_group"}, ...]`. Migration для обновления schema. | DoD: schema задокументирована; migration; backward compatible с flat broker list | Estimate: 4h

[TASK-0064] Frontend: visual priority groups editor | Type: Frontend | Drag-and-drop интерфейс: (1) вертикальный список групп (каждая -- карточка), (2) внутри группы -- горизонтальный список брокеров, (3) drag брокера между группами, (4) кнопка "Add group", (5) per-group settings (algorithm, geo, caps). Сортировка групп drag-and-drop. | DoD: drag-and-drop работает плавно (60fps); данные сохраняются корректно; undo/redo (Ctrl+Z/Ctrl+Y); preview распределения | Estimate: 16h

[TASK-0065] Тесты waterfall routing | Type: QA | Edge cases: единственная группа; 10 групп; пустая группа (skip); группа с единственным offline broker; микс WRR и Slots/Chance в разных группах; concurrent routing в одно правило. | DoD: 15+ тестов; stress test 1000 лидов через 5 групп | Estimate: 8h

---

### [STORY-018] Таймслоты и расписание маршрутизации

**"As a** Network Admin, **I want** настраивать расписание работы правил маршрутизации (дни недели + часы), **so that** лиды отправлялись брокерам только в их рабочее время, а вне расписания -- уходили в другие правила или в очередь."

**Acceptance Criteria:**
- [ ] Per-rule расписание: массив таймслотов `[{"days": ["mon","tue","wed","thu","fri"], "from": "09:00", "to": "18:00", "timezone": "Europe/Berlin"}]`; поддержка множественных слотов (например, утренняя и вечерняя смена)
- [ ] Per-broker расписание внутри правила: override rule-level schedule для конкретного брокера (например, брокер A работает 24/7, брокер B -- только будни)
- [ ] Вне расписания: правило/брокер считается "offline" для routing; лид уходит в следующую priority group или overflow
- [ ] Поддержка перехода через полночь: `{"from": "22:00", "to": "06:00"}` корректно обрабатывается как ночная смена
- [ ] UI: визуальная сетка расписания (7 дней x 24 часа) с drag-select для выбора активных часов; цветовая индикация текущего статуса (online/offline)

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-013

#### Tasks:

[TASK-0066] Schedule evaluation engine | Type: Backend | ScheduleChecker.IsActive(schedule []TimeSlot, now time.Time) -> bool. Поддержка: множественные слоты, дни недели, переход через полночь, timezone conversion. Cache: результат кэшируется на 1 минуту (schedule не меняется чаще). | DoD: тест: будни 9-18 CET; тест: ночная смена 22-06; тест: выходные; тест: DST transition; benchmark <0.01ms | Estimate: 6h

[TASK-0067] Интеграция schedule в routing pipeline | Type: Backend | Перед оценкой брокера: check rule schedule -> check broker schedule override. Если rule offline -> skip entire rule. Если broker offline -> skip broker (fallback в группе). lead_event: "Broker X skipped: outside schedule (next active: Mon 09:00 CET)". | DoD: тест: rule offline -> лид не routes; тест: broker offline, другой online -> fallback; тест: перед открытием schedule | Estimate: 4h

[TASK-0068] Frontend: visual schedule grid | Type: Frontend | Компонент WeeklyScheduleGrid: сетка 7x24; drag-select для выбора диапазона часов; цвета: зелёный (active), серый (inactive), жёлтый (current hour); timezone selector вверху; per-broker override tab. Mobile: вертикальный layout. | DoD: drag-select работает плавно; данные сериализуются в JSON slot формат; preview текущего статуса (online/offline) | Estimate: 10h

[TASK-0069] Тесты расписания | Type: QA | Edge cases: пустое расписание (always active); полное расписание (always active); переход через полночь субботы в воскресенье; DST "spring forward" (час 02:00-03:00 не существует); concurrent check. | DoD: 12+ тестов; deterministic time injection | Estimate: 4h

---

### [STORY-019] Sub-параметры (aff_sub 1-10) фильтрация

**"As a** Media Buyer, **I want** настраивать маршрутизацию на основе sub-параметров (aff_sub1..aff_sub10), **so that** лиды с определённым sub-source или campaign уходили к конкретному брокеру."

**Acceptance Criteria:**
- [ ] Правило маршрутизации может фильтровать по aff_sub1..aff_sub10: conditions содержит массив `{"field": "aff_sub1", "operator": "eq|ne|in|not_in|contains|regex", "value": "..."}` 
- [ ] Операторы: eq (точное совпадение), ne (не равно), in (список значений), not_in, contains (подстрока), starts_with, regex (RE2-совместимый, максимум 256 символов паттерна)
- [ ] Множественные условия объединяются через AND; для OR -- создавать отдельные правила
- [ ] aff_sub параметры передаются в лиде: `{"aff_sub1": "google_cpc", "aff_sub2": "landing_v2", ...}`; хранятся в leads.extra.aff_sub
- [ ] Performance: evaluation 10 условий <1ms; regex компилируется один раз и кэшируется

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-013

#### Tasks:

[TASK-0070] Condition evaluator для sub-параметров | Type: Backend | ConditionEvaluator: принимает lead и rule.conditions; для каждого condition -- extract field value -> apply operator -> return bool. Поддержка всех 6 операторов. Regex: pre-compile при загрузке правила, cache в sync.Map. | DoD: тест всех операторов; тест 10 условий AND; тест regex (simple, complex, invalid -> rule load error); benchmark 10 conditions <1ms | Estimate: 6h

[TASK-0071] Frontend: condition builder UI | Type: Frontend | Визуальный конструктор условий: (1) dropdown "field" (aff_sub1..aff_sub10, country, ip, funnel_name), (2) dropdown "operator", (3) input "value" (text для eq/contains, textarea для in/not_in, regex input с preview match). Кнопка "+" для добавления условия. | DoD: интуитивный UI; валидация regex в реальном времени; preview: "Match: aff_sub1 equals 'google_cpc' AND aff_sub2 in ['landing_v1', 'landing_v2']" | Estimate: 8h

[TASK-0072] Тесты condition evaluation | Type: QA | Кейсы: eq с точным совпадением; eq с case sensitivity; in с 100 значениями; regex с Unicode; regex с backtracking (timeout); пустой aff_sub (null); condition на несуществующий aff_sub (no match). | DoD: 15+ тестов; regex timeout тест (>10ms -> reject pattern) | Estimate: 4h

---

### [STORY-020] Per-source caps (капы по аффилейту/источнику)

**"As a** Network Admin, **I want** устанавливать капы на количество лидов от конкретного аффилейта или источника к конкретному брокеру, **so that** я мог ограничить некачественный трафик от одного аффилейта не блокируя остальных."

**Acceptance Criteria:**
- [ ] Per-source cap: ограничение per affiliate_id per broker per rule: `{"source_caps": [{"affiliate_id": "uuid", "daily_cap": 30, "total_cap": 100}]}`
- [ ] При достижении source cap -- лид от этого аффилейта пропускает данного брокера (fallback по обычной логике); лиды от других аффилейтов продолжают routing к этому брокеру
- [ ] Wildcard: `"affiliate_id": "*"` -- кап для ЛЮБОГО одного аффилейта (например, "не более 50 лидов в день от одного аффилейта"); полезно для anti-fraud
- [ ] Source caps работают ДОПОЛНИТЕЛЬНО к country caps и daily caps -- самый строгий cap побеждает
- [ ] API: GET /api/v1/rules/:id/source-caps -> текущее заполнение per affiliate; UI: таблица с аффилейтами и их consumption

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-015

#### Tasks:

[TASK-0073] Source cap engine | Type: Backend | SourceCapChecker: Redis key `srcap:{rule_id}:{broker_id}:{affiliate_id}:{date}` -> INCR. Check: if consumed >= cap -> skip. Wildcard logic: key с "*" проверяется для любого affiliate_id. TTL = до следующей полночи (timezone правила). | DoD: тест per-affiliate cap; тест wildcard; тест: source cap + country cap (strictest wins); concurrent тест | Estimate: 6h

[TASK-0074] API и Frontend для source caps | Type: Frontend | В rule editor: секция "Source Caps" -- таблица: affiliate (dropdown + "*") | daily cap | total cap | consumed. Кнопка "Add source cap". GET /api/v1/rules/:id/source-caps endpoint. | DoD: таблица отображает текущее потребление; данные сохраняются; wildcard cap выделен визуально | Estimate: 6h

[TASK-0075] Тесты source caps | Type: QA | Edge cases: per-affiliate cap reached, other affiliate passes; wildcard cap 50, affiliate sends 51st -> skip; source cap + country cap conflict (both 30, affiliate from DE has DE cap 20 -> DE cap wins); total cap без daily. | DoD: 10+ тестов | Estimate: 4h

---

### [STORY-021] Визуальный drag-and-drop редактор правил

**"As a** Network Admin, **I want** визуальный drag-and-drop редактор для настройки правил маршрутизации, **so that** я мог создавать сложные flow без написания JSON и видеть логику маршрутизации как диаграмму."

**Acceptance Criteria:**
- [ ] Canvas-based editor: правила отображаются как карточки; связи между правилами (waterfall/overflow) как стрелки; drag для перемещения; zoom/pan; minimap
- [ ] Карточка правила содержит: имя, статус (active/paused), алгоритм, количество брокеров, текущий throughput (leads/hour), cap fillrate (progress bar)
- [ ] Drag-and-drop: (1) перетаскивание брокера между правилами, (2) перетаскивание для изменения порядка правил, (3) connection line от overflow одного правила к intake другого
- [ ] Real-time preview: при hover на правило -- tooltip с деталями (GEO, caps, schedule, conditions); при hover на connection -- количество лидов прошедших за сегодня
- [ ] Изменения применяются только после нажатия "Save"; до сохранения -- visual diff (зелёный = новое, красный = удалённое, жёлтый = изменённое); confirmation dialog перед Save

**Story Points:** 13
**Priority:** Should
**Dependencies:** STORY-013, STORY-014, STORY-015, STORY-017, STORY-018

#### Tasks:

[TASK-0076] Frontend: canvas-based rule editor | Type: Frontend | Использовать React Flow (или аналог) для canvas: nodes = rules, edges = connections (overflow/waterfall). Zoom (scroll), pan (drag background), minimap (corner widget). Responsive: desktop only (min 1280px). | DoD: canvas рендерит 50+ правил без лагов; zoom/pan плавные; minimap корректный | Estimate: 16h

[TASK-0077] Frontend: rule card component | Type: Frontend | Карточка правила: header (name + status badge), body (algorithm icon, broker count, GEO flags), footer (throughput sparkline, cap progress bar). Tooltip on hover с деталями. Compact/expanded mode. | DoD: все данные отображаются; tooltip с задержкой 300ms; responsive внутри canvas | Estimate: 8h

[TASK-0078] Frontend: drag-and-drop interactions | Type: Frontend | DnD: (1) broker chip между правилами -> перемещение broker из одного rule в другой, (2) rule card -> изменение порядка/priority, (3) connection handle -> draw edge от overflow к другому rule. Undo/redo stack (20 шагов). | DoD: все 3 типа DnD работают; undo/redo; visual feedback при drag; collision detection (нельзя drop на себя) | Estimate: 12h

[TASK-0079] Backend: API для bulk rule updates | Type: Backend | PUT /api/v1/rules/bulk -- принимает массив изменений: `[{"id": "...", "action": "update", "changes": {...}}, {"action": "create", ...}]`. Atomic: все изменения применяются в одной транзакции или ни одно. Validation: проверка циклов в connections. | DoD: atomic apply; cycle detection; тест: bulk update 10 rules; тест: rollback при ошибке | Estimate: 8h

[TASK-0080] Design: UX flow для drag-and-drop editor | Type: Design | Wireframes и прототип: flow создания нового правила; flow редактирования; flow подключения overflow; состояния: empty state, loading, error, confirmation. Figma prototype для user testing. | DoD: Figma prototype; user testing с 3 пользователями; итерация по фидбеку | Estimate: 16h

---

### [STORY-022] Выбор алгоритма per-flow

**"As a** Network Admin, **I want** выбирать алгоритм маршрутизации (Weighted Round-Robin или Slots vs Chance) для каждого правила отдельно, **so that** я мог использовать WRR для стабильных flow и Slots/Chance для flow с жёсткими лимитами."

**Acceptance Criteria:**
- [ ] Поле algorithm в distribution_rules: "wrr" (Weighted Round-Robin) или "slots_chance" (Slots vs Chance); default: "wrr"
- [ ] Смена алгоритма на ходу: изменение algorithm вступает в силу немедленно (следующий лид); текущие counters (WRR position, slots consumed) сбрасываются при смене
- [ ] UI: toggle между WRR и Slots/Chance; при переключении -- UI адаптируется: WRR показывает weights (sliders 1-1000); Slots/Chance показывает mode selector (slots/chance) + value (number/percentage)
- [ ] Валидация: WRR -- минимум 1 broker с weight >0; Slots/Chance -- минимум 1 broker; chance sum предупреждение если >100% или <50%

**Story Points:** 3
**Priority:** Must
**Dependencies:** STORY-013, STORY-014

#### Tasks:

[TASK-0081] Backend: algorithm switch logic | Type: Backend | При изменении distribution_rules.algorithm: (1) сбросить Redis counters (WRR state / slots consumed), (2) сохранить в БД, (3) invalidate routing cache. Миграция: добавить default "wrr" для существующих правил. | DoD: тест: switch WRR->SlotsChance -> counters reset; тест: switch обратно; audit_log при смене | Estimate: 4h

[TASK-0082] Frontend: adaptive rule configuration UI | Type: Frontend | При toggle WRR: показать weight sliders per broker (1-1000). При toggle Slots/Chance: показать per-broker: radio (Slots/Chance) + input (number для slots, percentage для chance). Live preview: "Broker A: 60% (WRR)" или "Broker A: 50 slots, Broker B: 40% chance". | DoD: toggle переключает UI мгновенно; данные валидируются; preview корректный | Estimate: 6h

---

### [STORY-023] Логирование и аудит решений маршрутизации

**"As a** Team Lead, **I want** видеть полный trail каждого routing decision, **so that** при разборе инцидентов я мог точно сказать почему лид попал к брокеру X, а не к Y."

**Acceptance Criteria:**
- [ ] Каждый routing decision записывается в lead_events с event_type="routing_decision" и полным контекстом: evaluated_rules (список), per_rule_result (matched/skipped + reason), selected_broker, algorithm_used, weights/slots at decision time, caps at decision time
- [ ] Формат routing trace: `{"rules_evaluated": 3, "trace": [{"rule_id": "...", "name": "...", "result": "skipped", "reason": "geo_mismatch", "details": "Lead country UA not in [DE,AT,CH]"}, {"rule_id": "...", "result": "matched", "group": 1, "broker": "...", "algorithm": "wrr", "weight": 60}]}`
- [ ] API: GET /api/v1/leads/:id/routing-trace -> полный routing trace; доступен для ролей Network Admin и Team Lead
- [ ] Retention: routing trace хранится 90 дней; после -- архивация в cold storage (S3/GCS); конфигурируемый per-tenant
- [ ] UI: на странице лида -- секция "Routing History" с визуализацией trace (timeline: правило 1 -> пропущено (GEO) -> правило 2 -> группа 1 -> cap full -> группа 2 -> доставлено)

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-017

#### Tasks:

[TASK-0083] Routing trace collector | Type: Backend | TraceCollector: создаётся при начале routing; каждый шаг добавляет entry; в конце -- persist в lead_events как JSON. Поля: rule_id, result, reason, details, duration_ms, broker_id, algorithm, caps_snapshot. | DoD: trace корректный для WRR, Slots/Chance, Waterfall; тест: 5 rules evaluated -> 5 entries in trace | Estimate: 6h

[TASK-0084] API endpoint routing trace | Type: Backend | GET /api/v1/leads/:id/routing-trace. Авторизация: Network Admin, Team Lead. Response: `{"lead_id": "...", "routed_at": "...", "duration_ms": 45, "trace": [...], "result": {"broker_id": "...", "status": "delivered"}}`. | DoD: endpoint работает; авторизация; тест с разными ролями; тест с несуществующим lead_id (404) | Estimate: 4h

[TASK-0085] Frontend: routing trace visualization | Type: Frontend | На странице лида: секция "Routing" -- вертикальный timeline: каждый шаг = node (зелёный=matched, красный=skipped, жёлтый=fallback). Click на node -> expandable details (reason, caps snapshot, weights). Итоговый node: broker name + delivery status. | DoD: timeline рендерит до 20 шагов; expandable details; цветовая индикация; loading state | Estimate: 8h

---

---

## EPIC-03: Broker Integration Layer

**ID:** EPIC-03
**Name:** Broker Integration Layer -- Интеграция с брокерскими платформами
**Goal:** Реализовать слой интеграции с брокерами: библиотека шаблонов (цель 200+ на MVP), кастомный field mapping, тест-лид, opening hours, postback handling с 20+ переменными, клонирование конфигурации брокера.
**Success Metric:** 200+ broker templates доступны из коробки; среднее время подключения нового брокера <15 минут; 99.5% delivery rate (non-cap rejections); postback processing latency <1 секунда.
**Priority:** P0 (MVP)
**Dependencies:** EPIC-01, EPIC-02
**Size Estimate:** 380 часов (9.5 спринтов-участников)

---

### [STORY-024] Библиотека шаблонов брокеров

**"As a** Network Admin, **I want** искать и подключать брокеров из готовой библиотеки шаблонов с фильтрами по стране, вертикали и типу, **so that** подключение нового брокера занимало минуты, а не часы ручной настройки API."

**Acceptance Criteria:**
- [ ] Библиотека содержит минимум 200 шаблонов брокеров (seed migration); каждый шаблон: name, method (POST/GET), url_template, headers, body_template, auth_type (api_key/bearer/basic/oauth2/custom), response_mapping, postback_config
- [ ] Поиск и фильтрация: по имени (full-text), по странам (какие GEO брокер принимает), по вертикали (crypto/forex/gambling/nutra), по типу (CPA/CPL/RevShare/Hybrid); search <200ms
- [ ] Версионирование шаблонов: при обновлении шаблона -- создаётся новая версия; существующие подключения продолжают работать на старой версии; уведомление админу о доступности новой версии
- [ ] Community шаблоны: пользователь может предложить свой шаблон (POST /api/v1/broker-templates с is_public=false); после модерации -- becomes public
- [ ] UI: каталог шаблонов с карточками; фильтры-чипы; кнопка "Connect" -> переход к экрану настройки с предзаполненными полями

**Story Points:** 8
**Priority:** Must
**Dependencies:** --

#### Tasks:

[TASK-0086] Seed migration 200+ broker templates | Type: Backend | Собрать данные 200+ брокеров: endpoints, auth methods, field formats. Создать migration 003_seed_broker_templates.up.sql. Источники: конкурентный анализ (HyperOne 400+, Elnopy 200+), открытые API документации, Telegram-каналы. | DoD: 200+ шаблонов в migration; каждый с корректным url_template и body_template; проверка на 10 реальных брокерах | Estimate: 40h

[TASK-0087] Поиск и фильтрация шаблонов | Type: Backend | GET /api/v1/broker-templates?search=binomo&country=DE&vertical=crypto&type=CPA&page=1&limit=20. Full-text search по name (pg_trgm). Фильтры по JSONB полям. Pagination. Cache: 5 минут. | DoD: search <200ms при 500 шаблонах; фильтры корректные; тест full-text с опечатками (pg_trgm similarity) | Estimate: 6h

[TASK-0088] Версионирование шаблонов | Type: Backend | При UPDATE broker_templates -- INSERT новой версии (version++); старая остаётся. Brokers ссылаются на конкретную версию. Endpoint: GET /api/v1/broker-templates/:id/versions. Notification: если broker использует старую версию -- flag в UI. | DoD: update создаёт версию; broker сохраняет ссылку; notification при новой версии; тест | Estimate: 6h

[TASK-0089] Frontend: каталог шаблонов | Type: Frontend | Страница /broker-templates: grid карточек (logo placeholder, name, countries flags, vertical badge, type badge). Sidebar фильтры: search, country multiselect, vertical checkboxes, type radio. Infinite scroll. Кнопка "Connect" на каждой карточке. | DoD: карточки рендерятся; фильтры работают; infinite scroll; responsive (mobile: single column); loading skeleton | Estimate: 12h

---

### [STORY-025] Кастомный field mapping

**"As a** Network Admin, **I want** настраивать маппинг полей между GambChamp и API брокера, **so that** я мог отправлять данные в формате, который ожидает конкретный брокер, даже если его API нестандартное."

**Acceptance Criteria:**
- [ ] Field mapping editor: visual UI для маппинга source fields (first_name, last_name, email, phone, phone_e164, country, ip, user_agent, funnel_name, aff_sub1-10, extra.*) -> target fields (произвольные имена, вложенные JSON paths)
- [ ] Трансформации: concat (first_name + " " + last_name -> full_name), format (phone -> без +), uppercase/lowercase, default value (если source пуст), conditional (if country == "DE" then value = "1"), template string ("Hello, {{first_name}}")
- [ ] Валидация маппинга: при сохранении -- проверка что все required поля шаблона замаплены; warning если optional не замаплены
- [ ] Preview: кнопка "Preview" показывает как будет выглядеть outgoing payload для тестового лида; рядом -- raw JSON
- [ ] Маппинг хранится в brokers.field_mapping (JSONB); при изменении -- audit_log

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-024

#### Tasks:

[TASK-0090] Field mapping engine | Type: Backend | FieldMapper: применяет mapping к lead data -> формирует outgoing payload. Поддержка: dot notation (person.name), array access, transformations (concat, format, upper, lower, default, conditional, template). Template engine: Go template syntax с sandbox (без file access, loop limit 100). | DoD: все трансформации реализованы; тест: сложный маппинг с 15 полями + 5 трансформаций; benchmark <1ms; sandbox тест (no file access) | Estimate: 12h

[TASK-0091] Frontend: visual field mapping editor | Type: Frontend | Два столбца: слева -- source fields (drag), справа -- target fields (шаблон брокера). Drag line от source к target для маппинга. Трансформации: click на mapping line -> popup с transform options. Unmapped required fields выделены красным. | DoD: drag-and-drop маппинг; трансформации; visual validation; preview button | Estimate: 14h

[TASK-0092] Preview outgoing payload | Type: Backend | POST /api/v1/brokers/:id/preview-payload -- принимает тестовый лид, применяет field mapping, возвращает `{"outgoing_body": {...}, "outgoing_headers": {...}, "outgoing_url": "..."}` без реальной отправки. | DoD: preview корректный; тест с реальным маппингом; ошибки маппинга отображаются | Estimate: 4h

[TASK-0093] Тесты field mapping | Type: QA | Edge cases: null source field с default; nested target (a.b.c); concat с null; template с missing variable; conditional с unknown country; маппинг 50 полей (performance); unicode в values. | DoD: 20+ тестов; benchmark | Estimate: 6h

---

### [STORY-026] Тест-лид без отправки в production

**"As a** Network Admin, **I want** отправить тестовый лид брокеру чтобы проверить интеграцию, **so that** я мог убедиться что field mapping, auth и endpoint работают корректно до начала live трафика."

**Acceptance Criteria:**
- [ ] POST /api/v1/brokers/:id/test -- отправляет тестовый лид (фиктивные данные или указанные в body) к реальному API брокера; лид НЕ записывается в таблицу leads; НЕ учитывается в капах
- [ ] Ответ содержит: request (url, headers sanitized, body), response (status_code, headers, body, duration_ms), mapping_result (какие поля замаплены, трансформации), verdict ("success" / "auth_error" / "validation_error" / "timeout" / "connection_error")
- [ ] Тестовые данные генерируются автоматически: имя/фамилия из faker, email: test+timestamp@gambchamp.test, phone: +1555... (non-routable); ИЛИ пользователь указывает свои данные
- [ ] Rate limit на тесты: максимум 10 тестов в час per broker (чтобы не спамить API брокера)
- [ ] UI: кнопка "Send Test Lead" в карточке брокера; результат отображается inline: зелёная плашка "Success" или красная "Error" с деталями; лог последних 5 тестов

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-025

#### Tasks:

[TASK-0094] Backend: test lead sender | Type: Backend | TestLeadService.Send(brokerID, testData): (1) generate fake lead data (или merge с testData), (2) apply field mapping, (3) HTTP request to broker API, (4) parse response по response_mapping, (5) return detailed result. Timeout: 30 секунд. Не создавать lead в БД. | DoD: тест с mock broker API (200 OK, 401 Unauthorized, timeout); fake data генерация; audit_log entry | Estimate: 8h

[TASK-0095] Frontend: test lead UI | Type: Frontend | В карточке брокера: кнопка "Test Integration" -> modal: (1) auto-generated test data (editable fields), (2) "Send" button, (3) result: collapsible request/response/mapping sections, (4) history: список последних 5 тестов с timestamps. | DoD: modal работает; result отображается; history загружается из API; loading/error states | Estimate: 8h

[TASK-0096] Rate limiting для тест-лидов | Type: Backend | Rate limit: 10 per hour per broker_id per tenant_id. Redis key: `test_rate:{tenant}:{broker}:{hour}`. При превышении -- 429 с Retry-After. | DoD: rate limit работает; тест: 11-й запрос -> 429; reset через час | Estimate: 2h

---

### [STORY-027] Opening hours брокера

**"As a** Network Admin, **I want** настраивать рабочие часы для каждого брокера, **so that** лиды не отправлялись вне рабочего времени брокера и не терялись из-за отсутствия оператора на стороне брокера."

**Acceptance Criteria:**
- [ ] Per-broker расписание: аналогичное таймслотам правила (STORY-018) -- массив `[{"days": [...], "from": "HH:MM", "to": "HH:MM", "timezone": "..."}]`; хранится в brokers.settings.opening_hours
- [ ] Вне opening hours: брокер считается "unavailable" для routing; лид не отправляется; routing engine пропускает этого брокера (fallback в группе/правиле)
- [ ] Лиды, приходящие вне opening hours, НЕ теряются: они уходят к другим доступным брокерам или в overflow/UAD queue
- [ ] UI: переиспользование компонента WeeklyScheduleGrid из STORY-018; текущий статус (open/closed) на карточке брокера
- [ ] API: GET /api/v1/brokers/:id/status -> `{"is_open": true, "current_schedule": {...}, "next_open": "2026-04-13T09:00:00+02:00", "next_close": "2026-04-12T18:00:00+02:00"}`

**Story Points:** 3
**Priority:** Must
**Dependencies:** STORY-018 (компонент schedule)

#### Tasks:

[TASK-0097] Интеграция opening hours в routing | Type: Backend | Перед отправкой лида брокеру: проверка opening hours (reuse ScheduleChecker из STORY-018). Если closed -> skip broker с reason "broker_closed". lead_event: "Broker X closed, next open: Mon 09:00 CET". | DoD: тест: broker closed -> skip; тест: broker open -> send; тест: вне часов -> fallback to next broker | Estimate: 4h

[TASK-0098] Broker status API | Type: Backend | GET /api/v1/brokers/:id/status: вычисление is_open, next_open, next_close по текущему времени и расписанию. Cache: 1 минута. | DoD: корректный статус; корректный next_open/next_close; тест: closed -> next_open correct; DST handling | Estimate: 3h

[TASK-0099] Frontend: opening hours в карточке брокера | Type: Frontend | Карточка брокера: badge "Open"/"Closed" (зелёный/красный). Expandable секция "Opening Hours" с WeeklyScheduleGrid (reuse). Tooltip on badge: "Next open: Mon 09:00 CET" или "Closes at: 18:00 CET". | DoD: badge корректный; schedule grid переиспользован; данные сохраняются | Estimate: 4h

---

### [STORY-028] HTTP-отправка лида к брокеру

**"As a** Developer, **I want** чтобы система отправляла лид к брокеру по HTTP с retry, timeout и circuit breaker, **so that** delivery rate был максимальным и система не падала из-за проблем одного брокера."

**Acceptance Criteria:**
- [ ] HTTP client: POST/GET (по шаблону) к endpoint брокера; timeout 30 секунд; retry: 3 попытки с exponential backoff (1s, 5s, 15s) для 5xx и timeout; НЕ retry для 4xx (клиентская ошибка)
- [ ] Circuit breaker per broker: при 5 consecutive failures за 60 секунд -- broker переходит в state "unhealthy" на 5 минут; в unhealthy state -- лиды не отправляются (skip в routing); после 5 минут -- single test request; при успехе -- back to healthy
- [ ] Response parsing: по response_mapping шаблона -- извлечение broker_lead_id, status, message из ответа; поддержка JSON path, regex, static mapping
- [ ] Каждая попытка отправки записывается в lead_events: request body (sanitized), response body, status_code, duration_ms, error, attempt_number
- [ ] Метрики: broker_delivery_total (counter, labels: broker, status), broker_delivery_duration_seconds (histogram), broker_circuit_state (gauge: 0=closed, 1=half-open, 2=open)

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-025

#### Tasks:

[TASK-0100] HTTP delivery client | Type: Backend | BrokerHTTPClient: построение request по template (url_template + body_template + field_mapping); отправка с timeout 30s; парсинг ответа по response_mapping. Поддержка auth: api_key (header/query), bearer token, basic auth. TLS: skip verify = false (configurable). | DoD: тест с mock broker: 200, 400, 500, timeout; auth types; TLS; request/response logging | Estimate: 10h

[TASK-0101] Retry logic с exponential backoff | Type: Backend | RetryExecutor: wrap HTTP call с retry. Config: max_retries=3, backoff=[1s,5s,15s]. Retry on: 5xx, timeout, connection error. No retry on: 4xx, context cancelled. Jitter: +/-25% to backoff. | DoD: тест: 500 -> retry 3 times -> fail; тест: 500 then 200 -> success on 2nd; тест: 400 -> no retry | Estimate: 6h

[TASK-0102] Circuit breaker per broker | Type: Backend | CircuitBreaker: states -- closed (normal), open (blocking), half-open (testing). Thresholds: 5 failures in 60s -> open for 5 min -> half-open -> 1 success -> closed / 1 failure -> open again. State в Redis (shared across instances). | DoD: тест state transitions; тест: concurrent requests during state change; health check endpoint includes circuit states | Estimate: 8h

[TASK-0103] Response parsing engine | Type: Backend | ResponseParser: применяет response_mapping к body ответа. Поддержка: JSON path ($.data.lead_id), regex (capture groups), static (always "delivered"), conditional (if status_code==200 then "delivered" else "rejected"). | DoD: тест: JSON path extraction; regex extraction; nested JSON; empty body; non-JSON body (XML, plain text) | Estimate: 6h

[TASK-0104] Lead event recording для delivery | Type: Backend | При каждой попытке отправки: INSERT в lead_events с event_type="delivery_attempt", broker_id, attempt_number, request_body (sanitized: mask phone last 4, mask email domain), response_body, status_code, duration_ms, error. | DoD: событие записывается для каждой попытки (включая retry); sanitization корректна; тест | Estimate: 4h

---

### [STORY-029] Postback handling с 20+ переменными

**"As a** Network Admin, **I want** получать postback от брокеров с подстановкой 20+ переменных, **so that** статус лида обновлялся автоматически и аффилейт получал callback с полной информацией."

**Acceptance Criteria:**
- [ ] Postback endpoint: GET/POST /api/v1/postback/:broker_token с параметрами в query string или body; token уникальный per broker per tenant (не API key)
- [ ] Переменные для подстановки (20+): {lead_id}, {status}, {broker_lead_id}, {aff_sub1}..{aff_sub10}, {affiliate_id}, {country}, {payout}, {currency}, {funnel_name}, {click_id}, {ip}, {email_masked}, {phone_masked}, {created_at}, {updated_at}, {broker_name}, {rejection_reason}, {deposit_amount}, {ftd_date}
- [ ] При получении postback: обновление leads.status; создание lead_event (event_type="postback_received"); триггер webhook к аффилейту (STORY-011); триггер Telegram notification (если настроен)
- [ ] Защита: подпись postback (HMAC или IP whitelist per broker); rate limit 1000 postbacks/min per broker; replay protection (idempotency по broker_lead_id + status)
- [ ] Статус-маппинг: конфигурируемый per-broker маппинг статусов брокера -> внутренних статусов GambChamp (например, "Deposited" -> "ftd", "Callback Scheduled" -> "callback")

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-028

#### Tasks:

[TASK-0105] Postback receiver endpoint | Type: Backend | Handler: GET/POST /api/v1/postback/:broker_token. Извлечение параметров из query/body. Lookup broker по token. Validation: token valid, IP whitelist (если настроен), rate limit. | DoD: оба метода (GET/POST) работают; broker lookup <5ms; IP whitelist; rate limit | Estimate: 6h

[TASK-0106] Variable substitution engine | Type: Backend | PostbackVariableResolver: принимает lead + broker + postback data -> подставляет 20+ переменных в URL/body шаблон аффилейтского postback. Формат: {variable_name}. Неизвестные переменные -> пустая строка + warning в логе. | DoD: все 20+ переменных; тест с полным набором; тест с отсутствующими переменными; benchmark <0.5ms | Estimate: 6h

[TASK-0107] Status mapping per broker | Type: Backend | Конфигурация: brokers.settings.status_mapping: `{"Deposited": "ftd", "Callback": "callback", "Not Interested": "rejected"}`. При получении postback: map broker status -> internal status. Если маппинг не найден -> сохранить raw status + warning. | DoD: маппинг корректный; unknown status -> warning + raw save; UI для настройки маппинга | Estimate: 4h

[TASK-0108] Cascade: обновление лида + webhook + notification | Type: Backend | При изменении статуса лида через postback: (1) UPDATE leads.status, (2) INSERT lead_event, (3) trigger affiliate webhook (STORY-011), (4) trigger Telegram notification (если настроен для этого события). Всё в одном transaction/saga. | DoD: все 4 шага выполняются; тест: postback -> lead updated + webhook sent + notification created; failure in step 3 -> retry (не блокирует step 1-2) | Estimate: 8h

[TASK-0109] Frontend: postback configuration UI | Type: Frontend | В карточке брокера: (1) Postback URL (generated, copyable), (2) Status mapping table (broker status -> GambChamp status), (3) IP whitelist textarea, (4) Log последних 50 postbacks с фильтрами. | DoD: URL копируется; маппинг сохраняется; лог обновляется; фильтры по status и date | Estimate: 8h

---

### [STORY-030] Funnel name substitution

**"As a** Affiliate Manager, **I want** подставлять имя фанела в запрос к брокеру, **so that** брокер знал с какого лендинга пришёл лид и мог оптимизировать свою конверсию."

**Acceptance Criteria:**
- [ ] Funnel name передаётся в лиде: leads.extra.funnel_name; подставляется в body/URL запроса к брокеру через field mapping как {funnel_name}
- [ ] Маппинг фанелов per broker: `{"landing_v1": "Premium Crypto Landing", "landing_v2": "Fast Signup"}` -- переименование фанела для конкретного брокера (брокеры часто требуют свои названия)
- [ ] Если маппинг не найден -- используется оригинальный funnel_name; конфигурируемо: "use_original" / "reject" / "use_default"
- [ ] UI: в карточке брокера -- таблица funnel mapping (source funnel -> broker funnel name); autocomplete по существующим funnel names из данных

**Story Points:** 3
**Priority:** Must
**Dependencies:** STORY-025

#### Tasks:

[TASK-0110] Funnel name mapping engine | Type: Backend | FunnelMapper: lookup funnel_name in broker.settings.funnel_mapping -> return mapped name. Fallback: original / default / reject (configurable). Интеграция в field mapping pipeline перед отправкой. | DoD: тест: mapped name; тест: no mapping (use original); тест: no mapping + reject mode; integration with delivery | Estimate: 4h

[TASK-0111] Frontend: funnel mapping UI | Type: Frontend | Секция в карточке брокера: таблица source_funnel | broker_funnel | actions (edit/delete). Autocomplete source_funnel из: SELECT DISTINCT extra->>'funnel_name' FROM leads WHERE tenant_id=?. Кнопка "Add mapping". | DoD: таблица CRUD; autocomplete; данные сохраняются | Estimate: 4h

---

### [STORY-031] Клонирование конфигурации брокера

**"As a** Network Admin, **I want** клонировать существующего брокера со всеми настройками, **so that** при подключении того же брокера с другими credentials (второй аккаунт) я не настраивал всё заново."

**Acceptance Criteria:**
- [ ] POST /api/v1/brokers/:id/clone -> создаёт копию брокера с: template, field_mapping, opening_hours, funnel_mapping, status_mapping, postback_config; БЕЗ: credentials (нужно ввести заново), caps (сбрасываются на 0), health_status (healthy)
- [ ] Имя клона: "{original_name} (Copy)"; автоматически деактивирован (status=draft) до ввода credentials
- [ ] UI: кнопка "Clone" в карточке брокера; после клонирования -- redirect на карточку нового брокера с highlight полей которые нужно заполнить (credentials)
- [ ] audit_log: запись о клонировании с source_broker_id и new_broker_id

**Story Points:** 2
**Priority:** Should
**Dependencies:** STORY-025

#### Tasks:

[TASK-0112] Backend: clone broker endpoint | Type: Backend | POST /api/v1/brokers/:id/clone. Deep copy всех настроек кроме credentials и caps. Новый UUID. Status=draft. Audit log. | DoD: клон содержит все настройки; credentials пусты; caps=0; status=draft; audit log; тест | Estimate: 4h

[TASK-0113] Frontend: clone button и flow | Type: Frontend | Кнопка "Clone" в dropdown actions карточки брокера. Confirmation dialog: "Clone broker X?". После clone -- redirect на новую карточку. Highlight пустых credentials полей. | DoD: flow работает; highlight; confirmation; loading state | Estimate: 3h

---

### [STORY-032] Health monitoring брокеров

**"As a** Team Lead, **I want** видеть health status каждого брокера в реальном времени, **so that** я мог быстро реагировать на проблемы с интеграциями и переключать трафик."

**Acceptance Criteria:**
- [ ] Health status per broker: healthy (зелёный), degraded (жёлтый -- >20% errors за 5 минут), unhealthy (красный -- circuit open), maintenance (серый -- вручную), unknown (нет данных за 1 час)
- [ ] Dashboard: список всех брокеров с status badge, последний successful delivery, error rate (5min / 1hr / 24hr), avg response time; сортировка и фильтрация по статусу
- [ ] Автоматический health check: опциональный ping endpoint per broker; проверка каждые 5 минут; результат обновляет health_status
- [ ] Алерт: при переходе healthy -> degraded или degraded -> unhealthy -- Telegram notification + in-app alert
- [ ] Manual override: кнопка "Mark as Maintenance" для плановых работ; при maintenance -- broker excluded from routing; "Resume" для возврата

**Story Points:** 5
**Priority:** Should
**Dependencies:** STORY-028

#### Tasks:

[TASK-0114] Health status calculator | Type: Backend | Background goroutine: каждые 30 секунд query lead_events за последние 5 минут per broker -> calculate error rate -> update brokers.health_status. Thresholds: <5% errors = healthy, 5-20% = degraded, >20% or circuit open = unhealthy. Publish status change event. | DoD: тест: 0% errors -> healthy; тест: 25% -> unhealthy; тест: переход degraded->unhealthy -> notification; benchmark <100ms per calculation | Estimate: 6h

[TASK-0115] Broker health dashboard | Type: Frontend | Страница /brokers с таблицей: name, status badge, template, last delivery (relative time), error rate (5m/1h/24h bars), avg response time, daily cap progress, actions. Фильтры: status, search. Auto-refresh каждые 30 секунд. | DoD: таблица рендерит 100+ брокеров; status badges; auto-refresh; sorting; responsive | Estimate: 10h

[TASK-0116] Manual maintenance mode | Type: Backend | PUT /api/v1/brokers/:id/maintenance (body: {"reason": "...", "estimated_end": "ISO8601"}). Устанавливает health_status=maintenance. PUT /api/v1/brokers/:id/resume. При maintenance -- excluded from routing. audit_log. | DoD: maintenance mode работает; routing скипает; resume возвращает в healthy; audit | Estimate: 3h

[TASK-0117] Health check ping | Type: Backend | Опциональный: brokers.settings.health_check_url. Goroutine каждые 5 минут: GET health_check_url, expect 200, timeout 10s. Результат обновляет health_status. Если URL не задан -- health определяется только по delivery metrics. | DoD: ping работает; timeout handling; результат в health_status; тест с mock | Estimate: 4h

---

---

## EPIC-04: Affiliate Management

**ID:** EPIC-04
**Name:** Affiliate Management -- Управление аффилейтами
**Goal:** Реализовать полное управление аффилейтами: профили, API-ключи, per-affiliate fraud profiles, postback настройки с 20+ переменными, sub-accounts, уровни/иерархия, ограничения по трафику и click tracking домены.
**Success Metric:** Время создания нового аффилейта <2 минуты; 100% аффилейтов с API-ключом могут отправлять лиды; per-affiliate fraud profiles снижают fraud rate на 30% vs global profile.
**Priority:** P0 (MVP)
**Dependencies:** EPIC-01, EPIC-03 (postback)
**Size Estimate:** 340 часов (8.5 спринтов-участников)

---

### [STORY-033] CRUD профиля аффилейта

**"As a** Network Admin, **I want** создавать, редактировать и деактивировать профили аффилейтов, **so that** каждый аффилейт имел свой аккаунт с настройками, ограничениями и историей."

**Acceptance Criteria:**
- [ ] CRUD API: POST/GET/PUT/DELETE /api/v1/affiliates; поля: name, email, company, status (active/suspended/pending/deactivated), manager_id (ответственный AM), notes, tags, created_at
- [ ] Статусы: pending (создан, не активирован) -> active (работает) -> suspended (временно заблокирован, лиды отклоняются с кодом AFFILIATE_SUSPENDED) -> deactivated (архив, не отображается в списках)
- [ ] Список аффилейтов: GET /api/v1/affiliates?status=active&manager_id=uuid&tag=premium&search=john&page=1&limit=50; поиск по name и email; сортировка по name, created_at, last_activity
- [ ] Карточка аффилейта содержит: профиль, API ключи, postback настройки, fraud profile, cap settings, трафик stats (leads today/week/month), quality score средний, последние 10 лидов
- [ ] При деактивации: все API-ключи инвалидируются немедленно; активные webhook подписки отключаются; audit_log

**Story Points:** 8
**Priority:** Must
**Dependencies:** --

#### Tasks:

[TASK-0118] Backend: Affiliate CRUD API | Type: Backend | Endpoints: POST (create), GET (list with filters/pagination), GET /:id (detail), PUT /:id (update), DELETE /:id (soft delete -> deactivated). Validation: unique email per tenant; name 1-255 chars. Status transitions: pending->active->suspended->deactivated; suspended->active (reactivation). | DoD: все endpoints; фильтры; pagination; status transitions; audit_log; тесты CRUD + фильтры + invalid transitions | Estimate: 10h

[TASK-0119] Backend: деактивация cascade | Type: Backend | При переходе в suspended/deactivated: (1) invalidate all API keys (mark inactive + clear Redis cache), (2) disable webhooks, (3) reject incoming leads с AFFILIATE_SUSPENDED. Reactivation: re-enable API keys (user chooses which), re-enable webhooks. | DoD: cascade корректный; reject при suspended; reactivation selective; тест full lifecycle | Estimate: 6h

[TASK-0120] Frontend: список аффилейтов | Type: Frontend | Страница /affiliates: таблица с columns (avatar placeholder, name, company, status badge, manager, leads today, avg quality, created_at). Фильтры: status tabs, manager dropdown, search, tags. Bulk actions: suspend, change manager. | DoD: таблица рендерит 500+ аффилейтов (virtual scroll); фильтры работают; bulk actions; responsive | Estimate: 10h

[TASK-0121] Frontend: карточка аффилейта | Type: Frontend | Страница /affiliates/:id: tabs (Profile, API Keys, Postbacks, Fraud Profile, Traffic, Leads). Profile tab: edit form с all fields. Stats header: leads today/week/month, avg quality, rejection rate. Status badge с dropdown для transition. | DoD: все табы; edit form saves; stats обновляются; status transition; loading states | Estimate: 12h

---

### [STORY-034] Управление API-ключами аффилейта

**"As an** Affiliate Manager, **I want** создавать, просматривать и отзывать API-ключи для каждого аффилейта, **so that** аффилейт мог интегрироваться с нашим API и я мог контролировать доступ."

**Acceptance Criteria:**
- [ ] Множественные API-ключи per affiliate: до 5 активных ключей одновременно; каждый с name (пометка: "Production", "Testing"), scopes (leads:write, leads:read, analytics:read), allowed_ips, rate_limit_per_min
- [ ] Создание ключа: POST /api/v1/affiliates/:id/api-keys -> возвращает полный ключ ОДИН РАЗ; формат gc_live_{32hex} или gc_test_{32hex}; после создания -- только prefix + last 4 symbols отображаются
- [ ] Отзыв ключа: DELETE /api/v1/affiliates/:id/api-keys/:key_id -> немедленная инвалидация (Redis cache clear); ключ остаётся в БД для аудита (is_active=false, revoked_at)
- [ ] UI: таблица ключей в карточке аффилейта: name, prefix...last4, scopes badges, allowed_ips, last_used_at (relative), rate limit, status; actions: revoke, edit (name, scopes, IPs, rate limit)
- [ ] Security: ключ хешируется SHA-256 при хранении; plain text НИКОГДА не хранится; при создании -- modal с предупреждением "Скопируйте ключ сейчас, он больше не будет показан"

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-033, STORY-008

#### Tasks:

[TASK-0122] Backend: API key management endpoints | Type: Backend | POST /api/v1/affiliates/:id/api-keys (create, return plain key once), GET (list, only prefix+last4), PUT /:key_id (update name/scopes/ips/rate_limit), DELETE /:key_id (revoke). Key generation: crypto/rand 32 bytes -> hex. Hash: SHA-256. Limit: 5 active per affiliate. | DoD: CRUD; key shown once; hash stored; limit enforced; revoke clears cache; audit_log | Estimate: 6h

[TASK-0123] Frontend: API keys management tab | Type: Frontend | Tab "API Keys" в карточке аффилейта: таблица ключей; кнопка "Create API Key" -> modal (name, scopes checkboxes, allowed IPs textarea, rate limit input). После создания: modal с ключом + copy button + warning. Revoke: confirmation dialog. | DoD: create flow с one-time display; copy button; revoke; edit inline; last_used relative time | Estimate: 8h

---

### [STORY-035] Per-affiliate fraud profile

**"As a** Network Admin, **I want** настраивать индивидуальный fraud profile для каждого аффилейта, **so that** для проверенных аффилейтов антифрод был мягче, а для новых -- строже."

**Acceptance Criteria:**
- [ ] Fraud profile per affiliate: переопределяет глобальные настройки; поля: ip_check_enabled, email_check_enabled, phone_check_enabled (VOIP block), velocity_check_enabled (max leads per minute), device_check_enabled, min_quality_score (порог для accept), auto_reject_score (порог для auto-reject), custom_rules (JSONB)
- [ ] Если fraud profile НЕ задан для аффилейта -- используется tenant-level default profile
- [ ] UI: вкладка "Fraud Profile" в карточке аффилейта; toggles для каждой проверки; sliders для quality score thresholds; preview: "С текущими настройками 95% лидов от этого аффилейта прошли бы проверку" (на основе данных за 30 дней)
- [ ] Custom rules: массив правил вида `{"field": "email", "condition": "domain_in", "value": ["gmail.com", "yahoo.com"], "action": "reject", "score_penalty": -30}`
- [ ] audit_log при каждом изменении fraud profile; diff: какие поля изменились

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-033

#### Tasks:

[TASK-0124] Backend: fraud profile CRUD | Type: Backend | API: GET/PUT /api/v1/affiliates/:id/fraud-profile. Если профиль не существует -- создать при первом PUT. Merge с tenant defaults при evaluation: affiliate-level overrides tenant-level. Validation: min_quality_score 0-100, auto_reject_score < min_quality_score. | DoD: CRUD; merge с defaults; validation; audit_log с diff; тест | Estimate: 6h

[TASK-0125] Интеграция fraud profile в intake pipeline | Type: Backend | При приёме лида: (1) загрузить affiliate fraud profile (cache in Redis, TTL 5 min), (2) merge с tenant defaults, (3) apply enabled checks, (4) calculate quality_score, (5) if score < auto_reject -> reject; if score < min_quality -> flag for review. | DoD: тест: affiliate с strict profile -> reject; тест: affiliate без profile -> tenant defaults; тест: custom rule reject | Estimate: 8h

[TASK-0126] Frontend: fraud profile editor | Type: Frontend | Вкладка "Fraud Profile": toggles (IP check, Email check, Phone/VOIP check, Velocity, Device); sliders (min quality score, auto-reject score); custom rules builder (field, condition, value, action, penalty). Preview: "Based on last 30 days: 95% pass rate". | DoD: все элементы; sliders; custom rules CRUD; preview calculation; save | Estimate: 10h

[TASK-0127] Preview: fraud profile impact analysis | Type: Backend | GET /api/v1/affiliates/:id/fraud-profile/preview -- анализ лидов аффилейта за 30 дней с ТЕКУЩИМ профилем и с НОВЫМ (переданным в query): `{"current": {"pass_rate": 95, "reject_count": 50}, "proposed": {"pass_rate": 88, "reject_count": 120}, "diff": {"additional_rejects": 70}}`. | DoD: корректный расчёт; тест с mock данными; latency <2s на 10K лидов | Estimate: 6h

---

### [STORY-036] Postback настройки per affiliate

**"As an** Affiliate Manager, **I want** настраивать postback URL и события для каждого аффилейта с подстановкой 20+ переменных, **so that** аффилейт получал уведомления о статусе лидов в своей трекинг-системе."

**Acceptance Criteria:**
- [ ] Per-affiliate postback: URL template с переменными `{lead_id}`, `{status}`, `{aff_sub1}`..`{aff_sub10}`, `{payout}`, `{country}`, `{broker_name}` (если разрешён), `{click_id}`, `{funnel_name}`, `{rejection_reason}`, `{email_masked}`, `{phone_masked}`, `{created_at}`, `{updated_at}`, `{deposit_amount}`, `{ftd_date}`, `{currency}`, `{quality_score}`, `{ip}`, `{affiliate_id}`
- [ ] Множественные postback URLs: до 5 per affiliate; каждый с своим набором событий (delivered, rejected, ftd, deposited, callback, hold, re-deposit); пример: URL1 для Keitaro (delivered+ftd), URL2 для внутреннего трекера (все события)
- [ ] Формат: GET с переменными в query string (default) ИЛИ POST с JSON body (конфигурируемо); Custom headers per postback URL
- [ ] Test postback: кнопка "Test" отправляет mock event на URL и показывает response; полезно для проверки интеграции
- [ ] UI: таблица postback URLs; для каждого: URL template с подсветкой переменных, чекбоксы событий, method toggle (GET/POST), custom headers, test button

**Story Points:** 8
**Priority:** Must
**Dependencies:** STORY-033, STORY-011

#### Tasks:

[TASK-0128] Backend: multiple postback URLs per affiliate | Type: Backend | Новая таблица affiliate_postbacks: (id, affiliate_id, tenant_id, url_template, method, headers JSONB, events JSONB, is_active, created_at). CRUD API: POST/GET/PUT/DELETE /api/v1/affiliates/:id/postbacks. Limit: 5 active per affiliate. | DoD: CRUD; limit 5; validation URL format; events enum; тест | Estimate: 6h

[TASK-0129] Интеграция с webhook dispatcher | Type: Backend | При изменении статуса лида: (1) lookup affiliate postbacks по event type, (2) для каждого matching postback -- resolve variables -> send request (GET query string / POST JSON). Reuse WebhookDispatcher (STORY-011) с расширением на multiple URLs и custom format. | DoD: multiple postbacks отправляются; correct variables; GET/POST formats; retry per URL independently | Estimate: 6h

[TASK-0130] Frontend: postback management tab | Type: Frontend | Вкладка "Postbacks" в карточке аффилейта: список postback URLs. Для каждого: editable URL с подсветкой {переменных}, event checkboxes, method toggle, custom headers key-value editor. Кнопка "Test" per URL. Max 5 URLs. | DoD: CRUD; variable highlighting; test button; method toggle; headers editor | Estimate: 10h

[TASK-0131] Variable resolution и test postback | Type: Backend | POST /api/v1/affiliates/:id/postbacks/:postback_id/test: генерация fake event -> resolve variables -> send to URL -> return result (request sent, response received, duration). Fake data: test lead with all fields populated. | DoD: test отправляет реальный запрос; result включает request/response details; rate limit: 5 tests/min | Estimate: 4h

---

### [STORY-037] Sub-accounts аффилейтов

**"As a** Network Admin, **I want** создавать sub-accounts для аффилейтов, **so that** крупный аффилейт мог разделить трафик по командам/кампаниям с отдельными API-ключами и статистикой."

**Acceptance Criteria:**
- [ ] Sub-account -- это affiliate с parent_affiliate_id; наследует fraud profile от parent (если не override); имеет собственные API keys, caps, postbacks
- [ ] Иерархия: максимум 2 уровня (parent -> child); parent видит статистику всех children; child НЕ видит parent или siblings
- [ ] API: POST /api/v1/affiliates/:id/sub-accounts (create sub), GET /api/v1/affiliates/:id/sub-accounts (list subs); sub-account является обычным affiliate с parent_id != null
- [ ] Parent caps: опциональный cap на общий трафик parent + все children (cross-account cap); при достижении -- все API-ключи parent и children ограничиваются
- [ ] UI: в карточке parent affiliate -- вкладка "Sub-Accounts" со списком; визуальная иерархия (tree); bulk operations на всех children

**Story Points:** 5
**Priority:** Should
**Dependencies:** STORY-033

#### Tasks:

[TASK-0132] Backend: parent-child affiliate relationship | Type: Backend | Добавить поле parent_affiliate_id в таблицу affiliates. Migration. API: create sub-account (POST /affiliates/:id/sub-accounts), list sub-accounts. Validation: max 2 levels; parent must be active; max 50 sub-accounts per parent. | DoD: migration; API; validation; тест: create sub, list subs, nested sub rejected | Estimate: 6h

[TASK-0133] Fraud profile inheritance | Type: Backend | При evaluation fraud profile для sub-account: (1) загрузить child fraud profile, (2) если null -> загрузить parent fraud profile, (3) если null -> tenant defaults. Override: child может ужесточить но не ослабить parent profile. | DoD: тест: child inherits parent; child override; child can't weaken; тест 3-level rejection | Estimate: 4h

[TASK-0134] Cross-account caps | Type: Backend | Опциональный parent_daily_cap: Redis key `xcap:{parent_id}:{date}` -> INCR при каждом лиде от parent или children. Проверка перед routing. При cap -> все ключи parent+children restricted. | DoD: тест: parent sends 50, child sends 50, parent cap 80 -> child's 31st rejected; reset at midnight | Estimate: 6h

[TASK-0135] Frontend: sub-accounts tab | Type: Frontend | Вкладка "Sub-Accounts" в карточке аффилейта: tree view (parent at top, children below); кнопка "Create Sub-Account"; для каждого child -- mini card (name, status, leads today, API key count). Click -> navigate to child's card. | DoD: tree view; create flow; navigation; parent cap display | Estimate: 6h

---

### [STORY-038] Affiliate levels / иерархия (тиры)

**"As a** Finance Manager, **I want** назначать уровни (тиры) аффилейтам на основе объёма и качества трафика, **so that** premium аффилейты получали лучшие условия (выше payout, ниже задержка выплаты, приоритет в routing)."

**Acceptance Criteria:**
- [ ] Affiliate levels: конфигурируемые тиры per tenant: например, Bronze (default), Silver, Gold, Platinum; каждый с: payout_multiplier (1.0, 1.05, 1.1, 1.15), payment_terms_days (30, 21, 14, 7), routing_priority_boost (0, +1, +2, +3), fraud_profile_override (мягче для premium)
- [ ] Автоматическое повышение: конфигурируемые правила (если leads_last_30d > 500 AND avg_quality > 80 -> upgrade to Silver); ручное повышение/понижение через UI
- [ ] Уровень влияет на routing: при одинаковом GEO и правиле -- лид от Gold affiliate получает +2 к priority score (обрабатывается раньше)
- [ ] UI: badge уровня на карточке аффилейта; page /settings/affiliate-levels для настройки тиров; history повышений/понижений
- [ ] Notification: при автоматическом повышении -- Telegram notification аффилейту (если настроен) + AM notification

**Story Points:** 5
**Priority:** Should
**Dependencies:** STORY-033

#### Tasks:

[TASK-0136] Backend: affiliate levels CRUD | Type: Backend | Таблица affiliate_levels: (id, tenant_id, name, rank, payout_multiplier, payment_terms_days, routing_priority_boost, fraud_profile_overrides JSONB, auto_upgrade_rules JSONB, created_at). Seed: Bronze, Silver, Gold, Platinum. API: CRUD. Affiliates: добавить level_id. | DoD: CRUD; migration; seed; affiliate level assignment; тест | Estimate: 6h

[TASK-0137] Auto-upgrade evaluator | Type: Backend | Background job (ежедневно): для каждого аффилейта -- evaluate auto_upgrade_rules: query leads stats (count last 30d, avg quality, rejection rate, FTD count). Если criteria met -> upgrade level. Если criteria NOT met for downgrade -> downgrade. Notification при изменении. | DoD: auto-upgrade работает; downgrade; notification; audit_log; тест с mock data | Estimate: 8h

[TASK-0138] Routing priority boost | Type: Backend | В routing engine: при оценке правил -- добавить level.routing_priority_boost к приоритету правил, матчащих данного аффилейта. Effect: Gold affiliate's leads обрабатываются раньше Bronze. | DoD: тест: Gold lead gets routed before Bronze when same rule; тест: no boost for Bronze | Estimate: 4h

[TASK-0139] Frontend: affiliate levels UI | Type: Frontend | Страница /settings/affiliate-levels: список тиров с настройками; drag для reorder. Карточка аффилейта: level badge + history timeline. Manual upgrade/downgrade dropdown. | DoD: levels CRUD; badge; history; manual change; responsive | Estimate: 8h

---

### [STORY-039] Ограничения по трафику per affiliate

**"As a** Network Admin, **I want** устанавливать ограничения по трафику для каждого аффилейта (daily cap, allowed GEOs, allowed hours), **so that** я мог контролировать объём и качество входящего трафика от каждого источника."

**Acceptance Criteria:**
- [ ] Per-affiliate daily cap: максимум лидов в день; при достижении -- reject с кодом AFFILIATE_CAP_REACHED; кап сбрасывается в полночь по timezone аффилейта (или tenant timezone)
- [ ] Allowed GEOs per affiliate: список стран, из которых аффилейту разрешено отправлять лиды; лиды из других GEO -> reject с кодом GEO_RESTRICTED
- [ ] Allowed hours per affiliate: расписание, в которое аффилейт может отправлять лиды; вне часов -> reject (не queue); reuse ScheduleChecker
- [ ] Все ограничения проверяются ПЕРЕД валидацией и routing (fail fast); при отклонении -- detailed rejection reason в ответе
- [ ] UI: секция "Traffic Restrictions" в карточке аффилейта: daily cap input, GEO multiselect, schedule grid; real-time display текущего consumption vs cap

**Story Points:** 5
**Priority:** Must
**Dependencies:** STORY-033, STORY-006

#### Tasks:

[TASK-0140] Backend: traffic restrictions engine | Type: Backend | TrafficRestrictionChecker: (1) check daily cap (Redis INCR, TTL midnight), (2) check allowed GEOs (lead.country in affiliate.settings.allowed_geos), (3) check schedule (ScheduleChecker). Execute before dedup/fraud/routing. Return restriction reason if any. | DoD: тест: cap reached -> reject; тест: wrong GEO -> reject; тест: outside hours -> reject; тест: all pass; order of checks | Estimate: 8h

[TASK-0141] Frontend: traffic restrictions UI | Type: Frontend | Секция "Traffic Restrictions" в Profile tab: (1) Daily cap input + gauge (current/max), (2) Allowed GEOs multiselect + country groups, (3) Schedule grid (reuse WeeklyScheduleGrid). All save via PUT /api/v1/affiliates/:id. | DoD: all controls; gauge updates real-time; GEO select; schedule grid; save | Estimate: 6h

---

### [STORY-040] Click tracking domain per affiliate

**"As a** Media Buyer, **I want** использовать свой кастомный домен для click tracking ссылок, **so that** мои рекламные кампании выглядели профессионально и не блокировались рекламными сетями из-за shared домена."

**Acceptance Criteria:**
- [ ] Per-affiliate custom domain: affiliate.settings.tracking_domain (например, "track.mysite.com"); используется для генерации tracking/postback URLs вместо default домена GambChamp
- [ ] Настройка: аффилейт указывает домен; система генерирует CNAME record для DNS; аффилейт добавляет CNAME; система проверяет DNS propagation; при успехе -- SSL сертификат автоматически (Let's Encrypt)
- [ ] Verification flow: (1) affiliate inputs domain, (2) system shows required CNAME, (3) affiliate configures DNS, (4) "Verify" button checks DNS, (5) upon success -- provision SSL, (6) domain active
- [ ] Fallback: если custom domain unavailable (SSL expired, DNS changed) -- автоматический fallback на default domain; alert для AM
- [ ] UI: секция "Custom Domain" в карточке аффилейта; status: pending DNS -> verified -> SSL provisioning -> active; CNAME record copyable

**Story Points:** 8
**Priority:** Should
**Dependencies:** STORY-033

#### Tasks:

[TASK-0142] Backend: custom domain management | Type: Backend | Таблица affiliate_domains: (id, affiliate_id, tenant_id, domain, cname_target, status, ssl_expires_at, verified_at, created_at). API: POST (add domain), GET (status), POST /verify (DNS check), DELETE (remove). CNAME target: `{tenant_slug}.track.gambchamp.com`. | DoD: CRUD; DNS verification (net.LookupCNAME); status transitions; тест with mock DNS | Estimate: 8h

[TASK-0143] SSL provisioning via Let's Encrypt | Type: DevOps | Автоматический provisioning SSL сертификата через ACME (Let's Encrypt) при verified domain. Renewal: auto 30 дней до expiry. Storage: сертификаты в encrypted S3 bucket или Vault. Reverse proxy (Caddy/nginx) dynamic config reload. | DoD: SSL provisioned < 5 min after verification; auto renewal; тест with staging LE | Estimate: 12h

[TASK-0144] Frontend: custom domain UI | Type: Frontend | Секция "Custom Domain" в карточке: (1) input domain, (2) display required CNAME record with copy button, (3) "Verify DNS" button, (4) status indicator (pending/verified/provisioning/active/error), (5) SSL expiry date. Tooltip instructions. | DoD: full flow in UI; status updates; copy CNAME; error messages; loading states | Estimate: 6h

---

### [STORY-041] Dashboard аффилейтов для Affiliate Manager

**"As an** Affiliate Manager, **I want** видеть dashboard со всеми моими аффилейтами, их performance и ключевыми метриками, **so that** я мог быстро оценить состояние трафика и принять решения."

**Acceptance Criteria:**
- [ ] Dashboard показывает только аффилейтов, назначенных текущему AM (manager_id = current_user.id); Network Admin видит всех
- [ ] KPI виджеты (top): total leads today, delivered today, rejection rate today, avg quality score today, FTD count today, revenue today (если finance module включён)
- [ ] Таблица аффилейтов: name, status, leads (today/yesterday/7d/30d), quality score (sparkline), rejection rate (trend arrow), FTD rate, last lead (relative time), actions
- [ ] Фильтры: date range picker, status, GEO, tags; все данные обновляются при изменении фильтров
- [ ] Export: CSV с текущими фильтрами; включает все column данные + additional fields (email, company, API key count)

**Story Points:** 5
**Priority:** Should
**Dependencies:** STORY-033

#### Tasks:

[TASK-0145] Backend: affiliate dashboard API | Type: Backend | GET /api/v1/affiliates/dashboard?date_from=&date_to=&manager_id=. Response: `{"kpis": {...}, "affiliates": [{...stats...}]}`. Manager filter: if role=affiliate_manager -> force manager_id=self. Aggregation from leads table (indexed queries). Cache: 30 секунд. | DoD: корректные KPIs; manager isolation; date range; cache; benchmark <500ms на 100 affiliates с 1M leads | Estimate: 8h

[TASK-0146] Frontend: affiliate dashboard page | Type: Frontend | Страница /dashboard/affiliates: KPI cards row (6 cards); таблица с virtual scroll; date range picker; status filter tabs; GEO multiselect; export CSV button. Auto-refresh каждые 60 секунд. | DoD: all widgets; table virtual scroll; filters; export; responsive; loading states | Estimate: 10h

---

### [STORY-042] Audit log действий с аффилейтами

**"As a** Team Lead, **I want** видеть полный audit log всех действий с аффилейтами, **so that** при разборе инцидентов я мог восстановить кто, когда и что изменил."

**Acceptance Criteria:**
- [ ] Audit log записывает ВСЕ изменения: создание/редактирование профиля, создание/отзыв API-ключа, изменение fraud profile, изменение postback settings, изменение caps, статус transitions, level changes
- [ ] Формат записи: user (кто), action (что), resource (объект), before_state (JSONB), after_state (JSONB), ip (откуда), timestamp
- [ ] API: GET /api/v1/affiliates/:id/audit-log?action=&user_id=&date_from=&date_to=&page=1; фильтрация по action, user, date range
- [ ] UI: вкладка "Audit Log" в карточке аффилейта; timeline: каждое событие -- карточка с diff (before/after highlighted); фильтры
- [ ] Retention: 365 дней; после -- архивация (не удаление); audit log НЕЛЬЗЯ удалить или изменить (append-only, protected by policy)

**Story Points:** 3
**Priority:** Must
**Dependencies:** STORY-033

#### Tasks:

[TASK-0147] Backend: audit log integration | Type: Backend | Middleware/decorator: при каждом mutation endpoint (POST/PUT/DELETE) на affiliate resources -- автоматически записывать в audit_log: snapshot before, snapshot after (diff), user_id, ip. Использовать таблицу audit_log (уже существует в schema). | DoD: все affiliate mutations logged; before/after snapshots; user и IP captured; тест: create -> log; update -> log with diff; delete -> log | Estimate: 6h

[TASK-0148] Backend: audit log query API | Type: Backend | GET /api/v1/affiliates/:id/audit-log с фильтрами. Pagination. Response: `[{"id": "...", "user": {"id": "...", "name": "..."}, "action": "update_fraud_profile", "changes": {"min_quality_score": {"from": 50, "to": 60}}, "ip": "...", "created_at": "..."}]`. | DoD: query с фильтрами; diff computation; pagination; тест | Estimate: 4h

[TASK-0149] Frontend: audit log tab | Type: Frontend | Вкладка "Audit Log": vertical timeline; каждое событие: user avatar + name, action badge (created/updated/deleted), timestamp (relative + absolute on hover), expandable diff (green=added, red=removed). Фильтры: action type, user, date range. Infinite scroll. | DoD: timeline; diff visualization; filters; infinite scroll; responsive | Estimate: 8h
## [EPIC-05] Lead Management UI

**Цель:** Предоставить операционной команде мощный интерфейс для управления лидами: просмотр, фильтрация, детализация, массовые операции — заменяющий необходимость в сторонних таблицах и BI-инструментах.

**Метрика успеха:**
- 95% операционных задач с лидами выполняются внутри UI без экспорта в Excel
- Время поиска конкретного лида < 3 секунд при базе 500K+ записей
- 80% пользователей используют сохранённые пресеты фильтров в первый месяц

**Приоритет:** P0 (MVP)
**Зависит от:** EPIC-01 (Lead Intake API), EPIC-02 (Lead Routing Engine)
**Оценка:** XL (3+ мес)

---

### Stories:

---

#### [STORY-040] Таблица лидов с виртуальным скроллингом

**Как** Affiliate Manager, **я хочу** видеть все лиды в высокопроизводительной таблице с виртуальным скроллингом, **чтобы** работать с потоком 10K+ строк без задержек и зависаний интерфейса.

**Acceptance Criteria:**
- [ ] AC1: Таблица рендерит 10,000+ строк с виртуальным скроллингом; FPS при скролле >= 30 на устройствах с 8GB RAM; видимое окно — 50 строк, буфер — 20 строк сверху/снизу
- [ ] AC2: Первичная загрузка таблицы (первые 50 строк) происходит за < 800ms при пустых фильтрах; пагинация серверная с cursor-based подходом (не offset); размер страницы: 50 / 100 / 200 строк (выбор пользователя)
- [ ] AC3: При потере соединения таблица показывает inline-баннер "Нет соединения — данные могут быть устаревшими" и сохраняет последние загруженные данные; при восстановлении — автоматический refresh
- [ ] AC4: Данные доступны только авторизованным пользователям с правами `leads:read`; запросы без валидного JWT возвращают 401; попытки доступа к лидам чужой компании возвращают 403

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-05

**Tasks:**

**[TASK-0200]** Проектирование API endpoint GET /api/v1/leads с cursor-based пагинацией
**Тип:** Backend
**Описание:** Реализовать endpoint для получения списка лидов. Cursor-based пагинация по полю `created_at` + `id`. Поддержка sort_by (created_at, updated_at, status, country), sort_order (asc/desc). Response: `{ data: Lead[], next_cursor: string | null, total_count: number }`.
**Критерии готовности (DoD):**
- [ ] Endpoint возвращает данные за < 200ms при 1M записей в таблице (с индексами)
- [ ] Cursor корректно работает при конкурентной вставке новых лидов
- [ ] Rate limit: 60 req/min per user
- [ ] Unit-тесты покрывают: пустая база, 1 запись, cursor на последней странице, невалидный cursor
**Оценка:** 16h
**Story:** STORY-040

**[TASK-0201]** Frontend-компонент LeadTable с виртуальным скроллингом
**Тип:** Frontend
**Описание:** Реализовать компонент таблицы на основе TanStack Virtual (или react-window). Виртуальный скролл с буфером 20 строк. Интеграция с API через React Query с infinite scroll. Skeleton-загрузка при первом рендере.
**Критерии готовности (DoD):**
- [ ] FPS >= 30 при скролле через 10K строк (проверить через Chrome DevTools Performance)
- [ ] Skeleton-загрузка отображается при первом рендере и при переходе между страницами
- [ ] Компонент корректно работает при resize окна браузера (320px — 2560px)
**Оценка:** 16h
**Story:** STORY-040

**[TASK-0202]** Дизайн таблицы лидов: wireframe + UI спецификация
**Тип:** Design
**Описание:** Wireframe таблицы: строки, колонки, заголовки с сортировкой, состояния (loading, empty, error, no-connection). Mobile-адаптация: горизонтальный скролл с фиксированной первой колонкой.
**Критерии готовности (DoD):**
- [ ] Wireframe утверждён: desktop (1440px), tablet (768px), mobile (375px)
- [ ] Спецификация состояний: loading skeleton, empty state, error state, offline state
- [ ] Дизайн-токены для таблицы (row height, padding, font size, stripe colors)
**Оценка:** 8h
**Story:** STORY-040

**[TASK-0203]** QA: тестирование производительности таблицы и edge-cases
**Тип:** QA
**Описание:** Написать тест-кейсы: таблица с 0 / 1 / 100 / 10K / 100K лидов, скролл до конца и обратно, resize окна, потеря сети, параллельные запросы, авторизация.
**Критерии готовности (DoD):**
- [ ] Performance-тест: scroll через 10K строк без dropped frames (< 10% dropped)
- [ ] E2E тест: загрузка → скролл → resize → offline → online → данные обновлены
- [ ] Security-тест: запрос без JWT → 401; запрос к чужой компании → 403
**Оценка:** 8h
**Story:** STORY-040

---

#### [STORY-041] Конфигурируемые колонки таблицы (46+ колонок)

**Как** Network Admin, **я хочу** настраивать видимость и порядок колонок в таблице лидов (аналогично HyperOne с 46+ колонками), **чтобы** каждый член команды видел только релевантные данные.

**Acceptance Criteria:**
- [ ] AC1: Доступно минимум 46 колонок: ID, Email, Phone, First Name, Last Name, Country, City, IP, Affiliate, Affiliate Sub1-Sub10, Broker, Offer/Funnel, Status, Sub-Status, Fraud Score, Created At, Updated At, Sent At, FTD At, FTD Amount, Sale Status, Autologin Status, Source, Campaign, UTM Source/Medium/Campaign/Content/Term, Landing Page, Language, Device Type, OS, Browser, Referrer, Comment, Tags, Quality Score, Integration Response, Rejection Reason, Retry Count, Last Broker Response, Custom Field 1-5
- [ ] AC2: Drag-and-drop reorder колонок сохраняется per-user в localStorage + синхронизируется с сервером; при первом визите — дефолтный набор из 12 ключевых колонок
- [ ] AC3: Колонки группируются в категории в панели настроек: "Основные" (8), "Контакт" (6), "Трафик" (12), "Статусы" (6), "Финансы" (4), "Технические" (6), "Кастомные" (5); поиск по имени колонки работает с задержкой < 100ms
- [ ] AC4: Ширина колонок регулируется перетаскиванием разделителя; минимальная ширина — 60px; двойной клик на разделитель — auto-fit по содержимому

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-040

**Tasks:**

**[TASK-0204]** Backend: API для сохранения column configuration per user
**Тип:** Backend
**Описание:** Endpoint PUT /api/v1/users/me/table-config. Body: `{ columns: [{ key: string, visible: bool, width: number, order: number }], view_name: string }`. Хранение в таблице `user_table_configs`. Максимум 20 сохранённых конфигураций на пользователя.
**Критерии готовности (DoD):**
- [ ] CRUD для конфигураций: создание, чтение, обновление, удаление
- [ ] Валидация: column key из допустимого списка; width 60-800px; order >= 0
- [ ] Дефолтная конфигурация возвращается при первом запросе (12 ключевых колонок)
**Оценка:** 8h
**Story:** STORY-041

**[TASK-0205]** Frontend: Column Picker с drag-and-drop и группировкой
**Тип:** Frontend
**Описание:** Sidebar-панель "Настройка колонок" с категориями, чекбоксами видимости, drag-and-drop сортировкой (dnd-kit), поиском. Синхронизация с сервером при закрытии панели (debounce 2s). Fallback на localStorage при offline.
**Критерии готовности (DoD):**
- [ ] Drag-and-drop работает на desktop и touch-устройствах
- [ ] Поиск по имени колонки фильтрует список за < 100ms
- [ ] Кнопка "Сбросить к дефолту" восстанавливает набор из 12 колонок
**Оценка:** 12h
**Story:** STORY-041

**[TASK-0206]** Frontend: Resize колонок с auto-fit
**Тип:** Frontend
**Описание:** Drag-разделители между заголовками колонок. Двойной клик — auto-fit по максимальному содержимому видимых строк (не всех). Сохранение ширины в конфигурации.
**Критерии готовности (DoD):**
- [ ] Resize плавный (без рывков), курсор меняется на col-resize
- [ ] Auto-fit учитывает только видимые строки (не вызывает перерендер всей таблицы)
**Оценка:** 8h
**Story:** STORY-041

**[TASK-0207]** QA: тестирование column picker и reorder
**Тип:** QA
**Описание:** Тест-кейсы: включить/выключить все 46 колонок, drag-and-drop на мобиле, сброс, конфликт localStorage vs сервер, 2 вкладки одновременно.
**Критерии готовности (DoD):**
- [ ] Все 46 колонок корректно отображаются при включении
- [ ] Конфигурация сохраняется при перезагрузке страницы
- [ ] Edge case: 0 видимых колонок невозможен (минимум 1)
**Оценка:** 4h
**Story:** STORY-041

---

#### [STORY-042] Фильтрация лидов по 15+ параметрам

**Как** Affiliate Manager, **я хочу** фильтровать лиды по 15+ параметрам с комбинированием условий, **чтобы** быстро находить нужные сегменты для анализа и массовых операций.

**Acceptance Criteria:**
- [ ] AC1: Минимум 18 фильтров: Date Range (created, updated, sent, FTD), Status (multi-select), Country (multi-select с поиском, 250+ стран), Affiliate (multi-select), Broker (multi-select), Offer/Funnel (multi-select), Fraud Score (range slider 0-100), Email (contains/equals/regex), Phone (contains/equals), IP (exact/subnet CIDR), Affiliate Sub1-Sub5 (contains), Source, UTM Source/Medium/Campaign, Sale Status, Quality Score (range), Tags (multi-select), Has Comment (boolean), Custom Fields (text/number range)
- [ ] AC2: Фильтры применяются на сервере; время ответа < 500ms при 1M лидов; каждый фильтр генерирует WHERE-условие с parameterized queries (защита от SQL injection)
- [ ] AC3: Фильтр-бар показывает активные фильтры как chips; клик на chip — редактирование; X на chip — удаление; кнопка "Очистить все" сбрасывает все фильтры за 1 клик
- [ ] AC4: При комбинации фильтров, дающей 0 результатов, показывается empty state: "0 лидов по вашим фильтрам" + ссылка "Очистить фильтры"; не показывается пустая таблица без объяснения
- [ ] AC5: Фильтры сохраняются в URL query string; при копировании URL и вставке — те же фильтры применяются (deep linking)

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-040

**Tasks:**

**[TASK-0208]** Backend: расширение GET /api/v1/leads query-параметрами фильтрации
**Тип:** Backend
**Описание:** Добавить query-параметры для всех 18 фильтров. Каждый фильтр — отдельный WHERE-условие, объединяемые через AND. Мультизначные параметры: `?status=new,sent,converted`. Даты: ISO 8601 формат. IP-фильтр поддерживает CIDR-нотацию. SQL injection protection через parameterized queries.
**Критерии готовности (DoD):**
- [ ] Все 18 фильтров работают корректно изолированно и в комбинации
- [ ] Время ответа < 500ms при 1M записей (проверено через benchmark с seed data)
- [ ] Составные индексы на (company_id, created_at), (company_id, status, country), (company_id, affiliate_id, created_at)
- [ ] Невалидные фильтры возвращают 400 с описанием ошибки
**Оценка:** 16h
**Story:** STORY-042

**[TASK-0209]** Frontend: FilterBar с chips и deep linking
**Тип:** Frontend
**Описание:** Компонент FilterBar: горизонтальная полоса с кнопками-дропдаунами для каждой группы фильтров. Активные фильтры — chips. Синхронизация с URL через useSearchParams. Multi-select дропдауны с поиском (Combobox pattern).
**Критерии готовности (DoD):**
- [ ] Deep linking: URL с фильтрами при вставке корректно применяет все фильтры
- [ ] Chips отображают человекочитаемые значения (не ID, а имена аффилейтов/брокеров)
- [ ] Country picker с флагами, поиском и группировкой по регионам
**Оценка:** 16h
**Story:** STORY-042

**[TASK-0210]** Frontend: Range-фильтры (Fraud Score, Date Range, Quality Score)
**Тип:** Frontend
**Описание:** Компоненты: DateRangePicker (с пресетами: "Сегодня", "Вчера", "7 дней", "30 дней", "Custom"), RangeSlider для fraud score (0-100) и quality score. Quick-select для fraud: "Clean (0-20)", "Suspicious (21-60)", "Fraud (61-100)".
**Критерии готовности (DoD):**
- [ ] DateRangePicker поддерживает timezone пользователя; даты в UTC при отправке на сервер
- [ ] Range slider позволяет задать min и max; значения отображаются в реальном времени
- [ ] Пресеты дат пересчитываются динамически относительно текущего момента
**Оценка:** 8h
**Story:** STORY-042

**[TASK-0211]** QA: тестирование фильтрации и deep linking
**Тип:** QA
**Описание:** Тесты: каждый из 18 фильтров по отдельности, все вместе, deep link с 5+ фильтрами, фильтры дающие 0 результатов, невалидные значения в URL, фильтры + сортировка + пагинация одновременно.
**Критерии готовности (DoD):**
- [ ] 18 фильтров × 3 сценария (valid, empty result, invalid) = 54 тест-кейса
- [ ] Deep link тест: скопировать URL → открыть в новой вкладке → те же результаты
- [ ] Performance: фильтр по 3+ параметрам на 1M записей < 500ms
**Оценка:** 8h
**Story:** STORY-042

---

#### [STORY-043] Сохранённые пресеты фильтров

**Как** Team Lead, **я хочу** сохранять комбинации фильтров как именованные пресеты и делиться ими с командой, **чтобы** стандартизировать рабочие процессы и не настраивать фильтры заново каждый раз.

**Acceptance Criteria:**
- [ ] AC1: Кнопка "Сохранить фильтр" создаёт именованный пресет (макс. 64 символа UTF-8); максимум 50 пресетов на пользователя, 100 на компанию (shared)
- [ ] AC2: Пресеты бывают двух типов: "Личный" (виден только автору) и "Командный" (виден всем пользователям компании с правом `leads:read`); создание командного пресета требует права `leads:manage_presets`
- [ ] AC3: Dropdown "Мои фильтры" показывает список пресетов с иконкой (личный/командный), датой создания и автором; применение пресета — 1 клик; загрузка списка < 200ms
- [ ] AC4: Пресет можно обновить (перезаписать текущими фильтрами), переименовать, удалить; удаление командного пресета требует подтверждения; удалённый пресет не влияет на текущие фильтры у пользователей, которые его применили

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-05
**Зависит от:** STORY-042

**Tasks:**

**[TASK-0212]** Backend: CRUD для filter presets
**Тип:** Backend
**Описание:** Таблица `filter_presets`: id, company_id, user_id, name, filters (JSONB), is_shared, created_at, updated_at. Endpoints: POST /api/v1/filter-presets, GET /api/v1/filter-presets, PUT /api/v1/filter-presets/:id, DELETE /api/v1/filter-presets/:id. Валидация: filters JSONB <= 10KB, name <= 64 chars.
**Критерии готовности (DoD):**
- [ ] CRUD работает корректно; shared пресеты видны всем в компании
- [ ] Лимит 50 личных / 100 командных — при превышении возвращается 429 с сообщением
- [ ] Удаление пресета не ломает работу пользователей с уже применённым фильтром
**Оценка:** 8h
**Story:** STORY-043

**[TASK-0213]** Frontend: SaveFilterModal + PresetDropdown
**Тип:** Frontend
**Описание:** Modal "Сохранить фильтр": поле name, toggle Personal/Team, кнопка Save. Dropdown "Мои фильтры": секции "Личные" и "Командные", аватар автора для командных, кнопка Apply. Контекстное меню: Edit, Rename, Delete.
**Критерии готовности (DoD):**
- [ ] Сохранение и применение пресета за < 2 клика
- [ ] Поиск по имени пресета при > 10 пресетах в списке
- [ ] Визуальное различие личных (иконка user) и командных (иконка team) пресетов
**Оценка:** 8h
**Story:** STORY-043

**[TASK-0214]** QA: тестирование пресетов фильтров
**Тип:** QA
**Описание:** Тесты: создание пресета, применение, обновление, удаление; лимиты (51-й пресет); конфликт при одновременном редактировании; shared пресет виден коллеге; невалидное имя.
**Критерии готовности (DoD):**
- [ ] E2E: создать → применить → изменить фильтры → обновить пресет → применить снова
- [ ] Access control: пользователь без `leads:manage_presets` не может создать командный пресет
**Оценка:** 4h
**Story:** STORY-043

---

#### [STORY-044] Профиль лида с табами (Main, Autologin, Registrations, Events, Comments)

**Как** Affiliate Manager, **я хочу** открывать детальный профиль лида с 5 табами информации, **чтобы** получить полную картину по лиду без переключения между разделами.

**Acceptance Criteria:**
- [ ] AC1: Клик на строку таблицы открывает slide-over панель (70% ширины экрана) или отдельную страницу; загрузка основных данных — < 500ms; URL обновляется на /leads/:id (deep-linkable)
- [ ] AC2: Таб "Main": все поля лида (контактные данные, geo, traffic source, broker, status timeline), fraud score badge (цветной: зелёный 0-20, жёлтый 21-60, красный 61-100), качество (Q-Lead badge), rejection reason если есть, кнопки Quick Actions (Resend, Block, Add Comment)
- [ ] AC3: Таб "Autologin": статус autologin pipeline (pending/success/failed/not_attempted), URL autologin, timestamp, IP/device при autologin, screenshot-proof если есть; для неотправленных — placeholder "Автологин не выполнялся"
- [ ] AC4: Таб "Events": хронологическая лента всех событий (created → validated → fraud_checked → routed → sent → broker_response → status_update → ...) с timestamp и деталями; каждое событие раскрывается для просмотра payload; максимум 500 событий на лид (с пагинацией); сортировка: новые сверху / старые сверху
- [ ] AC5: Таб "Comments": thread комментариев с @mention пользователей; максимум 1000 символов на комментарий; timestamp + автор; редактирование своих комментариев в течение 15 минут; удаление — только своих или с правом `leads:manage_comments`

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-040

**Tasks:**

**[TASK-0215]** Backend: GET /api/v1/leads/:id с полным профилем
**Тип:** Backend
**Описание:** Endpoint возвращает полные данные лида: все поля, fraud details, autologin status, последние 20 событий (остальные через пагинацию), количество комментариев. JOIN с таблицами: leads, lead_events, lead_autologins, lead_comments, fraud_checks. Оптимизация: eager load только Main-таб данных, остальные табы — lazy load.
**Критерии готовности (DoD):**
- [ ] Response time < 300ms для Main-tab данных
- [ ] Lazy endpoints: GET /api/v1/leads/:id/events, GET /api/v1/leads/:id/autologin, GET /api/v1/leads/:id/comments
- [ ] Доступ проверяется: lead.company_id == user.company_id, иначе 403
**Оценка:** 12h
**Story:** STORY-044

**[TASK-0216]** Backend: CRUD для комментариев к лиду
**Тип:** Backend
**Описание:** Endpoints: POST /api/v1/leads/:id/comments, PUT /api/v1/leads/:id/comments/:comment_id, DELETE /api/v1/leads/:id/comments/:comment_id. Таблица: lead_comments (id, lead_id, user_id, body TEXT, mentions JSONB, created_at, updated_at). Ограничение: body <= 1000 chars, edit window 15 min.
**Критерии готовности (DoD):**
- [ ] @mention парсит имена пользователей из body и сохраняет в mentions JSONB
- [ ] PUT возвращает 403 если прошло > 15 минут с момента создания
- [ ] DELETE: автор всегда может удалить; другие — только с `leads:manage_comments`
**Оценка:** 8h
**Story:** STORY-044

**[TASK-0217]** Frontend: LeadProfile slide-over с табами
**Тип:** Frontend
**Описание:** Slide-over панель с 5 табами. Main-таб загружается сразу, остальные — при клике (lazy). Анимация открытия/закрытия 200ms. Keyboard navigation: Escape закрывает, Tab переключает табы. URL обновляется через history.pushState.
**Критерии готовности (DoD):**
- [ ] Slide-over корректно работает на экранах >= 768px; на mobile — полноэкранная страница
- [ ] Lazy loading табов: spinner при загрузке, error state при ошибке
- [ ] Status timeline на Main-табе — визуальный stepper с цветовыми индикаторами
**Оценка:** 16h
**Story:** STORY-044

**[TASK-0218]** Frontend: EventTimeline + CommentThread компоненты
**Тип:** Frontend
**Описание:** EventTimeline: вертикальная лента событий, раскрываемые карточки с JSON payload, пагинация кнопкой "Загрузить ещё". CommentThread: текстовое поле с @mention автокомплитом (Tribute.js или аналог), список комментариев, edit/delete buttons.
**Критерии готовности (DoD):**
- [ ] @mention автокомплит показывает пользователей компании с задержкой < 200ms
- [ ] Событие раскрывается/сворачивается за 1 клик; JSON payload форматирован с подсветкой
- [ ] Edit button исчезает через 15 минут после публикации
**Оценка:** 12h
**Story:** STORY-044

**[TASK-0219]** Design: Lead Profile — wireframes всех 5 табов
**Тип:** Design
**Описание:** Wireframe для каждого таба: Main (status badge, fraud badge, Q-Lead badge, contact info, timeline), Autologin (pipeline stages, screenshot), Registrations (broker response history), Events (timeline), Comments (thread). Мобильная адаптация.
**Критерии готовности (DoD):**
- [ ] 5 wireframes (desktop + mobile) утверждены командой
- [ ] UI-спецификация состояний: no autologin, no events, no comments, error state
**Оценка:** 8h
**Story:** STORY-044

**[TASK-0220]** QA: тестирование профиля лида
**Тип:** QA
**Описание:** Тесты: профиль лида с полными данными, лид без autologin, лид с 500 событиями, добавление/редактирование/удаление комментария, @mention, deep link на профиль, XSS в комментариях.
**Критерии готовности (DoD):**
- [ ] XSS-тест: HTML/JS в теле комментария экранируется при отображении
- [ ] Deep link /leads/:id открывает корректный профиль
- [ ] Performance: лид с 500 событиями загружает Events-таб за < 1s
**Оценка:** 8h
**Story:** STORY-044

---

#### [STORY-045] Client History — лог каждой попытки отправки лида брокеру

**Как** Affiliate Manager, **я хочу** видеть полный лог попыток отправки лида каждому брокеру (причина отклонения: caps_full, blocked, duplicate, fraud, offline), **чтобы** диагностировать проблемы маршрутизации и объяснять аффилейтам почему лид не дошёл.

**Acceptance Criteria:**
- [ ] AC1: Таб "Registrations" в профиле лида показывает каждую попытку отправки: broker name, timestamp, result (success / rejected), rejection reason (caps_full, geo_mismatch, schedule_closed, fraud_blocked, duplicate, integration_error, timeout), response time ms, broker raw response (collapsible JSON)
- [ ] AC2: Попытки отображаются в хронологическом порядке (сверху — последняя); цветовая индикация: зелёный (success), красный (rejected), жёлтый (timeout/retry); для каждой попытки — иконка брокера
- [ ] AC3: При наличии 5+ попыток показывается сводка вверху: "Попыток: 7, Успешных: 1, Отклонено: 6" с процентным соотношением; данные доступны в API для автоматизации: GET /api/v1/leads/:id/registrations
- [ ] AC4: Данные Client History хранятся минимум 90 дней; записи старше 90 дней архивируются в cold storage; при запросе архивных данных — баннер "Загрузка архивных данных" с ожиданием до 5 секунд

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-044, EPIC-02

**Tasks:**

**[TASK-0221]** Backend: таблица lead_registrations и API endpoint
**Тип:** Backend
**Описание:** Таблица lead_registrations: id, lead_id, broker_id, attempted_at, result (enum: success/rejected/timeout/error), rejection_reason (enum), response_time_ms, raw_response (JSONB), created_at. Записи создаются routing engine при каждой попытке. Endpoint: GET /api/v1/leads/:id/registrations (пагинация cursor, limit 50).
**Критерии готовности (DoD):**
- [ ] Запись создаётся атомарно с попыткой отправки (в той же транзакции)
- [ ] Индексы: (lead_id, attempted_at DESC), (broker_id, attempted_at)
- [ ] Архивация записей старше 90 дней через cron job (ежедневно, 03:00 UTC)
**Оценка:** 12h
**Story:** STORY-045

**[TASK-0222]** Frontend: RegistrationHistory компонент
**Тип:** Frontend
**Описание:** Компонент для таба "Registrations": список карточек попыток, сводка вверху, раскрываемый raw response. Цветовая индикация по result. Иконки брокеров из broker registry.
**Критерии готовности (DoD):**
- [ ] Сводка (total/success/rejected) обновляется при загрузке
- [ ] Raw response показывается в collapsible JSON-viewer с подсветкой синтаксиса
- [ ] Empty state: "Лид ещё не отправлялся ни одному брокеру"
**Оценка:** 8h
**Story:** STORY-045

**[TASK-0223]** QA: тестирование Client History
**Тип:** QA
**Описание:** Тесты: лид с 0/1/20/100 попытками, различные rejection reasons, timeout, архивные данные (> 90 дней), сводка с корректными цифрами.
**Критерии готовности (DoD):**
- [ ] Все 7 типов rejection reason корректно отображаются с описанием
- [ ] Архивные данные загружаются с баннером предупреждения
**Оценка:** 4h
**Story:** STORY-045

---

#### [STORY-046] Quality Score (Q-Leads) — оценка качества лида

**Как** Media Buyer, **я хочу** видеть Quality Score для каждого лида (отдельно от Fraud Score), **чтобы** оценивать качество трафика с каждого источника и оптимизировать рекламные кампании.

**Acceptance Criteria:**
- [ ] AC1: Quality Score вычисляется по 5 факторам: полнота данных (все обязательные поля заполнены — 20%), валидность контактов (email deliverable + phone reachable — 20%), geo-match (IP страна совпадает с заявленной — 20%), time-to-convert (лид пришёл в рабочие часы брокера — 20%), uniqueness (первая отправка, не re-inject — 20%); итоговый score 0-100
- [ ] AC2: Q-Lead badge отображается в таблице лидов и в профиле: "A" (80-100, зелёный), "B" (60-79, синий), "C" (40-59, жёлтый), "D" (0-39, красный); фильтр по Quality Score доступен в FilterBar (range slider)
- [ ] AC3: Tooltip на badge показывает breakdown по 5 факторам с конкретными значениями; API возвращает quality_score и quality_breakdown в ответе GET /api/v1/leads/:id
- [ ] AC4: Quality Score рассчитывается при intake (синхронно, < 50ms overhead); пересчёт при обновлении статуса (FTD, conversion); исторические значения сохраняются (не перезаписываются)

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-05
**Зависит от:** STORY-040, EPIC-01

**Tasks:**

**[TASK-0224]** Backend: сервис расчёта Quality Score
**Тип:** Backend
**Описание:** Модуль QualityScorer: принимает Lead, возвращает { score: number, breakdown: { completeness: number, contact_validity: number, geo_match: number, timing: number, uniqueness: number } }. Вызывается из intake pipeline после fraud check. Результат сохраняется в leads.quality_score (INT) и leads.quality_breakdown (JSONB).
**Критерии готовности (DoD):**
- [ ] Расчёт выполняется < 50ms (без внешних вызовов — использует уже полученные данные)
- [ ] Unit-тесты для каждого фактора: полные данные → 20, частичные → 10, пустые → 0
- [ ] Пересчёт при status update: если FTD → score учитывает факт конверсии
**Оценка:** 12h
**Story:** STORY-046

**[TASK-0225]** Frontend: QualityBadge + tooltip с breakdown
**Тип:** Frontend
**Описание:** Компонент QualityBadge: буква A/B/C/D с цветом фона. Tooltip (Popover): 5 строк с progress bar для каждого фактора. Использование в LeadTable (колонка) и LeadProfile (Main-таб).
**Критерии готовности (DoD):**
- [ ] Badge визуально отличается от Fraud Score badge (другая форма — квадрат vs круг)
- [ ] Tooltip закрывается по клику вне области и по Escape
- [ ] Accessible: aria-label с текстовым описанием score
**Оценка:** 4h
**Story:** STORY-046

**[TASK-0226]** QA: тестирование Quality Score
**Тип:** QA
**Описание:** Тесты: лид с максимальным score (100), минимальным (0), граничные значения (39/40, 59/60, 79/80), пересчёт после FTD, фильтрация по quality score, tooltip breakdown.
**Критерии готовности (DoD):**
- [ ] Граничные значения корректно категоризируются (40 = "C", не "D")
- [ ] Breakdown суммируется до итогового score
**Оценка:** 4h
**Story:** STORY-046

---

#### [STORY-047] Массовые операции с лидами (20+ действий)

**Как** Network Admin, **я хочу** выполнять массовые операции над выбранными лидами (resend, change status, export, block, tag, assign), **чтобы** обрабатывать сотни лидов за минуты, а не по одному.

**Acceptance Criteria:**
- [ ] AC1: Чекбокс в каждой строке + "Выбрать все на странице" + "Выбрать все по текущему фильтру"; при выборе > 0 строк появляется Bulk Actions Toolbar с количеством выбранных и доступными действиями
- [ ] AC2: Минимум 12 массовых действий: Resend (к другому брокеру), Change Status, Add Tags, Remove Tags, Add Comment, Export Selected (CSV/Excel), Block Leads, Unblock Leads, Assign to Manager, Move to UAD Pool, Delete (soft, с подтверждением 2FA), Change Affiliate Attribution
- [ ] AC3: Операции над > 100 лидами выполняются асинхронно: показывается progress bar, результат приходит через WebSocket/SSE; при ошибке на части лидов — partial success report: "Обработано 95/100, ошибки: 5" с возможностью скачать CSV ошибок
- [ ] AC4: Операция Delete требует ввода 2FA-кода или подтверждения через модальное окно с текстом "Удалить X лидов? Это действие необратимо"; максимум 1000 лидов за одну bulk-операцию; при попытке > 1000 — сообщение "Сузьте фильтры — максимум 1000 лидов за операцию"
- [ ] AC5: Все массовые операции логируются в audit log: user_id, action, lead_ids (массив), timestamp, result; доступ к bulk operations требует права `leads:bulk_actions`

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-040, STORY-042

**Tasks:**

**[TASK-0227]** Backend: POST /api/v1/leads/bulk-action endpoint
**Тип:** Backend
**Описание:** Endpoint принимает: `{ action: enum, lead_ids: UUID[] | null, filter: FilterObject | null, params: ActionParams }`. Если lead_ids — прямой массив (max 1000). Если filter — применяется фильтр и собирает ID (max 1000). Actions обрабатываются в background worker (Redis queue). Результат через WebSocket channel `bulk-action:{action_id}`.
**Критерии готовности (DoD):**
- [ ] 12 действий реализованы с валидацией params для каждого
- [ ] Background worker обрабатывает лиды пачками по 50 с commit каждые 50
- [ ] Partial failure: при ошибке на лиде — запись в errors[], продолжение обработки
- [ ] Audit log запись для каждой bulk-операции
**Оценка:** 16h
**Story:** STORY-047

**[TASK-0228]** Backend: WebSocket/SSE канал для progress bulk-операций
**Тип:** Backend
**Описание:** WebSocket endpoint /ws/bulk-actions/:action_id. Сообщения: `{ type: "progress", processed: number, total: number, errors: number }` каждые 50 лидов. Финальное сообщение: `{ type: "complete", processed: number, errors: Error[], csv_url: string | null }`. Timeout: 5 минут на операцию.
**Критерии готовности (DoD):**
- [ ] WebSocket автоматически переподключается при обрыве
- [ ] CSV с ошибками генерируется и доступен по signed URL (TTL 1 час)
- [ ] При timeout — операция помечается как "interrupted", обработанные лиды не откатываются
**Оценка:** 8h
**Story:** STORY-047

**[TASK-0229]** Frontend: BulkActionsToolbar + SelectionManager
**Тип:** Frontend
**Описание:** Toolbar: sticky bar внизу экрана при выборе > 0 строк. Показывает: "Выбрано: X", dropdown с действиями (grouped: "Управление", "Экспорт", "Опасные"), progress modal с прогресс-баром и логом. SelectionManager: хранит Set<UUID> в state, поддержка Shift+Click для range select.
**Критерии готовности (DoD):**
- [ ] Shift+Click выделяет диапазон строк
- [ ] "Выбрать все по фильтру" показывает баннер "Будет обработано ~X лидов"
- [ ] Опасные действия (Delete, Block) визуально выделены красным в dropdown
**Оценка:** 12h
**Story:** STORY-047

**[TASK-0230]** Frontend: BulkProgressModal с WebSocket
**Тип:** Frontend
**Описание:** Modal с progress bar, realtime log обработки, кнопка "Отмена" (отправляет cancel на WS, worker останавливается после текущего batch). По завершении: сводка + кнопка "Скачать ошибки (CSV)" если есть ошибки.
**Критерии готовности (DoD):**
- [ ] Progress bar обновляется в реальном времени (каждые 50 лидов)
- [ ] Кнопка "Отмена" останавливает обработку в течение 5 секунд
- [ ] При потере WebSocket — polling fallback (GET /api/v1/bulk-actions/:id/status каждые 3s)
**Оценка:** 8h
**Story:** STORY-047

**[TASK-0231]** QA: тестирование массовых операций
**Тип:** QA
**Описание:** Тесты: каждое из 12 действий на 1/10/100/1000 лидах, partial failure (брокер offline при resend), cancel в процессе, "выбрать все по фильтру", concurrent bulk operations, audit log записи.
**Критерии готовности (DoD):**
- [ ] 12 действий × 4 объёма = 48 тест-кейсов
- [ ] Partial failure report корректен: CSV содержит только ошибочные лиды
- [ ] Audit log содержит запись для каждой операции
**Оценка:** 8h
**Story:** STORY-047

---

#### [STORY-048] Экспорт лидов в CSV/Excel

**Как** Finance Manager, **я хочу** экспортировать лиды (текущий фильтр или выбранные) в CSV/Excel с выбором колонок, **чтобы** формировать отчёты для аффилейтов и брокеров.

**Acceptance Criteria:**
- [ ] AC1: Кнопка "Экспорт" доступна всегда (текущий фильтр) и в Bulk Actions Toolbar (выбранные); форматы: CSV (UTF-8 BOM для Excel-совместимости), XLSX; максимум 50,000 строк за один экспорт
- [ ] AC2: Перед экспортом — модальное окно выбора колонок (чекбоксы по группам, аналогично column picker); возможность использовать текущую конфигурацию таблицы; пресеты экспорта (сохраняемые, аналогично filter presets)
- [ ] AC3: Экспорт > 5,000 строк выполняется асинхронно: "Ваш файл формируется — уведомим когда будет готов"; файл доступен по signed URL (TTL 24 часа); уведомление через in-app notification + email
- [ ] AC4: Экспорт логируется в audit log: user_id, format, row_count, columns, filters, timestamp; доступ к экспорту требует права `leads:export`; при экспорте PII-данных (email, phone) — дополнительно требуется право `leads:export_pii`

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-042, STORY-041

**Tasks:**

**[TASK-0232]** Backend: POST /api/v1/leads/export endpoint
**Тип:** Backend
**Описание:** Endpoint принимает: `{ format: "csv" | "xlsx", columns: string[], filter: FilterObject | null, lead_ids: UUID[] | null }`. Для <= 5000 строк — синхронный ответ (streaming). Для > 5000 — async job, возвращает `{ job_id, status: "processing" }`. Файл генерируется в S3-совместимое хранилище, signed URL с TTL 24h.
**Критерии готовности (DoD):**
- [ ] CSV с UTF-8 BOM для корректного открытия в Excel
- [ ] XLSX генерируется через excelize или аналог; заголовки с автошириной
- [ ] Streaming: первый чанк отдаётся через < 1s; нет OOM при 50K строк
- [ ] Audit log запись при каждом экспорте
**Оценка:** 12h
**Story:** STORY-048

**[TASK-0233]** Frontend: ExportModal с выбором колонок и формата
**Тип:** Frontend
**Описание:** Modal: выбор формата (CSV/XLSX), column picker (reuse из STORY-041 с export-пресетами), preview первых 3 строк, кнопка "Экспортировать". Для async: прогресс-индикатор или "Файл будет готов — мы уведомим".
**Критерии готовности (DoD):**
- [ ] Preview показывает 3 строки с выбранными колонками (для валидации перед экспортом)
- [ ] Reuse column picker компонента (DRY)
- [ ] PII-warning: если выбраны email/phone и у пользователя нет `leads:export_pii` — колонки disabled с tooltip
**Оценка:** 8h
**Story:** STORY-048

**[TASK-0234]** QA: тестирование экспорта
**Тип:** QA
**Описание:** Тесты: CSV/XLSX с 0/100/5001/50000 строк, все 46 колонок, только 3 колонки, PII-ограничение, signed URL expiry, concurrent exports, UTF-8 символы (кириллица, арабский, emoji в данных).
**Критерии готовности (DoD):**
- [ ] CSV корректно открывается в Excel с кириллицей
- [ ] XLSX имеет автоширину колонок и заголовки
- [ ] Signed URL недоступен после 24 часов
**Оценка:** 4h
**Story:** STORY-048

---

#### [STORY-049] Saved Views — именованные конфигурации таблицы

**Как** Team Lead, **я хочу** сохранять полную конфигурацию вида таблицы (колонки + фильтры + сортировка) как именованный View, **чтобы** переключаться между рабочими контекстами в 1 клик.

**Acceptance Criteria:**
- [ ] AC1: View = комбинация: набор видимых колонок + их порядок/ширина + активные фильтры + сортировка + размер страницы; кнопка "Сохранить как View" над таблицей
- [ ] AC2: Табы Views отображаются горизонтально над таблицей (как вкладки в браузере); переключение между Views — 1 клик, загрузка < 300ms; максимум 15 Views на пользователя
- [ ] AC3: Дефолтные Views поставляются из коробки: "Все лиды", "Сегодняшние", "Fraud Review" (fraud score > 60), "Pending", "Converted (FTD)"; пользователь может скрыть дефолтные views
- [ ] AC4: Views можно sharing: "Личный" или "Командный" (аналогично filter presets); при обновлении командного View — все пользователи видят обновлённую версию

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-05
**Зависит от:** STORY-041, STORY-042, STORY-043

**Tasks:**

**[TASK-0235]** Backend: CRUD для Lead Views
**Тип:** Backend
**Описание:** Таблица `lead_views`: id, company_id, user_id, name, config (JSONB: columns, filters, sort, page_size), is_shared, is_default, position (для ordering), created_at, updated_at. Endpoints: POST/GET/PUT/DELETE /api/v1/lead-views. Дефолтные views seed при создании компании.
**Критерии готовности (DoD):**
- [ ] 5 дефолтных views создаются при onboarding компании
- [ ] Position поддерживает drag-and-drop reorder табов
- [ ] Лимит: 15 на пользователя; seed views не считаются
**Оценка:** 8h
**Story:** STORY-049

**[TASK-0236]** Frontend: ViewTabs + SaveViewModal
**Тип:** Frontend
**Описание:** Горизонтальные табы над таблицей. Активный таб подсвечен. "+" для создания нового View. Drag-and-drop reorder табов. Контекстное меню: Rename, Update, Duplicate, Share, Delete. SaveViewModal: имя, personal/team toggle.
**Критерии готовности (DoD):**
- [ ] Табы скроллятся горизонтально при > 6 табах (с overflow arrows)
- [ ] Дефолтные views отмечены иконкой lock (нельзя удалить, можно скрыть)
- [ ] При переключении таба — URL обновляется: /leads?view=view_id
**Оценка:** 8h
**Story:** STORY-049

**[TASK-0237]** QA: тестирование Saved Views
**Тип:** QA
**Описание:** Тесты: создание/удаление/rename view, переключение между views, shared view видимость, deep link на view, 15 views + попытка создать 16-й, дефолтные views при первом входе.
**Критерии готовности (DoD):**
- [ ] Deep link /leads?view=uuid корректно загружает конфигурацию
- [ ] Дефолтные views присутствуют при первом входе нового пользователя
**Оценка:** 4h
**Story:** STORY-049

---

#### [STORY-050] Realtime-обновление таблицы лидов

**Как** Media Buyer, **я хочу** чтобы таблица лидов обновлялась в реальном времени (новые лиды, смена статусов), **чтобы** видеть актуальную картину без ручного refresh.

**Acceptance Criteria:**
- [ ] AC1: Новые лиды, соответствующие текущему фильтру, появляются в таблице через WebSocket/SSE в течение < 2 секунд после создания; строка подсвечивается зелёным фоном на 3 секунды (fade-out анимация)
- [ ] AC2: Обновления статуса (sent → converted, pending → rejected и т.д.) отражаются в реальном времени; обновлённая строка подсвечивается жёлтым на 2 секунды; если лид перестал соответствовать фильтру — строка исчезает с fade-out
- [ ] AC3: При > 20 обновлений в секунду — batching: обновления накапливаются и применяются раз в 2 секунды; баннер "Высокий трафик — обновления каждые 2 сек"
- [ ] AC4: Кнопка "Live" / "Paused" позволяет временно остановить realtime-обновления (при анализе данных); при паузе > 5 минут — auto-resume с полным refresh; badge "X новых" рядом с кнопкой Paused

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-05
**Зависит от:** STORY-040

**Tasks:**

**[TASK-0238]** Backend: WebSocket channel для lead updates
**Тип:** Backend
**Описание:** WebSocket endpoint /ws/leads с подпиской по company_id. Сервер публикует события: `lead.created`, `lead.updated`, `lead.status_changed`. Payload: минимальный набор полей для обновления строки (не полный lead). Фильтрация на сервере: отправляются только события, релевантные текущему фильтру клиента (подписка с filter context).
**Критерии готовности (DoD):**
- [ ] Latency: от записи в БД до получения клиентом < 500ms
- [ ] Фильтрация на сервере: клиент подписывается с filter context, сервер отправляет только релевантные
- [ ] Graceful disconnect: при потере соединения — reconnect с replay missed events (buffer 60s)
**Оценка:** 12h
**Story:** STORY-050

**[TASK-0239]** Frontend: RealtimeManager + visual highlights
**Тип:** Frontend
**Описание:** Hook useLeadRealtime: подключение к WS, батчинг обновлений (если > 20/sec), применение к таблице. Highlight-анимации: зелёный для новых, жёлтый для обновлённых, fade-out для удалённых из фильтра. Live/Paused toggle в header таблицы.
**Критерии готовности (DoD):**
- [ ] Highlight-анимации не вызывают layout shift
- [ ] Live/Paused toggle сохраняет состояние в sessionStorage
- [ ] Badge "X новых" корректно считает пропущенные обновления в Paused режиме
**Оценка:** 8h
**Story:** STORY-050

**[TASK-0240]** QA: тестирование realtime-обновлений
**Тип:** QA
**Описание:** Тесты: 1 лид → появление за < 2s, burst 50 лидов → batching, pause → resume → refresh, потеря WS → reconnect, обновление статуса → highlight, лид вне фильтра не появляется.
**Критерии готовности (DoD):**
- [ ] Burst-тест: 50 лидов за 1 секунду обрабатываются без crash/freeze
- [ ] Reconnect-тест: отключение WS на 30 секунд → reconnect → missed events доставлены
**Оценка:** 4h
**Story:** STORY-050

---

#### [STORY-051] Сортировка таблицы по любой колонке

**Как** Affiliate Manager, **я хочу** сортировать таблицу по клику на заголовок любой колонки (asc/desc), **чтобы** быстро находить лиды по нужному критерию.

**Acceptance Criteria:**
- [ ] AC1: Клик на заголовок колонки переключает сортировку: none → asc → desc → none; иконка-стрелка показывает текущее направление; сортировка серверная (не клиентская)
- [ ] AC2: Поддержка multi-column sort (Shift+Click): до 3 колонок одновременно; порядок сортировки отображается цифрами (1, 2, 3) рядом со стрелками
- [ ] AC3: Время применения сортировки < 500ms при 1M записей (для индексированных колонок: created_at, status, country, affiliate_id, fraud_score, quality_score); для неиндексированных — < 2s с предупреждением "Сортировка по этому полю может быть медленной"
- [ ] AC4: Текущая сортировка отражается в URL query string (?sort=created_at:desc,status:asc) для deep linking и сохраняется в Views

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-05
**Зависит от:** STORY-040

**Tasks:**

**[TASK-0241]** Backend: параметры sort_by и sort_order в GET /api/v1/leads
**Тип:** Backend
**Описание:** Добавить query-параметр `sort`: comma-separated список `column:direction` (max 3). Валидация: column из whitelist, direction из {asc, desc}. Для неиндексированных колонок — установить query timeout 3s и вернуть 408 при превышении.
**Критерии готовности (DoD):**
- [ ] Multi-sort работает корректно: ORDER BY col1 ASC, col2 DESC, col3 ASC
- [ ] Невалидная колонка → 400 с описанием допустимых колонок
- [ ] Timeout для медленных сортировок → 408 Request Timeout
**Оценка:** 4h
**Story:** STORY-051

**[TASK-0242]** Frontend: SortableHeader + multi-sort
**Тип:** Frontend
**Описание:** Компонент SortableHeader: клик → toggle direction, Shift+Click → add to multi-sort. Иконка стрелки + цифра приоритета для multi-sort. Синхронизация с URL.
**Критерии готовности (DoD):**
- [ ] Visual indicator для направления и приоритета сортировки
- [ ] URL обновляется при изменении сортировки
- [ ] Tooltip: "Shift+Click для мульти-сортировки"
**Оценка:** 4h
**Story:** STORY-051

---

---

## [EPIC-06] User Accounts & RBAC

**Цель:** Обеспечить безопасный доступ к платформе через JWT-аутентификацию, гранулярные роли и права, 2FA, multi-company изоляцию — защитив данные клиентов и обеспечив соответствие требованиям enterprise-клиентов.

**Метрика успеха:**
- 100% API-запросов проверяются через RBAC middleware (ноль unprotected endpoints)
- Время аутентификации (login → dashboard) < 2 секунд
- 0 инцидентов утечки данных между компаниями (multi-tenant isolation)

**Приоритет:** P0 (MVP)
**Зависит от:** нет (фундаментальный эпик)
**Оценка:** XL (3+ мес)

---

### Stories:

---

#### [STORY-052] Регистрация и создание компании

**Как** Network Admin, **я хочу** зарегистрировать аккаунт и создать компанию (workspace), **чтобы** начать использовать платформу и приглашать команду.

**Acceptance Criteria:**
- [ ] AC1: Форма регистрации: email (уникальный, валидация RFC 5322), пароль (min 10 символов, min 1 uppercase, 1 lowercase, 1 digit, 1 special char), company name (2-100 chars UTF-8), full name (2-100 chars); email confirmation через OTP-код (6 цифр, TTL 15 мин, max 3 попытки)
- [ ] AC2: При регистрации создаётся: аккаунт пользователя (роль Super Admin), компания (workspace) с уникальным slug, дефолтные настройки (timezone UTC, language EN); процесс занимает < 3 секунд от отправки формы до landing на dashboard
- [ ] AC3: Защита от автоматизации: rate limit 5 регистраций / IP / час; Google reCAPTCHA v3 (score threshold 0.5); при блокировке — сообщение "Слишком много попыток — попробуйте через 1 час"
- [ ] AC4: Email уже зарегистрирован → сообщение "Аккаунт с таким email уже существует" (без раскрытия информации о компании); SQL injection / XSS в полях формы → sanitization, не ошибка

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-06

**Tasks:**

**[TASK-0243]** Backend: POST /api/v1/auth/register endpoint
**Тип:** Backend
**Описание:** Endpoint создаёт user + company в одной транзакции. Password hashing: bcrypt, cost factor 12. Email OTP: генерация 6-значного кода, хранение в Redis (TTL 15 min, max 3 attempts). Response: `{ user_id, company_id, requires_email_verification: true }`. Таблицы: users, companies, user_company_roles.
**Критерии готовности (DoD):**
- [ ] Транзакция: если создание компании fails → user тоже откатывается
- [ ] Пароль никогда не логируется и не возвращается в response
- [ ] Rate limit: 5 registrations per IP per hour (Redis counter)
- [ ] Email uniqueness: case-insensitive (LOWER index)
**Оценка:** 12h
**Story:** STORY-052

**[TASK-0244]** Backend: POST /api/v1/auth/verify-email endpoint
**Тип:** Backend
**Описание:** Endpoint принимает: `{ email, code }`. Проверяет OTP из Redis. При успехе: user.email_verified = true, выдаёт JWT access + refresh tokens. При ошибке: декрементирует attempts, при 0 — блокирует код.
**Критерии готовности (DoD):**
- [ ] OTP валидация timing-safe (constant-time comparison)
- [ ] После 3 неудачных попыток — код инвалидируется, нужен новый
- [ ] Лог: email_verified event в audit log
**Оценка:** 4h
**Story:** STORY-052

**[TASK-0245]** Frontend: RegistrationForm + EmailVerification
**Тип:** Frontend
**Описание:** 2-step form: Step 1 — данные регистрации (inline validation), Step 2 — email verification (OTP input с auto-focus на следующий input, resend button с cooldown 60s). reCAPTCHA v3 invisible. Success → redirect to dashboard.
**Критерии готовности (DoD):**
- [ ] Inline validation: password strength indicator (weak/medium/strong)
- [ ] OTP input: 6 полей, auto-advance, paste support (вставка 6 цифр)
- [ ] Resend button: disabled на 60s с countdown таймером
**Оценка:** 8h
**Story:** STORY-052

**[TASK-0246]** Backend: Email-сервис для отправки OTP
**Тип:** Backend
**Описание:** Сервис отправки email через SMTP (AWS SES / SendGrid). Шаблон: "Ваш код подтверждения: {code}. Действителен 15 минут." Rate limit: 3 emails per address per hour. Queue через Redis для async отправки.
**Критерии готовности (DoD):**
- [ ] Email отправляется < 5s после запроса
- [ ] Шаблон — HTML + plaintext fallback
- [ ] Retry: 3 попытки с exponential backoff при ошибке SMTP
**Оценка:** 8h
**Story:** STORY-052

**[TASK-0247]** Design: Registration flow wireframes
**Тип:** Design
**Описание:** Wireframes: registration form, email verification, success state. Mobile-first. Error states: duplicate email, weak password, expired OTP, too many attempts.
**Критерии готовности (DoD):**
- [ ] Desktop + mobile wireframes утверждены
- [ ] Error states для каждого поля задокументированы
**Оценка:** 4h
**Story:** STORY-052

**[TASK-0248]** QA: тестирование регистрации
**Тип:** QA
**Описание:** Тесты: happy path, duplicate email, weak password, expired OTP, max attempts, rate limit, SQL injection в email, XSS в company name, reCAPTCHA bypass attempt.
**Критерии готовности (DoD):**
- [ ] Security tests: SQL injection, XSS, CSRF — все отклонены без server error
- [ ] Rate limit test: 6-я регистрация с того же IP → 429
**Оценка:** 4h
**Story:** STORY-052

---

#### [STORY-053] Аутентификация через JWT + refresh tokens

**Как** Affiliate Manager, **я хочу** безопасно входить в систему и оставаться авторизованным без частого перелогина, **чтобы** работать в течение рабочего дня без прерываний.

**Acceptance Criteria:**
- [ ] AC1: Login endpoint: POST /api/v1/auth/login; body: `{ email, password }`; response: `{ access_token (JWT, TTL 15 min), refresh_token (opaque, TTL 30 days), user: { id, name, email, role, company } }`; access_token содержит: user_id, company_id, role, permissions[], exp, iat
- [ ] AC2: Refresh endpoint: POST /api/v1/auth/refresh; body: `{ refresh_token }`; выдаёт новую пару access+refresh; старый refresh_token инвалидируется (rotation); при использовании уже rotated token — все tokens пользователя инвалидируются (breach detection)
- [ ] AC3: Brute-force protection: после 5 неудачных попыток login для email — блокировка на 15 минут (прогрессивная: 15min → 30min → 1h → 24h); при блокировке — email-уведомление владельцу аккаунта; response не должен раскрывать существует ли email ("Неверный email или пароль")
- [ ] AC4: Logout: POST /api/v1/auth/logout; инвалидирует refresh_token; access_token остаётся валидным до истечения (stateless), но добавляется в Redis blacklist (TTL = remaining lifetime); Logout All Devices: POST /api/v1/auth/logout-all — инвалидирует все refresh_tokens пользователя

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-06

**Tasks:**

**[TASK-0249]** Backend: JWT-сервис (issue, verify, refresh, blacklist)
**Тип:** Backend
**Описание:** JWT signing: RS256 (asymmetric keys, rotation quarterly). Claims: sub, company_id, role, permissions[], exp, iat, jti. Access token TTL: 15 min. Refresh tokens: хранение в таблице `refresh_tokens` (id, user_id, token_hash, expires_at, created_at, revoked_at). Blacklist: Redis SET с TTL = token remaining lifetime.
**Критерии готовности (DoD):**
- [ ] RS256 signing с rotatable keys (key ID в header)
- [ ] Refresh token rotation: старый token помечается revoked; повторное использование revoked → revoke all
- [ ] Blacklist lookup добавляет < 1ms к request latency
- [ ] Token не содержит PII (только IDs и roles)
**Оценка:** 16h
**Story:** STORY-053

**[TASK-0250]** Backend: POST /api/v1/auth/login с brute-force protection
**Тип:** Backend
**Описание:** Login endpoint: email → user lookup (case-insensitive), bcrypt verify, JWT issue. Brute-force: Redis counter `login_attempts:{email}` (TTL 15 min), progressive lockout. Email notification при блокировке (через notification service queue).
**Критерии готовности (DoD):**
- [ ] Timing-safe: время ответа одинаково для существующего и несуществующего email (bcrypt dummy hash)
- [ ] Progressive lockout: 5 attempts → 15min, 10 → 30min, 15 → 1h, 20+ → 24h
- [ ] Audit log: login_success, login_failed, account_locked events
**Оценка:** 8h
**Story:** STORY-053

**[TASK-0251]** Frontend: LoginForm + auto-refresh logic
**Тип:** Frontend
**Описание:** Login form: email + password + "Remember me" checkbox. Access token в memory (не localStorage). Refresh token в httpOnly cookie (SameSite=Strict). Axios interceptor: при 401 → автоматический refresh → retry original request; при refresh fail → redirect to login.
**Критерии готовности (DoD):**
- [ ] Access token никогда не сохраняется в localStorage/sessionStorage
- [ ] Auto-refresh прозрачен для пользователя (нет видимого logout/login)
- [ ] "Remember me" = refresh token TTL 30 days (vs 24h без)
**Оценка:** 8h
**Story:** STORY-053

**[TASK-0252]** QA: тестирование аутентификации
**Тип:** QA
**Описание:** Тесты: login success, wrong password, non-existent email, brute-force lockout (5 attempts), token refresh, expired access token, revoked refresh token, breach detection (reused rotated token), logout, logout all, concurrent sessions.
**Критерии готовности (DoD):**
- [ ] Breach detection: reuse rotated token → все sessions revoked → user получает email
- [ ] Timing test: login с существующим vs несуществующим email — разница < 50ms
**Оценка:** 8h
**Story:** STORY-053

---

#### [STORY-054] Ролевая модель (7 ролей)

**Как** Network Admin, **я хочу** назначать пользователям роли с предустановленными наборами прав, **чтобы** каждый член команды имел доступ только к необходимым функциям.

**Acceptance Criteria:**
- [ ] AC1: 7 предустановленных ролей: Super Admin (полный доступ, управление компанией), Network Admin (управление аффилейтами/брокерами/роутингом, без billing), Affiliate Manager (управление своими аффилейтами, просмотр лидов), Media Buyer (просмотр своих лидов и статистики, без конфигурации), Team Lead (просмотр данных команды, отчёты), Finance Manager (P&L, payouts, invoices, без lead management), Developer (read-only API, webhook logs, integration testing)
- [ ] AC2: Каждая роль имеет набор permissions из 35+ гранулярных прав: leads:read, leads:write, leads:export, leads:export_pii, leads:bulk_actions, leads:delete, leads:manage_comments, leads:manage_presets, affiliates:read, affiliates:write, affiliates:delete, brokers:read, brokers:write, routing:read, routing:write, fraud:read, fraud:configure, analytics:read, analytics:export, users:read, users:write, users:invite, roles:manage, company:settings, billing:read, billing:manage, audit:read, api_keys:manage, notifications:configure, integrations:read, integrations:write, integrations:test, views:manage_shared, export:pii
- [ ] AC3: Super Admin может создавать custom roles (комбинация permissions); максимум 20 custom roles на компанию; custom role не может иметь permissions выше Super Admin
- [ ] AC4: Смена роли пользователя вступает в силу немедленно (текущий access token будет отклонён при следующем запросе — permissions в token cache обновляются через Redis pub/sub); audit log записывает: кто, кому, какую роль назначил

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-06

**Tasks:**

**[TASK-0253]** Backend: таблицы ролей, permissions, RBAC middleware
**Тип:** Backend
**Описание:** Таблицы: roles (id, company_id, name, is_system, created_at), role_permissions (role_id, permission), permissions (name, category, description). RBAC middleware: извлекает permissions из JWT claims, проверяет required permission для endpoint. Системные роли — seed при создании компании (immutable). Кэш permissions в Redis (TTL 5 min, invalidation через pub/sub при role change).
**Критерии готовности (DoD):**
- [ ] 7 системных ролей с предустановленными permissions создаются при seed
- [ ] Middleware проверяет permissions за < 1ms (Redis lookup)
- [ ] Role change → Redis pub/sub → все инстансы обновляют cache < 1s
- [ ] 35+ permissions покрывают все endpoints системы
**Оценка:** 16h
**Story:** STORY-054

**[TASK-0254]** Backend: CRUD для custom roles
**Тип:** Backend
**Описание:** Endpoints: POST /api/v1/roles (создать custom role), PUT /api/v1/roles/:id (обновить permissions), DELETE /api/v1/roles/:id (удалить — если нет пользователей с этой ролью). Валидация: permissions из допустимого списка; custom role не может включать `company:delete` или `roles:super_admin`.
**Критерии готовности (DoD):**
- [ ] Лимит 20 custom roles на компанию; при превышении → 429
- [ ] Удаление роли с назначенными пользователями → 409 Conflict с описанием
- [ ] Системные роли нельзя редактировать/удалять → 403
**Оценка:** 8h
**Story:** STORY-054

**[TASK-0255]** Frontend: RolesManagement page
**Тип:** Frontend
**Описание:** Страница /settings/roles: список ролей (системные + custom), для каждой — количество пользователей, кнопки Edit/Delete. При создании/редактировании — permission matrix: строки = categories (Leads, Affiliates, Brokers...), колонки = actions (Read, Write, Delete, Export). Чекбоксы с "Check All" per row/column.
**Критерии готовности (DoD):**
- [ ] Permission matrix наглядно показывает разницу между ролями
- [ ] Системные роли: view-only (кнопка Edit disabled, tooltip "Системная роль")
- [ ] При удалении роли — confirmation modal с количеством affected пользователей
**Оценка:** 12h
**Story:** STORY-054

**[TASK-0256]** QA: тестирование RBAC
**Тип:** QA
**Описание:** Тесты: каждая из 7 ролей × 10 ключевых endpoints = 70 тест-кейсов (access granted / denied). Custom role: создание, назначение, удаление. Privilege escalation attempt: Media Buyer пытается создать Super Admin → 403.
**Критерии готовности (DoD):**
- [ ] 70 access control тест-кейсов покрывают все роли × критические endpoints
- [ ] Privilege escalation: 5 сценариев (edit own role, create admin role, access other company, etc.)
**Оценка:** 8h
**Story:** STORY-054

---

#### [STORY-055] Per-column permissions (дифференциатор)

**Как** Network Admin, **я хочу** настраивать видимость конкретных колонок таблицы лидов для каждой роли, **чтобы** скрывать конфиденциальные данные (email, phone, broker name) от аффилейтов и Media Buyers.

**Acceptance Criteria:**
- [ ] AC1: Для каждой роли (включая custom) можно настроить column-level permissions: visible / hidden / masked (показывает "j***@email.com" для email, "+7***...89" для phone); настраивается в UI через матрицу роль × колонка
- [ ] AC2: Column permissions проверяются на backend: скрытые колонки не включаются в API response; masked колонки возвращают маскированные значения; попытка запросить скрытую колонку напрямую (через query param) → колонка игнорируется (не ошибка, но не возвращается)
- [ ] AC3: Дефолтные column permissions для ролей: Super Admin/Network Admin — all visible; Affiliate Manager — broker name hidden; Media Buyer — email masked, phone masked, broker hidden; Team Lead — all visible кроме PII (masked); Finance Manager — PII hidden; Developer — all masked
- [ ] AC4: Экспорт (CSV/Excel) учитывает column permissions: скрытые колонки не экспортируются; masked колонки экспортируются в маскированном виде; export_pii permission overrides masking для авторизованных ролей

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-06
**Зависит от:** STORY-054, STORY-041

**Tasks:**

**[TASK-0257]** Backend: column-level permission middleware
**Тип:** Backend
**Описание:** Таблица `role_column_permissions`: role_id, column_key, access_level (enum: visible/hidden/masked). Middleware: после формирования response — фильтрация полей по column permissions роли пользователя. Masking functions: email → "j***@email.com", phone → "+7***...89" (сохраняя первые 2 и последние 2 символа), IP → "192.168.***".
**Критерии готовности (DoD):**
- [ ] Middleware добавляет < 5ms к response time (permissions в Redis cache)
- [ ] Masking не сломана: email без @ → полная маскировка "***"
- [ ] Column permissions учитываются в API ответах, экспорте и WebSocket
**Оценка:** 12h
**Story:** STORY-055

**[TASK-0258]** Frontend: ColumnPermissions matrix в настройках ролей
**Тип:** Frontend
**Описание:** Расширение RolesManagement: таб "Column Permissions" с матрицей 46 колонок × access level (radio: visible/masked/hidden). Bulk actions: "Show All", "Mask All PII", "Hide All". Preview: пример строки таблицы с текущими настройками.
**Критерии готовности (DoD):**
- [ ] Матрица группирует колонки по категориям (аналогично column picker)
- [ ] Preview показывает реалистичный пример с masking
- [ ] Bulk PII masking: 1 клик маскирует email, phone, IP, name
**Оценка:** 8h
**Story:** STORY-055

**[TASK-0259]** QA: тестирование column permissions
**Тип:** QA
**Описание:** Тесты: каждый access level × 5 PII-колонок × 7 ролей = 105 комбинаций (sampling 30). Экспорт с masked данными. API direct request к hidden column. WebSocket updates с column filtering.
**Критерии готовности (DoD):**
- [ ] 30 access control тестов на column level
- [ ] Экспорт: masked колонки экспортируются маскированно
- [ ] WebSocket: скрытые поля не утекают через realtime updates
**Оценка:** 8h
**Story:** STORY-055

---

#### [STORY-056] Двухфакторная аутентификация (2FA)

**Как** Network Admin, **я хочу** включить 2FA (TOTP) для своего аккаунта и обязать 2FA для всей компании, **чтобы** защитить доступ к платформе с конфиденциальными данными.

**Acceptance Criteria:**
- [ ] AC1: Настройка 2FA: пользователь включает TOTP через Settings → Security → Enable 2FA; показывается QR-код (otpauth:// URI) для Google Authenticator / Authy / 1Password; после сканирования — ввод кода для подтверждения; генерация 10 recovery codes (одноразовых, 8 символов alphanumeric)
- [ ] AC2: Login с 2FA: после email+password — дополнительный шаг ввода 6-значного TOTP-кода; TTL кода: 30 секунд; допускается сдвиг ±1 окно (90 секунд); recovery code принимается вместо TOTP (одноразовый, после использования — недоступен)
- [ ] AC3: Company-wide 2FA policy: Super Admin может установить "2FA обязательна для всех"; при включении — пользователи без 2FA при следующем login перенаправляются на настройку 2FA; до настройки — доступ заблокирован
- [ ] AC4: Отключение 2FA: требует ввод текущего TOTP-кода; Super Admin может отключить 2FA для другого пользователя (с audit log записью и email-уведомлением пользователю); recovery codes: можно перегенерировать (старые инвалидируются)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-06
**Зависит от:** STORY-053

**Tasks:**

**[TASK-0260]** Backend: TOTP сервис (setup, verify, recovery codes)
**Тип:** Backend
**Описание:** Таблица `user_2fa`: user_id, secret (encrypted AES-256), is_enabled, recovery_codes (encrypted JSONB), created_at. TOTP: RFC 6238, SHA1, 6 digits, 30s period. Setup: POST /api/v1/auth/2fa/setup → `{ secret, qr_url, recovery_codes }`. Verify: POST /api/v1/auth/2fa/verify → `{ code }`. Secret хранится encrypted at rest (AES-256-GCM).
**Критерии готовности (DoD):**
- [ ] TOTP verification: допускается ±1 time window (drift tolerance)
- [ ] Recovery codes: 10 штук, 8 chars alphanumeric, bcrypt-hashed, одноразовые
- [ ] Secret encrypted at rest; decryption key из environment variable
- [ ] Rate limit verify: 5 attempts per minute
**Оценка:** 12h
**Story:** STORY-056

**[TASK-0261]** Backend: 2FA enforcement policy
**Тип:** Backend
**Описание:** Таблица companies: add column `require_2fa` (boolean). Middleware: если company.require_2fa && !user.2fa_enabled → response 403 с `{ error: "2fa_required", redirect: "/settings/security/2fa" }`. Endpoint: PUT /api/v1/company/settings/2fa-policy.
**Критерии готовности (DoD):**
- [ ] При включении policy — все текущие sessions продолжают работать, но при refresh token → force 2FA setup
- [ ] API-only users (Developer role) тоже подпадают под policy
**Оценка:** 4h
**Story:** STORY-056

**[TASK-0262]** Frontend: 2FA setup wizard + login 2FA step
**Тип:** Frontend
**Описание:** Settings → Security: 2FA toggle, QR code display (qrcode.js), code input field, recovery codes display (with "Скачать" / "Скопировать" buttons, warning "Сохраните коды — они показываются один раз"). Login: дополнительный step с code input и ссылкой "Использовать recovery code".
**Критерии готовности (DoD):**
- [ ] QR-код генерируется client-side из secret (не серверный рендер)
- [ ] Recovery codes: "Скачать .txt" и "Скопировать" кнопки
- [ ] Force 2FA setup: при policy enforcement — modal без возможности закрыть
**Оценка:** 8h
**Story:** STORY-056

**[TASK-0263]** QA: тестирование 2FA
**Тип:** QA
**Описание:** Тесты: setup 2FA, login с TOTP, login с recovery code, wrong code × 5, отключение 2FA, company-wide enforcement, recovery code reuse (должен быть отклонён), time drift (±30s).
**Критерии готовности (DoD):**
- [ ] Recovery code одноразовый: повторное использование → rejected
- [ ] Time drift ±30s: код с предыдущего/следующего окна принимается
- [ ] Company enforcement: user без 2FA → forced setup при login
**Оценка:** 4h
**Story:** STORY-056

---

#### [STORY-057] Multi-tenant изоляция (компании/workspaces)

**Как** Network Admin, **я хочу** чтобы данные моей компании были полностью изолированы от других компаний на платформе, **чтобы** гарантировать конфиденциальность лидов, конфигураций и финансовой информации.

**Acceptance Criteria:**
- [ ] AC1: Каждая таблица с бизнес-данными содержит `company_id` (NOT NULL, FK); все SQL-запросы фильтруются через tenant middleware (`WHERE company_id = $current_company_id`); Row-Level Security (RLS) в PostgreSQL как дополнительный защитный слой
- [ ] AC2: Кросс-tenant доступ невозможен: попытка доступа к lead/affiliate/broker другой компании → 404 (не 403, чтобы не раскрывать существование ресурса); RLS policy: `USING (company_id = current_setting('app.current_company_id')::uuid)`
- [ ] AC3: Пользователь может быть членом нескольких компаний (multi-org): переключение между компаниями через dropdown в header; при переключении — новая пара JWT tokens с другим company_id; данные предыдущей компании полностью недоступны
- [ ] AC4: Поисковые индексы, кэши (Redis), очереди (background jobs) — все partitioned по company_id; Redis keys: `{company_id}:leads:cache:*`; background job payload всегда содержит company_id для tenant context

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-06

**Tasks:**

**[TASK-0264]** Backend: Tenant middleware + RLS policies
**Тип:** Backend
**Описание:** Middleware: извлекает company_id из JWT, устанавливает SET LOCAL 'app.current_company_id' для PostgreSQL session. RLS policies на таблицах: leads, affiliates, brokers, routing_rules, fraud_profiles, и др. Migration: CREATE POLICY tenant_isolation ON leads USING (company_id = current_setting('app.current_company_id')::uuid).
**Критерии готовности (DoD):**
- [ ] RLS включен на всех таблицах с бизнес-данными (>= 15 таблиц)
- [ ] Тест: прямой SQL без SET company_id → 0 rows (не ошибка, не утечка)
- [ ] Middleware устанавливает tenant context для каждого request/background job
- [ ] Performance: RLS overhead < 5ms на запрос (проверить EXPLAIN ANALYZE)
**Оценка:** 16h
**Story:** STORY-057

**[TASK-0265]** Backend: Multi-org membership + company switch
**Тип:** Backend
**Описание:** Таблица `user_companies`: user_id, company_id, role_id, joined_at, is_active. Endpoint: POST /api/v1/auth/switch-company `{ company_id }` → новая пара JWT tokens с новым company_id. Endpoint: GET /api/v1/users/me/companies → список компаний пользователя.
**Критерии готовности (DoD):**
- [ ] Switch company выдаёт НОВЫЕ tokens (не модифицирует существующие)
- [ ] Роль может различаться в разных компаниях (admin в одной, viewer в другой)
- [ ] Audit log: company_switched event с from/to company_id
**Оценка:** 8h
**Story:** STORY-057

**[TASK-0266]** Frontend: CompanySwitcher в header
**Тип:** Frontend
**Описание:** Dropdown в header: текущая компания (logo + name), список других компаний пользователя. При выборе — API call switch-company, обновление tokens, full page refresh (для очистки state). Badge "N" на dropdown если пользователь в нескольких компаниях.
**Критерии готовности (DoD):**
- [ ] Full page reload при switch (гарантирует очистку кэшей/state)
- [ ] Текущая компания выделена чекмарком
- [ ] При единственной компании — dropdown не показывается
**Оценка:** 4h
**Story:** STORY-057

**[TASK-0267]** QA: тестирование tenant isolation
**Тип:** QA
**Описание:** Тесты: доступ к lead другой компании → 404, RLS bypass attempt через raw SQL, company switch → данные изменились, redis cache isolation, background job tenant context, multi-org user с разными ролями.
**Критерии готовности (DoD):**
- [ ] Penetration-like тест: 10 сценариев cross-tenant access → все отклонены (404)
- [ ] Company switch: после switch — ни один элемент предыдущей компании не видим
**Оценка:** 8h
**Story:** STORY-057

---

#### [STORY-058] Управление пользователями и приглашения

**Как** Network Admin, **я хочу** приглашать новых пользователей в компанию по email, назначать роли и управлять активными аккаунтами, **чтобы** контролировать команду и доступ к платформе.

**Acceptance Criteria:**
- [ ] AC1: Приглашение: ввод email + выбор роли → отправка invite email со ссылкой (signed JWT, TTL 72 часа); если email уже зарегистрирован на платформе — пользователь добавляется в компанию без повторной регистрации; если нет — redirect на регистрацию с привязкой к компании
- [ ] AC2: Страница Users: таблица пользователей компании (name, email, role, status, last_login, 2FA status, invited_by); статусы: active, invited (pending), suspended, deactivated; фильтрация по role и status
- [ ] AC3: Действия: Resend Invite, Change Role, Suspend (блокирует login, инвалидирует все tokens), Reactivate, Remove from Company; массовые действия: Suspend Selected, Change Role Selected; максимум 100 пользователей на компанию (Starter), 500 (Pro), unlimited (Enterprise)
- [ ] AC4: Все действия логируются в audit log; пользователь не может изменить свою роль или удалить себя; Super Admin не может быть suspend/removed другим Super Admin (только self-deactivate или сначала передать роль)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-06
**Зависит от:** STORY-052, STORY-054

**Tasks:**

**[TASK-0268]** Backend: Invite system (create, accept, resend, cancel)
**Тип:** Backend
**Описание:** Таблица `invitations`: id, company_id, email, role_id, invited_by, token_hash, status (pending/accepted/expired/cancelled), created_at, expires_at. Endpoints: POST /api/v1/invitations (create), POST /api/v1/invitations/:token/accept, POST /api/v1/invitations/:id/resend, DELETE /api/v1/invitations/:id. Invite token: signed JWT с company_id + role_id + email.
**Критерии готовности (DoD):**
- [ ] Invite email: "Вас пригласили в {company_name} как {role_name}" + кнопка "Принять"
- [ ] Accept: если пользователь существует — добавляет в компанию; если нет — redirect на register
- [ ] Expired invite (> 72h) → 410 Gone с кнопкой "Запросить новое приглашение"
**Оценка:** 12h
**Story:** STORY-058

**[TASK-0269]** Frontend: UserManagement page
**Тип:** Frontend
**Описание:** Страница /settings/users: таблица пользователей, кнопка "Пригласить", inline role change (dropdown), status badges, action buttons (Suspend, Remove). Invite modal: email input (multiple через comma), role dropdown, send button.
**Критерии готовности (DoD):**
- [ ] Bulk invite: ввод нескольких email через запятую (max 10 за раз)
- [ ] Inline role change: dropdown в таблице, confirmation при изменении
- [ ] Last login показывает relative time ("2 часа назад", "3 дня назад")
**Оценка:** 8h
**Story:** STORY-058

**[TASK-0270]** QA: тестирование user management
**Тип:** QA
**Описание:** Тесты: invite new user, invite existing user, accept invite, expired invite, resend, suspend + token invalidation, reactivate, remove, user limit per plan, self-role-change attempt, Super Admin protection.
**Критерии готовности (DoD):**
- [ ] Suspended user: все текущие sessions немедленно инвалидированы
- [ ] Self-modification: user не может change own role / remove self
**Оценка:** 4h
**Story:** STORY-058

---

#### [STORY-059] IP Whitelist per account

**Как** Network Admin, **я хочу** настроить IP whitelist для каждого пользователя или для всей компании, **чтобы** ограничить доступ только с доверенных IP-адресов (офис, VPN).

**Acceptance Criteria:**
- [ ] AC1: Настройка IP whitelist: per-user (Settings → Security → IP Whitelist) и per-company (Company Settings → Security); поддержка: IPv4, IPv6, CIDR нотация (/24, /16 и т.д.); максимум 50 IP/CIDR записей на пользователя, 200 на компанию
- [ ] AC2: При включённом whitelist: login с не-whitelisted IP → 403 "Доступ с этого IP заблокирован. Обратитесь к администратору."; текущие sessions с не-whitelisted IP инвалидируются в течение 5 минут (через background check)
- [ ] AC3: Company-level whitelist: все пользователи компании подпадают под ограничение; per-user whitelist ДОПОЛНЯЕТ company whitelist (union); Super Admin может установить "IP whitelist обязателен для всех"
- [ ] AC4: Emergency: Super Admin может временно отключить свой IP whitelist через email-confirmation (OTP, TTL 15 min); это для случаев когда admin заблокировал себя; audit log записывает каждую bypass-операцию

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-06
**Зависит от:** STORY-053

**Tasks:**

**[TASK-0271]** Backend: IP whitelist service + middleware
**Тип:** Backend
**Описание:** Таблица `ip_whitelists`: id, entity_type (user/company), entity_id, ip_cidr (cidr type в PostgreSQL), label, created_at. Middleware: после JWT validation — проверяет request IP против whitelist (user + company). Используется `inet` / `cidr` типы PostgreSQL для native CIDR matching. Redis cache whitelist per user (TTL 5 min).
**Критерии готовности (DoD):**
- [ ] CIDR matching корректен для /8, /16, /24, /32 (IPv4) и /48, /64, /128 (IPv6)
- [ ] Check latency < 2ms (Redis cached)
- [ ] Background job: каждые 5 минут проверяет active sessions vs whitelist, kills violating
**Оценка:** 8h
**Story:** STORY-059

**[TASK-0272]** Frontend: IPWhitelist settings UI
**Тип:** Frontend
**Описание:** Settings → Security → IP Whitelist: таблица записей (IP/CIDR, label, added date), кнопка "Добавить IP", inline edit, delete. Input validation: IPv4/IPv6/CIDR format. "Мой текущий IP" button (auto-detect). Warning при включении: "Вы будете заблокированы если ваш текущий IP не в списке".
**Критерии готовности (DoD):**
- [ ] "Мой текущий IP" автоматически подставляет IP пользователя
- [ ] Warning при пустом whitelist: "Внимание: пустой whitelist заблокирует все подключения"
- [ ] Валидация CIDR в реальном времени с preview диапазона ("192.168.1.0/24 = 256 адресов")
**Оценка:** 4h
**Story:** STORY-059

**[TASK-0273]** QA: тестирование IP whitelist
**Тип:** QA
**Описание:** Тесты: add IP, login from whitelisted IP, login from non-whitelisted → 403, CIDR matching, company + user union, emergency bypass, IPv6, background session invalidation.
**Критерии готовности (DoD):**
- [ ] Non-whitelisted IP → 403 (не 401, не timeout)
- [ ] Emergency bypass через email OTP работает в < 30 секунд
**Оценка:** 4h
**Story:** STORY-059

---

#### [STORY-060] Audit Log

**Как** Network Admin, **я хочу** просматривать полный лог действий всех пользователей системы, **чтобы** расследовать инциденты, отслеживать изменения конфигурации и обеспечивать compliance.

**Acceptance Criteria:**
- [ ] AC1: Логируемые события (минимум 25 типов): auth (login, logout, login_failed, 2fa_enabled, 2fa_disabled, password_changed), users (invited, role_changed, suspended, removed), leads (created, updated, deleted, exported, bulk_action), affiliates (created, updated, deleted, api_key_rotated), brokers (created, updated, deleted), routing (rule_created, rule_updated, rule_deleted), fraud (profile_created, threshold_changed), settings (company_settings_changed, ip_whitelist_changed)
- [ ] AC2: Каждая запись: id, company_id, user_id, action (enum), entity_type, entity_id, changes (JSONB diff: { field: { old: value, new: value } }), ip_address, user_agent, timestamp; отображение в хронологическом порядке с пагинацией
- [ ] AC3: Фильтры: по пользователю, по типу действия (category), по entity, по дате; поиск по entity_id; время хранения: 365 дней (не удаляемые пользователем); экспорт в CSV
- [ ] AC4: Audit log immutable: записи нельзя редактировать или удалить через UI или API; таблица в PostgreSQL с `REVOKE DELETE, UPDATE ON audit_log FROM app_user`; доступ к audit log: только роли с правом `audit:read`

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-06
**Зависит от:** STORY-054

**Tasks:**

**[TASK-0274]** Backend: Audit log service + event publisher
**Тип:** Backend
**Описание:** Таблица `audit_log`: id (BIGSERIAL), company_id, user_id, action (VARCHAR 50), entity_type, entity_id, changes (JSONB), ip_address (INET), user_agent (TEXT), created_at (TIMESTAMPTZ). Partitioned по месяцам (RANGE partition на created_at). Event publisher: AuditLogger.Log(ctx, action, entity, changes) — вызывается из service layer. Async write через channel/queue (не блокирует основной flow).
**Критерии готовности (DoD):**
- [ ] REVOKE DELETE, UPDATE на audit_log для application user
- [ ] Partitioning: автоматическое создание partition на следующий месяц (cron job)
- [ ] Async write: audit log не влияет на response time основных endpoints (< 1ms overhead)
- [ ] 25+ типов событий покрыты
**Оценка:** 12h
**Story:** STORY-060

**[TASK-0275]** Backend: GET /api/v1/audit-log с фильтрацией
**Тип:** Backend
**Описание:** Endpoint: GET /api/v1/audit-log. Query params: user_id, action, entity_type, entity_id, date_from, date_to, page, limit. Response: `{ data: AuditEntry[], total_count, page, limit }`. Rate limit: 30 req/min (prevent abuse). Requires `audit:read` permission.
**Критерии готовности (DoD):**
- [ ] Фильтрация по любой комбинации параметров
- [ ] Performance: < 500ms при 10M записей (с partition pruning на date)
- [ ] Changes JSONB: human-readable diff ("Status changed from 'new' to 'sent'")
**Оценка:** 8h
**Story:** STORY-060

**[TASK-0276]** Frontend: AuditLog page
**Тип:** Frontend
**Описание:** Страница /settings/audit-log: таблица с колонками (Time, User, Action, Entity, Changes, IP). Фильтры: user dropdown, action category tabs, date range. Detail drawer: при клике на строку — полный JSON diff, user agent parsed. Экспорт CSV button.
**Критерии готовности (DoD):**
- [ ] Changes показываются как visual diff (old → new с цветовой индикацией)
- [ ] User agent parsed: "Chrome 120 / macOS" вместо raw string
- [ ] Экспорт CSV с выбранными фильтрами
**Оценка:** 8h
**Story:** STORY-060

**[TASK-0277]** QA: тестирование audit log
**Тип:** QA
**Описание:** Тесты: каждый из 25 типов событий → запись создана, фильтрация, immutability (DELETE attempt → error), partition pruning performance, export CSV, changes diff accuracy.
**Критерии готовности (DoD):**
- [ ] 25 типов событий: каждый создаёт корректную запись
- [ ] DELETE attempt через SQL → permission denied
- [ ] Changes diff: для каждого типа — корректный old/new
**Оценка:** 4h
**Story:** STORY-060

---

#### [STORY-061] Session management

**Как** Affiliate Manager, **я хочу** видеть все активные sessions своего аккаунта и завершать подозрительные, **чтобы** защитить аккаунт при утечке credentials.

**Acceptance Criteria:**
- [ ] AC1: Settings → Security → Active Sessions: список всех активных sessions с информацией: device (parsed user agent), IP address, location (GeoIP), last activity, login time, current session highlighted как "This device"
- [ ] AC2: Кнопка "Завершить сессию" для каждой session (кроме текущей); "Завершить все кроме текущей" — bulk action; при завершении — refresh token инвалидируется, access token в blacklist
- [ ] AC3: Максимум 10 concurrent sessions на пользователя; при 11-м login — самая старая session автоматически завершается с notification пользователю
- [ ] AC4: При подозрительном login (новая страна, новый device type) — email notification: "Вход в аккаунт с нового устройства. Если это не вы — завершите сессию." со ссылкой на session management

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-06
**Зависит от:** STORY-053

**Tasks:**

**[TASK-0278]** Backend: Session tracking + anomaly detection
**Тип:** Backend
**Описание:** Таблица `user_sessions`: id, user_id, refresh_token_id, device_info (JSONB: browser, os, device_type), ip_address, geo (JSONB: country, city), last_activity, created_at, revoked_at. При каждом token refresh — update last_activity. Anomaly detection: если geo.country != any previous session country → trigger email notification.
**Критерии готовности (DoD):**
- [ ] Session created при login, updated при refresh, deleted при logout
- [ ] GeoIP lookup: MaxMind GeoLite2 (free tier) для country/city
- [ ] Anomaly email: отправляется < 30s после подозрительного login
- [ ] Max 10 sessions: FIFO eviction с notification
**Оценка:** 8h
**Story:** STORY-061

**[TASK-0279]** Frontend: SessionManager page
**Тип:** Frontend
**Описание:** Settings → Security → Active Sessions: список карточек (device icon, browser+OS, IP, location, last active, login time). "This device" badge на текущей. "Завершить" button на каждой (кроме текущей). "Завершить все" в header.
**Критерии готовности (DoD):**
- [ ] Device icons: desktop/mobile/tablet parsed из user agent
- [ ] Location: "Kyiv, Ukraine" из GeoIP
- [ ] "Завершить все" — confirmation modal с количеством sessions
**Оценка:** 4h
**Story:** STORY-061

**[TASK-0280]** QA: тестирование session management
**Тип:** QA
**Описание:** Тесты: view sessions (2+ devices), terminate session → user kicked, terminate all, max 10 sessions → oldest evicted, anomaly detection (different country → email), current session unkillable.
**Критерии готовности (DoD):**
- [ ] Terminated session: user на том устройстве получает 401 при следующем запросе
- [ ] Anomaly email содержит: device, IP, location, link to sessions
**Оценка:** 4h
**Story:** STORY-061

---

---

## [EPIC-07] Anti-Fraud System

**Цель:** Обеспечить проверку каждого лида на фрод в реальном времени (< 200ms) с детализированным scoring 0-100, блокировкой ботов/VPN/TOR/VOIP, настраиваемыми профилями — и дифференцироваться от конкурентов через unlimited checks, полную прозрачность scoring и exportable verification cards.

**Метрика успеха:**
- 100% лидов проходят fraud check до отправки брокеру (ноль пропущенных)
- Fraud score latency < 200ms (p95) при пиковой нагрузке 100 leads/sec
- Снижение fraud rate клиентов на 40% в первый месяц использования
- 0 лимитов на количество fraud checks (unlimited в каждом тарифе)

**Приоритет:** P0 (MVP)
**Зависит от:** EPIC-01 (Lead Intake API)
**Оценка:** XL (3+ мес)

---

### Stories:

---

#### [STORY-062] Real-time fraud scoring pipeline (0-100)

**Как** Network Admin, **я хочу** чтобы каждый лид при intake получал fraud score от 0 до 100 с breakdown по каждому фактору проверки, **чтобы** принимать обоснованные решения о маршрутизации на основе прозрачного scoring.

**Acceptance Criteria:**
- [ ] AC1: Fraud score вычисляется синхронно при intake; pipeline: IP check → Email check → Phone check → Blacklist check → Behavioral check → Aggregate score; общая latency < 200ms (p95); score сохраняется в `leads.fraud_score` (INT 0-100) и `leads.fraud_breakdown` (JSONB)
- [ ] AC2: Breakdown содержит оценку по каждому фактору: `{ ip: { score: 0-25, risk: "vpn_detected", provider: "NordVPN", details: {...} }, email: { score: 0-25, risk: "disposable_domain", domain: "tempmail.com" }, phone: { score: 0-25, risk: "voip_number", carrier: "Twilio", line_type: "voip" }, blacklist: { score: 0-15, matched: ["ip", "email"], lists: ["internal", "shared"] }, behavioral: { score: 0-10, risk: "rapid_submission", submissions_last_hour: 47 } }`
- [ ] AC3: Категории итогового score: Clean (0-20), Low Risk (21-40), Medium Risk (41-60), High Risk (61-80), Critical (81-100); каждая категория имеет дефолтное действие: Clean → route normally, Low → route with flag, Medium → manual review queue, High → hold + alert, Critical → auto-reject
- [ ] AC4: Fraud score UNLIMITED для всех тарифных планов (нет лимитов 100/2000/4000 как у HyperOne); это ключевой дифференциатор — указывается на pricing page и в маркетинге
- [ ] AC5: При недоступности внешних сервисов проверки (timeout) — pipeline не блокирует intake; недоступный check получает score 0 (benefit of doubt) с пометкой `{ status: "unavailable", fallback: true }`; алерт в monitoring

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-07

**Tasks:**

**[TASK-0281]** Backend: FraudScoringPipeline — orchestrator с parallel checks
**Тип:** Backend
**Описание:** Service FraudScoringPipeline: принимает Lead, запускает 5 проверок параллельно (goroutines / Promise.all), собирает результаты, вычисляет aggregate score. Timeout per check: 150ms (pipeline total < 200ms с parallel execution). Circuit breaker для каждого внешнего сервиса (5 failures → open → fallback score 0 на 60s).
**Критерии готовности (DoD):**
- [ ] 5 checks выполняются параллельно; total latency = max(check latencies) + 10ms overhead
- [ ] Circuit breaker per external provider: open → half-open (1 test) → closed
- [ ] Fallback при timeout: check score = 0, status = "unavailable"
- [ ] Unit-тесты: all checks pass, all checks fail, mixed results, timeout scenarios
**Оценка:** 16h
**Story:** STORY-062

**[TASK-0282]** Backend: IP Check module (VPN/TOR/Proxy/Bot detection)
**Тип:** Backend
**Описание:** Module IPChecker: проверяет IP через: 1) Внутренний список TOR exit nodes (обновление ежедневно из torproject.org), 2) VPN/Proxy detection API (IPQualityScore или ip-api.com), 3) Datacenter IP ranges (AWS/GCP/Azure/DO/Hetzner ASN lists), 4) Bot detection (known bot user agents + headless browser fingerprints). Score: 0-25.
**Критерии готовности (DoD):**
- [ ] TOR list auto-update: daily cron, хранение в Redis SET, lookup < 1ms
- [ ] VPN detection: accuracy > 90% (проверить на 100 known VPN IPs)
- [ ] Datacenter detection: ASN-based, обновление weekly
- [ ] Bot detection: user-agent + connection pattern analysis
**Оценка:** 12h
**Story:** STORY-062

**[TASK-0283]** Backend: Email Check module (DNS/SMTP/disposable)
**Тип:** Backend
**Описание:** Module EmailChecker: 1) MX record lookup (DNS), 2) SMTP RCPT TO verification (mailbox exists), 3) Disposable email domain database (10K+ domains, local + updates), 4) Free email provider detection (gmail, yahoo, etc. → lower score), 5) Domain age check (WHOIS, < 30 days → suspicious). Score: 0-25.
**Критерии готовности (DoD):**
- [ ] MX check: < 50ms (DNS cache), timeout 100ms
- [ ] SMTP check: non-blocking, timeout 150ms; skip if MX fails
- [ ] Disposable list: 10K+ domains; daily update from github.com/disposable-email-domains
- [ ] Domain age: WHOIS cache 24h; < 30 days → +15 score
**Оценка:** 12h
**Story:** STORY-062

**[TASK-0284]** Backend: Phone Check module (VOIP/line type/carrier)
**Тип:** Backend
**Описание:** Module PhoneChecker: 1) E.164 нормализация, 2) Line type detection (mobile/landline/voip/toll-free) через Numverify/Twilio Lookup API, 3) VOIP → high score, 4) Carrier information, 5) Country code ↔ lead country match. Score: 0-25.
**Критерии готовности (DoD):**
- [ ] E.164 нормализация для 200+ стран (libphonenumber)
- [ ] VOIP detection → +20 score; toll-free → +15 score
- [ ] Country mismatch (phone country ≠ lead country) → +10 score
- [ ] Cache carrier lookup: 24h TTL per phone number
**Оценка:** 8h
**Story:** STORY-062

**[TASK-0285]** Backend: Behavioral Check module
**Тип:** Backend
**Описание:** Module BehavioralChecker: 1) Rate check — submissions from same IP in last 1h/24h (>10/h → suspicious), 2) Duplicate pattern — same email prefix + different domains in 24h, 3) Timing pattern — submissions at exact intervals (bot signature). Data from Redis counters. Score: 0-10.
**Критерии готовности (DoD):**
- [ ] Redis counters: per-IP (1h window, 24h window), per-email-prefix (24h)
- [ ] Bot signature: 3+ submissions at exactly same interval (±1s) → +10
- [ ] No external calls — all data from local Redis → < 5ms
**Оценка:** 8h
**Story:** STORY-062

**[TASK-0286]** QA: тестирование fraud scoring pipeline
**Тип:** QA
**Описание:** Тесты: clean lead (score < 20), VPN IP (score > 60), disposable email (score > 40), VOIP phone (score > 50), blacklisted (score > 70), all checks timeout (score 0 + fallback), latency benchmark (100 leads/sec, p95 < 200ms), breakdown accuracy.
**Критерии готовности (DoD):**
- [ ] Performance: 100 leads/sec sustained, p95 < 200ms
- [ ] Accuracy: 50 known fraud leads → score > 60 for at least 90%
- [ ] 50 known clean leads → score < 30 for at least 90%
- [ ] All external services down → pipeline returns score 0, not error
**Оценка:** 8h
**Story:** STORY-062

---

#### [STORY-063] Blacklists (IP/email/phone/domain)

**Как** Network Admin, **я хочу** управлять чёрными списками IP-адресов, email-адресов, телефонов и доменов, **чтобы** автоматически блокировать заведомо фродовых лидов без ожидания scoring.

**Acceptance Criteria:**
- [ ] AC1: 4 типа blacklists: IP (поддержка CIDR), Email (exact + wildcard *@domain.com), Phone (exact + prefix +7999*), Domain (exact + wildcard *.tempmail.*); каждая запись: value, reason (text, max 200 chars), added_by, added_at, expires_at (optional, для временных блокировок)
- [ ] AC2: Blacklist проверяется до основного fraud scoring (< 5ms); matched → lead немедленно отклоняется с reason "Blacklisted: {type} match" без прохождения полного pipeline; rejection логируется в lead_events
- [ ] AC3: Import blacklist: CSV upload (max 10,000 записей); export blacklist: CSV download; API endpoints: POST /api/v1/blacklists (single add), POST /api/v1/blacklists/bulk (batch), DELETE /api/v1/blacklists/:id, GET /api/v1/blacklists (list with filters)
- [ ] AC4: Shared blacklist (opt-in): компания может подключиться к анонимизированному shared blacklist (без раскрытия source компании); вклад: при ручном добавлении в blacklist с пометкой "Share" — запись попадает в общий пул; формат shared: hash(value) → причина (не raw data)
- [ ] AC5: Максимум 100,000 записей на компанию суммарно по всем типам; записи с expires_at автоматически удаляются по cron (ежечасно)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-07

**Tasks:**

**[TASK-0287]** Backend: Blacklist service + high-performance lookup
**Тип:** Backend
**Описание:** Таблица `blacklists`: id, company_id, type (enum: ip/email/phone/domain), value, pattern_type (exact/cidr/wildcard/prefix), reason, shared (boolean), added_by, expires_at, created_at. Lookup: Redis SET per company per type для exact match (< 1ms); CIDR matching через PostgreSQL для IP ranges; wildcard matching через LIKE/regex. Bloom filter для quick negative check.
**Критерии готовности (DoD):**
- [ ] Exact match lookup: < 1ms (Redis)
- [ ] CIDR/wildcard: < 5ms (PostgreSQL with index)
- [ ] Bloom filter: false positive rate < 1%, rebuild hourly
- [ ] TTL cleanup: hourly cron removes expired entries, updates Redis
**Оценка:** 12h
**Story:** STORY-063

**[TASK-0288]** Backend: Blacklist CRUD + bulk import API
**Тип:** Backend
**Описание:** Endpoints: POST /api/v1/blacklists (single), POST /api/v1/blacklists/bulk (JSON array or CSV upload, max 10K), GET /api/v1/blacklists (list, filters: type, search, date_range), DELETE /api/v1/blacklists/:id, DELETE /api/v1/blacklists/bulk (by IDs). Export: GET /api/v1/blacklists/export?format=csv.
**Критерии готовности (DoD):**
- [ ] Bulk import: 10K записей обрабатываются < 30s; progress через WebSocket
- [ ] Deduplication: при import — пропускаются дубликаты с логом
- [ ] Validation: IP format, email format, phone E.164, domain format
**Оценка:** 8h
**Story:** STORY-063

**[TASK-0289]** Backend: Shared blacklist service (opt-in)
**Тип:** Backend
**Описание:** Таблица `shared_blacklist`: id, type, value_hash (SHA-256), reason_category (enum: fraud/spam/bot/abuse), contributed_by_count, first_seen, last_seen. При добавлении записи с shared=true → hash(value) публикуется в shared pool. Lookup: company opt-in через settings; при проверке — check shared pool после company blacklist. Privacy: только хеши, невозможно восстановить оригинал.
**Критерии готовности (DoD):**
- [ ] SHA-256 hash: невозможно восстановить оригинальное значение
- [ ] Opt-in per company (default OFF)
- [ ] Shared pool lookup: < 2ms (Redis SET with hashes)
**Оценка:** 8h
**Story:** STORY-063

**[TASK-0290]** Frontend: BlacklistManager page
**Тип:** Frontend
**Описание:** Страница /settings/anti-fraud/blacklists: 4 таба (IP, Email, Phone, Domain). Таблица записей: value, reason, added by, date, expires. Add button → modal (single entry). Import button → CSV upload с progress. Export button. Search bar. Bulk delete. Shared toggle per entry.
**Критерии готовности (DoD):**
- [ ] CSV upload: drag-and-drop zone, preview первых 5 строк, validation errors inline
- [ ] Search: instant filter по value (client-side для < 1000, server-side для > 1000)
- [ ] Expires display: "Постоянно" или "Истекает через 5 дней" с countdown
**Оценка:** 8h
**Story:** STORY-063

**[TASK-0291]** QA: тестирование blacklists
**Тип:** QA
**Описание:** Тесты: add/remove single, bulk import 10K CSV, exact match, CIDR match, wildcard match, shared blacklist opt-in/opt-out, expired entry cleanup, blacklisted lead → immediate reject, performance 100K entries.
**Критерии готовности (DoD):**
- [ ] 100K entries: lookup time still < 5ms
- [ ] Expired entry: not matched after cleanup
- [ ] Shared pool: hash-only, no data leakage
**Оценка:** 4h
**Story:** STORY-063

---

#### [STORY-064] Настраиваемые fraud profiles per affiliate

**Как** Affiliate Manager, **я хочу** создавать индивидуальные fraud profiles для каждого аффилейта с настраиваемыми порогами и правилами, **чтобы** учитывать специфику трафика: GEO с высоким VPN-использованием, VOIP-тяжёлые регионы, etc.

**Acceptance Criteria:**
- [ ] AC1: Fraud profile: набор настроек — threshold per check (IP max score, Email max score, Phone max score, Total max score), enabled/disabled checks, action per category (Clean → route, Medium → manual review, High → reject, Critical → reject + blacklist); дефолтный profile применяется если у аффилейта нет custom
- [ ] AC2: Создание profile: имя (max 64 chars), описание, настройки per check; привязка profile к аффилейту через dropdown в настройках аффилейта; 1 аффилейт = 1 profile (или дефолтный); максимум 50 custom profiles на компанию
- [ ] AC3: Preset profiles из коробки: "Strict" (total threshold 30, VOIP block, VPN block), "Standard" (total threshold 50, VOIP flag, VPN flag), "Lenient" (total threshold 70, only blacklist block), "Crypto-Tier1" (strict for EU/US, standard for rest), "MENA-Adjusted" (lenient on VOIP — MENA region uses VOIP legitimately)
- [ ] AC4: Profile override per GEO: внутри profile можно задать exceptions per country (например, "Для UAE — VOIP allowed, threshold 60"); maximum 20 GEO overrides per profile

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-07
**Зависит от:** STORY-062

**Tasks:**

**[TASK-0292]** Backend: Fraud profile CRUD + application logic
**Тип:** Backend
**Описание:** Таблица `fraud_profiles`: id, company_id, name, description, config (JSONB: { checks: { ip: { enabled: bool, max_score: int }, ... }, thresholds: { clean: 0-20, low: 21-40, ... }, actions: { clean: "route", high: "reject", ... }, geo_overrides: [{ country: "AE", config: {...} }] }), is_default, created_at. Endpoints: CRUD /api/v1/fraud-profiles. FraudScoringPipeline: resolve profile for lead (affiliate → custom profile || company default).
**Критерии готовности (DoD):**
- [ ] Profile resolution: affiliate custom → company default → system default; < 1ms (cached)
- [ ] GEO override: country code from lead → check for override → apply modified thresholds
- [ ] 5 preset profiles created at company seed
- [ ] Validation: thresholds 0-100, max_score per check 0-25, actions from enum
**Оценка:** 12h
**Story:** STORY-064

**[TASK-0293]** Frontend: FraudProfileEditor page
**Тип:** Frontend
**Описание:** Страница /settings/anti-fraud/profiles: список profiles (name, affiliates count, is_default). Create/Edit: form с секциями — General (name, description), Checks (toggles + sliders per check), Thresholds (range inputs for categories), Actions (dropdowns per category), GEO Overrides (add country → override config). Visual preview: "Как этот profile обработает тестовый лид" с simulation.
**Критерии готовности (DoD):**
- [ ] Simulation: ввести тестовые данные → показать predicted score и action
- [ ] GEO override: country picker с поиском, визуально отличается от основных настроек
- [ ] Preset profiles: badge "Системный" + кнопка "Clone" для создания кастомного на основе
**Оценка:** 12h
**Story:** STORY-064

**[TASK-0294]** QA: тестирование fraud profiles
**Тип:** QA
**Описание:** Тесты: default profile application, custom profile per affiliate, GEO override (UAE lead with VOIP → lenient), profile switching, simulation accuracy, preset clone, 50 profiles limit.
**Критерии готовности (DoD):**
- [ ] GEO override: UAE lead с VOIP phone → score ниже чем без override
- [ ] Simulation: predicted score matches actual score within ±5 points
**Оценка:** 4h
**Story:** STORY-064

---

#### [STORY-065] Fraud Verification Card (exportable PDF)

**Как** Affiliate Manager, **я хочу** генерировать Verification Card для каждого лида с полной детализацией fraud checks, **чтобы** предоставлять доказательства качества трафика при спорах с брокерами.

**Acceptance Criteria:**
- [ ] AC1: Verification Card — одностраничный PDF-документ с: логотипом компании, датой генерации, Lead ID, fraud score (большой badge), breakdown по каждому check (score + risk + details), данные лида (masked PII — email: j***@email.com), IP analysis (geo, ISP, VPN/proxy status), timeline проверки (timestamps каждого check), QR-код для верификации подлинности документа
- [ ] AC2: QR-код содержит signed URL с TTL 90 дней: /verify/{lead_id}/{signature}; при сканировании — web-страница с теми же данными (без маскировки для авторизованных); это позволяет брокеру верифицировать подлинность карты
- [ ] AC3: Генерация PDF: кнопка "Скачать Verification Card" в профиле лида; batch generation: выбрать лиды → "Скачать Verification Cards" → ZIP архив; API endpoint: GET /api/v1/leads/:id/verification-card?format=pdf
- [ ] AC4: PDF генерируется < 3 секунд для одного лида; batch (100 лидов) < 60 секунд; дизайн: профессиональный, branded, подходящий для пересылки брокеру; размер файла < 500KB

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-07
**Зависит от:** STORY-062, STORY-044

**Tasks:**

**[TASK-0295]** Backend: PDF generation service
**Тип:** Backend
**Описание:** Service VerificationCardGenerator: принимает lead_id, генерирует PDF через wkhtmltopdf или go-pdf/chromedp. HTML template с company branding (logo, colors from company settings). QR code: signed JWT with lead_id, expiry 90 days. Batch: queue через Redis, ZIP assembly.
**Критерии готовности (DoD):**
- [ ] Single PDF: < 3s generation time
- [ ] Batch 100: < 60s, ZIP < 50MB
- [ ] QR verification: signed URL validates against DB
- [ ] PDF size: < 500KB per card
**Оценка:** 16h
**Story:** STORY-065

**[TASK-0296]** Backend: GET /api/v1/verify/:lead_id/:signature — public verification page
**Тип:** Backend
**Описание:** Public endpoint (no auth required): validates signature → returns verification data (fraud score, breakdown, masked lead info). Signed JWT in signature: lead_id + company_id + exp. Expired → "Verification expired, contact the issuer." Rate limit: 10 req/min per IP.
**Критерии готовности (DoD):**
- [ ] Public page: no auth required, but signature validation mandatory
- [ ] Expired signature → clear message
- [ ] PII masked for unauthenticated; full data for authenticated users of same company
**Оценка:** 4h
**Story:** STORY-065

**[TASK-0297]** Frontend: VerificationCard download button + batch UI
**Тип:** Frontend
**Описание:** Кнопка "Verification Card" в LeadProfile. Batch: в BulkActionsToolbar — "Download Verification Cards" → progress modal → download ZIP. Verification page: public page с branded layout, fraud details, QR status.
**Критерии готовности (DoD):**
- [ ] Кнопка в профиле лида скачивает PDF за < 5s
- [ ] Batch progress показывает количество обработанных / всего
- [ ] Verification page: responsive, printable
**Оценка:** 8h
**Story:** STORY-065

**[TASK-0298]** Design: Verification Card PDF template
**Тип:** Design
**Описание:** PDF template: A4, portrait, branded header (company logo + "Lead Verification Report"), fraud score badge (large, color-coded), breakdown sections, lead summary (masked PII), IP analysis, timeline, QR code, footer (generated date, disclaimer). Professional B2B aesthetic.
**Критерии готовности (DoD):**
- [ ] Template утверждён: print-ready A4
- [ ] Company customization: logo + primary color → template adapts
- [ ] QR code: bottom-right, 3cm × 3cm
**Оценка:** 8h
**Story:** STORY-065

**[TASK-0299]** QA: тестирование Verification Card
**Тип:** QA
**Описание:** Тесты: single PDF generation, batch 100, QR verification (valid/expired/tampered), PII masking in PDF, PDF opening in different viewers (Chrome, Safari, Adobe Reader), ZIP download.
**Критерии готовности (DoD):**
- [ ] QR tampered → verification page shows "Invalid signature"
- [ ] PDF opens correctly in Chrome, Safari, Adobe Reader
- [ ] PII masked: no raw email/phone visible in PDF
**Оценка:** 4h
**Story:** STORY-065

---

#### [STORY-066] Anti-shave detection (Status Pipe Pending)

**Как** Network Admin, **я хочу** чтобы система автоматически детектировала подозрительные изменения статусов брокером (шейв), **чтобы** получать алерты и иметь доказательства для разрешения конфликтов.

**Acceptance Criteria:**
- [ ] AC1: Status Pipe Pending: при обновлении статуса брокером — лид переходит в промежуточный статус "Pending Verification" на настраиваемое время (дефолт 24 часа); если за это время статус менялся > 2 раз или вернулся к предыдущему (sent → deposit → sent) — флаг "Shave Suspected"
- [ ] AC2: Shave detection rules: 1) Status rollback (converted → unconverted), 2) Rapid status changes (> 3 changes in 1 hour), 3) Abnormal rejection rate per broker (> 30% rejection in 24h window when historical average < 15%), 4) FTD disappearance (deposit status removed); каждое правило можно включить/выключить per broker
- [ ] AC3: При обнаружении shave: instant Telegram/email alert к Network Admin; lead помечается badge "Shave Alert" (красный); в профиле лида — таб с полной историей статусов с timestamps для доказательной базы
- [ ] AC4: Shave analytics dashboard: broker × shave incidents count, timeline graph, comparison "expected conversion rate vs actual" per broker; данные помогают Network Admin принимать решения о работе с брокером
- [ ] AC5: Export shave report per broker: PDF с детализацией всех подозрительных случаев за период — для предъявления брокеру при разрешении споров

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-07
**Зависит от:** STORY-062, EPIC-03

**Tasks:**

**[TASK-0300]** Backend: Status monitoring pipeline
**Тип:** Backend
**Описание:** Service StatusMonitor: при каждом status update от брокера — проверка через 4 shave detection rules. Таблица `lead_status_history`: lead_id, status, previous_status, broker_id, timestamp, raw_payload. Analysis: Redis sorted sets per broker для rate calculation. Pending verification: настраиваемый delay (24h default) через scheduled job.
**Критерии готовности (DoD):**
- [ ] Все 4 shave rules реализованы и toggle-able per broker
- [ ] Status history записывается при каждом update (immutable)
- [ ] Pending verification: scheduled check через delayed queue
- [ ] Abnormal rate calculation: sliding window 24h, comparison с 30-day average
**Оценка:** 16h
**Story:** STORY-066

**[TASK-0301]** Backend: Shave alert service + notification triggers
**Тип:** Backend
**Описание:** При shave detection → создаёт запись в `shave_alerts` (lead_id, broker_id, rule_triggered, evidence JSONB, status). Triggers notification через Telegram bot + email. Notification содержит: lead ID, broker name, rule, evidence summary, link to lead profile.
**Критерии готовности (DoD):**
- [ ] Alert создаётся < 5s после детекции
- [ ] Telegram message: formatted, с deep link на lead profile
- [ ] De-duplication: не более 1 alert per lead per rule per 24h
**Оценка:** 8h
**Story:** STORY-066

**[TASK-0302]** Frontend: Shave Alert badge + status history in lead profile
**Тип:** Frontend
**Описание:** Badge "Shave Alert" в таблице лидов (красный warning icon). В профиле лида → Events tab: special section "Status History" с timeline всех статусов + highlighted подозрительные изменения (red border). Shave evidence: collapsible card с деталями правила, которое сработало.
**Критерии готовности (DoD):**
- [ ] Badge clickable → opens lead profile on Events tab
- [ ] Status history timeline: visual diff (old status → new status → rollback highlighted)
- [ ] Evidence card: rule name, description, threshold vs actual values
**Оценка:** 8h
**Story:** STORY-066

**[TASK-0303]** QA: тестирование anti-shave
**Тип:** QA
**Описание:** Тесты: status rollback detection, rapid changes (> 3 in 1h), abnormal rejection rate (>30%), FTD disappearance, alert delivery (Telegram + email), per-broker toggle, false positive rate (normal operation should not trigger), export shave report.
**Критерии готовности (DoD):**
- [ ] All 4 rules: trigger correctly on synthetic data
- [ ] False positive: 100 normal leads → 0 false shave alerts
- [ ] Alert delivery: < 30s from detection to Telegram message
**Оценка:** 8h
**Story:** STORY-066

---

#### [STORY-067] VPN/TOR/Proxy/Bot detection dashboard

**Как** Network Admin, **я хочу** видеть аналитику по типам обнаруженного фрода (VPN, TOR, Proxy, Bot, VOIP), **чтобы** оценивать качество трафика per affiliate и принимать меры.

**Acceptance Criteria:**
- [ ] AC1: Dashboard /anti-fraud/analytics: pie chart (fraud types distribution), time-series graph (fraud detections over time), table (top-10 affiliates by fraud %), top blocked IPs/domains; фильтры: date range, affiliate, country, fraud type
- [ ] AC2: Per-affiliate fraud breakdown: таблица (affiliate name, total leads, clean %, vpn %, tor %, proxy %, bot %, voip %, blacklisted %, avg fraud score); сортировка по любой колонке; drill-down по клику → leads с fraud > 60 для этого аффилейта
- [ ] AC3: Trend alerts: если fraud % аффилейта вырос на > 20% за последние 7 дней по сравнению с предыдущими 7 днями → автоматический alert (in-app + Telegram); настраиваемый порог (дефолт 20%)
- [ ] AC4: Данные обновляются каждые 5 минут (materialized view / pre-aggregated); dashboard загружается < 2 секунд

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-07
**Зависит от:** STORY-062

**Tasks:**

**[TASK-0304]** Backend: Fraud analytics aggregation service
**Тип:** Backend
**Описание:** Materialized view / pre-aggregated таблица `fraud_analytics_daily`: company_id, date, affiliate_id, country, fraud_type, count, avg_score. Refresh: every 5 min via cron. Endpoints: GET /api/v1/analytics/fraud/summary (pie/time-series data), GET /api/v1/analytics/fraud/by-affiliate (per-affiliate breakdown). Trend detection: compare current 7d vs previous 7d per affiliate.
**Критерии готовности (DoD):**
- [ ] Materialized view refresh < 30s for 1M leads
- [ ] Trend detection: cron every hour, triggers alert if delta > threshold
- [ ] Endpoints response < 500ms with filters
**Оценка:** 12h
**Story:** STORY-067

**[TASK-0305]** Frontend: FraudAnalyticsDashboard page
**Тип:** Frontend
**Описание:** Страница /anti-fraud/analytics: layout — 2 charts (pie + time-series) на верху, таблица per-affiliate внизу. Charts: Chart.js или Recharts. Filters: date range, affiliate multi-select, country multi-select. Drill-down: click affiliate → filter leads table by affiliate + fraud > 60.
**Критерии готовности (DoD):**
- [ ] Charts responsive: корректно на desktop и tablet
- [ ] Drill-down opens leads table с pre-applied filters
- [ ] Loading state: skeleton для charts, spinner для table
**Оценка:** 12h
**Story:** STORY-067

**[TASK-0306]** QA: тестирование fraud analytics
**Тип:** QA
**Описание:** Тесты: dashboard с 0/100/100K leads, фильтрация, drill-down, trend alert trigger, refresh accuracy, performance (< 2s load), chart correctness (sum of pie == total).
**Критерии готовности (DoD):**
- [ ] Pie chart: sum of segments == total count
- [ ] Trend alert: triggered correctly on synthetic 20%+ increase
- [ ] Performance: < 2s on 100K leads with filters
**Оценка:** 4h
**Story:** STORY-067

---

#### [STORY-068] Fraud check result в Lead Intake API response

**Как** Developer, **я хочу** получать fraud score и breakdown в response Lead Intake API, **чтобы** автоматизировать обработку лидов на стороне аффилейта (auto-retry clean leads, flag suspicious).

**Acceptance Criteria:**
- [ ] AC1: POST /api/v1/leads response расширен: `{ lead_id, status, fraud: { score: 75, category: "high", action: "rejected", breakdown: { ip: { score: 20, risk: "vpn" }, email: { score: 15, risk: "disposable" }, phone: { score: 20, risk: "voip" }, blacklist: { score: 10, matched: ["email"] }, behavioral: { score: 10, risk: "rapid" } } } }`
- [ ] AC2: Fraud details в response контролируются настройкой per affiliate: "Full" (все данные), "Score Only" (только score + category + action, без breakdown), "None" (только status, без fraud data); дефолт: "Score Only"
- [ ] AC3: Rejected по fraud → HTTP 200 (не 4xx) со status: "rejected", fraud.action: "rejected", fraud.reason: human-readable; это позволяет аффилейту обработать rejection программно; HTTP 4xx зарезервированы для ошибок валидации
- [ ] AC4: Webhook postback при fraud rejection включает fraud score и category; формат настраивается в postback template: `{fraud_score}`, `{fraud_category}`, `{fraud_action}`

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-07
**Зависит от:** STORY-062, EPIC-01

**Tasks:**

**[TASK-0307]** Backend: Расширение Lead Intake response с fraud data
**Тип:** Backend
**Описание:** Модифицировать intake handler: после fraud scoring → включить результат в response. Visibility control: fraud_response_level в affiliate settings (full/score_only/none). Обогатить postback template variables: fraud_score, fraud_category, fraud_action, fraud_reason.
**Критерии готовности (DoD):**
- [ ] 3 уровня видимости fraud data в response работают корректно
- [ ] Postback variables: 4 новые переменные доступны в templates
- [ ] Rejected leads: HTTP 200 со status "rejected" (не 4xx)
**Оценка:** 8h
**Story:** STORY-068

**[TASK-0308]** Frontend: Fraud response settings in Affiliate config
**Тип:** Frontend
**Описание:** В настройках аффилейта: dropdown "Fraud Data в API Response" — Full / Score Only / None. Tooltip с описанием каждого уровня. Preview: пример response для каждого уровня.
**Критерии готовности (DoD):**
- [ ] Dropdown с 3 опциями и description для каждой
- [ ] Response preview: JSON snippet для выбранного уровня
**Оценка:** 2h
**Story:** STORY-068

**[TASK-0309]** QA: тестирование fraud data в API response
**Тип:** QA
**Описание:** Тесты: 3 уровня видимости × clean/rejected lead = 6 комбинаций; postback с fraud variables; HTTP status code для rejected (200, не 4xx); full breakdown accuracy.
**Критерии готовности (DoD):**
- [ ] 6 комбинаций: correct response structure for each
- [ ] Postback: fraud variables correctly substituted
**Оценка:** 4h
**Story:** STORY-068

---

#### [STORY-069] VOIP blocking и phone line type detection

**Как** Network Admin, **я хочу** автоматически детектировать и блокировать лиды с VOIP-номерами телефонов, **чтобы** отсеивать фродовые лиды, использующие виртуальные номера.

**Acceptance Criteria:**
- [ ] AC1: Phone check определяет line type: mobile, landline, voip, toll_free, premium, unknown; результат сохраняется в lead profile: `phone_line_type`, `phone_carrier`, `phone_country`; данные от внешнего API (Numverify / Twilio Lookup / AbstractAPI)
- [ ] AC2: Настройка per fraud profile: "Block VOIP" (auto-reject), "Flag VOIP" (route with warning), "Allow VOIP" (no impact on score); для toll_free и premium — аналогичные настройки; дефолт: Block VOIP, Allow landline/mobile
- [ ] AC3: VOIP provider identification: при детекции VOIP — показывать provider (Twilio, Google Voice, TextNow, Vonage, etc.); top-10 VOIP providers в fraud analytics
- [ ] AC4: Fallback при недоступности API: line_type = "unknown", score penalty = 0 (benefit of doubt); alert в monitoring; cache successful lookups на 30 дней (phone number → line_type)

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-07
**Зависит от:** STORY-062

**Tasks:**

**[TASK-0310]** Backend: Phone line type detection service
**Тип:** Backend
**Описание:** Module PhoneLineTypeService: wrapper для Numverify/Twilio Lookup API. Cache: Redis (phone_hash → line_type+carrier, TTL 30 days). Circuit breaker: 5 failures → fallback "unknown". Rate limit: respect API provider limits (batch where possible). Result struct: { line_type, carrier, country_code, is_valid }.
**Критерии готовности (DoD):**
- [ ] 6 line types correctly identified
- [ ] Cache hit rate > 60% after 1 month (many repeated phone prefixes)
- [ ] API cost: batch lookups where provider supports (reduce per-call cost)
- [ ] Fallback: "unknown" type, 0 score penalty
**Оценка:** 8h
**Story:** STORY-069

**[TASK-0311]** Frontend: VOIP settings в fraud profile + phone details в lead profile
**Тип:** Frontend
**Описание:** В FraudProfileEditor: секция "Phone Line Type" — per-type action (Block/Flag/Allow) для каждого line type. В LeadProfile: phone field badge (Mobile/VOIP/Landline), carrier name, phone country flag.
**Критерии готовности (DoD):**
- [ ] Badge visually distinct: Mobile (green), VOIP (red), Landline (blue), Unknown (gray)
- [ ] Carrier name displayed next to phone number
**Оценка:** 4h
**Story:** STORY-069

**[TASK-0312]** QA: тестирование VOIP detection
**Тип:** QA
**Описание:** Тесты: mobile → allowed, VOIP → blocked (with Block setting), VOIP → flagged (with Flag setting), toll_free, API timeout → unknown, cache hit, provider identification accuracy.
**Критерии готовности (DoD):**
- [ ] VOIP block: lead rejected with clear reason "VOIP number detected"
- [ ] Cache: second lookup for same number → no API call
**Оценка:** 4h
**Story:** STORY-069

---

#### [STORY-070] Real-time fraud score widget в таблице лидов

**Как** Affiliate Manager, **я хочу** видеть fraud score прямо в таблице лидов с цветовой индикацией и возможностью быстрого drill-down, **чтобы** мгновенно оценивать качество потока и реагировать на аномалии.

**Acceptance Criteria:**
- [ ] AC1: Колонка "Fraud Score" в таблице лидов: числовой score (0-100) + цветной badge (зелёный 0-20, жёлтый 21-40, оранжевый 41-60, красный 61-80, тёмно-красный 81-100); иконка-индикатор: щит с галочкой (clean) / предупреждение (medium) / стоп (high/critical)
- [ ] AC2: Hover на fraud score → tooltip popup с мини-breakdown: 5 строк (IP: 15/25, Email: 5/25, Phone: 20/25, Blacklist: 0/15, Behavioral: 0/10); click → open lead profile на Events tab с fraud details
- [ ] AC3: Фильтр по fraud score: range slider (0-100) в FilterBar + quick filters: "Show Fraud Only (> 60)", "Show Clean Only (< 20)"; сортировка по fraud score (asc/desc)
- [ ] AC4: Realtime update: при пересчёте fraud score (status change, manual re-check) — badge обновляется в реальном времени через WebSocket без page refresh

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-07
**Зависит от:** STORY-062, STORY-040

**Tasks:**

**[TASK-0313]** Frontend: FraudScoreBadge + tooltip breakdown
**Тип:** Frontend
**Описание:** Компонент FraudScoreBadge: число + цветной фон + иконка. Tooltip (Popover): 5 строк breakdown, mini progress bars. Click → navigate to lead profile. Integration с LeadTable как column renderer.
**Критерии готовности (DoD):**
- [ ] 5 цветовых градаций корректно отображаются
- [ ] Tooltip lazy-loads breakdown (не загружает для всех 50 видимых строк сразу)
- [ ] Accessible: color не единственный индикатор (иконка + число)
**Оценка:** 4h
**Story:** STORY-070

**[TASK-0314]** Frontend: Fraud quick filters в FilterBar
**Тип:** Frontend
**Описание:** Добавить в FilterBar: preset buttons "Show Fraud (> 60)" и "Show Clean (< 20)" рядом с основным fraud range slider. Buttons toggle-able (click on → apply filter, click off → remove).
**Критерии готовности (DoD):**
- [ ] Quick filter buttons визуально интегрированы в FilterBar
- [ ] Комбинируются с другими фильтрами
- [ ] Active quick filter отображается как chip
**Оценка:** 2h
**Story:** STORY-070

**[TASK-0315]** QA: тестирование fraud score widget
**Тип:** QA
**Описание:** Тесты: 5 цветовых категорий, tooltip breakdown accuracy, quick filters, realtime update (score change via WS), accessibility (screen reader reads score), filter + sort combination.
**Критерии готовности (DoD):**
- [ ] All 5 categories render with correct color and icon
- [ ] Tooltip data matches lead profile fraud breakdown
**Оценка:** 2h
**Story:** STORY-070

---
---

# P1 — LAUNCH (EPIC-08 → EPIC-13)
*Нужно для выхода на рынок и достижения feature parity с конкурентами.*

---

## [EPIC-08] Autologin & Proxy Pipeline

**Цель:** Обеспечить автоматическую авторизацию лида на платформе брокера через 4-stage pipeline с device fingerprint, собственным proxy-пулом и anomaly detection, гарантируя SLA 99.5% uptime autologin.

**Метрика успеха:**
- Autologin success rate >= 97% для всех активных брокеров
- Время pipeline click-to-login < 8 секунд (p95)
- SLA uptime autologin >= 99.5% в месяц
- Failover срабатывает < 3 секунд при недоступности брокера

**Приоритет:** P1 (Launch)
**Зависит от:** EPIC-03 (Broker Integration Layer), EPIC-07 (Anti-Fraud System)
**Оценка:** XL (3+ мес)

---

### [STORY-075] Базовый 4-stage autologin pipeline
**Как** Network Admin, **я хочу** настроить autologin pipeline для брокера с 4 стадиями (click → load → fingerprint → send), **чтобы** лиды автоматически авторизовывались на платформе брокера без ручного вмешательства.

**Acceptance Criteria:**
- [ ] AC1: Pipeline выполняет 4 стадии последовательно: генерация клик-ссылки → загрузка страницы брокера → сбор device fingerprint → отправка авторизационных данных
- [ ] AC2: Каждая стадия логирует статус (pending/in_progress/success/failed) с timestamp и длительностью в мс
- [ ] AC3: Timeout на каждую стадию настраивается: по умолчанию click=2s, load=5s, fingerprint=3s, send=5s
- [ ] AC4: При ошибке на любой стадии pipeline останавливается, лид получает статус `autologin_failed` с указанием failed stage
- [ ] AC5: API `POST /api/v1/autologin/{lead_id}/execute` запускает pipeline, возвращает `202 Accepted` с `pipeline_id`
- [ ] AC6: API `GET /api/v1/autologin/pipeline/{pipeline_id}` возвращает текущий статус всех 4 стадий
- [ ] AC7: Pipeline обрабатывает до 50 concurrent autologin запросов без деградации

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-08

#### Tasks:

**[TASK-0400]** Проектирование схемы БД для autologin pipeline
- **Тип:** Backend
- **Описание:** Создать таблицы `autologin_pipelines`, `autologin_stages`, `autologin_configs`. Pipeline хранит lead_id, broker_id, status, timestamps. Stages хранят stage_type (click/load/fingerprint/send), status, duration_ms, error_message.
- **Критерии готовности:**
  - [ ] Миграция создана и протестирована на пустой БД
  - [ ] Индексы на lead_id, broker_id, status, created_at
  - [ ] Партиционирование по месяцам для autologin_pipelines
- **Оценка:** 8h
- **Story:** STORY-075

**[TASK-0401]** Backend: реализация 4-stage pipeline engine
- **Тип:** Backend
- **Описание:** Реализовать state machine для autologin pipeline с 4 стадиями. Каждая стадия — отдельный handler с configurable timeout. Использовать горутины с context cancellation. Реализовать переходы: pending → in_progress → success/failed.
- **Критерии готовности:**
  - [ ] State machine корректно обрабатывает все переходы
  - [ ] Каждая стадия выполняется с заданным timeout
  - [ ] При ошибке pipeline останавливается и логирует причину
  - [ ] Поддержка 50 concurrent pipelines через worker pool
- **Оценка:** 16h
- **Story:** STORY-075

**[TASK-0402]** Backend: API endpoints для запуска и мониторинга pipeline
- **Тип:** Backend
- **Описание:** Реализовать `POST /api/v1/autologin/{lead_id}/execute` (запуск pipeline, 202 Accepted), `GET /api/v1/autologin/pipeline/{pipeline_id}` (статус pipeline со всеми стадиями), `GET /api/v1/autologin/pipelines?lead_id=&broker_id=&status=` (список pipelines с фильтрами и пагинацией).
- **Критерии готовности:**
  - [ ] Все endpoints документированы в OpenAPI
  - [ ] Rate limiting: 10 req/s на execute, 100 req/s на read
  - [ ] Авторизация через RBAC — только роли admin, manager
- **Оценка:** 8h
- **Story:** STORY-075

**[TASK-0403]** Frontend: визуализация pipeline stages
- **Тип:** Frontend
- **Описание:** Компонент `PipelineStageViewer` — горизонтальная timeline с 4 стадиями. Каждая стадия показывает: иконку, название, статус (цветовой индикатор), длительность, ошибку. Real-time обновление через polling каждые 2 секунды для active pipelines.
- **Критерии готовности:**
  - [ ] Компонент отображает все 4 стадии с цветовой индикацией
  - [ ] Анимация перехода между стадиями
  - [ ] Показ ошибки на провалившейся стадии с tooltip
- **Оценка:** 8h
- **Story:** STORY-075

**[TASK-0404]** QA: тестирование autologin pipeline
- **Тип:** QA
- **Описание:** Написать тест-кейсы: happy path (все 4 стадии success), каждая стадия fails (4 кейса), timeout на каждой стадии (4 кейса), concurrent execution (50 pipelines), race condition при одновременном запуске для одного лида.
- **Критерии готовности:**
  - [ ] Минимум 15 тест-кейсов покрывают все сценарии
  - [ ] Нагрузочный тест на 50 concurrent pipelines пройден
  - [ ] Все edge-case ошибки возвращают корректный статус
- **Оценка:** 8h
- **Story:** STORY-075

---

### [STORY-076] Device fingerprint (WebGL + Canvas + IP)
**Как** Network Admin, **я хочу** чтобы autologin pipeline собирал device fingerprint (WebGL, Canvas, IP, User-Agent, timezone), **чтобы** авторизация выглядела как реальный пользователь и не блокировалась антифрод-системами брокера.

**Acceptance Criteria:**
- [ ] AC1: Fingerprint включает минимум 6 параметров: WebGL renderer, Canvas hash, IP address, User-Agent, timezone, screen resolution
- [ ] AC2: Для каждого лида генерируется уникальный, но консистентный fingerprint (повторный autologin того же лида даёт тот же fingerprint)
- [ ] AC3: Fingerprint сохраняется в БД и привязан к lead_id + broker_id
- [ ] AC4: Система поддерживает пул из минимум 500 уникальных fingerprint-профилей
- [ ] AC5: Admin может добавлять/редактировать fingerprint-профили через UI
- [ ] AC6: Collision detection: система предупреждает если один fingerprint используется > 3 раз за 24 часа

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-08
**Зависит от:** STORY-075

#### Tasks:

**[TASK-0405]** Backend: модуль генерации device fingerprint
- **Тип:** Backend
- **Описание:** Реализовать сервис `FingerprintGenerator` с пулом профилей. Каждый профиль содержит WebGL renderer string, Canvas hash, User-Agent, timezone, screen resolution. Профили привязываются к lead_id+broker_id детерминистически (hash-based assignment).
- **Критерии готовности:**
  - [ ] Генерация fingerprint < 10ms
  - [ ] Пул минимум 500 профилей при старте
  - [ ] Детерминистическое назначение: один лид — один профиль на брокера
- **Оценка:** 16h
- **Story:** STORY-076

**[TASK-0406]** Backend: collision detection и мониторинг reuse
- **Тип:** Backend
- **Описание:** Реализовать tracking использования fingerprint-профилей. Алерт при использовании одного профиля > 3 раз за 24 часа. Метрики: utilization rate профилей, collision count, top-used profiles.
- **Критерии готовности:**
  - [ ] Алерт создаётся при collision threshold
  - [ ] Dashboard-метрика utilization rate обновляется каждые 5 минут
  - [ ] API `GET /api/v1/fingerprints/stats` возвращает статистику
- **Оценка:** 8h
- **Story:** STORY-076

**[TASK-0407]** Frontend: управление fingerprint-профилями
- **Тип:** Frontend
- **Описание:** Страница администрирования fingerprint-профилей: таблица с поиском и фильтрацией, форма создания/редактирования профиля, индикатор использования (сколько раз за 24h), bulk import через CSV.
- **Критерии готовности:**
  - [ ] CRUD операции для профилей
  - [ ] Фильтрация по параметрам (browser, OS, resolution)
  - [ ] Bulk import минимум 100 профилей через CSV
- **Оценка:** 8h
- **Story:** STORY-076

**[TASK-0408]** QA: тестирование fingerprint модуля
- **Тип:** QA
- **Описание:** Верификация уникальности и консистентности fingerprint. Тест на collision detection. Проверка что 500+ профилей корректно распределяются.
- **Критерии готовности:**
  - [ ] Тест на детерминистичность: 100 повторных запросов для одного лида = один профиль
  - [ ] Тест collision: искусственно вызвать > 3 use за 24h, проверить алерт
- **Оценка:** 4h
- **Story:** STORY-076

---

### [STORY-077] Собственный proxy-пул для autologin
**Как** Network Admin, **я хочу** управлять пулом proxy-серверов для autologin, **чтобы** каждый autologin выполнялся с IP, соответствующим GEO лида, и не блокировался брокером.

**Acceptance Criteria:**
- [ ] AC1: Система поддерживает минимум 3 типа proxy: residential, datacenter, mobile
- [ ] AC2: Proxy автоматически выбирается по GEO лида (страна + город при наличии)
- [ ] AC3: При недоступности proxy (timeout > 5s или HTTP error) — автоматическая ротация на следующий proxy из пула
- [ ] AC4: Health check каждого proxy выполняется каждые 60 секунд, мёртвые proxy исключаются из пула
- [ ] AC5: UI показывает: общее количество proxy, live/dead ratio, распределение по GEO, average response time
- [ ] AC6: API для добавления proxy (single и bulk): `POST /api/v1/proxy-pool/proxies`
- [ ] AC7: Лимит concurrent использования одного proxy — настраиваемый (default: 5)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-08
**Зависит от:** STORY-075

#### Tasks:

**[TASK-0409]** Backend: proxy pool manager с health check
- **Тип:** Backend
- **Описание:** Сервис `ProxyPoolManager`: хранение proxy (address, type, geo, credentials), round-robin selection по GEO, health check горутина (каждые 60s), автоматическое исключение dead proxy (3 consecutive failures), concurrent usage limiter.
- **Критерии готовности:**
  - [ ] Health check работает для HTTP/SOCKS5 proxy
  - [ ] Dead proxy автоматически исключаются и восстанавливаются при recovery
  - [ ] Selection по GEO с fallback на ближайший регион
- **Оценка:** 16h
- **Story:** STORY-077

**[TASK-0410]** Backend: API управления proxy pool
- **Тип:** Backend
- **Описание:** CRUD endpoints для proxy: добавление (single/bulk), удаление, обновление, list с фильтрами (type, geo, status). Bulk import через CSV. Статистика: `GET /api/v1/proxy-pool/stats`.
- **Критерии готовности:**
  - [ ] Bulk import до 1000 proxy за одну операцию
  - [ ] Статистика включает: total, live, dead, by_geo, avg_response_ms
- **Оценка:** 8h
- **Story:** STORY-077

**[TASK-0411]** Frontend: dashboard управления proxy pool
- **Тип:** Frontend
- **Описание:** Страница proxy pool: таблица proxy с real-time статусом (live/dead/checking), фильтры по GEO/type/status, форма добавления, карта мира с точками proxy по GEO, KPI tiles (total, live ratio, avg latency).
- **Критерии готовности:**
  - [ ] Real-time обновление статусов каждые 30 секунд
  - [ ] GEO-карта с визуализацией покрытия
  - [ ] Bulk import через drag-and-drop CSV
- **Оценка:** 16h
- **Story:** STORY-077

**[TASK-0412]** DevOps: инфраструктура для proxy health monitoring
- **Тип:** DevOps
- **Описание:** Настроить мониторинг proxy pool: Prometheus метрики (pool_size, live_ratio, avg_latency, rotation_count), Grafana dashboard, алерт при live ratio < 70%.
- **Критерии готовности:**
  - [ ] Prometheus метрики экспортируются
  - [ ] Grafana dashboard с 5+ панелями
  - [ ] Алерт в Telegram при деградации пула
- **Оценка:** 4h
- **Story:** STORY-077

---

### [STORY-078] Anomaly detection: device reuse и GEO mismatch
**Как** Network Admin, **я хочу** получать алерты при обнаружении аномалий autologin (reuse одного device fingerprint, несовпадение GEO лида и proxy IP), **чтобы** оперативно реагировать на потенциальный фрод или ошибки конфигурации.

**Acceptance Criteria:**
- [ ] AC1: Система детектирует device reuse — один fingerprint использован для > N лидов за период (N настраивается, default: 3 за 24h)
- [ ] AC2: Система детектирует GEO mismatch — страна proxy IP не совпадает со страной лида (с точностью до ISO 3166-1 alpha-2)
- [ ] AC3: Каждая аномалия создаёт запись в таблице `autologin_anomalies` с типом, severity (low/medium/high/critical), деталями
- [ ] AC4: Настраиваемые действия при аномалии: log_only / pause_pipeline / block_lead / notify_admin
- [ ] AC5: Dashboard anomalies: time-series график количества аномалий, breakdown по типам, top affected brokers/affiliates
- [ ] AC6: API `GET /api/v1/autologin/anomalies?type=&severity=&date_from=&date_to=` с пагинацией

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-08
**Зависит от:** STORY-076, STORY-077

#### Tasks:

**[TASK-0413]** Backend: anomaly detection engine
- **Тип:** Backend
- **Описание:** Сервис `AnomalyDetector` с правилами: device_reuse (sliding window counter по fingerprint), geo_mismatch (сравнение lead.country vs proxy.country через GeoIP), ip_velocity (слишком много autologin с одного IP). Каждое правило конфигурируется: enabled, threshold, action, severity.
- **Критерии готовности:**
  - [ ] 3 типа аномалий реализованы
  - [ ] Конфигурация правил через API и UI
  - [ ] Detection latency < 100ms (не блокирует pipeline)
- **Оценка:** 16h
- **Story:** STORY-078

**[TASK-0414]** Backend: API и хранение anomalies
- **Тип:** Backend
- **Описание:** Таблица `autologin_anomalies` (id, type, severity, pipeline_id, lead_id, details jsonb, action_taken, created_at). API: list с фильтрами, stats aggregate, mark_resolved.
- **Критерии готовности:**
  - [ ] Партиционирование таблицы по месяцам
  - [ ] Агрегированная статистика за произвольный период
- **Оценка:** 8h
- **Story:** STORY-078

**[TASK-0415]** Frontend: anomaly dashboard
- **Тип:** Frontend
- **Описание:** Раздел Autologin → Anomalies: таблица аномалий с фильтрами, severity-индикаторы, drill-down на pipeline/lead, time-series график по типам аномалий.
- **Критерии готовности:**
  - [ ] Фильтрация по type, severity, date range, broker, affiliate
  - [ ] Кнопка "Resolve" для ручного закрытия аномалии
  - [ ] Time-series chart с группировкой по типу
- **Оценка:** 8h
- **Story:** STORY-078

**[TASK-0416]** QA: тестирование anomaly detection
- **Тип:** QA
- **Описание:** Тесты: device reuse threshold (2, 3, 5 — проверить срабатывание), GEO mismatch (разные комбинации country codes), action выполнение (pause, block, notify), false positive rate на синтетических данных.
- **Критерии готовности:**
  - [ ] Покрытие всех 3 типов аномалий
  - [ ] Проверка всех 4 типов actions
  - [ ] False positive rate < 5% на тестовом наборе из 1000 autologin
- **Оценка:** 8h
- **Story:** STORY-078

---

### [STORY-079] SLA гарантия autologin (ключевой дифференциатор)
**Как** Network Admin, **я хочу** видеть SLA метрики autologin в реальном времени и получать алерты при деградации, **чтобы** гарантировать клиентам contractual SLA 99.5% uptime.

**Acceptance Criteria:**
- [ ] AC1: SLA рассчитывается как: (successful_autologins / total_autologin_attempts) * 100 за календарный месяц
- [ ] AC2: Dashboard показывает: текущий SLA % (MTD), SLA по каждому брокеру, trend за последние 30 дней
- [ ] AC3: Алерт при падении SLA ниже 99.7% (warning) и 99.5% (critical) — через Telegram и email
- [ ] AC4: SLA breakdown доступен по: брокеру, GEO, аффилейту, времени суток
- [ ] AC5: Исторические данные SLA хранятся минимум 12 месяцев
- [ ] AC6: API `GET /api/v1/autologin/sla?period=month&broker_id=&geo=` возвращает SLA метрики
- [ ] AC7: Публичная status page доступна клиентам (read-only, без sensitive данных)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-08

#### Tasks:

**[TASK-0417]** Backend: SLA calculation engine
- **Тип:** Backend
- **Описание:** Сервис `SLACalculator`: агрегация autologin результатов по периодам (hourly, daily, monthly), breakdown по dimensions (broker, geo, affiliate). Materialized views или pre-aggregated tables для быстрых запросов.
- **Критерии готовности:**
  - [ ] Расчёт SLA за месяц < 500ms для любого среза
  - [ ] Hourly aggregation cron job
  - [ ] Историческое хранение 12+ месяцев
- **Оценка:** 16h
- **Story:** STORY-079

**[TASK-0418]** Backend: SLA alerting
- **Тип:** Backend
- **Описание:** Алерты при SLA degradation: warning при < 99.7%, critical при < 99.5%. Каналы: Telegram, email. Cooldown между алертами: 1 час. Настраиваемые пороги per-broker.
- **Критерии готовности:**
  - [ ] Алерт отправляется < 5 минут после определения деградации
  - [ ] Cooldown предотвращает spam (max 1 алерт/час на тип)
  - [ ] Настройка порогов через UI
- **Оценка:** 8h
- **Story:** STORY-079

**[TASK-0419]** Frontend: SLA dashboard
- **Тип:** Frontend
- **Описание:** Страница Autologin → SLA: большой gauge текущего SLA %, time-series trend (30 дней), таблица SLA по брокерам с color coding (green >99.5%, yellow >99%, red <99%), heatmap по часам суток.
- **Критерии готовности:**
  - [ ] Gauge обновляется каждую минуту
  - [ ] Drill-down по клику на брокера
  - [ ] Экспорт SLA отчёта в PDF
- **Оценка:** 8h
- **Story:** STORY-079

**[TASK-0420]** DevOps: public status page
- **Тип:** DevOps
- **Описание:** Публичная status page (на отдельном домене status.gambchamp.com): статус autologin per-broker (operational/degraded/outage), uptime за 90 дней, incident history. Без раскрытия чувствительных данных.
- **Критерии готовности:**
  - [ ] Статус обновляется автоматически каждые 5 минут
  - [ ] Incident автоматически создаётся при SLA < 99%
  - [ ] RSS feed для подписки на изменения статуса
- **Оценка:** 8h
- **Story:** STORY-079

---

### [STORY-080] Failover autologin (смена брокера при отказе)
**Как** Network Admin, **я хочу** настроить failover-цепочку брокеров для autologin, **чтобы** при недоступности основного брокера лид автоматически авторизовывался на backup-брокере без потери конверсии.

**Acceptance Criteria:**
- [ ] AC1: Для каждого routing rule можно указать failover chain из 1-5 backup-брокеров с приоритетами
- [ ] AC2: При autologin failure на primary брокере система автоматически переключается на следующий брокер в цепочке за < 3 секунды
- [ ] AC3: Failover логируется: original_broker, failed_stage, failover_broker, failover_result
- [ ] AC4: Настраиваемые условия failover: timeout, HTTP error codes (4xx/5xx), broker-specific error patterns
- [ ] AC5: Admin может включить/выключить failover per-broker и per-routing-rule
- [ ] AC6: Метрика: failover_rate (%) per broker per day — доступна в аналитике
- [ ] AC7: Лид получает флаг `was_failover: true` с указанием original и actual broker

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-08
**Зависит от:** STORY-075

#### Tasks:

**[TASK-0421]** Backend: failover chain logic
- **Тип:** Backend
- **Описание:** Расширить pipeline engine: при failure на стадии send — проверить failover chain, выбрать следующий broker, перезапустить pipeline с новым broker. Max retries = длина chain. Timeout между failover attempts: 1s (configurable).
- **Критерии готовности:**
  - [ ] Failover chain до 5 брокеров
  - [ ] Переключение < 3 секунд
  - [ ] Полное логирование каждой попытки
- **Оценка:** 16h
- **Story:** STORY-080

**[TASK-0422]** Backend: API конфигурации failover chains
- **Тип:** Backend
- **Описание:** API для настройки failover: `PUT /api/v1/routing-rules/{id}/failover` — массив broker_id с приоритетами, условия failover (error_codes, timeout_ms). Валидация: broker в chain должен быть активен и поддерживать autologin.
- **Критерии готовности:**
  - [ ] CRUD для failover chains
  - [ ] Валидация доступности брокеров
  - [ ] Metrics API: failover_rate per broker
- **Оценка:** 8h
- **Story:** STORY-080

**[TASK-0423]** Frontend: настройка failover chain в UI
- **Тип:** Frontend
- **Описание:** В настройках routing rule — секция Failover: drag-and-drop сортировка брокеров в цепочке, toggle enabled/disabled per broker, визуальный индикатор текущего failover status.
- **Критерии готовности:**
  - [ ] Drag-and-drop для изменения приоритета
  - [ ] Preview цепочки: Primary → Backup 1 → Backup 2
  - [ ] Показ failover rate за последние 24h
- **Оценка:** 8h
- **Story:** STORY-080

**[TASK-0424]** QA: тестирование failover scenarios
- **Тип:** QA
- **Описание:** Тесты: primary broker timeout → failover to backup 1, backup 1 тоже fail → backup 2, вся chain fail → final error, concurrent failovers, failover disabled → no retry.
- **Критерии готовности:**
  - [ ] 10+ тест-кейсов для failover сценариев
  - [ ] Проверка < 3 секунд переключения
  - [ ] Проверка корректности логов для каждой попытки
- **Оценка:** 8h
- **Story:** STORY-080

---

### [STORY-081] Retry policy с логированием для autologin
**Как** Network Admin, **я хочу** настраивать retry policy для каждой стадии autologin pipeline с полным логированием, **чтобы** максимизировать success rate и иметь данные для диагностики проблем.

**Acceptance Criteria:**
- [ ] AC1: Для каждой из 4 стадий pipeline настраивается: max_retries (0-5), retry_delay_ms (100-10000), backoff_multiplier (1.0-3.0)
- [ ] AC2: Каждый retry логируется: attempt_number, delay_ms, error_reason, duration_ms
- [ ] AC3: Default retry policy: max_retries=2, retry_delay=500ms, backoff=1.5x
- [ ] AC4: Retry policy настраивается на 3 уровнях: global → per-broker → per-routing-rule (наследование с override)
- [ ] AC5: Метрика retry_rate per stage — отображается в pipeline dashboard
- [ ] AC6: Логи retry доступны через API с фильтрацией по pipeline_id, stage, date_range

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-08
**Зависит от:** STORY-075

#### Tasks:

**[TASK-0425]** Backend: configurable retry engine
- **Тип:** Backend
- **Описание:** Расширить pipeline stage handler: exponential backoff retry с конфигурацией. 3-уровневая иерархия конфигурации: global defaults → broker override → rule override. Retry logs в отдельную таблицу `autologin_retry_logs`.
- **Критерии готовности:**
  - [ ] Exponential backoff корректно работает
  - [ ] 3-уровневое наследование конфигурации
  - [ ] Логирование каждого retry attempt
- **Оценка:** 8h
- **Story:** STORY-081

**[TASK-0426]** Frontend: настройка retry policy
- **Тип:** Frontend
- **Описание:** Секция Retry Policy в настройках autologin: для каждой стадии — max retries slider, delay input, backoff multiplier. Preview: визуализация задержек (attempt 1: 500ms, attempt 2: 750ms, ...).
- **Критерии готовности:**
  - [ ] Конфигурация per-stage
  - [ ] Preview визуализация задержек
  - [ ] Отображение текущего retry_rate per stage
- **Оценка:** 4h
- **Story:** STORY-081

**[TASK-0427]** QA: тестирование retry policy
- **Тип:** QA
- **Описание:** Тесты: retry с backoff (проверка задержек), max_retries 0 = no retry, 3-уровневое наследование (override корректен), retry logs accuracy.
- **Критерии готовности:**
  - [ ] Проверка точности задержек (допуск ±50ms)
  - [ ] Проверка всех 3 уровней конфигурации
- **Оценка:** 4h
- **Story:** STORY-081

---

### [STORY-082] Настройка autologin per-broker
**Как** Affiliate Manager, **я хочу** настраивать параметры autologin индивидуально для каждого брокера (URL шаблон, auth method, специфичные headers), **чтобы** интеграция работала с любой брокерской платформой.

**Acceptance Criteria:**
- [ ] AC1: Для каждого брокера настраивается: autologin URL template (с переменными {{lead_id}}, {{email}}, {{token}}), HTTP method, custom headers, auth method (basic/bearer/custom)
- [ ] AC2: Поддержка 3 типов autologin: redirect (HTTP 302), API-based (server-to-server), iframe embedding
- [ ] AC3: Тест autologin: кнопка "Test" отправляет test-запрос и показывает полный response (status, headers, body, timing)
- [ ] AC4: Template variables подставляются из профиля лида и настроек брокера
- [ ] AC5: Настройки можно клонировать с другого брокера ("Clone from...")
- [ ] AC6: Валидация URL template перед сохранением (проверка обязательных переменных)

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-08
**Зависит от:** STORY-075

#### Tasks:

**[TASK-0428]** Backend: per-broker autologin configuration
- **Тип:** Backend
- **Описание:** Таблица `broker_autologin_configs` (broker_id, url_template, http_method, headers jsonb, auth_type, auth_credentials encrypted, autologin_type enum). API: CRUD + test endpoint + clone.
- **Критерии готовности:**
  - [ ] Credentials хранятся зашифрованными (AES-256)
  - [ ] Template variable substitution корректно работает
  - [ ] Clone копирует все настройки кроме credentials
- **Оценка:** 8h
- **Story:** STORY-082

**[TASK-0429]** Frontend: форма настройки autologin для брокера
- **Тип:** Frontend
- **Описание:** В карточке брокера — вкладка Autologin: форма с полями конфигурации, live preview URL с подставленными переменными, кнопка Test, кнопка Clone from.
- **Критерии готовности:**
  - [ ] Live preview URL при вводе
  - [ ] Test результат показывает status, timing, response body
  - [ ] Clone from — выпадающий список доступных брокеров
- **Оценка:** 8h
- **Story:** STORY-082

**[TASK-0430]** QA: тестирование per-broker autologin config
- **Тип:** QA
- **Описание:** Тесты: все 3 типа autologin, clone функция, test endpoint, невалидный URL template, пустые credentials.
- **Критерии готовности:**
  - [ ] Все 3 типа autologin протестированы
  - [ ] Edge cases: пустые поля, невалидные URL, спецсимволы
- **Оценка:** 4h
- **Story:** STORY-082

---

### [STORY-083] Логирование и аудит autologin pipeline
**Как** Team Lead, **я хочу** просматривать полный лог каждого autologin запуска с деталями каждой стадии, **чтобы** диагностировать проблемы и оптимизировать конфигурацию.

**Acceptance Criteria:**
- [ ] AC1: Для каждого pipeline execution хранится: все 4 стадии с timing, request/response (headers, body truncated to 10KB), proxy used, fingerprint used, retries
- [ ] AC2: Лог доступен через UI: поиск по lead_id, broker_id, status, date range
- [ ] AC3: Таблица логов показывает: lead_id, broker, status (цвет), total duration, failed stage, timestamp
- [ ] AC4: Drill-down на pipeline: timeline всех стадий с details для каждой
- [ ] AC5: Retention policy: подробные логи хранятся 90 дней, агрегаты — 12 месяцев
- [ ] AC6: Экспорт логов в CSV для анализа (до 10,000 записей)

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-08
**Зависит от:** STORY-075

#### Tasks:

**[TASK-0431]** Backend: structured logging для pipeline
- **Тип:** Backend
- **Описание:** Каждая стадия pipeline записывает structured log: request details (URL, method, headers без secrets, body preview), response (status, headers, body preview), proxy_id, fingerprint_id, duration_ms, error. Retention: 90 дней detailed, 12 мес aggregated.
- **Критерии готовности:**
  - [ ] Sensitive данные (пароли, токены) маскируются в логах
  - [ ] Body truncation до 10KB
  - [ ] Автоматическая очистка по retention policy (cron)
- **Оценка:** 8h
- **Story:** STORY-083

**[TASK-0432]** Frontend: UI логов autologin
- **Тип:** Frontend
- **Описание:** Страница Autologin → Logs: таблица с фильтрами (lead_id, broker, status, date), drill-down на pipeline timeline, кнопка Export CSV. Pagination server-side (50 записей на страницу).
- **Критерии готовности:**
  - [ ] Server-side пагинация и фильтрация
  - [ ] Drill-down показывает полную timeline pipeline
  - [ ] CSV экспорт до 10,000 записей
- **Оценка:** 8h
- **Story:** STORY-083

**[TASK-0433]** DevOps: retention policy и архивация
- **Тип:** DevOps
- **Описание:** Cron job для архивации логов старше 90 дней (в cold storage / S3), удаление архивов старше 12 мес. Мониторинг размера таблицы логов.
- **Критерии готовности:**
  - [ ] Автоматическая архивация по расписанию
  - [ ] Мониторинг размера таблицы с алертом при > 50GB
- **Оценка:** 4h
- **Story:** STORY-083

---

## [EPIC-09] Automated Lead Delivery (UAD)

**Цель:** Реализовать сценарный движок автоматической переотправки лидов со статусами rejected/no_answer/cold с настраиваемыми расписаниями, интервалами и фильтрами, обеспечивая максимальную монетизацию каждого лида.

**Метрика успеха:**
- Конверсия переотправленных лидов >= 5% (из общего числа resent leads)
- Время настройки UAD сценария < 5 минут
- 100% лидов подходящих под сценарий обрабатываются автоматически без пропусков
- Поддержка минимум 10 одновременных UAD сценариев на аккаунт

**Приоритет:** P1 (Launch)
**Зависит от:** EPIC-02 (Lead Routing Engine), EPIC-05 (Lead Management UI)
**Оценка:** L (1-3 мес)

---

### [STORY-084] Создание и управление UAD сценариями
**Как** Affiliate Manager, **я хочу** создавать UAD сценарии с визуальным конструктором (источник лидов → фильтры → расписание → целевой брокер), **чтобы** автоматически переотправлять лиды подходящие под критерии.

**Acceptance Criteria:**
- [ ] AC1: Конструктор сценария включает 4 блока: Source (статусы лидов, возраст лидов), Filters (GEO, affiliate, broker source), Schedule (время работы, timezone), Target (брокер/группа брокеров)
- [ ] AC2: Поддержка минимум 14 типов сценариев: по статусу (rejected, no_answer, cold, invalid_number, duplicate, caps_full), по возрасту (1d, 3d, 7d, 14d, 30d), по GEO, комбинированные
- [ ] AC3: Каждый сценарий имеет: название, описание, enabled/disabled toggle, приоритет (1-100)
- [ ] AC4: API: `POST /api/v1/uad/scenarios`, `GET/PUT/DELETE /api/v1/uad/scenarios/{id}`
- [ ] AC5: Валидация: target broker должен быть активен и иметь свободные caps
- [ ] AC6: Максимум 50 сценариев на аккаунт
- [ ] AC7: Шаблоны сценариев: "Re-send Rejected to Backup", "Cold Leads 7d Revival", "GEO Overflow"

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-09

#### Tasks:

**[TASK-0434]** Backend: модель данных UAD сценариев
- **Тип:** Backend
- **Описание:** Таблицы: `uad_scenarios` (id, name, description, company_id, enabled, priority, source_config jsonb, filter_config jsonb, schedule_config jsonb, target_config jsonb, stats jsonb, created_at, updated_at). `uad_scenario_executions` (id, scenario_id, lead_id, status, result, created_at).
- **Критерии готовности:**
  - [ ] Миграция создана и протестирована
  - [ ] Индексы на company_id, enabled, priority
  - [ ] JSON schema валидация для config полей
- **Оценка:** 8h
- **Story:** STORY-084

**[TASK-0435]** Backend: CRUD API для UAD сценариев
- **Тип:** Backend
- **Описание:** REST API: создание, чтение (list с фильтрами + single), обновление, удаление, enable/disable, clone, reorder (приоритет). Валидация конфигурации при сохранении. Шаблоны сценариев как pre-defined configs.
- **Критерии готовности:**
  - [ ] Все CRUD операции работают
  - [ ] Валидация: target broker active, GEO filter valid
  - [ ] 5+ встроенных шаблонов сценариев
- **Оценка:** 8h
- **Story:** STORY-084

**[TASK-0436]** Frontend: визуальный конструктор UAD сценариев
- **Тип:** Frontend
- **Описание:** Страница UAD → New Scenario: step-by-step wizard (Source → Filters → Schedule → Target → Review). Каждый шаг — карточка с настройками. Preview: "Этот сценарий переотправит ~340 лидов с статусом rejected из DE/AT старше 3 дней".
- **Критерии готовности:**
  - [ ] 4-step wizard с валидацией на каждом шаге
  - [ ] Preview количества лидов подходящих под фильтры (live count)
  - [ ] Template selector на первом шаге
- **Оценка:** 16h
- **Story:** STORY-084

**[TASK-0437]** Design: wireframes для UAD конструктора
- **Тип:** Design
- **Описание:** Wireframes для: список сценариев (карточки с status/stats), конструктор (4-step wizard), template picker, execution log.
- **Критерии готовности:**
  - [ ] Wireframes для 4 основных экранов
  - [ ] Mobile-responsive вариант
- **Оценка:** 8h
- **Story:** STORY-084

**[TASK-0438]** QA: тестирование CRUD сценариев
- **Тип:** QA
- **Описание:** Тесты: создание всех 14 типов сценариев, валидация (неактивный брокер, невалидный GEO), clone, enable/disable, лимит 50 сценариев.
- **Критерии готовности:**
  - [ ] 14 типов сценариев протестированы
  - [ ] Edge cases: лимит, невалидные конфигурации
- **Оценка:** 4h
- **Story:** STORY-084

---

### [STORY-085] Расписание UAD с timezone
**Как** Affiliate Manager, **я хочу** настраивать расписание работы UAD сценария с учётом timezone брокера, **чтобы** лиды переотправлялись только в рабочие часы целевого региона.

**Acceptance Criteria:**
- [ ] AC1: Расписание настраивается per-day-of-week с указанием start_time и end_time (HH:MM)
- [ ] AC2: Timezone выбирается из списка IANA timezones (Europe/London, Asia/Dubai, etc.)
- [ ] AC3: Поддержка "рабочих дней" preset: Mon-Fri 09:00-18:00 в выбранной timezone
- [ ] AC4: Визуальный week-grid для настройки расписания (drag для выделения временных слотов)
- [ ] AC5: Preview: "Следующая отправка: через 2ч 15мин (Пн 09:00 Europe/London)"
- [ ] AC6: Сценарий автоматически паузится вне расписания и возобновляется по расписанию

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-09
**Зависит от:** STORY-084

#### Tasks:

**[TASK-0439]** Backend: schedule engine с timezone
- **Тип:** Backend
- **Описание:** Scheduler: cron-like evaluator с timezone support. Для каждого сценария вычислять next_run_at при сохранении и после каждого execution. Использовать IANA timezones. Учитывать DST transitions.
- **Критерии готовности:**
  - [ ] Корректный расчёт next_run_at с учётом DST
  - [ ] Per-day-of-week конфигурация
  - [ ] Presets: weekdays, weekends, 24/7
- **Оценка:** 8h
- **Story:** STORY-085

**[TASK-0440]** Frontend: visual schedule editor
- **Тип:** Frontend
- **Описание:** Компонент `WeekScheduleGrid`: 7 строк (дни) × 24 столбца (часы), drag-select для активации слотов, timezone picker dropdown с поиском, preset buttons.
- **Критерии готовности:**
  - [ ] Drag-select для временных слотов
  - [ ] Timezone picker с поиском (300+ timezones)
  - [ ] Preview next execution time
- **Оценка:** 8h
- **Story:** STORY-085

---

### [STORY-086] Batch intervals и throttling
**Как** Affiliate Manager, **я хочу** настраивать интервал между batch-отправками лидов (от 2 до 20 минут) и размер batch, **чтобы** не перегружать брокера и имитировать естественный поток лидов.

**Acceptance Criteria:**
- [ ] AC1: Настраиваемый интервал между batch: от 2 до 60 минут (шаг 1 минута)
- [ ] AC2: Настраиваемый размер batch: от 1 до 100 лидов
- [ ] AC3: Random jitter: ±20% от интервала для имитации естественного потока (настраивается)
- [ ] AC4: Throttle: max leads per hour per scenario — жёсткий лимит
- [ ] AC5: Метрики: leads_sent_per_batch (avg), interval_actual (avg), total_sent_today
- [ ] AC6: При заполнении cap брокера — автоматическая пауза сценария с уведомлением

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-09
**Зависит от:** STORY-084

#### Tasks:

**[TASK-0441]** Backend: batch processor с throttling
- **Тип:** Backend
- **Описание:** Worker для UAD: fetch eligible leads (batch_size), send via routing engine, wait interval (with jitter), repeat. Throttle: token bucket per scenario. Auto-pause при cap exhaustion.
- **Критерии готовности:**
  - [ ] Batch size 1-100 корректно работает
  - [ ] Jitter ±20% применяется к интервалу
  - [ ] Token bucket throttle с per-hour limit
  - [ ] Auto-pause + notification при cap full
- **Оценка:** 16h
- **Story:** STORY-086

**[TASK-0442]** Frontend: настройка batch параметров
- **Тип:** Frontend
- **Описание:** В шаге Schedule конструктора — секция Batch: sliders для interval и batch_size, toggle для jitter, input для hourly limit. Калькулятор: "При текущих настройках будет отправлено ~120 лидов за 8ч рабочий день".
- **Критерии готовности:**
  - [ ] Sliders с live preview
  - [ ] Калькулятор estimated throughput
- **Оценка:** 4h
- **Story:** STORY-086

---

### [STORY-087] Continuous mode (непрерывная переотправка)
**Как** Affiliate Manager, **я хочу** включить continuous mode для UAD сценария, **чтобы** система непрерывно мониторила новые лиды подходящие под фильтры и отправляла их без ожидания batch-интервала.

**Acceptance Criteria:**
- [ ] AC1: Continuous mode: при появлении нового лида подходящего под фильтры сценария — автоматическая отправка в течение 30 секунд
- [ ] AC2: Toggle: batch mode / continuous mode — взаимоисключающие
- [ ] AC3: В continuous mode сохраняется throttle (max per hour)
- [ ] AC4: Событие "лид изменил статус на подходящий" триггерит проверку всех continuous сценариев
- [ ] AC5: Метрики continuous: avg_pickup_time (время от появления лида до отправки), queue_depth
- [ ] AC6: При перегрузке (queue > 100) — автоматическое переключение на batch mode с алертом

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-09
**Зависит от:** STORY-086

#### Tasks:

**[TASK-0443]** Backend: event-driven continuous processor
- **Тип:** Backend
- **Описание:** Подписка на события изменения статуса лида (через internal message queue). При match с continuous scenario — добавить в priority queue. Worker обрабатывает queue с throttle. Fallback на batch при перегрузке.
- **Критерии готовности:**
  - [ ] Event-driven: реакция < 30 секунд на новый eligible лид
  - [ ] Throttle сохраняется в continuous mode
  - [ ] Auto-fallback при queue > 100
  - [ ] Метрики: pickup_time, queue_depth
- **Оценка:** 16h
- **Story:** STORY-087

**[TASK-0444]** Frontend: continuous mode toggle и мониторинг
- **Тип:** Frontend
- **Описание:** Toggle batch/continuous в настройках сценария. В continuous mode показывать: текущий queue depth, avg pickup time, live feed последних 10 отправок.
- **Критерии готовности:**
  - [ ] Toggle с подтверждением при переключении
  - [ ] Live queue depth indicator
  - [ ] Feed последних отправок с auto-refresh
- **Оценка:** 8h
- **Story:** STORY-087

**[TASK-0445]** QA: тестирование continuous mode
- **Тип:** QA
- **Описание:** Тесты: pickup time < 30s, throttle в continuous, fallback при перегрузке, concurrent events, edge case — лид match для 2+ сценариев (приоритет решает).
- **Критерии готовности:**
  - [ ] Pickup time < 30s в 95% случаев на тестовых данных
  - [ ] Нет дублирования при match нескольких сценариев
- **Оценка:** 8h
- **Story:** STORY-087

---

### [STORY-088] Cold overflow pools
**Как** Affiliate Manager, **я хочу** настраивать cold overflow пулы для лидов которые не прошли маршрутизацию (caps full, no matching broker), **чтобы** ни один лид не терялся и мог быть переотправлен позже.

**Acceptance Criteria:**
- [ ] AC1: При отказе маршрутизации (caps full, no match, broker unavailable) лид автоматически попадает в overflow pool
- [ ] AC2: Overflow pools создаются per-reason: `caps_full`, `no_match`, `broker_error`, `manual_reject`
- [ ] AC3: Pool показывает: количество лидов, breakdown по GEO, breakdown по original affiliate, age distribution
- [ ] AC4: UAD сценарий может использовать overflow pool как source (вместо/вместе с фильтрами по статусу)
- [ ] AC5: Лиды в pool автоматически удаляются через настраиваемый TTL (default: 30 дней)
- [ ] AC6: Manual операции с pool: select all/filtered → re-route, export, delete

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-09

#### Tasks:

**[TASK-0446]** Backend: overflow pool management
- **Тип:** Backend
- **Описание:** Таблица `overflow_pools` (id, company_id, reason, ttl_days). Таблица `overflow_pool_leads` (pool_id, lead_id, added_at, expires_at). Auto-routing: при rejection → insert в соответствующий pool. TTL cron job для cleanup.
- **Критерии готовности:**
  - [ ] Автоматическое добавление при rejection
  - [ ] TTL cleanup cron (ежечасно)
  - [ ] API: list pools, pool stats, pool leads с фильтрами
- **Оценка:** 8h
- **Story:** STORY-088

**[TASK-0447]** Frontend: UI overflow pools
- **Тип:** Frontend
- **Описание:** Страница UAD → Overflow Pools: карточки пулов с stats (count, top GEO, age), drill-down на лиды в пуле, bulk actions (re-route, export, delete), настройки TTL.
- **Критерии готовности:**
  - [ ] Карточки пулов с real-time count
  - [ ] Bulk re-route с выбором target broker
  - [ ] Export в CSV
- **Оценка:** 8h
- **Story:** STORY-088

**[TASK-0448]** QA: тестирование overflow pools
- **Тип:** QA
- **Описание:** Тесты: авто-routing в правильный пул, TTL cleanup, bulk re-route, UAD scenario с pool source, лид в нескольких pools (edge case).
- **Критерии готовности:**
  - [ ] Все 4 типа пулов тестированы
  - [ ] TTL cleanup удаляет expired лиды
  - [ ] Bulk операции на 1000+ лидах
- **Оценка:** 4h
- **Story:** STORY-088

---

### [STORY-089] Фильтрация UAD по статусу и GEO
**Как** Affiliate Manager, **я хочу** фильтровать лиды в UAD сценарии по комбинации статусов, GEO, возрасту лида, source affiliate и source broker, **чтобы** точно контролировать какие лиды переотправляются.

**Acceptance Criteria:**
- [ ] AC1: Фильтры: lead_status (multiselect), countries (multiselect с country groups), lead_age_min/max (часы/дни), source_affiliate_ids, source_broker_ids, exclude_broker_ids (куда НЕ отправлять)
- [ ] AC2: Логические операции: AND между фильтрами, OR внутри multiselect
- [ ] AC3: Preview: "338 лидов соответствуют фильтрам" — обновляется в реальном времени
- [ ] AC4: Saved filters: сохранить комбинацию фильтров как preset для повторного использования
- [ ] AC5: Exclude filter: исключить лидов которые уже были в UAD за последние N дней (configurable, default: 7)
- [ ] AC6: Dry run: "Показать 10 лидов которые будут отправлены" — без фактической отправки

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-09
**Зависит от:** STORY-084

#### Tasks:

**[TASK-0449]** Backend: filter engine для UAD
- **Тип:** Backend
- **Описание:** Реализовать query builder для UAD фильтров: dynamic SQL generation на основе filter config. Оптимизация: использовать индексы на status, country, created_at, affiliate_id. Preview count: `SELECT COUNT(*)` с фильтрами. Dry run: `SELECT * LIMIT 10`.
- **Критерии готовности:**
  - [ ] Query выполняется < 500ms на 1M лидов
  - [ ] Все 6 типов фильтров работают в комбинации
  - [ ] Exclude filter проверяет uad_scenario_executions
- **Оценка:** 8h
- **Story:** STORY-089

**[TASK-0450]** Frontend: компонент фильтров UAD
- **Тип:** Frontend
- **Описание:** Компонент `UADFilterPanel`: multiselect для статусов и стран (с группами), range input для возраста, affiliate/broker pickers, live count preview, кнопки Save Preset / Dry Run.
- **Критерии готовности:**
  - [ ] Live preview count обновляется при каждом изменении фильтра (debounce 500ms)
  - [ ] Saved presets: create, load, delete
  - [ ] Dry run показывает таблицу из 10 лидов
- **Оценка:** 8h
- **Story:** STORY-089

---

### [STORY-090] Proxy для UAD переотправки
**Как** Network Admin, **я хочу** назначать proxy-серверы для UAD сценариев, **чтобы** переотправка лидов выполнялась через IP соответствующий GEO лида.

**Acceptance Criteria:**
- [ ] AC1: UAD сценарий может использовать: auto (proxy по GEO лида из общего пула), specific proxy group, no proxy
- [ ] AC2: Proxy group — именованная группа proxy для UAD: "EU Residential", "US Datacenter"
- [ ] AC3: При недоступности всех proxy в группе — отправка ставится в queue (не fail)
- [ ] AC4: Метрики: proxy usage per UAD scenario, success rate per proxy group

**Story Points:** 3
**Приоритет:** Could
**Epic:** EPIC-09
**Зависит от:** STORY-077, STORY-084

#### Tasks:

**[TASK-0451]** Backend: proxy integration для UAD
- **Тип:** Backend
- **Описание:** Расширить UAD scenario config: proxy_mode (auto/group/none), proxy_group_id. Интеграция с ProxyPoolManager из EPIC-08. Queue fallback при unavailable proxy.
- **Критерии готовности:**
  - [ ] Все 3 proxy modes работают
  - [ ] Queue fallback вместо fail
  - [ ] Метрики usage/success per proxy group
- **Оценка:** 8h
- **Story:** STORY-090

**[TASK-0452]** Frontend: proxy настройка в UAD сценарии
- **Тип:** Frontend
- **Описание:** В конструкторе UAD — секция Proxy: radio buttons (Auto/Group/None), dropdown для выбора proxy group, preview доступных proxy для выбранного GEO.
- **Критерии готовности:**
  - [ ] Radio selection с conditional fields
  - [ ] Preview количества доступных proxy per GEO
- **Оценка:** 4h
- **Story:** STORY-090

---

### [STORY-091] Dashboard и мониторинг UAD сценариев
**Как** Affiliate Manager, **я хочу** видеть дашборд всех UAD сценариев с метриками выполнения в реальном времени, **чтобы** контролировать эффективность переотправки и оперативно реагировать на проблемы.

**Acceptance Criteria:**
- [ ] AC1: Dashboard показывает: все сценарии как карточки с status (running/paused/error), leads_sent_today, success_rate_today, next_run_at
- [ ] AC2: Для каждого сценария: график leads sent per hour за последние 24 часа
- [ ] AC3: KPI tiles (суммарные): total_resent_today, total_converted, conversion_rate, avg_pickup_time
- [ ] AC4: Execution log: таблица всех отправок с результатом (sent/failed/skipped/caps_full), lead_id, broker, timestamp
- [ ] AC5: Start/Stop/Pause controls для каждого сценария прямо из dashboard
- [ ] AC6: Error panel: список сценариев с ошибками, причина ошибки, время последней ошибки

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-09
**Зависит от:** STORY-084

#### Tasks:

**[TASK-0453]** Backend: API для UAD dashboard metrics
- **Тип:** Backend
- **Описание:** Endpoints: `GET /api/v1/uad/dashboard` (summary KPIs), `GET /api/v1/uad/scenarios/{id}/metrics?period=24h` (per-scenario metrics), `GET /api/v1/uad/executions?scenario_id=&status=&date_from=` (execution log). Кеширование summary на 30 секунд.
- **Критерии готовности:**
  - [ ] Dashboard API response < 300ms
  - [ ] Per-scenario hourly breakdown
  - [ ] Execution log с пагинацией
- **Оценка:** 8h
- **Story:** STORY-091

**[TASK-0454]** Frontend: UAD dashboard
- **Тип:** Frontend
- **Описание:** Страница UAD → Dashboard: KPI tiles наверху, grid сценариев (карточки с mini-chart, status badge, controls), execution log таблица внизу, error panel sidebar.
- **Критерии готовности:**
  - [ ] Auto-refresh каждые 30 секунд
  - [ ] Start/Stop/Pause controls с confirmation dialog
  - [ ] Responsive layout для 3+ сценариев
- **Оценка:** 16h
- **Story:** STORY-091

**[TASK-0455]** QA: end-to-end тестирование UAD
- **Тип:** QA
- **Описание:** E2E тест: создать сценарий → лиды попадают под фильтры → batch execution → лиды переотправлены → метрики обновились. Тест continuous mode. Тест failover при caps full.
- **Критерии готовности:**
  - [ ] E2E happy path пройден
  - [ ] Continuous mode протестирован
  - [ ] Error scenarios (caps full, broker down) покрыты
- **Оценка:** 8h
- **Story:** STORY-091

---

## [EPIC-10] Analytics Dashboard v1

**Цель:** Создать наиболее мощный аналитический дашборд на рынке CRM для affiliate-маркетинга: real-time KPI, time-series с drill-down, когортный анализ, предиктивные метрики и 15+ фильтров — закрыв главный гэп конкурентов (ни у кого нет нормальной аналитики).

**Метрика успеха:**
- Время загрузки dashboard < 2 секунды при 500K+ лидов
- 15+ параметров фильтрации работают в любой комбинации
- NPS аналитики >= 8/10 (опрос пользователей)
- 80% пользователей используют dashboard ежедневно

**Приоритет:** P1 (Launch)
**Зависит от:** EPIC-01 (Lead Intake API), EPIC-02 (Lead Routing Engine), EPIC-03 (Broker Integration Layer)
**Оценка:** XL (3+ мес)

---

### [STORY-092] KPI tiles и real-time summary
**Как** Team Lead, **я хочу** видеть ключевые KPI на главном дашборде (leads today, FTD, CR%, revenue, rejected%, avg response time) с обновлением в реальном времени, **чтобы** мгновенно оценивать состояние операций.

**Acceptance Criteria:**
- [ ] AC1: Минимум 8 KPI tiles: Leads Today, FTD Count, CR% (FTD/Leads), Revenue, Rejected%, Avg Response Time, Active Caps (used/total), Fraud Blocked
- [ ] AC2: Каждый tile показывает: текущее значение, delta vs вчера (% и абсолют), trend arrow (up/down/flat)
- [ ] AC3: Данные обновляются каждые 30 секунд без перезагрузки страницы
- [ ] AC4: При клике на tile — drill-down к соответствующему отчёту
- [ ] AC5: KPI рассчитываются с учётом применённых фильтров (если выбран конкретный affiliate — KPI только по нему)
- [ ] AC6: Время загрузки всех tiles < 1 секунда
- [ ] AC7: Пользователь может выбрать какие tiles показывать и менять порядок (drag-and-drop)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-10

#### Tasks:

**[TASK-0456]** Backend: KPI aggregation engine
- **Тип:** Backend
- **Описание:** Сервис `KPIAggregator`: real-time подсчёт KPI из materialized views. Pre-aggregation по: company_id, date, affiliate_id, broker_id, geo. Инкрементальное обновление каждые 30 секунд. API: `GET /api/v1/analytics/kpi?date=today&filters=...`
- **Критерии готовности:**
  - [ ] 8 KPI рассчитываются < 500ms
  - [ ] Materialized views обновляются каждые 30 секунд
  - [ ] Delta calculation vs yesterday корректен
  - [ ] Фильтры применяются ко всем KPI одновременно
- **Оценка:** 16h
- **Story:** STORY-092

**[TASK-0457]** Frontend: KPI tiles component
- **Тип:** Frontend
- **Описание:** Компонент `KPIDashboard`: grid из 8 tile-карточек, каждая с value, delta, trend arrow, click handler для drill-down. Drag-and-drop для reorder. Настройка видимости tiles через gear icon. Auto-refresh interval 30s.
- **Критерии готовности:**
  - [ ] 8 tiles с анимацией обновления
  - [ ] Drag-and-drop reorder с сохранением в user preferences
  - [ ] Responsive: 4 колонки desktop, 2 tablet, 1 mobile
- **Оценка:** 8h
- **Story:** STORY-092

**[TASK-0458]** Design: дизайн KPI dashboard
- **Тип:** Design
- **Описание:** UI design для KPI tiles: color scheme (green positive, red negative), typography для крупных чисел, delta layout, hover state с tooltip. Dark/light mode варианты.
- **Критерии готовности:**
  - [ ] Figma mockups для desktop и mobile
  - [ ] Color palette для positive/negative/neutral states
- **Оценка:** 4h
- **Story:** STORY-092

**[TASK-0459]** QA: тестирование KPI accuracy
- **Тип:** QA
- **Описание:** Проверка точности каждого KPI: вручную посчитать на тестовых данных (100 leads) и сравнить с dashboard. Проверка delta vs yesterday. Проверка при пустых данных. Проверка с фильтрами.
- **Критерии готовности:**
  - [ ] Каждый из 8 KPI проверен на точность
  - [ ] Delta расчёт корректен для edge cases (вчера = 0)
  - [ ] Фильтры корректно влияют на все KPI
- **Оценка:** 4h
- **Story:** STORY-092

---

### [STORY-093] Time-series графики с drill-down
**Как** Team Lead, **я хочу** видеть time-series графики (leads, FTD, CR%, revenue) с возможностью drill-down по клику на точку графика, **чтобы** анализировать тренды и находить аномалии.

**Acceptance Criteria:**
- [ ] AC1: 4 типа time-series: leads count, FTD count, CR%, revenue — переключаются табами
- [ ] AC2: Гранулярность: hourly (за сегодня/вчера), daily (за 7/30/90 дней), weekly (за 6 месяцев), monthly (за год)
- [ ] AC3: Drill-down: клик на точку графика открывает breakdown (по affiliate, broker, GEO) за выбранный интервал
- [ ] AC4: Overlay: наложение 2-х метрик на один график (dual Y-axis), например leads + CR%
- [ ] AC5: Zoom: выделение области мышью для увеличения временного периода
- [ ] AC6: Annotations: admin может добавить заметку к точке на графике ("Запуск новой кампании", "Брокер X упал")
- [ ] AC7: Загрузка графика < 2 секунды для периода 90 дней с 500K+ лидов

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-10

#### Tasks:

**[TASK-0460]** Backend: time-series data API
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/timeseries?metric=leads&granularity=daily&from=&to=&filters=`. Возвращает массив точек [{timestamp, value, ...dimensions}]. Pre-aggregated таблицы для hourly/daily/monthly. Drill-down: `GET /api/v1/analytics/timeseries/drilldown?metric=&timestamp=&dimension=affiliate`.
- **Критерии готовности:**
  - [ ] 4 метрики с 4 гранулярностями
  - [ ] Response < 1 секунда для 90 дней daily
  - [ ] Drill-down по 3 dimensions (affiliate, broker, geo)
- **Оценка:** 16h
- **Story:** STORY-093

**[TASK-0461]** Frontend: time-series chart component
- **Тип:** Frontend
- **Описание:** Компонент `TimeSeriesChart` (на базе Chart.js или Recharts): line chart с переключением метрик, granularity selector, date range picker, drill-down panel (sidebar), dual-axis overlay, zoom selection, annotation markers.
- **Критерии готовности:**
  - [ ] Smooth rendering 365 data points
  - [ ] Drill-down sidebar с breakdown таблицей
  - [ ] Dual Y-axis overlay работает корректно
  - [ ] Zoom selection с reset button
- **Оценка:** 16h
- **Story:** STORY-093

**[TASK-0462]** Backend: annotations API
- **Тип:** Backend
- **Описание:** Таблица `chart_annotations` (id, company_id, metric, timestamp, text, created_by, created_at). CRUD API. Аннотации привязаны к timestamp и видны всем пользователям company.
- **Критерии готовности:**
  - [ ] CRUD для annotations
  - [ ] Annotations включены в timeseries response
- **Оценка:** 4h
- **Story:** STORY-093

**[TASK-0463]** QA: тестирование time-series
- **Тип:** QA
- **Описание:** Тесты: корректность агрегации (hourly сумма = daily), drill-down данные соответствуют parent точке, zoom сохраняет фильтры, overlay отображает корректные оси.
- **Критерии готовности:**
  - [ ] Агрегация проверена для всех 4 гранулярностей
  - [ ] Drill-down суммы сходятся с parent
- **Оценка:** 8h
- **Story:** STORY-093

---

### [STORY-094] Affiliate-level P&L dashboard
**Как** Finance Manager, **я хочу** видеть P&L (прибыль и убыток) по каждому аффилейту с breakdown по брокерам и GEO, **чтобы** определять наиболее прибыльных аффилейтов и оптимизировать расходы.

**Acceptance Criteria:**
- [ ] AC1: Таблица P&L: строки = affiliates, колонки = leads, FTD, revenue (sell price), cost (buy price), profit, margin%
- [ ] AC2: Expand row: breakdown по брокерам для выбранного аффилейта
- [ ] AC3: Expand дальше: breakdown по GEO для каждого брокера
- [ ] AC4: Сортировка по любой колонке (по умолчанию: profit desc)
- [ ] AC5: Period selector: today, yesterday, this week, this month, custom range
- [ ] AC6: Totals row: сумма по всем аффилейтам
- [ ] AC7: Экспорт в CSV и PDF
- [ ] AC8: Color coding: margin < 0% красный, 0-10% жёлтый, > 10% зелёный

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-10
**Зависит от:** STORY-092

#### Tasks:

**[TASK-0464]** Backend: P&L aggregation API
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/pnl?group_by=affiliate&period=this_month&filters=`. Агрегация: SUM revenue, SUM cost, profit = revenue - cost, margin = profit/revenue*100. Drill-down levels: affiliate → broker → geo.
- **Критерии готовности:**
  - [ ] 3-level drill-down работает
  - [ ] Расчёт < 1 секунда для 100 аффилейтов за месяц
  - [ ] Totals row включён в response
- **Оценка:** 8h
- **Story:** STORY-094

**[TASK-0465]** Frontend: P&L таблица с expandable rows
- **Тип:** Frontend
- **Описание:** Компонент `PnLTable`: expandable tree-table (affiliate → broker → geo), сортировка, period selector, color-coded margin, export buttons (CSV, PDF).
- **Критерии готовности:**
  - [ ] 3-level expand/collapse
  - [ ] Сортировка по всем числовым колонкам
  - [ ] CSV и PDF export
  - [ ] Color coding margin
- **Оценка:** 16h
- **Story:** STORY-094

**[TASK-0466]** QA: тестирование P&L accuracy
- **Тип:** QA
- **Описание:** Сверка P&L на тестовом наборе данных: суммы drill-down = parent row, totals = sum всех rows, margin calculation edge cases (revenue = 0).
- **Критерии готовности:**
  - [ ] Математическая точность проверена
  - [ ] Edge case revenue=0 обработан (margin = "N/A")
- **Оценка:** 4h
- **Story:** STORY-094

---

### [STORY-095] Hub/broker ROI comparison
**Как** Network Admin, **я хочу** сравнивать ROI по брокерам и хабам на одном экране с визуальными чартами, **чтобы** перенаправлять трафик на наиболее эффективных брокеров.

**Acceptance Criteria:**
- [ ] AC1: Bar chart: ROI (%) по каждому брокеру за выбранный период, отсортированный по ROI desc
- [ ] AC2: Scatter plot: ось X = leads sent, ось Y = CR%, размер точки = revenue — для визуализации эффективности vs объём
- [ ] AC3: Таблица comparison: broker name, leads, FTD, CR%, avg response time, ROI%, rank change vs prev period
- [ ] AC4: Quick action: кнопка "Adjust Weight" открывает routing rule для изменения веса брокера
- [ ] AC5: Highlight: брокеры с CR% ниже среднего выделены как "underperforming"
- [ ] AC6: Period comparison: "This month vs Last month" side-by-side

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-10
**Зависит от:** STORY-092

#### Tasks:

**[TASK-0467]** Backend: broker ROI comparison API
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/broker-comparison?period=this_month&compare_period=last_month`. Возвращает: per-broker metrics (leads, ftd, cr, revenue, cost, roi), rank changes, avg benchmarks.
- **Критерии готовности:**
  - [ ] ROI = (revenue - cost) / cost * 100
  - [ ] Rank change vs compare period
  - [ ] Average benchmark для underperforming detection
- **Оценка:** 8h
- **Story:** STORY-095

**[TASK-0468]** Frontend: broker comparison dashboard
- **Тип:** Frontend
- **Описание:** Страница Analytics → Broker ROI: bar chart (ROI), scatter plot (volume vs efficiency), comparison table, period pickers (current + compare), quick action buttons.
- **Критерии готовности:**
  - [ ] Bar chart и scatter plot на одном экране
  - [ ] Side-by-side period comparison
  - [ ] "Adjust Weight" ведёт к routing rule editor
- **Оценка:** 16h
- **Story:** STORY-095

---

### [STORY-096] Traffic quality cohort analysis
**Как** Team Lead, **я хочу** анализировать когорты трафика по периоду привлечения и отслеживать как конверсия когорты меняется со временем, **чтобы** оценивать долгосрочное качество трафика от каждого аффилейта.

**Acceptance Criteria:**
- [ ] AC1: Когортная таблица: строки = недели привлечения (cohort), колонки = дни/недели после привлечения (age), значения = cumulative CR%
- [ ] AC2: Heatmap color coding: от красного (низкая CR%) до зелёного (высокая CR%)
- [ ] AC3: Фильтрация по: affiliate, broker, GEO, traffic source
- [ ] AC4: Размер когорты (leads count) отображается в каждой ячейке
- [ ] AC5: Comparison: наложить 2 аффилейта на один когортный график
- [ ] AC6: Export cohort data в CSV

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0469]** Backend: cohort analysis engine
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/cohorts?cohort_period=week&metric=cr&filters=`. Формирование когорт по created_at week. Расчёт cumulative metric для каждого age bucket. Кеширование результатов (когорты старше 2 недель не меняются).
- **Критерии готовности:**
  - [ ] Когорты за 12 недель рассчитываются < 3 секунд
  - [ ] Кеширование immutable cohorts
  - [ ] Comparison mode: 2 среза на одном запросе
- **Оценка:** 16h
- **Story:** STORY-096

**[TASK-0470]** Frontend: cohort heatmap
- **Тип:** Frontend
- **Описание:** Компонент `CohortHeatmap`: таблица-heatmap, color gradient, tooltip с деталями ячейки (cohort_size, metric value), filter panel, comparison toggle, export CSV.
- **Критерии готовности:**
  - [ ] Heatmap с корректным color gradient
  - [ ] Tooltip при hover на ячейку
  - [ ] Comparison: 2 аффилейта side-by-side
- **Оценка:** 16h
- **Story:** STORY-096

---

### [STORY-097] Shave detection analytics
**Как** Network Admin, **я хочу** видеть аналитику по детектированию shaving (откат статусов брокерами) с трендами и per-broker breakdown, **чтобы** оперативно выявлять нечестных брокеров.

**Acceptance Criteria:**
- [ ] AC1: Shave rate per broker: процент лидов со status rollback (FTD → cancelled, deposit → no deposit)
- [ ] AC2: Time-series shave rate: trend за 30 дней per broker
- [ ] AC3: Anomaly highlighting: если shave rate для брокера > 2x от его среднего — красный алерт
- [ ] AC4: Detail table: каждый suspected shave case — lead_id, original status, new status, time_diff, broker
- [ ] AC5: Comparison: shave rate по нашим данным vs данные affiliate (если доступны)
- [ ] AC6: Action button: "Dispute" — создать запрос на проверку к брокеру из интерфейса

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0471]** Backend: shave detection analytics API
- **Тип:** Backend
- **Описание:** API: `GET /api/v1/analytics/shave-detection?period=30d&broker_id=`. Анализ таблицы lead_status_history: найти rollback transitions, рассчитать shave_rate per broker, определить anomalies (> 2x avg). Detail: список suspected shaves с полным контекстом.
- **Критерии готовности:**
  - [ ] Rollback detection для всех статусных переходов
  - [ ] Anomaly detection: 2x threshold configurable
  - [ ] Response < 2 секунды для 30 дней
- **Оценка:** 16h
- **Story:** STORY-097

**[TASK-0472]** Frontend: shave detection dashboard
- **Тип:** Frontend
- **Описание:** Страница Analytics → Shave Detection: bar chart shave rate per broker (с anomaly highlighting), time-series trend, detail table с фильтрами, "Dispute" button.
- **Критерии готовности:**
  - [ ] Anomaly broker выделен красным
  - [ ] Detail table с pagination
  - [ ] Dispute button создаёт запись dispute
- **Оценка:** 8h
- **Story:** STORY-097

---

### [STORY-098] Predictive cap exhaustion warnings
**Как** Affiliate Manager, **я хочу** получать предупреждения о прогнозируемом исчерпании капов брокеров до того как кап будет заполнен, **чтобы** заранее перенастроить маршрутизацию.

**Acceptance Criteria:**
- [ ] AC1: Прогноз основан на скользящем среднем скорости заполнения за последние 3 часа
- [ ] AC2: Warning при прогнозе заполнения в ближайшие 2 часа (порог настраивается)
- [ ] AC3: Critical при прогнозе заполнения в ближайшие 30 минут
- [ ] AC4: Dashboard widget: список брокеров с ETA до cap exhaustion, отсортированный по urgency
- [ ] AC5: Визуализация: progress bar для каждого cap с прогнозной точкой
- [ ] AC6: Quick action: "Reduce Weight" / "Pause Broker" прямо из warning widget
- [ ] AC7: Уведомление через Telegram/email при warning и critical

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0473]** Backend: cap exhaustion prediction engine
- **Тип:** Backend
- **Описание:** Сервис `CapPredictor`: каждые 5 минут рассчитывать rate (leads/hour) для каждого активного cap. ETA = (cap_total - cap_used) / rate. Хранить prediction в кеше. Alert при ETA < threshold. API: `GET /api/v1/analytics/cap-predictions`.
- **Критерии готовности:**
  - [ ] Prediction пересчитывается каждые 5 минут
  - [ ] Moving average за 3 часа (configurable)
  - [ ] Alert генерируется для warning (2h) и critical (30min)
- **Оценка:** 8h
- **Story:** STORY-098

**[TASK-0474]** Frontend: cap prediction widget
- **Тип:** Frontend
- **Описание:** Widget `CapExhaustionWarnings`: список caps с progress bar, predicted ETA, urgency color (green/yellow/red), quick actions (Reduce Weight, Pause). Sortable по ETA asc.
- **Критерии готовности:**
  - [ ] Progress bar с prediction overlay
  - [ ] Color coding по urgency
  - [ ] Quick actions работают без перехода на другую страницу
- **Оценка:** 8h
- **Story:** STORY-098

---

### [STORY-099] Фильтрация 15+ параметров и saved presets
**Как** Affiliate Manager, **я хочу** фильтровать все отчёты по 15+ параметрам и сохранять комбинации фильтров как presets, **чтобы** быстро переключаться между часто используемыми срезами данных.

**Acceptance Criteria:**
- [ ] AC1: Минимум 15 параметров фильтрации: date_range, affiliate_id, broker_id, country, city, status, funnel, sub1-sub5, traffic_source, utm_source, utm_medium, utm_campaign, utm_content, device_type, fraud_score_range
- [ ] AC2: Все фильтры применяются ко всем отчётам на dashboard одновременно
- [ ] AC3: Saved presets: create (name + filters), load, update, delete — per user
- [ ] AC4: Share preset: генерация URL с encoded фильтрами для отправки коллеге
- [ ] AC5: Quick filters: предустановленные "Today", "Yesterday", "This Week", "Top 10 Affiliates"
- [ ] AC6: Filter panel collapse/expand для экономии экрана
- [ ] AC7: Active filters badge: показывает количество активных фильтров, кнопка "Clear All"

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-10

#### Tasks:

**[TASK-0475]** Backend: universal filter engine
- **Тип:** Backend
- **Описание:** Middleware для analytics APIs: парсинг filter query params (15+ полей), преобразование в SQL WHERE clause, валидация значений. Saved presets: таблица `analytics_filter_presets` (id, user_id, name, filters jsonb). Share: base64 encoded filter URL.
- **Критерии готовности:**
  - [ ] 15+ фильтров парсятся и валидируются
  - [ ] Presets CRUD API
  - [ ] Share URL generation и parsing
  - [ ] Все analytics endpoints поддерживают фильтры
- **Оценка:** 8h
- **Story:** STORY-099

**[TASK-0476]** Frontend: universal filter panel
- **Тип:** Frontend
- **Описание:** Компонент `AnalyticsFilterPanel`: collapsible sidebar с 15+ фильтрами (multiselect, range, date picker), preset selector (dropdown + save/delete), share button (copy URL), active filters summary (badges), "Clear All" button.
- **Критерии готовности:**
  - [ ] 15+ фильтров с appropriate input types
  - [ ] Preset save/load/delete
  - [ ] Share URL с clipboard copy
  - [ ] Active filter count badge
  - [ ] Responsive collapse на mobile
- **Оценка:** 16h
- **Story:** STORY-099

**[TASK-0477]** QA: тестирование фильтров
- **Тип:** QA
- **Описание:** Тесты: каждый из 15 фильтров по отдельности, комбинации 3-5 фильтров, preset save/load, share URL parsing, performance с 15 активными фильтрами на 500K лидов.
- **Критерии готовности:**
  - [ ] Каждый фильтр протестирован отдельно
  - [ ] Комбинации фильтров не ломают query
  - [ ] Performance < 2 секунды с 15 фильтрами
- **Оценка:** 8h
- **Story:** STORY-099

---

### [STORY-100] Cap report (статус заполнения)
**Как** Affiliate Manager, **я хочу** видеть отчёт по заполненности капов всех брокеров с историей заполнения, **чтобы** оперативно управлять распределением трафика.

**Acceptance Criteria:**
- [ ] AC1: Таблица: broker name, cap type (daily/total), cap limit, cap used, fill%, remaining, ETA to full
- [ ] AC2: Progress bar для каждого cap с color coding: < 70% зелёный, 70-90% жёлтый, > 90% красный
- [ ] AC3: History: график заполнения cap по часам за сегодня
- [ ] AC4: Фильтрация по: broker, GEO, cap type, fill status (< 50%, 50-90%, > 90%)
- [ ] AC5: Auto-refresh каждую минуту
- [ ] AC6: Экспорт текущего состояния капов в CSV

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-10

#### Tasks:

**[TASK-0478]** Backend: cap report API
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/cap-report?filters=`. Aggregate all active caps: current usage, fill %, remaining, ETA (from CapPredictor). History: `GET /api/v1/analytics/cap-report/{broker_id}/history?period=today` — hourly fill data.
- **Критерии готовности:**
  - [ ] Все активные caps в одном response
  - [ ] Hourly history за сегодня
  - [ ] ETA prediction included
- **Оценка:** 4h
- **Story:** STORY-100

**[TASK-0479]** Frontend: cap report page
- **Тип:** Frontend
- **Описание:** Страница Analytics → Cap Report: таблица с progress bars, color coding, expand row для hourly chart, фильтры, export CSV, auto-refresh badge.
- **Критерии готовности:**
  - [ ] Progress bars с color coding
  - [ ] Expand row с hourly chart
  - [ ] Auto-refresh с visual indicator
- **Оценка:** 8h
- **Story:** STORY-100

---

### [STORY-101] Funnel report
**Как** Team Lead, **я хочу** видеть воронку конверсии по стадиям (lead → sent → answered → FTD → deposit) с breakdown по аффилейтам, **чтобы** находить узкие места в конверсии.

**Acceptance Criteria:**
- [ ] AC1: Визуальная воронка: 5 стадий с conversion rate между каждой парой стадий
- [ ] AC2: Числа: абсолютные и процентные на каждой стадии
- [ ] AC3: Breakdown: клик на стадию показывает top-10 affiliates/brokers по drop-off
- [ ] AC4: Comparison: 2 периода / 2 аффилейта / 2 брокера side-by-side
- [ ] AC5: Фильтрация через universal filter panel
- [ ] AC6: Trend: conversion rate каждой стадии за 7 дней (mini sparkline)

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0480]** Backend: funnel analytics API
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/funnel?filters=&compare=`. Рассчитать count на каждой стадии, conversion rate между стадиями, top drop-off entities. Compare mode: 2 наборов данных в одном response.
- **Критерии готовности:**
  - [ ] 5 стадий воронки с корректными counts
  - [ ] Drop-off analysis per stage
  - [ ] Compare mode работает
- **Оценка:** 8h
- **Story:** STORY-101

**[TASK-0481]** Frontend: funnel visualization
- **Тип:** Frontend
- **Описание:** Компонент `FunnelChart`: визуальная воронка (трапеции уменьшающейся ширины), conversion rates между стадиями, click drill-down, comparison overlay, sparklines для trends.
- **Критерии готовности:**
  - [ ] Визуальная воронка с анимацией
  - [ ] Drill-down при клике на стадию
  - [ ] Side-by-side comparison
- **Оценка:** 16h
- **Story:** STORY-101

---

### [STORY-102] UTM analytics
**Как** Media Buyer, **я хочу** видеть аналитику по UTM-параметрам (source, medium, campaign, content, term) с метриками конверсии, **чтобы** оптимизировать рекламные кампании.

**Acceptance Criteria:**
- [ ] AC1: Таблица: группировка по utm_source → utm_medium → utm_campaign → utm_content (4-level drill-down)
- [ ] AC2: Метрики для каждого уровня: leads, FTD, CR%, revenue, cost, ROI%
- [ ] AC3: Pivot: возможность сменить первый уровень группировки (например, начать с campaign)
- [ ] AC4: Comparison: "This week vs Last week" для отслеживания динамики кампаний
- [ ] AC5: Top performers: автоматическое выделение UTM-комбинаций с CR% выше среднего
- [ ] AC6: Фильтрация через universal filter panel

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0482]** Backend: UTM analytics API
- **Тип:** Backend
- **Описание:** API `GET /api/v1/analytics/utm?group_by=source,medium,campaign&period=&filters=`. Multi-level aggregation по UTM-параметрам. Comparison с previous period. Top performers: CR% > avg * 1.2.
- **Критерии готовности:**
  - [ ] 4-level group_by с drill-down
  - [ ] Period comparison
  - [ ] Top performers highlighting
- **Оценка:** 8h
- **Story:** STORY-102

**[TASK-0483]** Frontend: UTM analytics page
- **Тип:** Frontend
- **Описание:** Страница Analytics → UTM: tree-table с expandable rows (4 levels), pivot selector (dropdown для первого level), comparison toggle, top performers badge, export CSV.
- **Критерии готовности:**
  - [ ] 4-level expandable tree table
  - [ ] Pivot переключение первого уровня
  - [ ] Comparison side-by-side
- **Оценка:** 8h
- **Story:** STORY-102

---

### [STORY-103] Compare periods
**Как** Team Lead, **я хочу** сравнивать показатели за два произвольных периода на одном экране, **чтобы** оценивать динамику и эффект от изменений.

**Acceptance Criteria:**
- [ ] AC1: 2 date range pickers: "Period A" и "Period B"
- [ ] AC2: Side-by-side comparison для всех метрик: leads, FTD, CR%, revenue, profit, margin
- [ ] AC3: Delta column: абсолютная и процентная разница (Period B - Period A)
- [ ] AC4: Overlay time-series: два периода наложены на один график (с сдвигом по оси X)
- [ ] AC5: Presets: "vs Yesterday", "vs Same Day Last Week", "vs Same Period Last Month"
- [ ] AC6: Работает со всеми отчётами: P&L, UTM, Funnel, Broker Comparison

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0484]** Backend: comparison engine
- **Тип:** Backend
- **Описание:** Расширить все analytics APIs: параметр `compare_from`/`compare_to` добавляет second dataset в response. Delta calculation: absolute и percentage. Time-series overlay: alignment по relative position.
- **Критерии готовности:**
  - [ ] Все analytics endpoints поддерживают comparison
  - [ ] Delta calculation (abs + %)
  - [ ] Time-series alignment для overlay
- **Оценка:** 8h
- **Story:** STORY-103

**[TASK-0485]** Frontend: comparison mode UI
- **Тип:** Frontend
- **Описание:** Global comparison toggle в filter panel: включает second date range picker. Все компоненты (tables, charts) переключаются в comparison mode: side-by-side, delta columns, overlay charts. Presets для quick compare.
- **Критерии готовности:**
  - [ ] Global toggle включает comparison для всей страницы
  - [ ] Side-by-side tables с delta
  - [ ] Overlay charts с легендой
  - [ ] Presets: 3 quick compare options
- **Оценка:** 8h
- **Story:** STORY-103

---

### [STORY-104] Q-Leads quality score integration
**Как** Media Buyer, **я хочу** видеть quality score для каждого лида и агрегированный quality score по аффилейту/кампании, **чтобы** оценивать качество трафика и оптимизировать источники.

**Acceptance Criteria:**
- [ ] AC1: Quality score 0-100 рассчитывается для каждого лида на основе: data completeness (20%), fraud score inverse (30%), response time (20%), conversion history of source (30%)
- [ ] AC2: Score отображается в таблице лидов с color badge (red < 30, yellow 30-70, green > 70)
- [ ] AC3: Агрегированный avg quality score по: affiliate, campaign, GEO, broker
- [ ] AC4: Trend chart: avg quality score по дням
- [ ] AC5: Threshold alert: уведомление если avg quality score аффилейта падает ниже 40 за последние 24 часа
- [ ] AC6: Quality score breakdown: при клике на score показать из чего он складывается (4 компонента)

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-10

#### Tasks:

**[TASK-0486]** Backend: quality score calculation engine
- **Тип:** Backend
- **Описание:** Сервис `QualityScorer`: при создании/обновлении лида рассчитывать score по 4 компонентам. Хранить score и breakdown в таблице leads. Агрегация: avg по dimensions. Threshold alerting: cron каждые 30 минут.
- **Критерии готовности:**
  - [ ] Score 0-100 рассчитывается для каждого лида
  - [ ] 4 компонента с весами настраиваются
  - [ ] Агрегация по 4 dimensions
  - [ ] Alert при avg < 40
- **Оценка:** 16h
- **Story:** STORY-104

**[TASK-0487]** Frontend: quality score visualization
- **Тип:** Frontend
- **Описание:** Color badge в таблице лидов, drill-down popup с breakdown по 4 компонентам, агрегированная таблица по affiliates/campaigns, trend chart quality score, alert настройка.
- **Критерии готовности:**
  - [ ] Badge с tooltip на hover
  - [ ] Breakdown popup для каждого лида
  - [ ] Aggregate table с sorting
  - [ ] Trend chart
- **Оценка:** 8h
- **Story:** STORY-104

---

## [EPIC-11] Notifications & Alerts

**Цель:** Реализовать multi-channel систему уведомлений (Telegram bot, email, webhook, in-app feed) с 17+ типами событий и гибкой фильтрацией, обеспечивая операционную прозрачность не хуже HyperOne.

**Метрика успеха:**
- 17+ типов событий для Telegram уведомлений
- Delivery latency уведомления < 30 секунд от момента события
- 90% пользователей подключают минимум 1 канал уведомлений в первую неделю
- Webhook delivery success rate >= 99.5%

**Приоритет:** P1 (Launch)
**Зависит от:** EPIC-01 (Lead Intake API), EPIC-02 (Lead Routing Engine)
**Оценка:** L (1-3 мес)

---

### [STORY-105] Telegram bot: setup и базовая интеграция
**Как** Network Admin, **я хочу** подключить Telegram бот к аккаунту компании через простой setup flow, **чтобы** получать уведомления о событиях системы в Telegram.

**Acceptance Criteria:**
- [ ] AC1: Setup flow: 1) Admin нажимает "Connect Telegram" → 2) Получает ссылку на бота → 3) Отправляет /start в боте → 4) Вводит verification code из UI → 5) Бот подключён
- [ ] AC2: Поддержка подключения к: личным чатам, группам, каналам
- [ ] AC3: Множественные подключения: до 10 Telegram destinations per company
- [ ] AC4: Тест уведомления: кнопка "Send Test" отправляет тестовое сообщение
- [ ] AC5: Status indicator: connected/disconnected для каждого destination
- [ ] AC6: Disconnect: удаление подключения с подтверждением
- [ ] AC7: Bot commands: /status (статус подключения), /help (список команд), /mute (временная тишина на N минут)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-11

#### Tasks:

**[TASK-0488]** Backend: Telegram bot service
- **Тип:** Backend
- **Описание:** Создать Telegram bot через BotFather. Реализовать webhook handler для приёма сообщений. Команды: /start (verification flow), /status, /help, /mute. Таблица `telegram_connections` (id, company_id, chat_id, chat_type, verified, created_at). Verification: 6-digit code с TTL 10 минут.
- **Критерии готовности:**
  - [ ] Bot создан и webhook настроен
  - [ ] Verification flow работает end-to-end
  - [ ] Команды /start, /status, /help, /mute реализованы
  - [ ] До 10 подключений per company
- **Оценка:** 16h
- **Story:** STORY-105

**[TASK-0489]** Backend: API управления Telegram подключениями
- **Тип:** Backend
- **Описание:** API: list connections, delete connection, send test message, verify code. `POST /api/v1/notifications/telegram/verify`, `POST /api/v1/notifications/telegram/test/{connection_id}`, `DELETE /api/v1/notifications/telegram/{connection_id}`.
- **Критерии готовности:**
  - [ ] Все CRUD операции
  - [ ] Test message delivery
  - [ ] Disconnect с cleanup
- **Оценка:** 8h
- **Story:** STORY-105

**[TASK-0490]** Frontend: Telegram setup wizard
- **Тип:** Frontend
- **Описание:** Страница Settings → Notifications → Telegram: step-by-step wizard (QR code с ссылкой на бота, input для verification code, success confirmation). List подключений с status badges, test и delete buttons.
- **Критерии готовности:**
  - [ ] 3-step wizard с визуальными инструкциями
  - [ ] QR code для быстрого подключения
  - [ ] List с status indicators и actions
- **Оценка:** 8h
- **Story:** STORY-105

**[TASK-0491]** QA: тестирование Telegram интеграции
- **Тип:** QA
- **Описание:** Тесты: полный verification flow, test message, disconnect/reconnect, expired verification code, max connections limit, /mute command.
- **Критерии готовности:**
  - [ ] E2E flow протестирован
  - [ ] Edge cases: expired code, duplicate verification, max limit
- **Оценка:** 4h
- **Story:** STORY-105

---

### [STORY-106] 17+ типов Telegram событий
**Как** Affiliate Manager, **я хочу** получать Telegram уведомления о 17+ типах событий (caps, fraud, autologin, FTD, status changes и др.), **чтобы** оперативно реагировать на критические события без необходимости быть в UI.

**Acceptance Criteria:**
- [ ] AC1: Минимум 17 типов событий: cap_warning (80%), cap_full (100%), cap_reset, new_lead, lead_status_change, ftd_received, fraud_blocked, fraud_score_high, autologin_failed, autologin_sla_degraded, new_funnel_created, broker_connection_error, broker_status_change, uad_scenario_error, daily_summary, affiliate_quality_drop, system_maintenance
- [ ] AC2: Каждое уведомление содержит: event type emoji, краткое описание, ключевые данные (lead_id, broker, amount), timestamp, deep link в UI
- [ ] AC3: Formatting: Markdown для Telegram (bold, italic, code blocks), inline кнопки для quick actions
- [ ] AC4: Delivery latency < 30 секунд от момента события
- [ ] AC5: Rate limiting: max 60 сообщений в минуту per chat (Telegram limit)
- [ ] AC6: Batching: если > 5 событий одного типа за минуту — группировать в одно сообщение

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-11
**Зависит от:** STORY-105

#### Tasks:

**[TASK-0492]** Backend: notification event system
- **Тип:** Backend
- **Описание:** Event bus: при возникновении события в системе (cap change, lead status, fraud block) публиковать event в internal queue. Таблица `notification_events` (id, company_id, event_type, payload jsonb, created_at). 17+ event producers в соответствующих сервисах.
- **Критерии готовности:**
  - [ ] 17+ типов событий подключены к event bus
  - [ ] Event payload содержит все необходимые данные
  - [ ] Events хранятся для audit (30 дней retention)
- **Оценка:** 16h
- **Story:** STORY-106

**[TASK-0493]** Backend: Telegram message formatter и sender
- **Тип:** Backend
- **Описание:** Telegram message templates для каждого из 17+ типов событий. Markdown formatting с emoji. Deep link generation (https://app.gambchamp.com/leads/{id}). Inline keyboard buttons для quick actions. Batching logic: aggregate > 5 same-type events. Rate limiter: token bucket 60/min per chat.
- **Критерии готовности:**
  - [ ] 17+ message templates
  - [ ] Deep links для каждого типа
  - [ ] Batching корректно группирует events
  - [ ] Rate limiter не допускает Telegram API ban
- **Оценка:** 16h
- **Story:** STORY-106

**[TASK-0494]** QA: тестирование всех типов уведомлений
- **Тип:** QA
- **Описание:** Trigger каждый из 17+ типов событий, проверить: доставку в Telegram, корректность данных, formatting, deep links, batching при высокой нагрузке.
- **Критерии готовности:**
  - [ ] Каждый из 17+ типов протестирован
  - [ ] Deep links ведут на правильные страницы
  - [ ] Batching работает при > 5 events/min
- **Оценка:** 8h
- **Story:** STORY-106

---

### [STORY-107] Настройка подписок на события (per-user, per-channel)
**Как** Affiliate Manager, **я хочу** настраивать какие события отправлять в какой Telegram чат/email, с фильтрацией по affiliate/brand/GEO, **чтобы** получать только релевантные уведомления и не тонуть в спаме.

**Acceptance Criteria:**
- [ ] AC1: Матрица подписок: строки = типы событий (17+), колонки = channels (telegram chats, email addresses, webhooks)
- [ ] AC2: Для каждой ячейки матрицы: toggle on/off + optional filters (affiliate_ids, broker_ids, geo_countries)
- [ ] AC3: Presets: "Manager (all events)", "Media Buyer (caps + FTD only)", "Finance (FTD + daily summary)", "Critical Only (fraud + errors)"
- [ ] AC4: Per-user subscriptions: каждый пользователь настраивает свои подписки
- [ ] AC5: Admin override: Network Admin может задать обязательные подписки для ролей
- [ ] AC6: Quiet hours: настройка часов тишины per-channel (например, 22:00-08:00 local time)

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-11
**Зависит от:** STORY-106

#### Tasks:

**[TASK-0495]** Backend: subscription management
- **Тип:** Backend
- **Описание:** Таблица `notification_subscriptions` (id, user_id, event_type, channel_type, channel_id, filters jsonb, quiet_hours jsonb, enabled). API: CRUD subscriptions, apply preset, admin override. Notification router: при event → найти matching subscriptions → check quiet hours → dispatch.
- **Критерии готовности:**
  - [ ] Матрица подписок per user
  - [ ] Filters (affiliate, broker, geo) применяются
  - [ ] Quiet hours проверяются перед dispatch
  - [ ] Admin override для обязательных подписок
- **Оценка:** 16h
- **Story:** STORY-107

**[TASK-0496]** Frontend: subscription matrix UI
- **Тип:** Frontend
- **Описание:** Страница Settings → Notifications → Subscriptions: таблица-матрица с toggles, filter popup для каждой ячейки, preset selector, quiet hours time picker, admin override section (для admin роли).
- **Критерии готовности:**
  - [ ] Matrix с 17+ строками и 3+ столбцами каналов
  - [ ] Filter popup с multiselect для affiliate/broker/geo
  - [ ] Preset apply с confirmation
  - [ ] Quiet hours time picker с timezone
- **Оценка:** 16h
- **Story:** STORY-107

**[TASK-0497]** QA: тестирование подписок
- **Тип:** QA
- **Описание:** Тесты: подписка on/off, фильтрация (event с matching filter → delivered, non-matching → not), quiet hours (event в quiet hours → deferred/skipped), preset apply, admin override.
- **Критерии готовности:**
  - [ ] Фильтрация корректно работает для всех 3 dimensions
  - [ ] Quiet hours: events deferred или skipped
  - [ ] Admin override нельзя отключить рядовым user
- **Оценка:** 8h
- **Story:** STORY-107

---

### [STORY-108] Email уведомления
**Как** Finance Manager, **я хочу** получать email уведомления о финансовых событиях (FTD, daily P&L summary, reconciliation alerts), **чтобы** контролировать финансы без необходимости входить в систему.

**Acceptance Criteria:**
- [ ] AC1: Email отправляется через настроенный SMTP или API provider (SendGrid/SES)
- [ ] AC2: HTML шаблоны для каждого типа события с branding GambChamp
- [ ] AC3: Поддержка: single event emails, daily digest (summary за день, отправляется в настроенное время)
- [ ] AC4: Unsubscribe link в каждом email
- [ ] AC5: Email delivery tracking: sent, delivered, opened, bounced
- [ ] AC6: Multiple email addresses per user (до 3)

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-11

#### Tasks:

**[TASK-0498]** Backend: email notification service
- **Тип:** Backend
- **Описание:** Сервис `EmailNotifier`: интеграция с SendGrid API (primary) и SMTP (fallback). HTML template engine (Go templates). Daily digest: cron job по настраиваемому времени per user. Delivery tracking через SendGrid webhooks. Unsubscribe: one-click link с token.
- **Критерии готовности:**
  - [ ] SendGrid integration работает
  - [ ] HTML templates для 17+ типов событий
  - [ ] Daily digest с customizable time
  - [ ] Delivery tracking: sent/delivered/opened/bounced
- **Оценка:** 16h
- **Story:** STORY-108

**[TASK-0499]** Frontend: email настройки
- **Тип:** Frontend
- **Описание:** В Settings → Notifications → Email: добавление email адресов (до 3), verification flow (send code), digest time picker, preview email template.
- **Критерии готовности:**
  - [ ] Email CRUD с verification
  - [ ] Digest time picker с timezone
  - [ ] Template preview
- **Оценка:** 4h
- **Story:** STORY-108

---

### [STORY-109] Webhook уведомления для custom интеграций
**Как** Developer, **я хочу** настроить webhook endpoints для получения событий системы в моё приложение, **чтобы** интегрировать GambChamp с внутренними инструментами.

**Acceptance Criteria:**
- [ ] AC1: Webhook endpoint: URL + secret для HMAC signature verification
- [ ] AC2: Payload: JSON с полями event_type, timestamp, data (event-specific), signature header (X-GambChamp-Signature)
- [ ] AC3: Retry policy: 3 retry с exponential backoff (5s, 30s, 300s) при non-2xx response
- [ ] AC4: Delivery log: каждая попытка доставки с status code, response time, response body (truncated)
- [ ] AC5: Test webhook: кнопка "Send Test Event" с выбором event type
- [ ] AC6: Health monitoring: если webhook fails > 10 раз подряд — auto-disable с email notification
- [ ] AC7: До 5 webhook endpoints per company

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-11

#### Tasks:

**[TASK-0500]** Backend: webhook delivery service
- **Тип:** Backend
- **Описание:** Сервис `WebhookDeliverer`: HMAC-SHA256 signature, async delivery через worker queue, retry с backoff, delivery logging (таблица `webhook_deliveries`), health monitoring (consecutive failures counter), auto-disable after 10 failures.
- **Критерии готовности:**
  - [ ] HMAC signature корректна и верифицируема
  - [ ] Retry 3 times с exponential backoff
  - [ ] Auto-disable при 10 consecutive failures
  - [ ] Delivery log с full details
- **Оценка:** 16h
- **Story:** STORY-109

**[TASK-0501]** Backend: webhook management API
- **Тип:** Backend
- **Описание:** API: CRUD webhooks, test delivery, delivery log, re-enable disabled webhook. `POST /api/v1/webhooks`, `POST /api/v1/webhooks/{id}/test`, `GET /api/v1/webhooks/{id}/deliveries`.
- **Критерии готовности:**
  - [ ] CRUD с validation (valid URL, unique per company)
  - [ ] Test delivery с selectable event type
  - [ ] Delivery log с pagination
- **Оценка:** 8h
- **Story:** STORY-109

**[TASK-0502]** Frontend: webhook management UI
- **Тип:** Frontend
- **Описание:** Страница Settings → Notifications → Webhooks: list webhooks с status, create form (URL, secret, events multiselect), delivery log table, test button, re-enable button for disabled.
- **Критерии готовности:**
  - [ ] Create/edit form с URL validation
  - [ ] Delivery log с expandable rows (request/response details)
  - [ ] Secret shown once, then masked
- **Оценка:** 8h
- **Story:** STORY-109

**[TASK-0503]** QA: тестирование webhooks
- **Тип:** QA
- **Описание:** Тесты: delivery happy path, retry при failure, auto-disable после 10 failures, HMAC verification, test event, concurrent delivery.
- **Критерии готовности:**
  - [ ] Retry timing проверен
  - [ ] HMAC signature корректна
  - [ ] Auto-disable работает
- **Оценка:** 4h
- **Story:** STORY-109

---

### [STORY-110] In-app notification feed
**Как** Affiliate Manager, **я хочу** видеть ленту уведомлений внутри приложения с badge счётчиком непрочитанных, **чтобы** не пропускать важные события когда я работаю в UI.

**Acceptance Criteria:**
- [ ] AC1: Bell icon в header с badge (количество непрочитанных, max "99+")
- [ ] AC2: Dropdown panel: лента последних 50 уведомлений, отсортированных по времени
- [ ] AC3: Каждое уведомление: icon по типу события, заголовок, краткое описание, timestamp, read/unread indicator
- [ ] AC4: Клик на уведомление: переход к связанному объекту (lead, broker, report) + mark as read
- [ ] AC5: Actions: "Mark All as Read", "See All" (переход к полной странице уведомлений)
- [ ] AC6: Real-time: новые уведомления появляются без refresh (WebSocket или SSE)
- [ ] AC7: Retention: уведомления в feed хранятся 30 дней

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-11

#### Tasks:

**[TASK-0504]** Backend: in-app notification storage и API
- **Тип:** Backend
- **Описание:** Таблица `in_app_notifications` (id, user_id, event_type, title, body, link, read, created_at). API: list (with unread_count), mark read (single/all), SSE endpoint для real-time push. Retention: cron cleanup > 30 дней.
- **Критерии готовности:**
  - [ ] List с pagination и unread_count
  - [ ] SSE endpoint для real-time delivery
  - [ ] Mark read single и batch
  - [ ] 30-day retention cleanup
- **Оценка:** 8h
- **Story:** STORY-110

**[TASK-0505]** Frontend: notification bell и feed panel
- **Тип:** Frontend
- **Описание:** Компонент `NotificationBell` в global header: badge с count, dropdown panel с scroll, notification items (icon, title, body, time, read indicator), "Mark All Read" button, "See All" link, real-time updates через SSE.
- **Критерии готовности:**
  - [ ] Badge обновляется в real-time
  - [ ] Dropdown с виртуальным scroll (50 items)
  - [ ] Click → navigate + mark read
  - [ ] Анимация при новом уведомлении
- **Оценка:** 8h
- **Story:** STORY-110

**[TASK-0506]** QA: тестирование in-app notifications
- **Тип:** QA
- **Описание:** Тесты: новое уведомление появляется в real-time, mark read, badge count accuracy, navigation по click, retention cleanup, performance с 1000 уведомлениями.
- **Критерии готовности:**
  - [ ] Real-time delivery < 5 секунд
  - [ ] Badge count всегда корректен
  - [ ] Scroll performance с 1000 items
- **Оценка:** 4h
- **Story:** STORY-110

---

### [STORY-111] Daily summary report
**Как** Team Lead, **я хочу** получать ежедневный summary report в Telegram и email с ключевыми метриками за день, **чтобы** иметь snapshot операционной эффективности без необходимости открывать dashboard.

**Acceptance Criteria:**
- [ ] AC1: Daily summary включает: total leads, FTD, CR%, revenue, top 3 affiliates, top 3 brokers, cap utilization %, fraud blocked count, SLA autologin %
- [ ] AC2: Время отправки настраивается per user (default: 09:00 local time)
- [ ] AC3: Comparison vs previous day: delta для каждой метрики
- [ ] AC4: Telegram format: structured message с emoji и formatting
- [ ] AC5: Email format: HTML с charts (inline images)
- [ ] AC6: Включает warnings: caps > 90%, SLA < 99.5%, fraud rate > 5%

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-11
**Зависит от:** STORY-106, STORY-108

#### Tasks:

**[TASK-0507]** Backend: daily summary generator
- **Тип:** Backend
- **Описание:** Cron job: для каждого подписанного user рассчитать daily metrics, сформировать Telegram и email versions, отправить в настроенное время (per-user timezone). Использовать KPI aggregation engine из EPIC-10.
- **Критерии готовности:**
  - [ ] Summary рассчитывается для предыдущего calendar day
  - [ ] Comparison vs previous day
  - [ ] Warnings при пороговых значениях
  - [ ] Отправка в user-specific timezone
- **Оценка:** 8h
- **Story:** STORY-111

**[TASK-0508]** Frontend: daily summary настройки
- **Тип:** Frontend
- **Описание:** В Settings → Notifications: toggle "Daily Summary", time picker, channel selector (Telegram/email/both), preview кнопка.
- **Критерии готовности:**
  - [ ] Time picker с timezone
  - [ ] Preview генерирует sample summary
  - [ ] Channel selector
- **Оценка:** 4h
- **Story:** STORY-111

---

## [EPIC-12] Conversions & Basic P&L

**Цель:** Реализовать систему регистрации конверсий (депозитов) от брокеров, базовый P&L расчёт (buy price vs sell price), reconciliation, управление Fake FTD и виртуальные wallet-ы для брокеров, обеспечивая финансовую прозрачность операций.

**Метрика успеха:**
- 100% конверсий от брокеров регистрируются автоматически (zero manual entry для стандартных брокеров)
- P&L отчёт генерируется < 3 секунд за любой период
- Reconciliation расхождения выявляются в течение 24 часов
- Fake FTD обрабатываются в течение 1 рабочего дня

**Приоритет:** P1 (Launch)
**Зависит от:** EPIC-03 (Broker Integration Layer), EPIC-04 (Affiliate Management), EPIC-10 (Analytics Dashboard)
**Оценка:** L (1-3 мес)

---

### [STORY-112] Регистрация конверсий (FTD/deposits)
**Как** Network Admin, **я хочу** чтобы система автоматически регистрировала конверсии (FTD, deposits) получаемые от брокеров через postback/API callback, **чтобы** иметь полную картину конверсий без ручного ввода.

**Acceptance Criteria:**
- [ ] AC1: Postback endpoint: `POST /api/v1/conversions/postback?token={broker_token}` принимает FTD/deposit events от брокера
- [ ] AC2: Поля конверсии: lead_id (или matching по email/phone), conversion_type (FTD, deposit, redeposit), amount, currency, broker_transaction_id, timestamp
- [ ] AC3: Lead matching: по lead_id (primary), по email+broker (secondary), по phone+broker (tertiary)
- [ ] AC4: Дедупликация: по broker_transaction_id — повторный postback не создаёт дублю
- [ ] AC5: Manual conversion: форма для ручного ввода конверсии (для брокеров без автоматизации)
- [ ] AC6: Status: pending → confirmed → disputed — workflow для верификации
- [ ] AC7: Bulk import: CSV upload для массовой загрузки конверсий

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-12

#### Tasks:

**[TASK-0509]** Backend: схема БД для конверсий
- **Тип:** Backend
- **Описание:** Таблица `conversions` (id, lead_id, broker_id, affiliate_id, conversion_type, amount, currency, broker_transaction_id unique, status, matched_by, created_at, confirmed_at). Индексы: lead_id, broker_id, broker_transaction_id, status, created_at.
- **Критерии готовности:**
  - [ ] Миграция создана и протестирована
  - [ ] Unique constraint на broker_transaction_id per broker
  - [ ] Партиционирование по месяцам
- **Оценка:** 4h
- **Story:** STORY-112

**[TASK-0510]** Backend: postback handler для конверсий
- **Тип:** Backend
- **Описание:** Endpoint postback: парсинг различных форматов (JSON, form-encoded, query params), lead matching (3-уровневый), дедупликация, сохранение, trigger events (для уведомлений и P&L). Rate limit: 100 req/s per broker token.
- **Критерии готовности:**
  - [ ] Парсинг JSON и form-encoded
  - [ ] 3-уровневый lead matching
  - [ ] Дедупликация по broker_transaction_id
  - [ ] Event trigger для downstream processing
- **Оценка:** 8h
- **Story:** STORY-112

**[TASK-0511]** Backend: manual conversion API и bulk import
- **Тип:** Backend
- **Описание:** API: `POST /api/v1/conversions` (manual entry), `POST /api/v1/conversions/import` (CSV upload). Валидация: lead exists, broker exists, amount > 0, no duplicate. CSV: колонки lead_id, type, amount, currency, date.
- **Критерии готовности:**
  - [ ] Manual entry с полной валидацией
  - [ ] CSV import до 10,000 записей
  - [ ] Import report: success/failed/duplicate counts
- **Оценка:** 8h
- **Story:** STORY-112

**[TASK-0512]** Frontend: conversions management UI
- **Тип:** Frontend
- **Описание:** Страница Conversions: таблица конверсий с фильтрами (type, status, broker, affiliate, date), manual entry form (modal), CSV import (drag-drop), status workflow buttons (confirm, dispute).
- **Критерии готовности:**
  - [ ] Таблица с pagination и фильтрами
  - [ ] Manual entry modal с validation
  - [ ] CSV import с progress bar
  - [ ] Status change с confirmation
- **Оценка:** 8h
- **Story:** STORY-112

**[TASK-0513]** QA: тестирование регистрации конверсий
- **Тип:** QA
- **Описание:** Тесты: postback (all formats), lead matching (3 levels), dedup, manual entry, CSV import (valid/invalid rows), status workflow, concurrent postbacks.
- **Критерии готовности:**
  - [ ] Все 3 уровня matching протестированы
  - [ ] Dedup предотвращает дубли
  - [ ] CSV с mixed valid/invalid rows
- **Оценка:** 8h
- **Story:** STORY-112

---

### [STORY-113] Buy/Sell price и базовый P&L
**Как** Finance Manager, **я хочу** задавать buy price (стоимость лида от аффилейта) и sell price (выплата от брокера) для расчёта прибыли по каждой конверсии, **чтобы** видеть реальный P&L операций.

**Acceptance Criteria:**
- [ ] AC1: Buy price настраивается на уровне: affiliate → GEO → funnel (от общего к частному, override)
- [ ] AC2: Sell price настраивается на уровне: broker → GEO → deal type (CPA, CPA+RevShare)
- [ ] AC3: P&L расчёт: profit = sell_price - buy_price per conversion
- [ ] AC4: Aggregated P&L: по affiliate, broker, GEO, period — с drill-down
- [ ] AC5: Margin alert: уведомление если margin per affiliate падает ниже настраиваемого порога (default: 0%)
- [ ] AC6: Multi-currency: суммы конвертируются в base currency по настраиваемому курсу
- [ ] AC7: Price history: изменения buy/sell price логируются с timestamps

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-12
**Зависит от:** STORY-112

#### Tasks:

**[TASK-0514]** Backend: pricing model
- **Тип:** Backend
- **Описание:** Таблицы: `affiliate_pricing` (affiliate_id, geo, funnel, price, currency, deal_type, effective_from), `broker_pricing` (broker_id, geo, deal_type, price, currency, effective_from). Price resolver: найти most specific price для conversion. History: все изменения через effective_from.
- **Критерии готовности:**
  - [ ] 3-уровневая иерархия pricing для affiliate и broker
  - [ ] Most specific match (affiliate+geo+funnel > affiliate+geo > affiliate)
  - [ ] History через effective_from (no delete, only append)
- **Оценка:** 8h
- **Story:** STORY-113

**[TASK-0515]** Backend: P&L calculation engine
- **Тип:** Backend
- **Описание:** При каждой конверсии: resolve buy_price и sell_price, calculate profit и margin. Агрегация: по affiliate, broker, GEO, period. Currency conversion через exchange rates таблицу. Margin alert: cron check per affiliate daily.
- **Критерии готовности:**
  - [ ] Profit рассчитывается автоматически для каждой конверсии
  - [ ] Агрегированный P&L < 1 секунда для месяца
  - [ ] Currency conversion корректен
  - [ ] Margin alert при threshold
- **Оценка:** 16h
- **Story:** STORY-113

**[TASK-0516]** Frontend: pricing management и P&L отчёт
- **Тип:** Frontend
- **Описание:** Страница Finance → Pricing: таблицы buy и sell prices с CRUD, hierarchy visualization. Finance → P&L: таблица P&L с drill-down (affiliate → broker → GEO), period selector, margin indicators, export CSV/PDF.
- **Критерии готовности:**
  - [ ] Pricing CRUD с effective date
  - [ ] P&L таблица с 3-level drill-down
  - [ ] Margin color coding
  - [ ] Export CSV и PDF
- **Оценка:** 16h
- **Story:** STORY-113

**[TASK-0517]** QA: тестирование P&L
- **Тип:** QA
- **Описание:** Тесты: pricing hierarchy resolve (most specific wins), P&L calculation accuracy (manual check), currency conversion, margin alert trigger, edge case: no price defined → fallback to 0.
- **Критерии готовности:**
  - [ ] Pricing hierarchy: 5+ сценариев specificity
  - [ ] P&L accuracy на тестовых данных
  - [ ] Currency conversion проверен для 3 пар
- **Оценка:** 8h
- **Story:** STORY-113

---

### [STORY-114] Reconciliation с брокером
**Как** Finance Manager, **я хочу** сверять наши данные по конверсиям с данными брокера (reconciliation), **чтобы** выявлять расхождения и разрешать диспуты.

**Acceptance Criteria:**
- [ ] AC1: Upload broker report: CSV/Excel с конверсиями от брокера
- [ ] AC2: Auto-matching: сопоставление записей по broker_transaction_id, lead_id или email+date
- [ ] AC3: Discrepancy report: наши FTD vs брокер FTD, разница в amounts, missing на обеих сторонах
- [ ] AC4: Status: matched (суммы совпадают), amount_mismatch (разница > 1%), missing_ours (есть у брокера, нет у нас), missing_theirs (есть у нас, нет у брокера)
- [ ] AC5: Resolve actions: accept_theirs, accept_ours, dispute (создать задачу), ignore
- [ ] AC6: Reconciliation report: сводка по каждому прогону с stats (matched %, discrepancy %)

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-12
**Зависит от:** STORY-112

#### Tasks:

**[TASK-0518]** Backend: reconciliation engine
- **Тип:** Backend
- **Описание:** Сервис `Reconciler`: upload broker CSV, parse, match with our conversions (3-level matching), classify each pair (matched/amount_mismatch/missing), generate report. Таблица `reconciliation_runs` и `reconciliation_items`.
- **Критерии готовности:**
  - [ ] CSV parsing (multiple formats: comma/semicolon, date formats)
  - [ ] 3-level matching
  - [ ] Classification в 4 категории
  - [ ] Report generation
- **Оценка:** 16h
- **Story:** STORY-114

**[TASK-0519]** Frontend: reconciliation UI
- **Тип:** Frontend
- **Описание:** Страница Finance → Reconciliation: upload area (drag-drop CSV), mapping step (сопоставить колонки CSV с нашими полями), results table (matched/mismatched/missing с actions), summary stats.
- **Критерии готовности:**
  - [ ] Column mapping UI (drag-and-drop или dropdown)
  - [ ] Results table с color coding по status
  - [ ] Action buttons: accept/dispute/ignore
  - [ ] Summary: matched %, total discrepancy amount
- **Оценка:** 16h
- **Story:** STORY-114

---

### [STORY-115] Fake FTD management
**Как** Network Admin, **я хочу** управлять Fake FTD (подозрительные конверсии) с опциями: fire postback аффилейту, charge client, schedule для проверки, **чтобы** корректно обрабатывать спорные конверсии.

**Acceptance Criteria:**
- [ ] AC1: Fake FTD detection: manual flag или auto-detect (conversion отозвана брокером в течение 48 часов)
- [ ] AC2: Actions при Fake FTD: fire_postback (уведомить аффилейта что FTD отклонён), charge_client (удержать из баланса аффилейта), schedule_review (отложить решение на N дней), accept (подтвердить как валидный)
- [ ] AC3: Fake FTD dashboard: список suspected fake FTD с details, action buttons, status tracking
- [ ] AC4: Auto-detection rules: configurable (broker_reversal_within_hours, amount < min_threshold, multiple_ftd_same_day_same_affiliate)
- [ ] AC5: Audit log: все actions по Fake FTD логируются с user и timestamp
- [ ] AC6: Statistics: fake FTD rate per affiliate, per broker — в аналитике

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-12
**Зависит от:** STORY-112

#### Tasks:

**[TASK-0520]** Backend: Fake FTD detection и management
- **Тип:** Backend
- **Описание:** Auto-detection: monitor conversion status changes, flag если reverted within 48h. Configurable rules. Actions: fire postback (use affiliate's postback URL with fake_ftd event), charge (deduct from affiliate wallet), schedule (set review_date). Таблица `fake_ftd_cases` с full audit trail.
- **Критерии готовности:**
  - [ ] Auto-detection по 3+ правилам
  - [ ] 4 action types реализованы
  - [ ] Audit trail для каждого action
- **Оценка:** 16h
- **Story:** STORY-115

**[TASK-0521]** Frontend: Fake FTD dashboard
- **Тип:** Frontend
- **Описание:** Страница Finance → Fake FTD: таблица suspected cases (lead, affiliate, broker, amount, detection reason, status), action buttons с confirmation dialogs, filters, stats summary (total fake FTD this month, amount, rate per affiliate).
- **Критерии готовности:**
  - [ ] Action buttons с confirmation и comment field
  - [ ] Status tracking: pending → action_taken → resolved
  - [ ] Stats summary наверху
- **Оценка:** 8h
- **Story:** STORY-115

**[TASK-0522]** QA: тестирование Fake FTD
- **Тип:** QA
- **Описание:** Тесты: auto-detection (reversal → flag), manual flag, each of 4 actions, audit trail accuracy, statistics calculation.
- **Критерии готовности:**
  - [ ] Auto-detection для всех 3 правил
  - [ ] Все 4 actions выполняются корректно
  - [ ] Audit trail полный
- **Оценка:** 4h
- **Story:** STORY-115

---

### [STORY-116] Virtual wallet per broker
**Как** Finance Manager, **я хочу** вести виртуальный баланс (wallet) для каждого брокера с транзакционной историей, **чтобы** контролировать финансовое exposure перед каждым брокером.

**Acceptance Criteria:**
- [ ] AC1: Wallet создаётся автоматически для каждого брокера при первой конверсии
- [ ] AC2: Транзакции: deposit (брокер оплачивает), withdrawal (мы получаем), adjustment (ручная корректировка), fee
- [ ] AC3: Balance = SUM(deposits) - SUM(withdrawals) + SUM(adjustments) - SUM(fees)
- [ ] AC4: Transaction log: полная история с type, amount, description, created_by, created_at
- [ ] AC5: Auto-deposit: при каждом confirmed FTD — автоматическое зачисление sell_price в wallet
- [ ] AC6: Balance alert: уведомление при balance > threshold (настраивается per broker)
- [ ] AC7: Export: transaction log в CSV

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-12

#### Tasks:

**[TASK-0523]** Backend: wallet system
- **Тип:** Backend
- **Описание:** Таблицы: `broker_wallets` (id, broker_id, balance, currency, created_at), `wallet_transactions` (id, wallet_id, type enum, amount, description, reference_id, created_by, created_at). Atomic balance updates через transactions. Auto-deposit hook при confirmed conversion.
- **Критерии готовности:**
  - [ ] Atomic balance updates (no race conditions)
  - [ ] Auto-deposit при conversion confirmation
  - [ ] Balance alert threshold check
- **Оценка:** 8h
- **Story:** STORY-116

**[TASK-0524]** Frontend: wallet management UI
- **Тип:** Frontend
- **Описание:** В карточке брокера — вкладка Wallet: текущий balance, transaction log таблица с фильтрами (type, date), manual adjustment form, balance chart (monthly trend), export CSV.
- **Критерии готовности:**
  - [ ] Balance отображается с currency
  - [ ] Transaction log с pagination
  - [ ] Manual adjustment с reason field (required)
  - [ ] Export CSV
- **Оценка:** 8h
- **Story:** STORY-116

---

### [STORY-117] Affiliate payout tracking
**Как** Finance Manager, **я хочу** отслеживать выплаты аффилейтам (accrued vs paid) с генерацией payout отчётов, **чтобы** контролировать задолженность и планировать выплаты.

**Acceptance Criteria:**
- [ ] AC1: Accrued amount рассчитывается автоматически: SUM buy_price по confirmed конверсиям за период
- [ ] AC2: Payout record: создание записи о выплате (affiliate, amount, currency, payment_method, reference)
- [ ] AC3: Balance: accrued - paid = outstanding (задолженность)
- [ ] AC4: Payout report: таблица affiliates × periods с accrued, paid, outstanding
- [ ] AC5: Batch payout: создание нескольких payout записей одновременно (для массовой выплаты)
- [ ] AC6: Approval workflow: payout создаётся как draft → approved by finance manager → marked as paid
- [ ] AC7: Export: payout report в CSV и PDF

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-12
**Зависит от:** STORY-113

#### Tasks:

**[TASK-0525]** Backend: payout tracking system
- **Тип:** Backend
- **Описание:** Таблица `affiliate_payouts` (id, affiliate_id, amount, currency, payment_method, reference, status draft/approved/paid, approved_by, paid_at, created_by, created_at). Accrued calculation: aggregate buy_price from conversions. Outstanding = accrued - paid.
- **Критерии готовности:**
  - [ ] Accrued calculation корректен
  - [ ] Approval workflow: draft → approved → paid
  - [ ] Batch create до 100 payouts
- **Оценка:** 8h
- **Story:** STORY-117

**[TASK-0526]** Frontend: payout management UI
- **Тип:** Frontend
- **Описание:** Страница Finance → Payouts: таблица affiliates с accrued/paid/outstanding, create payout modal, batch payout wizard, approval buttons (для finance manager role), payout history per affiliate, export.
- **Критерии готовности:**
  - [ ] Payout table с sorting по outstanding
  - [ ] Create/batch payout workflow
  - [ ] Approval flow с role check
  - [ ] Export CSV и PDF
- **Оценка:** 16h
- **Story:** STORY-117

**[TASK-0527]** QA: тестирование payouts
- **Тип:** QA
- **Описание:** Тесты: accrued calculation accuracy, payout creation, approval workflow (unauthorized user cannot approve), batch payout, outstanding calculation, edge case: partial payout.
- **Критерии готовности:**
  - [ ] Accrued/paid/outstanding math verified
  - [ ] Approval: only finance manager can approve
  - [ ] Batch payout до 100 records
- **Оценка:** 4h
- **Story:** STORY-117

---

### [STORY-118] Financial export и reporting
**Как** Finance Manager, **я хочу** экспортировать финансовые отчёты (P&L, payouts, reconciliation) в CSV, Excel и PDF с настраиваемым форматом, **чтобы** использовать данные в бухгалтерии и для отчётности перед руководством.

**Acceptance Criteria:**
- [ ] AC1: Поддержка 3 форматов: CSV (raw data), Excel (formatted с headers и formulas), PDF (branded отчёт)
- [ ] AC2: Типы отчётов: P&L summary, P&L detailed (per conversion), Payout report, Reconciliation report, Conversion list
- [ ] AC3: Фильтры: period, affiliate, broker, GEO, currency
- [ ] AC4: Scheduled export: настроить автоматическую генерацию отчёта по расписанию (weekly/monthly) с отправкой на email
- [ ] AC5: Export queue: большие отчёты (> 10,000 rows) генерируются async с уведомлением когда готово
- [ ] AC6: Download history: список ранее сгенерированных отчётов с возможностью повторного скачивания (7 дней)

**Story Points:** 5
**Приоритет:** Should
**Epic:** EPIC-12

#### Tasks:

**[TASK-0528]** Backend: export engine
- **Тип:** Backend
- **Описание:** Сервис `ReportExporter`: генерация CSV (encoding: UTF-8 BOM for Excel compatibility), Excel (using excelize library), PDF (using go-pdf). Async queue для > 10K rows. Download storage: S3 с 7-day TTL. Scheduled exports: cron per user config.
- **Критерии готовности:**
  - [ ] 3 формата генерируются корректно
  - [ ] Async queue для больших отчётов
  - [ ] Scheduled exports по cron
  - [ ] 7-day download storage
- **Оценка:** 16h
- **Story:** STORY-118

**[TASK-0529]** Frontend: export UI
- **Тип:** Frontend
- **Описание:** Export button на каждой финансовой странице: dropdown с format selection (CSV/Excel/PDF), filter summary, "Export" кнопка. Download history page. Schedule export modal.
- **Критерии готовности:**
  - [ ] Export button с format dropdown
  - [ ] Progress indicator для async exports
  - [ ] Download history с re-download
  - [ ] Schedule export form
- **Оценка:** 8h
- **Story:** STORY-118

---

## [EPIC-13] Onboarding & Setup Wizard

**Цель:** Создать guided setup experience, позволяющий новому клиенту пройти от регистрации до первого отправленного лида за < 30 минут, с шаблонами под типовые сценарии и подсказками на каждом шаге — превратив сложность онбординга конкурентов (HyperOne: 7+ ручных шагов) в наше конкурентное преимущество.

**Метрика успеха:**
- Time to first lead sent < 30 минут для 80% новых клиентов
- Wizard completion rate >= 70% (начали wizard → завершили)
- Support tickets during onboarding < 0.5 per new account
- NPS первого дня >= 8/10

**Приоритет:** P1 (Launch)
**Зависит от:** EPIC-01 (Lead Intake API), EPIC-02 (Lead Routing Engine), EPIC-03 (Broker Integration Layer), EPIC-04 (Affiliate Management)
**Оценка:** M (2-4 нед)

---

### [STORY-119] Setup Wizard: основной flow
**Как** Network Admin, **я хочу** при первом входе пройти пошаговый wizard, который проведёт меня от регистрации до первого работающего lead flow, **чтобы** начать работу менее чем за 30 минут.

**Acceptance Criteria:**
- [ ] AC1: Wizard из 6 шагов: 1) Company profile → 2) Choose template → 3) Add first broker → 4) Add first affiliate → 5) Create routing rule → 6) Send test lead
- [ ] AC2: Каждый шаг содержит: заголовок, описание "что это и зачем", визуальную инструкцию (gif/video), форму, кнопки "Skip" (для необязательных) и "Next"
- [ ] AC3: Progress bar показывает текущий шаг и estimated time remaining
- [ ] AC4: Wizard можно прервать и вернуться позже (состояние сохраняется)
- [ ] AC5: По завершении: celebration screen с summary что настроено и quick links к следующим действиям
- [ ] AC6: Skip wizard: опция "I know what I'm doing — skip to dashboard" с confirmation
- [ ] AC7: Повторный запуск: кнопка "Re-run Setup Wizard" в Settings

**Story Points:** 13
**Приоритет:** Must
**Epic:** EPIC-13

#### Tasks:

**[TASK-0530]** Backend: wizard state management
- **Тип:** Backend
- **Описание:** Таблица `onboarding_sessions` (id, company_id, current_step, steps_completed jsonb, template_id, started_at, completed_at). API: get current state, update step, complete wizard. Wizard state persisted across sessions.
- **Критерии готовности:**
  - [ ] State persists across browser sessions
  - [ ] Step completion tracking
  - [ ] Re-run capability (reset state)
- **Оценка:** 8h
- **Story:** STORY-119

**[TASK-0531]** Frontend: wizard UI framework
- **Тип:** Frontend
- **Описание:** Компонент `SetupWizard`: 6-step stepper с progress bar, animated transitions между шагами, responsive layout. Каждый шаг — отдельный child component. Save state on each step completion. Skip и re-run flows.
- **Критерии готовности:**
  - [ ] Stepper с progress bar и time estimate
  - [ ] Smooth transitions между шагами
  - [ ] State persistence (refresh → same step)
  - [ ] Responsive: mobile-friendly
- **Оценка:** 16h
- **Story:** STORY-119

**[TASK-0532]** Design: wizard UI design
- **Тип:** Design
- **Описание:** Полный UI design для 6-step wizard: каждый шаг с иллюстрациями, progress indicator, celebration screen, skip flow. Учесть mobile layout.
- **Критерии готовности:**
  - [ ] Figma mockups для всех 6 шагов (desktop + mobile)
  - [ ] Celebration screen design
  - [ ] Illustration/icon set для каждого шага
- **Оценка:** 16h
- **Story:** STORY-119

**[TASK-0533]** QA: тестирование wizard flow
- **Тип:** QA
- **Описание:** E2E тест: полный wizard от start до send test lead. Тесты: skip wizard, resume after browser close, re-run wizard, each step validation, back navigation.
- **Критерии готовности:**
  - [ ] E2E happy path < 30 минут
  - [ ] Resume после закрытия браузера
  - [ ] Все 6 шагов протестированы отдельно
- **Оценка:** 8h
- **Story:** STORY-119

---

### [STORY-120] Шаблоны сценариев для быстрого старта
**Как** Network Admin, **я хочу** выбрать шаблон сценария при настройке (например, "Standard Crypto Network", "Forex Solo Buyer"), **чтобы** система автоматически настроила типовые routing rules, статусы и параметры.

**Acceptance Criteria:**
- [ ] AC1: Минимум 5 шаблонов: "Standard Crypto Network" (мультигео, 3+ брокера, weighted routing), "Forex Solo Buyer" (1 байер, 1-2 брокера, простой routing), "Multi-GEO Network" (страновые группы, per-country caps), "High-Volume Aggregator" (100+ affiliates, UAD, overflow pools), "Testing & Sandbox" (тестовый брокер, дебаг-режим)
- [ ] AC2: Каждый шаблон включает: pre-configured routing rules, status groups, country groups, suggested broker types, notification presets
- [ ] AC3: Template preview: при выборе показать что будет создано (list of entities)
- [ ] AC4: Customizable: после применения шаблона все настройки можно редактировать
- [ ] AC5: Admin может создавать custom templates для своей компании

**Story Points:** 8
**Приоритет:** Must
**Epic:** EPIC-13
**Зависит от:** STORY-119

#### Tasks:

**[TASK-0534]** Backend: template system
- **Тип:** Backend
- **Описание:** Таблица `onboarding_templates` (id, name, description, icon, config jsonb, is_system boolean, company_id nullable). Config содержит: routing_rules, status_groups, country_groups, notification_presets. Apply template: create all entities from config. 5 system templates seeded.
- **Критерии готовности:**
  - [ ] 5 system templates created
  - [ ] Apply template creates all entities atomically
  - [ ] Custom template CRUD для admin
- **Оценка:** 8h
- **Story:** STORY-120

**[TASK-0535]** Frontend: template selector
- **Тип:** Frontend
- **Описание:** Step 2 wizard: grid карточек шаблонов (icon, name, description, "Preview" button). Preview modal: list of entities that will be created. "Use This Template" button.
- **Критерии готовности:**
  - [ ] Card grid с hover effect
  - [ ] Preview modal с detailed entity list
  - [ ] Selection highlights chosen template
- **Оценка:** 8h
- **Story:** STORY-120

**[TASK-0536]** Design: template cards и preview
- **Тип:** Design
- **Описание:** Design карточек шаблонов: unique icon для каждого, visual style, preview modal layout.
- **Критерии готовности:**
  - [ ] 5 unique icons/illustrations
  - [ ] Card и preview designs
- **Оценка:** 4h
- **Story:** STORY-120

---

### [STORY-121] Шаг: Add First Broker (guided)
**Как** Network Admin, **я хочу** добавить первого брокера через guided flow с подсказками на каждом поле, **чтобы** корректно настроить интеграцию с первого раза.

**Acceptance Criteria:**
- [ ] AC1: Simplified форма: только обязательные поля (broker name, integration template, API credentials)
- [ ] AC2: Integration template picker: поиск по имени/стране, top-10 popular templates выделены
- [ ] AC3: Help tooltip на каждом поле: "Где найти API key?" с screenshot из документации брокера
- [ ] AC4: Auto-test connection: после ввода credentials — автоматическая проверка подключения
- [ ] AC5: Success indicator: зелёная галочка "Connection successful" или красный error с подсказкой
- [ ] AC6: "Skip — I'll add later" option с пояснением что без брокера лиды не будут отправляться

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-13
**Зависит от:** STORY-119

#### Tasks:

**[TASK-0537]** Frontend: guided broker setup step
- **Тип:** Frontend
- **Описание:** Step 3 wizard: simplified broker form, template picker с search и popular badges, help tooltips с images, auto-test on credentials fill, success/error states.
- **Критерии готовности:**
  - [ ] Template picker с search и top-10 popular
  - [ ] Tooltips с screenshots
  - [ ] Auto-test с visual feedback
  - [ ] Error state с actionable suggestions
- **Оценка:** 8h
- **Story:** STORY-121

**[TASK-0538]** Backend: simplified broker creation API
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/onboarding/broker` — simplified версия broker creation с auto-fill defaults из template, auto-test connection, return detailed error при failure.
- **Критерии готовности:**
  - [ ] Auto-fill из template
  - [ ] Connection test с detailed error response
  - [ ] Fallback defaults для optional fields
- **Оценка:** 4h
- **Story:** STORY-121

---

### [STORY-122] Шаг: Add First Affiliate (guided)
**Как** Network Admin, **я хочу** добавить первого аффилейта через guided flow с автоматической генерацией API ключа и примером интеграции, **чтобы** аффилейт мог начать отправлять лиды сразу.

**Acceptance Criteria:**
- [ ] AC1: Simplified форма: affiliate name, contact email, postback URL (optional)
- [ ] AC2: Автоматическая генерация API key с возможностью copy-to-clipboard
- [ ] AC3: Integration snippet: готовый код для отправки лида (cURL, PHP, Python, JavaScript) — copy-to-clipboard
- [ ] AC4: "Send to affiliate" button: отправить email с API key и интеграционными инструкциями
- [ ] AC5: Help: "Что такое postback URL?" tooltip с примером

**Story Points:** 3
**Приоритет:** Must
**Epic:** EPIC-13
**Зависит от:** STORY-119

#### Tasks:

**[TASK-0539]** Frontend: guided affiliate setup step
- **Тип:** Frontend
- **Описание:** Step 4 wizard: simplified affiliate form, API key display с copy button, code snippets (tabs: cURL/PHP/Python/JS), "Send Instructions" button.
- **Критерии готовности:**
  - [ ] API key copy-to-clipboard
  - [ ] Code snippets для 4 языков
  - [ ] Email send button
- **Оценка:** 8h
- **Story:** STORY-122

**[TASK-0540]** Backend: simplified affiliate creation и email instructions
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/onboarding/affiliate` — simplified creation, auto-generate API key, return integration snippets. `POST /api/v1/onboarding/affiliate/{id}/send-instructions` — email с credentials и code examples.
- **Критерии готовности:**
  - [ ] Auto-generate secure API key
  - [ ] Integration snippets для 4 языков
  - [ ] Email template с branding
- **Оценка:** 4h
- **Story:** STORY-122

---

### [STORY-123] Шаг: Create Routing Rule (guided)
**Как** Network Admin, **я хочу** создать первый routing rule через guided flow с визуальным preview, **чтобы** лиды от аффилейта начали маршрутизироваться к брокеру.

**Acceptance Criteria:**
- [ ] AC1: Simplified routing: affiliate → broker (без сложных правил для первого шага)
- [ ] AC2: Visual flow: блок "Affiliate" → стрелка → блок "Broker" с drag-connect
- [ ] AC3: Inline настройки: cap (daily), GEO filter (country multiselect), weight (если > 1 broker)
- [ ] AC4: Preview: "Leads от [Affiliate Name] из [Countries] будут отправляться на [Broker Name] с капом [N] в день"
- [ ] AC5: Suggestion: если template подразумевает > 1 broker — подсказка "Add backup broker for failover"

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-13
**Зависит от:** STORY-121, STORY-122

#### Tasks:

**[TASK-0541]** Frontend: guided routing setup step
- **Тип:** Frontend
- **Описание:** Step 5 wizard: visual flow builder (simplified — 2 blocks with arrow), inline settings (cap, GEO, weight), text preview of routing logic, suggestion tooltip for advanced options.
- **Критерии готовности:**
  - [ ] Visual flow с drag-connect
  - [ ] Inline settings (cap, GEO)
  - [ ] Text preview обновляется в реальном времени
- **Оценка:** 8h
- **Story:** STORY-123

**[TASK-0542]** Backend: simplified routing rule creation
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/onboarding/routing-rule` — creates routing rule with default settings, validates affiliate and broker exist and are active. Auto-enable the rule.
- **Критерии готовности:**
  - [ ] Creates valid routing rule
  - [ ] Validates entities exist
  - [ ] Auto-enable with default settings
- **Оценка:** 4h
- **Story:** STORY-123

---

### [STORY-124] Шаг: Send Test Lead
**Как** Network Admin, **я хочу** отправить тестовый лид через UI и видеть весь путь лида в реальном времени (intake → validation → routing → broker send), **чтобы** убедиться что всё настроено правильно.

**Acceptance Criteria:**
- [ ] AC1: Форма тестового лида: pre-filled с realistic test data (John Doe, test@example.com, +1234567890, US)
- [ ] AC2: "Send Test Lead" button с визуальной анимацией отправки
- [ ] AC3: Live pipeline visualization: 4 стадии (received → validated → routed → sent to broker) с real-time status updates
- [ ] AC4: Каждая стадия показывает: status (success/processing/failed), duration, details
- [ ] AC5: При success: celebration animation + "Your first lead is sent! You're ready to go"
- [ ] AC6: При error: подробное объяснение что пошло не так и suggestion как исправить
- [ ] AC7: "Send Another" button для повторного теста

**Story Points:** 5
**Приоритет:** Must
**Epic:** EPIC-13
**Зависит от:** STORY-123

#### Tasks:

**[TASK-0543]** Backend: test lead API
- **Тип:** Backend
- **Описание:** Endpoint `POST /api/v1/onboarding/test-lead` — creates test lead (flagged as is_test=true), routes through full pipeline, returns step-by-step status via SSE stream. Test leads excluded from real analytics.
- **Критерии готовности:**
  - [ ] Full pipeline execution for test lead
  - [ ] SSE stream для real-time status
  - [ ] Test leads flagged и excluded from analytics
  - [ ] Detailed error response на каждой стадии
- **Оценка:** 8h
- **Story:** STORY-124

**[TASK-0544]** Frontend: test lead step с live visualization
- **Тип:** Frontend
- **Описание:** Step 6 wizard: pre-filled lead form (editable), "Send" button, animated pipeline visualization (4 stages horizontal), real-time status via SSE, celebration animation на success, error explanation с suggestions на failure.
- **Критерии готовности:**
  - [ ] Pre-filled form с realistic data
  - [ ] Animated pipeline stages
  - [ ] SSE real-time updates
  - [ ] Celebration на success, helpful error на failure
- **Оценка:** 8h
- **Story:** STORY-124

**[TASK-0545]** QA: E2E тестирование wizard test lead
- **Тип:** QA
- **Описание:** E2E: полный wizard → test lead → success. Test: broker unavailable → error с suggestion. Test: validation failure → error с details. Test: routing no match → error.
- **Критерии готовности:**
  - [ ] Happy path end-to-end
  - [ ] 3+ error scenarios с корректными suggestions
- **Оценка:** 4h
- **Story:** STORY-124

---

### [STORY-125] In-app подсказки и contextual help
**Как** Network Admin, **я хочу** видеть контекстные подсказки на каждом экране приложения (не только в wizard), **чтобы** понимать возможности системы и не обращаться в поддержку.

**Acceptance Criteria:**
- [ ] AC1: Tooltips на каждом сложном поле/кнопке: hover/click → popup с объяснением (текст + optional screenshot/gif)
- [ ] AC2: "Getting Started" checklist в sidebar: 10 задач после wizard (add 2nd broker, configure notifications, invite team, etc.) с progress tracking
- [ ] AC3: Feature spotlight: при первом посещении нового раздела — highlight ключевых элементов с объяснением (tour)
- [ ] AC4: Help button (?) в каждом разделе: открывает contextual article из knowledge base
- [ ] AC5: Search help: поиск по knowledge base из любого места в UI
- [ ] AC6: Все подсказки можно отключить: toggle "Don't show tips" в Settings

**Story Points:** 8
**Приоритет:** Should
**Epic:** EPIC-13

#### Tasks:

**[TASK-0546]** Backend: help content management
- **Тип:** Backend
- **Описание:** Таблица `help_articles` (id, section, page, element_id, title, body markdown, media_url). API: get article by section+page+element, search articles. Таблица `user_onboarding_progress` (user_id, checklist_items jsonb, tips_disabled, tours_completed jsonb).
- **Критерии готовности:**
  - [ ] Help articles CRUD
  - [ ] Search с full-text
  - [ ] User progress tracking
- **Оценка:** 8h
- **Story:** STORY-125

**[TASK-0547]** Frontend: tooltip и tour system
- **Тип:** Frontend
- **Описание:** Глобальный компонент `HelpSystem`: contextual tooltips (attached to elements via data attribute), feature tour (highlight + popup sequence), getting started checklist (sidebar widget), search modal, disable toggle.
- **Критерии готовности:**
  - [ ] Tooltips отображаются по data-help attribute
  - [ ] Feature tour с step-by-step navigation
  - [ ] Getting started checklist с progress bar
  - [ ] Global search modal (Cmd+K or ?)
  - [ ] Disable toggle in settings
- **Оценка:** 16h
- **Story:** STORY-125

**[TASK-0548]** Design: help content и illustrations
- **Тип:** Design
- **Описание:** Создание контента для tooltips (50+ текстов), feature tour scripts (5 разделов), getting started checklist items (10), illustrations для сложных концепций (routing, caps, autologin).
- **Критерии готовности:**
  - [ ] 50+ tooltip текстов
  - [ ] 5 feature tour scripts
  - [ ] 10 checklist items
  - [ ] 5+ illustrations
- **Оценка:** 16h
- **Story:** STORY-125

---

### [STORY-126] Onboarding analytics и optimization
**Как** Network Admin (GambChamp internal), **я хочу** видеть аналитику прохождения onboarding wizard (completion rate, drop-off per step, time per step), **чтобы** оптимизировать onboarding flow и уменьшить time-to-first-lead.

**Acceptance Criteria:**
- [ ] AC1: Funnel: completion rate по каждому шагу wizard (step 1 → 2 → ... → 6)
- [ ] AC2: Time per step: avg и p95 время на каждом шаге
- [ ] AC3: Drop-off analysis: на каком шаге и по какой причине пользователи прерывают wizard
- [ ] AC4: Template usage: какие шаблоны выбираются чаще всего
- [ ] AC5: Time to first real lead (не test): медиана для всех новых аккаунтов
- [ ] AC6: Internal dashboard (доступен только для admin GambChamp)
- [ ] AC7: Weekly email report с onboarding metrics для product team

**Story Points:** 5
**Приоритет:** Could
**Epic:** EPIC-13
**Зависит от:** STORY-119

#### Tasks:

**[TASK-0549]** Backend: onboarding analytics collection
- **Тип:** Backend
- **Описание:** Event tracking: при каждом step completion/skip/abandon записывать event (company_id, step, action, duration_ms, template_id, timestamp). Aggregation API для internal dashboard. Weekly report cron.
- **Критерии готовности:**
  - [ ] Events collected для каждого step action
  - [ ] Funnel aggregation API
  - [ ] Weekly email report generation
- **Оценка:** 8h
- **Story:** STORY-126

**[TASK-0550]** Frontend: internal onboarding dashboard
- **Тип:** Frontend
- **Описание:** Internal-only page: funnel chart (6 steps), time per step bar chart, drop-off reasons table, template usage pie chart, time-to-first-lead histogram.
- **Критерии готовности:**
  - [ ] Funnel visualization
  - [ ] Time metrics charts
  - [ ] Access restricted to internal admin
- **Оценка:** 8h
- **Story:** STORY-126

---
---

# P2 — GROWTH (EPIC-14 → EPIC-19) + P3 — SCALE (EPIC-20 → EPIC-23)
*Для роста, удержания клиентов и масштабирования платформы.*

---

## [EPIC-14] Advanced Analytics & BI

**Цель:** Предоставить пользователям инструменты расширенной аналитики уровня BI-платформы: конструктор кастомных отчётов, дашбордов, когортный анализ качества трафика, affiliate-level P&L с историей, сравнение периодов, запланированные email-отчёты и экспорт в CSV/Excel/PDF.

**Метрика успеха:**
- 60% активных пользователей создают хотя бы 1 кастомный отчёт в первые 30 дней
- Среднее время генерации отчёта < 3 секунд для датасетов до 1M записей
- Снижение запросов в поддержку по аналитике на 40%

**Приоритет:** P2 (Growth)
**Зависит от:** EPIC-10 (Analytics Dashboard v1), EPIC-12 (Conversions & Basic P&L)
**Размер:** XL (3+ мес)

**Референс:** Elnopy имеет BI report builder — лучшая реализация на рынке. Leadgreed имеет Compare periods и Share filters.

---

### Stories:

**[STORY-130] Конструктор кастомных отчётов**
Как Network Admin, я хочу создавать кастомные отчёты с выбором метрик, измерений и фильтров через drag-and-drop интерфейс, чтобы получать аналитику под конкретные бизнес-задачи без обращения в поддержку.

Acceptance Criteria:
- [ ] AC1: Доступно не менее 25 метрик (leads, FTD, CR, revenue, cost, profit, EPC, EPL, shave rate, reject rate и др.) и 15 измерений (affiliate, broker, GEO, funnel, date, hour, source, sub1-sub5 и др.)
- [ ] AC2: Drag-and-drop добавление метрик в строки/столбцы с превью результата в реальном времени
- [ ] AC3: Поддержка до 5 уровней группировки (например: Country → Broker → Affiliate → Funnel → Date)
- [ ] AC4: Фильтрация по любому измерению с операторами: equals, not equals, contains, in list, date range
- [ ] AC5: Сохранение отчёта с названием и описанием; лимит до 50 сохранённых отчётов на аккаунт
- [ ] AC6: Генерация отчёта для датасета до 500K записей выполняется за < 3 сек
- [ ] AC7: При ошибке генерации отображается понятное сообщение с рекомендацией сузить фильтры

Story Points: 13
Приоритет: Must
Epic: EPIC-14

#### Tasks для STORY-130:

[TASK-0750] Backend: Спроектировать и реализовать Report Builder API
Тип: Backend
Описание: Создать endpoints POST /api/v1/reports (создание), GET /api/v1/reports (список), GET /api/v1/reports/:id (получение), PUT /api/v1/reports/:id (обновление), DELETE /api/v1/reports/:id (удаление). Request body включает массив metrics[], dimensions[], filters[], sort_by, limit. Реализовать динамическую SQL-генерацию с prepared statements для защиты от injection. Поддержка пагинации для результатов. Кэширование результатов на 60 сек с invalidation при новых данных.
Критерии готовности:
- [ ] CRUD endpoints реализованы и задокументированы в OpenAPI
- [ ] SQL-генерация покрывает все 25 метрик и 15 измерений
- [ ] Время генерации < 3 сек для 500K записей (проверено нагрузочным тестом)
- [ ] Rate limiting: 10 запросов в минуту на пользователя
Оценка: 16h
Story: STORY-130

[TASK-0751] Backend: Создать схему БД для хранения отчётов
Тип: Backend
Описание: Таблица `custom_reports`: id, company_id, user_id, name, description, config (JSONB — метрики, измерения, фильтры), created_at, updated_at. Индексы на company_id, user_id. Миграция с ограничением 50 отчётов per company через CHECK constraint или application-level валидацию.
Критерии готовности:
- [ ] Миграция создана и протестирована на rollback
- [ ] JSONB-схема config задокументирована
- [ ] Ограничение на 50 отчётов работает корректно
Оценка: 4h
Story: STORY-130

[TASK-0752] Frontend: Реализовать drag-and-drop конструктор отчётов
Тип: Frontend
Описание: Компонент ReportBuilder с тремя зонами: палитра метрик/измерений (левая панель), область построения отчёта (центр), панель фильтров (правая панель). Drag-and-drop с визуальным feedback при перетаскивании. Превью результата обновляется при каждом изменении конфигурации (debounce 500ms). Responsive до 1024px.
Критерии готовности:
- [ ] Drag-and-drop работает в Chrome, Firefox, Safari
- [ ] Превью обновляется в реальном времени
- [ ] Состояние сохраняется при навигации (localStorage fallback)
Оценка: 16h
Story: STORY-130

[TASK-0753] Frontend: Отображение результатов отчёта в табличном и графическом виде
Тип: Frontend
Описание: Таблица результатов с сортировкой по клику на заголовок, подсветкой строки при hover. Переключатель табличного / графического вида. Графики: bar, line, pie (через библиотеку Recharts или аналог). Пагинация для таблиц > 100 строк.
Критерии готовности:
- [ ] Таблица отображает до 10K строк без деградации производительности
- [ ] 3 типа графиков работают корректно
- [ ] Сортировка работает по всем колонкам
Оценка: 8h
Story: STORY-130

[TASK-0754] Design: Wireframes и UI-kit конструктора отчётов
Тип: Design
Описание: Wireframes для: палитры метрик, области построения, панели фильтров, превью результатов, модального окна сохранения. High-fidelity мокапы для десктопа (1440px) и планшета (1024px).
Критерии готовности:
- [ ] Wireframes утверждены стейкхолдерами
- [ ] UI-kit компонентов передан в frontend
Оценка: 8h
Story: STORY-130

[TASK-0755] QA: Тестирование конструктора отчётов
Тип: QA
Описание: Тест-кейсы: создание отчёта со всеми комбинациями метрик/измерений, drag-and-drop, фильтрация, сохранение/загрузка, лимит 50 отчётов, ошибки при пустых данных, таймаут при тяжёлых запросах, RBAC (только свои отчёты).
Критерии готовности:
- [ ] 30+ тест-кейсов написаны и выполнены
- [ ] Все критические и высокие баги исправлены
Оценка: 8h
Story: STORY-130

---

**[STORY-131] Конструктор дашбордов**
Как Team Lead, я хочу собирать персональные дашборды из виджетов (графики, KPI-карточки, таблицы), чтобы мониторить ключевые показатели своей команды на одном экране.

Acceptance Criteria:
- [ ] AC1: Доступно не менее 10 типов виджетов: KPI-карточка, line chart, bar chart, pie chart, таблица, heatmap, gauge, funnel chart, sparkline, text note
- [ ] AC2: Grid-based layout (12 колонок) с resize и drag для каждого виджета
- [ ] AC3: Каждый виджет имеет собственные настройки фильтрации и периода
- [ ] AC4: Глобальный фильтр периода применяется ко всем виджетам одновременно
- [ ] AC5: Auto-refresh с настраиваемым интервалом (30 сек / 1 мин / 5 мин / off)
- [ ] AC6: Лимит до 20 виджетов на дашборд и 10 дашбордов на пользователя
- [ ] AC7: Возможность поделиться дашбордом с другими пользователями в компании (read-only)

Story Points: 13
Приоритет: Must
Epic: EPIC-14
Зависит от: STORY-130

#### Tasks для STORY-131:

[TASK-0756] Backend: API для управления дашбордами и виджетами
Тип: Backend
Описание: CRUD endpoints для dashboards и widgets. Dashboard: id, company_id, user_id, name, layout (JSONB), is_shared, shared_with (array user_id). Widget: id, dashboard_id, type, config (JSONB — metric, filters, period), position (x, y, w, h). Валидация лимитов. WebSocket канал для auto-refresh данных виджетов.
Критерии готовности:
- [ ] CRUD endpoints для dashboards и widgets реализованы
- [ ] WebSocket push работает для обновления данных
- [ ] Лимиты 20 виджетов / 10 дашбордов валидируются на уровне API
Оценка: 16h
Story: STORY-131

[TASK-0757] Frontend: Grid-based конструктор дашбордов
Тип: Frontend
Описание: Реализовать grid layout (react-grid-layout или аналог) с 12 колонками. Drag для перемещения виджетов, resize handle для изменения размера. Панель добавления виджетов с превью каждого типа. Режим редактирования / просмотра. Глобальный date range picker.
Критерии готовности:
- [ ] Grid layout корректно работает при resize окна
- [ ] Все 10 типов виджетов отрисовываются корректно
- [ ] Переключение режимов edit/view работает
Оценка: 16h
Story: STORY-131

[TASK-0758] Frontend: Реализация 10 типов виджетов
Тип: Frontend
Описание: Компоненты для каждого типа виджета с настраиваемым data source. Каждый виджет: настройки (метрика, фильтры, период), загрузка данных, рендеринг, состояние loading/error/empty. KPI-карточка показывает trend (стрелка вверх/вниз + процент).
Критерии готовности:
- [ ] Все 10 типов виджетов реализованы
- [ ] Каждый виджет корректно обрабатывает loading, error, empty states
- [ ] KPI-карточка показывает тренд по сравнению с предыдущим периодом
Оценка: 16h
Story: STORY-131

[TASK-0759] Design: UI-kit виджетов дашборда
Тип: Design
Описание: Дизайн каждого типа виджета в 3 состояниях: loading, data, empty. Цветовая палитра для графиков (до 12 серий). Дизайн панели настроек виджета и модального окна sharing.
Критерии готовности:
- [ ] Дизайн всех 10 типов виджетов утверждён
- [ ] Палитра цветов для графиков определена
Оценка: 8h
Story: STORY-131

[TASK-0760] QA: Тестирование конструктора дашбордов
Тип: QA
Описание: Тестирование grid layout, drag/resize, auto-refresh, sharing, лимитов, работы виджетов с разными объёмами данных, конкурентного редактирования.
Критерии готовности:
- [ ] 25+ тест-кейсов покрывают все сценарии
- [ ] Нагрузочный тест: дашборд с 20 виджетами загружается < 5 сек
Оценка: 8h
Story: STORY-131

---

**[STORY-132] Когортный анализ качества трафика**
Как Affiliate Manager, я хочу анализировать качество трафика по когортам (неделя регистрации лида), чтобы отслеживать динамику конверсии и LTV аффилейтов во времени.

Acceptance Criteria:
- [ ] AC1: Когорты формируются по дате регистрации лида с группировкой: день, неделя, месяц
- [ ] AC2: Метрики когорт: CR (lead→FTD), время до FTD (медиана), shave rate, revenue per lead, retention (повторные депозиты)
- [ ] AC3: Визуализация в виде heatmap-таблицы (строки — когорты, столбцы — периоды после регистрации)
- [ ] AC4: Фильтрация по affiliate, broker, GEO, funnel
- [ ] AC5: Возможность сравнить 2 когорты side-by-side с выделением отклонений > 10%
- [ ] AC6: Данные рассчитываются для когорт до 12 месяцев назад

Story Points: 8
Приоритет: Must
Epic: EPIC-14
Зависит от: STORY-130

#### Tasks для STORY-132:

[TASK-0761] Backend: Сервис когортного анализа
Тип: Backend
Описание: Endpoint GET /api/v1/analytics/cohorts с параметрами: granularity (day/week/month), metric, filters, date_range. SQL-запрос с window functions для расчёта когортных метрик. Кэширование результатов на 5 мин (Redis). Поддержка до 52 когорт (год по неделям).
Критерии готовности:
- [ ] Endpoint возвращает корректные когортные данные
- [ ] Время ответа < 5 сек для 12 месяцев данных
- [ ] Кэширование работает с корректной invalidation
Оценка: 16h
Story: STORY-132

[TASK-0762] Frontend: Компонент когортного heatmap
Тип: Frontend
Описание: Heatmap-таблица с цветовой градацией (зелёный → жёлтый → красный). Tooltip при hover с точными значениями. Селектор метрики и гранулярности. Режим сравнения двух когорт с визуальным diff.
Критерии готовности:
- [ ] Heatmap отрисовывается для 52 когорт корректно
- [ ] Режим сравнения показывает delta с цветовым кодированием
Оценка: 8h
Story: STORY-132

[TASK-0763] QA: Тестирование когортного анализа
Тип: QA
Описание: Проверка корректности расчётов когорт на тестовых данных. Граничные случаи: когорта из 1 лида, пустая когорта, когорта без FTD. Проверка фильтров. Сравнение с ручным расчётом.
Критерии готовности:
- [ ] Расчёты верифицированы на 5 тестовых сценариях
- [ ] Граничные случаи обработаны корректно
Оценка: 4h
Story: STORY-132

---

**[STORY-133] Сравнение периодов в отчётах**
Как Team Lead, я хочу сравнивать метрики за два произвольных периода (например, эта неделя vs прошлая), чтобы быстро выявлять аномалии и тренды.

Acceptance Criteria:
- [ ] AC1: Выбор двух периодов через date range picker с пресетами: vs предыдущий период, vs тот же период прошлого месяца, vs тот же период прошлого года, кастомный
- [ ] AC2: Отображение delta (абсолютное и процентное) для каждой метрики с цветовым кодированием (зелёный = рост, красный = падение)
- [ ] AC3: Графики overlay — наложение двух линий для визуального сравнения
- [ ] AC4: Доступно для всех типов отчётов: стандартных и кастомных
- [ ] AC5: При разнице > 20% по ключевым метрикам (CR, revenue) автоматическая подсветка строки

Story Points: 5
Приоритет: Should
Epic: EPIC-14

#### Tasks для STORY-133:

[TASK-0764] Backend: API поддержки сравнения периодов
Тип: Backend
Описание: Расширить report API параметрами compare_period_start, compare_period_end. Ответ включает массив data[] и compare_data[] с идентичной структурой. Расчёт delta_absolute и delta_percent на бэкенде для оптимизации фронтенда.
Критерии готовности:
- [ ] API принимает два периода и возвращает данные для обоих
- [ ] Delta рассчитывается корректно (включая деление на ноль)
Оценка: 8h
Story: STORY-133

[TASK-0765] Frontend: UI сравнения периодов
Тип: Frontend
Описание: Dual date range picker с пресетами. Таблица с доп. колонками: значение периода 2, delta %, delta abs. Overlay-графики с легендой. Подсветка строк с отклонением > 20%.
Критерии готовности:
- [ ] Пресеты работают корректно для всех вариантов
- [ ] Overlay-графики отображают обе серии с разными цветами
Оценка: 8h
Story: STORY-133

[TASK-0766] QA: Тестирование сравнения периодов
Тип: QA
Описание: Тест-кейсы: корректность delta, пересечение периодов, пустой второй период, одинаковые периоды, timezone edge cases.
Критерии готовности:
- [ ] Все edge cases проверены
Оценка: 4h
Story: STORY-133

---

**[STORY-134] Запланированные email-отчёты**
Как Network Admin, я хочу настроить автоматическую отправку отчётов по расписанию на email, чтобы команда получала ключевые метрики без необходимости входа в систему.

Acceptance Criteria:
- [ ] AC1: Расписание: ежедневно (в указанное время), еженедельно (день + время), ежемесячно (число + время) с учётом timezone пользователя
- [ ] AC2: Получатели: до 10 email-адресов (включая внешние, не зарегистрированные в системе)
- [ ] AC3: Формат письма: HTML-таблица с KPI и inline-графиками + прикреплённый файл (PDF или Excel на выбор)
- [ ] AC4: Любой сохранённый отчёт или дашборд может быть подключён к расписанию
- [ ] AC5: История отправок: статус (sent/failed), timestamp, список получателей
- [ ] AC6: Лимит: до 20 запланированных отчётов на компанию
- [ ] AC7: Отписка от отчёта по ссылке в письме для каждого получателя

Story Points: 8
Приоритет: Should
Epic: EPIC-14
Зависит от: STORY-130, STORY-131

#### Tasks для STORY-134:

[TASK-0767] Backend: Сервис планирования и отправки отчётов
Тип: Backend
Описание: Таблица scheduled_reports: id, company_id, report_id/dashboard_id, schedule (cron expression), recipients (JSONB), format (pdf/excel), timezone, is_active. Cron worker для генерации и отправки. Retry 3 раза с exponential backoff при ошибке отправки. Логирование в таблицу scheduled_report_logs.
Критерии готовности:
- [ ] Cron worker генерирует и отправляет отчёты по расписанию
- [ ] Retry механизм работает корректно
- [ ] Логи отправки записываются
Оценка: 16h
Story: STORY-134

[TASK-0768] Backend: Генерация PDF и Excel из отчётов
Тип: Backend
Описание: PDF-генерация через headless browser (Puppeteer/Playwright) с HTML-шаблоном отчёта. Excel-генерация через excelize (Go) или openpyxl. Включение графиков как изображений в PDF. Лимит размера файла: 10MB.
Критерии готовности:
- [ ] PDF и Excel генерируются корректно для всех типов отчётов
- [ ] Графики включены в PDF как изображения
- [ ] Размер файла контролируется
Оценка: 8h
Story: STORY-134

[TASK-0769] Frontend: UI управления запланированными отчётами
Тип: Frontend
Описание: Страница списка запланированных отчётов с toggle active/inactive. Форма создания: выбор отчёта/дашборда, расписание (визуальный cron picker), получатели (multi-input email), формат. История отправок с фильтрацией.
Критерии готовности:
- [ ] Форма создания работает с валидацией email
- [ ] Toggle включения/выключения обновляется мгновенно
- [ ] История отправок отображается с пагинацией
Оценка: 8h
Story: STORY-134

[TASK-0770] DevOps: Настройка cron worker для scheduled reports
Тип: DevOps
Описание: Развернуть отдельный worker процесс для cron задач отчётов. Настроить мониторинг: алерт если задача не выполнена в течение 30 мин от запланированного времени. Отдельная очередь в Redis/RabbitMQ.
Критерии готовности:
- [ ] Worker запущен и мониторится
- [ ] Алерты настроены в Grafana/Datadog
Оценка: 4h
Story: STORY-134

[TASK-0771] QA: Тестирование scheduled reports
Тип: QA
Описание: Тест-кейсы: отправка по расписанию, корректность PDF/Excel, отписка получателя, retry при ошибке, timezone handling, лимит 20 отчётов.
Критерии готовности:
- [ ] Все сценарии протестированы включая timezone edge cases
Оценка: 4h
Story: STORY-134

---

**[STORY-135] Экспорт данных в CSV/Excel/PDF**
Как Finance Manager, я хочу экспортировать любой отчёт в CSV, Excel или PDF, чтобы использовать данные во внешних инструментах и для отчётности перед руководством.

Acceptance Criteria:
- [ ] AC1: Кнопка экспорта доступна на каждом отчёте и дашборде
- [ ] AC2: Форматы: CSV (UTF-8 BOM для корректного отображения в Excel), Excel (.xlsx с форматированием), PDF (с графиками и таблицами)
- [ ] AC3: Экспорт до 100K строк для CSV/Excel и до 10K строк для PDF
- [ ] AC4: Для экспортов > 10K строк — асинхронная генерация с уведомлением по email когда файл готов (ссылка действительна 24 часа)
- [ ] AC5: Лимит: 50 экспортов в день на пользователя
- [ ] AC6: Защита экспорта 2FA-кодом для отчётов, содержащих финансовые данные (P&L, revenue)

Story Points: 5
Приоритет: Must
Epic: EPIC-14

#### Tasks для STORY-135:

[TASK-0772] Backend: Сервис экспорта отчётов
Тип: Backend
Описание: Endpoint POST /api/v1/reports/:id/export с параметром format (csv/excel/pdf). Синхронная генерация для < 10K строк (возврат файла в response). Асинхронная генерация для > 10K строк (возврат job_id, уведомление по email). Presigned URL для скачивания (S3/MinIO), TTL 24 часа. Rate limit: 50/день/user.
Критерии готовности:
- [ ] Синхронный и асинхронный режимы работают
- [ ] Файлы корректно скачиваются по presigned URL
- [ ] Rate limit работает
Оценка: 8h
Story: STORY-135

[TASK-0773] Frontend: UI экспорта с выбором формата
Тип: Frontend
Описание: Dropdown-кнопка Export с выбором формата. Progress indicator для асинхронных экспортов. 2FA modal для финансовых отчётов. Уведомление "Файл готов" в UI (через WebSocket).
Критерии готовности:
- [ ] Dropdown работает корректно
- [ ] 2FA modal появляется для финансовых отчётов
- [ ] Уведомление о готовности файла приходит в реальном времени
Оценка: 4h
Story: STORY-135

[TASK-0774] QA: Тестирование экспорта
Тип: QA
Описание: Проверка корректности данных в CSV (UTF-8 BOM, разделители), Excel (формулы, форматирование чисел), PDF (шрифты, графики). Тест асинхронной генерации. Проверка 2FA и rate limit.
Критерии готовности:
- [ ] Файлы открываются без ошибок в Excel, Google Sheets, Adobe Reader
- [ ] Данные в экспорте соответствуют данным в UI
Оценка: 4h
Story: STORY-135

---

**[STORY-136] Affiliate-level P&L с историей**
Как Finance Manager, я хочу видеть детальный P&L по каждому аффилейту с историей за любой период, чтобы принимать решения о продолжении сотрудничества на основе данных.

Acceptance Criteria:
- [ ] AC1: P&L отчёт включает: leads sent, leads accepted, FTD count, FTD rate, revenue (buy price * FTD), cost (sell price * FTD), profit, ROI%, EPC
- [ ] AC2: Группировка P&L: по affiliate, по broker, по GEO, по funnel, по дате
- [ ] AC3: Drill-down: клик по affiliate → разбивка по брокерам → клик по брокеру → разбивка по GEO
- [ ] AC4: Тренд P&L за выбранный период на графике (line chart по дням/неделям/месяцам)
- [ ] AC5: Highlight аффилейтов с отрицательным ROI красным цветом
- [ ] AC6: Сравнение P&L текущего периода с предыдущим (delta %)

Story Points: 8
Приоритет: Must
Epic: EPIC-14
Зависит от: EPIC-12

#### Tasks для STORY-136:

[TASK-0775] Backend: API для affiliate P&L с drill-down
Тип: Backend
Описание: Endpoint GET /api/v1/analytics/pnl с параметрами: group_by, date_range, affiliate_id (optional), broker_id (optional). Расчёт всех P&L метрик через агрегацию по таблицам leads, conversions, financial_settings. Поддержка drill-down через вложенные group_by.
Критерии готовности:
- [ ] P&L рассчитывается корректно для всех комбинаций группировки
- [ ] Drill-down работает до 3 уровней вложенности
- [ ] Время ответа < 3 сек для периода до 12 месяцев
Оценка: 16h
Story: STORY-136

[TASK-0776] Frontend: Компонент P&L дашборда с drill-down
Тип: Frontend
Описание: Таблица P&L с expandable rows для drill-down. Цветовое кодирование: положительный profit — зелёный, отрицательный — красный. Line chart тренда P&L. Селектор группировки и периода. Export в Excel одним кликом.
Критерии готовности:
- [ ] Drill-down через expand rows работает
- [ ] Цветовое кодирование применяется корректно
- [ ] График тренда отрисовывается для выбранного периода
Оценка: 8h
Story: STORY-136

[TASK-0777] QA: Верификация расчётов P&L
Тип: QA
Описание: Сверка P&L расчётов системы с ручным расчётом на тестовых данных (минимум 3 сценария). Проверка корректности при: нулевых FTD, отсутствии buy/sell price, mixed currency, отрицательном profit.
Критерии готовности:
- [ ] Расчёты верифицированы на 3+ сценариях
- [ ] Edge cases обработаны (деление на 0, пустые данные)
Оценка: 4h
Story: STORY-136

---

**[STORY-137] Share Filters — совместная работа с отчётами**
Как Team Lead, я хочу поделиться настроенными фильтрами отчёта с коллегой по ссылке, чтобы команда работала с одними и теми же срезами данных.

Acceptance Criteria:
- [ ] AC1: Кнопка "Поделиться" генерирует короткую ссылку с закодированными фильтрами
- [ ] AC2: Ссылка открывает отчёт с применёнными фильтрами для авторизованного пользователя той же компании
- [ ] AC3: Получатель видит данные согласно своим RBAC-правам (фильтры применены, но доступ ограничен его ролью)
- [ ] AC4: Ссылка не работает для пользователей других компаний (403 Forbidden)
- [ ] AC5: Возможность сохранить чужой набор фильтров как свой пресет

Story Points: 3
Приоритет: Could
Epic: EPIC-14

#### Tasks для STORY-137:

[TASK-0778] Backend: API для shared filter links
Тип: Backend
Описание: Endpoint POST /api/v1/reports/share — принимает filter config, возвращает short_code. GET /api/v1/reports/shared/:code — возвращает filter config + report_id. Валидация company_id при доступе. Хранение в таблице shared_filters с TTL 90 дней.
Критерии готовности:
- [ ] Генерация и разрешение ссылок работает
- [ ] Изоляция по company_id проверена
- [ ] Expired links возвращают 410 Gone
Оценка: 4h
Story: STORY-137

[TASK-0779] Frontend: UI sharing фильтров
Тип: Frontend
Описание: Кнопка Share с копированием ссылки в clipboard. При открытии shared link — автоматическое применение фильтров с toast-уведомлением "Фильтры применены от [user]". Кнопка "Сохранить как мой пресет".
Критерии готовности:
- [ ] Copy-to-clipboard работает
- [ ] Фильтры применяются автоматически
Оценка: 4h
Story: STORY-137

[TASK-0780] QA: Тестирование shared filters
Тип: QA
Описание: Тест-кейсы: sharing между пользователями одной компании, попытка доступа из другой компании, expired link, RBAC-ограничения, сохранение как пресет.
Критерии готовности:
- [ ] Все сценарии безопасности проверены
Оценка: 2h
Story: STORY-137

---

## [EPIC-15] Mobile Dashboard

**Цель:** Предоставить мобильное PWA-приложение для мониторинга KPI в реальном времени, получения push-уведомлений и быстрого управления капами — функциональность, которую ни один конкурент на рынке не предлагает.

**Метрика успеха:**
- 30% активных пользователей устанавливают PWA в первые 60 дней
- DAU мобильного приложения достигает 20% от DAU десктопа
- Среднее время реакции на алерт через мобильное < 5 мин (vs 15 мин через email)

**Приоритет:** P2 (Growth)
**Зависит от:** EPIC-10 (Analytics Dashboard v1), EPIC-11 (Notifications & Alerts)
**Размер:** L (1-3 мес)

**Уникальное преимущество:** Ни у одного конкурента нет мобильного интерфейса. Это станет сильным дифференциатором для медиабайеров, которые работают on-the-go.

---

### Stories:

**[STORY-138] Мобильный дашборд KPI**
Как Media Buyer, я хочу видеть ключевые KPI (leads, FTD, CR, revenue, cap utilization) на мобильном устройстве в реальном времени, чтобы мониторить кампании без доступа к компьютеру.

Acceptance Criteria:
- [ ] AC1: Дашборд отображает 6 KPI-карточек: Leads Today, FTD Today, CR%, Revenue, Active Caps (% заполнения), Rejected Rate
- [ ] AC2: Данные обновляются автоматически каждые 30 сек через WebSocket
- [ ] AC3: Pull-to-refresh для ручного обновления с haptic feedback
- [ ] AC4: Поддержка тёмной и светлой темы с автоматическим переключением по системным настройкам
- [ ] AC5: Загрузка дашборда < 2 сек на 4G соединении (LCP < 2 сек)
- [ ] AC6: Работает offline: показывает последние кэшированные данные с меткой "Обновлено X мин назад"
- [ ] AC7: Адаптивный layout для экранов 320px-428px (iPhone SE → iPhone Pro Max)

Story Points: 8
Приоритет: Must
Epic: EPIC-15

#### Tasks для STORY-138:

[TASK-0781] Frontend: PWA shell и service worker
Тип: Frontend
Описание: Настроить PWA manifest.json (name, icons 192/512px, theme_color, background_color, display: standalone). Service worker с стратегией cache-first для static assets и network-first для API. Offline fallback page. App shell architecture для мгновенной загрузки.
Критерии готовности:
- [ ] PWA проходит Lighthouse PWA audit на 100%
- [ ] Offline mode показывает кэшированные данные
- [ ] Install prompt работает на Android Chrome и iOS Safari
Оценка: 8h
Story: STORY-138

[TASK-0782] Frontend: Мобильный дашборд KPI-карточки
Тип: Frontend
Описание: Компонент MobileDashboard с grid 2x3 KPI-карточек. Каждая карточка: значение, тренд (стрелка + %), мини-sparkline за последние 24 часа. Анимация обновления (fade). Pull-to-refresh с haptic API. Тёмная/светлая тема через CSS custom properties и prefers-color-scheme.
Критерии готовности:
- [ ] 6 KPI-карточек отрисовываются корректно на всех поддерживаемых размерах экрана
- [ ] WebSocket обновление работает в background
- [ ] Pull-to-refresh работает с тактильным откликом
Оценка: 8h
Story: STORY-138

[TASK-0783] Design: Mobile UI kit и дизайн-система
Тип: Design
Описание: Mobile-first дизайн-система: типографика (14-18px base), spacing scale, цветовая палитра для тёмной/светлой темы, компоненты (card, button, tab bar, bottom sheet). Мокапы KPI-дашборда для iPhone SE, iPhone 15, iPhone 15 Pro Max.
Критерии готовности:
- [ ] Дизайн-система утверждена
- [ ] Мокапы для 3 размеров экрана готовы
Оценка: 8h
Story: STORY-138

[TASK-0784] Backend: Оптимизация API для мобильных клиентов
Тип: Backend
Описание: Создать lightweight endpoint GET /api/v1/mobile/dashboard возвращающий только 6 KPI-метрик в компактном формате. Response < 2KB. ETag caching. Gzip compression. Поддержка If-None-Match для экономии трафика.
Критерии готовности:
- [ ] Response size < 2KB
- [ ] ETag caching работает (304 Not Modified)
- [ ] Время ответа < 200ms (P95)
Оценка: 4h
Story: STORY-138

[TASK-0785] QA: Тестирование мобильного дашборда
Тип: QA
Описание: Тестирование на: iPhone SE, iPhone 15, Samsung Galaxy S24, Pixel 8. Браузеры: Safari, Chrome. Сценарии: online/offline/slow 3G, тёмная/светлая тема, orientation (portrait/landscape), pull-to-refresh.
Критерии готовности:
- [ ] Протестировано на 4+ устройствах / 2 браузерах
- [ ] Offline mode работает корректно
Оценка: 8h
Story: STORY-138

---

**[STORY-139] Push-уведомления на мобильном**
Как Affiliate Manager, я хочу получать push-уведомления о критических событиях (cap заполнен, broker down, аномальный fraud rate), чтобы реагировать мгновенно.

Acceptance Criteria:
- [ ] AC1: Push через Web Push API (VAPID keys) — работает на Android Chrome и iOS Safari 16.4+
- [ ] AC2: Настраиваемые триггеры: cap > 80%, cap = 100%, broker response time > 5s, broker error rate > 10%, fraud rate > 15%, daily revenue milestone
- [ ] AC3: Каждое уведомление содержит: заголовок, краткое описание, deep link в соответствующий раздел приложения
- [ ] AC4: Настройка тишины (mute): по времени суток, по типу события, по конкретному аффилейту/брокеру
- [ ] AC5: История уведомлений (последние 100) с отметками read/unread
- [ ] AC6: Лимит: не более 50 push в час на пользователя для предотвращения спама

Story Points: 8
Приоритет: Must
Epic: EPIC-15
Зависит от: EPIC-11

#### Tasks для STORY-139:

[TASK-0786] Backend: Push notification сервис
Тип: Backend
Описание: Интеграция с Web Push Protocol (RFC 8030). Хранение подписок в таблице push_subscriptions (user_id, endpoint, p256dh, auth, device_info). Сервис проверки триггеров каждые 30 сек. Очередь отправки через Redis/RabbitMQ. Retry 3 раза при ошибке. Удаление expired подписок (410 Gone).
Критерии готовности:
- [ ] Push-уведомления доставляются на Android Chrome и iOS Safari
- [ ] Триггеры проверяются каждые 30 сек
- [ ] Rate limit 50/час/user работает
Оценка: 16h
Story: STORY-139

[TASK-0787] Frontend: UI настройки push-уведомлений
Тип: Frontend
Описание: Страница настроек push: toggles для каждого типа триггера, пороговые значения (slider), расписание тишины (time range picker), per-entity mute. Запрос разрешения на Push через Permission API с fallback-объяснением при отказе.
Критерии готовности:
- [ ] Настройки сохраняются и синхронизируются
- [ ] Permission flow работает корректно
- [ ] Deep links из уведомлений открывают правильные разделы
Оценка: 8h
Story: STORY-139

[TASK-0788] Frontend: In-app notification center
Тип: Frontend
Описание: Bottom sheet с историей уведомлений. Badge-counter на иконке bell. Swipe-to-dismiss. Mark all as read. Фильтр по типу уведомления.
Критерии готовности:
- [ ] Список отображает 100 последних уведомлений
- [ ] Swipe-to-dismiss работает с анимацией
- [ ] Badge обновляется в реальном времени
Оценка: 4h
Story: STORY-139

[TASK-0789] QA: Тестирование push-уведомлений
Тип: QA
Описание: Тестирование доставки push на Android/iOS. Проверка триггеров при граничных условиях. Проверка mute schedule. Deep link routing. Тестирование при отключённом разрешении.
Критерии готовности:
- [ ] Push доставляются на обеих платформах
- [ ] Все триггеры работают корректно
Оценка: 4h
Story: STORY-139

---

**[STORY-140] Быстрое управление капами с мобильного**
Как Media Buyer, я хочу быстро изменить кап брокера или поставить на паузу из мобильного приложения, чтобы оперативно реагировать на ситуацию без доступа к десктопу.

Acceptance Criteria:
- [ ] AC1: Список активных капов с текущим заполнением (progress bar), сортировка по % заполнения (desc)
- [ ] AC2: Quick actions для каждого капа: изменить лимит (numeric input), пауза/возобновление (toggle), сброс счётчика
- [ ] AC3: Подтверждение действия через bottom sheet с preview изменений
- [ ] AC4: Batch-операции: пауза всех капов аффилейта / брокера одним действием
- [ ] AC5: Изменения применяются < 2 сек с optimistic UI update
- [ ] AC6: Логирование всех действий с мобильного в audit log с пометкой "mobile"

Story Points: 5
Приоритет: Must
Epic: EPIC-15
Зависит от: EPIC-02

#### Tasks для STORY-140:

[TASK-0790] Frontend: Мобильный UI управления капами
Тип: Frontend
Описание: Список капов с progress bars и quick action buttons. Bottom sheet для редактирования с numeric keypad. Swipe-right для паузы (визуальный feedback — серый overlay). Optimistic update с rollback при ошибке API. Confirmation sheet для batch-операций.
Критерии готовности:
- [ ] Quick actions работают с optimistic UI
- [ ] Batch-операции выполняются корректно
- [ ] Swipe-gestures интуитивны и имеют визуальный feedback
Оценка: 8h
Story: STORY-140

[TASK-0791] Backend: Расширение API капов для мобильных операций
Тип: Backend
Описание: Endpoint PATCH /api/v1/caps/batch для массовых операций (pause/resume/reset). Добавить поле source: "mobile"|"desktop" в audit log. Optimistic locking через ETag для конфликтов.
Критерии готовности:
- [ ] Batch endpoint работает атомарно (все или ничего)
- [ ] Audit log содержит source
- [ ] ETag конфликты обрабатываются (409 Conflict)
Оценка: 4h
Story: STORY-140

[TASK-0792] QA: Тестирование мобильного управления капами
Тип: QA
Описание: Тестирование quick actions, batch-операций, подтверждений, optimistic UI rollback, конкурентного редактирования (desktop + mobile одновременно).
Критерии готовности:
- [ ] Конкурентное редактирование не приводит к data corruption
- [ ] Все quick actions работают корректно
Оценка: 4h
Story: STORY-140

---

**[STORY-141] Мобильные графики и мини-отчёты**
Как Team Lead, я хочу просматривать базовые графики (leads/FTD по часам, top affiliates, top GEO) на мобильном, чтобы отслеживать тренды в течение дня.

Acceptance Criteria:
- [ ] AC1: 3 предустановленных мини-отчёта: Leads по часам (bar chart), Top-10 affiliates по FTD (horizontal bar), Top-10 GEO по leads (horizontal bar)
- [ ] AC2: Графики оптимизированы для мобильного — touch-friendly tooltips, horizontal scroll для длинных осей
- [ ] AC3: Date range: Today, Yesterday, Last 7 days, Last 30 days (селектор вверху)
- [ ] AC4: Каждый график загружается < 1.5 сек на 4G

Story Points: 5
Приоритет: Should
Epic: EPIC-15

#### Tasks для STORY-141:

[TASK-0793] Frontend: Мобильные компоненты графиков
Тип: Frontend
Описание: Реализовать 3 типа мини-графиков с touch-оптимизацией. Использовать canvas-based библиотеку (Chart.js или lightweight альтернатива < 30KB gzipped). Lazy loading: графики загружаются при скролле в viewport.
Критерии готовности:
- [ ] 3 типа графиков отрисовываются корректно на мобильных
- [ ] Touch tooltips работают без конфликтов со scroll
- [ ] Bundle size графиков < 30KB gzipped
Оценка: 8h
Story: STORY-141

[TASK-0794] QA: Тестирование мобильных графиков
Тип: QA
Описание: Тестирование отрисовки на разных размерах экрана, touch interactions, performance при больших датасетах, orientation change.
Критерии готовности:
- [ ] Графики корректны на 4+ устройствах
Оценка: 4h
Story: STORY-141

---

**[STORY-142] Установка PWA и onboarding мобильного**
Как Media Buyer, я хочу установить мобильное приложение одним тапом с промо-баннера в веб-версии, чтобы быстро начать пользоваться мобильным дашбордом.

Acceptance Criteria:
- [ ] AC1: Smart banner в десктопной версии: "Установите мобильное приложение" с QR-кодом и кнопкой "Отправить ссылку на email"
- [ ] AC2: На мобильном: A2HS (Add to Home Screen) prompt с кастомной инструкцией для iOS (Safari не поддерживает native prompt)
- [ ] AC3: Onboarding: 3 экрана (swipe) при первом запуске: "KPI дашборд", "Push-алерты", "Управление капами"
- [ ] AC4: Биометрическая аутентификация (Face ID / Touch ID / fingerprint) для быстрого входа
- [ ] AC5: Dismiss баннера запоминается на 7 дней

Story Points: 3
Приоритет: Should
Epic: EPIC-15

#### Tasks для STORY-142:

[TASK-0795] Frontend: Smart banner и A2HS flow
Тип: Frontend
Описание: Desktop: компонент SmartBanner с QR-кодом (qrcode.js) и email-отправкой. Mobile: beforeinstallprompt event handler для Android, кастомный overlay с инструкцией для iOS. Cookie-based dismiss на 7 дней.
Критерии готовности:
- [ ] Banner отображается в desktop, скрывается на mobile
- [ ] A2HS работает на Android Chrome, инструкция для iOS Safari
Оценка: 4h
Story: STORY-142

[TASK-0796] Frontend: Biometric auth и mobile onboarding
Тип: Frontend
Описание: Web Authentication API (WebAuthn) для биометрической аутентификации. Onboarding carousel (3 экрана) с индикатором прогресса и кнопкой Skip. Сохранение состояния onboarding_completed в localStorage.
Критерии готовности:
- [ ] WebAuthn работает на iOS Safari и Android Chrome
- [ ] Onboarding показывается 1 раз
Оценка: 4h
Story: STORY-142

[TASK-0797] QA: Тестирование PWA установки
Тип: QA
Описание: Тестирование A2HS flow, биометрической аутентификации, onboarding, banner dismiss на реальных устройствах.
Критерии готовности:
- [ ] Установка протестирована на Android + iOS
Оценка: 4h
Story: STORY-142

---

## [EPIC-16] Integration Marketplace

**Цель:** Создать публичный маркетплейс брокерских интеграций с 200+ шаблонами, системой поиска по стране/вертикали/типу, community submissions, рейтингами и one-click установкой для минимизации времени подключения нового брокера.

**Метрика успеха:**
- 200+ broker templates доступны на launch
- Среднее время подключения нового брокера через маркетплейс < 5 мин (vs 30+ мин вручную)
- 20+ community-submitted интеграций за первые 6 месяцев

**Приоритет:** P2 (Growth)
**Зависит от:** EPIC-03 (Broker Integration Layer)
**Размер:** L (1-3 мес)

---

### Stories:

**[STORY-143] Каталог брокерских интеграций с поиском**
Как Affiliate Manager, я хочу найти шаблон интеграции для нужного брокера через поиск по названию, стране или вертикали, чтобы быстро подключить нового брокера.

Acceptance Criteria:
- [ ] AC1: Каталог содержит минимум 200 broker templates с карточками: лого, название, страны, вертикали (forex/crypto/binary), рейтинг, кол-во установок
- [ ] AC2: Полнотекстовый поиск по названию брокера с autocomplete (< 200ms)
- [ ] AC3: Фильтры: по стране (multi-select), по вертикали, по рейтингу (4+/3+), по статусу (verified/community/beta)
- [ ] AC4: Сортировка: по популярности, по рейтингу, по дате добавления, alphabetical
- [ ] AC5: Карточка брокера содержит: описание, поддерживаемые поля, API endpoints, скриншоты, changelog
- [ ] AC6: Бейджи: "Verified" (проверена командой), "Popular" (100+ установок), "New" (добавлена < 30 дней назад)

Story Points: 8
Приоритет: Must
Epic: EPIC-16

#### Tasks для STORY-143:

[TASK-0798] Backend: API каталога интеграций
Тип: Backend
Описание: Таблица integration_templates: id, name, slug, logo_url, description, countries (JSONB), verticals (array), api_config (JSONB), field_mapping (JSONB), author_type (official/community), status (verified/pending/beta), install_count, avg_rating, created_at. Endpoints: GET /api/v1/marketplace/integrations (список с фильтрами и поиском), GET /api/v1/marketplace/integrations/:slug (детали). Full-text search через PostgreSQL tsvector или Elasticsearch.
Критерии готовности:
- [ ] API возвращает список с фильтрами и поиском
- [ ] Полнотекстовый поиск работает < 200ms
- [ ] Пагинация cursor-based для производительности
Оценка: 8h
Story: STORY-143

[TASK-0799] Frontend: UI каталога маркетплейса
Тип: Frontend
Описание: Grid/List view каталога с карточками. Search bar с autocomplete (debounce 300ms). Sidebar фильтры с multi-select. Детальная страница интеграции: табы (Overview, Fields, API, Reviews, Changelog). Бейджи с tooltips.
Критерии готовности:
- [ ] Каталог отображает 200+ интеграций с виртуальным скроллом
- [ ] Фильтры и поиск работают без перезагрузки страницы
- [ ] Детальная страница содержит все табы
Оценка: 8h
Story: STORY-143

[TASK-0800] Backend: Сидинг 200+ broker templates
Тип: Backend
Описание: Миграция-seed с данными 200+ брокеров. Источники: существующие интеграции из EPIC-03, конкурентный анализ (HyperOne 400+, Elnopy 200+). Структура: имя, страны операций, API URL pattern, стандартные поля, autologin URL.
Критерии готовности:
- [ ] 200+ templates загружены с корректными данными
- [ ] Каждый template имеет минимум: name, country, vertical, API config
Оценка: 16h
Story: STORY-143

[TASK-0801] Design: Дизайн каталога маркетплейса
Тип: Design
Описание: Мокапы: grid view, list view, детальная страница, empty state для поиска. Дизайн карточки интеграции, бейджей, рейтинг-виджета.
Критерии готовности:
- [ ] Мокапы утверждены для desktop и tablet
Оценка: 4h
Story: STORY-143

[TASK-0802] QA: Тестирование каталога
Тип: QA
Описание: Тестирование поиска (кириллица, латиница, partial match), фильтров, сортировки, пагинации, загрузки при 200+ элементах.
Критерии готовности:
- [ ] Поиск работает для различных кодировок и языков
Оценка: 4h
Story: STORY-143

---

**[STORY-144] One-click установка интеграции**
Как Affiliate Manager, я хочу установить интеграцию с брокером одним кликом из маркетплейса, чтобы не заполнять конфигурацию вручную.

Acceptance Criteria:
- [ ] AC1: Кнопка "Install" на странице интеграции создаёт предзаполненную конфигурацию брокера
- [ ] AC2: Wizard доп. настройки: ввод API-ключей, выбор funnel name mapping, тестовый лид
- [ ] AC3: Автоматический тест соединения при установке с отображением результата (success/failure + детали ошибки)
- [ ] AC4: Установка < 3 шага (Install → Credentials → Test Connection)
- [ ] AC5: Возможность кастомизировать любое поле после установки
- [ ] AC6: Rollback: удаление установленной интеграции с очисткой всех связанных данных

Story Points: 5
Приоритет: Must
Epic: EPIC-16
Зависит от: STORY-143

#### Tasks для STORY-144:

[TASK-0803] Backend: Endpoint установки интеграции
Тип: Backend
Описание: POST /api/v1/marketplace/integrations/:slug/install — создаёт broker config из template с merge пользовательских credentials. POST /api/v1/brokers/:id/test-connection — выполняет test lead send и возвращает результат. DELETE /api/v1/brokers/:id/uninstall — rollback установки.
Критерии готовности:
- [ ] Install создаёт полностью функциональную broker config
- [ ] Test connection возвращает детализированный результат
- [ ] Rollback удаляет все связанные данные
Оценка: 8h
Story: STORY-144

[TASK-0804] Frontend: Wizard установки интеграции
Тип: Frontend
Описание: 3-step wizard: шаг 1 — pre-filled config review, шаг 2 — ввод credentials (masked password inputs), шаг 3 — test connection с animated progress. Success/failure screen с next steps.
Критерии готовности:
- [ ] Wizard проходится за < 2 мин
- [ ] Credentials маскируются при вводе
- [ ] Test connection показывает детали ошибки при failure
Оценка: 8h
Story: STORY-144

[TASK-0805] QA: Тестирование one-click установки
Тип: QA
Описание: Тестирование: установка 5 различных интеграций, тестирование с невалидными credentials, test connection timeout, rollback, повторная установка после удаления.
Критерии готовности:
- [ ] 5+ интеграций установлены через wizard без ошибок
Оценка: 4h
Story: STORY-144

---

**[STORY-145] Community submissions — загрузка интеграций**
Как Developer, я хочу загрузить свою интеграцию с брокером в маркетплейс, чтобы другие пользователи могли ей пользоваться.

Acceptance Criteria:
- [ ] AC1: Форма submission: название, описание, лого, страны, вертикали, API config (JSON), field mapping, readme
- [ ] AC2: Валидация JSON schema API config перед отправкой
- [ ] AC3: Статус submission: Draft → Submitted → Under Review → Approved/Rejected
- [ ] AC4: Автор получает уведомление при изменении статуса
- [ ] AC5: Approved submissions получают бейдж "Community" и появляются в каталоге
- [ ] AC6: Автор может обновлять свою интеграцию (новая версия проходит review)

Story Points: 8
Приоритет: Should
Epic: EPIC-16

#### Tasks для STORY-145:

[TASK-0806] Backend: API для community submissions
Тип: Backend
Описание: CRUD endpoints для submissions. Таблица integration_submissions: id, author_id, template_data (JSONB), status, reviewer_id, review_notes, version, created_at. JSON schema validation при submit. Webhook notification при status change. При approve — копирование в integration_templates.
Критерии готовности:
- [ ] CRUD endpoints реализованы
- [ ] JSON schema validation работает
- [ ] Approve workflow копирует данные в production каталог
Оценка: 8h
Story: STORY-145

[TASK-0807] Frontend: Форма submission и dashboard автора
Тип: Frontend
Описание: Multi-step форма: базовая инфо → API config (JSON editor с syntax highlighting) → field mapping builder → preview. Dashboard "My Submissions" со списком и статусами. Inline JSON validation с подсветкой ошибок.
Критерии готовности:
- [ ] JSON editor с syntax highlighting работает
- [ ] Field mapping builder интуитивен
- [ ] Dashboard показывает все submissions с фильтром по статусу
Оценка: 8h
Story: STORY-145

[TASK-0808] Backend: Admin review panel
Тип: Backend
Описание: Endpoints для модерации: GET /api/v1/admin/submissions (список pending), PATCH /api/v1/admin/submissions/:id/review (approve/reject с notes). Только для роли admin/reviewer.
Критерии готовности:
- [ ] Review panel доступен только admin
- [ ] Approve/reject отправляет уведомление автору
Оценка: 4h
Story: STORY-145

[TASK-0809] QA: Тестирование community submissions
Тип: QA
Описание: E2E: создание submission → review → approve → появление в каталоге → установка другим пользователем. Тестирование reject flow, обновления версии.
Критерии готовности:
- [ ] E2E flow работает без ошибок
Оценка: 4h
Story: STORY-145

---

**[STORY-146] Рейтинги и отзывы интеграций**
Как Affiliate Manager, я хочу видеть рейтинги и отзывы других пользователей на интеграции, чтобы выбирать проверенные и надёжные шаблоны.

Acceptance Criteria:
- [ ] AC1: Рейтинг от 1 до 5 звёзд с шагом 0.5
- [ ] AC2: Текстовый отзыв (10-500 символов) с обязательным рейтингом
- [ ] AC3: Один отзыв на пользователя на интеграцию (можно редактировать)
- [ ] AC4: Средний рейтинг и кол-во отзывов отображаются на карточке в каталоге
- [ ] AC5: Сортировка отзывов: по дате, по рейтингу, по полезности (upvote)
- [ ] AC6: Модерация: admin может скрыть отзыв (спам, оскорбления)

Story Points: 3
Приоритет: Could
Epic: EPIC-16

#### Tasks для STORY-146:

[TASK-0810] Backend: API рейтингов и отзывов
Тип: Backend
Описание: Таблица integration_reviews: id, integration_id, user_id, rating, text, upvotes, is_hidden, created_at, updated_at. UNIQUE constraint на (integration_id, user_id). Endpoints: POST/PUT/DELETE /api/v1/marketplace/integrations/:slug/reviews. Trigger для пересчёта avg_rating при insert/update/delete.
Критерии готовности:
- [ ] CRUD для отзывов работает
- [ ] Средний рейтинг пересчитывается автоматически
- [ ] Один отзыв на пользователя на интеграцию
Оценка: 4h
Story: STORY-146

[TASK-0811] Frontend: UI отзывов на странице интеграции
Тип: Frontend
Описание: Секция Reviews на детальной странице: список отзывов с avatar, рейтинг звёздами, текст, дата, upvote button. Форма написания отзыва. Star rating input. Сортировка dropdown.
Критерии готовности:
- [ ] Отзывы отображаются с пагинацией
- [ ] Star rating input интуитивен
Оценка: 4h
Story: STORY-146

[TASK-0812] QA: Тестирование отзывов
Тип: QA
Описание: Тестирование: создание, редактирование, удаление отзыва, upvote, модерация, duplicate prevention.
Критерии готовности:
- [ ] Все CRUD операции протестированы
Оценка: 2h
Story: STORY-146

---

**[STORY-147] Версионирование и changelog интеграций**
Как Developer, я хочу видеть changelog каждой интеграции и получать уведомления об обновлениях установленных интеграций, чтобы оставаться в курсе изменений.

Acceptance Criteria:
- [ ] AC1: Каждое обновление интеграции создаёт новую версию (semver: major.minor.patch)
- [ ] AC2: Changelog отображается на странице интеграции (список версий с описанием изменений)
- [ ] AC3: При наличии обновления для установленной интеграции — notification badge
- [ ] AC4: Обновление с preview изменений (diff view: что изменилось в config)
- [ ] AC5: Rollback к предыдущей версии одним кликом

Story Points: 5
Приоритет: Should
Epic: EPIC-16

#### Tasks для STORY-147:

[TASK-0813] Backend: Система версионирования интеграций
Тип: Backend
Описание: Таблица integration_versions: id, integration_id, version (semver), changelog_text, config_diff (JSONB), created_at. При обновлении template — создание новой версии с diff. Endpoint GET /api/v1/marketplace/integrations/:slug/versions. Notification trigger для пользователей с установленной интеграцией.
Критерии готовности:
- [ ] Версионирование с semver работает
- [ ] Diff между версиями рассчитывается корректно
- [ ] Уведомления отправляются при новой версии
Оценка: 8h
Story: STORY-147

[TASK-0814] Frontend: Changelog и update flow
Тип: Frontend
Описание: Tab "Changelog" на странице интеграции с timeline версий. Notification badge на установленных интеграциях с доступным обновлением. Update modal с diff view (added/removed/changed fields). Кнопка Rollback с подтверждением.
Критерии готовности:
- [ ] Changelog отображается корректно
- [ ] Update и rollback работают
Оценка: 4h
Story: STORY-147

[TASK-0815] QA: Тестирование версионирования
Тип: QA
Описание: Тестирование: создание версии, update, rollback, diff view, notification при обновлении.
Критерии готовности:
- [ ] Полный цикл версионирования протестирован
Оценка: 2h
Story: STORY-147

---

## [EPIC-17] Smart Routing (AI/ML v1)

**Цель:** Реализовать авто-оптимизацию роутинга на основе машинного обучения: рекомендации по весам на основе conversion rate, предсказание исчерпания капов, автоматическое переключение на backup-брокеров при деградации.

**Метрика успеха:**
- Рост среднего CR на 10-15% у клиентов, использующих AI routing (vs ручной routing)
- Предсказание cap exhaustion с точностью > 85% за 2+ часа до исчерпания
- Снижение потерь лидов из-за unavailable брокеров на 30%

**Приоритет:** P2 (Growth)
**Зависит от:** EPIC-02 (Lead Routing Engine), EPIC-10 (Analytics Dashboard v1)
**Размер:** XL (3+ мес)

**Конкурентный контекст:** Ни один конкурент не имеет AI/ML routing. Leadgreed отмечен как "нет AI/ML инноваций". Это потенциальный game-changer.

---

### Stories:

**[STORY-148] Рекомендации по весам на основе CR**
Как Network Admin, я хочу получать AI-рекомендации по оптимальным весам роутинга для каждого брокера на основе исторического conversion rate, чтобы максимизировать прибыль без ручного подбора.

Acceptance Criteria:
- [ ] AC1: Система анализирует CR каждого брокера за настраиваемый период (7/14/30 дней) в разрезе GEO
- [ ] AC2: Рекомендация весов формируется с учётом: CR, avg deposit amount, response time, reject rate
- [ ] AC3: Рекомендация отображается как "предложенный вес vs текущий" с delta и ожидаемым improvement в %
- [ ] AC4: Preview mode: симуляция "что было бы" при применении рекомендованных весов на исторических данных за прошлую неделю
- [ ] AC5: Применение рекомендации одним кликом с подтверждением и возможностью отката в течение 24 часов
- [ ] AC6: Рекомендации обновляются каждые 6 часов
- [ ] AC7: Минимальная выборка для рекомендации: 100 лидов на брокера

Story Points: 13
Приоритет: Must
Epic: EPIC-17

#### Tasks для STORY-148:

[TASK-0816] Backend: ML-модель рекомендации весов
Тип: Backend
Описание: Scoring-модель на основе weighted composite: CR (вес 0.4), avg deposit (0.2), response time (0.15), reject rate (0.15), shave rate (0.1). Нормализация метрик (min-max per GEO). Output: recommended_weight per broker per GEO. Cron job каждые 6 часов. Минимальный порог: 100 leads per broker per GEO за анализируемый период.
Критерии готовности:
- [ ] Модель рассчитывает веса для всех активных broker-GEO пар
- [ ] Результаты сохраняются в таблицу routing_recommendations
- [ ] Job выполняется < 5 мин для 100 брокеров
Оценка: 16h
Story: STORY-148

[TASK-0817] Backend: API рекомендаций и preview-симуляции
Тип: Backend
Описание: GET /api/v1/routing/recommendations/:flow_id — текущие рекомендации. POST /api/v1/routing/recommendations/:flow_id/simulate — симуляция на исторических данных (replay последних 7 дней с новыми весами, подсчёт simulated CR/revenue). POST /api/v1/routing/recommendations/:flow_id/apply — применение. POST /api/v1/routing/recommendations/:flow_id/rollback — откат (хранение предыдущих весов 24 часа).
Критерии готовности:
- [ ] Симуляция корректно replay-ит исторические данные
- [ ] Apply/rollback работает атомарно
- [ ] Симуляция выполняется < 10 сек для 10K лидов
Оценка: 16h
Story: STORY-148

[TASK-0818] Frontend: UI рекомендаций по весам
Тип: Frontend
Описание: Панель "AI Recommendations" на странице routing flow. Таблица: broker, current weight, recommended weight, delta, expected CR improvement. Кнопка "Simulate" → side panel с графиком "actual vs simulated". Кнопка "Apply All" / "Apply Selected" с confirmation modal. Banner "Rollback available for 23h 45m".
Критерии готовности:
- [ ] Рекомендации отображаются с визуальным diff
- [ ] Simulation results показывают ожидаемый impact
- [ ] Apply/rollback работает с undo UX
Оценка: 8h
Story: STORY-148

[TASK-0819] QA: Тестирование AI рекомендаций
Тип: QA
Описание: Верификация корректности рекомендаций на тестовых данных (ручной расчёт). Тестирование: недостаточная выборка, все брокеры с 0 CR, симуляция, apply, rollback, rollback expired.
Критерии готовности:
- [ ] Расчёты верифицированы на 3 сценариях
- [ ] Edge cases обработаны
Оценка: 4h
Story: STORY-148

---

**[STORY-149] Предсказание исчерпания капов**
Как Affiliate Manager, я хочу видеть прогноз исчерпания капа для каждого брокера, чтобы заранее подготовить backup-роуты и не терять лиды.

Acceptance Criteria:
- [ ] AC1: Прогноз на основе скользящего среднего intake rate за последние 3 часа и текущего заполнения капа
- [ ] AC2: Отображение: time-to-exhaustion (часы:минуты) и predicted exhaustion time (HH:MM) для каждого активного капа
- [ ] AC3: Цветовая индикация: зелёный (> 4ч), жёлтый (1-4ч), красный (< 1ч), серый (не применимо — кап не лимитирован)
- [ ] AC4: Алерт при predicted exhaustion < 2 часов (Telegram + push + in-app)
- [ ] AC5: Точность прогноза > 85% (проверяется по историческим данным за 30 дней)
- [ ] AC6: Обновление прогноза каждые 5 мин

Story Points: 8
Приоритет: Must
Epic: EPIC-17
Зависит от: EPIC-02

#### Tasks для STORY-149:

[TASK-0820] Backend: Сервис предсказания cap exhaustion
Тип: Backend
Описание: Worker каждые 5 мин: для каждого активного cap — расчёт intake_rate (leads per hour, скользящее среднее 3ч), remaining_capacity, time_to_exhaustion = remaining / rate. Хранение predictions в Redis (TTL 10 мин). Trigger алертов при time_to_exhaustion < threshold (настраивается per cap, default 2h). Endpoint GET /api/v1/caps/predictions.
Критерии готовности:
- [ ] Predictions рассчитываются для всех активных капов
- [ ] Алерты триггерятся корректно
- [ ] Accuracy > 85% на тестовых данных
Оценка: 8h
Story: STORY-149

[TASK-0821] Frontend: Виджет прогноза капов
Тип: Frontend
Описание: Колонка "Predicted Exhaustion" в таблице капов. Цветовые индикаторы (зелёный/жёлтый/красный). Tooltip с деталями: current fill, intake rate, time to exhaustion. Mini sparkline intake rate за последние 6 часов.
Критерии готовности:
- [ ] Виджет обновляется каждые 5 мин
- [ ] Цветовая индикация корректна
Оценка: 4h
Story: STORY-149

[TASK-0822] QA: Тестирование предсказания капов
Тип: QA
Описание: Тестирование с различными intake patterns: стабильный поток, бурсты, затухание, нулевой поток. Проверка accuracy на исторических данных.
Критерии готовности:
- [ ] Прогноз корректен для 4 типов intake patterns
Оценка: 4h
Story: STORY-149

---

**[STORY-150] Автоматическое переключение на backup при деградации**
Как Network Admin, я хочу настроить автоматическое переключение трафика на backup-брокера при деградации основного (высокий error rate, медленный response), чтобы не терять лиды.

Acceptance Criteria:
- [ ] AC1: Настраиваемые критерии деградации per broker: error rate > X% (default 15%), response time > Y сек (default 10s), consecutive failures > Z (default 5)
- [ ] AC2: При срабатывании — автоматическое перенаправление трафика на backup broker из предварительно настроенного списка
- [ ] AC3: Canary recovery: через 15 мин отправить 5% трафика обратно на основной, при нормальном response — постепенное восстановление (5% → 25% → 50% → 100%) каждые 15 мин
- [ ] AC4: Dashboard с текущим состоянием failover: какие брокеры в degraded state, timeline событий
- [ ] AC5: Алерт при каждом failover event (Telegram + push)
- [ ] AC6: Ручной override: принудительно переключить или вернуть трафик

Story Points: 13
Приоритет: Must
Epic: EPIC-17
Зависит от: EPIC-02

#### Tasks для STORY-150:

[TASK-0823] Backend: Health monitoring и failover engine
Тип: Backend
Описание: Health checker каждые 30 сек: sliding window (последние 50 запросов) per broker — error_rate, avg_response_time, consecutive_failures. Таблица broker_health_config: broker_id, error_rate_threshold, response_time_threshold, consecutive_failures_threshold, backup_broker_ids (ordered array). FSM: Healthy → Degraded → Failed → Recovering → Healthy. При transition Degraded/Failed → переключение весов на backup. Canary recovery scheduler.
Критерии готовности:
- [ ] Health monitoring работает с sliding window
- [ ] FSM transitions корректны
- [ ] Canary recovery выполняется по расписанию
Оценка: 16h
Story: STORY-150

[TASK-0824] Frontend: Failover dashboard и настройка
Тип: Frontend
Описание: Страница "Broker Health": таблица брокеров со статусом (badge Healthy/Degraded/Failed/Recovering). Timeline событий failover (последние 7 дней). Форма настройки thresholds per broker. Кнопки manual failover / force recovery. Настройка backup brokers (drag-and-drop ordered list).
Критерии готовности:
- [ ] Dashboard отображает real-time статус
- [ ] Manual failover/recovery работает
- [ ] Настройка backup list интуитивна
Оценка: 8h
Story: STORY-150

[TASK-0825] QA: Тестирование failover
Тип: QA
Описание: Симуляция деградации брокера (mock slow responses, errors). Проверка автоматического переключения. Проверка canary recovery. Проверка manual override. Тестирование каскадного failover (backup тоже деградировал).
Критерии готовности:
- [ ] Все сценарии failover протестированы включая каскадный
Оценка: 8h
Story: STORY-150

---

**[STORY-151] Авто-балансировка нагрузки по conversion rate**
Как Network Admin, я хочу включить авто-балансировку, при которой система автоматически перераспределяет трафик между брокерами для максимизации общего CR, чтобы не тратить время на ручную настройку весов.

Acceptance Criteria:
- [ ] AC1: Режим "Auto-balance" включается per routing flow toggle
- [ ] AC2: Алгоритм multi-armed bandit (Thompson Sampling) для exploration vs exploitation
- [ ] AC3: Exploration rate: начальные 20%, снижение до 5% после 1000 лидов
- [ ] AC4: Ограничения: минимальный вес брокера (не < 5%), максимальный вес (не > 60%), respect cap limits
- [ ] AC5: Real-time дашборд: текущие веса, CR per broker, exploration %, общий CR trend
- [ ] AC6: Manual override: возможность зафиксировать вес конкретного брокера (исключить из auto-balance)
- [ ] AC7: Уведомление при значительном перераспределении (delta > 15% за 1 час)

Story Points: 13
Приоритет: Should
Epic: EPIC-17

#### Tasks для STORY-151:

[TASK-0826] Backend: Thompson Sampling engine
Тип: Backend
Описание: Реализация Thompson Sampling для каждого routing flow в режиме auto-balance. Beta distribution per broker: alpha = FTD count + 1, beta = non-FTD count + 1. Sampling при каждом routing decision. Constraints: min_weight, max_weight, cap_remaining. Worker для обновления параметров каждые 15 мин. Storage: Redis (real-time params) + PostgreSQL (history).
Критерии готовности:
- [ ] Thompson Sampling корректно работает для 10+ брокеров
- [ ] Constraints соблюдаются
- [ ] Exploration rate снижается по мере накопления данных
Оценка: 16h
Story: STORY-151

[TASK-0827] Frontend: UI авто-балансировки
Тип: Frontend
Описание: Toggle "Auto-balance" на странице routing flow. Dashboard: real-time bar chart весов (animated transitions), line chart CR per broker, gauge exploration rate. Lock icon для фиксации веса конкретного брокера. History: timeline изменений весов за последние 7 дней.
Критерии готовности:
- [ ] Toggle включает/выключает авто-балансировку
- [ ] Real-time визуализация обновляется каждые 15 сек
Оценка: 8h
Story: STORY-151

[TASK-0828] QA: Тестирование авто-балансировки
Тип: QA
Описание: Симуляция с mock-данными: один брокер с высоким CR, один с низким. Проверка что трафик перераспределяется. Тестирование constraints, lock, уведомлений.
Критерии готовности:
- [ ] Перераспределение корректно в 3+ сценариях
Оценка: 4h
Story: STORY-151

---

**[STORY-152] Аналитика эффективности AI routing**
Как Network Admin, я хочу видеть отчёт о том, насколько AI routing улучшил результаты по сравнению с ручной настройкой, чтобы обосновать использование автоматизации.

Acceptance Criteria:
- [ ] AC1: Отчёт "AI Performance": CR до включения AI vs после, revenue delta, leads saved (не потеряны из-за failover)
- [ ] AC2: A/B comparison: flows с AI routing vs flows с manual routing в одном периоде
- [ ] AC3: Период анализа: настраиваемый (7/14/30/90 дней)
- [ ] AC4: Визуализация: line chart с двумя сериями (AI vs manual), summary KPI cards

Story Points: 5
Приоритет: Should
Epic: EPIC-17

#### Tasks для STORY-152:

[TASK-0829] Backend: API аналитики AI routing
Тип: Backend
Описание: Endpoint GET /api/v1/analytics/ai-routing с параметрами: flow_ids, date_range. Расчёт: CR before/after AI, revenue delta, leads_saved (redirected via failover). Сравнение AI-enabled flows vs manual flows за тот же период.
Критерии готовности:
- [ ] Расчёты корректны
- [ ] Время ответа < 3 сек
Оценка: 8h
Story: STORY-152

[TASK-0830] Frontend: Страница AI Performance
Тип: Frontend
Описание: 4 KPI-карточки: CR improvement %, Revenue Delta, Leads Saved, Failover Events. Line chart: AI vs Manual CR over time. Селектор периода и flows.
Критерии готовности:
- [ ] Дашборд отображает все метрики
- [ ] Графики интерактивны (hover tooltips)
Оценка: 4h
Story: STORY-152

[TASK-0831] QA: Тестирование аналитики AI
Тип: QA
Описание: Верификация расчётов на тестовых данных. Проверка edge cases: нет данных до AI, все flows на AI, смешанный режим.
Критерии готовности:
- [ ] Расчёты верифицированы
Оценка: 2h
Story: STORY-152

---

## [EPIC-18] Status Groups & Shave Detection

**Цель:** Нормализовать разнородные статусы от брокеров в единую классификацию, реализовать детекцию shaving (откат статусов), алерты при аномалиях и кросс-брокерную аналитику по нормализованным статусам.

**Метрика успеха:**
- 100% входящих статусов маппятся в unified status groups (zero unclassified)
- Shave detection выявляет 90%+ случаев shaving в течение 24 часов
- Снижение financial loss от shaving на 25% в первые 3 месяца использования

**Приоритет:** P2 (Growth)
**Зависит от:** EPIC-03 (Broker Integration Layer), EPIC-12 (Conversions & Basic P&L)
**Размер:** L (1-3 мес)

**Референс:** Elnopy имеет best-in-class Status Pipe Pending. Leadgreed имеет fake FTD management. Все конкуренты кроме trackbox.ai имеют shave detection в том или ином виде.

---

### Stories:

**[STORY-153] Единая классификация статусов (Status Groups)**
Как Network Admin, я хочу настроить маппинг статусов каждого брокера в единую классификацию (New → Contacted → Qualified → Deposited → Rejected → и др.), чтобы анализировать данные по всем брокерам в единообразном формате.

Acceptance Criteria:
- [ ] AC1: Предустановленные status groups (минимум 10): New, Callback, No Answer, Not Interested, Wrong Info, Contacted, Qualified, Deposited (FTD), Re-deposited, Rejected, Duplicate, Test
- [ ] AC2: Маппинг per broker: "broker_status_name" → status_group с drag-and-drop интерфейсом
- [ ] AC3: Auto-mapping suggestion при получении нового неизвестного статуса (fuzzy match по названию)
- [ ] AC4: Unclassified статусы попадают в "Inbox" для ручного маппинга с алертом
- [ ] AC5: Custom status groups: возможность создать до 5 дополнительных групп
- [ ] AC6: Bulk mapping: загрузка CSV с маппингом (broker_status → group)
- [ ] AC7: Маппинг применяется ретроактивно к историческим данным

Story Points: 8
Приоритет: Must
Epic: EPIC-18

#### Tasks для STORY-153:

[TASK-0832] Backend: Система status groups и маппинга
Тип: Backend
Описание: Таблицы: status_groups (id, company_id, name, slug, color, is_system, sort_order), status_mappings (id, company_id, broker_id, broker_status, status_group_id). Default seed 10 system groups. Endpoints: CRUD для groups и mappings. При получении неизвестного статуса — запись в status_mapping_inbox. Fuzzy match через Levenshtein distance для auto-suggestion. Batch update для ретроактивного применения.
Критерии готовности:
- [ ] 10 предустановленных groups создаются при регистрации компании
- [ ] Маппинг работает per broker
- [ ] Auto-suggest для новых статусов работает с > 70% accuracy
Оценка: 16h
Story: STORY-153

[TASK-0833] Frontend: UI маппинга статусов
Тип: Frontend
Описание: Страница "Status Groups": визуальная сетка status groups с карточками. Для каждого брокера: список его статусов с drag-and-drop в target group. Inbox: список неклассифицированных статусов с кнопкой auto-suggest и manual assign. Bulk import CSV modal. Indicator: "X unclassified statuses" в навигации.
Критерии готовности:
- [ ] Drag-and-drop маппинг работает
- [ ] Inbox отображает unmapped статусы
- [ ] Bulk CSV import работает
Оценка: 8h
Story: STORY-153

[TASK-0834] QA: Тестирование status groups
Тип: QA
Описание: Тестирование: маппинг, auto-suggest, bulk import, кастомные группы (лимит 5), ретроактивное обновление, drag-and-drop.
Критерии готовности:
- [ ] Все сценарии маппинга протестированы
Оценка: 4h
Story: STORY-153

---

**[STORY-154] Детекция shaving — мониторинг откатов статусов**
Как Affiliate Manager, я хочу автоматически обнаруживать случаи shaving (когда брокер откатывает статус FTD назад), чтобы защитить revenue партнёрской сети.

Acceptance Criteria:
- [ ] AC1: Мониторинг status transitions в реальном времени: обнаружение перехода из Deposited → любой non-deposit статус
- [ ] AC2: Алерт при обнаружении shave: Telegram + email + in-app с деталями (lead_id, broker, old_status, new_status, timestamp)
- [ ] AC3: Shave rate metric per broker: (shaved_FTD / total_FTD) * 100% за настраиваемый период
- [ ] AC4: Threshold alert: shave rate > X% (настраивается, default 5%) за последние 7 дней
- [ ] AC5: Status history timeline для каждого лида: визуальное отображение всех transitions с timestamps
- [ ] AC6: Статус "Disputed" для shaved leads: ручная пометка лидов для расследования

Story Points: 8
Приоритет: Must
Epic: EPIC-18
Зависит от: STORY-153

#### Tasks для STORY-154:

[TASK-0835] Backend: Shave detection engine
Тип: Backend
Описание: Event listener на status updates: при transition из deposit_group → non-deposit_group — создание записи в таблице shave_events (id, lead_id, broker_id, old_status, new_status, detected_at). Cron job каждый час: расчёт shave_rate per broker за 7/14/30 дней. Trigger alert при превышении threshold. Статус lead_status "disputed" для ручной пометки.
Критерии готовности:
- [ ] Shave events детектируются в реальном времени
- [ ] Shave rate рассчитывается корректно
- [ ] Алерты триггерятся при превышении threshold
Оценка: 8h
Story: STORY-154

[TASK-0836] Frontend: UI shave detection
Тип: Frontend
Описание: Страница "Shave Detection": таблица брокеров с shave_rate (color-coded), trend sparkline, last shave event. Drill-down: список shaved leads per broker. Lead timeline: vertical timeline всех status transitions. Кнопка "Mark as Disputed". Filter: date range, broker, affiliate.
Критерии готовности:
- [ ] Shave rate отображается per broker
- [ ] Lead timeline визуально понятен
- [ ] Disputed пометка работает
Оценка: 8h
Story: STORY-154

[TASK-0837] QA: Тестирование shave detection
Тип: QA
Описание: Симуляция shave scenarios: single shave, bulk shave, false positive (legitimate status change), threshold alerting, disputed flow.
Критерии готовности:
- [ ] Все сценарии протестированы включая false positives
Оценка: 4h
Story: STORY-154

---

**[STORY-155] Аномалии статусов — Pattern Detection**
Как Network Admin, я хочу автоматически обнаруживать аномальные паттерны в статусах брокеров (внезапное увеличение rejects, необычное распределение), чтобы проактивно выявлять проблемы.

Acceptance Criteria:
- [ ] AC1: Мониторинг deviation от baseline: если reject rate за последние 2 часа > 2 стандартных отклонения от средней за 30 дней — алерт
- [ ] AC2: Детекция паттернов: "все лиды от аффилейта X получают reject от брокера Y" (100% reject rate за > 10 лидов)
- [ ] AC3: Детекция задержки обработки: если среднее время status update > 2x от нормы — алерт
- [ ] AC4: Dashboard аномалий: карточки с описанием аномалии, severity (low/medium/high/critical), affected entities, recommended action
- [ ] AC5: Dismiss аномалии с комментарием ("ожидаемое поведение") — исключение из повторных алертов

Story Points: 8
Приоритет: Should
Epic: EPIC-18

#### Tasks для STORY-155:

[TASK-0838] Backend: Anomaly detection engine
Тип: Backend
Описание: Cron job каждые 30 мин: расчёт baseline metrics per broker (avg reject_rate, avg response_time, status distribution) за 30 дней. Сравнение последних 2 часов с baseline. Z-score > 2 → создание anomaly event. Pattern matching: per affiliate-broker pair reject rate = 100% при N > 10. Таблица anomaly_events: id, type, severity, broker_id, affiliate_id, description, metrics (JSONB), is_dismissed, dismiss_comment.
Критерии готовности:
- [ ] Аномалии детектируются автоматически
- [ ] Severity рассчитывается на основе deviation magnitude
- [ ] Dismiss с комментарием исключает из повторных алертов
Оценка: 16h
Story: STORY-155

[TASK-0839] Frontend: Dashboard аномалий
Тип: Frontend
Описание: Страница "Anomalies": карточки аномалий с severity badge, описанием, affected entities, timestamp. Кнопки: "View Details" (drill-down), "Dismiss" (modal с комментарием). Фильтр по severity, broker, date. Notification badge в навигации.
Критерии готовности:
- [ ] Карточки аномалий отображаются с severity
- [ ] Dismiss flow работает
- [ ] Фильтрация работает
Оценка: 4h
Story: STORY-155

[TASK-0840] QA: Тестирование anomaly detection
Тип: QA
Описание: Симуляция аномальных паттернов на тестовых данных. Проверка false positive rate (должен быть < 10%). Тестирование dismiss, повторного появления, severity calculation.
Критерии готовности:
- [ ] False positive rate < 10% на тестовых данных
Оценка: 4h
Story: STORY-155

---

**[STORY-156] Кросс-брокерная аналитика по нормализованным статусам**
Как Finance Manager, я хочу видеть аналитику по нормализованным статусам в разрезе всех брокеров, чтобы сравнивать эффективность брокеров на единой шкале.

Acceptance Criteria:
- [ ] AC1: Отчёт "Status Funnel": воронка New → Contacted → Qualified → Deposited по всем брокерам в одном представлении
- [ ] AC2: Comparison table: broker vs broker по % переходов между статусами (conversion rate per stage)
- [ ] AC3: Time-to-status: среднее время перехода между status groups per broker
- [ ] AC4: Stacked bar chart: распределение статусов per broker (100% stacked)
- [ ] AC5: Фильтрация по GEO, affiliate, date range

Story Points: 5
Приоритет: Should
Epic: EPIC-18
Зависит от: STORY-153

#### Tasks для STORY-156:

[TASK-0841] Backend: API кросс-брокерной аналитики
Тип: Backend
Описание: Endpoint GET /api/v1/analytics/status-funnel с group_by broker. Расчёт: conversion rate between stages, avg time-to-status, status distribution per broker. Все метрики по normalized status groups.
Критерии готовности:
- [ ] Funnel метрики рассчитываются для всех брокеров
- [ ] Time-to-status корректен
Оценка: 8h
Story: STORY-156

[TASK-0842] Frontend: Status Funnel дашборд
Тип: Frontend
Описание: Визуальная воронка (funnel chart) с числами и % на каждом этапе. Comparison table с heatmap-подсветкой (best/worst). Time-to-status bar chart. Stacked bar chart distribution. Все с фильтрами.
Критерии готовности:
- [ ] Funnel chart визуально понятен
- [ ] Comparison table подсвечивает лучший/худший результат
Оценка: 8h
Story: STORY-156

[TASK-0843] QA: Тестирование кросс-брокерной аналитики
Тип: QA
Описание: Верификация расчётов на тестовых данных. Проверка при: одном брокере, 10+ брокерах, missing status groups.
Критерии готовности:
- [ ] Расчёты верифицированы
Оценка: 2h
Story: STORY-156

---

**[STORY-157] Status Pipe Pending — защита от отложенного shaving**
Как Affiliate Manager, я хочу отслеживать лиды, которые долго остаются в статусе "Pending" у брокера, чтобы выявлять случаи когда брокер намеренно задерживает подтверждение FTD.

Acceptance Criteria:
- [ ] AC1: Мониторинг лидов в статусе "New"/"Contacted" > X часов (настраивается per broker, default 48h) после отправки
- [ ] AC2: Автоматическая пометка "Stale" для лидов, превысивших threshold
- [ ] AC3: Dashboard "Pending Pipe": список stale leads с группировкой по broker, age (сколько часов в pending)
- [ ] AC4: Comparison: % stale leads per broker vs среднее по всем брокерам
- [ ] AC5: Алерт при stale count > Y (настраивается, default 10 за 24 часа) для конкретного брокера

Story Points: 5
Приоритет: Must
Epic: EPIC-18
Зависит от: STORY-153

#### Tasks для STORY-157:

[TASK-0844] Backend: Status Pipe Pending monitor
Тип: Backend
Описание: Cron job каждый час: выборка лидов с last_status_update > threshold per broker. Пометка lead_flags: "stale". Агрегация stale_count per broker. Alert при превышении threshold. Endpoint GET /api/v1/leads/stale.
Критерии готовности:
- [ ] Stale leads детектируются корректно
- [ ] Пометка и алерты работают
Оценка: 8h
Story: STORY-157

[TASK-0845] Frontend: Dashboard Pending Pipe
Тип: Frontend
Описание: Таблица stale leads с сортировкой по age (desc). Группировка по broker. Bar chart: stale count per broker vs average. Quick action: "Remind broker" (отправка запроса статуса). Настройка thresholds per broker.
Критерии готовности:
- [ ] Dashboard отображает stale leads
- [ ] Remind broker action работает
Оценка: 4h
Story: STORY-157

[TASK-0846] QA: Тестирование Pending Pipe
Тип: QA
Описание: Симуляция: leads застревают в pending > threshold. Проверка: пометка stale, алерты, remind action, threshold per broker.
Критерии готовности:
- [ ] Все сценарии протестированы
Оценка: 2h
Story: STORY-157

---

## [EPIC-19] Public API & Developer Portal

**Цель:** Создать полнофункциональный developer portal с публичной документацией API (OpenAPI/Swagger), SDK для JavaScript, Python и PHP, sandbox environment, API explorer и changelog для привлечения технически продвинутых клиентов и интеграторов.

**Метрика успеха:**
- 40% новых клиентов используют API документацию при onboarding
- SDK загружены 500+ раз за первые 6 месяцев (npm + pip + composer)
- Среднее время первой успешной API-интеграции < 2 часов (vs 8+ часов без документации)

**Приоритет:** P2 (Growth)
**Зависит от:** EPIC-01 (Lead Intake API), EPIC-06 (User Accounts & RBAC)
**Размер:** L (1-3 мес)

---

### Stories:

**[STORY-158] Developer Portal с документацией API**
Как Developer, я хочу иметь доступ к полной документации API с примерами запросов и ответов, чтобы быстро интегрировать систему в свой стек.

Acceptance Criteria:
- [ ] AC1: OpenAPI 3.1 спецификация для всех public endpoints (минимум 30 endpoints)
- [ ] AC2: Auto-generated документация через Swagger UI / Redoc с интерактивными примерами
- [ ] AC3: Для каждого endpoint: описание, параметры, request/response schema, коды ошибок (400/401/403/404/422/429/500), примеры curl/JavaScript/Python/PHP
- [ ] AC4: Аутентификация: документация auth flow (API key + HMAC signature)
- [ ] AC5: Rate limits: документация лимитов per plan (100/500/2000 req/min)
- [ ] AC6: Webhooks: документация всех webhook events с payload schema
- [ ] AC7: Search по документации (full-text, < 200ms)
- [ ] AC8: Доступ без регистрации (публичная документация)

Story Points: 8
Приоритет: Must
Epic: EPIC-19

#### Tasks для STORY-158:

[TASK-0847] Backend: Генерация OpenAPI 3.1 спецификации
Тип: Backend
Описание: Аннотировать все public API endpoints (30+) OpenAPI annotations. Автоматическая генерация openapi.yaml из кода (go-swagger или oapi-codegen). Включение: schemas, examples, error codes, security schemes. CI pipeline для валидации спецификации при каждом PR.
Критерии готовности:
- [ ] openapi.yaml содержит все public endpoints
- [ ] CI валидирует спецификацию автоматически
- [ ] Примеры request/response для каждого endpoint
Оценка: 16h
Story: STORY-158

[TASK-0848] Frontend: Developer Portal UI
Тип: Frontend
Описание: Отдельное SPA (developers.gambchamp.com) с: sidebar навигацией по категориям API, Redoc-based рендеринг документации, syntax-highlighted code examples с language switcher (curl/JS/Python/PHP), search bar (Algolia DocSearch или аналог). Responsive design.
Критерии готовности:
- [ ] Portal доступен публично
- [ ] Language switcher работает для 4 языков
- [ ] Search работает < 200ms
Оценка: 16h
Story: STORY-158

[TASK-0849] DevOps: Деплой developer portal
Тип: DevOps
Описание: CI/CD pipeline для developer portal: build → deploy на CDN (Cloudflare Pages / Vercel). Custom domain developers.gambchamp.com. Auto-rebuild при обновлении openapi.yaml (webhook из main branch).
Критерии готовности:
- [ ] Auto-deploy при merge в main
- [ ] Custom domain настроен
Оценка: 4h
Story: STORY-158

[TASK-0850] QA: Тестирование developer portal
Тип: QA
Описание: Проверка: все endpoints документированы, примеры работают (curl copy-paste), search работает, responsive layout, broken links.
Критерии готовности:
- [ ] Все примеры curl-запросов работают с реальным API
Оценка: 4h
Story: STORY-158

---

**[STORY-159] SDK для JavaScript, Python, PHP**
Как Developer, я хочу использовать типизированный SDK на моём языке для работы с API, чтобы не писать HTTP-клиент с нуля.

Acceptance Criteria:
- [ ] AC1: JavaScript/TypeScript SDK (npm package): полная типизация, async/await, error handling
- [ ] AC2: Python SDK (pip package): type hints, dataclasses, async support (aiohttp)
- [ ] AC3: PHP SDK (composer package): PSR-18 compatible, PHP 8.1+
- [ ] AC4: Все SDK покрывают 100% public API endpoints
- [ ] AC5: README с quick start (< 5 мин до первого запроса)
- [ ] AC6: Auto-generation из OpenAPI spec (openapi-generator или аналог)
- [ ] AC7: Versioning: SDK version совпадает с API version (semver)
- [ ] AC8: Минимум 80% test coverage для каждого SDK

Story Points: 13
Приоритет: Must
Epic: EPIC-19
Зависит от: STORY-158

#### Tasks для STORY-159:

[TASK-0851] Backend: Auto-generation SDK из OpenAPI
Тип: Backend
Описание: Настроить openapi-generator для 3 targets: typescript-fetch, python, php. CI pipeline: при обновлении openapi.yaml → generate SDKs → run tests → publish (npm, PyPI, Packagist). Кастомизация templates для единообразного naming и error handling.
Критерии готовности:
- [ ] Генерация работает для 3 языков
- [ ] CI pipeline автоматизирован
Оценка: 16h
Story: STORY-159

[TASK-0852] Backend: Доработка и тестирование JavaScript SDK
Тип: Backend
Описание: Ручная доработка auto-generated SDK: улучшение типизации, добавление retry logic (exponential backoff), request/response interceptors, custom error classes (AuthError, RateLimitError, ValidationError). Unit tests (Jest) coverage > 80%.
Критерии готовности:
- [ ] SDK опубликован на npm
- [ ] Test coverage > 80%
- [ ] README с quick start
Оценка: 8h
Story: STORY-159

[TASK-0853] Backend: Доработка и тестирование Python SDK
Тип: Backend
Описание: Доработка auto-generated SDK: type hints, dataclass models, sync + async clients, retry logic, custom exceptions. Tests (pytest) coverage > 80%.
Критерии готовности:
- [ ] SDK опубликован на PyPI
- [ ] Test coverage > 80%
Оценка: 8h
Story: STORY-159

[TASK-0854] Backend: Доработка и тестирование PHP SDK
Тип: Backend
Описание: Доработка: PSR-18 HTTP client, PHP 8.1+ enums, exceptions, retry middleware. Tests (PHPUnit) coverage > 80%.
Критерии готовности:
- [ ] SDK опубликован на Packagist
- [ ] Test coverage > 80%
Оценка: 8h
Story: STORY-159

[TASK-0855] QA: Интеграционное тестирование SDK
Тип: QA
Описание: E2E тестирование каждого SDK против sandbox API: create lead, get lead, list leads, update status, webhook subscription. Проверка error handling для 4xx/5xx.
Критерии готовности:
- [ ] E2E тесты проходят для всех 3 SDK
Оценка: 8h
Story: STORY-159

---

**[STORY-160] Sandbox Environment**
Как Developer, я хочу тестировать интеграцию в sandbox без отправки реальных лидов брокерам, чтобы безопасно разрабатывать и отлаживать.

Acceptance Criteria:
- [ ] AC1: Отдельный sandbox environment (sandbox.api.gambchamp.com) с тестовыми данными
- [ ] AC2: Sandbox API key выдаётся автоматически при регистрации (без верификации)
- [ ] AC3: Mock broker responses: настраиваемые scenarios (success, reject, timeout, random)
- [ ] AC4: Sandbox данные изолированы и очищаются каждые 24 часа
- [ ] AC5: Лимит sandbox: 1000 requests/day, 100 leads
- [ ] AC6: Visual indicator в UI: "SANDBOX MODE" banner для предотвращения путаницы

Story Points: 8
Приоритет: Must
Epic: EPIC-19

#### Tasks для STORY-160:

[TASK-0856] Backend: Sandbox environment
Тип: Backend
Описание: Отдельная БД для sandbox (или schema isolation). Mock broker connector: возвращает configurable responses (success 70%, reject 20%, timeout 10% — настраивается). Auto-cleanup cron (24h TTL). Sandbox API key prefix: "sb_" для визуальной дифференциации. Rate limits: 1000 req/day.
Критерии готовности:
- [ ] Sandbox полностью изолирован от production
- [ ] Mock broker responses настраиваются
- [ ] Auto-cleanup работает
Оценка: 16h
Story: STORY-160

[TASK-0857] DevOps: Инфраструктура sandbox
Тип: DevOps
Описание: Деплой sandbox instance: отдельный контейнер/namespace с собственной БД. DNS: sandbox.api.gambchamp.com. Мониторинг и алерты аналогичные production (но с relaxed thresholds).
Критерии готовности:
- [ ] Sandbox доступен по отдельному домену
- [ ] Изоляция от production подтверждена
Оценка: 8h
Story: STORY-160

[TASK-0858] Frontend: Sandbox UI и API key management
Тип: Frontend
Описание: "SANDBOX MODE" banner (оранжевый) в верхней части UI при работе с sandbox keys. Страница API keys: production keys (locked icon) и sandbox keys (sandbox icon). Генерация sandbox key одним кликом. Mock broker scenario configurator.
Критерии готовности:
- [ ] Banner отображается в sandbox mode
- [ ] Sandbox key generation работает
Оценка: 4h
Story: STORY-160

[TASK-0859] QA: Тестирование sandbox
Тип: QA
Описание: Проверка изоляции (sandbox request не попадает в production). Тестирование mock responses, auto-cleanup, rate limits, API key differentiation.
Критерии готовности:
- [ ] Изоляция подтверждена на 5+ сценариях
Оценка: 4h
Story: STORY-160

---

**[STORY-161] API Explorer в браузере**
Как Developer, я хочу тестировать API запросы прямо из браузера через интерактивный explorer, чтобы быстро проверить работу endpoint без написания кода.

Acceptance Criteria:
- [ ] AC1: "Try it" кнопка на каждом endpoint в документации
- [ ] AC2: Автозаполнение API key из текущей сессии (sandbox или production)
- [ ] AC3: Editable request body с JSON syntax highlighting и validation
- [ ] AC4: Response отображается с syntax highlighting, timing, headers, status code
- [ ] AC5: History последних 20 запросов с возможностью replay
- [ ] AC6: Copy-as-curl для каждого запроса

Story Points: 5
Приоритет: Should
Epic: EPIC-19
Зависит от: STORY-158

#### Tasks для STORY-161:

[TASK-0860] Frontend: API Explorer компонент
Тип: Frontend
Описание: Интеграция Swagger UI "Try It Out" или кастомный компонент. JSON editor (Monaco editor lite) для request body. Response panel с tabs: Body, Headers, Timing. History sidebar (localStorage). Copy-as-curl button.
Критерии готовности:
- [ ] Try it работает для всех endpoints
- [ ] History сохраняется между сессиями
- [ ] Copy-as-curl генерирует корректную команду
Оценка: 8h
Story: STORY-161

[TASK-0861] QA: Тестирование API Explorer
Тип: QA
Описание: Тестирование: запросы к sandbox, отображение responses, error handling, history, copy-as-curl.
Критерии готовности:
- [ ] Explorer работает для GET/POST/PUT/PATCH/DELETE endpoints
Оценка: 2h
Story: STORY-161

---

**[STORY-162] API Changelog и версионирование**
Как Developer, я хочу видеть changelog изменений API и получать уведомления о breaking changes, чтобы своевременно обновлять интеграции.

Acceptance Criteria:
- [ ] AC1: Публичная страница changelog с записями: дата, версия, тип (added/changed/deprecated/removed/fixed), описание
- [ ] AC2: Breaking changes выделены визуально (красный badge) и публикуются за 30 дней до вступления в силу
- [ ] AC3: RSS feed для changelog
- [ ] AC4: Email notification при breaking changes (для всех пользователей с API keys)
- [ ] AC5: API versioning через header (X-API-Version) с поддержкой 2 последних major versions

Story Points: 5
Приоритет: Should
Epic: EPIC-19

#### Tasks для STORY-162:

[TASK-0862] Backend: API versioning middleware
Тип: Backend
Описание: Middleware для чтения X-API-Version header. Routing к соответствующей версии handler. Default: latest stable version. Deprecation warning header для старых версий. Таблица api_changelog: id, version, change_type, description, is_breaking, effective_date, published_at.
Критерии готовности:
- [ ] Versioning middleware работает
- [ ] Deprecation warnings отправляются в response headers
Оценка: 8h
Story: STORY-162

[TASK-0863] Frontend: Changelog страница
Тип: Frontend
Описание: Страница /changelog на developer portal. Timeline с фильтром по типу изменения. Breaking changes: красный badge + countdown до effective_date. RSS feed generation. Email subscribe form.
Критерии готовности:
- [ ] Changelog отображается корректно
- [ ] RSS feed доступен
Оценка: 4h
Story: STORY-162

[TASK-0864] QA: Тестирование versioning
Тип: QA
Описание: Тестирование: запрос с разными versions, deprecation warnings, fallback на latest, breaking change notification.
Критерии готовности:
- [ ] Versioning работает для 2 major versions
Оценка: 2h
Story: STORY-162

---

## [EPIC-20] White-Label & Multi-Tenant Platform

**Цель:** Реализовать white-label режим с кастомным доменом, логотипом, цветовой схемой, изолированными инстансами для enterprise-клиентов и parent-account для resellers.

**Метрика успеха:**
- 5+ enterprise клиентов используют white-label в первые 6 месяцев
- Время развёртывания нового white-label instance < 30 мин
- 100% data isolation между tenant-ами (подтверждено pentest)

**Приоритет:** P3 (Scale)
**Зависит от:** EPIC-06 (User Accounts & RBAC), EPIC-21 (Billing & Subscription)
**Размер:** XL (3+ мес)

**Референс:** GetLinked имеет лучшую white-label реализацию на рынке. Elnopy предлагает self-hosted вариант.

---

### Stories:

**[STORY-163] Кастомный домен и брендинг**
Как Network Admin (enterprise), я хочу настроить кастомный домен, логотип и цветовую схему платформы, чтобы мои аффилейты видели её как мой собственный продукт.

Acceptance Criteria:
- [ ] AC1: Настройка custom domain через UI: ввод домена → инструкция по DNS (CNAME) → автоматическая проверка → SSL-сертификат (Let's Encrypt auto-provisioning)
- [ ] AC2: Загрузка логотипа (SVG/PNG, max 500KB) с автоматическим resize для: header (40px height), favicon (32x32), email signature
- [ ] AC3: Цветовая схема: primary color, secondary color, accent color с preview в реальном времени
- [ ] AC4: Кастомный login page: фоновое изображение, приветственный текст
- [ ] AC5: Email branding: кастомный from address (name@custom-domain.com), logo в header, footer text
- [ ] AC6: Изменения применяются < 5 мин (без перезапуска системы)
- [ ] AC7: Fallback на default branding при отсутствии кастомных настроек

Story Points: 8
Приоритет: Must
Epic: EPIC-20

#### Tasks для STORY-163:

[TASK-0865] Backend: Multi-tenant domain routing и SSL
Тип: Backend
Описание: Таблица tenant_domains: id, company_id, domain, ssl_cert_path, status (pending_dns/active/error), verified_at. DNS verification: TXT record check. SSL: auto-provisioning через Let's Encrypt (certbot/acme). Nginx/Caddy dynamic routing по Host header → tenant_id lookup. Cron: проверка DNS каждые 30 мин для pending domains.
Критерии готовности:
- [ ] Custom domain routing работает
- [ ] SSL auto-provisioning работает
- [ ] DNS verification корректна
Оценка: 16h
Story: STORY-163

[TASK-0866] Backend: Branding configuration API
Тип: Backend
Описание: Таблица tenant_branding: company_id, logo_url, favicon_url, primary_color, secondary_color, accent_color, login_bg_url, welcome_text, email_from_name, email_from_address, footer_text. Endpoints: GET/PUT /api/v1/settings/branding. Image upload к S3/MinIO с resize (40px header, 32x32 favicon). CSS variables generation.
Критерии готовности:
- [ ] Branding settings сохраняются и применяются
- [ ] Image upload с resize работает
- [ ] CSS variables генерируются динамически
Оценка: 8h
Story: STORY-163

[TASK-0867] Frontend: UI настройки брендинга
Тип: Frontend
Описание: Страница "Branding": image uploader с crop/preview, color pickers с preview panel (мини-версия UI с выбранными цветами в реальном времени), login page preview. DNS setup wizard: шаг 1 (введите домен) → шаг 2 (добавьте CNAME record) → шаг 3 (ждём проверку / success).
Критерии готовности:
- [ ] Preview обновляется в реальном времени
- [ ] DNS wizard понятен и информативен
Оценка: 8h
Story: STORY-163

[TASK-0868] DevOps: Инфраструктура multi-domain
Тип: DevOps
Описание: Nginx/Caddy конфигурация для wildcard + custom domain routing. Let's Encrypt integration с auto-renewal. CDN (Cloudflare) setup для custom domains. Мониторинг SSL expiry.
Критерии готовности:
- [ ] Multi-domain routing работает
- [ ] SSL auto-renewal настроен
Оценка: 8h
Story: STORY-163

[TASK-0869] QA: Тестирование custom domain и branding
Тип: QA
Описание: E2E: настройка custom domain → DNS → SSL → branding → проверка на клиентском домене. Тестирование: logo resize, color scheme, email branding, fallback.
Критерии готовности:
- [ ] E2E flow работает без ошибок
Оценка: 4h
Story: STORY-163

---

**[STORY-164] Data isolation для multi-tenant**
Как Network Admin (enterprise), я хочу быть уверен, что данные моей компании полностью изолированы от данных других клиентов, чтобы соответствовать требованиям безопасности.

Acceptance Criteria:
- [ ] AC1: Row-Level Security (RLS) в PostgreSQL: каждый запрос фильтруется по company_id через RLS policy
- [ ] AC2: API-level isolation: middleware проверяет company_id в каждом запросе, cross-tenant access невозможен
- [ ] AC3: File storage isolation: отдельные S3 prefixes per tenant (s3://bucket/tenant-{id}/)
- [ ] AC4: Enterprise option: dedicated database per tenant (полная физическая изоляция)
- [ ] AC5: Audit trail: логирование любой попытки cross-tenant access (даже неуспешной)
- [ ] AC6: Pentest report подтверждает изоляцию (ежеквартальный)

Story Points: 13
Приоритет: Must
Epic: EPIC-20

#### Tasks для STORY-164:

[TASK-0870] Backend: Row-Level Security policies
Тип: Backend
Описание: Включить RLS на всех tenant-scoped таблицах (leads, brokers, affiliates, reports и др.). Policy: current_setting('app.company_id') = company_id. Middleware: SET app.company_id = X в начале каждого запроса. Тестирование: попытка SELECT данных другого tenant возвращает пустой результат.
Критерии готовности:
- [ ] RLS включен на всех tenant таблицах (20+)
- [ ] Cross-tenant access невозможен через SQL
- [ ] Performance impact < 5%
Оценка: 16h
Story: STORY-164

[TASK-0871] Backend: Dedicated database per tenant
Тип: Backend
Описание: Механизм provisioning отдельной БД per enterprise tenant. Connection pool manager: routing по tenant_id к соответствующей БД. Migration runner для всех tenant DBs. Admin endpoint: POST /api/v1/admin/tenants/:id/provision-db.
Критерии готовности:
- [ ] Provisioning новой БД < 5 мин
- [ ] Migrations применяются ко всем tenant DBs
- [ ] Connection pooling работает для 50+ tenants
Оценка: 16h
Story: STORY-164

[TASK-0872] DevOps: Мониторинг tenant isolation
Тип: DevOps
Описание: Audit log для cross-tenant access attempts. Dashboard в Grafana: requests per tenant, isolation violations (should be 0). Automated pentest script (monthly) для проверки isolation.
Критерии готовности:
- [ ] Мониторинг isolation нарушений настроен
- [ ] Automated pentest script работает
Оценка: 8h
Story: STORY-164

[TASK-0873] QA: Pentest tenant isolation
Тип: QA
Описание: Manual pentest: IDOR attacks, parameter tampering (company_id подмена), SQL injection для bypass RLS, API enumeration cross-tenant. Отчёт с findings и severity.
Критерии готовности:
- [ ] 0 critical/high findings
- [ ] Pentest report составлен
Оценка: 8h
Story: STORY-164

---

**[STORY-165] Parent-account для resellers**
Как Network Admin (reseller), я хочу создавать и управлять sub-accounts для моих клиентов из единого parent-account, чтобы предоставлять платформу как услугу.

Acceptance Criteria:
- [ ] AC1: Parent account может создавать до 50 child accounts
- [ ] AC2: Каждый child account — полностью изолированная компания со своими users, data, settings
- [ ] AC3: Parent видит: список child accounts, usage statistics per child, aggregate P&L
- [ ] AC4: Parent может: создать/заблокировать/удалить child account, войти в child (impersonate) с audit log
- [ ] AC5: Child account не видит parent и других child accounts
- [ ] AC6: Revenue sharing: parent задаёт markup % per child (например, child платит $499 * 1.3 = $649)

Story Points: 13
Приоритет: Should
Epic: EPIC-20
Зависит от: STORY-164

#### Tasks для STORY-165:

[TASK-0874] Backend: Parent-child account model
Тип: Backend
Описание: Расширение таблицы companies: parent_company_id (nullable, FK), is_reseller (bool), markup_percent (decimal). Endpoints: POST /api/v1/reseller/accounts (create child), GET /api/v1/reseller/accounts (list children), POST /api/v1/reseller/accounts/:id/impersonate (login as child — creates session with audit). DELETE /api/v1/reseller/accounts/:id (soft delete). Aggregate stats: leads, FTD, revenue per child.
Критерии готовности:
- [ ] Parent может создавать и управлять child accounts
- [ ] Impersonation работает с audit trail
- [ ] Child изолирован от parent и siblings
Оценка: 16h
Story: STORY-165

[TASK-0875] Frontend: Reseller management panel
Тип: Frontend
Описание: Страница "My Accounts": таблица child accounts с usage stats, status badge (active/suspended). Модальные окна: создание child (company name, admin email, plan, markup). Кнопки: impersonate (открывает в новом tab), suspend, delete (с подтверждением). Aggregate dashboard: total revenue from children, growth chart.
Критерии готовности:
- [ ] CRUD child accounts работает
- [ ] Impersonate открывает child session
- [ ] Aggregate stats отображаются
Оценка: 8h
Story: STORY-165

[TASK-0876] QA: Тестирование reseller model
Тип: QA
Описание: Тестирование: создание child, isolation, impersonate + audit, suspend/delete, markup calculation, лимит 50 children.
Критерии готовности:
- [ ] Все сценарии протестированы
- [ ] Изоляция child accounts подтверждена
Оценка: 4h
Story: STORY-165

---

**[STORY-166] White-label email и коммуникации**
Как Network Admin (enterprise), я хочу чтобы все системные email (уведомления, отчёты, приглашения) отправлялись с моего домена и бренда, чтобы аффилейты не знали о существовании GambChamp.

Acceptance Criteria:
- [ ] AC1: Кастомный email sender: from_name и from_email с custom domain
- [ ] AC2: Email templates с подставленным логотипом, цветами и footer tenant-а
- [ ] AC3: SPF/DKIM/DMARC verification для custom email domain с инструкцией в UI
- [ ] AC4: Отсутствие любых упоминаний "GambChamp" в white-label режиме (emails, UI, meta tags)
- [ ] AC5: Custom email domain verification: wizard с проверкой DNS records

Story Points: 5
Приоритет: Should
Epic: EPIC-20
Зависит от: STORY-163

#### Tasks для STORY-166:

[TASK-0877] Backend: White-label email system
Тип: Backend
Описание: Email templates с Handlebars: все упоминания бренда через переменные ({{brand_name}}, {{logo_url}}, {{primary_color}}). SPF/DKIM setup guide generator per custom domain. DNS verification: проверка TXT records для SPF/DKIM. Email sending через SES/Postmark с custom from address.
Критерии готовности:
- [ ] Emails отправляются с custom domain
- [ ] SPF/DKIM verification работает
- [ ] 0 упоминаний GambChamp в white-label emails
Оценка: 8h
Story: STORY-166

[TASK-0878] Frontend: Email domain setup wizard
Тип: Frontend
Описание: Wizard: шаг 1 (введите email domain) → шаг 2 (добавьте SPF TXT record, DKIM CNAME record — copyable) → шаг 3 (verify — check DNS) → success. Статус: pending/verified/error с retry.
Критерии готовности:
- [ ] Wizard проходится без внешней помощи
- [ ] DNS records копируются одним кликом
Оценка: 4h
Story: STORY-166

[TASK-0879] QA: Тестирование white-label emails
Тип: QA
Описание: Отправка всех типов системных emails через white-label: проверка branding, from address, отсутствие GambChamp mentions, deliverability (SPF/DKIM pass).
Критерии готовности:
- [ ] Все системные emails проверены
- [ ] SPF/DKIM pass в email headers
Оценка: 4h
Story: STORY-166

---

**[STORY-167] White-label UI кастомизация**
Как Network Admin (enterprise), я хочу скрыть определённые модули и переименовать разделы навигации, чтобы интерфейс соответствовал бизнес-процессам моей компании.

Acceptance Criteria:
- [ ] AC1: Toggle visibility для каждого модуля навигации (hide/show)
- [ ] AC2: Кастомные названия для разделов навигации (например, "Leads" → "Clients", "Affiliates" → "Partners")
- [ ] AC3: Кастомный favicon и page title (browser tab)
- [ ] AC4: Скрытие "Powered by GambChamp" в footer
- [ ] AC5: Изменения применяются для всех пользователей tenant без перезагрузки

Story Points: 5
Приоритет: Could
Epic: EPIC-20
Зависит от: STORY-163

#### Tasks для STORY-167:

[TASK-0880] Backend: UI customization settings
Тип: Backend
Описание: Расширение tenant_branding: nav_config (JSONB — module visibility + custom labels), page_title, hide_powered_by (bool). Endpoint возвращает UI config при инициализации приложения.
Критерии готовности:
- [ ] Nav config сохраняется и возвращается
- [ ] Defaults для не-настроенных полей
Оценка: 4h
Story: STORY-167

[TASK-0881] Frontend: UI кастомизация навигации
Тип: Frontend
Описание: Настройки: список модулей с toggle и editable label. Preview навигации. Применение: фильтрация navigation items по visibility, замена labels. Dynamic page title через document.title. Conditional render "Powered by".
Критерии готовности:
- [ ] Module visibility и labels применяются
- [ ] Preview работает в реальном времени
Оценка: 4h
Story: STORY-167

[TASK-0882] QA: Тестирование UI кастомизации
Тип: QA
Описание: Тестирование: скрытие модулей, переименование, favicon, page title, powered by toggle.
Критерии готовности:
- [ ] Все кастомизации применяются корректно
Оценка: 2h
Story: STORY-167

---

## [EPIC-21] Billing & Subscription Management

**Цель:** Реализовать встроенную биллинговую систему с тарифными планами ($399/$699/$1199), usage-based billing для fraud checks и proxy, addon modules, автоматический invoicing и поддержку платёжных методов (Stripe + crypto).

**Метрика успеха:**
- 95% платежей обрабатываются автоматически (без ручного вмешательства)
- MRR tracking с точностью 100%
- Churn rate involuntary (failed payments) < 3% благодаря dunning management

**Приоритет:** P3 (Scale)
**Зависит от:** EPIC-06 (User Accounts & RBAC)
**Размер:** L (1-3 мес)

---

### Stories:

**[STORY-168] Тарифные планы и подписки**
Как Network Admin, я хочу выбрать тарифный план при регистрации и управлять подпиской из личного кабинета, чтобы платить только за нужную функциональность.

Acceptance Criteria:
- [ ] AC1: 3 плана: Starter ($399/мес — 5 users, 10K leads/мес, 50 broker integrations), Growth ($699/мес — 15 users, 50K leads, 200 brokers, AI routing), Enterprise ($1199/мес — unlimited users, unlimited leads, unlimited brokers, white-label, dedicated support)
- [ ] AC2: Годовая подписка с 20% скидкой (2 месяца бесплатно)
- [ ] AC3: 14-дневный бесплатный trial для Starter (без карты)
- [ ] AC4: Upgrade/downgrade: мгновенный upgrade (prorated billing), downgrade в конце текущего периода
- [ ] AC5: Страница pricing: comparison table с feature check marks, toggle monthly/annual
- [ ] AC6: Self-service отмена подписки с retention offer (скидка 30% на 3 месяца)

Story Points: 8
Приоритет: Must
Epic: EPIC-21

#### Tasks для STORY-168:

[TASK-0883] Backend: Subscription management с Stripe
Тип: Backend
Описание: Интеграция Stripe Billing: Products (3 плана), Prices (monthly + annual), Subscriptions. Таблица subscriptions: id, company_id, stripe_subscription_id, plan, status (trialing/active/past_due/canceled), current_period_end. Webhook handler для: invoice.paid, invoice.payment_failed, customer.subscription.updated/deleted. Proration при upgrade.
Критерии готовности:
- [ ] 3 плана созданы в Stripe
- [ ] Subscription lifecycle работает (create, upgrade, downgrade, cancel)
- [ ] Webhooks обрабатываются корректно
Оценка: 16h
Story: STORY-168

[TASK-0884] Frontend: Pricing page и subscription management
Тип: Frontend
Описание: Pricing page: 3-column comparison table, monthly/annual toggle, CTA buttons. Account Settings → Subscription: текущий план, usage stats, кнопки upgrade/downgrade/cancel. Upgrade modal: plan comparison + prorated cost preview. Cancel flow: reason selector → retention offer (30% off) → confirmation.
Критерии готовности:
- [ ] Pricing page responsive и информативна
- [ ] Upgrade/downgrade flow работает с prorated preview
- [ ] Cancel flow включает retention offer
Оценка: 8h
Story: STORY-168

[TASK-0885] QA: Тестирование подписок
Тип: QA
Описание: E2E: signup → trial → activate (add card) → upgrade → downgrade → cancel. Тестирование Stripe webhooks с Stripe CLI. Proration calculations. Trial expiry. Retention offer.
Критерии готовности:
- [ ] Полный lifecycle протестирован
- [ ] Stripe webhook scenarios покрыты
Оценка: 8h
Story: STORY-168

---

**[STORY-169] Usage-based billing**
Как Finance Manager, я хочу видеть детальную тарификацию по usage (fraud checks, proxy requests, API calls сверх лимита), чтобы контролировать расходы.

Acceptance Criteria:
- [ ] AC1: Usage metering для: fraud checks (сверх 10K/мес — $0.01/check), proxy/autologin requests (сверх 5K/мес — $0.05/request), API calls (сверх 100K/мес — $0.001/call)
- [ ] AC2: Real-time usage dashboard: текущее потребление vs лимит плана (progress bars), projected cost до конца месяца
- [ ] AC3: Overage billing: автоматическое выставление в конце периода на основе usage
- [ ] AC4: Usage alerts: настраиваемые пороги (50%, 80%, 100%, 150% от лимита) с уведомлением
- [ ] AC5: Usage history: помесячный график потребления за последние 12 месяцев
- [ ] AC6: Hard limit option: блокировка при достижении лимита (vs overage billing)

Story Points: 8
Приоритет: Must
Epic: EPIC-21
Зависит от: STORY-168

#### Tasks для STORY-169:

[TASK-0886] Backend: Usage metering engine
Тип: Backend
Описание: Таблица usage_records: id, company_id, metric (fraud_check/proxy/api_call), count, period_start, period_end. Atomic increment при каждом usage event (Redis counter + periodic flush to PG). Stripe Metered Billing integration: report usage через Stripe API. Cron: ежечасный flush и проверка thresholds. Projected cost calculation: (current_usage / days_elapsed) * days_in_month * rate.
Критерии готовности:
- [ ] Usage записывается атомарно
- [ ] Stripe metered billing работает
- [ ] Projected cost рассчитывается корректно
Оценка: 16h
Story: STORY-169

[TASK-0887] Frontend: Usage dashboard
Тип: Frontend
Описание: Страница "Usage & Billing": 3 progress bars (fraud checks, proxy, API calls) с текущее/лимит. Projected cost карточка. Threshold настройка (slider + checkbox email alert). Monthly history bar chart. Toggle: overage/hard limit.
Критерии готовности:
- [ ] Progress bars обновляются в реальном времени
- [ ] Threshold alerts настраиваются
- [ ] History chart отображается за 12 месяцев
Оценка: 8h
Story: STORY-169

[TASK-0888] QA: Тестирование usage billing
Тип: QA
Описание: Симуляция: usage до лимита, overage, hard limit block, threshold alerts, projected cost accuracy, Stripe invoice с usage.
Критерии готовности:
- [ ] Usage billing рассчитывается точно
- [ ] Hard limit блокирует запросы
Оценка: 4h
Story: STORY-169

---

**[STORY-170] Invoice management и платёжные методы**
Как Finance Manager, я хочу скачивать инвойсы и управлять платёжными методами из личного кабинета, чтобы вести бухгалтерский учёт.

Acceptance Criteria:
- [ ] AC1: Список инвойсов с фильтрацией по статусу (paid/pending/failed/refunded) и периоду
- [ ] AC2: PDF-инвойс с данными компании, breakdown по line items (plan + usage), VAT (если применимо)
- [ ] AC3: Платёжные методы: добавление/удаление карт (Stripe Elements), крипто-платежи (BTC/USDT через Coinbase Commerce или BTCPay)
- [ ] AC4: Default payment method с fallback на альтернативный при failure
- [ ] AC5: Dunning management: 3 попытки оплаты (день 1, день 3, день 7) + email на каждом шаге + grace period 14 дней до блокировки
- [ ] AC6: Receipt email после каждого успешного платежа

Story Points: 8
Приоритет: Must
Epic: EPIC-21
Зависит от: STORY-168

#### Tasks для STORY-170:

[TASK-0889] Backend: Invoice и payment method management
Тип: Backend
Описание: Stripe Invoice API интеграция: auto-generate invoices. PDF generation через Stripe (hosted invoice page) или кастомный с company details. Таблица payment_methods: id, company_id, stripe_pm_id, type (card/crypto), is_default, last4, brand. Crypto payments: Coinbase Commerce API (create charge → webhook → mark paid). Dunning: cron job проверяет past_due subscriptions → retry → email → grace period → suspend.
Критерии готовности:
- [ ] Invoices генерируются автоматически
- [ ] Card и crypto payments работают
- [ ] Dunning flow выполняется автоматически
Оценка: 16h
Story: STORY-170

[TASK-0890] Frontend: Invoice list и payment methods UI
Тип: Frontend
Описание: Страница "Invoices": таблица с status badge, amount, date, PDF download button. Страница "Payment Methods": список карт (last4, brand, expiry), add card (Stripe Elements embedded form), crypto payment flow (QR code + address). Default method toggle. Dunning banner: "Платёж не прошёл, обновите карту" с CTA.
Критерии готовности:
- [ ] Invoice list с PDF download работает
- [ ] Stripe Elements интеграция безопасна (PCI DSS SAQ A)
- [ ] Crypto payment flow с QR code работает
Оценка: 8h
Story: STORY-170

[TASK-0891] QA: Тестирование billing
Тип: QA
Описание: E2E: payment → invoice → PDF. Тестирование: failed payment → dunning → retry → grace → suspend. Crypto payment flow. Multiple payment methods. Refund.
Критерии готовности:
- [ ] Полный billing lifecycle протестирован
Оценка: 8h
Story: STORY-170

---

**[STORY-171] Addon modules и feature gating**
Как Network Admin, я хочу докупать отдельные модули (AI routing, white-label, advanced fraud) к базовому плану, чтобы платить только за то что нужно.

Acceptance Criteria:
- [ ] AC1: Каталог addons: AI Routing ($99/мес), White-Label ($199/мес), Advanced Fraud ($49/мес), Priority Support ($149/мес), Extra Users ($10/user/мес)
- [ ] AC2: Активация addon мгновенная с prorated billing
- [ ] AC3: Feature gating: заблокированные модули показывают upgrade CTA с описанием benefits
- [ ] AC4: Addon usage отображается на странице billing
- [ ] AC5: Деактивация addon: в конце текущего billing period

Story Points: 5
Приоритет: Should
Epic: EPIC-21
Зависит от: STORY-168

#### Tasks для STORY-171:

[TASK-0892] Backend: Feature gating и addon management
Тип: Backend
Описание: Таблица company_features: company_id, feature_slug, is_active, activated_at, stripe_item_id. Feature check middleware: при обращении к gated endpoint — проверка company_features. Stripe: addon как отдельные subscription items. Activation: add subscription item → update company_features. Deactivation: scheduled at period_end.
Критерии готовности:
- [ ] Feature gating блокирует доступ к неоплаченным модулям
- [ ] Addon activation/deactivation через Stripe работает
Оценка: 8h
Story: STORY-171

[TASK-0893] Frontend: Addon marketplace и feature gates
Тип: Frontend
Описание: Страница "Add-ons": карточки модулей с описанием, ценой, toggle activate/deactivate. Feature gate UI: overlay на заблокированных модулях с "Unlock with [addon name]" CTA. Billing page: active addons с ценой.
Критерии готовности:
- [ ] Addon карточки информативны
- [ ] Feature gate overlay понятен
Оценка: 4h
Story: STORY-171

[TASK-0894] QA: Тестирование addons
Тип: QA
Описание: Тестирование: activate, deactivate, feature gate, prorated billing, multiple addons, downgrade plan with active addons.
Критерии готовности:
- [ ] Все сценарии addon lifecycle протестированы
Оценка: 4h
Story: STORY-171

---

**[STORY-172] MRR и revenue analytics для admin**
Как Network Admin (platform), я хочу видеть MRR, churn rate и revenue breakdown по планам, чтобы отслеживать финансовые KPI платформы.

Acceptance Criteria:
- [ ] AC1: Admin dashboard: MRR (Monthly Recurring Revenue), ARR, MRR growth %, net new MRR, expansion MRR, churned MRR
- [ ] AC2: Breakdown: MRR по планам (pie chart), MRR по addons, MRR trend (line chart 12 мес)
- [ ] AC3: Churn metrics: voluntary churn rate, involuntary churn rate, recovery rate (dunning success)
- [ ] AC4: Cohort: LTV per signup month, time to upgrade
- [ ] AC5: Только для role: platform_admin

Story Points: 5
Приоритет: Could
Epic: EPIC-21

#### Tasks для STORY-172:

[TASK-0895] Backend: MRR calculation engine
Тип: Backend
Описание: Cron job ежедневно: расчёт MRR per company (plan price + addon prices + usage estimate). Агрегация: total MRR, net new, expansion, churned. Таблица mrr_snapshots: date, total_mrr, plan_mrr (JSONB breakdown), addon_mrr, churned_mrr, new_mrr. Churn calculation: companies canceled / total active at period start.
Критерии готовности:
- [ ] MRR рассчитывается ежедневно
- [ ] Все компоненты MRR корректны
Оценка: 8h
Story: STORY-172

[TASK-0896] Frontend: Admin revenue dashboard
Тип: Frontend
Описание: Admin-only страница: KPI-карточки (MRR, ARR, growth %, churn rate). Pie chart: MRR по планам. Line chart: MRR trend. Churn breakdown table. Cohort heatmap.
Критерии готовности:
- [ ] Dashboard доступен только platform_admin
- [ ] Все метрики отображаются корректно
Оценка: 4h
Story: STORY-172

[TASK-0897] QA: Тестирование revenue analytics
Тип: QA
Описание: Верификация MRR расчётов на тестовых данных. Проверка churn rate, cohort analysis, access control.
Критерии готовности:
- [ ] Расчёты верифицированы
Оценка: 2h
Story: STORY-172

---

## [EPIC-22] Compliance & Security Hardening

**Цель:** Подготовить платформу к SOC 2 Type II сертификации, обеспечить GDPR compliance, реализовать полное audit logging, IP whitelist, session management и провести penetration testing.

**Метрика успеха:**
- SOC 2 Type II audit пройден без critical findings
- 100% compliance с GDPR requirements (Data Processing Agreement, Right to Erasure, Data Portability)
- 0 critical/high vulnerabilities в pentest report

**Приоритет:** P3 (Scale)
**Зависит от:** EPIC-06 (User Accounts & RBAC), EPIC-20 (White-Label)
**Размер:** L (1-3 мес)

---

### Stories:

**[STORY-173] Comprehensive Audit Logging**
Как Network Admin, я хочу видеть полный журнал всех действий пользователей в системе с возможностью фильтрации и экспорта, чтобы расследовать инциденты и проходить аудиты.

Acceptance Criteria:
- [ ] AC1: Логирование всех CUD-операций (Create, Update, Delete) для всех сущностей: лиды, брокеры, аффилейты, пользователи, настройки, роутинг
- [ ] AC2: Каждая запись: timestamp (UTC), user_id, user_email, action, entity_type, entity_id, old_value (JSONB), new_value (JSONB), ip_address, user_agent, session_id
- [ ] AC3: Read-only хранение: audit logs не могут быть изменены или удалены (append-only)
- [ ] AC4: Retention: минимум 365 дней (настраивается до 5 лет для enterprise)
- [ ] AC5: Фильтрация: по user, по action, по entity type, по date range, по IP
- [ ] AC6: Экспорт: CSV с limit 100K строк
- [ ] AC7: Real-time search < 500ms для последних 30 дней

Story Points: 8
Приоритет: Must
Epic: EPIC-22

#### Tasks для STORY-173:

[TASK-0898] Backend: Audit logging infrastructure
Тип: Backend
Описание: Отдельная append-only таблица audit_logs (без UPDATE/DELETE permissions для application role). Middleware: автоматический capture diff (old/new values) при каждой мутации через ORM hooks. Async write через message queue (не блокировать основной запрос). Индексы: (company_id, created_at), (user_id, created_at), (entity_type, entity_id). Partitioning по месяцам для performance. Retention policy: auto-archive в cold storage после 365 дней.
Критерии готовности:
- [ ] Все CUD-операции логируются автоматически
- [ ] Append-only гарантируется на уровне DB permissions
- [ ] Запись audit log не увеличивает latency основного запроса > 5ms
Оценка: 16h
Story: STORY-173

[TASK-0899] Frontend: Audit log viewer
Тип: Frontend
Описание: Страница "Audit Log": таблица с filters (user, action, entity, date range, IP). Expandable row с diff view (old → new values, highlighted changes). Export CSV button. Pagination (cursor-based для performance).
Критерии готовности:
- [ ] Фильтрация работает для всех полей
- [ ] Diff view показывает изменения наглядно
- [ ] Export CSV работает для 100K строк
Оценка: 8h
Story: STORY-173

[TASK-0900] DevOps: Audit log storage и retention
Тип: DevOps
Описание: Настройка table partitioning (monthly). Archive cron: перемещение partitions старше 365 дней в cold storage (S3 + Parquet). Мониторинг: алерт если audit logging fails. Backup: отдельный backup schedule для audit logs.
Критерии готовности:
- [ ] Partitioning настроен
- [ ] Archive cron работает
- [ ] Backup отдельный от main DB
Оценка: 8h
Story: STORY-173

[TASK-0901] QA: Тестирование audit logging
Тип: QA
Описание: Проверка: все типы операций логируются, diff корректен, append-only (попытка UPDATE/DELETE → error), search performance, export.
Критерии готовности:
- [ ] 100% операций логируются
- [ ] Append-only подтверждено
Оценка: 4h
Story: STORY-173

---

**[STORY-174] IP Whitelist и Session Management**
Как Network Admin, я хочу ограничить доступ к системе по IP-адресам и управлять активными сессиями пользователей, чтобы предотвратить несанкционированный доступ.

Acceptance Criteria:
- [ ] AC1: IP whitelist per company: список разрешённых IP/CIDR (до 50 записей)
- [ ] AC2: При попытке входа с не-whitelisted IP — блокировка с email-уведомлением admin
- [ ] AC3: Bypass whitelist для specific users (например, traveling admin) через temporary token (email magic link, TTL 24h)
- [ ] AC4: Session management: список активных сессий per user (device, IP, location, last active)
- [ ] AC5: Force logout: terminate любую сессию или все сессии пользователя
- [ ] AC6: Session timeout: настраиваемый (15 мин / 1 час / 8 часов / 24 часа), default 8 часов
- [ ] AC7: Concurrent session limit: настраиваемый (1-10), default 3

Story Points: 8
Приоритет: Must
Epic: EPIC-22

#### Tasks для STORY-174:

[TASK-0902] Backend: IP whitelist и session management
Тип: Backend
Описание: Таблица ip_whitelist: company_id, cidr, description, created_by. Middleware: проверка client IP против whitelist при каждом запросе (O(1) через in-memory set, refresh каждые 60 сек). Temporary bypass tokens: таблица temp_access_tokens с TTL. Таблица sessions: id, user_id, device_info (parsed UA), ip, location (GeoIP), last_active_at, expires_at. Concurrent session enforcement: при превышении лимита — invalidation oldest session.
Критерии готовности:
- [ ] IP whitelist блокирует non-whitelisted IPs
- [ ] Bypass tokens работают с TTL
- [ ] Session management: list, force logout, timeout, concurrent limit
Оценка: 16h
Story: STORY-174

[TASK-0903] Frontend: IP whitelist и sessions UI
Тип: Frontend
Описание: Settings → Security: IP Whitelist table (CRUD), session list per user (device icon, location, last active, terminate button), session timeout selector, concurrent limit input. "Terminate All Sessions" danger button с confirmation.
Критерии готовности:
- [ ] IP whitelist CRUD работает
- [ ] Session list отображает все активные сессии
- [ ] Force logout работает мгновенно
Оценка: 8h
Story: STORY-174

[TASK-0904] QA: Тестирование IP whitelist и sessions
Тип: QA
Описание: Тестирование: whitelist block, bypass token, session timeout, concurrent limit, force logout, CIDR ranges.
Критерии готовности:
- [ ] Все сценарии безопасности проверены
Оценка: 4h
Story: STORY-174

---

**[STORY-175] GDPR Compliance**
Как Network Admin, я хочу чтобы платформа соответствовала GDPR, чтобы обслуживать европейских клиентов без юридических рисков.

Acceptance Criteria:
- [ ] AC1: Right to Erasure: endpoint и UI для полного удаления всех данных пользователя/лида по запросу (< 72 часа)
- [ ] AC2: Data Portability: экспорт всех данных пользователя в machine-readable формате (JSON) по запросу
- [ ] AC3: Consent management: tracking consent для каждого лида (consent_given, consent_timestamp, consent_source)
- [ ] AC4: Data Processing Agreement (DPA): downloadable DPA document, electronic signature
- [ ] AC5: Cookie consent banner для EU users (detected по GeoIP)
- [ ] AC6: Data retention settings: автоматическое удаление PII после настраиваемого периода (90/180/365 дней)
- [ ] AC7: GDPR request log: tracking всех erasure/portability requests с status и timestamps

Story Points: 8
Приоритет: Must
Epic: EPIC-22

#### Tasks для STORY-175:

[TASK-0905] Backend: GDPR data operations
Тип: Backend
Описание: POST /api/v1/gdpr/erasure-request — создаёт запрос на удаление. Worker: аноминизация PII (имя, email, телефон → hash) во всех таблицах через cascading update. Audit log entry: "GDPR erasure completed". POST /api/v1/gdpr/export-request — генерирует JSON archive с всеми данными (leads, events, settings). Таблица gdpr_requests: id, company_id, type (erasure/export), status, requested_at, completed_at. Data retention cron: удаление PII старше configured period.
Критерии готовности:
- [ ] Erasure анонимизирует данные во всех таблицах
- [ ] Export генерирует полный JSON archive
- [ ] Retention cron работает
Оценка: 16h
Story: STORY-175

[TASK-0906] Frontend: GDPR compliance UI
Тип: Frontend
Описание: Settings → Privacy: data retention period selector, DPA download + e-sign flow, GDPR request form (erasure/export) с tracking status. Cookie consent banner (EU only) с accept/reject/customize. Consent tracking UI для lead profiles.
Критерии готовности:
- [ ] Erasure/export requests можно подать из UI
- [ ] Cookie banner работает для EU visitors
- [ ] DPA downloadable
Оценка: 8h
Story: STORY-175

[TASK-0907] QA: GDPR compliance testing
Тип: QA
Описание: Проверка: erasure удаляет все PII (проверка каждой таблицы), export содержит все данные, consent tracking, retention policy, cookie banner GeoIP detection.
Критерии готовности:
- [ ] PII не обнаруживается после erasure (full DB scan)
- [ ] Export содержит 100% данных пользователя
Оценка: 8h
Story: STORY-175

---

**[STORY-176] SOC 2 Type II подготовка**
Как Network Admin (enterprise), я хочу чтобы платформа имела SOC 2 сертификацию, чтобы пройти security review при заключении enterprise контрактов.

Acceptance Criteria:
- [ ] AC1: Все 5 Trust Service Criteria покрыты: Security, Availability, Processing Integrity, Confidentiality, Privacy
- [ ] AC2: Evidence collection автоматизирован: audit logs, access reviews, change management, incident response
- [ ] AC3: Quarterly access review: автоматический отчёт по правам доступа всех пользователей
- [ ] AC4: Change management: каждый production deployment связан с ticket/PR и прошёл approval
- [ ] AC5: Incident response plan: документирован и протестирован (tabletop exercise)
- [ ] AC6: Vulnerability management: automated scanning (weekly) с tracking remediation

Story Points: 13
Приоритет: Should
Epic: EPIC-22

#### Tasks для STORY-176:

[TASK-0908] Backend: SOC 2 evidence automation
Тип: Backend
Описание: Endpoints для автоматического сбора evidence: GET /api/v1/compliance/access-review (все users + roles + last login), GET /api/v1/compliance/change-log (deployments + associated PRs), GET /api/v1/compliance/incident-log. Quarterly cron: генерация access review report (PDF). Integration с CI/CD: tag deployments с PR/ticket references.
Критерии готовности:
- [ ] Evidence endpoints реализованы
- [ ] Quarterly access review генерируется автоматически
Оценка: 16h
Story: STORY-176

[TASK-0909] DevOps: Vulnerability scanning и hardening
Тип: DevOps
Описание: Настройка weekly vulnerability scan (Trivy для containers, npm audit / go vet для dependencies). Dashboard: vulnerability count by severity, age, remediation status. Auto-PR для dependency updates (Dependabot/Renovate). Infrastructure hardening: TLS 1.3 only, security headers (CSP, HSTS, X-Frame-Options), secrets management (Vault).
Критерии готовности:
- [ ] Weekly scans запускаются автоматически
- [ ] 0 critical/high unresolved vulnerabilities
- [ ] Infrastructure hardening checklist пройден
Оценка: 16h
Story: STORY-176

[TASK-0910] QA: Penetration testing
Тип: QA
Описание: Comprehensive pentest: OWASP Top 10, API security (BOLA, mass assignment, rate limiting), authentication (brute force, session hijacking), authorization (privilege escalation, IDOR), data exposure. Report с findings categorized по severity.
Критерии готовности:
- [ ] Pentest report с 0 critical findings
- [ ] Все high findings имеют remediation plan
Оценка: 16h
Story: STORY-176

---

**[STORY-177] Encryption at rest и key management**
Как Network Admin, я хочу чтобы все sensitive данные (PII, API keys, credentials) были зашифрованы at rest, чтобы защитить данные при компрометации storage.

Acceptance Criteria:
- [ ] AC1: Database encryption: PostgreSQL TDE или column-level encryption для PII (name, email, phone, address)
- [ ] AC2: Application-level encryption для: API keys, broker credentials, webhook secrets (AES-256-GCM)
- [ ] AC3: Key management: master key в external KMS (AWS KMS / HashiCorp Vault)
- [ ] AC4: Key rotation: ежеквартальная автоматическая ротация с re-encryption
- [ ] AC5: Encryption status dashboard: какие поля зашифрованы, last rotation date, next scheduled rotation

Story Points: 8
Приоритет: Should
Epic: EPIC-22

#### Tasks для STORY-177:

[TASK-0911] Backend: Column-level encryption
Тип: Backend
Описание: Encryption service: AES-256-GCM с key from KMS. Encrypt/decrypt functions для: lead PII (name, email, phone), broker credentials, API keys. Transparent encryption через ORM hooks (encrypt before save, decrypt after read). Migration: encrypt existing plaintext data (backfill job).
Критерии готовности:
- [ ] Все sensitive поля зашифрованы в БД
- [ ] Decrypt прозрачен для application code
- [ ] Backfill migration завершена
Оценка: 16h
Story: STORY-177

[TASK-0912] DevOps: KMS и key rotation
Тип: DevOps
Описание: Настройка AWS KMS или HashiCorp Vault для master key management. Quarterly key rotation cron: generate new key → re-encrypt all data → deactivate old key. Monitoring: alert если rotation не выполнена > 7 дней после scheduled date.
Критерии готовности:
- [ ] KMS интегрирован
- [ ] Key rotation автоматизирован
Оценка: 8h
Story: STORY-177

[TASK-0913] QA: Тестирование encryption
Тип: QA
Описание: Проверка: direct DB access не показывает plaintext PII, key rotation не ломает decrypt, performance impact < 10%, backup/restore работает с encrypted data.
Критерии готовности:
- [ ] Plaintext PII не обнаруживается в raw DB dump
- [ ] Performance impact измерен и < 10%
Оценка: 4h
Story: STORY-177

---

## [EPIC-23] Smart Fraud (AI/ML v2)

**Цель:** Реализовать ML-модель для fraud scoring обученную на собственных данных платформы, behavioural analysis, velocity checks и shared fraud intelligence между клиентами (opt-in) для максимальной точности обнаружения фрода.

**Метрика успеха:**
- ML fraud model accuracy > 92% (precision) и > 88% (recall)
- False positive rate < 5% (vs 10-15% у rule-based системы EPIC-07)
- 20%+ клиентов opt-in в shared fraud intelligence в первые 6 месяцев

**Приоритет:** P3 (Scale)
**Зависит от:** EPIC-07 (Anti-Fraud System), EPIC-10 (Analytics Dashboard v1)
**Размер:** XL (3+ мес)

---

### Stories:

**[STORY-178] ML Fraud Scoring Model**
Как Network Admin, я хочу получать ML-based fraud score для каждого лида, обученный на данных платформы, чтобы значительно точнее выявлять фрод по сравнению с rule-based проверками.

Acceptance Criteria:
- [ ] AC1: ML-модель (gradient boosting — XGBoost/LightGBM) обученная на features: IP risk score, email domain age, phone type, registration time pattern, GEO-IP mismatch, device fingerprint, historical affiliate fraud rate
- [ ] AC2: Fraud score 0-100 с breakdown по feature contribution (SHAP values)
- [ ] AC3: Inference latency < 50ms (P95) для не-блокирующей проверки в pipeline
- [ ] AC4: Model retraining: автоматический weekly retrain на новых данных с A/B evaluation
- [ ] AC5: Model performance dashboard: accuracy, precision, recall, F1, ROC-AUC, drift detection
- [ ] AC6: Manual feedback loop: оператор может пометить lead как "confirmed fraud" / "false positive" для улучшения модели
- [ ] AC7: Fallback на rule-based scoring при недоступности ML-сервиса

Story Points: 13
Приоритет: Must
Epic: EPIC-23

#### Tasks для STORY-178:

[TASK-0914] Backend: ML training pipeline
Тип: Backend
Описание: Data extraction: SQL query для формирования training dataset (features + label: is_fraud). Feature engineering: 15+ features из таблиц leads, fraud_checks, ip_data, affiliates. Training: XGBoost with hyperparameter tuning (Optuna). Model serialization (ONNX for cross-platform inference). Weekly cron: retrain → evaluate on holdout → if performance >= previous model → deploy. Storage: model artifacts в S3 с versioning.
Критерии готовности:
- [ ] Training pipeline автоматизирован
- [ ] Model version tracking работает
- [ ] Weekly retrain с auto-deployment при improvement
Оценка: 16h
Story: STORY-178

[TASK-0915] Backend: ML inference сервис
Тип: Backend
Описание: Inference microservice (Go + ONNX Runtime или Python FastAPI): POST /predict с feature vector → fraud_score + feature_contributions (SHAP). Latency < 50ms (P95). Health check endpoint. Circuit breaker: при failure → fallback на rule-based scoring из EPIC-07. Caching: identical feature vectors → cached score (TTL 5 мин).
Критерии готовности:
- [ ] Inference latency < 50ms P95
- [ ] SHAP values для каждого prediction
- [ ] Fallback на rule-based работает
Оценка: 16h
Story: STORY-178

[TASK-0916] Frontend: ML fraud score UI и feedback loop
Тип: Frontend
Описание: В профиле лида: ML fraud score (circular gauge 0-100), feature contribution bar chart (SHAP — какие факторы повысили/понизили score). Кнопки: "Confirm Fraud" / "False Positive" для feedback. Admin dashboard: model performance metrics (accuracy, precision, recall graphs over time), drift alert.
Критерии готовности:
- [ ] Fraud score с SHAP breakdown отображается
- [ ] Feedback buttons работают
- [ ] Model dashboard показывает метрики
Оценка: 8h
Story: STORY-178

[TASK-0917] DevOps: ML infrastructure
Тип: DevOps
Описание: ML inference deployment: Kubernetes pod с GPU (optional) или CPU optimized. Auto-scaling: 2-10 pods based on request rate. Model storage: S3 + model registry. Training environment: scheduled job (weekly) с GPU access. Monitoring: inference latency, error rate, model version, prediction distribution.
Критерии готовности:
- [ ] Inference service deployed и auto-scales
- [ ] Training job runs weekly
- [ ] Monitoring dashboards настроены
Оценка: 8h
Story: STORY-178

[TASK-0918] QA: Тестирование ML fraud scoring
Тип: QA
Описание: Validation на holdout dataset: precision > 92%, recall > 88%. A/B тестирование: ML vs rule-based на 10% трафика. Тестирование: fallback, latency SLA, SHAP correctness, feedback loop impact на retrain.
Критерии готовности:
- [ ] Model metrics на holdout соответствуют target
- [ ] A/B test показывает improvement
Оценка: 8h
Story: STORY-178

---

**[STORY-179] Behavioural Analysis**
Как Network Admin, я хочу чтобы система анализировала поведенческие паттерны лидов (скорость заполнения формы, mouse movements, navigation pattern), чтобы обнаруживать ботов и автоматизацию.

Acceptance Criteria:
- [ ] AC1: JavaScript SDK (< 15KB gzipped) для сбора behavioural data: time on page, form fill speed, mouse movement entropy, scroll pattern, keystroke dynamics
- [ ] AC2: Behavioural score (0-100): bot probability на основе собранных сигналов
- [ ] AC3: Real-time analysis: behavioural score доступен в течение 2 сек после submit формы
- [ ] AC4: Dashboard: distribution of behavioural scores, top suspicious patterns, bot vs human ratio
- [ ] AC5: Integration с ML fraud model: behavioural features как дополнительные inputs
- [ ] AC6: Privacy-compliant: no PII в behavioural data, anonymized storage

Story Points: 13
Приоритет: Should
Epic: EPIC-23

#### Tasks для STORY-179:

[TASK-0919] Frontend: Behavioural tracking SDK
Тип: Frontend
Описание: JavaScript SDK (npm package + CDN): автоматический сбор events (mousemove, keydown, scroll, form interactions). Feature extraction: time_on_page, avg_keystroke_interval, mouse_movement_entropy (Shannon entropy), scroll_depth_pattern, form_fill_speed_per_field. Payload: anonymized features only (no PII). Beacon API для отправки при form submit. Size < 15KB gzipped.
Критерии готовности:
- [ ] SDK собирает все behavioural features
- [ ] Bundle size < 15KB gzipped
- [ ] No PII в collected data
Оценка: 16h
Story: STORY-179

[TASK-0920] Backend: Behavioural analysis engine
Тип: Backend
Описание: Endpoint POST /api/v1/behavioural/analyze — принимает feature vector от SDK. Scoring: ensemble rule-based + lightweight model (isolation forest для anomaly detection). Output: behavioural_score (0-100), signals (list of detected anomalies: "too_fast_fill", "no_mouse_movement", "linear_scroll"). Storage: таблица behavioural_events (lead_id, score, signals, features JSONB). Integration: behavioural_score как input в ML fraud model (STORY-178).
Критерии готовности:
- [ ] Scoring возвращается < 2 сек
- [ ] Integration с ML fraud model работает
- [ ] Anonymized storage подтверждено
Оценка: 16h
Story: STORY-179

[TASK-0921] Frontend: Behavioural analytics dashboard
Тип: Frontend
Описание: Dashboard: distribution histogram behavioural scores, pie chart bot/human/suspicious, top anomaly patterns table. Lead profile: behavioural score с signal breakdown.
Критерии готовности:
- [ ] Dashboard отображает все метрики
- [ ] Lead profile включает behavioural data
Оценка: 4h
Story: STORY-179

[TASK-0922] QA: Тестирование behavioural analysis
Тип: QA
Описание: Симуляция: реальный пользователь vs бот (Selenium/Puppeteer) vs headless browser. Проверка что бот получает score > 70, реальный user < 30. False positive rate < 5%.
Критерии готовности:
- [ ] Bot vs human differentiation работает
- [ ] False positive rate < 5%
Оценка: 8h
Story: STORY-179

---

**[STORY-180] Velocity Checks**
Как Affiliate Manager, я хочу настроить velocity rules (лимиты на частоту событий), чтобы автоматически блокировать подозрительные паттерны (слишком много лидов с одного IP, одинаковые данные за короткий период).

Acceptance Criteria:
- [ ] AC1: Настраиваемые velocity rules: max N events per time window per dimension
- [ ] AC2: Dimensions: IP, email domain, phone prefix, affiliate, GEO, device fingerprint
- [ ] AC3: Time windows: 1 мин, 5 мин, 1 час, 24 часа
- [ ] AC4: Actions при срабатывании: block, flag for review, reduce score, notify
- [ ] AC5: Предустановленные rule templates: "Max 3 leads from same IP per 5 min", "Max 10 same email domain per hour", "Max 1 lead with same phone per 24h"
- [ ] AC6: Real-time counter с sliding window (не fixed buckets)
- [ ] AC7: Dashboard: top triggered rules, velocity violations trend

Story Points: 8
Приоритет: Must
Epic: EPIC-23

#### Tasks для STORY-180:

[TASK-0923] Backend: Velocity check engine
Тип: Backend
Описание: Redis-based sliding window counters: key pattern velocity:{company_id}:{dimension}:{value}:{window}. MULTI/EXEC для atomic increment + TTL. Таблица velocity_rules: id, company_id, dimension, window_seconds, max_count, action (block/flag/reduce_score/notify). Rule evaluation при каждом lead intake: iterate all active rules. Таблица velocity_violations: lead_id, rule_id, current_count, triggered_at.
Критерии готовности:
- [ ] Sliding window counters работают атомарно
- [ ] Rule evaluation < 10ms для 20 правил
- [ ] Actions применяются корректно
Оценка: 16h
Story: STORY-180

[TASK-0924] Frontend: UI управления velocity rules
Тип: Frontend
Описание: Страница "Velocity Rules": таблица активных правил с toggle on/off. Форма создания: dimension dropdown, window selector, max count input, action selector. Template gallery с one-click apply. Dashboard: top triggered rules (bar chart), violations timeline (line chart).
Критерии готовности:
- [ ] CRUD правил работает
- [ ] Templates применяются одним кликом
- [ ] Dashboard показывает violations
Оценка: 8h
Story: STORY-180

[TASK-0925] QA: Тестирование velocity checks
Тип: QA
Описание: Симуляция: burst трафика с одного IP, duplicate emails, sliding window edge cases (boundary conditions), multiple rules на одном лиде.
Критерии готовности:
- [ ] Sliding window корректен при boundary conditions
- [ ] Multiple rules оцениваются корректно
Оценка: 4h
Story: STORY-180

---

**[STORY-181] Shared Fraud Intelligence**
Как Network Admin, я хочу подключиться к shared fraud database (opt-in), где клиенты платформы делятся данными о мошеннических лидах, чтобы блокировать известных фродеров до того как они отправят лид.

Acceptance Criteria:
- [ ] AC1: Opt-in модель: клиент явно включает sharing (default OFF), может отключить в любой момент
- [ ] AC2: Shared data: анонимизированные fraud signals (hashed email, hashed phone, IP, fraud_score > 80, reasons) — без PII в открытом виде
- [ ] AC3: Lookup при intake: проверка hashed email/phone/IP против shared database, если match — boost fraud_score на +20
- [ ] AC4: Contribution stats: сколько fraud records компания поделилась vs сколько заблокировала благодаря shared data
- [ ] AC5: Minimum 3 independent reports перед добавлением в shared blocklist (предотвращение abuse)
- [ ] AC6: Dispute mechanism: если лид попал в shared blocklist ошибочно — возможность оспорить
- [ ] AC7: Latency: shared lookup < 20ms (P95)

Story Points: 13
Приоритет: Should
Epic: EPIC-23

#### Tasks для STORY-181:

[TASK-0926] Backend: Shared fraud database
Тип: Backend
Описание: Отдельная БД/schema для shared fraud data. Таблица shared_fraud_signals: id, hash_email (SHA-256), hash_phone (SHA-256), ip_address, fraud_score, reasons (array), report_count, first_reported_at, last_reported_at, is_confirmed (report_count >= 3). При fraud_score > 80 и opt-in — автоматический submit hashed signals. Lookup: Bloom filter в Redis для O(1) check + PostgreSQL для details. Dispute: таблица fraud_disputes.
Критерии готовности:
- [ ] Shared data содержит только hashed/anonymized данные
- [ ] Lookup < 20ms P95
- [ ] 3-report threshold работает
Оценка: 16h
Story: STORY-181

[TASK-0927] Backend: Opt-in management и contribution API
Тип: Backend
Описание: Company setting: shared_fraud_enabled (bool). API: POST /api/v1/fraud/shared/opt-in, POST /api/v1/fraud/shared/opt-out. Contribution endpoint: автоматический submit при fraud detection. Stats endpoint: GET /api/v1/fraud/shared/stats (contributed_count, blocked_count, match_rate). Dispute: POST /api/v1/fraud/shared/dispute.
Критерии готовности:
- [ ] Opt-in/out работает мгновенно
- [ ] Stats корректны
- [ ] Dispute flow реализован
Оценка: 8h
Story: STORY-181

[TASK-0928] Frontend: Shared Fraud Intelligence UI
Тип: Frontend
Описание: Settings → Fraud Intelligence: toggle opt-in с объяснением что sharing означает. Stats dashboard: contribution/block count, pie chart "blocked by shared intel vs own rules". Dispute form: lead_id + reason → submit. Indication в lead profile: "Matched shared fraud database" badge.
Критерии готовности:
- [ ] Opt-in toggle с clear explanation
- [ ] Stats dashboard информативен
- [ ] Dispute flow работает
Оценка: 4h
Story: STORY-181

[TASK-0929] QA: Тестирование shared fraud intelligence
Тип: QA
Описание: Тестирование: opt-in/out, data submission, lookup accuracy, 3-report threshold, dispute flow, privacy (no plaintext PII в shared DB), cross-company isolation (company A не видит data source company B).
Критерии готовности:
- [ ] Privacy подтверждена (no PII leaks)
- [ ] Cross-company isolation работает
Оценка: 8h
Story: STORY-181

---

**[STORY-182] Fraud Analytics и Reporting**
Как Network Admin, я хочу видеть комплексный отчёт по fraud-активности: тренды, top sources, effectiveness антифрод системы, чтобы оптимизировать настройки.

Acceptance Criteria:
- [ ] AC1: Dashboard "Fraud Overview": total blocked (count + %), fraud score distribution histogram, trend line (30 дней)
- [ ] AC2: Top fraud sources: таблица affiliates с наибольшим % fraud leads (sortable)
- [ ] AC3: Fraud reasons breakdown: pie chart по типам (IP risk, email invalid, VOIP, velocity, ML score, behavioural)
- [ ] AC4: False positive tracking: % leads помеченных как false positive после manual review
- [ ] AC5: Cost savings estimate: (blocked_fraud_leads * avg_CPA) — оценка сэкономленных средств
- [ ] AC6: Comparison: fraud rate this period vs previous period

Story Points: 5
Приоритет: Should
Epic: EPIC-23

#### Tasks для STORY-182:

[TASK-0930] Backend: Fraud analytics API
Тип: Backend
Описание: Endpoint GET /api/v1/analytics/fraud с параметрами: date_range, group_by (affiliate/reason/GEO/broker). Агрегации: blocked_count, blocked_rate, score_distribution (histogram buckets), false_positive_rate, cost_savings (blocked * avg_cpa from settings). Compare with previous period.
Критерии готовности:
- [ ] Все метрики рассчитываются корректно
- [ ] Время ответа < 3 сек
Оценка: 8h
Story: STORY-182

[TASK-0931] Frontend: Fraud analytics dashboard
Тип: Frontend
Описание: Dashboard: KPI карточки (blocked count, fraud rate, false positive rate, cost savings). Score distribution histogram. Fraud reasons pie chart. Top sources table. Trend line chart с comparison overlay.
Критерии готовности:
- [ ] Все визуализации работают
- [ ] Comparison с предыдущим периодом показывает delta
Оценка: 8h
Story: STORY-182

[TASK-0932] QA: Тестирование fraud analytics
Тип: QA
Описание: Верификация расчётов. Проверка edge cases: 0 fraud, 100% fraud, no false positives, no cost savings config.
Критерии готовности:
- [ ] Расчёты верифицированы
Оценка: 2h
Story: STORY-182

---

**[STORY-183] Fraud Rule A/B Testing**
Как Network Admin, я хочу тестировать новые fraud rules на части трафика перед полным развёртыванием, чтобы избежать увеличения false positives.

Acceptance Criteria:
- [ ] AC1: Создание A/B теста: baseline rules (A) vs new rules (B), split % (default 10% на B)
- [ ] AC2: Automatic allocation: каждый lead назначается в группу A или B случайным образом (consistent hash по lead_id)
- [ ] AC3: Comparison dashboard: group A vs group B по метрикам: block rate, false positive rate, revenue impact
- [ ] AC4: Statistical significance indicator: зелёная галка когда sample size достаточен для 95% confidence
- [ ] AC5: One-click promote: применить winning rules ко всему трафику
- [ ] AC6: Rollback: одним кликом вернуться к baseline

Story Points: 8
Приоритет: Could
Epic: EPIC-23

#### Tasks для STORY-183:

[TASK-0933] Backend: Fraud A/B testing engine
Тип: Backend
Описание: Таблица fraud_ab_tests: id, company_id, name, baseline_rules (JSONB), variant_rules (JSONB), split_percent, status (draft/running/completed), started_at, completed_at. Allocation: consistent hash(lead_id) % 100 < split_percent → variant. Result tracking: таблица fraud_ab_results с per-group metrics. Statistical significance: chi-squared test для block rates.
Критерии готовности:
- [ ] A/B allocation работает consistent
- [ ] Statistical significance рассчитывается
- [ ] Promote/rollback работает
Оценка: 16h
Story: STORY-183

[TASK-0934] Frontend: Fraud A/B test management
Тип: Frontend
Описание: Создание теста: rule editor для baseline и variant, split slider. Running test dashboard: side-by-side metrics comparison, significance indicator (green check / gray "collecting data"). Action buttons: promote winner, stop test, rollback.
Критерии готовности:
- [ ] Side-by-side comparison информативен
- [ ] Significance indicator корректен
Оценка: 8h
Story: STORY-183

[TASK-0935] QA: Тестирование fraud A/B
Тип: QA
Описание: Тестирование: consistent allocation (same lead → same group), significance calculation, promote/rollback, concurrent tests.
Критерии готовности:
- [ ] Allocation consistency подтверждена на 10K leads
Оценка: 4h
Story: STORY-183
