import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getRandomWord } from "./wordleWords";

function generateOdaId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Davet süresi (60 saniye)
const INVITE_EXPIRY_MS = 60 * 1000;

/**
 * Arkadaşa dostluk savaşı daveti gönder
 */
export const sendBattleRequest = mutation({
  args: {
    fromUserId: v.string(),
    fromUsername: v.string(),
    toUserId: v.string(),
    toUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Aktif bir davet var mı kontrol et
    const existingRequest = await ctx.db
      .query("friendBattleRequests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", args.fromUserId))
      .filter((q) => 
        q.and(
          q.eq(q.field("toUserId"), args.toUserId),
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .first();
    
    if (existingRequest) {
      return { success: false, error: "Zaten bekleyen bir davet var" };
    }
    
    // Yeni davet oluştur
    const odaId = generateOdaId();
    const requestId = await ctx.db.insert("friendBattleRequests", {
      fromUserId: args.fromUserId,
      fromUsername: args.fromUsername,
      fromOdaId: odaId,
      toUserId: args.toUserId,
      toUsername: args.toUsername,
      status: "pending",
      createdAt: now,
      expiresAt: now + INVITE_EXPIRY_MS,
    });
    
    return { success: true, requestId, odaId };
  },
});

/**
 * Dostluk savaşı davetini kabul et
 */ 
export const acceptBattleRequest = mutation({
  args: {
    requestId: v.id("friendBattleRequests"),
    accepterOdaId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    
    if (!request) {
      return { success: false, error: "Davet bulunamadı" };
    }
    
    if (request.status !== "pending") {
      return { success: false, error: "Bu davet artık geçerli değil" };
    }
    
    if (Date.now() > request.expiresAt) {
      await ctx.db.patch(args.requestId, { status: "expired" });
      return { success: false, error: "Davet süresi dolmuş" };
    }
    
    // Maç oluştur - Dostluk maçı olarak işaretle (kupa etkilemez)
    const targetWord = getRandomWord();
    const matchId = await ctx.db.insert("matches", {
      odaId1: request.fromOdaId,
      odaId2: args.accepterOdaId,
      username1: request.fromUsername,
      username2: request.toUsername || "Arkadaş",
      targetWord,
      status: "playing",
      startedAt: Date.now(),
      player1EncoreId: request.fromUserId,
      player2EncoreId: request.toUserId,
      isBotMatch: false,
      isFriendlyMatch: true, // Dostluk maçı - kupa etkilemez
      bestOf: 3, // 2'de biten (best of 3)
      score1: 0,
      score2: 0,
      round: 1,
    });
    
    // Oyuncu durumlarını oluştur
    await ctx.db.insert("playerStates", {
      matchId,
      odaId: request.fromOdaId,
      guesses: [],
      currentGuess: "",
      gameState: "playing",
    });
    
    await ctx.db.insert("playerStates", {
      matchId,
      odaId: args.accepterOdaId,
      guesses: [],
      currentGuess: "",
      gameState: "playing",
    });
    
    // Daveti güncelle
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      matchId,
    });
    
    return { 
      success: true, 
      matchId,
      odaId1: request.fromOdaId,
      odaId2: args.accepterOdaId,
    };
  },
});

/**
 * Dostluk savaşı davetini reddet
 */
export const rejectBattleRequest = mutation({
  args: {
    requestId: v.id("friendBattleRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    
    if (!request) {
      return { success: false, error: "Davet bulunamadı" };
    }
    
    await ctx.db.patch(args.requestId, { status: "rejected" });
    
    return { success: true };
  },
});

/**
 * Gönderilen daveti iptal et
 */
export const cancelBattleRequest = mutation({
  args: {
    requestId: v.id("friendBattleRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    
    if (!request) {
      return { success: false, error: "Davet bulunamadı" };
    }
    
    if (request.status !== "pending") {
      return { success: false, error: "Bu davet artık iptal edilemez" };
    }
    
    await ctx.db.patch(args.requestId, { status: "cancelled" });
    
    return { success: true };
  },
});

/**
 * Kullanıcıya gelen bekleyen davetleri getir (gerçek zamanlı)
 */
export const getPendingRequestsForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const requests = await ctx.db
      .query("friendBattleRequests")
      .withIndex("by_toUserId_status", (q) => 
        q.eq("toUserId", args.userId).eq("status", "pending")
      )
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();
    
    return requests;
  },
});

/**
 * Kullanıcının gönderdiği bekleyen davetleri getir
 */
export const getSentRequestsForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const requests = await ctx.db
      .query("friendBattleRequests")
      .withIndex("by_fromUserId", (q) => q.eq("fromUserId", args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .collect();
    
    return requests;
  },
});

/**
 * Belirli bir daveti getir (durum kontrolü için)
 */
export const getBattleRequest = query({
  args: {
    requestId: v.id("friendBattleRequests"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

/**
 * Süresi dolmuş davetleri temizle
 */
export const cleanupExpiredRequests = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredRequests = await ctx.db
      .query("friendBattleRequests")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();
    
    for (const request of expiredRequests) {
      await ctx.db.patch(request._id, { status: "expired" });
    }
    
    return { expired: expiredRequests.length };
  },
});
