import React from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { 
  getUserByFirebaseId, 
  getUser,
  getUserStars, 
  getUserTrophies, 
  getUserInventory, 
  getLevelProgress,
  getFriends,
  getPendingRequests,
  createUser,
  updateUser,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  getCompletedLevels
} from "@/app/profile/actions";
import { getLeaderboard } from "@/app/challenge/actions";
import { canClaimDailyReward } from "@/app/store/actions";

// Keys for cache invalidation
export const QUERY_KEYS = {
  user: (userId: string) => ["user", userId],
  userByFirebase: (firebaseId: string) => ["user", "firebase", firebaseId],
  stars: (userId: string) => ["stars", userId],
  trophies: (userId: string) => ["trophies", userId],
  inventory: (userId: string) => ["inventory", userId],
  levelProgress: (userId: string) => ["levelProgress", userId],
  friends: (userId: string) => ["friends", userId],
  pendingRequests: (userId: string) => ["pendingRequests", userId],
  leaderboard: (limit: number) => ["leaderboard", limit],
  completedLevels: (userId: string) => ["completedLevels", userId],
  reward: (userId: string) => ["reward", userId],
  dailyProgress: (userId: string) => ["dailyProgress", userId],
  matchHistory: (userId: string) => ["matchHistory", userId],
};

// 1. Get User by Firebase ID
export function useUserByFirebaseId(firebaseId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.userByFirebase(firebaseId || ""),
    queryFn: () => getUserByFirebaseId(firebaseId!),
    enabled: !!firebaseId,
    staleTime: Infinity, // User ID rarely changes
  });
}

// 1.5 Get User by ID
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.user(userId || ""),
    queryFn: () => getUser(userId!),
    enabled: !!userId,
  });
}

// 2. Get All User Stats Combined (Parallel Fetching)
export function useUserStats(userId: string | undefined) {
  const starsQuery = useQuery({
    queryKey: QUERY_KEYS.stars(userId || ""),
    queryFn: () => getUserStars(userId!),
    enabled: !!userId,
  });

  const trophiesQuery = useQuery({
    queryKey: QUERY_KEYS.trophies(userId || ""),
    queryFn: () => getUserTrophies(userId!),
    enabled: !!userId,
  });

  const inventoryQuery = useQuery({
    queryKey: QUERY_KEYS.inventory(userId || ""),
    queryFn: () => getUserInventory(userId!),
    enabled: !!userId,
  });

  const progressQuery = useQuery({
    queryKey: QUERY_KEYS.levelProgress(userId || ""),
    queryFn: () => getLevelProgress(userId!),
    enabled: !!userId,
  });

  return {
    stars: starsQuery.data?.data?.data?.stars || 0,
    trophies: trophiesQuery.data?.data?.data?.trophies || 0,
    wins: trophiesQuery.data?.data?.data?.wins || 0,
    losses: trophiesQuery.data?.data?.data?.losses || 0,
    hints: inventoryQuery.data?.data?.data?.hints || 0,
    giveups: inventoryQuery.data?.data?.data?.giveups || 0,
    currentLevel: progressQuery.data?.data?.progress?.current_level || 1,
    isLoading: starsQuery.isLoading || trophiesQuery.isLoading || inventoryQuery.isLoading || progressQuery.isLoading,
    isError: starsQuery.isError || trophiesQuery.isError || inventoryQuery.isError || progressQuery.isError,
  };
}

// 3. Friends List Hook
export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.friends(userId || ""),
    queryFn: () => getFriends(userId!),
    enabled: !!userId,
    select: (data) => data.data?.friends || [],
  });
}

// 4. Pending Requests Hook
export function usePendingRequests(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.pendingRequests(userId || ""),
    queryFn: () => getPendingRequests(userId!),
    enabled: !!userId,
    select: (data) => data.data?.requests || [],
    refetchInterval: 30000, // Poll every 30 seconds for new requests
  });
}

