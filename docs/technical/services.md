# Микросервисы

GambChamp CRM состоит из 13 микросервисов, каждый с выделенной ответственностью.

## Обзор сервисов

| Сервис | Порт | Назначение |
|--------|------|------------|
| API Gateway | 8080 | Входная точка, JWT, rate limiting |
| Lead Intake | 8001 | Приём лидов, валидация, идемпотентность |
| Routing Engine | 8002 | Маршрутизация к брокерам |
| Broker Adapter | 8003 | Доставка лидов брокерам |
| Fraud Engine | 8004 | Антифрод-скоринг |
| Status Sync | 8005 | Нормализация статусов |
| Autologin | 8006 | Автологин-сессии |
| UAD | 8007 | Повторная дистрибуция (сценарии) |
| Notification | 8008 | Telegram, Email, Webhook |
| Identity | 8010 | JWT, RBAC, onboarding, сессии |
| Analytics | 8011 | ClickHouse агрегации |
| Assistant | 8012 | AI-ассистент (Claude API + tools) |
| Smart Routing | 8013 | ML-оптимизация весов маршрутизации |

---

## API Gateway (`services/api-gateway`, :8080)

Единая входная точка для всех HTTP-запросов. Выполняет:
- JWT-валидация через middleware
- Rate limiting на базе Redis
- Проксирование запросов к downstream-сервисам
- CORS-настройки

**Конфигурация маршрутов:**
- `LEAD_INTAKE_ADDR` → Lead Intake Service
- `ROUTING_ENGINE_ADDR` → Routing Engine
- И т.д. для каждого сервиса

**Файлы:** `main.go`, `config.go`, `handler.go`, `auth.go`

---

## Lead Intake Service (`services/lead-intake-svc`, :8001)

Принимает лиды от аффилейтов и подготавливает их к обработке.

**Функции:**
- Валидация входных данных (email, телефон, GEO)
- Нормализация телефона в формат E.164
- Проверка idempotency key (предотвращение дубликатов)
- Запись лида в PostgreSQL
- Публикация события `lead.created` в NATS
- Вызов Fraud Engine для скоринга

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `cmd_handler.go`

---

## Routing Engine (`services/routing-engine-svc`, :8002)

Выбирает оптимального брокера для каждого лида на основе правил дистрибуции.

**Алгоритмы:**
- Weight-based (взвешенное распределение)
- Waterfall / Priority groups (приоритетные группы)
- Round-robin

**Условия маршрутизации:**
- GEO-фильтр (страна лида)
- Daily / Total caps (ограничения по количеству)
- Timezone slots (временные окна работы брокера)
- Affiliate source restrictions
- Quality score thresholds

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `router.go`, `cmd_handler.go`

---

## Broker Adapter (`services/broker-adapter-svc`, :8003)

Доставляет лиды на внешние endpoint-ы брокеров.

**Функции:**
- Template-based HTTP-доставка (шаблоны URL, body, headers)
- Кастомный field mapping (маппинг полей лида → формат брокера)
- Обработка ответов (success/fail/duplicate)
- Retry-логика с backoff
- Логирование request/response в `lead_events`

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `template.go`, `deliverer.go`, `cmd_handler.go`

---

## Fraud Engine (`services/fraud-engine-svc`, :8004)

Скорит лиды по риску мошенничества.

**Интеграции:**
- **MaxMind** — GeoIP, proxy/VPN detection
- **IPQS (IPQualityScore)** — IP reputation, device fingerprint
- **Twilio** — Phone validation, carrier lookup

**Выход:**
- `quality_score` (0–100)
- `fraud_card` (JSON с деталями проверок)

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `cmd_handler.go`

---

## Status Sync (`services/status-sync-svc`, :8005)

Нормализует статусы лидов от разных брокеров в единый формат.

**Функции:**
- Приём postback-ов от брокеров
- Маппинг брокер-специфичных статусов в стандартные (New → Contacted → FTD → Redeposit / Rejected)
- Обновление статуса лида в PostgreSQL
- Публикация события `status.updated`
- Postback worker для фоновой обработки
- NATS subscriber для событий брокеров

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `normalizer.go`, `postback_worker.go`, `subscriber.go`

---

## Autologin Service (`services/autologin-svc`, :8006)

Управляет автоматическим логином лидов на платформах брокеров.

**Функции:**
- Создание автологин-сессий
- Device fingerprint management
- Отслеживание стадий автологина
- Proxy-интеграция

**Файлы:** `main.go`, `config.go`, `handler.go`, `cmd_handler.go`

---

## UAD Service (`services/uad-svc`, :8007)

Unsold Affiliate Distribution — повторная дистрибуция непроданных лидов.

**Функции:**
- Управление сценариями реинъекции (batch, continuous, scheduled)
- Движок реинъекции (`engine.go`) с фильтрацией по статусу, стране, возрасту лида
- Очередь с мониторингом (depth, processing, completed, failed)
- Настраиваемые target-брокеры с весами
- Overflow pool для лидов без подходящего брокера
- Throttle rate и batch size контроль

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `engine.go`, `cmd_handler.go`

---

## Notification Service (`services/notification-svc`, :8008)

Рассылка нотификаций по различным каналам.

**Каналы:**
- **Telegram** — Telegram Bot API (`telegram.go`), основной канал для медиабайеров
- **Email** — SendGrid API (`email.go`)
- **Webhook** — кастомные HTTP-коллбэки (`webhook.go`)

**Функции:**
- Event router (`router.go`) — маршрутизация событий по каналам
- Настройка предпочтений пользователя (каналы, типы событий, фильтры по affiliate/country)
- NATS consumer для асинхронных событий
- Store для персистентных нотификаций с mark read/unread

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `router.go`, `telegram.go`, `email.go`, `webhook.go`, `cmd_handler.go`

---

## Identity Service (`services/identity-svc`, :8010)

Аутентификация, RBAC и управление пользователями.

**Функции:**
- Генерация Access Token (TTL: 15 мин) и Refresh Token (TTL: 7 дней)
- Валидация токенов с refresh rotation
- RBAC — 6 ролей (super_admin, network_admin, affiliate_manager, team_lead, media_buyer, finance_manager)
- 32 разрешения (leads.read/write, affiliates.*, brokers.*, routing.*, analytics.*, users.*, и др.)
- Управление сессиями (multi-device, revoke)
- Приглашения пользователей (email invite + accept flow)
- Сброс пароля (token-based)
- Onboarding wizard (`onboarding.go`) — 6-шаговый мастер с шаблонами
- Permissions middleware (`permissions.go`)

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `jwt.go`, `onboarding.go`, `permissions.go`

---

## Analytics Service (`services/analytics-svc`, :8011)

Аналитика и отчётность на базе ClickHouse.

**Функции:**
- Агрегация событий лидов
- Конверсионные метрики (CR, FTD rate)
- Cap utilization отчёты
- Autologin performance метрики
- Time-series данные для дашбордов

**Файлы:** `main.go`, `config.go`, `handler.go`, `cmd_handler.go`
