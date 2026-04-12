# Архитектура системы

## Обзор

GambChamp CRM — мультитенантная платформа дистрибуции лидов, построенная на микросервисной архитектуре. Система принимает лиды от аффилейтов через REST API, маршрутизирует их к брокерам по настраиваемым правилам и отслеживает полный жизненный цикл лида.

## Технологический стек

| Слой | Технология | Назначение |
|------|------------|------------|
| API Gateway | Go + Chi router | Маршрутизация запросов, JWT-валидация, rate limiting |
| Микросервисы | Go 1.25 | 11 специализированных сервисов |
| База данных | PostgreSQL 16 | Основное хранилище с RLS |
| Кэш | Redis 7 | Кэширование, rate limiting, сессии |
| Событийная шина | NATS JetStream 2.10 | Асинхронная коммуникация между сервисами |
| Аналитика | ClickHouse 24.1 | OLAP-запросы, агрегации |
| Фронтенд | React 18 + TypeScript + Vite | SPA с Tailwind CSS |
| Мониторинг | Prometheus + Grafana + Loki | Метрики, дашборды, логи |

## Схема взаимодействия

```
                    ┌─────────────┐
                    │  Web UI     │
                    │  (React)    │
                    └──────┬──────┘
                           │ HTTP
                    ┌──────▼──────┐
  Affiliates ──────►│ API Gateway │◄────── Broker Postbacks
    (REST API)      │   :8080     │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                  │
  ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼──────┐
  │ Lead Intake │  │  Identity   │  │   Status     │
  │   :8001     │  │   :8010     │  │   Sync :8005 │
  └──────┬──────┘  └─────────────┘  └──────────────┘
         │
         │ NATS
  ┌──────▼──────┐
  │Fraud Engine │
  │   :8004     │
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  Routing    │
  │  Engine     │
  │   :8002     │
  └──────┬──────┘
         │
  ┌──────▼──────┐     ┌──────────────┐
  │   Broker    │────►│  Внешние     │
  │  Adapter    │     │  брокеры     │
  │   :8003     │◄────│              │
  └──────┬──────┘     └──────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│  UAD  │ │Autologin│
│ :8007 │ │  :8006  │
└───────┘ └─────────┘

Параллельные потоки:
  ├── Notification Svc :8008 (Telegram, Email, Webhook)
  └── Analytics Svc :8011 (ClickHouse агрегации)
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

## Мультитенантность

- Каждая таблица содержит `tenant_id` (UUID)
- Row Level Security (RLS) на уровне PostgreSQL через `app.tenant_id` в контексте сессии
- JWT-токены содержат tenant_id, обеспечивая изоляцию на уровне API Gateway

## Коммуникация между сервисами

- **Синхронная:** HTTP REST между API Gateway и сервисами
- **Асинхронная:** NATS JetStream для событий (lead.created, lead.scored, lead.routed, lead.delivered, status.updated)
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
  e164/                 Парсинг номеров
  errors/               Обработка ошибок
  events/               Определения событий + publisher
  idempotency/          Ключи идемпотентности
  messaging/            NATS JetStream клиент
  middleware/            Shared auth + rate limiting
  models/               Доменные модели
  phone/                Утилиты для телефонов
  telemetry/            Prometheus метрики + логирование

services/               11 микросервисов (каждый: main.go, config.go, handler.go)
```
