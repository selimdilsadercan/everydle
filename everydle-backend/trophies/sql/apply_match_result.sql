-- =====================================================
-- APPLY MATCH RESULT - Maç sonucu uygula
-- =====================================================
DROP FUNCTION IF EXISTS apply_match_result(UUID, TEXT, INTEGER);

CREATE FUNCTION apply_match_result(
    p_user_id UUID,
    p_result TEXT,
    p_trophy_change INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trophies user_trophies;
    v_new_trophies INTEGER;
    v_default_change INTEGER;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO user_trophies (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Varsayılan kupa değişimi
    IF p_result = 'win' THEN
        v_default_change := COALESCE(p_trophy_change, 30);
    ELSIF p_result = 'lose' THEN
        v_default_change := COALESCE(p_trophy_change, -20);
    ELSIF p_result = 'draw' THEN
        v_default_change := COALESCE(p_trophy_change, 0);
    ELSE
        RAISE EXCEPTION 'Invalid result. Must be win, lose, or draw';
    END IF;
    
    -- Yeni kupa değerini hesapla (minimum 0)
    SELECT GREATEST(0, trophies + v_default_change) INTO v_new_trophies
    FROM user_trophies
    WHERE user_id = p_user_id;
    
    -- Güncelle
    UPDATE user_trophies
    SET 
        trophies = v_new_trophies,
        highest_trophies = GREATEST(highest_trophies, v_new_trophies),
        wins = CASE WHEN p_result = 'win' THEN wins + 1 ELSE wins END,
        losses = CASE WHEN p_result = 'lose' THEN losses + 1 ELSE losses END,
        draws = CASE WHEN p_result = 'draw' THEN draws + 1 ELSE draws END
    WHERE user_id = p_user_id
    RETURNING * INTO v_trophies;
    
    RETURN json_build_object(
        'trophies', row_to_json(v_trophies),
        'trophy_change', v_default_change
    );
END;
$$;
