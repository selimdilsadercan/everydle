-- =====================================================
-- DAILY_GAME_COMPLETION TABLE - Günlük oyun tamamlama
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_game_completion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    game_number INTEGER NOT NULL,
    completion_date DATE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id, game_number)
);

CREATE INDEX IF NOT EXISTS idx_daily_game_user_id ON daily_game_completion(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_game_game_id ON daily_game_completion(game_id);
CREATE INDEX IF NOT EXISTS idx_daily_game_date ON daily_game_completion(completion_date);
