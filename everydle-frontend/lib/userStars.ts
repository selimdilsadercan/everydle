// User stars management using localStorage

const STARS_KEY = "everydle_user_stars";

export interface UserStars {
  stars: number;
  lastUpdated: string;
}

// Get user stars from localStorage
export function getUserStars(): number {
  if (typeof window === "undefined") return 0;
  
  const stored = localStorage.getItem(STARS_KEY);
  if (!stored) {
    // Initialize with 100 stars for new users
    setUserStars(100);
    return 100;
  }
  
  try {
    const data: UserStars = JSON.parse(stored);
    return data.stars;
  } catch {
    return 0;
  }
}

// Set user stars
export function setUserStars(stars: number): void {
  if (typeof window === "undefined") return;
  
  const data: UserStars = {
    stars: Math.max(0, stars),
    lastUpdated: new Date().toISOString(),
  };
  
  localStorage.setItem(STARS_KEY, JSON.stringify(data));
}

// Add stars to user
export function addStars(amount: number): number {
  const current = getUserStars();
  const newTotal = current + amount;
  setUserStars(newTotal);
  return newTotal;
}

// Remove stars from user (returns false if not enough stars)
export function removeStars(amount: number): boolean {
  const current = getUserStars();
  if (current < amount) return false;
  
  setUserStars(current - amount);
  return true;
}

// Check if user has enough stars
export function hasEnoughStars(amount: number): boolean {
  return getUserStars() >= amount;
}
