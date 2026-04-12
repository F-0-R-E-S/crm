# Конфигурация

## Файл `.env`

Все сервисы настраиваются через переменные окружения. Шаблон: `.env.example`.

## Обязательные переменные

| Переменная | Описание | Пример |
|------------|----------|--------|
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | `strong-random-password` |
| `REDIS_PASSWORD` | Пароль Redis | `strong-random-password` |
| `CLICKHOUSE_PASSWORD` | Пароль ClickHouse | `strong-random-password` |
| `JWT_SECRET` | Секрет для JWT (min 32 символа) | `random-32-char-string` |

## Параметры базы данных

| Переменная | Default | Описание |
|------------|---------|----------|
| `POSTGRES_DB` | `gambchamp` | Имя базы данных |
| `POSTGRES_USER` | `gambchamp` | Пользователь БД |
| `POSTGRES_PORT` | `5432` | Порт PostgreSQL |

## Сетевые порты

| Переменная | Default | Сервис |
|------------|---------|--------|
| `API_PORT` | `8080` | API Gateway |
| `WEB_PORT` | `80` | Web UI (nginx) |
| `GRAFANA_PORT` | `3000` | Grafana |

## Внешние API (опционально)

| Переменная | Назначение | Требуется для |
|------------|------------|---------------|
| `MAXMIND_KEY` | MaxMind GeoIP / proxy detection | Fraud Engine |
| `IPQS_KEY` | IPQualityScore — IP reputation | Fraud Engine |
| `TELEGRAM_TOKEN` | Telegram Bot API | Notification Service |
| `TWILIO_SID` / `TWILIO_TOKEN` | Twilio phone validation | Fraud Engine |

## CORS

| Переменная | Default | Описание |
|------------|---------|----------|
| `CORS_ORIGINS` | `*` | Допустимые origins для CORS |

## Мониторинг

| Переменная | Default | Описание |
|------------|---------|----------|
| `GRAFANA_PASSWORD` | `admin` | Пароль администратора Grafana |

## Конфигурация сервисов (internal/config)

Каждый Go-сервис загружает конфигурацию через `envconfig`:

```go
type Config struct {
    DatabaseURL      string        // PostgreSQL connection string
    RedisURL         string        // Redis connection string
    NatsURL          string        // NATS connection string
    JWTSecret        string        // JWT signing key
    RefreshSecret    string        // Refresh token signing key
    Port             int           // HTTP port
    LogLevel         string        // "debug", "info", "warn", "error"
    Environment      string        // "development", "staging", "production"
    BcryptCost       int           // Password hashing cost
    AccessTokenTTL   time.Duration // Default: 15 minutes
    RefreshTokenTTL  time.Duration // Default: 7 days
}
```

## Межсервисная коммуникация

В Docker Compose сервисы обнаруживают друг друга по DNS-именам:

| Переменная | Значение (Docker) |
|------------|-------------------|
| `LEAD_INTAKE_ADDR` | `lead-intake-svc:8001` |
| `ROUTING_ENGINE_ADDR` | `routing-engine-svc:8002` |
| `BROKER_ADAPTER_ADDR` | `broker-adapter-svc:8003` |
| `FRAUD_ENGINE_ADDR` | `fraud-engine-svc:8004` |
| `STATUS_SYNC_ADDR` | `status-sync-svc:8005` |
| `AUTOLOGIN_ADDR` | `autologin-svc:8006` |
| `UAD_ADDR` | `uad-svc:8007` |
| `NOTIFICATION_ADDR` | `notification-svc:8008` |
| `IDENTITY_ADDR` | `identity-svc:8010` |
| `ANALYTICS_ADDR` | `analytics-svc:8011` |
