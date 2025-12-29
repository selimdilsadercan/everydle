"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Bug, Calendar, X, Diamond, ArrowBigRight } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { completeLevel as completeLevelLocal } from "@/lib/levelProgress";
import { getUserStars } from "@/lib/userStars";
import { triggerDataRefresh } from "@/components/Header";
import { unmarkGameCompleted, formatDate } from "@/lib/dailyCompletion";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted } from "@/app/games/actions";

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

// Sabitler - daily_quordle.json ile eşleşmeli
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

const Quordle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi

  const [allWords, setAllWords] = useState<string[]>([]); // Tüm geçerli kelimeler (tahmin doğrulama)
  const [targetWords, setTargetWords] = useState<string[]>([]); // Hedef kelime havuzu
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]); // Günlük denklemler
  const [games, setGames] = useState<WordleGame[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [gameDay, setGameDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [letterAnimationKeys, setLetterAnimationKeys] = useState<number[]>([0, 0, 0, 0, 0]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  
  // Joker ve coin state'leri
  const [hints, setHints] = useState(0);
  const [skips, setSkips] = useState(0);
  const [coins, setCoins] = useState(0);
  // Her grid için açılan hint pozisyonları: [[grid0 pozisyonları], [grid1], ...]
  const [revealedHints, setRevealedHints] = useState<number[][]>([[], [], [], []]);

  const isInitialMount = useRef(true);

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

  // Kelimeleri yükle
  useEffect(() => {
    const loadWords = async () => {
      try {
        // Tüm geçerli kelimeleri yükle (tahmin doğrulama için)
        const allResponse = await fetch("/wordle/all_5letters.txt");
        const allText = await allResponse.text();
        const allWordList = allText
          .split("\n")
          .map((w) => toTurkishUpperCase(w.trim()))
          .filter((w) => w.length === 5);
        setAllWords(allWordList);

        // Günlük Quordle kelimeleri yükle
        const dailyResponse = await fetch("/wordle/daily_quordle.json");
        const dailyData = await dailyResponse.json();
        
        // Tüm günlük girişleri kaydet
        setDailyEntries(dailyData.daily_quordle);
        
        // Bugünün tarihini DD.MM.YYYY formatında al
        const todayFormatted = getTodayFormatted();
        
        // Bugünün kelimelerini bul
        const todayEntry = dailyData.daily_quordle.find(
          (entry: DailyEntry) => entry.date === todayFormatted
        );
        
        if (todayEntry && todayEntry.words.length === 4) {
          // Günlük 4 kelimeyi kullan
          const selectedWords = todayEntry.words.map((w: string) => toTurkishUpperCase(w));
          
          const newGames: WordleGame[] = selectedWords.map((word: string) => ({
            targetWord: word,
            guesses: [],
            gameState: "playing" as const,
          }));
          
          setGames(newGames);
          
          // Gün numarasını hesapla
          const dayIndex = dailyData.daily_quordle.findIndex(
            (entry: DailyEntry) => entry.date === todayFormatted
          );
          setGameDay(dayIndex + 1);
        } else {
          // Bugün için kelime yoksa rastgele seç
          const randomEntry = dailyData.daily_quordle[
            Math.floor(Math.random() * dailyData.daily_quordle.length)
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
        dailyData.daily_quordle.forEach((entry: DailyEntry) => {
          entry.words.forEach((word: string) => {
            allTargetWords.push(toTurkishUpperCase(word));
          });
        });
        setTargetWords(allTargetWords);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
        const fallback = ["KALEM", "KİTAP", "MASAJ", "KAPAK", "ELMAS", "BEBEK", "ÇİÇEK", "DOLAP"];
        setAllWords(fallback);
        setTargetWords(fallback);
        
        // Fallback oyunları oluştur
        const newGames: WordleGame[] = fallback.slice(0, 4).map((word) => ({
          targetWord: word,
          guesses: [],
          gameState: "playing" as const,
        }));
        setGames(newGames);
      }
    };
    loadWords();
  }, []);

  // Joker ve coin değerlerini yükle
  useEffect(() => {
    const savedHints = localStorage.getItem("everydle-hints");
    const savedSkips = localStorage.getItem("everydle-giveups");
    if (savedHints) setHints(parseInt(savedHints));
    if (savedSkips) setSkips(parseInt(savedSkips));
    setCoins(getUserStars());
    
    const handleStorageChange = () => {
      const h = localStorage.getItem("everydle-hints");
      const s = localStorage.getItem("everydle-giveups");
      if (h) setHints(parseInt(h));
      if (s) setSkips(parseInt(s));
      setCoins(getUserStars());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  
  // İpucu kullanma fonksiyonu
  const handleUseHint = () => {
    if (hints <= 0 || games.length === 0) return;
    
    // Hala oynanan (kazanılmamış) grid'leri bul
    const playingGrids = games
      .map((game, idx) => ({ game, idx }))
      .filter(({ game }) => game.gameState === "playing");
    
    if (playingGrids.length === 0) return;
    
    // Her oynan grid için açılabilecek pozisyonları bul
    const availableHints: { gridIndex: number; position: number }[] = [];
    
    playingGrids.forEach(({ game, idx }) => {
      // Önceki tahminlerde doğru bulunan pozisyonları bul
      const correctPositions: number[] = [];
      game.guesses.forEach(guess => {
        guess.forEach((letter, pos) => {
          if (letter.state === "correct" && !correctPositions.includes(pos)) {
            correctPositions.push(pos);
          }
        });
      });
      
      // Bu grid için açılmamış VE doğru bulunmamış pozisyonlar
      const gridHints = revealedHints[idx] || [];
      for (let pos = 0; pos < 5; pos++) {
        if (!gridHints.includes(pos) && !correctPositions.includes(pos)) {
          availableHints.push({ gridIndex: idx, position: pos });
        }
      }
    });
    
    if (availableHints.length === 0) return;
    
    // Rastgele bir hint seç
    const randomHint = availableHints[Math.floor(Math.random() * availableHints.length)];
    
    // Pozisyonu aç
    setRevealedHints(prev => {
      const newHints = [...prev];
      newHints[randomHint.gridIndex] = [...newHints[randomHint.gridIndex], randomHint.position];
      return newHints;
    });
    
    // Hint sayısını azalt
    const newHintCount = hints - 1;
    localStorage.setItem("everydle-hints", newHintCount.toString());
    setHints(newHintCount);
    triggerDataRefresh();
  };

  // LocalStorage'dan yükle
  useEffect(() => {
    if (games.length === 0) return;

    const saved = localStorage.getItem("quordle-game");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.games && parsed.games.length === 4) {
          setGames(parsed.games);
          setCurrentGuess(parsed.currentGuess || "");
        }
      } catch (e) {
        console.error("Oyun verisi yüklenemedi:", e);
      }
    }

    isInitialMount.current = false;
  }, [games.length]);

  // Oyun durumunu kaydet
  useEffect(() => {
    if (isInitialMount.current || games.length === 0) {
      isInitialMount.current = false;
      return;
    }

    const gameState = {
      games,
      currentGuess,
    };
    localStorage.setItem("quordle-game", JSON.stringify(gameState));
  }, [games, currentGuess]);

  // Oyun kazanıldığında levels modunda level'ı tamamla
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
  
  useEffect(() => {
    const allWon = games.length === 4 && games.every((g) => g.gameState === "won");
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
      const completionDate = formatDate(new Date());
      markDailyGameCompleted(backendUserId, "quordle", gameDay, completionDate);
      setDailyCompleted(true);
    }
  }, [games, mode, levelId, levelCompleted, backendUserId, gameDay, dailyCompleted]);

  // Oyun bittiğinde yukarı scroll yap
  useEffect(() => {
    const allWon = games.length === 4 && games.every((g) => g.gameState === "won");
    const allLost = games.length === 4 && games.every((g) => g.gameState === "lost");
    if (allWon || allLost) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [games]);

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
                } else if (newGuesses.length >= 9) {
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

    // 4 oyunda da absent ise çok koyu renk
    if (absentInGames.size === 4) {
      return "bg-slate-800 text-slate-500";
    }

    if (hasCorrect) return "bg-emerald-600 text-white";
    if (hasPresent) return "bg-yellow-500 text-white";
    // Bazı oyunlarda absent ama hepsinde değil
    if (absentInGames.size > 0) return "bg-slate-700 text-slate-400";
    // Henüz denenmemiş - açık gri arka plan
    return "bg-slate-600 text-slate-200";
  };

  const resetGame = () => {
    if (targetWords.length === 0) return;

    const selectedWords: string[] = [];
    const usedIndices = new Set<number>();

    while (selectedWords.length < 4) {
      const randomIndex = Math.floor(Math.random() * targetWords.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedWords.push(targetWords[randomIndex]);
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
    localStorage.removeItem("quordle-game");
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
      <div className="w-full max-w-5xl">
        {/* Debug Modal */}
        {showDebugModal && games.length > 0 && (
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
              
              <div className="space-y-2">
                <p className="text-slate-400 text-sm mb-3">Hedef Kelimeler:</p>
                <div className="grid grid-cols-2 gap-2">
                  {games.map((game, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-400 mb-1">Kelime {idx + 1}</p>
                      <p className="text-lg font-bold text-emerald-400 tracking-widest">
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
                  .map((entry, index, arr) => {
                    const isToday = entry.date === getTodayFormatted();
                    const dayIndex = dailyEntries.findIndex(e => e.date === entry.date);
                    const gameNumber = dayIndex + 1;
                    
                    // Tarih formatı
                    const dateParts = entry.date.split('.');
                    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                    const dayName = isToday ? "Bugün" : `${parseInt(dateParts[0])} ${monthNames[parseInt(dateParts[1]) - 1]}`;
                    
                    return (
                      <button
                        key={entry.date}
                        onClick={() => {
                          const selectedWords = entry.words.map(w => toTurkishUpperCase(w));
                          const newGames: WordleGame[] = selectedWords.map((word: string) => ({
                            targetWord: word,
                            guesses: [],
                            gameState: "playing" as const,
                          }));
                          setGames(newGames);
                          setCurrentGuess("");
                          setSelectedDate(entry.date);
                          setGameDay(gameNumber);
                          setShowPreviousGames(false);
                          localStorage.removeItem("quordle-game");
                        }}
                        className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-4 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full border-2 border-slate-500" />
                          </div>

                          {/* Game Info */}
                          <div className="text-left">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-emerald-400">
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
                          <span className="text-slate-500">Oynanmadı</span>
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

            <h1 className="text-2xl font-bold">QUORDLE</h1>

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
                  Tahmin: <span className="text-slate-400">{totalGuesses}/9</span>
                </span>
                <span>
                  Tamamlanan:{" "}
                  <span className="text-emerald-400">
                    {games.filter((g) => g.gameState === "won").length}/4
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
            {mode === "levels" && (
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
              >
                Bölümlere Devam Et
              </button>
            )}
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

        {/* 4 Wordle Grids */}
        <div className="grid grid-cols-4 gap-2 mb-6 w-full">
          {games.map((game, gameIndex) => {
            const isActive = game.gameState === "playing";
            const isCurrentRow = (row: number) =>
              row === game.guesses.length && isActive;

            return (
              <div
                key={gameIndex}
                className={`bg-slate-800 rounded-lg p-1.5 md:p-4 ${
                  game.gameState === "won"
                    ? "border-2 border-emerald-600"
                    : game.gameState === "lost"
                    ? "border-2 border-red-600"
                    : "border border-slate-700"
                }`}
              >
                <div className="mb-1 text-[10px] font-semibold text-slate-400">
                  Kelime {gameIndex + 1}
                  {game.gameState === "won" && (
                    <span className="ml-2 text-emerald-400">✓</span>
                  )}
                  {game.gameState === "lost" && (
                    <span className="ml-2 text-red-400">✗</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {[...Array(9)].map((_, row) => {
                    const guess = game.guesses[row] || [];
                    const isCurrent = isCurrentRow(row);

                    return (
                      <div 
                        key={row} 
                        className={`flex gap-0.5 ${isCurrent && shakeRow ? 'animate-shake' : ''}`}
                      >
                        {[...Array(5)].map((_, col) => {
                          if (isCurrent) {
                            // Hint harfi bu pozisyonda açık mı?
                            const gridHints = revealedHints[gameIndex] || [];
                            const isHintPosition = gridHints.includes(col);
                            const hintLetter = isHintPosition ? game.targetWord[col] : null;
                            
                            // Kullanıcının yazdığı harf (bu pozisyondaki)
                            const userLetter = currentGuess[col] || "";
                            // Kullanıcı yazmışsa kullanıcının harfini göster, yoksa hint harfini
                            const displayLetter = userLetter || hintLetter || "";
                            const isDeleting = col === deletingIndex;
                            // Hint pozisyonu ve kullanıcı henüz yazmamışsa sarı göster
                            const showAsHint = isHintPosition && !userLetter;
                            
                            return (
                              <div
                                key={`${col}-${letterAnimationKeys[col]}`}
                                className={`flex-1 aspect-square rounded flex items-center justify-center text-white text-[11px] font-bold ${
                                  showAsHint 
                                    ? "bg-yellow-600 border-2 border-yellow-400" 
                                    : "bg-slate-700 border border-slate-600"
                                } ${
                                  isDeleting ? "animate-letter-shrink" : displayLetter ? "animate-letter-pop" : ""
                                }`}
                              >
                                {displayLetter}
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
                                )} rounded flex items-center justify-center text-white text-[10px] font-bold`}
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
                  <div className="mt-2 text-xs text-slate-400 text-center">
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

        {/* Joker Buttons & Coins Section - Fixed Bottom */}
        {games.some(g => g.gameState === "playing") && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-3 safe-area-bottom">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              {/* Left: Coins */}
              <div className="flex items-center gap-1.5 text-orange-400">
                <Diamond className="w-5 h-5" fill="currentColor" />
                <span className="font-bold">{coins}</span>
              </div>
              
              {/* Right: Joker Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUseHint}
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
        
        {/* Bottom Spacer for Fixed Joker Bar */}
        {games.some(g => g.gameState === "playing") && <div className="h-16" />}
      </div>
    </main>
  );
};

export default function QuordlePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Yükleniyor...</div>}>
      <Quordle />
    </Suspense>
  );
}
