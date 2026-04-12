## [EPIC-03] Broker Integration Layer

Цель: Быстро подключать брокеров через шаблоны и унифицированный слой интеграции, чтобы масштабировать дистрибуцию без кастомной разработки под каждый оффер.

Метрика успеха:
- 200+ шаблонов брокеров в каталоге на старте
- Time-to-first-successful-connection `<2h`
- Успешная синхронизация статусов `>=99%` за 5 минут

Приоритет: P0 (MVP)  
Зависит от: [EPIC-01], [EPIC-06]  
Оценка: XL (3+ мес)

### Stories

[STORY-021] Broker Template Registry  
Как Network Admin, я хочу выбирать брокера из каталога шаблонов, чтобы быстро запускать интеграцию.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/brokers/templates` поддерживает фильтры `country`, `vertical`, `protocol`, `status`.
- [ ] AC2: Карточка шаблона содержит required fields, auth method, rate limits и sample payload.
- [ ] AC3: Поиск по названию возвращает результат за `<300ms p95`.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-03]  
Зависит от: [STORY-013]

#### Tasks для STORY-021:

[TASK-0101] API каталога шаблонов  
Тип: Backend  
Описание: Реализовать endpoint с фильтрами и пагинацией.  
Критерии готовности (DoD):
- [ ] Пагинация и сортировка документированы в OpenAPI.
Оценка: 8h  
Story: [STORY-021]

[TASK-0102] UI каталог интеграций  
Тип: Frontend  
Описание: Таблица/карточки шаблонов и поиск.  
Критерии готовности (DoD):
- [ ] Фильтры применяются без перезагрузки страницы.
Оценка: 8h  
Story: [STORY-021]

[TASK-0103] Дизайн карточки шаблона  
Тип: Design  
Описание: Макет детальной карточки интеграции.  
Критерии готовности (DoD):
- [ ] Есть состояния loading/empty/error.
Оценка: 4h  
Story: [STORY-021]

[TASK-0104] QA каталога шаблонов  
Тип: QA  
Описание: Проверить фильтры, поиск и корректность metadata.  
Критерии готовности (DoD):
- [ ] Покрыты сценарии пустой выдачи и невалидного фильтра.
Оценка: 4h  
Story: [STORY-021]

[TASK-0105] Индексация шаблонов  
Тип: DevOps  
Описание: Настроить индекс для быстрых поисковых запросов.  
Критерии готовности (DoD):
- [ ] p95 поиска соблюдает SLA <300ms.
Оценка: 4h  
Story: [STORY-021]

---

[STORY-022] Field Mapping Constructor  
Как Developer, я хочу настраивать маппинг полей между CRM и брокером, чтобы не писать кастомный код.

Acceptance Criteria:
- [ ] AC1: `PUT /api/v1/brokers/{id}/mapping` принимает map `crm_field -> broker_field`, transforms (`concat`, `format_phone`, `default`).
- [ ] AC2: Валидация обязательных broker fields перед publish (`422 required_field_missing`).
- [ ] AC3: Preview payload показывает итоговый JSON и маскирует чувствительные поля.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-03]  
Зависит от: [STORY-021]

#### Tasks для STORY-022:

[TASK-0106] Mapping engine backend  
Тип: Backend  
Описание: Реализовать маппинг и transform-функции.  
Критерии готовности (DoD):
- [ ] Поддержаны минимум 5 стандартных трансформаций.
Оценка: 8h  
Story: [STORY-022]

[TASK-0107] UI mapping builder  
Тип: Frontend  
Описание: Форма сопоставления полей с preview payload.  
Критерии готовности (DoD):
- [ ] Ошибки валидации отображаются по полям.
Оценка: 8h  
Story: [STORY-022]

[TASK-0108] Design mapping UX  
Тип: Design  
Описание: Схема экрана маппинга и предпросмотра.  
Критерии готовности (DoD):
- [ ] Предусмотрены состояния conflict и missing.
Оценка: 4h  
Story: [STORY-022]

[TASK-0109] QA mapping regression  
Тип: QA  
Описание: Тесты на обязательные поля, null values и трансформации.  
Критерии готовности (DoD):
- [ ] Покрыто не менее 20 mapping-case сценариев.
Оценка: 8h  
Story: [STORY-022]

[TASK-0110] Secrets management  
Тип: DevOps  
Описание: Безопасное хранение broker credentials и rotate policy.  
Критерии готовности (DoD):
- [ ] Ключи не попадают в application logs.
Оценка: 4h  
Story: [STORY-022]

---

[STORY-023] Connection Test & Health Check
Как Affiliate Manager, я хочу тестировать соединение с брокером до запуска, чтобы избежать потери лидов.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/brokers/{id}/test-connection` возвращает `latency_ms`, `auth_status`, `sample_response`.
- [ ] AC2: Таймаут теста `<=5s`, при превышении `504 broker_timeout`.
- [ ] AC3: Health check выполняется каждые 30 секунд и отображается в UI.

Story Points: 5
Приоритет: Must
Epic: [EPIC-03]
Зависит от: [STORY-022]

#### Tasks для STORY-023:

[TASK-0111] Test-connection endpoint
Тип: Backend
Описание: Реализовать безопасный тест коннекта к брокеру.
Критерии готовности (DoD):
- [ ] Ответ включает latency и классификацию ошибки.
Оценка: 8h
Story: [STORY-023]

[TASK-0112] UI кнопка Test Connection
Тип: Frontend
Описание: Добавить кнопку теста и вывод результата в модальном окне.
Критерии готовности (DoD):
- [ ] Видны success/fail и raw reason.
Оценка: 4h
Story: [STORY-023]

[TASK-0113] Design health indicators
Тип: Design
Описание: Компоненты статуса health для broker list.
Критерии готовности (DoD):
- [ ] Есть статусы healthy/degraded/down.
Оценка: 2h
Story: [STORY-023]

[TASK-0114] QA network-failure tests
Тип: QA
Описание: Проверить timeout, DNS error, auth fail сценарии.
Критерии готовности (DoD):
- [ ] Ошибки классифицируются корректно.
Оценка: 4h
Story: [STORY-023]

[TASK-0115] Scheduled health jobs
Тип: DevOps
Описание: Настроить периодические health checks и алерты.
Критерии готовности (DoD):
- [ ] Алерт срабатывает при 3 подряд fail check.
Оценка: 4h
Story: [STORY-023]

