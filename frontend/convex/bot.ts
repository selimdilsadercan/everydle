import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { WORDLE_WORDS } from "./wordleWords";
import { Id } from "./_generated/dataModel";

// Bot zorluk seviyeleri - tahminler arası bekleme süresi (ms)
const BOT_DIFFICULTY = {
  easy: { minDelay: 8000, maxDelay: 15000, mistakeChance: 0.3 },    // Kolay - yavaş, bazen hata yapar
  medium: { minDelay: 5000, maxDelay: 10000, mistakeChance: 0.15 }, // Orta
  hard: { minDelay: 2000, maxDelay: 5000, mistakeChance: 0.05 },    // Zor - hızlı, az hata
};

// Fallback bot isimleri (Encore'a ulaşılamazsa)
const FALLBACK_BOT_USERNAMES = [
  "🤖 WordleBot",
  "🎮 AkıllıBot",
  "🧠 ZekiBot",
  "⚡ HızlıBot",
  "🎯 UstaBot",
];

// Rastgele oda ID oluştur
function generateBotOdaId(): string {
  return "bot_" + Math.random().toString(36).substring(2, 15);
}

// Tahmin sonucunu hesapla
function evaluateGuess(guess: string, targetWord: string): Array<{ letter: string; state: "correct" | "present" | "absent" }> {
  const result: Array<{ letter: string; state: "correct" | "present" | "absent" }> = [];
  const targetLetters = targetWord.split("");
  const guessLetters = guess.split("");
  const usedIndices: Set<number> = new Set();

  // İlk geçiş: Doğru pozisyondaki harfler
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = { letter: guessLetters[i], state: "correct" };
      usedIndices.add(i);
    }
  }

  // İkinci geçiş: Yanlış pozisyondaki harfler
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue; // Zaten doğru olan harfleri atla

    let found = false;
    for (let j = 0; j < 5; j++) {
      if (!usedIndices.has(j) && guessLetters[i] === targetLetters[j]) {
        result[i] = { letter: guessLetters[i], state: "present" };
        usedIndices.add(j);
        found = true;
        break;
      }
    }

    if (!found) {
      result[i] = { letter: guessLetters[i], state: "absent" };
    }
  }

  return result;
}

// Bot'un mevcut bilgilerle olası kelimeleri filtrele
function filterPossibleWords(
  previousGuesses: Array<{ guess: string; result: Array<{ letter: string; state: "correct" | "present" | "absent" }> }>
): string[] {
  let possibleWords = [...WORDLE_WORDS];

  for (const { guess, result } of previousGuesses) {
    possibleWords = possibleWords.filter(word => {
      for (let i = 0; i < 5; i++) {
        const guessLetter = guess[i];
        const state = result[i].state;

        if (state === "correct") {
          // Harf bu pozisyonda olmalı
          if (word[i] !== guessLetter) return false;
        } else if (state === "present") {
          // Harf kelimede olmalı ama bu pozisyonda olmamalı
          if (word[i] === guessLetter) return false;
          if (!word.includes(guessLetter)) return false;
        } else if (state === "absent") {
          // Harf kelimede olmamalı (doğru veya var olarak işaretlenmemişse)
          const letterCorrectOrPresent = result.some(
            (r, idx) => r.letter === guessLetter && (r.state === "correct" || r.state === "present") && idx !== i
          );
          if (!letterCorrectOrPresent && word.includes(guessLetter)) return false;
        }
      }
      return true;
    });
  }

  return possibleWords;
}

