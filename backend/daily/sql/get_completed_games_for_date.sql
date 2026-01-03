-- =====================================================
-- GET COMPLETED GAMES FOR DATE - Tarihteki tamamlanan oyunlar
-- game_date: Oyunun hangi güne ait olduğu (game_number'dan hesaplanır)
-- =====================================================
DROP FUNCTION IF EXISTS get_completed_games_for_date(UUID, DATE);

CREATE FUNCTION get_completed_games_for_date(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
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
        SELECT game_id, game_number, completed_at
        FROM daily_game_completion
        WHERE user_id = p_user_id AND game_date = p_date
        ORDER BY completed_at ASC
    ) g;
    
    RETURN COALESCE(v_games, '[]'::json);
END;
$$;
