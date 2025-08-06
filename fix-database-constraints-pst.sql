-- ===== FIX DATABASE CONSTRAINTS WITH PST TIMEZONE =====
-- This SQL fixes the constraint issue AND aligns everything to PST timezone

-- STEP 1: Check current constraints
SELECT 'Current constraints:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'game_scores'::regclass 
AND contype = 'u';

-- STEP 2: Remove the problematic constraint that allows multiple scores per user
DO $$
BEGIN
    -- Remove old constraint that allows multiple scores per user per day
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_id_game_date_score_key'
    ) THEN
        ALTER TABLE game_scores DROP CONSTRAINT game_scores_user_id_game_date_score_key;
        RAISE NOTICE '✅ Removed problematic constraint that allowed multiple scores per user';
    ELSE
        RAISE NOTICE '⚠️ Problematic constraint not found (already removed)';
    END IF;
END $$;

-- STEP 3: Show what duplicates exist before cleanup (using PST dates)
SELECT 'Duplicate scores that will be cleaned up (PST timezone):' as info;
WITH pst_scores AS (
    SELECT 
        id,
        user_id,
        username,
        score,
        created_at,
        -- Convert to PST date (UTC-8)
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date as pst_game_date
    FROM game_scores
),
ranked_scores AS (
    SELECT id, 
           user_id,
           username,
           pst_game_date,
           score,
           created_at,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, pst_game_date 
               ORDER BY score DESC, created_at ASC
           ) as rn
    FROM pst_scores
)
SELECT 
    user_id,
    username,
    pst_game_date, 
    score, 
    'Will be deleted (duplicate)' as action 
FROM ranked_scores 
WHERE rn > 1
ORDER BY user_id, pst_game_date, score DESC;

-- STEP 4: Actually delete the duplicates (using PST grouping)
WITH pst_scores AS (
    SELECT 
        id,
        user_id,
        username,
        score,
        created_at,
        -- Convert to PST date (UTC-8)
        (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date as pst_game_date
    FROM game_scores
),
ranked_scores AS (
    SELECT id, 
           user_id,
           pst_game_date,
           score,
           created_at,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, pst_game_date 
               ORDER BY score DESC, created_at ASC
           ) as rn
    FROM pst_scores
)
DELETE FROM game_scores 
WHERE id IN (SELECT id FROM ranked_scores WHERE rn > 1);

-- STEP 5: Update all existing game_date fields to use PST dates
UPDATE game_scores 
SET game_date = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date
WHERE game_date != (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date;

-- STEP 6: Add the correct constraint - ONE score per user per PST day
DO $$
BEGIN
    -- Add proper constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_date_unique'
    ) THEN
        ALTER TABLE game_scores 
        ADD CONSTRAINT game_scores_user_date_unique 
        UNIQUE(user_id, game_date);
        RAISE NOTICE '✅ Added correct constraint: ONE score per user per PST day';
    ELSE
        RAISE NOTICE '⚠️ Correct constraint already exists';
    END IF;
END $$;

-- STEP 7: Create/Update the leaderboard function to use PST
CREATE OR REPLACE FUNCTION get_daily_leaderboard_pst(
    target_pst_date DATE DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')::date,
    score_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMPTZ,
    user_id TEXT,
    username TEXT,
    twitter_username TEXT,
    display_name TEXT,
    profile_image TEXT,
    score INTEGER,
    game_date DATE,
    user_agent TEXT,
    session_id TEXT,
    game_time INTEGER,
    platforms_jumped INTEGER,
    checksum TEXT,
    pst_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.id,
        gs.created_at,
        gs.user_id,
        gs.username,
        gs.username as twitter_username,
        gs.display_name,
        gs.profile_image,
        gs.score,
        gs.game_date,
        gs.user_agent,
        gs.session_id,
        gs.game_time,
        gs.platforms_jumped,
        gs.checksum,
        (gs.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date as pst_date
    FROM game_scores gs
    WHERE gs.game_date = target_pst_date
    ORDER BY gs.score DESC
    LIMIT score_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_leaderboard_pst(DATE, INTEGER) TO anon, authenticated;

-- STEP 8: Verify the fix with PST dates
SELECT 'Final constraints after PST fix:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition 
FROM pg_constraint 
WHERE conrelid = 'game_scores'::regclass 
AND contype = 'u';

-- STEP 9: Show current scores with PST dates to verify cleanup worked
SELECT 'Current scores after PST cleanup (should be only 1 per user per PST day):' as info;
SELECT 
    user_id,
    username,
    game_date,
    score,
    created_at,
    (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date as pst_date,
    (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::time as pst_time,
    COUNT(*) OVER (PARTITION BY user_id, game_date) as scores_per_user_date
FROM game_scores 
WHERE game_date >= (NOW() AT TIME ZONE 'America/Los_Angeles')::date - INTERVAL '3 days'
ORDER BY game_date DESC, score DESC;

-- STEP 10: Show today's PST leaderboard
SELECT 'TODAY''S PST LEADERBOARD:' as info;
SELECT * FROM get_daily_leaderboard_pst((NOW() AT TIME ZONE 'America/Los_Angeles')::date);

-- STEP 11: Final summary with PST alignment
SELECT 'SUMMARY - PST Date Alignment:' as info;
SELECT 
    (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date as pst_date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_scores,
    MAX(score) as highest_score,
    MIN(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') as earliest_pst_time,
    MAX(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles') as latest_pst_time
FROM game_scores 
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date >= (NOW() AT TIME ZONE 'America/Los_Angeles')::date - INTERVAL '3 days'
GROUP BY (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::date
ORDER BY pst_date DESC;

SELECT 'PST timezone fix completed! All dates now aligned to Pacific Time. ✅' as final_status;