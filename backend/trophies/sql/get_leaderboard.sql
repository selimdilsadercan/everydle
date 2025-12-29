-- =====================================================
-- GET LEADERBOARD - Trophies skor tablosunu getir (Kullanıcılar + Botlar)
-- =====================================================
DROP FUNCTION IF EXISTS get_leaderboard(INTEGER, INTEGER);

CREATE FUNCTION get_leaderboard(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    username TEXT,
    avatar TEXT,
    trophies INTEGER,
    wins INTEGER,
    losses INTEGER,
    rank BIGINT,
    player_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH combined_leaderboard AS (
        -- Kullanıcılar
        SELECT 
            u.id as player_id,
            u.name as player_name,
            u.username as player_username,
            u.avatar as player_avatar,
            t.trophies as player_trophies,
            t.wins as player_wins,
            t.losses as player_losses,
            'user'::TEXT as type
        FROM user_trophies t
        JOIN users u ON t.user_id = u.id
        WHERE u.username IS NOT NULL AND u.username != ''
        
        UNION ALL
        
        -- Botlar
        SELECT 
            b.id as player_id,
            b.bot_name as player_name,
            b.bot_name as player_username,
            NULL as player_avatar,
            b.trophies as player_trophies,
            b.wins as player_wins,
            b.losses as player_losses,
            'bot'::TEXT as type
        FROM bot_profiles b
    )
    SELECT 
        cl.player_id as user_id,
        cl.player_name as name,
        cl.player_username as username,
        cl.player_avatar as avatar,
        cl.player_trophies as trophies,
        cl.player_wins as wins,
        cl.player_losses as losses,
        ROW_NUMBER() OVER(ORDER BY cl.player_trophies DESC, cl.player_wins DESC) as rank,
        cl.type as player_type
    FROM combined_leaderboard cl
    ORDER BY cl.player_trophies DESC, cl.player_wins DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

