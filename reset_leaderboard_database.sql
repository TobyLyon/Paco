-- ===== MANUAL LEADERBOARD DATABASE RESET =====
-- Run this in your Supabase SQL Editor for complete database reset

-- WARNING: This will delete ALL game scores permanently!
-- Only run this if you want a completely fresh leaderboard start

-- Option 1: Delete ALL scores (complete reset)
DELETE FROM game_scores;

-- Option 2: Delete only today's scores (keep historical data)
-- DELETE FROM game_scores WHERE game_date = CURRENT_DATE;

-- Option 3: Delete scores from last 7 days (recent reset)
-- DELETE FROM game_scores WHERE game_date >= CURRENT_DATE - INTERVAL '7 days';

-- Option 4: Delete only high scores above a threshold (remove suspicious scores)
-- DELETE FROM game_scores WHERE score > 100000;

-- Verify the reset worked
SELECT COUNT(*) as remaining_scores FROM game_scores;
SELECT COUNT(*) as todays_scores FROM game_scores WHERE game_date = CURRENT_DATE;

-- If you want to reset the auto-increment ID counter (optional)
-- ALTER SEQUENCE game_scores_id_seq RESTART WITH 1;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Leaderboard database reset complete!';
    RAISE NOTICE '🔄 Refresh your game page to see the empty leaderboard';
END $$;
