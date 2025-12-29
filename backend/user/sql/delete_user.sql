-- =====================================================
-- DELETE USER - Kullanıcı silme
-- =====================================================
DROP FUNCTION IF EXISTS delete_user(UUID);

CREATE FUNCTION delete_user(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM users
    WHERE id = p_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', v_deleted_count > 0,
        'deleted_count', v_deleted_count
    );
END;
$$;
