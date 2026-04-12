## [EPIC-14] Advanced Analytics & BI

Цель: Дать power-users полноценный BI-слой: кастомные отчеты, конструктор дашбордов, когорты, сравнение периодов и scheduled reports.

Метрика успеха:
- 50% enterprise-клиентов используют кастомные отчеты еженедельно
- Time-to-build report `<10 минут`
- Scheduled reports delivery success `>=99%`

Приоритет: P2 (Growth)  
Зависит от: [EPIC-10], [EPIC-12]  
Оценка: XL (3+ мес)

### Stories

[STORY-078] Custom Report Builder
Как Team Lead, я хочу собирать кастомные отчеты по метрикам и измерениям, чтобы получать ответы под конкретные бизнес-вопросы.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/bi/reports` поддерживает выбор `metrics[]`, `dimensions[]`, `filters[]`, `time_range`.
- [ ] AC2: Ограничение: до 10 метрик и 8 измерений на отчет.
- [ ] AC3: Превью отчета генерируется `<3s p95`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-14]
Зависит от: [STORY-057], [STORY-058]

#### Tasks для STORY-078:

[TASK-0386] BI report query engine
Тип: Backend
Описание: Универсальный движок построения запросов BI.
Критерии готовности (DoD):
- [ ] Поддержаны фильтры и группировки по конфигурации.
Оценка: 8h
Story: [STORY-078]

[TASK-0387] UI report builder
Тип: Frontend
Описание: Конструктор метрик/измерений/фильтров.
Критерии готовности (DoD):
- [ ] Drag-and-drop полей и preview реализованы.
Оценка: 8h
Story: [STORY-078]

[TASK-0388] Design builder workspace
Тип: Design
Описание: Рабочее пространство построения отчета.
Критерии готовности (DoD):
- [ ] Понятна структура metric vs dimension.
Оценка: 4h
Story: [STORY-078]

[TASK-0389] QA report builder matrix
Тип: QA
Описание: Проверка комбинаций метрик/измерений/фильтров.
Критерии готовности (DoD):
- [ ] Покрыто не менее 40 query-сценариев.
Оценка: 8h
Story: [STORY-078]

[TASK-0390] BI compute cluster autoscale
Тип: DevOps
Описание: Автоскейл вычислений BI-запросов.
Критерии готовности (DoD):
- [ ] p95 preview <3s на пиковых нагрузках.
Оценка: 8h
Story: [STORY-078]

---

[STORY-079] Dashboard Constructor
Как Team Lead, я хочу собирать собственные дашборды из виджетов, чтобы мониторить именно свои KPI.

Acceptance Criteria:
- [ ] AC1: Поддержка widget типов: KPI, line, bar, table, heatmap.
- [ ] AC2: До 20 виджетов на дашборд, сохранение layout.
- [ ] AC3: Загрузка дашборда `<2s p95`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-14]
Зависит от: [STORY-078]

#### Tasks для STORY-079:

[TASK-0391] Dashboard layout backend
Тип: Backend
Описание: Хранение layout и конфигов виджетов.
Критерии готовности (DoD):
- [ ] Поддержан versioning layout.
Оценка: 8h
Story: [STORY-079]

[TASK-0392] UI dashboard builder
Тип: Frontend
Описание: Drag-and-drop размещение виджетов.
Критерии готовности (DoD):
- [ ] Resize/reorder виджетов без лагов.
Оценка: 8h
Story: [STORY-079]

[TASK-0393] Design widget library
Тип: Design
Описание: Библиотека аналитических виджетов.
Критерии готовности (DoD):
- [ ] Виджеты единообразны по стилю и состояниям.
Оценка: 4h
Story: [STORY-079]

[TASK-0394] QA dashboard persistence
Тип: QA
Описание: Проверка сохранения и восстановления layout.
Критерии готовности (DoD):
- [ ] Layout консистентен после logout/login.
Оценка: 4h
Story: [STORY-079]

[TASK-0395] Static asset optimization
Тип: DevOps
Описание: Оптимизация загрузки dashboard assets.
Критерии готовности (DoD):
- [ ] TTI dashboard <2s p95.
Оценка: 4h
Story: [STORY-079]

---

[STORY-080] Period Comparison & Trend Analysis
Как Finance Manager, я хочу сравнивать периоды, чтобы понимать динамику качества и прибыльности трафика.

Acceptance Criteria:
- [ ] AC1: Сравнение `current vs previous` и `YoY` для выбранных метрик.
- [ ] AC2: Поддержка абсолютного и процентного delta.
- [ ] AC3: API `GET /api/v1/bi/compare` отвечает `<2s p95` за 1 год данных.

Story Points: 5
Приоритет: Must
Epic: [EPIC-14]
Зависит от: [STORY-058], [STORY-059]

#### Tasks для STORY-080:

[TASK-0396] Period compare backend
Тип: Backend
Описание: Расчеты compare-дельт и трендов.
Критерии готовности (DoD):
- [ ] Edge-case нулевой базы обработан корректно.
Оценка: 8h
Story: [STORY-080]

[TASK-0397] UI period compare controls
Тип: Frontend
Описание: Элементы выбора периодов и типа сравнения.
Критерии готовности (DoD):
- [ ] Доступен быстрый switch preset периодов.
Оценка: 4h
Story: [STORY-080]

[TASK-0398] Design comparison indicators
Тип: Design
Описание: Индикаторы трендов и delta.
Критерии готовности (DoD):
- [ ] Positive/negative delta читаются мгновенно.
Оценка: 2h
Story: [STORY-080]

[TASK-0399] QA period math tests
Тип: QA
Описание: Проверка формул delta и выборок периодов.
Критерии готовности (DoD):
- [ ] Формулы валидированы на эталонном наборе.
Оценка: 4h
Story: [STORY-080]

[TASK-0400] BI cache strategy
Тип: DevOps
Описание: Кэш часто запрашиваемых compare отчетов.
Критерии готовности (DoD):
- [ ] p95 сравнения <2s.
Оценка: 4h
Story: [STORY-080]

---

[STORY-081] Scheduled Email Reports
Как Team Lead, я хочу получать scheduled отчеты по email, чтобы регулярно отслеживать KPI без ручного входа в систему.

Acceptance Criteria:
- [ ] AC1: Расписания `daily/weekly/monthly` с timezone-aware отправкой.
- [ ] AC2: Форматы вложений `csv/xlsx/pdf`.
- [ ] AC3: Неуспешная отправка retry 3 раза, затем alert.

Story Points: 5
Приоритет: Should
Epic: [EPIC-14]
Зависит от: [STORY-078], [STORY-064]

#### Tasks для STORY-081:

[TASK-0401] Scheduled reports backend
Тип: Backend
Описание: Планировщик отчетов и доставок.
Критерии готовности (DoD):
- [ ] Расписания учитывают timezone/DST.
Оценка: 8h
Story: [STORY-081]

[TASK-0402] UI report schedules
Тип: Frontend
Описание: Создание и управление расписаниями отчетов.
Критерии готовности (DoD):
- [ ] Есть preview времени следующей отправки.
Оценка: 4h
Story: [STORY-081]

[TASK-0403] Design schedule cards
Тип: Design
Описание: Карточки расписаний и статусов.
Критерии готовности (DoD):
- [ ] Видны upcoming/failed states.
Оценка: 2h
Story: [STORY-081]

[TASK-0404] QA scheduling tests
Тип: QA
Описание: Проверить корректность расписаний и retry.
Критерии готовности (DoD):
- [ ] Проверены DST переходы и timezone смещения.
Оценка: 4h
Story: [STORY-081]

[TASK-0405] Cron orchestration infra
Тип: DevOps
Описание: Надежное выполнение периодических задач.
Критерии готовности (DoD):
- [ ] Missed jobs детектируются и алертятся.
Оценка: 4h
Story: [STORY-081]

---

[STORY-082] Advanced Export Pack (CSV/Excel/PDF)
Как Finance Manager, я хочу расширенный экспорт BI-отчетов, чтобы делиться аналитикой с внешними стейкхолдерами.

Acceptance Criteria:
- [ ] AC1: Один экспорт может включать до 10 отчетов.
- [ ] AC2: PDF поддерживает брендирование (лого + title).
- [ ] AC3: Срок жизни ссылки на экспорт `24h`, после этого `410 gone`.

Story Points: 3
Приоритет: Should
Epic: [EPIC-14]
Зависит от: [STORY-078], [STORY-079]

#### Tasks для STORY-082:

[TASK-0406] Multi-report export backend
Тип: Backend
Описание: Генерация пакета из нескольких BI отчетов.
Критерии готовности (DoD):
- [ ] Пакет валиден для всех форматов.
Оценка: 8h
Story: [STORY-082]

[TASK-0407] UI export pack builder
Тип: Frontend
Описание: Выбор отчетов для пакетного экспорта.
Критерии готовности (DoD):
- [ ] Ограничение 10 отчетов валидируется.
Оценка: 4h
Story: [STORY-082]

[TASK-0408] Design export pack modal
Тип: Design
Описание: Интерфейс пакетного экспорта и предпросмотра.
Критерии готовности (DoD):
- [ ] Понятны ограничения и статус генерации.
Оценка: 2h
Story: [STORY-082]

[TASK-0409] QA export package tests
Тип: QA
Описание: Проверка состава, форматов и expiry ссылок.
Критерии готовности (DoD):
- [ ] После expiry возвращается 410.
Оценка: 4h
Story: [STORY-082]

[TASK-0410] Artifact lifecycle infra
Тип: DevOps
Описание: Lifecycle-политики хранения экспортов.
Критерии готовности (DoD):
- [ ] Автоочистка старше 24h работает.
Оценка: 4h
Story: [STORY-082]

---

## [EPIC-15] Mobile Dashboard

Цель: Дать мобильный мониторинг KPI и алертов в реальном времени как уникальное конкурентное преимущество.

Метрика успеха:
- Mobile MAU `>=60%` от web MAU
- Push alert open rate `>=45%`
- Среднее время реакции на critical alert сокращено на `30%`

Приоритет: P2 (Growth)  
Зависит от: [EPIC-10], [EPIC-11]  
Оценка: L (1-3 мес)

### Stories

[STORY-083] Mobile App Shell (iOS/Android/PWA)
Как Media Buyer, я хочу мобильное приложение/PWA, чтобы следить за показателями на ходу.

Acceptance Criteria:
- [ ] AC1: Поддержка iOS/Android (или PWA) с secure login и biometric unlock.
- [ ] AC2: Cold start приложения `<3s`.
- [ ] AC3: Сессия синхронизирована с веб-авторизацией и RBAC.

Story Points: 8
Приоритет: Must
Epic: [EPIC-15]
Зависит от: [STORY-036], [STORY-037]

#### Tasks для STORY-083:

[TASK-0411] Mobile auth backend support
Тип: Backend
Описание: Поддержка mobile токенов и device binding.
Критерии готовности (DoD):
- [ ] Биометрия использует secure device keystore.
Оценка: 8h
Story: [STORY-083]

[TASK-0412] Mobile app shell frontend
Тип: Frontend
Описание: Базовая навигация, auth, session handling.
Критерии готовности (DoD):
- [ ] Работает на iOS и Android или в PWA-режиме.
Оценка: 16h
Story: [STORY-083]

[TASK-0413] Design mobile navigation
Тип: Design
Описание: Навигация и базовые mobile паттерны.
Критерии готовности (DoD):
- [ ] UX адаптирован под одну руку.
Оценка: 4h
Story: [STORY-083]

[TASK-0414] QA mobile auth matrix
Тип: QA
Описание: Проверка логина, биометрии и сессий.
Критерии готовности (DoD):
- [ ] Покрыты iOS/Android версии из support-матрицы.
Оценка: 8h
Story: [STORY-083]

[TASK-0415] Mobile CI/CD pipeline
Тип: DevOps
Описание: Сборка, подпись и деплой mobile артефактов.
Критерии готовности (DoD):
- [ ] Автосборки проходят на каждом релизе.
Оценка: 8h
Story: [STORY-083]

---

[STORY-084] Realtime KPI Mobile View
Как Team Lead, я хочу видеть ключевые KPI на мобильном, чтобы контролировать бизнес в реальном времени.

Acceptance Criteria:
- [ ] AC1: KPI `leads`, `ftd`, `revenue`, `pnl`, `reject_rate` обновляются каждые 30 секунд.
- [ ] AC2: Поддержан выбор периода и quick filters.
- [ ] AC3: Время загрузки экрана KPI `<1.5s p95`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-15]
Зависит от: [STORY-056], [STORY-057]

#### Tasks для STORY-084:

[TASK-0416] Mobile KPI API adapter
Тип: Backend
Описание: Оптимизированная выдача KPI для mobile payload.
Критерии готовности (DoD):
- [ ] Ответ минимизирован под mobile сеть.
Оценка: 8h
Story: [STORY-084]

[TASK-0417] Mobile KPI screen
Тип: Frontend
Описание: Экран KPI tiles + mini charts.
Критерии готовности (DoD):
- [ ] Поддержан pull-to-refresh.
Оценка: 8h
Story: [STORY-084]

[TASK-0418] Design mobile KPI cards
Тип: Design
Описание: Карточки KPI для малых экранов.
Критерии готовности (DoD):
- [ ] KPI читабельны на 320px ширине.
Оценка: 4h
Story: [STORY-084]

[TASK-0419] QA mobile performance tests
Тип: QA
Описание: Проверка latency и обновлений KPI.
Критерии готовности (DoD):
- [ ] p95 загрузки <1.5s подтвержден.
Оценка: 4h
Story: [STORY-084]

[TASK-0420] CDN/API edge config
Тип: DevOps
Описание: Оптимизация доставки API/статик контента на mobile.
Критерии готовности (DoD):
- [ ] Уменьшена latency на слабых сетях.
Оценка: 4h
Story: [STORY-084]

---

[STORY-085] Mobile Alerts Center
Как Media Buyer, я хочу получать и просматривать critical alerts в приложении, чтобы реагировать сразу.

Acceptance Criteria:
- [ ] AC1: Push-уведомления по critical событиям приходят `<30s p95`.
- [ ] AC2: In-app центр алертов хранит историю 30 дней.
- [ ] AC3: Можно mute канал на 1h/24h/7d.

Story Points: 5
Приоритет: Must
Epic: [EPIC-15]
Зависит от: [STORY-063], [STORY-066]

#### Tasks для STORY-085:

[TASK-0421] Push notification backend
Тип: Backend
Описание: Мобильный push канал и предпочтения.
Критерии готовности (DoD):
- [ ] Поддержано device token rotation.
Оценка: 8h
Story: [STORY-085]

[TASK-0422] Mobile alerts UI
Тип: Frontend
Описание: Центр алертов с фильтрами и mute.
Критерии готовности (DoD):
- [ ] Есть статус read/unread.
Оценка: 4h
Story: [STORY-085]

[TASK-0423] Design alert list mobile
Тип: Design
Описание: Карточки алертов и состояния прочтения.
Критерии готовности (DoD):
- [ ] Critical alerts визуально приоритетны.
Оценка: 2h
Story: [STORY-085]

[TASK-0424] QA push delivery tests
Тип: QA
Описание: Проверка доставки push и mute logic.
Критерии готовности (DoD):
- [ ] Проверена доставка на iOS/Android.
Оценка: 4h
Story: [STORY-085]

[TASK-0425] Push provider integration
Тип: DevOps
Описание: Интеграция APNS/FCM и мониторинг delivery.
Критерии готовности (DoD):
- [ ] Delivery success >=99%.
Оценка: 4h
Story: [STORY-085]

---

[STORY-086] Quick Cap Controls
Как Team Lead, я хочу быстро менять капы с мобильного, чтобы оперативно управлять трафиком в пике.

Acceptance Criteria:
- [ ] AC1: Быстрые действия `+10%`, `-10%`, `pause flow`.
- [ ] AC2: Изменения применяются `<30s`.
- [ ] AC3: Для критичных изменений требуется 2FA confirmation.

Story Points: 5
Приоритет: Should
Epic: [EPIC-15]
Зависит от: [STORY-018], [STORY-037]

#### Tasks для STORY-086:

[TASK-0426] Cap control API
Тип: Backend
Описание: Endpoint мобильных быстрых действий по капам.
Критерии готовности (DoD):
- [ ] Все изменения пишутся в audit.
Оценка: 8h
Story: [STORY-086]

[TASK-0427] Mobile quick actions UI
Тип: Frontend
Описание: Кнопки быстрых корректировок и подтверждение.
Критерии готовности (DoD):
- [ ] Действия выполняются за <=2 клика.
Оценка: 4h
Story: [STORY-086]

[TASK-0428] Design quick actions
Тип: Design
Описание: Безопасные mobile-контролы критичных действий.
Критерии готовности (DoD):
- [ ] Есть защитные подтверждения для pause.
Оценка: 2h
Story: [STORY-086]

[TASK-0429] QA fast control tests
Тип: QA
Описание: Проверить применяемость и 2FA gating.
Критерии готовности (DoD):
- [ ] Без 2FA критичные действия блокируются.
Оценка: 4h
Story: [STORY-086]

[TASK-0430] Low-latency config propagation
Тип: DevOps
Описание: Быстрое распространение cap изменений.
Критерии готовности (DoD):
- [ ] Применение <30s подтверждено.
Оценка: 4h
Story: [STORY-086]

---

[STORY-087] Mobile Offline Snapshot
Как Media Buyer, я хочу видеть последний snapshot метрик офлайн, чтобы ориентироваться при плохой связи.

Acceptance Criteria:
- [ ] AC1: Последние KPI кэшируются локально на 24 часа.
- [ ] AC2: Отображается timestamp актуальности данных.
- [ ] AC3: При восстановлении сети snapshot автоматически обновляется.

Story Points: 3
Приоритет: Could
Epic: [EPIC-15]
Зависит от: [STORY-084]

#### Tasks для STORY-087:

[TASK-0431] Offline cache backend contract
Тип: Backend
Описание: Поддержка версионированного mobile snapshot payload.
Критерии готовности (DoD):
- [ ] Payload содержит timestamp и version.
Оценка: 4h
Story: [STORY-087]

[TASK-0432] Mobile local cache implementation
Тип: Frontend
Описание: Локальный кэш KPI и режим offline view.
Критерии готовности (DoD):
- [ ] Offline режим явно отмечен в UI.
Оценка: 8h
Story: [STORY-087]

[TASK-0433] Design offline state
Тип: Design
Описание: Состояния offline и stale data.
Критерии готовности (DoD):
- [ ] Пользователь видит ограниченность данных.
Оценка: 2h
Story: [STORY-087]

[TASK-0434] QA offline/online transitions
Тип: QA
Описание: Тесты переключения сети и обновления snapshot.
Критерии готовности (DoD):
- [ ] Нет зависаний при reconnect.
Оценка: 4h
Story: [STORY-087]

[TASK-0435] Mobile cache security policy
Тип: DevOps
Описание: Шифрование локального кэша и MDM политики.
Критерии готовности (DoD):
- [ ] Sensitive fields не хранятся в plaintext.
Оценка: 4h
Story: [STORY-087]

---

## [EPIC-16] Integration Marketplace

Цель: Построить публичный маркетплейс интеграций с one-click установкой и community contributions.

Метрика успеха:
- 200+ шаблонов доступны в marketplace
- One-click install success `>=95%`
- 20+ community submissions/мес

Приоритет: P2 (Growth)  
Зависит от: [EPIC-03], [EPIC-19]  
Оценка: L (1-3 мес)

### Stories

[STORY-088] Public Template Catalog
Как Developer, я хочу публичный каталог интеграций с поиском, чтобы быстро находить подходящих брокеров.

Acceptance Criteria:
- [ ] AC1: Публичный `GET /api/v1/marketplace/templates` с фильтрами `country`, `vertical`, `type`.
- [ ] AC2: Поиск по названию/тегам `<300ms p95`.
- [ ] AC3: Карточка включает совместимость и changelog.

Story Points: 5
Приоритет: Must
Epic: [EPIC-16]
Зависит от: [STORY-021]

#### Tasks для STORY-088:

[TASK-0436] Marketplace catalog backend
Тип: Backend
Описание: Публичный API каталога и фильтры.
Критерии готовности (DoD):
- [ ] Каталог отдает только approved templates.
Оценка: 8h
Story: [STORY-088]

[TASK-0437] Marketplace catalog UI
Тип: Frontend
Описание: Публичная витрина шаблонов.
Критерии готовности (DoD):
- [ ] Есть фильтры и быстрый поиск.
Оценка: 4h
Story: [STORY-088]

[TASK-0438] Design marketplace cards
Тип: Design
Описание: Карточки интеграций и бейджи совместимости.
Критерии готовности (DoD):
- [ ] Бейджи version compatibility понятны.
Оценка: 2h
Story: [STORY-088]

[TASK-0439] QA public catalog tests
Тип: QA
Описание: Проверка фильтров и публичной видимости.
Критерии готовности (DoD):
- [ ] Неapproved шаблоны не попадают в выдачу.
Оценка: 4h
Story: [STORY-088]

[TASK-0440] Search index for marketplace
Тип: DevOps
Описание: Индексирование шаблонов marketplace.
Критерии готовности (DoD):
- [ ] Поиск <300ms p95.
Оценка: 4h
Story: [STORY-088]

---

[STORY-089] One-click Install Flow
Как Affiliate Manager, я хочу устанавливать интеграцию в один клик, чтобы сокращать время подключения брокера.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/marketplace/templates/{id}/install` создает интеграцию с pre-filled mapping.
- [ ] AC2: Installation wizard завершает setup `<5 минут`.
- [ ] AC3: Ошибки установки возвращают actionable steps.

