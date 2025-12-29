import { createServerClient } from "@/lib/api";
import type { trophies, user, notifications } from "@/lib/client";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
}

// ==================== TROPHIES ACTIONS ====================

/**
 * Get user trophies
 */
export async function getUserTrophies(
  userId: string
): Promise<ActionResponse<trophies.GetUserTrophiesResponse>> {
  try {
    const client = createServerClient();
    const response = await client.trophies.getUserTrophies(userId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get trophies:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get trophies",
    };
  }
}

/**
 * Add trophies to user
 */
export async function addTrophies(
  userId: string,
  amount: number
): Promise<ActionResponse<trophies.AddTrophiesResponse>> {
  try {
    const client = createServerClient();
    const response = await client.trophies.addTrophies({ userId, amount });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to add trophies:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to add trophies",
    };
  }
}

/**
 * Apply match result (win/lose/draw)
 */
export async function applyMatchResult(
  userId: string,
  result: trophies.MatchResult,
  trophyChange?: number
): Promise<ActionResponse<trophies.ApplyMatchResultResponse>> {
  try {
    const client = createServerClient();
    const response = await client.trophies.applyMatchResult({
      userId,
      result,
      trophyChange,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to apply match result:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to apply match result",
    };
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  limit?: number,
  offset?: number
): Promise<ActionResponse<trophies.GetLeaderboardResponse>> {
  try {
    const client = createServerClient();
    const response = await client.trophies.getLeaderboard({ limit, offset });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get leaderboard",
    };
  }
}

// ==================== USER ACTIONS ====================

/**
 * Get user by Firebase ID
 */
export async function getUserByFirebaseId(
  firebaseId: string
): Promise<ActionResponse<user.GetUserByFirebaseIdResponse>> {
  try {
    const client = createServerClient();
    const response = await client.user.getUserByFirebaseId(firebaseId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get user:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get user",
    };
  }
}

/**
 * Create user
 */
export async function createUser(
  params: user.CreateUserRequest
): Promise<ActionResponse<user.CreateUserResponse>> {
  try {
    const client = createServerClient();
    const response = await client.user.createUser(params);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to create user:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

/**
 * Update user (username for online wordle)
 */
export async function updateUser(
  userId: string,
  params: user.UpdateUserRequest
): Promise<ActionResponse<user.UpdateUserResponse>> {
  try {
    const client = createServerClient();
    const response = await client.user.updateUser(userId, params);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to update user:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to update user",
    };
  }
}

// ==================== NOTIFICATIONS ACTIONS ====================

/**
 * Save FCM token for push notifications
 */
export async function saveNotificationToken(
  userId: string,
  token: string,
  deviceType?: string
): Promise<ActionResponse<notifications.SaveTokenResponse>> {
  try {
    const client = createServerClient();
    const response = await client.notifications.saveToken({
      userId,
      token,
      deviceType,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to save notification token:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to save token",
    };
  }
}

/**
 * Delete FCM token (on logout)
 */
export async function deleteNotificationToken(
  userId: string,
  token: string
): Promise<ActionResponse<notifications.DeleteTokenResponse>> {
  try {
    const client = createServerClient();
    const response = await client.notifications.deleteToken({
      userId,
      token,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to delete notification token:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to delete token",
    };
  }
}

/**
 * Send matchmaking notification to all users
 */
export async function sendMatchmakingNotification(
  username: string,
  excludeUserId: string
): Promise<ActionResponse<notifications.SendNotificationResponse>> {
  try {
    const client = createServerClient();
    const response = await client.notifications.sendNotification({
      title: "🎮 Rakip Aranıyor!",
      body: `${username} şu an maç arıyor. Hemen katıl!`,
      targetType: "all",
      excludeUserId,
      data: { type: "matchmaking" },
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to send notification:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to send notification",
    };
  }
}

// ==================== MATCH ACTIONS ====================

/**
 * Get user match history
 */
export async function getUserMatchHistory(
  userId: string,
  limit?: number,
  offset?: number
): Promise<ActionResponse<{
  success: boolean;
  data?: Array<{
    id: string;
    match_id: string;
    player1_id: string;
    player1_type: "user" | "bot";
    player1_name: string;
    player2_id: string;
    player2_type: "user" | "bot";
    player2_name: string;
    winner_id: string | null;
    winner_type: "user" | "bot" | null;
    player1_attempts: number | null;
    player2_attempts: number | null;
    player1_trophy_change: number;
    player2_trophy_change: number;
    word: string;
    game_type: string;
    created_at: string;
    result?: "win" | "lose" | "draw";
  }>;
  error?: string;
}>> {
  try {
    const client = createServerClient();
    const response = await client.match.getUserMatchHistory(userId, { limit, offset });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get match history:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get match history",
    };
  }
}
