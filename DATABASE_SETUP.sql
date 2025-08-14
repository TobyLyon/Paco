-- 🐔 PACO THE CHICKEN - MASTER DATABASE SCHEMA
-- Run this ENTIRE file in your Supabase SQL Editor to set up everything
-- 
-- This includes ALL tables for:
-- 🎮 Jump Game + PFP Generator + Leaderboards
-- 🎰 PacoRocko Crash Casino + Chat
-- 🏆 Universal scoring system
--
-- Last Updated: 2025-01-09

-- ===== EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== CLEANUP (Optional - DANGER: Deletes all data!) =====
-- Uncomment these lines ONLY if you want to start fresh:
-- DROP TABLE IF EXISTS crash_payouts CASCADE;
-- DROP TABLE IF EXISTS crash_bets CASCADE; 
-- DROP TABLE IF EXISTS crash_rounds CASCADE;
-- DROP TABLE IF EXISTS crash_players CASCADE;
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS chat_users CASCADE;
-- DROP TABLE IF EXISTS game_scores CASCADE;
-- DROP TABLE IF EXISTS paco_orders CASCADE;

-- ===================================================================
-- 🎮 JUMP GAME & PFP GENERATOR TABLES
-- ===================================================================

-- Game Scores (Jump Game Leaderboard)
CREATE TABLE IF NOT EXISTS game_scores (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Player info
    user_id TEXT NOT NULL,           -- Twitter user ID
    username TEXT NOT NULL,          -- @username
    display_name TEXT,               -- Full display name
    avatar_url TEXT,
    
    -- Score data
    score INTEGER NOT NULL CHECK (score >= 0),
    height_reached INTEGER DEFAULT 0,
    platforms_hit INTEGER DEFAULT 0,
    game_duration INTEGER DEFAULT 0, -- seconds
    
    -- Tracking
    game_date DATE DEFAULT CURRENT_DATE,
    session_id TEXT,
    verified BOOLEAN DEFAULT TRUE,
    
    -- Prevent cheating - only one score per user per day
    CONSTRAINT unique_user_daily_score UNIQUE (user_id, game_date)
);

-- PFP Generator Orders
CREATE TABLE IF NOT EXISTS paco_orders (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Order details
    hat_id TEXT,
    hat_name TEXT,
    item_id TEXT,
    item_name TEXT,
    background_color TEXT DEFAULT 'transparent',
    
    -- Customer (optional - anonymous orders allowed)
    customer_name TEXT,
    customer_twitter TEXT,
    customer_wallet TEXT,
    
    -- Order tracking
    order_status TEXT DEFAULT 'pending',
    special_requests TEXT,
    estimated_delivery TIMESTAMPTZ,
    
    -- Generated image
    image_url TEXT,
    
    -- Analytics
    referral_source TEXT,
    ip_address INET
);

-- ===================================================================
-- 🎰 PACOROCKO CRASH CASINO TABLES  
-- ===================================================================

-- Casino Players
CREATE TABLE IF NOT EXISTS crash_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Identity
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    twitter_id TEXT,
    avatar_url TEXT,
    
    -- Stats
    total_wagered DECIMAL(18,8) DEFAULT 0,
    total_won DECIMAL(18,8) DEFAULT 0,
    total_lost DECIMAL(18,8) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    
    -- Status
    is_banned BOOLEAN DEFAULT FALSE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    
    -- Preferences
    auto_cashout_enabled BOOLEAN DEFAULT FALSE,
    auto_cashout_multiplier DECIMAL(5,2) DEFAULT 2.0
);

-- Casino Game Rounds
CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    commit_hash TEXT NOT NULL,
    seed_revealed TEXT,
    crash_point_ppm BIGINT,
    started_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
);

-- User and wallet linking (for custody and payouts)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    nickname TEXT,
    country TEXT,
    agw_id TEXT,
    eoa_address TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS wallet_links (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    wallet_type TEXT CHECK (wallet_type IN ('AGW','EOA')),
    address TEXT,
    primary_wallet BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, wallet_type, address)
);

CREATE TABLE IF NOT EXISTS deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    tx_hash TEXT,
    amount_wei TEXT,
    status TEXT CHECK (status IN ('pending','confirmed')) DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Casino Bets
