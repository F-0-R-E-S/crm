# GambChamp CRM — гайд для заказчика

Демо-среда: **https://crm-node.fly.dev**

Всё что описано ниже можно потыкать прямо сейчас — данные уже засиены, брокер ходит в `postman-echo.com` (принимает любой пуш и отвечает 200), так что весь pipeline работает end-to-end без внешних зависимостей.

---

## 1. Быстрый вход

### Админка (веб-интерфейс)
- URL: https://crm-node.fly.dev/login
- Email: `admin@gambchamp.local`
- Password: `changeme`

После логина откроется дашборд со счётчиками / Sankey-воронкой / топом брокеров и geos.

### REST API (для интеграции аффилиата)
- Base URL: `https://crm-node.fly.dev`
- Test affiliate: `seed-affiliate-1` (Test Affiliate)
- **API key (для intake):** `ak_8ee0284aa5e32863be08b46b8076a3097077f862c5a1338c`
- Header: `Authorization: Bearer <api_key>`

Новый ключ в любой момент генерируется через админку (Affiliates → API keys → Generate).

---

## 2. Структура админки

| Путь | Что там |
|---|---|
| `/dashboard` | Счётчики (accepted/ftd/active-brokers/rejects), воронка, топ брокеров, топ geos |
| `/dashboard/leads` | Таблица лидов (9 колонок), drawer с tabs `timeline / payload / broker / postbacks`. `Esc` закрывает, `/` фокусирует поиск. |
| `/dashboard/affiliates` | CRUD аффилиатов, вкладки `overview/keys/postback/history` |
| `/dashboard/brokers` | CRUD брокеров, вкладки `config/mapping/postback/test`, Test Connection |
| `/dashboard/routing` | Потоки (Flows) — visual editor, cap per country, publish/archive |
| `/dashboard/settings/blacklist` | IP_EXACT, IP_CIDR, EMAIL_DOMAIN, PHONE_E164 (4 таба) |
| `/dashboard/settings/users` | RBAC: ADMIN / OPERATOR |
| `/dashboard/settings/audit` | Hash-chain audit log всех мутаций |

Тема переключается кнопкой в топбаре (dark/light), токены через CSS-variables.

---

## 3. Intake API — создание лида

### 3.1. Одиночный лид

```bash
curl -X POST https://crm-node.fly.dev/api/v1/leads \
  -H "Authorization: Bearer ak_8ee0284aa5e32863be08b46b8076a3097077f862c5a1338c" \
  -H "X-API-Version: 2026-01" \
  -H "Content-Type: application/json" \
  -d '{
    "external_lead_id": "client-demo-001",
    "first_name": "Maria",
    "last_name": "Schmidt",
    "email": "maria.demo@example.com",
    "phone": "+491701234567",
    "geo": "DE",
    "ip": "8.8.8.8",
    "landing_url": "https://landing.example/de/offer",
    "sub_id": "campaign-42",
    "utm": {"source": "fb", "campaign": "demo"},
    "event_ts": "2026-04-20T18:00:00Z"
  }'
```

Ответ `202 Accepted`:
```json
{
  "lead_id": "cmo7...",
  "status": "received",
  "reject_reason": null,
  "trace_id": "...",
  "received_at": "2026-04-20T18:00:00.123Z"
}
```

После этого лид автоматически:
1. Проходит anti-fraud (blacklist, dedup, VoIP — последнее выключено в демо).
2. Попадает в routing engine — выбирается брокер по GEO (rotation rules).
3. Пушится в брокер (postman-echo в демо).
4. Статус переходит `NEW → PUSHING → PUSHED` (или `PENDING_HOLD` если у брокера включён hold).
5. Outbound postback отправляется аффилиату (если настроен `postbackUrl`).

### 3.2. Batch (массовое intake)

- **Sync** (≤50 лидов в батче): ответ сразу `207 Multi-Status` с результатом по каждой позиции.
- **Async** (>50 лидов): возвращается `202 Accepted` + `job_id`, работа в фоне.

