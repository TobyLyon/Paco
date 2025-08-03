-- ===== PACO'S UNIVERSAL LEADERBOARD & POINT TRACKING SYSTEM =====
-- Comprehensive SQL schema for cross-platform user engagement, points, and leaderboards
-- Deploy this in your Supabase SQL Editor

-- ===== 1. UNIVERSAL USER SYSTEM =====

-- Enhanced user profiles table (extends your Twitter auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Auth integration
    twitter_id TEXT UNIQUE,
    username TEXT NOT NULL,
    display_name TEXT,
    profile_image TEXT,
    
    -- Universal profile data
    email TEXT,
    total_points INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    level_id INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active', -- active, suspended, banned
    
    -- Preferences
    public_profile BOOLEAN DEFAULT true,
    show_in_leaderboards BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{"email": true, "achievements": true}',
    
    -- Stats
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    days_active INTEGER DEFAULT 1,
    total_orders INTEGER DEFAULT 0,
    total_game_sessions INTEGER DEFAULT 0,
    
    -- Metadata
    registration_source TEXT DEFAULT 'game', -- game, pfp, direct
    user_agent TEXT,
    
    CONSTRAINT valid_username CHECK (LENGTH(username) >= 2 AND LENGTH(username) <= 50)
);

-- Indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_twitter_id ON user_profiles(twitter_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_points ON user_profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON user_profiles(level_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(last_active_at DESC);

-- ===== 2. LEVEL SYSTEM =====

-- Define level tiers and requirements
CREATE TABLE IF NOT EXISTS user_levels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    xp_required INTEGER NOT NULL,
    points_bonus INTEGER DEFAULT 0, -- Bonus points when reaching this level
    color_hex TEXT DEFAULT '#fbbf24', -- Display color for this level
    icon_emoji TEXT DEFAULT '🍗',
    perks JSONB DEFAULT '[]', -- Special perks/features unlocked
    
    CONSTRAINT unique_xp_levels UNIQUE(xp_required)
);

-- Insert initial level data
INSERT INTO user_levels (id, name, xp_required, points_bonus, color_hex, icon_emoji, perks) VALUES
(1, 'Chicken Scratch', 0, 0, '#94a3b8', '🐣', '[]'),
(2, 'Feathered Friend', 100, 50, '#fbbf24', '🐤', '["early_access"]'),
(3, 'Wing Commander', 250, 100, '#f97316', '🐥', '["early_access", "exclusive_pfps"]'),
(4, 'Cluck Captain', 500, 200, '#ef4444', '🐓', '["early_access", "exclusive_pfps", "leaderboard_badge"]'),
(5, 'Rooster Royalty', 1000, 500, '#8b5cf6', '👑', '["early_access", "exclusive_pfps", "leaderboard_badge", "custom_colors"]'),
(6, 'Legendary Paco', 2500, 1000, '#ec4899', '🏆', '["all_perks", "legendary_status"]')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    xp_required = EXCLUDED.xp_required,
    points_bonus = EXCLUDED.points_bonus,
    color_hex = EXCLUDED.color_hex,
    icon_emoji = EXCLUDED.icon_emoji,
    perks = EXCLUDED.perks;

-- ===== 3. UNIVERSAL POINT SYSTEM =====

-- Activity types that award points/XP
CREATE TABLE IF NOT EXISTS activity_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    points_reward INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT NULL, -- NULL = unlimited
    category TEXT DEFAULT 'general', -- game, pfp, social, achievement
    is_active BOOLEAN DEFAULT true,
    
    -- Bonus multipliers
    streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
    weekend_multiplier DECIMAL(3,2) DEFAULT 1.0
);

-- Insert core activity types
INSERT INTO activity_types (id, name, description, points_reward, xp_reward, daily_limit, category) VALUES
-- Game activities
('game_score_submit', 'Submit Game Score', 'Submit a score in Paco Jump', 10, 5, 50, 'game'),
('game_high_score', 'New High Score', 'Beat your personal best', 50, 25, 5, 'game'),
('game_daily_play', 'Daily Player', 'Play the game today', 20, 10, 1, 'game'),
('game_evil_defeat', 'Evil Flocko Defeated', 'Defeat an evil flocko with corn power-up', 25, 15, NULL, 'game'),
('game_perfect_bounce', 'Perfect Timing Bounce', 'Execute a perfect timing bounce', 5, 2, NULL, 'game'),

