-- name: CreateConversion :one
INSERT INTO conversions (
  company_id, lead_id, broker_id, affiliate_id, conversion_type,
  amount, currency, buy_price, sell_price, status,
  broker_transaction_id, external_id, metadata, converted_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *;

-- name: GetConversion :one
SELECT * FROM conversions WHERE id = $1 AND company_id = $2;

-- name: ListConversions :many
SELECT * FROM conversions
WHERE company_id = $1
  AND (sqlc.narg('broker_id')::uuid IS NULL OR broker_id = sqlc.narg('broker_id'))
  AND (sqlc.narg('affiliate_id')::uuid IS NULL OR affiliate_id = sqlc.narg('affiliate_id'))
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('conversion_type')::varchar IS NULL OR conversion_type = sqlc.narg('conversion_type'))
  AND (sqlc.narg('from')::timestamptz IS NULL OR converted_at >= sqlc.narg('from'))
  AND (sqlc.narg('to')::timestamptz IS NULL OR converted_at <= sqlc.narg('to'))
ORDER BY converted_at DESC
LIMIT $2 OFFSET $3;

-- name: CountConversions :one
SELECT count(*) FROM conversions
WHERE company_id = $1
  AND (sqlc.narg('broker_id')::uuid IS NULL OR broker_id = sqlc.narg('broker_id'))
  AND (sqlc.narg('affiliate_id')::uuid IS NULL OR affiliate_id = sqlc.narg('affiliate_id'))
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'));

-- name: UpdateConversionStatus :one
UPDATE conversions SET
  status = $3,
  updated_at = now()
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: MarkConversionFake :one
UPDATE conversions SET
  is_fake = true,
  fake_reason = $3,
  fake_action = $4,
  updated_at = now()
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: GetConversionByBrokerTxn :one
SELECT * FROM conversions
WHERE company_id = $1 AND broker_transaction_id = $2;

-- name: GetPLSummary :many
SELECT
  broker_id,
  affiliate_id,
  count(*) AS conversion_count,
  COALESCE(SUM(buy_price), 0) AS total_buy,
  COALESCE(SUM(sell_price), 0) AS total_sell,
  COALESCE(SUM(sell_price - buy_price), 0) AS total_profit
FROM conversions
WHERE company_id = $1
  AND status = 'confirmed'
  AND (sqlc.narg('from')::timestamptz IS NULL OR converted_at >= sqlc.narg('from'))
  AND (sqlc.narg('to')::timestamptz IS NULL OR converted_at <= sqlc.narg('to'))
GROUP BY broker_id, affiliate_id
ORDER BY total_profit DESC;

-- name: GetPLByBroker :many
SELECT
  broker_id,
  count(*) AS conversion_count,
  COALESCE(SUM(buy_price), 0) AS total_buy,
  COALESCE(SUM(sell_price), 0) AS total_sell,
  COALESCE(SUM(sell_price - buy_price), 0) AS total_profit
FROM conversions
WHERE company_id = $1 AND status = 'confirmed'
  AND (sqlc.narg('from')::timestamptz IS NULL OR converted_at >= sqlc.narg('from'))
  AND (sqlc.narg('to')::timestamptz IS NULL OR converted_at <= sqlc.narg('to'))
GROUP BY broker_id
ORDER BY total_profit DESC;

-- name: GetPLByAffiliate :many
SELECT
  affiliate_id,
  count(*) AS conversion_count,
  COALESCE(SUM(buy_price), 0) AS total_buy,
  COALESCE(SUM(sell_price), 0) AS total_sell,
  COALESCE(SUM(sell_price - buy_price), 0) AS total_profit
FROM conversions
WHERE company_id = $1 AND status = 'confirmed'
  AND (sqlc.narg('from')::timestamptz IS NULL OR converted_at >= sqlc.narg('from'))
  AND (sqlc.narg('to')::timestamptz IS NULL OR converted_at <= sqlc.narg('to'))
GROUP BY affiliate_id
ORDER BY total_profit DESC;

-- name: GetPLByCountry :many
SELECT
  l.country,
  count(*) AS conversion_count,
  COALESCE(SUM(c.buy_price), 0) AS total_buy,
  COALESCE(SUM(c.sell_price), 0) AS total_sell,
  COALESCE(SUM(c.sell_price - c.buy_price), 0) AS total_profit
