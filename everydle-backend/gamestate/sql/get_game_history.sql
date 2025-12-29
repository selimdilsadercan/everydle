-- =====================================================
-- GET GAME HISTORY - Oyun geçmişini getir
-- =====================================================
DROP FUNCTION IF EXISTS get_game_history(UUID, TEXT, INTEGER, INTEGER);

CREATE FUNCTION get_game_history(
    p_user_id UUID,
    p_game_id TEXT,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_history JSON;
BEGIN
    SELECT json_agg(row_to_json(g))
    INTO v_history
    FROM (
        SELECT game_number, state, is_completed, is_won, created_at, updated_at
        FROM game_save_state
        WHERE user_id = p_user_id AND game_id = p_game_id
        ORDER BY game_number DESC
        LIMIT p_limit
        OFFSET p_offset
    ) g;
    
    RETURN COALESCE(v_history, '[]'::json);
END;
$$;
