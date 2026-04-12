## [EPIC-01] Lead Intake API

Цель: Надежный и быстрый прием лидов от аффилейтов через API с валидацией, дедупликацией и нормализацией, чтобы downstream-роутинг работал на чистых данных.  
Метрика успеха:
- `POST /api/v1/leads` p95 latency `< 350ms`, p99 `< 800ms`
- Валидные лиды принимаются с успешностью `>= 99.5%`
- Доля нераспознанных дублей `< 3%`
- Время первой успешной интеграции нового аффилейта `< 1 рабочий день`
Приоритет: P0 (MVP)  
Зависит от: [EPIC-04], [EPIC-06]  
Оценка: L (1-3 мес)

### Stories

[STORY-001] Single Lead Intake Endpoint  
Как Developer, я хочу отправлять один лид через защищенный REST endpoint, чтобы быстро подключить источник трафика.

Acceptance Criteria:
- [ ] AC1: Реализован `POST /api/v1/leads` с `Authorization: Bearer <api_key>`, `Content-Type: application/json`, optional `X-Idempotency-Key`.
- [ ] AC2: Request schema: `external_lead_id:string<=64`, `first_name:string<=80`, `last_name:string<=80`, `email:email|null`, `phone:string|null`, `geo:string`, `ip:ipv4|ipv6`, `landing_url:url`, `sub_id:string<=128`, `utm:object`, `event_ts:ISO-8601`; минимум одно из `email/phone` обязательно.
- [ ] AC3: Success response `202` за `<350ms p95`: `{"lead_id":"uuid","status":"received","trace_id":"uuid","received_at":"ISO-8601"}`.
- [ ] AC4: Error codes и формат: `400 malformed_json`, `401 unauthorized`, `403 key_disabled_or_ip_denied`, `413 payload_too_large`, `422 validation_error`, `429 rate_limited`, `500 internal_error`; в каждом ответе есть `trace_id`.
- [ ] AC5: Security: TLS1.2+, rate limit `120 req/min` на ключ, burst `30`, max payload `64KB`, SQL/script injection строки отклоняются.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: -

#### Tasks для STORY-001:

[TASK-0001] Реализовать endpoint `POST /api/v1/leads`  
Тип: Backend  
Описание: Добавить контроллер, auth middleware по API key, базовую валидацию payload и унифицированные ответы ошибок.  
Критерии готовности (DoD):
- [ ] Endpoint возвращает `202/4xx/5xx` согласно контракту.
- [ ] OpenAPI-спека обновлена и проходит contract test.
Оценка: 16h  
Story: [STORY-001]

[TASK-0002] Экран “Send Test Lead” в админке  
Тип: Frontend  
Описание: Форма отправки тестового лида для проверки ключа и payload с отображением `trace_id` и тела ответа.  
Критерии готовности (DoD):
- [ ] Форма валидирует обязательные поля до отправки.
- [ ] Ответы `202/4xx` отображаются с читаемыми сообщениями.
Оценка: 8h  
Story: [STORY-001]

[TASK-0003] Wireframe API Intake + Error states  
Тип: Design  
Описание: Спроектировать состояние формы (idle/loading/success/error/rate-limited).  
Критерии готовности (DoD):
- [ ] Есть wireframe desktop + mobile.
- [ ] Есть спецификация компонентов для dev handoff.
Оценка: 4h  
Story: [STORY-001]

[TASK-0004] Тест-кейсы intake auth/validation  
Тип: QA  
Описание: Подготовить и автоматизировать happy-path и негативные сценарии (пустой JSON, неверный ключ, большие payload).  
Критерии готовности (DoD):
- [ ] Покрыты коды `202,400,401,403,413,422,429`.
- [ ] Regression suite запускается в CI.
Оценка: 8h  
Story: [STORY-001]

[TASK-0005] Настроить API gateway rate limits  
Тип: DevOps  
Описание: Включить rate limiting и request size limit на ingress/API gateway, добавить log correlation по `trace_id`.  
Критерии готовности (DoD):
- [ ] `120 req/min` и burst `30` применяются по API key.
- [ ] Метрики 429 и latency экспортируются в мониторинг.
Оценка: 8h  
Story: [STORY-001]

---

[STORY-002] Versioned Schema Validation  
Как Developer, я хочу версионирование контракта intake API, чтобы обновления не ломали интеграции.

