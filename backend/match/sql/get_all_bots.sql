-- =====================================================
-- GET ALL BOTS - Tüm botları getir
-- =====================================================
DROP FUNCTION IF EXISTS get_all_bots(TEXT);

CREATE FUNCTION get_all_bots(p_difficulty TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT json_agg(row_to_json(b))
        FROM (
            SELECT *
            FROM bot_profiles
            WHERE (p_difficulty IS NULL OR difficulty = p_difficulty)
            ORDER BY trophies DESC
        ) b
    );
END;
$$;