---

[STORY-024] Status Sync from Brokers
Как Media Buyer, я хочу получать обновления статуса лида от брокера, чтобы видеть актуальную конверсию.

Acceptance Criteria:
- [ ] AC1: Поддержаны webhook и polling режимы через `POST /api/v1/brokers/{id}/status-sync`.
- [ ] AC2: Статусы нормализуются в внутренние значения `new|contacted|qualified|ftd|rejected`.
- [ ] AC3: Доставка обновлений в CRM `<60s` после получения от брокера.

Story Points: 8
Приоритет: Must
Epic: [EPIC-03]
Зависит от: [STORY-023]

#### Tasks для STORY-024:

[TASK-0116] Status ingestion pipeline
Тип: Backend
Описание: Прием webhook/poll, нормализация и апдейт lead status.
Критерии готовности (DoD):
- [ ] Поддержаны idempotent updates по `broker_event_id`.
Оценка: 8h
Story: [STORY-024]

[TASK-0117] UI настройки режима sync
Тип: Frontend
Описание: Переключатель webhook/polling и частоты polling.
Критерии готовности (DoD):
- [ ] Валидация интервала polling 1..60 мин.
Оценка: 4h
Story: [STORY-024]

[TASK-0118] Design status mapping panel
Тип: Design
Описание: UI карта соответствий broker status -> internal status.
Критерии готовности (DoD):
- [ ] Есть preview примеров маппинга.
Оценка: 4h
Story: [STORY-024]

[TASK-0119] QA sync integrity tests
Тип: QA
Описание: Тесты на дубли, out-of-order events, пропуски polling окон.
Критерии готовности (DoD):
- [ ] Потерянные события корректно добираются при retry.
Оценка: 8h
Story: [STORY-024]

[TASK-0120] Queue + retry infra
Тип: DevOps
Описание: Очередь статусов и retry policy для внешних сбоев.
Критерии готовности (DoD):
- [ ] DLQ включен и мониторится.
Оценка: 4h
Story: [STORY-024]

---

[STORY-025] Integration Error Handling & SLA
Как Network Admin, я хочу видеть ошибки интеграций и SLA брокеров, чтобы управлять качеством подключений.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/brokers/{id}/errors?from&to` возвращает error rate, timeout rate, top error codes.
- [ ] AC2: Алерт при `error_rate >5% за 10 минут` или `latency_p95 >3s`.
- [ ] AC3: RBAC ограничивает просмотр ошибок только в пределах workspace.

Story Points: 5
Приоритет: Should
Epic: [EPIC-03]
Зависит от: [STORY-024]

#### Tasks для STORY-025:

[TASK-0121] Error analytics API
Тип: Backend
Описание: Агрегировать ошибки интеграции по broker/template.
Критерии готовности (DoD):
- [ ] Доступны метрики по 1m/5m/1h интервалам.
Оценка: 8h
Story: [STORY-025]

[TASK-0122] UI SLA dashboard broker
Тип: Frontend
Описание: Графики latency/error-rate по каждому брокеру.
Критерии готовности (DoD):
- [ ] Есть фильтрация по периоду и кодам ошибок.
Оценка: 4h
Story: [STORY-025]

[TASK-0123] Design error dashboard
Тип: Design
Описание: Визуальные компоненты для SLA мониторинга.
Критерии готовности (DoD):
- [ ] Приоритетные алерты визуально выделены.
Оценка: 2h
Story: [STORY-025]

[TASK-0124] QA SLA calculations
Тип: QA
Описание: Проверка корректности расчетов rate/latency.
Критерии готовности (DoD):
- [ ] Расхождение с сырыми логами <0.1%.
Оценка: 4h
Story: [STORY-025]

[TASK-0125] Alerting rules
Тип: DevOps
Описание: Настроить алерты интеграционных деградаций.
Критерии готовности (DoD):
- [ ] Алерты отправляются в NOC канал.
Оценка: 4h
Story: [STORY-025]

---

## [EPIC-04] Affiliate Management

Цель: Централизованно управлять аффилейтами, ключами и постбеками для контролируемого и масштабируемого intake.

Метрика успеха:
- Создание нового аффилейта `<10 мин`
- 100% ключей ротируются без downtime
- Доставка postback `>=99.5%`

Приоритет: P0 (MVP)  
Зависит от: [EPIC-06]  
Оценка: L (1-3 мес)

### Stories

[STORY-026] Affiliate Profile Management  
Как Affiliate Manager, я хочу создавать и редактировать профили аффилейтов, чтобы вести структуру партнеров.

Acceptance Criteria:
- [ ] AC1: `POST/GET/PUT /api/v1/affiliates` с полями `name`, `status`, `manager_id`, `default_geo`, `notes`.
- [ ] AC2: Статусы `active|paused|blocked`; blocked запрещает intake и возвращает `403 affiliate_blocked`.
- [ ] AC3: Все изменения профиля пишутся в audit log.

Story Points: 5
Приоритет: Must
Epic: [EPIC-04]
Зависит от: [STORY-036]

#### Tasks для STORY-026:

[TASK-0126] Affiliate CRUD backend
Тип: Backend
Описание: Реализовать API профиля и статусов аффилейта.
Критерии готовности (DoD):
- [ ] Статусы корректно влияют на intake authorization.
Оценка: 8h
Story: [STORY-026]

[TASK-0127] UI affiliate profile form
Тип: Frontend
Описание: Форма и список аффилейтов с фильтром по статусу.
Критерии готовности (DoD):
- [ ] Поиск и фильтрация работают без перезагрузки.
Оценка: 4h
Story: [STORY-026]

[TASK-0128] Design affiliate card
Тип: Design
Описание: Макет профиля аффилейта и статуса.
Критерии готовности (DoD):
- [ ] Есть состояния active/paused/blocked.
Оценка: 2h
Story: [STORY-026]

[TASK-0129] QA profile workflow
Тип: QA
Описание: Проверка создания/редактирования/блокировки аффилейта.
Критерии готовности (DoD):
- [ ] Проверены права доступа по ролям.
Оценка: 4h
Story: [STORY-026]

[TASK-0130] Audit log retention
Тип: DevOps
Описание: Настроить хранение и индексацию audit по аффилейтам.
Критерии готовности (DoD):
- [ ] История изменений доступна за 365 дней.
Оценка: 4h
Story: [STORY-026]

---

[STORY-027] Affiliate API Key Lifecycle
Как Developer, я хочу управлять API-ключами аффилейтов, чтобы безопасно интегрировать источники.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/affiliates/{id}/keys` создает key с scope и optional IP whitelist.
- [ ] AC2: `POST /api/v1/affiliates/{id}/keys/{key_id}/rotate` выполняет zero-downtime ротацию с overlap 24h.
- [ ] AC3: `DELETE .../keys/{key_id}` отзывает ключ мгновенно (`<30s` propagation).