FROM conversions c
JOIN leads l ON l.id = c.lead_id
WHERE c.company_id = $1 AND c.status = 'confirmed'
  AND (sqlc.narg('from')::timestamptz IS NULL OR c.converted_at >= sqlc.narg('from'))
  AND (sqlc.narg('to')::timestamptz IS NULL OR c.converted_at <= sqlc.narg('to'))
GROUP BY l.country
ORDER BY total_profit DESC;

-- name: UpsertPricingRule :one
INSERT INTO pricing_rules (
  company_id, rule_type, affiliate_id, broker_id, country,
  funnel_name, deal_type, price, currency, priority, effective_from
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: ListPricingRules :many
SELECT * FROM pricing_rules
WHERE company_id = $1
  AND (sqlc.narg('rule_type')::varchar IS NULL OR rule_type = sqlc.narg('rule_type'))
ORDER BY priority DESC, created_at DESC
LIMIT $2 OFFSET $3;

-- name: DeletePricingRule :exec
DELETE FROM pricing_rules WHERE id = $1 AND company_id = $2;

-- name: ResolveBuyPrice :one
SELECT price FROM pricing_rules
WHERE company_id = $1 AND rule_type = 'buy'
  AND (affiliate_id IS NULL OR affiliate_id = sqlc.narg('affiliate_id'))
  AND (country IS NULL OR country = sqlc.narg('country'))
  AND (funnel_name IS NULL OR funnel_name = sqlc.narg('funnel_name'))
  AND (effective_from <= now())
  AND (effective_until IS NULL OR effective_until > now())
ORDER BY priority DESC
LIMIT 1;

-- name: ResolveSellPrice :one
SELECT price FROM pricing_rules
WHERE company_id = $1 AND rule_type = 'sell'
  AND (broker_id IS NULL OR broker_id = sqlc.narg('broker_id'))
  AND (country IS NULL OR country = sqlc.narg('country'))
  AND (deal_type IS NULL OR deal_type = sqlc.narg('deal_type'))
  AND (effective_from <= now())
  AND (effective_until IS NULL OR effective_until > now())
ORDER BY priority DESC
LIMIT 1;

-- name: GetBrokerWallet :one
SELECT * FROM broker_wallets WHERE company_id = $1 AND broker_id = $2;

-- name: UpsertBrokerWallet :one
INSERT INTO broker_wallets (company_id, broker_id, currency, alert_threshold)
VALUES ($1, $2, $3, $4)
ON CONFLICT (company_id, broker_id) DO UPDATE SET
  alert_threshold = EXCLUDED.alert_threshold,
  updated_at = now()
RETURNING *;

-- name: UpdateWalletBalance :exec
UPDATE broker_wallets SET
  balance = balance + $3,
  updated_at = now()
WHERE company_id = $1 AND broker_id = $2;

-- name: CreateWalletTransaction :one
INSERT INTO wallet_transactions (wallet_id, company_id, txn_type, amount, description, reference_id, reference_type, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListWalletTransactions :many
SELECT * FROM wallet_transactions
WHERE wallet_id = $1 AND company_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CreateAffiliatePayout :one
INSERT INTO affiliate_payouts (company_id, affiliate_id, amount, currency, payment_method, status, period_from, period_to, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListAffiliatePayouts :many
SELECT * FROM affiliate_payouts
WHERE company_id = $1
  AND (sqlc.narg('affiliate_id')::uuid IS NULL OR affiliate_id = sqlc.narg('affiliate_id'))
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdatePayoutStatus :one
UPDATE affiliate_payouts SET
  status = $3,
  approved_by = sqlc.narg('approved_by'),
  approved_at = CASE WHEN $3 = 'approved' THEN now() ELSE approved_at END,
  paid_at = CASE WHEN $3 = 'paid' THEN now() ELSE paid_at END,
  updated_at = now()
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: GetAffiliateAccruedAmount :one
SELECT COALESCE(SUM(buy_price), 0) AS accrued
FROM conversions
WHERE company_id = $1 AND affiliate_id = $2 AND status = 'confirmed';

-- name: GetAffiliatePaidAmount :one
SELECT COALESCE(SUM(amount), 0) AS paid
FROM affiliate_payouts
WHERE company_id = $1 AND affiliate_id = $2 AND status = 'paid';
