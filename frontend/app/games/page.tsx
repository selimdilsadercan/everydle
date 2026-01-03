"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Users, Trophy, ChevronLeft, ChevronRight, Play, Lock, Gift, Coins, Diamond, X } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import AppBar from "@/components/AppBar";
import Header, { triggerDataRefresh } from "@/components/Header";
import PullToRefresh from "@/components/PullToRefresh";
import gamesData from "@/data/games.json";
import levelsData from "@/data/levels.json";
import { formatDate, getTodayDate } from "@/lib/dailyCompletion";
import { getLevelProgress } from "@/lib/levelProgress";
import { ChestIcon } from "@/components/ChestIcon";
import { RewardModal, RewardData } from "@/components/RewardModal";
import LoginModal from "@/components/LoginModal";
import { GamesPageSkeleton } from "@/components/SkeletonLoading";
import { useAuth } from "@/contexts/AuthContext";
import { claimChest as claimChestBackend } from "./actions";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, useCompletedGamesForDate, useClaimedChests, GAMES_QUERY_KEYS, useDailyProgressListener } from "@/hooks/useProfileData";

// Game type
interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  borderColor: string;
  shadowColor: string;
  difficulty: string;
  players: string;
  isNew: boolean;
  isPopular: boolean;
}

interface Level {
  id: number;
  gameId?: string;
  type: string;
}

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isFuture: boolean;
  isSelected: boolean;
}

// Get games array from JSON
const games = Object.values(gamesData.games) as Game[];
const levels = levelsData.levels as Level[];

// Count total levels for each game
function getTotalLevelsForGame(gameId: string): number {
  return levels.filter(level => level.gameId === gameId).length;
}

// Count completed levels for each game
function getCompletedLevelsForGame(gameId: string, completedLevelIds: number[]): number {
  const gameLevels = levels.filter(level => level.gameId === gameId);
  return gameLevels.filter(level => completedLevelIds.includes(level.id)).length;
}

// Wordle için first game date sabitleri
const WORDLE_FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025
const WORDLE_FIRST_GAME_NUMBER = 1;

