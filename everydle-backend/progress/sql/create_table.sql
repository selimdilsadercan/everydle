-- =====================================================
-- LEVEL_PROGRESS TABLE - Seviye ilerleme takibi
-- =====================================================

CREATE TABLE IF NOT EXISTS level_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS completed_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_level_progress_user_id ON level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_levels_user_id ON completed_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_completed_levels_level_id ON completed_levels(level_id);
