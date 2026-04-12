# Матрица заполненности документации

> Последнее обновление: 2026-04-12
> Обновляется автоматически: `python3 docs/scripts/check_docs_completeness.py`

## Сводка

| Категория | Документов | Заполнено | Покрытие |
|-----------|:----------:|:---------:|:--------:|
| Техническая | 8 | 8 | 100% |
| Продуктовая | 3 | 3 | 100% |
| Пользовательские гайды | 3 | 3 | 100% |
| **Итого** | **14** | **14** | **100%** |

---

## Техническая

| Документ | Файл | Статус | Размер | Покрывает |
|----------|------|:------:|:------:|-----------|
| Архитектура системы | `technical/architecture.md` | ✅ | 7,551B | Стек, схема, потоки данных, мультитенантность |
| Микросервисы | `technical/services.md` | ✅ | 7,029B | 11 сервисов, порты, функции, файлы |
| База данных | `technical/database.md` | ✅ | 6,603B | PostgreSQL, ClickHouse, RLS, SQLC, миграции |
| API Reference | `technical/api.md` | ✅ | 6,169B | Эндпоинты, аутентификация, форматы, статусы |
| Система событий | `technical/events.md` | ✅ | 4,296B | NATS JetStream, потоки, паттерны |
| CI/CD | `technical/ci-cd.md` | ✅ | 2,410B | GitHub Actions, lint, test, build, deploy |
| Деплой | `technical/deployment.md` | ✅ | 3,754B | Docker Compose, prod, мониторинг |
| Видео-пайплайн | `technical/pipeline.md` | ✅ | 5,551B | 7 стадий, параметры, выходные данные |

## Продуктовая

| Документ | Файл | Статус | Размер | Покрывает |
|----------|------|:------:|:------:|-----------|
| Обзор продукта | `product/overview.md` | ✅ | 4,594B | Видение, позиционирование, ЦА, рынок |
| Конкурентный анализ | `product/competitors.md` | ✅ | 5,828B | 6 конкурентов, feature matrix, GAP |
| Дорожная карта | `product/roadmap.md` | ✅ | 4,821B | 23 эпика, P0–P3, метрики |

## Пользовательские гайды

| Документ | Файл | Статус | Размер | Покрывает |
|----------|------|:------:|:------:|-----------|
| Быстрый старт | `guides/getting-started.md` | ✅ | 2,691B | Установка, запуск, проверка |
| Конфигурация | `guides/configuration.md` | ✅ | 3,579B | Переменные, секреты, порты |
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

### Пакеты (pkg/)

| Пакет | Существует | Документация |
|-------|:----------:|:------------:|
| cache | ✅ | ✅ |
| database | ✅ | ✅ |
| e164 | ✅ | ✅ |
| errors | ✅ | ⚠️ |
| events | ✅ | ✅ |
| idempotency | ✅ | ✅ |
| messaging | ✅ | ✅ |
| middleware | ✅ | ✅ |
| models | ✅ | ✅ |
| phone | ✅ | ✅ |
| telemetry | ✅ | ✅ |

### Фронтенд (web/src/pages/)

| Страница | Существует | Документация |
|----------|:----------:|:------------:|
| AffiliatesPage | ✅ | ⚠️ |
| AnalyticsPage | ✅ | ⚠️ |
| BrokersPage | ✅ | ⚠️ |
| DashboardPage | ✅ | ⚠️ |
| LeadsPage | ✅ | ⚠️ |
| LoginPage | ✅ | ⚠️ |
| RoutingPage | ✅ | ⚠️ |
| SettingsPage | ✅ | ⚠️ |

### Инфраструктура

| Компонент | Существует | Документация |
|-----------|:----------:|:------------:|
| `migrations/001_initial_schema.up.sql` | ✅ | database.md |
| `migrations/002_clickhouse_schema.sql` | ✅ | database.md |
| `docker-compose.yml` | ✅ | deployment.md |
| `docker-compose.prod.yml` | ✅ | deployment.md |
| `.github/workflows/ci.yml` | ✅ | ci-cd.md |
| `.github/workflows/deploy.yml` | ✅ | ci-cd.md |
| `deploy/prometheus/prometheus.yml` | ✅ | deployment.md |
| `Makefile` | ✅ | getting-started.md |

### Конкурентные данные

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

1. ⚠️ **Детальное описание фронтенд-страниц** — нет отдельного гайда по UI-компонентам
2. ⚠️ **Описание pkg/errors** — пакет обработки ошибок не задокументирован отдельно
3. ⚠️ **Zustand stores** — стейт-менеджмент фронтенда не описан
4. ⚠️ **GetLinked, Trackbox в стратегическом отчёте** — конкуренты не включены

### 📋 Рекомендации

- [ ] Добавить `docs/technical/frontend.md` с описанием UI-компонентов и stores
- [ ] Включить GetLinked и Trackbox в `strategic_analysis_report.md`
- [ ] Добавить ADR (Architecture Decision Records) для ключевых решений
- [ ] Создать раздел с runbook-ами для on-call (инциденты, восстановление)
