import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface User {
    id: string
    firebase_id: string
    device_id: string | null
    name: string | null
    username: string | null
    avatar: string | null
    created_at: string
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface CreateUserRequest {
    firebaseId: string
    deviceId?: string
    name?: string
    username?: string
    avatar?: string
}

export interface CreateUserResponse {
    success: boolean
    user?: User
    error?: string
}

export interface GetUserRequest {
    userId: string
}

export interface GetUserResponse {
    success: boolean
    user?: User
    error?: string
}

export interface GetUserByFirebaseIdRequest {
    firebaseId: string
}

export interface GetUserByFirebaseIdResponse {
    success: boolean
    user?: User
    error?: string
}

export interface UpdateUserRequest {
    userId: string
    deviceId?: string
    name?: string
    username?: string
    avatar?: string
}

export interface UpdateUserResponse {
    success: boolean
    user?: User
    error?: string
}

export interface DeleteUserRequest {
    userId: string
}

export interface DeleteUserResponse {
    success: boolean
    error?: string
}

export interface GetAllUsersRequest {
    limit?: number
    offset?: number
}

export interface GetAllUsersResponse {
    success: boolean
    users?: User[]
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Create a new user
 */
export const createUser = api(
    { method: "POST", path: "/user", expose: true },
    async (req: CreateUserRequest): Promise<CreateUserResponse> => {
        try {
            const { data, error } = await supabase.rpc('create_user', {
                p_firebase_id: req.firebaseId,
                p_device_id: req.deviceId ?? null,
                p_name: req.name ?? null,
                p_username: req.username ?? null,
                p_avatar: req.avatar ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, user: data as User }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get a user by ID
 */
export const getUser = api(
    { method: "GET", path: "/user/:userId", expose: true },
    async (req: GetUserRequest): Promise<GetUserResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_user', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            if (!data) {
                return { success: false, error: 'User not found' }
            }

            return { success: true, user: data as User }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get a user by Firebase ID
 */
export const getUserByFirebaseId = api(
    { method: "GET", path: "/user/firebase/:firebaseId", expose: true },
    async (req: GetUserByFirebaseIdRequest): Promise<GetUserByFirebaseIdResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_user_by_firebase_id', {
                p_firebase_id: req.firebaseId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            if (!data) {
                return { success: false, error: 'User not found' }
            }

            return { success: true, user: data as User }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Update a user
 */
export const updateUser = api(
    { method: "PUT", path: "/user/:userId", expose: true },
    async (req: UpdateUserRequest): Promise<UpdateUserResponse> => {
        try {
            const { data, error } = await supabase.rpc('update_user', {
                p_user_id: req.userId,
                p_device_id: req.deviceId ?? null,
                p_name: req.name ?? null,
                p_username: req.username ?? null,
                p_avatar: req.avatar ?? null
            })

            if (error) {
                return { success: false, error: error.message }
            }

            if (!data) {
                return { success: false, error: 'User not found' }
            }

            return { success: true, user: data as User }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Delete a user
 */
export const deleteUser = api(
    { method: "DELETE", path: "/user/:userId", expose: true },
    async (req: DeleteUserRequest): Promise<DeleteUserResponse> => {
        try {
            const { data, error } = await supabase.rpc('delete_user', {
                p_user_id: req.userId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean; deleted_count: number }
            if (!result.success) {
                return { success: false, error: 'User not found or already deleted' }
            }

            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get all users
 */
export const getAllUsers = api(
    { method: "GET", path: "/user/all", expose: true },
    async (req: GetAllUsersRequest): Promise<GetAllUsersResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_all_users', {
                p_limit: req.limit ?? 20,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { 
                success: true, 
                users: (data as User[]) ?? []
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
