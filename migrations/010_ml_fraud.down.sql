-- Revert 010_ml_fraud

-- Drop tables in reverse order
DROP TABLE IF EXISTS velocity_rules CASCADE;
DROP TABLE IF EXISTS fraud_rule_experiments CASCADE;
DROP TABLE IF EXISTS fraud_intelligence_pool CASCADE;

-- Drop behavioral_events and all partitions
DROP TABLE IF EXISTS behavioral_events CASCADE;
DROP TABLE IF EXISTS behavioral_events_2026_01, behavioral_events_2026_02, behavioral_events_2026_03,
    behavioral_events_2026_04, behavioral_events_2026_05, behavioral_events_2026_06,
    behavioral_events_2026_07, behavioral_events_2026_08, behavioral_events_2026_09,
    behavioral_events_2026_10, behavioral_events_2026_11, behavioral_events_2026_12 CASCADE;

DROP TABLE IF EXISTS ml_fraud_models CASCADE;
