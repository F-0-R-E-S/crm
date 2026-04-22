---
audience: ai-deep
block: fraud-score
source: auto-gen
kind: prisma
title: "DB Schema — fraud-score"
---
# FraudPolicy
<a id="db-fraudpolicy"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **name** `String` unique default="global"
- **weightBlacklist** `Int` default=40
- **weightGeoMismatch** `Int` default=15
- **weightVoip** `Int` default=20
- **weightDedupHit** `Int` default=10
- **weightPatternHit** `Int` default=15
- **autoRejectThreshold** `Int` default=80
- **borderlineMin** `Int` default=60
- **version** `Int` default=1
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`

