-- =====================================================
-- DELETE GAME STATE - Oyun durumunu sil (reset)
-- =====================================================
DROP FUNCTION IF EXISTS delete_game_state(UUID, TEXT, INTEGER);

CREATE FUNCTION delete_game_state(
    p_user_id UUID,
    p_game_id TEXT,
    p_game_number INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM game_save_state
    WHERE user_id = p_user_id AND game_id = p_game_id AND game_number = p_game_number;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', v_deleted_count > 0,
        'deleted_count', v_deleted_count
    );
END;
$$;
