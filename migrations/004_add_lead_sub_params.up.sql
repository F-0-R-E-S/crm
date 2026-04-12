-- Add funnel_name and aff_sub1-10 columns to leads table for sub-parameter tracking.
-- Also adds phone_e164 index for phone-based deduplication.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS funnel_name VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub1 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub2 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub3 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub4 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub5 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub6 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub7 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub8 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub9 VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aff_sub10 VARCHAR(255);

-- Index for phone-based deduplication (EPIC-01 STORY-004)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_phone_e164 ON leads (tenant_id, phone_e164, created_at DESC)
  WHERE phone_e164 IS NOT NULL AND phone_e164 != '';

-- Index for funnel_name filtering
CREATE INDEX IF NOT EXISTS idx_leads_funnel ON leads (tenant_id, funnel_name)
  WHERE funnel_name IS NOT NULL;
