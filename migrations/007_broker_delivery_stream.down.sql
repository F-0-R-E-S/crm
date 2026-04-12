-- Reverse Stream 3: Broker & Delivery

DROP TRIGGER IF EXISTS trg_update_template_rating ON template_reviews;
DROP FUNCTION IF EXISTS update_template_rating();
DROP TRIGGER IF EXISTS trg_update_install_count ON installed_integrations;
DROP FUNCTION IF EXISTS update_template_install_count();

DROP TABLE IF EXISTS installed_integrations;
DROP TABLE IF EXISTS template_versions;
DROP TABLE IF EXISTS template_reviews;
DROP TABLE IF EXISTS marketplace_submissions;

DROP TABLE IF EXISTS affiliate_payouts;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS broker_wallets;
DROP TABLE IF EXISTS reconciliation_items;
DROP TABLE IF EXISTS reconciliation_sessions;
DROP TABLE IF EXISTS pricing_rules;

DROP TABLE IF EXISTS autologin_sla_snapshots;
DROP TABLE IF EXISTS autologin_anomalies;
DROP TABLE IF EXISTS autologin_failover_chains;
DROP TABLE IF EXISTS broker_autologin_configs;
DROP TABLE IF EXISTS proxy_pool;
DROP TABLE IF EXISTS device_fingerprints;

DROP TABLE IF EXISTS broker_postback_log;
DROP TABLE IF EXISTS broker_postback_configs;
DROP TABLE IF EXISTS broker_funnel_mappings;
DROP TABLE IF EXISTS broker_opening_hours;

ALTER TABLE brokers DROP COLUMN IF EXISTS opening_hours_enabled;
ALTER TABLE brokers DROP COLUMN IF EXISTS funnel_fallback;
ALTER TABLE brokers DROP COLUMN IF EXISTS default_funnel_name;
ALTER TABLE brokers DROP COLUMN IF EXISTS test_mode;
ALTER TABLE brokers DROP COLUMN IF EXISTS notes;
ALTER TABLE brokers DROP COLUMN IF EXISTS cloned_from;
ALTER TABLE brokers DROP COLUMN IF EXISTS circuit_state;
ALTER TABLE brokers DROP COLUMN IF EXISTS circuit_failure_count;
ALTER TABLE brokers DROP COLUMN IF EXISTS circuit_opened_at;
ALTER TABLE brokers DROP COLUMN IF EXISTS circuit_cooldown_sec;
ALTER TABLE brokers DROP COLUMN IF EXISTS health_check_url;
ALTER TABLE brokers DROP COLUMN IF EXISTS health_check_interval_sec;
ALTER TABLE brokers DROP COLUMN IF EXISTS maintenance_mode;
ALTER TABLE brokers DROP COLUMN IF EXISTS maintenance_until;

ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS fingerprint_id;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS proxy_id;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS proxy_type;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS proxy_country;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS retry_count;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS max_retries;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS retry_delay_ms;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS backoff_multiplier;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS failover_broker_id;
ALTER TABLE autologin_sessions DROP COLUMN IF EXISTS failover_attempt;

ALTER TABLE conversions DROP COLUMN IF EXISTS broker_transaction_id;
ALTER TABLE conversions DROP COLUMN IF EXISTS reconciliation_status;
ALTER TABLE conversions DROP COLUMN IF EXISTS reconciled_at;
ALTER TABLE conversions DROP COLUMN IF EXISTS is_fake;
ALTER TABLE conversions DROP COLUMN IF EXISTS fake_reason;
ALTER TABLE conversions DROP COLUMN IF EXISTS fake_action;
ALTER TABLE conversions DROP COLUMN IF EXISTS reverted_at;