CREATE TABLE IF NOT EXISTS crash_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- References
    player_id UUID NOT NULL REFERENCES crash_players(id) ON DELETE CASCADE,
    round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    
    -- Bet details
    bet_amount DECIMAL(18,8) NOT NULL,
    auto_cashout_multiplier DECIMAL(5,2),
    actual_cashout_multiplier DECIMAL(8,2),
    
    -- Results
    cashed_out BOOLEAN DEFAULT FALSE,
    cashout_timestamp TIMESTAMPTZ,
    payout_amount DECIMAL(18,8) DEFAULT 0,
    profit_loss DECIMAL(18,8) DEFAULT 0,
    
    -- Blockchain
    bet_transaction_hash TEXT,
    payout_transaction_hash TEXT,
    
    CONSTRAINT valid_bet_amount CHECK (bet_amount > 0),
    CONSTRAINT valid_auto_cashout CHECK (auto_cashout_multiplier IS NULL OR auto_cashout_multiplier >= 1.0)
);

-- Casino Payouts (for accounting)
CREATE TABLE IF NOT EXISTS payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- References
    bet_id UUID,
    user_id UUID,
    
    -- Payout details
    amount_wei TEXT,
    dest_address TEXT,
    tx_hash TEXT,
    status TEXT DEFAULT 'queued', -- queued, sent, confirmed, failed
    
    -- Blockchain confirmation
    attempts INTEGER DEFAULT 0,
    last_error TEXT
);

-- User Balances (for balance-based betting)
CREATE TABLE IF NOT EXISTS user_balances (
    address TEXT PRIMARY KEY,
    balance DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance deposits (separate from main deposits table)
CREATE TABLE IF NOT EXISTS balance_deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tx_hash TEXT UNIQUE NOT NULL,
    from_address TEXT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    memo TEXT,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance-based bets
CREATE TABLE IF NOT EXISTS balance_bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    address TEXT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance withdrawals (separate from main withdrawals)
CREATE TABLE IF NOT EXISTS balance_withdrawals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    address TEXT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    tx_hash TEXT,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    account TEXT CHECK (account IN ('user','house')) NOT NULL,
    user_id UUID,
    delta_wei TEXT NOT NULL,
    ref_type TEXT,
    ref_id TEXT
);

CREATE TABLE IF NOT EXISTS limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    max_bet_wei TEXT,
    max_liability_factor REAL,
    per_user_cooldown_ms BIGINT,
    round_cap INTEGER
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    payload JSONB,
    cursor_block TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- 💬 CHAT SYSTEM TABLES
-- ===================================================================

-- Chat Users
CREATE TABLE IF NOT EXISTS chat_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Identity
    twitter_id VARCHAR(50) UNIQUE,
    wallet_address TEXT UNIQUE,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    
    -- Status
    verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    
    -- Activity
    last_active TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    
    -- Settings
    chat_color VARCHAR(7) DEFAULT '#ffffff'
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Message data
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    channel VARCHAR(50) DEFAULT 'general',
    
    -- Moderation
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID REFERENCES chat_users(id),
    deleted_reason TEXT,
    
    -- Features
    reply_to UUID REFERENCES chat_messages(id),
    mentions UUID[],
    
    CONSTRAINT message_length CHECK (length(message) <= 500)
);

-- ===================================================================
-- 🔐 ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE paco_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Game Scores: Public read, authenticated write
CREATE POLICY "Public can view game scores" ON game_scores FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert scores" ON game_scores FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Users can update their own scores" ON game_scores FOR UPDATE USING (user_id = auth.jwt() ->> 'user_id');

-- PFP Orders: Public read and write (anonymous orders allowed)
CREATE POLICY "Anyone can view orders" ON paco_orders FOR SELECT USING (true);
CREATE POLICY "Anyone can create orders" ON paco_orders FOR INSERT WITH CHECK (true);

-- Crash Casino: Authenticated users only
CREATE POLICY "Authenticated users can view their crash data" ON crash_players FOR ALL USING (wallet_address = auth.jwt() ->> 'wallet_address');
CREATE POLICY "Anyone can view crash rounds" ON rounds FOR SELECT USING (true);
CREATE POLICY "Users can view their own bets" ON crash_bets FOR ALL USING (player_id IN (SELECT id FROM crash_players WHERE wallet_address = auth.jwt() ->> 'wallet_address'));
CREATE POLICY "Users can view their own payouts" ON payouts FOR SELECT USING (
    user_id = auth.uid() OR dest_address = (auth.jwt() ->> 'wallet_address')
);

