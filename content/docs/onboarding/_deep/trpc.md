---
audience: ai-deep
block: onboarding
source: auto-gen
kind: trpc
title: "tRPC Surface — onboarding"
---
# onboarding.adminMetrics
<a id="trpc-onboarding-adminmetrics"></a>

Procedure `onboarding.adminMetrics` — authn: protected, kind: query.

input: —

Source: `src/server/routers/onboarding.ts`

---

# onboarding.complete
<a id="trpc-onboarding-complete"></a>

Procedure `onboarding.complete` — authn: protected, kind: mutation.

input: —

Source: `src/server/routers/onboarding.ts`

---

# onboarding.createAffiliateWithKey
<a id="trpc-onboarding-createaffiliatewithkey"></a>

Procedure `onboarding.createAffiliateWithKey` — authn: protected, kind: mutation.

input: z.object({
        name: z.string().min(2).max(80),
        contactEmail: z.string().email(),
      }),

Source: `src/server/routers/onboarding.ts`

---

# onboarding.createBrokerFromWizard
<a id="trpc-onboarding-createbrokerfromwizard"></a>

Procedure `onboarding.createBrokerFromWizard` — authn: protected, kind: mutation.

input: z.object({…

Source: `src/server/routers/onboarding.ts`

---

# onboarding.getProgress
<a id="trpc-onboarding-getprogress"></a>

Procedure `onboarding.getProgress` — authn: protected, kind: query.

input: —

Source: `src/server/routers/onboarding.ts`

---

# onboarding.goLive
<a id="trpc-onboarding-golive"></a>

Procedure `onboarding.goLive` — authn: protected, kind: mutation.

input: —

Source: `src/server/routers/onboarding.ts`

---

# onboarding.healthCheckBroker
<a id="trpc-onboarding-healthcheckbroker"></a>

Procedure `onboarding.healthCheckBroker` — authn: protected, kind: mutation.

input: z.object({
        url: z.string().url(),
        method: z.enum(["GET", "POST"]).default("POST"),
      }),

Source: `src/server/routers/onboarding.ts`

---

# onboarding.saveStep
<a id="trpc-onboarding-savestep"></a>

Procedure `onboarding.saveStep` — authn: protected, kind: mutation.

input: z.object({
        step: z.number().int().min(1).max(5),
        data: z.record(z.unknown()).optional(),
      }),

Source: `src/server/routers/onboarding.ts`

---

# onboarding.updateOrg
<a id="trpc-onboarding-updateorg"></a>

Procedure `onboarding.updateOrg` — authn: protected, kind: mutation.

input: z.object({…

Source: `src/server/routers/onboarding.ts`

