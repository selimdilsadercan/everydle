-- =====================================================
-- ADD STARS - Yıldız ekle
-- =====================================================
DROP FUNCTION IF EXISTS add_stars(UUID, INTEGER);

CREATE FUNCTION add_stars(
    p_user_id UUID,
    p_amount INTEGER
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
    
    UPDATE user_stars
    SET stars = stars + p_amount
    WHERE user_id = p_user_id
    RETURNING * INTO v_stars;
    
    RETURN row_to_json(v_stars);
END;
$$;
