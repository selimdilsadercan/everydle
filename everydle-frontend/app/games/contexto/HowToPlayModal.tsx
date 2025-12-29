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
            Gizli kelimeyi bulun. Sınırsız tahmin hakkınız var.
          </p>

          <p className="text-base leading-relaxed">
            Kelimeler, yapay zeka algoritması kullanılarak gizli kelimeye ne
            kadar benzer olduklarına göre sıralanmıştır.
          </p>

          <p className="text-base leading-relaxed">
            Bir kelime yazdıktan sonra, sırasını göreceksiniz. Gizli kelime 1
            numaralıdır.
          </p>

          <p className="text-base leading-relaxed">
            Algoritma binlerce metni analiz etti. Kelimelerin kullanıldığı
            bağlamı kullanarak aralarındaki benzerliği hesaplar.
          </p>
        </div>
      </div>
    </div>
  );
}
