---
audience: ai-deep
block: billing-subscription
source: auto-gen
kind: env
title: "Environment Variables — billing-subscription"
---
# ANTIFRAUD_DEDUP_CROSS_AFFILIATE
<a id="env-antifraud_dedup_cross_affiliate"></a>

Environment variable. Zod schema fragment:

```ts
ANTIFRAUD_DEDUP_CROSS_AFFILIATE: zBool.default(false)
```

---

# ANTIFRAUD_DEDUP_WINDOW_DAYS
<a id="env-antifraud_dedup_window_days"></a>

Environment variable. Zod schema fragment:

```ts
ANTIFRAUD_DEDUP_WINDOW_DAYS: z.coerce.number().int().min(1).max(90).default(30)
```

---

# ANTIFRAUD_FINGERPRINT_FALLBACK_MIN
<a id="env-antifraud_fingerprint_fallback_min"></a>

Environment variable. Zod schema fragment:

```ts
ANTIFRAUD_FINGERPRINT_FALLBACK_MIN: z.coerce.number().int().positive().default(10)
```

---

# ANTIFRAUD_VOIP_CHECK_ENABLED
<a id="env-antifraud_voip_check_enabled"></a>

Environment variable. Zod schema fragment:

```ts
ANTIFRAUD_VOIP_CHECK_ENABLED: zBool.default(false)
```

---

# AUTH_SECRET
<a id="env-auth_secret"></a>

Environment variable. Zod schema fragment:

```ts
AUTH_SECRET: z.string().min(32).optional()
```

---

# DATABASE_URL
<a id="env-database_url"></a>

Environment variable. Zod schema fragment:

```ts
DATABASE_URL: z.string().min(1)
```

---

# GAME_FRONTEND_ENABLED
<a id="env-game_frontend_enabled"></a>

Environment variable. Zod schema fragment:

```ts
GAME_FRONTEND_ENABLED: zBool.optional().default(true)
```

---

# GAME_ORIGIN
<a id="env-game_origin"></a>

Environment variable. Zod schema fragment:

```ts
GAME_ORIGIN: z.string().optional().default("")
```

---

# INTAKE_BULK_MAX_BYTES
<a id="env-intake_bulk_max_bytes"></a>

Environment variable. Zod schema fragment:

```ts
INTAKE_BULK_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024)
```

---

# INTAKE_BULK_MAX_ITEMS
<a id="env-intake_bulk_max_items"></a>

Environment variable. Zod schema fragment:

```ts
INTAKE_BULK_MAX_ITEMS: z.coerce.number().int().positive().default(100)
```

---

# INTAKE_BULK_SYNC_THRESHOLD
<a id="env-intake_bulk_sync_threshold"></a>

Environment variable. Zod schema fragment:

```ts
INTAKE_BULK_SYNC_THRESHOLD: z.coerce.number().int().positive().default(50)
```

---

# INTAKE_DEFAULT_SCHEMA_VERSION
<a id="env-intake_default_schema_version"></a>

Environment variable. Zod schema fragment:

```ts
INTAKE_DEFAULT_SCHEMA_VERSION: z.string().default("2026-01")
```

---

# INTAKE_MAX_PAYLOAD_BYTES
<a id="env-intake_max_payload_bytes"></a>

Environment variable. Zod schema fragment:

```ts
INTAKE_MAX_PAYLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(64 * 1024)
```

---

# INTAKE_STRICT_UNKNOWN_FIELDS
<a id="env-intake_strict_unknown_fields"></a>

Environment variable. Zod schema fragment:

```ts
INTAKE_STRICT_UNKNOWN_FIELDS: zBool.default(true)
```

---

# NEXTAUTH_SECRET
<a id="env-nextauth_secret"></a>

Environment variable. Zod schema fragment:

```ts
NEXTAUTH_SECRET: z.string().min(32).optional()
```

---

# REDIS_URL
<a id="env-redis_url"></a>

Environment variable. Zod schema fragment:

```ts
REDIS_URL: z.string().min(1)
```

---

# SANDBOX_TTL_DAYS
<a id="env-sandbox_ttl_days"></a>

Environment variable. Zod schema fragment:

```ts
SANDBOX_TTL_DAYS: z.coerce.number().int().positive().default(7)
```

---

# STRIPE_BILLING_RETURN_URL
<a id="env-stripe_billing_return_url"></a>

Environment variable. Zod schema fragment:

```ts
STRIPE_BILLING_RETURN_URL: z.string().optional()
```

---

# STRIPE_PRICE_GROWTH
<a id="env-stripe_price_growth"></a>

Environment variable. Zod schema fragment:

```ts
STRIPE_PRICE_GROWTH: z.string().optional()
```

---

# STRIPE_PRICE_PRO
<a id="env-stripe_price_pro"></a>

Environment variable. Zod schema fragment:

```ts
STRIPE_PRICE_PRO: z.string().optional()
```

---

# STRIPE_PRICE_STARTER
<a id="env-stripe_price_starter"></a>

Environment variable. Zod schema fragment:

```ts
STRIPE_PRICE_STARTER: z.string().optional()
```

---

# STRIPE_SECRET_KEY
<a id="env-stripe_secret_key"></a>

Environment variable. Zod schema fragment:

```ts
STRIPE_SECRET_KEY: z.string().optional()
```

---

# STRIPE_WEBHOOK_SECRET
<a id="env-stripe_webhook_secret"></a>

Environment variable. Zod schema fragment:

```ts
STRIPE_WEBHOOK_SECRET: z.string().optional()
```

---

# WEBHOOK_RETRY_SCHEDULE_SEC
<a id="env-webhook_retry_schedule_sec"></a>

Environment variable. Zod schema fragment:

```ts
WEBHOOK_RETRY_SCHEDULE_SEC: z.string().default("10,60,300,900,3600")
```

