-- PacoRocko Chat Database Schema
-- Copy this entire file and paste into Supabase SQL Editor

-- Chat Users Table
CREATE TABLE chat_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    twitter_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
    message_type VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Rate Limiting Table
CREATE TABLE chat_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES chat_users(id) ON DELETE CASCADE UNIQUE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count_hour INTEGER DEFAULT 0,
    reset_hour_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Indexes
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_users_twitter_id ON chat_users(twitter_id);

-- Enable Row Level Security
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view users" ON chat_users FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can view messages" ON chat_messages FOR SELECT USING (is_deleted = FALSE);

-- Function: Get Recent Messages
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

-- Function: Add Message with Rate Limiting
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
    rate_record chat_rate_limits%ROWTYPE;
    new_message_id UUID;
BEGIN
    -- Get user
    SELECT * INTO user_record FROM chat_users WHERE twitter_id = twitter_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check rate limit
    SELECT * INTO rate_record FROM chat_rate_limits WHERE user_id = user_record.id;
    
    IF FOUND THEN
        IF rate_record.reset_hour_at < NOW() THEN
            UPDATE chat_rate_limits 
            SET message_count_hour = 0, reset_hour_at = NOW() + INTERVAL '1 hour'
            WHERE user_id = user_record.id;
            rate_record.message_count_hour := 0;
        END IF;
        
        IF rate_record.message_count_hour >= 30 THEN
            RAISE EXCEPTION 'Rate limit exceeded';
        END IF;
    ELSE
        INSERT INTO chat_rate_limits (user_id) VALUES (user_record.id);
    END IF;
    
    -- Insert message
    INSERT INTO chat_messages (user_id, content)
    VALUES (user_record.id, trim(content_param))
    RETURNING id INTO new_message_id;
    
    -- Update rate limit
    UPDATE chat_rate_limits 
    SET message_count_hour = message_count_hour + 1, last_message_at = NOW()
    WHERE user_id = user_record.id;
    
    -- Update user stats
    UPDATE chat_users 
    SET message_count = message_count + 1, last_active = NOW()
    WHERE id = user_record.id;
    
    RETURN json_build_object('success', true, 'message_id', new_message_id);
END;
$$;

-- Function: Create/Update User
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
    UPDATE chat_users 
    SET username = username_param,
        display_name = display_name_param,
        avatar_url = avatar_url_param,
        verified = verified_param,
        last_active = NOW()
    WHERE twitter_id = twitter_id_param
    RETURNING * INTO user_record;
    
    IF NOT FOUND THEN
        INSERT INTO chat_users (twitter_id, username, display_name, avatar_url, verified)
        VALUES (twitter_id_param, username_param, display_name_param, avatar_url_param, verified_param)
        RETURNING * INTO user_record;
    END IF;
    
    RETURN user_record;
END;
$$;

-- Enable Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Sample system user
INSERT INTO chat_users (twitter_id, username, display_name, avatar_url, verified)
VALUES ('system_paco', 'PacoRocko', 'PacoRocko System', '/PACO-pfp.png', TRUE)
ON CONFLICT (twitter_id) DO NOTHING;

-- Welcome message
INSERT INTO chat_messages (user_id, content, message_type)
SELECT id, 'Welcome to PacoRocko! Chat with other players while you gamble!', 'system'
FROM chat_users WHERE twitter_id = 'system_paco'
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
