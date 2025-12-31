import { createServerClient } from "@/lib/api";
import type { stars, inventory } from "@/lib/client";

// Standardized response format
interface ActionResponse<T> {
  data: T | null;
  error: string | null;
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
 * Remove stars from user
 */
export async function removeStars(
  userId: string,
  amount: number
): Promise<ActionResponse<stars.RemoveStarsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.stars.removeStars({ userId, amount });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to remove stars:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to remove stars",
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
 * Add hints (purchase)
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

/**
 * Add giveups (purchase)
 */
export async function addGiveups(
  userId: string,
  amount: number
): Promise<ActionResponse<inventory.AddGiveupsResponse>> {
  try {
    const client = createServerClient();
    const response = await client.inventory.addGiveups({ userId, amount });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to add giveups:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to add giveups",
    };
  }
}

/**
 * Use a hint
 */
export async function useHint(
  userId: string
): Promise<ActionResponse<inventory.UseHintResponse>> {
  try {
    const client = createServerClient();
    const response = await client.inventory.useHint({ userId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to use hint:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to use hint",
    };
  }
}

/**
 * Use a giveup
 */
export async function useGiveup(
  userId: string
): Promise<ActionResponse<inventory.UseGiveupResponse>> {
  try {
    const client = createServerClient();
    const response = await client.inventory.useGiveup({ userId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to use giveup:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to use giveup",
    };
  }
}

/**
 * Reset daily reward (DEBUG ONLY - for testing)
 */
export async function resetDailyReward(
  userId: string
): Promise<ActionResponse<stars.ResetDailyRewardResponse>> {
  try {
    const client = createServerClient();
    const response = await client.stars.resetDailyReward({ userId });
    return { data: response, error: null };
  } catch (error) {
    console.error("Failed to reset daily reward:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to reset daily reward",
    };
  }
}
