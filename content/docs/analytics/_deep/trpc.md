---
audience: ai-deep
block: analytics
source: auto-gen
kind: trpc
title: "tRPC Surface — analytics"
---
# analytics.canonicalStatusBreakdown
<a id="trpc-analytics-canonicalstatusbreakdown"></a>

Procedure `analytics.canonicalStatusBreakdown` — authn: protected, kind: query.

input: AnalyticsParams

Source: `src/server/routers/analytics.ts`

---

# analytics.conversionBreakdown
<a id="trpc-analytics-conversionbreakdown"></a>

Procedure `analytics.conversionBreakdown` — authn: protected, kind: query.

input: AnalyticsParams

Source: `src/server/routers/analytics.ts`

---

# analytics.deletePreset
<a id="trpc-analytics-deletepreset"></a>

Procedure `analytics.deletePreset` — authn: protected, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/analytics.ts`

---

# analytics.drillDown
<a id="trpc-analytics-drilldown"></a>

Procedure `analytics.drillDown` — authn: protected, kind: query.

input: z.discriminatedUnion("kind", […

Source: `src/server/routers/analytics.ts`

---

# analytics.getDefaultPreset
<a id="trpc-analytics-getdefaultpreset"></a>

Procedure `analytics.getDefaultPreset` — authn: protected, kind: query.

input: —

Source: `src/server/routers/analytics.ts`

---

# analytics.listPresets
<a id="trpc-analytics-listpresets"></a>

Procedure `analytics.listPresets` — authn: protected, kind: query.

input: —

Source: `src/server/routers/analytics.ts`

---

# analytics.metricSeries
<a id="trpc-analytics-metricseries"></a>

Procedure `analytics.metricSeries` — authn: protected, kind: query.

input: AnalyticsParams

Source: `src/server/routers/analytics.ts`

---

# analytics.rejectBreakdown
<a id="trpc-analytics-rejectbreakdown"></a>

Procedure `analytics.rejectBreakdown` — authn: protected, kind: query.

input: AnalyticsParams

Source: `src/server/routers/analytics.ts`

---

# analytics.renamePreset
<a id="trpc-analytics-renamepreset"></a>

Procedure `analytics.renamePreset` — authn: protected, kind: mutation.

input: z.object({ id: z.string(), name: z.string().min(1).max(64) })

Source: `src/server/routers/analytics.ts`

---

# analytics.revenueBreakdown
<a id="trpc-analytics-revenuebreakdown"></a>

Procedure `analytics.revenueBreakdown` — authn: protected, kind: query.

input: AnalyticsParams

Source: `src/server/routers/analytics.ts`

---

# analytics.savePreset
<a id="trpc-analytics-savepreset"></a>

Procedure `analytics.savePreset` — authn: protected, kind: mutation.

input: z.object({ name: z.string().min(1).max(64), query: z.unknown() })

Source: `src/server/routers/analytics.ts`

---

# analytics.setDefaultPreset
<a id="trpc-analytics-setdefaultpreset"></a>

Procedure `analytics.setDefaultPreset` — authn: protected, kind: mutation.

input: z.object({ id: z.string().nullable() })

Source: `src/server/routers/analytics.ts`

