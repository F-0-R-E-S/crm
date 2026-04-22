---
audience: ai-deep
block: broker-push
source: auto-gen
kind: prisma
title: "DB Schema — broker-push"
---
# Broker
<a id="db-broker"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` default="tenant_default"
- **name** `String`
- **isActive** `Boolean` default=true
- **dailyCap** `Int?`
- **workingHours** `Json?`
- **endpointUrl** `String`
- **httpMethod** `HttpMethod` default="POST"
- **headers** `Json` default="{}"
- **authType** `BrokerAuthType` default="NONE"
- **authConfig** `Json` default="{}"
- **fieldMapping** `Json`
- **staticPayload** `Json` default="{}"
- **responseIdPath** `String?`
- **postbackSecret** `String`
- **postbackLeadIdPath** `String`
- **postbackStatusPath** `String`
- **statusMapping** `Json` default="{}"
- **templateId** `String?`
- **template** `BrokerTemplate?` relation→BrokerToBrokerTemplate
- **syncMode** `String` default="webhook"
- **pollIntervalMin** `Int?`
- **retrySchedule** `String` default="10,60,300,900,3600"
- **pendingHoldMinutes** `Int?`
- **statusPollPath** `String?`
- **statusPollIdsParam** `String?`
- **lastHealthStatus** `String` default="unknown"
- **lastHealthCheckAt** `DateTime?`
- **lastPolledAt** `DateTime?`
- **autologinEnabled** `Boolean` default=false
- **autologinLoginUrl** `String?`
- **clonedFromId** `String?`
- **clonedFrom** `Broker?` relation→BrokerClones
- **clones** `Broker[]` relation→BrokerClones
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **rotationRules** `RotationRule[]` relation→BrokerToRotationRule
- **leads** `Lead[]` relation→BrokerToLead
- **healthChecks** `BrokerHealthCheck[]` relation→BrokerToBrokerHealthCheck
- **errorSamples** `BrokerErrorSample[]` relation→BrokerToBrokerErrorSample
- **autologinAttempts** `AutologinAttempt[]` relation→AutologinAttemptToBroker
- **manualReviewLast** `ManualReviewQueue[]` relation→BrokerToManualReviewQueue
- **payoutRules** `BrokerPayoutRule[]` relation→BrokerToBrokerPayoutRule

---

# BrokerTemplate
<a id="db-brokertemplate"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` default="tenant_default"
- **slug** `String` unique
- **name** `String`
- **vendor** `String`
- **vertical** `String`
- **protocol** `String`
- **status** `String` default="active"
- **countries** `String[]`
- **description** `String?`
- **logoUrl** `String?`
- **docsUrl** `String?`
- **defaultHttpMethod** `HttpMethod` default="POST"
- **defaultHeaders** `Json` default="{}"
- **defaultAuthType** `BrokerAuthType` default="NONE"
- **authConfigSchema** `Json` default="{}"
- **fieldMapping** `Json`
- **requiredFields** `String[]`
- **staticPayload** `Json` default="{}"
- **responseIdPath** `String?`
- **postbackLeadIdPath** `String`
- **postbackStatusPath** `String`
- **statusMapping** `Json`
- **rateLimitPerMin** `Int?`
- **samplePayload** `Json`
- **sampleResponse** `Json?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **brokers** `Broker[]` relation→BrokerToBrokerTemplate

---

# enum BrokerAuthType
<a id="db-enum-brokerauthtype"></a>

Enum referenced by one or more models.

- NONE
- BEARER
- BASIC
- API_KEY_HEADER
- API_KEY_QUERY

---

# enum HttpMethod
<a id="db-enum-httpmethod"></a>

Enum referenced by one or more models.

- POST
- PUT

