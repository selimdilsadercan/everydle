"use client";

import React from "react";
import { X } from "lucide-react";

type HowToPlayModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HowToPlayModal({
  isOpen,
  onClose,
}: HowToPlayModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">❓</span> Nasıl Oynanır
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-200">
          <p className="text-base leading-relaxed">
            5 harfli gizli kelimeyi bulun. 6 tahmin hakkınız var.
          </p>

          <div className="space-y-2">
            <p className="text-base leading-relaxed font-semibold">
              Renklerin anlamı:
            </p>
            <div className="space-y-2 ml-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded flex items-center justify-center text-white font-bold">
                  A
                </div>
                <p className="text-base">
                  <span className="font-semibold">Yeşil:</span> Harf doğru yerde
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded flex items-center justify-center text-white font-bold">
                  B
                </div>
                <p className="text-base">
                  <span className="font-semibold">Sarı:</span> Harf kelimede var
                  ama yanlış yerde
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-600 rounded flex items-center justify-center text-white font-bold">
                  C
                </div>
                <p className="text-base">
                  <span className="font-semibold">Gri:</span> Harf kelimede yok
                </p>
              </div>
            </div>
          </div>

          <p className="text-base leading-relaxed">
            Her tahmin geçerli bir 5 harfli kelime olmalıdır. Enter tuşuna
            basarak tahmininizi gönderin.
          </p>
        </div>
      </div>
    </div>
  );
}
