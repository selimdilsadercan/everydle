-- =====================================================
-- BLOCK USER - Kullanıcıyı engelle
-- =====================================================
DROP FUNCTION IF EXISTS block_user(UUID, UUID);

CREATE FUNCTION block_user(
    p_user_id UUID,
    p_blocked_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_friendship friendships;
BEGIN
    -- Kendini engelleyemez
    IF p_user_id = p_blocked_id THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;
    
    -- Karşı tarafın ilişkisini sil (eğer varsa)
    DELETE FROM friendships
    WHERE user_id = p_blocked_id AND friend_id = p_user_id;
    
    -- Engelle veya güncelle
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (p_user_id, p_blocked_id, 'blocked')
    ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'blocked'
    RETURNING * INTO v_friendship;
    
    RETURN row_to_json(v_friendship);
END;
$$;
