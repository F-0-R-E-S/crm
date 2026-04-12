# RELEASE PLAN v1.0 (2-Week Sprints)

## 1) Плановые допущения

- Длительность спринта: `2 недели`
- Период плана: `S01-S24` (`9 марта 2026` - `7 февраля 2027`)
- Квартал: `6 спринтов`
- База: backlog из `23` эпиков, `127` stories, `635` tasks
- База оценки: `3458h` task-hours из backlog
- Коэффициент delivery risk: `x1.7` (интеграции с брокерами, QA/rework, стабилизация)
- Плановая нагрузка после risk factor: `5879h`

## 2) Capacity Model (по ролям)

### 2.1 Требуемая нагрузка из backlog (с risk factor x1.7)

| Quarter | Required h/quarter | Required h/sprint | Backend | Frontend | QA | DevOps | Design |
|--------|---------------------|-------------------|---------|----------|----|--------|--------|
| Q1 | 2394h | 399h | 125h | 81h | 88h | 67h | 38h |
| Q2 | 1343h | 224h | 73h | 42h | 45h | 43h | 21h |
| Q3 | 1275h | 213h | 67h | 44h | 41h | 41h | 20h |
| Q4 | 867h | 145h | 45h | 23h | 30h | 35h | 12h |

### 2.2 Планируемая feature-capacity

| Quarter | Planned h/sprint | Backend | Frontend | QA | DevOps | Design | Utilization vs Required |
|--------|-------------------|---------|----------|----|--------|--------|-------------------------|
| Q1 | 410h | 128h | 84h | 92h | 68h | 38h | 97% |
| Q2 | 250h | 80h | 52h | 50h | 42h | 26h | 90% |
| Q3 | 240h | 76h | 50h | 46h | 42h | 26h | 89% |
| Q4 | 190h | 56h | 34h | 34h | 42h | 24h | 76% |

## 3) Sprint Calendar

| Sprint | Dates | Quarter | Primary Focus Epics |
|--------|-------|---------|----------------------|
| S01 | 2026-03-09 - 2026-03-22 | Q1 | EPIC-06, EPIC-04, EPIC-01 |
| S02 | 2026-03-23 - 2026-04-05 | Q1 | EPIC-01, EPIC-07 |
| S03 | 2026-04-06 - 2026-04-19 | Q1 | EPIC-02, EPIC-03 |
| S04 | 2026-04-20 - 2026-05-03 | Q1 | EPIC-02, EPIC-03, EPIC-05 |
| S05 | 2026-05-04 - 2026-05-17 | Q1 | EPIC-02, EPIC-05, EPIC-07 |
| S06 | 2026-05-18 - 2026-05-31 | Q1 | EPIC-01..EPIC-07 hardening |
| S07 | 2026-06-01 - 2026-06-14 | Q2 | EPIC-08 |
| S08 | 2026-06-15 - 2026-06-28 | Q2 | EPIC-08, EPIC-09 |
| S09 | 2026-06-29 - 2026-07-12 | Q2 | EPIC-09, EPIC-11 |
| S10 | 2026-07-13 - 2026-07-26 | Q2 | EPIC-10 core |
| S11 | 2026-07-27 - 2026-08-09 | Q2 | EPIC-10 advanced slices, EPIC-12 |
| S12 | 2026-08-10 - 2026-08-23 | Q2 | EPIC-13, launch stabilization |
| S13 | 2026-08-24 - 2026-09-06 | Q3 | EPIC-14 (report builder) |
| S14 | 2026-09-07 - 2026-09-20 | Q3 | EPIC-14 (dashboard constructor) |
| S15 | 2026-09-21 - 2026-10-04 | Q3 | EPIC-15 (mobile shell + KPI) |
| S16 | 2026-10-05 - 2026-10-18 | Q3 | EPIC-15, EPIC-16 |
| S17 | 2026-10-19 - 2026-11-01 | Q3 | EPIC-16, EPIC-17 |
| S18 | 2026-11-02 - 2026-11-15 | Q3 | EPIC-18, EPIC-19 |
| S19 | 2026-11-16 - 2026-11-29 | Q4 | EPIC-20 |
| S20 | 2026-11-30 - 2026-12-13 | Q4 | EPIC-20, EPIC-21 |
| S21 | 2026-12-14 - 2026-12-27 | Q4 | EPIC-21 |
| S22 | 2026-12-28 - 2027-01-10 | Q4 | EPIC-22 |
| S23 | 2027-01-11 - 2027-01-24 | Q4 | EPIC-22, EPIC-23 |
| S24 | 2027-01-25 - 2027-02-07 | Q4 | EPIC-23, scale hardening |

