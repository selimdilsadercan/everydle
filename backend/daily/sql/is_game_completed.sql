-- =====================================================
-- IS GAME COMPLETED - Oyun tamamlandı mı?
-- =====================================================
DROP FUNCTION IF EXISTS is_game_completed(UUID, TEXT, INTEGER);

CREATE FUNCTION is_game_completed(
    p_user_id UUID,
    p_game_id TEXT,
    p_game_number INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_completed BOOLEAN;
    v_completed_at TIMESTAMPTZ;
BEGIN
    SELECT completed_at INTO v_completed_at
    FROM daily_game_completion
    WHERE user_id = p_user_id AND game_id = p_game_id AND game_number = p_game_number;
    
    v_completed := v_completed_at IS NOT NULL;
    
    RETURN json_build_object(
        'completed', v_completed,
        'completed_at', v_completed_at
    );
END;
$$;
