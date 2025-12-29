-- =====================================================
-- GET USER - ID ile kullanıcı getirme
-- =====================================================
DROP FUNCTION IF EXISTS get_user(UUID);

CREATE FUNCTION get_user(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user users;
BEGIN
    SELECT * INTO v_user
    FROM users
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    RETURN row_to_json(v_user);
END;
$$;
