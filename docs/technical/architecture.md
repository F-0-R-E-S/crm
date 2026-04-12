# Архитектура системы

## Обзор

GambChamp CRM — мультитенантная платформа дистрибуции лидов, построенная на микросервисной архитектуре. Система принимает лиды от аффилейтов через REST API, маршрутизирует их к брокерам по настраиваемым правилам и отслеживает полный жизненный цикл лида.

## Технологический стек

| Слой | Технология | Назначение |
|------|------------|------------|
| API Gateway | Go + Chi router | Маршрутизация запросов, JWT-валидация, rate limiting |
| Микросервисы | Go 1.25 | 13 специализированных сервисов |
| AI Assistant | Go + Claude API (Sonnet) | Интерактивный AI-ассистент с tool calling |
| Smart Routing | Go + ML optimizer | ML-оптимизация весов маршрутизации |
| База данных | PostgreSQL 16 | Основное хранилище с RLS |
| Кэш | Redis 7 | Кэширование, rate limiting, сессии |
| Событийная шина | NATS JetStream 2.10 | Асинхронная коммуникация между сервисами |
| Аналитика | ClickHouse 24.1 | OLAP-запросы, агрегации |
| Фронтенд | React 18 + TypeScript + Vite | SPA с Tailwind CSS (Liquid Glass UI) |
| Мобильное приложение | Expo (React Native) | iOS/Android мониторинг |
| Мониторинг | Prometheus + Grafana + Loki | Метрики, дашборды, логи |

## Схема взаимодействия

```
  ┌─────────────┐  ┌─────────────┐
  │  Web UI     │  │ Mobile App  │
  │  (React)    │  │  (Expo RN)  │
  └──────┬──────┘  └──────┬──────┘
         │                │
         └────────┬───────┘
                  │ HTTP
           ┌──────▼──────┐
 Affiliates►│ API Gateway │◄────── Broker Postbacks
  (REST API)│   :8080     │
           └──────┬──────┘
                  │
    ┌─────────────┼─────────────────┐
    │             │                  │
 ┌──▼──────┐ ┌───▼───────┐ ┌───────▼──────┐
 │  Lead   │ │ Identity  │ │   Status     │
 │ Intake  │ │  :8010    │ │   Sync :8005 │
 │ :8001   │ │ +RBAC     │ └──────────────┘
 └──┬──────┘ │ +Onboard  │
    │        └───────────┘
    │ NATS
 ┌──▼──────┐
 │  Fraud  │
 │ Engine  │
 │ :8004   │
 └──┬──────┘
    │
 ┌──▼──────┐     ┌───────────────┐
 │ Routing │────►│Smart Routing  │
 │ Engine  │     │  AI :8013     │
 │ :8002   │◄────│ (ML optimizer)│
 └──┬──────┘     └───────────────┘
    │
 ┌──▼──────┐     ┌──────────────┐
 │ Broker  │────►│  Внешние     │
 │ Adapter │     │  брокеры     │
 │ :8003   │◄────│              │
 └──┬──────┘     └──────────────┘
    │
  ┌─┴─────┐
  │       │
┌─▼───┐ ┌▼────────┐
│ UAD │ │Autologin│
│:8007│ │  :8006  │
└─────┘ └─────────┘

Параллельные потоки:
  ├── Notification Svc :8008 (Telegram, Email, Webhook)
  ├── Analytics Svc :8011 (ClickHouse агрегации)
  └── Assistant Svc :8012 (Claude AI + Tool Calling)
```

## Поток обработки лида

1. **Приём** — Lead Intake Service принимает лид через REST API, проверяет идемпотентность, нормализует телефон (E.164)
2. **Антифрод** — Fraud Engine скорит лид (MaxMind, IPQS, Twilio), присваивает quality_score и fraud_card
3. **Маршрутизация** — Routing Engine оценивает distribution_rules (GEO, caps, вес, расписание), выбирает брокера
4. **Доставка** — Broker Adapter отправляет лид через шаблон интеграции, логирует ответ
5. **Статус** — Status Sync нормализует ответы брокеров в единый формат статусов
6. **Повторная дистрибуция** — UAD Service перераспределяет непроданные лиды
7. **Автологин** — Autologin Service управляет сессиями автологина для конвертированных лидов
8. **Нотификации** — Notification Service рассылает алерты через Telegram/Email/Webhook
9. **Аналитика** — Analytics Service агрегирует события в ClickHouse
10. **Smart Routing** — ML-оптимизатор анализирует 7-дневные метрики брокеров и рекомендует оптимальные веса
11. **AI-ассистент** — Assistant Service обрабатывает запросы через Claude API с 40+ tool definitions для управления системой

## Мультитенантность

- Каждая таблица содержит `tenant_id` (UUID)
- Row Level Security (RLS) на уровне PostgreSQL через `app.tenant_id` в контексте сессии
- JWT-токены содержат tenant_id, обеспечивая изоляцию на уровне API Gateway

## Коммуникация между сервисами

- **Синхронная:** HTTP REST между API Gateway и сервисами
- **Асинхронная:** NATS JetStream для событий (lead.created, lead.scored, lead.routed, lead.delivered, status.updated)
- **Command Handlers:** Каждый сервис имеет `cmd_handler.go` — NATS request/reply для AI-ассистента (40+ команд)
- **SSE/WebSocket:** Assistant Service стримит ответы через SSE, WebSocket для real-time событий
- **Идемпотентность:** Idempotency key на уровне Lead Intake предотвращает дублирование

## Структура кода

```
cmd/                    Точки входа (main.go)
  api/                  HTTP API сервер
  worker/               Фоновый воркер

internal/               Приватные пакеты
  config/               Загрузка конфигурации
  admin/                Админ-операции (affiliates, companies, users)
  auth/                 Аутентификация
  middleware/            HTTP middleware (auth, apikey, traceid)
  intake/               Обработка входящих лидов
  fraud/                Антифрод-обработка
  router/               Логика маршрутизации
  db/                   Слой данных
    migrations/         SQL-миграции
    queries/            SQLC-запросы
    sqlc/               Сгенерированный код

pkg/                    Общие библиотеки
  cache/                Redis-клиент
  database/             PostgreSQL пул
  e164/                 Парсинг и валидация телефонов (E.164)
  email/                Валидация email (MX, disposable, нормализация)
  errors/               Обработка ошибок
  events/               Определения событий + publisher
  geoip/                GeoIP (MaxMind API + fallback)
  idempotency/          Ключи идемпотентности
  messaging/            NATS JetStream клиент
  middleware/            Shared auth + rate limiting
  models/               Доменные модели
  rbac/                 RBAC (6 ролей, 32 разрешения)
  telemetry/            Prometheus метрики + логирование

services/               13 микросервисов (каждый: main.go, config.go, handler.go)

mobile/                 Expo React Native мобильное приложение
contracts/              API-контракты (OpenAPI/YAML)
```
