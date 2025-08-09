-- ============================================================================
-- 💬 PACO ROCKO - GLOBAL CHAT DATABASE SCHEMA
-- ============================================================================
-- 
-- Complete database schema for persistent global chat in PacoRocko crash casino
-- Features: Message persistence, user tracking, moderation, rate limiting
--
-- Run this in your Supabase SQL editor to create the chat system
-- ============================================================================

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- ============================================================================
-- 1. CHAT USERS TABLE
-- ============================================================================
-- Stores Twitter-authenticated users for chat
CREATE TABLE IF NOT EXISTS chat_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    twitter_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    
    -- Indexes for performance
    CONSTRAINT chat_users_twitter_id_key UNIQUE (twitter_id)
);

-- ============================================================================
-- 2. CHAT MESSAGES TABLE  
-- ============================================================================
-- Stores all global chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
    message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'system', 'moderator')),
    
    -- Message metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES chat_users(id),
    
    -- Moderation fields
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    flagged_by UUID REFERENCES chat_users(id),
    
    -- Performance indexes
    CONSTRAINT chat_messages_content_length CHECK (length(trim(content)) > 0)
);

-- ============================================================================
-- 3. CHAT RATE LIMITING TABLE
-- ============================================================================
-- Prevents spam and implements rate limiting
CREATE TABLE IF NOT EXISTS chat_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count_hour INTEGER DEFAULT 0,
    message_count_day INTEGER DEFAULT 0,
    reset_hour_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    reset_day_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 day',
    
    CONSTRAINT chat_rate_limits_user_id_key UNIQUE (user_id)
);

-- ============================================================================
-- 4. CHAT MODERATION LOG
-- ============================================================================
-- Tracks all moderation actions
CREATE TABLE IF NOT EXISTS chat_moderation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    moderator_id UUID REFERENCES chat_users(id),
    target_user_id UUID REFERENCES chat_users(id),
    message_id UUID REFERENCES chat_messages(id),
    action VARCHAR(50) NOT NULL CHECK (action IN ('delete', 'ban', 'unban', 'warn', 'timeout')),
    reason TEXT,
    duration INTERVAL, -- For timeouts/bans
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_active ON chat_messages(created_at DESC) WHERE is_deleted = FALSE;

-- Chat users indexes  
CREATE INDEX IF NOT EXISTS idx_chat_users_twitter_id ON chat_users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_chat_users_active ON chat_users(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_chat_users_username ON chat_users(username);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_user_id ON chat_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_reset ON chat_rate_limits(reset_hour_at, reset_day_at);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_moderation_log ENABLE ROW LEVEL SECURITY;

-- Chat Users Policies
CREATE POLICY "Users can view all chat users" ON chat_users
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own profile" ON chat_users
    FOR UPDATE USING (twitter_id = current_setting('app.current_user_twitter_id', true));

CREATE POLICY "System can insert users" ON chat_users
    FOR INSERT WITH CHECK (TRUE);

-- Chat Messages Policies  
CREATE POLICY "Anyone can view non-deleted messages" ON chat_messages
    FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can insert their own messages" ON chat_messages
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM chat_users 
            WHERE twitter_id = current_setting('app.current_user_twitter_id', true)
        )
    );

CREATE POLICY "Users can delete their own messages" ON chat_messages
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM chat_users 
            WHERE twitter_id = current_setting('app.current_user_twitter_id', true)
        )
    );

CREATE POLICY "Moderators can delete any message" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_users 
            WHERE twitter_id = current_setting('app.current_user_twitter_id', true)
            AND is_moderator = TRUE
        )
    );

-- ============================================================================
-- 7. FUNCTIONS FOR CHAT OPERATIONS
-- ============================================================================

