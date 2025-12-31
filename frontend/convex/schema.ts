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
    trophies: v.optional(v.number()), // Oyuncunun kupa sayısı
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
    // Best of N desteği
    score1: v.optional(v.number()), // Birinci oyuncunun aldığı set sayısı
    score2: v.optional(v.number()), // İkinci oyuncunun aldığı set sayısı
    bestOf: v.optional(v.number()), // Maçın kaç set üzerinden olduğu (örn: 3)
    lastRoundResults: v.optional(v.object({
      winnerId: v.optional(v.string()),
      word: v.string(),
      guesses1: v.array(v.any()), // [{letter, state}][]
      guesses2: v.array(v.any()),
    })),
    round: v.optional(v.number()), // Mevcut round (1-indexed)
  })
    .index("by_odaId1", ["odaId1"])
    .index("by_odaId2", ["odaId2"])
    .index("by_status", ["status"]),

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

  // User presence - çevrimiçi kullanıcıları takip etmek için
  userPresence: defineTable({
    odaId: v.string(), // Kullanıcının oda ID'si (benzersiz tanımlayıcı)
    encoreUserId: v.optional(v.string()), // Encore backend user ID
    username: v.optional(v.string()), // Kullanıcı adı
    lastSeen: v.number(), // Son aktif görülme zamanı (timestamp)
  })
    .index("by_odaId", ["odaId"])
    .index("by_encoreUserId", ["encoreUserId"])
    .index("by_lastSeen", ["lastSeen"]),
});
