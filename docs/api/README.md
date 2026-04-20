# CRM Public API

Two integration surfaces:

| Endpoint | Who calls it | Direction | Auth |
|---|---|---|---|
| `POST /api/v1/leads` | Affiliate | inbound | Bearer API key |
| `POST /api/v1/postbacks/:brokerId` | Broker | inbound | HMAC-SHA256 signature |
| `POST {affiliate.postbackUrl}` | CRM → Affiliate | outbound | HMAC-SHA256 (если настроен `postbackSecret`) |
| `POST {broker.endpointUrl}` | CRM → Broker | outbound | Per-broker: None / Bearer / Basic / API-key |
| `GET /api/v1/health` | anyone | inbound | none |

Base URL: `{BASE_URL}` (подставь прод/staging хост).
Везде `Content-Type: application/json` если не указано иное. Все ответы содержат `trace_id` для корреляции в логах и Timeline лида.

---

## 1. Affiliate → CRM: отправка лида

`POST {BASE_URL}/api/v1/leads`

### Аутентификация

```
Authorization: Bearer <api_key>
```

Ключ выдаётся админом CRM в интерфейсе `/dashboard/affiliates/:id`. Хранится в БД как SHA-256 хэш — восстановить утерянный ключ нельзя, только выпустить новый. Revoked-ключи возвращают 401.

### Заголовки

| Заголовок | Обяз. | Назначение |
|---|---|---|
| `Authorization: Bearer <api_key>` | да | аутентификация |
| `Content-Type: application/json` | да | формат тела |
| `X-Idempotency-Key: <string>` | нет | идемпотентность на 24 часа; при повторе вернётся кешированный ответ |

### Rate limit

Token bucket per API key: **capacity=30, refill=2/sec** (≈ 30 лидов разом, далее 2 в секунду). При превышении — `429 rate_limited` + заголовок `Retry-After`.

### Тело запроса

```json
{
  "external_lead_id": "aff-ext-123",
  "first_name": "Ivan",
  "last_name": "Petrov",
  "email": "ivan@example.com",
  "phone": "+380671234567",
  "geo": "UA",
  "ip": "203.0.113.5",
  "landing_url": "https://landing.example.com/ua-fx1",
  "sub_id": "src_abc",
  "utm": { "utm_source": "fb", "utm_campaign": "ua-fx1-oct" },
  "event_ts": "2026-04-20T11:22:33.000Z"
}
```

Схема (см. `src/server/zod/intake.ts`):

| Поле | Тип | Обяз. | Правила |
|---|---|---|---|
| `geo` | string | **да** | ровно 2 символа, ISO-3166-1 alpha-2 (верхний регистр не обязателен — нормализуется) |
| `ip` | string | **да** | непустая строка |
| `event_ts` | string | **да** | ISO-8601 datetime с таймзоной |
| `email` | string\|null | одно из | валидный email |
| `phone` | string\|null | одно из | любой формат — нормализуется в E.164 по `geo` |
| `external_lead_id` | string | нет | ≤ 64 симв. |
| `first_name` / `last_name` | string | нет | ≤ 80 симв. |
| `landing_url` | string | нет | валидный URL |
| `sub_id` | string | нет | ≤ 128 симв. |
| `utm` | object | нет | свободные KV-пары |

Требование: **email ИЛИ phone должны быть заданы** (иначе 422).

### Антифрод (внутри обработки)

После валидации CRM прогоняет лид через проверки — результат возвращается в ответе как `reject_reason`:

1. Blacklist (IP / email / phone)
2. Дедуп по `phoneHash` / `emailHash` в пределах `ANTIFRAUD_DEDUP_WINDOW_DAYS` (default 7) для того же аффилиата
3. `affiliate_cap_full` — превышен `totalDailyCap` аффилиата

Ответ всё равно 202, но `status: "rejected"` и лид не пойдёт в пул брокеров.

### Ответы

**202 Accepted** (всегда при успешной валидации):