Story Points: 8
Приоритет: Must
Epic: [EPIC-16]
Зависит от: [STORY-088], [STORY-022]

#### Tasks для STORY-089:

[TASK-0441] Install orchestration backend
Тип: Backend
Описание: Оркестратор one-click установки.
Критерии готовности (DoD):
- [ ] Установка идемпотентна при повторном запуске.
Оценка: 8h
Story: [STORY-089]

[TASK-0442] UI one-click install
Тип: Frontend
Описание: Мастер установки шаблона.
Критерии готовности (DoD):
- [ ] Виден прогресс шагов установки.
Оценка: 4h
Story: [STORY-089]

[TASK-0443] Design install wizard
Тип: Design
Описание: UX быстрого запуска интеграции.
Критерии готовности (DoD):
- [ ] Ошибки и recovery сценарии описаны.
Оценка: 2h
Story: [STORY-089]

[TASK-0444] QA install workflow
Тип: QA
Описание: E2E тест установки популярных шаблонов.
Критерии готовности (DoD):
- [ ] Успешность >=95% в regression suite.
Оценка: 8h
Story: [STORY-089]

[TASK-0445] Install job workers
Тип: DevOps
Описание: Воркеры установки и контроль таймаутов.
Критерии готовности (DoD):
- [ ] Installation timeout корректно обрабатывается.
Оценка: 4h
Story: [STORY-089]

