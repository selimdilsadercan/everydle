-- =====================================================
-- SEND FRIEND REQUEST - Arkadaşlık isteği gönder
-- =====================================================
DROP FUNCTION IF EXISTS send_friend_request(UUID, UUID, BOOLEAN);

CREATE FUNCTION send_friend_request(
    p_user_id UUID,
    p_friend_id UUID,
    p_is_invitation BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_friendship friendships;
    v_existing_status TEXT;
    v_reciprocal_status TEXT;
BEGIN
    -- Kendine istek gönderemez
    IF p_user_id = p_friend_id THEN
        RAISE EXCEPTION 'Cannot send friend request to yourself';
    END IF;
    
    -- Karşı tarafın engelleme durumunu kontrol et
    SELECT status INTO v_reciprocal_status
    FROM friendships
    WHERE user_id = p_friend_id AND friend_id = p_user_id;
    
    IF v_reciprocal_status = 'blocked' THEN
        RAISE EXCEPTION 'Cannot send request to this user';
    END IF;
    
    -- Benim engelleme durumumu kontrol et
    SELECT status INTO v_existing_status
    FROM friendships
    WHERE user_id = p_user_id AND friend_id = p_friend_id;
    
    IF v_existing_status = 'blocked' THEN
        RAISE EXCEPTION 'You have blocked this user';
    END IF;

    -- Eğer zaten arkadaşlarsa
    IF v_existing_status = 'accepted' THEN
        SELECT * INTO v_friendship FROM friendships WHERE user_id = p_user_id AND friend_id = p_friend_id;
        RETURN json_build_object(
            'friendship', row_to_json(v_friendship),
            'auto_accepted', false
        );
    END IF;

    -- Davet Linki Akışı veya Karşılıklı İstek (Auto Accept)
    IF p_is_invitation OR v_reciprocal_status = 'pending' THEN
        -- İlişkiyi 'accepted' yap (benim tarafım)
        INSERT INTO friendships (user_id, friend_id, status)
        VALUES (p_user_id, p_friend_id, 'accepted')
        ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'
        RETURNING * INTO v_friendship;
        
        -- Karşı tarafın ilişkisini de 'accepted' yap
        INSERT INTO friendships (user_id, friend_id, status)
        VALUES (p_friend_id, p_user_id, 'accepted')
        ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';
        
        RETURN json_build_object(
            'friendship', row_to_json(v_friendship),
            'auto_accepted', true
        );
    END IF;
    
    -- Normal İstek Akışı (Pending)
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (p_user_id, p_friend_id, 'pending')
    ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending'
    RETURNING * INTO v_friendship;
    
    RETURN json_build_object(
        'friendship', row_to_json(v_friendship),
        'auto_accepted', false
    );
END;
$$;
