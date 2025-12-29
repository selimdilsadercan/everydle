-- =====================================================
-- GET COMPLETED LEVELS - Tamamlanan seviyeleri listele
-- =====================================================
DROP FUNCTION IF EXISTS get_completed_levels(UUID, INTEGER, INTEGER);

CREATE FUNCTION get_completed_levels(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_levels JSON;
BEGIN
    SELECT json_agg(row_to_json(cl))
    INTO v_levels
    FROM (
        SELECT level_id, completed_at
        FROM completed_levels
        WHERE user_id = p_user_id
        ORDER BY level_id ASC
        LIMIT p_limit
        OFFSET p_offset
    ) cl;
    
    RETURN COALESCE(v_levels, '[]'::json);
END;
$$;