Story Points: 8
Приоритет: Must
Epic: [EPIC-04]
Зависит от: [STORY-026]

#### Tasks для STORY-027:

[TASK-0131] Key management API
Тип: Backend
Описание: Выпуск, ротация, отзыв ключей и хранение хэшей.
Критерии готовности (DoD):
- [ ] Raw ключ показывается только один раз при создании.
Оценка: 8h
Story: [STORY-027]

[TASK-0132] UI ключей и ротации
Тип: Frontend
Описание: Экран ключей с датой истечения и кнопкой rotate/revoke.
Критерии готовности (DoD):
- [ ] Есть подтверждение для revoke.
Оценка: 4h
Story: [STORY-027]

[TASK-0133] Design security prompts
Тип: Design
Описание: Безопасный UX генерации и копирования ключа.
Критерии готовности (DoD):
- [ ] Добавлены предупреждения о невосстановимости raw key.
Оценка: 2h
Story: [STORY-027]

[TASK-0134] QA key security tests
Тип: QA
Описание: Проверка ротации, отзыва и IP whitelist.
Критерии готовности (DoD):
- [ ] Проверены race-condition кейсы при rotate.
Оценка: 8h
Story: [STORY-027]

[TASK-0135] Secret store integration
Тип: DevOps
Описание: Интеграция хранения ключей с secret manager.
Критерии готовности (DoD):
- [ ] Ключи зашифрованы в покое и при передаче.
Оценка: 4h
Story: [STORY-027]

---

[STORY-028] Postback Configuration
Как Affiliate Manager, я хочу настроить postback URL и параметры, чтобы получать статусы лидов в свой трекер.

Acceptance Criteria:
- [ ] AC1: `PUT /api/v1/affiliates/{id}/postbacks` поддерживает `url`, `events[]`, `vars[]`, `secret`, `retry_policy`.
- [ ] AC2: Поддержка минимум 20 переменных (`sub_id`, `status`, `payout`, `geo`, `lead_id`, ...).
- [ ] AC3: Retry policy: 5 попыток и DLQ, как в webhook стандарте платформы.

Story Points: 5
Приоритет: Must
Epic: [EPIC-04]
Зависит от: [STORY-026], [STORY-027]

#### Tasks для STORY-028:

[TASK-0136] Postback delivery backend
Тип: Backend
Описание: Реализовать конфигурацию и отправку postback событий.
Критерии готовности (DoD):
- [ ] Поддержана HMAC подпись payload.
Оценка: 8h
Story: [STORY-028]

[TASK-0137] UI postback builder
Тип: Frontend
Описание: Конструктор URL с переменными и тестовой отправкой.
Критерии готовности (DoD):
- [ ] Доступен preview итогового URL.
Оценка: 4h
Story: [STORY-028]

[TASK-0138] Design variable picker
Тип: Design
Описание: Компонент выбора переменных postback.
Критерии готовности (DoD):
- [ ] Есть поиск и группировка переменных.
Оценка: 2h
Story: [STORY-028]

[TASK-0139] QA postback delivery
Тип: QA
Описание: Проверить формат payload, подпись и retry.
Критерии готовности (DoD):
- [ ] Подтверждено 99.5%+ успешных доставок при нормальном consumer.
Оценка: 8h
Story: [STORY-028]

[TASK-0140] Outbound queue tuning
Тип: DevOps
Описание: Очередь исходящих postback и мониторинг DLQ.
Критерии готовности (DoD):
- [ ] Есть алерт на рост DLQ.
Оценка: 4h
Story: [STORY-028]

---

[STORY-029] Affiliate Traffic Restrictions
Как Network Admin, я хочу ограничивать трафик по GEO/IP/расписанию на уровне аффилейта, чтобы снижать риск некачественных лидов.

Acceptance Criteria:
- [ ] AC1: `PUT /api/v1/affiliates/{id}/restrictions` принимает `allowed_geo`, `blocked_ip_cidr`, `schedule`, `max_rpm`.
- [ ] AC2: Нарушение ограничения возвращает `403 restriction_violation` + `reason_code`.
- [ ] AC3: Изменения вступают в силу за `<60s`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-04]
Зависит от: [STORY-026]

#### Tasks для STORY-029:

[TASK-0141] Restrictions policy engine
Тип: Backend
Описание: Реализовать проверку ограничений в intake pipeline.
Критерии готовности (DoD):
- [ ] Возвращается корректный `reason_code`.
Оценка: 8h
Story: [STORY-029]

[TASK-0142] UI restrictions form
Тип: Frontend
Описание: Форма GEO/IP/schedule/rpm лимитов.
Критерии готовности (DoD):
- [ ] CIDR и GEO валидируются на клиенте.
Оценка: 4h
Story: [STORY-029]

[TASK-0143] Design restrictions UX
Тип: Design
Описание: Компоновка формы ограничений с подсказками.
Критерии готовности (DoD):
- [ ] Есть предупреждение о блокирующих правилах.
Оценка: 2h
Story: [STORY-029]

[TASK-0144] QA policy enforcement
Тип: QA
Описание: Проверить enforcement и propagation <=60s.
Критерии готовности (DoD):
- [ ] Покрыты edge-case пересечения правил.
Оценка: 8h
Story: [STORY-029]

[TASK-0145] Config cache invalidation
Тип: DevOps
Описание: Быстрая инвалидация кэша ограничений.
Критерии готовности (DoD):
- [ ] Нет stale-правил дольше 60 сек.
Оценка: 4h
Story: [STORY-029]

---

