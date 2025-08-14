-- Migration: 001_trades_tables.sql
-- Description: Create trades feature tables with proper RLS policies
-- All tables prefixed with trades_ to avoid conflicts

-- Create trades_orders table
CREATE TABLE IF NOT EXISTS trades_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_hash TEXT NOT NULL UNIQUE,
    maker_address TEXT NOT NULL,
    taker_address TEXT, -- NULL for open orders
    give_items JSONB NOT NULL, -- Array of items being offered
    take_items JSONB NOT NULL, -- Array of items being requested
    expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    nonce BIGINT NOT NULL,
    fee_bps INTEGER NOT NULL DEFAULT 0,
    signature TEXT NOT NULL, -- EIP-712 signature
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    fill_tx_hash TEXT,
    cancel_tx_hash TEXT
);

-- Create indexes for trades_orders
CREATE INDEX IF NOT EXISTS idx_trades_orders_maker ON trades_orders(maker_address);
CREATE INDEX IF NOT EXISTS idx_trades_orders_taker ON trades_orders(taker_address);
CREATE INDEX IF NOT EXISTS idx_trades_orders_status ON trades_orders(status);
CREATE INDEX IF NOT EXISTS idx_trades_orders_expiry ON trades_orders(expiry);
CREATE INDEX IF NOT EXISTS idx_trades_orders_created_at ON trades_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_orders_hash ON trades_orders(order_hash);

-- Create trades_fills table
CREATE TABLE IF NOT EXISTS trades_fills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES trades_orders(id) ON DELETE CASCADE,
    order_hash TEXT NOT NULL,
    filler_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    block_number BIGINT,
    protocol_fee DECIMAL(78, 0), -- Wei amount
    gas_used BIGINT,
    gas_price DECIMAL(78, 0), -- Wei amount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for trades_fills
CREATE INDEX IF NOT EXISTS idx_trades_fills_order_id ON trades_fills(order_id);
CREATE INDEX IF NOT EXISTS idx_trades_fills_filler ON trades_fills(filler_address);
CREATE INDEX IF NOT EXISTS idx_trades_fills_tx_hash ON trades_fills(tx_hash);
CREATE INDEX IF NOT EXISTS idx_trades_fills_created_at ON trades_fills(created_at DESC);

-- Create trades_flags table for risk scoring
CREATE TABLE IF NOT EXISTS trades_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES trades_orders(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL, -- 'collection_risk', 'approval_risk', 'value_risk', etc.
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for trades_flags
CREATE INDEX IF NOT EXISTS idx_trades_flags_order_id ON trades_flags(order_id);
CREATE INDEX IF NOT EXISTS idx_trades_flags_severity ON trades_flags(severity);
CREATE INDEX IF NOT EXISTS idx_trades_flags_type ON trades_flags(flag_type);

-- Create trades_profiles table (extends existing user profiles)
CREATE TABLE IF NOT EXISTS trades_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    twitter_handle TEXT,
    abstract_address_badge BOOLEAN DEFAULT FALSE,
    reputation_score INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    successful_trades INTEGER DEFAULT 0,
    last_trade_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for trades_profiles
CREATE INDEX IF NOT EXISTS idx_trades_profiles_wallet ON trades_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_profiles_twitter ON trades_profiles(twitter_handle);
CREATE INDEX IF NOT EXISTS idx_trades_profiles_reputation ON trades_profiles(reputation_score DESC);

-- Create trades_config table for feature flags and settings
CREATE TABLE IF NOT EXISTS trades_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config values
INSERT INTO trades_config (key, value, description) VALUES
    ('TRADES_ENABLED', 'true', 'Global trades feature enabled/disabled'),
    ('TRADES_PAUSED', 'false', 'Emergency pause switch for all trading'),
    ('TRADES_MAX_EXPIRY_HOURS', '24', 'Maximum hours for order expiry'),
    ('TRADES_MIN_RISK_SCORE_THRESHOLD', '70', 'Minimum risk score to show warnings'),
    ('TRADES_PROTOCOL_FEE_BPS', '0', 'Default protocol fee in basis points')
ON CONFLICT (key) DO NOTHING;

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_trades_orders_updated_at 
    BEFORE UPDATE ON trades_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_trades_profiles_updated_at 
    BEFORE UPDATE ON trades_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE trades_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trades_orders
-- Users can insert their own orders
CREATE POLICY "Users can insert their own orders" ON trades_orders
    FOR INSERT WITH CHECK (auth.uid()::text = maker_address OR auth.role() = 'service_role');

-- Users can view open orders or their own orders
CREATE POLICY "Users can view open orders or their own orders" ON trades_orders
    FOR SELECT USING (
        status = 'open' OR 
        auth.uid()::text = maker_address OR 
        auth.uid()::text = taker_address OR
        auth.role() = 'service_role'
    );

-- Users can update only their own orders (for cancellation)
CREATE POLICY "Users can update their own orders" ON trades_orders
    FOR UPDATE USING (auth.uid()::text = maker_address OR auth.role() = 'service_role');

-- Service role can update any order (for fill status)
CREATE POLICY "Service role can update orders" ON trades_orders
    FOR UPDATE USING (auth.role() = 'service_role');

-- RLS Policies for trades_fills
-- Anyone can view fills (public trading history)
CREATE POLICY "Anyone can view fills" ON trades_fills
    FOR SELECT USING (true);

-- Only service role can insert fills
CREATE POLICY "Service role can insert fills" ON trades_fills
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for trades_flags
-- Users can view flags for orders they're involved in
CREATE POLICY "Users can view relevant flags" ON trades_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trades_orders 
            WHERE trades_orders.id = trades_flags.order_id 
            AND (
                auth.uid()::text = trades_orders.maker_address OR 
                auth.uid()::text = trades_orders.taker_address OR
                trades_orders.status = 'open'
            )
        ) OR auth.role() = 'service_role'
    );

