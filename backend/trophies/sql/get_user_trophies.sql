-- =====================================================
-- GET USER TROPHIES - Kupa bilgilerini getir
-- =====================================================
DROP FUNCTION IF EXISTS get_user_trophies(UUID);

CREATE FUNCTION get_user_trophies(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trophies user_trophies;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_trophies (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_trophies
    FROM user_trophies
    WHERE user_id = p_user_id;
    
    RETURN row_to_json(v_trophies);
END;
$$;
