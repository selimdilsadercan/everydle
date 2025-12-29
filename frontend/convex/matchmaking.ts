import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getRandomWord } from "./wordleWords";

// Bot bekleme süresi (ms) - bu süre sonunda gerçek rakip bulunamazsa bot devreye girer
const BOT_WAIT_TIME = 2000; // 5 saniye

// Rastgele oda ID oluştur
function generateOdaId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Queue'ya katıl
export const joinQueue = mutation({
  args: { 
    username: v.string(),
    encoreUserId: v.optional(v.string()), // Encore backend user ID
    trophies: v.optional(v.number()), // Oyuncunun güncel kupa sayısı
  },
  handler: async (ctx, args) => {
    const odaId = generateOdaId();
    
    // Bekleyen oyuncu var mı kontrol et (bot olmayan)
    const waitingPlayer = await ctx.db
      .query("matchQueue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();
    
    if (waitingPlayer) {
      // Eşleşme bulundu! Maç oluştur
      await ctx.db.patch(waitingPlayer._id, { status: "matched" });
      
      // Rastgele kelime seç - words_wordle_5letters_filtered.txt'den
      const targetWord = getRandomWord();
      
      // Kupa sayısına göre Best of N belirle (Altın Arena ve üzeri: 3 maç)
      const maxTrophies = Math.max(waitingPlayer.trophies || 0, args.trophies || 0);
      const bestOf = maxTrophies >= 600 ? 3 : 1;

      // Maç oluştur
      const matchId = await ctx.db.insert("matches", {
        odaId1: waitingPlayer.odaId,
        odaId2: odaId,
        username1: waitingPlayer.username,
        username2: args.username,
        targetWord,
        status: "playing",
        startedAt: Date.now(),
        bestOf,
        score1: 0,
        score2: 0,
        round: 1,
      });
      
      // Her iki oyuncu için state oluştur
      await ctx.db.insert("playerStates", {
        matchId,
        odaId: waitingPlayer.odaId,
        guesses: [],
        currentGuess: "",
        gameState: "playing",
      });
      
      await ctx.db.insert("playerStates", {
        matchId,
        odaId: odaId,
        guesses: [],
        currentGuess: "",
        gameState: "playing",
      });
      
      return { 
        status: "matched", 
        odaId, 
        matchId,
        myUsername: args.username,
        opponentUsername: waitingPlayer.username,
      };
    } else {
      // Bekleyen yok, queue'ya ekle
      const queueEntryId = await ctx.db.insert("matchQueue", {
        odaId,
        username: args.username,
        trophies: args.trophies,
        status: "waiting",
        createdAt: Date.now(),
      });
      
      // Bot eşleştirmesini planla - belirli süre sonra gerçek rakip bulunamazsa bot devreye girer
      await ctx.scheduler.runAfter(BOT_WAIT_TIME, internal.bot.createBotMatch, {
        queueEntryId,
        playerOdaId: odaId,
        playerUsername: args.username,
        playerEncoreId: args.encoreUserId, // Encore user ID'yi geç
        playerTrophies: args.trophies || 0, // Kupa bilgisini bot eşleştirmesine aktar
      });
      
      return { status: "waiting", odaId, myUsername: args.username };
    }
  },
});

// Queue'dan çık
export const leaveQueue = mutation({
  args: { odaId: v.string() },
  handler: async (ctx, args) => {
    const queueEntry = await ctx.db
      .query("matchQueue")
      .filter((q) => q.eq(q.field("odaId"), args.odaId))
      .first();
    
    if (queueEntry && queueEntry.status === "waiting") {
      await ctx.db.patch(queueEntry._id, { status: "cancelled" });
    }
  },
});

// Eşleşme durumunu kontrol et
export const checkMatchStatus = query({
  args: { odaId: v.string() },
  handler: async (ctx, args) => {
    // Queue'da mı kontrol et
    const queueEntry = await ctx.db
      .query("matchQueue")
      .filter((q) => q.eq(q.field("odaId"), args.odaId))
      .first();
    
    if (queueEntry) {
      if (queueEntry.status === "waiting") {
        return { status: "waiting", myUsername: queueEntry.username };
      }
      if (queueEntry.status === "matched") {
        // Maç bul
        const match = await ctx.db
          .query("matches")
          .filter((q) => 
            q.or(
              q.eq(q.field("odaId1"), args.odaId),
              q.eq(q.field("odaId2"), args.odaId)
            )
          )
          .first();
        
        if (match) {
          const isPlayer1 = match.odaId1 === args.odaId;
          return { 
            status: "matched", 
            matchId: match._id,
            myUsername: isPlayer1 ? match.username1 : match.username2,
            opponentUsername: isPlayer1 ? match.username2 : match.username1,
          };
        }
      }
    }
    
    // Aktif maçta mı kontrol et
    const activeMatch = await ctx.db
      .query("matches")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "playing"),
          q.or(
            q.eq(q.field("odaId1"), args.odaId),
            q.eq(q.field("odaId2"), args.odaId)
          )
        )
      )
      .first();
    
    if (activeMatch) {
      const isPlayer1 = activeMatch.odaId1 === args.odaId;
      return { 
        status: "playing", 
        matchId: activeMatch._id,
        myUsername: isPlayer1 ? activeMatch.username1 : activeMatch.username2,
        opponentUsername: isPlayer1 ? activeMatch.username2 : activeMatch.username1,
      };
    }
    
    return { status: "not_found" };
  },
});

// Queue'daki bekleyen sayısı
export const getQueueCount = query({
  args: {},
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("matchQueue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();
    
    return waiting.length;
  },
});