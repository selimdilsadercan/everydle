-- =====================================================
-- SAVE GAME STATE - Oyun durumunu kaydet
-- =====================================================
DROP FUNCTION IF EXISTS save_game_state(UUID, TEXT, INTEGER, JSONB, BOOLEAN, BOOLEAN);

CREATE FUNCTION save_game_state(
    p_user_id UUID,
    p_game_id TEXT,
    p_game_number INTEGER,
    p_state JSONB,
    p_is_completed BOOLEAN DEFAULT FALSE,
    p_is_won BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_save game_save_state;
BEGIN
    INSERT INTO game_save_state (user_id, game_id, game_number, state, is_completed, is_won)
    VALUES (p_user_id, p_game_id, p_game_number, p_state, p_is_completed, p_is_won)
    ON CONFLICT (user_id, game_id, game_number) 
    DO UPDATE SET 
        state = p_state,
        is_completed = p_is_completed,
        is_won = COALESCE(p_is_won, game_save_state.is_won),
        updated_at = NOW()
    RETURNING * INTO v_save;
    
    RETURN row_to_json(v_save);
END;
$$;
