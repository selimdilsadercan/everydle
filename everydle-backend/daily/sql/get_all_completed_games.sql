-- =====================================================
-- GET ALL COMPLETED GAMES - Bir oyun türüne ait tamamlananlar
-- =====================================================
DROP FUNCTION IF EXISTS get_all_completed_games(UUID, TEXT, INTEGER, INTEGER);

CREATE FUNCTION get_all_completed_games(
    p_user_id UUID,
    p_game_id TEXT,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_games JSON;
BEGIN
    SELECT json_agg(row_to_json(g))
    INTO v_games
    FROM (
        SELECT game_number, completion_date, completed_at
        FROM daily_game_completion
        WHERE user_id = p_user_id AND game_id = p_game_id
        ORDER BY game_number DESC
        LIMIT p_limit
        OFFSET p_offset
    ) g;
    
    RETURN COALESCE(v_games, '[]'::json);
END;
$$;