---

[STORY-090] Community Submission Pipeline
Как Developer, я хочу отправлять community интеграции, чтобы расширять экосистему.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/marketplace/submissions` принимает manifest + тестовые кейсы.
- [ ] AC2: Submission проходит automated validation и manual review.
- [ ] AC3: Статусы `submitted|in_review|approved|rejected` доступны автору.

Story Points: 5
Приоритет: Should
Epic: [EPIC-16]
Зависит от: [STORY-088]

#### Tasks для STORY-090:

[TASK-0446] Submission API backend
Тип: Backend
Описание: Прием и валидация community submissions.
Критерии готовности (DoD):
- [ ] Поддержан attachment test evidence.
Оценка: 8h
Story: [STORY-090]

[TASK-0447] UI submission form
Тип: Frontend
Описание: Форма отправки интеграции и статуса ревью.
Критерии готовности (DoD):
- [ ] Автор видит историю ревью-комментариев.
Оценка: 4h
Story: [STORY-090]

[TASK-0448] Design submission workflow
Тип: Design
Описание: UX формы и статусов модерации.
Критерии готовности (DoD):
- [ ] Статусы submission визуально различимы.
Оценка: 2h
Story: [STORY-090]

[TASK-0449] QA moderation flow
Тип: QA
Описание: Тесты статусов, отказов и повторной отправки.
Критерии готовности (DoD):
- [ ] Workflow state transitions валидны.
Оценка: 4h
Story: [STORY-090]

[TASK-0450] Artifact scanning pipeline
Тип: DevOps
Описание: Сканирование загружаемых артефактов на безопасность.
Критерии готовности (DoD):
- [ ] Все submissions проходят security scan.
Оценка: 4h
Story: [STORY-090]

---

[STORY-091] Ratings & Reviews
Как Affiliate Manager, я хочу видеть рейтинг и отзывы интеграций, чтобы выбирать надежные шаблоны.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/marketplace/templates/{id}/reviews` с `rating 1..5`, `comment`.
- [ ] AC2: В рейтинге учитываются только verified installs.
- [ ] AC3: Модерация скрывает токсичный/спам контент.