Acceptance Criteria:
- [ ] AC1: Поддержан header `X-API-Version`, default `2026-01`; неподдерживаемая версия возвращает `400 unsupported_version`.
- [ ] AC2: Реализован `GET /api/v1/schema/leads?version=2026-01` с JSON Schema и примерами.
- [ ] AC3: В strict-режиме неизвестные поля дают `422 unknown_field`, в compat-режиме поля игнорируются и логируются.
- [ ] AC4: Любая breaking change требует минимум 90 дней deprecation window и warning header `X-API-Deprecation`.
- [ ] AC5: Время валидации схемы добавляет не более `50ms p95` к intake запросу.

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001]

#### Tasks для STORY-002:

[TASK-0006] Реестр схем и версия контракта  
Тип: Backend  
Описание: Добавить schema registry, выбор валидатора по версии/режиму strict|compat, warning headers для deprecated полей.  
Критерии готовности (DoD):
- [ ] `X-API-Version` корректно обрабатывается.
- [ ] Есть unit tests для strict/compat и unsupported version.
Оценка: 8h  
Story: [STORY-002]

[TASK-0007] UI schema browser  
Тип: Frontend  
Описание: Экран просмотра схемы по версиям и быстрых примеров payload.  
Критерии готовности (DoD):
- [ ] Можно переключать версии.
- [ ] Видны required/optional поля и ограничения.
Оценка: 4h  
Story: [STORY-002]

[TASK-0008] Дизайн API schema docs  
Тип: Design  
Описание: Оформить единый шаблон отображения схемы, deprecated полей и предупреждений.  
Критерии готовности (DoD):
- [ ] Утверждены компоненты для таблиц полей.
- [ ] Прописаны состояния deprecation.
Оценка: 2h  
Story: [STORY-002]

[TASK-0009] Contract tests для версий  
Тип: QA  
Описание: Добавить автоматические contract tests на `2026-01` и backward compatibility.  
Критерии готовности (DoD):
- [ ] Тесты падают при breaking changes.
- [ ] Негативные сценарии unknown field покрыты.
Оценка: 8h  
Story: [STORY-002]

[TASK-0010] CI guard для API contract  
Тип: DevOps  
Описание: В CI добавить проверку diff OpenAPI и блокировку merge при неразрешенных breaking changes.  
Критерии готовности (DoD):
- [ ] Pipeline валидирует OpenAPI.
- [ ] Breaking diff требует explicit override.
Оценка: 4h  
Story: [STORY-002]

---

[STORY-003] Deduplication Rules Engine  
Как Network Admin, я хочу исключать дубли до роутинга, чтобы не платить дважды за один и тот же лид.

Acceptance Criteria:
- [ ] AC1: Дедуп по `external_lead_id + affiliate_id` в окне `1-90` дней, default `30` дней.
- [ ] AC2: Fallback дедуп по fingerprint `sha256(email_norm|phone_e164|geo)`; при отсутствии email/phone — `ip+landing_url` в окне `10 минут` с низкой уверенностью.
- [ ] AC3: При дубле API возвращает `409 duplicate_lead` с `existing_lead_id`, `matched_by`, `first_seen_at`.
- [ ] AC4: Кросс-аффилейт дедуп выключен по умолчанию; включается флагом tenant-level.
- [ ] AC5: Дополнительная latency от дедупа `< 120ms p95`.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-002]

#### Tasks для STORY-003:

[TASK-0011] Сервис дедупликации и индексы  
Тип: Backend  
Описание: Добавить таблицу dedupe fingerprints, составные индексы и decision logic.  
Критерии готовности (DoD):
- [ ] Возвращается `409` при дублях по всем заявленным стратегиям.
- [ ] Индексы обеспечивают lookup `<30ms p95`.
Оценка: 16h  
Story: [STORY-003]

[TASK-0012] UI настройки дедупа в affiliate профиле  
Тип: Frontend  
Описание: Поля `dedupe_window_days`, `dedupe_strategy`, `cross_affiliate_dedupe` с валидацией.  
Критерии готовности (DoD):
- [ ] Валидация диапазона `1-90` реализована.
- [ ] Изменения сохраняются и отображают текущую версию настроек.
Оценка: 8h  
Story: [STORY-003]

