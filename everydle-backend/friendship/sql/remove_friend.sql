-- =====================================================
-- REMOVE FRIEND - Arkadaşlıktan çıkar
-- =====================================================
DROP FUNCTION IF EXISTS remove_friend(UUID, UUID);

CREATE FUNCTION remove_friend(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Her iki yöndeki ilişkiyi sil
    DELETE FROM friendships
    WHERE (user_id = p_user_id AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = p_user_id);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', v_deleted_count > 0,
        'deleted_count', v_deleted_count
    );
END;
$$;
