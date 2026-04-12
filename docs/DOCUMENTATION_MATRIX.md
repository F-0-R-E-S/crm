# Матрица заполненности документации

> Последнее обновление: 2026-04-12
> Обновляется автоматически: `python3 docs/scripts/check_docs_completeness.py`

## Сводка

| Категория | Документов | Заполнено | Покрытие |
|-----------|:----------:|:---------:|:--------:|
| Техническая | 11 | 11 | 100% |
| Продуктовая | 3 | 3 | 100% |
| Пользовательские гайды | 3 | 3 | 100% |
| **Итого** | **17** | **17** | **100%** |

---

## Техническая

| Документ | Файл | Статус | Размер | Покрывает |
|----------|------|:------:|:------:|-----------|
| Архитектура системы | `technical/architecture.md` | ✅ | 9,041B | Стек, схема, 13 сервисов, потоки данных, мультитенантность |
| Микросервисы | `technical/services.md` | ✅ | 8,667B | 13 сервисов, порты, функции, файлы |
| База данных | `technical/database.md` | ✅ | 8,180B | PostgreSQL, ClickHouse, RLS, SQLC, 6 миграций |
| API Reference | `technical/api.md` | ✅ | 10,093B | REST API, аутентификация, assistant, smart-routing, UAD |
| Система событий | `technical/events.md` | ✅ | 5,747B | NATS JetStream, потоки, cmd_handler паттерны |
| CI/CD | `technical/ci-cd.md` | ✅ | 2,410B | GitHub Actions, lint, test, build, deploy |
| Деплой | `technical/deployment.md` | ✅ | 4,318B | Docker Compose, prod, deploy.yml, мониторинг |
| Видео-пайплайн | `technical/pipeline.md` | ✅ | 5,551B | 7 стадий, параметры, выходные данные |
| Фронтенд | `technical/frontend.md` | ✅ | 5,557B | React 18, 15 страниц, Liquid Glass UI, stores, hooks |
| Мобильное приложение | `technical/mobile.md` | ✅ | 3,911B | Expo React Native, iOS/Android, 7 экранов |
| AI Assistant | `technical/assistant.md` | ✅ | 7,490B | Claude API, 40+ tools, RBAC, SSE streaming |

## Продуктовая

| Документ | Файл | Статус | Размер | Покрывает |
|----------|------|:------:|:------:|-----------|
| Обзор продукта | `product/overview.md` | ✅ | 4,594B | Видение, позиционирование, ЦА, рынок |
| Конкурентный анализ | `product/competitors.md` | ✅ | 5,828B | 6 конкурентов, feature matrix, GAP |
| Дорожная карта | `product/roadmap.md` | ✅ | 6,714B | 23 эпика, 6 потоков, прогресс реализации |

## Пользовательские гайды

| Документ | Файл | Статус | Размер | Покрывает |
|----------|------|:------:|:------:|-----------|
| Быстрый старт | `guides/getting-started.md` | ✅ | 2,937B | Установка, запуск, бэкенд, фронтенд, мобайл |
| Конфигурация | `guides/configuration.md` | ✅ | 3,974B | Переменные, секреты, порты, external APIs |
| Видео-пайплайн | `guides/pipeline-usage.md` | ✅ | 5,115B | Запуск, параметры, troubleshooting |

---

## Покрытие исходного кода документацией

### Микросервисы (services/)

| Сервис | Порт | Существует | Документация |
|--------|:----:|:----------:|:------------:|
| api-gateway | 8080 | ✅ | ✅ |
| lead-intake-svc | 8001 | ✅ | ✅ |
| routing-engine-svc | 8002 | ✅ | ✅ |
| broker-adapter-svc | 8003 | ✅ | ✅ |
| fraud-engine-svc | 8004 | ✅ | ✅ |
| status-sync-svc | 8005 | ✅ | ✅ |
| autologin-svc | 8006 | ✅ | ✅ |
| uad-svc | 8007 | ✅ | ✅ |
| notification-svc | 8008 | ✅ | ✅ |
| identity-svc | 8010 | ✅ | ✅ |
| analytics-svc | 8011 | ✅ | ✅ |
| assistant-svc | 8012 | ✅ | ✅ |
| smart-routing-svc | 8013 | ✅ | ✅ |

