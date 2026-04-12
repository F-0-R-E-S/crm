## [EPIC-08] Autologin & Proxy Pipeline

Цель: Автоматически логинить лидов на стороне брокера с контролем device fingerprint и прокси-качества, чтобы повышать конверсию в депозит.

Метрика успеха:
- Успешность автологина `>=97%`
- Среднее время 4-stage pipeline `<12s`
- Detection rate device reuse `>=90%`

Приоритет: P1 (Launch)  
Зависит от: [EPIC-03], [EPIC-07]  
Оценка: L (1-3 мес)

### Stories

[STORY-046] 4-Stage Autologin Pipeline
Как Network Admin, я хочу стандартизированный 4-stage pipeline, чтобы процесс автологина был управляемым и предсказуемым.

Acceptance Criteria:
- [ ] AC1: Этапы `prepare -> fingerprint -> login -> verify` доступны в `POST /api/v1/autologin/run`.
- [ ] AC2: Возвращается поэтапный результат с кодами ошибок и временем каждого stage.
- [ ] AC3: Общий таймаут pipeline `<=20s`, частичный fail не ломает обработку лида.

Story Points: 8
Приоритет: Must
Epic: [EPIC-08]
Зависит от: [STORY-023], [STORY-041]

#### Tasks для STORY-046:

[TASK-0226] Pipeline orchestrator backend
Тип: Backend
Описание: Реализовать state-machine 4-stage автологина.
Критерии готовности (DoD):
- [ ] Все stage-результаты сохраняются в audit.
Оценка: 8h
Story: [STORY-046]

[TASK-0227] UI stage monitor
Тип: Frontend
Описание: Экран выполнения pipeline с прогрессом этапов.
Критерии готовности (DoD):
- [ ] Ошибки показываются по каждому stage.
Оценка: 4h
Story: [STORY-046]

[TASK-0228] Design pipeline timeline
Тип: Design
Описание: Визуальная лента этапов autologin.
Критерии готовности (DoD):
- [ ] Есть success/fail/retry состояния.
Оценка: 2h
Story: [STORY-046]

[TASK-0229] QA stage transitions
Тип: QA
Описание: Проверить переходы между этапами и таймауты.
Критерии готовности (DoD):
- [ ] Нет зависших job при ошибке stage.
Оценка: 4h
Story: [STORY-046]

[TASK-0230] Worker runtime isolation
Тип: DevOps
Описание: Изоляция и масштабирование раннеров autologin.
Критерии готовности (DoD):
- [ ] Pipeline jobs не влияют на core API latency.
Оценка: 8h
Story: [STORY-046]

---

[STORY-047] Device Fingerprint Engine
Как Team Lead, я хочу собирать device fingerprint (WebGL+Canvas+IP), чтобы отслеживать подозрительные повторные устройства.

Acceptance Criteria:
- [ ] AC1: Fingerprint включает `webgl_hash`, `canvas_hash`, `user_agent_hash`, `ip_hash`.
- [ ] AC2: `GET /api/v1/autologin/fingerprint/{lead_id}` возвращает `reuse_count_24h` и risk signal.
- [ ] AC3: При `reuse_count_24h >3` создается alert `device_reuse_suspected`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-08]
Зависит от: [STORY-046]

#### Tasks для STORY-047:

[TASK-0231] Fingerprint collector backend
Тип: Backend
Описание: Сбор и нормализация fingerprint атрибутов.
Критерии готовности (DoD):
- [ ] Данные хэшируются и не содержат raw PII.
Оценка: 8h
Story: [STORY-047]

[TASK-0232] UI fingerprint panel
Тип: Frontend
Описание: Показ hash-сигналов и reuse индикатора.
Критерии готовности (DoD):
- [ ] Есть ссылки на связанные лиды по fingerprint.
Оценка: 4h
Story: [STORY-047]

[TASK-0233] Design fingerprint risk widget
Тип: Design
Описание: Виджет риска reuse устройства.
Критерии готовности (DoD):
- [ ] Видны пороги low/medium/high.
Оценка: 2h
Story: [STORY-047]

[TASK-0234] QA fingerprint determinism
Тип: QA
Описание: Проверить стабильность хэшей и detection reuse.
Критерии готовности (DoD):
- [ ] Ложные срабатывания <2% на тестовом датасете.
Оценка: 4h
Story: [STORY-047]

[TASK-0235] Fingerprint storage partitioning
Тип: DevOps
Описание: Партиционирование и retention fingerprint-данных.
Критерии готовности (DoD):
- [ ] Retention policy 180 дней применена.
Оценка: 4h
Story: [STORY-047]

---