[TASK-0013] Дизайн блока dedupe policy  
Тип: Design  
Описание: Сделать UX для объяснения разницы стратегий и рисков false positive.  
Критерии готовности (DoD):
- [ ] Есть текстовые подсказки в UI-kit.
- [ ] Есть состояние предупреждения для агрессивных настроек.
Оценка: 4h  
Story: [STORY-003]

[TASK-0014] Матрица QA по дублям  
Тип: QA  
Описание: Набор кейсов на exact duplicate, fuzzy duplicate, cross-affiliate, edge пустых полей.  
Критерии готовности (DoD):
- [ ] Покрыты >20 сценариев дедупа.
- [ ] Проверены false positive/false negative граничные кейсы.
Оценка: 8h  
Story: [STORY-003]

[TASK-0015] Кэш fingerprint lookup  
Тип: DevOps  
Описание: Поднять Redis-кэш для dedupe lookup и метрик hit/miss.  
Критерии готовности (DoD):
- [ ] Cache hit ratio доступен в мониторинге.
- [ ] Degrade mode при недоступности Redis покрыт.
Оценка: 8h  
Story: [STORY-003]

---

[STORY-004] Data Normalization Pipeline  
Как Network Admin, я хочу нормализовать телефон/email/GEO, чтобы downstream-правила работали на единых форматах.

Acceptance Criteria:
- [ ] AC1: Телефон нормализуется в E.164; невалидный номер -> `422 phone_invalid`.
- [ ] AC2: Email нормализуется (`trim`, lowercase, punycode домен), синтаксическая валидация RFC; пустая строка считается отсутствием поля.
- [ ] AC3: GEO приводится к ISO-3166-1 alpha-2; синонимы (`UK/U.K./GBR`) -> `GB`.
- [ ] AC4: При mismatch payload GEO vs IP GEO сохраняется warning `geo_mismatch`, но лид принимается при валидном payload.
- [ ] AC5: В response и БД сохраняются `raw` и `normalized` поля, плюс `normalization_warnings[]`.

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-002]

#### Tasks для STORY-004:

[TASK-0016] Реализовать normalization pipeline  
Тип: Backend  
Описание: Добавить трансформацию phone/email/geo и запись в отдельные normalized колонки.  
Критерии готовности (DoD):
- [ ] Нормализация применяется до дедупа.
- [ ] Ошибки/предупреждения возвращаются в единообразном формате.
Оценка: 16h  
Story: [STORY-004]

[TASK-0017] Визуализация raw vs normalized в lead details  
Тип: Frontend  
Описание: В карточке лида показать исходные и нормализованные значения с warning badges.  
Критерии готовности (DoD):
- [ ] Поля читаемы на desktop/mobile.
- [ ] Warning `geo_mismatch` виден без перезагрузки.
Оценка: 8h  
Story: [STORY-004]

[TASK-0018] Дизайн normalization badges  
Тип: Design  
Описание: Создать визуальный паттерн “transformed / warning / invalid”.  
Критерии готовности (DoD):
- [ ] Компоненты добавлены в UI kit.
- [ ] Контраст соответствует accessibility AA.
Оценка: 2h  
Story: [STORY-004]

[TASK-0019] Автотесты normalization edge cases  
Тип: QA  
Описание: Тестировать международные форматы телефонов, unicode email, неизвестные GEO алиасы.  
Критерии готовности (DoD):
- [ ] Покрыты минимум 30 кейсов.
- [ ] Проверено поведение при пустых/NULL значениях.
Оценка: 8h  
Story: [STORY-004]

[TASK-0020] Обновление справочников GEO/phone metadata  
Тип: DevOps  
Описание: Наладить регулярный update справочников стран и телефонных префиксов.  
Критерии готовности (DoD):
- [ ] Еженедельный update job работает.
- [ ] Rollback версии справочника возможен за `<10 мин`.
Оценка: 4h  
Story: [STORY-004]

---

[STORY-005] Idempotency & Safe Retries  
Как Media Buyer, я хочу безопасно ретраить запросы без создания дублей, чтобы не терять лиды при сетевых сбоях.

