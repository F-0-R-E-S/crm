# CI/CD

## GitHub Actions

### CI Pipeline (`ci.yml`)

**Триггеры:** Push в `main`/`develop`, PR в `main`

| Job | Описание | Инструменты |
|-----|----------|-------------|
| **lint** | Статический анализ Go-кода | golangci-lint v1.56 |
| **test** | Юнит + интеграционные тесты | Go test, PostgreSQL 16, Redis 7 |
| **build** | Компиляция всех 11 сервисов | Matrix build |
| **security** | Сканирование уязвимостей | govulncheck |
| **frontend** | Сборка React-приложения | Node 20, npm ci, npm run build |
| **docker** | Сборка Docker-образов (только main) | Docker Buildx |

**Test job детали:**
- PostgreSQL 16 (service container) — `gambchamp_test` database
- Redis 7 (service container)
- `go test -race -coverprofile=coverage.out ./...`
- Coverage upload в Codecov

### Deploy Pipeline (`deploy.yml`)

**Триггер:** Push в `main`

**Registry:** `ghcr.io/f-0-r-e-s/crm`

| Job | Описание |
|-----|----------|
| **build-services** | Matrix build: 11 сервисов → Docker images |
| **build-frontend** | Web UI → Docker image |

**Теги образов:**
- `latest`
- Git SHA hash (`ghcr.io/f-0-r-e-s/crm/<service>:<sha>`)

**Оптимизации:**
- Docker Buildx с GitHub Actions cache
- Multi-stage builds (builder → minimal runtime)

### Pages Deploy (`deploy-pages.yml`)

Деплой фронтенда на GitHub Pages (если настроено).

## Локальная разработка

```bash
# Линтинг
make lint

# Тесты с race detector
make test

# Тесты с coverage HTML отчётом
make test-coverage

# Сборка всех сервисов
make build

# Сборка конкретного сервиса
make build-api-gateway
make build-lead-intake-svc
```

## Docker

```bash
# Сборка всех образов
make docker-build

# Запуск всех сервисов
make docker-up

# Логи
make docker-logs

# Остановка
make docker-down
```

## Golangci-lint конфигурация

Файл: `.golangci.yml`

Включённые линтеры покрывают:
- Стандартные проверки Go (vet, errcheck, staticcheck)
- Стиль кода
- Потенциальные баги
- Производительность
