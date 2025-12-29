-- =====================================================
-- GAME_SAVE_STATE TABLE - Oyun kayıt durumları
-- =====================================================

CREATE TABLE IF NOT EXISTS game_save_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    game_number INTEGER NOT NULL,
    state JSONB NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id, game_number)
);

CREATE INDEX IF NOT EXISTS idx_game_save_user_id ON game_save_state(user_id);
CREATE INDEX IF NOT EXISTS idx_game_save_game_id ON game_save_state(game_id);
CREATE INDEX IF NOT EXISTS idx_game_save_completed ON game_save_state(is_completed);
