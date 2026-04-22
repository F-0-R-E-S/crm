---
audience: ai-deep
block: routing-engine
source: auto-gen
kind: rest
title: "REST Surface — routing-engine"
---
# GET /api/v1/routing/caps/{flowId}
<a id="rest-get--api-v1-routing-caps--flowid-"></a>

Handler: `src/app/api/v1/routing/caps/[flowId]/route.ts`

---

# GET /api/v1/routing/flows
<a id="rest-get--api-v1-routing-flows"></a>

Handler: `src/app/api/v1/routing/flows/route.ts`

---

# GET /api/v1/routing/flows/{flowId}
<a id="rest-get--api-v1-routing-flows--flowid-"></a>

Handler: `src/app/api/v1/routing/flows/[flowId]/route.ts`

---

# GET /api/v1/routing/simulate/{jobId}
<a id="rest-get--api-v1-routing-simulate--jobid-"></a>

Get routing simulate job result


**Responses**
```yaml
"200":
  description: results
```

---

# POST /api/v1/routing/flows
<a id="rest-post--api-v1-routing-flows"></a>

Handler: `src/app/api/v1/routing/flows/route.ts`

---

# POST /api/v1/routing/flows/{flowId}/archive
<a id="rest-post--api-v1-routing-flows--flowid--archive"></a>

Handler: `src/app/api/v1/routing/flows/[flowId]/archive/route.ts`

---

# POST /api/v1/routing/flows/{flowId}/publish
<a id="rest-post--api-v1-routing-flows--flowid--publish"></a>

Handler: `src/app/api/v1/routing/flows/[flowId]/publish/route.ts`

---

# POST /api/v1/routing/simulate
<a id="rest-post--api-v1-routing-simulate"></a>

Dry-run the routing engine for a lead or batch


**Request body**
```yaml
required: true
content:
  application/json:
    schema:
      type: object
      properties:
        flow_id:
          type: string
        lead:
          type: object
          properties:
            affiliate_id:
              type: string
            geo:
              type: string
        leads:
          type: array
          items:
            type: object
```


**Responses**
```yaml
"200":
  description: sync decision (single or small batch)
"202":
  description: queued async batch — returns job_id
```

---

# POST /api/v1/routing/simulate-pool
<a id="rest-post--api-v1-routing-simulate-pool"></a>

Handler: `src/app/api/v1/routing/simulate-pool/route.ts`

---

# PUT /api/v1/routing/caps/{flowId}
<a id="rest-put--api-v1-routing-caps--flowid-"></a>

Handler: `src/app/api/v1/routing/caps/[flowId]/route.ts`

---

# PUT /api/v1/routing/flows/{flowId}
<a id="rest-put--api-v1-routing-flows--flowid-"></a>

Handler: `src/app/api/v1/routing/flows/[flowId]/route.ts`

---

# PUT /api/v1/routing/flows/{flowId}/algorithm
<a id="rest-put--api-v1-routing-flows--flowid--algorithm"></a>

Handler: `src/app/api/v1/routing/flows/[flowId]/algorithm/route.ts`

