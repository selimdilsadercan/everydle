-- =====================================================
-- USE GIVEUP - Pas kullan
-- =====================================================
DROP FUNCTION IF EXISTS use_giveup(UUID);

CREATE FUNCTION use_giveup(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inventory user_inventory;
    v_current_giveups INTEGER;
BEGIN
    SELECT giveups INTO v_current_giveups
    FROM user_inventory
    WHERE user_id = p_user_id;
    
    IF v_current_giveups IS NULL OR v_current_giveups < 1 THEN
        RAISE EXCEPTION 'No giveups available';
    END IF;
    
    UPDATE user_inventory
    SET giveups = giveups - 1
    WHERE user_id = p_user_id
    RETURNING * INTO v_inventory;
    
    RETURN row_to_json(v_inventory);
END;
$$;
