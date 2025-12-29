-- =====================================================
-- CLAIM CHEST - Sandık aç
-- =====================================================
DROP FUNCTION IF EXISTS claim_chest(UUID, DATE, INTEGER, TEXT, INTEGER);

CREATE FUNCTION claim_chest(
    p_user_id UUID,
    p_date DATE,
    p_milestone INTEGER,
    p_reward_type TEXT,
    p_reward_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_milestones INTEGER[];
BEGIN
    -- Milestone doğrulama (1, 3, 6 olabilir)
    IF p_milestone NOT IN (1, 3, 6) THEN
        RAISE EXCEPTION 'Invalid milestone. Must be 1, 3, or 6';
    END IF;
    
    -- Reward type doğrulama
    IF p_reward_type NOT IN ('coins', 'hint') THEN
        RAISE EXCEPTION 'Invalid reward type. Must be coins or hint';
    END IF;
    
    -- Sandık claim et (zaten varsa hata verir - UNIQUE constraint)
    INSERT INTO chest_claims (user_id, claim_date, milestone, reward_type, reward_amount)
    VALUES (p_user_id, p_date, p_milestone, p_reward_type, p_reward_amount);
    
    -- Güncel açılan sandıkları getir
    SELECT ARRAY_AGG(milestone ORDER BY milestone)
    INTO v_milestones
    FROM chest_claims
    WHERE user_id = p_user_id AND claim_date = p_date;
    
    RETURN json_build_object(
        'claimed_milestones', v_milestones,
        'reward', json_build_object(
            'type', p_reward_type,
            'amount', p_reward_amount
        )
    );
END;
$$;
