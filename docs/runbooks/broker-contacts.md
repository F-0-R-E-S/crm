# Broker Vendor Contacts

Populate this table for each broker integration before launch. Keep sorted by active-broker priority.

| Broker Template | Primary Contact | Email | Telegram | Escalation Path | Support Hours (UTC) |
|-----------------|-----------------|-------|----------|------------------|---------------------|
| OctaFX-style    | TBD             | TBD   | TBD      | email → phone → founder | 00–24 |
| IQOption-style  | TBD             | TBD   | TBD      | email → phone → founder | 07–22 |
| Plus500-style   | TBD             | TBD   | TBD      | email → phone → founder | 00–24 |
| Exness-style    | TBD             | TBD   | TBD      | email → phone → founder | 00–24 |
| Binance-style   | TBD             | TBD   | TBD      | email → ticket portal   | 00–24 |
| Kraken-style    | TBD             | TBD   | TBD      | email → phone           | 06–22 |
| Bitfinex-style  | TBD             | TBD   | TBD      | email                   | 09–18 |
| eToro-style     | TBD             | TBD   | TBD      | email → phone           | 00–24 |
| Pepperstone-style | TBD           | TBD   | TBD      | email → phone           | 00–24 |
| XM-style        | TBD             | TBD   | TBD      | email → Telegram        | 00–24 |

**Protocol:**
1. Open with `GET /health` or the broker's status endpoint to confirm issue is vendor-side.
2. Attach: 3 × `BrokerErrorSample` rows with request + response, affected window, impacted lead count.
3. If no response in 30 min on critical → escalate per path.
4. Document outcome in `docs/v1-bug-triage.md` + update this table with any new escalation learnings.