[STORY-030] Affiliate Performance Snapshot
Как Team Lead, я хочу видеть performance snapshot по аффилейтам, чтобы быстро выявлять проблемные источники.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/affiliates/performance?from&to` возвращает `leads`, `reject_rate`, `ftd`, `pnl_estimate`.
- [ ] AC2: Поддержан drill-down в конкретного аффилейта.
- [ ] AC3: Время ответа `<1s p95` для окна 30 дней.

Story Points: 3
Приоритет: Should
Epic: [EPIC-04]
Зависит от: [STORY-028], [STORY-029]

#### Tasks для STORY-030:

[TASK-0146] Performance aggregate endpoint
Тип: Backend
Описание: Агрегации KPI по аффилейтам.
Критерии готовности (DoD):
- [ ] Поддержаны сортировка и top-N.
Оценка: 8h
Story: [STORY-030]

[TASK-0147] UI affiliate KPI table
Тип: Frontend
Описание: Таблица performance со сортировкой и drill-down.
Критерии готовности (DoD):
- [ ] Фильтры периода и GEO работают.
Оценка: 4h
Story: [STORY-030]

[TASK-0148] Design KPI table
Тип: Design
Описание: Компоненты KPI-таблицы и цветовые индикаторы.
Критерии готовности (DoD):
- [ ] Отрицательные тренды визуально отмечены.
Оценка: 2h
Story: [STORY-030]

[TASK-0149] QA aggregation accuracy
Тип: QA
Описание: Сверка агрегатов с raw событиями.
Критерии готовности (DoD):
- [ ] Допустимое расхождение <0.1%.
Оценка: 4h
Story: [STORY-030]

[TASK-0150] Read replica tuning
Тип: DevOps
Описание: Настроить read-replica для отчетных запросов.
Критерии готовности (DoD):
- [ ] p95 ответа <1s соблюдается.
Оценка: 4h
Story: [STORY-030]

---

## [EPIC-05] Lead Management UI

Цель: Дать операционной команде быстрый и удобный интерфейс управления лидами, статусами и массовыми действиями.

Метрика успеха:
- Lead search time `<3s`
- Массовые операции 10k лидов без ошибок
- Экспорт отчетов `<60s`

Приоритет: P0 (MVP)  
Зависит от: [EPIC-01], [EPIC-03], [EPIC-06]  
Оценка: L (1-3 мес)

### Stories

[STORY-031] Leads Table with Advanced Filters
Как Team Lead, я хочу фильтровать лиды по ключевым параметрам, чтобы быстро находить нужные сегменты.

Acceptance Criteria:
- [ ] AC1: Фильтры: `status`, `affiliate`, `broker`, `geo`, `created_at`, `source_sub_id`.
- [ ] AC2: Пагинация `50/100/200` строк; сортировка по `created_at`, `updated_at`, `payout`.
- [ ] AC3: Поисковый запрос отрабатывает `<800ms p95` на 1 млн записей.

Story Points: 8
Приоритет: Must
Epic: [EPIC-05]
Зависит от: [STORY-009], [STORY-024]

#### Tasks для STORY-031:

[TASK-0151] Leads query API
Тип: Backend
Описание: Реализовать endpoint выборки лидов с фильтрами и сортировкой.
Критерии готовности (DoD):
- [ ] Поддержаны составные фильтры и пагинация.
Оценка: 8h
Story: [STORY-031]

[TASK-0152] UI таблица лидов
Тип: Frontend
Описание: Построить data-grid с фильтрами и server-side pagination.
Критерии готовности (DoD):
- [ ] Состояния loading/empty/error реализованы.
Оценка: 8h
Story: [STORY-031]

[TASK-0153] Design data-grid
Тип: Design
Описание: Макет таблицы и панели фильтров.
Критерии готовности (DoD):
- [ ] Поддержаны desktop/tablet breakpoints.
Оценка: 4h
Story: [STORY-031]

[TASK-0154] QA filter matrix
Тип: QA
Описание: Тесты фильтров, сортировки и пагинации.
Критерии готовности (DoD):
- [ ] Проверены комбинации минимум 30 фильтр-кейсов.
Оценка: 8h
Story: [STORY-031]

[TASK-0155] DB indexing for leads table
Тип: DevOps
Описание: Индексы под наиболее частые фильтры.
Критерии готовности (DoD):
- [ ] p95 запроса <800ms на тестовом объеме.
Оценка: 8h
Story: [STORY-031]

---

[STORY-032] Lead Profile Timeline
Как Affiliate Manager, я хочу видеть полную историю лида, чтобы разбирать причины отклонений и потерь.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/leads/{lead_id}` возвращает профиль + timeline событий.
- [ ] AC2: Timeline содержит этапы intake, fraud, routing, broker updates, resend.
- [ ] AC3: Доступ к PII ограничен по роли; маскирование для неавторизованных ролей.

Story Points: 5
Приоритет: Must
Epic: [EPIC-05]
Зависит от: [STORY-010], [STORY-024]

#### Tasks для STORY-032:

[TASK-0156] Lead details API
Тип: Backend
Описание: Endpoint детальной карточки лида и событийной ленты.
Критерии готовности (DoD):
- [ ] Возвращаются связанные сущности routing/fraud.
Оценка: 8h
Story: [STORY-032]

[TASK-0157] UI карточка лида
Тип: Frontend
Описание: Экран lead profile с timeline и статусными бейджами.
Критерии готовности (DoD):
- [ ] Секции загружаются лениво без блокировки страницы.
Оценка: 8h
Story: [STORY-032]

[TASK-0158] Design lead profile
Тип: Design
Описание: Макет карточки лида и таймлайна.
Критерии готовности (DoD):
- [ ] Различимы системные и ручные изменения.
Оценка: 4h
Story: [STORY-032]

[TASK-0159] QA timeline integrity
Тип: QA
Описание: Проверить полноту событий и порядок отображения.
Критерии готовности (DoD):
- [ ] Нет пропусков и дубликатов в timeline.
Оценка: 4h
Story: [STORY-032]

[TASK-0160] Object storage for event attachments
Тип: DevOps
Описание: Хранение вложений событий (при необходимости) с lifecycle policy.
Критерии готовности (DoD):
- [ ] Политика хранения и удаления задокументирована.
Оценка: 4h
Story: [STORY-032]

---