-- PFP activities  
('pfp_order_create', 'PFP Order Created', 'Create a new PFP order', 30, 20, 10, 'pfp'),
('pfp_trait_combo', 'Unique Trait Combo', 'Create a rare trait combination', 15, 10, NULL, 'pfp'),
('pfp_first_order', 'First PFP Order', 'Create your very first PFP', 100, 50, 1, 'pfp'),

-- Social activities
('leaderboard_top10', 'Top 10 Daily', 'Reach top 10 on daily leaderboard', 100, 75, 1, 'social'),
('leaderboard_top3', 'Top 3 Daily', 'Reach top 3 on daily leaderboard', 200, 150, 1, 'social'),
('leaderboard_winner', 'Daily Champion', 'Win the daily leaderboard', 500, 300, 1, 'social'),

-- Achievement milestones
('level_up', 'Level Up', 'Advance to next user level', 100, 0, NULL, 'achievement'),
('login_streak_7', '7-Day Streak', 'Login for 7 consecutive days', 150, 100, NULL, 'achievement'),
('login_streak_30', '30-Day Streak', 'Login for 30 consecutive days', 750, 500, NULL, 'achievement')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    points_reward = EXCLUDED.points_reward,
    xp_reward = EXCLUDED.xp_reward,
    daily_limit = EXCLUDED.daily_limit,
    category = EXCLUDED.category,
    streak_multiplier = EXCLUDED.streak_multiplier,
    weekend_multiplier = EXCLUDED.weekend_multiplier;

-- ===== 4. USER ACTIVITY TRACKING =====

-- Track all user activities for points/XP calculation
CREATE TABLE IF NOT EXISTS user_activities (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- User and activity
    user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
    activity_type_id TEXT REFERENCES activity_types(id),
    
    -- Points/XP awarded (after multipliers)
    points_awarded INTEGER DEFAULT 0,
    xp_awarded INTEGER DEFAULT 0,
    
    -- Context data
    activity_date DATE DEFAULT CURRENT_DATE,
    context_data JSONB DEFAULT '{}', -- Game score, PFP details, etc.
    
    -- Multipliers applied
    base_points INTEGER DEFAULT 0,
    base_xp INTEGER DEFAULT 0,
    streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
    weekend_multiplier DECIMAL(3,2) DEFAULT 1.0,
    
    -- Metadata
    source TEXT DEFAULT 'web', -- web, mobile, api
    user_agent TEXT,
    
    CONSTRAINT valid_points CHECK (points_awarded >= 0),
    CONSTRAINT valid_xp CHECK (xp_awarded >= 0)
);

-- Indexes for user activities
CREATE INDEX IF NOT EXISTS idx_user_activities_user_date ON user_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_points ON user_activities(points_awarded DESC);

-- ===== 5. UNIVERSAL LEADERBOARDS =====

-- Daily leaderboard aggregations
CREATE TABLE IF NOT EXISTS daily_leaderboards (
    id BIGSERIAL PRIMARY KEY,
    leaderboard_date DATE NOT NULL,
    user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Daily totals
    daily_points INTEGER DEFAULT 0,
    daily_xp INTEGER DEFAULT 0,
    daily_activities INTEGER DEFAULT 0,
    
    -- Game-specific stats
    best_game_score INTEGER DEFAULT 0,
    total_game_sessions INTEGER DEFAULT 0,
    evil_flockos_defeated INTEGER DEFAULT 0,
    perfect_bounces INTEGER DEFAULT 0,
    
    -- PFP-specific stats
    pfp_orders_created INTEGER DEFAULT 0,
    unique_traits_used INTEGER DEFAULT 0,
    
    -- Rankings (calculated daily)
    points_rank INTEGER,
    game_rank INTEGER,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_daily_board UNIQUE(user_id, leaderboard_date)
);

