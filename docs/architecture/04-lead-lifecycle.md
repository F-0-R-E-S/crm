# 04 — Lead Lifecycle

**Версия:** 1.0 | **Статус:** Draft

Полный жизненный цикл лида — от момента получения через API до уведомления аффилейта о результате.

---

## Схема состояний лида

```
               ┌─────────┐
               │   new   │  ← POST /api/v1/leads
               └────┬────┘
                    │ fraud check
              ┌─────▼──────┐
              │ processing │
              └─────┬──────┘
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼───┐  ┌───▼───┐  ┌──▼──────┐
    │rejected│  │ hold  │  │ routed  │
    │(fraud) │  │(no    │  │         │
    └────────┘  │match) │  └──┬──────┘
                └───────┘     │ broker send
                         ┌────▼────┐
                         │  sent   │
                         └────┬────┘
                    ┌─────────┼─────────┐
                    │         │         │
               ┌────▼──┐  ┌───▼──┐  ┌──▼─────┐
               │success│  │error │  │rejected│
               └───────┘  └──────┘  │(broker)│
                                     └────────┘
```

---

## Этап 1: Intake (Приём)

**Сервис:** Intake Service  
**Время:** < 50ms (sync part)

```
POST /api/v1/leads
    │
    ├─ 1. Auth: проверить X-API-Key → affiliate_id + company_id
    ├─ 2. Rate limit: Redis incr → 429 если превышен
    ├─ 3. Parse & validate: обязательные поля, форматы
    ├─ 4. Idempotency: Redis GET idem:{company}:{key} → если есть, вернуть cached response
    ├─ 5. E.164 normalize: phone → +{country_code}{number}
    ├─ 6. GEO resolve: IP → country (если country не передан явно)
    ├─ 7. Dedup check: SELECT 1 FROM leads WHERE company_id=$1 AND (email=$2 OR phone=$3) AND created_at > now()-interval'30d'
    ├─ 8. INSERT leads (status='new')
    ├─ 9. SET idem:{company}:{key} = {lead_id} EX 86400
    ├─ 10. PUBLISH lead:processing:{lead_id} → Redis Stream (async)
    └─ RETURN 201 { id, status: "new", created_at }
```

**Async pipeline** (Redis Stream consumer):
```
    ├─ Fraud check (Fraud Service)
    └─ Routing (Router Service)
```

---

## Этап 2: Anti-Fraud Check

**Сервис:** Fraud Service  
**Время:** < 100ms

```
lead received from queue
    │
    ├─ 1. Check fraud cache: Redis GET fraud:{hash(email+phone+ip)}
    │      └─ если есть → use cached score
    ├─ 2. IP check: VPN/TOR/Proxy/datacenter detection (external API или local DB)
    ├─ 3. Phone check: validate format, VOIP detection, carrier lookup
    ├─ 4. Email check: disposable email, MX record, syntax
    ├─ 5. Duplicate check across company leads (last 90 days)
    ├─ 6. Blacklist check: company-level blacklists
    ├─ 7. Calculate fraud_score (0-100):
    │      IP issues:     +20-40
    │      VOIP phone:    +30
    │      Disposable email: +25
    │      Duplicate:     +50 (configurable)
    │      Blacklisted:   +100
    ├─ 8. UPDATE leads SET fraud_score=$1, fraud_details=$2, status='processing'
    ├─ 9. Cache result: SET fraud:{hash} EX 3600
    └─ 10. if fraud_score > profile.max_score:
              UPDATE leads SET status='rejected'
              → notify affiliate (postback with rejection reason)
           else:
              → push to routing queue
```

**fraud_details** (per-field breakdown для прозрачности):
```json
{
  "ip": {"score": 20, "reason": "datacenter_ip", "provider": "ipinfo"},
  "phone": {"score": 0, "reason": "ok", "carrier": "Vodafone"},
  "email": {"score": 0, "reason": "ok"},
  "duplicate": {"score": 0, "reason": "unique"},
  "total": 20,
  "blocked": false
}
```

---

## Этап 3: Routing

**Сервис:** Router Service  
**Время:** < 200ms

```
lead from fraud queue (status='processing', fraud_score<threshold)
    │
    ├─ 1. Find matching distribution:
    │      SELECT * FROM distributions
    │      WHERE company_id=$1
    │        AND (country=$2 OR country IS NULL)
    │        AND (affiliate_id=$3 OR affiliate_id IS NULL)
    │      ORDER BY priority DESC, country NULLS LAST
    │      LIMIT 1
    │
    ├─ 2. Check timeslots: текущее время в timezone дистрибуции
    │      └─ если outside hours AND reject_outside_hours → status='hold'
    │
    ├─ 3. Get active flows for distribution (ORDER BY priority_group, weight)
    │
    ├─ 4. For each priority_group (waterfall):
    │      ├─ Get eligible flows (geo_filter match, status=active)
    │      ├─ Check caps (Redis GET cap:{flow_id}:{date}:{country})
    │      ├─ Apply algorithm:
    │      │   SLOTS: выбрать flow с наименьшим fill_rate (текущий/cap)
    │      │   CHANCE: random weighted selection
    │      └─ if no eligible flow in group → try next priority_group
    │
    ├─ 5. If flow found:
    │      ├─ Redis INCR cap:{flow_id}:{date}:{country}
    │      ├─ UPDATE leads SET status='routed', flow_id=$1
    │      └─ → push to broker send queue
    │
    └─ 6. If no flow found:
           UPDATE leads SET status='hold'
           → push to UAD hold pool
```

