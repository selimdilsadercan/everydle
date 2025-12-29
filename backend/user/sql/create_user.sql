-- =====================================================
-- CREATE USER - Yeni kullanıcı oluşturma
-- =====================================================
DROP FUNCTION IF EXISTS create_user(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION create_user(
    p_firebase_id TEXT,
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
    -- Check if firebase_id already exists
    IF EXISTS (SELECT 1 FROM users WHERE firebase_id = p_firebase_id) THEN
        RAISE EXCEPTION 'User already exists';
    END IF;
    
    -- Check if username already exists
    IF p_username IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
        RAISE EXCEPTION 'Username already taken';
    END IF;
    
    INSERT INTO users (firebase_id, device_id, name, username, avatar)
    VALUES (p_firebase_id, p_device_id, p_name, p_username, p_avatar)
    RETURNING * INTO v_user;
    
    RETURN row_to_json(v_user);
END;
$$;
