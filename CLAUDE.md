# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A **Product Research & PRD workspace** for **GambChamp CRM** — a lead distribution platform for crypto/forex affiliate marketing. The repo contains:

1. A video processing pipeline (`video_pipeline.py`) that converts competitor demo recordings into structured competitor analysis
2. The output of that pipeline — processed competitor data for 6 competitors
3. A complete product backlog and release plan derived from that analysis

This is a **product/research repo**, not a software product repo. There is no backend, frontend, or test suite to run.

---

## Pipeline: `video_pipeline.py`

The core tool. Processes competitor demo videos end-to-end.

**Prerequisites:**
```bash
pip3 install Pillow imagehash
# ffmpeg must be in PATH
# whisper-cpp binary must be in PATH as `whisper-cli`
# whisper model at ~/.cache/whisper-cpp/ggml-small.bin
# Claude Code CLI must be in PATH as `claude`
```

**Run all videos in `./videos/`:**
```bash
python3 video_pipeline.py
```

**Common flags:**
```bash
python3 video_pipeline.py --single videos/demo.mp4        # one video
python3 video_pipeline.py --skip-existing                  # skip already processed
python3 video_pipeline.py --no-research                    # skip Tavily web research (stage 6)
python3 video_pipeline.py --no-prd                         # skip PRD generation (stage 7)
python3 video_pipeline.py --whisper-lang ru                # force language
python3 video_pipeline.py --interval 2.5 --threshold 5    # frame extraction tuning
python3 video_pipeline.py --max-turns 20                   # Claude CLI turns per stage
```

**Pipeline stages (in order):**
1. Frame extraction via `ffmpeg`
2. Frame deduplication via perceptual hashing (`imagehash`)
3. Audio transcription via `whisper-cpp` (fully local)
4. Frame ↔ transcript segment mapping
5. Competitor analysis via `claude` CLI (reads screenshots + transcript)
6. Company web research via `claude` CLI + Tavily MCP
7. PRD generation via `claude` CLI

Each stage writes to `./Transcript_videos/<video_stem>/`. Re-runs are idempotent if `--skip-existing` is passed.

---

## Repository structure

```
videos/                          Raw competitor demo videos (.mp4, .mov)
Transcript_videos/               Pipeline output — one folder per competitor
  <CompetitorName>/
    frames/                      Deduplicated screenshots (JPG)
    transcript/                  Raw whisper segments (JSON, CSV)
    transcript.txt               Full transcript text
    manifest.json                Pipeline run metadata
    overview.json                High-level product summary (stage 0)
    competitor_analysis.json     Full structured analysis (stage 5)
    analysis.json                Alternative naming used by some runs
    analysis_web.json            Web enrichment data (stage 6)
    enrichment_stage*.log        Per-stage Claude CLI logs

product_backlog/                 Structured backlog (output of stage 7 + manual work)
  PRODUCT_BACKLOG_v1.md          23 epics, 127 stories, ~3,458 task-hours
  RELEASE_PLAN_SPRINTS_v1.md     24 x 2-week sprints (Mar 2026 – Feb 2027)
  epic-01-lead-intake-api.md     Detailed epic files
  epic-02-lead-routing-engine.md
  epics-03-07-p0.md              Grouped epic files
  epics-08-13-p1.md
  epics-14-19-p2.md
  epics-20-23-p3.md
  generate_jira_csv.py           Generates jira_import_all_issues.csv from backlog
  jira_import_all_issues.csv     Ready-to-import Jira CSV
  jira_import_readme.md          Jira CSV field mapping guide
  prompt_stage4_product_backlog.md  The Claude prompt used to generate the backlog

PRODUCT_BACKLOG_v1.md            Root-level copy (1MB, most complete version)
strategic_analysis_report.md     Competitor comparison report (4 competitors)
```

---

## Processed competitors

| Folder | Product | Notes |
|--------|---------|-------|
| `CRM_Mate` | CRM Mate | Full analysis |
| `Elnopy` | Elnopy | Full analysis |
| `GetLinked` | GetLinked | Has `overview.json`; not yet in `strategic_analysis_report.md` |
| `HyperOne` | HyperOne | Full analysis |
| `Leadgreed` | Leadgreed | Full analysis |
| `trackbox` | Trackbox | Has `overview.json`; newest — not yet in backlog or report |

**`strategic_analysis_report.md` covers only 4 competitors** (Leadgreed, Elnopy, HyperOne, CRM Mate). GetLinked and Trackbox are processed but not yet incorporated.

---

## Product context

**GambChamp CRM** is a B2B SaaS lead distribution platform. Core flow:
- Affiliate sends lead via REST API → routing engine → broker integration → status callbacks → analytics

Key differentiation strategy (from `strategic_analysis_report.md`):
- Price point: $399–$899/mo (vs market $200–$1,499)
- 15-min support SLA, transparent public pricing
- Built-in cloaking (only CRM Mate has this today)
- Guaranteed autologin SLA, 4D anti-fraud + transparency
- Telegram-first operations (17+ event types)

**Backlog priorities:**
- P0 MVP (Q1): EPIC-01..07 — Lead Intake, Routing, Broker Integration, Affiliate Mgmt, Lead UI, RBAC, Anti-Fraud
- P1 Launch (Q2): EPIC-08..13 — Autologin, UAD, Analytics, Notifications, P&L, Onboarding
- P2 Growth (Q3): EPIC-14..19 — BI, Mobile, Marketplace, AI Routing, Shave Detection, Public API
- P3 Scale (Q4): EPIC-20..23 — White-Label, Billing, Compliance, AI Fraud

## Jira import

```bash
cd product_backlog
python3 generate_jira_csv.py     # regenerates jira_import_all_issues.csv
```

See `jira_import_readme.md` for field mapping between CSV columns and Jira fields.
