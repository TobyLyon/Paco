-- 🚨 CRITICAL PRODUCTION FIX - DATABASE SCHEMA MISMATCH
-- Run this in your Supabase SQL Editor to fix the round ID save errors

-- The issue: Your database has an INTEGER field for round_id but your 
-- application is generating timestamp-based string IDs like "round_1754949196389"

-- ===== SAFE FIX (handles existing data) =====

-- Step 1: Clean up any existing empty or duplicate round_id values
DELETE FROM crash_rounds WHERE round_id IS NULL OR round_id = '';

-- Step 2: If the column exists as INTEGER, change it to VARCHAR
-- This handles both cases: existing INTEGER column or no column
DO $$ 
BEGIN
    -- Try to alter existing column type
    BEGIN
        ALTER TABLE crash_rounds ALTER COLUMN round_id TYPE VARCHAR(100);
        RAISE NOTICE 'Successfully converted existing round_id column to VARCHAR(100)';
    EXCEPTION WHEN undefined_column THEN
        -- Column doesn't exist, create it
        ALTER TABLE crash_rounds ADD COLUMN round_id VARCHAR(100);
        RAISE NOTICE 'Created new round_id column as VARCHAR(100)';
    END;
END $$;

-- Step 3: Add unique constraint if it doesn't exist
DO $$
BEGIN
    ALTER TABLE crash_rounds ADD CONSTRAINT crash_rounds_round_id_unique UNIQUE (round_id);
    RAISE NOTICE 'Added unique constraint to round_id';
EXCEPTION WHEN duplicate_table THEN
    RAISE NOTICE 'Unique constraint already exists on round_id';
END $$;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_crash_rounds_round_id ON crash_rounds(round_id);

-- ===== VERIFICATION =====
-- Run this to confirm the fix worked:
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'crash_rounds' AND column_name = 'round_id';

-- Expected result: round_id | character varying | 100

-- ===== ALTERNATIVE QUICK FIX (if above has issues) =====
-- If the above causes constraint issues, use this simpler approach:

-- ALTER TABLE crash_rounds ALTER COLUMN round_id TYPE VARCHAR(100);

-- This preserves existing data but converts the field type
