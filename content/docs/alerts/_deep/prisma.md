---
audience: ai-deep
block: alerts
source: auto-gen
kind: prisma
title: "DB Schema — alerts"
---
# AlertLog
<a id="db-alertlog"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **ruleKey** `String`
- **severity** `String`
- **triggeredAt** `DateTime` default={"name":"now","args":[]}
- **windowStart** `DateTime?`
- **windowEnd** `DateTime?`
- **measurement** `Json` default="{}"
- **message** `String`
- **resolvedAt** `DateTime?`
- **ackedAt** `DateTime?`
- **ackedBy** `String?`

