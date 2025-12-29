-- =====================================================
-- MARK DAILY GAME COMPLETED - Oyunu tamamlandı işaretle
-- =====================================================
DROP FUNCTION IF EXISTS mark_daily_game_completed(UUID, TEXT, INTEGER, DATE);

CREATE FUNCTION mark_daily_game_completed(
    p_user_id UUID,
    p_game_id TEXT,
    p_game_number INTEGER,
    p_completion_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_completion daily_game_completion;
    v_already_completed BOOLEAN;
BEGIN
    -- Zaten tamamlanmış mı kontrol et
    SELECT EXISTS(
        SELECT 1 FROM daily_game_completion 
        WHERE user_id = p_user_id AND game_id = p_game_id AND game_number = p_game_number
    ) INTO v_already_completed;
    
    IF v_already_completed THEN
        SELECT * INTO v_completion
        FROM daily_game_completion
        WHERE user_id = p_user_id AND game_id = p_game_id AND game_number = p_game_number;
        
        RETURN json_build_object(
            'completion', row_to_json(v_completion),
            'already_completed', true
        );
    END IF;
    
    INSERT INTO daily_game_completion (user_id, game_id, game_number, completion_date)
    VALUES (p_user_id, p_game_id, p_game_number, p_completion_date)
    RETURNING * INTO v_completion;
    
    RETURN json_build_object(
        'completion', row_to_json(v_completion),
        'already_completed', false
    );
END;
$$;
