-- ===== FIX LEADERBOARD FUNCTION CONFLICT =====
-- This script resolves the function signature conflict and checks leaderboard data
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: Clean Up Conflicting Functions
-- =====================================================

-- Drop all existing versions of get_daily_leaderboard to resolve conflicts
DROP FUNCTION IF EXISTS get_daily_leaderboard(DATE);
DROP FUNCTION IF EXISTS get_daily_leaderboard(DATE, INTEGER);
DROP FUNCTION IF EXISTS get_daily_leaderboard();

-- Log cleanup
DO $$
BEGIN
    RAISE NOTICE '🧹 Cleaned up conflicting get_daily_leaderboard functions';
END $$;

-- =====================================================
-- STEP 2: Create Single, Unified Function
-- =====================================================

-- Create one definitive leaderboard function with proper signature
CREATE OR REPLACE FUNCTION get_daily_leaderboard(
    target_date DATE DEFAULT CURRENT_DATE,
    score_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank INTEGER,
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
        ROW_NUMBER() OVER (ORDER BY gs.score DESC, gs.created_at ASC)::INTEGER as rank,
        gs.id,
        gs.created_at,
        gs.user_id,
        gs.username,
        gs.display_name,
        gs.profile_image,
        gs.score,
        gs.game_date,
        gs.user_agent,
        COALESCE(gs.session_id, '') as session_id,
        COALESCE(gs.game_time, 0) as game_time,
        COALESCE(gs.platforms_jumped, 0) as platforms_jumped,
        COALESCE(gs.checksum, '') as checksum
    FROM game_scores gs
    WHERE gs.game_date = target_date
    ORDER BY gs.score DESC, gs.created_at ASC
    LIMIT score_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE, INTEGER) TO anon, authenticated;

-- Log success
DO $$
BEGIN
    RAISE NOTICE '✅ Created unified get_daily_leaderboard function';
END $$;

-- =====================================================
-- STEP 3: Check Current Leaderboard Data
-- =====================================================

-- Check what data remains after the coordination fix
DO $$
DECLARE
    total_scores INTEGER;
    unique_users INTEGER;
    highest_score INTEGER;
    today_scores INTEGER;
    recent_dates TEXT;
BEGIN
    -- Get overall stats
    SELECT COUNT(*), COUNT(DISTINCT user_id), COALESCE(MAX(score), 0)
    INTO total_scores, unique_users, highest_score
    FROM game_scores;
    
    -- Get today's score count
    SELECT COUNT(*)
    INTO today_scores
    FROM game_scores
    WHERE game_date = CURRENT_DATE;
    
    -- Get recent game dates
    SELECT STRING_AGG(DISTINCT game_date::TEXT, ', ' ORDER BY game_date::TEXT DESC)
    INTO recent_dates
    FROM game_scores
    WHERE game_date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Report findings
    RAISE NOTICE '';
    RAISE NOTICE '📊 ===== LEADERBOARD DATA ANALYSIS =====';
    RAISE NOTICE '📈 Total scores in database: %', total_scores;
    RAISE NOTICE '👥 Unique users: %', unique_users;
    RAISE NOTICE '🏆 Highest score: %', highest_score;
    RAISE NOTICE '📅 Today''s scores: %', today_scores;
    RAISE NOTICE '📆 Recent game dates: %', COALESCE(recent_dates, 'None');
    RAISE NOTICE '';
    
    -- Determine impact level
    IF total_scores = 0 THEN
        RAISE NOTICE '🚨 CRITICAL: All leaderboard data was removed!';
        RAISE NOTICE '💡 Recommendation: Start fresh contest or restore from backup';
    ELSIF total_scores < 10 THEN
        RAISE NOTICE '⚠️  WARNING: Most leaderboard data was removed (% scores remaining)', total_scores;
        RAISE NOTICE '💡 Recommendation: Consider fresh start or data recovery';
    ELSE
        RAISE NOTICE '✅ Good news: Substantial data remains (% scores)', total_scores;
        RAISE NOTICE '💡 Recommendation: Continue with current leaderboard';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: Test the Fixed Function
-- =====================================================

-- Test today's leaderboard (specify both parameters to avoid ambiguity)
DO $$
BEGIN
    RAISE NOTICE '🧪 Testing leaderboard function...';
END $$;

-- Get today's top 10 scores
SELECT rank, username, score, created_at
FROM get_daily_leaderboard(CURRENT_DATE, 10);

-- =====================================================
-- STEP 5: Show Recent Activity Summary
-- =====================================================

-- Show scores by date for the last 7 days
SELECT 
    game_date,
    COUNT(*) as scores_count,
    COUNT(DISTINCT user_id) as unique_players,
    MAX(score) as top_score,
    AVG(score)::INTEGER as avg_score
FROM game_scores
WHERE game_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY game_date
ORDER BY game_date DESC;