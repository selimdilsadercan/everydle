import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface UserTrophies {
    id: string
    user_id: string
    trophies: number
    highest_trophies: number
    wins: number
    losses: number
    draws: number
    created_at: string
}

export type MatchResult = 'win' | 'lose' | 'draw'

export interface LeaderboardEntry {
    user_id: string
    name: string | null
    username: string | null
    avatar: string | null
    trophies: number
    wins: number
    losses: number
    rank: number
    player_type: 'user' | 'bot'
    difficulty?: string | null
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface GetUserTrophiesRequest {
    userId: string
}

export interface GetUserTrophiesResponse {
    success: boolean
    data?: UserTrophies
    error?: string
}

export interface AddTrophiesRequest {
    userId: string
    amount: number
}

export interface AddTrophiesResponse {
    success: boolean
    data?: UserTrophies
    error?: string
}

export interface ApplyMatchResultRequest {
    userId: string
    result: MatchResult
    trophyChange?: number
}

export interface ApplyMatchResultResponse {
    success: boolean
    data?: UserTrophies
    trophyChange?: number
    error?: string
}

export interface GetLeaderboardRequest {
    limit?: number
    offset?: number
}

export interface GetLeaderboardResponse {
    success: boolean
    leaderboard?: LeaderboardEntry[]
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Get user trophies
 */
export const getUserTrophies = api(
    { method: "GET", path: "/trophies/:userId", expose: true },
    async (req: GetUserTrophiesRequest): Promise<GetUserTrophiesResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_user_trophies', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserTrophies }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Add/remove trophies
 */
export const addTrophies = api(
    { method: "POST", path: "/trophies/add", expose: true },
    async (req: AddTrophiesRequest): Promise<AddTrophiesResponse> => {
        try {
            const { data, error } = await supabase.rpc('add_trophies', {
                p_user_id: req.userId,
                p_amount: req.amount
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserTrophies }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Apply match result
 */
export const applyMatchResult = api(
    { method: "POST", path: "/trophies/match", expose: true },
    async (req: ApplyMatchResultRequest): Promise<ApplyMatchResultResponse> => {
        try {
            const { data, error } = await supabase.rpc('apply_match_result', {
                p_user_id: req.userId,
                p_result: req.result,
                p_trophy_change: req.trophyChange ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { trophies: UserTrophies; trophy_change: number }
            return { 
                success: true, 
                data: result.trophies,
                trophyChange: result.trophy_change
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
 * Get leaderboard
 */
export const getLeaderboard = api(
    { method: "GET", path: "/leaderboard", expose: true },
    async (req: GetLeaderboardRequest): Promise<GetLeaderboardResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_leaderboard', {
                p_limit: req.limit ?? 50,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, leaderboard: data as LeaderboardEntry[] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