[STORY-048] Proxy Pool Management
Как Network Admin, я хочу управлять собственным proxy-пулом, чтобы стабилизировать автологин и GEO-матчинг.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/proxies` поддерживает `host`, `port`, `auth`, `geo`, `provider`, `quality_score`.
- [ ] AC2: Прокси с ошибками `>20%` за 10 мин автоматически переводится в quarantine.
- [ ] AC3: Выбор прокси учитывает `geo`, `health`, `cooldown` и происходит за `<50ms p95`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-08]
Зависит от: [STORY-046]

#### Tasks для STORY-048:

[TASK-0236] Proxy manager backend
Тип: Backend
Описание: Реестр прокси, health metrics, quarantine логика.
Критерии готовности (DoD):
- [ ] Авто-quarantine работает по заданному порогу.
Оценка: 8h
Story: [STORY-048]

[TASK-0237] UI proxy pool
Тип: Frontend
Описание: Таблица прокси с health и статусами.
Критерии готовности (DoD):
- [ ] Есть массовые действия enable/disable.
Оценка: 4h
Story: [STORY-048]

[TASK-0238] Design proxy health table
Тип: Design
Описание: Визуализация статусов healthy/quarantine/down.
Критерии готовности (DoD):
- [ ] Деградированные прокси выделяются явно.
Оценка: 2h
Story: [STORY-048]

[TASK-0239] QA proxy failover
Тип: QA
Описание: Проверить выбор прокси при падениях и cooldown.
Критерии готовности (DoD):
- [ ] Нет повторного назначения proxy в cooldown.
Оценка: 4h
Story: [STORY-048]

[TASK-0240] Proxy health-check daemon
Тип: DevOps
Описание: Демон проверки прокси и публикации health метрик.
Критерии готовности (DoD):
- [ ] Health обновляется каждые 30 секунд.
Оценка: 8h
Story: [STORY-048]

---

[STORY-049] Anomaly Detection for Autologin
Как Affiliate Manager, я хочу детектить аномалии автологина (GEO mismatch, device reuse), чтобы быстро реагировать на риск.

Acceptance Criteria:
- [ ] AC1: Правила аномалий включают `geo_mismatch`, `device_reuse`, `proxy_reputation_low`.
- [ ] AC2: Алерт генерируется при score аномалии `>=70/100`.
- [ ] AC3: `GET /api/v1/autologin/anomalies` возвращает список и статус обработки.

Story Points: 5
Приоритет: Should
Epic: [EPIC-08]
Зависит от: [STORY-047], [STORY-048]

#### Tasks для STORY-049:

[TASK-0241] Anomaly rules backend
Тип: Backend
Описание: Rule-engine аномалий и endpoint списка.
Критерии готовности (DoD):
- [ ] Правила конфигурируемы на уровне tenant.
Оценка: 8h
Story: [STORY-049]

[TASK-0242] UI anomaly feed
Тип: Frontend
Описание: Лента аномалий с фильтрами и acknowledge.
Критерии готовности (DoD):
- [ ] Есть фильтр по severity и типу сигнала.
Оценка: 4h
Story: [STORY-049]

[TASK-0243] Design anomaly cards
Тип: Design
Описание: Карточки аномалий и индикаторы критичности.
Критерии готовности (DoD):
- [ ] Карточка содержит recommended action.
Оценка: 2h
Story: [STORY-049]

[TASK-0244] QA anomaly thresholds
Тип: QA
Описание: Проверка порогов и корректности алертов.
Критерии готовности (DoD):
- [ ] Отсутствуют дубликаты алертов на один event.
Оценка: 4h
Story: [STORY-049]

[TASK-0245] Alert routing infra
Тип: DevOps
Описание: Доставка аномалий в Telegram/email каналы.
Критерии готовности (DoD):
- [ ] Алерты доставляются <1 мин.
Оценка: 4h
Story: [STORY-049]

---

[STORY-050] Autologin SLA Dashboard
Как Team Lead, я хочу мониторить SLA автологина, чтобы контролировать качество в разрезе брокеров.

Acceptance Criteria:
- [ ] AC1: KPI: `success_rate`, `avg_duration`, `fail_by_stage`, `fail_by_broker`.
- [ ] AC2: Data freshness `<60s`.
- [ ] AC3: Drill-down до конкретного lead_id и stage log.

Story Points: 3
Приоритет: Should
Epic: [EPIC-08]
Зависит от: [STORY-046]

#### Tasks для STORY-050:

[TASK-0246] Autologin metrics API
Тип: Backend
Описание: Endpoint агрегации SLA метрик.
Критерии готовности (DoD):
- [ ] Метрики доступны по 1m/5m/1h.
Оценка: 8h
Story: [STORY-050]

[TASK-0247] UI SLA dashboard
Тип: Frontend
Описание: Дашборд автологина с KPI и графиками.
Критерии готовности (DoD):
- [ ] Есть drill-down до lead timeline.
Оценка: 4h
Story: [STORY-050]

[TASK-0248] Design SLA components
Тип: Design
Описание: Компоненты KPI и stage-failure chart.
Критерии готовности (DoD):
- [ ] Компоновка адаптирована для NOC экрана.
Оценка: 2h
Story: [STORY-050]

[TASK-0249] QA metrics accuracy
Тип: QA
Описание: Проверка метрик SLA и drill-down.
Критерии готовности (DoD):
- [ ] Расхождение с raw logs <0.1%.
Оценка: 4h
Story: [STORY-050]

[TASK-0250] Time-series storage tuning
Тип: DevOps
Описание: Оптимизация хранения time-series метрик.
Критерии готовности (DoD):
- [ ] Freshness <60s стабильно соблюдается.
Оценка: 4h
Story: [STORY-050]

---

## [EPIC-09] Automated Lead Delivery (UAD)

Цель: Автоматизировать переотправку лидов по сценариям и расписанию для восстановления выручки по отказным лидам.

Метрика успеха:
- Recovery conversion uplift `>=12%`
- Автоматическая обработка отказных лидов `>=85%`
- Ошибки UAD jobs `<1%`

Приоритет: P1 (Launch)  
Зависит от: [EPIC-02], [EPIC-03]  
Оценка: L (1-3 мес)

### Stories

[STORY-051] UAD Scenario Builder
Как Affiliate Manager, я хочу настраивать сценарии переотправки, чтобы обрабатывать отказные лиды без ручной рутины.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/uad/scenarios` принимает `trigger_statuses`, `delay`, `max_attempts`, `target_flows`.
- [ ] AC2: Поддержаны статусы-триггеры `rejected`, `unreachable`, `timeout`, `no_deposit_24h`.
- [ ] AC3: Сценарии versioned; publish/rollback доступны.

Story Points: 8
Приоритет: Must
Epic: [EPIC-09]
Зависит от: [STORY-013], [STORY-019]

#### Tasks для STORY-051:

[TASK-0251] UAD scenario API
Тип: Backend
Описание: CRUD сценариев UAD и versioning.
Критерии готовности (DoD):
- [ ] Поддержан publish/rollback.
Оценка: 8h
Story: [STORY-051]

[TASK-0252] UI UAD scenario editor
Тип: Frontend
Описание: Экран создания сценария и условий.
Критерии готовности (DoD):
- [ ] Проверяется валидность delay/max_attempts.
Оценка: 8h
Story: [STORY-051]

[TASK-0253] Design UAD builder
Тип: Design
Описание: Макет конструктора сценариев переотправки.
Критерии готовности (DoD):
- [ ] Логика сценария читаема без тех. знаний.
Оценка: 4h
Story: [STORY-051]

[TASK-0254] QA scenario lifecycle
Тип: QA
Описание: Тесты create/publish/rollback сценариев.
Критерии готовности (DoD):
- [ ] Сценарии корректно версионируются.
Оценка: 4h
Story: [STORY-051]

[TASK-0255] Config deploy pipeline
Тип: DevOps
Описание: Надежное выкатывание активной версии сценариев.
Критерии готовности (DoD):
- [ ] Rollback работает без downtime.
Оценка: 4h
Story: [STORY-051]

---

[STORY-052] Scheduled Resend Engine
Как Network Admin, я хочу запускать переотправку по расписанию, чтобы равномерно распределять нагрузку и не терять лиды.

Acceptance Criteria:
- [ ] AC1: Планировщик поддерживает cron-like расписание и timezone.
- [ ] AC2: Один лид не может быть в двух активных resend jobs одновременно.
- [ ] AC3: Retry policy UAD jobs: `3` попытки, затем DLQ.

Story Points: 8
Приоритет: Must
Epic: [EPIC-09]
Зависит от: [STORY-051]

#### Tasks для STORY-052:

[TASK-0256] UAD scheduler backend
Тип: Backend
Описание: Планировщик и lock-механизм для resend jobs.
Критерии готовности (DoD):
- [ ] Исключены конкурирующие запуски одного лида.
Оценка: 8h
Story: [STORY-052]

[TASK-0257] UI scheduler settings
Тип: Frontend
Описание: Настройка расписания и окна активности.
Критерии готовности (DoD):
- [ ] Поддержан preview next run.
Оценка: 4h
Story: [STORY-052]

[TASK-0258] Design schedule UI
Тип: Design
Описание: Компоненты выбора времени/дней/таймзоны.
Критерии готовности (DoD):
- [ ] DST кейсы учтены в интерфейсе.
Оценка: 2h
Story: [STORY-052]

[TASK-0259] QA concurrency tests
Тип: QA
Описание: Проверка lock и повторных запусков.
Критерии готовности (DoD):
- [ ] Нет duplicate resend в конкурентной нагрузке.
Оценка: 8h
Story: [STORY-052]

[TASK-0260] Queue reliability tuning
Тип: DevOps
Описание: Надежность очереди UAD и DLQ мониторинг.
Критерии готовности (DoD):
- [ ] DLQ age мониторится алертом.
Оценка: 4h
Story: [STORY-052]

---

[STORY-053] Status/GEO-based Resend Filters
Как Affiliate Manager, я хочу фильтровать лиды для resend по статусу и GEO, чтобы не расходовать попытки на бесперспективные сегменты.

Acceptance Criteria:
- [ ] AC1: Фильтры include/exclude по `status`, `geo`, `age_hours`, `attempt_count`.
- [ ] AC2: Валидация: нельзя выбрать mutually exclusive фильтры.
- [ ] AC3: Dry-run preview показывает количество лидов до запуска.

Story Points: 5
Приоритет: Must
Epic: [EPIC-09]
Зависит от: [STORY-051]

#### Tasks для STORY-053:

[TASK-0261] Filter evaluator backend
Тип: Backend
Описание: Движок фильтров и dry-run подсчет.
Критерии готовности (DoD):
- [ ] Dry-run и фактический выбор совпадают >=99%.
Оценка: 8h
Story: [STORY-053]

[TASK-0262] UI resend filters
Тип: Frontend
Описание: Форма фильтрации с preview count.
Критерии готовности (DoD):
- [ ] Ошибки конфликтов видны до сохранения.
Оценка: 4h
Story: [STORY-053]

