"use client";

import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Crown, Gift, ArrowBigRight, Diamond, Check, Lock, Smartphone } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import AppBar from "@/components/AppBar";
import Header, { triggerDataRefresh } from "@/components/Header";
import LoginModal from "@/components/LoginModal";
import { StorePageSkeleton } from "@/components/SkeletonLoading";
import { useAuth } from "@/contexts/AuthContext";
import {
  addStars,
  removeStars,
  claimDailyReward,
  addHints,
  addGiveups,
} from "./actions";
import { useQueryClient } from "@tanstack/react-query";
import { useUserByFirebaseId, useUserStats, useCanClaimReward, QUERY_KEYS } from "@/hooks/useProfileData";
import { RewardModal, RewardData } from "@/components/RewardModal";
import VideoAdModal from "@/components/VideoAdModal";

export default function StorePage() {
  const [promoCode, setPromoCode] = useState("");
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardData, setRewardData] = useState<RewardData>({ type: 'coins', amount: 50 });
  const [animatingCoins, setAnimatingCoins] = useState(false);
  const [displayCoins, setDisplayCoins] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [localStreak, setLocalStreak] = useState(1);

  const queryClient = useQueryClient();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // 1. Backend User
  const { data: userResult, isLoading: isUserLoading } = useUserByFirebaseId(user?.uid);
  const backendUserId = userResult?.data?.user?.id;

  // 2. User Stats
  const { stars: coins, hints, giveups: skips, isLoading: isStatsLoading } = useUserStats(backendUserId);

  // 3. Can Claim Reward
  const { data: claimInfo, isLoading: isRewardLoading } = useCanClaimReward(backendUserId);
  const { canClaim, requiresVideo, claimsRemaining, claimsToday } = claimInfo || { canClaim: false, requiresVideo: false, claimsRemaining: 0, claimsToday: 0 };

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRewardClaimPending = useRef(false);

  const isApp = Capacitor.isNativePlatform();

  // Loading state
  const dataLoading = !!user?.uid && (isUserLoading || isStatsLoading || isRewardLoading);

  // Sync displayCoins with hook data
  const prevCoinsRef = useRef(coins);
  useEffect(() => {
    if (!isStatsLoading && coins !== prevCoinsRef.current) {
      setDisplayCoins(coins);
      prevCoinsRef.current = coins;
    }
  }, [coins, isStatsLoading]);

  // Animate coin count
  const animateCoinCount = (from: number, to: number) => {
    setAnimatingCoins(true);
    const duration = 1000;
    const steps = 20;
    const increment = (to - from) / steps;
    let current = from;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current += increment;
      setDisplayCoins(Math.round(current));
      
      if (step >= steps) {
        clearInterval(interval);
        setDisplayCoins(to);
        setAnimatingCoins(false);
      }
    }, duration / steps);
  };

  // Handle daily reward claim
  const handleClaimReward = async () => {
    if (!canClaim || !backendUserId) return;

    if (requiresVideo) {
      if (!isApp) {
        // We could show a toast or message here, but button is already disabled in UI
        return;
      }
      setShowVideoModal(true);
      return; // Wait for onComplete from modal
    }
    
    executeClaim();
  };

  const executeClaim = async () => {
    if (!backendUserId) return;

    const result = await claimDailyReward(backendUserId);
    if (result.data?.success && result.data.reward) {
      // Set reward data and show modal
      setRewardData({ type: 'coins', amount: result.data.reward });
      setShowRewardModal(true);
      
      const newCoins = result.data.data?.stars || coins + result.data.reward;
      
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stars(backendUserId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reward(backendUserId) });
      triggerDataRefresh();
      
      // Animate coins after modal closes
      setTimeout(() => {
        animateCoinCount(coins, newCoins);
      }, 100);
    }
  };

  const handleVideoComplete = () => {
    executeClaim();
  };

  // DEBUG: Reset daily reward
  const handleResetDailyReward = async () => {
    if (!backendUserId) return;
    const { resetDailyReward } = await import("./actions");
    await resetDailyReward(backendUserId);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reward(backendUserId) });
  };

  // Handle reward modal close
  const handleRewardModalClose = () => {
    setShowRewardModal(false);
  };

  // Handle purchase
  const handlePurchase = async (type: "hint" | "skip", cost: number) => {
    if (!backendUserId || coins < cost) return;

    // Önce yıldız düş
    const removeResult = await removeStars(backendUserId, cost);
    if (!removeResult.data?.success) return;

    // Sonra item ekle
    if (type === "hint") {
      await addHints(backendUserId, 1);
    } else {
      await addGiveups(backendUserId, 1);
    }

    const newCoins = removeResult.data.data?.stars || coins - cost;
    setDisplayCoins(newCoins);
    
    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stars(backendUserId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory(backendUserId) });
    triggerDataRefresh();
  };

  // Handle coin package purchase (simulated - would integrate with payment in production)
  const handleCoinPackage = async (amount: number) => {
    if (!backendUserId) return;

    const result = await addStars(backendUserId, amount);
    if (result.data?.success) {
      const newCoins = result.data.data?.stars || coins + amount;
      animateCoinCount(coins, newCoins);
      
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stars(backendUserId) });
      triggerDataRefresh();
    }
  };

  // Show login prompt for unauthenticated users
  const renderLoginPrompt = () => (
    <div className="bg-slate-800 rounded-2xl p-6 mb-4 border border-slate-700">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Giriş Yapın</h2>
        <p className="text-slate-400 text-sm mb-4">
          Mağazayı kullanmak ve ödüllerinizi takip etmek için giriş yapın.
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
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Reward Modal with Chest Animation */}
      <RewardModal
        show={showRewardModal}
        onClose={handleRewardModalClose}
        reward={rewardData}
      />

      {/* Video Ad Modal */}
      <VideoAdModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onComplete={handleVideoComplete}
      />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Loading State */}
        {(authLoading || dataLoading) && isAuthenticated ? (
          <StorePageSkeleton />
        ) : !isAuthenticated ? (
          renderLoginPrompt()
        ) : (
          <>
            {/* Premium Subscription Card */}
            <div className="bg-slate-800 rounded-2xl p-6 mb-4 border border-slate-700">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-3">Plus Ol</h2>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">•</span>
                      Çevrimdışı oynama
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">•</span>
                      Reklamsız
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">•</span>
                      <span className="flex items-center gap-1">Aylık 200 <Diamond className="w-3.5 h-3.5 text-orange-400" fill="currentColor" /></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Daily Reward Card */}
            <div className="bg-slate-800 rounded-2xl p-5 mb-4 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    canClaim ? "bg-emerald-500/20" : "bg-slate-700"
                  }`}>
                    <Gift className={`w-5 h-5 ${canClaim ? "text-emerald-400" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Günlük Ödül ({claimsToday}/3)</h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      {requiresVideo ? "Video İzle ve Al" : "+50"} <Diamond className="w-3.5 h-3.5 text-orange-400" fill="currentColor" />
                    </p>
                  </div>
                </div>
                
                {/* Daily Reward Slots */}
                <div className="flex gap-2">
                  {[1, 2, 3].map((slot) => (
                    <div
                      key={slot}
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        slot <= (claimsToday || 0)
                          ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          : "bg-slate-700 border-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleClaimReward}
                disabled={!canClaim || isVideoPlaying || showRewardModal || (requiresVideo && !isApp)}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  canClaim && !isVideoPlaying && !showRewardModal && !(requiresVideo && !isApp)
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                    : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isVideoPlaying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Video İzleniyor...
                  </>
                ) : (
                  <>
                    {requiresVideo && (isApp ? <Gift className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />)}
                    {canClaim 
                      ? (requiresVideo 
                          ? (isApp ? "Video İzle ve Al" : "Sadece Uygulamada") 
                          : "Ücretsiz Al") 
                      : "Bugünlük Bitti ✓"}
                  </>
                )}
              </button>

              {/* Debug Reset Button - Only in development */}
              {process.env.NODE_ENV === 'development' && (
                <button 
                  onClick={handleResetDailyReward}
                  className="mt-2 w-full text-[10px] text-slate-500 hover:text-slate-400 uppercase tracking-widest"
                >
                  [Debug: Sıfırla]
                </button>
              )}
            </div>

            {/* Boosters Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Joker Satın Al
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Skip Booster */}
                <button
                  onClick={() => handlePurchase("skip", 500)}
                  disabled={coins < 500}
                  className={`bg-slate-800 rounded-xl p-4 border transition-colors ${
                    coins >= 500
                      ? "border-slate-700 hover:border-pink-500/50 cursor-pointer"
                      : "border-slate-700 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-3">
                      <ArrowBigRight className="w-6 h-6 text-pink-400" fill="currentColor" />
                    </div>
                    <h4 className="text-white font-medium mb-1">Atla <span className="text-pink-400 text-xs">({skips})</span></h4>
                    <p className="text-slate-400 text-sm flex items-center gap-1">500 <Diamond className="w-3.5 h-3.5 text-orange-400" fill="currentColor" /></p>
                  </div>
                </button>

                {/* Hint Booster */}
                <button
                  onClick={() => handlePurchase("hint", 100)}
                  disabled={coins < 100}
                  className={`bg-slate-800 rounded-xl p-4 border transition-colors ${
                    coins >= 100
                      ? "border-slate-700 hover:border-yellow-500/50 cursor-pointer"
                      : "border-slate-700 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-3">
                      <LightBulbIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">İpucu <span className="text-yellow-400 text-xs">({hints})</span></h4>
                    <p className="text-slate-400 text-sm flex items-center gap-1">100 <Diamond className="w-3.5 h-3.5 text-orange-400" fill="currentColor" /></p>
                  </div>
                </button>
              </div>
            </div>

            {/* Coin Packages */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Coin Satın Al
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Package 1 */}
                <button 
                  className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                  onClick={() => handleCoinPackage(200)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-500 text-xs line-through">45.90₺</span>
                    <span className="text-xl font-bold text-white">200</span>
                    <Diamond className="w-5 h-5 text-orange-400" fill="currentColor" />
                  </div>
                </button>

                {/* Package 2 - Popular */}
                <button 
                  className="relative bg-slate-800 rounded-xl p-4 border-2 border-emerald-500/50 hover:border-emerald-500 transition-colors"
                  onClick={() => handleCoinPackage(600)}
                >
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      POPÜLER
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="text-slate-500 text-xs line-through">85.90₺</span>
                    <span className="text-xl font-bold text-white">600</span>
                    <Diamond className="w-5 h-5 text-orange-400" fill="currentColor" />
                  </div>
                </button>

                {/* Package 3 */}
                <button 
                  className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                  onClick={() => handleCoinPackage(2000)}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-500 text-xs line-through">160.90₺</span>
                    <span className="text-xl font-bold text-white">2000</span>
                    <Diamond className="w-5 h-5 text-orange-400" fill="currentColor" />
                  </div>
                </button>
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-dashed border-slate-700">
              <label className="block text-sm text-slate-400 mb-3">Promosyon Kodu</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Kodu gir..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button className="bg-gray-500 hover:bg-gray-400 text-white font-medium px-4 py-2.5 rounded-xl transition-colors">
                  <Check className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="store" />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Mağazaya Giriş Yap"
        message="Ödüllerinizi toplamak ve satın alma yapmak için giriş yapın."
      />
    </div>
  );
}
