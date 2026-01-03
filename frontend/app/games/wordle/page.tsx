"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  HelpCircle,
  CalendarDays,
  Settings,
  RotateCcw,
  Bug,
  Map,
  Diamond,
  ArrowBigRight,
} from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import HowToPlayModal from "./HowToPlayModal";
import PreviousGamesModal from "./PreviousGamesModal";
import ConfirmJokerModal from "@/components/ConfirmJokerModal";
import { triggerDataRefresh } from "@/components/Header";
import { completeLevel as completeLevelLocal, getCurrentLevel } from "@/lib/levelProgress";
import { unmarkGameCompleted, formatDate } from "@/lib/dailyCompletion";
import { getUserStars } from "@/lib/userStars";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted, saveGameState, getGameState as getEncoreGameState } from "@/app/games/actions";
import { useUserStats } from "@/hooks/useProfileData";
import { useHint } from "@/app/store/actions";

type LetterState = "correct" | "present" | "absent" | "empty";

interface Letter {
  letter: string;
  state: LetterState;
}

// Sabitler - daily_wordle.json ile eşleşmeli
const FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025 (ay 0-indexed)
const FIRST_GAME_NUMBER = 1;

// Bugünkü oyun numarasını hesapla
function getTodaysGameNumber(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(FIRST_GAME_DATE);
  firstDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return FIRST_GAME_NUMBER + daysDiff;
}

// Oyun numarasından güzel tarih formatı
function getFormattedDateFromGameNumber(gameNumber: number): string {
  const daysDiff = gameNumber - FIRST_GAME_NUMBER;
  const date = new Date(FIRST_GAME_DATE);
  date.setDate(date.getDate() + daysDiff);

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const day = date.getDate();
  const month = monthNames[date.getMonth()];

  return `${day} ${month}`;
}

