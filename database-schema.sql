-- Paco's Chicken Palace - Order Tracking Schema
-- Run this in your Supabase SQL Editor

-- Create the orders table
CREATE TABLE IF NOT EXISTS paco_orders (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Order details
    hat_id TEXT,
    hat_name TEXT,
    item_id TEXT,
    item_name TEXT,
    total_price DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metadata
    user_agent TEXT,
    timestamp BIGINT,
    
    -- Indexes for better performance
    CONSTRAINT paco_orders_created_at_idx CHECK (created_at IS NOT NULL)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_paco_orders_created_at ON paco_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_paco_orders_hat_name ON paco_orders(hat_name);
CREATE INDEX IF NOT EXISTS idx_paco_orders_item_name ON paco_orders(item_name);
-- Note: Removed today index due to CURRENT_DATE not being immutable

-- Enable Row Level Security (RLS)
ALTER TABLE paco_orders ENABLE ROW LEVEL SECURITY;

-- Enable real-time for live order updates
ALTER PUBLICATION supabase_realtime ADD TABLE paco_orders;

-- Create policy for public read access (anyone can view order counts)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'paco_orders' 
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON paco_orders
            FOR SELECT USING (true);
    END IF;
END $$;

-- Create policy for public insert access (anyone can create orders)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'paco_orders' 
        AND policyname = 'Allow public insert access'
    ) THEN
        CREATE POLICY "Allow public insert access" ON paco_orders
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create a view for quick stats (optional)
CREATE OR REPLACE VIEW paco_order_stats AS
SELECT 
    COUNT(*) as total_orders,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_orders,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('week', NOW()) THEN 1 END) as week_orders,
    COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as month_orders,
    AVG(total_price) as avg_order_value,
    MAX(created_at) as last_order_time
FROM paco_orders;

-- Grant access to the view
GRANT SELECT ON paco_order_stats TO anon, authenticated;

-- Optional: Create a function to get popular traits
CREATE OR REPLACE FUNCTION get_popular_traits()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'popular_hats', (
            SELECT json_agg(json_build_object('name', hat_name, 'count', count))
            FROM (
                SELECT hat_name, COUNT(*) as count
                FROM paco_orders 
                WHERE hat_name IS NOT NULL AND hat_name != ''
                GROUP BY hat_name 
                ORDER BY count DESC 
                LIMIT 5
            ) hat_stats
        ),
        'popular_items', (
            SELECT json_agg(json_build_object('name', item_name, 'count', count))
            FROM (
                SELECT item_name, COUNT(*) as count
                FROM paco_orders 
                WHERE item_name IS NOT NULL AND item_name != ''
                GROUP BY item_name 
                ORDER BY count DESC 
                LIMIT 5
            ) item_stats
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_popular_traits() TO anon, authenticated;

-- Insert some sample data (optional, for testing)
-- INSERT INTO paco_orders (hat_name, item_name, total_price) VALUES 
-- ('Sheriff Special', 'Six-Shooter Sauce', 1.50),
-- ('Royal Roast', 'Money Munchies', 1.50),
-- ('Celebration Crunch', 'Mini-Me Sandwich', 1.50);

-- View current stats
-- SELECT * FROM paco_order_stats;

-- ===== GAME LEADERBOARD SCHEMA =====

-- Create the game scores table for Paco Jump leaderboard
CREATE TABLE IF NOT EXISTS game_scores (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User details (from Twitter OAuth)
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    profile_image TEXT,
    
    -- Game data
    score INTEGER NOT NULL DEFAULT 0,
    game_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metadata
    user_agent TEXT,
    
    -- Ensure one score per user per day (users can submit multiple scores, we keep the best)
    UNIQUE(user_id, game_date, score)
);

-- Create indexes for game scores
CREATE INDEX IF NOT EXISTS idx_game_scores_date ON game_scores(game_date);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_date ON game_scores(user_id, game_date);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_daily_leaderboard ON game_scores(game_date, score DESC);

-- Enable Row Level Security for game scores
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- Enable real-time for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE game_scores;

-- Create policy for public read access (anyone can view leaderboard)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'game_scores' 
        AND policyname = 'Allow public read access to game scores'
    ) THEN
        CREATE POLICY "Allow public read access to game scores" ON game_scores
            FOR SELECT USING (true);
    END IF;
END $$;

-- Create policy for public insert access (anyone can submit scores)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'game_scores' 
        AND policyname = 'Allow public insert to game scores'
    ) THEN
        CREATE POLICY "Allow public insert to game scores" ON game_scores
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create a view for daily leaderboard stats
CREATE OR REPLACE VIEW daily_leaderboard_stats AS
SELECT 
    game_date,
    COUNT(DISTINCT user_id) as total_players,
    COUNT(*) as total_scores,
    MAX(score) as top_score,
    AVG(score)::INTEGER as average_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score)::INTEGER as median_score
FROM game_scores
GROUP BY game_date
ORDER BY game_date DESC;

-- Grant access to the view
GRANT SELECT ON daily_leaderboard_stats TO anon, authenticated;

-- Create a function to get today's leaderboard with ranking
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_daily_leaderboard(DATE) TO anon, authenticated;

-- Create a function to get user's rank for a specific date
CREATE OR REPLACE FUNCTION get_user_rank(target_user_id TEXT, target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    user_rank INTEGER;
BEGIN
    SELECT rank INTO user_rank
    FROM get_daily_leaderboard(target_date)
    WHERE user_id = target_user_id;
    
    RETURN COALESCE(user_rank, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_rank(TEXT, DATE) TO anon, authenticated;

-- Create a function to clean up old game scores (keep only last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_game_scores()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM game_scores 
    WHERE game_date < CURRENT_DATE - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cleanup function (for cron jobs)
GRANT EXECUTE ON FUNCTION cleanup_old_game_scores() TO anon, authenticated;

-- Insert some sample game scores (for testing)
-- INSERT INTO game_scores (user_id, username, display_name, score, game_date) VALUES 
-- ('demo_user_1', 'PacoMaster', 'Paco Master', 1250, CURRENT_DATE),
-- ('demo_user_2', 'ChickenJumper', 'Chicken Jumper', 980, CURRENT_DATE),
-- ('demo_user_3', 'HighFlyer', 'High Flyer', 1500, CURRENT_DATE);

-- View sample leaderboard
-- SELECT * FROM get_daily_leaderboard(CURRENT_DATE);