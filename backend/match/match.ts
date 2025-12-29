import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BotProfile {
    id: string
    bot_name: string
    difficulty: 'easy' | 'medium' | 'hard'
    trophies: number
    wins: number
    losses: number
    created_at: string
    updated_at: string
}

export type MatchResult = 'win' | 'lose'

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface GetBotProfileRequest {
    botId: string
}

export interface GetBotProfileResponse {
    success: boolean
    data?: BotProfile
    error?: string
}

export interface GetAllBotsRequest {
    difficulty?: 'easy' | 'medium' | 'hard'
}

export interface GetAllBotsResponse {
    success: boolean
    data?: BotProfile[]
    error?: string
}

export interface GetRandomBotRequest {
    difficulty?: 'easy' | 'medium' | 'hard'
}

export interface GetRandomBotResponse {
    success: boolean
    data?: BotProfile
    error?: string
}

export interface ApplyBotMatchResultRequest {
    botId: string
    result: MatchResult
    trophyChange?: number
}

export interface ApplyBotMatchResultResponse {
    success: boolean
    data?: BotProfile
    trophyChange?: number
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Get bot profile by ID
 */
export const getBotProfile = api(
    { method: "GET", path: "/match/bot/:botId", expose: true },
    async (req: GetBotProfileRequest): Promise<GetBotProfileResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_bot_profile', {
                p_bot_id: req.botId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            if (!data) {
                return { success: false, error: 'Bot not found' }
            }

            return { success: true, data: data as BotProfile }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get all bots, optionally filtered by difficulty
 */
export const getAllBots = api(
    { method: "GET", path: "/match/bots", expose: true },
    async (req: GetAllBotsRequest): Promise<GetAllBotsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_all_bots', {
                p_difficulty: req.difficulty ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: (data ?? []) as BotProfile[] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get a random bot for matchmaking
 */
export const getRandomBot = api(
    { method: "GET", path: "/match/bot/random", expose: true },
    async (req: GetRandomBotRequest): Promise<GetRandomBotResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_random_bot', {
                p_difficulty: req.difficulty ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            if (!data) {
                return { success: false, error: 'No bot found' }
            }

            return { success: true, data: data as BotProfile }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Apply match result to bot (update trophies, wins, losses)
 */
export const applyBotMatchResult = api(
    { method: "POST", path: "/match/bot/result", expose: true },
    async (req: ApplyBotMatchResultRequest): Promise<ApplyBotMatchResultResponse> => {
        try {
            const { data, error } = await supabase.rpc('apply_bot_match_result', {
                p_bot_id: req.botId,
                p_result: req.result,
                p_trophy_change: req.trophyChange ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { bot: BotProfile; trophy_change: number }
            return { 
                success: true, 
                data: result.bot,
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

// =====================================================
// MATCH LOGGING TYPES
// =====================================================

export interface MatchLog {
    id: string
    match_id: string
    player1_id: string
    player1_type: 'user' | 'bot'
    player1_name: string
    player2_id: string
    player2_type: 'user' | 'bot'
    player2_name: string
    winner_id: string | null
    winner_type: 'user' | 'bot' | null
    player1_attempts: number | null
    player2_attempts: number | null
    player1_time_ms: number | null
    player2_time_ms: number | null
    player1_trophy_change: number
    player2_trophy_change: number
    word: string
    game_type: string
    created_at: string
    result?: 'win' | 'lose' | 'draw'
}

export interface LogMatchResultRequest {
    matchId: string
    player1Id: string
    player1Type: 'user' | 'bot'
    player1Name: string
    player2Id: string
    player2Type: 'user' | 'bot'
    player2Name: string
    winnerId?: string
    winnerType?: 'user' | 'bot'
    player1Attempts?: number
    player2Attempts?: number
    player1TimeMs?: number
    player2TimeMs?: number
    player1TrophyChange?: number
    player2TrophyChange?: number
    word: string
    gameType?: string
}

export interface LogMatchResultResponse {
    success: boolean
    data?: MatchLog
    error?: string
}

export interface GetUserMatchHistoryRequest {
    userId: string
    limit?: number
    offset?: number
}

export interface GetUserMatchHistoryResponse {
    success: boolean
    data?: MatchLog[]
    error?: string
}

// =====================================================
// MATCH LOGGING ENDPOINTS
// =====================================================

/**
 * Log a match result
 */
export const logMatchResult = api(
    { method: "POST", path: "/match/log", expose: true },
    async (req: LogMatchResultRequest): Promise<LogMatchResultResponse> => {
        try {
            const { data, error } = await supabase.rpc('log_match_result', {
                p_match_id: req.matchId,
                p_player1_id: req.player1Id,
                p_player1_type: req.player1Type,
                p_player1_name: req.player1Name,
                p_player2_id: req.player2Id,
                p_player2_type: req.player2Type,
                p_player2_name: req.player2Name,
                p_winner_id: req.winnerId ?? null,
                p_winner_type: req.winnerType ?? null,
                p_player1_attempts: req.player1Attempts ?? null,
                p_player2_attempts: req.player2Attempts ?? null,
                p_player1_time_ms: req.player1TimeMs ?? null,
                p_player2_time_ms: req.player2TimeMs ?? null,
                p_player1_trophy_change: req.player1TrophyChange ?? 0,
                p_player2_trophy_change: req.player2TrophyChange ?? 0,
                p_word: req.word,
                p_game_type: req.gameType ?? 'wordle'
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as MatchLog }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get user match history
 */
export const getUserMatchHistory = api(
    { method: "GET", path: "/match/history/:userId", expose: true },
    async (req: GetUserMatchHistoryRequest): Promise<GetUserMatchHistoryResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_user_match_history', {
                p_user_id: req.userId,
                p_limit: req.limit ?? 20,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: (data ?? []) as MatchLog[] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
