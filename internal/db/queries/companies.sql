-- name: CreateCompany :one
INSERT INTO companies (name, slug, plan, status, settings)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetCompany :one
SELECT * FROM companies WHERE id = $1;

-- name: UpdateCompany :one
UPDATE companies
SET name = COALESCE(sqlc.narg('name'), name),
    slug = COALESCE(sqlc.narg('slug'), slug),
    plan = COALESCE(sqlc.narg('plan'), plan),
    status = COALESCE(sqlc.narg('status'), status),
    settings = COALESCE(sqlc.narg('settings'), settings),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListCompanies :many
SELECT * FROM companies ORDER BY created_at DESC LIMIT $1 OFFSET $2;
