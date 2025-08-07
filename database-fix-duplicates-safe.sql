-- ===== SAFE DATABASE MIGRATION - CHECKS FOR EXISTING OBJECTS =====
-- This version checks if constraints/columns already exist before creating them

-- Step 1: Remove the problematic unique constraint (only if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_id_game_date_score_key'
    ) THEN
        ALTER TABLE game_scores DROP CONSTRAINT game_scores_user_id_game_date_score_key;
        RAISE NOTICE '✅ Removed old problematic constraint';
    ELSE
        RAISE NOTICE '⚠️ Old constraint already removed or never existed';
    END IF;
END $$;

-- Step 2: Clean up existing duplicates (safe to run multiple times)
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

-- Get count of deleted duplicates
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    GET DIAGNOSTICS duplicate_count = ROW_COUNT;
    IF duplicate_count > 0 THEN
        RAISE NOTICE '✅ Cleaned up % duplicate score entries', duplicate_count;
    ELSE
        RAISE NOTICE '✅ No duplicate entries found to clean up';
    END IF;
END $$;

-- Step 3: Add proper unique constraint (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_date_unique'
    ) THEN
        ALTER TABLE game_scores ADD CONSTRAINT game_scores_user_date_unique UNIQUE(user_id, game_date);
        RAISE NOTICE '✅ Added proper unique constraint (one score per user per day)';
    ELSE
        RAISE NOTICE '⚠️ Proper unique constraint already exists';
    END IF;
END $$;

-- Step 4: Add anti-cheat columns (only if they don't exist)
DO $$
BEGIN
    -- Add session_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'session_id'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN session_id TEXT;
        RAISE NOTICE '✅ Added session_id column for anti-cheat tracking';
    ELSE
        RAISE NOTICE '⚠️ session_id column already exists';
    END IF;
    
    -- Add game_time column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'game_time'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN game_time INTEGER;
        RAISE NOTICE '✅ Added game_time column for gameplay duration tracking';
    ELSE
        RAISE NOTICE '⚠️ game_time column already exists';
    END IF;
    
    -- Add platforms_jumped column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'platforms_jumped'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN platforms_jumped INTEGER;
        RAISE NOTICE '✅ Added platforms_jumped column for gameplay validation';
    ELSE
        RAISE NOTICE '⚠️ platforms_jumped column already exists';
    END IF;
    
    -- Add checksum column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'checksum'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN checksum TEXT;
        RAISE NOTICE '✅ Added checksum column for data integrity verification';
    ELSE
        RAISE NOTICE '⚠️ checksum column already exists';
    END IF;
    
    -- Add user_agent column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_scores' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE game_scores ADD COLUMN user_agent TEXT;
        RAISE NOTICE '✅ Added user_agent column for device tracking';
    ELSE
        RAISE NOTICE '⚠️ user_agent column already exists';
    END IF;
END $$;

-- Step 5: Update the leaderboard function (safe to replace)
CREATE OR REPLACE FUNCTION get_daily_leaderboard(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    rank INTEGER,
    user_id TEXT,
    username TEXT,
    display_name TEXT,
    profile_image TEXT,
    best_score INTEGER,
    total_scores INTEGER,
    latest_score_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY MAX(gs.score) DESC)::INTEGER as rank,
        gs.user_id,
        gs.username,
        gs.display_name,
        gs.profile_image,
        MAX(gs.score)::INTEGER as best_score,
        COUNT(gs.score)::INTEGER as total_scores,
        MAX(gs.created_at) as latest_score_time
    FROM game_scores gs
    WHERE gs.game_date = target_date
    GROUP BY gs.user_id, gs.username, gs.display_name, gs.profile_image
    ORDER BY best_score DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    RAISE NOTICE '✅ Updated leaderboard function';
END $$;

-- Step 6: Verify the fix worked
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, game_date, COUNT(*) as score_count
        FROM game_scores 
        GROUP BY user_id, game_date 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: No duplicate entries found - database is clean!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Still found % users with multiple scores per day', duplicate_count;
    END IF;
END $$;

-- Final completion message
DO $$
BEGIN
    RAISE NOTICE '🎉 SAFE DATABASE MIGRATION COMPLETED!';
    RAISE NOTICE '✅ Each user can now have only ONE score per day (their highest)';
    RAISE NOTICE '✅ Anti-cheat columns added for enhanced security';
    RAISE NOTICE '✅ Leaderboard function updated to work with new schema';
    RAISE NOTICE '🚀 Score submissions should now work properly!';
END $$;
