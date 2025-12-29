import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getRandomWord } from "./wordleWords";

// Maç bilgisini getir
export const getMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

// Oyuncu durumunu getir
export const getPlayerState = query({
  args: { matchId: v.id("matches"), odaId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
  },
});

// Rakip durumunu getir (kelime hariç sadece ilerleme ve renkler)
export const getOpponentState = query({
  args: { matchId: v.id("matches"), odaId: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
    const opponentUsername = match.odaId1 === args.odaId ? match.username2 : match.username1;
    
    const opponentState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", opponentOdaId)
      )
      .first();
    
    if (!opponentState) return null;

    // Rakibin tahminlerini gönder - harfleri gizle, sadece renkleri göster
    const colorGrid = opponentState.guesses.map((guess) => 
      guess.map((letter) => letter.state)
    );

    // Maç bittiyse harfleri de gönder
    const isFinished = match.status === "finished" || match.status === "abandoned";

    return {
      guessCount: opponentState.guesses.length,
      gameState: opponentState.gameState,
      finishedAt: opponentState.finishedAt,
      colorGrid, // Her satır için 5 renk durumu
      currentGuessLength: opponentState.currentGuess?.length || 0, // Rakibin anlık yazdığı harf sayısı
      username: opponentUsername,
      // Maç bittiyse tüm tahminleri gönder
      guesses: isFinished ? opponentState.guesses : undefined,
    };
  },
});

