---
audience: ai-deep
block: onboarding
source: auto-gen
kind: prisma
title: "DB Schema — onboarding"
---
# enum OrgPlan
<a id="db-enum-orgplan"></a>

Enum referenced by one or more models.

- TRIAL
- STARTER
- GROWTH
- PRO

---

# OnboardingProgress
<a id="db-onboardingprogress"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **orgId** `String` unique
- **currentStep** `Int` default=1
- **stepData** `Json` default="{}"
- **step1CompletedAt** `DateTime?`
- **step2CompletedAt** `DateTime?`
- **step3CompletedAt** `DateTime?`
- **step4CompletedAt** `DateTime?`
- **step5CompletedAt** `DateTime?`
- **startedAt** `DateTime` default={"name":"now","args":[]}
- **completedAt** `DateTime?`
- **abandonedAt** `DateTime?`
- **durationSeconds** `Int?`
- **org** `Org` relation→OnboardingProgressToOrg

---

# Org
<a id="db-org"></a>

Database-backed model. Source: `prisma/schema.prisma`.

- **id** `String` **id** default={"name":"cuid","args":[]}
- **name** `String`
- **slug** `String` unique
- **timezone** `String` default="UTC"
- **currency** `String` default="USD"
- **plan** `OrgPlan` default="TRIAL"
- **trialStartedAt** `DateTime?`
- **trialEndsAt** `DateTime?`
- **createdById** `String?`
- **createdAt** `DateTime` default={"name":"now","args":[]}
- **updatedAt** `DateTime`
- **users** `User[]` relation→OrgUsers
- **onboardingProgress** `OnboardingProgress?` relation→OnboardingProgressToOrg

