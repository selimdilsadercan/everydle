-- =====================================================
-- GET RANDOM BOT - Rastgele bot seç (opsiyonel zorluk filtresi)
-- =====================================================
DROP FUNCTION IF EXISTS get_random_bot(TEXT);

CREATE FUNCTION get_random_bot(p_difficulty TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bot bot_profiles;
BEGIN
    SELECT * INTO v_bot
    FROM bot_profiles
    WHERE (p_difficulty IS NULL OR difficulty = p_difficulty)
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN row_to_json(v_bot);
END;
$$;
