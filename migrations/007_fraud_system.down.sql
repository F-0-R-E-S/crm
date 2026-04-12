-- Revert 007_fraud_system

-- Drop index on leads
DROP INDEX IF EXISTS idx_leads_fraud_verdict;

-- Revert leads alterations
ALTER TABLE leads DROP COLUMN IF EXISTS fraud_score;
ALTER TABLE leads DROP COLUMN IF EXISTS fraud_verdict;

-- Revert fraud_profiles alterations
ALTER TABLE fraud_profiles DROP COLUMN IF EXISTS geo_overrides;
ALTER TABLE fraud_profiles DROP COLUMN IF EXISTS preset_name;
ALTER TABLE fraud_profiles DROP COLUMN IF EXISTS bot_check_enabled;
ALTER TABLE fraud_profiles DROP COLUMN IF EXISTS voip_check_enabled;
ALTER TABLE fraud_profiles DROP COLUMN IF EXISTS vpn_check_enabled;
ALTER TABLE fraud_profiles DROP COLUMN IF EXISTS blacklist_check_enabled;

-- Drop tables in reverse order
DROP TABLE IF EXISTS shave_events CASCADE;
DROP TABLE IF EXISTS fraud_check_results CASCADE;
DROP TABLE IF EXISTS blacklists CASCADE;