Acceptance Criteria:
- [ ] AC1: При передаче `X-Idempotency-Key` (до 64 символов) повтор в течение `24 часов` возвращает тот же `status code` и тот же `lead_id`.
- [ ] AC2: Если тот же ключ отправлен с другим payload hash, возвращается `409 idempotency_mismatch`.
- [ ] AC3: При отсутствии ключа обработка продолжается стандартно через дедуп.
- [ ] AC4: Повторный ответ по idempotency выдается за `<100ms p95`.
- [ ] AC5: Idempotency store очищается TTL-job без удаления актуальных записей.

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001]

#### Tasks для STORY-005:

[TASK-0021] Хранилище idempotency keys  
Тип: Backend  
Описание: Таблица/кэш ключей с payload hash, response snapshot и TTL 24h.  
Критерии готовности (DoD):
- [ ] Повторы отдают исходный ответ без повторной бизнес-обработки.
- [ ] Mismatch корректно возвращает `409`.
Оценка: 8h  
Story: [STORY-005]

[TASK-0022] UI-подсказки по retry стратегии  
Тип: Frontend  
Описание: В API-интерфейсе добавить инструкции “когда и как ретраить” и отображение idempotency результата.  
Критерии готовности (DoD):
- [ ] Отображается “replayed response” маркер.
- [ ] Документация доступна в 1 клик из формы теста.
Оценка: 4h  
Story: [STORY-005]

[TASK-0023] Дизайн retry state  
Тип: Design  
Описание: Состояния “new / replayed / mismatch”.  
Критерии готовности (DoD):
- [ ] Компоненты согласованы с error palette.
- [ ] Готов handoff со всеми текстами.
Оценка: 2h  
Story: [STORY-005]

[TASK-0024] QA сценарии сетевых повторов  
Тип: QA  
Описание: Проверить таймауты клиента, повторы с тем же/другим телом, гонки параллельных запросов.  
Критерии готовности (DoD):
- [ ] Покрыты race conditions для 10 параллельных retry.
- [ ] Нет ложных дублей при корректных повторах.
Оценка: 8h  
Story: [STORY-005]

[TASK-0025] Monitoring idempotency store  
Тип: DevOps  
Описание: Метрики размера store, expired keys, replay rate, алерты на рост ошибок.  
Критерии готовности (DoD):
- [ ] Dashboards доступны on-call.
- [ ] Alert при replay failure >1% за 10 минут.
Оценка: 4h  
Story: [STORY-005]

---

