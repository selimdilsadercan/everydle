"use client";

import React from "react";

type WordEntry = {
  rank: number;
  word: string;
  similarity: number;
};

type ClosestWordsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  words: WordEntry[];
  getBarColor: (rank: number, status: "hit" | "inList") => string;
  getBarWidth: (rank: number | null) => string;
};

export default function ClosestWordsModal({
  isOpen,
  onClose,
  words,
  getBarColor,
  getBarWidth,
}: ClosestWordsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-xl font-bold">En Yakın 500 Kelime</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Modal Content with custom scrollbar */}
        <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {words.map((entry) => {
            const barColor = getBarColor(
              entry.rank,
              entry.rank === 1 ? "hit" : "inList"
            );
            const barWidth = getBarWidth(entry.rank);

            return (
              <div key={entry.word} className="bg-slate-700 rounded">
                <div className="relative h-8 flex items-center">
                  <div
                    className={`absolute inset-y-0 left-0 rounded ${barColor}`}
                    style={{ width: barWidth, maxWidth: "100%" }}
                  />
                  <div className="relative z-10 flex w-full items-center justify-between px-2 text-sm font-semibold">
                    <span>{entry.word}</span>
                    <span className="font-mono text-xs">{entry.rank}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: #1e293b;
            border-radius: 4px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }

          /* Firefox */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #475569 #1e293b;
          }
        `}</style>
      </div>
    </div>
  );
}
