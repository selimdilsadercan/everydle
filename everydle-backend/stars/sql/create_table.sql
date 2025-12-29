-- =====================================================
-- USER_STARS TABLE - Yıldız/coin bakiyesi
-- =====================================================

CREATE TABLE IF NOT EXISTS user_stars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stars INTEGER DEFAULT 100,
    last_daily_claim TIMESTAMPTZ,
    daily_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stars_user_id ON user_stars(user_id);
