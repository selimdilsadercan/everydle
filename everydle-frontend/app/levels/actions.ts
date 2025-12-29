import { createServerClient } from "@/lib/api";
import type { progress, inventory } from "@/lib/client";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
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
 * Complete a level
 */
export async function completeLevel(
  userId: string,
  levelId: number
): Promise<ActionResponse<progress.CompleteLevelResponse>> {
  try {
    const client = createServerClient();
    const response = await client.progress.completeLevel({ userId, levelId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to complete level:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to complete level",
    };
  }
}

/**
 * Check if level is completed
 */
export async function isLevelCompleted(
  userId: string,
  levelId: number
): Promise<ActionResponse<progress.IsLevelCompletedResponse>> {
  try {
    const client = createServerClient();
    const response = await client.progress.isLevelCompleted(userId, levelId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to check level completion:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to check level completion",
    };
  }
}

/**
 * Get completed levels list
 */
export async function getCompletedLevels(
  userId: string,
  limit?: number,
  offset?: number
): Promise<ActionResponse<progress.GetCompletedLevelsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.progress.getCompletedLevels(userId, {
      limit,
      offset,
    });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to get completed levels:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to get completed levels",
    };
  }
}

/**
 * Reset level progress
 */
export async function resetLevelProgress(
  userId: string
): Promise<ActionResponse<progress.ResetLevelProgressResponse>> {
  try {
    const client = createServerClient();
    const response = await client.progress.resetLevelProgress(userId);
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to reset level progress:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to reset level progress",
    };
  }
}

// ==================== INVENTORY ACTIONS ====================

/**
 * Get user inventory
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

/**
 * Add hints (level reward)
 */
export async function addHints(
  userId: string,
  amount: number
): Promise<ActionResponse<inventory.AddHintsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.inventory.addHints({ userId, amount });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to add hints:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to add hints",
    };
  }
}
