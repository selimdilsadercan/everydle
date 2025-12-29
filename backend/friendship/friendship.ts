import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface FriendUser {
    id: string
    firebase_id: string
    name: string | null
    username: string | null
    avatar: string | null
    created_at: string
    friendship_created_at?: string
    requested_at?: string
    sent_at?: string
    request_id?: string
    status?: string
}

export interface Friendship {
    id: string
    user_id: string
    friend_id: string
    status: string
    created_at: string
}

export type FriendshipStatus = 
    | 'none' 
    | 'friends' 
    | 'request_sent' 
    | 'request_received' 
    | 'blocked_by_me' 
    | 'blocked_by_them'
    | 'rejected_by_me'
    | 'rejected_by_them'

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface SendFriendRequestRequest {
    userId: string
    friendId: string
    isInvitation?: boolean
}

export interface SendFriendRequestResponse {
    success: boolean
    friendship?: Friendship
    autoAccepted?: boolean
    error?: string
}

export interface AcceptFriendRequestRequest {
    userId: string
    friendId: string
}

export interface AcceptFriendRequestResponse {
    success: boolean
    friendship?: Friendship
    error?: string
}

export interface RejectFriendRequestRequest {
    userId: string
    friendId: string
}

export interface RejectFriendRequestResponse {
    success: boolean
    error?: string
}

export interface RemoveFriendRequest {
    userId: string
    friendId: string
}

export interface RemoveFriendResponse {
    success: boolean
    error?: string
}

export interface BlockUserRequest {
    userId: string
    blockedId: string
}

export interface BlockUserResponse {
    success: boolean
    error?: string
}

export interface UnblockUserRequest {
    userId: string
    blockedId: string
}

export interface UnblockUserResponse {
    success: boolean
    error?: string
}

export interface GetFriendsRequest {
    userId: string
    limit?: number
    offset?: number
}

export interface GetFriendsResponse {
    success: boolean
    friends?: FriendUser[]
    error?: string
}

export interface GetPendingRequestsRequest {
    userId: string
    limit?: number
    offset?: number
}

export interface GetPendingRequestsResponse {
    success: boolean
    requests?: FriendUser[]
    error?: string
}

export interface GetSentRequestsRequest {
    userId: string
    limit?: number
    offset?: number
}

export interface GetSentRequestsResponse {
    success: boolean
    requests?: FriendUser[]
    error?: string
}

export interface GetFriendshipStatusRequest {
    userId: string
    otherId: string
}

export interface GetFriendshipStatusResponse {
    success: boolean
    status?: FriendshipStatus
    myStatus?: string | null
    theirStatus?: string | null
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Send a friend request
 */
export const sendFriendRequest = api(
    { method: "POST", path: "/friendship/request", expose: true },
    async (req: SendFriendRequestRequest): Promise<SendFriendRequestResponse> => {
        try {
            const { data, error } = await supabase.rpc('send_friend_request', {
                p_user_id: req.userId,
                p_friend_id: req.friendId,
                p_is_invitation: req.isInvitation ?? false
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { friendship: Friendship; auto_accepted: boolean }
            return { 
                success: true, 
                friendship: result.friendship,
                autoAccepted: result.auto_accepted
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
 * Accept a friend request
 */
export const acceptFriendRequest = api(
    { method: "POST", path: "/friendship/accept", expose: true },
    async (req: AcceptFriendRequestRequest): Promise<AcceptFriendRequestResponse> => {
        try {
            const { data, error } = await supabase.rpc('accept_friend_request', {
                p_user_id: req.userId,
                p_friend_id: req.friendId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, friendship: data as Friendship }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Reject a friend request
 */
export const rejectFriendRequest = api(
    { method: "POST", path: "/friendship/reject", expose: true },
    async (req: RejectFriendRequestRequest): Promise<RejectFriendRequestResponse> => {
        try {
            const { error } = await supabase.rpc('reject_friend_request', {
                p_user_id: req.userId,
                p_friend_id: req.friendId
            })

            if (error) {
                return { success: false, error: error.message }
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
 * Remove a friend
 */
export const removeFriend = api(
    { method: "DELETE", path: "/friendship/remove", expose: true },
    async (req: RemoveFriendRequest): Promise<RemoveFriendResponse> => {
        try {
            const { data, error } = await supabase.rpc('remove_friend', {
                p_user_id: req.userId,
                p_friend_id: req.friendId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { success: boolean }
            if (!result.success) {
                return { success: false, error: 'Friendship not found' }
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
 * Block a user
 */
export const blockUser = api(
    { method: "POST", path: "/friendship/block", expose: true },
    async (req: BlockUserRequest): Promise<BlockUserResponse> => {
        try {
            const { error } = await supabase.rpc('block_user', {
                p_user_id: req.userId,
                p_blocked_id: req.blockedId
            })

            if (error) {
                return { success: false, error: error.message }
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
 * Unblock a user
 */
export const unblockUser = api(
    { method: "POST", path: "/friendship/unblock", expose: true },
    async (req: UnblockUserRequest): Promise<UnblockUserResponse> => {
        try {
            const { error } = await supabase.rpc('unblock_user', {
                p_user_id: req.userId,
                p_blocked_id: req.blockedId
            })

            if (error) {
                return { success: false, error: error.message }
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
 * Get friends list
 */
export const getFriends = api(
    { method: "GET", path: "/friendship/friends/:userId", expose: true },
    async (req: GetFriendsRequest): Promise<GetFriendsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_friends', {
                p_user_id: req.userId,
                p_limit: req.limit ?? 50,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, friends: (data as FriendUser[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get pending friend requests (received)
 */
export const getPendingRequests = api(
    { method: "GET", path: "/friendship/pending/:userId", expose: true },
    async (req: GetPendingRequestsRequest): Promise<GetPendingRequestsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_pending_requests', {
                p_user_id: req.userId,
                p_limit: req.limit ?? 50,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, requests: (data as FriendUser[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get sent friend requests
 */
export const getSentRequests = api(
    { method: "GET", path: "/friendship/sent/:userId", expose: true },
    async (req: GetSentRequestsRequest): Promise<GetSentRequestsResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_sent_requests', {
                p_user_id: req.userId,
                p_limit: req.limit ?? 50,
                p_offset: req.offset ?? 0
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true, requests: (data as FriendUser[]) ?? [] }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get friendship status between two users
 */
export const getFriendshipStatus = api(
    { method: "GET", path: "/friendship/status/:userId/:otherId", expose: true },
    async (req: GetFriendshipStatusRequest): Promise<GetFriendshipStatusResponse> => {
        try {
            const { data, error } = await supabase.rpc('get_friendship_status', {
                p_user_id: req.userId,
                p_other_id: req.otherId
            })

            if (error) {
                return { success: false, error: error.message }
            }

            const result = data as { status: FriendshipStatus; my_status: string | null; their_status: string | null }
            return { 
                success: true, 
                status: result.status,
                myStatus: result.my_status,
                theirStatus: result.their_status
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
