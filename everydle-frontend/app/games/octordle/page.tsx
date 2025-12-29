"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Bug, Calendar, X, Map as MapIcon, Check } from "lucide-react";
import { completeLevel as completeLevelLocal } from "@/lib/levelProgress";
import { unmarkGameCompleted, formatDate } from "@/lib/dailyCompletion";
import { triggerDataRefresh } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted, unmarkDailyGameCompleted as unmarkDailyGameCompletedBackend, getAllCompletedGames, getGameState, saveGameState, deleteGameState } from "@/app/games/actions";

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

interface WordleGame {
  targetWord: string;
  guesses: Letter[][];
  gameState: "playing" | "won" | "lost";
}

interface DailyEntry {
  date: string;
  words: string[];
}

// Sabitler - daily_octordle.json ile eşleşmeli
const FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025

// Bugünün tarihini DD.MM.YYYY formatında al
function getTodayFormatted(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
}

// Tarih string'inden Date objesi oluştur
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

const Octordle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi

  const [allWords, setAllWords] = useState<string[]>([]); // Tüm geçerli kelimeler (tahmin doğrulama)
  const [targetWords, setTargetWords] = useState<string[]>([]); // Hedef kelime havuzu
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]); // Günlük kelimeler
  const [games, setGames] = useState<WordleGame[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gameDay, setGameDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [letterAnimationKeys, setLetterAnimationKeys] = useState<number[]>([0, 0, 0, 0, 0]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [completedDates, setCompletedDates] = useState<string[]>([]);

  // dailyCompleted flag - localStorage'dan yüklendiğinde zaten tamamlanmış oyunlar için tekrar çağırma
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const dailyInitialMount = useRef(true);
  
  // Set dailyInitialMount to false after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      dailyInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    const allWon = games.length > 0 && games.every(game => game.gameState === "won");
    if (allWon && mode === "levels" && levelId && !levelCompleted) {
      const lid = parseInt(levelId);
      // Yerel tamamla
      completeLevelLocal(lid);
      
      // Backend tamamla
      if (backendUserId) {
        completeLevelBackend(backendUserId, lid);
      }
      
      setLevelCompleted(true);
    }
    // Günlük tamamlamayı veritabanına kaydet - sadece yeni kazanılan oyunlar için
    if (allWon && mode !== "levels" && backendUserId && gameDay && !dailyCompleted && !dailyInitialMount.current) {
      // Backend expects YYYY-MM-DD
      const dateToMark = selectedDate ? selectedDate.split('.').reverse().join('-') : formatDate(new Date());
      markDailyGameCompleted(backendUserId, "octordle", gameDay, dateToMark);
      setDailyCompleted(true);
      // Update local list
      if (!completedDates.includes(dateToMark)) {
        setCompletedDates(prev => [...prev, dateToMark]);
      }
    }
  }, [games, mode, levelId, levelCompleted, backendUserId, gameDay, dailyCompleted, completedDates]);

  const isInitialMount = useRef(true);

  // Reset completion state when date changes
  useEffect(() => {
    setDailyCompleted(false);
  }, [searchParams]);

  // Türkçe karakterleri koruyarak büyük harfe çevir
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

  // Tamamlanan günleri backend'den çek
  useEffect(() => {
    if (!backendUserId) return;
    
    const fetchCompletedGames = async () => {
      const result = await getAllCompletedGames(backendUserId, "octordle");
      if (result.data?.success && result.data.games) {
        const dates = result.data.games
          .map(g => g.completion_date)
          .filter((d): d is string => !!d);
        setCompletedDates(dates);
      }
    };
    
    fetchCompletedGames();
  }, [backendUserId]);

  // Kelimeleri yükle
  useEffect(() => {
    const loadWords = async () => {
      try {
        const dateParam = searchParams.get("date"); // YYYY-MM-DD
        let targetDateStr = getTodayFormatted();
        
        if (dateParam) {
          const [y, m, d] = dateParam.split("-");
          targetDateStr = `${d}.${m}.${y}`;
          setSelectedDate(targetDateStr);
        } else {
          setSelectedDate(targetDateStr);
        }

        // Tüm geçerli kelimeleri yükle (tahmin doğrulama için)
        const allResponse = await fetch("/wordle/all_5letters.txt");
        const allText = await allResponse.text();
        const allWordList = allText
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setAllWords(allWordList);

        // Günlük Octordle kelimeleri yükle
        const dailyResponse = await fetch("/wordle/daily_octordle.json");
        const dailyData = await dailyResponse.json();
        
        // Tüm günlük girişleri kaydet
        setDailyEntries(dailyData.daily_octordle);
        
        // Hedef kelimeleri bul
        const targetEntry = dailyData.daily_octordle.find(
          (entry: DailyEntry) => entry.date === targetDateStr
        );
        
        if (targetEntry && targetEntry.words.length === 8) {
          // Kelimeleri kullan
          const selectedWords = targetEntry.words.map((w: string) => toTurkishUpperCase(w));
          
          const newGames: WordleGame[] = selectedWords.map((word: string) => ({
            targetWord: word,
            guesses: [],
            gameState: "playing" as const,
          }));
          
          setGames(newGames);
          
          // Gün numarasını hesapla
          const dayIndex = dailyData.daily_octordle.findIndex(
            (entry: DailyEntry) => entry.date === targetDateStr
          );
          setGameDay(dayIndex + 1);
        } else {
          // Bugün için kelime yoksa rastgele seç
          const randomEntry = dailyData.daily_octordle[
            Math.floor(Math.random() * dailyData.daily_octordle.length)
          ];
          const selectedWords = randomEntry.words.map((w: string) => toTurkishUpperCase(w));
          
          const newGames: WordleGame[] = selectedWords.map((word: string) => ({
            targetWord: word,
            guesses: [],
            gameState: "playing" as const,
          }));
          
          setGames(newGames);
          setGameDay(null);
        }
        
        // Tüm kelimeleri target words olarak kaydet
        const allTargetWords: string[] = [];
        dailyData.daily_octordle.forEach((entry: DailyEntry) => {
          entry.words.forEach((word: string) => {
            allTargetWords.push(toTurkishUpperCase(word));
          });
        });
        setTargetWords(allTargetWords);

        // --- PROGRESS LOADING ---
        // Hesap dayIndex'i başlangıç için hesapla
        const dayIndex = dailyData.daily_octordle.findIndex(
          (e: DailyEntry) => e.date === targetDateStr
        );
        const currentGameNumber = dayIndex >= 0 ? dayIndex + 1 : null;
        
        // Set gameDay for reference
        if (currentGameNumber) {
          setGameDay(currentGameNumber);
        }
        
        setIsLoaded(true);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
        const fallback = ["KALEM", "KİTAP", "MASAJ", "KAPAK", "ELMAS", "BEBEK", "ÇİÇEK", "DOLAP"];
        setAllWords(fallback);
        setTargetWords(fallback);
        
        // Fallback oyunları oluştur
        const newGames: WordleGame[] = fallback.map((word) => ({
          targetWord: word,
          guesses: [],
          gameState: "playing" as const,
        }));
        setGames(newGames);
        setIsLoaded(true);
      }
    };
    loadWords();
  }, [searchParams]);

  // Backend'den veya localStorage'dan ilerleme yükle
  useEffect(() => {
    const loadProgress = async () => {
      if (!gameDay) return;
      
      // Giriş yapmış kullanıcılar için backend'den yükle
      if (backendUserId) {
        const stateResult = await getGameState(backendUserId, "octordle", gameDay);
        if (stateResult.data?.success && stateResult.data.data?.state) {
          const savedState = stateResult.data.data.state as { games?: WordleGame[]; currentGuess?: string };
          if (savedState.games && savedState.games.length === 8) {
            setGames(savedState.games);
            setCurrentGuess(savedState.currentGuess || "");
            return;
          }
        }
      }
      
      // Giriş yapmamış kullanıcılar için localStorage'dan yükle
      const dateStr = selectedDate || getTodayFormatted();
      const saved = localStorage.getItem(`octordle-game-${dateStr}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.games && parsed.games.length === 8) {
            setGames(parsed.games);
            setCurrentGuess(parsed.currentGuess || "");
          }
        } catch (e) {
          console.error("Oyun verisi yüklenemedi:", e);
        }
      }
    };
    
    if (isLoaded) {
      loadProgress();
    }
  }, [gameDay, backendUserId, isLoaded, selectedDate]);

  // Oyun durumunu kaydet - debounced
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!isLoaded || games.length === 0 || !gameDay) return;

    // Debounce save to prevent too many API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      const stateToSave = {
        games,
        currentGuess,
      };
      
      const allWon = games.every(g => g.gameState === "won");
      const allLost = games.every(g => g.gameState === "lost");
      
      // Giriş yapmış kullanıcılar için backend'e kaydet
      if (backendUserId) {
        await saveGameState(
          backendUserId,
          "octordle",
          gameDay,
          stateToSave,
          allWon || allLost,
          allWon
        );
      }
      
      // LocalStorage'a da kaydet (yedek)
      const dateStr = selectedDate || getTodayFormatted();
      localStorage.setItem(`octordle-game-${dateStr}`, JSON.stringify(stateToSave));
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [games, currentGuess, selectedDate, isLoaded, backendUserId, gameDay]);

  const evaluateGuess = (guess: string, targetWord: string): Letter[] => {
    const result: Letter[] = [];
    const targetArray = targetWord.split("");
    const guessArray = guess.split("");
    const used = new Array(5).fill(false);

    // First pass: mark correct positions
    for (let i = 0; i < 5; i++) {
      if (guessArray[i] === targetArray[i]) {
        result.push({ letter: guessArray[i], state: "correct" });
        used[i] = true;
      } else {
        result.push({ letter: "", state: "empty" });
      }
    }

    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
      if (result[i].state === "empty") {
        const letter = guessArray[i];
        const index = targetArray.findIndex(
          (char, idx) => char === letter && !used[idx]
        );
        if (index !== -1) {
          result[i] = { letter, state: "present" };
          used[index] = true;
        } else {
          result[i] = { letter, state: "absent" };
        }
      }
    }

    return result;
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      const allWon = games.every((g) => g.gameState === "won");
      const allLost = games.every((g) => g.gameState === "lost");
      if (allWon || allLost) return;

      if (key === "Enter") {
        if (currentGuess.length === 5) {
          if (allWords.includes(currentGuess)) {
            setGames((prevGames) => {
              const newGames = prevGames.map((game) => {
                if (game.gameState !== "playing") return game;

                const evaluated = evaluateGuess(currentGuess, game.targetWord);
                const newGuesses = [...game.guesses, evaluated];

                let newState: "playing" | "won" | "lost" = "playing";
                if (currentGuess === game.targetWord) {
                  newState = "won";
                } else if (newGuesses.length >= 13) {
                  newState = "lost";
                }

                return {
                  ...game,
                  guesses: newGuesses,
                  gameState: newState,
                };
              });

              return newGames;
            });

            setCurrentGuess("");
            setMessage("");
          } else {
            // Shake animasyonu ve toast göster
            setShakeRow(true);
            setShowInvalidWordToast(true);
            setTimeout(() => setShakeRow(false), 600);
            setTimeout(() => setShowInvalidWordToast(false), 2000);
          }
        }
      } else if (key === "Backspace") {
        if (currentGuess.length > 0) {
          const deleteIdx = currentGuess.length - 1;
          setDeletingIndex(deleteIdx);
          setTimeout(() => {
            setDeletingIndex(null);
            setCurrentGuess(prev => prev.slice(0, -1));
          }, 100);
        }
      } else if (
        key.length === 1 &&
        /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key) &&
        currentGuess.length < 5
      ) {
        // Türkçe karakterleri doğru şekilde büyük harfe çevir
        let upperKey = key;
        if (key === "i" || key === "İ") upperKey = "İ";
        else if (key === "ı" || key === "I") upperKey = "I";
        else if (key === "ç" || key === "Ç") upperKey = "Ç";
        else if (key === "ğ" || key === "Ğ") upperKey = "Ğ";
        else if (key === "ö" || key === "Ö") upperKey = "Ö";
        else if (key === "ş" || key === "Ş") upperKey = "Ş";
        else if (key === "ü" || key === "Ü") upperKey = "Ü";
        else upperKey = key.toUpperCase();

        // Pop animasyonu için harfin key'ini güncelle
        const newIndex = currentGuess.length;
        setLetterAnimationKeys(prev => {
          const newKeys = [...prev];
          newKeys[newIndex] = (prev[newIndex] || 0) + 1;
          return newKeys;
        });

        setCurrentGuess((prev) => (prev + upperKey).slice(0, 5));
      }
    },
    [currentGuess, games, allWords]
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
    let hasCorrect = false;
    let hasPresent = false;
    const absentInGames = new Set<number>(); // Hangi oyunlarda absent olduğunu takip et

    games.forEach((game, gameIndex) => {
      game.guesses.forEach((guess) => {
        guess.forEach((letter) => {
          // I ve İ'yi doğru şekilde karşılaştır (toUpperCase kullanmadan)
          if (letter.letter === key) {
            if (letter.state === "correct") {
              hasCorrect = true;
            } else if (letter.state === "present") {
              hasPresent = true;
            } else if (letter.state === "absent") {
              absentInGames.add(gameIndex);
            }
          }
        });
      });
    });

    // 8 oyunda da absent ise çok koyu renk
    if (absentInGames.size === 8) {
      return "bg-slate-800 text-slate-500";
    }

    if (hasCorrect) return "bg-emerald-600 text-white";
    if (hasPresent) return "bg-yellow-500 text-white";
    // Bazı oyunlarda absent ama hepsinde değil
    if (absentInGames.size > 0) return "bg-slate-700 text-slate-400";
    // Henüz denenmemiş - açık gri arka plan
    return "bg-slate-600 text-slate-200";
  };

  const resetGame = async () => {
    // Geçerli olan günün kelimelerini belirle
    const dateStr = selectedDate || getTodayFormatted();
    const entry = dailyEntries.find(e => e.date === dateStr);
    
    let selectedWords: string[] = [];
    if (entry && entry.words.length === 8) {
      selectedWords = entry.words.map(w => toTurkishUpperCase(w));
    } else {
      // Fallback
      if (targetWords.length === 0) return;
      const usedIndices = new Set<number>();
      while (selectedWords.length < 8) {
        const randomIndex = Math.floor(Math.random() * targetWords.length);
        if (!usedIndices.has(randomIndex)) {
          usedIndices.add(randomIndex);
          selectedWords.push(targetWords[randomIndex]);
        }
      }
    }

    const newGames: WordleGame[] = selectedWords.map((word) => ({
      targetWord: word,
      guesses: [],
      gameState: "playing",
    }));

    setGames(newGames);
    setCurrentGuess("");
    setMessage("");
    setDailyCompleted(false);
    localStorage.removeItem(`octordle-game-${dateStr}`);

    // Backend state'i sil ve unmark
    if (backendUserId && gameDay) {
      await deleteGameState(backendUserId, "octordle", gameDay);
      await unmarkDailyGameCompletedBackend(backendUserId, "octordle", gameDay);
      // Update local list
      const dateToUnmark = dateStr.split('.').reverse().join('-');
      setCompletedDates(prev => prev.filter(d => d !== dateToUnmark));
    }
    
    // Local unmark (format expected: YYYY-MM-DD)
    const localDateStr = dateStr.split('.').reverse().join('-');
    unmarkGameCompleted("octordle", localDateStr);
    triggerDataRefresh();
  };

  if (games.length === 0 || allWords.length === 0) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  const allWon = games.every((g) => g.gameState === "won");
  const allLost = games.every((g) => g.gameState === "lost");
  const totalGuesses = Math.max(...games.map((g) => g.guesses.length));

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-[1600px]">
        {/* Debug Modal */}
        {showDebugModal && games.length > 0 && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowDebugModal(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 text-slate-300">
                <Bug className="w-5 h-5" />
                <h3 className="text-lg font-bold">Debug Mode</h3>
              </div>
              
              <div className="space-y-2">
                <p className="text-slate-400 text-sm mb-3">Hedef Kelimeler:</p>
                <div className="grid grid-cols-4 gap-2">
                  {games.map((game, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-400 mb-1">Kelime {idx + 1}</p>
                      <p className="text-sm font-bold text-emerald-400 tracking-wider">
                        {game.targetWord}
                      </p>
                    </div>
                  ))}
                </div>
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

        {/* Previous Games Modal */}
        {showPreviousGames && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-slate-100">Önceki Oyunlar</h2>
                <button
                  onClick={() => setShowPreviousGames(false)}
                  className="p-2 hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Game List */}
              <div className="overflow-y-auto p-4 space-y-2">
                {dailyEntries
                  .filter(entry => {
                    const eqDate = parseDate(entry.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return eqDate <= today;
                  })
                  .reverse()
                  .slice(0, 30)
                  .map((entry) => {
                    // Tarih formatı (YYYY-MM-DD)
                    const [d, m, y] = entry.date.split('.');
                    const isoDate = `${y}-${m}-${d}`;
                    const isCompleted = completedDates.includes(isoDate);

                    const isToday = entry.date === getTodayFormatted();
                    const dayIndex = dailyEntries.findIndex(e => e.date === entry.date);
                    const gameNumber = dayIndex + 1;
                    
                    // Tarih görünüm formatı
                    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                    const dayName = isToday ? "Bugün" : `${parseInt(d)} ${monthNames[parseInt(m) - 1]}`;
                    
                    return (
                      <button
                        key={entry.date}
                        onClick={() => {
                          const urlDate = isoDate;
                          router.push(`/games/octordle?date=${urlDate}`);
                          setShowPreviousGames(false);
                        }}
                        className={`w-full ${isCompleted ? 'bg-slate-700/50' : 'bg-slate-700'} hover:bg-slate-600 rounded-lg p-4 transition-colors flex items-center justify-between group`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            {isCompleted ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-slate-500" />
                            )}
                          </div>

                          {/* Game Info */}
                          <div className="text-left">
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold ${isCompleted ? 'text-emerald-400/70' : 'text-emerald-400'}`}>
                                #{gameNumber}
                              </span>
                              <span className="text-sm text-slate-400">
                                {dayName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Text */}
                        <div className="text-sm font-semibold">
                          {isCompleted ? (
                            <span className="text-emerald-400">Kazanıldı</span>
                          ) : (
                            <span className="text-slate-500">Oynanmadı</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-2xl font-bold">OCTORDLE</h1>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <MoreVertical className="w-6 h-6" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowPreviousGames(true);
                          setShowMenu(false);
                        }}
                      >
                        <Calendar className="w-5 h-5" />
                        <span>Önceki Oyunlar</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          resetGame();
                          setShowMenu(false);
                        }}
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>Sıfırla</span>
                      </button>
                      {process.env.NODE_ENV === "development" && (
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3"
                          onClick={() => {
                            setShowDebugModal(true);
                            setShowMenu(false);
                          }}
                        >
                          <Bug className="w-5 h-5" />
                          <span>Kelimeleri Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {!allWon && !allLost && (
            <div className="flex items-center justify-between text-sm font-semibold">
              <div className="flex items-center gap-4">
                <span>
                  Tahmin:{" "}
                  <span className="text-slate-400">{totalGuesses}/13</span>
                </span>
                <span>
                  Tamamlanan:{" "}
                  <span className="text-emerald-400">
                    {games.filter((g) => g.gameState === "won").length}/8
                  </span>
                </span>
              </div>
              {gameDay && (
                <span className="text-slate-400">Gün #{gameDay}</span>
              )}
            </div>
          )}
        </header>

        {/* Success/Lost State */}
        {(allWon || allLost) && (
          <div
            className={`mb-6 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              allLost ? "border-slate-500" : "border-emerald-600"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                allLost ? "text-slate-300" : "text-emerald-500"
              }`}
            >
              {allLost ? "Oyun Bitti" : "Tebrikler! Tüm Kelimeleri Buldunuz!"}
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Toplam tahmin: {totalGuesses}
            </p>

            <div className="flex flex-col gap-2 max-w-[240px] mx-auto">
              {mode === "levels" ? (
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <MapIcon className="w-4 h-4" />
                  Bölümlere Devam Et
                </button>
              ) : (
                <button
                  onClick={() => setShowPreviousGames(true)}
                  className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Önceki Günleri Oyna
                </button>
              )}
            </div>
          </div>
        )}

        {/* Invalid Word Toast */}
        {showInvalidWordToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-lg px-6 py-3 shadow-xl animate-fade-in">
            <p className="text-sm font-semibold text-slate-200 whitespace-nowrap">Kelime listesinde yok</p>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mb-4 bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {/* 8 Wordle Grids */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-1.5 md:gap-2 mb-6 w-full mx-auto px-1 md:px-0">
          {games.map((game, gameIndex) => {
            const isActive = game.gameState === "playing";
            const isCurrentRow = (row: number) =>
              row === game.guesses.length && isActive;
            
            return (
              <div
                key={gameIndex}
                className={`bg-slate-800 rounded-lg p-1.5 md:p-3 ${
                  game.gameState === "won"
                    ? "border-2 border-emerald-600"
                    : game.gameState === "lost"
                    ? "border-2 border-red-600"
                    : "border border-slate-700"
                }`}
              >
                <div className="mb-1 md:mb-1.5 text-[10px] font-semibold text-slate-400">
                  Kelime {gameIndex + 1}
                  {game.gameState === "won" && (
                    <span className="ml-1 text-emerald-400">✓</span>
                  )}
                  {game.gameState === "lost" && (
                    <span className="ml-1 text-red-400">✗</span>
                  )}
                </div>
                <div className="space-y-0.5 md:space-y-1">
                  {[...Array(13)].map((_, row) => {
                    const guess = game.guesses[row] || [];
                    const isCurrent = isCurrentRow(row);

                    return (
                      <div 
                        key={row} 
                        className={`flex gap-0.5 md:gap-1 ${isCurrent && shakeRow ? 'animate-shake' : ''}`}
                      >
                        {[...Array(5)].map((_, col) => {
                          if (isCurrent) {
                            const letter = currentGuess[col] || "";
                            const isDeleting = col === deletingIndex;
                            return (
                              <div
                                key={`${col}-${letterAnimationKeys[col]}`}
                                className={`flex-1 aspect-square bg-slate-700 border border-slate-600 rounded flex items-center justify-center text-white text-xs font-bold ${
                                  isDeleting ? "animate-letter-shrink" : letter ? "animate-letter-pop" : ""
                                }`}
                              >
                                {letter}
                              </div>
                            );
                          } else {
                            const letterData = guess[col] || {
                              letter: "",
                              state: "empty",
                            };
                            return (
                              <div
                                key={col}
                                className={`flex-1 aspect-square ${getLetterColor(
                                  letterData.state
                                )} rounded flex items-center justify-center text-white text-xs font-bold`}
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
                {(game.gameState === "won" || game.gameState === "lost") && (
                  <div className="mt-1.5 text-[9px] text-slate-400 text-center">
                    {game.targetWord}
                  </div>
                )}
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
                className={`keyboard-key flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(
                  key
                )}`}
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
                className={`keyboard-key flex-1 py-3.5 rounded text-xs sm:text-sm font-bold max-w-[32px] ${getKeyboardKeyColor(
                  key
                )}`}
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
                className={`keyboard-key flex-1 py-3 rounded text-xs sm:text-sm font-bold max-w-[36px] ${getKeyboardKeyColor(
                  key
                )}`}
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
      </div>
    </main>
  );
};

// Suspense wrapper for useSearchParams
export default function OctordlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Octordle />
    </Suspense>
  );
}

