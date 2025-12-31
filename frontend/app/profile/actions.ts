import { createServerClient } from "@/lib/api";
import type { user, stars, trophies, inventory, progress } from "@/lib/client";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
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
 * Get user by ID
 */
export async function getUser(
  userId: string
): Promise<ActionResponse<user.GetUserResponse>> {
  try {
    const client = createServerClient();
    const response = await client.user.getUser(userId);
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
 * Create a new user
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
 * Update user profile
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

// ==================== STARS ACTIONS ====================

/**
 * Get user stars balance
 */
export async function getUserStars(
  userId: string
): Promise<ActionResponse<stars.GetUserStarsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.stars.getUserStars(userId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get stars:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get stars",
    };
  }
}

/**
 * Add stars to user
 */
export async function addStars(
  userId: string,
  amount: number
): Promise<ActionResponse<stars.AddStarsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.stars.addStars({ userId, amount });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to add stars:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to add stars",
    };
  }
}

/**
 * Check if daily reward can be claimed
 */
export async function canClaimDailyReward(
  userId: string
): Promise<ActionResponse<stars.CanClaimDailyRewardResponse>> {
  try {
    const client = createServerClient();
    const response = await client.stars.canClaimDailyReward(userId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to check daily reward:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to check daily reward",
    };
  }
}

/**
 * Claim daily reward
 */
export async function claimDailyReward(
  userId: string
): Promise<ActionResponse<stars.ClaimDailyRewardResponse>> {
  try {
    const client = createServerClient();
    const response = await client.stars.claimDailyReward({ userId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to claim daily reward:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to claim daily reward",
    };
  }
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

// ==================== INVENTORY ACTIONS ====================

/**
 * Get user inventory (hints, giveups)
 */
export async function getUserInventory(
  userId: string
): Promise<ActionResponse<inventory.GetUserInventoryResponse>> {
  try {
    const client = createServerClient();
    const response = await client.inventory.getUserInventory(userId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get inventory:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get inventory",
    };
  }
}

// ==================== PROGRESS ACTIONS ====================

/**
 * Get level progress
 */
export async function getLevelProgress(
  userId: string
): Promise<ActionResponse<progress.GetLevelProgressResponse>> {
  try {
    const client = createServerClient();
    const response = await client.progress.getLevelProgress(userId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get level progress:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get level progress",
    };
  }
}

/**
 * Get completed levels count
 */
export async function getCompletedLevels(
  userId: string,
  limit?: number
): Promise<ActionResponse<progress.GetCompletedLevelsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.progress.getCompletedLevels(userId, { limit });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get completed levels:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get completed levels",
    };
  }
}

// ==================== FRIENDSHIP ACTIONS ====================

import type { friendship } from "@/lib/client";

/**
 * Get friends list
 */
export async function getFriends(
  userId: string,
  params: friendship.GetFriendsRequest = {}
): Promise<ActionResponse<friendship.GetFriendsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.friendship.getFriends(userId, params);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get friends:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get friends",
    };
  }
}

/**
 * Send friend request
 */
export async function sendFriendRequest(
  userId: string,
  friendId: string,
  isInvitation?: boolean
): Promise<ActionResponse<friendship.SendFriendRequestResponse>> {
  try {
    const client = createServerClient();
    const response = await client.friendship.sendFriendRequest({ userId, friendId, isInvitation });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to send friend request:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to send friend request",
    };
  }
}

/**
 * Accept friend request
 */
export async function acceptFriendRequest(
  userId: string,
  friendId: string
): Promise<ActionResponse<friendship.AcceptFriendRequestResponse>> {
  try {
    const client = createServerClient();
    const response = await client.friendship.acceptFriendRequest({ userId, friendId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to accept friend request:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to accept friend request",
    };
  }
}

/**
 * Reject friend request
 */
export async function rejectFriendRequest(
  userId: string,
  friendId: string
): Promise<ActionResponse<friendship.RejectFriendRequestResponse>> {
  try {
    const client = createServerClient();
    const response = await client.friendship.rejectFriendRequest({ userId, friendId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to reject friend request:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to reject friend request",
    };
  }
}

/**
 * Remove friend
 */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<ActionResponse<friendship.RemoveFriendResponse>> {
  try {
    const client = createServerClient();
    const response = await client.friendship.removeFriend({ userId, friendId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to remove friend:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to remove friend",
    };
  }
}

/**
 * Get pending requests
 */
export async function getPendingRequests(
  userId: string
): Promise<ActionResponse<friendship.GetPendingRequestsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.friendship.getPendingRequests(userId, {});
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get pending requests:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get pending requests",
    };
  }
}

// NOTE: Presence (online status) is now handled by Convex for real-time updates.
// See: frontend/convex/presence.ts and frontend/hooks/useProfileData.ts