[TASK-0263] Design filter chips
Тип: Design
Описание: Компоненты фильтров и конфликтных состояний.
Критерии готовности (DoD):
- [ ] Конфликты подсвечены и объяснены.
Оценка: 2h
Story: [STORY-053]

[TASK-0264] QA filter edge cases
Тип: QA
Описание: Тесты конфликтов, пустых выборок, age границ.
Критерии готовности (DoD):
- [ ] Проверены граничные значения age/attempt.
Оценка: 4h
Story: [STORY-053]

[TASK-0265] Query optimization for preview
Тип: DevOps
Описание: Оптимизировать выборку под dry-run preview.
Критерии готовности (DoD):
- [ ] Preview response <1s p95.
Оценка: 4h
Story: [STORY-053]

---

[STORY-054] Continuous Mode with Proxy Support
Как Team Lead, я хочу continuous mode переотправки с прокси, чтобы поддерживать постоянную обработку очереди.

Acceptance Criteria:
- [ ] AC1: Continuous mode обрабатывает новые подходящие лиды каждые `60s`.
- [ ] AC2: Поддерживается привязка proxy policy к сценарию UAD.
- [ ] AC3: Можно безопасно остановить/возобновить режим без потери состояния.

Story Points: 5
Приоритет: Should
Epic: [EPIC-09]
Зависит от: [STORY-052], [STORY-048]

#### Tasks для STORY-054:

[TASK-0266] Continuous runner backend
Тип: Backend
Описание: Фоновый runner для непрерывного режима UAD.
Критерии готовности (DoD):
- [ ] Поддержан pause/resume with checkpoint.
Оценка: 8h
Story: [STORY-054]

[TASK-0267] UI mode control
Тип: Frontend
Описание: Тумблер continuous mode и статус раннера.
Критерии готовности (DoD):
- [ ] Видно время последнего цикла.
Оценка: 4h
Story: [STORY-054]

[TASK-0268] Design mode status badge
Тип: Design
Описание: Компонент статуса continuous mode.
Критерии готовности (DoD):
- [ ] Есть paused/running/error статусы.
Оценка: 2h
Story: [STORY-054]

[TASK-0269] QA lifecycle tests
Тип: QA
Описание: Проверить pause/resume и восстановление после сбоя.
Критерии готовности (DoD):
- [ ] Нет потери задач при restart.
Оценка: 4h
Story: [STORY-054]

[TASK-0270] Process supervisor config
Тип: DevOps
Описание: Надежный supervisor для long-running UAD workers.
Критерии готовности (DoD):
- [ ] Auto-restart и health checks настроены.
Оценка: 4h
Story: [STORY-054]

---

[STORY-055] UAD Performance Analytics
Как Team Lead, я хочу видеть эффективность UAD-сценариев, чтобы улучшать recovery strategy.

Acceptance Criteria:
- [ ] AC1: Метрики: `resend_count`, `success_after_resend`, `avg_attempts`, `revenue_recovered`.
- [ ] AC2: Сравнение по сценариям и периодам.
- [ ] AC3: Экспорт отчета в CSV.

Story Points: 3
Приоритет: Should
Epic: [EPIC-09]
Зависит от: [STORY-052], [STORY-053]

#### Tasks для STORY-055:

[TASK-0271] UAD analytics backend
Тип: Backend
Описание: Агрегация KPI по сценариям UAD.
Критерии готовности (DoD):
- [ ] Поддержана группировка по affiliate/broker.
Оценка: 8h
Story: [STORY-055]

[TASK-0272] UI UAD analytics panel
Тип: Frontend
Описание: Дашборд эффективности UAD.
Критерии готовности (DoD):
- [ ] Доступно сравнение сценариев.
Оценка: 4h
Story: [STORY-055]

[TASK-0273] Design UAD charts
Тип: Design
Описание: Графики recovered revenue и success rate.
Критерии готовности (DoD):
- [ ] Поддержаны stacked и line chart варианты.
Оценка: 2h
Story: [STORY-055]

[TASK-0274] QA analytics reconciliation
Тип: QA
Описание: Сверка recovered revenue с исходными данными.
Критерии готовности (DoD):
- [ ] Расхождение <0.1%.
Оценка: 4h
Story: [STORY-055]

[TASK-0275] Reporting DB read path
Тип: DevOps
Описание: Выделенный read-path для UAD аналитики.
Критерии готовности (DoD):
- [ ] Отчеты не влияют на OLTP нагрузку.
Оценка: 4h
Story: [STORY-055]

---

## [EPIC-10] Analytics Dashboard v1

Цель: Стать BI-layer в нише affiliate marketing: time-series, P&L, drill-down, ROI и предиктивные предупреждения как ключевое конкурентное преимущество.

Метрика успеха:
- 80% daily-active клиентов используют аналитический модуль
- Time-to-insight для ключевого вопроса `<60 секунд`
- Retention uplift после внедрения аналитики `>=15%`

Приоритет: P1 (Launch)  
Зависит от: [EPIC-01], [EPIC-02], [EPIC-12], [EPIC-18]  
Оценка: XL (3+ мес)

### Stories

[STORY-056] Realtime KPI Tiles
Как Team Lead, я хочу видеть realtime KPI tiles, чтобы моментально оценивать состояние бизнеса.

Acceptance Criteria:
- [ ] AC1: KPI: `leads`, `qualified`, `ftd`, `revenue`, `cost`, `pnl`.
- [ ] AC2: Обновление каждые `30s`, freshness `<60s`.
- [ ] AC3: RBAC скрывает финансовые KPI для ролей без Finance доступа.

Story Points: 5
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-030], [STORY-068]

#### Tasks для STORY-056:

[TASK-0276] KPI aggregation API
Тип: Backend
Описание: Endpoint realtime KPI с ролевой фильтрацией.
Критерии готовности (DoD):
- [ ] Финансовые поля выдаются только разрешенным ролям.
Оценка: 8h
Story: [STORY-056]

[TASK-0277] KPI tiles UI
Тип: Frontend
Описание: Карточки KPI с автообновлением.
Критерии готовности (DoD):
- [ ] Tiles показывают delta vs previous period.
Оценка: 4h
Story: [STORY-056]

[TASK-0278] Design KPI tile set
Тип: Design
Описание: Визуальный набор KPI карточек.
Критерии готовности (DoD):
- [ ] Отличимы positive/negative trends.
Оценка: 2h
Story: [STORY-056]

[TASK-0279] QA KPI accuracy
Тип: QA
Описание: Сверка KPI с source of truth.
Критерии готовности (DoD):
- [ ] Расхождение KPI не более 0.1%.
Оценка: 4h
Story: [STORY-056]

[TASK-0280] Streaming refresh infra
Тип: DevOps
Описание: Обновление метрик с интервалом 30с.
Критерии готовности (DoD):
- [ ] Freshness SLA <60s подтвержден.
Оценка: 4h
Story: [STORY-056]

---

