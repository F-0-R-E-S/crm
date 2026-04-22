---
audience: ai-deep
block: routing-engine
source: auto-gen
kind: prisma
title: "DB Schema — routing-engine"
---
# CapCounter
<a id="db-capcounter"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **scope** `CapScope`
- **scopeId** `String`
- **window** `CapWindow`
- **bucketKey** `String`
- **country** `String` default=""
- **count** `Int` default=0
- **resetsAt** `DateTime`

**Unique indexes:**
- (scope, scopeId, window, bucketKey, country)

---

# CapCountryLimit
<a id="db-capcountrylimit"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **capDefId** `String`
- **country** `String`
- **limit** `Int`
- **capDefinition** `CapDefinition` relation→CapCountryLimitToCapDefinition

**Unique indexes:**
- (capDefId, country)

---

# CapDefinition
<a id="db-capdefinition"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **flowVersionId** `String`
- **scope** `CapScope`
- **scopeRefId** `String`
- **window** `CapWindow`
- **limit** `Int`
- **timezone** `String` default="UTC"
- **perCountry** `Boolean` default=false
- **flowVersion** `FlowVersion` relation→CapDefinitionToFlowVersion
- **countryLimits** `CapCountryLimit[]` relation→CapCountryLimitToCapDefinition

**Unique indexes:**
- (flowVersionId, scope, scopeRefId, window)

---

# enum AlgorithmMode
<a id="db-enum-algorithmmode"></a>

Enum referenced by one or more models.

- WEIGHTED_ROUND_ROBIN
- SLOTS_CHANCE

---

# enum AlgorithmScope
<a id="db-enum-algorithmscope"></a>

Enum referenced by one or more models.

- FLOW
- BRANCH

---

# enum CapWindow
<a id="db-enum-capwindow"></a>

Enum referenced by one or more models.

- HOURLY
- DAILY
- WEEKLY

---

# enum FlowStatus
<a id="db-enum-flowstatus"></a>

Enum referenced by one or more models.

- DRAFT
- PUBLISHED
- ARCHIVED

---

# FallbackStep
<a id="db-fallbackstep"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **flowVersionId** `String`
- **fromNodeId** `String`
- **toNodeId** `String`
- **hopOrder** `Int`
- **triggers** `Json` default="{}"
- **flowVersion** `FlowVersion` relation→FallbackStepToFlowVersion

**Unique indexes:**
- (flowVersionId, fromNodeId, hopOrder)

---

# Flow
<a id="db-flow"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **name** `String`
- **timezone** `String` default="UTC"
- **status** `FlowStatus` default="DRAFT"
- **activeVersionId** `String?` unique
- **archivedAt** `DateTime?`
- **createdBy** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **versions** `FlowVersion[]` relation→FlowVersions
- **activeVersion** `FlowVersion?` relation→FlowActiveVersion

---

# FlowAlgorithmConfig
<a id="db-flowalgorithmconfig"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **flowVersionId** `String`
- **scope** `AlgorithmScope`
- **scopeRefId** `String?`
- **mode** `AlgorithmMode`
- **params** `Json` default="{}"
- **flowVersion** `FlowVersion` relation→FlowAlgorithmConfigToFlowVersion

**Unique indexes:**
- (flowVersionId, scope, scopeRefId)

---

# FlowBranch
<a id="db-flowbranch"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **flowVersionId** `String`
- **nodeId** `String`
- **name** `String`
- **filters** `Json` default="{}"
- **algorithmOverride** `Json?`
- **order** `Int` default=0
- **flowVersion** `FlowVersion` relation→FlowBranchToFlowVersion

**Unique indexes:**
- (flowVersionId, nodeId)

---

# FlowVersion
<a id="db-flowversion"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **flowId** `String`
- **versionNumber** `Int`
- **graph** `Json`
- **algorithm** `Json`
- **entryFilters** `Json` default="{}"
- **fallbackPolicy** `Json` default="{}"
- **publishedAt** `DateTime?`
- **publishedBy** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **flow** `Flow` relation→FlowVersions
- **activeFor** `Flow?` relation→FlowActiveVersion
- **branches** `FlowBranch[]` relation→FlowBranchToFlowVersion
- **fallbackSteps** `FallbackStep[]` relation→FallbackStepToFlowVersion
- **capDefs** `CapDefinition[]` relation→CapDefinitionToFlowVersion
- **algoConfigs** `FlowAlgorithmConfig[]` relation→FlowAlgorithmConfigToFlowVersion

**Unique indexes:**
- (flowId, versionNumber)

---

# RotationRule
<a id="db-rotationrule"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **geo** `String`
- **brokerId** `String`
- **priority** `Int`
- **isActive** `Boolean` default=true
- **broker** `Broker` relation→BrokerToRotationRule

**Unique indexes:**
- (geo, brokerId)

