import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Online olarak kabul edilme süresi (60 saniye)
const ONLINE_THRESHOLD_MS = 60 * 1000;

/**
 * Kullanıcının çevrimiçi durumunu güncelle (heartbeat)
 * Frontend her 30 saniyede bir bu fonksiyonu çağırmalı
 */
export const heartbeat = mutation({
  args: {
    odaId: v.string(),
    encoreUserId: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Mevcut presence kaydını bul
    const existing = await ctx.db
      .query("userPresence")
      .withIndex("by_odaId", (q) => q.eq("odaId", args.odaId))
      .first();
    
    if (existing) {
      // Güncelle
      await ctx.db.patch(existing._id, {
        lastSeen: now,
        encoreUserId: args.encoreUserId,
        username: args.username,
      });
    } else {
      // Yeni kayıt oluştur
      await ctx.db.insert("userPresence", {
        odaId: args.odaId,
        encoreUserId: args.encoreUserId,
        username: args.username,
        lastSeen: now,
      });
    }
    
    return { success: true };
  },
});

/**
 * Kullanıcı çıkış yaptığında presence kaydını sil
 */
export const removePresence = mutation({
  args: {
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPresence")
      .withIndex("by_odaId", (q) => q.eq("odaId", args.odaId))
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    
    return { success: true };
  },
});

/**
 * Belirli kullanıcıların çevrimiçi durumunu kontrol et
 * Bu bir query olduğu için reaktif - değişiklikler anında yansıyacak
 */
export const getOnlineStatus = query({
  args: {
    encoreUserIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.encoreUserIds.length === 0) {
      return {};
    }
    
    const now = Date.now();
    const threshold = now - ONLINE_THRESHOLD_MS;
    
    // Her kullanıcı için presence kontrolü yap
    const result: Record<string, { isOnline: boolean; lastSeen: number }> = {};
    
    for (const userId of args.encoreUserIds) {
      const presence = await ctx.db
        .query("userPresence")
        .withIndex("by_encoreUserId", (q) => q.eq("encoreUserId", userId))
        .first();
      
      if (presence && presence.lastSeen > threshold) {
        result[userId] = { isOnline: true, lastSeen: presence.lastSeen };
      } else {
        result[userId] = { isOnline: false, lastSeen: presence?.lastSeen || 0 };
      }
    }
    
    return result;
  },
});

/**
 * Tüm çevrimiçi kullanıcıların sayısını al
 */
export const getOnlineCount = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threshold = now - ONLINE_THRESHOLD_MS;
    
    const onlineUsers = await ctx.db
      .query("userPresence")
      .filter((q) => q.gt(q.field("lastSeen"), threshold))
      .collect();
    
    return onlineUsers.length;
  },
});

/**
 * Eski presence kayıtlarını temizle (1 saatten eski)
 * Bu bir scheduled job olarak çalıştırılabilir
 */
export const cleanupOldPresence = mutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    const oldRecords = await ctx.db
      .query("userPresence")
      .filter((q) => q.lt(q.field("lastSeen"), oneHourAgo))
      .collect();
    
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }
    
    return { deleted: oldRecords.length };
  },
});
