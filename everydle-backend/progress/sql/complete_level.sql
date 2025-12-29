-- =====================================================
-- COMPLETE LEVEL - Bir seviyeyi tamamla
-- =====================================================
DROP FUNCTION IF EXISTS complete_level(UUID, INTEGER);

CREATE FUNCTION complete_level(
    p_user_id UUID,
    p_level_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress level_progress;
    v_already_completed BOOLEAN;
BEGIN
    -- Level progress kaydı yoksa oluştur
    INSERT INTO level_progress (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Zaten tamamlanmış mı kontrol et
    SELECT EXISTS(
        SELECT 1 FROM completed_levels 
        WHERE user_id = p_user_id AND level_id = p_level_id
    ) INTO v_already_completed;
    
    IF NOT v_already_completed THEN
        -- Tamamlanan seviyeyi kaydet
        INSERT INTO completed_levels (user_id, level_id)
        VALUES (p_user_id, p_level_id);
        
        -- Current level'ı güncelle (eğer bu seviye mevcut seviyeyse)
        UPDATE level_progress
        SET current_level = GREATEST(current_level, p_level_id + 1)
        WHERE user_id = p_user_id;
    END IF;
    
    SELECT * INTO v_progress
    FROM level_progress
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'progress', row_to_json(v_progress),
        'level_id', p_level_id,
        'already_completed', v_already_completed
    );
END;
$$;
