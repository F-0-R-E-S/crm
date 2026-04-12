-- name: ListBrokerTemplates :many
SELECT * FROM broker_templates
WHERE (sqlc.narg('category')::varchar IS NULL OR category = sqlc.narg('category'))
  AND (sqlc.narg('search')::varchar IS NULL OR name ILIKE '%' || sqlc.narg('search') || '%')
  AND (sqlc.narg('is_public')::boolean IS NULL OR is_public = sqlc.narg('is_public'))
ORDER BY
  CASE WHEN sqlc.narg('sort')::varchar = 'rating' THEN rating END DESC NULLS LAST,
  CASE WHEN sqlc.narg('sort')::varchar = 'installs' THEN install_count END DESC NULLS LAST,
  CASE WHEN sqlc.narg('sort')::varchar = 'newest' THEN created_at END DESC,
  name ASC
LIMIT $1 OFFSET $2;

-- name: CountBrokerTemplates :one
SELECT count(*) FROM broker_templates
WHERE (sqlc.narg('category')::varchar IS NULL OR category = sqlc.narg('category'))
  AND (sqlc.narg('search')::varchar IS NULL OR name ILIKE '%' || sqlc.narg('search') || '%')
  AND (sqlc.narg('is_public')::boolean IS NULL OR is_public = sqlc.narg('is_public'));

-- name: GetBrokerTemplate :one
SELECT * FROM broker_templates WHERE id = $1;

-- name: CreateBrokerTemplate :one
INSERT INTO broker_templates (
  name, version, method, url_template, headers, body_template,
  auth_type, response_mapping, postback_config, is_public,
  category, description, author, tags
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *;

-- name: UpdateBrokerTemplate :one
UPDATE broker_templates SET
  name = COALESCE(sqlc.narg('name'), name),
  method = COALESCE(sqlc.narg('method'), method),
  url_template = COALESCE(sqlc.narg('url_template'), url_template),
  headers = COALESCE(sqlc.narg('headers'), headers),
  body_template = COALESCE(sqlc.narg('body_template'), body_template),
  auth_type = COALESCE(sqlc.narg('auth_type'), auth_type),
  response_mapping = COALESCE(sqlc.narg('response_mapping'), response_mapping),
  postback_config = COALESCE(sqlc.narg('postback_config'), postback_config),
  category = COALESCE(sqlc.narg('category'), category),
  description = COALESCE(sqlc.narg('description'), description),
  tags = COALESCE(sqlc.narg('tags'), tags)
WHERE id = $1
RETURNING *;

-- name: DeleteBrokerTemplate :exec
DELETE FROM broker_templates WHERE id = $1 AND is_public = false;