// Bot'un bir sonraki tahmini seç
function selectNextGuess(
  previousGuesses: Array<{ guess: string; result: Array<{ letter: string; state: "correct" | "present" | "absent" }> }>,
  mistakeChance: number
): string {
  const possibleWords = filterPossibleWords(previousGuesses);

  if (possibleWords.length === 0) {
    // Eğer olası kelime kalmadıysa rastgele seç
    return WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
  }

  // Hata yapma şansı
  if (Math.random() < mistakeChance && possibleWords.length > 1) {
    // Rastgele bir kelime seç (optimal olmayan)
    return possibleWords[Math.floor(Math.random() * possibleWords.length)];
  }

  // İlk tahmin için iyi bir başlangıç kelimesi kullan
  if (previousGuesses.length === 0) {
    const goodStartingWords = ["SALON", "ADRES", "KREDİ", "MERAK", "KALEM"];
    const available = goodStartingWords.filter(w => possibleWords.includes(w));
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // En optimal kelimeyi seç (basit strateji: farklı harfleri olan kelimeyi tercih et)
  const scoredWords = possibleWords.map(word => {
    const uniqueLetters = new Set(word.split(""));
    return { word, score: uniqueLetters.size };
  });

  scoredWords.sort((a, b) => b.score - a.score);

  // En yüksek skorlu kelimeler arasından birini seç
  const topWords = scoredWords.filter(w => w.score === scoredWords[0].score);
  return topWords[Math.floor(Math.random() * topWords.length)].word;
}

// Bot maçı oluştur - bekleyen oyuncuyu bot ile eşleştir
export const createBotMatch = internalMutation({
  args: { 
    queueEntryId: v.id("matchQueue"),
    playerOdaId: v.string(),
    playerUsername: v.string(),
    playerEncoreId: v.optional(v.string()), // Oyuncunun Encore user ID'si
  },
  handler: async (ctx, args) => {
    // Queue entry hala bekliyor mu kontrol et
    const queueEntry = await ctx.db.get(args.queueEntryId);
    if (!queueEntry || queueEntry.status !== "waiting") {
      return { success: false, reason: "Queue entry no longer waiting" };
    }

    // Oyuncuyu matched olarak işaretle
    await ctx.db.patch(args.queueEntryId, { status: "matched" });

    // Fallback bot bilgileri (action sonradan güncelleyecek)
    const botOdaId = generateBotOdaId();
    const fallbackBotName = FALLBACK_BOT_USERNAMES[Math.floor(Math.random() * FALLBACK_BOT_USERNAMES.length)];

    // Rastgele kelime seç
    const targetWord = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];

    // Maç oluştur - fallback bot bilgileriyle
    const matchId = await ctx.db.insert("matches", {
      odaId1: args.playerOdaId,
      odaId2: botOdaId,
      username1: args.playerUsername,
      username2: fallbackBotName,
      targetWord,
      status: "playing",
      startedAt: Date.now(),
      // Bot bilgileri
      player1EncoreId: args.playerEncoreId,
      isBotMatch: true,
      botDifficulty: "medium",
    });

    // Oyuncu state'i oluştur
    await ctx.db.insert("playerStates", {
      matchId,
      odaId: args.playerOdaId,
      guesses: [],
      currentGuess: "",
      gameState: "playing",
    });

    // Bot state'i oluştur
    await ctx.db.insert("playerStates", {
      matchId,
      odaId: botOdaId,
      guesses: [],
      currentGuess: "",
      gameState: "playing",
    });

    // Action ile Encore'dan bot profili al ve match'i güncelle
    await ctx.scheduler.runAfter(0, internal.encoreApi.fetchBotAndUpdateMatch, {
      matchId,
      difficulty: "medium",
    });

    // Bot'un ilk hamlesini planla (3-5 saniye sonra)
    const firstMoveDelay = 3000 + Math.random() * 2000;

    await ctx.scheduler.runAfter(firstMoveDelay, internal.bot.botMakeMove, {
      matchId,
      botOdaId,
      targetWord,
      difficulty: "medium",
    });

    return { 
      success: true, 
      matchId, 
      botOdaId, 
      botUsername: fallbackBotName,
    };
  },
});

// Maç'ı Encore bot profili ile güncelle (action tarafından çağrılır)
export const updateMatchBotInfo = internalMutation({
  args: {
    matchId: v.id("matches"),
    botId: v.string(),
    botName: v.string(),
    botDifficulty: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("updateMatchBotInfo called:", args);
    await ctx.db.patch(args.matchId, {
      botId: args.botId,
      player2EncoreId: args.botId,
      username2: args.botName,
      botDifficulty: args.botDifficulty,
    });
    return { success: true };
  },
});

// Eski fonksiyon - geriye uyumluluk için
export const updateMatchWithBotProfile = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Şimdi fetchBotAndUpdateMatch action'ı kullanılıyor
    console.log("updateMatchWithBotProfile called for match:", args.matchId);
    return { success: true };
  },
});

