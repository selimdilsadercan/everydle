    -- =====================================================
    -- GET USER BY FIREBASE ID - Firebase ID ile kullanıcı getirme
    -- =====================================================
    DROP FUNCTION IF EXISTS get_user_by_firebase_id(TEXT);

    CREATE FUNCTION get_user_by_firebase_id(
        p_firebase_id TEXT
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
        WHERE firebase_id = p_firebase_id;
        
        IF NOT FOUND THEN
            RETURN NULL;
        END IF;
        
        RETURN row_to_json(v_user);
    END;
    $$;
