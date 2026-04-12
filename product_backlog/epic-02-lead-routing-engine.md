## [EPIC-02] Lead Routing Engine

Цель: Доставлять каждый валидный лид к наиболее подходящему брокеру по прозрачным правилам с минимальной задержкой и управляемыми рисками по капам/качеству.

Метрика успеха:
- p95 latency маршрутизации `<120ms`, p99 `<250ms`
- Успешный route decision для валидного лида `>=99.9%`
- Нарушения дневных капов `=0` (по данным reconciliation)
- Точность симулятора против прод-решений `>=98%`

Приоритет: P0 (MVP)  
Зависит от: [EPIC-01], [EPIC-03], [EPIC-04], [EPIC-07]  
Оценка: XL (3+ мес)

### Stories

[STORY-013] Flow Configuration API  
Как Network Admin, я хочу создавать и версионировать routing flows через API, чтобы управлять логикой маршрутизации без downtime.

Acceptance Criteria:
- [ ] AC1: Реализованы `POST/GET/PUT /api/v1/routing/flows`, `POST /api/v1/routing/flows/{id}/publish`, `POST /api/v1/routing/flows/{id}/archive`.
- [ ] AC2: Схема flow: `name`, `status(draft|published|archived)`, `timezone`, `entry_filters`, `algorithm`, `branches[]`, `fallback_policy`, `caps`.
- [ ] AC3: Публикация только после успешной валидации графа; при ошибке `422 flow_validation_error` с полем `node_id`.
- [ ] AC4: RBAC: только `Network Admin` может publish/archive; `Affiliate Manager` может редактировать draft при назначенном scope.
- [ ] AC5: Переключение active version происходит атомарно за `<2s`.

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-02]  
Зависит от: [STORY-001]

#### Tasks для STORY-013:

[TASK-0061] CRUD и versioning flows  
Тип: Backend  
Описание: Добавить сущности flow/version/branch, API-эндпоинты и правила publish/archive.  
Критерии готовности (DoD):
- [ ] API соответствует OpenAPI контракту.
- [ ] Атомарный publish переключает active version без race conditions.
Оценка: 16h  
Story: [STORY-013]

[TASK-0062] UI списка и карточки flow  
Тип: Frontend  
Описание: Таблица flows, статусы draft/published, действия clone/publish/archive.  
Критерии готовности (DoD):
- [ ] Есть фильтр по статусу и поиску.
- [ ] Ошибки publish валидно отображаются с привязкой к узлу.
Оценка: 8h  
Story: [STORY-013]

[TASK-0063] Wireframe Flow Lifecycle  
Тип: Design  
Описание: UX статусов и безопасных подтверждений publish/archive.  
Критерии готовности (DoD):
- [ ] Проработаны состояния confirm/cancel/failure.
- [ ] В макетах есть подсветка активной версии.
Оценка: 4h  
Story: [STORY-013]

[TASK-0064] QA API lifecycle сценарии  
Тип: QA  
Описание: Проверить CRUD, publish, архивирование, RBAC ограничения и конфликт версий.  
Критерии готовности (DoD):
- [ ] Покрыты happy-path и конкурирующие обновления.
- [ ] Есть автотесты на 403/409/422.
Оценка: 8h  
Story: [STORY-013]

[TASK-0065] Миграции и rollback strategy  
Тип: DevOps  
Описание: Подготовить миграции схемы routing, backup/rollback сценарии при релизе.  
Критерии готовности (DoD):
- [ ] Миграции backward-compatible.
- [ ] Проверен rollback в staging без потери активных flow-версий.
Оценка: 8h  
Story: [STORY-013]

---

[STORY-014] Visual Drag-and-Drop Flow Builder  
Как Affiliate Manager, я хочу собирать flow через drag-and-drop редактор, чтобы быстро настраивать дистрибуцию без разработки.

Acceptance Criteria:
- [ ] AC1: Узлы: `Entry`, `Filter`, `Algorithm`, `BrokerTarget`, `Fallback`, `Exit`; связи валидируются в реальном времени.
- [ ] AC2: Autosave draft каждые `5s`; восстановление после разрыва сессии за `<3s`.
- [ ] AC3: Нельзя сохранить граф с циклом или без `Exit`; ошибка показывается на конкретном `node_id`.
- [ ] AC4: Поддержан импорт/экспорт JSON flow-схемы (`<=512KB`).
- [ ] AC5: Редактор работает на 50+ узлах без деградации (UI FPS `>=30`).

Story Points: 8  
Приоритет: Must  
Epic: [EPIC-02]  
Зависит от: [STORY-013]