[STORY-057] Time-Series Charts with Drill-Down
Как Team Lead, я хочу time-series графики с drill-down, чтобы находить причины изменения метрик по времени.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/analytics/timeseries?metric&interval&from&to&group_by` поддерживает 1m/5m/1h/1d.
- [ ] AC2: Drill-down из точки графика открывает список лидов/событий за выбранный интервал.
- [ ] AC3: Запрос за 90 дней возвращается `<2s p95`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-056]

#### Tasks для STORY-057:

[TASK-0281] Time-series query engine
Тип: Backend
Описание: API временных рядов и drill-down выборка.
Критерии готовности (DoD):
- [ ] Поддержана downsampling стратегия для длинных периодов.
Оценка: 8h
Story: [STORY-057]

[TASK-0282] Timeseries chart UI
Тип: Frontend
Описание: Интерактивные графики с zoom и drill-down.
Критерии готовности (DoD):
- [ ] Работает выбор интервала мышью и на мобильном.
Оценка: 8h
Story: [STORY-057]

[TASK-0283] Design chart interaction model
Тип: Design
Описание: Паттерны zoom, tooltip, drill-down.
Критерии готовности (DoD):
- [ ] Tooltip содержит сравнение с предыдущим периодом.
Оценка: 4h
Story: [STORY-057]

[TASK-0284] QA chart correctness
Тип: QA
Описание: Проверка корректности бинов и drill-down данных.
Критерии готовности (DoD):
- [ ] Нет расхождения между графиком и таблицей drill-down.
Оценка: 8h
Story: [STORY-057]

[TASK-0285] TSDB optimization
Тип: DevOps
Описание: Оптимизация time-series хранилища.
Критерии готовности (DoD):
- [ ] p95 90-дневного запроса <2s.
Оценка: 8h
Story: [STORY-057]

---

[STORY-058] Affiliate-level P&L Dashboard
Как Finance Manager, я хочу P&L по каждому аффилейту, чтобы принимать решения по бюджетам и выплатам.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/analytics/pnl/affiliates` возвращает `revenue`, `cost`, `gross_profit`, `margin%`.
- [ ] AC2: Поддержан breakdown по дате/GEO/бренду.
- [ ] AC3: Сверка с модулем Conversions & Basic P&L дает расхождение `<0.1%`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-068], [STORY-070]

#### Tasks для STORY-058:

[TASK-0286] Affiliate P&L API
Тип: Backend
Описание: Агрегировать финметрики на affiliate уровне.
Критерии готовности (DoD):
- [ ] Поддержаны multi-currency вычисления.
Оценка: 8h
Story: [STORY-058]

[TASK-0287] UI affiliate P&L table
Тип: Frontend
Описание: Таблица/графики P&L по аффилейтам.
Критерии готовности (DoD):
- [ ] Есть сортировка по margin и gross profit.
Оценка: 4h
Story: [STORY-058]

[TASK-0288] Design finance dashboard components
Тип: Design
Описание: Компоненты финансовых графиков и таблиц.
Критерии готовности (DoD):
- [ ] Негативная маржа явно маркируется.
Оценка: 2h
Story: [STORY-058]

[TASK-0289] QA financial reconciliation
Тип: QA
Описание: Сверка расчетов P&L с источниками.
Критерии готовности (DoD):
- [ ] Расхождение <0.1% подтверждено.
Оценка: 8h
Story: [STORY-058]

[TASK-0290] Finance data mart pipeline
Тип: DevOps
Описание: ETL-пайплайн для финвитрины.
Критерии готовности (DoD):
- [ ] Витрина обновляется не реже 5 минут.
Оценка: 8h
Story: [STORY-058]

---

[STORY-059] Hub/Broker ROI Comparison
Как Team Lead, я хочу сравнивать ROI между хабами и брокерами, чтобы перераспределять трафик в более прибыльные направления.

Acceptance Criteria:
- [ ] AC1: ROI считается как `(revenue - spend) / spend` на уровне hub и broker.
- [ ] AC2: Поддержан периодный compare (`this period vs previous period`).
- [ ] AC3: Drill-down до лидов, формирующих ROI разницу.

Story Points: 5
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-058], [STORY-057]

#### Tasks для STORY-059:

[TASK-0291] ROI comparison API
Тип: Backend
Описание: Расчет ROI и сравнительных дельт.
Критерии готовности (DoD):
- [ ] Формула ROI едина во всех отчетах.
Оценка: 8h
Story: [STORY-059]

[TASK-0292] UI ROI comparison view
Тип: Frontend
Описание: Таблица/график сравнения hub/broker ROI.
Критерии готовности (DoD):
- [ ] Доступен toggle absolute/% change.
Оценка: 4h
Story: [STORY-059]

[TASK-0293] Design compare charts
Тип: Design
Описание: Компоненты period-over-period сравнения.
Критерии готовности (DoD):
- [ ] Легко читаются positive/negative shifts.
Оценка: 2h
Story: [STORY-059]

[TASK-0294] QA ROI formula tests
Тип: QA
Описание: Тестирование корректности ROI формулы и периода сравнения.
Критерии готовности (DoD):
- [ ] Edge-case spend=0 корректно обработан.
Оценка: 4h
Story: [STORY-059]

[TASK-0295] Materialized view tuning
Тип: DevOps
Описание: Материализованные представления для ROI отчетов.
Критерии готовности (DoD):
- [ ] Время ответа <1.5s p95.
Оценка: 4h
Story: [STORY-059]

---

[STORY-060] Traffic Quality Cohort Analysis
Как Team Lead, я хочу когортный анализ качества трафика, чтобы оценивать долгосрочную ценность разных источников.

Acceptance Criteria:
- [ ] AC1: Когорты по `first_seen_date`, `affiliate`, `geo`, `campaign`.
- [ ] AC2: Метрики когорты: `D1/D7/D30 deposit rate`, `avg deposit`, `retention`.
- [ ] AC3: Экспорт cohort heatmap в CSV/PDF.

Story Points: 8
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-058]

#### Tasks для STORY-060:

[TASK-0296] Cohort calculation backend
Тип: Backend
Описание: Расчет когорт и метрик по окнам D1/D7/D30.
Критерии готовности (DoD):
- [ ] Расчет инкрементальный и воспроизводимый.
Оценка: 8h
Story: [STORY-060]

[TASK-0297] UI cohort heatmap
Тип: Frontend
Описание: Heatmap и таблица когорт.
Критерии готовности (DoD):
- [ ] Поддержан drill-down по ячейке heatmap.
Оценка: 8h
Story: [STORY-060]

[TASK-0298] Design cohort visuals
Тип: Design
Описание: Цветовые шкалы и легенды heatmap.
Критерии готовности (DoD):
- [ ] Шкала доступна для color-blind режимов.
Оценка: 4h
Story: [STORY-060]

[TASK-0299] QA cohort math tests
Тип: QA
Описание: Проверка когортных окон и метрик retention.
Критерии готовности (DoD):
- [ ] Расчеты D1/D7/D30 валидированы на эталонном датасете.
Оценка: 8h
Story: [STORY-060]

[TASK-0300] Batch compute scheduler
Тип: DevOps
Описание: Ночные/часовые расчеты когорт с приоритетами.
Критерии готовности (DoD):
- [ ] SLA расчета дневной когорты <15 мин.
Оценка: 4h
Story: [STORY-060]

---

[STORY-061] Shave Detection Analytics
Как Finance Manager, я хочу аналитику shaving по брокерам, чтобы выявлять подозрительные откаты статусов.

Acceptance Criteria:
- [ ] AC1: Детектируются аномалии типа `ftd -> rejected` и `qualified -> new`.
- [ ] AC2: `GET /api/v1/analytics/shave` возвращает `suspected_rate`, `affected_volume`, `broker_rank`.
- [ ] AC3: Алерт при `suspected_rate >3%` за 24 часа.

Story Points: 5
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-024], [STORY-098]

#### Tasks для STORY-061:

[TASK-0301] Shave detection query backend
Тип: Backend
Описание: Вычислять rollback-паттерны статусов.
Критерии готовности (DoD):
- [ ] Поддержаны настраиваемые окна анализа.
Оценка: 8h
Story: [STORY-061]

[TASK-0302] UI shave analytics dashboard
Тип: Frontend
Описание: Дашборд подозрительных откатов и топ брокеров.
Критерии готовности (DoD):
- [ ] Есть drill-down до конкретных lead transitions.
Оценка: 4h
Story: [STORY-061]

[TASK-0303] Design anomaly ranking table
Тип: Design
Описание: Таблица ранжирования broker anomaly.
Критерии готовности (DoD):
- [ ] Критичные значения выделяются.
Оценка: 2h
Story: [STORY-061]

