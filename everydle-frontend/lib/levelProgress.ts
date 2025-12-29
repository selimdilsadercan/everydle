// Level Progress Utilities
// Manages user's level progress across all games

const STORAGE_KEY = "everydle-level-progress";

export interface LevelProgress {
  currentLevel: number;
  completedLevels: number[];
  lastUpdated: string;
}

// Get default progress
function getDefaultProgress(): LevelProgress {
  return {
    currentLevel: 1,
    completedLevels: [],
    lastUpdated: new Date().toISOString(),
  };
}

// Load level progress from localStorage
export function getLevelProgress(): LevelProgress {
  if (typeof window === "undefined") return getDefaultProgress();
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return getDefaultProgress();
  
  try {
    return JSON.parse(stored);
  } catch {
    return getDefaultProgress();
  }
}

// Save level progress to localStorage
export function saveLevelProgress(progress: LevelProgress): void {
  if (typeof window === "undefined") return;
  progress.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Complete a level and advance to next
export function completeLevel(levelId: number): LevelProgress {
  const progress = getLevelProgress();
  
  // Only complete if it's the current level or hasn't been completed yet
  if (!progress.completedLevels.includes(levelId)) {
    progress.completedLevels.push(levelId);
  }
  
  // If this is the current level, advance to next
  if (levelId === progress.currentLevel) {
    progress.currentLevel = levelId + 1;
  }
  
  saveLevelProgress(progress);
  return progress;
}

// Check if a level is completed
export function isLevelCompleted(levelId: number): boolean {
  return getLevelProgress().completedLevels.includes(levelId);
}

// Get current level
export function getCurrentLevel(): number {
  return getLevelProgress().currentLevel;
}

// Get total completed levels count
export function getCompletedLevelsCount(): number {
  return getLevelProgress().completedLevels.length;
}

// Get next uncompleted level
export function getNextUncompletedLevel(): number {
  const progress = getLevelProgress();
  return progress.currentLevel;
}

// Reset all progress (for testing)
export function resetProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