[STORY-006] Bulk Lead Intake  
Как Developer, я хочу загружать лиды пакетами, чтобы снижать overhead при массовой отправке трафика.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/leads/bulk` принимает до `100` лидов или `2MB` тела; превышение -> `413`.
- [ ] AC2: До `50` элементов синхронный ответ `207 Multi-Status`; больше `50` -> `202` с `job_id`.
- [ ] AC3: `GET /api/v1/leads/bulk/{job_id}` возвращает статус `queued|processing|done|failed` и per-item результаты.
- [ ] AC4: Частичный успех поддержан: валидные лиды принимаются, невалидные возвращают собственные коды ошибок.
- [ ] AC5: Время обработки 100 лидов в sync path `<2s p95`.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-005]

#### Tasks для STORY-006:

[TASK-0026] Backend bulk endpoint + worker  
Тип: Backend  
Описание: Реализовать пакетную обработку с синхронным и асинхронным режимом.  
Критерии готовности (DoD):
- [ ] `207` и `202+job_id` работают по порогу 50.
- [ ] Per-item результат содержит `index`, `status_code`, `lead_id|error_code`.
Оценка: 16h  
Story: [STORY-006]

[TASK-0027] Bulk upload tester UI  
Тип: Frontend  
Описание: Загрузка JSON/CSV, предпросмотр и запуск bulk send, отображение прогресса job.  
Критерии готовности (DoD):
- [ ] Поддержан polling job status.
- [ ] Ошибки по строкам отображаются с фильтром.
Оценка: 8h  
Story: [STORY-006]

[TASK-0028] Дизайн таблицы результатов bulk  
Тип: Design  
Описание: UX для large-table ошибок и успешных элементов.  
Критерии готовности (DoD):
- [ ] Есть вариант для 100+ строк.
- [ ] Учтены mobile breakpoints.
Оценка: 4h  
Story: [STORY-006]

[TASK-0029] QA нагрузочные и частичные сценарии  
Тип: QA  
Описание: Тесты на смешанные валидные/невалидные пакеты, таймауты и повторную отправку batch.  
Критерии готовности (DoD):
- [ ] Проверены partial success и idempotency batch-level.
- [ ] Нагрузочный тест на 1,000 лидов проходит без потерь.
Оценка: 8h  
Story: [STORY-006]

[TASK-0030] Queue infra и autoscaling workers  
Тип: DevOps  
Описание: Настроить очередь задач, DLQ, autoscaling воркеров по backlog depth.  
Критерии готовности (DoD):
- [ ] Worker scale-up происходит при backlog >5,000.
- [ ] DLQ мониторится и алертится.
Оценка: 8h  
Story: [STORY-006]

---

[STORY-007] Affiliate Intake Settings Management  
Как Affiliate Manager, я хочу гибко настраивать intake-правила по аффилейту, чтобы контролировать качество входящего трафика.

Acceptance Criteria:
- [ ] AC1: Реализованы `GET/PUT /api/v1/affiliates/{affiliate_id}/intake-settings`.
- [ ] AC2: Request schema: `required_fields[]`, `allowed_geo[]`, `dedupe_window_days`, `max_rpm`, `accept_schedule{timezone,days,hours}`.
- [ ] AC3: Валидация: `max_rpm 10-2000`, `allowed_geo <=100`, `dedupe_window_days 1-90`; при ошибке `422`.
- [ ] AC4: RBAC: edit разрешен только `Network Admin` и назначенному `Affiliate Manager`; иначе `403`.
- [ ] AC5: Изменения применяются к intake pipeline за `<60s`.

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001]

#### Tasks для STORY-007:

[TASK-0031] API для intake settings  
Тип: Backend  
Описание: CRUD-конфигурация intake настроек на уровне аффилейта с versioning.  
Критерии готовности (DoD):
- [ ] Реализованы `GET/PUT` и optimistic locking.
- [ ] Изменения аудируются с `changed_by` и `changed_at`.
Оценка: 8h  
Story: [STORY-007]

[TASK-0032] UI формы intake policy  
Тип: Frontend  
Описание: Форма настройки required fields, GEO листа, rate limit и schedule.  
Критерии готовности (DoD):
- [ ] Есть client-side валидации диапазонов.
- [ ] Save/Discard поведение предсказуемо и тестируемо.
Оценка: 8h  
Story: [STORY-007]

[TASK-0033] Дизайн конфигуратора intake policy  
Тип: Design  
Описание: Простая структура формы для уменьшения ошибок конфигурации.  
Критерии готовности (DoD):
- [ ] Макет с подсказками “почему это важно”.
- [ ] Согласованы empty/error/success состояния.
Оценка: 4h  
Story: [STORY-007]

[TASK-0034] QA RBAC + config propagation  
Тип: QA  
Описание: Проверить права доступа и скорость применения настроек.  
Критерии готовности (DoD):
- [ ] Проверены роли Admin/Affiliate Manager/Team Lead.
- [ ] Фактическое применение конфигов укладывается в `<60s`.
Оценка: 8h  
Story: [STORY-007]

[TASK-0035] Кэш-конфигурация и инвалидатор  
Тип: DevOps  
Описание: Настроить кэш настроек и безопасную инвалидацию после update.  
Критерии готовности (DoD):
- [ ] Нет stale config дольше 60 секунд.
- [ ] Метрика config cache freshness доступна.
Оценка: 4h  
Story: [STORY-007]

---

[STORY-008] Sandbox Intake + Error Catalog  
Как Developer, я хочу тестовый режим и каталог ошибок, чтобы интегрироваться без риска для production-данных.

Acceptance Criteria:
- [ ] AC1: Поддержан sandbox режим через `POST /api/v1/leads?mode=sandbox` и/или sandbox host.
- [ ] AC2: Sandbox принимает только test API keys; production key в sandbox -> `403`.
- [ ] AC3: Ответы детерминированы по `external_lead_id` (один input -> один output).
- [ ] AC4: Реализован `GET /api/v1/errors` с `error_code`, `http_status`, `description`, `fix_hint`.
- [ ] AC5: Sandbox данные изолированы от production и удаляются через `7 дней`.

Story Points: 3  
Приоритет: Should  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-002]

#### Tasks для STORY-008:

[TASK-0036] Sandbox mode backend  
Тип: Backend  
Описание: Изолированная ветка обработки intake без записи в production lead tables.  
Критерии готовности (DoD):
- [ ] Sandbox ключи и prod ключи разделены.
- [ ] Выдача детерминированных mock outcomes реализована.
Оценка: 8h  
Story: [STORY-008]

[TASK-0037] UI error catalog + sandbox toggle  
Тип: Frontend  
Описание: Встроить выбор режима и страницу справочника ошибок.  
Критерии готовности (DoD):
- [ ] Каталог поддерживает поиск по `error_code`.
- [ ] Toggle sandbox/prod явно виден и безопасен.
Оценка: 4h  
Story: [STORY-008]

[TASK-0038] Дизайн sandbox UX  
Тип: Design  
Описание: Визуально отделить sandbox от production, чтобы исключить ошибки пользователя.  
Критерии готовности (DoD):
- [ ] Есть “sandbox badge” во всех relevant экранах.
- [ ] Цветовая дифференциация согласована.
Оценка: 2h  
Story: [STORY-008]

[TASK-0039] QA изоляции sandbox  
Тип: QA  
Описание: Проверить, что sandbox лиды не попадают в production таблицы/метрики.  
Критерии готовности (DoD):
- [ ] Проверены все основные endpoint пути.
- [ ] Retention purge отрабатывает через 7 дней.
Оценка: 4h  
Story: [STORY-008]

[TASK-0040] Отдельные secrets и env для sandbox  
Тип: DevOps  
Описание: Разделить переменные окружения, ключи и логи sandbox/prod.  
Критерии готовности (DoD):
- [ ] Secret scopes разделены.
- [ ] Логи sandbox не смешиваются с prod индексом.
Оценка: 4h  
Story: [STORY-008]

---

[STORY-009] Intake Monitoring & Alerts  
Как Team Lead, я хочу видеть качество intake в реальном времени, чтобы быстро реагировать на деградацию трафика.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/intake/metrics?from&to&group_by=affiliate|geo|status&interval=1m|5m|1h` возвращает `accepted`, `rejected`, `duplicates`, `p95_latency`.
- [ ] AC2: Data freshness `<60s`, запрос за последние 7 дней отрабатывает `<1.5s p95`.
- [ ] AC3: Конфигурируемые алерты: `reject_rate >15% за 10 мин` и `p95_latency >700ms за 5 мин`.
- [ ] AC4: RBAC фильтрует метрики по workspace/team; кросс-tenant доступ запрещен.
- [ ] AC5: Ошибка пустого диапазона дат -> `400 invalid_date_range`.

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-006]

