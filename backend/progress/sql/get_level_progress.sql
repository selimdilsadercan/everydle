-- =====================================================
-- GET LEVEL PROGRESS - Seviye ilerlemesini getir
-- =====================================================
DROP FUNCTION IF EXISTS get_level_progress(UUID);

CREATE FUNCTION get_level_progress(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress level_progress;
    v_completed_count INTEGER;
BEGIN
    -- Kayıt yoksa oluştur
    INSERT INTO level_progress (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO v_progress
    FROM level_progress
    WHERE user_id = p_user_id;
    
    SELECT COUNT(*) INTO v_completed_count
    FROM completed_levels
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'progress', row_to_json(v_progress),
        'completed_count', v_completed_count
    );
END;
$$;
