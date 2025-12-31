-- =====================================================
-- CLAIM DAILY REWARD - Günlük ödül topla (50 yıldız)
-- Günde 3 kez claim yapılabilir
-- =====================================================
DROP FUNCTION IF EXISTS claim_daily_reward(UUID);

CREATE FUNCTION claim_daily_reward(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stars user_stars;
    v_last_claim TIMESTAMPTZ;
    v_daily_claims_count INTEGER;
    v_new_streak INTEGER;
    v_reward INTEGER := 50;
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
    
    -- Günde 3 claim limiti
    IF COALESCE(v_daily_claims_count, 0) >= 3 THEN
        RAISE EXCEPTION 'Daily reward limit reached (3/3)';
    END IF;
    
    -- Streak hesapla (sadece ilk claim'de)
    IF v_daily_claims_count = 0 THEN
        IF v_last_claim IS NOT NULL AND v_last_claim::DATE = CURRENT_DATE - INTERVAL '1 day' THEN
            -- Dün claim yapılmış, streak devam ediyor
            v_new_streak := (SELECT daily_streak FROM user_stars WHERE user_id = p_user_id) + 1;
        ELSE
            -- Streak sıfırlanıyor
            v_new_streak := 1;
        END IF;
    ELSE
        -- 2. veya 3. claim, streak değişmez
        v_new_streak := (SELECT daily_streak FROM user_stars WHERE user_id = p_user_id);
    END IF;
    
    -- Güncelle
    UPDATE user_stars
    SET 
        stars = stars + v_reward,
        last_daily_claim = NOW(),
        daily_claims_count = COALESCE(v_daily_claims_count, 0) + 1,
        daily_streak = v_new_streak
    WHERE user_id = p_user_id
    RETURNING * INTO v_stars;
    
    RETURN json_build_object(
        'stars', row_to_json(v_stars),
        'reward', v_reward,
        'new_streak', v_new_streak,
        'claims_today', COALESCE(v_daily_claims_count, 0) + 1,
        'claims_remaining', 3 - (COALESCE(v_daily_claims_count, 0) + 1)
    );
END;
$$;
