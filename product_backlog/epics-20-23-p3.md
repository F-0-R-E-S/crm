## [EPIC-20] White-Label & Multi-Tenant Platform

Цель: Дать enterprise-клиентам white-label и продвинутую multi-tenant архитектуру с изоляцией и reseller-моделью.

Метрика успеха:
- Запуск white-label клиента `<3 дня`
- 0 cross-tenant security incidents
- 10+ reseller tenants в первые 6 месяцев

Приоритет: P3 (Scale)  
Зависит от: [EPIC-06], [EPIC-19]  
Оценка: XL (3+ мес)

### Stories

[STORY-108] Custom Domain & SSL
Как Network Admin, я хочу использовать кастомный домен, чтобы CRM выглядела как собственный продукт.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/whitelabel/domains` добавляет custom domain и запускает SSL валидацию.
- [ ] AC2: Автовыпуск SSL сертификата `<15 минут`.
- [ ] AC3: Невалидный DNS возвращает `422 dns_validation_failed`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-20]
Зависит от: [STORY-039]

#### Tasks для STORY-108:

[TASK-0536] Domain onboarding backend
Тип: Backend
Описание: Регистрация домена и проверка DNS/SSL.
Критерии готовности (DoD):
- [ ] Доступен статус прогресса доменной валидации.
Оценка: 8h
Story: [STORY-108]

[TASK-0537] UI domain setup
Тип: Frontend
Описание: Экран подключения домена и шагов DNS.
Критерии готовности (DoD):
- [ ] Показаны конкретные DNS записи для клиента.
Оценка: 4h
Story: [STORY-108]

[TASK-0538] Design domain wizard
Тип: Design
Описание: Пошаговый UX подключения домена.
Критерии готовности (DoD):
- [ ] Ошибки DNS объяснены понятными текстами.
Оценка: 2h
Story: [STORY-108]

[TASK-0539] QA domain provisioning
Тип: QA
Описание: Проверка сценариев success/fail/timeout DNS.
Критерии готовности (DoD):
- [ ] SSL выпускается корректно в тестовых зонах.
Оценка: 4h
Story: [STORY-108]

[TASK-0540] Certificate automation infra
Тип: DevOps
Описание: Автоматизация выдачи/обновления TLS сертификатов.
Критерии готовности (DoD):
- [ ] Auto-renewal работает без downtime.
Оценка: 8h
Story: [STORY-108]

---

[STORY-109] Branding & Theme Customization
Как Affiliate Manager, я хочу кастомизировать лого/цвета/название, чтобы продукт соответствовал бренду клиента.

Acceptance Criteria:
- [ ] AC1: `PUT /api/v1/whitelabel/branding` принимает logo, primary/secondary colors, app name.
- [ ] AC2: Изменения применяются в web/mobile интерфейсах `<5 минут`.
- [ ] AC3: Валидация контраста интерфейса соответствует AA.

Story Points: 5
Приоритет: Must
Epic: [EPIC-20]
Зависит от: [STORY-108]

#### Tasks для STORY-109:

[TASK-0541] Branding config backend
Тип: Backend
Описание: Хранение branding настроек и delivery в clients.
Критерии готовности (DoD):
- [ ] Настройки versioned и обратимы.
Оценка: 8h
Story: [STORY-109]

[TASK-0542] UI branding editor
Тип: Frontend
Описание: Редактор брендинга с live preview.
Критерии готовности (DoD):
- [ ] Цветовые токены валидируются.
Оценка: 4h
Story: [STORY-109]

[TASK-0543] Design theming system
Тип: Design
Описание: Система дизайн-токенов для white-label.
Критерии готовности (DoD):
- [ ] Поддержаны минимум 2 брендовых темы.
Оценка: 4h
Story: [STORY-109]

[TASK-0544] QA branding consistency
Тип: QA
Описание: Проверка применения темы на всех ключевых экранах.
Критерии готовности (DoD):
- [ ] Нет смешения базовой и брендовой темы.
Оценка: 4h
Story: [STORY-109]

[TASK-0545] Asset CDN pipeline
Тип: DevOps
Описание: Доставка брендовых ассетов через CDN.
Критерии готовности (DoD):
- [ ] Новые ассеты доступны глобально <5 минут.
Оценка: 4h
Story: [STORY-109]

---

[STORY-110] Isolated Enterprise Instances
Как Network Admin, я хочу выделенный инстанс для enterprise, чтобы получить максимальную изоляцию и SLA.

Acceptance Criteria:
- [ ] AC1: Provisioning отдельного инстанса выполняется через `POST /api/v1/tenants/provision`.
- [ ] AC2: Данные, ключи и network plane полностью изолированы.
- [ ] AC3: Provisioning time `<2 часа` в стандартном сценарии.

Story Points: 8
Приоритет: Must
Epic: [EPIC-20]
Зависит от: [STORY-039], [STORY-108]

#### Tasks для STORY-110:

[TASK-0546] Tenant provisioning backend
Тип: Backend
Описание: Автоматизированное создание выделенного tenant stack.
Критерии готовности (DoD):
- [ ] Процесс идемпотентен и auditable.
Оценка: 8h
Story: [STORY-110]

[TASK-0547] UI enterprise provisioning console
Тип: Frontend
Описание: Консоль запуска и отслеживания provisioning.
Критерии готовности (DoD):
- [ ] Виден статус каждого этапа.
Оценка: 4h
Story: [STORY-110]

[TASK-0548] Design provisioning timeline
Тип: Design
Описание: Таймлайн этапов создания инстанса.
Критерии готовности (DoD):
- [ ] Проблемные этапы визуально выделяются.
Оценка: 2h
Story: [STORY-110]

[TASK-0549] QA tenant isolation suite
Тип: QA
Описание: Тесты изоляции данных и сетевых границ.
Критерии готовности (DoD):
- [ ] Cross-instance access невозможен.
Оценка: 8h
Story: [STORY-110]

[TASK-0550] IaC provisioning modules
Тип: DevOps
Описание: Terraform/Helm модули под dedicated tenants.
Критерии готовности (DoD):
- [ ] Provisioning <2ч подтвержден на staging.
Оценка: 8h
Story: [STORY-110]

---

[STORY-111] Reseller Parent Account
Как Network Admin, я хочу parent-account для реселлеров, чтобы управлять дочерними клиентами из одного кабинета.

Acceptance Criteria:
- [ ] AC1: Parent может создавать child tenants и назначать лимиты.
- [ ] AC2: Child data не видна между собой; parent видит агрегаты и scoped drill-down.
- [ ] AC3: Billing attribution работает по child tenant.

Story Points: 5
Приоритет: Should
Epic: [EPIC-20]
Зависит от: [STORY-110], [STORY-113]

#### Tasks для STORY-111:

[TASK-0551] Parent-child account backend
Тип: Backend
Описание: Модель hierarchy parent/child и scoped permissions.
Критерии готовности (DoD):
- [ ] Ограничения прав parent документированы.
Оценка: 8h
Story: [STORY-111]

[TASK-0552] UI reseller console
Тип: Frontend
Описание: Консоль parent-аккаунта и список child tenants.
Критерии готовности (DoD):
- [ ] Доступен контекстный переключатель child tenant.
Оценка: 4h
Story: [STORY-111]

[TASK-0553] Design hierarchy views
Тип: Design
Описание: UI иерархии parent/child.
Критерии готовности (DoD):
- [ ] Иерархия читаема при 100+ child tenants.
Оценка: 2h
Story: [STORY-111]

[TASK-0554] QA hierarchy ACL tests
Тип: QA
Описание: Проверка прав parent и изоляции child.
Критерии готовности (DoD):
- [ ] Нет утечки child данных между tenant.
Оценка: 4h
Story: [STORY-111]

[TASK-0555] Multi-tenant metrics partitioning
Тип: DevOps
Описание: Партиционирование метрик по parent/child.
Критерии готовности (DoD):
- [ ] Aggregates считаются без cross-tenant leakage.
Оценка: 4h
Story: [STORY-111]

---

[STORY-112] White-label Audit & Governance
Как Network Admin, я хочу видеть изменения white-label конфигурации, чтобы контролировать безопасность и соответствие бренда.

Acceptance Criteria:
- [ ] AC1: Любое изменение домена/темы/tenant hierarchy попадает в audit.
- [ ] AC2: `GET /api/v1/whitelabel/audit` поддерживает фильтры actor/date/action.
- [ ] AC3: Export audit в CSV/PDF.

Story Points: 3
Приоритет: Should
Epic: [EPIC-20]
Зависит от: [STORY-108], [STORY-109], [STORY-111]

#### Tasks для STORY-112:

[TASK-0556] White-label audit backend
Тип: Backend
Описание: Аудит конфигурационных изменений white-label.
Критерии готовности (DoD):
- [ ] Логируются old/new значения и actor.
Оценка: 8h
Story: [STORY-112]

[TASK-0557] UI white-label audit log
Тип: Frontend
Описание: Таблица аудита с фильтрами.
Критерии готовности (DoD):
- [ ] Есть быстрый экспорт текущей выборки.
Оценка: 4h
Story: [STORY-112]

[TASK-0558] Design audit table
Тип: Design
Описание: Компоненты журнала изменений.
Критерии готовности (DoD):
- [ ] Измененные поля читаются без перегруза.
Оценка: 2h
Story: [STORY-112]

[TASK-0559] QA audit completeness
Тип: QA
Описание: Проверка полноты и целостности аудита.
Критерии готовности (DoD):
- [ ] Критичные изменения логируются 100%.
Оценка: 4h
Story: [STORY-112]

[TASK-0560] Audit archive policy
Тип: DevOps
Описание: Архивация и retention white-label audit.
Критерии готовности (DoD):
- [ ] Доступ к архиву сохраняется 365 дней.
Оценка: 4h
Story: [STORY-112]

---

## [EPIC-21] Billing & Subscription Management

Цель: Монетизировать платформу через тарифы, usage billing и addons с прозрачной финансовой операционкой.

Метрика успеха:
- 95% инвойсов выставляются автоматически
- Ошибки биллинга `<0.5%`
- DSO сокращен на `20%`

Приоритет: P3 (Scale)  
Зависит от: [EPIC-12], [EPIC-20]  
Оценка: L (1-3 мес)

### Stories

[STORY-113] Plan Catalog & Subscription Lifecycle
Как Network Admin, я хочу управлять тарифами и подписками, чтобы гибко монетизировать разные сегменты клиентов.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/billing/plans` и `POST /api/v1/billing/subscriptions`.
- [ ] AC2: Поддержаны billing cycles `monthly|quarterly|yearly`.
- [ ] AC3: Proration при mid-cycle upgrade/downgrade.