-- Chat: Public read, authenticated write
CREATE POLICY "Anyone can view chat messages" ON chat_messages FOR SELECT USING (NOT is_deleted);
CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can edit their own messages" ON chat_messages FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Anyone can view chat users" ON chat_users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON chat_users FOR ALL USING (id = auth.uid());

-- ===================================================================
-- 📊 INDEXES FOR PERFORMANCE
-- ===================================================================

-- Game Scores indexes
CREATE INDEX IF NOT EXISTS idx_game_scores_user_date ON game_scores(user_id, game_date);
CREATE INDEX IF NOT EXISTS idx_game_scores_date_score ON game_scores(game_date DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at DESC);

-- Crash Casino indexes
CREATE INDEX IF NOT EXISTS idx_crash_players_wallet ON crash_players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_rounds_created ON rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_bets_player_round ON crash_bets(player_id, round_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_round ON crash_bets(round_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_twitter ON chat_users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_wallet ON chat_users(wallet_address);

-- ===================================================================
-- 📡 REAL-TIME SUBSCRIPTIONS
-- ===================================================================

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE game_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE crash_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ===================================================================
-- 🎯 FUNCTIONS & TRIGGERS
-- ===================================================================

-- Update modified timestamp function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_crash_players_modtime BEFORE UPDATE ON crash_players FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_game_scores_modtime BEFORE UPDATE ON game_scores FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Leaderboard function (returns top scores for a specific date)
CREATE OR REPLACE FUNCTION get_daily_leaderboard(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    rank BIGINT,
    user_id TEXT,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    score INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY s.score DESC, s.created_at ASC) as rank,
        s.user_id,
        s.username,
        s.display_name,
        s.avatar_url,
        s.score,
        s.created_at
    FROM game_scores s
    WHERE s.game_date = target_date
    ORDER BY s.score DESC, s.created_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- All-time leaderboard function (best score per user)
CREATE OR REPLACE FUNCTION get_alltime_leaderboard()
RETURNS TABLE (
    rank BIGINT,
    user_id TEXT,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    score INTEGER,
    achieved_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH best_scores AS (
        SELECT DISTINCT ON (s.user_id)
            s.user_id,
            s.username,
            s.display_name,
            s.avatar_url,
            s.score,
            s.game_date as achieved_date
        FROM game_scores s
        ORDER BY s.user_id, s.score DESC, s.created_at ASC
    )
    SELECT 
        ROW_NUMBER() OVER (ORDER BY bs.score DESC) as rank,
        bs.user_id,
        bs.username,
        bs.display_name,
        bs.avatar_url,
        bs.score,
        bs.achieved_date
    FROM best_scores bs
    ORDER BY bs.score DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- ✅ SETUP COMPLETE!
-- ===================================================================

-- Insert some sample data for testing (optional)
-- Uncomment these lines if you want test data:

-- INSERT INTO chat_users (twitter_id, username, display_name, verified) 
-- VALUES ('123456789', 'pacothechicken', 'Paco The Chicken', true)
-- ON CONFLICT (twitter_id) DO NOTHING;

-- Sample game score
-- INSERT INTO game_scores (user_id, username, display_name, score, height_reached)
-- VALUES ('123456789', 'pacothechicken', 'Paco The Chicken', 1000, 500)
-- ON CONFLICT (user_id, game_date) DO NOTHING;

-- Verify setup
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('game_scores', 'paco_orders', 'crash_players', 'rounds', 'crash_bets', 'payouts', 'chat_messages', 'chat_users')
ORDER BY tablename;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
    AND routine_name IN ('get_daily_leaderboard', 'get_alltime_leaderboard')
ORDER BY routine_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 PACO DATABASE SETUP COMPLETE!';
    RAISE NOTICE '✅ All tables created successfully';
    RAISE NOTICE '✅ Row Level Security policies applied';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '✅ Real-time subscriptions enabled';
    RAISE NOTICE '✅ Leaderboard functions ready';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 Ready for: Jump Game, PFP Generator, Crash Casino, Chat';
    RAISE NOTICE '🚀 Your Paco ecosystem database is ready!';
END $$;
