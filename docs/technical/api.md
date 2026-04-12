# API Reference

## Общие принципы

- **Base URL:** `http://localhost:8080/api/v1` (development)
- **Аутентификация:** JWT Bearer Token или API Key
- **Content-Type:** `application/json`
- **Мультитенантность:** tenant_id извлекается из JWT, нет необходимости передавать его явно

## Аутентификация

### JWT (для Web UI)

```
Authorization: Bearer <access_token>
```

- Access Token TTL: 15 минут
- Refresh Token TTL: 7 дней

### API Key (для аффилейтов)

```
X-API-Key: <api_key>
```

API-ключи привязаны к аффилейту и тенанту, имеют:
- `scopes` — разрешённые операции
- `rate_limit` — лимит запросов
- `allowed_ips` — IP whitelist

---

## Identity Service

### POST /api/v1/auth/login
Аутентификация пользователя.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900
}
```

### POST /api/v1/auth/refresh
Обновление access token.

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

---

## Lead Intake

### POST /api/v1/leads
Приём нового лида от аффилейта.

**Headers:**
```
X-API-Key: <affiliate_api_key>
X-Idempotency-Key: <unique_key>   (опционально)
```

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+380501234567",
  "country": "UA",
  "ip": "185.1.2.3",
  "user_agent": "Mozilla/5.0...",
  "extra": {
    "aff_sub1": "campaign_123",
    "aff_sub2": "landing_a",
    "funnel": "crypto_signals"
  }
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "status": "new",
  "quality_score": null,
  "created_at": "2026-04-12T10:00:00Z"
}
```

**Коды ошибок:**
- `400` — невалидные данные
- `409` — дублирующий idempotency key
- `429` — rate limit exceeded

---

## Leads Management

### GET /api/v1/leads
Список лидов с фильтрацией.

**Query параметры:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `skip` | int | Смещение (default: 0) |
| `take` | int | Количество (default: 20, max: 100) |
| `status` | string | Фильтр по статусу |
| `country` | string | Фильтр по стране |
| `affiliate_id` | uuid | Фильтр по аффилейту |
| `date_from` | datetime | Начало периода |
| `date_to` | datetime | Конец периода |
| `sort` | string | Поле сортировки |
| `order` | string | `asc` / `desc` |

### GET /api/v1/leads/:id
Детали лида с историей событий.

---

## Affiliates

### GET /api/v1/affiliates
Список аффилейтов тенанта.

### POST /api/v1/affiliates
Создание нового аффилейта.

**Request:**
```json
{
  "name": "Affiliate Name",
  "postback_url": "https://...",
  "daily_cap": 100,
  "fraud_profile": "standard"
}
```

### POST /api/v1/affiliates/:id/api-keys
Генерация нового API-ключа для аффилейта.

---

## Brokers

### GET /api/v1/brokers
Список брокеров тенанта с health status.

### POST /api/v1/brokers
Создание инстанса брокера из шаблона.

**Request:**
```json
{
  "template_id": "uuid",
  "name": "Broker Display Name",
  "endpoint": "https://broker-api.com/leads",
  "credentials": { "api_key": "..." },
  "field_mapping": {
    "firstName": "name",
    "phoneNumber": "phone_e164"
  }
}
```

### GET /api/v1/broker-templates
Список доступных шаблонов интеграций.

---

## Distribution Rules

### GET /api/v1/rules
Список правил маршрутизации.

### POST /api/v1/rules
Создание правила.

**Request:**
```json
{
  "name": "UA Gold Brokers",
  "conditions": {
    "countries": ["UA", "PL"],
    "min_quality_score": 60
  },
  "broker_targets": [
    { "broker_id": "uuid", "weight": 70 },
    { "broker_id": "uuid", "weight": 30 }
  ],
  "algorithm": "weight",
  "caps": {
    "daily": 500,
    "total": 5000
  },
  "timezone_slots": {
    "timezone": "Europe/Kiev",
    "slots": [
      { "start": "09:00", "end": "18:00", "days": [1,2,3,4,5] }
    ]
  },
  "priority": 1,
  "active": true
}
```

---

## Analytics

### GET /api/v1/analytics/leads
Агрегированная статистика лидов.

**Query параметры:**
- `period` — `day`, `week`, `month`
- `group_by` — `country`, `affiliate`, `broker`, `status`
- `date_from`, `date_to`

### GET /api/v1/analytics/conversions
Конверсионные метрики (CR, FTD rate).

### GET /api/v1/analytics/caps
Утилизация капов в реальном времени.

---

## Статусы лидов

| Статус | Описание |
|--------|----------|
| `new` | Лид принят, ожидает обработки |
| `scoring` | Проходит антифрод-проверку |
| `routing` | Маршрутизируется к брокеру |
| `sent` | Отправлен брокеру |
| `accepted` | Принят брокером |
| `rejected` | Отклонён брокером |
| `duplicate` | Дубликат у брокера |
| `contacted` | Брокер связался с лидом |
| `ftd` | First Time Deposit |
| `redeposit` | Повторный депозит |
| `unsold` | Не удалось продать, в очереди UAD |

---

## Rate Limiting

- Реализован через Redis (sliding window)
- Конфигурируется per API key
- Заголовки ответа:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1712937600
  ```

## Пагинация

Стиль: offset-based (`skip` / `take`)
```
GET /api/v1/leads?skip=0&take=20
```

Response включает:
```json
{
  "data": [...],
  "total": 1542,
  "skip": 0,
  "take": 20
}
```
