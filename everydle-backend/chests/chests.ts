import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ChestReward {
    type: 'coins' | 'hint'
    amount: number
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface GetClaimedChestsRequest {
    userId: string
    date: string  // YYYY-MM-DD
}

export interface GetClaimedChestsResponse {
    success: boolean
    claimedMilestones?: number[]
    error?: string
}

export interface ClaimChestRequest {
    userId: string
    date: string  // YYYY-MM-DD
    milestone: number  // 1, 3, veya 6
    rewardType: 'coins' | 'hint'
    rewardAmount: number
}

export interface ClaimChestResponse {
    success: boolean
    claimedMilestones?: number[]
    reward?: ChestReward
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Get claimed chests for a specific date
 */
export const getClaimedChests = api(
    { method: "GET", path: "/chests/claimed/:userId/:date", expose: true },
    async (req: GetClaimedChestsRequest): Promise<GetClaimedChestsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_claimed_chests', {
                p_user_id: req.userId,
                p_date: req.date
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { 
                success: true, 
                claimedMilestones: (data as number[]) ?? []
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
 * Claim a chest
 */
export const claimChest = api(
    { method: "POST", path: "/chests/claim", expose: true },
    async (req: ClaimChestRequest): Promise<ClaimChestResponse> => {
        try {
            const { data, error } = await supabase.rpc('claim_chest', {
                p_user_id: req.userId,
                p_date: req.date,
                p_milestone: req.milestone,
                p_reward_type: req.rewardType,
                p_reward_amount: req.rewardAmount
            })

            if (error) {
                // Zaten açılmış sandık kontrolü
                if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                    return { success: false, error: 'Bu sandık zaten açılmış' }
                }
                return { success: false, error: error.message }
            }

            const result = data as { claimed_milestones: number[]; reward: { type: string; amount: number } }
            return { 
                success: true, 
                claimedMilestones: result.claimed_milestones,
                reward: {
                    type: result.reward.type as 'coins' | 'hint',
                    amount: result.reward.amount
                }
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
