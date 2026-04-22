---
audience: ai-deep
block: telegram-bot
source: auto-gen
kind: prisma
title: "DB Schema — telegram-bot"
---
# TelegramBotConfig
<a id="db-telegrambotconfig"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **botToken** `String`
- **botUsername** `String?`
- **webhookSecret** `String` unique
- **isActive** `Boolean` default=true
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`

---

# TelegramEventLog
<a id="db-telegrameventlog"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **chatId** `String`
- **eventType** `String`
- **payload** `Json`
- **messageText** `String?`
- **sentAt** `DateTime?`
- **successful** `Boolean` default=false
- **errorMessage** `String?`
- **telegramMsgId** `Int?`
- **createdAt** `DateTime` default={"name":"now","args":[]}

---

# TelegramSubscription
<a id="db-telegramsubscription"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **userId** `String`
- **chatId** `String`
- **telegramUserId** `String?`
- **eventTypes** `String[]` default=[]
- **brokerFilter** `String[]` default=[]
- **affiliateFilter** `String[]` default=[]
- **mutedBrokerIds** `String[]` default=[]
- **isActive** `Boolean` default=true
- **linkTokenHash** `String?`
- **linkTokenExpires** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **user** `User` relation→TelegramSubscriptionToUser

**Unique indexes:**
- (userId, chatId)

