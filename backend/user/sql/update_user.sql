-- =====================================================
-- UPDATE USER - Kullanıcı güncelleme
-- =====================================================
DROP FUNCTION IF EXISTS update_user(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION update_user(
    p_user_id UUID,
    p_device_id TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_avatar TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user users;
BEGIN
    -- Check if username already taken by another user
    IF p_username IS NOT NULL AND EXISTS (
        SELECT 1 FROM users WHERE username = p_username AND id != p_user_id
    ) THEN
        RAISE EXCEPTION 'Username already taken';
    END IF;

    UPDATE users
    SET 
        device_id = COALESCE(p_device_id, device_id),
        name = COALESCE(p_name, name),
        username = COALESCE(p_username, username),
        avatar = COALESCE(p_avatar, avatar)
    WHERE id = p_user_id
    RETURNING * INTO v_user;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN row_to_json(v_user);
END;
$$;