-- Indexes for daily leaderboards
CREATE INDEX IF NOT EXISTS idx_daily_leaderboards_date ON daily_leaderboards(leaderboard_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_leaderboards_points_rank ON daily_leaderboards(leaderboard_date, points_rank);
CREATE INDEX IF NOT EXISTS idx_daily_leaderboards_game_rank ON daily_leaderboards(leaderboard_date, game_rank);
CREATE INDEX IF NOT EXISTS idx_daily_leaderboards_user ON daily_leaderboards(user_id);

-- ===== 6. ACHIEVEMENT SYSTEM =====

-- Define achievements users can unlock
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_emoji TEXT DEFAULT '🏆',
    category TEXT DEFAULT 'general', -- game, pfp, social, milestone
    
    -- Requirements (JSON conditions)
    requirements JSONB NOT NULL, -- {"total_points": 1000} or {"game_scores": [">", 500]}
    
    -- Rewards
    points_reward INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 0,
    title_unlocked TEXT, -- Special title for profile
    
    -- Visibility
    is_secret BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    difficulty TEXT DEFAULT 'medium', -- easy, medium, hard, legendary
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievement progress and unlocks
CREATE TABLE IF NOT EXISTS user_achievements (
    id BIGSERIAL PRIMARY KEY,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    
    user_id BIGINT REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES achievements(id),
    
    -- Progress tracking
    progress JSONB DEFAULT '{}', -- Track progress toward achievement
    is_completed BOOLEAN DEFAULT false,
    
    -- Rewards claimed
    points_claimed INTEGER DEFAULT 0,
    xp_claimed INTEGER DEFAULT 0,
    
    CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

-- Indexes for achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(is_completed, unlocked_at DESC);

-- Insert some initial achievements
INSERT INTO achievements (id, name, description, icon_emoji, category, requirements, points_reward, xp_reward, difficulty) VALUES
-- Game achievements
('first_score', 'First Flight', 'Submit your first game score', '🐣', 'game', '{"activity_count": {"game_score_submit": 1}}', 50, 25, 'easy'),
('score_master', 'Score Master', 'Reach 1000 points in a single game', '🏆', 'game', '{"max_game_score": 1000}', 200, 100, 'medium'),
('evil_slayer', 'Flocko Slayer', 'Defeat 25 evil flockos', '⚔️', 'game', '{"activity_count": {"game_evil_defeat": 25}}', 300, 200, 'hard'),
('bounce_master', 'Perfect Precision', 'Execute 100 perfect timing bounces', '⚡', 'game', '{"activity_count": {"game_perfect_bounce": 100}}', 250, 150, 'medium'),

-- PFP achievements
('first_paco', 'My First Paco', 'Create your first PFP', '🎨', 'pfp', '{"activity_count": {"pfp_order_create": 1}}', 75, 50, 'easy'),
('trait_collector', 'Trait Collector', 'Use 10 different hat types', '🎩', 'pfp', '{"unique_traits": {"hat": 10}}', 150, 100, 'medium'),
('paco_artist', 'Paco Artist', 'Create 25 different PFPs', '🖼️', 'pfp', '{"activity_count": {"pfp_order_create": 25}}', 500, 300, 'hard'),

-- Social achievements  
('leaderboard_climber', 'Rising Star', 'Reach top 10 on daily leaderboard', '🌟', 'social', '{"best_daily_rank": 10}', 200, 150, 'medium'),
('daily_champion', 'Daily Dominator', 'Win a daily leaderboard', '👑', 'social', '{"activity_count": {"leaderboard_winner": 1}}', 750, 500, 'hard'),

-- Milestone achievements
('point_milestone_1k', 'Point Collector', 'Earn 1,000 total points', '💎', 'milestone', '{"total_points": 1000}', 100, 75, 'easy'),
('point_milestone_10k', 'Point Master', 'Earn 10,000 total points', '💰', 'milestone', '{"total_points": 10000}', 1000, 750, 'hard'),
('level_5', 'Rooster Royalty', 'Reach level 5', '👑', 'milestone', '{"level": 5}', 500, 0, 'hard'),
('streak_warrior', 'Dedication Warrior', 'Maintain a 30-day login streak', '🔥', 'milestone', '{"login_streak": 30}', 1000, 500, 'legendary')

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_emoji = EXCLUDED.icon_emoji,
    category = EXCLUDED.category,
    requirements = EXCLUDED.requirements,
    points_reward = EXCLUDED.points_reward,
    xp_reward = EXCLUDED.xp_reward,
    difficulty = EXCLUDED.difficulty;

-- ===== 7. INTEGRATION WITH EXISTING TABLES =====

-- Add user_profile reference to existing game_scores table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_scores') THEN
        ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS user_profile_id BIGINT REFERENCES user_profiles(id);
    END IF;
END $$;

-- Add user_profile reference to existing paco_orders table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'paco_orders') THEN
        ALTER TABLE paco_orders ADD COLUMN IF NOT EXISTS user_profile_id BIGINT REFERENCES user_profiles(id);
    END IF;
END $$;

-- ===== 8. ROW LEVEL SECURITY =====

-- Enable RLS on all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Public read access policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Public read user_profiles'
    ) THEN
        CREATE POLICY "Public read user_profiles" ON user_profiles FOR SELECT USING (public_profile = true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_levels' 
        AND policyname = 'Public read user_levels'
    ) THEN
        CREATE POLICY "Public read user_levels" ON user_levels FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'activity_types' 
        AND policyname = 'Public read activity_types'
    ) THEN
        CREATE POLICY "Public read activity_types" ON activity_types FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_leaderboards' 
        AND policyname = 'Public read daily_leaderboards'
    ) THEN
        CREATE POLICY "Public read daily_leaderboards" ON daily_leaderboards FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'achievements' 
        AND policyname = 'Public read achievements'
    ) THEN
        CREATE POLICY "Public read achievements" ON achievements FOR SELECT USING (true);
    END IF;
