---
audience: ai-deep
block: analytics
source: auto-gen
kind: prisma
title: "DB Schema — analytics"
---
# AnalyticsPreset
<a id="db-analyticspreset"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **userId** `String`
- **name** `String`
- **query** `Json`
- **isDefault** `Boolean` default=false
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`

**Unique indexes:**
- (userId, name)

---

# AnalyticsShareLink
<a id="db-analyticssharelink"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **token** `String` unique
- **query** `Json`
- **createdBy** `String`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **expiresAt** `DateTime`

---

# LeadDailyRoll
<a id="db-leaddailyroll"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **date** `DateTime`
- **affiliateId** `String`
- **brokerId** `String` default="__none__"
- **geo** `String`
- **canonicalStatus** `String` default="__none__"
- **totalReceived** `Int` default=0
- **totalValidated** `Int` default=0
- **totalRejected** `Int` default=0
- **totalPushed** `Int` default=0
- **totalAccepted** `Int` default=0
- **totalDeclined** `Int` default=0
- **totalFtd** `Int` default=0
- **sumRevenue** `Decimal` default=0
- **updatedAt** `DateTime`

**Unique indexes:**
- (date, affiliateId, brokerId, geo, canonicalStatus)

---

# LeadHourlyRoll
<a id="db-leadhourlyroll"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **hour** `DateTime`
- **affiliateId** `String`
- **brokerId** `String` default="__none__"
- **geo** `String`
- **totalReceived** `Int` default=0
- **totalValidated** `Int` default=0
- **totalRejected** `Int` default=0
- **totalPushed** `Int` default=0
- **totalAccepted** `Int` default=0
- **totalDeclined** `Int` default=0
- **totalFtd** `Int` default=0
- **sumRevenue** `Decimal` default=0
- **updatedAt** `DateTime`

**Unique indexes:**
- (hour, affiliateId, brokerId, geo)

