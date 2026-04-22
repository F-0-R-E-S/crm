---
audience: ai-deep
block: postback-status-groups
source: auto-gen
kind: prisma
title: "DB Schema — postback-status-groups"
---
# CanonicalStatus
<a id="db-canonicalstatus"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **code** `String` unique
- **label** `String`
- **description** `String?`
- **category** `StatusCategory`
- **sortOrder** `Int` default=100
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **mappings** `StatusMapping[]` relation→CanonicalStatusToStatusMapping

---

# enum StatusCategory
<a id="db-enum-statuscategory"></a>

Enum referenced by one or more models.

- NEW
- QUALIFIED
- REJECTED
- CONVERTED

---

# StatusMapping
<a id="db-statusmapping"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **brokerId** `String`
- **rawStatus** `String`
- **canonicalStatusId** `String`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **updatedBy** `String?`
- **canonicalStatus** `CanonicalStatus` relation→CanonicalStatusToStatusMapping

**Unique indexes:**
- (brokerId, rawStatus)

