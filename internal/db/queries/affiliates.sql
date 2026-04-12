-- name: CreateAffiliate :one
INSERT INTO affiliates (company_id, name, api_key, email, status, settings)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetAffiliate :one
SELECT * FROM affiliates WHERE id = $1 AND company_id = $2;

-- name: GetAffiliateByAPIKey :one
SELECT * FROM affiliates WHERE api_key = $1;

-- name: ListAffiliates :many
SELECT * FROM affiliates
WHERE company_id = $1
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateAffiliate :one
UPDATE affiliates
SET name = COALESCE(sqlc.narg('name'), name),
    email = COALESCE(sqlc.narg('email'), email),
    status = COALESCE(sqlc.narg('status'), status),
    settings = COALESCE(sqlc.narg('settings'), settings)
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: UpdateAffiliateAPIKey :one
UPDATE affiliates SET api_key = $3 WHERE id = $1 AND company_id = $2 RETURNING *;

-- name: CountAffiliates :one
SELECT count(*) FROM affiliates WHERE company_id = $1;
