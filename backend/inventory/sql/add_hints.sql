-- =====================================================
-- ADD HINTS - İpucu ekle
-- =====================================================
DROP FUNCTION IF EXISTS add_hints(UUID, INTEGER);

CREATE FUNCTION add_hints(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inventory user_inventory;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_inventory (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    UPDATE user_inventory
    SET hints = hints + p_amount
    WHERE user_id = p_user_id
    RETURNING * INTO v_inventory;
    
    RETURN row_to_json(v_inventory);
END;
$$;
