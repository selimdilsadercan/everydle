// Daily game completion tracking using localStorage

const DAILY_COMPLETION_PREFIX = "everydle_daily_";

export interface DailyCompletion {
  date: string; // YYYY-MM-DD format
  completedGames: string[]; // Array of game IDs
}

// Get date in YYYY-MM-DD format (local timezone)
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return formatDate(new Date());
}

// Get storage key for a specific date
function getStorageKey(date: string): string {
  return `${DAILY_COMPLETION_PREFIX}${date}`;
}

// Get daily completion data for a specific date
export function getDailyCompletionForDate(date: string): DailyCompletion {
  if (typeof window === "undefined") {
    return { date, completedGames: [] };
  }
  
  const stored = localStorage.getItem(getStorageKey(date));
  if (!stored) {
    return { date, completedGames: [] };
  }
  
  try {
    const data: DailyCompletion = JSON.parse(stored);
    return data;
  } catch {
    return { date, completedGames: [] };
  }
}

// Get daily completion data for today (legacy support)
export function getDailyCompletion(): DailyCompletion {
  return getDailyCompletionForDate(getTodayDate());
}

// Mark a game as completed for a specific date (defaults to today)
export function markGameCompleted(gameId: string, date?: string): void {
  if (typeof window === "undefined") return;
  
  const targetDate = date || getTodayDate();
  const completion = getDailyCompletionForDate(targetDate);
  
  if (!completion.completedGames.includes(gameId)) {
    completion.completedGames.push(gameId);
    completion.date = targetDate;
    localStorage.setItem(getStorageKey(targetDate), JSON.stringify(completion));
    
    // Dispatch custom event so AppBar can update
    window.dispatchEvent(new CustomEvent("dailyProgressUpdate", { 
      detail: { gameId, date: targetDate, count: completion.completedGames.length } 
    }));
  }
}

// Remove a game from completed games for a specific date (defaults to today)
export function unmarkGameCompleted(gameId: string, date?: string): void {
  if (typeof window === "undefined") return;
  
  const targetDate = date || getTodayDate();
  const completion = getDailyCompletionForDate(targetDate);
  
  const index = completion.completedGames.indexOf(gameId);
  if (index > -1) {
    completion.completedGames.splice(index, 1);
    completion.date = targetDate;
    localStorage.setItem(getStorageKey(targetDate), JSON.stringify(completion));
  }
}

// Check if a game is completed for a specific date
export function isGameCompletedForDate(gameId: string, date: string): boolean {
  const completion = getDailyCompletionForDate(date);
  return completion.completedGames.includes(gameId);
}

// Check if a game is completed today
export function isGameCompletedToday(gameId: string): boolean {
  return isGameCompletedForDate(gameId, getTodayDate());
}

// Get all completed games for a specific date
export function getCompletedGamesForDate(date: string): string[] {
  return getDailyCompletionForDate(date).completedGames;
}

// Get all completed games for today
export function getCompletedGamesToday(): string[] {
  return getCompletedGamesForDate(getTodayDate());
}

// Get completion count for today
export function getTodayCompletionCount(): number {
  return getDailyCompletion().completedGames.length;
}

// Format date for display (Turkish)
export function formatDateForDisplay(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays === -1) return "Yarın";
  
  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  
  return `${day} ${month}`;
}
