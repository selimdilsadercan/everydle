"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Encore API URL
const ENCORE_API_URL = "https://staging-everydle-qnxi.encr.app";

// Bot profili al ve match'i güncelle (tek action'da)
export const fetchBotAndUpdateMatch = internalAction({
  args: {
    matchId: v.id("matches"),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("fetchBotAndUpdateMatch called:", args);
    try {
      const url = new URL(`${ENCORE_API_URL}/match/bot/random`);
      if (args.difficulty) url.searchParams.set("difficulty", args.difficulty);
      
      const response = await fetch(url.toString());
      const data = await response.json();
      console.log("fetchBotAndUpdateMatch - bot response:", data);
      
      if (data.success && data.data) {
        const bot = data.data;
        // Match'i bot bilgileriyle güncelle (mutation çağır)
        await ctx.runMutation(internal.bot.updateMatchBotInfo, {
          matchId: args.matchId,
          botId: bot.id,
          botName: bot.bot_name,
          botDifficulty: bot.difficulty,
        });
        console.log("Match updated with bot info:", bot.id, bot.bot_name);
        return { success: true, bot };
      }
      return { success: false, error: "Bot not found" };
    } catch (error) {
      console.error("fetchBotAndUpdateMatch error:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Rastgele bot profili al (sadece bilgi için)
export const getRandomBot = internalAction({
  args: {
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    id: string;
    bot_name: string;
    difficulty: "very_easy" | "easy" | "medium" | "hard";
    trophies: number;
  } | null> => {
    console.log("getRandomBot action called:", { difficulty: args.difficulty });
    try {
      const url = new URL(`${ENCORE_API_URL}/match/bot/random`);
      if (args.difficulty) url.searchParams.set("difficulty", args.difficulty);
      
      const response = await fetch(url.toString());
      const data = await response.json();
      console.log("getRandomBot response:", data);
      
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Encore getRandomBot error:", error);
      return null;
    }
  },
});

// Maç sonucunu logla
export const logMatchResult = internalAction({
  args: {
    matchId: v.string(),
    player1Id: v.string(),
    player1Type: v.union(v.literal("user"), v.literal("bot")),
    player1Name: v.string(),
    player2Id: v.string(),
    player2Type: v.union(v.literal("user"), v.literal("bot")),
    player2Name: v.string(),
    winnerId: v.optional(v.string()),
    winnerType: v.optional(v.union(v.literal("user"), v.literal("bot"))),
    player1Attempts: v.optional(v.number()),
    player2Attempts: v.optional(v.number()),
    player1TrophyChange: v.optional(v.number()),
    player2TrophyChange: v.optional(v.number()),
    word: v.string(),
    gameType: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    console.log("logMatchResult action called:", args);
    try {
      // Convex ID'si UUID formatında olmadığı için yeni bir UUID oluştur
      // crypto.randomUUID() kullanarak gerçek UUID oluştur
      const uuid = crypto.randomUUID();
      
      const response = await fetch(`${ENCORE_API_URL}/match/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...args,
          matchId: uuid, // Convex ID yerine UUID kullan
        }),
      });
      const data = await response.json();
      console.log("logMatchResult response:", data);
      return data.success === true;
    } catch (error) {
      console.error("Encore logMatchResult error:", error);
      return false;
    }
  },
});

// Bot kupasını güncelle
export const applyBotMatchResult = internalAction({
  args: {
    botId: v.string(),
    result: v.union(v.literal("win"), v.literal("lose")),
    trophyChange: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    console.log("applyBotMatchResult action called:", args);
    try {
      const response = await fetch(`${ENCORE_API_URL}/match/bot/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: args.botId,
          result: args.result,
          trophyChange: args.trophyChange,
        }),
      });
      const data = await response.json();
      console.log("applyBotMatchResult response:", data);
      return data.success === true;
    } catch (error) {
      console.error("Encore applyBotMatchResult error:", error);
      return false;
    }
  },
});

// Kullanıcı kupasını güncelle
export const applyUserMatchResult = internalAction({
  args: {
    userId: v.string(),
    result: v.union(v.literal("win"), v.literal("lose"), v.literal("draw")),
    trophyChange: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    console.log("applyUserMatchResult action called:", args);
    try {
      const response = await fetch(`${ENCORE_API_URL}/trophies/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: args.userId,
          result: args.result,
          trophyChange: args.trophyChange,
        }),
      });
      const data = await response.json();
      console.log("applyUserMatchResult response:", data);
      return data.success === true;
    } catch (error) {
      console.error("Encore applyUserMatchResult error:", error);
      return false;
    }
  },
});
