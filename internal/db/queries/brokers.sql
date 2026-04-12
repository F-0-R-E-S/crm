-- name: CreateBroker :one
INSERT INTO brokers (
  company_id, name, status, template_id, endpoint, credentials_enc,
  field_mapping, daily_cap, total_cap, country_caps, priority, notes
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetBroker :one
SELECT * FROM brokers WHERE id = $1 AND company_id = $2;

-- name: ListBrokers :many
SELECT * FROM brokers
WHERE company_id = $1
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
  AND (sqlc.narg('search')::varchar IS NULL OR name ILIKE '%' || sqlc.narg('search') || '%')
ORDER BY priority ASC, name ASC
LIMIT $2 OFFSET $3;

-- name: CountBrokers :one
SELECT count(*) FROM brokers
WHERE company_id = $1
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'));

-- name: UpdateBroker :one
UPDATE brokers SET
  name            = COALESCE(sqlc.narg('name'), name),
  status          = COALESCE(sqlc.narg('status'), status),
  endpoint        = COALESCE(sqlc.narg('endpoint'), endpoint),
  template_id     = COALESCE(sqlc.narg('template_id'), template_id),
  credentials_enc = COALESCE(sqlc.narg('credentials_enc'), credentials_enc),
  field_mapping   = COALESCE(sqlc.narg('field_mapping'), field_mapping),
  daily_cap       = COALESCE(sqlc.narg('daily_cap'), daily_cap),
  total_cap       = COALESCE(sqlc.narg('total_cap'), total_cap),
  country_caps    = COALESCE(sqlc.narg('country_caps'), country_caps),
  priority        = COALESCE(sqlc.narg('priority'), priority),
  notes           = COALESCE(sqlc.narg('notes'), notes),
  health_check_url = COALESCE(sqlc.narg('health_check_url'), health_check_url),
  maintenance_mode = COALESCE(sqlc.narg('maintenance_mode'), maintenance_mode),
  maintenance_until = COALESCE(sqlc.narg('maintenance_until'), maintenance_until),
  opening_hours_enabled = COALESCE(sqlc.narg('opening_hours_enabled'), opening_hours_enabled),
  funnel_fallback = COALESCE(sqlc.narg('funnel_fallback'), funnel_fallback),
  default_funnel_name = COALESCE(sqlc.narg('default_funnel_name'), default_funnel_name),
  updated_at = now()
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: DeleteBroker :exec
DELETE FROM brokers WHERE id = $1 AND company_id = $2;

-- name: CloneBroker :one
INSERT INTO brokers (
  company_id, name, status, template_id, endpoint, field_mapping,
  daily_cap, total_cap, country_caps, priority, notes,
  opening_hours_enabled, funnel_fallback, default_funnel_name,
  health_check_url, health_check_interval, cloned_from
)
SELECT company_id, $3, 'inactive', template_id, endpoint, field_mapping,
       daily_cap, total_cap, country_caps, priority, notes,
       opening_hours_enabled, funnel_fallback, default_funnel_name,
       health_check_url, health_check_interval, id
FROM brokers
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: UpdateBrokerCircuitState :exec
UPDATE brokers SET
  circuit_state = $3,
  circuit_failure_count = $4,
  circuit_opened_at = $5,
  updated_at = now()
WHERE id = $1 AND company_id = $2;

-- name: UpdateBrokerHealth :exec
UPDATE brokers SET
  health_status = $3,
  last_health_check = now(),
  updated_at = now()
WHERE id = $1 AND company_id = $2;

-- name: GetBrokersByHealth :many
SELECT * FROM brokers
WHERE company_id = $1 AND health_status = $2
ORDER BY name ASC;

-- name: SetBrokerMaintenanceMode :exec
UPDATE brokers SET
  maintenance_mode = $3,
  maintenance_until = sqlc.narg('maintenance_until'),
  updated_at = now()
WHERE id = $1 AND company_id = $2;

-- name: GetBrokerCapUsageToday :one
SELECT count(*) AS delivered_today
FROM lead_events
WHERE broker_id = $1 AND company_id = $2
  AND event_type = 'delivery_success'
  AND created_at >= CURRENT_DATE;

-- name: GetBrokerWithTemplate :one
SELECT b.*, t.name AS template_name, t.method, t.url_template,
       t.headers AS template_headers, t.body_template, t.auth_type,
       t.response_mapping, t.postback_config
FROM brokers b
LEFT JOIN broker_templates t ON t.id = b.template_id
WHERE b.id = $1 AND b.company_id = $2;
