"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import levelsData from "@/data/levels.json";
import gamesData from "@/data/games.json";
import AppBar from "@/components/AppBar";
import Header, { triggerDataRefresh } from "@/components/Header";
import PullToRefresh from "@/components/PullToRefresh";
import { ChestIcon } from "@/components/ChestIcon";
import { RewardModal, RewardData } from "@/components/RewardModal";
import LoginModal from "@/components/LoginModal";
import { LevelsPageSkeleton } from "@/components/SkeletonLoading";
import { useAuth } from "@/contexts/AuthContext";
import {
  getLevelProgress,
  completeLevel,
  getCompletedLevels,
  addHints,
} from "./actions";
import { addStars } from "@/app/store/actions";
import { getUserByFirebaseId } from "@/app/profile/actions";
import { useQueryClient } from "@tanstack/react-query";
import { useUserByFirebaseId, useUserStats, useCompletedLevels, QUERY_KEYS } from "@/hooks/useProfileData";

// Type definitions
interface Level {
  id: number;
  gameId?: string;
  type: "game" | "chest";
  icon?: string;
  name?: string;
}

interface GameInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface LevelProgress {
  currentLevel: number;
  completedLevels: number[];
}

// Get game info from games.json
function getGameInfo(gameId: string): GameInfo | null {
  const games = gamesData.games as Record<string, GameInfo>;
  return games[gameId] || null;
}

// Get level button style based on status and type
function getLevelButtonStyle(status: string, type: string) {
  if (status === "locked") {
    return "bg-slate-700 border-slate-600 cursor-not-allowed opacity-60";
  }
  
  if (status === "completed") {
    return "bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-600 shadow-lg shadow-emerald-500/30";
  }
  
  // Available
  switch (type) {
    case "chest":
      return "bg-gradient-to-b from-purple-400 to-purple-500 border-purple-600 shadow-lg shadow-purple-500/30";
    default:
      return "bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-600 shadow-lg shadow-emerald-500/40 hover:from-emerald-300 hover:to-emerald-400";
  }
}

// Get formatted date
function getFormattedDate(): string {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  return date.toLocaleDateString("tr-TR", options);
}

