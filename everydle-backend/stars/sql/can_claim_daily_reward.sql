-- =====================================================
-- CAN CLAIM DAILY REWARD - Günlük ödül alınabilir mi?
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
    v_can_claim BOOLEAN;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_stars (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT last_daily_claim INTO v_last_claim
    FROM user_stars
    WHERE user_id = p_user_id;
    
    -- Hiç claim yapılmadıysa veya son claim bugünden önceyse
    v_can_claim := v_last_claim IS NULL OR v_last_claim::DATE < CURRENT_DATE;
    
    RETURN json_build_object(
        'can_claim', v_can_claim,
        'last_claim', v_last_claim
    );
END;
$$;