// 5. User Mutations
export function useUserMutations(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Create User
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      if (data.data?.user) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userByFirebase(data.data.user.firebase_id) });
      }
    },
  });

  // Update Username
  const updateUserMutation = useMutation({
    mutationFn: (params: { newUsername: string }) => 
      updateUser(userId!, { username: params.newUsername }),
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (userId) {
         // Direct cache update is better for immediate UI feedback
         queryClient.setQueryData(QUERY_KEYS.user(userId), (old: any) => ({
             ...old,
             username: data.data?.user?.username
         }));
         
         // Also refetch to be sure
         queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userByFirebase(data.data?.user?.firebase_id || "") });
         queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard(10) }); // Update leaderboard if username changes
      }
    },
  });

  // Accept Friend
  const acceptFriendMutation = useMutation({
    mutationFn: (friendId: string) => acceptFriendRequest(userId!, friendId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends(userId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingRequests(userId) });
      }
    },
  });

  // Reject Friend
  const rejectFriendMutation = useMutation({
    mutationFn: (friendId: string) => rejectFriendRequest(userId!, friendId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingRequests(userId) });
      }
    },
  });

  // Remove Friend
  const removeFriendMutation = useMutation({
    mutationFn: (friendId: string) => removeFriend(userId!, friendId),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends(userId) });
      }
    },
  });

  // Send Friend Request
  const sendFriendRequestMutation = useMutation({
    mutationFn: (friendId: string) => sendFriendRequest(userId!, friendId),
  });

  return {
    createUser: createUserMutation,
    updateUser: updateUserMutation,
    acceptFriend: acceptFriendMutation,
    rejectFriend: rejectFriendMutation,
    removeFriend: removeFriendMutation,
    sendFriendRequest: sendFriendRequestMutation,
  };
}

// 6. Leaderboard Hook with Pagination
export function useLeaderboard(limit: number = 10) {
  return useInfiniteQuery({
    queryKey: ["leaderboard", limit],
    queryFn: ({ pageParam = 0 }) => getLeaderboard(limit, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const currentCount = allPages.length * limit;
      // Eğer son sayfada limit kadar veri geldiyse, muhtemelen daha fazlası vardır
      return lastPage.data?.leaderboard?.length === limit ? currentCount : undefined;
    },
    // Leaderboard'u her dakika güncelle
    staleTime: 60 * 1000,
    select: (data) => data.pages.flatMap((page) => page.data?.leaderboard || []),
  });
}

// 7. Completed Levels Hook
export function useCompletedLevels(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.completedLevels(userId || ""),
    queryFn: () => getCompletedLevels(userId!, 300), // Fetch up to 300 levels
    enabled: !!userId,
    select: (data) => data.data?.levels?.map(l => l.level_id) || [],
  });
}

// 8. Daily Reward Hook
export function useCanClaimReward(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.reward(userId || ""),
    queryFn: () => canClaimDailyReward(userId!),
    enabled: !!userId,
    select: (data) => data.data || { canClaim: false, requiresVideo: false, claimsRemaining: 0, claimsToday: 0 },
  });
}

// 9. Daily Progress Hook (Completed games for today)
export function useCompletedGamesForToday(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: QUERY_KEYS.dailyProgress(userId || ""),
    queryFn: async () => {
      const { getCompletedGamesForDate } = await import("@/app/games/actions");
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return getCompletedGamesForDate(userId!, dateStr);
    },
    enabled: !!userId,
    select: (data) => data.data?.games || [],
    refetchOnWindowFocus: true,
  });

  // Listen for dailyProgressUpdate event and refetch - must use useEffect in component
  // This is handled by the component using this hook

  return query;
}

// Helper hook to listen for daily progress updates
export function useDailyProgressListener(userId: string | undefined) {
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    if (!userId) return;
    
    const handleDailyProgressUpdate = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyProgress(userId) });
      queryClient.invalidateQueries({ queryKey: ["completedGamesForDate"] });
    };
    
    window.addEventListener("dailyProgressUpdate", handleDailyProgressUpdate);
    return () => {
      window.removeEventListener("dailyProgressUpdate", handleDailyProgressUpdate);
    };
  }, [userId, queryClient]);
}

