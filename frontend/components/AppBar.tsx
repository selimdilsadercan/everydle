"use client";

import Link from "next/link";
import { Map, Gamepad2, User, Swords, Store, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserByFirebaseId, useCanClaimReward, useCompletedGamesForToday, useDailyProgressListener } from "@/hooks/useProfileData";

// Page enum for active state
export type PageType = "store" | "games" | "levels" | "challenge" | "profile";

// Total number of daily games
const TOTAL_DAILY_GAMES = 8;

// Navigation items configuration
const navigationItems = [
  {
    href: "/store",
    page: "store" as PageType,
    label: "Mağaza",
    icon: Store,
    hasBadge: true, // This item can have a badge
  },
  {
    href: "/levels",
    page: "levels" as PageType,
    label: "Bölümler",
    icon: Map,
  },
  {
    href: "/games",
    page: "games" as PageType,
    label: "Ana Sayfa",
    icon: Home,
    showProgress: true, // Show daily progress
  },
  {
    href: "/challenge",
    page: "challenge" as PageType,
    label: "Meydan Oku",
    icon: Swords,
  },
  {
    href: "/profile",
    page: "profile" as PageType,
    label: "Profil",
    icon: User,
  },
];

interface AppBarProps {
  currentPage: PageType;
}

export default function AppBar({ currentPage }: AppBarProps) {
  const { user, isAuthenticated } = useAuth();

  // Get backend user ID
  const { data: userResult } = useUserByFirebaseId(user?.uid);
  const backendUserId = userResult?.data?.user?.id;

  // Get can claim reward from cache
  const { data: hasReward = false } = useCanClaimReward(backendUserId);

  // Get daily progress from backend
  const { data: completedGames = [] } = useCompletedGamesForToday(backendUserId);
  const dailyProgress = completedGames.length;

  // Listen for daily progress updates (when game is completed)
  useDailyProgressListener(backendUserId);

  const isActive = (page: PageType) => {
    return currentPage === page;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
      <div className="max-w-lg mx-auto w-full">
        <div className="flex items-center py-2 px-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const showBadge = item.hasBadge && hasReward && isAuthenticated && !isActive(item.page);
            const showProgress = item.showProgress;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all duration-200 ${
                  isActive(item.page)
                    ? "text-emerald-400"
                    : "text-slate-400 hover:text-emerald-400"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  
                  {/* Badge and Tooltip for daily reward */}
                  {showBadge && (
                    <>
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap animate-bounce">
                        <div className="bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                          Günlük Ödül
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-700" />
                        </div>
                      </div>
                      
                      {/* Badge */}
                      <div className="absolute -top-1 -right-1.5">
                        <span className="flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </div>
                    </>
                  )}
                  
                  {/* Daily progress indicator for games */}
                  {showProgress && (
                    <div className="absolute -top-7 left-[10px] ml-[1px] -translate-x-1/2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        dailyProgress === TOTAL_DAILY_GAMES 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : dailyProgress > 0 
                            ? "bg-[#3C3522] text-yellow-400" 
                            : "bg-[#331223] text-red-400"
                      }`}>
                        {dailyProgress}/{TOTAL_DAILY_GAMES}
                      </span>
                    </div>
                  )}
                </div>
                
                <span className="text-[10px] font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