#### Tasks для STORY-014:

[TASK-0066] Graph model + validation backend  
Тип: Backend  
Описание: Серверная валидация DAG и схема сериализации flow JSON.  
Критерии готовности (DoD):
- [ ] Ловятся циклы, dangling links и missing Exit.
- [ ] Ошибки возвращают `node_id` и `error_code`.
Оценка: 8h  
Story: [STORY-014]

[TASK-0067] Реализация drag-and-drop canvas  
Тип: Frontend  
Описание: Построить канвас редактора с палитрой узлов и панелью свойств.  
Критерии готовности (DoD):
- [ ] Добавление/удаление/соединение узлов работает мышью и клавиатурой.
- [ ] Autosave и restore сессии реализованы.
Оценка: 16h  
Story: [STORY-014]

[TASK-0068] UX kit для flow builder  
Тип: Design  
Описание: Разработать визуальный язык узлов, связей и ошибок в графе.  
Критерии готовности (DoD):
- [ ] Есть набор компонентов для каждого типа узла.
- [ ] Ошибки и предупреждения различимы по цвету/иконкам.
Оценка: 8h  
Story: [STORY-014]

[TASK-0069] QA граф-валидации и UX  
Тип: QA  
Описание: Тест-кейсы на циклы, битые связи, autosave restore и импорт/экспорт.  
Критерии готовности (DoD):
- [ ] Покрыты не менее 25 graph сценариев.
- [ ] Проверено поведение на 50+ узлах.
Оценка: 8h  
Story: [STORY-014]

[TASK-0070] Frontend build performance budget  
Тип: DevOps  
Описание: Добавить метрики web-vitals и budget для flow builder bundle.  
Критерии готовности (DoD):
- [ ] Bundle budget для редактора зафиксирован.
- [ ] Alert на регресс производительности подключен.
Оценка: 4h  
Story: [STORY-014]

---

[STORY-015] Algorithm Selection per Flow
Как Network Admin, я хочу выбирать алгоритм маршрутизации на уровне flow/branch, чтобы адаптировать дистрибуцию под разные источники трафика.

Acceptance Criteria:
- [ ] AC1: Поле `algorithm_mode` поддерживает `weighted_round_robin` и `slots_chance` на уровне flow и override на уровне branch.
- [ ] AC2: API `PUT /api/v1/routing/flows/{id}/algorithm` валидирует обязательные параметры под выбранный режим.
- [ ] AC3: При отсутствии override branch использует flow-level алгоритм.
- [ ] AC4: Смена алгоритма не ломает опубликованный flow; изменения применяются только после publish.
- [ ] AC5: В explain-response указывается фактически использованный алгоритм и источник настройки (`flow|branch`).

Story Points: 5  
Приоритет: Must  
Epic: [EPIC-02]  
Зависит от: [STORY-013], [STORY-014]

#### Tasks для STORY-015:

[TASK-0071] API выбора алгоритма и валидации
Тип: Backend
Описание: Добавить endpoint/модели конфигурации алгоритмов и проверку согласованности с branch-правилами.
Критерии готовности (DoD):
- [ ] Поддержаны flow-level и branch-level настройки.
- [ ] Невалидные комбинации возвращают `422` с детализацией поля.
Оценка: 8h
Story: [STORY-015]

[TASK-0072] UI переключатель алгоритмов
Тип: Frontend
Описание: В редакторе flow добавить выбор алгоритма и форму параметров под каждый режим.
Критерии готовности (DoD):
- [ ] Поля динамически меняются по выбранному режиму.
- [ ] Показывается source-of-truth (`flow`/`branch override`).
Оценка: 8h
Story: [STORY-015]

[TASK-0073] Design: Algorithm config panels
Тип: Design
Описание: Проработать панели параметров WRR и Slots/Chance с пояснениями.
Критерии готовности (DoD):
- [ ] Есть сравнение режимов в UI.
- [ ] Есть предупреждение о статистических рисках малых выборок.
Оценка: 4h
Story: [STORY-015]

[TASK-0074] QA матрица выбора алгоритма
Тип: QA
Описание: Протестировать все комбинации flow/branch override и publish-цикл.
Критерии готовности (DoD):
- [ ] Покрыты кейсы fallback к flow-level.
- [ ] Проверены ошибки при неполной конфигурации.
Оценка: 8h
Story: [STORY-015]

[TASK-0075] Feature flag rollout алгоритмов
Тип: DevOps
Описание: Управляемый rollout режимов алгоритмов по tenant feature-flag.
Критерии готовности (DoD):
- [ ] Возможен selective enable по tenant.
- [ ] Логи включения/выключения аудитируются.
Оценка: 4h
Story: [STORY-015]

