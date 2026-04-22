---
audience: ai-deep
block: telegram-bot
source: auto-gen
kind: trpc
title: "tRPC Surface — telegram-bot"
---
# telegram.adminConfig
<a id="trpc-telegram-adminconfig"></a>

Procedure `telegram.adminConfig` — authn: admin, kind: query.

input: —

Source: `src/server/routers/telegram.ts`

---

# telegram.catalog
<a id="trpc-telegram-catalog"></a>

Procedure `telegram.catalog` — authn: protected, kind: query.

input: —

Source: `src/server/routers/telegram.ts`

---

# telegram.issueLinkToken
<a id="trpc-telegram-issuelinktoken"></a>

Procedure `telegram.issueLinkToken` — authn: protected, kind: mutation.

input: —

Source: `src/server/routers/telegram.ts`

---

# telegram.mySubscriptions
<a id="trpc-telegram-mysubscriptions"></a>

Procedure `telegram.mySubscriptions` — authn: protected, kind: query.

input: —

Source: `src/server/routers/telegram.ts`

---

# telegram.recentEvents
<a id="trpc-telegram-recentevents"></a>

Procedure `telegram.recentEvents` — authn: admin, kind: query.

input: z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional()

Source: `src/server/routers/telegram.ts`

---

# telegram.rotateWebhookSecret
<a id="trpc-telegram-rotatewebhooksecret"></a>

Procedure `telegram.rotateWebhookSecret` — authn: admin, kind: mutation.

input: —

Source: `src/server/routers/telegram.ts`

---

# telegram.setBotToken
<a id="trpc-telegram-setbottoken"></a>

Procedure `telegram.setBotToken` — authn: admin, kind: mutation.

input: z.object({
        botToken: z.string().min(10),
        botUsername: z.string().optional(),
      }),

Source: `src/server/routers/telegram.ts`

---

# telegram.testSend
<a id="trpc-telegram-testsend"></a>

Procedure `telegram.testSend` — authn: admin, kind: mutation.

input: z.object({ chatId: z.string(), text: z.string().min(1).max(4000) })

Source: `src/server/routers/telegram.ts`

---

# telegram.updateSubscription
<a id="trpc-telegram-updatesubscription"></a>

Procedure `telegram.updateSubscription` — authn: protected, kind: mutation.

input: z.object({…

Source: `src/server/routers/telegram.ts`

