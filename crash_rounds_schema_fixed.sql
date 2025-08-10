-- PacoRocko Crash Casino - Round History Schema for Supabase (FIXED)
-- Step-by-step creation to avoid column reference errors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and views to start fresh (with CASCADE to handle dependencies)
DROP VIEW IF EXISTS crash_round_stats CASCADE;
DROP VIEW IF EXISTS recent_crash_rounds CASCADE;
DROP TABLE IF EXISTS crash_bets CASCADE;
DROP TABLE IF EXISTS crash_payouts CASCADE;  -- This was the missing dependent table
DROP TABLE IF EXISTS crash_rounds CASCADE;

-- Create Crash Rounds Table with consistent column names
CREATE TABLE crash_rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    round_id VARCHAR(100) UNIQUE NOT NULL,
    crash_point DECIMAL(10,2) NOT NULL,
    round_duration INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    crashed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    server_seed VARCHAR(256),
    client_seed VARCHAR(256),
    nonce INTEGER,
    total_bets INTEGER DEFAULT 0,
    total_bet_amount DECIMAL(18,8) DEFAULT 0,
    total_payouts DECIMAL(18,8) DEFAULT 0,
    house_profit DECIMAL(18,8) DEFAULT 0,
    is_test_round BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Player Bets Table
CREATE TABLE crash_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    round_id UUID REFERENCES crash_rounds(id) ON DELETE CASCADE,
    player_address VARCHAR(42) NOT NULL,
    bet_amount DECIMAL(18,8) NOT NULL,
    cashout_multiplier DECIMAL(10,2),
    payout_amount DECIMAL(18,8),
    transaction_hash VARCHAR(66),
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cashed_out_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create Payouts Table (for detailed payout tracking)
CREATE TABLE crash_payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    round_id UUID REFERENCES crash_rounds(id) ON DELETE CASCADE,
    bet_id UUID REFERENCES crash_bets(id) ON DELETE CASCADE,
    player_address VARCHAR(42) NOT NULL,
    original_bet DECIMAL(18,8) NOT NULL,
    multiplier_at_cashout DECIMAL(10,2) NOT NULL,
    payout_amount DECIMAL(18,8) NOT NULL,
    profit_loss DECIMAL(18,8) NOT NULL, -- Positive for profit, negative for loss
    transaction_hash VARCHAR(66),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payout_type VARCHAR(20) DEFAULT 'auto' -- auto, manual, crashed
);

