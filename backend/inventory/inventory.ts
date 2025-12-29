import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface UserInventory {
    id: string
    user_id: string
    hints: number
    giveups: number
    created_at: string
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface GetUserInventoryRequest {
    userId: string
}

export interface GetUserInventoryResponse {
    success: boolean
    data?: UserInventory
    error?: string
}

export interface UseHintRequest {
    userId: string
}

export interface UseHintResponse {
    success: boolean
    data?: UserInventory
    error?: string
}

export interface UseGiveupRequest {
    userId: string
}

export interface UseGiveupResponse {
    success: boolean
    data?: UserInventory
    error?: string
}

export interface AddHintsRequest {
    userId: string
    amount: number
}

export interface AddHintsResponse {
    success: boolean
    data?: UserInventory
    error?: string
}

export interface AddGiveupsRequest {
    userId: string
    amount: number
}

export interface AddGiveupsResponse {
    success: boolean
    data?: UserInventory
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Get user inventory
 */
export const getUserInventory = api(
    { method: "GET", path: "/inventory/:userId", expose: true },
    async (req: GetUserInventoryRequest): Promise<GetUserInventoryResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_user_inventory', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserInventory }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Use a hint
 */
export const useHint = api(
    { method: "POST", path: "/inventory/hint/use", expose: true },
    async (req: UseHintRequest): Promise<UseHintResponse> => {
        try {
            const { data, error } = await supabase.rpc('use_hint', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserInventory }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Use a giveup
 */
export const useGiveup = api(
    { method: "POST", path: "/inventory/giveup/use", expose: true },
    async (req: UseGiveupRequest): Promise<UseGiveupResponse> => {
        try {
            const { data, error } = await supabase.rpc('use_giveup', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserInventory }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Add hints
 */
export const addHints = api(
    { method: "POST", path: "/inventory/hint/add", expose: true },
    async (req: AddHintsRequest): Promise<AddHintsResponse> => {
        try {
            const { data, error } = await supabase.rpc('add_hints', {
                p_user_id: req.userId,
                p_amount: req.amount
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserInventory }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Add giveups
 */
export const addGiveups = api(
    { method: "POST", path: "/inventory/giveup/add", expose: true },
    async (req: AddGiveupsRequest): Promise<AddGiveupsResponse> => {
        try {
            const { data, error } = await supabase.rpc('add_giveups', {
                p_user_id: req.userId,
                p_amount: req.amount
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, data: data as UserInventory }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
