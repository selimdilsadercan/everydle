"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Trophy, XCircle, Zap } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { applyMatchResult } from "@/app/challenge/actions";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/hooks/useProfileData";

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

const MatchWordle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const queryClient = useQueryClient();
  
  const matchIdStr = searchParams.get("matchId");
  const odaId = searchParams.get("odaId");
  
  const matchId = matchIdStr as Id<"matches"> | null;
  
  const [currentGuess, setCurrentGuess] = useState("");
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [allWords, setAllWords] = useState<string[]>([]);
  const [opponentShake, setOpponentShake] = useState(false);
  const prevOpponentCountRef = useRef<number>(0);
  
  // Joker states
  const [receivedShake, setReceivedShake] = useState(false);
  const [shakeCooldown, setShakeCooldown] = useState(0);
  const [showShakeToast, setShowShakeToast] = useState(false);
  
  // Trophy state - maç başına bir kez uygula
  const [trophyApplied, setTrophyApplied] = useState(false);
  
  // Convex queries
  const match = useQuery(
    api.game.getMatch,
    matchId ? { matchId } : "skip"
  );
  
  const playerState = useQuery(
    api.game.getPlayerState,
    matchId && odaId ? { matchId, odaId } : "skip"
  );
  
  const opponentState = useQuery(
    api.game.getOpponentState,
    matchId && odaId ? { matchId, odaId } : "skip"
  );
  
  // Convex mutations
  const submitGuess = useMutation(api.game.submitGuess);
  const leaveMatch = useMutation(api.game.leaveMatch);
  const updateCurrentGuess = useMutation(api.game.updateCurrentGuess);
  const sendShake = useMutation(api.game.sendShake);
  const clearShake = useMutation(api.game.clearShake);
  
  // Handle leaving the match (tab close, back button, navigation)
  useEffect(() => {
    if (!matchId || !odaId || !match || match.status !== "playing") return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation dialog
      e.preventDefault();
      e.returnValue = "Oyundan çıkmak istediğinize emin misiniz?";
      return e.returnValue;
    };
    
    const handlePopState = () => {
      // User pressed back button
      leaveMatch({ matchId, odaId });
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [matchId, odaId, match, leaveMatch]);
  
  // Handle leaving when clicking back button in app
  const handleLeaveGame = async () => {
    if (matchId && odaId && match?.status === "playing") {
      await leaveMatch({ matchId, odaId });
    }
    router.push("/challenge?refresh=true");
  };
  
  // Timer
  useEffect(() => {
    if (!match || match.status !== "playing") return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - match.startedAt) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [match]);
  
  // Opponent guess detection - shake screen when opponent makes a new guess
  useEffect(() => {
    if (opponentState && opponentState.guessCount > prevOpponentCountRef.current) {
      // Opponent made a new guess!
      setOpponentShake(true);
      setTimeout(() => setOpponentShake(false), 600);
    }
    if (opponentState) {
      prevOpponentCountRef.current = opponentState.guessCount;
    }
  }, [opponentState]);
  
  // Sallantı jokeri alındığında - 3 saniye boyunca salla
  useEffect(() => {
    if (playerState?.receivedShakeAt) {
      const now = Date.now();
      const shakeAge = now - playerState.receivedShakeAt;
      
      // Eğer sallantı 3 saniyeden yeni ise
      if (shakeAge < 3000) {
        setReceivedShake(true);
        const remainingTime = 3000 - shakeAge;
        
        const timeout = setTimeout(() => {
          setReceivedShake(false);
          // Sunucudan temizle
          if (matchId && odaId) {
            clearShake({ matchId, odaId });
          }
        }, remainingTime);
        
        return () => clearTimeout(timeout);
      }
    }
  }, [playerState?.receivedShakeAt, matchId, odaId, clearShake]);
  
  // Cooldown sayacı
  useEffect(() => {
    if (shakeCooldown <= 0) return;
    
    const interval = setInterval(() => {
      setShakeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [shakeCooldown]);
  
  // Sayfa yüklendiğinde mevcut cooldown'u hesapla
  useEffect(() => {
    if (playerState?.lastShakeSentAt) {
      const elapsed = Math.floor((Date.now() - playerState.lastShakeSentAt) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      if (remaining > 0) {
        setShakeCooldown(remaining);
      }
    }
  }, [playerState?.lastShakeSentAt]);
  
  // Maç bittiğinde kupa güncelle
  useEffect(() => {
    if (!match || !odaId || !backendUserId || trophyApplied) return;
    
    const isFinished = match.status === "finished" || match.status === "abandoned";
    if (!isFinished) return;
    
    const isWinner = match.winnerId === odaId;
    const isLoser = match.winnerId && match.winnerId !== odaId;
    const opponentAbandoned = match.status === "abandoned" && match.abandonedBy !== odaId;
    const iAbandoned = match.status === "abandoned" && match.abandonedBy === odaId;
    
    // Kupa değişimi uygula
    const applyTrophy = async () => {
      try {
        if (isWinner || opponentAbandoned) {
          // Kazanan +30 kupa
          await applyMatchResult(backendUserId, "win", 30);
          console.log("Trophy applied: +30 (win)");
        } else if (isLoser || iAbandoned) {
          // Kaybeden -15 kupa (negatif değer gönder)
          await applyMatchResult(backendUserId, "lose", -15);
          console.log("Trophy applied: -15 (lose)");
        }
        setTrophyApplied(true);
        
        // Cache'i güncelle - ana sayfaya dönünce güncel kupa görünsün
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trophies(backendUserId) });
      } catch (error) {
        console.error("Failed to apply trophy:", error);
      }
    };
    
    applyTrophy();
  }, [match, odaId, backendUserId, trophyApplied, queryClient]);
  
  // Load valid words
  useEffect(() => {
    const loadWords = async () => {
      try {
        const response = await fetch("/wordle/all_5letters.txt");
        const text = await response.text();
        const wordList = text
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setAllWords(wordList);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
      }
    };
    loadWords();
  }, []);
  
  const toTurkishUpperCase = (str: string): string => {
    return str
      .split("")
      .map((char) => {
        if (char === "i") return "İ";
        if (char === "ı") return "I";
        if (char === "ç") return "Ç";
        if (char === "ğ") return "Ğ";
        if (char === "ö") return "Ö";
        if (char === "ş") return "Ş";
        if (char === "ü") return "Ü";
        return char.toUpperCase();
      })
      .join("");
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const handleKeyPress = useCallback(
    async (key: string) => {
      if (!playerState || playerState.gameState !== "playing" || !matchId || !odaId) return;

      if (key === "Enter") {
        if (currentGuess.length === 5) {
          if (allWords.includes(currentGuess)) {
            const result = await submitGuess({
              matchId,
              odaId,
              guess: currentGuess,
            });
            
            if (result.success) {
              setCurrentGuess("");
            }
          } else {
            setShakeRow(true);
            setShowInvalidWordToast(true);
            setTimeout(() => setShakeRow(false), 600);
            setTimeout(() => setShowInvalidWordToast(false), 2000);
          }
        }
      } else if (key === "Backspace") {
        const newGuess = currentGuess.slice(0, -1);
        setCurrentGuess(newGuess);
        // Sunucuya anlık yazılanı gönder
        if (matchId && odaId) {
          updateCurrentGuess({ matchId, odaId, currentGuess: newGuess });
        }
      } else if (
        key.length === 1 &&
        /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key) &&
        currentGuess.length < 5
      ) {
        let upperKey = key;
        if (key === "i" || key === "İ") upperKey = "İ";
        else if (key === "ı" || key === "I") upperKey = "I";
        else if (key === "ç" || key === "Ç") upperKey = "Ç";
        else if (key === "ğ" || key === "Ğ") upperKey = "Ğ";
        else if (key === "ö" || key === "Ö") upperKey = "Ö";
        else if (key === "ş" || key === "Ş") upperKey = "Ş";
        else if (key === "ü" || key === "Ü") upperKey = "Ü";
        else upperKey = key.toUpperCase();

        const newGuess = currentGuess + upperKey;
        setCurrentGuess(newGuess);
        // Sunucuya anlık yazılanı gönder
        if (matchId && odaId) {
          updateCurrentGuess({ matchId, odaId, currentGuess: newGuess });
        }
      }
    },
    [currentGuess, playerState, matchId, odaId, allWords, submitGuess, updateCurrentGuess]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const getLetterColor = (state: LetterState) => {
    switch (state) {
      case "correct":
        return "bg-emerald-600";
      case "present":
        return "bg-yellow-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800 border-2 border-slate-600";
    }
  };

  const getKeyboardKeyColor = (key: string) => {
    if (!playerState) return "bg-slate-700 text-slate-200";
    
    let hasCorrect = false;
    let hasPresent = false;
    let hasAbsent = false;

    playerState.guesses.forEach((guess) => {
      guess.forEach((letter) => {
        if (letter.letter === key) {
          if (letter.state === "correct") hasCorrect = true;
          else if (letter.state === "present") hasPresent = true;
          else if (letter.state === "absent") hasAbsent = true;
        }
      });
    });

    if (hasCorrect) return "bg-emerald-600 text-white";
    if (hasPresent) return "bg-yellow-500 text-white";
    if (hasAbsent) return "bg-slate-800 text-slate-500";
    return "bg-slate-700 text-slate-200";
  };
  
  // Loading state
  if (!match || !playerState) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }
  
  // Game finished state
  if (match.status === "finished" || match.status === "abandoned" || playerState.gameState !== "playing") {
    const isWinner = match.winnerId === odaId;
    const isLoser = match.winnerId && match.winnerId !== odaId;
    const opponentAbandoned = match.status === "abandoned" && match.abandonedBy !== odaId;
    const iAbandoned = match.status === "abandoned" && match.abandonedBy === odaId;
    
    const myGuesses = playerState.guesses as Letter[][];
    const opponentGuesses = opponentState?.guesses as Letter[][] | undefined;
    const myUsername = match.odaId1 === odaId ? match.username1 : match.username2;
    const opponentUsername = match.odaId1 === odaId ? match.username2 : match.username1;
    
    // Mini grid için renk fonksiyonu
    const getGridCellColor = (state: LetterState) => {
      switch (state) {
        case "correct": return "bg-emerald-600";
        case "present": return "bg-yellow-500";
        case "absent": return "bg-slate-600";
        default: return "bg-slate-700";
      }
    };
    
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 overflow-auto">
        <div className="w-full max-w-lg">
          {/* Result Header */}
          <div className={`text-center p-6 rounded-2xl border-2 mb-6 ${
            isWinner || opponentAbandoned
              ? "bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 border-emerald-500" 
              : isLoser || iAbandoned
                ? "bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500"
                : "bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-500"
          }`}>
            {opponentAbandoned ? (
              <>
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-emerald-400 mb-1">Kazandın!</h1>
                <p className="text-slate-400 text-sm">Rakip oyundan ayrıldı</p>
                <p className="text-emerald-400 text-sm font-bold mt-2">+30 🏆</p>
              </>
            ) : iAbandoned ? (
              <>
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-red-400 mb-1">Oyundan Ayrıldın</h1>
                <p className="text-slate-400 text-sm">Maç iptal edildi</p>
                <p className="text-red-400 text-sm font-bold mt-2">-15 🏆</p>
              </>
            ) : isWinner ? (
              <>
                <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-emerald-400 mb-1">Kazandın!</h1>
                <p className="text-slate-400 text-sm">Kelimeyi ilk sen buldun</p>
                <p className="text-emerald-400 text-sm font-bold mt-2">+30 🏆</p>
              </>
            ) : isLoser ? (
              <>
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-red-400 mb-1">Kaybettin</h1>
                <p className="text-slate-400 text-sm">Rakibin daha hızlıydı</p>
                <p className="text-red-400 text-sm font-bold mt-2">-15 🏆</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">😔</div>
                <h1 className="text-2xl font-bold text-slate-300 mb-1">Oyun Bitti</h1>
                <p className="text-slate-400 text-sm">6 denemede bulamadın</p>
              </>
            )}
            
            {/* Kelime */}
            <div className="mt-4 py-3 px-6 bg-slate-800/70 rounded-xl inline-block">
              <p className="text-xs text-slate-400 mb-1">Kelime</p>
              <p className="text-xl font-bold text-white tracking-[0.3em]">{match.targetWord}</p>
            </div>
          </div>
          
          {/* İki oyuncunun grid'leri */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Ben */}
            <div className={`p-3 rounded-xl border-2 ${isWinner ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-600 bg-slate-800/50'}`}>
              <div className="flex items-center justify-center gap-2 mb-3">
                {isWinner && <Trophy className="w-4 h-4 text-yellow-400" />}
                <p className="text-sm font-bold text-center truncate">{myUsername}</p>
              </div>
              <div className="space-y-1">
                {[...Array(6)].map((_, rowIdx) => {
                  const guess = myGuesses[rowIdx];
                  return (
                    <div key={rowIdx} className="flex gap-1 justify-center">
                      {[...Array(5)].map((_, colIdx) => {
                        const cell = guess?.[colIdx];
                        return (
                          <div
                            key={colIdx}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs sm:text-sm font-bold text-white ${
                              cell ? getGridCellColor(cell.state) : 'bg-slate-700'
                            }`}
                          >
                            {cell?.letter || ''}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">{myGuesses.length}/6 tahmin</p>
            </div>
            
            {/* Rakip */}
            <div className={`p-3 rounded-xl border-2 ${isLoser ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-600 bg-slate-800/50'}`}>
              <div className="flex items-center justify-center gap-2 mb-3">
                {isLoser && <Trophy className="w-4 h-4 text-yellow-400" />}
                <p className="text-sm font-bold text-center truncate">{opponentUsername || 'Rakip'}</p>
              </div>
              <div className="space-y-1">
                {[...Array(6)].map((_, rowIdx) => {
                  const guess = opponentGuesses?.[rowIdx];
                  return (
                    <div key={rowIdx} className="flex gap-1 justify-center">
                      {[...Array(5)].map((_, colIdx) => {
                        const cell = guess?.[colIdx];
                        return (
                          <div
                            key={colIdx}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs sm:text-sm font-bold text-white ${
                              cell ? getGridCellColor(cell.state) : 'bg-slate-700'
                            }`}
                          >
                            {cell?.letter || ''}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">{opponentGuesses?.length || 0}/6 tahmin</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 bg-slate-800/50 rounded-xl text-center">
              <p className="text-xs text-slate-400">Süre</p>
              <p className="text-lg font-bold text-white">{formatTime(elapsedTime)}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-xl text-center">
              <p className="text-xs text-slate-400">Tahminlerim</p>
              <p className="text-lg font-bold text-white">{myGuesses.length}/6</p>
            </div>
          </div>
          
          {/* Tekrar Oyna */}
          <button
            onClick={() => router.push("/challenge?refresh=true")}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Tekrar Oyna
          </button>
        </div>
      </main>
    );
  }

  const guesses = playerState.guesses as Letter[][];

  // Helper to get mini grid color
  const getMiniGridColor = (state: LetterState) => {
    switch (state) {
      case "correct": return "bg-emerald-500";
      case "present": return "bg-yellow-500";
      case "absent": return "bg-slate-500";
      default: return "bg-slate-700";
    }
  };

  return (
    <main className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4 pb-20 ${opponentShake ? 'animate-shake' : ''} ${receivedShake ? 'animate-shake-strong' : ''}`}>
      <div className="w-full max-w-md">
        {/* Header */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleLeaveGame}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-xl font-bold">Online Wordle</h1>

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="font-mono font-bold text-orange-400">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          
          {/* Players Status with Mini Grids */}
          <div className="grid grid-cols-2 gap-3">
            {/* My Mini Grid */}
            <div className="p-2 bg-emerald-900/30 rounded-lg border border-emerald-600/30">
              <p className="text-xs text-emerald-400 text-center mb-1.5">Sen ({guesses.length}/6)</p>
              <div className="space-y-0.5">
                {[...Array(6)].map((_, row) => (
                  <div key={row} className="flex gap-0.5 justify-center">
                    {[...Array(5)].map((_, col) => {
                      const guess = guesses[row];
                      const state = guess?.[col]?.state || "empty";
                      return (
                        <div
                          key={col}
                          className={`w-3 h-3 rounded-sm ${getMiniGridColor(state)}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Opponent Mini Grid */}
            <div className={`p-2 bg-red-900/30 rounded-lg border border-red-600/30 transition-all ${opponentShake ? 'ring-2 ring-red-500' : ''}`}>
              <p className="text-xs text-red-400 text-center mb-1.5 truncate">
                {(match?.odaId1 === odaId ? match?.username2 : match?.username1) || 'Rakip'} ({opponentState?.guessCount ?? 0}/6)
              </p>
              <div className="space-y-0.5">
                {[...Array(6)].map((_, row) => {
                  const isCurrentRow = row === (opponentState?.guessCount ?? 0);
                  return (
                    <div key={row} className="flex gap-0.5 justify-center">
                      {[...Array(5)].map((_, col) => {
                        const state = opponentState?.colorGrid?.[row]?.[col] || "empty";
                        // Rakibin o an yazdığı satırda, yazdığı kadar kutuyu beyaz göster
                        const isTyping = isCurrentRow && col < (opponentState?.currentGuessLength ?? 0);
                        return (
                          <div
                            key={col}
                            className={`w-3 h-3 rounded-sm transition-all duration-100 ${
                            isTyping 
                                ? 'bg-[#62748E] scale-110' 
                                : getMiniGridColor(state as LetterState)
                            }`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Invalid Word Toast */}
        {showInvalidWordToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-lg px-6 py-3 shadow-xl animate-fade-in">
            <p className="text-sm font-semibold text-slate-200 whitespace-nowrap">Kelime listesinde yok</p>
          </div>
        )}

        {/* Game Grid */}
        <div className="space-y-1.5 mb-6 mx-5 mt-4">
          {[...Array(6)].map((_, row) => {
            const guess = guesses[row] || [];
            const isCurrentRow = row === guesses.length;

            return (
              <div 
                key={row} 
                className={`flex gap-1.5 ${isCurrentRow && shakeRow ? 'animate-shake' : ''}`}
              >
                {[...Array(5)].map((_, col) => {
                  if (isCurrentRow) {
                    const letter = currentGuess[col] || "";
                    return (
                      <div
                        key={col}
                        className={`flex-1 aspect-square bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-white text-2xl font-bold ${
                          letter ? "animate-letter-pop" : ""
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  } else {
                    const letterData = guess[col] || { letter: "", state: "empty" as LetterState };
                    return (
                      <div
                        key={col}
                        className={`flex-1 aspect-square ${getLetterColor(letterData.state)} rounded flex items-center justify-center text-white text-2xl font-bold`}
                      >
                        {letterData.letter}
                      </div>
                    );
                  }
                })}
              </div>
            );
          })}
        </div>

        {/* Virtual Keyboard */}
        <div className="space-y-1.5 w-full px-1">
          {/* İlk satır: E R T Y U I O P Ğ Ü */}
          <div className="flex gap-[3px] justify-center">
            {["E", "R", "T", "Y", "U", "I", "O", "P", "Ğ", "Ü"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`keyboard-key flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* İkinci satır: A S D F G H J K L Ş İ */}
          <div className="flex gap-[3px] justify-center px-3">
            {["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ş", "İ"].map((key) => (
              <button
                key={key} 
                onClick={() => handleKeyPress(key)}
                className={`keyboard-key flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[32px] ${getKeyboardKeyColor(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* Üçüncü satır: ENTER Z C V B N M Ö Ç BACKSPACE */}
          <div className="flex gap-[3px] justify-center">
            <button
              onClick={() => handleKeyPress("Enter")}
              className="keyboard-key flex-[1.5] py-3 bg-gray-600 text-white rounded hover:bg-slate-400 transition-colors font-bold text-[10px] sm:text-xs max-w-[54px]"
            >
              ENTER
            </button>
            {["Z", "C", "V", "B", "N", "M", "Ö", "Ç"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`keyboard-key flex-1 py-3 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(key)}`}
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress("Backspace")}
              className="keyboard-key flex-[1.5] py-3 bg-gray-600 text-white rounded hover:bg-slate-500 transition-colors font-bold text-sm max-w-[54px]"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Joker Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 p-3 safe-area-inset-bottom">
          <div className="max-w-md mx-auto flex items-center justify-center gap-4">
            {/* Sallantı Jokeri */}
            <button
              onClick={async () => {
                if (!matchId || !odaId || shakeCooldown > 0) return;
                const result = await sendShake({ matchId, odaId });
                if (result.success) {
                  setShakeCooldown(30);
                  setShowShakeToast(true);
                  setTimeout(() => setShowShakeToast(false), 2000);
                }
              }}
              disabled={shakeCooldown > 0 || playerState?.gameState !== "playing"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
                shakeCooldown > 0 || playerState?.gameState !== "playing"
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30'
              }`}
            >
              <Zap className="w-5 h-5" />
              <span>{shakeCooldown > 0 ? `${shakeCooldown}s` : 'Salla!'}</span>
            </button>
          </div>
        </div>

        {/* Shake Toast */}
        {showShakeToast && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl px-8 py-4 shadow-2xl animate-bounce">
            <p className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-6 h-6" />
              Sallantı Yolladın!
            </p>
          </div>
        )}

        {/* Received Shake Overlay */}
        {receivedShake && (
          <div className="fixed inset-0 bg-red-500/20 pointer-events-none z-40 animate-pulse" />
        )}
      </div>
    </main>
  );
};

export default function MatchWordlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <MatchWordle />
    </Suspense>
  );
}