// Bot hamle yap
export const botMakeMove = internalMutation({
  args: {
    matchId: v.id("matches"),
    botOdaId: v.string(),
    targetWord: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  },
  handler: async (ctx, args) => {
    // Maç hala aktif mi kontrol et
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, reason: "Match no longer active" };
    }

    // Bot state'ini al
    const botState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.botOdaId)
      )
      .first();

    if (!botState || botState.gameState !== "playing") {
      return { success: false, reason: "Bot state not found or not playing" };
    }

    // Bot shake aldı mı kontrol et - aldıysa bu hamleyi geciktir
    const now = Date.now();
    if (botState.receivedShakeAt && now - botState.receivedShakeAt < 5000) {
      // Shake etkisi altında - 3-5 saniye sonra tekrar dene
      const shakeDelay = 3000 + Math.random() * 2000;
      await ctx.scheduler.runAfter(shakeDelay, internal.bot.botMakeMove, {
        matchId: args.matchId,
        botOdaId: args.botOdaId,
        targetWord: args.targetWord,
        difficulty: args.difficulty,
      });
      return { success: true, result: "delayed_by_shake" };
    }

    // Shake temizle (eğer varsa)
    if (botState.receivedShakeAt) {
      await ctx.db.patch(botState._id, {
        receivedShakeAt: undefined,
      });
    }

    // Önceki tahminleri hazırla
    const previousGuesses = botState.guesses.map((guessResult) => ({
      guess: guessResult.map(g => g.letter).join(""),
      result: guessResult as Array<{ letter: string; state: "correct" | "present" | "absent" }>,
    }));

    // Yeni tahmin seç
    const difficultySettings = BOT_DIFFICULTY[args.difficulty];
    const newGuess = selectNextGuess(previousGuesses, difficultySettings.mistakeChance);

    // Tahmini değerlendir
    const guessResult = evaluateGuess(newGuess, args.targetWord);

    // State'i güncelle
    const newGuesses = [...botState.guesses, guessResult];
    const isWon = guessResult.every(g => g.state === "correct");
    const isLost = newGuesses.length >= 6 && !isWon;

    await ctx.db.patch(botState._id, {
      guesses: newGuesses,
      currentGuess: "",
      gameState: isWon ? "won" : isLost ? "lost" : "playing",
      finishedAt: isWon || isLost ? Date.now() : undefined,
    });

    // Eğer bot kazandı veya kaybettiyse, maçı bitir
    if (isWon) {
      await ctx.db.patch(args.matchId, {
        status: "finished",
        winnerId: args.botOdaId,
        finishedAt: Date.now(),
      });

      // Encore'a maç sonucunu logla ve kupaları güncelle (action ile)
      if (match.isBotMatch) {
        const playerState = await ctx.db
          .query("playerStates")
          .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
          .filter((q) => q.neq(q.field("odaId"), args.botOdaId))
          .first();

        // Maç sonucunu Encore'a logla (action)
        await ctx.scheduler.runAfter(0, internal.encoreApi.logMatchResult, {
          matchId: args.matchId,
          player1Id: match.player1EncoreId || match.odaId1,
          player1Type: "user",
          player1Name: match.username1,
          player2Id: match.botId || args.botOdaId,
          player2Type: "bot",
          player2Name: match.username2,
          winnerId: match.botId || args.botOdaId,
          winnerType: "bot",
          player1Attempts: playerState?.guesses.length || 0,
          player2Attempts: newGuesses.length,
          player1TrophyChange: -15,
          player2TrophyChange: 30,
          word: args.targetWord,
          gameType: "wordle",
        });

        // Bot kupasını güncelle (+30) - botId varsa
        if (match.botId) {
          await ctx.scheduler.runAfter(0, internal.encoreApi.applyBotMatchResult, {
            botId: match.botId,
            result: "win",
            trophyChange: 30,
          });
        }

        // Oyuncu kupasını güncelle (-15)
        if (match.player1EncoreId) {
          await ctx.scheduler.runAfter(0, internal.encoreApi.applyUserMatchResult, {
            userId: match.player1EncoreId,
            result: "lose",
            trophyChange: -15,
          });
        }
      }

      return { success: true, result: "won" };
    }

    if (isLost) {
      // Bot kaybetti, oyuncunun durumuna bak
      const playerState = await ctx.db
        .query("playerStates")
        .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
        .filter((q) => q.neq(q.field("odaId"), args.botOdaId))
        .first();

      if (playerState?.gameState === "won") {
        // Oyuncu zaten kazanmış, maç zaten bitti
        return { success: true, result: "lost" };
      }

      // Oyuncu hala oynuyor, maç devam ediyor
      return { success: true, result: "lost_waiting" };
    }

    // Bot hala oynuyor, bir sonraki hamleyi planla
    const delay = difficultySettings.minDelay + 
      Math.random() * (difficultySettings.maxDelay - difficultySettings.minDelay);

    await ctx.scheduler.runAfter(delay, internal.bot.botMakeMove, {
      matchId: args.matchId,
      botOdaId: args.botOdaId,
      targetWord: args.targetWord,
      difficulty: args.difficulty,
    });

    // Rastgele shake gönder - %25 şans (her hamlede)
    if (Math.random() < 0.25) {
      // 2-5 saniye içinde shake gönder
      const shakeDelay = 2000 + Math.random() * 3000;
      await ctx.scheduler.runAfter(shakeDelay, internal.bot.botSendShake, {
        matchId: args.matchId,
        botOdaId: args.botOdaId,
      });
    }

    return { success: true, result: "continue", guessCount: newGuesses.length };
  },
});

