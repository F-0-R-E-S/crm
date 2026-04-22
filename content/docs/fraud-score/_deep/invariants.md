---
audience: ai-deep
block: fraud-score
source: hand
kind: invariants
title: "Invariants — Fraud Score"
---

# Invariants — Fraud Score

> Non-obvious rules, edge cases, and facts that are NOT derivable from code.
> Auto-gen sources cover structure; this file covers **why it must be that way**.

<!-- Add one H2 per invariant. Example:

## Fraud score is never recomputed after intake

- **Rule:** once `Lead.fraudScore` is written, no code path mutates it.
- **Why:** reprocessing would break the hash-chain of `LeadEvent.FRAUD_SCORED`.
- **Failure mode if violated:** audit-chain verification fails on that lead.
-->