Story Points: 8
Приоритет: Must
Epic: [EPIC-21]
Зависит от: [STORY-070]

#### Tasks для STORY-113:

[TASK-0561] Billing plans backend
Тип: Backend
Описание: Модель тарифов и подписок с lifecycle.
Критерии готовности (DoD):
- [ ] Proration формулы покрыты тестами.
Оценка: 8h
Story: [STORY-113]

[TASK-0562] UI subscription manager
Тип: Frontend
Описание: Экран тарифов и текущей подписки.
Критерии готовности (DoD):
- [ ] Показываются next billing date и projected cost.
Оценка: 4h
Story: [STORY-113]

[TASK-0563] Design plan comparison
Тип: Design
Описание: Таблица сравнения планов.
Критерии готовности (DoD):
- [ ] Отличия планов видны по ключевым лимитам.
Оценка: 2h
Story: [STORY-113]

[TASK-0564] QA subscription lifecycle
Тип: QA
Описание: Проверка create/upgrade/downgrade/cancel.
Критерии готовности (DoD):
- [ ] Proration корректен в 100% тест-кейсов.
Оценка: 8h
Story: [STORY-113]

[TASK-0565] Billing scheduler infra
Тип: DevOps
Описание: Планировщик биллинговых циклов.
Критерии готовности (DoD):
- [ ] Пропущенные биллинговые задачи детектируются.
Оценка: 4h
Story: [STORY-113]

