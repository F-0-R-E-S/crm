# Система событий (NATS JetStream)

## Обзор

Межсервисная асинхронная коммуникация реализована на NATS JetStream 2.10. Каждый сервис публикует и подписывается на определённые потоки событий.

## Инфраструктура

- **URL:** `nats://nats:4222` (внутри Docker network)
- **Monitoring:** `http://nats:8222` (HTTP monitoring API)
- **Storage:** File-based (persistent, volume `nats_data`)

## Потоки (Streams)

Инициализация потоков выполняется через `make nats-init`.

| Stream | Subjects | Retention | Описание |
|--------|----------|-----------|----------|
| LEADS | `lead.*` | WorkQueue | Жизненный цикл лидов |
| STATUS | `status.*` | WorkQueue | Обновления статусов |
| NOTIFICATIONS | `notify.*` | WorkQueue | Нотификации |
| ANALYTICS | `analytics.*` | Interest | Аналитические события |

## События

### Lead Lifecycle

| Subject | Publisher | Consumer(s) | Описание |
|---------|-----------|-------------|----------|
| `lead.created` | Lead Intake | Fraud Engine | Новый лид принят |
| `lead.scored` | Fraud Engine | Routing Engine | Лид оценён антифрод-системой |
| `lead.routed` | Routing Engine | Broker Adapter | Брокер выбран |
| `lead.delivered` | Broker Adapter | Status Sync, Analytics | Лид отправлен брокеру |
| `lead.failed` | Broker Adapter | UAD, Notification | Доставка не удалась |
| `lead.unsold` | UAD | Routing Engine | Реинъекция непроданного лида |

### Status Updates

| Subject | Publisher | Consumer(s) | Описание |
|---------|-----------|-------------|----------|
| `status.updated` | Status Sync | Notification, Analytics | Статус лида изменился |
| `status.ftd` | Status Sync | Notification, Analytics | First Time Deposit |
| `status.redeposit` | Status Sync | Analytics | Повторный депозит |

### Notifications

| Subject | Publisher | Consumer(s) | Описание |
|---------|-----------|-------------|----------|
| `notify.telegram` | Notification | — (terminal) | Отправка в Telegram |
| `notify.email` | Notification | — (terminal) | Отправка Email |
| `notify.webhook` | Notification | — (terminal) | HTTP Webhook |

### Analytics

| Subject | Publisher | Consumer(s) | Описание |
|---------|-----------|-------------|----------|
| `analytics.lead_event` | Multiple | Analytics Svc | Событие для ClickHouse |
| `analytics.cap_snapshot` | Routing Engine | Analytics Svc | Снапшот утилизации капов |

## Формат сообщений

Все сообщения — JSON. Базовая структура:

```json
{
  "event_id": "uuid",
  "event_type": "lead.created",
  "tenant_id": "uuid",
  "timestamp": "2026-04-12T10:00:00Z",
  "payload": { ... }
}
```

### Пример: lead.created

```json
{
  "event_id": "a1b2c3...",
  "event_type": "lead.created",
  "tenant_id": "tenant-uuid",
  "timestamp": "2026-04-12T10:00:00Z",
  "payload": {
    "lead_id": "lead-uuid",
    "affiliate_id": "aff-uuid",
    "email": "john@example.com",
    "country": "UA",
    "ip": "185.1.2.3"
  }
}
```

## Паттерны

- **At-least-once delivery** — потребители должны быть идемпотентными
- **Consumer groups** — каждый сервис использует durable consumer для гарантии доставки при рестартах
- **Acknowledgement** — явный ACK после успешной обработки, NACK при ошибках с retry
- **Dead letter** — после N неуспешных попыток сообщение переносится в DLQ для ручного разбора

## Мониторинг

NATS предоставляет HTTP API для мониторинга:
- `GET /connz` — активные подключения
- `GET /routez` — маршруты кластера
- `GET /subsz` — подписки
- `GET /jsz` — JetStream статистика
