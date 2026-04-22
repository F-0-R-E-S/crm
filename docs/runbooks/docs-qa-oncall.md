# Docs Q&A — oncall runbook

## Surfaces
- Widget on every `/docs/*` page (Alt+K).
- Full chat at `/docs/ai`.

## Dependencies
- **Ollama GPU server** — see `docs/runbooks/ollama-ops.md` (pending plan #6 task 1).
- **Postgres** — `DocChunk` and `DocAskEvent` tables (pending plan #4 task 1 + plan #6 task 5).
- **Redis** — rate limiter bucket `docs:ask:<ip>`.

## Failure modes

| Symptom                                              | Likely cause                             | Fix |
|:-----------------------------------------------------|:-----------------------------------------|:----|
| Every answer says "I don't have enough context"      | `DocChunk` table empty / indexer stale   | Run `pnpm docs:index` locally or trigger `docs-reindex` job manually. |
| 500 from `/api/docs/ask`                             | Ollama down / OLLAMA_BASE_URL wrong      | Check `fly logs -a gambchamp-ollama`. If GPU OOM → `fly restart`. |
| 401 from Ollama                                      | Token drift between apps                 | Re-sync `OLLAMA_AUTH_TOKEN` between `gambchamp-ollama` and `crm-node`. |
| Answers are slow (>15 s)                             | Cold model / multiple concurrent asks    | Check `OLLAMA_NUM_PARALLEL` and GPU utilization. Raise parallel to 8 if VRAM allows. |
| Off-policy answers (invents facts)                   | System-prompt regression                 | Pin prior `DOCS_LLM_SYSTEM_PROMPT_VERSION`. Compare with eval set. |

## Telemetry queries

Recent refusal rate:

```sql
SELECT date_trunc('hour', "createdAt") AS hr, COUNT(*) FILTER (WHERE refused) AS refused, COUNT(*) AS total
FROM "DocAskEvent"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY 1 ORDER BY 1 DESC;
```

P95 latency (ms):

```sql
SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95
FROM "DocAskEvent" WHERE "createdAt" > NOW() - INTERVAL '24 hours';
```

## Running the eval

```bash
RUN_EVAL=1 OLLAMA_BASE_URL=https://gambchamp-ollama.fly.dev \
  OLLAMA_AUTH_TOKEN=<token> pnpm dev &
RUN_EVAL=1 pnpm vitest run tests/eval/docs-qa-eval.test.ts
```

Target: 18/20 pass.
