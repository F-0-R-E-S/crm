---
audience: ai-deep
block: auth-rbac
source: auto-gen
kind: prisma
title: "DB Schema — auth-rbac"
---
# enum UserRole
<a id="db-enum-userrole"></a>

Enum referenced by one or more models.

- SUPER_ADMIN
- ADMIN
- OPERATOR
- AFFILIATE_VIEWER
- BROKER_VIEWER

---

# User
<a id="db-user"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` default="tenant_default"
- **email** `String` unique
- **passwordHash** `String`
- **role** `UserRole` default="OPERATOR"
- **orgId** `String?`
- **emailVerifiedAt** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **org** `Org?` relation→OrgUsers
- **auditLogs** `AuditLog[]` relation→AuditLogToUser
- **manualClaims** `ManualReviewQueue[]` relation→ManualReviewClaimer
- **manualResolves** `ManualReviewQueue[]` relation→ManualReviewResolver
- **telegramSubscriptions** `TelegramSubscription[]` relation→TelegramSubscriptionToUser

