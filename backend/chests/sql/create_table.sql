-- =====================================================
-- CHEST CLAIMS TABLE - Günlük sandık sistemi
-- =====================================================

CREATE TABLE IF NOT EXISTS chest_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    claim_date DATE NOT NULL,
    milestone INTEGER NOT NULL,  -- 1, 3, veya 6
    reward_type VARCHAR(10) NOT NULL,  -- 'coins' veya 'hint'
    reward_amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, claim_date, milestone)  -- Aynı gün aynı sandık bir kez açılabilir
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chest_claims_user_id ON chest_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_chest_claims_date ON chest_claims(claim_date);
CREATE INDEX IF NOT EXISTS idx_chest_claims_user_date ON chest_claims(user_id, claim_date);