---

[STORY-016] Weighted Round-Robin Executor
Как Team Lead, я хочу предсказуемое распределение лидов по весам, чтобы равномерно отгружать трафик на брокеров.

Acceptance Criteria:
- [ ] AC1: Для `weighted_round_robin` поддержаны веса `1..1000` на broker-target.
- [ ] AC2: На выборке `>=10,000` лидов фактическая доля отклоняется от целевой не более чем на `±5%`.
- [ ] AC3: Нецелевые брокеры (disabled, cap reached, schedule off) исключаются до распределения.
- [ ] AC4: Если все target недоступны, возвращается `503 no_available_route` + код причины.
- [ ] AC5: Decision latency алгоритма `<30ms p95` при `<=200` targets в flow.

Story Points: 8
Приоритет: Must
Epic: [EPIC-02]
Зависит от: [STORY-015]

#### Tasks для STORY-016:

[TASK-0076] Реализовать WRR runtime engine
Тип: Backend
Описание: Алгоритм weighted round-robin с учётом исключений и runtime state.
Критерии готовности (DoD):
- [ ] Распределение проходит статистические тесты.
- [ ] Исключения targets корректно применяются до выбора.
Оценка: 16h
Story: [STORY-016]

[TASK-0077] UI веса и live distribution preview
Тип: Frontend
Описание: Поля весов и график ожидаемой/фактической доли по брокерам.
Критерии готовности (DoD):
- [ ] Валидация диапазона 1..1000.
- [ ] Preview пересчитывается без перезагрузки.
Оценка: 8h
Story: [STORY-016]

[TASK-0078] Design: Distribution preview widget
Тип: Design
Описание: Компонент сравнения target weight vs actual share.
Критерии готовности (DoD):
- [ ] Наглядно отображаются отклонения по цвету.
- [ ] Поддержаны empty/no-data состояния.
Оценка: 4h
Story: [STORY-016]

[TASK-0079] QA статистические тесты WRR
Тип: QA
Описание: Автотесты на больших выборках и исключениях target availability.
Критерии готовности (DoD):
- [ ] Есть тесты на 10k/50k/100k лидов.
- [ ] Зафиксирован порог отклонения ±5%.
Оценка: 8h
Story: [STORY-016]

[TASK-0080] Runtime cache и low-latency tuning
Тип: DevOps
Описание: Настроить кэш runtime состояния target и профилирование latency.
Критерии готовности (DoD):
- [ ] p95 решения маршрута <120ms end-to-end.
- [ ] Метрики latency доступны по flow_id.
Оценка: 8h
Story: [STORY-016]

---

[STORY-017] Slots vs Chance Executor
Как Network Admin, я хочу использовать `SLOTS vs CHANCE`, чтобы добиться статистически корректного случайного распределения и контроля вероятностей.

Acceptance Criteria:
- [ ] AC1: Режим поддерживает `slots` (целые `1..10000`) и `chance` (`0.01..100.00%`) для каждого target.
- [ ] AC2: Сумма chance в branch должна быть `100% ± 0.01`; иначе `422 invalid_probability_sum`.
- [ ] AC3: На выборке `>=20,000` отклонение фактической вероятности не более `±3%` от заданной.
- [ ] AC4: Для малой выборки (`<500`) UI показывает warning о низкой статистической значимости.
- [ ] AC5: Алгоритм использует криптостойкий PRNG seed + traceable random token в explain логе.

Story Points: 8
Приоритет: Must
Epic: [EPIC-02]
Зависит от: [STORY-015]

#### Tasks для STORY-017:

[TASK-0081] Реализовать Slots/Chance runtime engine
Тип: Backend
Описание: Вероятностный алгоритм выбора target по слотам/процентам с валидацией сумм.
Критерии готовности (DoD):
- [ ] Поддержаны оба режима в одном движке.
- [ ] Возвращается понятная ошибка при нарушении суммы вероятностей.
Оценка: 16h
Story: [STORY-017]

[TASK-0082] UI редактор slot/chance параметров
Тип: Frontend
Описание: Таблица target с режимами slots/chance, auto-normalization и warnings.
Критерии готовности (DoD):
- [ ] Видны текущие суммы и отклонения.
- [ ] Есть переключение режима без потери данных черновика.
Оценка: 8h
Story: [STORY-017]

