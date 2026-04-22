---
audience: ai-deep
block: observability
source: auto-gen
kind: rest
title: "REST Surface — observability"
---
# GET /api/v1/health
<a id="rest-get--api-v1-health"></a>

Health check


**Responses**
```yaml
"200":
  description: ok
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Health"
"503":
  description: degraded
```

---

# GET /api/v1/metrics/summary
<a id="rest-get--api-v1-metrics-summary"></a>

60s rolling counters + queue depth (ADMIN session required)


**Responses**
```yaml
"200":
  description: counters
  content:
    application/json:
      schema:
        type: object
        properties:
          window_seconds:
            type: integer
          leads_received:
            type: integer
          leads_pushed:
            type: integer
          fraud_hit:
            type: integer
          broker_down_count:
            type: integer
          manual_queue_depth:
            type: integer
"401":
  description: unauthorized
```

