import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - kullanıcılar
  users: defineTable({
    username: v.string(), // Benzersiz kullanıcı adı
    deviceId: v.string(), // Cihaz kimliği
    firebaseId: v.optional(v.string()), // Firebase/Google hesap ID'si
    createdAt: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_deviceId", ["deviceId"])
    .index("by_firebaseId", ["firebaseId"]),

  // Match queue - bekleyen oyuncular
  matchQueue: defineTable({
    odaId: v.string(), // Rastgele oda kimliği
    username: v.string(), // Oyuncunun kullanıcı adı
    status: v.union(v.literal("waiting"), v.literal("matched"), v.literal("cancelled")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Active matches - aktif maçlar
  matches: defineTable({
    odaId1: v.string(), // Birinci oyuncunun oda ID'si
    odaId2: v.string(), // İkinci oyuncunun oda ID'si
    username1: v.string(), // Birinci oyuncunun kullanıcı adı
    username2: v.string(), // İkinci oyuncunun kullanıcı adı
    targetWord: v.string(), // Hedef kelime
    status: v.union(v.literal("playing"), v.literal("finished"), v.literal("abandoned")),
    winnerId: v.optional(v.string()), // Kazananın oda ID'si
    abandonedBy: v.optional(v.string()), // Oyundan ayrılan oyuncunun oda ID'si
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    // Yeni alanlar - Bot ve oyuncu bilgileri
    player1EncoreId: v.optional(v.string()), // Encore user ID
    player2EncoreId: v.optional(v.string()), // Encore user ID veya bot ID
    isBotMatch: v.optional(v.boolean()), // Bot maçı mı?
    botId: v.optional(v.string()), // Encore bot ID (bot maçı ise)
    botDifficulty: v.optional(v.string()), // Bot zorluk seviyesi
  })
    .index("by_odaId1", ["odaId1"])
    .index("by_odaId2", ["odaId2"])
    .index("by_status", ["status"]),

  // Player game states - oyuncu oyun durumları
  playerStates: defineTable({
    matchId: v.id("matches"),
    odaId: v.string(),
    guesses: v.array(
      v.array(
        v.object({
          letter: v.string(),
          state: v.union(
            v.literal("correct"),
            v.literal("present"),
            v.literal("absent"),
            v.literal("empty")
          ),
        })
      )
    ),
    currentGuess: v.string(),
    gameState: v.union(v.literal("playing"), v.literal("won"), v.literal("lost"), v.literal("disconnected")),
    finishedAt: v.optional(v.number()),
    // Joker alanları
    lastShakeSentAt: v.optional(v.number()), // Son sallantı yollandığı zaman
    receivedShakeAt: v.optional(v.number()), // Sallantı alındığı zaman (3 sn sonra temizlenir)
  })
    .index("by_matchId", ["matchId"])
    .index("by_odaId", ["odaId"])
    .index("by_matchId_odaId", ["matchId", "odaId"]),
});
