-- =====================================================
-- RESET LEVEL PROGRESS - İlerlemeyi sıfırla
-- =====================================================
DROP FUNCTION IF EXISTS reset_level_progress(UUID);

CREATE FUNCTION reset_level_progress(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Tamamlanan seviyeleri sil
    DELETE FROM completed_levels
    WHERE user_id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Current level'ı sıfırla
    UPDATE level_progress
    SET current_level = 1
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'deleted_levels', v_deleted_count
    );
END;
$$;
