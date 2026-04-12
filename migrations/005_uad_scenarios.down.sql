DROP POLICY IF EXISTS tenant_isolation_uad_scenarios ON uad_scenarios;
DROP INDEX IF EXISTS idx_uad_queue_scenario;
ALTER TABLE uad_queue DROP COLUMN IF EXISTS completed_at;
ALTER TABLE uad_queue DROP COLUMN IF EXISTS error;
ALTER TABLE uad_queue DROP COLUMN IF EXISTS target_broker_id;
ALTER TABLE uad_queue DROP COLUMN IF EXISTS scenario_id;
DROP INDEX IF EXISTS idx_uad_scenarios_tenant;
DROP TABLE IF EXISTS uad_scenarios;
