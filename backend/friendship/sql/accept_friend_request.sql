-- =====================================================
-- ACCEPT FRIEND REQUEST - Arkadaşlık isteğini kabul et
-- =====================================================
DROP FUNCTION IF EXISTS accept_friend_request(UUID, UUID);

CREATE FUNCTION accept_friend_request(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_friendship friendships;
BEGIN
    -- Bekleyen istek var mı kontrol et (friend_id bana istek göndermeli)
    IF NOT EXISTS (
        SELECT 1 FROM friendships 
        WHERE user_id = p_friend_id AND friend_id = p_user_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'No pending request found';
    END IF;
    
    -- İsteği kabul et
    UPDATE friendships
    SET status = 'accepted'
    WHERE user_id = p_friend_id AND friend_id = p_user_id AND status = 'pending'
    RETURNING * INTO v_friendship;
    
    -- Ters ilişkiyi de oluştur
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (p_user_id, p_friend_id, 'accepted')
    ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';
    
    RETURN row_to_json(v_friendship);
END;
$$;
