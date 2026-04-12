-- Revert 009_compliance_security

-- Revert audit_log alterations
ALTER TABLE audit_log DROP COLUMN IF EXISTS duration_ms;
ALTER TABLE audit_log DROP COLUMN IF EXISTS changes;
ALTER TABLE audit_log DROP COLUMN IF EXISTS session_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS request_id;

-- Drop tables in reverse order
DROP TABLE IF EXISTS encryption_keys CASCADE;
DROP TABLE IF EXISTS consent_records CASCADE;
DROP TABLE IF EXISTS gdpr_requests CASCADE;
DROP TABLE IF EXISTS ip_whitelist CASCADE;
