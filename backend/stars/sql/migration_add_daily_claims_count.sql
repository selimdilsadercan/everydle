-- =====================================================
-- ADD daily_claims_count column to user_stars table
-- Migration: Günde 3 kez claim desteği
-- =====================================================

-- Add daily_claims_count column if not exists
ALTER TABLE user_stars 
ADD COLUMN IF NOT EXISTS daily_claims_count INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN user_stars.daily_claims_count IS 'Number of daily reward claims made today (max 3)';
