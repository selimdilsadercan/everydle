"use client";

import { ArrowBigRight, RotateCcw, Diamond, Loader2 } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createServerClient } from "@/lib/api";
import { useUserByFirebaseId, useUserStats } from "@/hooks/useProfileData";

// Default values
const DEFAULT_HINTS = 3;
const DEFAULT_GIVEUPS = 1;

async function resetLevelProgress(userId: string): Promise<boolean> {
  try {
    const client = createServerClient();
    const result = await client.progress.resetLevelProgress(userId);
    return result.success;
  } catch (error) {
    console.error("Failed to reset progress:", error);
    return false;
  }
}

export default function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // 1. Get Backend User ID
  const { data: userResult, isLoading: isUserLoading } = useUserByFirebaseId(user?.uid);
  const backendUserId = userResult?.data?.user?.id;

  // 2. Get User Stats
  const { 
    stars: coins, 
    hints, 
    giveups: giveUps, 
    isLoading: isStatsLoading 
  } = useUserStats(backendUserId);

  const isLoading = isAuthenticated && (isUserLoading || isStatsLoading);

  // Display values (show current or default if loading/error)
  const displayCoins = isLoading ? 0 : coins;
  const displayHints = isLoading ? DEFAULT_HINTS : (hints ?? DEFAULT_HINTS);
  const displayGiveUps = isLoading ? DEFAULT_GIVEUPS : (giveUps ?? DEFAULT_GIVEUPS);

  const handleResetProgress = async () => {
    if (!backendUserId) return;
    
    const success = await resetLevelProgress(backendUserId);
    if (success) {
      setShowMenu(false);
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-[100] bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - clickable to go to challenges */}
          <div className="relative">
            <Link
              href="/games"
              className="flex text-lg font-black text-white tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                if (process.env.NODE_ENV === "development") {
                  // Toggle menu only on specific modifier or just allow it to redirect while toggling
                  setShowMenu(!showMenu);
                }
              }}
            >
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm">E</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm mx-0.5">V</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm">E</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm mx-0.5">R</span>
              <span className="inline-block px-1 py-0.5 bg-white text-black rounded text-sm">Y</span>
              <span className="inline-block px-1 py-0.5 bg-slate-400 text-black rounded text-sm mx-0.5">D</span>
              <span className="inline-block px-1 py-0.5 bg-yellow-400 text-black rounded text-sm">L</span>
              <span className="inline-block px-1 py-0.5 bg-emerald-500 text-black rounded text-sm mx-0.5">E</span>
            </Link>

            {/* Debug Menu - Only in development */}
            {process.env.NODE_ENV === "development" && showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />

                {/* Menu */}
                <div className="absolute left-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                  <button
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-all flex items-center gap-3 text-red-400"
                    onClick={handleResetProgress}
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>İlerlemeyi Sıfırla</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Right side: Counters - Links to Store */}
          <Link 
            href="/store"
            className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : (
              <>
                {/* Coins */}
                <div className="flex items-center gap-1">
                  <Diamond className="w-4 h-4 text-orange-400" fill="currentColor" />
                  <span className="text-white font-bold text-sm">{displayCoins}</span>
                </div>
                
                {/* Hints */}
                <div className="flex items-center gap-1">
                  <LightBulbIcon className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-bold text-sm">{displayHints}</span>
                </div>
                
                {/* Give Ups */}
                <div className="flex items-center gap-1">
                  <ArrowBigRight className="w-4 h-4 text-pink-400" fill="currentColor" />
                  <span className="text-white font-bold text-sm">{displayGiveUps}</span>
                </div>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

// Trigger data refresh (call this after any data change)
export function triggerDataRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("everydle-data-refresh"));
  }
}
