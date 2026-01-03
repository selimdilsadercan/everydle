-- =====================================================
-- GET ALL COMPLETED GAMES - Bir oyun türüne ait tamamlananlar
-- =====================================================
DROP FUNCTION IF EXISTS get_all_completed_games(UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_all_completed_games(
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
    v_base_date DATE := '2025-11-23';
    v_max_game_number INTEGER;
    v_games JSON;
BEGIN
    -- Calculate current game number
    v_max_game_number := (CURRENT_DATE - v_base_date) + 1;

    SELECT json_agg(row_to_json(g))
    INTO v_games
    FROM (
        WITH game_range AS (
            SELECT generate_series(
                GREATEST(1, v_max_game_number - p_offset - p_limit + 1), 
                GREATEST(0, v_max_game_number - p_offset)
            ) as game_number
        )
        SELECT 
            gr.game_number,
            c.completion_date,
            c.completed_at,
            COALESCE(s.is_completed, c.id IS NOT NULL) as is_completed,
            COALESCE(s.is_won, c.id IS NOT NULL) as is_won,
            CASE 
                WHEN c.id IS NOT NULL OR (s.is_completed AND s.is_won) THEN 'won'
                WHEN s.is_completed AND NOT s.is_won THEN 'lost'
                WHEN s.id IS NOT NULL AND NOT s.is_completed THEN 'playing'
                ELSE 'not_played'
            END as status
        FROM game_range gr
        LEFT JOIN daily_game_completion c ON gr.game_number = c.game_number AND c.game_id = p_game_id AND c.user_id = p_user_id
        LEFT JOIN game_save_state s ON gr.game_number = s.game_number AND s.game_id = p_game_id AND s.user_id = p_user_id
        WHERE gr.game_number >= 1
        ORDER BY gr.game_number DESC
    ) g;
    
    RETURN COALESCE(v_games, '[]'::json);
END;
$$;
