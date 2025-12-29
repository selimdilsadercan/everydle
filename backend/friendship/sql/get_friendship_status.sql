-- =====================================================
-- GET FRIENDSHIP STATUS - İki kullanıcı arasındaki durumu getir
-- =====================================================
DROP FUNCTION IF EXISTS get_friendship_status(UUID, UUID);

CREATE FUNCTION get_friendship_status(
    p_user_id UUID,
    p_other_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_my_status TEXT;
    v_their_status TEXT;
    v_result TEXT;
BEGIN
    -- Benim onlara olan durumum
    SELECT status INTO v_my_status
    FROM friendships
    WHERE user_id = p_user_id AND friend_id = p_other_id;
    
    -- Onların bana olan durumu
    SELECT status INTO v_their_status
    FROM friendships
    WHERE user_id = p_other_id AND friend_id = p_user_id;
    
    -- Durumu belirle
    IF v_my_status = 'blocked' THEN
        v_result := 'blocked_by_me';
    ELSIF v_their_status = 'blocked' THEN
        v_result := 'blocked_by_them';
    ELSIF v_my_status = 'accepted' AND v_their_status = 'accepted' THEN
        v_result := 'friends';
    ELSIF v_my_status = 'pending' THEN
        v_result := 'request_sent';
    ELSIF v_their_status = 'pending' THEN
        v_result := 'request_received';
    ELSIF v_my_status = 'rejected' THEN
        v_result := 'rejected_by_them';
    ELSIF v_their_status = 'rejected' THEN
        v_result := 'rejected_by_me';
    ELSE
        v_result := 'none';
    END IF;
    
    RETURN json_build_object(
        'status', v_result,
        'my_status', v_my_status,
        'their_status', v_their_status
    );
END;
$$;
