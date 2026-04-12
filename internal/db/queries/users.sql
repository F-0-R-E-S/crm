-- name: CreateUser :one
INSERT INTO users (company_id, email, password_hash, role, name)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 AND company_id = $2;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 AND company_id = $2;

-- name: ListUsers :many
SELECT * FROM users WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: UpdateUser :one
UPDATE users
SET name = COALESCE(sqlc.narg('name'), name),
    role = COALESCE(sqlc.narg('role'), role),
    status = COALESCE(sqlc.narg('status'), status)
WHERE id = $1 AND company_id = $2
RETURNING *;

-- name: SetUserTOTP :exec
UPDATE users SET totp_secret = $3, totp_enabled = $4 WHERE id = $1 AND company_id = $2;

-- name: UpdateLastLogin :exec
UPDATE users SET last_login_at = now() WHERE id = $1;

-- name: DeactivateUser :exec
UPDATE users SET status = 'inactive' WHERE id = $1 AND company_id = $2;

-- name: CountUsers :one
SELECT count(*) FROM users WHERE company_id = $1;