[TASK-0083] Design: Probability editor UX
Тип: Design
Описание: Спроектировать UX ввода вероятностей и предупреждений по статистике.
Критерии готовности (DoD):
- [ ] Есть явная индикация суммарного процента.
- [ ] Предупреждение малой выборки оформлено и согласовано.
Оценка: 4h
Story: [STORY-017]

[TASK-0084] QA вероятностные тесты Slots/Chance
Тип: QA
Описание: Проверить отклонения на больших выборках и корректность PRNG trace.
Критерии готовности (DoD):
- [ ] Отклонение ≤±3% подтверждено на 20k+.
- [ ] Проверены edge-case 0.01%, 99.99%, границы сумм.
Оценка: 8h
Story: [STORY-017]

[TASK-0085] Entropy source hardening
Тип: DevOps
Описание: Настроить безопасный источник случайности и мониторинг качества генератора.
Критерии готовности (DoD):
- [ ] Источник энтропии документирован и стабилен.
- [ ] Есть алерт на сбой PRNG entropy pool.
Оценка: 4h
Story: [STORY-017]

---

[STORY-018] GEO/Schedule/Caps Constraints Engine
Как Affiliate Manager, я хочу задавать фильтры GEO, расписание и капы, чтобы трафик отправлялся только в разрешенные окна и лимиты.

Acceptance Criteria:
- [ ] AC1: Поддержаны фильтры `allowed_geo[]`, `blocked_geo[]`, `days_of_week`, `time_window`, `timezone`.
- [ ] AC2: Капы: hourly/daily/weekly на уровне target и flow; timezone-aware reset по tenant timezone.
- [ ] AC3: При cap exhaustion решение должно выбрать следующий доступный target либо fallback, без 5xx.
- [ ] AC4: `GET /api/v1/routing/caps/{flow_id}` возвращает `used`, `remaining`, `resets_at` за `<200ms p95`.
- [ ] AC5: При конфликте фильтров приоритет: `blocked_geo` > `allowed_geo` > fallback.

Story Points: 8
Приоритет: Must
Epic: [EPIC-02]
Зависит от: [STORY-013]

#### Tasks для STORY-018:

[TASK-0086] Constraints evaluator backend
Тип: Backend
Описание: Реализовать движок GEO/расписание/кап-фильтров и порядок приоритетов.
Критерии готовности (DoD):
- [ ] Приоритеты фильтров соблюдаются.
- [ ] Капы учитываются атомарно на конкурентных запросах.
Оценка: 16h
Story: [STORY-018]

[TASK-0087] UI управления капами и расписанием
Тип: Frontend
Описание: Формы редактирования лимитов и календаря работы target.
Критерии готовности (DoD):
- [ ] Timezone picker и preview reset time работают.
- [ ] Ошибки конфликтных правил показываются до publish.
Оценка: 8h
Story: [STORY-018]

[TASK-0088] Design: Caps calendar components
Тип: Design
Описание: Компоненты тайм-окон и cap индикаторов в flow editor.
Критерии готовности (DoD):
- [ ] Компоненты адаптированы под desktop и tablet.
- [ ] Состояние exhausted явно выделено.
Оценка: 4h
Story: [STORY-018]

[TASK-0089] QA timezone/cap edge suite
Тип: QA
Описание: Проверить DST, переходы суток, конкурентное списание капов.
Критерии готовности (DoD):
- [ ] Покрыты кейсы DST + timezone смены.
- [ ] Нет oversell капа в нагрузочном тесте.
Оценка: 8h
Story: [STORY-018]

[TASK-0090] Atomic counters infra
Тип: DevOps
Описание: Внедрить низколатентные атомарные счетчики капов и мониторинг exhaustion rate.
Критерии готовности (DoD):
- [ ] Атомарность подтверждена под нагрузкой.
- [ ] Метрики remaining caps доступны в Prometheus/Grafana.
Оценка: 8h
Story: [STORY-018]

---

[STORY-019] Fallback Chain and Broker Resilience
Как Team Lead, я хочу автоматический fallback при недоступности брокера, чтобы не терять лиды при деградации интеграций.

Acceptance Criteria:
- [ ] AC1: В flow настраивается fallback chain `primary -> backup1 -> backup2` с max hop `<=5`.
- [ ] AC2: Триггеры failover: `timeout >2s`, `5xx`, `connection_error`, `explicit_reject`.
- [ ] AC3: Failover решение принимается за `<400ms p95` сверх базового route времени.
- [ ] AC4: Циклический fallback запрещен на этапе publish (`422 fallback_cycle_detected`).
- [ ] AC5: В audit сохраняется весь путь fallback с кодами причин.

