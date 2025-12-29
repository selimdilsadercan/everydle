-- =====================================================
-- USE HINT - İpucu kullan
-- =====================================================
DROP FUNCTION IF EXISTS use_hint(UUID);

CREATE FUNCTION use_hint(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inventory user_inventory;
    v_current_hints INTEGER;
BEGIN
    SELECT hints INTO v_current_hints
    FROM user_inventory
    WHERE user_id = p_user_id;
    
    IF v_current_hints IS NULL OR v_current_hints < 1 THEN
        RAISE EXCEPTION 'No hints available';
    END IF;
    
    UPDATE user_inventory
    SET hints = hints - 1
    WHERE user_id = p_user_id
    RETURNING * INTO v_inventory;
    
    RETURN row_to_json(v_inventory);
END;
$$;
