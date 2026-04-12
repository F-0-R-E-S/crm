-- Revert 008_status_groups

DROP TABLE IF EXISTS status_anomalies CASCADE;
DROP TABLE IF EXISTS status_anomaly_rules CASCADE;
DROP TABLE IF EXISTS broker_status_mappings CASCADE;
DROP TABLE IF EXISTS status_groups CASCADE;
