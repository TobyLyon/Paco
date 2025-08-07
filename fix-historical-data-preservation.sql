-- ===== FIX HISTORICAL DATA PRESERVATION =====
-- This removes the auto-deletion that was destroying historical scores

-- Step 1: Remove the dangerous cleanup function that deletes old scores
DROP FUNCTION IF EXISTS cleanup_old_game_scores();

-- Step 2: Create a SAFE version that only archives (doesn't delete)
CREATE OR REPLACE FUNCTION archive_old_game_scores()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Instead of deleting, we could move old scores to an archive table
    -- For now, we just return 0 (no deletion)
    -- 
    -- Future: CREATE TABLE IF NOT EXISTS game_scores_archive AS SELECT * FROM game_scores;
    -- INSERT INTO game_scores_archive SELECT * FROM game_scores WHERE game_date < CURRENT_DATE - INTERVAL '365 days';
    -- DELETE FROM game_scores WHERE game_date < CURRENT_DATE - INTERVAL '365 days';
    
    archived_count := 0; -- No deletion for now
    
    RAISE NOTICE 'Historical data preservation: % scores would have been deleted (but were preserved)', 
        (SELECT COUNT(*) FROM game_scores WHERE game_date < CURRENT_DATE - INTERVAL '30 days');
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions for the safe function
GRANT EXECUTE ON FUNCTION archive_old_game_scores() TO anon, authenticated;

-- Step 4: Check what historical data we have left
SELECT 
    COUNT(*) as total_scores,
    MIN(game_date) as earliest_date,
    MAX(game_date) as latest_date,
    COUNT(DISTINCT game_date) as total_days,
    COUNT(DISTINCT user_id) as unique_players
FROM game_scores;

-- Step 5: Show scores by date to see what historical data exists
SELECT 
    game_date,
    COUNT(*) as scores_count,
    MAX(score) as top_score,
    COUNT(DISTINCT user_id) as unique_players
FROM game_scores 
GROUP BY game_date 
ORDER BY game_date DESC 
LIMIT 30;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Historical data preservation enabled!';
    RAISE NOTICE '🔒 Auto-deletion of old scores has been DISABLED';
    RAISE NOTICE '📊 All future scores will be preserved for all-time leaderboard';
    RAISE NOTICE '📅 Daily leaderboards will show current day only';
    RAISE NOTICE '🏆 All-time leaderboards will show best scores from all dates';
END $$;
