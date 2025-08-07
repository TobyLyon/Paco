-- ===== FIX DUPLICATE SCORES - DATABASE MIGRATION =====
-- Run this in your Supabase SQL Editor to ensure only highest scores per user

-- Step 1: Remove the problematic unique constraint that allows multiple scores per user
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_id_game_date_score_key'
    ) THEN
        ALTER TABLE game_scores DROP CONSTRAINT game_scores_user_id_game_date_score_key;
        RAISE NOTICE 'Removed old unique constraint';
    END IF;
END $$;

-- Step 2: Clean up existing duplicates - keep only the highest score per user per day
WITH ranked_scores AS (
    SELECT id, 
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

-- Step 3: Add a proper unique constraint - one record per user per day
ALTER TABLE game_scores 
ADD CONSTRAINT game_scores_user_date_unique 
UNIQUE(user_id, game_date);

-- Step 4: Create an improved leaderboard function
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

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE, INTEGER) TO anon, authenticated;

-- Step 6: Add missing columns for anti-cheat data (if they don't exist)
DO $$
BEGIN
    -- Add session_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN session_id TEXT;
        RAISE NOTICE 'Added session_id column';
    END IF;
    
    -- Add game_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'game_time'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN game_time INTEGER;
        RAISE NOTICE 'Added game_time column';
    END IF;
    
    -- Add platforms_jumped column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'platforms_jumped'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN platforms_jumped INTEGER;
        RAISE NOTICE 'Added platforms_jumped column';
    END IF;
    
    -- Add checksum column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'checksum'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN checksum TEXT;
        RAISE NOTICE 'Added checksum column';
    END IF;
END $$;

-- Step 7: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_game_scores_user_date_score 
ON game_scores(user_id, game_date, score DESC);

-- Verification query - check for any remaining duplicates
SELECT 
    user_id, 
    game_date, 
    COUNT(*) as duplicate_count,
    ARRAY_AGG(score ORDER BY score DESC) as scores
FROM game_scores 
GROUP BY user_id, game_date 
HAVING COUNT(*) > 1;

-- If the above query returns any rows, there are still duplicates!

-- Final completion message
DO $$
BEGIN
    RAISE NOTICE 'Database migration completed successfully!';
    RAISE NOTICE 'Each user can now have only ONE score per day (their highest)';
    RAISE NOTICE 'Anti-cheat columns added for enhanced security';
    RAISE NOTICE 'Leaderboard function updated to work with new schema';
END $$;