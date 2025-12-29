-- =====================================================
-- UNBLOCK USER - Engeli kaldır
-- =====================================================
DROP FUNCTION IF EXISTS unblock_user(UUID, UUID);

CREATE FUNCTION unblock_user(
    p_user_id UUID,
    p_blocked_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Engeli kaldır
    DELETE FROM friendships
    WHERE user_id = p_user_id AND friend_id = p_blocked_id AND status = 'blocked';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    IF v_deleted_count = 0 THEN
        RAISE EXCEPTION 'User is not blocked';
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'unblocked_id', p_blocked_id
    );
END;
$$;
