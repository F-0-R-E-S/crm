---
audience: ai-deep
block: conversions-crg
source: auto-gen
kind: prisma
title: "DB Schema — conversions-crg"
---
# AffiliateInvoice
<a id="db-affiliateinvoice"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **affiliateId** `String`
- **brokerInvoiceId** `String?` unique
- **periodStart** `DateTime`
- **periodEnd** `DateTime`
- **amount** `Decimal`
- **currency** `String` default="USD"
- **lineItems** `Json` default="[]"
- **status** `InvoiceStatus` default="DRAFT"
- **sentAt** `DateTime?`
- **paidAt** `DateTime?`
- **notes** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **brokerInvoice** `BrokerInvoice?` relation→AffiliateInvoiceToBrokerInvoice

**Unique indexes:**
- (affiliateId, periodStart, periodEnd)

---

# AffiliatePayoutRule
<a id="db-affiliatepayoutrule"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **affiliateId** `String`
- **brokerId** `String?`
- **kind** `PayoutRuleKind`
- **cpaAmount** `Decimal?`
- **crgRate** `Decimal?`
- **revShareRate** `Decimal?`
- **currency** `String` default="USD"
- **activeFrom** `DateTime`
- **activeTo** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **affiliate** `Affiliate` relation→AffiliateToAffiliatePayoutRule

---

# BrokerInvoice
<a id="db-brokerinvoice"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **brokerId** `String`
- **periodStart** `DateTime`
- **periodEnd** `DateTime`
- **amount** `Decimal`
- **currency** `String` default="USD"
- **lineItems** `Json` default="[]"
- **status** `InvoiceStatus` default="DRAFT"
- **sentAt** `DateTime?`
- **paidAt** `DateTime?`
- **notes** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **affiliateInvoice** `AffiliateInvoice?` relation→AffiliateInvoiceToBrokerInvoice

**Unique indexes:**
- (brokerId, periodStart, periodEnd)

---

# BrokerPayoutRule
<a id="db-brokerpayoutrule"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **brokerId** `String`
- **kind** `PayoutRuleKind`
- **cpaAmount** `Decimal?`
- **crgRate** `Decimal?`
- **revShareRate** `Decimal?`
- **minQualifiedDeposit** `Decimal?`
- **currency** `String` default="USD"
- **activeFrom** `DateTime`
- **activeTo** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **broker** `Broker` relation→BrokerToBrokerPayoutRule

---

# Conversion
<a id="db-conversion"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **leadId** `String`
- **kind** `ConversionKind`
- **amount** `Decimal`
- **currency** `String` default="USD"
- **occurredAt** `DateTime`
- **brokerReportedAt** `DateTime`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **lead** `Lead` relation→ConversionToLead

---

# CRGCohort
<a id="db-crgcohort"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **brokerId** `String`
- **cohortStart** `DateTime`
- **cohortEnd** `DateTime`
- **cohortSize** `Int` default=0
- **ftdCount** `Int` default=0
- **ftdRate** `Decimal?`
- **status** `CRGCohortStatus` default="PENDING"
- **shortfallAmount** `Decimal?`
- **guaranteedRate** `Decimal?`
- **settledAt** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`

**Unique indexes:**
- (brokerId, cohortStart, cohortEnd)

---

# enum ConversionKind
<a id="db-enum-conversionkind"></a>

Enum referenced by one or more models.

- REGISTRATION
- FTD
- REDEPOSIT

---

# enum CRGCohortStatus
<a id="db-enum-crgcohortstatus"></a>

Enum referenced by one or more models.

- PENDING
- MET
- SHORTFALL

---

# enum InvoiceStatus
<a id="db-enum-invoicestatus"></a>

Enum referenced by one or more models.

- DRAFT
- SENT
- PAID

---

# enum PayoutRuleKind
<a id="db-enum-payoutrulekind"></a>

Enum referenced by one or more models.

- CPA_FIXED
- CPA_CRG
- REV_SHARE
- HYBRID

