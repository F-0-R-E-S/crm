---
audience: ai-deep
block: intake
source: auto-gen
kind: prisma
title: "DB Schema — intake"
---
# Affiliate
<a id="db-affiliate"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` default="tenant_default"
- **name** `String`
- **contactEmail** `String?`
- **isActive** `Boolean` default=true
- **totalDailyCap** `Int?`
- **postbackUrl** `String?`
- **postbackSecret** `String?`
- **postbackEvents** `String[]` default=[]
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **apiKeys** `ApiKey[]` relation→AffiliateToApiKey
- **leads** `Lead[]` relation→AffiliateToLead
- **outboundPostbacks** `OutboundPostback[]` relation→AffiliateToOutboundPostback
- **intakeSettings** `IntakeSettings?` relation→AffiliateToIntakeSettings
- **intakeWebhooks** `AffiliateIntakeWebhook[]` relation→AffiliateToAffiliateIntakeWebhook
- **payoutRules** `AffiliatePayoutRule[]` relation→AffiliateToAffiliatePayoutRule

---

# AffiliateIntakeWebhook
<a id="db-affiliateintakewebhook"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String?`
- **affiliateId** `String`
- **url** `String`
- **secret** `String`
- **events** `String[]` default=[]
- **isActive** `Boolean` default=true
- **pausedAt** `DateTime?`
- **pausedReason** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **affiliate** `Affiliate` relation→AffiliateToAffiliateIntakeWebhook
- **deliveries** `WebhookDelivery[]` relation→AffiliateIntakeWebhookToWebhookDelivery

---

# ApiKey
<a id="db-apikey"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` default="tenant_default"
- **affiliateId** `String`
- **keyHash** `String` unique
- **keyPrefix** `String`
- **label** `String`
- **lastUsedAt** `DateTime?`
- **isRevoked** `Boolean` default=false
- **isSandbox** `Boolean` default=false
- **allowedIps** `String[]` default=[]
- **expiresAt** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **affiliate** `Affiliate` relation→AffiliateToApiKey

---

# enum LeadEventKind
<a id="db-enum-leadeventkind"></a>

Enum referenced by one or more models.

- RECEIVED
- VALIDATION_FAIL
- REJECTED_ANTIFRAUD
- ROUTING_DECIDED
- CAP_BLOCKED
- NO_BROKER_AVAILABLE
- BROKER_PUSH_ATTEMPT
- BROKER_PUSH_SUCCESS
- BROKER_PUSH_FAIL
- POSTBACK_RECEIVED
- STATE_TRANSITION
- MANUAL_OVERRIDE
- OUTBOUND_POSTBACK_SENT
- OUTBOUND_POSTBACK_FAILED
- FLOW_FILTER_REJECT
- FALLBACK_HOP
- SIMULATE_DECISION
- PENDING_HOLD_STARTED
- PENDING_HOLD_RELEASED
- SHAVE_SUSPECTED
- FRAUD_SCORED
- MANUAL_REVIEW_ENQUEUED
- MANUAL_REVIEW_CLAIMED
- MANUAL_REVIEW_RESOLVED
- MANUAL_REVIEW_REQUEUED

---

# enum LeadState
<a id="db-enum-leadstate"></a>

Enum referenced by one or more models.

- NEW
- VALIDATING
- REJECTED
- REJECTED_FRAUD
- PUSHING
- PUSHED
- PENDING_HOLD
- ACCEPTED
- DECLINED
- FTD
- FAILED

---

# IdempotencyKey
<a id="db-idempotencykey"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **key** `String` **id**
- **affiliateId** `String`
- **leadId** `String?`
- **payloadHash** `String` default=""
- **responseCode** `Int`
- **responseBody** `Json`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **expiresAt** `DateTime`

**Unique indexes:**
- (affiliateId, key)

---

# IntakeSettings
<a id="db-intakesettings"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **affiliateId** `String` **id**
- **tenantId** `String?`
- **requiredFields** `String[]` default=[]
- **allowedGeo** `String[]` default=[]
- **dedupeWindowDays** `Int` default=30
- **maxRpm** `Int` default=120
- **acceptSchedule** `Json` default="{}"
- **version** `Int` default=1
- **updatedBy** `String?`
- **updatedAt** `DateTime`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **affiliate** `Affiliate` relation→AffiliateToIntakeSettings

---

# Lead
<a id="db-lead"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **tenantId** `String` default="tenant_default"
- **externalLeadId** `String?`
- **affiliateId** `String`
- **brokerId** `String?`
- **state** `LeadState` default="NEW"
- **rejectReason** `String?`
- **firstName** `String?`
- **lastName** `String?`
- **email** `String?`
- **phone** `String?`
- **phoneHash** `String?`
- **emailHash** `String?`
- **geo** `String`
- **ip** `String`
- **landingUrl** `String?`
- **subId** `String?`
- **utm** `Json` default="{}"
- **normalizationWarnings** `Json` default="[]"
- **rawPayload** `Json` default="{}"
- **eventTs** `DateTime`
- **brokerExternalId** `String?`
- **lastBrokerStatus** `String?`
- **lastPushAt** `DateTime?`
- **acceptedAt** `DateTime?`
- **ftdAt** `DateTime?`
- **pendingHoldUntil** `DateTime?`
- **shaveSuspected** `Boolean` default=false
- **fraudScore** `Int?`
- **fraudSignals** `Json` default="[]"
- **qualityScore** `Int?`
- **qualitySignals** `Json` default="{}"
- **canonicalStatus** `String?`
- **needsReview** `Boolean` default=false
- **traceId** `String` unique
- **receivedAt** `DateTime` default={"name":"now","args":[]}
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **affiliate** `Affiliate` relation→AffiliateToLead
- **broker** `Broker?` relation→BrokerToLead
- **events** `LeadEvent[]` relation→LeadToLeadEvent
- **outboundPostbacks** `OutboundPostback[]` relation→LeadToOutboundPostback
- **autologinAttempts** `AutologinAttempt[]` relation→AutologinAttemptToLead
- **manualReview** `ManualReviewQueue?` relation→LeadToManualReviewQueue
- **conversions** `Conversion[]` relation→ConversionToLead

---

# LeadEvent
<a id="db-leadevent"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **leadId** `String`
- **kind** `LeadEventKind`
- **meta** `Json` default="{}"
- **prevHash** `String?`
- **rowHash** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **lead** `Lead` relation→LeadToLeadEvent

---

# WebhookDelivery
<a id="db-webhookdelivery"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **webhookId** `String`
- **eventType** `String`
- **payload** `Json`
- **signature** `String`
- **attempt** `Int` default=0
- **lastStatus** `Int?`
- **lastError** `String?`
- **nextAttemptAt** `DateTime?`
- **deliveredAt** `DateTime?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **webhook** `AffiliateIntakeWebhook` relation→AffiliateIntakeWebhookToWebhookDelivery

