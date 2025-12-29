-- =====================================================
-- GET GAME STATE - Oyun durumunu getir
-- =====================================================
DROP FUNCTION IF EXISTS get_game_state(UUID, TEXT, INTEGER);

CREATE FUNCTION get_game_state(
    p_user_id UUID,
    p_game_id TEXT,
    p_game_number INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_save game_save_state;
BEGIN
    SELECT * INTO v_save
    FROM game_save_state
    WHERE user_id = p_user_id AND game_id = p_game_id AND game_number = p_game_number;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN row_to_json(v_save);
END;
$$;