### Пакеты (pkg/)

| Пакет | Существует | Документация |
|-------|:----------:|:------------:|
| cache | ✅ | ✅ (architecture.md) |
| database | ✅ | ✅ (database.md) |
| e164 | ✅ | ✅ (api.md) |
| email | ✅ | ✅ (services.md) |
| errors | ✅ | ⚠️ |
| events | ✅ | ✅ (events.md) |
| geoip | ✅ | ✅ (services.md) |
| idempotency | ✅ | ✅ (api.md) |
| messaging | ✅ | ✅ (events.md) |
| middleware | ✅ | ✅ (api.md) |
| models | ✅ | ✅ (database.md) |
| rbac | ✅ | ✅ (assistant.md) |
| telemetry | ✅ | ✅ (deployment.md) |

### Фронтенд (web/src/pages/)

| Страница | Существует | Документация |
|----------|:----------:|:------------:|
| AcceptInvitePage | ✅ | ✅ |
| AffiliatesPage | ✅ | ✅ |
| AnalyticsPage | ✅ | ✅ |
| BrokersPage | ✅ | ✅ |
| DashboardPage | ✅ | ✅ |
| LeadsPage | ✅ | ✅ |
| LoginPage | ✅ | ✅ |
| NotificationPreferencesPage | ✅ | ✅ |
| OnboardingPage | ✅ | ✅ |
| RoutingPage | ✅ | ✅ |
| SessionsPage | ✅ | ✅ |
| SettingsPage | ✅ | ✅ |
| SmartRoutingPage | ✅ | ✅ |
| UADPage | ✅ | ✅ |
| UsersPage | ✅ | ✅ |

### Мобильное приложение (mobile/app/)

| Экран | Существует | Документация |
|-------|:----------:|:------------:|
| analytics | ✅ | ✅ |
| brokers | ✅ | ✅ |
| index | ✅ | ✅ |
| lead/[id] | ✅ | ✅ |
| leads | ✅ | ✅ |
| login | ✅ | ✅ |
| settings | ✅ | ✅ |

### Инфраструктура

| Компонент | Существует | Док��ментация |
|-----------|:----------:|:------------:|
| `migrations/001_initial_schema.up.sql` | ✅ | database.md |
| `migrations/002_rbac_sessions_invites.up.sql` | ✅ | database.md |
| `migrations/004_assistant_schema.up.sql` | ✅ | assistant.md |
| `migrations/006_streams_2_to_6.up.sql` | ✅ | database.md |
| `docker-compose.yml` | ✅ | deployment.md |
| `docker-compose.deploy.yml` | ✅ | deployment.md |
| `.github/workflows/ci.yml` | ✅ | ci-cd.md |
| `.github/workflows/deploy.yml` | ✅ | ci-cd.md |
| `deploy/prometheus/prometheus.yml` | ✅ | deployment.md |
| `Makefile` | ✅ | getting-started.md |
| `contracts/lead-schema.yaml` | ✅ | roadmap.md |
| `STREAMS.md` | ✅ | roadmap.md |
| `PRODUCT_BACKLOG_v1.md` | ✅ | roadmap.md |

### Конкурентные д��нные

| Конкурент | competitor_analysis | overview | analysis_web | В документации | В стратегическом отчёте |
|-----------|:-------------------:|:--------:|:------------:|:--------------:|:----------------------:|
| CRM Mate | ✅ | — | — | ✅ | ✅ |
| Elnopy | ✅ | — | — | ✅ | ✅ |
| HyperOne | ✅ | — | — | ✅ | ✅ |
| Leadgreed | ✅ | — | — | ✅ | ✅ |
| GetLinked | ✅ | ✅ | ✅ | ✅ | ❌ |
| Trackbox | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Пробелы и рекомендации

### ⚠️ Недостающая документация

1. ⚠️ **GetLinked, Trackbox в стратегическом отчёте** — конкуренты не включены

### 📋 Рекомендации

- [ ] Включить GetLinked и Trackbox в `strategic_analysis_report.md`
- [ ] Добавить ADR (Architecture Decision Records) для ключевых решений
- [ ] Создать раздел с runbook-ами для on-call (инциденты, восстановление)
- [ ] Документировать Liquid Glass UI дизайн-систему (токены, компоненты)
