---
audience: ai-deep
block: scheduled-changes
source: auto-gen
kind: prisma
title: "DB Schema — scheduled-changes"
---
# enum ScheduledChangeEntity
<a id="db-enum-scheduledchangeentity"></a>

Enum referenced by one or more models.

- Flow
- Broker
- Cap

---

# enum ScheduledChangeStatus
<a id="db-enum-scheduledchangestatus"></a>

Enum referenced by one or more models.

- PENDING
- APPLIED
- CANCELLED
- FAILED

---

# ScheduledChange
<a id="db-scheduledchange"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **entityType** `ScheduledChangeEntity`
- **entityId** `String`
- **payload** `Json`
- **applyAt** `DateTime`
- **status** `ScheduledChangeStatus` default="PENDING"
- **createdBy** `String`
- **appliedAt** `DateTime?`
- **appliedBy** `String?`
- **errorMessage** `String?`
- **latencyMs** `Int?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`

