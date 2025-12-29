-- =====================================================
-- GET USER INVENTORY - Envanter bilgilerini getir
-- =====================================================
DROP FUNCTION IF EXISTS get_user_inventory(UUID);

CREATE FUNCTION get_user_inventory(
    p_user_id UUID
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
    
    SELECT * INTO v_inventory
    FROM user_inventory
    WHERE user_id = p_user_id;
    
    RETURN row_to_json(v_inventory);
END;
$$;