#### Tasks для STORY-009:

[TASK-0041] Метрики intake aggregation API  
Тип: Backend  
Описание: Агрегации по минутам/часам, группировки по affiliate/geo/status.  
Критерии готовности (DoD):
- [ ] Endpoint возвращает корректные бины.
- [ ] `p95_latency` считается на стороне сервера корректно.
Оценка: 8h  
Story: [STORY-009]

[TASK-0042] Realtime intake dashboard  
Тип: Frontend  
Описание: KPI tiles + time-series charts с фильтрами и drill to table.  
Критерии готовности (DoD):
- [ ] Автообновление каждые 30 секунд.
- [ ] Доступны фильтры affiliate/GEO/status.
Оценка: 8h  
Story: [STORY-009]

[TASK-0043] Дизайн мониторингового дашборда  
Тип: Design  
Описание: Компоновка KPI и графиков с акцентом на аномалии.  
Критерии готовности (DoD):
- [ ] Подготовлен UI kit для time-series компонентов.
- [ ] Состояния no-data/error/loading покрыты.
Оценка: 4h  
Story: [STORY-009]

[TASK-0044] QA accuracy тесты метрик  
Тип: QA  
Описание: Сверка агрегатов с исходными данными и проверка прав доступа.  
Критерии готовности (DoD):
- [ ] Расхождение агрегатов не более 0.1%.
- [ ] RBAC тесты блокируют чужие workspace.
Оценка: 8h  
Story: [STORY-009]

