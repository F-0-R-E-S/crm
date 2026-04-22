---
audience: ai-deep
block: intake
source: auto-gen
kind: rest
title: "REST Surface — intake"
---
# GET /api/v1/errors
<a id="rest-get--api-v1-errors"></a>

Error + sandbox-outcome catalog


**Responses**
```yaml
"200":
  description: catalog
```

---

# GET /api/v1/leads/bulk/{jobId}
<a id="rest-get--api-v1-leads-bulk--jobid-"></a>

Get bulk job status


**Responses**
```yaml
"200":
  description: current status
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/BulkJobStatus"
```

---

# GET /api/v1/schema/leads
<a id="rest-get--api-v1-schema-leads"></a>

Discover the JSON schema for a schema version


**Responses**
```yaml
"200":
  description: schema document
```

---

# POST /api/v1/leads
<a id="rest-post--api-v1-leads"></a>

Submit a single lead


**Request body**
```yaml
required: true
content:
  application/json:
    schema:
      $ref: "#/components/schemas/LeadCreate"
```


**Responses**
```yaml
"202":
  description: Accepted; async processing
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/LeadAcceptedResponse"
"401":
  description: invalid api key
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Error"
"403":
  description: ip not allowed or sandbox mismatch
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Error"
"409":
  description: idempotency conflict
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Error"
"422":
  description: validation error or fraud auto-reject
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Error"
```

---

# POST /api/v1/leads/bulk
<a id="rest-post--api-v1-leads-bulk"></a>

Submit a batch of leads (sync ≤50, async >50)


**Request body**
```yaml
required: true
content:
  application/json:
    schema:
      $ref: "#/components/schemas/BulkLeadsRequest"
```


**Responses**
```yaml
"202":
  description: queued async job — returns job_id
"207":
  description: multi-status — per-lead results for sync batches
```

