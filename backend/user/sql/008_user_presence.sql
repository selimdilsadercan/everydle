-- User presence table for tracking online status
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for efficient querying of online users
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

-- Function to clean up old presence entries (older than 1 day)
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM user_presence 
    WHERE last_seen < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