[STORY-033] Bulk Lead Operations
Как Network Admin, я хочу массово менять статус/теги и запускать resend, чтобы ускорить операционные процессы.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/leads/bulk-actions` поддерживает `set_status`, `add_tag`, `resend`, `assign_owner`.
- [ ] AC2: До 10,000 лидов на операцию через async job с `job_id`.
- [ ] AC3: Все bulk-действия пишутся в audit log и могут быть отменены в течение 5 минут (кроме resend).

Story Points: 8
Приоритет: Must
Epic: [EPIC-05]
Зависит от: [STORY-006], [STORY-019]

#### Tasks для STORY-033:

[TASK-0161] Bulk action backend
Тип: Backend
Описание: Реализовать async bulk jobs и валидацию операций.
Критерии готовности (DoD):
- [ ] Поддержан undo window для обратимых операций.
Оценка: 8h
Story: [STORY-033]

[TASK-0162] UI массовых операций
Тип: Frontend
Описание: Multi-select в таблице и панель bulk actions.
Критерии готовности (DoD):
- [ ] Виден прогресс выполнения job.
Оценка: 8h
Story: [STORY-033]

[TASK-0163] Design bulk action panel
Тип: Design
Описание: UX для подтверждения рискованных массовых действий.
Критерии готовности (DoD):
- [ ] Есть guardrails и warning тексты.
Оценка: 2h
Story: [STORY-033]

[TASK-0164] QA bulk regression
Тип: QA
Описание: Тесты на 10k записей, rollback и RBAC.
Критерии готовности (DoD):
- [ ] Нет частичных silent failures.
Оценка: 8h
Story: [STORY-033]

[TASK-0165] Worker autoscaling for bulk jobs
Тип: DevOps
Описание: Автоскейлинг воркеров bulk-очереди.
Критерии готовности (DoD):
- [ ] SLA выполнения 10k job <5 минут соблюдается.
Оценка: 4h
Story: [STORY-033]

---

[STORY-034] Lead Export
Как Finance Manager, я хочу экспортировать лиды в CSV/Excel, чтобы проводить внешнюю сверку и отчетность.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/leads/export` поддерживает форматы `csv` и `xlsx`.
- [ ] AC2: Экспорт до 1 млн строк в async job с уведомлением о готовности.
- [ ] AC3: PII в экспорте зависит от роли; без права доступа поля маскируются.

Story Points: 5
Приоритет: Must
Epic: [EPIC-05]
Зависит от: [STORY-031], [STORY-032]

#### Tasks для STORY-034:

[TASK-0166] Export service backend
Тип: Backend
Описание: Сервис формирования файлов по фильтрам.
Критерии готовности (DoD):
- [ ] Поддержан split на чанки при больших объемах.
Оценка: 8h
Story: [STORY-034]

[TASK-0167] UI export modal
Тип: Frontend
Описание: Модал выбора формата и полей экспорта.
Критерии готовности (DoD):
- [ ] Виден статус job и ссылка на скачивание.
Оценка: 4h
Story: [STORY-034]

[TASK-0168] Design export UX
Тип: Design
Описание: Макет модального окна и уведомления о готовности.
Критерии готовности (DoD):
- [ ] Продуманы empty/large export состояния.
Оценка: 2h
Story: [STORY-034]

[TASK-0169] QA export validation
Тип: QA
Описание: Проверка корректности форматов и RBAC-маскирования.
Критерии готовности (DoD):
- [ ] Контроль кодировок и разделителей подтвержден.
Оценка: 4h
Story: [STORY-034]

[TASK-0170] Secure file storage and expiry
Тип: DevOps
Описание: Временное хранение экспортов с presigned URL.
Критерии готовности (DoD):
- [ ] Ссылки истекают через 24 часа.
Оценка: 4h
Story: [STORY-034]

---

[STORY-035] Saved Views & Team Sharing
Как Team Lead, я хочу сохранять наборы фильтров как view и делиться ими с командой, чтобы стандартизировать операции.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/leads/views` сохраняет фильтры/колонки/сортировку.
- [ ] AC2: View может быть `private` или `team-shared`; управление доступом по RBAC.
- [ ] AC3: Время загрузки сохраненного view `<1s p95`.

Story Points: 3
Приоритет: Should
Epic: [EPIC-05]
Зависит от: [STORY-031]

#### Tasks для STORY-035:

[TASK-0171] Saved views backend
Тип: Backend
Описание: API хранения и ACL для пользовательских представлений.
Критерии готовности (DoD):
- [ ] Поддержано versioning view schema.
Оценка: 8h
Story: [STORY-035]

[TASK-0172] UI сохраненных view
Тип: Frontend
Описание: Сохранение/применение/шаринг представлений.
Критерии готовности (DoD):
- [ ] Доступна установка default view.
Оценка: 4h
Story: [STORY-035]

[TASK-0173] Design view manager
Тип: Design
Описание: Менеджер сохраненных представлений и прав.
Критерии готовности (DoD):
- [ ] Есть понятная визуализация private/shared.
Оценка: 2h
Story: [STORY-035]

[TASK-0174] QA ACL for views
Тип: QA
Описание: Проверка прав доступа к shared/private представлениям.
Критерии готовности (DoD):
- [ ] Нет утечек приватных view между командами.
Оценка: 4h
Story: [STORY-035]

[TASK-0175] Cache popular views
Тип: DevOps
Описание: Кэш часто используемых view для ускорения загрузки.
Критерии готовности (DoD):
- [ ] p95 загрузки view <1s соблюдается.
Оценка: 2h
Story: [STORY-035]

---

## [EPIC-06] User Accounts & RBAC

Цель: Обеспечить безопасный доступ пользователей с гибкими ролями и полной изоляцией компаний.

Метрика успеха:
- 100% критичных операций закрыты RBAC
- 2FA adoption `>=70%` у админов
- 0 кросс-company data leak инцидентов

Приоритет: P0 (MVP)  
Зависит от: -  
Оценка: L (1-3 мес)

### Stories

[STORY-036] Auth with JWT + Refresh
Как Network Admin, я хочу безопасную аутентификацию с refresh токенами, чтобы пользователи работали без частых разлогинов.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/auth/login` возвращает `access_token(15m)` и `refresh_token(30d)`.
- [ ] AC2: `POST /api/v1/auth/refresh` ротирует refresh token (reuse detection).
- [ ] AC3: 5 неудачных login попыток -> lockout на 15 минут.

Story Points: 8
Приоритет: Must
Epic: [EPIC-06]
Зависит от: -

#### Tasks для STORY-036:

[TASK-0176] Auth service backend
Тип: Backend
Описание: JWT выпуск, refresh flow, lockout логика.
Критерии готовности (DoD):
- [ ] Реализована refresh reuse detection.
Оценка: 8h
Story: [STORY-036]