[TASK-0045] Мониторинг и алертинг  
Тип: DevOps  
Описание: Настроить alert rules и каналы уведомлений для SRE/Team Lead.  
Критерии готовности (DoD):
- [ ] Алёрты reject_rate/latency активны и тестово срабатывают.
- [ ] Есть runbook ссылки в alert payload.
Оценка: 4h  
Story: [STORY-009]

---

[STORY-010] Audit Trail & PII Masking  
Как Network Admin, я хочу полную трассировку обработки лида и маскирование PII в логах, чтобы соблюсти безопасность и разбор инцидентов.

Acceptance Criteria:
- [ ] AC1: Для каждого запроса фиксируются события `received`, `validated`, `deduped`, `normalized`, `queued` с `trace_id` и timestamp.
- [ ] AC2: Логи маскируют PII: email local-part hash, phone masked до последних 4 цифр, IP анонимизируется (`/24` IPv4, `/56` IPv6).
- [ ] AC3: `GET /api/v1/leads/{lead_id}/events` доступен только ролям с правом просмотра данного workspace.
- [ ] AC4: Audit retention: `180 дней` hot + `365 дней` archive.
- [ ] AC5: Обнаружение tamper (hash-chain mismatch) поднимает алерт `<1 мин`.

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001]

#### Tasks для STORY-010:

[TASK-0046] Audit event store + hash chain  
Тип: Backend  
Описание: Реализовать immutable audit log с последовательным hash chaining.  
Критерии готовности (DoD):
- [ ] Все этапы intake пишутся в audit stream.
- [ ] Hash-chain проверка доступна через сервисную команду.
Оценка: 8h  
Story: [STORY-010]

[TASK-0047] UI таймлайн событий лида  
Тип: Frontend  
Описание: В карточке лида отобразить аудит-таймлайн с фильтром этапов.  
Критерии готовности (DoD):
- [ ] Таймлайн сортируется по времени и показывает actor/system.
- [ ] PII в UI отображается по policy роли.
Оценка: 8h  
Story: [STORY-010]

[TASK-0048] Дизайн audit timeline  
Тип: Design  
Описание: Компонент таймлайна с фокусом на расследование инцидентов.  
Критерии готовности (DoD):
- [ ] Готова спецификация статусов событий.
- [ ] Отдельно описаны privacy-бейджи.
Оценка: 2h  
Story: [STORY-010]

[TASK-0049] QA тесты privacy и access control  
Тип: QA  
Описание: Проверить маскирование PII и ограничения доступа к audit endpoints.  
Критерии готовности (DoD):
- [ ] Нет утечек raw PII в application logs.
- [ ] 403 корректно выдается для неавторизованных ролей.
Оценка: 8h  
Story: [STORY-010]

[TASK-0050] Лог-пайплайн retention policies  
Тип: DevOps  
Описание: Настроить lifecycle hot/archive и контроль неизменности audit-данных.  
Критерии готовности (DoD):
- [ ] Политики 180d/365d применены.
- [ ] Проверка целостности запускается ежедневно.
Оценка: 8h  
Story: [STORY-010]

---

[STORY-011] Intake Outcome Webhooks  
Как Affiliate Manager, я хочу получать callback о результате intake, чтобы быстро видеть ошибки интеграции и реакцию системы.

Acceptance Criteria:
- [ ] AC1: Реализован `POST /api/v1/affiliates/{id}/webhooks/intake` для настройки `url`, `secret`, `events[]`.
- [ ] AC2: События `intake.accepted|rejected|duplicate` отправляются в течение `<5s p95` после обработки.
- [ ] AC3: Подпись запроса: `X-Signature: sha256=<hmac>`; timestamp header обязателен.
- [ ] AC4: Retry: 5 попыток (`10s,1m,5m,15m,1h`), затем DLQ; `GET /api/v1/affiliates/{id}/webhooks/deliveries` показывает историю.
- [ ] AC5: При HTTP `410` endpoint auto-paused и создается alert.

Story Points: 3  
Приоритет: Should  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-007]

#### Tasks для STORY-011:

[TASK-0051] Webhook dispatcher и HMAC signing  
Тип: Backend  
Описание: Очередь доставок webhook, подпись payload, retry policy, delivery logs API.  
Критерии готовности (DoD):
- [ ] Подпись проверяется по документации.
- [ ] Retry и DLQ отрабатывают по графику.
Оценка: 8h  
Story: [STORY-011]

