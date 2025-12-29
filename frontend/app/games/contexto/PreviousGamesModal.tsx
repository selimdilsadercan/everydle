"use client";

import React from "react";
import { X, CheckCircle2, XCircle, Circle, Play } from "lucide-react";

interface PreviousGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (gameNumber: number) => void;
}

export const AVAILABLE_GAMES = [
  { gameNumber: 1, dateString: "23.11.2025", word: "gemi", displayDate: "23 Kasım" },
  { gameNumber: 2, dateString: "24.11.2025", word: "uyku", displayDate: "24 Kasım" },
  { gameNumber: 3, dateString: "25.11.2025", word: "kahve", displayDate: "25 Kasım" }
];

export default function PreviousGamesModal({
  isOpen,
  onClose,
  onSelectGame,
}: PreviousGamesModalProps) {
  // LocalStorage'dan oyun durumlarını oku
  const getGameStatus = (
    gameNumber: number
  ): "won" | "lost" | "playing" | "not-played" => {
    try {
      const saved = localStorage.getItem(`contexto-game-${gameNumber}`);
      if (!saved) return "not-played";

      const parsed = JSON.parse(saved);
      if (parsed.gameWon) return "won";
      if (parsed.gaveUp) return "lost";

      // Eğer tahmin yapılmışsa ama oyun bitmemişse
      if (parsed.guesses && parsed.guesses.length > 0) return "playing";

      return "not-played";
    } catch {
      return "not-played";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-100">Önceki Oyunlar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game List */}
        <div className="overflow-y-auto p-4 space-y-2">
          {[...AVAILABLE_GAMES].reverse().map((game) => {
            const status = getGameStatus(game.gameNumber);

            return (
              <button
                key={game.gameNumber}
                onClick={() => {
                  onSelectGame(game.gameNumber);
                  onClose();
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-4 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    {status === "won" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : status === "lost" ? (
                      <XCircle className="w-6 h-6 text-slate-400" />
                    ) : status === "playing" ? (
                      <Play className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-500" />
                    )}
                  </div>

                  {/* Game Info */}
                  <div className="text-left">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-emerald-400">
                          #{game.gameNumber}
                        </span>
                        <span className="text-sm text-slate-400 font-medium">
                          {game.displayDate}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                        {status === "won" || status === "lost" ? game.word : "?????"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Text */}
                <div className="text-sm font-semibold">
                  {status === "won" ? (
                    <span className="text-emerald-500">Kazanıldı</span>
                  ) : status === "lost" ? (
                    <span className="text-slate-400">Kaybedildi</span>
                  ) : status === "playing" ? (
                    <span className="text-yellow-500">Oynuyor</span>
                  ) : (
                    <span className="text-slate-500">Oynanmadı</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