Story Points: 3
Приоритет: Should
Epic: [EPIC-16]
Зависит от: [STORY-089]

#### Tasks для STORY-091:

[TASK-0451] Reviews backend
Тип: Backend
Описание: Модель рейтингов и верификация reviewer.
Критерии готовности (DoD):
- [ ] Только verified installers могут оценивать.
Оценка: 8h
Story: [STORY-091]

[TASK-0452] UI reviews section
Тип: Frontend
Описание: Отображение и отправка отзывов.
Критерии готовности (DoD):
- [ ] Есть сортировка по полезности/новизне.
Оценка: 4h
Story: [STORY-091]

[TASK-0453] Design review cards
Тип: Design
Описание: Компоненты отзывов и рейтинга.
Критерии готовности (DoD):
- [ ] Отзыв легко сканируется по ключевой инфо.
Оценка: 2h
Story: [STORY-091]

[TASK-0454] QA review moderation
Тип: QA
Описание: Проверка модерации и anti-spam.
Критерии готовности (DoD):
- [ ] Спам-фильтр блокирует повторяющиеся отзывы.
Оценка: 4h
Story: [STORY-091]

[TASK-0455] Moderation queue infra
Тип: DevOps
Описание: Очередь модерации и SLA обработки.
Критерии готовности (DoD):
- [ ] Среднее время модерации <24h.
Оценка: 4h
Story: [STORY-091]

---

[STORY-092] Marketplace Compatibility Matrix
Как Developer, я хочу матрицу совместимости версий, чтобы понимать риски при установке.

Acceptance Criteria:
- [ ] AC1: Шаблон маркируется по совместимости с версиями API CRM.
- [ ] AC2: Несовместимая установка блокируется с `409 incompatible_version`.
- [ ] AC3: Показ changelog между версиями шаблона.

Story Points: 5
Приоритет: Should
Epic: [EPIC-16]
Зависит от: [STORY-089], [STORY-104]

#### Tasks для STORY-092:

[TASK-0456] Compatibility checker backend
Тип: Backend
Описание: Проверка совместимости шаблона перед install.
Критерии готовности (DoD):
- [ ] Возвращается понятная причина несовместимости.
Оценка: 8h
Story: [STORY-092]

[TASK-0457] UI compatibility badges
Тип: Frontend
Описание: Бейджи и предупреждения совместимости.
Критерии готовности (DoD):
- [ ] Пользователь видит блокировку до старта install.
Оценка: 4h
Story: [STORY-092]

[TASK-0458] Design version matrix
Тип: Design
Описание: Таблица версий и поддерживаемых функций.
Критерии готовности (DoD):
- [ ] Матрица читается на desktop/tablet.
Оценка: 2h
Story: [STORY-092]

[TASK-0459] QA version compatibility tests
Тип: QA
Описание: Тесты на блокировку несовместимых установок.
Критерии готовности (DoD):
- [ ] Ошибка 409 выдается стабильно.
Оценка: 4h
Story: [STORY-092]

[TASK-0460] Version metadata pipeline
Тип: DevOps
Описание: Автоматическая публикация metadata версий.
Критерии готовности (DoD):
- [ ] Metadata обновляется при релизе шаблона.
Оценка: 4h
Story: [STORY-092]

---

## [EPIC-17] Smart Routing (AI/ML v1)

