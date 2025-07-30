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