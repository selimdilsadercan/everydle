import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DailyGameCompletion {
    id: string
    user_id: string
    game_id: string
    game_number: number
    completion_date: string
    completed_at: string
}

export interface CompletedGame {
    game_id?: string
    game_number: number
    completion_date?: string
    completed_at: string
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface MarkDailyGameCompletedRequest {
    userId: string
    gameId: string
    gameNumber: number
    completionDate?: string
    gameDate?: string  // Oyunun hangi güne ait olduğu
}

export interface MarkDailyGameCompletedResponse {
    success: boolean
    completion?: DailyGameCompletion
    alreadyCompleted?: boolean
    error?: string
}

export interface UnmarkDailyGameCompletedRequest {
    userId: string
    gameId: string
    gameNumber: number
}

export interface UnmarkDailyGameCompletedResponse {
    success: boolean
    error?: string
}

export interface IsGameCompletedRequest {
    userId: string
    gameId: string
    gameNumber: number
}

export interface IsGameCompletedResponse {
    success: boolean
    completed?: boolean
    completedAt?: string | null
    error?: string
}

export interface GetCompletedGamesForDateRequest {
    userId: string
    date?: string
}

export interface GetCompletedGamesForDateResponse {
    success: boolean
    games?: CompletedGame[]
    error?: string
}

export interface GetAllCompletedGamesRequest {
    userId: string
    gameId: string
    limit?: number
    offset?: number
}

export interface GetAllCompletedGamesResponse {
    success: boolean
    games?: CompletedGame[]
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Mark a daily game as completed
 */
export const markDailyGameCompleted = api(
    { method: "POST", path: "/daily/complete", expose: true },
    async (req: MarkDailyGameCompletedRequest): Promise<MarkDailyGameCompletedResponse> => {
        try {
            const { data, error } = await supabase.rpc('mark_daily_game_completed', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_game_number: req.gameNumber,
                p_completion_date: req.completionDate ?? null,
                p_game_date: req.gameDate ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { completion: DailyGameCompletion; already_completed: boolean }
            return { 
                success: true, 
                completion: result.completion,
                alreadyCompleted: result.already_completed
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
 * Unmark a daily game completion
 */
export const unmarkDailyGameCompleted = api(
    { method: "DELETE", path: "/daily/uncomplete", expose: true },
    async (req: UnmarkDailyGameCompletedRequest): Promise<UnmarkDailyGameCompletedResponse> => {
        try {
            const { data, error } = await supabase.rpc('unmark_daily_game_completed', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_game_number: req.gameNumber
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean }
            return { success: result.success }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Check if a game is completed
 */
export const isGameCompleted = api(
    { method: "GET", path: "/daily/check/:userId/:gameId/:gameNumber", expose: true },
    async (req: IsGameCompletedRequest): Promise<IsGameCompletedResponse> => {
        try {
            const { data, error } = await supabase.rpc('is_game_completed', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_game_number: req.gameNumber
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { completed: boolean; completed_at: string | null }
            return { 
                success: true, 
                completed: result.completed,
                completedAt: result.completed_at
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
 * Get completed games for a specific date
 */
export const getCompletedGamesForDate = api(
    { method: "GET", path: "/daily/date/:userId", expose: true },
    async (req: GetCompletedGamesForDateRequest): Promise<GetCompletedGamesForDateResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_completed_games_for_date', {
                p_user_id: req.userId,
                p_date: req.date ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, games: (data as CompletedGame[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get all completed games for a game type
 */
export const getAllCompletedGames = api(
    { method: "GET", path: "/daily/all/:userId/:gameId", expose: true },
    async (req: GetAllCompletedGamesRequest): Promise<GetAllCompletedGamesResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_all_completed_games', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_limit: req.limit ?? 100,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, games: (data as CompletedGame[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