-- Create indexes for performance
CREATE INDEX idx_crash_rounds_started_at ON crash_rounds(started_at DESC);
CREATE INDEX idx_crash_rounds_crash_point ON crash_rounds(crash_point);
CREATE INDEX idx_crash_rounds_round_id ON crash_rounds(round_id);
CREATE INDEX idx_crash_bets_round_id ON crash_bets(round_id);
CREATE INDEX idx_crash_bets_player_address ON crash_bets(player_address);
CREATE INDEX idx_crash_bets_placed_at ON crash_bets(placed_at DESC);
CREATE INDEX idx_crash_payouts_round_id ON crash_payouts(round_id);
CREATE INDEX idx_crash_payouts_player_address ON crash_payouts(player_address);
CREATE INDEX idx_crash_payouts_processed_at ON crash_payouts(processed_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Allow read access to crash rounds" 
ON crash_rounds FOR SELECT 
USING (true);

CREATE POLICY "Allow read access to crash bets" 
ON crash_bets FOR SELECT 
USING (true);

CREATE POLICY "Allow read access to crash payouts" 
ON crash_payouts FOR SELECT 
USING (true);

-- Create RLS policies for service role write access
CREATE POLICY "Allow insert crash rounds from service" 
ON crash_rounds FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow update crash rounds from service" 
ON crash_rounds FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow insert crash bets from service" 
ON crash_bets FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow update crash bets from service" 
ON crash_bets FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow insert crash payouts from service" 
ON crash_payouts FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow update crash payouts from service" 
ON crash_payouts FOR UPDATE 
USING (auth.role() = 'service_role');

-- Now create views (after tables exist)
CREATE VIEW recent_crash_rounds AS
SELECT 
    round_id,
    crash_point,
    round_duration,
    started_at,
    crashed_at,
    total_bets,
    total_bet_amount,
    is_test_round
FROM crash_rounds 
ORDER BY started_at DESC 
LIMIT 50;

-- Create detailed stats view with payout information
CREATE VIEW crash_round_stats AS
SELECT 
    cr.round_id,
    cr.crash_point,
    cr.started_at,
    cr.crashed_at,
    COUNT(DISTINCT cb.id) as player_count,
    COALESCE(SUM(cb.bet_amount), 0) as total_wagered,
    COALESCE(SUM(cb.payout_amount), 0) as total_paid_out,
    COALESCE(SUM(cp.profit_loss), 0) as net_profit_loss,
    COUNT(CASE WHEN cb.status = 'cashed_out' THEN 1 END) as winners,
    COUNT(CASE WHEN cb.status = 'crashed' THEN 1 END) as losers,
    COUNT(DISTINCT cp.id) as total_payouts,
    COALESCE(AVG(cp.multiplier_at_cashout), 0) as avg_cashout_multiplier
FROM crash_rounds cr
LEFT JOIN crash_bets cb ON cr.id = cb.round_id
LEFT JOIN crash_payouts cp ON cr.id = cp.round_id
GROUP BY cr.id, cr.round_id, cr.crash_point, cr.started_at, cr.crashed_at
ORDER BY cr.started_at DESC;

-- Create view for player payout history
CREATE VIEW player_payout_history AS
SELECT 
    cp.player_address,
    cr.round_id,
    cr.crash_point,
    cp.original_bet,
    cp.multiplier_at_cashout,
    cp.payout_amount,
    cp.profit_loss,
    cp.payout_type,
    cp.processed_at,
    cr.started_at as round_started
FROM crash_payouts cp
JOIN crash_rounds cr ON cp.round_id = cr.id
ORDER BY cp.processed_at DESC;

-- Create view for recent payouts (last 50)
CREATE VIEW recent_payouts AS
SELECT 
    cp.player_address,
    cr.round_id,
    cr.crash_point,
    cp.original_bet,
    cp.multiplier_at_cashout,
    cp.payout_amount,
    cp.profit_loss,
    cp.processed_at
FROM crash_payouts cp
JOIN crash_rounds cr ON cp.round_id = cr.id
ORDER BY cp.processed_at DESC
LIMIT 50;

-- Create helper function for inserting rounds
CREATE OR REPLACE FUNCTION insert_crash_round(
    p_round_id VARCHAR(100),
    p_crash_point DECIMAL(10,2),
    p_round_duration INTEGER DEFAULT NULL,
    p_server_seed VARCHAR(256) DEFAULT NULL,
    p_client_seed VARCHAR(256) DEFAULT NULL,
    p_nonce INTEGER DEFAULT NULL,
    p_is_test_round BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    round_uuid UUID;
BEGIN
    INSERT INTO crash_rounds (
        round_id, crash_point, round_duration, 
        server_seed, client_seed, nonce, is_test_round
    ) VALUES (
        p_round_id, p_crash_point, p_round_duration,
        p_server_seed, p_client_seed, p_nonce, p_is_test_round
    ) RETURNING id INTO round_uuid;
    
    RETURN round_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for inserting payouts
CREATE OR REPLACE FUNCTION insert_crash_payout(
    p_round_id UUID,
    p_bet_id UUID,
    p_player_address VARCHAR(42),
    p_original_bet DECIMAL(18,8),
    p_multiplier_at_cashout DECIMAL(10,2),
    p_payout_amount DECIMAL(18,8),
    p_transaction_hash VARCHAR(66) DEFAULT NULL,
    p_payout_type VARCHAR(20) DEFAULT 'auto'
) RETURNS UUID AS $$
DECLARE
    payout_uuid UUID;
    profit_loss_amount DECIMAL(18,8);
BEGIN
    -- Calculate profit/loss (payout - original bet)
    profit_loss_amount := p_payout_amount - p_original_bet;
    
    INSERT INTO crash_payouts (
        round_id, bet_id, player_address, original_bet, 
        multiplier_at_cashout, payout_amount, profit_loss,
        transaction_hash, payout_type
    ) VALUES (
        p_round_id, p_bet_id, p_player_address, p_original_bet,
        p_multiplier_at_cashout, p_payout_amount, profit_loss_amount,
        p_transaction_hash, p_payout_type
    ) RETURNING id INTO payout_uuid;
    
    RETURN payout_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON recent_crash_rounds TO anon;
GRANT SELECT ON crash_round_stats TO anon;
GRANT SELECT ON player_payout_history TO anon;
GRANT SELECT ON recent_payouts TO anon;
GRANT SELECT ON crash_rounds TO anon;
GRANT SELECT ON crash_bets TO anon;
GRANT SELECT ON crash_payouts TO anon;

-- Test the setup with a sample insert
INSERT INTO crash_rounds (round_id, crash_point, is_test_round) 
VALUES ('test_setup_' || extract(epoch from now()), 2.45, true);

-- Verify the setup works
SELECT COUNT(*) as total_rounds FROM crash_rounds;
SELECT * FROM recent_crash_rounds LIMIT 1;
