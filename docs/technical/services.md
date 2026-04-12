# Микросервисы

GambChamp CRM состоит из 11 микросервисов, каждый с выделенной ответственностью.

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
| UAD | 8007 | Повторная дистрибуция |
| Notification | 8008 | Telegram, Email, Webhook |
| Identity | 8010 | JWT, аутентификация |
| Analytics | 8011 | ClickHouse агрегации |

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

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`

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

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `router.go`

---

## Broker Adapter (`services/broker-adapter-svc`, :8003)

Доставляет лиды на внешние endpoint-ы брокеров.

**Функции:**
- Template-based HTTP-доставка (шаблоны URL, body, headers)
- Кастомный field mapping (маппинг полей лида → формат брокера)
- Обработка ответов (success/fail/duplicate)
- Retry-логика с backoff
- Логирование request/response в `lead_events`

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `template.go`, `deliverer.go`

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

**Файлы:** `main.go`, `config.go`, `handler.go`

---

## Status Sync (`services/status-sync-svc`, :8005)

Нормализует статусы лидов от разных брокеров в единый формат.

**Функции:**
- Приём postback-ов от брокеров
- Маппинг брокер-специфичных статусов в стандартные (New → Contacted → FTD → Redeposit / Rejected)
- Обновление статуса лида в PostgreSQL
- Публикация события `status.updated`

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `normalizer.go`

---

## Autologin Service (`services/autologin-svc`, :8006)

Управляет автоматическим логином лидов на платформах брокеров.

**Функции:**
- Создание автологин-сессий
- Device fingerprint management
- Отслеживание стадий автологина
- Proxy-интеграция

**Файлы:** `main.go`, `config.go`, `handler.go`

---

## UAD Service (`services/uad-svc`, :8007)

Unsold Affiliate Distribution — повторная дистрибуция непроданных лидов.

**Функции:**
- Очередь непроданных лидов (`uad_queue`)
- Реинъекция лидов в routing engine
- Настраиваемые правила повторной маршрутизации
- TTL для устаревших лидов

**Файлы:** `main.go`, `config.go`, `handler.go`

---

## Notification Service (`services/notification-svc`, :8008)

Рассылка нотификаций по различным каналам.

**Каналы:**
- **Telegram** — основной канал для медиабайеров (17+ типов событий)
- **Email** — SMTP-интеграция
- **Webhook** — кастомные HTTP-коллбэки

**События:**
- Новый лид, изменение статуса, cap reached, fraud alert, FTD и др.

**Файлы:** `main.go`, `config.go`, `handler.go`

---

## Identity Service (`services/identity-svc`, :8010)

Аутентификация и управление JWT-токенами.

**Функции:**
- Генерация Access Token (TTL: 15 мин) и Refresh Token (TTL: 7 дней)
- Валидация токенов
- Аутентификация пользователей (email + bcrypt password)
- Управление refresh token rotation

**Файлы:** `main.go`, `config.go`, `handler.go`, `store.go`, `jwt.go`

---

## Analytics Service (`services/analytics-svc`, :8011)

Аналитика и отчётность на базе ClickHouse.

**Функции:**
- Агрегация событий лидов
- Конверсионные метрики (CR, FTD rate)
- Cap utilization отчёты
- Autologin performance метрики
- Time-series данные для дашбордов

**Файлы:** `main.go`, `config.go`, `handler.go`
