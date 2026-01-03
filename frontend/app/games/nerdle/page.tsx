"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Bug, Map, Calendar, X, Diamond, ArrowBigRight, Check } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { triggerDataRefresh } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted, unmarkDailyGameCompleted, saveGameState, getGameState as getEncoreGameState, deleteGameState } from "@/app/games/actions";
import { useUserStats, useDailyProgressListener } from "@/hooks/useProfileData";
import { useHint } from "@/app/store/actions";
import ConfirmJokerModal from "@/components/ConfirmJokerModal";

interface DailyEquation {
  date: string;
  equation: string;
}

type CharState = "correct" | "present" | "absent" | "empty";

interface Char {
  char: string;
  state: CharState;
}

// Tarih formatını DD.MM.YYYY'den YYYY-MM-DD'ye çevir
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Bugünün tarihini DD.MM.YYYY formatında al
function getTodayFormatted(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
}

// Display formatı oluştur (operatörleri güzel göster)
function getDisplayFormat(equation: string): string {
  return equation
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' / ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' - ')
    .replace(/=/g, ' = ');
}

const Nerdle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi

  // Listen for daily progress updates to refresh checkmarks
  useDailyProgressListener(backendUserId || undefined);

  // Game status cache for previous games modal: 'won' | 'lost' | 'playing' | 'not_played'
  const [gameStatusCache, setGameStatusCache] = useState<Record<number, 'won' | 'lost' | 'playing' | 'not_played'>>({});
  
  // Load completed games from backend (single efficient API call)
  useEffect(() => {
    if (!backendUserId) return;
    
    const loadCompletedGames = async () => {
      const { getAllCompletedGames } = await import("@/app/games/actions");
      
      const response = await getAllCompletedGames(backendUserId, "nerdle", 50);
      if (response.data?.success && response.data.games) {
        const cache: Record<number, 'won' | 'lost' | 'playing'> = {};
        response.data.games.forEach((g: any) => {
          cache[g.game_number] = g.is_won !== false ? 'won' : 'lost';
        });
        setGameStatusCache(cache);
      }
    };
    loadCompletedGames();
  }, [backendUserId]);

  const [equations, setEquations] = useState<DailyEquation[]>([]);
  const [targetEquation, setTargetEquation] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");
  const [guesses, setGuesses] = useState<Char[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [gameDay, setGameDay] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmHint, setShowConfirmHint] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidToast, setShowInvalidToast] = useState(false);
  const [charAnimationKeys, setCharAnimationKeys] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Joker ve coin state'leri - Backend hook ile
  const { hints: backendHints, giveups: backendSkips, stars: backendCoins, isLoading: isStatsLoading } = useUserStats(backendUserId || undefined);
  const [localHints, setLocalHints] = useState(0);
  const [localSkips, setLocalSkips] = useState(0);
  const [localCoins, setLocalCoins] = useState(0);
  const [revealedHints, setRevealedHints] = useState<number[]>([]); // Açılan karakter pozisyonları
  
  // Use backend stats if logged in, otherwise local
  const hints = backendUserId ? backendHints : localHints;
  const skips = backendUserId ? backendSkips : localSkips;
  const coins = backendUserId ? backendCoins : localCoins;

  // Joker ve coin değerlerini yükle (Local Storage fallback kaldırıldı - sadece backend)
  useEffect(() => {
    if (backendUserId) return; 
    
    // Giriş yapmamış kullanıcılar için basit başlangıç değerleri
    setLocalHints(3);
    setLocalSkips(1);
    setLocalCoins(0);
  }, [backendUserId]);

  // İpucu kullanma fonksiyonu
  const handleUseHint = async () => {
    if (hints <= 0 || !targetEquation || gameState !== "playing") return;
    
    // Önceki tahminlerde doğru bulunan pozisyonları bul
    const correctPositions: number[] = [];
    guesses.forEach(guess => {
      guess.forEach((letter, idx) => {
        if (letter.state === "correct" && !correctPositions.includes(idx)) {
          correctPositions.push(idx);
        }
      });
    });
    
    // Açılmamış VE önceki tahminlerde doğru bulunmamış pozisyonları bul
    const unopenedPositions = [0, 1, 2, 3, 4, 5, 6, 7].filter(pos => 
      !revealedHints.includes(pos) && !correctPositions.includes(pos)
    );
    
    if (unopenedPositions.length === 0) return; // Tüm karakterler zaten açık veya bulunmuş
    
    // Backend call for hints if logged in
    if (backendUserId) {
      const result = await useHint(backendUserId);
      if (!result.data?.success) {
        setMessage("Hint kullanılamadı!");
        setTimeout(() => setMessage(""), 2000);
        return;
      }
      triggerDataRefresh();
    } else {
      // Entry yapmamış kullanıcılar hint kullanamaz veya sınırlı kullanım
      setMessage("Hint kullanmak için giriş yapın!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    
    // Rastgele bir pozisyon seç
    const randomIndex = Math.floor(Math.random() * unopenedPositions.length);
    const positionToReveal = unopenedPositions[randomIndex];
    
    // Pozisyonu aç
    setRevealedHints(prev => [...prev, positionToReveal]);
  };

  // dailyCompleted flag - localStorage'dan yüklendiğinde zaten tamamlanmış oyunlar için tekrar çağırma
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const isInitialMount = useRef(true);
  
  // Set isInitialMount to false after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100); // Biraz gecikme ile, localStorage yüklemesi tamamlansın
    return () => clearTimeout(timer);
  }, []);
  
  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    if (gameState === "won" && mode === "levels" && levelId && !levelCompleted) {
      const lid = parseInt(levelId);
      
      // Backend tamamla
      if (backendUserId) {
        completeLevelBackend(backendUserId, lid);
      }
      
      setLevelCompleted(true);
    }
  }, [gameState, mode, levelId, levelCompleted, backendUserId]);

  // Update current game status cache reactively based on guesses and state
  useEffect(() => {
    if (!gameDay || !backendUserId) return;
    
    const hasGuesses = guesses.length > 0;
    
    if (gameState === "won") {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'won' }));
    } else if (gameState === "lost") {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'lost' }));
    } else if (hasGuesses) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'playing' }));
    } else {
      // No guesses and not finished -> remove from playing/won/lost to show as not_played
      setGameStatusCache(prev => {
        if (prev[gameDay]) {
            const updated = { ...prev };
            delete updated[gameDay];
            return updated;
        }
        return prev;
      });
    }
  }, [guesses, gameState, gameDay, backendUserId]);

  // Oyun kazanıldığında günlük tamamlamayı veritabanına kaydet
  useEffect(() => {
    if (gameState === "won" && backendUserId && gameDay && !dailyCompleted && !isInitialMount.current) {
      const handleWin = async () => {
        const { formatDate } = await import("@/lib/dailyCompletion");
        const completionDate = formatDate(new Date());
        const gameDateValue = selectedDate ? formatDate(parseDate(selectedDate)) : completionDate;
        
        await markDailyGameCompleted(backendUserId, "nerdle", gameDay, completionDate, gameDateValue);
        setDailyCompleted(true);
        triggerDataRefresh();
      };
      handleWin();
    }
  }, [gameState, selectedDate, backendUserId, gameDay, dailyCompleted]);

  // Denklemleri yükle ve seçilen günün denklemini seç
  useEffect(() => {
    const loadEquations = async () => {
      try {
        const response = await fetch("/nerdle/equations.json");
        const data: DailyEquation[] = await response.json();
        setEquations(data);
        
        // URL'den tarih parametresini al (format: YYYY-MM-DD)
        const dateParam = searchParams.get("date");
        let targetDate: string;
        
        if (dateParam) {
          // YYYY-MM-DD -> DD.MM.YYYY dönüşümü
          const [year, month, day] = dateParam.split('-');
          targetDate = `${day}.${month}.${year}`;
          setSelectedDate(targetDate);
        } else {
          // Bugünün tarihi
          targetDate = getTodayFormatted();
          setSelectedDate(null);
        }
        
        const targetEquationData = data.find(eq => eq.date === targetDate);
        
        if (targetEquationData) {
          setTargetEquation(targetEquationData.equation);
          setTargetDisplay(getDisplayFormat(targetEquationData.equation));
          // Gün numarasını hesapla
          const dayIndex = data.findIndex(eq => eq.date === targetDate);
          setGameDay(dayIndex + 1);
        } else {
          // Hedef tarih için denklem yoksa bugünün denklemini yükle
          const today = getTodayFormatted();
          const todayEquation = data.find(eq => eq.date === today);
          if (todayEquation) {
            setTargetEquation(todayEquation.equation);
            setTargetDisplay(getDisplayFormat(todayEquation.equation));
            const dayIndex = data.findIndex(eq => eq.date === today);
            setGameDay(dayIndex + 1);
          } else {
            // Fallback: rastgele seç
            const randomEq = data[Math.floor(Math.random() * data.length)];
            setTargetEquation(randomEq.equation);
            setTargetDisplay(getDisplayFormat(randomEq.equation));
            setGameDay(null);
          }
        }
      } catch (error) {
        console.error("Denklemler yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEquations();
  }, [searchParams]);

  // Oyun durumunu yükle - oyun numarası değiştiğinde
  useEffect(() => {
    if (!gameDay) return;
    
    isInitialMount.current = true;

    const loadState = async () => {
      let stateToLoad = null;

      // 1. Try Encore first if logged in
      if (backendUserId) {
        const response = await getEncoreGameState(backendUserId, "nerdle", gameDay);
        if (response.data?.success && response.data.data) {
          stateToLoad = response.data.data.state as any;
        }
      }

      // 2. LocalStorage desteği kaldırıldı - tamamen backend merkezli
      if (!stateToLoad) {
        // ... backend failed or not logged in, starts fresh
      }

      // 3. Apply state
      if (stateToLoad) {
        setGuesses(stateToLoad.guesses || []);
        setGameState(stateToLoad.gameState || "playing");
        setRevealedHints(stateToLoad.revealedHints || []);
      }
      
      setTimeout(() => {
        isInitialMount.current = false;
      }, 0);
    };

    loadState();
  }, [gameDay, backendUserId]);

  // Oyun durumunu kaydet
  useEffect(() => {
    if (isInitialMount.current || !gameDay) {
      return;
    }

    // En az bir tahmin yapılmış mı kontrol et
    if (guesses.length === 0) {
      return; // Hiç tahmin yoksa kaydetme
    }

    const isFinished = gameState !== "playing";
    const stateToSave = {
      guesses,
      gameState,
      revealedHints
    };

    // Save to Encore if logged in
    if (backendUserId) {
      saveGameState(
        backendUserId,
        "nerdle",
        gameDay,
        stateToSave as any,
        isFinished,
        gameState === "won"
      );
    }
  }, [guesses, gameState, revealedHints, gameDay, backendUserId]);

  const isValidEquation = (eq: string): boolean => {
    // Check if equation contains = sign
    if (!eq.includes("=")) return false;

    try {
      // Replace × and ÷ with * and / for evaluation
      const evalEq = eq.replace(/×/g, "*").replace(/÷/g, "/");

      // Split into left and right sides
      const [leftSide, rightSide] = evalEq.split("=");
      if (!leftSide || !rightSide) return false;

      // Evaluate left side (can contain parentheses)
      const leftResult = Function(`"use strict"; return (${leftSide})`)();
      const rightResult = parseFloat(rightSide);

      // Check if results match (with small tolerance for floating point)
      return Math.abs(leftResult - rightResult) < 0.0001;
    } catch (e) {
      return false;
    }
  };

  const evaluateGuess = (guess: string): Char[] => {
    const result: Char[] = [];
    const targetArray = targetEquation.split("");
    const guessArray = guess.split("");

    // First pass: mark correct positions
    for (let i = 0; i < Math.min(targetArray.length, guessArray.length); i++) {
      if (guessArray[i] === targetArray[i]) {
        result.push({ char: guessArray[i], state: "correct" });
      } else {
        result.push({ char: guessArray[i], state: "absent" });
      }
    }

    // Second pass: mark present characters
    const used = new Array(targetArray.length).fill(false);
    for (let i = 0; i < result.length; i++) {
      if (result[i].state === "correct") {
        used[i] = true;
      }
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].state === "absent") {
        const char = guessArray[i];
        const index = targetArray.findIndex(
          (c, idx) => c === char && !used[idx]
        );
        if (index !== -1) {
          result[i].state = "present";
          used[index] = true;
        }
      }
    }

    return result;
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState !== "playing" || !targetEquation) return;

      // 'x' tuşunu '*' (çarpma) olarak algıla
      const normalizedKey = key.toLowerCase() === "x" ? "*" : key;

      // Kullanıcının yazabileceği pozisyon sayısı (hint olmayan)
      const writablePositions = [0, 1, 2, 3, 4, 5, 6, 7].filter(pos => !revealedHints.includes(pos));
      const userInputLength = currentGuess.replace(/ /g, "").length;

      if (normalizedKey === "Enter") {
        // Tam denklemi oluştur: hint karakterleri + kullanıcı karakterleri
        let fullGuess = "";
        let userCharIndex = 0;
        const userChars = currentGuess.replace(/ /g, "");
        
        for (let i = 0; i < 8; i++) {
          if (revealedHints.includes(i)) {
            fullGuess += targetEquation[i];
          } else if (userCharIndex < userChars.length) {
            fullGuess += userChars[userCharIndex];
            userCharIndex++;
          }
        }

        if (fullGuess.length === 8) {
          if (isValidEquation(fullGuess)) {
            const evaluated = evaluateGuess(fullGuess);
            setGuesses([...guesses, evaluated]);

            if (fullGuess === targetEquation) {
              setGameState("won");
              setMessage("Tebrikler! Denklemi çözdünüz!");
            } else if (guesses.length === 5) {
              setGameState("lost");
              setMessage(`Oyun Bitti! Denklem: ${targetDisplay}`);
            } else {
              setCurrentGuess("");
              setRevealedHints([]); // Yeni satır için hintleri temizle
            }
          } else {
            // Shake animasyonu ve toast göster
            setShakeRow(true);
            setShowInvalidToast(true);
            setTimeout(() => setShakeRow(false), 600);
            setTimeout(() => setShowInvalidToast(false), 2000);
          }
        }
      } else if (normalizedKey === "Backspace") {
        if (userInputLength > 0) {
          const deleteIdx = userInputLength - 1;
          setDeletingIndex(deleteIdx);
          setTimeout(() => {
            setDeletingIndex(null);
            setCurrentGuess(currentGuess.slice(0, -1));
          }, 100);
        }
      } else if (
        normalizedKey.length === 1 &&
        /[0-9+\-*/=()]/.test(normalizedKey) &&
        userInputLength < writablePositions.length
      ) {
        // Pop animasyonu için karakterin key'ini güncelle
        const newIndex = userInputLength;
        setCharAnimationKeys(prev => {
          const newKeys = [...prev];
          newKeys[writablePositions[newIndex]] = prev[writablePositions[newIndex]] + 1;
          return newKeys;
        });
        
        setCurrentGuess((prev) => prev + normalizedKey);
      }
    },
    [currentGuess, guesses, targetEquation, gameState, revealedHints, targetDisplay]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress]);

  const getCharColor = (state: CharState) => {
    switch (state) {
      case "correct":
        return "bg-emerald-600";
      case "present":
        return "bg-yellow-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800 border-2 border-slate-700";
    }
  };

  // Convert raw characters to display symbols
  const displayChar = (char: string): string => {
    if (char === "*") return "×";
    return char;
  };

  // Klavye karakterinin durumunu hesapla
  const getKeyboardCharState = (char: string): CharState | null => {
    let bestState: CharState | null = null;
    
    for (const guess of guesses) {
      for (const charData of guess) {
        if (charData.char === char) {
          // correct > present > absent
          if (charData.state === "correct") {
            return "correct"; // En iyi durum, hemen döndür
          } else if (charData.state === "present" && bestState !== "present") {
            bestState = "present";
          } else if (charData.state === "absent" && bestState === null) {
            bestState = "absent";
          }
        }
      }
    }
    
    return bestState;
  };

  // Klavye tuşu için stil
  const getKeyboardKeyStyle = (key: string): string => {
    const state = getKeyboardCharState(key);
    switch (state) {
      case "correct":
        return "bg-emerald-600 text-white border-emerald-500";
      case "present":
        return "bg-yellow-500 text-white border-yellow-400";
      case "absent":
        return "bg-slate-800 text-slate-500 border-slate-700";
      default:
        return "bg-slate-600 text-slate-200 border-slate-500 hover:bg-slate-500";
    }
  };

  const resetGame = async () => {
    if (equations.length === 0) return;
    
    // Prevent immediate save effect during reset
    isInitialMount.current = true;

    // Hedef denklemi yeniden belirle (Seçili tarih varsa o günün denklemini, yoksa bugünkü veya rastgele)
    const targetDate = selectedDate || getTodayFormatted();
    const entry = equations.find(e => e.date === targetDate);
    
    if (entry) {
      setTargetEquation(entry.equation);
      setTargetDisplay(getDisplayFormat(entry.equation));
    }

    setGuesses([]);
    setCurrentGuess("");
    setGameState("playing");
    setMessage("");
    setDailyCompleted(false);
    setLevelCompleted(false);
    setRevealedHints([]);
    
    // Backend reset if logged in
    if (backendUserId && gameDay) {
      await deleteGameState(backendUserId, "nerdle", gameDay);
      await unmarkDailyGameCompleted(backendUserId, "nerdle", gameDay);
      
      // Clear any potential stale localStorage for Games page
      localStorage.removeItem(`nerdle-game-${gameDay}`);
      const targetDateStr = selectedDate || getTodayFormatted();
      localStorage.removeItem(`nerdle-game-${targetDateStr}`);

      setGameStatusCache(prev => {
        const updated = { ...prev };
        delete updated[gameDay];
        return updated;
      });
      
      triggerDataRefresh();
    }

    setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);
  };

  // Belirli bir tarihin denklemini oyna
  const playDate = (dateStr: string) => {
    const eq = equations.find(e => e.date === dateStr);
    if (eq) {
      setTargetEquation(eq.equation);
      setTargetDisplay(getDisplayFormat(eq.equation));
      setGuesses([]);
      setCurrentGuess("");
      setGameState("playing");
      setMessage("");
      setSelectedDate(dateStr);
      const dayIndex = equations.findIndex(e => e.date === dateStr);
      setGameDay(dayIndex + 1);
      setShowPreviousGames(false);
    }
  };

  // Loading durumu
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4 overflow-x-hidden">
      <div className="w-full max-w-md">
        {/* Debug Modal */}
        {showDebugModal && targetEquation && (
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
                <p className="text-slate-400 text-sm mb-2">Hedef Denklem:</p>
                <p className="text-2xl font-bold text-emerald-400 tracking-wide">
                  {targetDisplay}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ({targetEquation})
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

        {/* Previous Games Modal */}
        {showPreviousGames && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowPreviousGames(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-4 w-[90%] shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-base font-bold">Önceki Oyunlar</h3>
                </div>
                <button 
                  onClick={() => setShowPreviousGames(false)}
                  className="p-1 hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh] space-y-1.5">
                {equations
                  .filter(eq => {
                    // Sadece bugün ve önceki tarihleri göster
                    const eqDate = parseDate(eq.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return eqDate <= today;
                  })
                  .reverse() // En yeniden eskiye
                  .slice(0, 30) // Son 30 gün
                  .map((eq) => {
                    const isToday = eq.date === getTodayFormatted();
                    const isSelected = eq.date === selectedDate;
                    const gameNumber = equations.findIndex(e => e.date === eq.date) + 1;
                    const status = gameStatusCache[gameNumber] || 'not_played';

                    return (
                      <button
                        key={eq.date}
                        onClick={() => playDate(eq.date)}
                        className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center justify-between group ${
                          isSelected 
                            ? 'bg-blue-900/50 border-2 border-blue-500 hover:bg-blue-900/70' 
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 flex items-center justify-center">
                            {status === "won" && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                            {status === "lost" && (
                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white">
                                    <X className="w-3 h-3" />
                                </div>
                            )}
                            {status === "playing" && (
                                <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center text-yellow-500">
                                    <span className="text-[10px] font-bold">...</span>
                                </div>
                            )}
                            {status === "not_played" && (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-500" />
                            )}
                          </div>
                          <span className="font-medium text-slate-200">{eq.date}</span>
                          {isToday && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded">Bugün</span>}
                        </div>
                        
                        <div className="text-xs font-semibold">
                          {status === "won" && <span className="text-emerald-400">Kazanıldı</span>}
                          {status === "lost" && <span className="text-red-400">Kaybedildi</span>}
                          {status === "playing" && <span className="text-yellow-400">Devam Ediyor</span>}
                          {status === "not_played" && <span className="text-slate-500">Oynanmadı</span>}
                        </div>
                      </button>
                    );
                  })}
              </div>
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

            <h1 className="text-2xl font-bold">Equation</h1>

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
                          <span>Denklemi Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Game info - Left aligned like Contexto */}
        {gameState === "playing" && (
          <div className="flex items-center justify-between text-sm font-semibold mb-4">
            <span>
              Tahmin: <span className="text-slate-400">{guesses.length}</span>
            </span>
            {gameDay && (
              <span className="text-slate-400">Gün #{gameDay}</span>
            )}
          </div>
        )}

        {/* Success/Lost State */}
        {(gameState === "won" || gameState === "lost") && (
          <div
            className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              gameState === "lost" ? "border-slate-500" : "border-emerald-600"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                gameState === "lost" ? "text-slate-300" : "text-emerald-500"
              }`}
            >
              {gameState === "lost" ? "Oyun Bitti" : "Tebrikler!"}
            </h2>

            <p className="text-lg mb-4">
              {gameState === "lost" ? "Denklem" : "Denklemi buldunuz"}:{" "}
              <span
                className={`font-bold ${
                  gameState === "lost" ? "text-slate-300" : "text-emerald-500"
                }`}
              >
                {targetDisplay}
              </span>
            </p>

            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>

            {mode === "levels" ? (
              <button
                onClick={() => router.back()}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Map className="w-4 h-4" />
                Bölümlere Devam Et
              </button>
            ) : (
              <button
                onClick={resetGame}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Tekrar Oyna
              </button>
            )}
          </div>
        )}

        {/* Invalid Equation Toast */}
        {showInvalidToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-lg px-6 py-3 shadow-xl animate-fade-in">
            <p className="text-sm font-semibold text-slate-200 whitespace-nowrap">Geçersiz denklem!</p>
          </div>
        )}

        {/* Game Grid */}
        <div className="space-y-2 mb-8">
          {[...Array(6)].map((_, row) => {
            const guess = guesses[row] || [];
            const isCurrentRow = gameState === "playing" && row === guesses.length;

            return (
              <div key={row} className={`flex gap-2 justify-center ${isCurrentRow && shakeRow ? 'animate-shake' : ''}`}>
                {[...Array(8)].map((_, col) => {
                  if (isCurrentRow) {
                    const writablePositions = [0, 1, 2, 3, 4, 5, 6, 7].filter(pos => !revealedHints.includes(pos));
                    let char = "";
                    let userCharIdx = -1;
                    
                    if (revealedHints.includes(col)) {
                      char = targetEquation[col];
                    } else {
                      userCharIdx = writablePositions.indexOf(col);
                      if (userCharIdx !== -1) {
                        char = currentGuess[userCharIdx] || "";
                      }
                    }

                    const isDeleting = userCharIdx === deletingIndex;
                    
                    return (
                      <div
                        key={`${col}-${charAnimationKeys[col]}`}
                        className={`w-12 h-12 ${revealedHints.includes(col) ? 'bg-emerald-600/30' : 'bg-slate-800'} border-2 ${revealedHints.includes(col) ? 'border-emerald-500' : 'border-slate-700'} rounded flex items-center justify-center text-slate-100 text-xl font-bold ${
                          isDeleting ? 'animate-letter-shrink' : char ? 'animate-letter-pop' : ''
                        }`}
                      >
                        {displayChar(char)}
                      </div>
                    );
                  } else {
                    const charData = guess[col] || {
                      char: "",
                      state: "empty",
                    };
                    return (
                      <div
                        key={col}
                        className={`w-12 h-12 ${getCharColor(
                          charData.state
                        )} rounded flex items-center justify-center text-slate-100 text-xl font-bold transition-all duration-300`}
                      >
                        {displayChar(charData.char)}
                      </div>
                    );
                  }
                })}
              </div>
            );
          })}
        </div>

        {/* Virtual Keyboard */}
        <div className="space-y-1 max-w-md mx-auto mb-2">
          {/* First row: Numbers and operators */}
          <div className="grid grid-cols-10 gap-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`py-3 px-2 rounded transition-colors text-lg font-semibold border ${getKeyboardKeyStyle(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* Second row: Operators and parentheses */}
          <div className="grid grid-cols-7 gap-1">
            {["+", "-", "*", "/", "=", "(", ")"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`py-3 px-2 rounded transition-colors text-lg font-semibold border ${getKeyboardKeyStyle(key)}`}
              >
                {key === "*" ? "×" : key}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 max-w-md mx-auto">
          <button
            onClick={() => handleKeyPress("Enter")}
            className="flex-1 py-4 bg-emerald-600 text-slate-100 rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            ENTER
          </button>
          
          <button
            onClick={() => handleKeyPress("Backspace")}
            className="flex-1 py-4 bg-slate-700 text-slate-100 rounded-xl hover:bg-slate-600 transition-colors font-bold shadow-lg shadow-slate-950/20 active:scale-95"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Joker Buttons & Coins Section - Fixed Bottom like Wordle */}
      {gameState === "playing" && (
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
      {gameState === "playing" && <div className="h-16" />}

      {/* Joker Confirm Modal */}
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
    </main>
  );
};

// Suspense wrapper for useSearchParams
export default function NerdlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Nerdle />
    </Suspense>
  );
}
