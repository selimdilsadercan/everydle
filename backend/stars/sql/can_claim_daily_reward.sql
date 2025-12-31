-- =====================================================
-- CAN CLAIM DAILY REWARD - Günlük ödül alınabilir mi?
-- Günde 3 kez claim yapılabilir (1 ücretsiz + 2 video ile)
-- =====================================================
DROP FUNCTION IF EXISTS can_claim_daily_reward(UUID);

CREATE FUNCTION can_claim_daily_reward(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_last_claim TIMESTAMPTZ;
    v_daily_claims_count INTEGER;
    v_can_claim BOOLEAN;
    v_claims_remaining INTEGER;
    v_requires_video BOOLEAN;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_stars (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT last_daily_claim, daily_claims_count INTO v_last_claim, v_daily_claims_count
    FROM user_stars
    WHERE user_id = p_user_id;
    
    -- Bugün için claim count sıfırla (yeni gün)
    IF v_last_claim IS NULL OR v_last_claim::DATE < CURRENT_DATE THEN
        v_daily_claims_count := 0;
    END IF;
    
    -- Kalan claim sayısı
    v_claims_remaining := 3 - COALESCE(v_daily_claims_count, 0);
    
    -- Claim yapılabilir mi?
    v_can_claim := v_claims_remaining > 0;
    
    -- Video gerekiyor mu? (ilk claim hariç)
    v_requires_video := COALESCE(v_daily_claims_count, 0) >= 1;
    
    RETURN json_build_object(
        'can_claim', v_can_claim,
        'last_claim', v_last_claim,
        'claims_today', COALESCE(v_daily_claims_count, 0),
        'claims_remaining', v_claims_remaining,
        'requires_video', v_requires_video
    );
END;
$$;