// Bot shake gönder
export const botSendShake = internalMutation({
  args: {
    matchId: v.id("matches"),
    botOdaId: v.string(),
  },
  handler: async (ctx, args) => {
    // Maç hala aktif mi kontrol et
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, reason: "Match no longer active" };
    }

    // Bot state'ini al ve cooldown kontrol et
    const botState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.botOdaId)
      )
      .first();

    if (!botState || botState.gameState !== "playing") {
      return { success: false, reason: "Bot state not found or not playing" };
    }

    // 30 saniye cooldown kontrolü
    const now = Date.now();
    const cooldown = 30000;
    if (botState.lastShakeSentAt && now - botState.lastShakeSentAt < cooldown) {
      return { success: false, reason: "Cooldown active" };
    }

    // Oyuncunun state'ini bul
    const playerOdaId = match.odaId1 === args.botOdaId ? match.odaId2 : match.odaId1;
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", playerOdaId)
      )
      .first();

    if (!playerState || playerState.gameState !== "playing") {
      return { success: false, reason: "Player state not found or not playing" };
    }

    // Bot'un son shake zamanını güncelle
    await ctx.db.patch(botState._id, {
      lastShakeSentAt: now,
    });

    // Oyuncuya shake gönder
    await ctx.db.patch(playerState._id, {
      receivedShakeAt: now,
    });

    return { success: true };
  },
});

// Bot yazıyor animasyonu (currentGuess güncelleme)
export const botTypingAnimation = internalMutation({
  args: {
    matchId: v.id("matches"),
    botOdaId: v.string(),
    targetGuess: v.string(),
    currentIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return;
    }

    const botState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.botOdaId)
      )
      .first();

    if (!botState || botState.gameState !== "playing") {
      return;
    }

    // Yavaş yavaş harfleri yaz
    const partialGuess = args.targetGuess.substring(0, args.currentIndex + 1);
    await ctx.db.patch(botState._id, {
      currentGuess: partialGuess,
    });

    // Eğer tüm harfler yazılmadıysa, bir sonraki harfi planla
    if (args.currentIndex < args.targetGuess.length - 1) {
      const typingDelay = 200 + Math.random() * 300; // 200-500ms arası
      await ctx.scheduler.runAfter(typingDelay, internal.bot.botTypingAnimation, {
        matchId: args.matchId,
        botOdaId: args.botOdaId,
        targetGuess: args.targetGuess,
        currentIndex: args.currentIndex + 1,
      });
    }
  },
});

// Queue'da bekleyen oyuncuları kontrol et ve gerekirse bot eşleştir
export const checkAndCreateBotMatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const BOT_WAIT_TIME = 15000; // 15 saniye bekledikten sonra bot devreye girer

    // Uzun süredir bekleyen oyuncuları bul
    const waitingPlayers = await ctx.db
      .query("matchQueue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    for (const player of waitingPlayers) {
      const waitTime = now - player.createdAt;
      
      if (waitTime >= BOT_WAIT_TIME) {
        // Bu oyuncu için bot eşleştirmesi yap
        await ctx.scheduler.runAfter(0, internal.bot.createBotMatch, {
          queueEntryId: player._id,
          playerOdaId: player.odaId,
          playerUsername: player.username,
        });
      }
    }
  },
});
