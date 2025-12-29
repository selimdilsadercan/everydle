"use client";

import React, { useMemo } from "react";
import { X, CheckCircle2, XCircle, Circle, Play } from "lucide-react";

interface PreviousGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (gameNumber: number) => void;
}

// İlk oyun tarihi - daily_wordle.json ile eşleşmeli
const FIRST_GAME_DATE = new Date(2025, 10, 23); // 23 Kasım 2025 (ay 0-indexed)
const FIRST_GAME_NUMBER = 1;

export default function PreviousGamesModal({
  isOpen,
  onClose,
  onSelectGame,
}: PreviousGamesModalProps) {
  // Bugünden FIRST_GAME_DATE'e kadar olan tüm tarihleri ve oyun numaralarını oluştur
  const gameList = useMemo(() => {
    const games: Array<{
      gameNumber: number;
      date: Date;
      dateString: string;
      dayName: string;
      isToday: boolean;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDate = new Date(FIRST_GAME_DATE);
    firstDate.setHours(0, 0, 0, 0);

    // Günler arasındaki fark
    const daysDiff = Math.floor(
      (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Bugünden geriye doğru listeyi oluştur (i = 0 bugün, i = 1 dün, vs.)
    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() - i);

      const gameNumber = FIRST_GAME_NUMBER + daysDiff - i;

      const monthNames = [
        "Ocak",
        "Şubat",
        "Mart",
        "Nisan",
        "Mayıs",
        "Haziran",
        "Temmuz",
        "Ağustos",
        "Eylül",
        "Ekim",
        "Kasım",
        "Aralık",
      ];

      const day = currentDate.getDate();
      const month = monthNames[currentDate.getMonth()];

      // DD.MM.YYYY formatında tarih
      const dateString = `${String(currentDate.getDate()).padStart(
        2,
        "0"
      )}.${String(currentDate.getMonth() + 1).padStart(
        2,
        "0"
      )}.${currentDate.getFullYear()}`;

      games.push({
        gameNumber,
        date: currentDate,
        dateString,
        dayName: i === 0 ? "Bugün" : `${day} ${month}`,
        isToday: i === 0,
      });
    }

    return games;
  }, []);

  // LocalStorage'dan oyun durumlarını oku
  const getGameStatus = (
    gameNumber: number
  ): "won" | "lost" | "playing" | "not-played" => {
    try {
      const saved = localStorage.getItem(`wordle-game-${gameNumber}`);
      if (!saved) return "not-played";

      const parsed = JSON.parse(saved);
      if (parsed.gameWon) return "won";
      if (parsed.gameLost) return "lost";

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
          {gameList.map((game) => {
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
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-emerald-400">
                        #{game.gameNumber}
                      </span>
                      <span className="text-sm text-slate-400">
                        {game.dayName}
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
