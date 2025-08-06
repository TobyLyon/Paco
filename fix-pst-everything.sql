-- FIX EVERYTHING TO USE PST (Pacific Standard Time)
-- Run this to make the entire system use PST consistently

-- 1. Drop all existing date-related functions to avoid conflicts
DROP FUNCTION IF EXISTS get_daily_leaderboard(DATE, INTEGER);
DROP FUNCTION IF EXISTS get_daily_leaderboard(DATE);
DROP FUNCTION IF EXISTS get_current_pst_date();

-- 2. Create PST date function
CREATE OR REPLACE FUNCTION get_current_pst_date()
RETURNS DATE AS $$
BEGIN
    -- Convert UTC to PST (UTC-8) and return just the date
    RETURN (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Los_Angeles')::DATE;
END;
$$ LANGUAGE plpgsql;

-- 3. Create PST-aware leaderboard function
CREATE OR REPLACE FUNCTION get_daily_leaderboard(target_date DATE DEFAULT NULL, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    user_id TEXT,
    username TEXT,
    display_name TEXT,
    profile_image TEXT,
    score INTEGER,
    game_date DATE,
    created_at TIMESTAMPTZ,
    rank INTEGER
) AS $$
BEGIN
    -- Use current PST date if no date provided
    IF target_date IS NULL THEN
        target_date := get_current_pst_date();
    END IF;
    
    RETURN QUERY
    SELECT 
        gs.user_id,
        gs.username,
        gs.display_name,
        gs.profile_image,
        gs.score,
        gs.game_date,
        gs.created_at,
        ROW_NUMBER() OVER (ORDER BY gs.score DESC)::INTEGER as rank
    FROM game_scores gs
    WHERE gs.game_date = target_date
    ORDER BY gs.score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Update any existing August 6th entries to August 5th PST
-- (These were created due to UTC/PST confusion)
UPDATE game_scores 
SET game_date = '2025-08-05'
WHERE game_date = '2025-08-06'
  AND created_at < (NOW() AT TIME ZONE 'America/Los_Angeles')::DATE + INTERVAL '1 day';

-- 5. Verify the changes
SELECT 
    game_date,
    COUNT(*) as score_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(score) as highest_score,
    MIN(created_at) as first_score,
    MAX(created_at) as last_score
FROM game_scores 
WHERE game_date IN ('2025-08-05', '2025-08-06')
GROUP BY game_date
ORDER BY game_date;

-- 6. Show current PST date for verification
SELECT 
    NOW() AT TIME ZONE 'UTC' as utc_now,
    NOW() AT TIME ZONE 'America/Los_Angeles' as pst_now,
    get_current_pst_date() as pst_date;

-- 7. Test the leaderboard function
SELECT * FROM get_daily_leaderboard('2025-08-05', 10);