```json
{
  "lead_id": "cmo68...xyz",
  "status": "received",
  "reject_reason": null,
  "trace_id": "7osnFHOGSSCx7VHI8upPg",
  "received_at": "2026-04-20T11:22:34.123Z"
}
```

Если антифрод отклонил:

```json
{
  "lead_id": "cmo68...xyz",
  "status": "rejected",
  "reject_reason": "duplicate",
  "trace_id": "...",
  "received_at": "..."
}
```

Возможные `reject_reason`: `blacklist_ip` / `blacklist_email` / `blacklist_phone` / `duplicate` / `affiliate_cap_full`.

**Ошибки:**

| HTTP | `error.code` | Когда |
|---|---|---|
| 400 | `malformed_json` | тело не JSON |
| 401 | `unauthorized` | нет/невалидный/отозванный ключ |
| 422 | `validation_error` | Zod-ошибка (поле в `error.field`) |
| 422 | `invalid_phone` | не удалось нормализовать телефон под geo |
| 429 | `rate_limited` | лимит; смотри `Retry-After` |

Формат ошибки:

```json
{ "error": { "code": "validation_error", "message": "...", "field": "email", "trace_id": "..." } }
```

### Пример: curl

```bash
curl -X POST "$BASE_URL/api/v1/leads" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "geo": "UA",
    "ip": "203.0.113.5",
    "email": "ivan@example.com",
    "phone": "+380671234567",
    "event_ts": "2026-04-20T11:22:33Z",
    "sub_id": "src_abc",
    "utm": { "utm_source": "fb" }
  }'
```

### Идемпотентность

Тот же `X-Idempotency-Key` в пределах 24 часов вернёт закешированный ответ (тело + HTTP-код) без повторной обработки. Ключ уникален per-affiliate — разные аффилиаты могут использовать одни и те же ключи.

---

## 2. Broker → CRM: статус-постбэк

`POST {BASE_URL}/api/v1/postbacks/:brokerId`

Брокер уведомляет CRM о смене статуса лида (принят в работу, FTD, отклонён и т.п.).

### Аутентификация

HMAC-SHA256 подпись сырого тела:

```
signature = sha256_hex(hmac_key = broker.postbackSecret, message = raw_body)

X-Signature: <hex>
```

Проверка — constant-time; неверная подпись → 401. `postbackSecret` настраивается админом в `/dashboard/brokers/:id`.

### Тело

Формат произвольный — CRM извлекает два поля через **JSONPath**, настраиваемые per-broker:

- `broker.postbackLeadIdPath` → внешний ID лида (брокерский). Должен совпасть с сохранённым `lead.brokerExternalId` (который CRM получил при push).
- `broker.postbackStatusPath` → сырой статус-код от брокера.

Сырой статус мапится в `LeadState` через `broker.statusMapping` (JSON объект `{ "broker_status": "LeadState" }`). Нераспознанные значения → `DECLINED`.

Пример конфигурации брокера:
```
postbackLeadIdPath = "$.id"
postbackStatusPath = "$.event"
statusMapping      = { "approved": "ACCEPTED", "ftd": "FTD", "rejected": "DECLINED" }
```

Пример тела:

```json
{
  "id": "brk-99821",
  "event": "ftd",
  "ftd_amount": 250,
  "occurred_at": "2026-04-20T12:00:00Z"
}
```

### Ответы

**200 OK:**
```json
{ "ok": true, "trace_id": "..." }
```

Побочные эффекты: `lead.state` → `ACCEPTED` / `DECLINED` / `FTD` (с `ftdAt` / `acceptedAt`); пишутся события `POSTBACK_RECEIVED` + `STATE_TRANSITION`; триггерится исходящий постбэк аффилиату, если настроен.

**Ошибки:**

