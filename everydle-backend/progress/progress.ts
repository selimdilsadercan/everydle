import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface LevelProgress {
    id: string
    user_id: string
    current_level: number
    created_at: string
}

export interface CompletedLevel {
    level_id: number
    completed_at: string
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface GetLevelProgressRequest {
    userId: string
}

export interface GetLevelProgressResponse {
    success: boolean
    progress?: LevelProgress
    completedCount?: number
    error?: string
}

export interface CompleteLevelRequest {
    userId: string
    levelId: number
}

export interface CompleteLevelResponse {
    success: boolean
    progress?: LevelProgress
    levelId?: number
    alreadyCompleted?: boolean
    error?: string
}

export interface IsLevelCompletedRequest {
    userId: string
    levelId: number
}

export interface IsLevelCompletedResponse {
    success: boolean
    completed?: boolean
    completedAt?: string | null
    error?: string
}

export interface GetCompletedLevelsRequest {
    userId: string
    limit?: number
    offset?: number
}

export interface GetCompletedLevelsResponse {
    success: boolean
    levels?: CompletedLevel[]
    error?: string
}

export interface ResetLevelProgressRequest {
    userId: string
}

export interface ResetLevelProgressResponse {
    success: boolean
    deletedLevels?: number
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Get level progress
 */
export const getLevelProgress = api(
    { method: "GET", path: "/progress/:userId", expose: true },
    async (req: GetLevelProgressRequest): Promise<GetLevelProgressResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_level_progress', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { progress: LevelProgress; completed_count: number }
            return { 
                success: true, 
                progress: result.progress,
                completedCount: result.completed_count
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
 * Complete a level
 */
export const completeLevel = api(
    { method: "POST", path: "/progress/complete", expose: true },
    async (req: CompleteLevelRequest): Promise<CompleteLevelResponse> => {
        try {
            const { data, error } = await supabase.rpc('complete_level', {
                p_user_id: req.userId,
                p_level_id: req.levelId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { progress: LevelProgress; level_id: number; already_completed: boolean }
            return { 
                success: true, 
                progress: result.progress,
                levelId: result.level_id,
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
 * Check if level is completed
 */
export const isLevelCompleted = api(
    { method: "GET", path: "/progress/check/:userId/:levelId", expose: true },
    async (req: IsLevelCompletedRequest): Promise<IsLevelCompletedResponse> => {
        try {
            const { data, error } = await supabase.rpc('is_level_completed', {
                p_user_id: req.userId,
                p_level_id: req.levelId
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
 * Get completed levels
 */
export const getCompletedLevels = api(
    { method: "GET", path: "/progress/completed/:userId", expose: true },
    async (req: GetCompletedLevelsRequest): Promise<GetCompletedLevelsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_completed_levels', {
                p_user_id: req.userId,
                p_limit: req.limit ?? 100,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, levels: (data as CompletedLevel[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Reset level progress
 */
export const resetLevelProgress = api(
    { method: "DELETE", path: "/progress/reset/:userId", expose: true },
    async (req: ResetLevelProgressRequest): Promise<ResetLevelProgressResponse> => {
        try {
            const { data, error } = await supabase.rpc('reset_level_progress', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean; deleted_levels: number }
            return { 
                success: true, 
                deletedLevels: result.deleted_levels
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
