-- ===== SUPABASE-CODEBASE COORDINATION FIX =====
-- This script fixes all identified issues preventing smooth coordination
-- between your Supabase database and leaderboard codebase.
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: Fix the Database Schema Constraint Issue
-- =====================================================

-- Remove the problematic unique constraint that allows multiple scores per user
DO $$
BEGIN
    -- Check and remove the bad constraint that allows duplicates
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_id_game_date_score_key'
    ) THEN
        ALTER TABLE game_scores DROP CONSTRAINT game_scores_user_id_game_date_score_key;
        RAISE NOTICE '✅ Removed problematic constraint that allowed multiple entries per user';
    ELSE
        RAISE NOTICE '⚠️ Original constraint not found - may already be fixed';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Clean Up Existing Duplicate Data
-- =====================================================

-- Remove any existing duplicate entries, keeping only the highest score per user per day
WITH ranked_scores AS (
    SELECT 
        id, 
        ROW_NUMBER() OVER (
            PARTITION BY user_id, game_date 
            ORDER BY score DESC, created_at ASC
        ) as rn
    FROM game_scores
),
scores_to_delete AS (
    SELECT id FROM ranked_scores WHERE rn > 1
)
DELETE FROM game_scores 
WHERE id IN (SELECT id FROM scores_to_delete);

-- Log how many duplicates were removed
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '🧹 Cleaned up % duplicate score entries', deleted_count;
END $$;

-- =====================================================
-- STEP 3: Add Proper Unique Constraint
-- =====================================================

-- Add the correct constraint - one score per user per day
DO $$
BEGIN
    -- Only add if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_date_unique'
    ) THEN
        ALTER TABLE game_scores 
        ADD CONSTRAINT game_scores_user_date_unique 
        UNIQUE(user_id, game_date);
        RAISE NOTICE '✅ Added proper unique constraint: ONE score per user per day';
    ELSE
        RAISE NOTICE '⚠️ Proper constraint already exists';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Add Missing Anti-Cheat Columns
-- =====================================================

DO $$
BEGIN
    -- Add session_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN session_id TEXT;
        RAISE NOTICE '✅ Added session_id column for anti-cheat tracking';
    END IF;
    
    -- Add game_time column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'game_time'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN game_time INTEGER;
        RAISE NOTICE '✅ Added game_time column for anti-cheat tracking';
    END IF;
    
    -- Add platforms_jumped column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'platforms_jumped'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN platforms_jumped INTEGER;
        RAISE NOTICE '✅ Added platforms_jumped column for anti-cheat tracking';
    END IF;
    
    -- Add checksum column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'checksum'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN checksum TEXT;
        RAISE NOTICE '✅ Added checksum column for anti-cheat tracking';
    END IF;
END $$;

-- =====================================================
-- STEP 5: Create Optimized Leaderboard Function
-- =====================================================

-- Drop existing function if it exists (to handle signature changes)
DROP FUNCTION IF EXISTS get_daily_leaderboard(DATE, INTEGER);

-- Create the optimized function with proper signature
CREATE OR REPLACE FUNCTION get_daily_leaderboard(
    target_date DATE DEFAULT CURRENT_DATE,
    score_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMPTZ,
    user_id TEXT,
    username TEXT,
    display_name TEXT,
    profile_image TEXT,
    score INTEGER,
    game_date DATE,
    user_agent TEXT,
    session_id TEXT,
    game_time INTEGER,
    platforms_jumped INTEGER,
    checksum TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.id,
        gs.created_at,
        gs.user_id,
        gs.username,
        gs.display_name,
        gs.profile_image,
        gs.score,
        gs.game_date,
        gs.user_agent,
        gs.session_id,
        gs.game_time,
        gs.platforms_jumped,
        gs.checksum
    FROM game_scores gs
    WHERE gs.game_date = target_date
    ORDER BY gs.score DESC, gs.created_at ASC
    LIMIT score_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE, INTEGER) TO anon, authenticated;

-- Log success message
DO $$
BEGIN
    RAISE NOTICE '✅ Created optimized get_daily_leaderboard() function';
END $$;

-- =====================================================
-- STEP 6: Add Performance Indexes
-- =====================================================

-- Add index for user-date-score queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_game_scores_user_date_score 
ON game_scores(user_id, game_date, score DESC);

-- Add index for leaderboard queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_game_scores_leaderboard_optimized
ON game_scores(game_date, score DESC, created_at ASC);

-- Log success message
DO $$
BEGIN
    RAISE NOTICE '✅ Added performance indexes for optimized queries';
END $$;

-- =====================================================
-- STEP 7: Enable Real-time for Live Updates
-- =====================================================

-- Ensure real-time is enabled for live leaderboard updates
DO $$
BEGIN
    -- Add table to realtime publication if not already added
    ALTER PUBLICATION supabase_realtime ADD TABLE game_scores;
    RAISE NOTICE '✅ Enabled real-time subscriptions for live leaderboard updates';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Real-time already enabled for game_scores table';
END $$;

-- =====================================================
-- STEP 8: Verification Queries
-- =====================================================

-- Check for any remaining duplicates (should return 0 rows)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, game_date, COUNT(*) as cnt
        FROM game_scores 
        GROUP BY user_id, game_date 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING '⚠️ Still found % users with duplicate entries!', duplicate_count;
    ELSE
        RAISE NOTICE '✅ No duplicate entries found - constraint working properly';
    END IF;
END $$;

-- Test the leaderboard function
DO $$
DECLARE
    leaderboard_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO leaderboard_count
    FROM get_daily_leaderboard(CURRENT_DATE, 10);
    
    RAISE NOTICE '✅ Leaderboard function test: Found % entries for today', leaderboard_count;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===== COORDINATION FIX COMPLETED! =====';
    RAISE NOTICE '✅ Fixed database schema constraint issue';
    RAISE NOTICE '✅ Cleaned up any existing duplicate data';
    RAISE NOTICE '✅ Added proper unique constraint (user_id, game_date)';
    RAISE NOTICE '✅ Added missing anti-cheat columns';
    RAISE NOTICE '✅ Created optimized leaderboard function';
    RAISE NOTICE '✅ Added performance indexes';
    RAISE NOTICE '✅ Enabled real-time subscriptions';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your Supabase database is now properly coordinated with your codebase!';
    RAISE NOTICE '📝 Next: Update your code to use the database function instead of fallback';
END $$;