-- =====================================================
-- GET COMPLETED GAMES FOR DATE - Tarihteki tamamlanan oyunlar
-- game_date: Oyunun hangi güne ait olduğu (game_number'dan hesaplanır)
-- =====================================================
DROP FUNCTION IF EXISTS get_completed_games_for_date(UUID, DATE);

CREATE OR REPLACE FUNCTION get_completed_games_for_date(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_date DATE := '2025-11-23';
    v_game_number INTEGER;
    v_games JSON;
BEGIN
    -- Calculate game number for the given date
    v_game_number := (p_date - v_base_date) + 1;

    SELECT json_agg(row_to_json(g))
    INTO v_games
    FROM (
        WITH games AS (
            SELECT 'wordle' as game_id UNION ALL
            SELECT 'nerdle' as game_id UNION ALL
            SELECT 'quordle' as game_id UNION ALL
            SELECT 'octordle' as game_id UNION ALL
            SELECT 'pokerdle' as game_id UNION ALL
            SELECT 'moviedle' as game_id UNION ALL
            SELECT 'contexto' as game_id UNION ALL
            SELECT 'redactle' as game_id
        )
        SELECT 
            g.game_id, 
            v_game_number as game_number,
            COALESCE(s.is_completed, c.id IS NOT NULL) as is_completed,
            COALESCE(s.is_won, c.id IS NOT NULL) as is_won,
            c.completed_at,
            CASE 
                WHEN c.id IS NOT NULL OR (s.is_completed AND s.is_won) THEN 'won'
                WHEN s.is_completed AND NOT s.is_won THEN 'lost'
                WHEN s.id IS NOT NULL AND NOT s.is_completed THEN 'playing'
                ELSE 'not_played'
            END as status
        FROM games g
        LEFT JOIN daily_game_completion c ON g.game_id = c.game_id AND c.user_id = p_user_id AND c.game_date = p_date
        LEFT JOIN game_save_state s ON g.game_id = s.game_id AND s.user_id = p_user_id AND s.game_number = v_game_number
    ) g;
    
    RETURN COALESCE(v_games, '[]'::json);
END;
$$;
