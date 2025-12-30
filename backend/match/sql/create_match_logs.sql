-- =====================================================
-- MATCH_LOGS TABLE - Maç sonuçları log tablosu
-- =====================================================

CREATE TABLE IF NOT EXISTS match_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL,
    player1_id TEXT NOT NULL,  -- User ID veya Bot ID
    player1_type TEXT NOT NULL CHECK (player1_type IN ('user', 'bot')),
    player1_name TEXT NOT NULL,
    player2_id TEXT NOT NULL,  -- User ID veya Bot ID
    player2_type TEXT NOT NULL CHECK (player2_type IN ('user', 'bot')),
    player2_name TEXT NOT NULL,
    winner_id TEXT,  -- NULL ise berabere
    winner_type TEXT CHECK (winner_type IN ('user', 'bot')),
    player1_attempts INTEGER,
    player2_attempts INTEGER,
    player1_time_ms INTEGER,
    player2_time_ms INTEGER,
    player1_trophy_change INTEGER DEFAULT 0,
    player2_trophy_change INTEGER DEFAULT 0,
    word TEXT NOT NULL,
    game_type TEXT DEFAULT 'wordle',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying match history
CREATE INDEX IF NOT EXISTS idx_match_logs_match_id ON match_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_player1_id ON match_logs(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_player2_id ON match_logs(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_created_at ON match_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_logs_game_type ON match_logs(game_type);
