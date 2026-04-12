-- name: UpsertBrokerOpeningHours :one
INSERT INTO broker_opening_hours (broker_id, company_id, day_of_week, open_time, close_time, timezone, is_enabled)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (broker_id, day_of_week) DO UPDATE SET
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  timezone = EXCLUDED.timezone,
  is_enabled = EXCLUDED.is_enabled
RETURNING *;

-- name: GetBrokerOpeningHours :many
SELECT * FROM broker_opening_hours
WHERE broker_id = $1 AND company_id = $2
ORDER BY day_of_week ASC;

-- name: DeleteBrokerOpeningHours :exec
DELETE FROM broker_opening_hours WHERE broker_id = $1 AND company_id = $2;

-- name: UpsertFunnelMapping :one
INSERT INTO broker_funnel_mappings (broker_id, company_id, source_funnel, target_funnel)
VALUES ($1, $2, $3, $4)
ON CONFLICT (broker_id, source_funnel) DO UPDATE SET target_funnel = EXCLUDED.target_funnel
RETURNING *;

-- name: ListFunnelMappings :many
SELECT * FROM broker_funnel_mappings
WHERE broker_id = $1 AND company_id = $2
ORDER BY source_funnel ASC;

-- name: DeleteFunnelMapping :exec
DELETE FROM broker_funnel_mappings WHERE id = $1 AND company_id = $2;

-- name: UpsertPostbackConfig :one
INSERT INTO broker_postback_configs (broker_id, company_id, is_enabled, verification_type, hmac_secret, hmac_algorithm, hmac_header, allowed_ips, status_mapping, variable_template)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (broker_id) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  verification_type = EXCLUDED.verification_type,
  hmac_secret = EXCLUDED.hmac_secret,
  hmac_algorithm = EXCLUDED.hmac_algorithm,
  hmac_header = EXCLUDED.hmac_header,
  allowed_ips = EXCLUDED.allowed_ips,
  status_mapping = EXCLUDED.status_mapping,
  variable_template = EXCLUDED.variable_template,
  updated_at = now()
RETURNING *;

-- name: GetPostbackConfig :one
SELECT * FROM broker_postback_configs WHERE broker_id = $1 AND company_id = $2;

-- name: CreatePostbackLog :one
INSERT INTO broker_postback_log (company_id, broker_id, lead_id, raw_payload, parsed_status, mapped_status, verification_result, processing_result, error, source_ip)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ListPostbackLog :many
SELECT * FROM broker_postback_log
WHERE company_id = $1
  AND (sqlc.narg('broker_id')::uuid IS NULL OR broker_id = sqlc.narg('broker_id'))
  AND (sqlc.narg('lead_id')::uuid IS NULL OR lead_id = sqlc.narg('lead_id'))
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