| HTTP | `error.code` | Когда |
|---|---|---|
| 401 | `invalid_signature` | HMAC не сошёлся |
| 404 | `broker_not_found` | нет брокера с таким `brokerId` |
| 404 | `lead_not_found` | `brokerExternalId` не найден среди лидов, отданных в этого брокера |
| 400 | `lead_id_missing` | JSONPath не извлёк ID (подпись валидна, но тело не соответствует схеме) |

Все попытки (даже failed) сохраняются в `PostbackReceipt` для аудита.

### Пример: curl с вычислением HMAC

```bash
BODY='{"id":"brk-99821","event":"ftd","ftd_amount":250}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$BROKER_SECRET" | awk '{print $2}')

curl -X POST "$BASE_URL/api/v1/postbacks/$BROKER_ID" \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -d "$BODY"
```

**Важно:** подписывается **сырое тело** — не изменяй форматирование между подсчётом подписи и отправкой (никаких `jq`, пробелов, переупорядочивания ключей).

---

## 3. CRM → Broker: push лида (исходящий)

Это обратное направление — **брокеру нужно поднять HTTP-эндпоинт**, куда CRM отправит лид. Настройка в `/dashboard/brokers/:id`.

### Что настраивается в CRM

| Поле | Описание |
|---|---|
| `endpointUrl` | URL для push (например `https://broker.example.com/api/leads`) |
| `httpMethod` | `POST` \| `PUT` |
| `authType` | `NONE` \| `BEARER` \| `BASIC` \| `API_KEY_HEADER` \| `API_KEY_QUERY` |
| `authConfig` | зависит от `authType`: `{ token }` для Bearer, `{ user, password }` для Basic, `{ headerName, token }` или `{ paramName, token }` для API-key |
| `headers` | дополнительные заголовки (объект) |
| `fieldMapping` | `{ "broker_field": "lead_field" }` — как лиды CRM превращаются в payload брокера |
| `staticPayload` | фиксированные поля, добавляемые в каждый запрос (например `{ "partner_id": "crm-gc" }`) |
| `responseIdPath` | JSONPath к ID лида в ответе брокера — сохраняется как `lead.brokerExternalId`, используется для матчинга постбэков |
| `dailyCap` | опционально — максимум лидов в сутки (UTC) в этого брокера |
| `workingHours` | опционально — `{ tz, schedule: [{day, from, to}] }`, UTC eval |
| `postbackSecret` | секрет для HMAC-подписи входящих постбэков (см. раздел 2) |

### Поведение

- Таймаут per attempt: **5000ms**
- Ретраев внутри одного брокера: **2**, backoff 500ms
- Если брокер упал — CRM идёт к следующему в пуле (геo routing). См. `src/server/jobs/push-lead.ts`.
- Брокер должен вернуть ID лида в JSON-поле, путь к которому задаётся `responseIdPath`. Этот ID используется для матчинга постбэков.

Пример payload, который придёт брокеру (зависит от `fieldMapping`):
```json
{
  "first_name": "Ivan",
  "email": "ivan@example.com",
  "phone": "+380671234567",
  "country": "UA",
  "partner_id": "crm-gc"
}
```

Ожидаемый ответ:
```json
{ "id": "brk-99821", "status": "ok" }
```

(где `broker.responseIdPath = "$.id"`)

---

## 4. CRM → Affiliate: исходящий постбэк

Когда статус лида меняется (`PUSHED` / `ACCEPTED` / `DECLINED` / `FTD`), CRM шлёт POST на `affiliate.postbackUrl` (если настроен). События задаются в `affiliate.postbackEvents`.

Подпись — аналогично брокерскому постбэку: `X-Signature: sha256_hex(affiliate.postbackSecret, body)`.

См. `src/server/jobs/notify-affiliate.ts` для формата payload.

---

## 5. Health check

`GET {BASE_URL}/api/v1/health`

```json
{ "status": "ok", "db": "ok", "redis": "ok" }
```

- `200` если всё живо, `503 degraded` если БД или Redis недоступны.
- Не требует аутентификации.
