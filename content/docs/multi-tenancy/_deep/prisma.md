---
audience: ai-deep
block: multi-tenancy
source: auto-gen
kind: prisma
title: "DB Schema — multi-tenancy"
---
# Tenant
<a id="db-tenant"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **slug** `String` unique
- **name** `String`
- **displayName** `String`
- **domains** `String[]` default=[]
- **theme** `Json` default="{}"
- **featureFlags** `Json` default="{}"
- **adminAllowedIps** `String[]` default=[]
- **isActive** `Boolean` default=true
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **subscription** `Subscription?` relation→SubscriptionToTenant
- **paymentMethods** `PaymentMethod[]` relation→PaymentMethodToTenant
- **invoices** `Invoice[]` relation→InvoiceToTenant