// Tarihten oyun numarası hesapla
function getGameNumberFromDate(date: Date): number {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const firstDate = new Date(WORDLE_FIRST_GAME_DATE);
  firstDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor(
    (targetDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return WORDLE_FIRST_GAME_NUMBER + daysDiff;
}

// Tarih formatı: DD.MM.YYYY
function formatDateForStorage(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Belirli bir tarih için "devam ediyor" durumundaki oyunları bul
function getInProgressGamesForDate(date: Date): string[] {
  if (typeof window === "undefined") return [];
  
  const inProgressGames: string[] = [];
  const gameNumber = getGameNumberFromDate(date);
  const dateStr = formatDateForStorage(date);
  
  // Wordle kontrolü
  const wordleSave = localStorage.getItem(`wordle-game-${gameNumber}`);
  if (wordleSave) {
    try {
      const parsed = JSON.parse(wordleSave);
      if (parsed.guesses && parsed.guesses.length > 0 && !parsed.gameWon && !parsed.gameLost) {
        inProgressGames.push("wordle");
      }
    } catch (e) {}
  }
  
  // Nerdle kontrolü
  const nerdleSave = localStorage.getItem(`nerdle-game-${gameNumber}`);
  if (nerdleSave) {
    try {
      const parsed = JSON.parse(nerdleSave);
      if (parsed.guesses && parsed.guesses.length > 0 && !parsed.gameWon && !parsed.gameLost) {
        inProgressGames.push("nerdle");
      }
    } catch (e) {}
  }
  
  // Pokerdle kontrolü
  const pokerdleSave = localStorage.getItem(`pokerdle-game-${gameNumber}`);
  if (pokerdleSave) {
    try {
      const parsed = JSON.parse(pokerdleSave);
      if (parsed.guesses && parsed.guesses.length > 0 && !parsed.gameWon && !parsed.gameLost) {
        inProgressGames.push("pokerdle");
      }
    } catch (e) {}
  }
  
  // Quordle kontrolü
  const quordleSave = localStorage.getItem(`quordle-game-${dateStr}`);
  if (quordleSave) {
    try {
      const parsed = JSON.parse(quordleSave);
      if (parsed.games && Array.isArray(parsed.games)) {
        const hasPlaying = parsed.games.some((g: { gameState: string }) => g.gameState === "playing");
        const allWon = parsed.games.every((g: { gameState: string }) => g.gameState === "won");
        const anyLost = parsed.games.some((g: { gameState: string }) => g.gameState === "lost");
        if (hasPlaying && !allWon && !anyLost) {
          inProgressGames.push("quordle");
        }
      }
    } catch (e) {}
  }
  
  // Octordle kontrolü
  const octordleSave = localStorage.getItem(`octordle-game-${dateStr}`);
  if (octordleSave) {
    try {
      const parsed = JSON.parse(octordleSave);
      if (parsed.games && Array.isArray(parsed.games)) {
        const hasPlaying = parsed.games.some((g: { gameState: string }) => g.gameState === "playing");
        const allWon = parsed.games.every((g: { gameState: string }) => g.gameState === "won");
        const anyLost = parsed.games.some((g: { gameState: string }) => g.gameState === "lost");
        if (hasPlaying && !allWon && !anyLost) {
          inProgressGames.push("octordle");
        }
      }
    } catch (e) {}
  }
  
  // Contexto kontrolü
  const contextoSave = localStorage.getItem(`contexto-game-${dateStr}`);
  if (contextoSave) {
    try {
      const parsed = JSON.parse(contextoSave);
      if (parsed.guesses && parsed.guesses.length > 0 && !parsed.solved) {
        inProgressGames.push("contexto");
      }
    } catch (e) {}
  }
  
  // Redactle kontrolü
  const redactleSave = localStorage.getItem(`redactle-game-${dateStr}`);
  if (redactleSave) {
    try {
      const parsed = JSON.parse(redactleSave);
      if (parsed.guesses && Object.keys(parsed.guesses).length > 0 && !parsed.solved) {
        inProgressGames.push("redactle");
      }
    } catch (e) {}
  }
  
  // Moviedle kontrolü - gameNumber ile kaydediyor, gameState kullanıyor
  const moviedleSave = localStorage.getItem(`moviedle-game-${gameNumber}`);
  if (moviedleSave) {
    try {
      const parsed = JSON.parse(moviedleSave);
      // Moviedle gameState: "playing" | "won" | "lost" kullanıyor
      if (parsed.guesses && parsed.guesses.length > 0 && parsed.gameState === "playing") {
        inProgressGames.push("moviedle");
      }
    } catch (e) {}
  }
  
  return inProgressGames;
}

// Belirli bir tarih için "kaybedilmiş" durumundaki oyunları bul
function getLostGamesForDate(date: Date): string[] {
  if (typeof window === "undefined") return [];
  
  const lostGames: string[] = [];
  const gameNumber = getGameNumberFromDate(date);
  const dateStr = formatDateForStorage(date);
  
  // Wordle kontrolü
  const wordleSave = localStorage.getItem(`wordle-game-${gameNumber}`);
  if (wordleSave) {
    try {
      const parsed = JSON.parse(wordleSave);
      if (parsed.gameLost) {
        lostGames.push("wordle");
      }
    } catch (e) {}
  }
  
  // Nerdle kontrolü
  const nerdleSave = localStorage.getItem(`nerdle-game-${gameNumber}`);
  if (nerdleSave) {
    try {
      const parsed = JSON.parse(nerdleSave);
      if (parsed.gameLost) {
        lostGames.push("nerdle");
      }
    } catch (e) {}
  }
  
  // Pokerdle kontrolü
  const pokerdleSave = localStorage.getItem(`pokerdle-game-${gameNumber}`);
  if (pokerdleSave) {
    try {
      const parsed = JSON.parse(pokerdleSave);
      if (parsed.gameLost) {
        lostGames.push("pokerdle");
      }
    } catch (e) {}
  }
  
  // Quordle kontrolü - herhangi biri lost ise
  const quordleSave = localStorage.getItem(`quordle-game-${dateStr}`);
  if (quordleSave) {
    try {
      const parsed = JSON.parse(quordleSave);
      if (parsed.games && Array.isArray(parsed.games)) {
        const anyLost = parsed.games.some((g: { gameState: string }) => g.gameState === "lost");
        if (anyLost) {
          lostGames.push("quordle");
        }
      }
    } catch (e) {}
  }
  
  // Octordle kontrolü - herhangi biri lost ise
  const octordleSave = localStorage.getItem(`octordle-game-${dateStr}`);
  if (octordleSave) {
    try {
      const parsed = JSON.parse(octordleSave);
      if (parsed.games && Array.isArray(parsed.games)) {
        const anyLost = parsed.games.some((g: { gameState: string }) => g.gameState === "lost");
        if (anyLost) {
          lostGames.push("octordle");
        }
      }
    } catch (e) {}
  }
  
  // Contexto - kaybetme durumu yok, sadece sonsuz tahmin
  // Contexto never loses, so skip
  
  // Redactle - kaybetme durumu yok
  // Redactle never loses, so skip
  
  // Moviedle kontrolü - gameNumber ile kaydediyor, gameState kullanıyor
  const moviedleLostSave = localStorage.getItem(`moviedle-game-${gameNumber}`);
  if (moviedleLostSave) {
    try {
      const parsed = JSON.parse(moviedleLostSave);
      // Moviedle gameState: "playing" | "won" | "lost" kullanıyor
      if (parsed.gameState === "lost") {
        lostGames.push("moviedle");
      }
    } catch (e) {}
  }
  
  return lostGames;
}

// Parse date from URL param (format: YYYY-MM-DD) - handles timezone correctly
function parseDateParam(dateParam: string | null): Date | null {
  if (!dateParam) return new Date();
  
  // Parse YYYY-MM-DD format manually to avoid timezone issues
  const parts = dateParam.split('-');
  if (parts.length !== 3) return new Date();
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
  const day = parseInt(parts[2], 10);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
  
  const parsed = new Date(year, month, day);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

// Get Monday of the week for a given date
function getMondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function GamesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId, isAuthenticated, loading: authLoading } = useAuth();
  
  // Get initial date from URL param or use today
  const dateParam = searchParams.get("date");
  const initialDate = parseDateParam(dateParam);
  
  // Week start (Monday of current viewed week)
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(initialDate || new Date()));
  
  // Selected date (null means no day selected)
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [inProgressGames, setInProgressGames] = useState<string[]>([]);
  const [lostGames, setLostGames] = useState<string[]>([]);
  const [completedLevelIds, setCompletedLevelIds] = useState<number[]>([]);
  const [showRewardAnimation, setShowRewardAnimation] = useState<number | null>(null);
  const [rewardData, setRewardData] = useState<RewardData | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Listen for daily progress updates (e.g. when a game is completed)
  useDailyProgressListener(backendUserId ?? undefined);
  
  // Seçilen tarihi string formatına çevir
  const selectedDateStr = selectedDate ? formatDate(selectedDate) : undefined;
  
  // React Query hooks for data fetching with caching
  const { data: completedGames = [], isLoading: completedGamesLoading } = useCompletedGamesForDate(
    backendUserId ?? undefined, 
    selectedDateStr
  );
  
  const { data: claimedChests = [], isLoading: claimedChestsLoading } = useClaimedChests(
    backendUserId ?? undefined, 
    selectedDateStr
  );

  // Update URL when date changes
  const updateSelectedDate = (newDate: Date | null) => {
    setSelectedDate(newDate);
    if (newDate) {
      const dateStr = formatDate(newDate);
      router.replace(`/games?date=${dateStr}`, { scroll: false });
    } else {
      router.replace("/games", { scroll: false });
    }
  };

  // Load in-progress games, lost games and level progress when date changes
  useEffect(() => {
    if (selectedDate) {
      setInProgressGames(getInProgressGamesForDate(selectedDate));
      setLostGames(getLostGamesForDate(selectedDate));
    } else {
      setInProgressGames([]);
      setLostGames([]);
    }
    
    const progress = getLevelProgress();
    setCompletedLevelIds(progress.completedLevels);
  }, [selectedDate]);

  // Go to previous day (if Monday, go to previous week's Sunday)
  const goToPrevDay = () => {
    if (!selectedDate) return;
    
    const currentDayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isMonday = currentDayOfWeek === 1;
    
    if (isMonday) {
      // Go to previous week and select Sunday
      const newWeekStart = new Date(weekStart);
      newWeekStart.setDate(weekStart.getDate() - 7);
      setWeekStart(newWeekStart);
      
      // Select Sunday of that week (6 days after Monday)
      const newSelectedDate = new Date(newWeekStart);
      newSelectedDate.setDate(newWeekStart.getDate() + 6);
      updateSelectedDate(newSelectedDate);
    } else {
      // Just go to previous day
      const newSelectedDate = new Date(selectedDate);
      newSelectedDate.setDate(selectedDate.getDate() - 1);
      updateSelectedDate(newSelectedDate);
    }
  };

  // Go to next day (if Sunday, go to next week's Monday)
  const goToNextDay = () => {
    if (!selectedDate) return;
    
    const todayStr = getTodayDate();
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + 1);
    
    // Can't go beyond today
    if (formatDate(nextDate) > todayStr) return;
    
    const currentDayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isSunday = currentDayOfWeek === 0;
    
    if (isSunday) {
      // Go to next week and select Monday
      const newWeekStart = new Date(weekStart);
      newWeekStart.setDate(weekStart.getDate() + 7);
      setWeekStart(newWeekStart);
      updateSelectedDate(newWeekStart); // Monday is the first day
    } else {
      // Just go to next day
      updateSelectedDate(nextDate);
    }
  };

  // Check if can go to next day
  const canGoNextDay = () => {
    if (!selectedDate) return false;
    const todayStr = getTodayDate();
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + 1);
    return formatDate(nextDate) <= todayStr;
  };

  // Generate week days
  const getWeekDays = (): WeekDay[] => {
    const todayStr = getTodayDate();
    const dayNames = ["Pts", "Sal", "Çar", "Per", "Cum", "Cts", "Paz"];
    const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const weekDays: WeekDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push({
        date,
        dayName: dayNames[i],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: formatDate(date) === todayStr,
        isFuture: formatDate(date) > todayStr,
        isSelected: selectedDate ? formatDate(date) === formatDate(selectedDate) : false
      });
    }
    
    return weekDays;
  };

  const weekDays = getWeekDays();
  
  const handleClaimChest = async (milestone: number) => {
    if (!selectedDate) return;
    // canClaim true ise tıkla
    const isClaimable = (completedGames.length >= milestone);
    if (!isClaimable) return;
    if (claimedChests.includes(milestone)) return;

    // Random reward calculation
    const rand = Math.random() * 100;
    let reward: { type: 'coins' | 'hint', amount: number };

    if (rand < 5) reward = { type: 'coins', amount: 500 }; // %5
    else if (rand < 15) reward = { type: 'coins', amount: 200 }; // %10
    else if (rand < 40) reward = { type: 'coins', amount: 100 }; // %25
    else if (rand < 80) reward = { type: 'coins', amount: 50 }; // %40
    else reward = { type: 'hint', amount: 1 }; // %20

    const dateStr = formatDate(selectedDate);
    
    // Apply reward and save claim - ONLY if user is authenticated
    if (!backendUserId) {
      setShowLoginModal(true);
      return;
    }

    // Claim chest via backend (this also adds the reward)
    const claimResult = await claimChestBackend(
      backendUserId,
      dateStr,
      milestone,
      reward.type,
      reward.amount
    );
    
    if (claimResult.data?.success) {
      // Invalidate claimed chests cache to refresh
      queryClient.invalidateQueries({ queryKey: GAMES_QUERY_KEYS.claimedChests(backendUserId, dateStr) });
      
      // Invalidate React Query cache to refresh Header
      if (reward.type === 'coins') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stars(backendUserId) });
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory(backendUserId) });
      }
    }
    
    // Start Clash Royale style animation
    setRewardData(reward);
    setShowRewardModal(true);
  };

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (backendUserId && selectedDateStr) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: GAMES_QUERY_KEYS.completedGamesForDate(backendUserId, selectedDateStr) }),
        queryClient.invalidateQueries({ queryKey: GAMES_QUERY_KEYS.claimedChests(backendUserId, selectedDateStr) }),
      ]);
    }
    triggerDataRefresh();
  }, [queryClient, backendUserId, selectedDateStr]);

  // Auth yüklenene kadar skeleton göster
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <GamesPageSkeleton />
        <AppBar currentPage="games" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Games Grid */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <h1 className="sr-only">Everydle Günlük Kelime ve Bulmaca Oyunları</h1>

        {/* Weekly Day Selector */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            {/* Previous day button */}
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            
            {/* Week days */}
            <div className="flex-1 flex items-center gap-1">
              {weekDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => !day.isFuture && updateSelectedDate(day.date)}
                  disabled={day.isFuture}
                  className={`
                    flex-1 py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition-all
                    ${day.isFuture 
                      ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700'
                    }
                  `}
                >
                  <span className={`text-[10px] font-medium ${day.isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>{day.dayName}</span>
                  <span className={`text-sm font-bold ${day.isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {day.dayNumber}
                  </span>
                  <span className={`text-[10px] font-bold -mt-1 ${day.isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {day.monthName}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Next day button */}
            <button
              onClick={goToNextDay}
              disabled={!canGoNextDay()}
              className={`p-2 rounded-lg transition-colors ${
                canGoNextDay() 
                  ? 'bg-slate-800 hover:bg-slate-700' 
                  : 'bg-slate-800/50 cursor-not-allowed'
              }`}
            >
              <ChevronRight className={`w-4 h-4 ${canGoNextDay() ? 'text-slate-400' : 'text-slate-600'}`} />
            </button>
          </div>
        </div>

        {/* Chest Area */}
        <div className="mb-4 bg-slate-800/80 rounded-2xl p-4 border border-slate-700 shadow-xl relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Günlük Görev Ödülleri
                </h3>
                <p className="text-slate-400 text-[11px]">Günün oyunlarını bitirerek sandıkları aç!</p>
              </div>
              <div className="bg-slate-900/50 px-2 py-1 rounded-lg border border-slate-700/50">
                <span className="text-xs font-bold text-emerald-400">{completedGames.length} / 6</span>
              </div>
            </div>

            {!backendUserId ? (
              <div className="bg-slate-900/60 rounded-xl p-4 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Ödüller Kilitli</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">Günlük sandık ödüllerini toplamak için giriş yapman gerekiyor.</p>
                </div>
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Giriş Yap
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[1, 3, 6].map((milestone) => {
                const isClaimed = claimedChests.includes(milestone);
                const canClaim = completedGames.length >= milestone && !isClaimed;
                const isLocked = completedGames.length < milestone;
                const remaining = milestone - completedGames.length;
                const isAlmostThere = remaining === 1 && !isClaimed; // 1 oyun kaldı!

                return (
                  <button
                    key={milestone}
                    onClick={() => handleClaimChest(milestone)}
                    className={`
                      relative group flex flex-col items-center gap-1 py-2 px-3 rounded-xl border transition-all duration-300
                      ${isClaimed 
                        ? 'bg-slate-900/40 border-slate-700/50' 
                        : canClaim
                          ? 'bg-emerald-500/10 border-emerald-500/50 scale-100 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                          : isAlmostThere
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-slate-900/40 border-slate-700 text-slate-500'
                      }
                    `}
                  >
                    {/* Az Kaldı Badge */}
                    {isAlmostThere && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
                        1 Kaldı!
                      </div>
                    )}
                    
                    <div className="transition-all duration-500">
                      <ChestIcon 
                        status={isClaimed ? "claimed" : (completedGames.length >= milestone) ? "ready" : "locked"} 
                        milestone={milestone} 
                      />
                    </div>
                    
                    <div className="text-center">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isClaimed ? 'text-slate-500' : isAlmostThere ? 'text-amber-400' : 'text-slate-300'}`}>
                        {milestone} Oyun
                      </p>
                      {/* Progress indicator for locked chests */}
                      {isLocked && !isAlmostThere && (
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {completedGames.length}/{milestone}
                        </p>
                      )}
                    </div>

                    {canClaim && (
                      <div className="absolute inset-0 rounded-xl bg-emerald-500/5 animate-pulse" />
                    )}
                    
                    {isAlmostThere && (
                      <div className="absolute inset-0 rounded-xl bg-amber-500/5 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
            )}
          </div>
          
          {/* Reward Notification Layer */}
          {showRewardAnimation && (
            <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
              <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-bounce shadow-[0_0_50px_rgba(16,185,129,0.4)] border border-white/20">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xl">✨</div>
                <div>
                  <p className="font-bold">Ödül Alındı!</p>
                  <p className="text-sm">+{showRewardAnimation} Yıldız kazandın!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2x4 Games Grid */}
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => {
            const isCompleted = completedGames.includes(game.id);
            const isInProgress = inProgressGames.includes(game.id);
            const isLost = lostGames.includes(game.id);
            const totalLevels = getTotalLevelsForGame(game.id);
            const completedLevels = getCompletedLevelsForGame(game.id, completedLevelIds);
            
            return (
              <Link
                key={game.id}
                href={selectedDate ? `/games/${game.id}?mode=days&date=${formatDate(selectedDate)}` : `/games/${game.id}`}
                className="block group"
              >
                <div
                  className={`
                    relative overflow-hidden rounded-2xl bg-slate-800 
                    border border-slate-700
                    shadow-[0_4px_0_0_rgba(0,0,0,0.3)] 
                    hover:shadow-[0_2px_0_0_rgba(0,0,0,0.3)] 
                    active:shadow-[0_1px_0_0_rgba(0,0,0,0.3)]
                    transform hover:translate-y-1 active:translate-y-2
                    transition-all duration-150 ease-out
                    p-3 h-fit cursor-pointer
                  `}
                >
                  {/* Status Indicator: Completed / In Progress / Lost / Not Started */}
                  {isCompleted ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-10">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  ) : isInProgress ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-yellow-600 flex items-center justify-center z-10">
                      <Play className="w-3 h-3 text-white" fill="white" />
                    </div>
                  ) : isLost ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-900/80 flex items-center justify-center z-10">
                      <X className="w-3 h-3 text-red-400/80" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-slate-600 z-10" />
                  )}

                  <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div
                      className={`
                        w-12 h-12 rounded-lg bg-gradient-to-br ${game.color}
                        flex items-center justify-center text-2xl mb-2
                        shadow-md ${game.shadowColor}
                      `}
                    >
                      {game.icon}
                    </div>

                    {/* Name */}
                    <h3 className="text-sm font-bold text-white mb-0.5">
                      {game.name}
                    </h3>

                    {/* Description */}
                    <p className="text-[12px] text-slate-400 line-clamp-1 mb-2">
                      {game.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Padding for AppBar */}
        <div className="h-18" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="games" />

      {/* Clash Royale Style Reward Modal */}
      {showRewardModal && rewardData && (
        <RewardModal 
          show={showRewardModal} 
          reward={rewardData} 
          onClose={() => setShowRewardModal(false)} 
        />
      )}

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </PullToRefresh>
  );
}

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900">
        <Header />
        <GamesPageSkeleton />
        <AppBar currentPage="games" />
      </div>
    }>
      <GamesContent />
    </Suspense>
  );
}