Story Points: 5
Приоритет: Must
Epic: [EPIC-02]
Зависит от: [STORY-018], [STORY-016], [STORY-017]

#### Tasks для STORY-019:

[TASK-0091] Backend fallback orchestrator
Тип: Backend
Описание: Реализовать оркестрацию fallback hops и detection деградации target.
Критерии готовности (DoD):
- [ ] Поддержан max hop и причины перехода.
- [ ] Циклы исключены и валидируются при publish.
Оценка: 8h
Story: [STORY-019]

[TASK-0092] UI fallback chain editor
Тип: Frontend
Описание: Визуальный редактор приоритетов primary/backup и trigger-политик.
Критерии готовности (DoD):
- [ ] Drag reorder backup-цепочки работает.
- [ ] Видны ограничения max hop и предупреждения циклов.
Оценка: 8h
Story: [STORY-019]

[TASK-0093] Design: Fallback map
Тип: Design
Описание: Визуализация fallback пути и состояния broker health.
Критерии готовности (DoD):
- [ ] Есть легенда причин failover.
- [ ] Диаграмма читаема при 5+ hops.
Оценка: 4h
Story: [STORY-019]

[TASK-0094] QA fault-injection сценарии
Тип: QA
Описание: Инъекции timeout/5xx/network errors и проверка корректного fallback.
Критерии готовности (DoD):
- [ ] Покрыты все trigger-типы.
- [ ] Проверен путь fallback в audit logs.
Оценка: 8h
Story: [STORY-019]

[TASK-0095] Health-check infrastructure
Тип: DevOps
Описание: Регулярные health checks broker endpoints + circuit breaker telemetry.
Критерии готовности (DoD):
- [ ] Health status обновляется не реже 30 секунд.
- [ ] Circuit breaker события наблюдаемы в дашборде.
Оценка: 8h
Story: [STORY-019]

---

[STORY-020] Route Simulation and Explain API
Как Developer, я хочу симулировать решение маршрутизации до запуска в прод, чтобы проверить правила и снизить риск ошибок.

Acceptance Criteria:
- [ ] AC1: Реализован `POST /api/v1/routing/simulate` с input lead payload + `flow_version_id`.
- [ ] AC2: Response возвращает `selected_target`, `algorithm_used`, `filters_applied[]`, `fallback_path[]`, `decision_time_ms`.
- [ ] AC3: Симуляция не изменяет счетчики капов и не отправляет запросы брокеру.
- [ ] AC4: Поддержан batch simulate до `1000` лидов с `job_id`; результат доступен через `GET /api/v1/routing/simulate/{job_id}`.
- [ ] AC5: P95 симуляции single lead `<200ms`, batch 1000 `<30s`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-02]
Зависит от: [STORY-016], [STORY-017], [STORY-018], [STORY-019]

#### Tasks для STORY-020:

[TASK-0096] Simulation API backend
Тип: Backend
Описание: Реализовать dry-run execution path и explain payload без side effects.
Критерии готовности (DoD):
- [ ] Симуляция не модифицирует runtime counters.
- [ ] Explain payload стабилен и документирован.
Оценка: 16h
Story: [STORY-020]

[TASK-0097] UI симулятор в flow editor
Тип: Frontend
Описание: Форма ввода тест-лида, запуск single/batch симуляции, просмотр explain-результатов.
Критерии готовности (DoD):
- [ ] Поддержан импорт batch JSON/CSV.
- [ ] Есть drill-down по каждому шагу decision chain.
Оценка: 8h
Story: [STORY-020]

[TASK-0098] Design: Explain timeline
Тип: Design
Описание: Компонент поэтапного объяснения route decision для пользователя.
Критерии готовности (DoD):
- [ ] Видны filter pass/fail этапы.
- [ ] Выделены причины fallback и окончательного выбора.
Оценка: 4h
Story: [STORY-020]

[TASK-0099] QA dry-run consistency tests
Тип: QA
Описание: Сравнить simulate output с фактическим route на одинаковых входах.
Критерии готовности (DoD):
- [ ] Сходимость simulate/prod не ниже 98%.
- [ ] Проверены edge-case пустые поля и cap exhaustion.
Оценка: 8h
Story: [STORY-020]

[TASK-0100] Batch simulation worker infra
Тип: DevOps
Описание: Очередь batch simulation, контроль времени выполнения, хранение результатов 7 дней.
Критерии готовности (DoD):
- [ ] Batch jobs обрабатываются без влияния на production routing latency.
- [ ] Purge job очищает результаты старше 7 дней.
Оценка: 8h
Story: [STORY-020]
