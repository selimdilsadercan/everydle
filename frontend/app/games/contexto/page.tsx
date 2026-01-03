"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  HelpCircle,
  CalendarDays,
  RotateCcw,
  Map as MapIcon,
  Diamond,
  ArrowBigRight,
  Bug,
} from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { completeLevel as completeLevelLocal } from "@/lib/levelProgress";
import { unmarkGameCompleted, formatDate } from "@/lib/dailyCompletion";
import { getUserStars } from "@/lib/userStars";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted, saveGameState, getGameState as getEncoreGameState } from "@/app/games/actions";
import ClosestWordsModal from "./ClosestWordsModal";
import HowToPlayModal from "./HowToPlayModal";
import ConfirmModal from "./ConfirmModal";
import PreviousGamesModal, { AVAILABLE_GAMES } from "./PreviousGamesModal";
import { triggerDataRefresh } from "@/components/Header";
import { useUserStats } from "@/hooks/useProfileData";
import { useHint, useGiveup } from "@/app/store/actions";
import ConfirmJokerModal from "@/components/ConfirmJokerModal";

type WordEntry = {
  rank: number;
  word: string;
  similarity: number;
};

type Guess = {
  word: string;
  rank: number | null;
  similarity: number | null;
  status: "hit" | "inList" | "notFound";
};

// Sabitler
const FIRST_GAME_DATE = new Date(2025, 10, 23); // 23.11.2025 (#1)
const FIRST_GAME_NUMBER = 1;

