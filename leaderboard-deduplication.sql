-- Create function to get daily leaderboard with only best score per user
-- Run this in your Supabase SQL Editor

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
    user_agent TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (gs.user_id)
        gs.id,
        gs.created_at,
        gs.user_id,
        gs.username,
        gs.display_name,
        gs.profile_image,
        gs.score,
        gs.game_date,
        gs.user_agent
    FROM game_scores gs
    WHERE gs.game_date = target_date
    ORDER BY gs.user_id, gs.score DESC, gs.created_at DESC
    LIMIT score_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE, INTEGER) TO anon, authenticated;

-- Test the function (optional)
-- SELECT * FROM get_daily_leaderboard(CURRENT_DATE, 10);