Цель: Автоматически рекомендовать и оптимизировать routing на основе исторических данных, сохраняя контроль пользователя.

Метрика успеха:
- Uplift conversion rate `>=8%`
- Снижение ручных правок routing на `>=30%`
- Precision предупреждений деградации `>=85%`

Приоритет: P2 (Growth)  
Зависит от: [EPIC-02], [EPIC-10]  
Оценка: L (1-3 мес)

### Stories

[STORY-093] Routing Weight Recommendations
Как Network Admin, я хочу получать рекомендации по весам роутинга, чтобы улучшать конверсию на основе данных.

Acceptance Criteria:
- [ ] AC1: `GET /api/v1/routing/recommendations/weights` возвращает suggested weights по flow.
- [ ] AC2: Рекомендации учитывают минимум 14 дней исторических данных.
- [ ] AC3: Каждая рекомендация имеет confidence score `0..1`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-17]
Зависит от: [STORY-016], [STORY-017], [STORY-057]

#### Tasks для STORY-093:

[TASK-0461] Recommendation model backend
Тип: Backend
Описание: Модель рекомендаций весов на исторических данных.
Критерии готовности (DoD):
- [ ] Рекомендации содержат confidence и объяснение.
Оценка: 8h
Story: [STORY-093]

[TASK-0462] UI recommendations panel
Тип: Frontend
Описание: Панель рекомендаций в flow editor.
Критерии готовности (DoD):
- [ ] Можно применить рекомендацию в один клик.
Оценка: 4h
Story: [STORY-093]

[TASK-0463] Design recommendation cards
Тип: Design
Описание: Карточки рекомендаций и confidence-индикатор.
Критерии готовности (DoD):
- [ ] Карточка показывает expected uplift.
Оценка: 2h
Story: [STORY-093]

[TASK-0464] QA recommendation validity
Тип: QA
Описание: Проверка корректности и стабильности рекомендаций.
Критерии готовности (DoD):
- [ ] Рекомендации воспроизводимы на одинаковом датасете.
Оценка: 4h
Story: [STORY-093]

[TASK-0465] Model serving infra
Тип: DevOps
Описание: Развертывание inference сервиса рекомендаций.
Критерии готовности (DoD):
- [ ] SLA инференса <500ms p95.
Оценка: 8h
Story: [STORY-093]

---

[STORY-094] Cap Exhaustion Forecast v2
Как Affiliate Manager, я хочу точнее предсказывать исчерпание капов, чтобы заранее переключать трафик.

Acceptance Criteria:
- [ ] AC1: Forecast horizon до 24 часов вперед.
- [ ] AC2: MAPE улучшен до `<=15%`.
- [ ] AC3: Рекомендации по action: `increase_cap`, `reroute`, `pause_source`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-17]
Зависит от: [STORY-062]

#### Tasks для STORY-094:

[TASK-0466] Forecast model upgrade backend
Тип: Backend
Описание: Улучшение модели прогнозов cap exhaustion.
Критерии готовности (DoD):
- [ ] Выдается actionable recommendation.
Оценка: 8h
Story: [STORY-094]

[TASK-0467] UI advanced forecast panel
Тип: Frontend
Описание: Панель прогнозов и рекомендованных действий.
Критерии готовности (DoD):
- [ ] Есть визуализация confidence interval.
Оценка: 4h
Story: [STORY-094]

[TASK-0468] Design forecast actions UI
Тип: Design
Описание: Компоненты выбора рекомендованного действия.
Критерии готовности (DoD):
- [ ] Риски действия отображаются до применения.
Оценка: 2h
Story: [STORY-094]

[TASK-0469] QA forecast backtest v2
Тип: QA
Описание: Проверка MAPE и стабильности прогноза.
Критерии готовности (DoD):
- [ ] MAPE <=15% достигнут на контрольном наборе.
Оценка: 4h
Story: [STORY-094]

[TASK-0470] Scheduled retraining jobs
Тип: DevOps
Описание: Периодическое переобучение/обновление модели.
Критерии готовности (DoD):
- [ ] Retraining pipeline версионирован и мониторится.
Оценка: 4h
Story: [STORY-094]

---

[STORY-095] Broker Degradation Auto-switch
Как Team Lead, я хочу авто-переключение на backup при деградации брокера, чтобы сохранять конверсию.

Acceptance Criteria:
- [ ] AC1: Trigger: `error_rate >5%` или `latency_p95 >3s` за 10 минут.
- [ ] AC2: Авто-switch выполняется в течение `<60s` после срабатывания триггера.
- [ ] AC3: Все авто-переключения логируются и обратимы.

Story Points: 8
Приоритет: Must
Epic: [EPIC-17]
Зависит от: [STORY-019], [STORY-025]

#### Tasks для STORY-095:

[TASK-0471] Auto-switch decision backend
Тип: Backend
Описание: Логика переключения flow branch при деградации.
Критерии готовности (DoD):
- [ ] Поддержан rollback к первичному target.
Оценка: 8h
Story: [STORY-095]

[TASK-0472] UI auto-switch policy editor
Тип: Frontend
Описание: Настройка порогов и fallback policy.
Критерии готовности (DoD):
- [ ] Есть preview последствий изменения порогов.
Оценка: 4h
Story: [STORY-095]

[TASK-0473] Design policy threshold form
Тип: Design
Описание: Компоненты редактирования порогов деградации.
Критерии готовности (DoD):
- [ ] Пороговые значения и units однозначны.
Оценка: 2h
Story: [STORY-095]

[TASK-0474] QA failover automation tests
Тип: QA
Описание: Проверка автопереключения и отката.
Критерии готовности (DoD):
- [ ] Switch происходит <60s после threshold breach.
Оценка: 8h
Story: [STORY-095]

[TASK-0475] Real-time metrics stream
Тип: DevOps
Описание: Поток метрик для быстрого детекта деградации.
Критерии готовности (DoD):
- [ ] Задержка потока метрик <10s.
Оценка: 8h
Story: [STORY-095]

---