---

## Этап 4: Broker Send

**Сервис:** Integration Service  
**Время:** up to 10s (broker SLA)

```
lead from routing queue
    │
    ├─ 1. Load integration config (from cache or DB)
    ├─ 2. Map fields: наши поля → поля брокера (field_mapping JSONB)
    ├─ 3. Apply funnel substitution (funnel_id mapping per integration)
    ├─ 4. HTTP request to broker:
    │      - Method: POST/GET (from template)
    │      - Auth: api_key / basic / oauth2
    │      - Timeout: 10s
    │      - Retry: 1x on connection error
    │
    ├─ 5. Parse broker response:
    │      ├─ Success: extract broker_lead_id, autologin_url
    │      ├─ Duplicate: status='rejected', reason='duplicate_at_broker'
    │      ├─ Cap full: try next flow in priority_group (failover)
    │      └─ Error: INSERT lead_attempt(result='broker_error'), try next flow
    │
    ├─ 6. INSERT lead_attempts (Client History entry)
    ├─ 7. UPDATE leads SET status='sent', broker_lead_id=$1
    │
    ├─ 8. Generate autologin:
    │      ├─ INSERT autologin_sessions(token=random_128, expires_at=+48h)
    │      └─ Return autologin URL to affiliate via postback
    │
    └─ 9. Send postback to affiliate (success event)
```

---

## Этап 5: Autologin Pipeline

**Сервис:** Autologin Service  
**4 отслеживаемых стадии:**

```
stage: generated
    │
    ├─ Lead clicks autologin URL
    │   → stage: link_clicked
    │   → capture: ip_at_click, user_agent, timestamp
    │
    ├─ Browser loads autologin page
    │   → stage: page_loaded
    │   → serve: redirect page with hidden form submit
    │
    ├─ Device fingerprint captured & verified
    │   → stage: fingerprint_verified
    │   → check: bot/VPN/proxy/TOR via WebGL fingerprint
    │   → check: ip_at_click vs ip_at_submit (мисматч = anomaly flag)
    │   → check: geo consistency
    │
    └─ Lead submitted to broker platform
        → stage: submitted
        → UPDATE autologin_sessions SET stage='submitted'
        → Notify Telegram bot (autologin_success event)
        → SLA tracking: increment success counter
```

**SLA мониторинг (99.5% target):**
```
Redis counters (24h rolling):
  autologin:attempts:{company_id}    INCR per attempt
  autologin:success:{company_id}     INCR per success
  
Alert если: success/attempts < 0.995 за последние 1000 попыток
```

---

## Этап 6: Постбек аффилейту

**Сервис:** Notification Service

```
lead sent successfully
    │
    ├─ Load affiliate postbacks:
    │   SELECT * FROM postbacks
    │   WHERE affiliate_id=$1 AND event='lead_sent'
    │     AND (funnel IS NULL OR funnel=$2)
    │     AND (country IS NULL OR country=$3)
    │
    ├─ For each postback:
    │   ├─ Substitute template vars: {lead_id}, {click_id}, {phone}, {aff_sub1}..., etc.
    │   ├─ HTTP GET/POST to postback URL
    │   ├─ Log result in postback_log
    │   └─ Retry once on failure (async)
    │
    └─ Telegram notification to bound bot:
        "✅ Лид отправлен: {country} → {broker_name}, funnel: {funnel}"
```

---

## Status Pipe Pending (Anti-Shave)

Специальная логика мониторинга шейва — уникальный дифференциатор.

```
SCHEDULED JOB: каждые 30 минут
    │
    ├─ SELECT leads WHERE status='sent' AND created_at < now()-interval'6h'
    │         AND broker_status IS NULL   ← брокер не обновил статус
    │
    ├─ For each such lead:
    │   ├─ If broker has status update API → fetch current status
    │   ├─ If fetched status ≠ expected → flag as "status_pipe_pending"
    │   └─ If no update for 24h → alert in Telegram: "⚠️ Possible shave: {N} leads"
    │
    └─ Dashboard widget: "Leads at risk of shave: {N}"
```

---

## Переотправка (UAD / Cold Overflow)

```
HOLD pool → UAD scheduler
    │
    ├─ Check overflow configs (active, in date range)
    ├─ Filter leads by: country, funnel, affiliate, source
    ├─ Batch leads (max 50 per run)
    ├─ Re-inject through routing (same pipeline, но с попыткой #2)
    ├─ Sleep interval between batches
    └─ Log all re-inject attempts in lead_attempts
```

---

## Delayed Actions

```
SCHEDULED JOB: каждую минуту
    │
    ├─ SELECT * FROM delayed_actions WHERE execute_at <= now() AND status='pending'
    ├─ For each action:
    │   ├─ Lock: SET lock:delayed:{id} NX EX 60
    │   ├─ Execute: UPDATE flows SET {field}={value} based on action_type
    │   ├─ UPDATE delayed_actions SET status='executed', executed_at=now()
    │   └─ Log in audit_log
    └─ Notify creator via Telegram: "✅ Delayed action executed: {name}"
```