---

[STORY-114] Usage-based Billing (Fraud/Proxy)
Как Finance Manager, я хочу usage billing по fraud checks и proxy usage, чтобы монетизация отражала реальную нагрузку.

Acceptance Criteria:
- [ ] AC1: Метринг `fraud_checks_count`, `proxy_minutes`, `proxy_bandwidth`.
- [ ] AC2: Usage обновляется near-realtime (`<5 мин`).
- [ ] AC3: Спорные usage-начисления можно пересчитать за период.

Story Points: 8
Приоритет: Must
Epic: [EPIC-21]
Зависит от: [STORY-041], [STORY-048]

#### Tasks для STORY-114:

[TASK-0566] Usage metering backend
Тип: Backend
Описание: Сбор, агрегация и хранение usage событий.
Критерии готовности (DoD):
- [ ] Поддержан пересчет usage за период.
Оценка: 8h
Story: [STORY-114]

[TASK-0567] UI usage breakdown
Тип: Frontend
Описание: Детализация потребления по услугам.
Критерии готовности (DoD):
- [ ] Видны текущий usage и прогноз до конца периода.
Оценка: 4h
Story: [STORY-114]

[TASK-0568] Design usage charts
Тип: Design
Описание: Графики consumption и cost trend.
Критерии готовности (DoD):
- [ ] Визуализация читаема для monthly cycle.
Оценка: 2h
Story: [STORY-114]

[TASK-0569] QA metering accuracy
Тип: QA
Описание: Проверка точности usage метрик.
Критерии готовности (DoD):
- [ ] Расхождение usage <0.5%.
Оценка: 8h
Story: [STORY-114]

[TASK-0570] Event pipeline for metering
Тип: DevOps
Описание: Поток обработки usage-событий.
Критерии готовности (DoD):
- [ ] Freshness usage <5 минут.
Оценка: 8h
Story: [STORY-114]

---

[STORY-115] Invoices & Payment Methods
Как Finance Manager, я хочу автоматически получать инвойсы и принимать платежи, чтобы ускорить cashflow.

Acceptance Criteria:
- [ ] AC1: Инвойсы генерируются автоматически в день биллинга.
- [ ] AC2: Поддержка карт и bank transfer.
- [ ] AC3: При неуспешной оплате запускается dunning.

Story Points: 5
Приоритет: Must
Epic: [EPIC-21]
Зависит от: [STORY-113], [STORY-114]

#### Tasks для STORY-115:

[TASK-0571] Invoice generation backend
Тип: Backend
Описание: Генерация инвойсов и запись статусов оплаты.
Критерии готовности (DoD):
- [ ] PDF инвойс формируется автоматически.
Оценка: 8h
Story: [STORY-115]

[TASK-0572] UI billing documents
Тип: Frontend
Описание: Список инвойсов и платежных методов.
Критерии готовности (DoD):
- [ ] Есть скачивание PDF и фильтр статусов.
Оценка: 4h
Story: [STORY-115]

[TASK-0573] Design invoice views
Тип: Design
Описание: Экраны инвойсов и платежных настроек.
Критерии готовности (DoD):
- [ ] Статусы paid/due/failed ясно видны.
Оценка: 2h
Story: [STORY-115]

[TASK-0574] QA payment flows
Тип: QA
Описание: Проверка успешной и неуспешной оплаты.
Критерии готовности (DoD):
- [ ] Webhook платежного провайдера обрабатывается корректно.
Оценка: 4h
Story: [STORY-115]

[TASK-0575] Payment gateway integration
Тип: DevOps
Описание: Интеграция и мониторинг платежных шлюзов.
Критерии готовности (DoD):
- [ ] Failover шлюза документирован и протестирован.
Оценка: 4h
Story: [STORY-115]

---

[STORY-116] Add-on Modules Billing
Как Network Admin, я хочу включать/выключать addon-модули, чтобы формировать кастомные пакеты для клиентов.

Acceptance Criteria:
- [ ] AC1: Addons: `advanced_analytics`, `mobile`, `smart_routing`, `smart_fraud`.
- [ ] AC2: Addon activation отражается в счете текущего/следующего периода.
- [ ] AC3: Feature-gating по addon статусу в runtime `<60s`.

Story Points: 5
Приоритет: Should
Epic: [EPIC-21]
Зависит от: [STORY-113]

#### Tasks для STORY-116:

[TASK-0576] Addon billing backend
Тип: Backend
Описание: Модель addon подписок и pricing.
Критерии готовности (DoD):
- [ ] Активация/деактивация auditable.
Оценка: 8h
Story: [STORY-116]

[TASK-0577] UI addon toggles
Тип: Frontend
Описание: Переключение addon модулей в биллинге.
Критерии готовности (DoD):
- [ ] Видна стоимость addon до подтверждения.
Оценка: 4h
Story: [STORY-116]

[TASK-0578] Design addon pricing cards
Тип: Design
Описание: Карточки addon модулей.
Критерии готовности (DoD):
- [ ] Стоимость и ценность читаемы.
Оценка: 2h
Story: [STORY-116]

[TASK-0579] QA feature gating tests
Тип: QA
Описание: Проверка доступности функционала по addon статусу.
Критерии готовности (DoD):
- [ ] Runtime gating применяется <60s.
Оценка: 4h
Story: [STORY-116]

[TASK-0580] Feature flag-billing sync infra
Тип: DevOps
Описание: Синхронизация биллинга и feature flags.
Критерии готовности (DoD):
- [ ] Нет рассинхронизации addon state.
Оценка: 4h
Story: [STORY-116]

---

[STORY-117] Dunning & Collections
Как Finance Manager, я хочу автоматический dunning-процесс, чтобы снижать churn из-за неуспешных списаний.

Acceptance Criteria:
- [ ] AC1: Dunning steps: T+0, T+3, T+7, T+14 с уведомлениями.
- [ ] AC2: После T+14 account переводится в restricted mode.
- [ ] AC3: Оплата после restricted mode восстанавливает доступ `<10 минут`.

Story Points: 3
Приоритет: Should
Epic: [EPIC-21]
Зависит от: [STORY-115]

#### Tasks для STORY-117:

[TASK-0581] Dunning workflow backend
Тип: Backend
Описание: Автоматизация шагов dunning.
Критерии готовности (DoD):
- [ ] Restricted mode включается по правилам.
Оценка: 8h
Story: [STORY-117]

[TASK-0582] UI dunning status
Тип: Frontend
Описание: Отображение статуса задолженности и действий.
Критерии готовности (DoD):
- [ ] Пользователь видит next action и срок.
Оценка: 4h
Story: [STORY-117]

[TASK-0583] Design collections states
Тип: Design
Описание: Состояния предупреждений и restricted mode.
Критерии готовности (DoD):
- [ ] Состояния не блокируют критичный доступ к оплате.
Оценка: 2h
Story: [STORY-117]

[TASK-0584] QA dunning lifecycle
Тип: QA
Описание: Проверка шагов T+0/T+3/T+7/T+14.
Критерии готовности (DoD):
- [ ] Recovery after payment <10 мин.
Оценка: 4h
Story: [STORY-117]

[TASK-0585] Job orchestration for dunning
Тип: DevOps
Описание: Надежный scheduler и мониторинг dunning job.
Критерии готовности (DoD):
- [ ] Пропуски dunning job алертятся.
Оценка: 4h
Story: [STORY-117]

---