// Tahmin gönder
export const submitGuess = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
    guess: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, error: "Maç aktif değil" };
    }
    
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (!playerState || playerState.gameState !== "playing") {
      return { success: false, error: "Oyun durumu geçersiz" };
    }

    // Tahmini değerlendir
    const targetWord = match.targetWord;
    const guessArray = args.guess.split("");
    const targetArray = targetWord.split("");
    const used = new Array(5).fill(false);
    
    const evaluated: { letter: string; state: "correct" | "present" | "absent" | "empty" }[] = [];
    
    // İlk geçiş: doğru konumdaki harfler
    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === targetArray[i]) {
        evaluated.push({ letter: guessArray[i], state: "correct" });
        used[i] = true;
      } else {
        evaluated.push({ letter: "", state: "empty" });
      }
    }
    
    // İkinci geçiş: var olan harfler
    for (let i = 0; i < 5; i++) {
      if (evaluated[i].state === "empty") {
        const letter = guessArray[i];
        const index = targetArray.findIndex((char, idx) => char === letter && !used[idx]);
        if (index !== -1) {
          evaluated[i] = { letter, state: "present" };
          used[index] = true;
        } else {
          evaluated[i] = { letter, state: "absent" };
        }
      }
    }
    
    const newGuesses = [...playerState.guesses, evaluated];
    const isWon = args.guess === targetWord;
    const isLost = newGuesses.length >= 6 && !isWon;
    
    // Oyuncu durumunu güncelle
    await ctx.db.patch(playerState._id, {
      guesses: newGuesses,
      currentGuess: "",
      gameState: isWon ? "won" : isLost ? "lost" : "playing",
      finishedAt: isWon || isLost ? Date.now() : undefined,
    });
    
    // Oyuncuyu kazandıysa set sonucunu değerlendir
    if (isWon || isLost) {
      // Rakip durumunu al
      const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
      const opponentState = await ctx.db
        .query("playerStates")
        .withIndex("by_matchId_odaId", (q) => 
          q.eq("matchId", args.matchId).eq("odaId", opponentOdaId)
        )
        .first();

      const bestOf = match.bestOf ?? 1;
      const winThreshold = Math.ceil(bestOf / 2);

      let roundWinner: string | null = null;
      let roundDraw = false;

      if (isWon) {
        roundWinner = args.odaId;
      } else if (isLost && opponentState?.gameState === "lost") {
        // İki oyuncu da bilemedi, round'u berabere sayıp yeniden başlat
        roundDraw = true;
      } else if (isLost && opponentState?.gameState === "won") {
          // Rakip zaten kazanmış (nadir durum, senkronizasyon için)
          roundWinner = opponentOdaId;
      }

      if (roundWinner || roundDraw) {
        // Skorları güncelle
        const currentScore1 = match.score1 ?? 0;
        const currentScore2 = match.score2 ?? 0;
        const isPlayer1 = args.odaId === match.odaId1;
        
        let newScore1 = currentScore1;
        let newScore2 = currentScore2;

        if (roundWinner === match.odaId1) newScore1++;
        if (roundWinner === match.odaId2) newScore2++;

        // Maç bitti mi?
        const matchWinnerId = newScore1 >= winThreshold ? match.odaId1 : (newScore2 >= winThreshold ? match.odaId2 : null);

        if (matchWinnerId) {
          // Maçı tamamen bitir
          await ctx.db.patch(args.matchId, {
            status: "finished",
            winnerId: matchWinnerId,
            score1: newScore1,
            score2: newScore2,
            finishedAt: Date.now(),
          });

          // Bot maçı ise Encore'a sonucu logla
          if (match.isBotMatch) {
            const isUserWinner = matchWinnerId === (match.odaId1 === args.odaId ? args.odaId : match.odaId1);
            
            await ctx.scheduler.runAfter(0, internal.encoreApi.logMatchResult, {
              matchId: args.matchId,
              player1Id: match.player1EncoreId || (isPlayer1 ? args.odaId : opponentOdaId),
              player1Type: "user",
              player1Name: match.username1,
              player2Id: match.botId || (isPlayer1 ? opponentOdaId : args.odaId),
              player2Type: "bot",
              player2Name: match.username2,
              winnerId: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? (match.player1EncoreId || (isPlayer1 ? args.odaId : opponentOdaId)) : (match.botId || (isPlayer1 ? opponentOdaId : args.odaId)),
              winnerType: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? "user" : "bot",
              player1Attempts: isPlayer1 ? newGuesses.length : (opponentState?.guesses.length || 0),
              player2Attempts: isPlayer1 ? (opponentState?.guesses.length || 0) : newGuesses.length,
              player1TrophyChange: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? 30 : -15,
              player2TrophyChange: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? -15 : 30,
              word: targetWord,
              gameType: "wordle",
            });

            // Kupaları güncelle
            if (match.player1EncoreId) {
              await ctx.scheduler.runAfter(0, internal.encoreApi.applyUserMatchResult, {
                userId: match.player1EncoreId,
                result: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? "win" : "lose",
                trophyChange: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? 30 : -15,
              });
            }

            if (match.botId) {
              await ctx.scheduler.runAfter(0, internal.encoreApi.applyBotMatchResult, {
                botId: match.botId,
                result: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? "lose" : "win",
                trophyChange: matchWinnerId === (isPlayer1 ? args.odaId : opponentOdaId) ? -15 : 30,
              });
            }
          }
        } else {
          // Bir sonraki round'a geç - wordleState'leri sıfırla
          const nextWord = getRandomWord();
          
          // Son round sonuçlarını kaydet
          const player1State = args.odaId === match.odaId1 ? playerState : opponentState;
          const player2State = args.odaId === match.odaId1 ? opponentState : playerState;

          await ctx.db.patch(args.matchId, {
            score1: newScore1,
            score2: newScore2,
            targetWord: nextWord,
            lastRoundResults: {
              winnerId: roundWinner ?? undefined,
              word: targetWord,
              guesses1: player1State?.guesses || [],
              guesses2: player2State?.guesses || [],
            }
          });

          // Oyuncuların state'lerini sıfırla
          if (player1State) {
            await ctx.db.patch(player1State._id, {
              guesses: [],
              currentGuess: "",
              gameState: "playing",
              finishedAt: undefined,
            });
          }
          if (player2State) {
            await ctx.db.patch(player2State._id, {
              guesses: [],
              currentGuess: "",
              gameState: "playing",
              finishedAt: undefined,
            });
          }

          // Bot maçı ise botu yeni round için tetikle
          if (match.isBotMatch && match.botDifficulty) {
            const botOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
            const roundDelay = 10000 + Math.random() * 2000; // 10 saniye bekle (transition ekranı için)
            await ctx.scheduler.runAfter(roundDelay, internal.bot.botMakeMove, {
              matchId: args.matchId,
              botOdaId,
              targetWord: nextWord,
              difficulty: match.botDifficulty as "easy" | "medium" | "hard",
            });
          }
        }
      }
    }
    
    return { 
      success: true, 
      evaluated,
      gameState: isWon ? "won" : isLost ? "lost" : "playing",
    };
  },
});

