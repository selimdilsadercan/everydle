-- =====================================================
-- DELETE FCM TOKEN - Token sil
-- =====================================================
DROP FUNCTION IF EXISTS delete_fcm_token(UUID, TEXT);

CREATE FUNCTION delete_fcm_token(
    p_user_id UUID,
    p_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM fcm_tokens 
    WHERE user_id = p_user_id AND token = p_token;
    
    RETURN FOUND;
END;
$$;
