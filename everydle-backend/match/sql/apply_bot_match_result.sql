-- =====================================================
-- APPLY BOT MATCH RESULT - Bot maç sonucu uygula
-- =====================================================
DROP FUNCTION IF EXISTS apply_bot_match_result(UUID, TEXT, INTEGER);

CREATE FUNCTION apply_bot_match_result(
    p_bot_id UUID,
    p_result TEXT,
    p_trophy_change INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bot bot_profiles;
    v_new_trophies INTEGER;
    v_default_change INTEGER;
BEGIN
    -- Bot var mı kontrol et
    SELECT * INTO v_bot
    FROM bot_profiles
    WHERE id = p_bot_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bot not found';
    END IF;
    
    -- Varsayılan kupa değişimi
    IF p_result = 'win' THEN
        v_default_change := COALESCE(p_trophy_change, 30);
    ELSIF p_result = 'lose' THEN
        v_default_change := COALESCE(p_trophy_change, -20);
    ELSE
        RAISE EXCEPTION 'Invalid result. Must be win or lose';
    END IF;
    
    -- Yeni kupa değerini hesapla (minimum 100 - botlar çok düşmemeli)
    v_new_trophies := GREATEST(100, v_bot.trophies + v_default_change);
    
    -- Güncelle
    UPDATE bot_profiles
    SET 
        trophies = v_new_trophies,
        wins = CASE WHEN p_result = 'win' THEN wins + 1 ELSE wins END,
        losses = CASE WHEN p_result = 'lose' THEN losses + 1 ELSE losses END
    WHERE id = p_bot_id
    RETURNING * INTO v_bot;
    
    RETURN json_build_object(
        'bot', row_to_json(v_bot),
        'trophy_change', v_default_change
    );
END;
$$;