END $$;

-- User-specific policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_activities' 
        AND policyname = 'Users can insert own activities'
    ) THEN
        CREATE POLICY "Users can insert own activities" ON user_activities FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_activities' 
        AND policyname = 'Users can read own activities'
    ) THEN
        CREATE POLICY "Users can read own activities" ON user_activities FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'Users can read achievements'
    ) THEN
        CREATE POLICY "Users can read achievements" ON user_achievements FOR SELECT USING (true);
    END IF;
END $$;

-- ===== 9. REAL-TIME SUBSCRIPTIONS =====

-- Enable real-time for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE user_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_leaderboards;
ALTER PUBLICATION supabase_realtime ADD TABLE user_achievements;

-- ===== 10. HELPER FUNCTIONS =====

-- Function to award points and XP to a user
CREATE OR REPLACE FUNCTION award_user_activity(
    p_user_id BIGINT,
    p_activity_type_id TEXT,
    p_context_data JSONB DEFAULT '{}'
)
RETURNS TABLE (
    points_awarded INTEGER,
    xp_awarded INTEGER,
    level_up BOOLEAN
) AS $$
DECLARE
    v_activity_type activity_types%ROWTYPE;
    v_user user_profiles%ROWTYPE;
    v_daily_count INTEGER;
    v_points INTEGER;
    v_xp INTEGER;
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_weekend_bonus DECIMAL(3,2) := 1.0;
    v_streak_bonus DECIMAL(3,2) := 1.0;
BEGIN
    -- Get activity type details
    SELECT * INTO v_activity_type FROM activity_types WHERE id = p_activity_type_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive activity type: %', p_activity_type_id;
    END IF;
    
    -- Get user details
    SELECT * INTO v_user FROM user_profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Check daily limits
    IF v_activity_type.daily_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_daily_count 
        FROM user_activities 
        WHERE user_id = p_user_id 
          AND activity_type_id = p_activity_type_id 
          AND activity_date = CURRENT_DATE;
          
        IF v_daily_count >= v_activity_type.daily_limit THEN
            -- Return zero rewards if limit exceeded
            RETURN QUERY SELECT 0, 0, false;
            RETURN;
        END IF;
    END IF;
    
    -- Apply weekend bonus (Friday-Sunday)
    IF EXTRACT(DOW FROM CURRENT_DATE) IN (0, 5, 6) THEN
        v_weekend_bonus := v_activity_type.weekend_multiplier;
    END IF;
    
    -- Calculate final rewards
    v_points := FLOOR(v_activity_type.points_reward * v_weekend_bonus * v_streak_bonus);
    v_xp := FLOOR(v_activity_type.xp_reward * v_weekend_bonus * v_streak_bonus);
    
    -- Store old level for level-up detection
    SELECT level_id INTO v_old_level FROM user_profiles WHERE id = p_user_id;
    
    -- Insert activity record
    INSERT INTO user_activities (
        user_id, activity_type_id, points_awarded, xp_awarded,
        activity_date, context_data, base_points, base_xp,
        streak_multiplier, weekend_multiplier
    ) VALUES (
        p_user_id, p_activity_type_id, v_points, v_xp,
        CURRENT_DATE, p_context_data, v_activity_type.points_reward, v_activity_type.xp_reward,
        v_streak_bonus, v_weekend_bonus
    );
    
    -- Update user totals
    UPDATE user_profiles SET 
        total_points = total_points + v_points,
        total_xp = total_xp + v_xp,
        last_active_at = NOW()
    WHERE id = p_user_id;
    
    -- Check for level up
    SELECT ul.id INTO v_new_level
    FROM user_levels ul
    WHERE ul.xp_required <= (v_user.total_xp + v_xp)
    ORDER BY ul.xp_required DESC
    LIMIT 1;
    
    -- Update level if changed
    IF v_new_level > v_old_level THEN
        UPDATE user_profiles SET level_id = v_new_level WHERE id = p_user_id;
        
        -- Award level-up bonus
        PERFORM award_user_activity(p_user_id, 'level_up', 
            json_build_object('old_level', v_old_level, 'new_level', v_new_level)::jsonb);
    END IF;
    
    -- Return results
    RETURN QUERY SELECT v_points, v_xp, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id BIGINT)
