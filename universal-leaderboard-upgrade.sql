-- ===== UNIVERSAL LEADERBOARD UPGRADE SCRIPT =====
-- Run this AFTER deploying your existing database-schema.sql to get full integration
-- This upgrades the calculate_daily_rankings function to include game_scores and paco_orders data

-- Enhanced function with full integration
CREATE OR REPLACE FUNCTION calculate_daily_rankings(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    game_scores_exists BOOLEAN := false;
    paco_orders_exists BOOLEAN := false;
BEGIN
    -- Check if external tables exist
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_scores') INTO game_scores_exists;
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'paco_orders') INTO paco_orders_exists;
    
    -- Clear existing rankings for the date
    DELETE FROM daily_leaderboards WHERE leaderboard_date = target_date;
    
    -- Calculate and insert daily rankings with full integration
    IF game_scores_exists AND paco_orders_exists THEN
        -- Full integration version
        INSERT INTO daily_leaderboards (
            leaderboard_date, user_id, daily_points, daily_xp, daily_activities,
            best_game_score, total_game_sessions, evil_flockos_defeated, perfect_bounces,
            pfp_orders_created, unique_traits_used, calculated_at
        )
        SELECT 
            target_date,
            up.id,
            COALESCE(daily_stats.points, 0),
            COALESCE(daily_stats.xp, 0),
            COALESCE(daily_stats.activities, 0),
            COALESCE(game_stats.best_score, 0),
            COALESCE(game_stats.sessions, 0),
            COALESCE(game_stats.evil_defeats, 0),
            COALESCE(game_stats.perfect_bounces, 0),
            COALESCE(pfp_stats.orders, 0),
            COALESCE(pfp_stats.unique_traits, 0),
            NOW()
        FROM user_profiles up
        LEFT JOIN (
            -- Daily activity stats
            SELECT 
                user_id,
                SUM(points_awarded) as points,
                SUM(xp_awarded) as xp,
                COUNT(*) as activities
            FROM user_activities 
            WHERE activity_date = target_date
            GROUP BY user_id
        ) daily_stats ON daily_stats.user_id = up.id
        LEFT JOIN (
            -- Game-specific stats
            SELECT 
                user_profile_id as user_id,
                MAX(score) as best_score,
                COUNT(*) as sessions,
                SUM(CASE WHEN (context_data->>'evil_flockos_defeated')::int > 0 THEN (context_data->>'evil_flockos_defeated')::int ELSE 0 END) as evil_defeats,
                SUM(CASE WHEN (context_data->>'perfect_bounces')::int > 0 THEN (context_data->>'perfect_bounces')::int ELSE 0 END) as perfect_bounces
            FROM game_scores 
            WHERE game_date = target_date
            GROUP BY user_profile_id
        ) game_stats ON game_stats.user_id = up.id
        LEFT JOIN (
            -- PFP-specific stats  
            SELECT 
                user_profile_id as user_id,
                COUNT(*) as orders,
                COUNT(DISTINCT hat_name) as unique_traits
            FROM paco_orders 
            WHERE DATE(created_at) = target_date
            GROUP BY user_profile_id
        ) pfp_stats ON pfp_stats.user_id = up.id
        WHERE up.show_in_leaderboards = true;
        
    ELSIF game_scores_exists THEN
        -- Game integration only
        INSERT INTO daily_leaderboards (
            leaderboard_date, user_id, daily_points, daily_xp, daily_activities,
            best_game_score, total_game_sessions, evil_flockos_defeated, perfect_bounces,
            pfp_orders_created, unique_traits_used, calculated_at
        )
        SELECT 
            target_date,
            up.id,
            COALESCE(daily_stats.points, 0),
            COALESCE(daily_stats.xp, 0),
            COALESCE(daily_stats.activities, 0),
            COALESCE(game_stats.best_score, 0),
            COALESCE(game_stats.sessions, 0),
            COALESCE(game_stats.evil_defeats, 0),
            COALESCE(game_stats.perfect_bounces, 0),
            0, -- pfp_orders_created
            0, -- unique_traits_used
            NOW()
        FROM user_profiles up
        LEFT JOIN (
            -- Daily activity stats
            SELECT 
                user_id,
                SUM(points_awarded) as points,
                SUM(xp_awarded) as xp,
                COUNT(*) as activities
            FROM user_activities 
            WHERE activity_date = target_date
            GROUP BY user_id
        ) daily_stats ON daily_stats.user_id = up.id
        LEFT JOIN (
            -- Game-specific stats
            SELECT 
                user_profile_id as user_id,
                MAX(score) as best_score,
                COUNT(*) as sessions,
                SUM(CASE WHEN (context_data->>'evil_flockos_defeated')::int > 0 THEN (context_data->>'evil_flockos_defeated')::int ELSE 0 END) as evil_defeats,
                SUM(CASE WHEN (context_data->>'perfect_bounces')::int > 0 THEN (context_data->>'perfect_bounces')::int ELSE 0 END) as perfect_bounces
            FROM game_scores 
            WHERE game_date = target_date
            GROUP BY user_profile_id
        ) game_stats ON game_stats.user_id = up.id
        WHERE up.show_in_leaderboards = true;
        
    ELSIF paco_orders_exists THEN
        -- PFP integration only
        INSERT INTO daily_leaderboards (
            leaderboard_date, user_id, daily_points, daily_xp, daily_activities,
            best_game_score, total_game_sessions, evil_flockos_defeated, perfect_bounces,
            pfp_orders_created, unique_traits_used, calculated_at
        )
        SELECT 
            target_date,
            up.id,
            COALESCE(daily_stats.points, 0),
            COALESCE(daily_stats.xp, 0),
            COALESCE(daily_stats.activities, 0),
            0, -- best_game_score
            0, -- total_game_sessions
            0, -- evil_flockos_defeated  
            0, -- perfect_bounces
            COALESCE(pfp_stats.orders, 0),
            COALESCE(pfp_stats.unique_traits, 0),
            NOW()
        FROM user_profiles up
        LEFT JOIN (
            -- Daily activity stats
            SELECT 
                user_id,
                SUM(points_awarded) as points,
                SUM(xp_awarded) as xp,
                COUNT(*) as activities
            FROM user_activities 
            WHERE activity_date = target_date
            GROUP BY user_id
        ) daily_stats ON daily_stats.user_id = up.id
        LEFT JOIN (
            -- PFP-specific stats  
            SELECT 
                user_profile_id as user_id,
                COUNT(*) as orders,
                COUNT(DISTINCT hat_name) as unique_traits
            FROM paco_orders 
            WHERE DATE(created_at) = target_date
            GROUP BY user_profile_id
        ) pfp_stats ON pfp_stats.user_id = up.id
        WHERE up.show_in_leaderboards = true;
        
    ELSE
        -- Basic version (same as current)
        INSERT INTO daily_leaderboards (
            leaderboard_date, user_id, daily_points, daily_xp, daily_activities,
            best_game_score, total_game_sessions, evil_flockos_defeated, perfect_bounces,
            pfp_orders_created, unique_traits_used, calculated_at
        )
        SELECT 
            target_date,
            up.id,
            COALESCE(daily_stats.points, 0),
            COALESCE(daily_stats.xp, 0),
            COALESCE(daily_stats.activities, 0),
            0, -- best_game_score
            0, -- total_game_sessions
            0, -- evil_flockos_defeated  
            0, -- perfect_bounces
            0, -- pfp_orders_created
            0, -- unique_traits_used
            NOW()
        FROM user_profiles up
        LEFT JOIN (
            -- Daily activity stats
            SELECT 
                user_id,
                SUM(points_awarded) as points,
                SUM(xp_awarded) as xp,
                COUNT(*) as activities
            FROM user_activities 
            WHERE activity_date = target_date
            GROUP BY user_id
        ) daily_stats ON daily_stats.user_id = up.id
        WHERE up.show_in_leaderboards = true;
    END IF;
    
    -- Update rankings
    WITH ranked_points AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY daily_points DESC) as rank
        FROM daily_leaderboards 
        WHERE leaderboard_date = target_date
    )
    UPDATE daily_leaderboards dl
    SET points_rank = rp.rank
    FROM ranked_points rp
    WHERE dl.id = rp.id;
    
    WITH ranked_game AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY best_game_score DESC) as rank
        FROM daily_leaderboards 
        WHERE leaderboard_date = target_date
    )
    UPDATE daily_leaderboards dl
    SET game_rank = rg.rank
    FROM ranked_game rg
    WHERE dl.id = rg.id;
    
    GET DIAGNOSTICS processed_count = ROW_COUNT;
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the columns are added to existing tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_scores') THEN
        ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS user_profile_id BIGINT REFERENCES user_profiles(id);
        RAISE NOTICE 'Added user_profile_id column to game_scores table';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'paco_orders') THEN
        ALTER TABLE paco_orders ADD COLUMN IF NOT EXISTS user_profile_id BIGINT REFERENCES user_profiles(id);
        RAISE NOTICE 'Added user_profile_id column to paco_orders table';
    END IF;
END $$;

-- Test the upgraded function
SELECT calculate_daily_rankings(CURRENT_DATE) as processed_users;

RAISE NOTICE 'Universal leaderboard system fully upgraded! All tables are now integrated.';