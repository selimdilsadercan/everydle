"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Bug, Calendar, X, Diamond, ArrowBigRight, Check } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { triggerDataRefresh } from "@/components/Header";
import { formatDate } from "@/lib/dailyCompletion";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted, unmarkDailyGameCompleted, saveGameState, getGameState as getEncoreGameState, deleteGameState } from "@/app/games/actions";
import { useUserStats, useDailyProgressListener } from "@/hooks/useProfileData";
import { useHint } from "@/app/store/actions";
import ConfirmJokerModal from "@/components/ConfirmJokerModal";

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

  // Listen for daily progress updates to refresh checkmarks
  useDailyProgressListener(backendUserId || undefined);

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [letterAnimationKeys, setLetterAnimationKeys] = useState<number[]>([0, 0, 0, 0, 0]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showConfirmHint, setShowConfirmHint] = useState(false);
  
  // Joker ve coin state'leri - Backend hook ile
  const { hints: backendHints, giveups: backendSkips, stars: backendCoins, isLoading: isStatsLoading } = useUserStats(backendUserId || undefined);
  const [localHints, setLocalHints] = useState(0);
  const [localSkips, setLocalSkips] = useState(0);
  const [localCoins, setLocalCoins] = useState(0);
  // Her grid için açılan hint pozisyonları: [[grid0 pozisyonları], [grid1], ...]
  const [revealedHints, setRevealedHints] = useState<number[][]>([[], [], [], []]);
  // Quordle özel: Hangi pozisyon için hangi harfin joker olarak açıldığını tutar. { colIndex: "A" }
  const [hintLetters, setHintLetters] = useState<Record<number, string>>({});
  
  // Use backend stats if logged in, otherwise local
  const hints = backendUserId ? backendHints : localHints;
  const skips = backendUserId ? backendSkips : localSkips;
  const coins = backendUserId ? backendCoins : localCoins;

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

        // Günlük Quordle kelimeleri yükle
        const dailyResponse = await fetch("/wordle/daily_quordle.json");
        const dailyData = await dailyResponse.json();
        
        // Tüm günlük girişleri kaydet
        setDailyEntries(dailyData.daily_quordle);
        
        // Hedef kelimeleri bul
        const targetEntry = dailyData.daily_quordle.find(
          (entry: DailyEntry) => entry.date === targetDateStr
        );
        
        if (targetEntry && targetEntry.words.length === 4) {
          // Günlük 4 kelimeyi kullan
          const selectedWords = targetEntry.words.map((w: string) => toTurkishUpperCase(w));
          
          const newGames: WordleGame[] = selectedWords.map((word: string) => ({
            targetWord: word,
            guesses: [],
            gameState: "playing" as const,
          }));
          
          setGames(newGames);
          
          // Gün numarasını hesapla
          const dayIndex = dailyData.daily_quordle.findIndex(
            (entry: DailyEntry) => entry.date === targetDateStr
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

        setIsLoaded(true);
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
        setIsLoaded(true);
      }
    };
    loadWords();
  }, [searchParams]);

  // Game status cache for previous games modal: 'won' | 'lost' | 'playing' | 'not_played'
  const [gameStatusCache, setGameStatusCache] = useState<Record<number, 'won' | 'lost' | 'playing' | 'not_played'>>({});
  
  // Load completed games from backend (single efficient API call)
  useEffect(() => {
    if (!backendUserId) return;
    
    const loadCompletedGames = async () => {
      // Import dynamically to avoid circular dependency
      const { getAllCompletedGames } = await import("@/app/games/actions");
      
      const response = await getAllCompletedGames(backendUserId, "quordle", 50);
      if (response.data?.success && response.data.games) {
        const cache: Record<number, 'won' | 'lost' | 'playing' | 'not_played'> = {};
        response.data.games.forEach((g: any) => {
          cache[g.game_number] = g.status || (g.is_won !== false ? 'won' : 'lost');
        });
        setGameStatusCache(cache);
      }
    };
    loadCompletedGames();
  }, [backendUserId]);
  
  // Update current game status when games state changes
  useEffect(() => {
    if (!gameDay || games.length === 0) return;
    
    const allWon = games.every((g) => g.gameState === "won");
    const allLost = games.every((g) => g.gameState === "lost");
    const hasGuesses = games.some((g) => g.guesses.length > 0);
    
    if (allWon) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'won' }));
    } else if (allLost) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'lost' }));
    } else if (hasGuesses) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'playing' }));
    }
  }, [games, gameDay]);
  
  // İpucu kullanma fonksiyonu
  const handleUseHint = async () => {
    if (hints <= 0 || games.length === 0) return;
    
    // 1. Oynanan gridleri bul
    const playingGrids = games
      .map((game, idx) => ({ game, idx }))
      .filter(({ game }) => game.gameState === "playing");
    
    if (playingGrids.length === 0) return;

    // 2. Her playing grid için müsait pozisyonları bul
    const gridAvailablePositions: number[][] = playingGrids.map(({ game, idx }) => {
      const correctPositions: number[] = [];
      game.guesses.forEach(guess => {
        guess.forEach((letter, pos) => {
          if (letter.state === "correct" && !correctPositions.includes(pos)) {
            correctPositions.push(pos);
          }
        });
      });
      
      const gridRevealed = revealedHints[idx] || [];
      return [0, 1, 2, 3, 4].filter(pos => 
        !correctPositions.includes(pos) && !gridRevealed.includes(pos)
      );
    });

    // 3. Ortak müsait pozisyonları bul
    let candidatePositions: number[] = [];
    
    // İlk olarak tüm playing gridlerde ortak olan pozisyonlara bak
    let commonAvailable = gridAvailablePositions[0] || [];
    for (let i = 1; i < gridAvailablePositions.length; i++) {
        commonAvailable = commonAvailable.filter(pos => gridAvailablePositions[i].includes(pos));
    }
    
    if (commonAvailable.length > 0) {
      candidatePositions = commonAvailable;
    } else {
      // Ortak yoksa, tüm müsait pozisyonların birleşimini al
      candidatePositions = Array.from(new Set(gridAvailablePositions.flat()));
    }

    if (candidatePositions.length === 0) return; // Açılacak yer kalmadı

    // 4. Backend/LocalStorage işlemleri
    if (backendUserId) {
      const result = await useHint(backendUserId);
      if (!result.data?.success) {
        setMessage("Hint kullanılamadı!");
        setTimeout(() => setMessage(""), 2000);
        return;
      }
      triggerDataRefresh();
    } else {
      // Giriş yapmamış kullanıcılar hint kullanamaz
      setMessage("Hint kullanmak için giriş yapın!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    // 5. Rastgele bir pozisyon seç ve tüm playing gridlerde aç
    const targetPosition = candidatePositions[Math.floor(Math.random() * candidatePositions.length)];

    // Bu pozisyondaki HARFİ belirle (Rastgele bir playing gridin o pozisyondaki harfi)
    // Böylece en az bir gridde 'Yeşil' (Correct) yanması garanti olur.
    // Ancak o gridin o pozisyonu "available" (henüz bilinmeyen) olmalı.
    // candidatePositions zaten available'lardan seçildi, ama selected gridin o pozisyonu available olmayabilir mi?
    // candidatePositions "commonAvailable" ise tüm gridlerde available.
    // Değilse, available olduğu gridlerden birini seçmek daha doğru olur.
    
    let sourceGrid = playingGrids[0];
    
    // Eğer seçilen pozisyon "commonAvailable" içindeyse, herhangi bir playing grid kaynak olabilir.
    // Değilse, bu pozisyonun müsait olduğu gridlerden birini kaynak olarak seç.
    const gridsWherePosIsAvailable = playingGrids.filter(({ idx }) => {
        const gridRevealed = revealedHints[idx] || [];
        // Correct check'i tekrar yapmaya gerek var mı? available listesi zaten filtrlendi.
        // Ama basitçe o gridin available listesinde bu pozisyon var mı diye bakabiliriz.
        // Ama available listesi local scope'da kaldı.
        // Neyse, basitçe: O gridde bu pozisyon henüz açılmamışsa kaynak olabilir.
        return !gridRevealed.includes(targetPosition);
    });
    
    if (gridsWherePosIsAvailable.length > 0) {
        sourceGrid = gridsWherePosIsAvailable[Math.floor(Math.random() * gridsWherePosIsAvailable.length)];
    }
    
    const targetLetter = sourceGrid.game.targetWord[targetPosition];

    // Hint harfini kaydet
    setHintLetters(prev => ({
        ...prev,
        [targetPosition]: targetLetter
    }));

    setRevealedHints(prev => {
      const newHints = [...prev];
      // Tüm playing gridler için o pozisyonu aç
      playingGrids.forEach(({ idx }) => {
        const currentGridHints = newHints[idx] || [];
        if (!currentGridHints.includes(targetPosition)) {
            // Eğer oyun durumu 'playing' ise ve o pozisyon henüz açılmamışsa ekle
            newHints[idx] = [...currentGridHints, targetPosition];
        }
      });
      return newHints;
    });
    
    // Input'u temizle ki writablePositions hesaplaması karışmasın
    setCurrentGuess("");
  };


  // Oyun durumunu backend'den yükle
  useEffect(() => {
    if (!isLoaded || !gameDay || !backendUserId) return;

    const loadState = async () => {
      try {
        const response = await getEncoreGameState(backendUserId, "quordle", gameDay);
        
        // Encore response structure: response.data = { data: { state: {...}, is_completed, is_won } }
        const encoreData = response.data?.data;
        
        if (encoreData?.state) {
          const stateToLoad = encoreData.state as any;
          
          if (stateToLoad.games && stateToLoad.games.length === 4) {
            setGames(stateToLoad.games);
            setCurrentGuess(stateToLoad.currentGuess || "");
            setRevealedHints(stateToLoad.revealedHints || [[], [], [], []]);
            setHintLetters(stateToLoad.hintLetters || {});
          }
        }
      } catch (e) {
        console.error("Failed to load game state:", e);
      }
      
      isInitialMount.current = false;
    };

    loadState();
  }, [gameDay, backendUserId, isLoaded]);

  // Oyun durumunu backend'e kaydet - sadece kullanıcı aksiyon aldığında
  useEffect(() => {
    // İlk yüklemede kaydetme
    if (isInitialMount.current) {
      return;
    }
    
    if (!isLoaded || games.length === 0 || !gameDay || !backendUserId) {
      return;
    }
    
    // En az bir tahmin yapılmış mı kontrol et
    const hasAnyGuess = games.some((g) => g.guesses.length > 0);
    if (!hasAnyGuess) {
      return; // Hiç tahmin yoksa kaydetme
    }

    const allWon = games.every((g) => g.gameState === "won");
    const allLost = games.every((g) => g.gameState === "lost");
    const isFinished = allWon || allLost;

    const stateToSave = {
      games,
      currentGuess,
      revealedHints,
      hintLetters
    };

    // Save to Encore
    saveGameState(
      backendUserId,
      "quordle",
      gameDay,
      stateToSave as any,
      isFinished,
      allWon
    );
    
    // Update game status cache if won or lost
    if (allWon) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'won' }));
    } else if (allLost) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'lost' }));
    }
  }, [games, currentGuess, revealedHints, hintLetters, gameDay, backendUserId, isLoaded]);

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
      // Backend tamamla
      if (backendUserId) {
        completeLevelBackend(backendUserId, lid);
      }
      
      setLevelCompleted(true);
    }
    // Günlük tamamlamayı veritabanına kaydet - sadece yeni kazanılan oyunlar için
    if (allWon && mode !== "levels" && backendUserId && gameDay && !dailyCompleted && !dailyInitialMount.current) {
      const handleWin = async () => {
        // completionDate: Kullanıcının oyunu tamamladığı an (bugün)
        const completionDate = formatDate(new Date());
        // gameDate: Oyunun hangi güne ait olduğu
        const gameDateValue = selectedDate ? formatDate(parseDate(selectedDate)) : completionDate;
        await markDailyGameCompleted(backendUserId, "quordle", gameDay, completionDate, gameDateValue);
        setDailyCompleted(true);
        setGameStatusCache(prev => ({ ...prev, [gameDay]: 'won' }));
        triggerDataRefresh();
      };
      handleWin();
    }
  }, [games, mode, levelId, levelCompleted, backendUserId, gameDay, dailyCompleted, selectedDate]);

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

      // Yazılabilir pozisyonları bul (hintLetters olmayanlar)
      const writablePositions = [0, 1, 2, 3, 4].filter(pos => !hintLetters[pos]);
      const maxInputLength = writablePositions.length;

      if (key === "Enter") {
        if (currentGuess.length === maxInputLength) {
          // Full guess oluştur (Hint harfleri + Kullanıcı girdisi)
          let fullGuess = "";
          let userIdx = 0;
          for (let i = 0; i < 5; i++) {
             if (hintLetters[i]) {
                 fullGuess += hintLetters[i];
             } else {
                 fullGuess += currentGuess[userIdx] || "";
                 userIdx++;
             }
          }

          if (allWords.includes(fullGuess)) {
            setGames((prevGames) => {
              const newGames = prevGames.map((game) => {
                if (game.gameState !== "playing") return game;

                const evaluated = evaluateGuess(fullGuess, game.targetWord);
                const newGuesses = [...game.guesses, evaluated];

                let newState: "playing" | "won" | "lost" = "playing";
                if (fullGuess === game.targetWord) {
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
            // Hintleri temizle - böylece bir sonraki satıra "kaymazlar"
            setHintLetters({});
            setRevealedHints([[], [], [], []]);
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
          // Silinen harfin GERÇEK grid üzerindeki pozisyonunu bul (animasyon için)
          const deletedUserCharIndex = currentGuess.length - 1;
          const realGridIndex = writablePositions[deletedUserCharIndex];
          
          setDeletingIndex(realGridIndex);
          setTimeout(() => {
            setDeletingIndex(null);
            setCurrentGuess(prev => prev.slice(0, -1));
          }, 100);
        }
      } else if (
        key.length === 1 &&
        /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key) &&
        currentGuess.length < maxInputLength
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
        // Eklenen harfin gerçek grid pozisyonunu bul
        const newUserCharIndex = currentGuess.length;
        const realGridIndex = writablePositions[newUserCharIndex];
        
        setLetterAnimationKeys(prev => {
          const newKeys = [...prev];
          newKeys[realGridIndex] = (prev[realGridIndex] || 0) + 1;
          return newKeys;
        });

        setCurrentGuess((prev) => (prev + upperKey));
      }
    },
    [currentGuess, games, allWords, hintLetters]
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
    if (absentInGames.size > 0) return "bg-slate-800 text-slate-500";
    // Henüz denenmemiş - açık gri arka plan
    return "bg-slate-600 text-slate-200";
  };

  const resetGame = async () => {
    // Prevent immediate save effect during reset
    isInitialMount.current = true;

    let selectedWords: string[] = [];
    
    // Günlük kelimeleri al (mevcut tarihe göre)
    if (gameDay && dailyEntries.length > 0) {
      const entry = dailyEntries[gameDay - 1];
      if (entry) {
        selectedWords = entry.words.map(w => toTurkishUpperCase(w));
      }
    }

    // Eğer günlük mod değilse veya kelime bulunamadıysa rastgele seç
    if (selectedWords.length !== 4) {
      if (dailyEntries.length > 0) {
        const randomEntry = dailyEntries[Math.floor(Math.random() * dailyEntries.length)];
        selectedWords = randomEntry.words.map(w => toTurkishUpperCase(w));
      }
    }

    const newGames: WordleGame[] = selectedWords.map((word) => ({
      targetWord: word,
      guesses: [],
      gameState: "playing",
    }));

    setGames(newGames);
    setCurrentGuess("");
    setRevealedHints([[], [], [], []]);
    setHintLetters({});
    setMessage("");
    setDailyCompleted(false);
    setLevelCompleted(false);
    
    // Delete from backend if logged in
    if (backendUserId && gameDay) {
      // Delete gamestate
      await deleteGameState(backendUserId, "quordle", gameDay);
      
      // Also unmark from daily completed (removes checkmark from games page)
      await unmarkDailyGameCompleted(backendUserId, "quordle", gameDay);
      
      // Clear any potential stale localStorage for Games page
      localStorage.removeItem(`quordle-game-${gameDay}`);

      // Update modal cache - remove this game from completed/playing status
      setGameStatusCache(prev => {
        const updated = { ...prev };
        delete updated[gameDay];
        return updated;
      });
      
      // Trigger data refresh for games page
      triggerDataRefresh();
    }

    setTimeout(() => {
      isInitialMount.current = false;
    }, 500);
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setShowDebugModal(false)}
            />
            <div className="relative z-10 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-sm w-full shadow-2xl">
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
          </div>
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
                    
                    // Check game status from cache (backend data)
                    const cachedStatus = gameStatusCache[gameNumber];
                    const status = cachedStatus ? cachedStatus : "not_played" as const;
                    
                    // Check if this is the currently active game
                    const isCurrentGame = gameNumber === gameDay;

                    return (
                      <button
                        key={entry.date}
                        onClick={() => {
                          const [d, m, y] = entry.date.split('.');
                          const isoDate = `${y}-${m}-${d}`;
                          router.push(`/games/quordle?date=${isoDate}`);
                          setShowPreviousGames(false);
                        }}
                        className={`w-full rounded-lg p-4 transition-colors flex items-center justify-between group ${
                          isCurrentGame 
                            ? 'bg-blue-900/50 border-2 border-blue-500 hover:bg-blue-900/70' 
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Status Icon */}
                          <div className="w-8 h-8 flex items-center justify-center">
                            {status === "won" && (
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-900">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                            {status === "lost" && (
                                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white">
                                    <X className="w-4 h-4" />
                                </div>
                            )}
                            {status === "playing" && (
                                <div className="w-6 h-6 rounded-full border-2 border-yellow-500 flex items-center justify-center text-yellow-500">
                                    <span className="text-xs font-bold">...</span>
                                </div>
                            )}
                            {status === "not_played" && (
                                <div className="w-6 h-6 rounded-full border-2 border-slate-500" />
                            )}
                          </div>

                          {/* Game Info */}
                          <div className="text-left">
                            <div className="flex items-center gap-3">
                              <span className={`text-lg font-bold ${
                                status === 'won' ? 'text-emerald-400' : 
                                status === 'lost' ? 'text-red-400' : 
                                status === 'playing' ? 'text-yellow-400' : 
                                'text-slate-400'
                              }`}>
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
          </div>
        )}

        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(mode === "levels" ? "/levels" : searchParams.get("date") ? `/games?date=${searchParams.get("date")}` : "/games")}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-2xl font-bold">QuadGrid</h1>

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 w-full px-10">
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
                            
                            let hintLetter = null;
                            let hintColorClass = "";
                            
                            if (isHintPosition) {
                                // Global zorlanan harf varsa onu, yoksa hedef kelimede o pozisyonu kullan
                                const globalHintLetter = hintLetters[col];
                                hintLetter = globalHintLetter || game.targetWord[col];
                                
                                // Rengi hesapla
                                if (hintLetter === game.targetWord[col]) {
                                    hintColorClass = "bg-emerald-900 border-1 border-emerald-500 text-emerald-100";
                                } else if (game.targetWord.includes(hintLetter)) {
                                    hintColorClass = "bg-yellow-900 border-1 border-yellow-500 text-yellow-100";
                                } else {
                                    hintColorClass = "bg-slate-800 border-1 border-slate-500 text-slate-400";
                                }
                            }
                            
                            // Kullanıcının yazdığı harf (bu pozisyondaki - writable mapping)
                            const writablePositions = [0, 1, 2, 3, 4].filter(pos => !hintLetters[pos]);
                            const writableIndex = writablePositions.indexOf(col);
                            let userLetter = "";
                            
                            if (writableIndex !== -1) {
                                userLetter = currentGuess[writableIndex] || "";
                            }
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
                                    ? hintColorClass
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
        {games.some(g => g.gameState === "playing") && <div className="h-16" />}

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
