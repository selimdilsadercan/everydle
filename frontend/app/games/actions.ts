import { createServerClient } from "@/lib/api";
import type { daily, chests, gamestate } from "@/lib/client";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
}

// ==================== DAILY GAME ACTIONS ====================

/**
 * Get completed games for a specific date
 */
export async function getCompletedGamesForDate(
  userId: string,
  date?: string
): Promise<ActionResponse<daily.GetCompletedGamesForDateResponse>> {
  try {
    const client = createServerClient();
    const response = await client.daily.getCompletedGamesForDate(userId, { date });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get completed games for date:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get completed games",
    };
  }
}

/**
 * Mark a daily game as completed
 */
export async function markDailyGameCompleted(
  userId: string,
  gameId: string,
  gameNumber: number,
  completionDate?: string
): Promise<ActionResponse<daily.MarkDailyGameCompletedResponse>> {
  try {
    const client = createServerClient();
    const response = await client.daily.markDailyGameCompleted({
      userId,
      gameId,
      gameNumber,
      completionDate,
    });
    
    // Dispatch event so AppBar can update via React Query refetch
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dailyProgressUpdate", { 
        detail: { gameId, gameNumber } 
      }));
    }
    
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to mark game completed:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to mark game completed",
    };
  }
}

/**
 * Unmark a daily game completion
 */
export async function unmarkDailyGameCompleted(
  userId: string,
  gameId: string,
  gameNumber: number
): Promise<ActionResponse<daily.UnmarkDailyGameCompletedResponse>> {
  try {
    const client = createServerClient();
    const response = await client.daily.unmarkDailyGameCompleted({
      userId,
      gameId,
      gameNumber,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to unmark game completed:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to unmark game completed",
    };
  }
}

/**
 * Check if a game is completed
 */
export async function isGameCompleted(
  userId: string,
  gameId: string,
  gameNumber: number
): Promise<ActionResponse<daily.IsGameCompletedResponse>> {
  try {
    const client = createServerClient();
    const response = await client.daily.isGameCompleted(userId, gameId, gameNumber);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to check game completion:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to check game completion",
    };
  }
}

/**
 * Get all completed games for a user and game type
 */
export async function getAllCompletedGames(
  userId: string,
  gameId: string,
  limit?: number,
  offset?: number
): Promise<ActionResponse<daily.GetAllCompletedGamesResponse>> {
  try {
    const client = createServerClient();
    const response = await client.daily.getAllCompletedGames(userId, gameId, { limit, offset });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get all completed games:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get all completed games",
    };
  }
}

// ==================== CHEST ACTIONS ====================

/**
 * Get claimed chests for a specific date
 */
export async function getClaimedChests(
  userId: string,
  date: string
): Promise<ActionResponse<chests.GetClaimedChestsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.chests.getClaimedChests(userId, date);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get claimed chests:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get claimed chests",
    };
  }
}

/**
 * Claim a chest
 */
export async function claimChest(
  userId: string,
  date: string,
  milestone: number,
  rewardType: "coins" | "hint",
  rewardAmount: number
): Promise<ActionResponse<chests.ClaimChestResponse>> {
  try {
    const client = createServerClient();
    const response = await client.chests.claimChest({
      userId,
      date,
      milestone,
      rewardType,
      rewardAmount,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to claim chest:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to claim chest",
    };
  }
}

// ==================== GAME STATE ACTIONS ====================

/**
 * Get game state from backend
 */
export async function getGameState(
  userId: string,
  gameId: string,
  gameNumber: number
): Promise<ActionResponse<gamestate.GetGameStateResponse>> {
  try {
    const client = createServerClient();
    const response = await client.gamestate.getGameState(userId, gameId, gameNumber);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get game state:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get game state",
    };
  }
}

/**
 * Save game state to backend
 */
export async function saveGameState(
  userId: string,
  gameId: string,
  gameNumber: number,
  state: Record<string, unknown>,
  isCompleted?: boolean,
  isWon?: boolean
): Promise<ActionResponse<gamestate.SaveGameStateResponse>> {
  try {
    const client = createServerClient();
    const response = await client.gamestate.saveGameState({
      userId,
      gameId,
      gameNumber,
      state,
      isCompleted,
      isWon,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to save game state:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to save game state",
    };
  }
}

/**
 * Delete game state (reset game)
 */
export async function deleteGameState(
  userId: string,
  gameId: string,
  gameNumber: number
): Promise<ActionResponse<gamestate.DeleteGameStateResponse>> {
  try {
    const client = createServerClient();
    const response = await client.gamestate.deleteGameState(userId, gameId, gameNumber);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to delete game state:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to delete game state",
    };
  }
}
