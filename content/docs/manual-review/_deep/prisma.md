---
audience: ai-deep
block: manual-review
source: auto-gen
kind: prisma
title: "DB Schema — manual-review"
---
# enum ManualReviewReason
<a id="db-enum-manualreviewreason"></a>

Enum referenced by one or more models.

- BROKER_FAILED
- CAP_REACHED
- NO_BROKER_MATCH
- FRAUD_BORDERLINE

---

# enum ManualReviewResolution
<a id="db-enum-manualreviewresolution"></a>

Enum referenced by one or more models.

- ACCEPT
- REJECT
- REQUEUE

---

# ManualReviewQueue
<a id="db-manualreviewqueue"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **leadId** `String` unique
- **reason** `ManualReviewReason`
- **lastBrokerId** `String?`
- **lastError** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **claimedBy** `String?`
- **claimedAt** `DateTime?`
- **resolvedBy** `String?`
- **resolvedAt** `DateTime?`
- **resolution** `ManualReviewResolution?`
- **resolutionNote** `String?`
- **lead** `Lead` relation→LeadToManualReviewQueue
- **claimer** `User?` relation→ManualReviewClaimer
- **resolver** `User?` relation→ManualReviewResolver
- **lastBroker** `Broker?` relation→BrokerToManualReviewQueue

