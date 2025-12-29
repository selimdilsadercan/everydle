import { createServerClient } from "@/lib/api";
import type { trophies, gamestate } from "@/lib/client";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
}

// ==================== TROPHIES ACTIONS ====================

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

// ==================== GAME STATE ACTIONS ====================

/**
 * Save match game state
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
 * Get match history
 */
export async function getGameHistory(
  userId: string,
  gameId: string,
  limit?: number
): Promise<ActionResponse<gamestate.GetGameHistoryResponse>> {
  try {
    const client = createServerClient();
    const response = await client.gamestate.getGameHistory(userId, gameId, {
      limit,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get game history:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get game history",
    };
  }
}
