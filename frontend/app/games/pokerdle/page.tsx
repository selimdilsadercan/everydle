"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MoreVertical, HelpCircle, RotateCcw, Info, Calendar, Circle, CheckCircle2, Map as MapIcon, Bug, Diamond } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { getUserStars } from "@/lib/userStars";
import { completeLevel as completeLevelLocal } from "@/lib/levelProgress";
import { triggerDataRefresh } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { unmarkDailyGameCompleted, markDailyGameCompleted, saveGameState, getGameState as getEncoreGameState, deleteGameState, getAllCompletedGames } from "@/app/games/actions";
import { useUserStats, useDailyProgressListener } from "@/hooks/useProfileData";
import { useHint } from "@/app/store/actions";
import ConfirmJokerModal from "@/components/ConfirmJokerModal";

const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
const SUITS = ["♠", "♥", "♦", "♣"];

interface Card {
  rank: string;
  suit: string;
}

const POKER_HANDS = [
  { name: "ROYAL FLUSH", cards: ["A♠", "K♠", "Q♠", "J♠", "10♠"] },
  { name: "STRAIGHT FLUSH", cards: ["9♠", "8♠", "7♠", "6♠", "5♠"] },
  { name: "FOUR OF A KIND", cards: ["A♠", "A♥", "A♦", "A♣", "K♠"] },
  { name: "FULL HOUSE", cards: ["K♠", "K♥", "K♦", "Q♠", "Q♥"] },
  { name: "FLUSH", cards: ["A♠", "K♠", "Q♠", "J♠", "9♠"] },
  { name: "STRAIGHT", cards: ["10♠", "9♥", "8♦", "7♣", "6♠"] },
  { name: "THREE OF A KIND", cards: ["A♠", "A♥", "A♦", "K♠", "Q♠"] },
  { name: "TWO PAIR", cards: ["A♠", "A♥", "K♦", "K♣", "Q♠"] },
  { name: "ONE PAIR", cards: ["A♠", "A♥", "K♦", "Q♣", "J♠"] },
  { name: "HIGH CARD", cards: ["A♠", "K♥", "Q♦", "J♣", "9♠"] },
];

type CardState = "correct" | "present" | "absent";

interface CardGuess {
  card: string;
  state: CardState;
}

interface DailyHand {
  date: string;
  name: string;
  cards: string[];
}

// Sabitler - hands.json ile eşleşmeli
const FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025 (ay 0-indexed)
const FIRST_GAME_NUMBER = 1;

