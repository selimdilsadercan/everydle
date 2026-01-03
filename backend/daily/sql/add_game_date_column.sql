-- =====================================================
-- ADD GAME_DATE COLUMN - Oyunun hangi güne ait olduğu
-- =====================================================
-- game_date: Oyunun kendisinin tarihi (game_number'dan hesaplanır)
-- completion_date: Kullanıcının oyunu ne zaman tamamladığı (gelecekte kullanılabilir)

-- 1. Yeni kolon ekle
ALTER TABLE daily_game_completion 
ADD COLUMN IF NOT EXISTS game_date DATE;

-- 2. Index ekle
CREATE INDEX IF NOT EXISTS idx_daily_game_game_date ON daily_game_completion(game_date);

-- 3. Game dates tablosu - her oyun türü için başlangıç tarihi
-- (Alternatif: CASE WHEN ile hesapla)

-- 4. Mevcut verileri güncelle - her oyun türü için first_game_date'e göre hesapla
-- Oyun başlangıç tarihleri:
-- wordle, quordle, octordle, nerdle, contexto, redactle: 2025-11-23
-- moviedle: 2025-12-18
-- pokerdle: 2025-11-23 (varsayım)

UPDATE daily_game_completion
SET game_date = CASE game_id
    WHEN 'wordle' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'quordle' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'octordle' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'nerdle' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'contexto' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'redactle' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'moviedle' THEN '2025-12-18'::date + (game_number - 1) * INTERVAL '1 day'
    WHEN 'pokerdle' THEN '2025-11-23'::date + (game_number - 1) * INTERVAL '1 day'
    ELSE completion_date  -- Bilinmeyen oyun türleri için mevcut değeri koru
END
WHERE game_date IS NULL;

-- 5. NOT NULL constraint ekle (mevcut veriler güncellendikten sonra)
-- ALTER TABLE daily_game_completion ALTER COLUMN game_date SET NOT NULL;
