-- =====================================================
-- USER TABLE - Kullanıcı tablosu
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id TEXT UNIQUE NOT NULL,
    device_id TEXT,
    name TEXT,
    username TEXT UNIQUE,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for firebase_id lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_id ON users(firebase_id);

-- Index for device_id lookups
CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