## [EPIC-22] Compliance & Security Hardening

Цель: Подготовить платформу к требованиям SOC2/GDPR и усилить security baseline.

Метрика успеха:
- Готовность к SOC2 Type II audit
- SLA закрытия high vulnerabilities `<7 дней`
- 100% критичных действий в immutable audit logs

Приоритет: P3 (Scale)  
Зависит от: [EPIC-06], [EPIC-21]  
Оценка: XL (3+ мес)

### Stories

[STORY-118] SOC2 Control Framework
Как Network Admin, я хочу внедрить SOC2-контроли, чтобы пройти аудит без блокеров.

Acceptance Criteria:
- [ ] AC1: Контрольные процедуры для access, change management, incident response документированы.
- [ ] AC2: Evidence collection автоматизирована.
- [ ] AC3: Ежемесячный compliance scorecard доступен.

Story Points: 8
Приоритет: Must
Epic: [EPIC-22]
Зависит от: [STORY-038], [STORY-040]

#### Tasks для STORY-118:

[TASK-0586] Compliance controls backend
Тип: Backend
Описание: Модели контролей и evidence registry.
Критерии готовности (DoD):
- [ ] Evidence привязана к control ID и периоду.
Оценка: 8h
Story: [STORY-118]

[TASK-0587] UI compliance dashboard
Тип: Frontend
Описание: Панель контролей и статусов доказательств.
Критерии готовности (DoD):
- [ ] Видны overdue controls.
Оценка: 4h
Story: [STORY-118]

[TASK-0588] Design compliance scorecard
Тип: Design
Описание: Scorecard и карточки контролей.
Критерии готовности (DoD):
- [ ] Статусы complete/partial/missing различимы.
Оценка: 2h
Story: [STORY-118]

[TASK-0589] QA controls traceability
Тип: QA
Описание: Проверка трассируемости control -> evidence.
Критерии готовности (DoD):
- [ ] Нет контролей без подтверждающих evidence.
Оценка: 4h
Story: [STORY-118]

[TASK-0590] Evidence storage hardening
Тип: DevOps
Описание: Защищенное и неизменяемое хранение evidence.
Критерии готовности (DoD):
- [ ] WORM-политики применены.
Оценка: 8h
Story: [STORY-118]

---

[STORY-119] GDPR Data Subject Requests
Как Network Admin, я хочу обрабатывать GDPR-запросы (export/delete), чтобы соблюдать требования privacy.

Acceptance Criteria:
- [ ] AC1: `POST /api/v1/privacy/requests` с типами `export|delete|rectify`.
- [ ] AC2: SLA обработки запроса `<30 дней`.
- [ ] AC3: Удаление данных выполняется во всех связанных хранилищах.

Story Points: 8
Приоритет: Must
Epic: [EPIC-22]
Зависит от: [STORY-032], [STORY-039]

#### Tasks для STORY-119:

[TASK-0591] Privacy request backend
Тип: Backend
Описание: Workflow обработки GDPR запросов.
Критерии готовности (DoD):
- [ ] Полный trace request lifecycle доступен.
Оценка: 8h
Story: [STORY-119]

[TASK-0592] UI privacy request center
Тип: Frontend
Описание: Экран входящих GDPR запросов.
Критерии готовности (DoD):
- [ ] Есть SLA timer и статус исполнения.
Оценка: 4h
Story: [STORY-119]

[TASK-0593] Design privacy workflow
Тип: Design
Описание: UX обработки privacy запросов.
Критерии готовности (DoD):
- [ ] Риски и irreversible actions обозначены.
Оценка: 2h
Story: [STORY-119]

[TASK-0594] QA data deletion coverage
Тип: QA
Описание: Проверка удаления/экспорта по всем системам.
Критерии готовности (DoD):
- [ ] Нет остаточных персональных данных после delete.
Оценка: 8h
Story: [STORY-119]

[TASK-0595] Data erasure orchestration infra
Тип: DevOps
Описание: Оркестрация удаления в БД, логах и архивах.
Критерии готовности (DoD):
- [ ] Erasure jobs идемпотентны и auditable.
Оценка: 8h
Story: [STORY-119]

---

[STORY-120] Immutable Audit Logs
Как Finance Manager, я хочу неизменяемые audit logs, чтобы расследования и проверки были юридически надежными.

Acceptance Criteria:
- [ ] AC1: Audit logs защищены от изменения (WORM/hash-chain).
- [ ] AC2: Поиск в audit log `<2s p95`.
- [ ] AC3: Ретеншн политики 1 год hot + 7 лет archive.

Story Points: 5
Приоритет: Must
Epic: [EPIC-22]
Зависит от: [STORY-010], [STORY-112]

#### Tasks для STORY-120:

[TASK-0596] Immutable log backend
Тип: Backend
Описание: Неизменяемый журнал и проверка целостности.
Критерии готовности (DoD):
- [ ] Tamper-check запускается автоматически.
Оценка: 8h
Story: [STORY-120]

