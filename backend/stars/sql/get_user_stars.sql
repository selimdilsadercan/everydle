-- =====================================================
-- GET USER STARS - Yıldız bakiyesini getir
-- =====================================================
DROP FUNCTION IF EXISTS get_user_stars(UUID);

CREATE FUNCTION get_user_stars(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stars user_stars;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_stars (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_stars
    FROM user_stars
    WHERE user_id = p_user_id;
    
    RETURN row_to_json(v_stars);
END;
$$;
