-- =====================================================
-- REJECT FRIEND REQUEST - Arkadaşlık isteğini reddet
-- =====================================================
DROP FUNCTION IF EXISTS reject_friend_request(UUID, UUID);

CREATE FUNCTION reject_friend_request(
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
    -- Bekleyen istek var mı kontrol et
    IF NOT EXISTS (
        SELECT 1 FROM friendships 
        WHERE user_id = p_friend_id AND friend_id = p_user_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'No pending request found';
    END IF;
    
    -- İsteği reddet
    UPDATE friendships
    SET status = 'rejected'
    WHERE user_id = p_friend_id AND friend_id = p_user_id AND status = 'pending'
    RETURNING * INTO v_friendship;
    
    RETURN row_to_json(v_friendship);
END;
$$;