[TASK-0597] UI audit search
Тип: Frontend
Описание: Быстрый поиск и фильтры по audit записям.
Критерии готовности (DoD):
- [ ] Есть поиск по actor/action/resource.
Оценка: 4h
Story: [STORY-120]

[TASK-0598] Design audit search UX
Тип: Design
Описание: Экран поиска и просмотра audit событий.
Критерии готовности (DoD):
- [ ] Быстрый доступ к деталям события.
Оценка: 2h
Story: [STORY-120]

[TASK-0599] QA integrity verification
Тип: QA
Описание: Проверка tamper-detection и поиска.
Критерии готовности (DoD):
- [ ] Integrity alerts корректно поднимаются.
Оценка: 4h
Story: [STORY-120]

[TASK-0600] Archive storage lifecycle
Тип: DevOps
Описание: 1y hot + 7y archive для audit.
Критерии готовности (DoD):
- [ ] Доступ к архиву подтвержден в восстановлении.
Оценка: 8h
Story: [STORY-120]

---

[STORY-121] IP Whitelist & Session Security Policies
Как Network Admin, я хочу централизованные security policies, чтобы управлять доступом к платформе по строгим правилам.

Acceptance Criteria:
- [ ] AC1: Политики `ip_whitelist`, `session_timeout`, `device_limit` на tenant-level.
- [ ] AC2: Нарушение политики блокирует действие с кодом `403 policy_violation`.
- [ ] AC3: Политики применяются `<60s`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-22]
Зависит от: [STORY-040]

#### Tasks для STORY-121:

[TASK-0601] Security policy backend
Тип: Backend
Описание: Управление и enforcement security policies.
Критерии готовности (DoD):
- [ ] Политики версионируются и аудируются.
Оценка: 8h
Story: [STORY-121]

[TASK-0602] UI security policy editor
Тип: Frontend
Описание: Редактор tenant security policy.
Критерии готовности (DoD):
- [ ] Есть preview воздействия политики.
Оценка: 4h
Story: [STORY-121]

[TASK-0603] Design policy forms
Тип: Design
Описание: Формы настройки политик безопасности.
Критерии готовности (DoD):
- [ ] Рискованные настройки требуют подтверждения.
Оценка: 2h
Story: [STORY-121]

[TASK-0604] QA policy enforcement tests
Тип: QA
Описание: Тесты enforcement и propagation.
Критерии готовности (DoD):
- [ ] Применение <60s подтверждено.
Оценка: 4h
Story: [STORY-121]

[TASK-0605] Policy distribution infrastructure
Тип: DevOps
Описание: Распространение политик в runtime сервисы.
Критерии готовности (DoD):
- [ ] Нет stale policy дольше 60s.
Оценка: 4h
Story: [STORY-121]

---

[STORY-122] Penetration Testing & Vulnerability Program
Как Network Admin, я хочу регулярный pentest и процесс закрытия уязвимостей, чтобы поддерживать высокий security baseline.

Acceptance Criteria:
- [ ] AC1: Quarterly pentest с отчетом и remediation plan.
- [ ] AC2: High/Critical уязвимости закрываются `<7 дней`.
- [ ] AC3: `GET /api/v1/security/vulnerabilities` показывает статусы remediation.

Story Points: 5
Приоритет: Should
Epic: [EPIC-22]
Зависит от: [STORY-118]

#### Tasks для STORY-122:

[TASK-0606] Vulnerability tracking backend
Тип: Backend
Описание: Реестр уязвимостей и статусов исправления.
Критерии готовности (DoD):
- [ ] Поддержана связь vuln -> ticket -> fix.
Оценка: 8h
Story: [STORY-122]

[TASK-0607] UI vulnerability dashboard
Тип: Frontend
Описание: Панель уязвимостей и SLA remediation.
Критерии готовности (DoD):
- [ ] Есть фильтр severity/owner/status.
Оценка: 4h
Story: [STORY-122]

[TASK-0608] Design security issue board
Тип: Design
Описание: Доска статусов security задач.
Критерии готовности (DoD):
- [ ] Критичные уязвимости визуально приоритетны.
Оценка: 2h
Story: [STORY-122]

[TASK-0609] QA remediation SLA tests
Тип: QA
Описание: Проверка SLA трекинга и статусов.
Критерии готовности (DoD):
- [ ] Просрочка SLA корректно сигнализируется.
Оценка: 4h
Story: [STORY-122]

[TASK-0610] Security scanning pipeline
Тип: DevOps
Описание: Интеграция SAST/DAST/dependency scan в CI.
Критерии готовности (DoD):
- [ ] High/Critical findings блокируют релиз.
Оценка: 8h
Story: [STORY-122]

---

## [EPIC-23] Smart Fraud (AI/ML v2)

Цель: Внедрить ML fraud scoring на собственных данных, behavioral analysis и shared intelligence (opt-in) для максимального качества антифрода.

