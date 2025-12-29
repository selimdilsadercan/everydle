import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface GameSaveState {
    id: string
    user_id: string
    game_id: string
    game_number: number
    state: Record<string, unknown>
    is_completed: boolean
    is_won: boolean | null
    created_at: string
    updated_at: string
}

export interface GameHistoryEntry {
    game_number: number
    state: Record<string, unknown>
    is_completed: boolean
    is_won: boolean | null
    created_at: string
    updated_at: string
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface SaveGameStateRequest {
    userId: string
    gameId: string
    gameNumber: number
    state: Record<string, unknown>
    isCompleted?: boolean
    isWon?: boolean
}

export interface SaveGameStateResponse {
    success: boolean
    data?: GameSaveState
    error?: string
}

export interface GetGameStateRequest {
    userId: string
    gameId: string
    gameNumber: number
}

export interface GetGameStateResponse {
    success: boolean
    data?: GameSaveState | null
    error?: string
}

export interface DeleteGameStateRequest {
    userId: string
    gameId: string
    gameNumber: number
}

export interface DeleteGameStateResponse {
    success: boolean
    error?: string
}

export interface GetGameHistoryRequest {
    userId: string
    gameId: string
    limit?: number
    offset?: number
}

export interface GetGameHistoryResponse {
    success: boolean
    history?: GameHistoryEntry[]
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Save game state
 */
export const saveGameState = api(
    { method: "POST", path: "/gamestate/save", expose: true },
    async (req: SaveGameStateRequest): Promise<SaveGameStateResponse> => {
        try {
            const { data, error } = await supabase.rpc('save_game_state', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_game_number: req.gameNumber,
                p_state: req.state,
                p_is_completed: req.isCompleted ?? false,
                p_is_won: req.isWon ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as GameSaveState }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get game state
 */
export const getGameState = api(
    { method: "GET", path: "/gamestate/:userId/:gameId/:gameNumber", expose: true },
    async (req: GetGameStateRequest): Promise<GetGameStateResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_game_state', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_game_number: req.gameNumber
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as GameSaveState | null }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Delete game state (reset)
 */
export const deleteGameState = api(
    { method: "DELETE", path: "/gamestate/:userId/:gameId/:gameNumber", expose: true },
    async (req: DeleteGameStateRequest): Promise<DeleteGameStateResponse> => {
        try {
            const { data, error } = await supabase.rpc('delete_game_state', {
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
 * Get game history
 */
export const getGameHistory = api(
    { method: "GET", path: "/gamestate/history/:userId/:gameId", expose: true },
    async (req: GetGameHistoryRequest): Promise<GetGameHistoryResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_game_history', {
                p_user_id: req.userId,
                p_game_id: req.gameId,
                p_limit: req.limit ?? 20,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, history: (data as GameHistoryEntry[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
