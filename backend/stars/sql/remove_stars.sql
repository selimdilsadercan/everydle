-- =====================================================
-- REMOVE STARS - Yıldız harca
-- =====================================================
DROP FUNCTION IF EXISTS remove_stars(UUID, INTEGER);

CREATE FUNCTION remove_stars(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stars user_stars;
    v_current_stars INTEGER;
BEGIN
    -- Mevcut bakiyeyi kontrol et
    SELECT stars INTO v_current_stars
    FROM user_stars
    WHERE user_id = p_user_id;
    
    IF v_current_stars IS NULL THEN
        RAISE EXCEPTION 'User stars record not found';
    END IF;
    
    IF v_current_stars < p_amount THEN
        RAISE EXCEPTION 'Insufficient stars balance';
    END IF;
    
    UPDATE user_stars
    SET stars = stars - p_amount
    WHERE user_id = p_user_id
    RETURNING * INTO v_stars;
    
    RETURN row_to_json(v_stars);
END;
$$;
