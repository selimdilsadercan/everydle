-- =====================================================
-- BOT_PROFILES TABLE - Bot profilleri ve istatistikleri
-- =====================================================

CREATE TABLE IF NOT EXISTS bot_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_name TEXT NOT NULL UNIQUE,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    trophies INTEGER DEFAULT 500,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_bot_profiles_trophies ON bot_profiles(trophies DESC);
CREATE INDEX IF NOT EXISTS idx_bot_profiles_difficulty ON bot_profiles(difficulty);

-- =====================================================
-- SEED DATA - Başlangıç botları
-- =====================================================

INSERT INTO bot_profiles (bot_name, difficulty, trophies) VALUES
    ('👶 AcemiBot', 'easy', 150),
    ('🌱 YeniBot', 'easy', 200),
    ('🍵 ÇaylakBot', 'easy', 250),
    ('🤖 WordleBot', 'medium', 500),
    ('🎮 AkıllıBot', 'medium', 450),
    ('🎯 UstaBot', 'medium', 550),
    ('🧠 ZekiBot', 'hard', 850),
    ('⚡ HızlıBot', 'hard', 900),
    ('🏆 ŞampiyonBot', 'hard', 1000)
ON CONFLICT (bot_name) DO NOTHING;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_bot_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bot_profiles_updated_at ON bot_profiles;
CREATE TRIGGER trigger_update_bot_profiles_updated_at
    BEFORE UPDATE ON bot_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_profiles_updated_at();