[TASK-0052] UI настройки webhooks и delivery logs  
Тип: Frontend  
Описание: Экран включения событий, тест-пинга и таблицы доставок.  
Критерии готовности (DoD):
- [ ] Можно активировать/пауза endpoint.
- [ ] Таблица показывает статус и code ответа получателя.
Оценка: 8h  
Story: [STORY-011]

[TASK-0053] Дизайн webhook settings  
Тип: Design  
Описание: Форма с безопасным вводом secret и понятным статусом доставки.  
Критерии готовности (DoD):
- [ ] Есть UX для rotate secret.
- [ ] Есть визуализация paused/degraded состояния.
Оценка: 2h  
Story: [STORY-011]

[TASK-0054] QA webhook integration tests  
Тип: QA  
Описание: Проверить подпись, retry, DLQ, auto-pause на 410 и edge таймаутов.  
Критерии готовности (DoD):
- [ ] Эмулятор webhook consumer используется в автотестах.
- [ ] Покрыты таймауты и 5xx ответы.
Оценка: 8h  
Story: [STORY-011]

[TASK-0055] Egress networking и DLQ observability  
Тип: DevOps  
Описание: Настроить стабильный исходящий трафик, retries и мониторинг DLQ размера.  
Критерии готовности (DoD):
- [ ] Алерт на DLQ growth >100 событий/10 минут.
- [ ] Egress retries не влияют на intake latency SLO.
Оценка: 4h  
Story: [STORY-011]

---

[STORY-012] Intake Performance & High Availability  
Как Network Admin, я хочу гарантированную производительность intake under load, чтобы система выдерживала рекламные пики без потери лидов.

Acceptance Criteria:
- [ ] AC1: Sustained test `300 RPS` на 15 минут: p95 `<500ms`, 5xx `<0.5%`.
- [ ] AC2: Burst test `1000 RPS` на 60 секунд: потеря валидных лидов `0`, `429 <=2%`.
- [ ] AC3: При недоступности downstream сервисов intake принимает лид (`202`) и ставит в очередь, backlog дренируется `<10 минут` после восстановления.
- [ ] AC4: SLO availability `99.95%` monthly, burn-rate alert в течение `2 минут`.
- [ ] AC5: Disaster drill: failover проходит с `RTO <5 минут`, `RPO = 0` для принятых лидов.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-01]  
Зависит от: [STORY-001], [STORY-006], [STORY-009]

#### Tasks для STORY-012:

[TASK-0056] Backpressure + graceful degradation  
Тип: Backend  
Описание: Ограничение конкурентных обработчиков, fallback в очередь, безопасное поведение при деградации.  
Критерии готовности (DoD):
- [ ] При перегрузке нет неконтролируемых 5xx всплесков.
- [ ] Очередь принимает лиды без потерь.
Оценка: 16h  
Story: [STORY-012]

[TASK-0057] UI SLO status panel  
Тип: Frontend  
Описание: Панель статуса intake SLO, backlog depth и текущего error rate.  
Критерии готовности (DoD):
- [ ] Данные обновляются каждые 30 секунд.
- [ ] Видны состояния healthy/degraded/outage.
Оценка: 4h  
Story: [STORY-012]

[TASK-0058] Дизайн SLO/incident компонентов  
Тип: Design  
Описание: Карточки SLO и incident banner для операционного экрана.  
Критерии готовности (DoD):
- [ ] Визуальные приоритеты инцидента согласованы.
- [ ] Компоненты адаптированы под mobile width.
Оценка: 2h  
Story: [STORY-012]

[TASK-0059] Performance + failover QA suite  
Тип: QA  
Описание: Нагрузочные сценарии и аварийные drill-тесты с фиксацией метрик SLO.  
Критерии готовности (DoD):
- [ ] Есть отчет по 300/1000 RPS тестам.
- [ ] Failover сценарий подтверждает `RTO<5m`.
Оценка: 16h  
Story: [STORY-012]

[TASK-0060] Infra autoscaling и DR-runbook  
Тип: DevOps  
Описание: Горизонтальное масштабирование API/worker, multi-AZ конфиг, runbook на аварии.  
Критерии готовности (DoD):
- [ ] Autoscaling срабатывает по CPU и queue depth.
- [ ] DR-runbook протестирован в staging.
Оценка: 16h  
Story: [STORY-012]
