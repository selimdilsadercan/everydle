"use client";

import { useState, useEffect } from "react";
import { Diamond } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { ChestIcon } from "./ChestIcon";

export interface RewardData {
  type: 'coins' | 'hint';
  amount: number;
}

export interface RewardModalProps {
  show: boolean;
  onClose: () => void;
  reward: RewardData;
}

export const RewardModal = ({ show, onClose, reward }: RewardModalProps) => {
  const [isOpening, setIsOpening] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (show) {
      setIsOpening(true);
      setIsRevealed(false);
      
      const timer = setTimeout(() => {
        setIsOpening(false);
        setIsRevealed(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-fade-in overflow-hidden">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        
        {/* Chest Animation Container */}
        <div className={`transition-all duration-700 pointer-events-none ${isRevealed ? 'scale-50 -translate-y-48 opacity-0' : 'scale-150'}`}>
          <div className={`${isOpening ? 'animate-bounce' : ''}`}>
            <ChestIcon status="ready" milestone={8} size="lg" />
          </div>
        </div>

        {/* Revealed Reward */}
        {isRevealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center animate-reward-reveal overflow-visible">
            {/* Global Rays */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
              <div className="w-[600px] h-[600px] bg-gradient-conic from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 animate-spin-slow rounded-full blur-[100px] opacity-80" />
              <div className="absolute w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px]" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center overflow-visible">
              {/* Reward Card */}
              <div className="w-40 h-40 bg-slate-900 border-4 border-emerald-500/50 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.3)] flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-[22px]" />
                <div className="relative z-10">
                  {reward.type === 'coins' ? (
                    <Diamond className="w-20 h-20 text-orange-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" fill="currentColor" />
                  ) : (
                    <LightBulbIcon className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                  )}
                </div>
              </div>

              <h2 className="text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">
                {reward.type === 'coins' ? `${reward.amount} COIN` : `${reward.amount} İPUCU`}
              </h2>
              <p className="text-emerald-400 font-bold tracking-[0.3em] uppercase text-sm mb-12">Yeni Ödül!</p>
              
              <button
                onClick={onClose}
                className="px-16 py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl shadow-[0_8px_0_0_#059669] hover:shadow-[0_4px_0_0_#059669] active:shadow-none transform active:translate-y-1 transition-all uppercase tracking-widest text-xl"
              >
                TAMAM
              </button>
            </div>
          </div>
        )}
        
        {/* Opening Text */}
        {isOpening && (
          <p className="absolute bottom-24 text-white font-black text-2xl animate-pulse tracking-widest">AÇILIYOR...</p>
        )}

      </div>
    </div>
  );
};
