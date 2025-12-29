-- =====================================================
-- LOG MATCH RESULT - Maç sonucunu logla
-- =====================================================
DROP FUNCTION IF EXISTS log_match_result(TEXT, UUID, TEXT, TEXT, UUID, TEXT, TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT);

CREATE FUNCTION log_match_result(
    p_match_id TEXT,
    p_player1_id UUID,
    p_player1_type TEXT,
    p_player1_name TEXT,
    p_player2_id UUID,
    p_player2_type TEXT,
    p_player2_name TEXT,
    p_winner_id UUID DEFAULT NULL,
    p_winner_type TEXT DEFAULT NULL,
    p_player1_attempts INTEGER DEFAULT NULL,
    p_player2_attempts INTEGER DEFAULT NULL,
    p_player1_time_ms INTEGER DEFAULT NULL,
    p_player2_time_ms INTEGER DEFAULT NULL,
    p_player1_trophy_change INTEGER DEFAULT 0,
    p_player2_trophy_change INTEGER DEFAULT 0,
    p_word TEXT DEFAULT '',
    p_game_type TEXT DEFAULT 'wordle'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log match_logs;
BEGIN
    INSERT INTO match_logs (
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
        game_type
    ) VALUES (
        p_match_id,
        p_player1_id,
        p_player1_type,
        p_player1_name,
        p_player2_id,
        p_player2_type,
        p_player2_name,
        p_winner_id,
        p_winner_type,
        p_player1_attempts,
        p_player2_attempts,
        p_player1_time_ms,
        p_player2_time_ms,
        p_player1_trophy_change,
        p_player2_trophy_change,
        p_word,
        p_game_type
    )
    RETURNING * INTO v_log;
    
    RETURN row_to_json(v_log);
END;
$$;
