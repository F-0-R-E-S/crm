DROP TABLE IF EXISTS affiliate_api_key_log;
DROP TABLE IF EXISTS postback_queue;
ALTER TABLE affiliates DROP COLUMN IF EXISTS manager_id;
ALTER TABLE affiliates DROP COLUMN IF EXISTS country_caps;
ALTER TABLE affiliates DROP COLUMN IF EXISTS total_cap;
ALTER TABLE affiliates DROP COLUMN IF EXISTS level;
ALTER TABLE affiliates DROP COLUMN IF EXISTS parent_id;