[STORY-096] What-if Routing Simulator
Как Network Admin, я хочу what-if симуляции, чтобы оценивать эффект изменений до применения.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/routing/what-if` принимает proposed config и исторический период.
- [ ] AC2: Возвращает прогноз impact по `conversion`, `revenue`, `pnl`.
- [ ] AC3: Расчет по 30 дням истории `<60s`.

Story Points: 5
Приоритет: Should
Epic: [EPIC-17]
Зависит от: [STORY-020], [STORY-093]

#### Tasks для STORY-096:

[TASK-0476] What-if simulation backend
Тип: Backend
Описание: Модуль прогноза влияния предложенных изменений.
Критерии готовности (DoD):
- [ ] Возвращается baseline vs proposed compare.
Оценка: 8h
Story: [STORY-096]

[TASK-0477] UI what-if scenario form
Тип: Frontend
Описание: Экран настройки сценария и просмотра прогнозов.
Критерии готовности (DoD):
- [ ] Есть сохранение сценариев what-if.
Оценка: 4h
Story: [STORY-096]

[TASK-0478] Design scenario compare view
Тип: Design
Описание: Сравнение baseline и proposed в графиках.
Критерии готовности (DoD):
- [ ] Ясно видны delta ключевых метрик.
Оценка: 2h
Story: [STORY-096]

[TASK-0479] QA simulation consistency
Тип: QA
Описание: Проверка согласованности прогнозов с фактом на ретроспективе.
Критерии готовности (DoD):
- [ ] Средняя ошибка прогноза документирована и в пределах SLA.
Оценка: 4h
Story: [STORY-096]

[TASK-0480] Batch compute infrastructure
Тип: DevOps
Описание: Вычисления what-if на выделенных воркерах.
Критерии готовности (DoD):
- [ ] 30-дневный расчет укладывается в 60s.
Оценка: 4h
Story: [STORY-096]

---

[STORY-097] Human-in-the-loop Approval
Как Network Admin, я хочу подтверждать AI-рекомендации перед применением, чтобы сохранить контроль и безопасность.

Acceptance Criteria:
- [ ] AC1: AI changes по умолчанию `proposed`, не `auto-applied`.
- [ ] AC2: Endpoint `POST /api/v1/routing/recommendations/{id}/approve|reject`.
- [ ] AC3: Все решения по AI-рекомендациям аудируются.

Story Points: 5
Приоритет: Must
Epic: [EPIC-17]
Зависит от: [STORY-093], [STORY-095]

#### Tasks для STORY-097:

[TASK-0481] Approval workflow backend
Тип: Backend
Описание: Workflow статусов рекомендаций и действий approve/reject.
Критерии готовности (DoD):
- [ ] Невозможно применить recommendation без approve.
Оценка: 8h
Story: [STORY-097]

[TASK-0482] UI approval queue
Тип: Frontend
Описание: Очередь AI-рекомендаций с approve/reject.
Критерии готовности (DoD):
- [ ] Видна причина и ожидаемый эффект.
Оценка: 4h
Story: [STORY-097]

[TASK-0483] Design approval cards
Тип: Design
Описание: Карточки принятия решения по AI.
Критерии готовности (DoD):
- [ ] Карточка содержит risk indicator.
Оценка: 2h
Story: [STORY-097]

[TASK-0484] QA approval audit tests
Тип: QA
Описание: Проверка workflow и аудита решений.
Критерии готовности (DoD):
- [ ] Каждое решение traceable по user/time.
Оценка: 4h
Story: [STORY-097]

[TASK-0485] Approval event logging infra
Тип: DevOps
Описание: Логи и ретеншн для AI decision trail.
Критерии готовности (DoD):
- [ ] Retention не менее 365 дней.
Оценка: 4h
Story: [STORY-097]

---

## [EPIC-18] Status Groups & Shave Detection

Цель: Нормализовать статусы брокеров в единую модель и выявлять shaving/rollback аномалии.

Метрика успеха:
- 95% broker statuses маппятся в normalized groups
- Detection latency аномалий `<5 минут`
- Снижение спорных кейсов с брокерами на `20%`

Приоритет: P2 (Growth)  
Зависит от: [EPIC-03], [EPIC-10]  
Оценка: L (1-3 мес)

### Stories

[STORY-098] Unified Status Taxonomy
Как Network Admin, я хочу единую классификацию статусов, чтобы сравнивать брокеров на одном языке.

Acceptance Criteria:
- [ ] AC1: Группы: `new`, `in_progress`, `qualified`, `ftd`, `rejected`, `reversed`, `unknown`.
- [ ] AC2: `GET /api/v1/status-groups` возвращает активную таксономию.
- [ ] AC3: Изменение таксономии versioned и backward compatible.

Story Points: 5
Приоритет: Must
Epic: [EPIC-18]
Зависит от: [STORY-024]

#### Tasks для STORY-098:

[TASK-0486] Taxonomy backend model
Тип: Backend
Описание: Модель статусных групп и версий.
Критерии готовности (DoD):
- [ ] Поддержан migration path между версиями.
Оценка: 8h
Story: [STORY-098]

[TASK-0487] UI status taxonomy manager
Тип: Frontend
Описание: Экран просмотра/редактирования групп.
Критерии готовности (DoD):
- [ ] Нельзя удалить группу, если есть активные маппинги.
Оценка: 4h
Story: [STORY-098]

[TASK-0488] Design taxonomy editor
Тип: Design
Описание: Интерфейс управления группами.
Критерии готовности (DoD):
- [ ] Понятно, какие изменения breaking.
Оценка: 2h
Story: [STORY-098]

[TASK-0489] QA taxonomy migration
Тип: QA
Описание: Тесты миграции и совместимости версий.
Критерии готовности (DoD):
- [ ] Старые записи корректно резолвятся в новую версию.
Оценка: 4h
Story: [STORY-098]

[TASK-0490] Taxonomy config deployment
Тип: DevOps
Описание: Безопасный деплой таксономии с rollback.
Критерии готовности (DoD):
- [ ] Rollback version работает <5 минут.
Оценка: 4h
Story: [STORY-098]

---

[STORY-099] Broker Status Mapping Rules
Как Affiliate Manager, я хочу маппить статусы каждого брокера в unified groups, чтобы аналитика была сопоставимой.

Acceptance Criteria:
- [ ] AC1: `PUT /api/v1/brokers/{id}/status-mapping` с таблицей `broker_status -> normalized_group`.
- [ ] AC2: unmapped status попадает в `unknown` и флагируется.
- [ ] AC3: Mapping changes применяются за `<60s`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-18]
Зависит от: [STORY-098]

#### Tasks для STORY-099:

[TASK-0491] Status mapping backend
Тип: Backend
Описание: API маппинга и runtime применение.
Критерии готовности (DoD):
- [ ] Unmapped статусы логируются для review.
Оценка: 8h
Story: [STORY-099]

[TASK-0492] UI mapping table
Тип: Frontend
Описание: Таблица сопоставления broker статусов.
Критерии готовности (DoD):
- [ ] Есть bulk assign для массовых статусов.
Оценка: 4h
Story: [STORY-099]

[TASK-0493] Design mapping matrix
Тип: Design
Описание: Матрица статусных соответствий.
Критерии готовности (DoD):
- [ ] Unknown статусы визуально выделены.
Оценка: 2h
Story: [STORY-099]

[TASK-0494] QA mapping propagation
Тип: QA
Описание: Проверка применения mapping в runtime.
Критерии готовности (DoD):
- [ ] Применение <60s подтверждено.
Оценка: 4h
Story: [STORY-099]

[TASK-0495] Config cache invalidation
Тип: DevOps
Описание: Инвалидация кэша mapping правил.
Критерии готовности (DoD):
- [ ] Нет stale mapping дольше 60s.
Оценка: 4h
Story: [STORY-099]

---

[STORY-100] Shave Pattern Detection Engine
Как Finance Manager, я хочу автоматически детектить shaving-паттерны, чтобы быстро выявлять риск недобросовестных брокеров.

Acceptance Criteria:
- [ ] AC1: Детектируются rollback цепочки по normalized statuses.
- [ ] AC2: Threshold rule: `rollback_rate >2%` за 24h -> warning.
- [ ] AC3: API `GET /api/v1/shave/events` возвращает детализированные кейсы.

Story Points: 8
Приоритет: Must
Epic: [EPIC-18]
Зависит от: [STORY-098], [STORY-099]

#### Tasks для STORY-100:

[TASK-0496] Shave detection backend
Тип: Backend
Описание: Движок детекта rollback/shave аномалий.
Критерии готовности (DoD):
- [ ] Поддержаны configurable thresholds.
Оценка: 8h
Story: [STORY-100]

[TASK-0497] UI shave events table
Тип: Frontend
Описание: Таблица событий shaving с фильтрами.
Критерии готовности (DoD):
- [ ] Есть drill-down до history статусов лида.
Оценка: 4h
Story: [STORY-100]

[TASK-0498] Design anomaly event view
Тип: Design
Описание: Карточка аномального кейса и timeline.
Критерии готовности (DoD):
- [ ] Причина срабатывания читается однозначно.
Оценка: 2h
Story: [STORY-100]

[TASK-0499] QA anomaly precision tests
Тип: QA
Описание: Тесты precision/recall на размеченных кейсах.
Критерии готовности (DoD):
- [ ] Precision >=85% для high-severity кейсов.
Оценка: 8h
Story: [STORY-100]

[TASK-0500] Event stream processing infra
Тип: DevOps
Описание: Потоковая обработка status transitions.
Критерии готовности (DoD):
- [ ] Detection latency <5 минут.
Оценка: 8h
Story: [STORY-100]

---

[STORY-101] Shave Alerts & Case Management
Как Team Lead, я хочу алерты и workflow расследования shaving-кейсов, чтобы быстро принимать действия.

Acceptance Criteria:
- [ ] AC1: Critical alert при `rollback_rate >5%`.
- [ ] AC2: Кейс можно назначить владельцу и статусу `open|investigating|resolved`.
- [ ] AC3: SLA на triage кейса `<2 часа`.

Story Points: 5
Приоритет: Should
Epic: [EPIC-18]
Зависит от: [STORY-100], [STORY-063]

#### Tasks для STORY-101:

[TASK-0501] Case management backend
Тип: Backend
Описание: Сущность кейса и workflow статусов.
Критерии готовности (DoD):
- [ ] Поддержано назначение владельца кейса.
Оценка: 8h
Story: [STORY-101]

[TASK-0502] UI case board
Тип: Frontend
Описание: Канбан/таблица кейсов shaving.
Критерии готовности (DoD):
- [ ] Есть фильтр по владельцу и SLA breach.
Оценка: 4h
Story: [STORY-101]

[TASK-0503] Design case workflow
Тип: Design
Описание: Шаблон workflow расследования.
Критерии готовности (DoD):
- [ ] SLA breach визуально выделяется.
Оценка: 2h
Story: [STORY-101]

[TASK-0504] QA case lifecycle
Тип: QA
Описание: Проверить статусы и назначения кейсов.
Критерии готовности (DoD):
- [ ] Workflow state machine без дыр.
Оценка: 4h
Story: [STORY-101]

[TASK-0505] SLA monitoring infra
Тип: DevOps
Описание: Мониторинг SLA расследований.
Критерии готовности (DoD):
- [ ] Алерт на triage >2ч работает.
Оценка: 4h
Story: [STORY-101]

---

[STORY-102] Cross-Broker Normalized Analytics
Как Finance Manager, я хочу сравнивать брокеров по нормализованным статусам, чтобы объективно оценивать их качество.

Acceptance Criteria:
- [ ] AC1: Отчет `GET /api/v1/analytics/brokers/normalized` по status groups.
- [ ] AC2: Поддержан compare period и ranking.
- [ ] AC3: Экспорт отчета в CSV/PDF.

Story Points: 5
Приоритет: Must
Epic: [EPIC-18]
Зависит от: [STORY-099], [STORY-100]

#### Tasks для STORY-102:

[TASK-0506] Normalized analytics API
Тип: Backend
Описание: Агрегации брокеров по unified статусам.
Критерии готовности (DoD):
- [ ] Ranking строится по выбранной метрике.
Оценка: 8h
Story: [STORY-102]

[TASK-0507] UI cross-broker comparison
Тип: Frontend
Описание: Сравнительный дашборд брокеров.
Критерии готовности (DoD):
- [ ] Есть сортировка и drill-down по статусам.
Оценка: 4h
Story: [STORY-102]

[TASK-0508] Design broker compare dashboard
Тип: Design
Описание: Визуализация сравнений и ранжирования.
Критерии готовности (DoD):
- [ ] Четко видны outliers.
Оценка: 2h
Story: [STORY-102]

[TASK-0509] QA normalized metrics tests
Тип: QA
Описание: Проверка корректности нормализованных агрегатов.
Критерии готовности (DoD):
- [ ] Данные согласованы с raw status logs.
Оценка: 4h
Story: [STORY-102]

[TASK-0510] Reporting read-model infra
Тип: DevOps
Описание: Read-model для быстрых сравнительных отчетов.
Критерии готовности (DoD):
- [ ] p95 ответа <1.5s.
Оценка: 4h
Story: [STORY-102]

---

## [EPIC-19] Public API & Developer Portal

Цель: Открыть платформу для внешних разработчиков через стабильный API, SDK и sandbox.

Метрика успеха:
- Время первой интеграции `<1 день`
- 70% новых клиентов используют SDK
- Developer NPS `>=45`

Приоритет: P2 (Growth)  
Зависит от: [EPIC-01], [EPIC-03], [EPIC-06]  
Оценка: L (1-3 мес)

### Stories

[STORY-103] Public OpenAPI Documentation
Как Developer, я хочу публичную API-документацию, чтобы интегрироваться без ручного уточнения у поддержки.

Acceptance Criteria:
- [ ] AC1: Публичный `/docs` с OpenAPI 3.1 и примерами запросов/ответов.
- [ ] AC2: Каждая ошибка имеет `error_code` и `fix_hint`.
- [ ] AC3: Документация версионируется и доступна по версии.

Story Points: 8
Приоритет: Must
Epic: [EPIC-19]
Зависит от: [STORY-002]

#### Tasks для STORY-103:

[TASK-0511] OpenAPI publish pipeline
Тип: Backend
Описание: Генерация и публикация OpenAPI документации.
Критерии готовности (DoD):
- [ ] Спека собирается из source-of-truth контрактов.
Оценка: 8h
Story: [STORY-103]

[TASK-0512] Docs portal frontend
Тип: Frontend
Описание: Портал документации с навигацией и примерами.
Критерии готовности (DoD):
- [ ] Поддержан поиск по endpoint/error_code.
Оценка: 8h
Story: [STORY-103]

[TASK-0513] Design docs portal
Тип: Design
Описание: UI портала разработчика.
Критерии готовности (DoD):
- [ ] Быстрый доступ к “Getting started”.
Оценка: 4h
Story: [STORY-103]

[TASK-0514] QA docs link integrity
Тип: QA
Описание: Проверка валидности ссылок и примеров.
Критерии готовности (DoD):
- [ ] Broken links = 0 в CI.
Оценка: 4h
Story: [STORY-103]

[TASK-0515] Static docs hosting infra
Тип: DevOps
Описание: Надежный хостинг и CDN для docs.
Критерии готовности (DoD):
- [ ] Uptime docs >=99.9%.
Оценка: 4h
Story: [STORY-103]

---

[STORY-104] SDKs (JavaScript, Python, PHP)
Как Developer, я хочу официальные SDK, чтобы быстрее подключаться к API.

Acceptance Criteria:
- [ ] AC1: Выпущены SDK для `JavaScript`, `Python`, `PHP`.
- [ ] AC2: SDK покрывают lead intake, status sync, webhooks.
- [ ] AC3: Версии SDK синхронизированы с API changelog.

Story Points: 8
Приоритет: Must
Epic: [EPIC-19]
Зависит от: [STORY-103]

#### Tasks для STORY-104:

[TASK-0516] SDK generation backend tooling
Тип: Backend
Описание: Tooling генерации/поддержки SDK.
Критерии готовности (DoD):
- [ ] SDK проходят smoke tests на sandbox.
Оценка: 8h
Story: [STORY-104]

[TASK-0517] SDK docs examples frontend
Тип: Frontend
Описание: Встраивание примеров SDK в developer portal.
Критерии готовности (DoD):
- [ ] Примеры копируются в один клик.
Оценка: 4h
Story: [STORY-104]

[TASK-0518] Design code snippet blocks
Тип: Design
Описание: Компоненты отображения многоязычных snippet.
Критерии готовности (DoD):
- [ ] Хорошая читабельность длинных примеров.
Оценка: 2h
Story: [STORY-104]

[TASK-0519] QA SDK compatibility tests
Тип: QA
Описание: Проверка работы SDK против sandbox.
Критерии готовности (DoD):
- [ ] Все SDK проходят контрактные тесты.
Оценка: 8h
Story: [STORY-104]

[TASK-0520] Package publish automation
Тип: DevOps
Описание: Автопубликация SDK в npm/PyPI/Packagist.
Критерии готовности (DoD):
- [ ] Release pipeline подписывает и публикует артефакты.
Оценка: 8h
Story: [STORY-104]

---

[STORY-105] Sandbox Environment
Как Developer, я хочу sandbox окружение, чтобы тестировать интеграцию без риска для production.

Acceptance Criteria:
- [ ] AC1: Отдельный sandbox host и test credentials.
- [ ] AC2: Детерминированные mock-ответы для ключевых endpoint.
- [ ] AC3: Sandbox data purge каждые 7 дней.

Story Points: 5
Приоритет: Must
Epic: [EPIC-19]
Зависит от: [STORY-008], [STORY-103]

#### Tasks для STORY-105:

[TASK-0521] Sandbox API backend
Тип: Backend
Описание: Изолированное sandbox API поведение.
Критерии готовности (DoD):
- [ ] Sandbox и production полностью разделены.
Оценка: 8h
Story: [STORY-105]

[TASK-0522] Sandbox onboarding UI
Тип: Frontend
Описание: Получение test keys и запуск тестов.
Критерии готовности (DoD):
- [ ] Пользователь явно видит sandbox context.
Оценка: 4h
Story: [STORY-105]

[TASK-0523] Design sandbox indicators
Тип: Design
Описание: Визуальная маркировка sandbox режима.
Критерии готовности (DoD):
- [ ] Sandbox нельзя спутать с prod.
Оценка: 2h
Story: [STORY-105]

[TASK-0524] QA sandbox isolation
Тип: QA
Описание: Проверить, что sandbox данные не попадают в prod.
Критерии готовности (DoD):
- [ ] Кросс-окруженческий доступ невозможен.
Оценка: 4h
Story: [STORY-105]

[TASK-0525] Sandbox infra segregation
Тип: DevOps
Описание: Отдельные БД, ключи и логи для sandbox.
Критерии готовности (DoD):
- [ ] Purge policy 7 дней работает.
Оценка: 4h
Story: [STORY-105]

---

[STORY-106] API Explorer in Browser
Как Developer, я хочу запускать запросы к API из браузера, чтобы быстро тестировать endpoint без внешних инструментов.

Acceptance Criteria:
- [ ] AC1: Browser explorer поддерживает auth token и environment switch.
- [ ] AC2: Видны request/response samples и curl snippet.
- [ ] AC3: Ограничение rate-limit в explorer `<=60 req/min/user`.

Story Points: 5
Приоритет: Should
Epic: [EPIC-19]
Зависит от: [STORY-103], [STORY-105]

#### Tasks для STORY-106:

[TASK-0526] API explorer backend proxy
Тип: Backend
Описание: Безопасный proxy слой для explorer запросов.
Критерии готовности (DoD):
- [ ] Masking секретов в логах включен.
Оценка: 8h
Story: [STORY-106]

[TASK-0527] Explorer UI
Тип: Frontend
Описание: Интерактивный интерфейс отправки API запросов.
Критерии готовности (DoD):
- [ ] Автогенерация curl команды работает.
Оценка: 8h
Story: [STORY-106]

[TASK-0528] Design explorer layout
Тип: Design
Описание: Layout request editor/response pane.
Критерии готовности (DoD):
- [ ] Ошибки ответа отображаются структурно.
Оценка: 2h
Story: [STORY-106]

[TASK-0529] QA explorer security tests
Тип: QA
Описание: Проверка rate-limit и auth boundary.
Критерии готовности (DoD):
- [ ] Unauthorized запросы блокируются.
Оценка: 4h
Story: [STORY-106]

[TASK-0530] WAF/rate-limit config
Тип: DevOps
Описание: Защита explorer endpoint от abuse.
Критерии готовности (DoD):
- [ ] Лимит 60 req/min enforced.
Оценка: 4h
Story: [STORY-106]

---

[STORY-107] API Changelog & Deprecation Policy
Как Developer, я хочу прозрачный changelog API, чтобы планировать обновления без внезапных поломок.

Acceptance Criteria:
- [ ] AC1: Публичный changelog с типами изменений `breaking|feature|fix`.
- [ ] AC2: Breaking changes объявляются минимум за 90 дней.
- [ ] AC3: Endpoint deprecation помечается warning header.

Story Points: 3
Приоритет: Must
Epic: [EPIC-19]
Зависит от: [STORY-103]

#### Tasks для STORY-107:

[TASK-0531] Changelog backend service
Тип: Backend
Описание: Реестр изменений API и deprecation status.
Критерии готовности (DoD):
- [ ] Breaking changes требуют deprecation_date.
Оценка: 8h
Story: [STORY-107]

[TASK-0532] UI changelog page
Тип: Frontend
Описание: Страница changelog и фильтры по типу изменений.
Критерии готовности (DoD):
- [ ] Видны upcoming deprecations.
Оценка: 4h
Story: [STORY-107]

[TASK-0533] Design changelog timeline
Тип: Design
Описание: Лента релизов и изменений API.
Критерии готовности (DoD):
- [ ] Breaking changes визуально выделены.
Оценка: 2h
Story: [STORY-107]

[TASK-0534] QA deprecation headers
Тип: QA
Описание: Проверка warning headers и даты deprecation.
Критерии готовности (DoD):
- [ ] Заголовки соответствуют заявленным датам.
Оценка: 4h
Story: [STORY-107]

[TASK-0535] Release governance automation
Тип: DevOps
Описание: Автоматическая проверка changelog в релиз-пайплайне.
Критерии готовности (DoD):
- [ ] Релиз блокируется при отсутствии changelog entry.
Оценка: 4h
Story: [STORY-107]

