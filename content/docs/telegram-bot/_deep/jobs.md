---
audience: ai-deep
block: telegram-bot
source: auto-gen
kind: jobs
title: "Jobs — telegram-bot"
---
# anomaly-detect
<a id="job-anomaly-detect"></a>

pg-boss job `anomaly-detect`.

schedule: `*/15 * * * *`

Handler: `src/server/jobs/anomaly-detect.ts`

---

# daily-summary
<a id="job-daily-summary"></a>

pg-boss job `daily-summary`.

schedule: `0 9 * * *`

Handler: `src/server/jobs/daily-summary.ts`

---

# telegram-send
<a id="job-telegram-send"></a>

pg-boss job `telegram-send`.

schedule: on-demand (enqueued from code).

Handler: `src/server/jobs/telegram-send.ts`