// En son oynanan oyun numarasını bul
function getLastPlayedGameNumber(): number | null {
  if (typeof window === "undefined") return null;

  let lastPlayedGame: number | null = null;
  const todayGameNumber = getTodaysGameNumber();

  for (let i = 0; i <= 365; i++) {
    const gameNum = todayGameNumber - i;
    if (gameNum < FIRST_GAME_NUMBER) break;

    const saved = localStorage.getItem(`wordle-game-${gameNum}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          (parsed.guesses && parsed.guesses.length > 0) ||
          parsed.gameWon ||
          parsed.gameLost
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

// Oyun numarasına göre deterministik kelime seç
function getWordForGame(gameNumber: number, words: string[]): string {
  // Deterministik rastgele sayı üret (oyun numarasına göre)
  const seed = gameNumber;
  const index = seed % words.length;
  return words[index].toUpperCase();
}

// Levels modunda tamamlanmamış en son oyunu bul
function getNextUncompletedGame(): number {
  const todayGame = getTodaysGameNumber();
  
  // Bugünden geriye doğru git, tamamlanmamış ilk oyunu bul
  for (let gameNum = todayGame; gameNum >= 1; gameNum--) {
    const saved = localStorage.getItem(`wordle-game-${gameNum}`);
    if (!saved) {
      return gameNum; // Hiç oynanmamış
    }
    try {
      const parsed = JSON.parse(saved);
      // Oyun kazanılmamış veya kaybedilmemişse bu oyunu döndür
      if (!parsed.gameWon && !parsed.gameLost) {
        return gameNum;
      }
    } catch (e) {
      return gameNum; // Parse hatası varsa bu oyunu döndür
    }
  }
  
  // Tüm oyunlar tamamlandıysa bugünkü oyunu döndür
  return todayGame;
}

const Wordle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi
  
  const [allWords, setAllWords] = useState<string[]>([]); // Tüm geçerli kelimeler (tahmin doğrulama)
  const [targetWords, setTargetWords] = useState<string[]>([]); // Hedef kelime havuzu
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<Letter[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [shakeRow, setShakeRow] = useState(false);
  const [showInvalidWordToast, setShowInvalidWordToast] = useState(false);
  const [letterAnimationKeys, setLetterAnimationKeys] = useState<number[]>([0, 0, 0, 0, 0]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showConfirmHint, setShowConfirmHint] = useState(false);
  const [showConfirmSkip, setShowConfirmSkip] = useState(false);
  
  // Joker ve coin state'leri - Backend hook ile
  const { hints: backendHints, giveups: backendSkips, stars: backendCoins, isLoading: isStatsLoading } = useUserStats(backendUserId || undefined);
  const [localHints, setLocalHints] = useState(0);
  const [localSkips, setLocalSkips] = useState(0);
  const [localCoins, setLocalCoins] = useState(0);
  const [revealedHints, setRevealedHints] = useState<number[]>([]); // Açılan harf pozisyonları
  
  // Use backend stats if logged in, otherwise local
  const hints = backendUserId ? backendHints : localHints;
  const skips = backendUserId ? backendSkips : localSkips;
  const coins = backendUserId ? backendCoins : localCoins;
  
  // Joker ve coin değerlerini yükle (Local Storage fallback)
  useEffect(() => {
    if (backendUserId) return; // Logged in users use hook
    
    const savedHints = localStorage.getItem("everydle-hints");
    const savedSkips = localStorage.getItem("everydle-giveups");
    if (savedHints) setLocalHints(parseInt(savedHints));
    if (savedSkips) setLocalSkips(parseInt(savedSkips));
    setLocalCoins(getUserStars());
    
    const handleStorageChange = () => {
      const h = localStorage.getItem("everydle-hints");
      const s = localStorage.getItem("everydle-giveups");
      if (h) setLocalHints(parseInt(h));
      if (s) setLocalSkips(parseInt(s));
      setLocalCoins(getUserStars());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [backendUserId]);
  
  // İpucu kullanma fonksiyonu
  const handleUseHint = async () => {
    if (hints <= 0 || !targetWord || gameState !== "playing") return;
    
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
    const unopenedPositions = [0, 1, 2, 3, 4].filter(pos => 
      !revealedHints.includes(pos) && !correctPositions.includes(pos)
    );
    
    if (unopenedPositions.length === 0) return; // Tüm harfler zaten açık veya bulunmuş
    
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
      // Local storage update
      const newHintCount = localHints - 1;
      localStorage.setItem("everydle-hints", newHintCount.toString());
      setLocalHints(newHintCount);
      triggerDataRefresh();
    }
    
    // Rastgele bir pozisyon seç
    const randomIndex = Math.floor(Math.random() * unopenedPositions.length);
    const positionToReveal = unopenedPositions[randomIndex];
    
    // Pozisyonu aç
    setRevealedHints(prev => [...prev, positionToReveal]);
  };

  // Oyun numarası - mod'a göre belirle
  const [gameNumber, setGameNumber] = useState(getTodaysGameNumber());
  
  // Tarihten oyun numarası hesapla
  const getGameNumberFromDate = (dateStr: string): number => {
    // Parse YYYY-MM-DD format
    const parts = dateStr.split('-');
    if (parts.length !== 3) return getTodaysGameNumber();
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return getTodaysGameNumber();
    
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);
    
    const firstDate = new Date(FIRST_GAME_DATE);
    firstDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor(
      (targetDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return FIRST_GAME_NUMBER + daysDiff;
  };
  
  // Mode'a göre oyun numarasını belirle
  useEffect(() => {
    const dateParam = searchParams.get("date");
    
    if (mode === "days" && dateParam) {
      // Days modunda URL'deki tarihi kullan
      const gameNum = getGameNumberFromDate(dateParam);
      setGameNumber(gameNum);
    } else if (mode === "levels") {
      const nextGame = getNextUncompletedGame();
      setGameNumber(nextGame);
    } else {
      // Practice modunda en son oynanan veya bugünkü
      const lastPlayed = getLastPlayedGameNumber();
      setGameNumber(lastPlayed || getTodaysGameNumber());
    }
  }, [mode, searchParams]);
  
  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    if (gameState === "won" && mode === "levels" && levelId && !levelCompleted) {
      const lid = parseInt(levelId);
      // Yerel tamamla
      completeLevelLocal(lid);
      
      // Backend tamamla
      if (backendUserId) {
        completeLevelBackend(backendUserId, lid);
      }
      
      setLevelCompleted(true);
    }
  }, [gameState, mode, levelId, levelCompleted, backendUserId]);

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
  
  // Oyun kazanıldığında günlük tamamlamayı işaretle (tüm modlarda) - sadece yeni kazanılan oyunlar için
  useEffect(() => {
    if (gameState === "won" && backendUserId && !dailyCompleted && !dailyInitialMount.current) {
      // Days modunda URL'deki tarihi kullan, yoksa bugünü kullan
      const dateParam = searchParams.get("date");
      const completionDate = mode === "days" && dateParam ? dateParam : formatDate(new Date());
      
      // Backend'e günlük tamamlamayı kaydet
      markDailyGameCompleted(backendUserId, "wordle", gameNumber, completionDate);
      setDailyCompleted(true);
    }
  }, [gameState, mode, searchParams, backendUserId, gameNumber, dailyCompleted]);

  // Note: isInitialMount is defined here and used for localStorage save/load
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

        // Günlük kelimeler JSON'u yükle
        const dailyResponse = await fetch("/wordle/daily_wordle.json");
        const dailyData = await dailyResponse.json();
        
        // Bugünün tarihini DD.MM.YYYY formatında al
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const todayFormatted = `${day}.${month}.${year}`;
        
        // Bugünün kelimesini bul
        const todayWord = dailyData.daily_words.find(
          (entry: { date: string; word: string }) => entry.date === todayFormatted
        );
        
        if (todayWord) {
          setTargetWord(toTurkishUpperCase(todayWord.word));
        } else {
          // Bugün için kelime yoksa rastgele seç
          const randomWord = dailyData.daily_words[
            Math.floor(Math.random() * dailyData.daily_words.length)
          ];
          setTargetWord(toTurkishUpperCase(randomWord.word));
        }
        
        // Tüm günlük kelimeleri target words olarak kaydet (eski API uyumu için)
        const targetWordList = dailyData.daily_words.map(
          (entry: { date: string; word: string }) => toTurkishUpperCase(entry.word)
        );
        setTargetWords(targetWordList);
      } catch (err) {
        console.error("Kelimeler yüklenemedi:", err);
        // Fallback kelimeler
        const fallback = [
          "KALEM",
          "KİTAP",
          "MASAJ",
          "KAPAK",
          "ELMAS",
        ];
        setAllWords(fallback);
        setTargetWords(fallback);
        setTargetWord(fallback[0]);
      }
    };
    loadWords();
  }, []);

  // Oyun numarası değiştiğinde hedef kelimeyi güncelle
  useEffect(() => {
    const updateTargetWord = async () => {
      if (targetWords.length === 0) return;
      
      try {
        const dailyResponse = await fetch("/wordle/daily_wordle.json");
        const dailyData = await dailyResponse.json();
        
        // Oyun numarasından tarihi hesapla
        const daysDiff = gameNumber - FIRST_GAME_NUMBER;
        const gameDate = new Date(FIRST_GAME_DATE);
        gameDate.setDate(gameDate.getDate() + daysDiff);
        
        const day = String(gameDate.getDate()).padStart(2, '0');
        const month = String(gameDate.getMonth() + 1).padStart(2, '0');
        const year = gameDate.getFullYear();
        const dateFormatted = `${day}.${month}.${year}`;
        
        // Bu tarihin kelimesini bul
        const wordEntry = dailyData.daily_words.find(
          (entry: { date: string; word: string }) => entry.date === dateFormatted
        );
        
        if (wordEntry) {
          setTargetWord(toTurkishUpperCase(wordEntry.word));
        } else {
          // Kelime yoksa deterministik seçim
          const word = getWordForGame(gameNumber, targetWords);
          setTargetWord(word);
        }
      } catch (err) {
        // Hata durumunda deterministik seçim
        const word = getWordForGame(gameNumber, targetWords);
        setTargetWord(word);
      }
    };
    
    updateTargetWord();
  }, [gameNumber, targetWords]);

  // Oyun durumunu yükle - oyun numarası değiştiğinde
  useEffect(() => {
    isInitialMount.current = true;

    setGuesses([]);
    setGameState("playing");
    setCurrentGuess("");
    setMessage("");
    setRevealedHints([]); // İpucu ile açılan harfleri sıfırla

    const loadState = async () => {
      let stateToLoad = null;

      // 1. Try Encore first if logged in
      if (backendUserId) {
        const response = await getEncoreGameState(backendUserId, "wordle", gameNumber);
        if (response.data?.success && response.data.data) {
          stateToLoad = response.data.data.state as any;
        }
      }

      // 2. Try LocalStorage if Encore failed or not logged in
      if (!stateToLoad) {
        const savedGame = localStorage.getItem(`wordle-game-${gameNumber}`);
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
        setGameState(
          stateToLoad.gameWon ? "won" : stateToLoad.gameLost ? "lost" : "playing"
        );
        setCurrentGuess(stateToLoad.currentGuess || "");
        setRevealedHints(stateToLoad.revealedHints || []); // Kaydedilmiş ipucuları yükle
      }

      setTimeout(() => {
        isInitialMount.current = false;
      }, 0);
    };

    loadState();
  }, [gameNumber, allWords, targetWords, backendUserId]);

  // Oyun durumunu kaydet
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (targetWord) {
      const savedState = {
        gameNumber,
        targetWord,
        guesses,
        gameWon: gameState === "won",
        gameLost: gameState === "lost",
        currentGuess,
        revealedHints, // İpucu ile açılan harfleri kaydet
      };

      // Always save to localStorage regardless of game state
      localStorage.setItem(`wordle-game-${gameNumber}`, JSON.stringify(savedState));

      // Save to Encore if logged in
      if (backendUserId) {
        saveGameState(
          backendUserId,
          "wordle",
          gameNumber,
          savedState as any,
          gameState !== "playing",
          gameState === "won"
        );
      }
    }
  }, [gameNumber, guesses, gameState, currentGuess, targetWord, revealedHints, backendUserId]);

  const evaluateGuess = (guess: string): Letter[] => {
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
      if (gameState !== "playing" || !targetWord) return;

      // Kullanıcının yazabileceği pozisyon sayısı (hint olmayan)
      const writablePositions = [0, 1, 2, 3, 4].filter(pos => !revealedHints.includes(pos));
      const userInputLength = currentGuess.replace(/ /g, "").length; // Boşlukları sayma

      if (key === "Enter") {
        // Tam kelimeyi oluştur: hint harfleri + kullanıcı harfleri
        let fullGuess = "";
        let userCharIndex = 0;
        const userChars = currentGuess.replace(/ /g, ""); // Kullanıcının yazdığı karakterler
        
        for (let i = 0; i < 5; i++) {
          if (revealedHints.includes(i)) {
            fullGuess += targetWord[i]; // Hint harfi
          } else if (userCharIndex < userChars.length) {
            fullGuess += userChars[userCharIndex];
            userCharIndex++;
          }
        }
        
        if (fullGuess.length === 5) {
          if (allWords.includes(fullGuess)) {
            const evaluated = evaluateGuess(fullGuess);
            const newGuesses = [...guesses, evaluated];
            setGuesses(newGuesses);

            if (fullGuess === targetWord) {
              setGameState("won");
              setMessage("");
            } else if (newGuesses.length >= 6) {
              setGameState("lost");
              setMessage("");
            } else {
              setCurrentGuess("");
              setRevealedHints([]); // Yeni satır için hintleri temizle
            }
          } else {
            // Shake animasyonu ve toast göster
            setShakeRow(true);
            setShowInvalidWordToast(true);
            setTimeout(() => setShakeRow(false), 600);
            setTimeout(() => setShowInvalidWordToast(false), 2000);
          }
        }
      } else if (key === "Backspace") {
        if (userInputLength > 0) {
          const deleteIdx = userInputLength - 1;
          setDeletingIndex(deleteIdx);
          setTimeout(() => {
            setDeletingIndex(null);
            // Sadece kullanıcı karakterlerini kısalt
            const userChars = currentGuess.replace(/ /g, "");
            setCurrentGuess(userChars.slice(0, -1));
          }, 100);
        }
      } else if (
        key.length === 1 &&
        /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key) &&
        userInputLength < writablePositions.length
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

        // Pop animasyonu için harfin key'ini güncelle (yeniden mount için)
        const newIndex = userInputLength;
        setLetterAnimationKeys(prev => {
          const newKeys = [...prev];
          newKeys[writablePositions[newIndex]] = prev[writablePositions[newIndex]] + 1;
          return newKeys;
        });
        
        setCurrentGuess((prev) => (prev.replace(/ /g, "") + upperKey));
      }
    },
    [currentGuess, guesses, targetWord, gameState, allWords, revealedHints]
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
    // Tüm tahminlerde bu harfin durumunu kontrol et
    let hasCorrect = false;
    let hasPresent = false;
    let hasAbsent = false;

    guesses.forEach((guess) => {
      guess.forEach((letter) => {
        // I ve İ'yi doğru şekilde karşılaştır (toUpperCase kullanmadan)
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

  if (!targetWord || allWords.length === 0) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        {/* Debug Modal */}
        {showDebugModal && targetWord && (
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
                  {targetWord}
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

            <h1 className="text-2xl font-bold">Five Letters</h1>

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
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
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
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          localStorage.removeItem(`wordle-game-${gameNumber}`);
                          setGuesses([]);
                          setGameState("playing");
                          setCurrentGuess("");
                          setMessage("");
                          setRevealedHints([]);
                          unmarkGameCompleted("wordle");
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

          {/* Bottom row: Game info */}
          {gameState === "playing" && (
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
                Tahmin:{" "}
                <span className="text-slate-400">{guesses.length}/6</span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Lost State */}
        {(gameState === "won" || gameState === "lost") && (
          <div
            className={`mb-6 bg-slate-800 rounded-lg p-6 text-center border-2 ${
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

            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Oyun: <span className="text-emerald-400">#{gameNumber}</span>
                {gameNumber !== getTodaysGameNumber() && (
                  <span className="text-slate-600 ml-1">
                    ({getFormattedDateFromGameNumber(gameNumber)})
                  </span>
                )}
              </span>
              <span className="text-slate-500">
                Tahmin:{" "}
                <span className="text-slate-400">{guesses.length}/6</span>
              </span>
            </div>

            <p className="text-lg mb-4">
              {gameState === "lost" ? "Kelime" : "Kelimeyi buldunuz"}:{" "}
              <span
                className={`font-bold ${
                  gameState === "lost" ? "text-slate-300" : "text-emerald-500"
                }`}
              >
                {targetWord}
              </span>
            </p>

            <div className="flex flex-col gap-2">
              {mode === "levels" ? (
                <button
                  onClick={() => router.push('/games')}
                  className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Map className="w-4 h-4" />
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

        {/* Message */}
        {message && (
          <div className="mb-4 bg-slate-800 border border-slate-700 rounded-md px-4 py-3 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

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
            // Oyun devam ediyorsa ve bu satır mevcut tahmin satırıysa
            const isCurrentRow = gameState === "playing" && row === guesses.length;

            return (
              <div 
                key={row} 
                className={`flex gap-1.5 ${isCurrentRow && shakeRow ? 'animate-shake' : ''}`}
              >
                {[...Array(5)].map((_, col) => {
                  if (isCurrentRow) {
                    // Eğer bu pozisyon ipucu ile açıldıysa, yeşil harf göster
                    if (revealedHints.includes(col)) {
                      return (
                        <div
                          key={`hint-${col}`}
                          className="flex-1 aspect-square bg-emerald-600 rounded flex items-center justify-center text-white text-2xl font-bold px-0.5"
                        >
                          {targetWord[col]}
                        </div>
                      );
                    }
                    
                    // Kullanıcının yazdığı harfleri hint olmayan pozisyonlara yerleştir
                    const writablePositions = [0, 1, 2, 3, 4].filter(pos => !revealedHints.includes(pos));
                    const positionIndex = writablePositions.indexOf(col);
                    const userChars = currentGuess.replace(/ /g, "");
                    const letter = positionIndex >= 0 && positionIndex < userChars.length ? userChars[positionIndex] : "";
                    
                    const isDeleting = positionIndex === deletingIndex;
                    return (
                      <div
                        key={`${col}-${letterAnimationKeys[col]}`}
                        className={`flex-1 aspect-square bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-white text-2xl font-bold ${
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
                        )} rounded flex items-center justify-center text-white text-2xl font-bold`}
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
        {gameState === "playing" && (
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
                  disabled={hints <= 0 || revealedHints.length >= 5}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hints > 0 && revealedHints.length < 5
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

        {/* Modals */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        <PreviousGamesModal
          isOpen={showPreviousGames}
          onClose={() => setShowPreviousGames(false)}
          onSelectGame={(selectedGameNumber) => {
            setGameNumber(selectedGameNumber);
          }}
        />

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

// Suspense wrapper for useSearchParams
export default function WordlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Wordle />
    </Suspense>
  );
}

