# GambChamp CRM — Документация

> B2B SaaS платформа дистрибуции лидов для крипто/форекс аффилейт-маркетинга

---

## Навигация

### Техническая документация

| Документ | Описание |
|----------|----------|
| [Архитектура системы](technical/architecture.md) | Общая архитектура, 13 микросервисов, потоки данных |
| [Микросервисы](technical/services.md) | Детальное описание каждого из 13 сервисов |
| [База данных](technical/database.md) | Схема PostgreSQL, ClickHouse, 6 миграций, RLS |
| [API Reference](technical/api.md) | REST API эндпоинты, аутентификация, фор��аты |
| [Система событий](technical/events.md) | NATS JetStream, потоки, cmd_handler паттерны |
| [CI/CD](technical/ci-cd.md) | GitHub Actions, Docker, деплой |
| [Деплой](technical/deployment.md) | Docker Compose, продакшн, мониторинг |
| [Фронтенд](technical/frontend.md) | React 18, 15 страниц, Liquid Glass UI, Zustand stores |
| [Мобильное приложение](technical/mobile.md) | Expo React Native, iOS/Android |
| [AI Assistant](technical/assistant.md) | Claude API, 40+ tools, RBAC, streaming |
| [Видео-пайплайн](technical/pipeline.md) | Пайплайн анализа конкурентов |

### Продуктовая документация

| Документ | Описание |
|----------|----------|
| [Обзор продукта](product/overview.md) | Видение, позиционирование, ключевые метрики |
| [Конкурентный анализ](product/competitors.md) | 6 конкурентов, feature matrix, GAP-анализ |
| [Дорожная карта](product/roadmap.md) | 23 эпика, 6 потоков реализации, прогресс |

### Пользовательские гайды

| Документ | Описание |
|----------|----------|
| [Быстрый старт](guides/getting-started.md) | Настройка dev-окружения (бэкенд, фронте��д, мобайл) |
| [Конфигурация](guides/configuration.md) | Переменные окружения, секре��ы, порты |
| [Работа с пайплайном](guides/pipeline-usage.md) | Запуск видео-пайплайна для анализа конкурентов |

### Управление документацией

| Документ | Описание |
|----------|----------|
| [Матрица заполненности](DOCUMENTATION_MATRIX.md) | Статус покрытия документацией всех ��омпонентов |

---

## Ключевые ссылки

- **Бэклог:** [`PRODUCT_BACKLOG_v1.md`](../PRODUCT_BACKLOG_v1.md) — 23 эпика, 176 историй, 602 задачи
- **Потоки:** [`STREAMS.md`](../STREAMS.md) — 6 параллельных потоков реализации
- **Контракт лида:** `contracts/lead-schema.yaml`
- **Стратегический отчёт:** [`strategic_analysis_report.md`](../strategic_analysis_report.md) — рыночный анализ
- **GAP-анализ:** [`GAP_ANALYSIS_v1.md`](../GAP_ANALYSIS_v1.md) — функциональные пробелы
- **Бэкенд:** `cmd/`, `internal/`, `pkg/`, `services/` — 13 Go-микросервисов
- **Фронтенд:** `web/` — React 18 + TypeScript + Vite (Liquid Glass UI)
- **Мобайл:** `mobile/` — Expo React Native
- **Миграции:** `migrations/` — 6 миграций (PostgreSQL + ClickHouse)

---

## Как обновлять документацию

1. Внесите изменения в соответствующий `.md` файл в `docs/`
2. Запустите скрипт проверки заполненности:
   ```bash
   python3 docs/scripts/check_docs_completeness.py
   ```
3. Скрипт автоматически обновит `docs/DOCUMENTATION_MATRIX.md`
4. Закоммитьте изменения вместе с обновлённой матрицей