```bash
curl -X POST https://crm-node.fly.dev/api/v1/leads/bulk \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {"external_lead_id":"bulk-1","first_name":"A","geo":"DE","ip":"1.2.3.4","event_ts":"2026-04-20T18:00:00Z","phone":"+491701111111","email":"a@x.com"},
      {"external_lead_id":"bulk-2","first_name":"B","geo":"FR","ip":"1.2.3.5","event_ts":"2026-04-20T18:00:00Z","phone":"+33612345678","email":"b@x.com"}
    ]
  }'
```

Статус async-задачи:
```bash
curl -H "Authorization: Bearer <KEY>" \
  https://crm-node.fly.dev/api/v1/leads/bulk/<job_id>
```

### 3.3. Идемпотентность и дедуп

- Заголовок `X-Idempotency-Key: <uuid>` — один и тот же запрос с одинаковым payload вернёт тот же `lead_id`; изменённый payload с тем же ключом → `409 idempotency_mismatch`.
- Дедуп по умолчанию окно 30 дней, ключи: `phone_hash`, `email_hash`. При совпадении — `409 duplicate_lead` + `existing_lead_id` + `matched_by`.

### 3.4. Санбокс

Ключ с флагом `isSandbox=true` + `?mode=sandbox` → детерминированный результат по префиксу `external_lead_id`:
- `sandbox_accept_*` → ACCEPTED
- `sandbox_decline_*` → DECLINED
- `sandbox_reject_*` → REJECTED (antifraud)
- `sandbox_ftd_*` → FTD

В демо сейчас активны только production keys; чтобы попробовать sandbox — сгенерируйте ключ с флажком "sandbox" в админке.

---

## 4. Диск рекомендуемых поведений

| Кейс | Ответ | Код ошибки |
|---|---|---|
| Нет auth-заголовка | `401` | `unauthorized` |
| Bearer неверный | `401` | `unauthorized` |
| Нет обязательного поля (geo/ip/event_ts) | `422` | `validation_error` + `field` |
| phone не парсится | `422` | `phone_invalid` |
| email невалидный | `422` | `validation_error` |
| geo не ISO-2 | `422` | `geo_unknown` |
| geo не в allowed_geo аффилиата | `422` | `geo_not_allowed` |
| Blacklist hit | `202` + `reject_reason: "ip_blocked" \| "phone_blocked" \| "email_domain_blocked"` | — |
| Дубликат | `409` | `duplicate_lead` + `existing_lead_id` |
| >120 req/min с одного ключа | `429` | `rate_limited` + `Retry-After` |
| payload >64KB | `413` | `payload_too_large` |
| Unknown X-API-Version | `400` | `unsupported_version` |

Полный каталог: `GET /api/v1/errors` (после логина в админке).

---

## 5. Входящие постбэки от брокера

Когда реальный брокер шлёт статус-изменение лида (accepted/declined/ftd) — он попадает сюда:

```
POST https://crm-node.fly.dev/api/v1/postbacks/<brokerId>
Content-Type: application/json
X-Signature: <HMAC-SHA256 по raw-body>
```

**Verify:** `HMAC-SHA256(broker.postbackSecret, raw_body)` hex-lowercase.

В демо-брокере:
- `brokerId`: `seed-broker-1`
- `postbackSecret`: `seed-secret-change-me`
- `postbackLeadIdPath`: `$.lead_id` (или просто `lead_id`)
- `postbackStatusPath`: `$.status`
- Status mapping: `accepted → ACCEPTED`, `declined → DECLINED`, `ftd → FTD`

Пример:
```bash
BODY='{"lead_id":"<brokerExternalId_из_ответа_push>","status":"accepted"}'
SIG=$(python3 -c "import hmac,hashlib,sys;print(hmac.new(b'seed-secret-change-me',sys.argv[1].encode(),hashlib.sha256).hexdigest())" "$BODY")
curl -X POST https://crm-node.fly.dev/api/v1/postbacks/seed-broker-1 \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIG" \
  -d "$BODY"
```

Ответы:
- `200` — применён, lead получил новый state.
- `401 invalid_signature` — HMAC не совпал.
- `404 broker_not_found / lead_not_found` — нет такого брокера или `lead_id` в payload не матчится ни с каким `brokerExternalId`.
- `400 lead_id_missing` — JSONPath не вытащил ID из payload.