## 4) Sprint-by-Sprint Delivery Goals

| Sprint | Delivery Goal | Exit Criteria |
|--------|---------------|---------------|
| S01 | Auth/RBAC + affiliate skeleton + first intake endpoint | Login/JWT/roles в прод-контуре, аффилейт CRUD, `POST /leads` happy path |
| S02 | Intake reliability + anti-fraud base | Validation/dedup/idempotency в боевой цепочке, fraud score v1 включен |
| S03 | Routing foundation + broker templates | Flow CRUD/publish, шаблоны брокеров, field mapping base |
| S04 | WRR + Slots/Chance + lead UI core | Оба алгоритма доступны per-flow, lead table/profile работают |
| S05 | Constraints/fallback/simulate + ops tooling | GEO/schedule/caps/fallback/simulation доступны и протестированы |
| S06 | MVP hardening | P0 SLO, e2e сценарии, go/no-go отчёт для MVP |
| S07 | Autologin pipeline v1 | 4-stage pipeline + stage monitoring |
| S08 | Fingerprint/proxy + UAD start | Proxy pool, anomaly base, UAD сценарии v1 |
| S09 | UAD scheduler + notifications base | Scheduled resend, Telegram/email/webhook канал включены |
| S10 | Analytics core differentiator | KPI tiles + time-series + drill-down |
| S11 | Finance + advanced analytics slices | Affiliate P&L, ROI compare, cohort/shave/predictive cap MVP |
| S12 | Onboarding launch | Wizard + templates + first lead <30min KPI |
| S13 | BI custom reports | Report builder и preview стабильно работают |
| S14 | BI dashboard constructor | Виджетный конструктор и period compare |
| S15 | Mobile foundation | Mobile auth + realtime KPI |
| S16 | Mobile actions + marketplace base | Alerts center и quick cap controls, public catalog |
| S17 | Marketplace growth + Smart Routing AI start | One-click install, recommendations по весам |
| S18 | Status normalization + Developer portal | Unified statuses, shave cases, docs/sdk/sandbox |
| S19 | White-label domain/branding | Кастомный домен, SSL, branding |
| S20 | Enterprise instances + billing plans | Dedicated provisioning, subscription lifecycle |
| S21 | Usage billing + invoices | Usage metering, invoice generation, payments |
| S22 | Compliance hardening | SOC2 controls, GDPR workflows, immutable audit |
| S23 | Security + Smart Fraud v2 start | Pen-test pipeline, ML fraud model integration |
| S24 | Smart Fraud v2 scale | Behavioral/shared intelligence/explainability + model governance |

## 5) Quarter Gates

| Quarter | Gate | KPI for Gate |
|--------|------|--------------|
| Q1 | MVP Gate | Intake p95 <500ms, routing success >=99.9%, базовые anti-fraud checks в realtime |
| Q2 | Launch Gate | Analytics v1 в проде, onboarding <30m, UAD + notifications стабильны |
| Q3 | Growth Gate | BI self-serve, mobile dashboard adoption, marketplace + smart routing signals |
| Q4 | Scale Gate | White-label enterprise readiness, billing automation, compliance/security baseline |

## 6) Execution Rules (для planning/standups)

- На каждый спринт фиксировать `1 primary` и `1 secondary` epic, не более.
- Не переносить в следующий спринт более `15%` story points от committed объема.
- Любая задача с риском блокера >2 дней должна иметь owner escalation в тот же день.
- Последние `2` дня каждого спринта резервировать под integration QA + regression.

## 7) Связь с Jira Import

- Источник задач: `product_backlog/jira_import_all_issues.csv`
- Рекомендуемый процесс: импорт всего CSV -> создание версий `Q1/Q2/Q3/Q4` -> назначение sprint id `S01..S24` по таблицам выше.

