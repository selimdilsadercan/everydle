import arenaData from "@/data/arenas.json";

export interface Arena {
  id: number;
  name: string;
  minTrophies: number;
  maxTrophies: number;
  icon: string;
  color: string;
  bgColor: string;
  unlocks: string[];
}

export interface Feature {
  name: string;
  description: string;
  icon: string;
  requiredArena: number;
}

const TROPHY_STORAGE_KEY = "userTrophies";

// Kullanıcının kupasını al
export function getUserTrophies(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(TROPHY_STORAGE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

// Kullanıcının kupasını ayarla
export function setUserTrophies(trophies: number): void {
  if (typeof window === "undefined") return;
  // Minimum 0 kupa
  const newTrophies = Math.max(0, trophies);
  localStorage.setItem(TROPHY_STORAGE_KEY, newTrophies.toString());
}

// Kupa ekle veya çıkar
export function addTrophies(amount: number): number {
  const current = getUserTrophies();
  const newTotal = Math.max(0, current + amount);
  setUserTrophies(newTotal);
  return newTotal;
}

// Maç sonucu kupa değişimi
export function applyMatchResult(result: "win" | "lose" | "draw"): number {
  const rewards = arenaData.trophyRewards;
  const amount = rewards[result];
  return addTrophies(amount);
}

// Mevcut arenayı al
export function getCurrentArena(trophies?: number): Arena {
  const currentTrophies = trophies ?? getUserTrophies();
  const arena = arenaData.arenas.find(
    (a) => currentTrophies >= a.minTrophies && currentTrophies <= a.maxTrophies
  );
  return arena || arenaData.arenas[0];
}

// Sonraki arenayı al
export function getNextArena(trophies?: number): Arena | null {
  const current = getCurrentArena(trophies);
  const nextArena = arenaData.arenas.find((a) => a.id === current.id + 1);
  return nextArena || null;
}

// Arena ilerleme yüzdesi
export function getArenaProgress(trophies?: number): number {
  const currentTrophies = trophies ?? getUserTrophies();
  const arena = getCurrentArena(currentTrophies);
  const range = arena.maxTrophies - arena.minTrophies;
  const progress = currentTrophies - arena.minTrophies;
  return Math.min(100, Math.max(0, (progress / range) * 100));
}

// Bir özelliğin açık olup olmadığını kontrol et
export function isFeatureUnlocked(featureId: string, trophies?: number): boolean {
  const feature = arenaData.features[featureId as keyof typeof arenaData.features];
  if (!feature) return false;
  
  const currentArena = getCurrentArena(trophies);
  return currentArena.id >= feature.requiredArena;
}

// Tüm açık özellikleri al
export function getUnlockedFeatures(trophies?: number): Feature[] {
  const currentArena = getCurrentArena(trophies);
  const features: Feature[] = [];
  
  Object.entries(arenaData.features).forEach(([id, feature]) => {
    if (currentArena.id >= feature.requiredArena) {
      features.push(feature);
    }
  });
  
  return features;
}

// Sonraki arenada açılacak özellikleri al
export function getNextArenaFeatures(trophies?: number): Feature[] {
  const nextArena = getNextArena(trophies);
  if (!nextArena) return [];
  
  const features: Feature[] = [];
  nextArena.unlocks.forEach((featureId) => {
    const feature = arenaData.features[featureId as keyof typeof arenaData.features];
    if (feature) {
      features.push(feature);
    }
  });
  
  return features;
}

// Tüm arenaları al
export function getAllArenas(): Arena[] {
  return arenaData.arenas;
}

// Bir özelliğin bilgisini al
export function getFeatureInfo(featureId: string): Feature | null {
  return arenaData.features[featureId as keyof typeof arenaData.features] || null;
}
