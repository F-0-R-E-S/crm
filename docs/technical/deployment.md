# Деплой

## Локальная разработка (Docker Compose)

### Быстрый старт

```bash
# 1. Скопировать конфигурацию
cp .env.example .env
# Отредактировать .env — заполнить секреты

# 2. Запустить всё
make dev
# Эквивалент: docker compose up -d && make nats-init

# 3. Проверить статус
docker compose ps
```

### Сервисы и порты

| Сервис | Порт | URL |
|--------|------|-----|
| API Gateway | 8080 | http://localhost:8080 |
| Web UI | 80 | http://localhost:80 |
| Assistant Service | 8012 | AI ассистент (Claude API) |
| Smart Routing | 8013 | ML-оптимизация |
| PostgreSQL | 5432 | postgres://gambchamp:***@localhost:5432/gambchamp |
| Redis | 6379 | redis://localhost:6379 |
| NATS | 4222 / 8222 | nats://localhost:4222 |
| ClickHouse | 8123 / 9000 | http://localhost:8123 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3000 | http://localhost:3000 (admin/admin) |
| Loki | 3100 | http://localhost:3100 |

### Volumes

```
postgres_data     — данные PostgreSQL
redis_data        — данные Redis
nats_data         — данные NATS JetStream
clickhouse_data   — данные ClickHouse
prometheus_data   — метрики Prometheus
grafana_data      — дашборды Grafana
loki_data         — логи Loki
```

## Продакшн деплой

### Docker Compose Production

Два файла для продакшна:
- `docker-compose.prod.yml` — базовая prod-конфигурация
- `docker-compose.deploy.yml` — полный деплой (13 сервисов + инфраструктура)

Отличия от development:
- Resource limits (CPU, memory)
- Restart policies (`unless-stopped`)
- Health checks (pg_isready, redis-cli ping)
- Оптимизированные настройки PostgreSQL и ClickHouse
- Redis max-memory 256MB с allkeys-lru
- JSON logging (max 10MB/file, 3 files rotation)
- Все 13 Go-сервисов (включая assistant и smart-routing)
- Single Dockerfile с SERVICE build arg

### Deploy script

```bash
cd deploy

# Запуск
./deploy.sh up

# Обновление образов
./deploy.sh pull
./deploy.sh up

# Логи
./deploy.sh logs

# Статус
./deploy.sh status

# Остановка
./deploy.sh down
```

Скрипт требует `.env` файл в директории `deploy/`.

### Миграции

```bash
# Запуск миграций через Docker
make migrate

# Или вручную через Atlas
atlas schema apply --env production
```

Конфигурация Atlas: `atlas.hcl`

## Мониторинг

### Prometheus

Конфигурация: `deploy/prometheus/prometheus.yml`

Скрейпит `/metrics` эндпоинт каждого сервиса с интервалом 15 секунд:
- api-gateway:8080
- lead-intake-svc:8001
- routing-engine-svc:8002
- broker-adapter-svc:8003
- fraud-engine-svc:8004
- status-sync-svc:8005
- autologin-svc:8006
- uad-svc:8007
- notification-svc:8008
- identity-svc:8010
- analytics-svc:8011
- assistant-svc:8012
- smart-routing-svc:8013

### Grafana

- URL: http://localhost:3000
- Логин: admin / admin (dev) или из `.env` (prod)
- Datasources: Prometheus, Loki
- Дашборды настраиваются вручную или через provisioning

### Loki

Агрегация логов всех сервисов. Доступ через Grafana → Explore → Loki.

## Переменные окружения

См. [Конфигурация](../guides/configuration.md) для полного списка.

## Docker Images

Registry: `ghcr.io/f-0-r-e-s/crm`

Образы:
```
ghcr.io/f-0-r-e-s/crm/api-gateway:<tag>
ghcr.io/f-0-r-e-s/crm/lead-intake-svc:<tag>
ghcr.io/f-0-r-e-s/crm/routing-engine-svc:<tag>
ghcr.io/f-0-r-e-s/crm/broker-adapter-svc:<tag>
ghcr.io/f-0-r-e-s/crm/fraud-engine-svc:<tag>
ghcr.io/f-0-r-e-s/crm/status-sync-svc:<tag>
ghcr.io/f-0-r-e-s/crm/autologin-svc:<tag>
ghcr.io/f-0-r-e-s/crm/uad-svc:<tag>
ghcr.io/f-0-r-e-s/crm/notification-svc:<tag>
ghcr.io/f-0-r-e-s/crm/identity-svc:<tag>
ghcr.io/f-0-r-e-s/crm/analytics-svc:<tag>
ghcr.io/f-0-r-e-s/crm/web:<tag>
```

Теги: `latest`, `<git-sha>`
