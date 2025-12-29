-- =====================================================
-- GET CLAIMED CHESTS - O güne ait açılan sandıkları getir
-- =====================================================
DROP FUNCTION IF EXISTS get_claimed_chests(UUID, DATE);

CREATE FUNCTION get_claimed_chests(
    p_user_id UUID,
    p_date DATE
)
RETURNS INTEGER[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_milestones INTEGER[];
BEGIN
    SELECT ARRAY_AGG(milestone ORDER BY milestone)
    INTO v_milestones
    FROM chest_claims
    WHERE user_id = p_user_id AND claim_date = p_date;
    
    RETURN COALESCE(v_milestones, ARRAY[]::INTEGER[]);
END;
$$;