// Oyun numarasından tarihi hesapla (DD.MM.YYYY formatında)
function getDateFromGameNumber(gameNumber: number): string {
  const daysDiff = gameNumber - FIRST_GAME_NUMBER;
  const date = new Date(FIRST_GAME_DATE);
  date.setDate(date.getDate() + daysDiff);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

// Oyun numarasından güzel tarih formatı (23 Kasım)
function getFormattedDateFromGameNumber(gameNumber: number): string {
  const game = AVAILABLE_GAMES.find((g) => g.gameNumber === gameNumber);
  return game?.displayDate || "";
}

// Bugünkü oyun numarasını hesapla
function getTodaysGameNumber(): number {
  // AVAILABLE_GAMES listesindeki son oyun numarasını döndür
  return AVAILABLE_GAMES[AVAILABLE_GAMES.length - 1].gameNumber;
}

// En son oynanan oyun numarasını bul
function getLastPlayedGameNumber(): number | null {
  if (typeof window === "undefined") return null;

  let lastPlayedGame: number | null = null;
  const todayGameNumber = getTodaysGameNumber();

  // Bugünden geriye doğru kontrol et
  for (let i = 0; i <= 365; i++) {
    const gameNum = todayGameNumber - i;
    if (gameNum < FIRST_GAME_NUMBER) break;

    const saved = localStorage.getItem(`contexto-game-${gameNum}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Eğer tahmin yapılmışsa veya oyun bitmişse
        if (
          (parsed.guesses && parsed.guesses.length > 0) ||
          parsed.gameWon ||
          parsed.gaveUp
        ) {
          lastPlayedGame = gameNum;
          break;
        }
      } catch (e) {
        // Hata durumunda devam et
      }
    }
  }

  return lastPlayedGame;
}

// Levels modunda tamamlanmamış en iyi oyunu bul
function getNextUncompletedGame(): number {
  const todaysGame = getTodaysGameNumber();
  for (const game of AVAILABLE_GAMES) {
    if (game.gameNumber > todaysGame) continue;
    
    const saved = localStorage.getItem(`contexto-game-${game.gameNumber}`);
    if (!saved) return game.gameNumber;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.gameWon && !parsed.gaveUp) return game.gameNumber;
    } catch (e) {
      return game.gameNumber;
    }
  }
  return todaysGame;
}

const Contexto = () => {
  const [wordMap, setWordMap] = useState<Map<string, WordEntry> | null>(null);
  const [maxRank, setMaxRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);
  const [lastGuessedWord, setLastGuessedWord] = useState<string | null>(null);
  const { backendUserId } = useAuth();

  // Oyun numarası - başlangıçta en son oynanan oyun veya bugünkü oyun
  const [gameNumber, setGameNumber] = useState(() => {
    const lastPlayed = getLastPlayedGameNumber();
    return lastPlayed || getTodaysGameNumber();
  });
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showConfirmHint, setShowConfirmHint] = useState(false);
  const [showConfirmSkip, setShowConfirmSkip] = useState(false);
  
  // Joker state'leri - Backend hook ile
  const { hints: backendHints, giveups: backendSkips, stars: backendCoins, isLoading: isStatsLoading } = useUserStats(backendUserId || undefined);
  const [localHints, setLocalHints] = useState(0);
  const [localSkips, setLocalSkips] = useState(0);
  const [localCoins, setLocalCoins] = useState(0);
  
  // Use backend stats if logged in, otherwise local
  const hints = backendUserId ? backendHints : localHints;
  const skips = backendUserId ? backendSkips : localSkips;
  const coins = backendUserId ? backendCoins : localCoins;
  
  // Joker'leri localStorage'dan yükle (Local Storage fallback)
  useEffect(() => {
    if (backendUserId) return; // Logged in users use hook
    
    const savedHints = localStorage.getItem("everydle-hints");
    const savedSkips = localStorage.getItem("everydle-giveups");
    setLocalHints(savedHints ? parseInt(savedHints) : 0);
    setLocalSkips(savedSkips ? parseInt(savedSkips) : 0);
    setLocalCoins(getUserStars());
    
    const handleStorageChange = () => {
      const h = localStorage.getItem("everydle-hints");
      const s = localStorage.getItem("everydle-giveups");
      setLocalHints(h ? parseInt(h) : 0);
      setLocalSkips(s ? parseInt(s) : 0);
      setLocalCoins(getUserStars());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [backendUserId]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");
  const levelId = searchParams.get("levelId");
  const [levelCompleted, setLevelCompleted] = useState(false);

  // Oyun numarası - mod'a göre belirle
  useEffect(() => {
    if (mode === "levels") {
      const nextGame = getNextUncompletedGame();
      setGameNumber(nextGame);
    } else {
      // Practice modunda en son oynanan veya bugünkü
      const lastPlayed = getLastPlayedGameNumber();
      setGameNumber(lastPlayed || getTodaysGameNumber());
    }
  }, [mode]);

  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    if (gameWon && mode === "levels" && levelId && !levelCompleted) {
      const lid = parseInt(levelId);
      // Yerel tamamla
      completeLevelLocal(lid);
      
      // Backend tamamla
      if (backendUserId) {
        completeLevelBackend(backendUserId, lid);
      }
      
      setLevelCompleted(true);
    }
  }, [gameWon, mode, levelId, levelCompleted, backendUserId]);

  // İlk render'ı takip etmek için
  const isInitialMount = useRef(true);

  // LocalStorage'dan oyun durumunu yükle - oyun numarası değiştiğinde
  useEffect(() => {
    // İlk render'da kaydetmeyi engelle
    isInitialMount.current = true;

    // State'leri sıfırla
    setGuesses([]);
    setGameWon(false);
    setGaveUp(false);
    setHintsUsed(0);
    setLastGuessedWord(null);
    setInput("");
    setErrorMessage(null);

    const loadState = async () => {
      let stateToLoad = null;

      // 1. Try Encore first if logged in
      if (backendUserId) {
        const response = await getEncoreGameState(backendUserId, "contexto", gameNumber);
        if (response.data?.success && response.data.data) {
          stateToLoad = response.data.data.state as any;
        }
      }

      // 2. Try LocalStorage if Encore failed or not logged in
      if (!stateToLoad) {
        const savedGame = localStorage.getItem(`contexto-game-${gameNumber}`);
        if (savedGame) {
          try {
            stateToLoad = JSON.parse(savedGame);
          } catch (e) {
            console.error("Oyun verisi yüklenemedi:", e);
          }
        }
      }

      // 3. Apply state
      if (stateToLoad) {
        setGuesses(stateToLoad.guesses || []);
        setGameWon(stateToLoad.gameWon || false);
        setGaveUp(stateToLoad.gaveUp || false);
        setHintsUsed(stateToLoad.hintsUsed || 0);
        setLastGuessedWord(stateToLoad.lastGuessedWord || null);
      }

      // Yükleme bitince kaydetmeye izin ver
      setTimeout(() => {
        isInitialMount.current = false;
      }, 0);
    };

    loadState();
  }, [gameNumber, backendUserId]);

  // Oyun durumunu kaydet - sadece değişiklik yapıldığında
  useEffect(() => {
    // İlk render'da kaydetme
    if (isInitialMount.current) {
      return;
    }

    const isFinished = gameWon || gaveUp;

    const gameStateToSave = {
      gameNumber,
      guesses,
      gameWon,
      gaveUp,
      hintsUsed,
      lastGuessedWord,
    };

    // Always save to localStorage for ongoing games (as requested)
    // Always save to localStorage regardless of game state
    localStorage.setItem(`contexto-game-${gameNumber}`, JSON.stringify(gameStateToSave));

    // Save to Encore if logged in
    if (backendUserId) {
      saveGameState(
        backendUserId,
        "contexto",
        gameNumber,
        gameStateToSave as any,
        isFinished,
        gameWon
      );
    }
  }, [gameNumber, guesses, gameWon, gaveUp, hintsUsed, lastGuessedWord, backendUserId]);

  // JSON'u yükle - oyun numarası değiştiğinde
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setWordMap(null);
      setMaxRank(0);

      try {
        console.log(
          `📡 [Page] Fetching local contexto data for game #${gameNumber}...`
        );
        
        const gameInfo = AVAILABLE_GAMES.find((g) => g.gameNumber === gameNumber);
        if (!gameInfo) {
          throw new Error("Oyun bulunamadı.");
        }

        const response = await fetch(`/contexto/${gameInfo.dateString}.json`);
        if (!response.ok) {
          throw new Error(`Veri yüklenemedi: ${response.statusText}`);
        }

        const data: WordEntry[] = await response.json();

        const map = new Map<string, WordEntry>();
        let maxR = 0;
        for (const item of data) {
          const key = item.word.toLowerCase();
          map.set(key, item);
          if (item.rank > maxR) maxR = item.rank;
        }
        setWordMap(map);
        setMaxRank(maxR);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gameNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordMap) return;

    const raw = input.trim().toLowerCase();
    if (!raw) return;

    setInput("");
    setErrorMessage(null);

    // Tek kelime kontrolü
    if (raw.includes(" ")) {
      setErrorMessage("SPACE");
      return;
    }

    // Aynı kelimeyi iki kere yazmasın
    if (guesses.some((g) => g.word === raw)) {
      setErrorMessage(raw);
      setLastGuessedWord(raw);
      return;
    }

    const entry = wordMap.get(raw);
    if (!entry) {
      // Kelime veritabanında yoksa uyarı göster
      setErrorMessage(`UNKNOWN:${raw}`);
      return;
    }

    const status: Guess["status"] = entry.rank === 1 ? "hit" : "inList";

    const newGuess: Guess = {
      word: entry.word,
      rank: entry.rank,
      similarity: entry.similarity,
      status,
    };

    setLastGuessedWord(entry.word);

    setGuesses((prev) => {
      const merged = [...prev, newGuess];
      // rank'ı olanları artan rank'a göre sırala, olmayanlar en alta
      return merged.sort((a, b) => {
        if (a.rank == null && b.rank == null) return 0;
        if (a.rank == null) return 1;
        if (b.rank == null) return -1;
        return a.rank - b.rank;
      });
    });

    // Game won if rank is 1
    if (entry.rank === 1) {
      setGameWon(true);
      // Günlük tamamlamayı veritabanına kaydet
      if (backendUserId) {
        const completionDate = formatDate(new Date());
        markDailyGameCompleted(backendUserId, "contexto", gameNumber, completionDate);
      }
    }
  };

  // İpucu kullanma fonksiyonu
  const handleUseHint = async () => {
    if (!wordMap || gameWon || gaveUp || hints <= 0) return;

    let targetRank: number;

    // Eğer tahmin yoksa 300. kelimeyi göster
    if (guesses.length === 0) {
      targetRank = 300;
    } else {
      // En iyi tahmini bul (en düşük rank)
      const validGuesses = guesses.filter((g) => g.rank !== null);
      if (validGuesses.length === 0) {
        targetRank = 300;
      } else {
        const bestRank = Math.min(...validGuesses.map((g) => g.rank!));

        // Özel durum: Eğer 2. kelime açılmışsa, açılmamış ilk kelimeyi ver
        if (bestRank === 2) {
          const openedRanks = new Set(
            guesses.filter((g) => g.rank !== null).map((g) => g.rank!)
          );

          // 3'ten başlayarak açılmamış ilk kelimeyi bul
          targetRank = 3;
          while (openedRanks.has(targetRank) && targetRank < maxRank) {
            targetRank++;
          }
        } else {
          // Normal durum: En iyi tahmin ile 1 arasındaki ortayı bul
          targetRank = Math.floor((1 + bestRank) / 2);
        }
      }
    }

    // wordMap'ten targetRank'e sahip kelimeyi bul
    const hintEntry = Array.from(wordMap.values()).find(
      (entry) => entry.rank === targetRank
    );

    if (hintEntry) {
      // Backend call for hints if logged in
      if (backendUserId) {
        const result = await useHint(backendUserId);
        if (!result.data?.success) {
          setErrorMessage("Hint kullanılamadı!");
          return;
        }
        triggerDataRefresh();
      } else {
        // Local storage update
        const newHintCount = localHints - 1;
        localStorage.setItem("everydle-hints", newHintCount.toString());
        setLocalHints(newHintCount);
        triggerDataRefresh();
      }
      
      // Kelime zaten tahmin edilmemişse ekle
      if (!guesses.some((g) => g.word === hintEntry.word)) {
        const newGuess: Guess = {
          word: hintEntry.word,
          rank: hintEntry.rank,
          similarity: hintEntry.similarity,
          status: hintEntry.rank === 1 ? "hit" : "inList",
        };

        setGuesses((prev) => {
          const merged = [...prev, newGuess];
          return merged.sort((a, b) => {
            if (a.rank == null && b.rank == null) return 0;
            if (a.rank == null) return 1;
            if (b.rank == null) return -1;
            return a.rank - b.rank;
          });
        });

        setLastGuessedWord(hintEntry.word);
      }
    }

    setHintsUsed((prev) => prev + 1);
  };

  // Pes Et (Atla) fonksiyonu
  const handleGiveUp = async () => {
    if (!wordMap || gameWon || gaveUp || skips <= 0) return;

    // Gizli kelimeyi (rank 1) bul
    const secretWord = Array.from(wordMap.values()).find(
      (entry) => entry.rank === 1
    );

    if (secretWord) {
      // Backend call for giveups if logged in
      if (backendUserId) {
        const result = await useGiveup(backendUserId);
        if (!result.data?.success) {
          setErrorMessage("Atla kullanılamadı!");
          return;
        }
        triggerDataRefresh();
      } else {
        // Local storage update
        const newSkipCount = localSkips - 1;
        localStorage.setItem("everydle-giveups", newSkipCount.toString());
        setLocalSkips(newSkipCount);
        triggerDataRefresh();
      }
      
      // Gizli kelimeyi tahminlere ekle
      const newGuess: Guess = {
        word: secretWord.word,
        rank: secretWord.rank,
        similarity: secretWord.similarity,
        status: "hit",
      };

      setGuesses((prev) => {
        const merged = [...prev, newGuess];
        return merged.sort((a, b) => {
          if (a.rank == null && b.rank == null) return 0;
          if (a.rank == null) return 1;
          if (b.rank == null) return -1;
          return a.rank - b.rank;
        });
      });

      setLastGuessedWord(secretWord.word);
      setGaveUp(true);
    }
  };

  const getBarColor = (rank: number | null, status: Guess["status"]) => {
    if (status === "notFound") return "bg-gray-600";
    if (status === "hit") return "bg-emerald-600";
    if (rank == null) return "bg-gray-600";

    if (rank <= 300) return "bg-emerald-600"; // yeşil
    if (rank <= 1500) return "bg-orange-500"; // turuncu
    return "bg-pink-500"; // pembe
  };

  const getBarWidth = (rank: number | null) => {
    if (rank == null || maxRank === 0) return "5%";

    const max = maxRank; // örn: 15000
    const threshold = 1000; // kırılma noktası
    const firstSegment = 10; // ilk %10
    const secondSegment = 90; // kalan %90

    // Güvenlik: maxRank 1000'den küçükse tamamen linear
    if (max <= threshold) {
      const t = (max - rank + 1) / max; // 0..1
      const width = firstSegment + secondSegment * t;
      return `${width.toFixed(0)}%`;
    }

    if (rank >= threshold) {
      // 15000 .. 1000  →  2 .. 10
      const t = (rank - threshold) / (max - threshold); // 0 (1000) .. 1 (max)
      const width = firstSegment * (1 - t); // 10 .. 0

      // 10000'den büyükse minimum %2
      if (rank > 10000) {
        return "2%";
      }

      return `${Math.max(width, 5).toFixed(0)}%`;
    } else {
      // 1000 .. 1  →  10 .. 100
      const t = (threshold - rank) / (threshold - 1); // 0 (1000) .. 1 (1)
      const width = firstSegment + secondSegment * t; // 10 .. 100
      return `${width.toFixed(0)}%`;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  if (!wordMap) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Veri yüklenemedi.</p>
      </main>
    );
  }

  // Get first 500 words sorted by rank for the "closest words" view
  const top500Words = wordMap
    ? Array.from(wordMap.values())
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 500)
    : [];

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        {/* Debug Modal */}
        {showDebugModal && wordMap && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowDebugModal(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 text-slate-300">
                <Bug className="w-5 h-5" />
                <h3 className="text-lg font-bold">Debug Mode</h3>
              </div>
              
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Hedef Kelime:</p>
                <p className="text-3xl font-bold text-emerald-400 tracking-widest">
                  {Array.from(wordMap.values()).find(w => w.rank === 1)?.word.toUpperCase()}
                </p>
              </div>
              
              <button
                onClick={() => setShowDebugModal(false)}
                className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Kapat
              </button>
            </div>
          </>
        )}

        <header className="mb-6">
          {/* Top row: Back button | Title | Menu */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(mode === "levels" ? "/levels" : searchParams.get("date") ? `/games?date=${searchParams.get("date")}` : "/games")}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-2xl font-bold">CONTEXTO</h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowHowToPlay(true);
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowPreviousGames(true);
                          setShowMenu(false);
                        }}
                      >
                        <CalendarDays className="w-5 h-5" />
                        <span>Önceki Oyunlar</span>
                      </button>
                      {/* Sadece development'ta göster */}
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          localStorage.removeItem(
                            `contexto-game-${gameNumber}`
                          );
                          setGuesses([]);
                          setGameWon(false);
                          setGaveUp(false);
                          setHintsUsed(0);
                          setLastGuessedWord(null);
                          unmarkGameCompleted("contexto");
                          setShowMenu(false);
                        }}
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>Sıfırla</span>
                      </button>
                      {process.env.NODE_ENV === "development" && (
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                          onClick={() => {
                            setShowDebugModal(true);
                            setShowMenu(false);
                          }}
                        >
                          <Bug className="w-5 h-5" />
                          <span>Kelimeyi Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Game info - gizle oyun bitince */}
          {!gameWon && !gaveUp && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Oyun: <span className="text-emerald-400">#{gameNumber}</span>
                {gameNumber !== getTodaysGameNumber() && (
                  <span className="text-slate-500 ml-1">
                    ({getFormattedDateFromGameNumber(gameNumber)})
                  </span>
                )}
              </span>
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>
          )}
        </header>

        {/* Success State */}
        {(gameWon || gaveUp) &&
          (() => {
            // Calculate guess counts by color category
            const greenCount = guesses.filter(
              (g) => g.rank !== null && g.rank <= 300
            ).length;
            const orangeCount = guesses.filter(
              (g) => g.rank !== null && g.rank > 300 && g.rank <= 1500
            ).length;
            const pinkCount = guesses.filter(
              (g) => g.rank !== null && g.rank > 1500
            ).length;

            return (
              <div
                className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
                  gaveUp ? "border-slate-500" : "border-emerald-600"
                }`}
              >
                <h2
                  className={`text-2xl font-bold mb-3 ${
                    gaveUp ? "text-slate-300" : "text-emerald-500"
                  }`}
                >
                  {gaveUp ? "Bir dahaki sefere artık..." : "Tebrikler!"}
                </h2>

                {/* Oyun Bilgileri */}
                <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
                  <span className="text-slate-500">
                    Oyun:{" "}
                    <span className="text-emerald-400">#{gameNumber}</span>
                    {gameNumber !== getTodaysGameNumber() && (
                      <span className="text-slate-600 ml-1">
                        ({getFormattedDateFromGameNumber(gameNumber)})
                      </span>
                    )}
                  </span>
                  <span className="text-slate-500">
                    Tahmin:{" "}
                    <span className="text-slate-400">{guesses.length}</span>
                  </span>
                  <span className="text-slate-500">
                    İpucu: <span className="text-yellow-400">{hintsUsed}</span>
                  </span>
                </div>

                {/* Kelime */}
                <p className="text-lg mb-4">
                  {gaveUp ? "Kelime" : "Kelimeyi buldunuz"}:{" "}
                  <span
                    className={`font-bold ${
                      gaveUp ? "text-slate-300" : "text-emerald-500"
                    }`}
                  >
                    {guesses.find((g) => g.rank === 1)?.word.toUpperCase()}
                  </span>
                </p>

                {/* Guess Statistics - 15 guesses = 1 cube */}
                <div className="mb-4 space-y-2 max-w-md mx-auto flex flex-col items-center">
                  {/* Green */}
                  {greenCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({
                          length: Math.ceil(greenCount / 15),
                        }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-emerald-600"></div>
                        ))}
                      </div>
                      <span className="font-semibold text-sm min-w-[2rem] text-right">
                        {greenCount}
                      </span>
                    </div>
                  )}

                  {/* Orange */}
                  {orangeCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({
                          length: Math.ceil(orangeCount / 15),
                        }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-orange-500"></div>
                        ))}
                      </div>
                      <span className="font-semibold text-sm min-w-[2rem] text-right">
                        {orangeCount}
                      </span>
                    </div>
                  )}

                  {/* Pink */}
                  {pinkCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({
                          length: Math.ceil(pinkCount / 15),
                        }).map((_, i) => (
                          <div key={i} className="w-4 h-4 bg-pink-500"></div>
                        ))}
                      </div>
                      <span className="font-semibold text-sm min-w-[2rem] text-right">
                        {pinkCount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowAllWords(true)}
                    className="px-6 py-2 rounded-md bg-slate-700 text-sm font-semibold hover:bg-slate-600 transition-colors cursor-pointer"
                  >
                    En Yakın Kelimeleri Göster
                  </button>

                  <button
                    onClick={() => {
                      if (mode === "levels") {
                        router.back();
                      } else {
                        setShowPreviousGames(true);
                      }
                    }}
                    className={`px-6 py-2 rounded-md ${
                      mode === "levels" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-600"
                    } text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2`}
                  >
                    {mode === "levels" ? (
                      <>
                        <MapIcon className="w-4 h-4" />
                        Bölümlere Devam Et
                      </>
                    ) : (
                      "Önceki Günleri Oyna"
                    )}
                  </button>
                </div>
              </div>
            );
          })()}

        {/* Input Form - only show if game not won */}
        {!gameWon && !gaveUp && (
          <div className="mb-6">
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                className="w-full rounded-md bg-slate-800 border border-slate-700 px-4 py-4 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-500 transition-all"
                placeholder="Bir kelime yaz..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </form>
            {errorMessage && (
              <div className="mt-3 bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-center">
                <p className="text-sm text-slate-300">
                  {errorMessage === "SPACE" ? (
                    "Tahmin tek kelime olmalıdır."
                  ) : errorMessage.startsWith("UNKNOWN:") ? (
                    <>
                      <span className="font-bold text-white">
                        "{errorMessage.split(":")[1]}"
                      </span>{" "}
                      kelimesini bilmiyorum.
                    </>
                  ) : (
                    <>
                      Bu kelime{" "}
                      <span className="font-bold text-white">
                        "{errorMessage}"
                      </span>{" "}
                      daha önce denendi.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal for Closest Words */}
        <ClosestWordsModal
          isOpen={showAllWords}
          onClose={() => setShowAllWords(false)}
          words={top500Words}
          getBarColor={getBarColor}
          getBarWidth={getBarWidth}
        />

        {/* How to Play Modal */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        {/* Give Up Confirm Modal */}
        <ConfirmModal
          isOpen={showGiveUpConfirm}
          onClose={() => setShowGiveUpConfirm(false)}
          onConfirm={() => {
            if (!wordMap) return;

            // Gizli kelimeyi (rank 1) bul
            const secretWord = Array.from(wordMap.values()).find(
              (entry) => entry.rank === 1
            );

            if (secretWord) {
              // Gizli kelimeyi tahminlere ekle
              const newGuess: Guess = {
                word: secretWord.word,
                rank: secretWord.rank,
                similarity: secretWord.similarity,
                status: "hit",
              };

              setGuesses((prev) => {
                const merged = [...prev, newGuess];
                return merged.sort((a, b) => {
                  if (a.rank == null && b.rank == null) return 0;
                  if (a.rank == null) return 1;
                  if (b.rank == null) return -1;
                  return a.rank - b.rank;
                });
              });

              setLastGuessedWord(secretWord.word);
              setGaveUp(true);
            }
          }}
          title="Pes Et"
          message="Pes etmek istediğinize emin misiniz? Gizli kelime açılacak ve oyun sona erecek."
          confirmText="Pes Et"
          cancelText="İptal"
        />

        {/* Previous Games Modal */}
        <PreviousGamesModal
          isOpen={showPreviousGames}
          onClose={() => setShowPreviousGames(false)}
          onSelectGame={(selectedGameNumber) => {
            setGameNumber(selectedGameNumber);
          }}
        />

        {/* Guesses Section */}
        <section className="space-y-3">
          {guesses.length === 0 && !gameWon && !gaveUp && (
            <p className="text-sm text-slate-500">
              Tahmin yapmaya başla. En yakın kelimeler yukarıda listelenecek.
            </p>
          )}

          {guesses.map((g) => {
            const barColor = getBarColor(g.rank, g.status);
            const barWidth = getBarWidth(g.rank);
            const isLastGuess = g.word === lastGuessedWord;

            return (
              <div
                key={g.word}
                className={`bg-slate-800 rounded-md ${
                  isLastGuess ? "border-2 border-white" : ""
                }`}
              >
                <div className="relative h-10 flex items-center">
                  {/* Bar: sadece arka plan, width rank'e göre */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-md ${barColor}`}
                    style={{ width: barWidth, maxWidth: "100%" }}
                  />

                  {/* İçerik: kelime solda, rank sağda, TAMAMI barın üstünde */}
                  <div className="relative z-10 flex w-full items-center justify-between px-3 text-base font-semibold">
                    <span>{g.word}</span>
                    <span className="font-mono">
                      {g.rank != null ? g.rank : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
        
        {/* Bottom Spacer for Fixed Joker Bar */}
        {!gameWon && !gaveUp && <div className="h-20" />}
      </div>
      
      {/* Joker Buttons & Coins Section - Fixed Bottom */}
      {!gameWon && !gaveUp && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-3 safe-area-bottom">
          <div className="max-w-md mx-auto flex items-center justify-between">
            {/* Left: Coins */}
            <div className="flex items-center gap-1.5 text-orange-400">
              <Diamond className="w-5 h-5" fill="currentColor" />
              <span className="font-bold">{coins}</span>
            </div>
            
            {/* Right: Joker Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmHint(true)}
                disabled={hints <= 0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hints > 0
                    ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                <LightBulbIcon className="w-4 h-4" />
                <span>İpucu</span>
                <span className="ml-1 px-1.5 py-0.5 bg-slate-900/50 rounded text-xs">{hints}</span>
              </button>
              
              <button
                onClick={() => setShowConfirmSkip(true)}
                disabled={skips <= 0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  skips > 0
                    ? "bg-slate-800 text-pink-400 hover:bg-slate-700"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                <ArrowBigRight className="w-4 h-4" fill="currentColor" />
                <span>Atla</span>
                <span className="ml-1 px-1.5 py-0.5 bg-slate-900/50 rounded text-xs">{skips}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Joker Confirm Modals */}
      <ConfirmJokerModal
        isOpen={showConfirmHint}
        type="hint"
        remainingCount={hints}
        onConfirm={() => {
          setShowConfirmHint(false);
          handleUseHint();
        }}
        onCancel={() => setShowConfirmHint(false)}
      />

      <ConfirmJokerModal
        isOpen={showConfirmSkip}
        type="skip"
        remainingCount={skips}
        onConfirm={() => {
          setShowConfirmSkip(false);
          handleGiveUp();
        }}
        onCancel={() => setShowConfirmSkip(false)}
      />
    </main>
  );
};

// Suspense wrapper for useSearchParams
export default function GemiContextoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
          <p className="text-lg">Yükleniyor...</p>
        </main>
      }
    >
      <Contexto />
    </Suspense>
  );
}