RETURNS JSONB AS $$
DECLARE
    v_user user_profiles%ROWTYPE;
    v_level user_levels%ROWTYPE;
    v_daily_stats JSONB;
    v_achievements JSONB;
    v_rankings JSONB;
BEGIN
    -- Get user profile
    SELECT * INTO v_user FROM user_profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "User not found"}'::jsonb;
    END IF;
    
    -- Get level info
    SELECT * INTO v_level FROM user_levels WHERE id = v_user.level_id;
    
    -- Get daily stats
    SELECT json_build_object(
        'today_points', COALESCE(SUM(points_awarded), 0),
        'today_xp', COALESCE(SUM(xp_awarded), 0),
        'today_activities', COUNT(*)
    ) INTO v_daily_stats
    FROM user_activities 
    WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
    
    -- Get achievements
    SELECT json_build_object(
        'total_unlocked', COUNT(*),
        'recent_achievements', json_agg(
            json_build_object(
                'id', a.id,
                'name', a.name,
                'icon_emoji', a.icon_emoji,
                'unlocked_at', ua.unlocked_at
            ) ORDER BY ua.unlocked_at DESC
        ) FILTER (WHERE ua.unlocked_at >= NOW() - INTERVAL '7 days')
    ) INTO v_achievements
    FROM user_achievements ua
    JOIN achievements a ON a.id = ua.achievement_id
    WHERE ua.user_id = p_user_id AND ua.is_completed = true;
    
    -- Get rankings
    SELECT json_build_object(
        'points_rank', points_rank,
        'game_rank', game_rank
    ) INTO v_rankings
    FROM daily_leaderboards 
    WHERE user_id = p_user_id AND leaderboard_date = CURRENT_DATE;
    
    -- Return comprehensive stats
    RETURN json_build_object(
        'user', json_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'display_name', v_user.display_name,
            'total_points', v_user.total_points,
            'total_xp', v_user.total_xp,
            'level', json_build_object(
                'id', v_level.id,
                'name', v_level.name,
                'color_hex', v_level.color_hex,
                'icon_emoji', v_level.icon_emoji
            )
        ),
        'daily_stats', v_daily_stats,
        'achievements', COALESCE(v_achievements, '{"total_unlocked": 0, "recent_achievements": []}'::jsonb),
        'rankings', COALESCE(v_rankings, '{"points_rank": null, "game_rank": null}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get universal leaderboard
CREATE OR REPLACE FUNCTION get_universal_leaderboard(
    p_leaderboard_type TEXT DEFAULT 'points', -- points, game, xp
    p_time_period TEXT DEFAULT 'daily',       -- daily, weekly, monthly, all_time
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank INTEGER,
    user_id BIGINT,
    username TEXT,
    display_name TEXT,
    profile_image TEXT,
    level_name TEXT,
    level_icon TEXT,
    level_color TEXT,
    score_value INTEGER,
    daily_change INTEGER
) AS $$
BEGIN
    IF p_time_period = 'daily' THEN
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY 
                CASE 
                    WHEN p_leaderboard_type = 'points' THEN dl.daily_points
                    WHEN p_leaderboard_type = 'game' THEN dl.best_game_score
                    WHEN p_leaderboard_type = 'xp' THEN dl.daily_xp
                    ELSE dl.daily_points
                END DESC
            )::INTEGER as rank,
            up.id as user_id,
            up.username,
            up.display_name,
            up.profile_image,
            ul.name as level_name,
            ul.icon_emoji as level_icon,
            ul.color_hex as level_color,
            CASE 
                WHEN p_leaderboard_type = 'points' THEN dl.daily_points
                WHEN p_leaderboard_type = 'game' THEN dl.best_game_score
                WHEN p_leaderboard_type = 'xp' THEN dl.daily_xp
                ELSE dl.daily_points
            END::INTEGER as score_value,
            0::INTEGER as daily_change -- TODO: Calculate change from yesterday
        FROM daily_leaderboards dl
        JOIN user_profiles up ON up.id = dl.user_id
        JOIN user_levels ul ON ul.id = up.level_id
        WHERE dl.leaderboard_date = CURRENT_DATE
          AND up.show_in_leaderboards = true
        ORDER BY score_value DESC
        LIMIT p_limit;
    ELSE
        -- Handle weekly, monthly, all_time periods
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY 
                CASE 
                    WHEN p_leaderboard_type = 'points' THEN up.total_points
                    WHEN p_leaderboard_type = 'xp' THEN up.total_xp
                    ELSE up.total_points
                END DESC
            )::INTEGER as rank,
            up.id as user_id,
            up.username,
            up.display_name,
            up.profile_image,
            ul.name as level_name,
            ul.icon_emoji as level_icon,
            ul.color_hex as level_color,
            CASE 
                WHEN p_leaderboard_type = 'points' THEN up.total_points
                WHEN p_leaderboard_type = 'xp' THEN up.total_xp
                ELSE up.total_points
            END::INTEGER as score_value,
            0::INTEGER as daily_change
        FROM user_profiles up
        JOIN user_levels ul ON ul.id = up.level_id
        WHERE up.show_in_leaderboards = true
        ORDER BY score_value DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_user_activity(BIGINT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_universal_leaderboard(TEXT, TEXT, INTEGER) TO anon, authenticated;

-- ===== 11. AUTOMATED MAINTENANCE =====

-- Function to calculate daily leaderboard rankings
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
    
    -- Calculate and insert daily rankings (basic version with just activity stats)
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
        0, -- best_game_score (will be updated when game_scores table exists)
        0, -- total_game_sessions
        0, -- evil_flockos_defeated  
        0, -- perfect_bounces
        0, -- pfp_orders_created (will be updated when paco_orders table exists)
        0, -- unique_traits_used
        NOW()
    FROM user_profiles up
    LEFT JOIN (
        -- Daily activity stats (always available)
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

GRANT EXECUTE ON FUNCTION calculate_daily_rankings(DATE) TO anon, authenticated;

-- ===== 12. SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION) =====

-- Insert sample user profile
INSERT INTO user_profiles (twitter_id, username, display_name, total_points, total_xp, level_id) 
VALUES ('demo_user_123', 'PacoMaster', 'Paco Master', 1250, 875, 3)
ON CONFLICT (twitter_id) DO NOTHING;

-- Sample activities
-- INSERT INTO user_activities (user_id, activity_type_id, points_awarded, xp_awarded, context_data)
-- VALUES 
-- (1, 'game_score_submit', 15, 10, '{"score": 850}'),
-- (1, 'pfp_order_create', 30, 20, '{"hat": "crown", "item": "taco"}'),
-- (1, 'game_evil_defeat', 25, 15, '{"flockos_defeated": 3}');

-- Calculate initial rankings
-- SELECT calculate_daily_rankings(CURRENT_DATE);

-- ===== END OF SCHEMA =====

-- Quick verification queries (run these after deployment):
-- SELECT * FROM user_levels ORDER BY xp_required;
-- SELECT * FROM activity_types WHERE is_active = true;
-- SELECT * FROM achievements WHERE is_active = true;
-- SELECT * FROM get_universal_leaderboard('points', 'daily', 10);