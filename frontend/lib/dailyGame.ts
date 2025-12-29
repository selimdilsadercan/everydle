// Daily game utilities
// Manages daily game numbers and completion tracking

// Base date for calculating game numbers (start of the game)
const BASE_DATE = new Date("2024-12-01").getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Get today's game number
export function getTodayGameNumber(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - BASE_DATE) / MS_PER_DAY) + 1;
}

// Get game number for a specific date
export function getGameNumberForDate(date: Date): number {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return Math.floor((targetDate.getTime() - BASE_DATE) / MS_PER_DAY) + 1;
}

// Get date for a specific game number
export function getDateForGameNumber(gameNumber: number): Date {
  const date = new Date(BASE_DATE + (gameNumber - 1) * MS_PER_DAY);
  return date;
}

// Storage key for completed games
function getStorageKey(gameId: string): string {
  return `everydle-${gameId}-completed`;
}

// Get completed game numbers for a specific game
export function getCompletedGames(gameId: string): number[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(getStorageKey(gameId));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// Mark a game as completed
export function markGameCompleted(gameId: string, gameNumber: number): void {
  if (typeof window === "undefined") return;
  const completed = getCompletedGames(gameId);
  if (!completed.includes(gameNumber)) {
    completed.push(gameNumber);
    localStorage.setItem(getStorageKey(gameId), JSON.stringify(completed));
  }
}

// Check if a specific game number is completed
export function isGameCompleted(gameId: string, gameNumber: number): boolean {
  return getCompletedGames(gameId).includes(gameNumber);
}

// Get the next available daily game number for a user
// If today's game is completed, returns yesterday's, etc.
// Returns the most recent uncompleted game, or today's if all are completed
export function getNextDailyGameNumber(gameId: string): number {
  const todayNumber = getTodayGameNumber();
  const completed = getCompletedGames(gameId);
  
  // Start from today and go backwards to find an uncompleted game
  for (let num = todayNumber; num >= 1; num--) {
    if (!completed.includes(num)) {
      return num;
    }
  }
  
  // If all games are completed, return today's game
  return todayNumber;
}

// Game mode types
export type GameMode = "levels" | "practice" | "challenge";

// Parse game mode from URL search params
export function parseGameMode(searchParams: URLSearchParams): GameMode {
  const mode = searchParams.get("mode");
  if (mode === "levels" || mode === "practice" || mode === "challenge") {
    return mode;
  }
  return "practice"; // Default mode
}

// Format date for display
export function formatGameDate(gameNumber: number): string {
  const date = getDateForGameNumber(gameNumber);
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