// Tarihten oyun numarasını hesapla
function getGameNumberFromDate(targetDate: Date): number {
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);

  const firstDate = new Date(FIRST_GAME_DATE);
  firstDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor(
    (date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return FIRST_GAME_NUMBER + daysDiff;
}

// Bugünkü oyun numarasını hesapla
function getTodaysGameNumber(): number {
  return getGameNumberFromDate(new Date());
}

// String tarihten (YYYY-MM-DD) oyun numarası hesapla
function getGameNumberFromDateStr(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return getTodaysGameNumber();
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return getTodaysGameNumber();
  
  return getGameNumberFromDate(new Date(year, month, day));
}

// Oyun numarasından güzel tarih formatı
function getFormattedDateFromGameNumber(gameNumber: number): string {
  const daysDiff = gameNumber - FIRST_GAME_NUMBER;
  const date = new Date(FIRST_GAME_DATE);
  date.setDate(date.getDate() + daysDiff);

  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  const day = date.getDate();
  const month = monthNames[date.getMonth()];

  return `${day} ${month}`;
}

// Levels modunda tamamlanmamış en son oyunu bul (Backend tabanlı olduğu için başlangıç numarası döner, yükleme loadState içinde yapılır)
function getNextUncompletedGame(): number {
  return getTodaysGameNumber();
}

const Pokerdle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const mode = searchParams.get("mode"); // "levels" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi

  const [dailyHands, setDailyHands] = useState<DailyHand[]>([]);
  const [targetHand, setTargetHand] = useState<{name: string; cards: string[]} | null>(null);
  const [guesses, setGuesses] = useState<CardGuess[][]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showHandsModal, setShowHandsModal] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedGuessIndex, setSelectedGuessIndex] = useState<number | null>(null);
  const [showConfirmHint, setShowConfirmHint] = useState(false);

  // Listen for daily progress updates to refresh checkmarks
  useDailyProgressListener(backendUserId || undefined);

  // Game status cache for previous games modal: 'won' | 'lost' | 'playing' | 'not_played'
  const [gameStatusCache, setGameStatusCache] = useState<Record<number, 'won' | 'lost' | 'playing' | 'not_played'>>({});
  
  // Load completed games from backend (single efficient API call)
  useEffect(() => {
    if (!backendUserId) return;
    
    const loadCompletedGamesFromBackend = async () => {
      const response = await getAllCompletedGames(backendUserId, "pokerdle", 50);
      if (response.data?.success && response.data.games) {
        const cache: Record<number, 'won' | 'lost' | 'playing' | 'not_played'> = {};
        response.data.games.forEach((g: any) => {
          cache[g.game_number] = g.is_won !== false ? 'won' : 'lost';
        });
        setGameStatusCache(cache);
      }
    };
    loadCompletedGamesFromBackend();
  }, [backendUserId]);

  // Hint system states
  // Hint system states
  const { hints: backendHints, stars: backendCoins, isLoading: isStatsLoading, giveups } = useUserStats(backendUserId || undefined);
  const [localHints, setLocalHints] = useState(0);
  const [localCoins, setLocalCoins] = useState(0);
  const [revealedHintPositions, setRevealedHintPositions] = useState<number[]>([]); // Açılan harf pozisyonları (0-4)
  
  // Use backend stats if logged in, otherwise local
  const hints = backendUserId ? backendHints : localHints;
  const coins = backendUserId ? backendCoins : localCoins;
  
  // Calculate status for each card based on all previous guesses
  const cardStatuses = (() => {
    const statuses: Record<string, CardState> = {};
    guesses.forEach(guess => {
      guess.forEach(g => {
        if (g.state === "correct") {
          statuses[g.card] = "correct";
        } else if (g.state === "present") {
          if (statuses[g.card] !== "correct") {
            statuses[g.card] = "present";
          }
        } else if (g.state === "absent") {
          if (statuses[g.card] !== "correct" && statuses[g.card] !== "present") {
            statuses[g.card] = "absent";
          }
        }
      });
    });
    return statuses;
  })();
  
  // Oyun numarasını belirle
  const [gameNumber, setGameNumber] = useState(() => {
    const dateParam = searchParams.get("date");
    if (mode === "days" && dateParam) {
      return getGameNumberFromDateStr(dateParam);
    }
    if (typeof window !== "undefined" && mode === "levels") {
      return getNextUncompletedGame();
    }
    return getTodaysGameNumber();
  });

  // URL değişikliklerini takip et
  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (mode === "days" && dateParam) {
      const newGameNum = getGameNumberFromDateStr(dateParam);
      if (newGameNum !== gameNumber) {
        setGameNumber(newGameNum);
      }
    }
  }, [mode, searchParams, gameNumber]);

  // Joker ve coin değerlerini yükle - Fallback başlangıç değerleri
  useEffect(() => {
    if (backendUserId) return; 
    setLocalHints(3);
    setLocalCoins(0);
  }, [backendUserId]);

  // isInitialMount flag
  const isInitialMount = useRef(true);
  
  // Set isInitialMount to false after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // İpucu kullanma fonksiyonu - rastgele bir pozisyonu açar
  const handleUseHint = async () => {
    if (hints <= 0 || !targetHand || gameState !== "playing") return;
    
    // Önceki tahminlerde doğru bulunan pozisyonları bul
    const correctPositions: number[] = [];
    guesses.forEach(prevGuess => {
      prevGuess.forEach((cardData, idx) => {
        if (cardData.state === "correct" && !correctPositions.includes(idx)) {
          correctPositions.push(idx);
        }
      });
    });
    
    // Açılmamış VE önceki tahminlerde doğru bulunmamış pozisyonları bul
    const unopenedPositions = [0, 1, 2, 3, 4].filter(pos => 
      !revealedHintPositions.includes(pos) && !correctPositions.includes(pos)
    );
    
    if (unopenedPositions.length === 0) return;

    // Backend call for hints if logged in
    if (backendUserId) {
      const result = await useHint(backendUserId);
      if (!result.data?.success) {
        setMessage("Hint kullanılamadı!");
        setTimeout(() => setMessage(""), 2000);
        return;
      }
      // UI update happens automatically via react-query invalidation in useHint action (if implemented)
      // or we rely on the hook to update.
      // Ideally dispatch event to refresh stats
      triggerDataRefresh(); 
    } else {
      setMessage("Hint kullanmak için giriş yapın!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    
    // Rastgele bir pozisyon seç
    const randomIndex = Math.floor(Math.random() * unopenedPositions.length);
    const positionToReveal = unopenedPositions[randomIndex];
    
    // Pozisyonu aç
    setRevealedHintPositions(prev => [...prev, positionToReveal]);
    
    // Eğer bu kart kullanıcının seçtikleri arasında varsa, oradan çıkar (çünkü artık ipucu ile sabitlendi)
    const cardToReveal = targetHand.cards[positionToReveal];
    if (selectedCards.includes(cardToReveal)) {
      setSelectedCards(prev => prev.filter(c => c !== cardToReveal));
    }
  };

  // Load daily hands from JSON
  useEffect(() => {
    const loadHands = async () => {
      try {
        const response = await fetch("/pokerdle/hands.json");
        const data: DailyHand[] = await response.json();
        setDailyHands(data);
      } catch (err) {
        console.error("Eller yüklenemedi:", err);
      }
    };
    loadHands();
  }, []);

  // Set target hand based on game number
  useEffect(() => {
    if (dailyHands.length === 0) return;
    
    // Calculate date for this game number
    const daysDiff = gameNumber - FIRST_GAME_NUMBER;
    const gameDate = new Date(FIRST_GAME_DATE);
    gameDate.setDate(gameDate.getDate() + daysDiff);
    
    const day = String(gameDate.getDate()).padStart(2, '0');
    const month = String(gameDate.getMonth() + 1).padStart(2, '0');
    const year = gameDate.getFullYear();
    const dateFormatted = `${day}.${month}.${year}`;
    
    // Find hand for this date
    const handEntry = dailyHands.find(h => h.date === dateFormatted);
    
    if (handEntry) {
      setTargetHand({ name: handEntry.name, cards: handEntry.cards });
    } else {
      // Fallback - use a random hand from POKER_HANDS
      const randomHand = POKER_HANDS[Math.floor(Math.random() * POKER_HANDS.length)];
      setTargetHand(randomHand);
    }
    
    // Load saved game state
    const loadState = async () => {
      // Set initial mount to true to prevent saving empty state
      isInitialMount.current = true;
      let stateToLoad = null;

      // 1. Try Encore first if logged in
      if (backendUserId) {
        const response = await getEncoreGameState(backendUserId, "pokerdle", gameNumber);
        if (response.data?.success && response.data.data) {
          stateToLoad = response.data.data.state as any;
        }
      }

      // 2. LocalStorage desteği kaldırıldı - tamamen backend merkezli
      if (!stateToLoad) {
        // ... starts fresh
      }

      // 3. Apply state
      if (stateToLoad) {
        setGuesses(stateToLoad.guesses || []);
        setGameState(stateToLoad.gameWon ? "won" : stateToLoad.gameLost ? "lost" : "playing");
        setRevealedHintPositions(stateToLoad.revealedHintPositions || []);
        setSelectedCards([]);
      } else {
        // Reset state for new game
        setGuesses([]);
        setGameState("playing");
        setRevealedHintPositions([]);
        setSelectedCards([]);
      }

      // Loading finished, allow saving
      setTimeout(() => {
        isInitialMount.current = false;
      }, 0);
    };

    loadState();
  }, [gameNumber, dailyHands, backendUserId]);

  // Save game state
  useEffect(() => {
    if (isInitialMount.current || !gameNumber) return;

    // En az bir tahmin yapılmış mı kontrol et
    if (guesses.length === 0) return;

    const savedState = {
      guesses,
      gameWon: gameState === "won",
      gameLost: gameState === "lost",
      revealedHintPositions
    };

    // Save to Encore if logged in
    if (backendUserId) {
      saveGameState(
        backendUserId,
        "pokerdle",
        gameNumber,
        savedState as any,
        gameState !== "playing",
        gameState === "won"
      );
    }
  }, [gameNumber, guesses, gameState, revealedHintPositions, backendUserId]);

  // dailyCompleted flag
  const [dailyCompleted, setDailyCompleted] = useState(false);

  // Update current game status cache reactively based on guesses and state
  useEffect(() => {
    if (!gameNumber || !backendUserId) return;
    
    const hasGuesses = guesses.length > 0;
    
    if (gameState === "won") {
      setGameStatusCache(prev => ({ ...prev, [gameNumber]: 'won' }));
    } else if (gameState === "lost") {
      setGameStatusCache(prev => ({ ...prev, [gameNumber]: 'lost' }));
    } else if (hasGuesses) {
      setGameStatusCache(prev => ({ ...prev, [gameNumber]: 'playing' }));
    } else {
      // No guesses and not finished -> remove from playing/won/lost to show as not_played
      setGameStatusCache(prev => {
        if (prev[gameNumber]) {
            const updated = { ...prev };
            delete updated[gameNumber];
            return updated;
        }
        return prev;
      });
    }
  }, [guesses, gameState, gameNumber, backendUserId]);

  // Oyun kazanıldığında günlük tamamlamayı veritabanına kaydet
  useEffect(() => {
    if (gameState === "won" && backendUserId && !dailyCompleted && !isInitialMount.current) {
      const handleWinAction = async () => {
        const { formatDate: formatDateLib } = await import("@/lib/dailyCompletion");
        // Calculate date for this game number
        const daysDiff = gameNumber - FIRST_GAME_NUMBER;
        const gameDate = new Date(FIRST_GAME_DATE);
        gameDate.setDate(gameDate.getDate() + daysDiff);
        
        const completionDate = formatDateLib(new Date()); // Completed today
        const gameDateValue = formatDateLib(gameDate);    // Date of the game
        
        await markDailyGameCompleted(backendUserId, "pokerdle", gameNumber, completionDate, gameDateValue);
        setDailyCompleted(true);
        triggerDataRefresh();
      };
      handleWinAction();
    }
  }, [gameState, gameNumber, backendUserId, dailyCompleted]);

  const evaluateGuess = (guess: string[]): CardGuess[] => {
    if (!targetHand) return [];

    const targetCards = [...targetHand.cards];
    const result: CardGuess[] = guess.map(card => ({ card, state: "absent" as CardState }));
    const usedExact = new Array(5).fill(false);

    // First pass: mark correct positions (exact card match at correct position)
    for (let i = 0; i < 5; i++) {
      if (guess[i] === targetCards[i]) {
        result[i].state = "correct";
        usedExact[i] = true;
      }
    }

    // Second pass: mark present cards (exact card in wrong position)
    for (let i = 0; i < 5; i++) {
      if (result[i].state === "absent") {
        const card = guess[i];
        const index = targetCards.findIndex(
          (c, idx) => c === card && !usedExact[idx]
        );
        if (index !== -1) {
          result[i].state = "present";
          usedExact[index] = true;
        }
      }
    }

    return result;
  };

  // Kartı rank'a göre sırala (büyükten küçüğe: A > K > Q > J > 10 > ... > 2)
  // Aynı rank'ta ise suit'e göre sırala: maça (♠) > kupa (♥) > karo (♦) > sinek (♣)
  const sortCardsByRank = (cards: string[]): string[] => {
    return [...cards].sort((a, b) => {
      // Rank'ı çıkar (örnek: "A♠" -> "A", "10♠" -> "10")
      const getRank = (card: string) => {
        if (card.startsWith("10")) return "10";
        return card[0];
      };

      // Suit'i çıkar (örnek: "A♠" -> "♠")
      const getSuit = (card: string) => {
        return card.slice(-1);
      };

      const rankA = getRank(a);
      const rankB = getRank(b);

      // RANKS dizisindeki index'e göre karşılaştır (büyük index = daha yüksek değer)
      const indexA = RANKS.indexOf(rankA);
      const indexB = RANKS.indexOf(rankB);

      // Önce rank'a göre sırala (büyükten küçüğe)
      if (indexB !== indexA) {
        return indexB - indexA;
      }

      // Aynı rank ise suit'e göre sırala: ♠ > ♥ > ♦ > ♣
      const suitOrder: Record<string, number> = {
        "♠": 3, // maça
        "♥": 2, // kupa
        "♦": 1, // karo
        "♣": 0, // sinek
      };

      const suitA = getSuit(a);
      const suitB = getSuit(b);

      return suitOrder[suitB] - suitOrder[suitA];
    });
  };

  const toggleCard = (rank: string, suit: string) => {
    const card = `${rank}${suit}`;

    // Check if card is already in current guess
    if (selectedCards.includes(card)) {
      const newCards = selectedCards.filter((c) => c !== card);
      setSelectedCards(sortCardsByRank(newCards));
      setMessage("");
    } else {
      // User can only pick up to (5 - total hint positions) cards
      if (selectedCards.length < (5 - revealedHintPositions.length)) {
        const newCards = [...selectedCards, card];
        setSelectedCards(sortCardsByRank(newCards));
        setMessage("");
      }
    }
  };

  const handleGuess = () => {
    if (!targetHand) return;

    // Build the full guess from hints and selected cards
    const fullGuess = Array(5).fill(null);
    revealedHintPositions.forEach(pos => {
      fullGuess[pos] = targetHand.cards[pos];
    });
    
    let userCardIdx = 0;
    for (let i = 0; i < 5; i++) {
      if (fullGuess[i] === null && userCardIdx < selectedCards.length) {
        fullGuess[i] = selectedCards[userCardIdx];
        userCardIdx++;
      }
    }

    if (fullGuess.some(c => c === null)) {
      setMessage("Select exactly 5 cards!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const evaluated = evaluateGuess(fullGuess);
    setGuesses([...guesses, evaluated]);

    if (fullGuess.every((card, idx) => card === targetHand.cards[idx])) {
      setGameState("won");
      setMessage(`Congratulations! You found ${targetHand.name}!`);
      
      // Levels modunda level'ı tamamla
      if (mode === "levels" && levelId) {
        const lid = parseInt(levelId);
        // Yerel tamamla
        completeLevelLocal(lid);
        
        // Backend tamamla
        if (backendUserId) {
          completeLevelBackend(backendUserId, lid);
        }
      }
    } else if (guesses.length === 6) {
      setGameState("lost");
      setMessage(`Game Over! The hand was ${targetHand.name}`);
    } else {
      setSelectedCards([]);
      setRevealedHintPositions([]); // Clear hints for next row like Wordle
    }
  };  

  const resetGame = async () => {
    // Prevent immediate save effect during reset
    isInitialMount.current = true;

    setGuesses([]);
    setSelectedCards([]);
    setRevealedHintPositions([]);
    setGameState("playing");
    setMessage("");
    setDailyCompleted(false);
    
    // Backend reset if logged in
    if (backendUserId && gameNumber) {
      await deleteGameState(backendUserId, "pokerdle", gameNumber);
      await unmarkDailyGameCompleted(backendUserId, "pokerdle", gameNumber);
      
      // Clear any potential stale localStorage for Games page
      localStorage.removeItem(`pokerdle-game-${gameNumber}`);

      setGameStatusCache(prev => {
        const updated = { ...prev };
        delete updated[gameNumber];
        return updated;
      });
      
      triggerDataRefresh();
    }

    setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);
  };

  const getCardColor = (state: CardState) => {
    switch (state) {
      case "correct":
        return "bg-emerald-600";
      case "present":
        return "bg-yellow-500";
      case "absent":
        return "bg-slate-600";
      default:
        return "bg-slate-800";
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === "♥" || suit === "♦" ? "text-red-500" : "text-white";
  };

  // Poker hand ranking values (higher = better)
  const HAND_RANKINGS: Record<string, number> = {
    "ROYAL FLUSH": 10,
    "STRAIGHT FLUSH": 9,
    "FOUR OF A KIND": 8,
    "FULL HOUSE": 7,
    FLUSH: 6,
    STRAIGHT: 5,
    "THREE OF A KIND": 4,
    "TWO PAIR": 3,
    "ONE PAIR": 2,
    "HIGH CARD": 1,
  };

  // Get poker hand type from cards
  const getHandType = (cards: string[]): string => {
    // Parse cards
    const parsedCards = cards.map((card) => {
      const suit = card.slice(-1);
      const rank = card.slice(0, -1);
      const rankValue =
        rank === "A"
          ? 14
          : rank === "K"
          ? 13
          : rank === "Q"
          ? 12
          : rank === "J"
          ? 11
          : parseInt(rank);
      return { rank, rankValue, suit };
    });

    // Sort by rank
    parsedCards.sort((a, b) => a.rankValue - b.rankValue);

    const ranks = parsedCards.map((c) => c.rankValue);
    const suits = parsedCards.map((c) => c.suit);

    // Check for flush
    const isFlush = suits.every((suit) => suit === suits[0]);

    // Check for straight
    const isStraight =
      ranks[4] - ranks[3] === 1 &&
      ranks[3] - ranks[2] === 1 &&
      ranks[2] - ranks[1] === 1 &&
      ranks[1] - ranks[0] === 1;
    const isAceLowStraight =
      ranks[0] === 2 &&
      ranks[1] === 3 &&
      ranks[2] === 4 &&
      ranks[3] === 5 &&
      ranks[4] === 14;

    // Count rank occurrences
    const rankCounts: Record<number, number> = {};
    ranks.forEach((rank) => {
      rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Determine hand type
    if (isFlush && isStraight && ranks[0] === 10) {
      return "ROYAL FLUSH";
    }
    if (isFlush && (isStraight || isAceLowStraight)) {
      return "STRAIGHT FLUSH";
    }
    if (counts[0] === 4) {
      return "FOUR OF A KIND";
    }
    if (counts[0] === 3 && counts[1] === 2) {
      return "FULL HOUSE";
    }
    if (isFlush) {
      return "FLUSH";
    }
    if (isStraight || isAceLowStraight) {
      return "STRAIGHT";
    }
    if (counts[0] === 3) {
      return "THREE OF A KIND";
    }
    if (counts[0] === 2 && counts[1] === 2) {
      return "TWO PAIR";
    }
    if (counts[0] === 2) {
      return "ONE PAIR";
    }
    return "HIGH CARD";
  };

  // Compare guess hand with target hand
  const getHandComparison = (
    guessCards: string[]
  ): "low" | "high" | "equal" | null => {
    if (!targetHand) return null;

    const guessHandType = getHandType(guessCards);
    const targetHandType = targetHand.name;

    const guessValue = HAND_RANKINGS[guessHandType] || 0;
    const targetValue = HAND_RANKINGS[targetHandType] || 0;

    if (guessValue < targetValue) return "low";
    if (guessValue > targetValue) return "high";
    return "equal";
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-xl">
        <header className="mb-6">
          {/* Top row: Back button | Title | Reset button */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(mode === "levels" ? "/levels" : searchParams.get("date") ? `/games?date=${searchParams.get("date")}` : "/games")}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <h1 className="text-2xl font-bold">Poker Puzzle</h1>

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
                      <Calendar className="w-5 h-5" />
                      <span>Önceki Oyunlar</span>
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                      onClick={() => {
                        resetGame();
                        setShowMenu(false);
                      }}
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Sıfırla</span>
                    </button>
                    {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowAnswerModal(true);
                          setShowMenu(false);
                        }}
                      >
                        <Bug className="w-5 h-5" />
                        <span>Cevabı Göster</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Game info */}
          {gameState === "playing" && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length} / 7</span>
              </span>
            </div>
          )}
        </header>

        {/* Answer Modal (Cevabı Göster) */}
        {showAnswerModal && targetHand && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowAnswerModal(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 text-slate-300">
                <Bug className="w-5 h-5" />
                <h3 className="text-lg font-bold">Cevabı Göster</h3>
              </div>
              
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Hedef El: <span className="text-emerald-400 font-semibold">{targetHand.name}</span></p>
                <div className="flex gap-1 justify-center">
                  {targetHand.cards.map((cardStr, idx) => {
                    const suit = cardStr.slice(-1);
                    const rank = cardStr.slice(0, -1);
                    const isRed = suit === "♥" || suit === "♦";
                    return (
                      <div
                        key={idx}
                        className="w-10 h-14 bg-emerald-600 rounded-md flex flex-col items-center justify-center border border-emerald-500"
                      >
                        <span className={isRed ? "text-red-400 font-bold text-sm" : "text-white font-bold text-sm"}>
                          {rank}
                        </span>
                        <span className={isRed ? "text-red-400 text-xs" : "text-white text-xs"}>
                          {suit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <button
                onClick={() => setShowAnswerModal(false)}
                className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Kapat
              </button>
            </div>
          </>
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

            <p className="text-sm text-slate-400 mb-3">
              {gameState === "lost" ? "El" : "Eli buldunuz"}: <span className="font-semibold text-slate-200">{targetHand?.name}</span>
            </p>

            {/* Visual cards of the correct hand */}
            <div className="flex gap-1 justify-center mb-4">
              {targetHand?.cards.map((cardStr, idx) => {
                // Parse card string like "A♠" or "10♥"
                const suit = cardStr.slice(-1);
                const rank = cardStr.slice(0, -1);
                const isRed = suit === "♥" || suit === "♦";
                return (
                  <div
                    key={idx}
                    className="w-10 h-14 bg-emerald-600 rounded-md flex flex-col items-center justify-center border border-emerald-500"
                  >
                    <span className={isRed ? "text-red-400 font-bold text-sm" : "text-white font-bold text-sm"}>
                      {rank}
                    </span>
                    <span className={isRed ? "text-red-400 text-xs" : "text-white text-xs"}>
                      {suit}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>



            {/* Levels modunda 'Bölümlere Devam Et' butonu */}
            {mode === "levels" && gameState === "won" && (
              <button
                onClick={() => router.back()}
                className="mt-3 px-6 py-2 rounded-md bg-slate-700 text-sm font-semibold hover:bg-slate-600 transition-colors cursor-pointer flex items-center gap-2 mx-auto"
              >
                <MapIcon className="w-4 h-4" />
                Bölümlere Devam Et
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {message && gameState === "playing" && (
          <div className="mb-4 bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-center">
            <p className="text-sm text-slate-300">{message}</p>
          </div>
        )}

        {/* 6x5 Grid - Guesses and Current Selection - Scrollable */}
        <div className="mb-6">
          {/* Scrollable container for grid + feedback - full height when game is finished */}
          <div className={`${gameState === "playing" ? "max-h-[140px] overflow-y-scroll" : ""} overflow-x-hidden pr-1`}>
            <div className="flex gap-4 items-start justify-center">
              {/* Grid */}
              <div className="space-y-2 min-w-[200px]">
              {/* Previous guesses */}
              {guesses.map((guess, row) => (
                <div key={row} className="grid grid-cols-5 gap-2">
                  {guess.map((cardData, col) => {
                    const suit = cardData.card.slice(-1);
                    const rank = cardData.card.slice(0, -1);
                    return (
                      <div
                        key={`${row}-${col}`}
                        className={`aspect-[0.75] ${getCardColor(
                          cardData.state
                        )} rounded flex flex-col items-center justify-center text-slate-100 border ${
                          cardData.state === "correct"
                            ? "border-emerald-400"
                            : cardData.state === "present"
                            ? "border-yellow-400"
                            : "border-slate-500"
                        }`}
                      >
                        <div
                          className={`text-base font-bold leading-tight ${getSuitColor(
                            suit
                          )}`}
                        >
                          {rank}
                        </div>
                        <div
                          className={`text-lg leading-tight ${getSuitColor(
                            suit
                          )}`}
                        >
                          {suit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Current guess row */}
              {gameState === "playing" && (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, col) => {
                    // Check if this position is a hint
                    const isHintPos = revealedHintPositions.includes(col);
                    
                    let card = null;
                    if (isHintPos) {
                      card = targetHand?.cards[col];
                    } else {
                      // Find which user selected card goes here
                      const precedingHintCount = revealedHintPositions.filter(p => p < col).length;
                      const userIdx = col - precedingHintCount;
                      card = selectedCards[userIdx];
                    }

                    if (card) {
                      const suit = card.slice(-1);
                      const rank = card.slice(0, -1);
                      return (
                        <div
                          key={`current-${col}`}
                          className={`aspect-[0.75] rounded flex flex-col items-center justify-center ${
                            isHintPos 
                              ? "bg-emerald-600 border-2 border-emerald-400" 
                              : "bg-slate-800 border border-slate-600"
                          }`}
                        >
                          <div
                            className={`text-base font-bold leading-tight ${
                              isHintPos ? "text-white" : getSuitColor(suit)
                            }`}
                          >
                            {rank}
                          </div>
                          <div
                            className={`text-lg leading-tight ${
                              isHintPos ? "text-white" : getSuitColor(suit)
                            }`}
                          >
                            {suit}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`empty-${col}`}
                        className="aspect-[0.75] bg-slate-800 rounded border border-slate-700"
                      />
                    );
                  })}
                </div>
              )}

              {/* Empty rows to fill 6x5 */}
              {Array.from({
                length: Math.max(
                  0,
                  7 - guesses.length - (gameState === "playing" ? 1 : 0)
                ),
              }).map((_, row) => (
                <div
                  key={`empty-row-${row}`}
                  className="grid grid-cols-5 gap-2"
                >
                  {Array.from({ length: 5 }).map((_, col) => (
                    <div
                      key={`empty-${row}-${col}`}
                      className="aspect-[0.75] bg-slate-800 rounded border border-slate-700"
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Feedback messages - outside grid */}
            <div className="space-y-[11px]">
              {Array.from({ length: 7 }).map((_, row) => {
                const guess = guesses[row];
                if (guess) {
                  const guessCards = guess.map((g) => g.card);
                  const comparison = getHandComparison(guessCards);
                  const handType = getHandType(guessCards);
                  
                  // Turkish hand type names
                  const handTypesTR: Record<string, string> = {
                    "ROYAL FLUSH": "Royal Flush",
                    "STRAIGHT FLUSH": "Straight Flush",
                    "FOUR OF A KIND": "Four of a Kind",
                    "FULL HOUSE": "Full House",
                    "FLUSH": "Flush",
                    "STRAIGHT": "Straight",
                    "THREE OF A KIND": "Three of a Kind",
                    "TWO PAIR": "Two Pair",
                    "ONE PAIR": "Pair",
                    "HIGH CARD": "High Card",
                  };
                  
                  const handTypeTR = handTypesTR[handType] || handType;
                  
                  const handleClick = () => {
                    setSelectedGuessIndex(row);
                    setShowHandsModal(true);
                  };
                  
                  if (comparison === "low" || comparison === "high") {
                    return (
                      <button
                        key={row}
                        onClick={handleClick}
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-2.5 min-w-[80px] w-full flex items-center gap-1 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                      >
                        <span className="text-slate-300 text-[10px] font-medium">{handTypeTR}</span>
                        <span className="text-red-500 text-sm">
                          {comparison === "low" ? "↑" : "↓"}
                        </span>
                      </button>
                    );
                  }
                  if (comparison === "equal") {
                    return (
                      <button
                        key={row}
                        onClick={handleClick}
                        className="bg-slate-800 border border-emerald-600 rounded px-2 py-2 min-w-[80px] h-[43px] w-full flex items-center gap-1 cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                      >
                        <span className="text-emerald-400 text-[10px] font-semibold">{handTypeTR}</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={row}
                      onClick={handleClick}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-2 min-w-[80px] cursor-pointer hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      <span className="text-slate-500 text-[10px]">{handTypeTR}</span>
                    </button>
                  );
                }
                // Empty placeholder for rows without guesses - clickable with info icon
                return (
                  <button
                    key={row}
                    onClick={() => {
                      setSelectedGuessIndex(null);
                      setShowHandsModal(true);
                    }}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-2 min-w-[80px] h-[43px] opacity-70 cursor-pointer hover:opacity-100 hover:bg-slate-700 transition-all flex items-center justify-center"
                  >
                    <Info className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        {/* Card Selection - Grouped by suit */}
        {gameState === "playing" && (
          <div className="mb-4 space-y-2">
            {/* All suits - show 2 rows for each: 2-9 and 10-A (except last suit) */}
            {SUITS.map((suit, suitIndex) => {
              const isLastSuit = suitIndex === SUITS.length - 1;
              const firstRowRanks = RANKS.slice(0, 8); // 2-9
              const secondRowRanks = RANKS.slice(8);   // 10, J, Q, K, A
              
              return (
                <div key={suit} className="space-y-1">
                  {/* First row: 2-9 */}
                  <div className="flex gap-1 flex-wrap justify-center">
                    {firstRowRanks.map((rank) => {
                      const card = `${rank}${suit}`;
                      const isSelected = selectedCards.includes(card);
                      const status = cardStatuses[card];
                      // Check if card is one of the hint revealed cards
                      const isHintCard = revealedHintPositions.some(pos => targetHand?.cards[pos] === card);
                      
                      let bgColor = "bg-slate-800";
                      let textColor = "text-slate-100";
                      let borderColor = "border-slate-700";
                      
                      if (status === "correct") bgColor = "bg-emerald-600";
                      else if (status === "present") bgColor = "bg-yellow-500";
                      else if (status === "absent") {
                        bgColor = "bg-[#1D293D] opacity-40";
                        textColor = "text-slate-400";
                        borderColor = "border-transparent";
                      }
                      
                      // Hint ile açılan kartlar yeşil border alır
                      if (isHintCard) {
                        borderColor = "border-emerald-400 border-2";
                        bgColor = "bg-emerald-600";
                      } else if (isSelected) {
                        borderColor = "border-white border-2";
                      }

                      return (
                        <button
                          key={card}
                          onClick={() => toggleCard(rank, suit)}
                          disabled={gameState !== "playing"}
                          className={`w-9 h-12 rounded-md text-xs font-semibold flex flex-col items-center justify-center ${bgColor} ${textColor} border ${borderColor} transition-colors ${gameState !== "playing" ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}`}
                        >
                          <span>{rank}</span>
                          <span className={`text-sm ${getSuitColor(suit)} ${status === "absent" ? "opacity-50" : ""}`}>
                            {suit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Second row: 10, J, Q, K, A - skip for last suit (will be in bottom row) */}
                  {!isLastSuit && (
                    <div className="flex gap-1 flex-wrap justify-center">
                      {secondRowRanks.map((rank) => {
                        const card = `${rank}${suit}`;
                        const isSelected = selectedCards.includes(card);
                        const status = cardStatuses[card];
                        const isHintCard = revealedHintPositions.some(pos => targetHand?.cards[pos] === card);
                        
                        let bgColor = "bg-slate-800";
                        let textColor = "text-slate-100";
                        let borderColor = "border-slate-700";
                        
                        if (status === "correct") bgColor = "bg-emerald-600";
                        else if (status === "present") bgColor = "bg-yellow-500";
                        else if (status === "absent") {
                          bgColor = "bg-[#1D293D] opacity-40";
                          textColor = "text-slate-400";
                          borderColor = "border-transparent";
                        }
                        
                        // Hint ile açılan kartlar yeşil border alır
                        if (isHintCard) {
                          borderColor = "border-emerald-400 border-2";
                          bgColor = "bg-emerald-600";
                        } else if (isSelected) {
                          borderColor = "border-white border-2";
                        }

                        return (
                          <button
                            key={card}
                            onClick={() => toggleCard(rank, suit)}
                            disabled={gameState !== "playing"}
                            className={`w-9 h-12 rounded-md text-xs font-semibold flex flex-col items-center justify-center ${bgColor} ${textColor} border ${borderColor} transition-colors ${gameState !== "playing" ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}`}
                          >
                            <span>{rank}</span>
                            <span className={`text-sm ${getSuitColor(suit)} ${status === "absent" ? "opacity-50" : ""}`}>
                              {suit}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Bottom row: ENTER + 10 J Q K A (last displayed suit ♣) + DELETE */}
            <div className="flex gap-1 justify-center w-full">
              <button
                onClick={handleGuess}
                disabled={(selectedCards.length + revealedHintPositions.length) !== 5}
                className="w-11 h-12 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors font-bold text-[10px] disabled:cursor-not-allowed"
              >
                ENTER
              </button>
              
              {/* 10, J, Q, K, A for last suit (♣) */}
              {RANKS.slice(8).map((rank) => {
                const suit = "♣";
                const card = `${rank}${suit}`;
                const isSelected = selectedCards.includes(card);
                const status = cardStatuses[card];
                const isHintCard = revealedHintPositions.some(pos => targetHand?.cards[pos] === card);
                
                let bgColor = "bg-slate-800";
                let textColor = "text-slate-100";
                let borderColor = "border-slate-700";
                
                if (status === "correct") bgColor = "bg-emerald-600";
                else if (status === "present") bgColor = "bg-yellow-500";
                else if (status === "absent") {
                  bgColor = "bg-[#1D293D] opacity-40";
                  textColor = "text-slate-400";
                  borderColor = "border-transparent";
                }
                
                // Hint ile açılan kartlar yeşil border alır
                if (isHintCard) {
                  borderColor = "border-emerald-400 border-2";
                  bgColor = "bg-emerald-600";
                } else if (isSelected) {
                  borderColor = "border-white border-2";
                }

                return (
                  <button
                    key={card}
                    onClick={() => toggleCard(rank, suit)}
                    disabled={gameState !== "playing"}
                    className={`w-9 h-12 rounded-md text-xs font-semibold flex flex-col items-center justify-center ${bgColor} ${textColor} border ${borderColor} transition-colors ${gameState !== "playing" ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}`}
                  >
                    <span>{rank}</span>
                    <span className={`text-sm ${getSuitColor(suit)} ${status === "absent" ? "opacity-50" : ""}`}>
                      {suit}
                    </span>
                  </button>
                );
              })}
              
              <button
                onClick={() => {
                  if (selectedCards.length > 0) {
                    if (selectedCards.length > 0) {
                      const newCards = selectedCards.slice(0, -1);
                      setSelectedCards(newCards);
                    }
                  }
                }}
                disabled={selectedCards.length === 0}
                className="w-11 h-12 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors font-bold text-sm  disabled:cursor-not-allowed"
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        {/* Joker Buttons & Coins Section - Fixed Bottom */}
        {gameState === "playing" && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-3 safe-area-bottom">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              {/* Left: Coins */}
              <div className="flex items-center gap-1.5 text-orange-400">
                <Diamond className="w-5 h-5" fill="currentColor" />
                <span className="font-bold">{coins}</span>
              </div>
              
              {/* Right: Hint Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConfirmHint(true)}
                  disabled={hints <= 0 || revealedHintPositions.length >= 5}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hints > 0 && revealedHintPositions.length < 5
                      ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                      : "bg-slate-700 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <LightBulbIcon className="w-4 h-4" />
                  <span>İpucu</span>
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-900/50 rounded text-xs">{hints}</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom Spacer for Fixed Joker Bar */}
        {gameState === "playing" && <div className="h-16" />}
      </div>

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold">Nasıl Oynanır?</h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 text-slate-300">
              <p className="text-base leading-relaxed">
                <strong>Pokerdle</strong>, 7 tahmin hakkınız olan bir poker eli tahmin oyunudur.
              </p>

              <p className="text-base leading-relaxed">
                Her tahminden sonra kartların renkleri değişir:
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <p className="text-base">
                    <span className="font-semibold">Yeşil:</span> Doğru kart, doğru pozisyon
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded flex items-center justify-center text-white font-bold">
                    K
                  </div>
                  <p className="text-base">
                    <span className="font-semibold">Turuncu:</span> Kart elde var, yanlış pozisyon
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-600 rounded flex items-center justify-center text-white font-bold">
                    Q
                  </div>
                  <p className="text-base">
                    <span className="font-semibold">Gri:</span> Kart elde yok
                  </p>
                </div>
              </div>

              <p className="text-base leading-relaxed">
                <strong>İpucu:</strong> "Çok Düşük" veya "Çok Yüksek" yazısı, tahmin ettiğiniz elin hedef ele göre sıralamasını gösterir.
              </p>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-sm text-slate-400">
                  <strong>Poker eli sıralaması (yüksekten düşüğe):</strong><br/>
                  Royal Flush → Straight Flush → Four of a Kind → Full House → Flush → Straight → Three of a Kind → Two Pair → One Pair → High Card
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Poker Hands Modal */}
      {showHandsModal && (
        <div
          className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
          onClick={() => setShowHandsModal(false)}
        >
          <div
            className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700 z-10">
              <h2 className="text-xl font-bold">Poker Elleri</h2>
              <button
                onClick={() => setShowHandsModal(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
              {(() => {
                const guess = selectedGuessIndex !== null ? guesses[selectedGuessIndex] : null;
                const guessCards = guess ? guess.map((g) => g.card) : null;
                const guessHandType = guessCards ? getHandType(guessCards) : null;
                const comparison = guessCards ? getHandComparison(guessCards) : null;
                const guessRank = guessHandType ? HAND_RANKINGS[guessHandType] || 0 : 0;
                
                // Calculate possible range based on ALL guesses
                let minPossibleRank = 1;  // Lowest possible (HIGH CARD = 1)
                let maxPossibleRank = 10; // Highest possible (ROYAL FLUSH = 10)
                let foundCorrect = false;
                let correctHandName: string | null = null;
                
                guesses.forEach((g) => {
                  const gCards = g.map((c) => c.card);
                  const gHandType = getHandType(gCards);
                  const gComparison = getHandComparison(gCards);
                  const gRank = HAND_RANKINGS[gHandType] || 0;
                  
                  if (gComparison === "equal") {
                    foundCorrect = true;
                    correctHandName = gHandType;
                  } else if (gComparison === "low") {
                    // Target is higher than this guess
                    minPossibleRank = Math.max(minPossibleRank, gRank + 1);
                  } else if (gComparison === "high") {
                    // Target is lower than this guess
                    maxPossibleRank = Math.min(maxPossibleRank, gRank - 1);
                  }
                });
                
                // Hand rankings from highest to lowest
                const allHands = [
                  { name: "ROYAL FLUSH", displayName: "Royal Flush", rank: 1, cards: [{r:"A",s:"♠"},{r:"K",s:"♠"},{r:"Q",s:"♠"},{r:"J",s:"♠"},{r:"10",s:"♠"}] },
                  { name: "STRAIGHT FLUSH", displayName: "Straight Flush", rank: 2, cards: [{r:"8",s:"♠"},{r:"7",s:"♠"},{r:"6",s:"♠"},{r:"5",s:"♠"},{r:"4",s:"♠"}] },
                  { name: "FOUR OF A KIND", displayName: "Four of a Kind", rank: 3, cards: [{r:"9",s:"♠"},{r:"9",s:"♥"},{r:"9",s:"♠"},{r:"9",s:"♦"},{r:"K",s:"♠"}] },
                  { name: "FULL HOUSE", displayName: "Full House", rank: 4, cards: [{r:"A",s:"♠"},{r:"A",s:"♥"},{r:"A",s:"♠"},{r:"K",s:"♦"},{r:"K",s:"♠"}] },
                  { name: "FLUSH", displayName: "Flush", rank: 5, cards: [{r:"K",s:"♠"},{r:"10",s:"♠"},{r:"7",s:"♠"},{r:"4",s:"♠"},{r:"2",s:"♠"}] },
                  { name: "STRAIGHT", displayName: "Straight", rank: 6, cards: [{r:"9",s:"♠"},{r:"8",s:"♥"},{r:"7",s:"♠"},{r:"6",s:"♦"},{r:"5",s:"♠"}] },
                  { name: "THREE OF A KIND", displayName: "Three of a Kind", rank: 7, cards: [{r:"Q",s:"♠"},{r:"Q",s:"♥"},{r:"Q",s:"♠"},{r:"7",s:"♦"},{r:"4",s:"♠"}] },
                  { name: "TWO PAIR", displayName: "Two Pair", rank: 8, cards: [{r:"J",s:"♠"},{r:"J",s:"♥"},{r:"4",s:"♠"},{r:"4",s:"♦"},{r:"9",s:"♠"}] },
                  { name: "ONE PAIR", displayName: "One Pair", rank: 9, cards: [{r:"10",s:"♠"},{r:"10",s:"♥"},{r:"K",s:"♠"},{r:"4",s:"♦"},{r:"2",s:"♠"}] },
                  { name: "HIGH CARD", displayName: "High Card", rank: 10, cards: [{r:"A",s:"♠"},{r:"J",s:"♥"},{r:"8",s:"♠"},{r:"4",s:"♦"},{r:"2",s:"♠"}] },
                ];
                
                return allHands.map((hand, index) => {
                  const handRank = HAND_RANKINGS[hand.name] || 0;
                  const isGuessHand = guessHandType && hand.name === guessHandType;
                  
                  // Determine if this hand is a possible answer
                  let isPossible = false;
                  let isCorrect = false;
                  let isEliminated = false;
                  
                  // Check if this is the correct/target hand
                  const isTargetHand = targetHand && hand.name === targetHand.name;
                  
                  if (gameState === "won" || gameState === "lost") {
                    // Game is over - show the correct answer
                    isCorrect = isTargetHand || false;
                    isEliminated = !isCorrect;
                  } else if (foundCorrect) {
                    // We found the correct hand during play
                    isCorrect = hand.name === correctHandName;
                  } else if (guesses.length > 0) {
                    // Check if this hand is in the possible range
                    isPossible = handRank >= minPossibleRank && handRank <= maxPossibleRank;
                    isEliminated = !isPossible;
                  }
                  
                  let borderClass = "border-slate-700";
                  let bgClass = "bg-slate-800";
                  let textClass = "text-slate-300";
                  let extraClass = "";
                  
                  if (isCorrect) {
                    borderClass = "border-emerald-500";
                    bgClass = "bg-emerald-900/30";
                    textClass = "text-emerald-400";
                  } else if (isEliminated) {
                    borderClass = "border-slate-800";
                    bgClass = "bg-slate-900/50";
                    textClass = "text-slate-600";
                    extraClass = "opacity-40";
                  }
                  
                  return (
                    <div
                      key={hand.name}
                      className={`${bgClass} border ${borderClass} rounded-lg p-2 flex items-center gap-2 ${extraClass}`}
                    >
                      {/* Hand name */}
                      <div className={`font-semibold text-xs ${textClass} min-w-[90px]`}>
                        {hand.displayName}
                      </div>
                      
                      {/* Visual cards */}
                      <div className="flex gap-1 ml-auto">
                        {hand.cards.map((card, cardIdx) => {
                          const isRed = card.s === "♥" || card.s === "♦";
                          return (
                            <div
                              key={cardIdx}
                              className="w-8 h-10 bg-slate-700 rounded flex flex-col items-center justify-center text-xs border border-slate-600"
                            >
                              <span className={isRed ? "text-red-500 font-bold" : "text-white font-bold"}>
                                {card.r}
                              </span>
                              <span className={isRed ? "text-red-500 text-[10px]" : "text-white text-[10px]"}>
                                {card.s}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
              
              {guesses.length > 0 && (
                <div className="mt-3 text-center text-xs text-slate-400">
                  {gameState === "won" || gameState === "lost" 
                    ? "Doğru el tipi yeşil ile gösterildi"
                    : "Sönük olmayanlar olabilecek el tipleri"
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Previous Games Modal */}
      {showPreviousGames && (
        <div
          className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
          onClick={() => setShowPreviousGames(false)}
        >
          <div
            className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold">Önceki Oyunlar</h2>
              <button
                onClick={() => setShowPreviousGames(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {(() => {
                const todayNum = getTodaysGameNumber();
                const games = [];
                
                for (let gNum = todayNum; gNum >= Math.max(1, todayNum - 30); gNum--) {
                  const status = gameStatusCache[gNum] || 'not_played';
                  
                  const isToday = gNum === todayNum;
                  const isCurrent = gNum === gameNumber;
                  const formattedDate = getFormattedDateFromGameNumber(gNum);
                  
                  games.push(
                    <button
                      key={gNum}
                      onClick={() => {
                        const daysDiff = gNum - FIRST_GAME_NUMBER;
                        const gameDate = new Date(FIRST_GAME_DATE);
                        gameDate.setDate(gameDate.getDate() + daysDiff);
                        const year = gameDate.getFullYear();
                        const month = String(gameDate.getMonth() + 1).padStart(2, '0');
                        const day = String(gameDate.getDate()).padStart(2, '0');
                        
                        router.push(`/games/pokerdle?mode=days&date=${year}-${month}-${day}`);
                        setGameNumber(gNum);
                        setShowPreviousGames(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isCurrent
                          ? "bg-emerald-900/30 border border-emerald-600"
                          : "bg-slate-700/50 hover:bg-slate-700 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm w-8">#{gNum}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {isToday ? "Bugün" : formattedDate}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {status === "won" && <span className="text-emerald-400">Kazanıldı</span>}
                            {status === "lost" && <span className="text-red-400">Kaybedildi</span>}
                            {status === "playing" && <span className="text-yellow-400">Devam Ediyor</span>}
                            {status === "not_played" && <span className="text-slate-500">Oynanmadı</span>}
                          </span>
                        </div>
                      </div>
                      <div>
                        {status === "won" && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        )}
                        {status === "lost" && (
                          <Circle className="w-5 h-5 text-red-500 fill-red-500" />
                        )}
                        {status === "playing" && (
                           <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center text-yellow-500">
                             <span className="text-[10px] font-bold">...</span>
                           </div>
                        )}
                        {status === "not_played" && (
                          <Circle className="w-5 h-5 text-slate-500" />
                        )}
                      </div>
                    </button>
                  );
                }
                
                return <div className="space-y-2">{games}</div>;
              })()}
            </div>
          </div>
        </div>
      )}

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
export default function PokerdlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Pokerdle />
    </Suspense>
  );
}
