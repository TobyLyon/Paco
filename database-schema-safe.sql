-- Paco's Chicken Palace - SAFE Database Schema
-- This version safely handles existing tables and publications
-- Run this in your Supabase SQL Editor

-- ===== SAFE PACO ORDERS SETUP =====

-- Create the orders table (if it doesn't exist)
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

-- Create indexes for better query performance (safe)
CREATE INDEX IF NOT EXISTS idx_paco_orders_created_at ON paco_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_paco_orders_hat_name ON paco_orders(hat_name);
CREATE INDEX IF NOT EXISTS idx_paco_orders_item_name ON paco_orders(item_name);

-- Enable Row Level Security (safe)
ALTER TABLE paco_orders ENABLE ROW LEVEL SECURITY;

-- SAFELY add to real-time publication (only if not already added)
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'paco_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE paco_orders;
    END IF;
END $$;

-- Create policies safely
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

-- ===== SAFE GAME SCORES SETUP =====

-- Create the game scores table for Paco Jump leaderboard (if it doesn't exist)
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
    user_agent TEXT
);

-- Add unique constraint safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_scores_user_id_game_date_score_key'
    ) THEN
        ALTER TABLE game_scores ADD CONSTRAINT game_scores_user_id_game_date_score_key 
        UNIQUE(user_id, game_date, score);
    END IF;
END $$;

-- Create indexes for game scores (safe)
CREATE INDEX IF NOT EXISTS idx_game_scores_date ON game_scores(game_date);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_date ON game_scores(user_id, game_date);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_daily_leaderboard ON game_scores(game_date, score DESC);

-- Enable Row Level Security for game scores (safe)
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- SAFELY add game_scores to real-time publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'game_scores'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE game_scores;
    END IF;
END $$;

-- Create policies for game scores safely
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

-- ===== VIEWS AND FUNCTIONS =====

-- Create a view for quick stats (safe replacement)
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

-- Create a view for daily leaderboard stats (safe replacement)
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

-- Create function to get today's leaderboard with ranking (safe replacement)
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

-- Create function to get user's rank for a specific date (safe replacement)
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

-- Create popular traits function (safe replacement)
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

-- ===== VERIFICATION =====

-- Check what we created
SELECT 
    'Tables Created' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('paco_orders', 'game_scores')) as table_count;

SELECT 
    'Realtime Publications' as status,
    array_agg(tablename) as tables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('paco_orders', 'game_scores');

-- Success message
SELECT '🎉 Database setup complete! Your leaderboard should now work.' as message;