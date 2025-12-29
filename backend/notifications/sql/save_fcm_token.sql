-- =====================================================
-- SAVE FCM TOKEN - Token kaydet veya güncelle
-- =====================================================
DROP FUNCTION IF EXISTS save_fcm_token(UUID, TEXT, TEXT);

CREATE FUNCTION save_fcm_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_record fcm_tokens;
BEGIN
    INSERT INTO fcm_tokens (user_id, token, device_type)
    VALUES (p_user_id, p_token, p_device_type)
    ON CONFLICT (user_id, token) 
    DO UPDATE SET 
        device_type = EXCLUDED.device_type,
        updated_at = NOW()
    RETURNING * INTO v_token_record;
    
    RETURN row_to_json(v_token_record);
END;
$$;