### 5.1. Anti-shave (Wave 1)
Если у брокера настроен `pendingHoldMinutes > 0`:
- После успешного push лид уходит в `PENDING_HOLD` (не сразу в PUSHED).
- Через `pendingHoldMinutes` фоновый job `resolve-pending-hold` автопереведёт в ACCEPTED, **если не пришёл DECLINED**.
- Если брокер пришлёт DECLINED в окне hold → лид становится `DECLINED` + `shaveSuspected=true` + emit `LeadEvent.SHAVE_SUSPECTED`.

Включается через DB (timestamp tRPC не обновлён под это поле — зафиксированный gap):
```
UPDATE "Broker" SET "pendingHoldMinutes" = 5 WHERE id = 'seed-broker-1';
```
Или через `prisma studio` на проде.

---

## 6. Исходящие постбэки к аффилиату

Если у аффилиата заполнен `postbackUrl` — при каждом интересующем событии улетает GET/POST с подставленными макросами.

Макросы: `{lead_id}`, `{external_lead_id}`, `{status}`, `{payout}`, `{sub_id}`, `{geo}`, `{broker_id}`.

События по умолчанию: `lead_pushed`, `ftd`, `declined`.

Retry schedule: `10s, 60s, 300s, 900s, 3600s` (5 попыток). При 410 — `AffiliateIntakeWebhook.pausedAt` + `pausedReason="410"`.

Также есть отдельный канал — intake webhooks:
```
POST /api/v1/affiliates/<affId>/webhooks/intake
{
  "url": "https://tracker.example/hook",
  "secret": "min-32-chars-shared-secret-1234",
  "events": ["intake.accepted","intake.rejected","intake.duplicate"]
}
```

Наблюдение доставок: `GET /api/v1/affiliates/<affId>/webhooks/deliveries`.

---

## 7. Admin endpoints (требуют session cookie)

Быстрый путь — залогинься в админке, открой DevTools → Network → посмотри cookie. Либо через curl см. скрипт [`scripts/admin-setup.ts`](scripts/admin-setup.ts) (делает login через `/api/auth/callback/credentials`).

### Affiliates
- `GET /api/v1/affiliates/:id/intake-settings` — required_fields, allowed_geo, dedupe_window_days, max_rpm.
- `PUT /api/v1/affiliates/:id/intake-settings` — обновить настройки.
- `GET/POST /api/v1/affiliates/:id/webhooks/intake` — intake-webhooks CRUD.
- `GET /api/v1/affiliates/:id/webhooks/deliveries` — история доставок.
- `GET /api/v1/affiliates/:id/leads/:leadId/events` — полный таймлайн лида.

### Brokers
- `GET/PUT /api/v1/brokers/:id/mapping` — mapping + staticPayload + required fields.
- `POST /api/v1/brokers/:id/test-connection` — посылает тестовый payload; возвращает auth_status, http_status, latency_ms, masked response.
- `POST /api/v1/brokers/:id/status-sync` — переключить syncMode (`{"mode":"webhook"}` или `{"mode":"polling","statusPollPath":"/status","statusPollIdsParam":"ids","pollIntervalMin":15}`).
- `GET /api/v1/brokers/:id/errors?from=...&to=...` — агрегация ошибок брокера за период (pushes, errors, p95, top error codes).
- `GET /api/v1/brokers/templates` — каталог готовых интеграций (20 засиены — forex/crypto/gambling × 6 вендоров).
- `GET /api/v1/brokers/templates/:id` — детали темплейта.

### Routing Flows
- `GET /api/v1/routing/flows` — список.
- `POST /api/v1/routing/flows` — создать черновик. Тело: `{ name, timezone, graph: { nodes: [{id, kind}], edges: [{from, to, condition}] } }`.
- `GET/PUT /api/v1/routing/flows/:id` — читать/править draft.
- `PUT /api/v1/routing/flows/:id/algorithm` — конфиг WRR или SLOTS_CHANCE.
- `POST /api/v1/routing/flows/:id/publish` — валидирует граф (должен быть `Exit`, нет циклов, алгоритм задан) и делает активной.
- `POST /api/v1/routing/flows/:id/archive` — архивировать.
- `GET /api/v1/routing/caps/:flowId` — текущее состояние cap-счётчиков (активная версия).

Node kinds: `Entry | Filter | Algorithm | BrokerTarget | Fallback | Exit`.

