# Дорожная карта

## Приоритеты

Бэклог организован в 4 приоритетных волны, 23 эпика, ~127 историй.

### P0 — MVP (Q1 2026)

Минимальный жизнеспособный продукт. Всё необходимое для приёма и маршрутизации лидов.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-01 | Lead Intake API | REST API для приёма лидов, валидация, E.164, idempotency |
| EPIC-02 | Lead Routing Engine | Правила маршрутизации, капы, GEO-фильтры, алгоритмы |
| EPIC-03 | Broker Integration | Шаблоны интеграций, field mapping, доставка лидов |
| EPIC-04 | Affiliate Management | Аккаунты аффилейтов, API-ключи, postback-и |
| EPIC-05 | Lead Management UI | Веб-интерфейс для управления лидами |
| EPIC-06 | RBAC & Auth | Роли, права, JWT, мультитенантность |
| EPIC-07 | Anti-Fraud Basic | Базовый антифрод: IP check, velocity, quality scoring |

### P1 — Launch (Q2 2026)

Запуск с полным набором функций для первых клиентов.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-08 | Autologin | Автологин-пайплайн, proxy, device fingerprint |
| EPIC-09 | UAD (Reinjection) | Повторная дистрибуция непроданных лидов |
| EPIC-10 | Analytics & Reporting | ClickHouse аналитика, дашборды, конверсии |
| EPIC-11 | Notifications | Telegram (17+ событий), Email, Webhook |
| EPIC-12 | P&L Tracking | Profit & Loss по аффилейтам, брокерам, GEO |
| EPIC-13 | Onboarding Wizard | Setup wizard, шаблоны, быстрый старт |

### P2 — Growth (Q3 2026)

Рост и расширение. Продвинутые функции для масштабирования.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-14 | BI & Advanced Analytics | BI-layer, time-series, cohort-анализ |
| EPIC-15 | Mobile Monitoring | Мобильный интерфейс для мониторинга |
| EPIC-16 | Marketplace | Маркетплейс брокерских интеграций |
| EPIC-17 | AI-Driven Routing | ML-оптимизация маршрутизации |
| EPIC-18 | Shave Detection | Обнаружение кражи лидов брокерами |
| EPIC-19 | Public API & SDK | Публичная документация API, SDK |

### P3 — Scale (Q4 2026)

Масштабирование и enterprise-функции.

| Epic | Название | Описание |
|------|----------|----------|
| EPIC-20 | White-Label | Кастомизация под брендинг клиента |
| EPIC-21 | Billing & Subscriptions | Встроенный биллинг, планы, инвойсы |
| EPIC-22 | Compliance & Audit | GDPR, KYC, полный аудит-трейл |
| EPIC-23 | AI Fraud v2 | Продвинутый AI-антифрод, ML-модели |

## Метрики бэклога

| Метрика | Значение |
|---------|----------|
| Эпиков | 23 |
| Историй | ~127 |
| Оценка трудозатрат | ~3,458 часов |
| Спринтов (2-недельные) | 24 |
| Период | Март 2026 — Февраль 2027 |

## Связанные документы

- **Полный бэклог:** `PRODUCT_BACKLOG_v1.md` (корневой уровень) или `product_backlog/PRODUCT_BACKLOG_v1.md`
- **План спринтов:** `product_backlog/RELEASE_PLAN_SPRINTS_v1.md`
- **Детальные эпики:**
  - `product_backlog/epic-01-lead-intake-api.md`
  - `product_backlog/epic-02-lead-routing-engine.md`
  - `product_backlog/epics-03-07-p0.md`
  - `product_backlog/epics-08-13-p1.md`
  - `product_backlog/epics-14-19-p2.md`
  - `product_backlog/epics-20-23-p3.md`
- **Jira импорт:** `product_backlog/generate_jira_csv.py`
- **Промпт генерации:** `Transcript_videos/prompt_stage4_product_backlog.md`

## Текущий статус реализации

Бэкенд (Go микросервисы) и фронтенд (React) уже содержат каркас для P0-функциональности:
- 11 микросервисов определены и имеют базовую структуру
- Схема БД развёрнута (PostgreSQL + ClickHouse)
- Web UI имеет страницы для всех P0/P1 модулей
- CI/CD настроен (GitHub Actions)
- Docker Compose для development и production
