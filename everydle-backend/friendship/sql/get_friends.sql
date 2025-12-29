-- =====================================================
-- GET FRIENDS - Arkadaş listesini getir
-- =====================================================
DROP FUNCTION IF EXISTS get_friends(UUID, INTEGER, INTEGER);

CREATE FUNCTION get_friends(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_friends JSON;
BEGIN
    SELECT json_agg(friend_data)
    INTO v_friends
    FROM (
        SELECT 
            u.id,
            u.firebase_id,
            u.name,
            u.username,
            u.avatar,
            u.created_at,
            f.created_at as friendship_created_at
        FROM friendships f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = p_user_id AND f.status = 'accepted'
        ORDER BY f.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) friend_data;
    
    RETURN COALESCE(v_friends, '[]'::json);
END;
$$;