### Simulate (dry-run роутинга)
```bash
curl -b cookies.txt -X POST https://crm-node.fly.dev/api/v1/routing/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "<flow_id>",
    "lead": {
      "geo": "DE",
      "affiliate_id": "seed-affiliate-1",
      "email": "sim@example.com"
    }
  }'
```
Возвращает `selected_broker_id`, `algorithm_used`, `filters_applied` step-by-step, `fallback_path`, `decision_time_ms`.

Batch: `{"flow_id":..., "leads":[...]}` — до 1000 лидов, асинхронная job.

---

## 8. Аналитика

### Метрики intake
```
GET /api/v1/intake/metrics?from=2026-04-01&to=2026-04-30&interval=1h&group_by=state|geo|affiliate
```
Возвращает buckets с `accepted / rejected / duplicates / p95_latency_ms`. В демо накоплено 2669 лидов, разложенных по 12 GEO и разным state'ам.

### Schema discovery
```
GET /api/v1/schema/leads?version=2026-01
```
Полный JSON-schema входного payload + пример. Используется для валидации на стороне аффилиата.

### Error catalog
```
GET /api/v1/errors
```
16 error codes с `http_status`, `description`, `fix_hint` — всё что может вернуть intake.

### Health
```
GET /api/v1/health
```
Публичный, без auth. `{status, db, redis}`.

---

## 9. Сценарии для прогонки (copy-paste)

### A. Happy path — лид прошёл и был accepted

```bash
KEY=ak_8ee0284aa5e32863be08b46b8076a3097077f862c5a1338c

# 1. Intake
curl -X POST https://crm-node.fly.dev/api/v1/leads \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"external_lead_id":"demo-happy-1","first_name":"Ivan","last_name":"Ivanov","email":"i.ivanov@demo.local","phone":"+491701234567","geo":"DE","ip":"8.8.8.8","event_ts":"2026-04-20T18:00:00Z"}'
# → 202 + lead_id

# 2. Zайти в админку → /dashboard/leads → увидеть лид в состоянии PUSHED с брокером seed-broker-1
# Timeline: RECEIVED → BROKER_PUSH_ATTEMPT → ROUTING_DECIDED → BROKER_PUSH_SUCCESS

# 3. Брокер присылает FTD
BODY='{"lead_id":"<brokerExternalId_из_таймлайна>","status":"ftd"}'
SIG=$(python3 -c "import hmac,hashlib,sys;print(hmac.new(b'seed-secret-change-me',sys.argv[1].encode(),hashlib.sha256).hexdigest())" "$BODY")
curl -X POST https://crm-node.fly.dev/api/v1/postbacks/seed-broker-1 \
  -H "Content-Type: application/json" -H "X-Signature: $SIG" -d "$BODY"
# → 200, лид переходит в FTD, ftdAt проставляется
```

### B. Anti-fraud — blacklist
В демо засиены:
- `IP_EXACT: 6.6.6.6`
- `IP_CIDR: 192.0.2.0/24`
- `EMAIL_DOMAIN: evil.example`
- `PHONE_E164: +491700000000`

Любой лид с этими значениями → `202` + `reject_reason=ip_blocked|email_domain_blocked|phone_blocked`, состояние `REJECTED`, LeadEvent `REJECTED_ANTIFRAUD`.

### C. Duplicate detection
Отправить одинаковый `phone+email` дважды подряд → второй получает `409 duplicate_lead` с `existing_lead_id` и `matched_by: "phone_hash"`.

### D. Idempotency
Отправить два одинаковых payload с одинаковым `X-Idempotency-Key` → оба ответа вернут тот же `lead_id`. Изменить payload при том же ключе → `409 idempotency_mismatch`.

### E. Rotation fallback
1. Админка → Brokers → seed-broker-1 → Config → поменять endpoint на `https://postman-echo.com/status/500`.
2. Intake лида с geo=DE.
3. В timeline: `BROKER_PUSH_ATTEMPT(broker1)` → `BROKER_PUSH_FAIL` → `BROKER_PUSH_ATTEMPT(broker2)` → `BROKER_PUSH_SUCCESS(broker2)`.
4. Вернуть endpoint обратно на `https://postman-echo.com/post`.

