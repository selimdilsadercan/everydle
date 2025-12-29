-- =====================================================
-- ADD TROPHIES - Kupa ekle/çıkar
-- =====================================================
DROP FUNCTION IF EXISTS add_trophies(UUID, INTEGER);

CREATE FUNCTION add_trophies(
    p_user_id UUID,
    p_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trophies user_trophies;
    v_new_trophies INTEGER;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_trophies (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Yeni kupa değerini hesapla (minimum 0)
    SELECT GREATEST(0, trophies + p_amount) INTO v_new_trophies
    FROM user_trophies
    WHERE user_id = p_user_id;
    
    UPDATE user_trophies
    SET 
        trophies = v_new_trophies,
        highest_trophies = GREATEST(highest_trophies, v_new_trophies)
    WHERE user_id = p_user_id
    RETURNING * INTO v_trophies;
    
    RETURN row_to_json(v_trophies);
END;
$$;