-- Function: Get recent chat messages (last 50)
CREATE OR REPLACE FUNCTION get_recent_chat_messages(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    content TEXT,
    message_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    username VARCHAR(50),
    display_name VARCHAR(100),
    avatar_url TEXT,
    verified BOOLEAN
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        cm.id,
        cm.content,
        cm.message_type,
        cm.created_at,
        cu.username,
        cu.display_name,
        cu.avatar_url,
        cu.verified
    FROM chat_messages cm
    JOIN chat_users cu ON cm.user_id = cu.id
    WHERE cm.is_deleted = FALSE
    ORDER BY cm.created_at DESC
    LIMIT limit_count;
$$;

-- Function: Add new chat message with rate limiting
CREATE OR REPLACE FUNCTION add_chat_message(
    twitter_id_param VARCHAR(50),
    content_param TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record chat_users%ROWTYPE;
    rate_limit_record chat_rate_limits%ROWTYPE;
    new_message_id UUID;
    result JSON;
BEGIN
    -- Get or create user
    SELECT * INTO user_record FROM chat_users WHERE twitter_id = twitter_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found. Please authenticate first.';
    END IF;
    
    -- Check if user is banned
    IF user_record.is_banned THEN
        RAISE EXCEPTION 'User is banned from chat.';
    END IF;
    
    -- Check rate limits
    SELECT * INTO rate_limit_record FROM chat_rate_limits WHERE user_id = user_record.id;
    
    IF FOUND THEN
        -- Reset counters if time windows expired
        IF rate_limit_record.reset_hour_at < NOW() THEN
            UPDATE chat_rate_limits 
            SET message_count_hour = 0, reset_hour_at = NOW() + INTERVAL '1 hour'
            WHERE user_id = user_record.id;
            rate_limit_record.message_count_hour := 0;
        END IF;
        
        IF rate_limit_record.reset_day_at < NOW() THEN
            UPDATE chat_rate_limits 
            SET message_count_day = 0, reset_day_at = NOW() + INTERVAL '1 day'
            WHERE user_id = user_record.id;
            rate_limit_record.message_count_day := 0;
        END IF;
        
        -- Check rate limits (30 messages per hour, 200 per day)
        IF rate_limit_record.message_count_hour >= 30 THEN
            RAISE EXCEPTION 'Rate limit exceeded: Too many messages per hour.';
        END IF;
        
        IF rate_limit_record.message_count_day >= 200 THEN
            RAISE EXCEPTION 'Rate limit exceeded: Too many messages per day.';
        END IF;
    ELSE
        -- Create rate limit record for new user
        INSERT INTO chat_rate_limits (user_id) VALUES (user_record.id);
    END IF;
    
    -- Insert the message
    INSERT INTO chat_messages (user_id, content, message_type)
    VALUES (user_record.id, trim(content_param), 'user')
    RETURNING id INTO new_message_id;
    
    -- Update rate limits
    UPDATE chat_rate_limits 
    SET 
        message_count_hour = message_count_hour + 1,
        message_count_day = message_count_day + 1,
        last_message_at = NOW()
    WHERE user_id = user_record.id;
    
    -- Update user stats
    UPDATE chat_users 
    SET 
        message_count = message_count + 1,
        last_active = NOW()
    WHERE id = user_record.id;
    
    -- Return success result
    SELECT json_build_object(
        'success', true,
        'message_id', new_message_id,
        'user', json_build_object(
            'username', user_record.username,
            'display_name', user_record.display_name,
            'avatar_url', user_record.avatar_url,
            'verified', user_record.verified
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Function: Create or update chat user from Twitter auth
CREATE OR REPLACE FUNCTION upsert_chat_user(
    twitter_id_param VARCHAR(50),
    username_param VARCHAR(50),
    display_name_param VARCHAR(100),
    avatar_url_param TEXT,
    verified_param BOOLEAN DEFAULT FALSE
)
RETURNS chat_users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record chat_users%ROWTYPE;
BEGIN
    -- Try to update existing user
    UPDATE chat_users 
    SET 
        username = username_param,
        display_name = display_name_param,
        avatar_url = avatar_url_param,
        verified = verified_param,
        last_active = NOW()
    WHERE twitter_id = twitter_id_param
    RETURNING * INTO user_record;
    
    -- If no user found, create new one
    IF NOT FOUND THEN
        INSERT INTO chat_users (
            twitter_id, 
            username, 
            display_name, 
            avatar_url, 
            verified
        ) VALUES (
            twitter_id_param,
            username_param,
            display_name_param,
            avatar_url_param,
            verified_param
        ) RETURNING * INTO user_record;
    END IF;
    
    RETURN user_record;
END;
$$;

-- ============================================================================
-- 8. REAL-TIME SUBSCRIPTIONS
-- ============================================================================

-- Enable real-time for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============================================================================
-- 9. SAMPLE DATA (OPTIONAL)
-- ============================================================================

-- Insert system user for announcements
INSERT INTO chat_users (
    twitter_id, 
    username, 
    display_name, 
    avatar_url, 
    verified,
    is_moderator
) VALUES (
    'system_paco',
    'PacoRocko',
    'PacoRocko System',
    '/PACO-pfp.png',
    TRUE,
    TRUE
) ON CONFLICT (twitter_id) DO NOTHING;

-- Welcome message
INSERT INTO chat_messages (
    user_id,
    content,
    message_type
) SELECT 
    id,
    '🎰 Welcome to PacoRocko! Chat with other players while you gamble. Good luck! 🐔',
    'system'
FROM chat_users 
WHERE twitter_id = 'system_paco'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function: Clean old messages (keep last 1000)
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH old_messages AS (
        SELECT id FROM chat_messages
        ORDER BY created_at DESC
        OFFSET 1000
    )
    UPDATE chat_messages 
    SET is_deleted = TRUE, deleted_at = NOW()
    WHERE id IN (SELECT id FROM old_messages)
    AND is_deleted = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- INSTALLATION COMPLETE!
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create cleanup job (optional - run manually or set up as cron)
-- SELECT cron.schedule('cleanup-chat-messages', '0 2 * * *', 'SELECT cleanup_old_chat_messages();');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 PacoRocko Chat Database Schema installed successfully!';
    RAISE NOTICE '📝 Tables created: chat_users, chat_messages, chat_rate_limits, chat_moderation_log';
    RAISE NOTICE '🔒 Row Level Security enabled with proper policies';
    RAISE NOTICE '⚡ Real-time subscriptions enabled for live chat';
    RAISE NOTICE '🚀 Ready to integrate with frontend JavaScript!';
END
$$;