### F. Anti-shave (PENDING_HOLD)
1. Выставить `broker.pendingHoldMinutes = 2` (через prisma studio или db push).
2. Intake лида → state=`PENDING_HOLD`, `pendingHoldUntil=now+2min`.
3. Либо подождать 2 минуты → `resolve-pending-hold` job переведёт в ACCEPTED, либо прислать DECLINED postback в окне → лид становится DECLINED + `shaveSuspected=true` + event `SHAVE_SUSPECTED`.

### G. Routing flow + cap
1. Админка → Routing → Create Flow.
2. Собрать граф `Entry → BrokerTarget(seed-broker-1) → Exit`.
3. Включить cap: scope=BROKER, window=DAILY, limit=10, perCountry=true, countryLimits={DE:5, FR:3}.
4. Настроить алгоритм (WRR) и опубликовать.
5. Через `/routing/simulate` с разными geo посмотреть как работает выбор.

---

## 10. RBAC роли

- **ADMIN** — всё, включая мутации (создать/обновить/удалить любую сущность).
- **OPERATOR** — read-only + действия над лидами (re-push, mark FTD/REJECTED через UI drawer).

В демо заведены:
- ADMIN: `admin@gambchamp.local` / `changeme`
- OPERATOR: `ops1@gambchamp.local` / `operator-pw-123`

---

## 11. Что уже засиено в демо

| Сущность | Количество |
|---|---|
| Affiliates | 2 (Test Affiliate, Wave1 Test Affiliate) |
| Brokers | 2 (Echo Broker + Echo Broker B, оба → postman-echo) |
| API keys | 4 шт (с ротацией) |
| Broker Templates | 20 шт (forex/crypto/gambling × 6 вендоров) |
| Rotation rules | 16 (14 geos × приоритет 1 + 3 для приор 2) |
| Blacklist | 4 записи (по одной каждого kind) |
| Users | 2 (ADMIN + OPERATOR) |
| Leads | ~2670, раскиданы по 12 GEO и 8 state'ам |
| LeadEvents | ~13000 |
| Flows (archived) | 3 (cap-test-flow, wave1-e2e-flow, sweep-flow-prod) |

---

## 12. Известные ограничения демо

1. **Outbound postbacks** в аффилиате #1 указывают на `localhost:4001` → они падают (411/400). Это не баг прода, просто такой seed. Поменяйте `postbackUrl` у affiliate на рабочий URL (например, postman-echo) чтобы проверить outbound.
2. **`broker.update` tRPC** пока не принимает `pendingHoldMinutes` — для Wave 1 тестов обновлять через Prisma Studio или `db execute`. Баг будет устранён в следующем PR.
3. **Cap enforcement** через Flow engine работает в unit-тестах (341/341 green), но intake runtime пока ходит через legacy `RotationRule` pool (`push-lead.ts`). Перевод на Flow engine — отдельная задача в бэклоге.
4. **Middleware** форсит session cookie на `/api/v1/errors`, `/api/v1/schema/leads`, `/api/v1/intake/metrics`. Для аффилиата с Bearer key они пока недоступны через HTTP — можно использовать через админку.
5. **Sandbox mode** требует отдельного ключа с `isSandbox=true`. Текущие ключи — production, поэтому `?mode=sandbox` → 403.

---

## 13. Если что-то сломалось

- **Health check:** `curl https://crm-node.fly.dev/api/v1/health` → должен вернуть `{status:"ok",db:"ok",redis:"ok"}`.
- **Логи:** `flyctl logs -a crm-node` (только если есть доступ к аккаунту Fly).
- **Фоновые джобы:** pg-boss worker — отдельная машина; если лиды зависают в `PUSHING` — скорее всего worker упал, `flyctl status -a crm-node`.
- **Аудит:** `/dashboard/settings/audit` — hash-chain всех мутаций с `userId`, `action`, `entityId`, `diff`.

---

## 14. Контакты и продолжение

- Репозиторий: `/Users/f0res/Desktop/Gambchamp/CRM-PRD/crm-node-wave1` (ветка `wave1-parity-gaps`).
- Changelog: `CHANGELOG.md`.
- Архитектурные заметки для дев-команды: `CLAUDE.md`.
- Спецификации: `docs/superpowers/specs/`.
- Тесты: 341 unit+integration / 4 e2e (`pnpm test` / `pnpm test:e2e`).
