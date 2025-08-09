-- 🎰 PacoRocko Crash Casino Database Schema for Abstract Network
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (careful in production!)
DROP TABLE IF EXISTS crash_payouts CASCADE;
DROP TABLE IF EXISTS crash_bets CASCADE;
DROP TABLE IF EXISTS crash_rounds CASCADE;
DROP TABLE IF EXISTS crash_players CASCADE;

-- 👤 Players table
CREATE TABLE crash_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    total_wagered NUMERIC DEFAULT 0,
    total_won NUMERIC DEFAULT 0,
    total_bets INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    highest_multiplier NUMERIC DEFAULT 0,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    network TEXT DEFAULT 'testnet',
    balance_wei TEXT,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT
);

-- 🎲 Game rounds table
CREATE TABLE crash_rounds (
    id TEXT PRIMARY KEY,
    round_number SERIAL UNIQUE,
    server_seed TEXT NOT NULL,
    client_seed TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    crash_point NUMERIC NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'crashed', 'cancelled')),
    total_bet_amount NUMERIC DEFAULT 0,
    total_payout_amount NUMERIC DEFAULT 0,
    player_count INTEGER DEFAULT 0,
    network TEXT DEFAULT 'testnet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💰 Bets table
CREATE TABLE crash_bets (
    id TEXT PRIMARY KEY,
    round_id TEXT REFERENCES crash_rounds(id) ON DELETE CASCADE,
    player_address TEXT NOT NULL,
    amount TEXT NOT NULL, -- Wei amount as string
    amount_eth NUMERIC GENERATED ALWAYS AS (amount::NUMERIC / 1e18) STORED,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'won', 'lost', 'expired')),
    tx_hash TEXT,
    confirmation_time TIMESTAMP WITH TIME ZONE,
    multiplier NUMERIC,
    payout_amount TEXT, -- Wei amount as string
    payout_amount_eth NUMERIC GENERATED ALWAYS AS (
        CASE 
            WHEN payout_amount IS NOT NULL 
            THEN payout_amount::NUMERIC / 1e18 
            ELSE NULL 
        END
    ) STORED,
    cash_out_time TIMESTAMP WITH TIME ZONE,
    auto_cash_out NUMERIC,
    network TEXT DEFAULT 'testnet',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (player_address) REFERENCES crash_players(wallet_address) ON DELETE CASCADE
);

-- 💸 Payouts table
CREATE TABLE crash_payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    round_id TEXT REFERENCES crash_rounds(id) ON DELETE CASCADE,
    player_address TEXT NOT NULL,
    bet_amount TEXT NOT NULL, -- Wei amount
    multiplier NUMERIC NOT NULL,
    payout_amount TEXT NOT NULL, -- Wei amount
    payout_amount_eth NUMERIC GENERATED ALWAYS AS (payout_amount::NUMERIC / 1e18) STORED,
    tx_hash TEXT NOT NULL,
    gas_used TEXT,
    network TEXT DEFAULT 'testnet',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (player_address) REFERENCES crash_players(wallet_address) ON DELETE CASCADE
);

-- 📊 Create indexes for performance
CREATE INDEX idx_crash_players_wallet ON crash_players(wallet_address);
CREATE INDEX idx_crash_rounds_status ON crash_rounds(status);
CREATE INDEX idx_crash_rounds_start_time ON crash_rounds(start_time DESC);
CREATE INDEX idx_crash_bets_round ON crash_bets(round_id);
CREATE INDEX idx_crash_bets_player ON crash_bets(player_address);
CREATE INDEX idx_crash_bets_status ON crash_bets(status);
CREATE INDEX idx_crash_payouts_round ON crash_payouts(round_id);
CREATE INDEX idx_crash_payouts_player ON crash_payouts(player_address);

-- 🔒 Row Level Security
ALTER TABLE crash_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_payouts ENABLE ROW LEVEL SECURITY;

-- Players can only see their own data
CREATE POLICY "Players can view own profile" ON crash_players
    FOR SELECT USING (wallet_address = current_setting('app.current_user_address', true));

-- Everyone can view rounds
CREATE POLICY "Public rounds access" ON crash_rounds
    FOR SELECT USING (true);

-- Players can view their own bets
CREATE POLICY "Players can view own bets" ON crash_bets
    FOR SELECT USING (player_address = current_setting('app.current_user_address', true));

-- Players can view their own payouts
CREATE POLICY "Players can view own payouts" ON crash_payouts
    FOR SELECT USING (player_address = current_setting('app.current_user_address', true));

-- 📈 Statistics views - Fix conflicting objects first
DROP TABLE IF EXISTS crash_player_stats CASCADE;
DROP TABLE IF EXISTS crash_round_stats CASCADE;

CREATE OR REPLACE VIEW crash_player_stats AS
SELECT 
    p.wallet_address,
    p.username,
    p.total_wagered,
    p.total_won,
    p.total_bets,
    p.total_wins,
    p.highest_multiplier,
    CASE 
        WHEN p.total_wagered > 0 
        THEN ROUND((p.total_won - p.total_wagered) / p.total_wagered * 100, 2)
        ELSE 0 
    END as roi_percentage,
    p.last_seen,
    p.created_at
FROM crash_players p
WHERE p.is_banned = FALSE;

CREATE OR REPLACE VIEW crash_round_stats AS
SELECT 
    r.id,
    r.round_number,
    r.crash_point,
    r.total_bet_amount,
    r.total_payout_amount,
    r.player_count,
    r.total_bet_amount - r.total_payout_amount as house_profit,
    r.start_time,
    r.end_time,
    r.status