Метрика успеха:
- AUC fraud model `>=0.92`
- False positive rate снижена на `20%`
- Detection latency `<150ms p95`

Приоритет: P3 (Scale)  
Зависит от: [EPIC-07], [EPIC-17], [EPIC-22]  
Оценка: XL (3+ мес)

### Stories

[STORY-123] First-party Fraud ML Model
Как Network Admin, я хочу ML-модель на собственных данных, чтобы точнее выявлять фрод, чем rule-based подход.

Acceptance Criteria:
- [ ] AC1: Модель обучается на собственном labeled dataset.
- [ ] AC2: Метрики валидации: AUC `>=0.92`, Recall(high-risk) `>=85%`.
- [ ] AC3: Inference endpoint `POST /api/v1/fraud/ml-score` отвечает `<150ms p95`.

Story Points: 8
Приоритет: Must
Epic: [EPIC-23]
Зависит от: [STORY-041], [STORY-044]

#### Tasks для STORY-123:

[TASK-0611] ML scoring backend service
Тип: Backend
Описание: Инференс сервис и интеграция с fraud pipeline.
Критерии готовности (DoD):
- [ ] Ответ включает score, band и model_version.
Оценка: 8h
Story: [STORY-123]

[TASK-0612] UI ML fraud insights
Тип: Frontend
Описание: Отображение ML-score и feature highlights.
Критерии готовности (DoD):
- [ ] Видна версия модели и confidence.
Оценка: 4h
Story: [STORY-123]

[TASK-0613] Design ML score widget
Тип: Design
Описание: Виджет ML-score и explain cues.
Критерии готовности (DoD):
- [ ] Разделены model score и rule score.
Оценка: 2h
Story: [STORY-123]

[TASK-0614] QA model inference tests
Тип: QA
Описание: Проверка latency и корректности ответов.
Критерии готовности (DoD):
- [ ] p95 <150ms подтвержден в нагрузке.
Оценка: 8h
Story: [STORY-123]

[TASK-0615] Model serving infrastructure
Тип: DevOps
Описание: Развертывание и autoscale ML inference.
Критерии готовности (DoD):
- [ ] Autoscale удерживает SLA при пике.
Оценка: 8h
Story: [STORY-123]

---

[STORY-124] Behavioral & Velocity Checks
Как Affiliate Manager, я хочу behavioral и velocity анализ, чтобы ловить сложный фрод по паттернам поведения.

Acceptance Criteria:
- [ ] AC1: Checks: rapid form submit, repeated device patterns, velocity by IP/email/phone.
- [ ] AC2: Threshold rules настраиваются per-tenant.
- [ ] AC3: Сигналы входят в итоговый fraud score.

Story Points: 5
Приоритет: Must
Epic: [EPIC-23]
Зависит от: [STORY-123], [STORY-047]

#### Tasks для STORY-124:

[TASK-0616] Behavioral signals backend
Тип: Backend
Описание: Вычисление behavioral/velocity сигналов.
Критерии готовности (DoD):
- [ ] Сигналы нормализованы для model input.
Оценка: 8h
Story: [STORY-124]

[TASK-0617] UI behavioral signal breakdown
Тип: Frontend
Описание: Детализация поведенческих сигналов в профиле лида.
Критерии готовности (DoD):
- [ ] Видны пороги и фактические значения.
Оценка: 4h
Story: [STORY-124]

[TASK-0618] Design signal explain panel
Тип: Design
Описание: Панель объяснений behavioral сигналов.
Критерии готовности (DoD):
- [ ] Сигналы ранжируются по влиянию.
Оценка: 2h
Story: [STORY-124]

[TASK-0619] QA velocity edge tests
Тип: QA
Описание: Проверка false-positive на burst трафике.
Критерии готовности (DoD):
- [ ] False-positive не выше целевого порога.
Оценка: 4h
Story: [STORY-124]

[TASK-0620] Stream feature computation infra
Тип: DevOps
Описание: Потоковые вычисления behavioral features.
Критерии готовности (DoD):
- [ ] Feature freshness <1 мин.
Оценка: 8h
Story: [STORY-124]

---

[STORY-125] Shared Fraud Intelligence (Opt-in)
Как Network Admin, я хочу опционально использовать shared fraud intelligence, чтобы улучшать детекцию на основе межклиентских сигналов.

Acceptance Criteria:
- [ ] AC1: Участие только по явному opt-in.
- [ ] AC2: Сигналы агрегируются анонимно и без раскрытия клиентских PII.
- [ ] AC3: Можно отключить opt-in и удалить вклад данных по запросу.

Story Points: 8
Приоритет: Should
Epic: [EPIC-23]
Зависит от: [STORY-119], [STORY-123]

#### Tasks для STORY-125:

[TASK-0621] Shared intelligence backend
Тип: Backend
Описание: Сервис агрегированных межклиентских сигналов.
Критерии готовности (DoD):
- [ ] Реализовано строгая анонимизация данных.
Оценка: 8h
Story: [STORY-125]

