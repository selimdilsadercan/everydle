import { api } from "encore.dev/api"
import { secret } from "encore.dev/config"
import { supabase } from "../db/supabase"
import admin from 'firebase-admin'

// =====================================================
// CONFIGURATION & SECRETS
// =====================================================

const firebaseProjectId = secret("FirebaseProjectId")
const firebaseClientEmail = secret("FirebaseClientEmail")
const firebasePrivateKey = secret("FirebasePrivateKey")

let isFirebaseInitialized = false

function initializeFirebase() {
    // Check if already initialized through admin.apps
    const apps = (admin as any).apps || (admin as any).default?.apps
    if (isFirebaseInitialized || (apps && apps.length > 0)) {
        isFirebaseInitialized = true
        return
    }

    try {
        const projectId = firebaseProjectId()
        const clientEmail = firebaseClientEmail()
        let privateKey = firebasePrivateKey()

        if (!projectId || !clientEmail || !privateKey) {
            console.error("Firebase secrets are missing")
            return
        }

        // Handle both literal \n and real newlines
        privateKey = privateKey.replace(/\\n/g, '\n')

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        })
        isFirebaseInitialized = true
        console.log("Firebase Admin initialized successfully")
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error)
    }
}

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface SaveTokenRequest {
    userId: string
    token: string
    deviceType?: string // 'web' | 'android' | 'ios'
}

export interface SaveTokenResponse {
    success: boolean
    error?: string
}

export interface DeleteTokenRequest {
    userId: string
    token: string
}

export interface DeleteTokenResponse {
    success: boolean
    error?: string
}

export interface SendNotificationRequest {
    title: string
    body: string
    targetType: 'all' | 'user' | 'users'
    userId?: string // Tek kullanıcı için
    targetUserIds?: string[] // Birden fazla kullanıcı için
    data?: Record<string, string>
    excludeUserId?: string // Gönderen hariç tutmak için
    deviceTypes?: string[] // ['android', 'ios', 'web'] - varsayılan: ['android', 'ios']
}

export interface SendNotificationResponse {
    success: boolean
    sentCount: number
    failedCount: number
    error?: string
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * Save or update FCM token for a user
 */
export const saveToken = api(
    { method: "POST", path: "/notifications/token", expose: true },
    async (req: SaveTokenRequest): Promise<SaveTokenResponse> => {
        try {
            const { error } = await supabase.rpc('save_fcm_token', {
                p_user_id: req.userId,
                p_token: req.token,
                p_device_type: req.deviceType ?? 'web'
            })

            if (error) return { success: false, error: error.message }
            return { success: true }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
)

/**
 * Delete an FCM token (e.g. on logout)
 */
export const deleteToken = api(
    { method: "DELETE", path: "/notifications/token", expose: true },
    async (req: DeleteTokenRequest): Promise<DeleteTokenResponse> => {
        try {
            const { data, error } = await supabase.rpc('delete_fcm_token', {
                p_user_id: req.userId,
                p_token: req.token
            })

            if (error) return { success: false, error: error.message }
            return { success: !!data }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
)

/**
 * Send notification to users
 */
export const sendNotification = api(
    { method: "POST", path: "/notifications/send", expose: true },
    async (req: SendNotificationRequest): Promise<SendNotificationResponse> => {
        try {
            initializeFirebase()
            if (!isFirebaseInitialized) {
                return { success: false, sentCount: 0, failedCount: 0, error: "Firebase not initialized" }
            }

            let tokens: string[] = []
            
            // Varsayılan olarak sadece mobil cihazlara gönder
            const deviceTypes = req.deviceTypes ?? ['android', 'ios']

            if (req.targetType === 'all') {
                const { data } = await supabase.rpc('get_all_fcm_tokens', {
                    p_exclude_user_id: req.excludeUserId ?? null,
                    p_device_types: deviceTypes
                })
                tokens = (data as any[])?.map(t => t.token) || []
            } else if (req.targetType === 'user' || req.targetType === 'users') {
                const ids = req.targetUserIds || (req.targetType === 'user' && req.userId ? [req.userId] : [])
                if (ids.length > 0) {
                    let query = supabase
                        .from('fcm_tokens')
                        .select('token')
                        .in('user_id', ids)
                    
                    if (deviceTypes.length > 0) {
                        query = query.in('device_type', deviceTypes)
                    }
                    
                    const { data } = await query
                    tokens = (data as any[])?.map(t => t.token) || []
                }
            }

            if (tokens.length === 0) {
                return { success: true, sentCount: 0, failedCount: 0 }
            }

            // Multicast sending (max 500 per chunk)
            const chunks = []
            for (let i = 0; i < tokens.length; i += 500) {
                chunks.push(tokens.slice(i, i + 500))
            }

            let totalSent = 0
            let totalFailed = 0

            for (const chunk of chunks) {
                const message: admin.messaging.MulticastMessage = {
                    notification: { title: req.title, body: req.body },
                    data: req.data || {},
                    tokens: chunk
                }

                const response = await admin.messaging().sendEachForMulticast(message)
                totalSent += response.successCount
                totalFailed += response.failureCount

                // Handle invalid tokens
                const invalidTokens: string[] = []
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && (
                        resp.error?.code === 'messaging/registration-token-not-registered' ||
                        resp.error?.code === 'messaging/invalid-registration-token'
                    )) {
                        invalidTokens.push(chunk[idx])
                    }
                })

                if (invalidTokens.length > 0) {
                    await supabase
                        .from('fcm_tokens')
                        .delete()
                        .in('token', invalidTokens)
                }
            }

            return { success: true, sentCount: totalSent, failedCount: totalFailed }
        } catch (error) {
            return { 
                success: false, 
                sentCount: 0, 
                failedCount: 0, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            }
        }
    }
)
