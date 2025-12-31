import { api } from "encore.dev/api"
import { supabase } from "../db/supabase"

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface PresenceEntry {
    user_id: string
    last_seen: string
    is_online: boolean
}

// =====================================================
// REQUEST/RESPONSE INTERFACES
// =====================================================

export interface HeartbeatRequest {
    userId: string
}

export interface HeartbeatResponse {
    success: boolean
    error?: string
}

export interface GetOnlineFriendsRequest {
    userId: string
}

export interface GetOnlineFriendsResponse {
    success: boolean
    onlineFriendIds?: string[]
    error?: string
}

export interface GetPresenceRequest {
    userIds: string[]
}

export interface GetPresenceResponse {
    success: boolean
    presence?: Record<string, { isOnline: boolean; lastSeen: string }>
    error?: string
}

// =====================================================
// CONSTANTS
// =====================================================

// User is considered online if last_seen is within this many seconds
const ONLINE_THRESHOLD_SECONDS = 60

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Update user's last seen timestamp (heartbeat)
 * Should be called periodically by the frontend (every 30 seconds)
 */
export const heartbeat = api(
    { method: "POST", path: "/user/presence/heartbeat", expose: true },
    async (req: HeartbeatRequest): Promise<HeartbeatResponse> => {
        try {
            const { error } = await supabase
                .from('user_presence')
                .upsert(
                    {
                        user_id: req.userId,
                        last_seen: new Date().toISOString()
                    },
                    { onConflict: 'user_id' }
                )

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
 * Get online status for multiple users
 */
export const getPresence = api(
    { method: "POST", path: "/user/presence/status", expose: true },
    async (req: GetPresenceRequest): Promise<GetPresenceResponse> => {
        try {
            if (!req.userIds || req.userIds.length === 0) {
                return { success: true, presence: {} }
            }

            const { data, error } = await supabase
                .from('user_presence')
                .select('user_id, last_seen')
                .in('user_id', req.userIds)

            if (error) {
                return { success: false, error: error.message }
            }

            const now = new Date()
            const presence: Record<string, { isOnline: boolean; lastSeen: string }> = {}

            // Initialize all requested users as offline
            req.userIds.forEach(id => {
                presence[id] = { isOnline: false, lastSeen: '' }
            })

            // Update with actual data
            if (data) {
                data.forEach(entry => {
                    const lastSeen = new Date(entry.last_seen)
                    const secondsAgo = (now.getTime() - lastSeen.getTime()) / 1000
                    presence[entry.user_id] = {
                        isOnline: secondsAgo <= ONLINE_THRESHOLD_SECONDS,
                        lastSeen: entry.last_seen
                    }
                })
            }

            return { success: true, presence }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)

/**
 * Get list of online friends for a user
 */
export const getOnlineFriends = api(
    { method: "GET", path: "/user/presence/online-friends/:userId", expose: true },
    async (req: GetOnlineFriendsRequest): Promise<GetOnlineFriendsResponse> => {
        try {
            // First get all friends
            const { data: friendsData, error: friendsError } = await supabase.rpc('get_friends', {
                p_user_id: req.userId,
                p_limit: 100,
                p_offset: 0
            })

            if (friendsError) {
                return { success: false, error: friendsError.message }
            }

            if (!friendsData || friendsData.length === 0) {
                return { success: true, onlineFriendIds: [] }
            }

            const friendIds = friendsData.map((f: { id: string }) => f.id)

            // Get presence for all friends
            const thresholdTime = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000).toISOString()
            
            const { data: presenceData, error: presenceError } = await supabase
                .from('user_presence')
                .select('user_id')
                .in('user_id', friendIds)
                .gte('last_seen', thresholdTime)

            if (presenceError) {
                return { success: false, error: presenceError.message }
            }

            const onlineFriendIds = presenceData?.map(p => p.user_id) ?? []

            return { success: true, onlineFriendIds }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }
        }
    }
)