[TASK-0304] QA rollback anomaly tests
Тип: QA
Описание: Проверить детекцию rollback цепочек.
Критерии готовности (DoD):
- [ ] False-positive уровень не выше 5%.
Оценка: 4h
Story: [STORY-061]

[TASK-0305] Alert pipeline for shave
Тип: DevOps
Описание: Поток алертов shaving в уведомления.
Критерии готовности (DoD):
- [ ] Алерт доставляется <1 мин после детекта.
Оценка: 4h
Story: [STORY-061]

---

[STORY-062] Predictive Cap Exhaustion Warnings
Как Affiliate Manager, я хочу предиктивные предупреждения исчерпания капов, чтобы заранее корректировать routing.

Acceptance Criteria:
- [ ] AC1: Модель прогнозирует `time_to_cap_exhaustion` по flow/target.
- [ ] AC2: Warning создается при прогнозе `cap exhaustion <2h`.
- [ ] AC3: Точность прогноза MAPE `<=20%` на 7-дневном окне.

Story Points: 8
Приоритет: Must
Epic: [EPIC-10]
Зависит от: [STORY-018], [STORY-057]

#### Tasks для STORY-062:

[TASK-0306] Forecast service backend
Тип: Backend
Описание: Сервис прогноза времени исчерпания капа.
Критерии готовности (DoD):
- [ ] Возвращает confidence interval прогноза.
Оценка: 8h
Story: [STORY-062]

[TASK-0307] UI predictive warnings
Тип: Frontend
Описание: Блок предупреждений cap exhaustion в дашборде.
Критерии готовности (DoD):
- [ ] Есть quick action: перейти к настройке капа/веса.
Оценка: 4h
Story: [STORY-062]

[TASK-0308] Design warning banners
Тип: Design
Описание: Компоненты предупреждений и confidence индикаторов.
Критерии готовности (DoD):
- [ ] Разделены urgent и informational warnings.
Оценка: 2h
Story: [STORY-062]

[TASK-0309] QA forecast backtesting
Тип: QA
Описание: Backtest модели и проверка качества прогнозов.
Критерии готовности (DoD):
- [ ] MAPE <=20% подтвержден в отчетах.
Оценка: 8h
Story: [STORY-062]

[TASK-0310] Model inference infrastructure
Тип: DevOps
Описание: Инфраструктура регулярного инференса и мониторинга drift.
Критерии готовности (DoD):
- [ ] Drift alerts настроены.
Оценка: 8h
Story: [STORY-062]

---

## [EPIC-11] Notifications & Alerts

Цель: Доставлять критичные события через Telegram, Email и Webhook, чтобы команды реагировали в реальном времени.

Метрика успеха:
- Доставка уведомлений `>=99%`
- Время доставки `<30s p95`
- Снижение missed-incidents на `>=40%`

Приоритет: P1 (Launch)  
Зависит от: [EPIC-06]  
Оценка: M (2-4 нед)

### Stories

[STORY-063] Telegram Bot with Event Subscriptions
Как Team Lead, я хочу получать события в Telegram-боте, чтобы быстро реагировать без входа в CRM.

Acceptance Criteria:
- [ ] AC1: Поддержано минимум 17 событий (lead rejected spike, broker down, cap exhaustion, etc.).
- [ ] AC2: `POST /api/v1/notifications/telegram/subscribe` связывает chat_id с workspace.
- [ ] AC3: Уведомления фильтруются по affiliate/brand/GEO.

Story Points: 8
Приоритет: Must
Epic: [EPIC-11]
Зависит от: [STORY-038]

#### Tasks для STORY-063:

[TASK-0311] Telegram integration backend
Тип: Backend
Описание: Бот-адаптер и подписки на события.
Критерии готовности (DoD):
- [ ] Поддержана валидация ownership chat_id.
Оценка: 8h
Story: [STORY-063]

[TASK-0312] UI Telegram subscription
Тип: Frontend
Описание: Настройка Telegram подписок и фильтров.
Критерии готовности (DoD):
- [ ] Подписки можно включать/выключать по событию.
Оценка: 4h
Story: [STORY-063]

[TASK-0313] Design notification preferences
Тип: Design
Описание: UX настроек каналов уведомлений.
Критерии готовности (DoD):
- [ ] Состояние “not connected” понятно пользователю.
Оценка: 2h
Story: [STORY-063]

[TASK-0314] QA Telegram delivery
Тип: QA
Описание: Проверка доставки событий и фильтров.
Критерии готовности (DoD):
- [ ] Проверены 17+ event templates.
Оценка: 4h
Story: [STORY-063]

[TASK-0315] Notification queue scaling
Тип: DevOps
Описание: Масштабирование очереди уведомлений.
Критерии готовности (DoD):
- [ ] p95 доставки <30s.
Оценка: 4h
Story: [STORY-063]

---

[STORY-064] Email Alerts Engine
Как Network Admin, я хочу email-алерты по критичным событиям, чтобы иметь резервный канал уведомлений.

Acceptance Criteria:
- [ ] AC1: Поддержка шаблонов email для severity `info|warning|critical`.
- [ ] AC2: DKIM/SPF настроены; bounce tracking доступен.
- [ ] AC3: Dedup: одинаковые critical alerts объединяются в окно 5 минут.

Story Points: 5
Приоритет: Must
Epic: [EPIC-11]
Зависит от: [STORY-063]

#### Tasks для STORY-064:

[TASK-0316] Email alert backend
Тип: Backend
Описание: Шаблоны, отправка и dedup email алертов.
Критерии готовности (DoD):
- [ ] Bounce статус записывается в delivery log.
Оценка: 8h
Story: [STORY-064]

[TASK-0317] UI email channel settings
Тип: Frontend
Описание: Настройки email каналов и критичности.
Критерии готовности (DoD):
- [ ] Поддержаны multiple recipients.
Оценка: 4h
Story: [STORY-064]

[TASK-0318] Design email templates
Тип: Design
Описание: Шаблоны писем под разные severity.
Критерии готовности (DoD):
- [ ] Шаблоны читаемы на mobile clients.
Оценка: 2h
Story: [STORY-064]

[TASK-0319] QA email channel tests
Тип: QA
Описание: Проверка доставки, dedup и bounce.
Критерии готовности (DoD):
- [ ] Bounce и retry сценарии покрыты.
Оценка: 4h
Story: [STORY-064]

[TASK-0320] SMTP/provider setup
Тип: DevOps
Описание: Настройка доменов, DKIM/SPF/DMARC.
Критерии готовности (DoD):
- [ ] DMARC pass rate >=98%.
Оценка: 4h
Story: [STORY-064]

---

