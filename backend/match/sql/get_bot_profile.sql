-- =====================================================
-- GET BOT PROFILE - Tek bot profili getir
-- =====================================================
DROP FUNCTION IF EXISTS get_bot_profile(UUID);

CREATE FUNCTION get_bot_profile(p_bot_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bot bot_profiles;
BEGIN
    SELECT * INTO v_bot
    FROM bot_profiles
    WHERE id = p_bot_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN row_to_json(v_bot);
END;
$$;
