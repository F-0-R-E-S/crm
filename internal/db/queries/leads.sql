-- name: CreateLead :one
INSERT INTO leads (
  company_id, affiliate_id, first_name, last_name, email, phone, phone_raw,
  country, ip, language, funnel_id, click_id,
  sub_id_1, sub_id_2, sub_id_3, sub_id_4, sub_id_5,
  custom_fields, status, idempotency_key, source_api_key
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
RETURNING *;

-- name: GetLead :one
SELECT * FROM leads WHERE id = $1 AND company_id = $2;

-- name: CheckDuplicate :one
SELECT 1 FROM leads
WHERE company_id = $1 AND (email = $2 OR phone = $3)
  AND created_at > now() - interval '30 days'
LIMIT 1;

-- name: UpdateLeadStatus :exec
UPDATE leads SET status = $3, updated_at = now() WHERE id = $1 AND company_id = $2;

-- name: GetLeadUnscoped :one
SELECT * FROM leads WHERE id = $1 LIMIT 1;

-- name: UpdateLeadFraud :exec
UPDATE leads
SET fraud_score = $3, fraud_details = $4, status = $5, updated_at = now()
WHERE id = $1 AND company_id = $2;

-- name: ListLeads :many
SELECT * FROM leads
WHERE company_id = $1
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('affiliate_id')::uuid IS NULL OR affiliate_id = sqlc.narg('affiliate_id'))
  AND (sqlc.narg('country')::char(2) IS NULL OR country = sqlc.narg('country'))
  AND (sqlc.narg('date_from')::timestamptz IS NULL OR created_at >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::timestamptz IS NULL OR created_at <= sqlc.narg('date_to'))
  AND (sqlc.narg('search')::varchar IS NULL OR email ILIKE '%' || sqlc.narg('search') || '%' OR phone ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountLeads :one
SELECT count(*) FROM leads
WHERE company_id = $1
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('affiliate_id')::uuid IS NULL OR affiliate_id = sqlc.narg('affiliate_id'))
  AND (sqlc.narg('country')::char(2) IS NULL OR country = sqlc.narg('country'))
  AND (sqlc.narg('date_from')::timestamptz IS NULL OR created_at >= sqlc.narg('date_from'))
  AND (sqlc.narg('date_to')::timestamptz IS NULL OR created_at <= sqlc.narg('date_to'))
  AND (sqlc.narg('search')::varchar IS NULL OR email ILIKE '%' || sqlc.narg('search') || '%' OR phone ILIKE '%' || sqlc.narg('search') || '%');
