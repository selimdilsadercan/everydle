-- =====================================================
-- USER_TROPHIES TABLE - Kupa ve arena sistemi
-- =====================================================

CREATE TABLE IF NOT EXISTS user_trophies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trophies INTEGER DEFAULT 0,
    highest_trophies INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_trophies_user_id ON user_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_trophies ON user_trophies(trophies DESC);