[STORY-065] Webhook Events Channel
Как Developer, я хочу получать события в webhook, чтобы интегрировать CRM с внешними системами.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/notifications/webhooks` создает endpoint с secret и событиями.
- [ ] AC2: Подпись HMAC и replay-protection timestamp обязательны.
- [ ] AC3: Retry + delivery log + DLQ.

Story Points: 5
Приоритет: Must
Epic: [EPIC-11]
Зависит от: [STORY-011]

#### Tasks для STORY-065:

[TASK-0321] Event webhook backend
Тип: Backend
Описание: Реализация webhook канала для событий платформы.
Критерии готовности (DoD):
- [ ] Replay-protection включен.
Оценка: 8h
Story: [STORY-065]

[TASK-0322] UI webhook channel config
Тип: Frontend
Описание: Настройка endpoint, secret, событий.
Критерии готовности (DoD):
- [ ] Доступна тестовая отправка события.
Оценка: 4h
Story: [STORY-065]

[TASK-0323] Design webhook config form
Тип: Design
Описание: Форма и delivery log компоненты.
Критерии готовности (DoD):
- [ ] Есть rotate secret сценарий.
Оценка: 2h
Story: [STORY-065]

[TASK-0324] QA webhook security
Тип: QA
Описание: Проверка signature/replay/retry.
Критерии готовности (DoD):
- [ ] Невалидная подпись всегда отклоняется.
Оценка: 4h
Story: [STORY-065]

[TASK-0325] Outbound egress controls
Тип: DevOps
Описание: Ограничение и мониторинг исходящих webhook запросов.
Критерии готовности (DoD):
- [ ] Egress failures алертятся.
Оценка: 4h
Story: [STORY-065]

---

[STORY-066] Alert Rules & Threshold Manager
Как Affiliate Manager, я хочу создавать пороговые правила, чтобы получать только релевантные алерты.

Acceptance Criteria:
- [ ] AC1: Rule builder поддерживает метрики, оператор, порог, окно времени.
- [ ] AC2: Уровни `info|warning|critical` и suppress window.
- [ ] AC3: Rule evaluation latency `<10s` после получения метрики.

Story Points: 5
Приоритет: Should
Epic: [EPIC-11]
Зависит от: [STORY-056], [STORY-063]

#### Tasks для STORY-066:

[TASK-0326] Alert rules engine backend
Тип: Backend
Описание: Движок пороговых правил и suppress логика.
Критерии готовности (DoD):
- [ ] Поддержан evaluate interval 10s.
Оценка: 8h
Story: [STORY-066]

[TASK-0327] UI rule builder
Тип: Frontend
Описание: Конструктор условий алертов.
Критерии готовности (DoD):
- [ ] Rule preview отображает ожидаемое срабатывание.
Оценка: 8h
Story: [STORY-066]

[TASK-0328] Design rule builder
Тип: Design
Описание: UX конструктора без перегрузки.
Критерии готовности (DoD):
- [ ] Ошибки некорректных выражений понятны.
Оценка: 4h
Story: [STORY-066]

[TASK-0329] QA threshold tests
Тип: QA
Описание: Проверить пороги, suppress, дубли алертов.
Критерии готовности (DoD):
- [ ] Нет лишних повторов при suppress.
Оценка: 4h
Story: [STORY-066]

[TASK-0330] Event processing stream
Тип: DevOps
Описание: Поток обработки правил в near-realtime.
Критерии готовности (DoD):
- [ ] Processing latency <10s.
Оценка: 8h
Story: [STORY-066]

---

[STORY-067] Notification Delivery Analytics
Как Team Lead, я хочу видеть статистику доставки уведомлений, чтобы контролировать надежность каналов.

Acceptance Criteria:
- [ ] AC1: Метрики `sent`, `delivered`, `failed`, `retry_count` по каналам.
- [ ] AC2: Drill-down до конкретного события.
- [ ] AC3: Отчет по каналам за период экспортируется в CSV.

Story Points: 3
Приоритет: Should
Epic: [EPIC-11]
Зависит от: [STORY-063], [STORY-064], [STORY-065]

#### Tasks для STORY-067:

[TASK-0331] Delivery analytics API
Тип: Backend
Описание: Агрегации доставки уведомлений.
Критерии готовности (DoD):
- [ ] Метрики доступны по каналу и событию.
Оценка: 8h
Story: [STORY-067]

[TASK-0332] UI delivery report
Тип: Frontend
Описание: Дашборд доставки и таблица событий.
Критерии готовности (DoD):
- [ ] Есть фильтр по каналу и статусу.
Оценка: 4h
Story: [STORY-067]

[TASK-0333] Design delivery dashboard
Тип: Design
Описание: Компоненты надежности каналов.
Критерии готовности (DoD):
- [ ] Критичные каналы визуально выделены.
Оценка: 2h
Story: [STORY-067]

[TASK-0334] QA delivery stats
Тип: QA
Описание: Сверка метрик sent/delivered/failed.
Критерии готовности (DoD):
- [ ] Данные совпадают с delivery logs.
Оценка: 4h
Story: [STORY-067]

[TASK-0335] Log retention and partitioning
Тип: DevOps
Описание: Хранение логов уведомлений и индексация.
Критерии готовности (DoD):
- [ ] Запрос за 90 дней <2s p95.
Оценка: 4h
Story: [STORY-067]

---

## [EPIC-12] Conversions & Basic P&L

Цель: Зафиксировать депозиты и базовый P&L (buy vs sell), чтобы команда могла управлять прибыльностью.

Метрика успеха:
- Conversions capture completeness `>=99%`
- Расхождение reconciliation с брокером `<1%`
- Время закрытия финансового периода сокращено на `30%`

Приоритет: P1 (Launch)  
Зависит от: [EPIC-03], [EPIC-05]  
Оценка: L (1-3 мес)

### Stories

[STORY-068] Conversion Ingestion
Как Finance Manager, я хочу принимать события депозитов, чтобы считать выручку по лидам.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/conversions` принимает `lead_id`, `conversion_type`, `amount`, `currency`, `event_ts`.
- [ ] AC2: Idempotency по `conversion_external_id` обязательна.
- [ ] AC3: Невалидный lead_id возвращает `404 lead_not_found`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-12]
Зависит от: [STORY-024]

#### Tasks для STORY-068:

[TASK-0336] Conversion ingestion backend
Тип: Backend
Описание: Прием и валидация conversion событий.
Критерии готовности (DoD):
- [ ] Idempotency работает для повторов.
Оценка: 8h
Story: [STORY-068]

[TASK-0337] UI conversion list
Тип: Frontend
Описание: Таблица conversion событий и фильтры.
Критерии готовности (DoD):
- [ ] Есть поиск по lead_id/external_id.
Оценка: 4h
Story: [STORY-068]

[TASK-0338] Design conversion table
Тип: Design
Описание: Макет таблицы конверсий.
Критерии готовности (DoD):
- [ ] Показаны статусы валидности и source.
Оценка: 2h
Story: [STORY-068]

[TASK-0339] QA conversion idempotency
Тип: QA
Описание: Проверка повторов и ошибок валидации.
Критерии готовности (DoD):
- [ ] Нет дубликатов при повторной доставке.
Оценка: 4h
Story: [STORY-068]

[TASK-0340] Event ingestion queue
Тип: DevOps
Описание: Очередь приема conversion событий.
Критерии готовности (DoD):
- [ ] Потеря событий = 0 при failover.
Оценка: 4h
Story: [STORY-068]

---

[STORY-069] Buy Price vs Sell Price Setup
Как Finance Manager, я хочу задавать buy/sell цены, чтобы рассчитывать базовый P&L.

Acceptance Criteria:
- [ ] AC1: `PUT /api/v1/finance/pricing-rules` поддерживает правила по affiliate/broker/GEO.
- [ ] AC2: Поддержка fixed и percentage моделей.
- [ ] AC3: Изменения применяются только к новым событиям после effective date.

Story Points: 5
Приоритет: Must
Epic: [EPIC-12]
Зависит от: [STORY-068]

#### Tasks для STORY-069:

[TASK-0341] Pricing rules backend
Тип: Backend
Описание: Хранение и применение pricing rules.
Критерии готовности (DoD):
- [ ] Effective date логика покрыта тестами.
Оценка: 8h
Story: [STORY-069]

[TASK-0342] UI pricing rules form
Тип: Frontend
Описание: Форма правил ценообразования.
Критерии готовности (DoD):
- [ ] Есть валидация диапазонов и конфликтов.
Оценка: 4h
Story: [STORY-069]

[TASK-0343] Design pricing rule editor
Тип: Design
Описание: Редактор pricing правил и приоритетов.
Критерии готовности (DoD):
- [ ] Видна иерархия override правил.
Оценка: 2h
Story: [STORY-069]

[TASK-0344] QA pricing calculation
Тип: QA
Описание: Проверка fixed/% моделей и effective date.
Критерии готовности (DoD):
- [ ] Расчеты совпадают с эталоном 100%.
Оценка: 4h
Story: [STORY-069]

[TASK-0345] Config audit + rollback
Тип: DevOps
Описание: Аудит и откат pricing конфигурации.
Критерии готовности (DoD):
- [ ] Rollback выполняется <5 минут.
Оценка: 4h
Story: [STORY-069]

