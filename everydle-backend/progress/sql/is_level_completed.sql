-- =====================================================
-- IS LEVEL COMPLETED - Seviye tamamlandı mı?
-- =====================================================
DROP FUNCTION IF EXISTS is_level_completed(UUID, INTEGER);

CREATE FUNCTION is_level_completed(
    p_user_id UUID,
    p_level_id INTEGER
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
    FROM completed_levels
    WHERE user_id = p_user_id AND level_id = p_level_id;
    
    v_completed := v_completed_at IS NOT NULL;
    
    RETURN json_build_object(
        'completed', v_completed,
        'completed_at', v_completed_at
    );
END;
$$;
