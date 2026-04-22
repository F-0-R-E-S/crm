---
audience: ai-deep
block: billing-subscription
source: auto-gen
kind: prisma
title: "DB Schema — billing-subscription"
---
# enum SubscriptionStatus
<a id="db-enum-subscriptionstatus"></a>

Enum referenced by one or more models.

- ACTIVE
- TRIALING
- PAST_DUE
- CANCELED
- UNPAID
- INCOMPLETE

---

# Invoice
<a id="db-invoice"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String`
- **stripeInvoiceId** `String` unique
- **amountCents** `Int`
- **currency** `String` default="usd"
- **status** `String`
- **periodStart** `DateTime`
- **periodEnd** `DateTime`
- **hostedInvoiceUrl** `String?`
- **pdfUrl** `String?`
- **paidAt** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **tenant** `Tenant` relation→InvoiceToTenant

---

# PaymentMethod
<a id="db-paymentmethod"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String`
- **stripePaymentMethodId** `String` unique
- **brand** `String`
- **last4** `String`
- **expMonth** `Int`
- **expYear** `Int`
- **isDefault** `Boolean` default=false
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **tenant** `Tenant` relation→PaymentMethodToTenant

---

# Subscription
<a id="db-subscription"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` unique
- **stripeCustomerId** `String?`
- **stripeSubscriptionId** `String?` unique
- **plan** `String`
- **status** `SubscriptionStatus`
- **currentPeriodStart** `DateTime`
- **currentPeriodEnd** `DateTime`
- **cancelAtPeriodEnd** `Boolean` default=false
- **trialEndsAt** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **tenant** `Tenant` relation→SubscriptionToTenant