[TASK-0622] UI opt-in controls
Тип: Frontend
Описание: Настройка opt-in/opt-out и прозрачность участия.
Критерии готовности (DoD):
- [ ] Видно какие данные участвуют в обмене.
Оценка: 4h
Story: [STORY-125]

[TASK-0623] Design privacy consent UI
Тип: Design
Описание: UX согласия и прозрачности shared intelligence.
Критерии готовности (DoD):
- [ ] Текст согласия юридически и UX корректен.
Оценка: 2h
Story: [STORY-125]

[TASK-0624] QA opt-in compliance tests
Тип: QA
Описание: Проверка режима opt-in/opt-out и удаления вкладов.
Критерии готовности (DoD):
- [ ] После opt-out данные не участвуют в новых расчетах.
Оценка: 8h
Story: [STORY-125]

[TASK-0625] Privacy-safe data pipeline
Тип: DevOps
Описание: Пайплайн анонимизации и агрегирования сигналов.
Критерии готовности (DoD):
- [ ] PII leakage проверки в CI/CD включены.
Оценка: 8h
Story: [STORY-125]

---

[STORY-126] Explainable Fraud Decisions
Как Team Lead, я хочу explainability по ML-решениям, чтобы безопасно использовать автоматические блокировки.

Acceptance Criteria:
- [ ] AC1: Для каждого high-risk решения возвращаются top contributing features.
- [ ] AC2: `GET /api/v1/fraud/explanations/{lead_id}` доступен в UI.
- [ ] AC3: Explain response генерируется `<300ms p95`.

Story Points: 5
Приоритет: Must
Epic: [EPIC-23]
Зависит от: [STORY-123], [STORY-124]

#### Tasks для STORY-126:

[TASK-0626] Explainability backend
Тип: Backend
Описание: Сервис top-features и explanation payload.
Критерии готовности (DoD):
- [ ] Explanations сохраняются вместе с model_version.
Оценка: 8h
Story: [STORY-126]

[TASK-0627] UI explanation panel
Тип: Frontend
Описание: Панель объяснений fraud решения.
Критерии готовности (DoD):
- [ ] Видны feature impacts и thresholds.
Оценка: 4h
Story: [STORY-126]

[TASK-0628] Design explain cards
Тип: Design
Описание: Карточки вкладов признаков в решение.
Критерии готовности (DoD):
- [ ] Вклады сортируются по убыванию влияния.
Оценка: 2h
Story: [STORY-126]

[TASK-0629] QA explain consistency
Тип: QA
Описание: Проверить一致ность explanation с фактическим score.
Критерии готовности (DoD):
- [ ] Объяснение соответствует модели без расхождений.
Оценка: 4h
Story: [STORY-126]

[TASK-0630] Low-latency explain cache
Тип: DevOps
Описание: Кэширование explanation для быстрых повторных запросов.
Критерии готовности (DoD):
- [ ] p95 explain <300ms.
Оценка: 4h
Story: [STORY-126]

---

[STORY-127] Model Monitoring & Retraining Governance
Как Network Admin, я хочу мониторить drift и управлять переобучением модели, чтобы качество fraud detection не деградировало.

Acceptance Criteria:
- [ ] AC1: Drift monitoring по feature/stat distribution и performance metrics.
- [ ] AC2: Alert при AUC падении >5% относительно baseline.
- [ ] AC3: Retraining workflow требует approval перед promotion модели.

Story Points: 8
Приоритет: Must
Epic: [EPIC-23]
Зависит от: [STORY-123], [STORY-097]

#### Tasks для STORY-127:

[TASK-0631] Model monitoring backend
Тип: Backend
Описание: Сбор drift/performance метрик модели.
Критерии готовности (DoD):
- [ ] Мониторинг покрывает online и offline метрики.
Оценка: 8h
Story: [STORY-127]

[TASK-0632] UI model governance dashboard
Тип: Frontend
Описание: Дашборд drift и статусов моделей.
Критерии готовности (DoD):
- [ ] Видны active/candidate/retired модели.
Оценка: 4h
Story: [STORY-127]

[TASK-0633] Design model lifecycle view
Тип: Design
Описание: Визуализация lifecycle ML моделей.
Критерии готовности (DoD):
- [ ] Promotion workflow понятен и безопасен.
Оценка: 2h
Story: [STORY-127]

[TASK-0634] QA drift alert tests
Тип: QA
Описание: Проверка алертов и approval-процесса retraining.
Критерии готовности (DoD):
- [ ] Алерт срабатывает при падении AUC >5%.
Оценка: 4h
Story: [STORY-127]

[TASK-0635] MLOps retraining pipeline
Тип: DevOps
Описание: Пайплайн retraining, evaluation и controlled rollout.
Критерии готовности (DoD):
- [ ] Promotion модели возможен только после approval.
Оценка: 8h
Story: [STORY-127]

