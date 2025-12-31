import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface UserStars {
    id: string
    user_id: string
    stars: number
    last_daily_claim: string | null
    daily_streak: number
    daily_claims_count: number
    created_at: string
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface GetUserStarsRequest {
    userId: string
}

export interface GetUserStarsResponse {
    success: boolean
    data?: UserStars
    error?: string
}

export interface AddStarsRequest {
    userId: string
    amount: number
}

export interface AddStarsResponse {
    success: boolean
    data?: UserStars
    error?: string
}

export interface RemoveStarsRequest {
    userId: string
    amount: number
}

export interface RemoveStarsResponse {
    success: boolean
    data?: UserStars
    error?: string
}

export interface CanClaimDailyRewardRequest {
    userId: string
}

export interface CanClaimDailyRewardResponse {
    success: boolean
    canClaim?: boolean
    lastClaim?: string | null
    claimsToday?: number
    claimsRemaining?: number
    requiresVideo?: boolean
    error?: string
}

export interface ClaimDailyRewardRequest {
    userId: string
}

export interface ClaimDailyRewardResponse {
    success: boolean
    data?: UserStars
    reward?: number
    newStreak?: number
    claimsToday?: number
    claimsRemaining?: number
    error?: string
}

export interface ResetDailyRewardRequest {
    userId: string
}

export interface ResetDailyRewardResponse {
    success: boolean
    message?: string
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Get user stars balance
 */
export const getUserStars = api(
    { method: "GET", path: "/stars/:userId", expose: true },
    async (req: GetUserStarsRequest): Promise<GetUserStarsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_user_stars', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserStars }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Add stars to user
 */
export const addStars = api(
    { method: "POST", path: "/stars/add", expose: true },
    async (req: AddStarsRequest): Promise<AddStarsResponse> => {
        try {
            const { data, error } = await supabase.rpc('add_stars', {
                p_user_id: req.userId,
                p_amount: req.amount
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserStars }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Remove stars from user
 */
export const removeStars = api(
    { method: "POST", path: "/stars/remove", expose: true },
    async (req: RemoveStarsRequest): Promise<RemoveStarsResponse> => {
        try {
            const { data, error } = await supabase.rpc('remove_stars', {
                p_user_id: req.userId,
                p_amount: req.amount
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserStars }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Check if daily reward can be claimed
 */
export const canClaimDailyReward = api(
    { method: "GET", path: "/stars/daily/check/:userId", expose: true },
    async (req: CanClaimDailyRewardRequest): Promise<CanClaimDailyRewardResponse> => {
        try {
            const { data, error } = await supabase.rpc('can_claim_daily_reward', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { 
                can_claim: boolean; 
                last_claim: string | null;
                claims_today: number;
                claims_remaining: number;
                requires_video: boolean;
            }
            return { 
                success: true, 
                canClaim: result.can_claim,
                lastClaim: result.last_claim,
                claimsToday: result.claims_today,
                claimsRemaining: result.claims_remaining,
                requiresVideo: result.requires_video
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Claim daily reward
 */
export const claimDailyReward = api(
    { method: "POST", path: "/stars/daily/claim", expose: true },
    async (req: ClaimDailyRewardRequest): Promise<ClaimDailyRewardResponse> => {
        try {
            const { data, error } = await supabase.rpc('claim_daily_reward', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { 
                stars: UserStars; 
                reward: number; 
                new_streak: number;
                claims_today: number;
                claims_remaining: number;
            }
            return { 
                success: true, 
                data: result.stars,
                reward: result.reward,
                newStreak: result.new_streak,
                claimsToday: result.claims_today,
                claimsRemaining: result.claims_remaining
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Reset daily reward (DEBUG ONLY)
 */
export const resetDailyReward = api(
    { method: "POST", path: "/stars/daily/reset", expose: true },
    async (req: ResetDailyRewardRequest): Promise<ResetDailyRewardResponse> => {
        try {
            const { error } = await supabase
                .from('user_stars')
                .update({ 
                    last_daily_claim: null,
                    daily_streak: 0
                })
                .eq('user_id', req.userId)

            if (error) {
                return { success: false, error: error.message }
            }

            return { 
                success: true, 
                message: 'Daily reward reset successfully'
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
