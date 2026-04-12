-- name: InstallTemplate :one
INSERT INTO installed_integrations (company_id, template_id, installed_version)
VALUES ($1, $2, $3)
ON CONFLICT (company_id, template_id) DO UPDATE SET
  installed_version = EXCLUDED.installed_version,
  status = 'active',
  updated_at = now()
RETURNING *;

-- name: UninstallTemplate :exec
DELETE FROM installed_integrations WHERE company_id = $1 AND template_id = $2;

-- name: ListInstalled :many
SELECT i.*, t.name AS template_name, t.category, t.version AS latest_version
FROM installed_integrations i
JOIN broker_templates t ON t.id = i.template_id
WHERE i.company_id = $1
ORDER BY i.installed_at DESC
LIMIT $2 OFFSET $3;

-- name: GetInstalled :one
SELECT * FROM installed_integrations WHERE company_id = $1 AND template_id = $2;

-- name: CreateReview :one
INSERT INTO template_reviews (template_id, company_id, user_id, rating, review_text)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (template_id, user_id) DO UPDATE SET
  rating = EXCLUDED.rating,
  review_text = EXCLUDED.review_text,
  updated_at = now()
RETURNING *;

-- name: ListReviews :many
SELECT * FROM template_reviews
WHERE template_id = $1 AND is_visible = true
ORDER BY
  CASE WHEN sqlc.narg('sort')::varchar = 'rating' THEN rating END DESC,
  CASE WHEN sqlc.narg('sort')::varchar = 'upvotes' THEN upvotes END DESC,
  created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateReview :one
UPDATE template_reviews SET
  rating = $3,
  review_text = $4,
  updated_at = now()
WHERE template_id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteReview :exec
DELETE FROM template_reviews WHERE template_id = $1 AND user_id = $2;

-- name: CreateSubmission :one
INSERT INTO marketplace_submissions (
  company_id, author_user_id, status, readme, logo_url, countries, verticals, submitted_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetSubmission :one
SELECT * FROM marketplace_submissions WHERE id = $1 AND company_id = $2;

-- name: ListSubmissions :many
SELECT * FROM marketplace_submissions
WHERE company_id = $1
  AND (sqlc.narg('status')::varchar IS NULL OR status = sqlc.narg('status'))
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateSubmissionStatus :one
UPDATE marketplace_submissions SET
  status = $2,
  rejection_reason = sqlc.narg('rejection_reason'),
  reviewed_at = sqlc.narg('reviewed_at'),
  reviewed_by = sqlc.narg('reviewed_by'),
  updated_at = now()
WHERE id = $1
RETURNING *;

-- name: CreateTemplateVersion :one
INSERT INTO template_versions (template_id, version, changelog, config_snapshot, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListTemplateVersions :many
SELECT * FROM template_versions
WHERE template_id = $1
ORDER BY version DESC
LIMIT $2 OFFSET $3;

-- name: GetTemplateVersion :one
SELECT * FROM template_versions WHERE template_id = $1 AND version = $2;