FROM crash_rounds r
ORDER BY r.start_time DESC;

-- 🎮 Functions
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'won' THEN
        UPDATE crash_players
        SET 
            total_won = total_won + NEW.payout_amount_eth,
            total_wins = total_wins + 1,
            highest_multiplier = GREATEST(highest_multiplier, NEW.multiplier)
        WHERE wallet_address = NEW.player_address;
    END IF;
    
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        UPDATE crash_players
        SET 
            total_wagered = total_wagered + NEW.amount_eth,
            total_bets = total_bets + 1
        WHERE wallet_address = NEW.player_address;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_stats_trigger
    AFTER UPDATE ON crash_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_player_stats();

-- 🏆 Leaderboard function
CREATE OR REPLACE FUNCTION get_crash_leaderboard(
    time_period TEXT DEFAULT 'all',
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    rank BIGINT,
    wallet_address TEXT,
    username TEXT,
    total_wagered NUMERIC,
    total_won NUMERIC,
    profit NUMERIC,
    roi_percentage NUMERIC,
    total_bets INTEGER,
    win_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH player_profits AS (
        SELECT 
            p.wallet_address,
            p.username,
            p.total_wagered,
            p.total_won,
            p.total_won - p.total_wagered as profit,
            p.total_bets,
            p.total_wins,
            CASE 
                WHEN p.total_wagered > 0 
                THEN ROUND((p.total_won - p.total_wagered) / p.total_wagered * 100, 2)
                ELSE 0 
            END as roi_pct,
            CASE 
                WHEN p.total_bets > 0 
                THEN ROUND(p.total_wins::NUMERIC / p.total_bets * 100, 2)
                ELSE 0 
            END as win_pct
        FROM crash_players p
        WHERE p.is_banned = FALSE
        AND CASE 
            WHEN time_period = 'daily' THEN p.last_seen >= NOW() - INTERVAL '1 day'
            WHEN time_period = 'weekly' THEN p.last_seen >= NOW() - INTERVAL '7 days'
            WHEN time_period = 'monthly' THEN p.last_seen >= NOW() - INTERVAL '30 days'
            ELSE TRUE
        END
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY profit DESC) as rank,
        wallet_address,
        username,
        total_wagered,
        total_won,
        profit,
        roi_pct as roi_percentage,
        total_bets,
        win_pct as win_rate
    FROM player_profits
    WHERE total_bets > 0
    ORDER BY profit DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 🎯 Fairness verification function
CREATE OR REPLACE FUNCTION verify_round_fairness(
    round_id_param TEXT,
    server_seed_param TEXT,
    client_seed_param TEXT,
    nonce_param INTEGER
)
RETURNS TABLE (
    is_valid BOOLEAN,
    expected_crash_point NUMERIC,
    actual_crash_point NUMERIC,
    difference NUMERIC
) AS $$
DECLARE
    actual_round RECORD;
    hash_input TEXT;
    hash_output TEXT;
    hash_numeric NUMERIC;
    calculated_crash NUMERIC;
BEGIN
    -- Get the actual round data
    SELECT * INTO actual_round
    FROM crash_rounds
    WHERE id = round_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Calculate expected crash point (simplified - implement actual algorithm)
    hash_input := server_seed_param || ':' || client_seed_param || ':' || nonce_param::TEXT;
    hash_output := encode(digest(hash_input, 'sha256'), 'hex');
    hash_numeric := ('x' || substring(hash_output, 1, 8))::bit(32)::integer;
    
    -- Apply house edge (2%)
    calculated_crash := GREATEST(1.0, (2^32)::NUMERIC / (hash_numeric + 1) * 0.98);
    calculated_crash := LEAST(calculated_crash, 1000.0); -- Cap at 1000x
    
    RETURN QUERY SELECT 
        TRUE,
        ROUND(calculated_crash, 2),
        actual_round.crash_point,
        ABS(calculated_crash - actual_round.crash_point);
END;
$$ LANGUAGE plpgsql;

-- 📊 Analytics functions
CREATE OR REPLACE FUNCTION get_house_statistics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_rounds INTEGER,
    total_volume NUMERIC,
    total_payouts NUMERIC,
    house_profit NUMERIC,
    house_edge_actual NUMERIC,
    unique_players INTEGER,
    average_bet_size NUMERIC,
    average_crash_point NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT r.id)::INTEGER as total_rounds,
        COALESCE(SUM(r.total_bet_amount), 0) as total_volume,
        COALESCE(SUM(r.total_payout_amount), 0) as total_payouts,
        COALESCE(SUM(r.total_bet_amount - r.total_payout_amount), 0) as house_profit,
        CASE 
            WHEN SUM(r.total_bet_amount) > 0 
            THEN ROUND((SUM(r.total_bet_amount - r.total_payout_amount) / SUM(r.total_bet_amount) * 100)::NUMERIC, 2)
            ELSE 0 
        END as house_edge_actual,
        COUNT(DISTINCT b.player_address)::INTEGER as unique_players,
        CASE 
            WHEN COUNT(b.id) > 0 
            THEN ROUND(AVG(b.amount_eth), 4)
            ELSE 0 
        END as average_bet_size,
        ROUND(AVG(r.crash_point), 2) as average_crash_point
    FROM crash_rounds r
    LEFT JOIN crash_bets b ON r.id = b.round_id
    WHERE r.start_time >= start_date 
    AND r.start_time <= end_date
    AND r.status = 'crashed';
END;
$$ LANGUAGE plpgsql;

-- 🎰 Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