-- Only service role can insert/update flags
CREATE POLICY "Service role can manage flags" ON trades_flags
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for trades_profiles
-- Users can view all profiles (for trader reputation)
CREATE POLICY "Users can view all profiles" ON trades_profiles
    FOR SELECT USING (true);

-- Users can insert/update their own profile
CREATE POLICY "Users can manage their own profile" ON trades_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = wallet_address);

CREATE POLICY "Users can update their own profile" ON trades_profiles
    FOR UPDATE USING (auth.uid()::text = wallet_address OR auth.role() = 'service_role');

-- RLS Policies for trades_config
-- Anyone can read config (for feature flags)
CREATE POLICY "Anyone can read config" ON trades_config
    FOR SELECT USING (true);

-- Only service role can modify config
CREATE POLICY "Service role can modify config" ON trades_config
    FOR ALL USING (auth.role() = 'service_role');

-- Create view for order book with computed fields
CREATE OR REPLACE VIEW trades_order_book AS
SELECT 
    o.*,
    p_maker.twitter_handle as maker_twitter,
    p_maker.reputation_score as maker_reputation,
    p_taker.twitter_handle as taker_twitter,
    p_taker.reputation_score as taker_reputation,
    CASE 
        WHEN o.expiry < NOW() THEN 'expired'
        ELSE o.status 
    END as computed_status,
    (
        SELECT COUNT(*) 
        FROM trades_flags f 
        WHERE f.order_id = o.id AND f.severity IN ('high', 'critical')
    ) as high_risk_flags,
    (
        SELECT json_agg(
            json_build_object(
                'type', f.flag_type,
                'severity', f.severity,
                'message', f.message
            )
        )
        FROM trades_flags f 
        WHERE f.order_id = o.id
    ) as risk_flags
FROM trades_orders o
LEFT JOIN trades_profiles p_maker ON p_maker.wallet_address = o.maker_address
LEFT JOIN trades_profiles p_taker ON p_taker.wallet_address = o.taker_address
WHERE o.status IN ('open', 'filled') OR o.expiry > NOW() - INTERVAL '7 days';

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant limited permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON trades_orders TO authenticated;
GRANT SELECT ON trades_fills TO authenticated;
GRANT SELECT ON trades_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON trades_profiles TO authenticated;
GRANT SELECT ON trades_config TO authenticated;
GRANT SELECT ON trades_order_book TO authenticated;