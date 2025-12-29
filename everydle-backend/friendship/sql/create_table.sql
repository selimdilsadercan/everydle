-- =====================================================
-- FRIENDSHIPS TABLE - Arkadaşlık tablosu
-- =====================================================

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Aynı ilişkinin tekrar oluşmasını engelle
    UNIQUE(user_id, friend_id),
    
    -- Kullanıcı kendine arkadaşlık isteği gönderemez
    CHECK (user_id != friend_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