[TASK-0177] Login UI
Тип: Frontend
Описание: Форма входа и refresh обработка в клиенте.
Критерии готовности (DoD):
- [ ] Ошибки логина отображаются без утечки деталей.
Оценка: 4h
Story: [STORY-036]

[TASK-0178] Design auth screens
Тип: Design
Описание: Макеты login/session expired/lockout.
Критерии готовности (DoD):
- [ ] Состояния ошибок покрыты.
Оценка: 2h
Story: [STORY-036]

[TASK-0179] QA auth security tests
Тип: QA
Описание: Проверка brute-force, refresh replay, expiry.
Критерии готовности (DoD):
- [ ] OWASP auth тест-кейсы пройдены.
Оценка: 8h
Story: [STORY-036]

[TASK-0180] Token key rotation
Тип: DevOps
Описание: Ротация signing keys и JWKS публикация.
Критерии готовности (DoD):
- [ ] Ротация ключей без downtime.
Оценка: 4h
Story: [STORY-036]

---

[STORY-037] 2FA for Sensitive Roles
Как Network Admin, я хочу включить 2FA, чтобы снизить риск компрометации аккаунтов.

Acceptance Criteria:
- [ ] AC1: Поддержан TOTP + backup codes.
- [ ] AC2: Для ролей `Network Admin` и `Finance Manager` 2FA mandatory.
- [ ] AC3: 2FA challenge в login и при чувствительных операциях (key revoke, payout export).

Story Points: 5
Приоритет: Must
Epic: [EPIC-06]
Зависит от: [STORY-036]

#### Tasks для STORY-037:

[TASK-0181] 2FA backend
Тип: Backend
Описание: Генерация TOTP secret, верификация кодов, backup codes.
Критерии готовности (DoD):
- [ ] Секреты 2FA хранятся зашифрованно.
Оценка: 8h
Story: [STORY-037]

[TASK-0182] 2FA setup UI
Тип: Frontend
Описание: Экран включения 2FA и ввода проверочного кода.
Критерии готовности (DoD):
- [ ] Отображается QR и recovery codes.
Оценка: 4h
Story: [STORY-037]

[TASK-0183] Design 2FA flow
Тип: Design
Описание: UX подключения 2FA и восстановления.
Критерии готовности (DoD):
- [ ] Понятен шаг восстановления при потере устройства.
Оценка: 2h
Story: [STORY-037]

[TASK-0184] QA 2FA scenarios
Тип: QA
Описание: Проверка включения/отключения/обхода 2FA.
Критерии готовности (DoD):
- [ ] Невозможно выполнить mandatory action без 2FA.
Оценка: 4h
Story: [STORY-037]

[TASK-0185] Secure backup-code storage
Тип: DevOps
Описание: Безопасное хранение и аудит использования backup кодов.
Критерии готовности (DoD):
- [ ] Использование backup codes логируется.
Оценка: 4h
Story: [STORY-037]

---

[STORY-038] Role and Permission Matrix
Как Network Admin, я хочу управлять ролями и правами, чтобы разграничить доступ в команде.

Acceptance Criteria:
- [ ] AC1: Системные роли: `Network Admin`, `Affiliate Manager`, `Team Lead`, `Media Buyer`, `Finance Manager`, `Developer`.
- [ ] AC2: `GET/PUT /api/v1/rbac/roles/{role}` управляет permission scopes.
- [ ] AC3: Изменения прав применяются в течение `<30s`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-06]
Зависит от: [STORY-036]

#### Tasks для STORY-038:

[TASK-0186] RBAC policy backend
Тип: Backend
Описание: Матрица permissions и policy enforcement middleware.
Критерии готовности (DoD):
- [ ] Все защищенные endpoint покрыты policy checks.
Оценка: 8h
Story: [STORY-038]

[TASK-0187] UI role editor
Тип: Frontend
Описание: Экран редактирования прав ролей.
Критерии готовности (DoD):
- [ ] Есть diff view до/после изменений.
Оценка: 8h
Story: [STORY-038]

[TASK-0188] Design permission matrix
Тип: Design
Описание: Табличный интерфейс ролей и прав.
Критерии готовности (DoD):
- [ ] Критичные права визуально выделены.
Оценка: 4h
Story: [STORY-038]

[TASK-0189] QA authorization suite
Тип: QA
Описание: Автотесты на доступ/запрет по всем ролям.
Критерии готовности (DoD):
- [ ] Покрыто не менее 95% RBAC матрицы.
Оценка: 8h
Story: [STORY-038]

[TASK-0190] Policy cache distribution
Тип: DevOps
Описание: Быстрое распространение обновленных политик между сервисами.
Критерии готовности (DoD):
- [ ] Применение прав <30s подтверждено.
Оценка: 4h
Story: [STORY-038]

---

[STORY-039] Multi-Company Workspace Isolation
Как Network Admin, я хочу изолированные воркспейсы компаний, чтобы исключить утечки данных между клиентами.

Acceptance Criteria:
- [ ] AC1: Каждый запрос содержит `workspace_id`, проверяемый middleware.
- [ ] AC2: Кросс-workspace доступ всегда `403`, включая exports и audit endpoints.
- [ ] AC3: Интеграционные и нагрузочные тесты подтверждают нулевые cross-tenant утечки.

Story Points: 8
Приоритет: Must
Epic: [EPIC-06]
Зависит от: [STORY-036], [STORY-038]

#### Tasks для STORY-039:

[TASK-0191] Tenant isolation middleware
Тип: Backend
Описание: Enforce workspace scope на уровне каждого запроса.
Критерии готовности (DoD):
- [ ] Нет endpoint без workspace-check.
Оценка: 8h
Story: [STORY-039]

[TASK-0192] UI workspace switcher
Тип: Frontend
Описание: Переключатель воркспейсов с явной индикацией текущего контекста.
Критерии готовности (DoD):
- [ ] Переключение пересоздает session context.
Оценка: 4h
Story: [STORY-039]

[TASK-0193] Design tenant context UI
Тип: Design
Описание: Паттерны отображения tenant context во всех ключевых экранах.
Критерии готовности (DoD):
- [ ] Текущий workspace всегда заметен.
Оценка: 2h
Story: [STORY-039]

