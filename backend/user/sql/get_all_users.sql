-- =====================================================
-- GET ALL USERS - Tüm kullanıcıları getir
-- =====================================================
DROP FUNCTION IF EXISTS get_all_users(INTEGER, INTEGER);

CREATE FUNCTION get_all_users(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_users JSON;
BEGIN
    SELECT json_agg(row_to_json(u))
    INTO v_users
    FROM (
        SELECT *
        FROM users
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) u;
    
    RETURN COALESCE(v_users, '[]'::json);
END;
$$;
