"use client";

import { useState, useEffect, useRef } from "react";
import { X, Volume2, VolumeX, Gift } from "lucide-react";
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

interface VideoAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function VideoAdModal({ isOpen, onClose, onComplete }: VideoAdModalProps) {
  const [countdown, setCountdown] = useState(15);
  const [isMuted, setIsMuted] = useState(true);
  const [canClose, setCanClose] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isApp = Capacitor.isNativePlatform();

  // AdMob Reward IDs for each platform
  const ADMOB_REWARD_ID = Capacitor.getPlatform() === 'ios' 
    ? "ca-app-pub-8702057253982242/1940057534" 
    : "ca-app-pub-8702057253982242/5879302547";
  const adVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-gamer-playing-an-arcade-game-34551-large.mp4";

  useEffect(() => {
    if (isOpen) {
      if (isApp) {
        // Try AdMob
        const showAdMob = async () => {
          try {
            await AdMob.initialize();
            await AdMob.prepareRewardVideoAd({ adId: ADMOB_REWARD_ID });
            
            // Listen for reward event
            const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: any) => {
              console.log("REWARD EARNED:", reward);
              onComplete();
              onClose();
            });

            // Listen for dismiss event
            const dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
              onClose();
            });
            
            await AdMob.showRewardVideoAd();
          } catch (error) {
            console.error("AdMob Error:", error);
            setUseFallback(true); // Switch to our custom video modal if AdMob fails or on web
          }
        };
        showAdMob();
      } else {
        // Web version - just use simulation
        setUseFallback(true);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && useFallback) {
      setCountdown(15);
      setCanClose(false);
      
      const timer = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Try to play video
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
      }

      return () => clearInterval(timer);
    }
  }, [isOpen, useFallback]);

  if (!isOpen) return null;
  // If we are on app and NOT using fallback, AdMob will show its own native UI
  if (!useFallback && isApp) return null;

  const handleManualClose = () => {
    if (canClose) {
      onComplete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black animate-fade-in">
      {/* Video Container */}
      <div className="relative w-full h-full max-w-4xl max-h-[80vh] bg-slate-900 overflow-hidden md:rounded-3xl shadow-2xl border border-white/10">
        <video
          ref={videoRef}
          src={adVideoUrl}
          className="w-full h-full object-contain"
          playsInline
          muted={isMuted}
          onEnded={() => setCanClose(true)}
        />

        {/* Top Info Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-bold tracking-wider uppercase">
              {canClose ? "Ödül Hazır!" : `Ödül İçin: ${countdown}s`}
            </span>
          </div>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 hover:bg-black/60 transition-all"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Close Button (Hidden until done) */}
        {canClose ? (
          <button
            onClick={handleManualClose}
            className="absolute top-4 right-4 bg-emerald-500 hover:bg-emerald-400 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 animate-bounce"
          >
            <X className="w-6 h-6 stroke-[3px]" />
          </button>
        ) : (
          <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white/50 p-3 rounded-full border border-white/10 cursor-not-allowed">
            <X className="w-6 h-6" />
          </div>
        )}

        {/* Reward Preview */}
        {!canClose && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
             <div className="bg-emerald-500 p-2 rounded-lg">
                <Gift className="w-5 h-5 text-white" />
             </div>
             <div className="text-left">
                <p className="text-[10px] text-white/60 uppercase font-black">Kazanılacak Ödül</p>
                <p className="text-white font-bold">+50 Coin</p>
             </div>
          </div>
        )}

        {/* Progress Bar */}
        {!canClose && (
          <div className="absolute bottom-0 left-0 h-1.5 bg-emerald-500 transition-all duration-1000 ease-linear" style={{ width: `${(15 - countdown) / 15 * 100}%` }} />
        )}
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