[TASK-0194] QA tenant-boundary tests
Тип: QA
Описание: Проверка попыток доступа к чужим данным через UI/API.
Критерии готовности (DoD):
- [ ] Все попытки кросс-tenant доступа блокируются.
Оценка: 8h
Story: [STORY-039]

[TASK-0195] Data partition strategy
Тип: DevOps
Описание: Настроить партиционирование/индексацию по workspace.
Критерии готовности (DoD):
- [ ] Изоляция подтверждена на уровне БД политик.
Оценка: 8h
Story: [STORY-039]

---

[STORY-040] Session & Access Control Center
Как Network Admin, я хочу управлять активными сессиями и IP whitelist, чтобы контролировать доступ к платформе.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/security/sessions` показывает активные устройства/сессии.
- [ ] AC2: `DELETE /api/v1/security/sessions/{id}` завершает сессию немедленно.
- [ ] AC3: IP whitelist на аккаунт/компанию блокирует входы не из списка (`403 ip_not_allowed`).

Story Points: 5
Приоритет: Should
Epic: [EPIC-06]
Зависит от: [STORY-036], [STORY-039]

#### Tasks для STORY-040:

[TASK-0196] Session management backend
Тип: Backend
Описание: Хранение сессий, revoke endpoint, IP whitelist enforcement.
Критерии готовности (DoD):
- [ ] Revoke завершает токен-сессию <10 сек.
Оценка: 8h
Story: [STORY-040]

[TASK-0197] UI security center
Тип: Frontend
Описание: Экран активных сессий и настроек IP whitelist.
Критерии готовности (DoD):
- [ ] Есть действия revoke single/revoke all.
Оценка: 4h
Story: [STORY-040]

[TASK-0198] Design security center
Тип: Design
Описание: Макет центра безопасности аккаунта.
Критерии готовности (DoD):
- [ ] Учтены risk-action подтверждения.
Оценка: 2h
Story: [STORY-040]

[TASK-0199] QA session control tests
Тип: QA
Описание: Проверка revoke и whitelist ограничений.
Критерии готовности (DoD):
- [ ] Нет возможности продолжить revoked session.
Оценка: 4h
Story: [STORY-040]

[TASK-0200] SIEM integration
Тип: DevOps
Описание: Поток событий безопасности в SIEM.
Критерии готовности (DoD):
- [ ] События login/revoke/blocking доступны в SIEM.
Оценка: 4h
Story: [STORY-040]

---

## [EPIC-07] Anti-Fraud System

Цель: Выявлять и блокировать фродовые лиды в реальном времени с unlimited fraud checks как ключевым конкурентным преимуществом.

Метрика успеха:
- Fraud score вычисляется `<250ms p95`
- Доля выявленного high-risk fraud `>=90%` на размеченной выборке
- Unlimited checks без тарифных лимитов и without throttling penalty

Приоритет: P0 (MVP)  
Зависит от: [EPIC-01], [EPIC-06]  
Оценка: L (1-3 мес)

### Stories

[STORY-041] Real-time Fraud Scoring API (Unlimited)
Как Network Admin, я хочу получать fraud score для каждого лида без лимита проверок, чтобы масштабироваться без тарифных ограничений.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/fraud/check` возвращает `score(0-100)`, `risk_band(low|medium|high)`, `signals[]`.
- [ ] AC2: Проверки не лимитируются по тарифу; platform-level rate limit защищает только от abuse (`>1000 req/min/key`).
- [ ] AC3: При отказе внешнего провайдера система возвращает partial score + `degraded=true`, не блокируя intake.

Story Points: 8
Приоритет: Must
Epic: [EPIC-07]
Зависит от: [STORY-001], [STORY-036]

#### Tasks для STORY-041:

[TASK-0201] Fraud scoring orchestrator
Тип: Backend
Описание: Оркестратор сигналов и итогового score с degraded mode.
Критерии готовности (DoD):
- [ ] Score доступен в пределах p95 <250ms.
Оценка: 8h
Story: [STORY-041]

[TASK-0202] UI fraud score in lead profile
Тип: Frontend
Описание: Отображение fraud score и ключевых сигналов.
Критерии готовности (DoD):
- [ ] Видны low/medium/high bands и degraded badge.
Оценка: 4h
Story: [STORY-041]

[TASK-0203] Design risk badges
Тип: Design
Описание: Визуальный язык риск-бейджей и сигналов.
Критерии готовности (DoD):
- [ ] Сигналы приоритизированы по severity.
Оценка: 2h
Story: [STORY-041]

[TASK-0204] QA scoring accuracy
Тип: QA
Описание: Проверка границ score и деградированного режима.
Критерии готовности (DoD):
- [ ] Нет блокирующих ошибок при отказе части провайдеров.
Оценка: 8h
Story: [STORY-041]

[TASK-0205] Fraud provider failover infra
Тип: DevOps
Описание: Failover между провайдерами fraud-сигналов.
Критерии готовности (DoD):
- [ ] Сервис работает при падении одного провайдера.
Оценка: 8h
Story: [STORY-041]

---

[STORY-042] IP Intelligence Checks
Как Affiliate Manager, я хочу проверять IP на VPN/TOR/Proxy/Bot, чтобы отсеивать очевидный фрод.

Acceptance Criteria:
- [ ] AC1: IP-check включает флаги `is_vpn`, `is_proxy`, `is_tor`, `is_bot`, `asn`, `ip_geo`.
- [ ] AC2: Таймаут IP-check `<=150ms`; при timeout сигнал помечается `unknown`.
- [ ] AC3: GEO mismatch (payload GEO vs IP GEO) повышает score на настраиваемый коэффициент.

Story Points: 5
Приоритет: Must
Epic: [EPIC-07]
Зависит от: [STORY-041]

#### Tasks для STORY-042:

[TASK-0206] IP signal adapters
Тип: Backend
Описание: Интеграция источников IP reputation и нормализация ответа.
Критерии готовности (DoD):
- [ ] Фолбэк на второй провайдер реализован.
Оценка: 8h
Story: [STORY-042]

[TASK-0207] UI IP risk panel
Тип: Frontend
Описание: Панель IP-сигналов в карточке лида.
Критерии готовности (DoD):
- [ ] Отображаются ASN и geo mismatch.
Оценка: 4h
Story: [STORY-042]

[TASK-0208] Design IP indicators
Тип: Design
Описание: Компоненты визуализации IP trust signals.
Критерии готовности (DoD):
- [ ] Unknown state не путается с safe.
Оценка: 2h
Story: [STORY-042]

