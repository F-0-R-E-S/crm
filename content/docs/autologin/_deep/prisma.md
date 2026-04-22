---
audience: ai-deep
block: autologin
source: auto-gen
kind: prisma
title: "DB Schema — autologin"
---
# AutologinAttempt
<a id="db-autologinattempt"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **leadId** `String`
- **brokerId** `String`
- **proxyEndpointId** `String?`
- **stage** `AutologinStage` default="INITIATING"
- **status** `AutologinStatus` default="RUNNING"
- **startedAt** `DateTime` default={"name":"now","args":[]}
- **completedAt** `DateTime?`
- **durationMs** `Int?`
- **errorMessage** `String?`
- **errorStage** `AutologinStage?`
- **captchaUsed** `Boolean` default=false
- **sessionTokenRef** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **lead** `Lead` relation→AutologinAttemptToLead
- **broker** `Broker` relation→AutologinAttemptToBroker
- **proxyEndpoint** `ProxyEndpoint?` relation→AutologinAttemptToProxyEndpoint

---

# enum AutologinStage
<a id="db-enum-autologinstage"></a>

Enum referenced by one or more models.

- INITIATING
- CAPTCHA
- AUTHENTICATING
- SESSION_READY

---

# enum AutologinStatus
<a id="db-enum-autologinstatus"></a>

Enum referenced by one or more models.

- RUNNING
- SUCCEEDED
- FAILED

---

# ProxyEndpoint
<a id="db-proxyendpoint"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **label** `String`
- **provider** `String` default="brightdata"
- **host** `String`
- **port** `Int`
- **username** `String`
- **password** `String`
- **country** `String?`
- **isActive** `Boolean` default=true
- **lastHealthStatus** `String` default="unknown"
- **lastLatencyMs** `Int?`
- **lastCheckedAt** `DateTime?`
- **consecutiveFails** `Int` default=0
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **attempts** `AutologinAttempt[]` relation→AutologinAttemptToProxyEndpoint

