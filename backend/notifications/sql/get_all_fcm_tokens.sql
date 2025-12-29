-- =====================================================
-- GET ALL FCM TOKENS - Tüm aktif tokenları getir
-- =====================================================
DROP FUNCTION IF EXISTS get_all_fcm_tokens(UUID, TEXT[]);

CREATE FUNCTION get_all_fcm_tokens(
    p_exclude_user_id UUID DEFAULT NULL,
    p_device_types TEXT[] DEFAULT NULL -- Sadece belirli cihaz tiplerini getir ('android', 'ios', 'web')
)
RETURNS TABLE (
    token TEXT,
    device_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.token, t.device_type
    FROM fcm_tokens t
    WHERE (p_exclude_user_id IS NULL OR t.user_id != p_exclude_user_id)
      AND (p_device_types IS NULL OR t.device_type = ANY(p_device_types));
END;
$$;