[TASK-0209] QA IP edge cases
Тип: QA
Описание: Тесты IPv4/IPv6, частных диапазонов, таймаутов.
Критерии готовности (DoD):
- [ ] Корректно обрабатываются reserved IP ranges.
Оценка: 4h
Story: [STORY-042]

[TASK-0210] IP cache and TTL policy
Тип: DevOps
Описание: Кэширование результатов IP-проверок.
Критерии готовности (DoD):
- [ ] Cache hit ratio и stale policy мониторятся.
Оценка: 4h
Story: [STORY-042]

---

[STORY-043] Email & Phone Fraud Signals
Как Network Admin, я хочу проверять email и телефон на качество, чтобы снижать долю мусорных лидов.

Acceptance Criteria:
- [ ] AC1: Email check: MX/DNS, disposable domain, SMTP availability.
- [ ] AC2: Phone check: line type, VOIP flag, country consistency.
- [ ] AC3: Каждая проверка возвращает confidence score `0..1` и влияет на общий fraud score.

Story Points: 5
Приоритет: Must
Epic: [EPIC-07]
Зависит от: [STORY-041]

#### Tasks для STORY-043:

[TASK-0211] Email/phone validators backend
Тип: Backend
Описание: Интеграция проверок email и phone с confidence score.
Критерии готовности (DoD):
- [ ] Результаты нормализуются в единый формат сигналов.
Оценка: 8h
Story: [STORY-043]

[TASK-0212] UI contact quality block
Тип: Frontend
Описание: Отображение проверок email/phone и confidence.
Критерии готовности (DoD):
- [ ] Видны отдельные причины low quality.
Оценка: 4h
Story: [STORY-043]

[TASK-0213] Design signal detail rows
Тип: Design
Описание: Детальные строки сигналов качества контактов.
Критерии готовности (DoD):
- [ ] Понятны статусы pass/warn/fail.
Оценка: 2h
Story: [STORY-043]

[TASK-0214] QA validation tests
Тип: QA
Описание: Проверка disposable emails, VOIP, invalid domains.
Критерии готовности (DoD):
- [ ] Покрыты edge-case международные номера.
Оценка: 4h
Story: [STORY-043]

[TASK-0215] External provider quotas monitor
Тип: DevOps
Описание: Контроль здоровья и квот внешних провайдеров.
Критерии готовности (DoD):
- [ ] Алерт при достижении 80% внешней квоты.
Оценка: 4h
Story: [STORY-043]

---

[STORY-044] Custom Fraud Profiles
Как Affiliate Manager, я хочу настраивать fraud-профили по источникам, чтобы учитывать специфику разных аффилейтов.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/fraud/profiles` с весами сигналов и threshold для action (`allow|review|block`).
- [ ] AC2: Профиль может назначаться на affiliate, flow, GEO.
- [ ] AC3: Изменения профиля применяются за `<60s` и версионируются.

Story Points: 8
Приоритет: Must
Epic: [EPIC-07]
Зависит от: [STORY-041], [STORY-042], [STORY-043]

#### Tasks для STORY-044:

[TASK-0216] Fraud profile engine
Тип: Backend
Описание: Версионирование профилей и evaluator правил.
Критерии готовности (DoD):
- [ ] Доступен rollback на предыдущую версию профиля.
Оценка: 8h
Story: [STORY-044]

[TASK-0217] UI fraud profile builder
Тип: Frontend
Описание: Конструктор весов и порогов по сигналам.
Критерии готовности (DoD):
- [ ] Есть preview влияния изменений на score.
Оценка: 8h
Story: [STORY-044]

[TASK-0218] Design profile builder
Тип: Design
Описание: UX редактора rule-based профилей.
Критерии готовности (DoD):
- [ ] Показана иерархия scope (tenant/affiliate/flow).
Оценка: 4h
Story: [STORY-044]

[TASK-0219] QA profile propagation
Тип: QA
Описание: Проверить назначение профилей и скорость применения.
Критерии готовности (DoD):
- [ ] Применение изменений <60 сек подтверждено.
Оценка: 8h
Story: [STORY-044]

[TASK-0220] Config distribution infra
Тип: DevOps
Описание: Распространение fraud profile config в runtime сервисы.
Критерии готовности (DoD):
- [ ] Нет stale profile дольше 60 сек.
Оценка: 4h
Story: [STORY-044]

---

[STORY-045] Fraud Review Queue & Overrides
Как Team Lead, я хочу очередь подозрительных лидов и ручной override, чтобы быстро реагировать на false positive.

Acceptance Criteria:
- [ ] AC1: Лиды с `risk_band=high` и `action=review` попадают в review queue.
- [ ] AC2: `POST /api/v1/fraud/review/{lead_id}/override` поддерживает `approve|block` с обязательной причиной.
- [ ] AC3: Все override действия журналируются и доступны для аудита.

Story Points: 5
Приоритет: Should
Epic: [EPIC-07]
Зависит от: [STORY-044], [STORY-032]

#### Tasks для STORY-045:

[TASK-0221] Review queue backend
Тип: Backend
Описание: Очередь и endpoint ручного override.
Критерии готовности (DoD):
- [ ] Обязательная причина override валидируется.
Оценка: 8h
Story: [STORY-045]

[TASK-0222] UI review queue
Тип: Frontend
Описание: Таблица high-risk лидов и действия approve/block.
Критерии готовности (DoD):
- [ ] Есть фильтры по affiliate/GEO/score.
Оценка: 8h
Story: [STORY-045]

[TASK-0223] Design review workflow
Тип: Design
Описание: Экран ручного review с минимизацией ошибок оператора.
Критерии готовности (DoD):
- [ ] Критичные действия требуют подтверждения.
Оценка: 2h
Story: [STORY-045]

[TASK-0224] QA override audit tests
Тип: QA
Описание: Проверка аудита override и прав доступа.
Критерии готовности (DoD):
- [ ] Любой override воспроизводим по audit trail.
Оценка: 4h
Story: [STORY-045]

[TASK-0225] Fraud review queue ops alerts
Тип: DevOps
Описание: Мониторинг размера очереди review и SLA обработки.
Критерии готовности (DoD):
- [ ] Алерт при queue age >15 минут.
Оценка: 4h
Story: [STORY-045]

