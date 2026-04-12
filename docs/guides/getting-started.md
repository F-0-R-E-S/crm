# Быстрый старт

## Требования

- **Go** 1.25+
- **Node.js** 20+
- **Docker** и **Docker Compose**
- **Make**

Для видео-пайплайна (опционально):
- Python 3.10+, Pillow, imagehash
- ffmpeg
- whisper-cpp (`whisper-cli`)
- Claude Code CLI (`claude`)

## Установка

### 1. Клонирование репозитория

```bash
git clone <repo-url>
cd agile-penguin
```

### 2. Конфигурация окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`, заполнив как минимум:
```
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
JWT_SECRET=<min-32-chars-random>
```

Полный список переменных: [Конфигурация](configuration.md)

### 3. Запуск инфраструктуры

```bash
# Запуск всех сервисов + инициализация NATS streams
make dev
```

Это поднимет:
- PostgreSQL 16 (`:5432`)
- Redis 7 (`:6379`)
- NATS JetStream (`:4222`)
- ClickHouse (`:8123`)
- Prometheus (`:9090`)
- Grafana (`:3000`)
- Loki (`:3100`)
- 11 Go-микросервисов
- Web UI (`:80`)

### 4. Проверка

```bash
# Статус контейнеров
docker compose ps

# Логи
make docker-logs

# Проверка API
curl http://localhost:8080/health
```

### 5. Доступ к UI

| Интерфейс | URL |
|-----------|-----|
| Web UI | http://localhost:80 |
| API Gateway | http://localhost:8080 |
| Grafana | http://localhost:3000 (admin/admin) |
| Prometheus | http://localhost:9090 |

## Разработка бэкенда

```bash
# Сборка всех сервисов
make build

# Сборка одного сервиса
make build-lead-intake-svc

# Тесты
make test

# Тесты с coverage
make test-coverage

# Линтинг
make lint
```

Hot-reload через [Air](https://github.com/air-verse/air) (конфигурация: `.air.toml`):
```bash
air
```

## Разработка фронтенда

```bash
cd web

# Установка зависимостей
npm ci

# Dev-сервер с HMR
npm run dev

# Сборка
npm run build

# Линтинг
npm run lint
```

## Миграции базы данных

```bash
# Запуск миграций
make migrate
```

Файлы миграций: `migrations/`

## Полезные команды

```bash
make help           # Все доступные команды
make dev            # Полный dev-стек
make docker-logs    # Логи всех сервисов
make docker-down    # Остановка
make clean          # Очистка артефактов сборки
```