// Current guess güncelle (gerçek zamanlı)
export const updateCurrentGuess = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
    currentGuess: v.string(),
  },
  handler: async (ctx, args) => {
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (playerState && playerState.gameState === "playing") {
      await ctx.db.patch(playerState._id, {
        currentGuess: args.currentGuess,
      });
    }
  },
});

// Maç sonucunu getir
export const getMatchResult = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    
    const playerStates = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    return {
      match,
      playerStates,
    };
  },
});

// Oyundan ayrıl - oyuncu sekmeyi kapatırsa, geri giderse veya çıkarsa
export const leaveMatch = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, error: "Maç aktif değil" };
    }
    
    // Oyuncunun durumunu güncelle
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (playerState) {
      await ctx.db.patch(playerState._id, {
        gameState: "disconnected",
        finishedAt: Date.now(),
      });
    }
    
    // Rakibin oda ID'sini bul
    const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
    
    // Maçı abandoned olarak işaretle ve rakibi kazanan yap
    await ctx.db.patch(args.matchId, {
      status: "abandoned",
      abandonedBy: args.odaId,
      winnerId: opponentOdaId,
      finishedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Sallantı jokeri gönder - 30 saniyede bir kullanılabilir
export const sendShake = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "playing") {
      return { success: false, error: "Maç aktif değil" };
    }
    
    // Kendi state'imizi al
    const myState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (!myState || myState.gameState !== "playing") {
      return { success: false, error: "Oyun durumu geçersiz" };
    }
    
    // 30 saniye bekleme kontrolü
    const now = Date.now();
    const cooldown = 30000; // 30 saniye
    if (myState.lastShakeSentAt && now - myState.lastShakeSentAt < cooldown) {
      const remaining = Math.ceil((cooldown - (now - myState.lastShakeSentAt)) / 1000);
      return { success: false, error: `${remaining} saniye bekle`, cooldownRemaining: remaining };
    }
    
    // Rakibin state'ini al
    const opponentOdaId = match.odaId1 === args.odaId ? match.odaId2 : match.odaId1;
    const opponentState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", opponentOdaId)
      )
      .first();
    
    if (!opponentState) {
      return { success: false, error: "Rakip bulunamadı" };
    }
    
    // Kendi son gönderme zamanını güncelle
    await ctx.db.patch(myState._id, {
      lastShakeSentAt: now,
    });
    
    // Rakibe sallantı gönder
    await ctx.db.patch(opponentState._id, {
      receivedShakeAt: now,
    });
    
    return { success: true };
  },
});

// Sallantıyı temizle (3 saniye sonra client tarafından çağrılır)
export const clearShake = mutation({
  args: { 
    matchId: v.id("matches"), 
    odaId: v.string(),
  },
  handler: async (ctx, args) => {
    const playerState = await ctx.db
      .query("playerStates")
      .withIndex("by_matchId_odaId", (q) => 
        q.eq("matchId", args.matchId).eq("odaId", args.odaId)
      )
      .first();
    
    if (playerState) {
      await ctx.db.patch(playerState._id, {
        receivedShakeAt: undefined,
      });
    }
  },
});
