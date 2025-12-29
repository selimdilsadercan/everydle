import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Kullanıcı adının kullanılabilir olup olmadığını kontrol et
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    // Case-insensitive kontrol için lowercase ile karşılaştır
    const allUsers = await ctx.db.query("users").collect();
    const exists = allUsers.some(
      (u) => u.username.toLowerCase() === args.username.toLowerCase()
    );
    
    return !exists;
  },
});

// Cihaz ID'sine göre kullanıcı bul
export const getUserByDeviceId = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    
    return user;
  },
});

// Firebase ID'sine göre kullanıcı bul
export const getUserByFirebaseId = query({
  args: { firebaseId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_firebaseId", (q) => q.eq("firebaseId", args.firebaseId))
      .first();
    
    return user;
  },
});

// Yeni kullanıcı kaydet
export const registerUser = mutation({
  args: { 
    username: v.string(),
    deviceId: v.string(),
    firebaseId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedUsername = args.username.trim();
    
    // Kullanıcı adı kullanılıyor mu kontrol et (case-insensitive)
    const allUsers = await ctx.db.query("users").collect();
    const exists = allUsers.some(
      (u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    
    if (exists) {
      return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" };
    }
    
    // Bu cihazda zaten kullanıcı var mı kontrol et
    const existingDevice = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    
    if (existingDevice) {
      // Eğer firebaseId verilmişse, mevcut kullanıcıya bağla
      if (args.firebaseId && !existingDevice.firebaseId) {
        await ctx.db.patch(existingDevice._id, { firebaseId: args.firebaseId });
        return { success: true, userId: existingDevice._id, username: existingDevice.username, linked: true };
      }
      return { success: false, error: "Bu cihazda zaten bir hesap var" };
    }
    
    // Yeni kullanıcı oluştur
    const userId = await ctx.db.insert("users", {
      username: trimmedUsername,
      deviceId: args.deviceId,
      firebaseId: args.firebaseId,
      createdAt: Date.now(),
    });
    
    return { success: true, userId, username: trimmedUsername };
  },
});

// Username güncelle
export const updateUsername = mutation({
  args: { 
    deviceId: v.string(),
    newUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedUsername = args.newUsername.trim();
    
    // Kullanıcı adı format kontrolü
    if (trimmedUsername.length < 3) {
      return { success: false, error: "Kullanıcı adı en az 3 karakter olmalı" };
    }
    if (trimmedUsername.length > 15) {
      return { success: false, error: "Kullanıcı adı en fazla 15 karakter olabilir" };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return { success: false, error: "Sadece harf, rakam ve alt çizgi kullanabilirsiniz" };
    }
    
    // Mevcut kullanıcıyı bul
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    
    if (!user) {
      return { success: false, error: "Kullanıcı bulunamadı" };
    }
    
    // Yeni username farklı mı kontrol et
    if (user.username.toLowerCase() === trimmedUsername.toLowerCase()) {
      return { success: true, username: user.username, noChange: true };
    }
    
    // Kullanıcı adı kullanılıyor mu kontrol et (case-insensitive)
    const allUsers = await ctx.db.query("users").collect();
    const exists = allUsers.some(
      (u) => u._id !== user._id && u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    
    if (exists) {
      return { success: false, error: "Bu kullanıcı adı zaten kullanılıyor" };
    }
    
    // Username'i güncelle
    await ctx.db.patch(user._id, { username: trimmedUsername });
    
    return { success: true, username: trimmedUsername };
  },
});

// Firebase ID'yi mevcut kullanıcıya bağla
export const linkFirebaseId = mutation({
  args: { 
    deviceId: v.string(),
    firebaseId: v.string(),
  },
  handler: async (ctx, args) => {
    // Firebase ID zaten başka bir kullanıcıda kullanılıyor mu kontrol et
    const existingFirebase = await ctx.db
      .query("users")
      .withIndex("by_firebaseId", (q) => q.eq("firebaseId", args.firebaseId))
      .first();
    
    if (existingFirebase) {
      // Zaten bağlı bir kullanıcı varsa, o kullanıcının bilgilerini döndür
      return { success: true, user: existingFirebase, alreadyLinked: true };
    }
    
    // Device ID ile kullanıcı bul
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();
    
    if (!user) {
      return { success: false, error: "Kullanıcı bulunamadı", needsUsername: true };
    }
    
    // Firebase ID'yi bağla
    await ctx.db.patch(user._id, { firebaseId: args.firebaseId });
    
    return { success: true, user: { ...user, firebaseId: args.firebaseId } };
  },
});
