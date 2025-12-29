-- =====================================================
-- GET PENDING REQUESTS - Gelen bekleyen istekleri getir
-- =====================================================
DROP FUNCTION IF EXISTS get_pending_requests(UUID, INTEGER, INTEGER);

CREATE FUNCTION get_pending_requests(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_requests JSON;
BEGIN
    SELECT json_agg(request_data)
    INTO v_requests
    FROM (
        SELECT 
            f.id as request_id,
            u.id,
            u.firebase_id,
            u.name,
            u.username,
            u.avatar,
            f.created_at as requested_at
        FROM friendships f
        JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = p_user_id AND f.status = 'pending'
        ORDER BY f.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) request_data;
    
    RETURN COALESCE(v_requests, '[]'::json);
END;
$$;