// ==================== GAMES PAGE HOOKS ====================

import { getCompletedGamesForDate, getClaimedChests } from "@/app/games/actions";

// Query keys for games page
export const GAMES_QUERY_KEYS = {
  completedGamesForDate: (userId: string, date: string) => ["completedGamesForDate", userId, date],
  claimedChests: (userId: string, date: string) => ["claimedChests", userId, date],
};

// Hook for getting completed games for a specific date
export function useCompletedGamesForDate(userId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: GAMES_QUERY_KEYS.completedGamesForDate(userId || "", date || ""),
    queryFn: () => getCompletedGamesForDate(userId!, date),
    enabled: !!userId && !!date,
    select: (data) => {
      if (data.data?.success && data.data.games) {
        return data.data.games.map(g => g.game_id).filter((id): id is string => !!id);
      }
      return [];
    },
  });
}

// Hook for getting claimed chests for a specific date
export function useClaimedChests(userId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: GAMES_QUERY_KEYS.claimedChests(userId || "", date || ""),
    queryFn: () => getClaimedChests(userId!, date!),
    enabled: !!userId && !!date,
    select: (data) => {
      if (data.data?.success && data.data.claimedMilestones) {
        return data.data.claimedMilestones;
      }
      return [];
    },
  });
}

// ==================== MATCH HISTORY HOOK ====================

import { getUserMatchHistory } from "@/app/challenge/actions";

// Hook for getting user match history with caching
export function useMatchHistory(userId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.matchHistory(userId || ""),
    queryFn: () => getUserMatchHistory(userId!, limit),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 dakika cache
    select: (data) => {
      if (data.data?.success && data.data.data) {
        return data.data.data;
      }
      return [];
    },
  });
}

// ==================== PRESENCE HOOKS (CONVEX - REAL-TIME) ====================

import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Cihaz ID'sini al (localStorage'dan)
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let deviceId = localStorage.getItem("wordleDeviceId");
  if (!deviceId) {
    deviceId = "device_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("wordleDeviceId", deviceId);
  }
  return deviceId;
}

/**
 * Convex ile gerçek zamanlı heartbeat gönderen hook
 * Her 30 saniyede bir presence günceller
 */
export function useConvexHeartbeat(encoreUserId: string | undefined, username?: string) {
  const heartbeat = useConvexMutation(api.presence.heartbeat);
  
  React.useEffect(() => {
    if (!encoreUserId) return;
    
    const deviceId = getDeviceId();
    if (!deviceId) return;
    
    // İlk heartbeat
    heartbeat({ odaId: deviceId, encoreUserId, username });
    
    // Her 30 saniyede bir heartbeat
    const interval = setInterval(() => {
      heartbeat({ odaId: deviceId, encoreUserId, username });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [encoreUserId, username, heartbeat]);
}

/**
 * Convex ile gerçek zamanlı online status sorgusu
 * Bu reaktif - değişiklikler anında yansır, polling yok!
 */
export function useConvexOnlineStatus(encoreUserIds: string[]) {
  return useConvexQuery(
    api.presence.getOnlineStatus,
    encoreUserIds.length > 0 ? { encoreUserIds } : "skip"
  );
}

/**
 * Arkadaş listesini çevrimiçi durumu ile birleştiren hook (Convex based)
 */
export function useFriendsWithOnlineStatus(userId: string | undefined) {
  const { data: friends = [], isLoading: isFriendsLoading } = useFriends(userId);
  
  const friendIds = friends.map(f => f.id);
  const onlineStatus = useConvexOnlineStatus(friendIds);
  
  // Combine friends with their online status
  const friendsWithStatus = friends.map(friend => ({
    ...friend,
    isOnline: onlineStatus?.[friend.id]?.isOnline || false,
    lastSeen: onlineStatus?.[friend.id]?.lastSeen || 0,
  }));
  
  return {
    friends: friendsWithStatus,
    isLoading: isFriendsLoading,
  };
}

// Legacy export for backward compatibility
export const useHeartbeat = useConvexHeartbeat;
