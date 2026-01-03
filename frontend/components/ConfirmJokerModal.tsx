"use client";

import { LightBulbIcon } from "@heroicons/react/24/solid";
import { ArrowBigRight, X } from "lucide-react";

type JokerType = "hint" | "skip";

interface ConfirmJokerModalProps {
  isOpen: boolean;
  type: JokerType;
  remainingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export default function ConfirmJokerModal({
  isOpen,
  type,
  remainingCount,
  onConfirm,
  onCancel,
  title,
  description,
}: ConfirmJokerModalProps) {
  if (!isOpen) return null;

  const isHint = type === "hint";
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-5 max-w-sm w-[90%] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-2 right-2 p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
        
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isHint ? "bg-yellow-500/20" : "bg-pink-500/20"
          }`}>
            {isHint ? (
              <LightBulbIcon className="w-6 h-6 text-yellow-400" />
            ) : (
              <ArrowBigRight className="w-6 h-6 text-pink-400" />
            )}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-center text-white mb-1">
          {title || (isHint ? "İpucu Kullan" : "Atla Kullan")}
        </h3>
        
        {/* Description */}
        <p className="text-slate-400 text-center text-sm mb-3 px-2">
          {description || (isHint 
            ? "Bir ipucu kullanarak rastgele bir harf/pozisyon açılacak."
            : "Atla kullanarak oyunu geçebilirsiniz."
          )}
        </p>
        
        {/* Remaining Count */}
        <div className={`text-center mb-4 py-1.5 rounded-lg ${
          isHint ? "bg-yellow-500/10" : "bg-pink-500/10"
        }`}>
          <span className="text-slate-400 text-sm">Kalan: </span>
          <span className={`font-bold text-base ${
            isHint ? "text-yellow-400" : "text-pink-400"
          }`}>
            {remainingCount}
          </span>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-3 rounded-lg font-semibold text-sm transition-colors ${
              isHint 
                ? "bg-yellow-500 hover:bg-yellow-600 text-slate-900"
                : "bg-pink-500 hover:bg-pink-600 text-white"
            }`}
          >
            Kullan
          </button>
        </div>
      </div>
    </>
  );
}
