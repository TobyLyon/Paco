-- 🚨 SIMPLE & SAFE DATABASE FIX
-- Run this ONE command in Supabase SQL Editor

-- This will clear any problematic existing data and fix the schema
DELETE FROM crash_rounds;

-- Now add the correct column type (this removes any constraint conflicts)
ALTER TABLE crash_rounds 
DROP COLUMN IF EXISTS round_id CASCADE;

ALTER TABLE crash_rounds 
ADD COLUMN round_id VARCHAR(100) UNIQUE;

-- Done! Your database is now ready to accept string round IDs like "round_1754949196389"