---

[STORY-070] Basic P&L Report
Как Finance Manager, я хочу отчет P&L по аффилейтам/брокерам, чтобы отслеживать маржинальность.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/finance/pnl?group_by=affiliate|broker|geo`.
- [ ] AC2: Метрики `revenue`, `cost`, `profit`, `margin%`.
- [ ] AC3: Экспорт отчета в CSV/XLSX.

Story Points: 8
Приоритет: Must
Epic: [EPIC-12]
Зависит от: [STORY-068], [STORY-069]

#### Tasks для STORY-070:

[TASK-0346] P&L report backend
Тип: Backend
Описание: Расчет базового P&L по срезам.
Критерии готовности (DoD):
- [ ] Поддержана группировка по 3 измерениям.
Оценка: 8h
Story: [STORY-070]

[TASK-0347] UI P&L report
Тип: Frontend
Описание: Экран финансового отчета и экспорт.
Критерии готовности (DoD):
- [ ] Есть фильтр периода и валюты.
Оценка: 4h
Story: [STORY-070]

[TASK-0348] Design finance report layout
Тип: Design
Описание: Макет отчета с акцентом на маржу.
Критерии готовности (DoD):
- [ ] Негативные показатели визуально выделены.
Оценка: 2h
Story: [STORY-070]

[TASK-0349] QA report reconciliation
Тип: QA
Описание: Сверка отчета с conversion и pricing данными.
Критерии готовности (DoD):
- [ ] Расхождение <0.1%.
Оценка: 8h
Story: [STORY-070]

[TASK-0350] Finance reporting pipeline
Тип: DevOps
Описание: Расчет витрины P&L по расписанию.
Критерии готовности (DoD):
- [ ] Отчет обновляется не реже 15 минут.
Оценка: 4h
Story: [STORY-070]

---

[STORY-071] Broker Reconciliation Workflow
Как Finance Manager, я хочу сверять данные с брокером, чтобы выявлять расхождения и споры.

Acceptance Criteria:
- [ ] AC1: Импорт брокерского отчета `csv/xlsx` через `POST /api/v1/finance/reconciliation/import`.
- [ ] AC2: Автоматический матч по `external_lead_id`, `amount`, `event_ts`.
- [ ] AC3: Расхождения классифицируются по типам (`missing`, `amount_mismatch`, `status_mismatch`).

Story Points: 5
Приоритет: Must
Epic: [EPIC-12]
Зависит от: [STORY-070]

#### Tasks для STORY-071:

[TASK-0351] Reconciliation import backend
Тип: Backend
Описание: Парсинг брокерских файлов и матчинг событий.
Критерии готовности (DoD):
- [ ] Поддержаны CSV/XLSX форматы.
Оценка: 8h
Story: [STORY-071]

[TASK-0352] UI reconciliation screen
Тип: Frontend
Описание: Экран загрузки файла и списка расхождений.
Критерии готовности (DoD):
- [ ] Доступен фильтр по типу расхождения.
Оценка: 4h
Story: [STORY-071]

[TASK-0353] Design discrepancy table
Тип: Design
Описание: Таблица расхождений и статусов разбора.
Критерии готовности (DoD):
- [ ] Есть action panel для пометки resolved.
Оценка: 2h
Story: [STORY-071]

[TASK-0354] QA reconciliation matching
Тип: QA
Описание: Тесты matching логики и edge форматов файлов.
Критерии готовности (DoD):
- [ ] Match accuracy >=99% на тестовом наборе.
Оценка: 4h
Story: [STORY-071]

[TASK-0355] File processing workers
Тип: DevOps
Описание: Воркеры импорта и безопасная обработка файлов.
Критерии готовности (DoD):
- [ ] Файлы сканируются и удаляются по retention.
Оценка: 4h
Story: [STORY-071]

---

[STORY-072] Finance Export Pack
Как Finance Manager, я хочу пакетный экспорт финансовых отчетов, чтобы закрывать месячную отчетность.

Acceptance Criteria:
- [ ] AC1: Экспорт включает P&L, conversion ledger, reconciliation summary.
- [ ] AC2: Форматы `csv/xlsx/pdf`.
- [ ] AC3: Сгенерированный пакет доступен по защищенной ссылке 24 часа.

Story Points: 3
Приоритет: Should
Epic: [EPIC-12]
Зависит от: [STORY-070], [STORY-071]

#### Tasks для STORY-072:

[TASK-0356] Finance export pack backend
Тип: Backend
Описание: Генерация пакетного отчета по шаблону.
Критерии готовности (DoD):
- [ ] Все секции включаются в один пакет.
Оценка: 8h
Story: [STORY-072]

[TASK-0357] UI export pack action
Тип: Frontend
Описание: Кнопка и прогресс генерации пакета.
Критерии готовности (DoD):
- [ ] Пользователь видит статус готовности.
Оценка: 4h
Story: [STORY-072]

[TASK-0358] Design export pack UX
Тип: Design
Описание: Экран генерации и загрузки пакета.
Критерии готовности (DoD):
- [ ] Указаны ограничения размера/времени.
Оценка: 2h
Story: [STORY-072]

[TASK-0359] QA pack consistency
Тип: QA
Описание: Проверка полноты и корректности файлов в пакете.
Критерии готовности (DoD):
- [ ] Содержимое соответствует исходным отчетам.
Оценка: 4h
Story: [STORY-072]

[TASK-0360] Secure artifact storage
Тип: DevOps
Описание: Защищенное хранение и expiry export пакетов.
Критерии готовности (DoD):
- [ ] Ссылки истекают через 24 часа.
Оценка: 4h
Story: [STORY-072]

---

## [EPIC-13] Onboarding & Setup Wizard

Цель: Привести клиента от регистрации до первого отправленного лида за `<30 минут` с понятным guided setup.

Метрика успеха:
- Time-to-first-lead `<30 минут`
- Completion rate wizard `>=75%`
- Снижение onboarding support tickets `>=40%`

Приоритет: P1 (Launch)  
Зависит от: [EPIC-01], [EPIC-02], [EPIC-03], [EPIC-04], [EPIC-06]  
Оценка: L (1-3 мес)

### Stories

[STORY-073] Guided Setup Wizard
Как Network Admin, я хочу пошаговый wizard, чтобы не собирать систему вручную из 7+ сложных шагов.

Acceptance Criteria:
- [ ] AC1: Шаги wizard: `Company -> Affiliate -> Broker -> Flow -> Test Lead -> Go Live`.
- [ ] AC2: Каждый шаг содержит объяснение, пример и ссылку на документацию.
- [ ] AC3: Время прохождения полного wizard для нового клиента `<30 минут` (median).

Story Points: 8
Приоритет: Must
Epic: [EPIC-13]
Зависит от: [STORY-013], [STORY-021], [STORY-026]

#### Tasks для STORY-073:

[TASK-0361] Wizard state backend
Тип: Backend
Описание: Сервис шагов, сохранения прогресса и resume.
Критерии готовности (DoD):
- [ ] Прогресс восстанавливается после logout.
Оценка: 8h
Story: [STORY-073]

[TASK-0362] Multi-step wizard UI
Тип: Frontend
Описание: Пошаговый интерфейс с прогресс-баром.
Критерии готовности (DoD):
- [ ] Шаги нельзя пропустить без выполнения обязательных полей.
Оценка: 8h
Story: [STORY-073]

[TASK-0363] Design wizard journey
Тип: Design
Описание: Полный UX-флоу onboarding мастера.
Критерии готовности (DoD):
- [ ] На каждом шаге есть helper content.
Оценка: 4h
Story: [STORY-073]

[TASK-0364] QA end-to-end wizard
Тип: QA
Описание: E2E сценарий от signup до test lead.
Критерии готовности (DoD):
- [ ] E2E проходит на чистом tenant без ручных действий.
Оценка: 8h
Story: [STORY-073]

[TASK-0365] Wizard telemetry instrumentation
Тип: DevOps
Описание: Сбор метрик времени и drop-off по шагам.
Критерии готовности (DoD):
- [ ] Видна воронка completion/drop-off.
Оценка: 4h
Story: [STORY-073]

---

[STORY-074] Ready-to-use Templates
Как Affiliate Manager, я хочу шаблоны под ключ, чтобы запустить стандартные сценарии без глубокой настройки.

Acceptance Criteria:
- [ ] AC1: Доступны шаблоны `Crypto CPA`, `Forex CPL`, `Hybrid`.
- [ ] AC2: Применение шаблона создает affiliate+broker+flow pre-config.
- [ ] AC3: После применения можно отправить test lead без ручного редактирования.

Story Points: 8
Приоритет: Must
Epic: [EPIC-13]
Зависит от: [STORY-073]

#### Tasks для STORY-074:

[TASK-0366] Template engine backend
Тип: Backend
Описание: Применение шаблонов и генерация сущностей.
Критерии готовности (DoD):
- [ ] Шаблоны версионируются и аудируются.
Оценка: 8h
Story: [STORY-074]

[TASK-0367] UI template picker
Тип: Frontend
Описание: Выбор шаблона с preview состава.
Критерии готовности (DoD):
- [ ] Показываются создаваемые сущности до применения.
Оценка: 4h
Story: [STORY-074]

[TASK-0368] Design template cards
Тип: Design
Описание: Карточки шаблонов и сценариев.
Критерии готовности (DoD):
- [ ] Есть clear differentiation по use-case.
Оценка: 2h
Story: [STORY-074]

[TASK-0369] QA template integrity
Тип: QA
Описание: Проверка валидности generated configs.
Критерии готовности (DoD):
- [ ] Test lead проходит на каждом шаблоне.
Оценка: 4h
Story: [STORY-074]

[TASK-0370] Template distribution pipeline
Тип: DevOps
Описание: Доставка обновлений шаблонов в прод.
Критерии готовности (DoD):
- [ ] Rollback шаблона доступен.
Оценка: 4h
Story: [STORY-074]

---

[STORY-075] In-app Contextual Documentation
Как Developer, я хочу встроенную документацию в каждом шаге, чтобы не переключаться между CRM и внешними гайдами.

Acceptance Criteria:
- [ ] AC1: Для каждого шага есть inline docs + code examples.
- [ ] AC2: Поиск по документации работает `<500ms p95`.
- [ ] AC3: Docs версионированы и соответствуют текущему API contract.

Story Points: 5
Приоритет: Must
Epic: [EPIC-13]
Зависит от: [STORY-073], [STORY-002]

#### Tasks для STORY-075:

[TASK-0371] Docs content API
Тип: Backend
Описание: Хранение и выдача контентных блоков документации.
Критерии готовности (DoD):
- [ ] Поддержано versioning docs по API версии.
Оценка: 8h
Story: [STORY-075]

[TASK-0372] UI docs drawer
Тип: Frontend
Описание: Встроенная панель документации с поиском.
Критерии готовности (DoD):
- [ ] Поиск по ключевым словам работает без full reload.
Оценка: 4h
Story: [STORY-075]

[TASK-0373] Design docs components
Тип: Design
Описание: Компоненты статей, snippets и callouts.
Критерии готовности (DoD):
- [ ] Блоки читаемы на desktop/mobile.
Оценка: 2h
Story: [STORY-075]

[TASK-0374] QA docs-version sync
Тип: QA
Описание: Проверка соответствия примеров текущим API.
Критерии готовности (DoD):
- [ ] Невалидные примеры автоматически флагируются.
Оценка: 4h
Story: [STORY-075]

[TASK-0375] Docs build/deploy workflow
Тип: DevOps
Описание: Pipeline публикации и версионирования docs.
Критерии готовности (DoD):
- [ ] Деплой docs атомарный и обратимый.
Оценка: 4h
Story: [STORY-075]

---

[STORY-076] Onboarding Health & Recovery
Как Team Lead, я хочу видеть где клиенты дропаются в онбординге, чтобы улучшать конверсию setup.

Acceptance Criteria:
- [ ] AC1: Метрики `step_completion_rate`, `step_time`, `drop_off_reason`.
- [ ] AC2: Автоматические nudges при простое на шаге >24h.
- [ ] AC3: Экспорт cohort onboarding report.

Story Points: 5
Приоритет: Should
Epic: [EPIC-13]
Зависит от: [STORY-073], [STORY-075]

#### Tasks для STORY-076:

[TASK-0376] Onboarding analytics backend
Тип: Backend
Описание: Агрегация воронки и причин drop-off.
Критерии готовности (DoD):
- [ ] Метрики доступны по шаблонам и ролям.
Оценка: 8h
Story: [STORY-076]

[TASK-0377] UI onboarding funnel dashboard
Тип: Frontend
Описание: Дашборд этапов и drop-off.
Критерии готовности (DoD):
- [ ] Поддержано сравнение периодов.
Оценка: 4h
Story: [STORY-076]

[TASK-0378] Design funnel widgets
Тип: Design
Описание: Виджеты воронки и причин отказа.
Критерии готовности (DoD):
- [ ] Визуально выделяются узкие места.
Оценка: 2h
Story: [STORY-076]

[TASK-0379] QA funnel calculations
Тип: QA
Описание: Проверка корректности funnel-метрик.
Критерии готовности (DoD):
- [ ] Конверсия по шагам совпадает с raw telemetry.
Оценка: 4h
Story: [STORY-076]

[TASK-0380] Nudge notification cron
Тип: DevOps
Описание: Отправка nudge уведомлений по правилам простоя.
Критерии готовности (DoD):
- [ ] Nudge отрабатывает в целевых окнах времени.
Оценка: 4h
Story: [STORY-076]

---

[STORY-077] One-click Test Lead & Go-live Gate
Как Network Admin, я хочу запускать один тестовый лид и получать check-list готовности, чтобы безопасно выйти в прод.

Acceptance Criteria:
- [ ] AC1: Кнопка `Send test lead` проходит полный путь intake->routing->broker->status.
- [ ] AC2: Go-live gate требует 100% прохождения обязательных проверок.
- [ ] AC3: При fail выводится actionable чеклист исправлений.

Story Points: 5
Приоритет: Must
Epic: [EPIC-13]
Зависит от: [STORY-073], [STORY-074]

#### Tasks для STORY-077:

[TASK-0381] Go-live validator backend
Тип: Backend
Описание: Сервис проверки readiness и test lead транзакции.
Критерии готовности (DoD):
- [ ] Возвращает список blocking issues.
Оценка: 8h
Story: [STORY-077]

[TASK-0382] UI go-live checklist
Тип: Frontend
Описание: Экран готовности и кнопка отправки тестового лида.
Критерии готовности (DoD):
- [ ] Видны pass/fail статусы по каждому пункту.
Оценка: 4h
Story: [STORY-077]

[TASK-0383] Design readiness checklist
Тип: Design
Описание: Компонент check-list и статусов.
Критерии готовности (DoD):
- [ ] Чеклист читабелен и приоритизирует blockers.
Оценка: 2h
Story: [STORY-077]

[TASK-0384] QA go-live E2E
Тип: QA
Описание: Полный E2E тест send test lead + gate fail/pass.
Критерии готовности (DoD):
- [ ] Ошибки gate воспроизводимы и детерминированы.
Оценка: 8h
Story: [STORY-077]

[TASK-0385] Staging smoke automation
Тип: DevOps
Описание: Автоматические smoke-тесты go-live сценариев в staging.
Критерии готовности (DoD):
- [ ] Smoke запускаются на каждом релизе.
Оценка: 4h
Story: [STORY-077]