// Level Button Component
function LevelButton({ level, index, progress, onClick, levelRef }: { level: Level; index: number; progress: LevelProgress; onClick?: () => void; levelRef?: React.RefObject<HTMLDivElement | null> }) {
  // Oyun bilgilerini al (gameId varsa)
  const gameInfo = level.gameId ? getGameInfo(level.gameId) : null;
  
  // Dinamik durum hesapla
  const isCompleted = progress.completedLevels.includes(level.id);
  const isAvailable = level.id === progress.currentLevel || level.id < progress.currentLevel;
  const isLocked = !isCompleted && !isAvailable;
  const isChest = level.type === "chest";
  
  // Icon ve description'ı belirle (önce gameInfo, sonra level'dan)
  const displayIcon = gameInfo?.icon || level.icon || "🎮";
  const displayName = gameInfo?.description || level.name || "";
  
  // Dinamik status hesapla
  const dynamicStatus = isCompleted ? "completed" : (isAvailable ? "available" : "locked");
  
  // Zigzag pattern - offset based on index
  const offsets = [0, 40, 60, 40, 0, -40, -60, -40];
  const xOffset = offsets[index % 8];
  
  const buttonContent = (
    <div className="relative flex flex-col items-center">
      
      {/* Level Button */}
      <div
        className={`
          relative flex items-center justify-center transition-all duration-100 ease-out
          ${isChest ? 'w-20 h-20' : 'w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-b-[6px]'}
          ${!isChest ? getLevelButtonStyle(dynamicStatus, level.type) : ''}
          ${!isLocked ? `
            cursor-pointer
            ${isChest ? 'hover:scale-110 active:scale-95' : 'hover:border-b-4 hover:translate-y-0.5 active:border-b-2 active:translate-y-1'}
          ` : ""}
        `}
        onClick={onClick}
      >
        {/* Inner glow effect for available. */}
        {!isLocked && !isChest && (
          <div className="absolute inset-2 rounded-full bg-white/20" />
        )}
        
        {/* Level number badge - checkmark for completed, number for others */}
        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-20
          ${isLocked ? "bg-slate-600 text-slate-400" : isCompleted ? "bg-white text-emerald-600" : "bg-emerald-500 text-emerald-900"}
        `}>
          {isCompleted ? <Check className="w-4 h-4" /> : level.id}
        </div>
        
        {/* Icon - Level emoji or ChestIcon component */}
        <div className="relative z-10 text-2xl md:text-3xl">
          {isChest ? (
            <ChestIcon 
              status={isCompleted ? "claimed" : isAvailable ? "ready" : "locked"} 
              milestone={level.id}
              size="lg"
            />
          ) : (
            displayIcon
          )}
        </div>
        
        {/* Start tooltip - for current level */}
        {level.id === progress.currentLevel && !isLocked && (
          <div className={`absolute ${isChest ? '-top-12' : '-top-16'} inset-x-0 flex justify-center z-50 pointer-events-none`}>
            <div className="animate-bounce-soft flex flex-col items-center opacity-100">
              <span className={`text-white text-sm font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-xl block ${
                isCompleted ? "bg-emerald-500" : "bg-emerald-500"
              }`}>
                {isChest ? "AL" : "BAŞLA"}
              </span>
              {/* Arrow pointing down */}
              <div className={`w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent -mt-0.5 ${
                isCompleted ? "border-t-emerald-500" : "border-t-emerald-500"
              }`} />
            </div>
          </div>
        )}
      </div>
      
      {/* Level name / description */}
      <span className="mt-2 text-[10px] text-slate-400 font-medium text-center max-w-[120px] leading-tight">
        {displayName}
      </span>
    </div>
  );

  const isCurrentLevel = level.id === progress.currentLevel;

  // Wrap with Link if has gameId and not locked
  if (level.gameId && !isLocked) {
    return (
      <div ref={levelRef}>
        <Link 
          href={`/games/${level.gameId}?mode=levels&levelId=${level.id}`} 
          className="block"
          style={{ zIndex: isCurrentLevel ? 50 : 1, position: 'relative' }}
        >
          <div style={{ transform: `translateX(${xOffset}px)` }} className="transition-transform">
            {buttonContent}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div ref={levelRef}>
      <div 
        style={{ transform: `translateX(${xOffset}px)`, zIndex: isCurrentLevel ? 50 : 1, position: 'relative' }} 
        className="transition-transform"
      >
        {buttonContent}
      </div>
    </div>
  );
}

export default function Home() {
  const levels = levelsData.levels as Level[];
  const currentLevelRef = useRef<HTMLDivElement>(null);
  const [rewardData, setRewardData] = useState<RewardData | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // 1. Backend User
  const { data: userResult, isLoading: isUserLoading } = useUserByFirebaseId(user?.uid);
  const backendUserId = userResult?.data?.user?.id;

  // 2. User Stats (Current Level)
  const { currentLevel, isLoading: isStatsLoading } = useUserStats(backendUserId);

  // 3. Completed Levels
  const { data: completedLevels = [], isLoading: isCompletedLoading } = useCompletedLevels(backendUserId);

  // Combine into progress object
  const progress: LevelProgress = {
    currentLevel: isStatsLoading ? 1 : currentLevel,
    completedLevels: isCompletedLoading ? [] : completedLevels,
  };

  const dataLoading = (!!user?.uid && (isUserLoading || isStatsLoading || isCompletedLoading));

  // Scroll to current level on mount
  useEffect(() => {
    if (currentLevelRef.current && !dataLoading) {
      currentLevelRef.current.scrollIntoView({ behavior: "instant", block: "center" });
    }
  }, [progress.currentLevel, dataLoading]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (backendUserId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.levelProgress(backendUserId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.completedLevels(backendUserId) }),
      ]);
    }
    triggerDataRefresh();
  }, [queryClient, backendUserId]);

  // Handle chest claim
  const handleChestClaim = async (levelId: number) => {
    if (!backendUserId) {
      setShowLoginModal(true);
      return;
    }

    // Random reward calculation
    const rand = Math.random() * 100;
    let reward: { type: 'coins' | 'hint', amount: number };

    if (rand < 5) reward = { type: 'coins', amount: 500 };
    else if (rand < 15) reward = { type: 'coins', amount: 200 };
    else if (rand < 40) reward = { type: 'coins', amount: 100 };
    else if (rand < 80) reward = { type: 'coins', amount: 50 };
    else reward = { type: 'hint', amount: 1 };

    // Apply reward via backend
    if (reward.type === 'coins') {
      await addStars(backendUserId, reward.amount);
    } else {
      await addHints(backendUserId, reward.amount);
    }

    // Complete level in backend
    const result = await completeLevel(backendUserId, levelId);
    if (result.data?.success) {
      // Show reward animation
      setRewardData(reward);
      setShowRewardModal(true);
      
      // Update Cache
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.levelProgress(backendUserId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.completedLevels(backendUserId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stars(backendUserId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory(backendUserId) });
    }

    triggerDataRefresh();
  };

  // Show login prompt for unauthenticated users
  const renderLoginPrompt = () => (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Giriş Yapın</h2>
        <p className="text-slate-400 text-sm mb-4">
          Seviye ilerlemelerinizi kaydetmek ve ödüllerinizi almak için giriş yapın.
        </p>
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-medium py-3 px-4 rounded-xl transition-all"
        >
          Giriş Yap
        </button>
      </div>
    </div>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <Header />

      {/* Loading State */}
      {(authLoading || dataLoading) && isAuthenticated ? (
        <LevelsPageSkeleton />
      ) : !isAuthenticated ? (
        renderLoginPrompt()
      ) : (
        /* Main Content - Level Map */
        <div className="flex-1 flex flex-col justify-end max-w-lg mx-auto w-full px-4 py-6">
          {/* Date */}
          <p className="text-center text-slate-400 text-sm mb-6">{getFormattedDate()}</p>
          
          {/* Levels - from bottom to top */}
          <div className="flex flex-col-reverse items-center gap-10 py-4">
            {levels.map((level, index) => (
              <LevelButton 
                key={level.id} 
                level={level} 
                index={index} 
                progress={progress}
                levelRef={level.id === progress.currentLevel ? currentLevelRef : undefined}
                onClick={() => {
                  if (level.type === 'chest' && level.id === progress.currentLevel) {
                    handleChestClaim(level.id);
                  }
                }}
              />
            ))}
          </div>
          
          {/* Bottom padding for AppBar */}
          <div className="h-24" />
        </div>
      )}

      {rewardData && (
        <RewardModal 
          show={showRewardModal} 
          reward={rewardData} 
          onClose={() => setShowRewardModal(false)} 
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Seviyelere Giriş Yap"
        message="İlerlemenizi kaydetmek ve ödüllerinizi almak için giriş yapın."
      />

      {/* Bottom Navigation */}
      <AppBar currentPage="levels" />
    </PullToRefresh>
  );
}
