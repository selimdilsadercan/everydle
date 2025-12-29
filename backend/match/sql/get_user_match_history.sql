-- =====================================================
-- GET USER MATCH HISTORY - Kullanıcı maç geçmişi
-- =====================================================
DROP FUNCTION IF EXISTS get_user_match_history(UUID, INTEGER, INTEGER);

CREATE FUNCTION get_user_match_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(m))
        FROM (
            SELECT 
                id,
                match_id,
                player1_id,
                player1_type,
                player1_name,
                player2_id,
                player2_type,
                player2_name,
                winner_id,
                winner_type,
                player1_attempts,
                player2_attempts,
                player1_time_ms,
                player2_time_ms,
                player1_trophy_change,
                player2_trophy_change,
                word,
                game_type,
                created_at,
                CASE 
                    WHEN winner_id = p_user_id THEN 'win'
                    WHEN winner_id IS NULL THEN 'draw'
                    ELSE 'lose'
                END as result
            FROM match_logs
            WHERE player1_id = p_user_id OR player2_id = p_user_id
            ORDER BY created_at DESC
            LIMIT p_limit
            OFFSET p_offset
        ) m
    );
END;
$$;
