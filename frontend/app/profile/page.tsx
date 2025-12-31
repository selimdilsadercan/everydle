"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Gamepad2, 
  Settings, 
  LogOut, 
  LogIn, 
  Swords, 
  Zap, 
  Star,
  Edit3,
  Check,
  X,
  Loader2,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Share2,
  Bell,
  Lock
} from "lucide-react";
import { Diamond } from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import AppBar from "@/components/AppBar";
import Header, { triggerDataRefresh } from "@/components/Header";
import PullToRefresh from "@/components/PullToRefresh";
import LoginModal from "@/components/LoginModal";
import UsernameSetupModal from "@/components/UsernameSetupModal";
import ConfirmModal from "@/components/ConfirmModal";
import { ProfilePageSkeleton } from "@/components/SkeletonLoading";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { friendship } from "@/lib/client";
import { useQueryClient } from "@tanstack/react-query";

// React Query Hooks
import { 
  useUserByFirebaseId, 
  useUserStats, 
  usePendingRequests,
  useUserMutations,
  useFriendsWithOnlineStatus,
  useHeartbeat,
  QUERY_KEYS
} from "@/hooks/useProfileData";

// Cihaz ID'si oluştur veya al
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  
  let deviceId = localStorage.getItem("wordleDeviceId");
  if (!deviceId) {
    deviceId = "device_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("wordleDeviceId", deviceId);
  }
  return deviceId;
}

export default function ProfilePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  
  // Username edit state
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showFriendRemoveConfirm, setShowFriendRemoveConfirm] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<friendship.FriendUser | null>(null);

  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();
  
  // Cihaz ID'sini al
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // 1. Data Fetching with React Query
  // Firebase ID ile Encore kullanıcısını bul
  const { data: userResult, isLoading: isUserLoading } = useUserByFirebaseId(user?.uid);
  const backendUser = userResult?.data?.user;
  const backendUserId = backendUser?.id;

  // İstatistikleri çek (eğer backendUserId varsa)
  const stats = useUserStats(backendUserId);

  // Arkadaşları gerçek zamanlı online durumu ile çek
  const { friends = [], isLoading: isFriendsLoading } = useFriendsWithOnlineStatus(backendUserId);
  
  // Heartbeat ile kullanıcının online durumunu güncelle
  useHeartbeat(backendUserId);
  
  // İstekleri çek
  const { data: pendingRequests = [], isLoading: isRequestsLoading } = usePendingRequests(backendUserId);

  // Mutations
  const { 
    updateUser: updateUserMutation, 
    acceptFriend, 
    rejectFriend, 
    removeFriend,
    createUser: createUserMutation 
  } = useUserMutations(backendUserId);

  const queryClient = useQueryClient();

  // Convex mutations
  const updateConvexUsername = useMutation(api.users.updateUsername);
  const linkFirebaseIdMutation = useMutation(api.users.linkFirebaseId);
  
  // Convex'te device ID ile kullanıcı kontrolü
  const convexUser = useQuery(
    api.users.getUserByDeviceId,
    deviceId ? { deviceId } : "skip"
  );

  // Cihaz ID'sini al
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Kullanıcı verilerini yükleme (loadUserData) - ARTIK REACT QUERY TARAFINDAN OTOMATİK YAPILIYOR
  // useEffect de kaldırıldı.

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (backendUserId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userByFirebase(user?.uid || "") }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stars(backendUserId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trophies(backendUserId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory(backendUserId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends(backendUserId) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingRequests(backendUserId) }),
      ]);
    }
    triggerDataRefresh();
  }, [queryClient, backendUserId, user?.uid]);

  // Username düzenleme fonksiyonları
  const handleStartEditUsername = () => {
    setEditedUsername(backendUser?.username || convexUser?.username || "");
    setUsernameError("");
    setIsEditingUsername(true);
  };

  const handleCancelEditUsername = () => {
    setIsEditingUsername(false);
    setEditedUsername("");
    setUsernameError("");
  };

  const handleSaveUsername = async () => {
    const trimmed = editedUsername.trim();
    
    // Validasyon
    if (!trimmed) {
      setUsernameError("Kullanıcı adı boş olamaz");
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError("Kullanıcı adı en az 3 karakter olmalı");
      return;
    }
    if (trimmed.length > 15) {
      setUsernameError("Kullanıcı adı en fazla 15 karakter olabilir");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError("Sadece harf, rakam ve alt çizgi kullanabilirsiniz");
      return;
    }

    setUsernameError("");

    try {
      // Convex'te güncelle
      const convexResult = await updateConvexUsername({
        deviceId,
        newUsername: trimmed,
      });

      if (!convexResult.success) {
        setUsernameError(convexResult.error || "Bir hata oluştu");
        return;
      }

      // Encore DB'de güncelle (React Query Mutation)
      await updateUserMutation.mutateAsync({ newUsername: trimmed });

      setIsEditingUsername(false);
      setEditedUsername("");
    } catch (error) {
      console.error("Username save error:", error);
      setUsernameError("Bir hata oluştu, tekrar deneyin");
    }
  };

  const handleUsernameSetupComplete = (username: string) => {
    // Burada backendUser state'i güncellemeye gerek yok, React Query otomatik olarak userByFirebaseId hookunu tetikleyecek (çünkü success olduğunda invalidate ediyoruz)
    setShowUsernameModal(false);
  };

  // Görüntülenecek username
  const displayUsername = backendUser?.username || convexUser?.username || null;

  // Giriş yapmamış kullanıcı için profil kartı
  const renderGuestProfile = () => (
    <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-4xl mb-4 shadow-lg relative">
          👤
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Misafir Oyuncu</h2>
        <p className="text-slate-400 text-sm">Giriş yapmadınız</p>
      </div>

      {/* Login CTA */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-xl p-4 mb-4 border border-emerald-500/20">
        <div className="text-center mb-4">
          <p className="text-white font-medium mb-1">
            Hesabınıza giriş yapın
          </p>
          <p className="text-sm text-slate-400">
            İstatistiklerinizi kaydedin ve başarılarınızı takip edin
          </p>
        </div>
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
        >
          <LogIn className="w-5 h-5" />
          <span>Giriş Yap</span>
        </button>
      </div>

      {/* Features List */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>İstatistiklerinizi bulutta saklayın</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>Başarılarınızı takip edin</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>Cihazlar arası senkronizasyon</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="text-emerald-400">✓</span>
          <span>Liderlik tablolarına katılın</span>
        </div>
      </div>
    </div>
  );

  // Giriş yapmış kullanıcı için profil kartı
  const renderAuthenticatedProfile = () => (
    <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-24 h-24 rounded-full mb-4 shadow-lg shadow-emerald-500/30 border-4 border-emerald-500/30"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-emerald-500/30">
            👤
          </div>
        )}
        <p className="text-slate-400 text-sm">{user?.email}</p>
      </div>

      {/* Username Section - Editable */}
      <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 rounded-xl p-4 mb-6 border border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
            <Swords className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 mb-1">Kullanıcı Adı</p>
            {isEditingUsername ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => {
                    setEditedUsername(e.target.value);
                    setUsernameError("");
                  }}
                  maxLength={15}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-sm"
                  placeholder="kullanici_adi"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveUsername();
                    if (e.key === "Escape") handleCancelEditUsername();
                  }}
                />
                {usernameError && (
                  <p className="text-red-400 text-xs">{usernameError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUsername}
                    disabled={updateUserMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {updateUserMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Kaydet
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEditUsername}
                    className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {displayUsername ? (
                  <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400">
                    {displayUsername}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowUsernameModal(true)}
                    className="text-orange-400 text-sm underline hover:text-orange-300 transition-colors"
                  >
                    Kullanıcı adı oluştur
                  </button>
                )}
                {displayUsername && (
                  <button
                    onClick={handleStartEditUsername}
                    className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                    title="Düzenle"
                  >
                    <Edit3 className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {isUserLoading || stats.isLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.trophies}</p>
            <p className="text-xs text-slate-400">Kupa</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Gamepad2 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.wins + stats.losses}</p>
            <p className="text-xs text-slate-400">Maç</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Diamond className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.stars}</p>
            <p className="text-xs text-slate-400">Yıldız</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-3 text-center">
            <Zap className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.currentLevel}</p>
            <p className="text-xs text-slate-400">Seviye</p>
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="flex gap-3">
        <div className="flex-1 bg-slate-700/30 rounded-xl p-3 flex items-center gap-2">
          <LightBulbIcon className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-medium">{stats.hints}</span>
          <span className="text-slate-400 text-sm">İpucu</span>
        </div>
        <div className="flex-1 bg-slate-700/30 rounded-xl p-3 flex items-center gap-2">
          <Star className="w-5 h-5 text-pink-400" />
          <span className="text-white font-medium">{stats.giveups}</span>
          <span className="text-slate-400 text-sm">Pas</span>
        </div>
      </div>
    </div>
  );

  // Arkadaşlık Fonksiyonları
  const handleAcceptFriend = async (friendId: string) => {
    try {
      await acceptFriend.mutateAsync(friendId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectFriend = async (friendId: string) => {
    try {
      await rejectFriend.mutateAsync(friendId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFriend = (friend: friendship.FriendUser) => {
    setFriendToRemove(friend);
    setShowFriendRemoveConfirm(true);
  };

  const confirmRemoveFriend = async () => {
    if (!backendUser?.id || !friendToRemove) return;
    try {
      await removeFriend.mutateAsync(friendToRemove.id);
      setShowFriendRemoveConfirm(false);
      setFriendToRemove(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyInviteLink = () => {
    if (!backendUser?.id) return;
    // Always use production URL for invite links
    const baseUrl = "https://everydlegames.vercel.app";
    const inviteLink = `${baseUrl}/friends/add?id=${backendUser.id}`;
    navigator.clipboard.writeText(inviteLink);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const renderFriendshipSection = () => (
    <div className="space-y-6 mb-8">
      {/* Invite Link Section */}
      <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Arkadaş Davet Et</h3>
              <p className="text-xs text-slate-400">Linkini paylaş, beraber oyna!</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCopyInviteLink}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all relative overflow-hidden"
        >
          {showCopyFeedback ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400">Kopyalandı!</span>
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              <span>Davet Linkini Kopyala</span>
            </>
          )}
        </button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-slate-800 rounded-2xl overflow-hidden border border-orange-500/20">
          <div className="bg-orange-500/10 p-4 border-b border-orange-500/20 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-400" />
            <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wider">Bekleyen İstekler</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-4 flex items-center justify-between bg-orange-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                    {req.avatar ? <img src={req.avatar} className="w-full h-full rounded-full" /> : "👤"}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">@{req.username || "isimsiz"}</p>
                    <p className="text-xs text-slate-500">Arkadaşlık isteği gönderdi</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptFriend(req.id)}
                    className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleRejectFriend(req.id)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-bold">Arkadaşlarım</h3>
          </div>
          <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded-lg">
            {friends.length}
          </span>
        </div>
        <div className="divide-y divide-slate-700/50 max-h-60 overflow-y-auto custom-scrollbar">
          {friends.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500 text-sm">Henüz hiç arkadaşın yok.</p>
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg relative">
                    {friend.avatar ? <img src={friend.avatar} className="w-full h-full rounded-full" /> : "👤"}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-slate-800 rounded-full ${
                      friend.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">@{friend.username || "isimsiz"}</p>
                    <p className={`text-[10px] ${
                      friend.isOnline ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {friend.isOnline ? 'Çevrimici' : 'Cevrimdışı'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Giriş yapmamış kullanıcı için menü
  const renderGuestMenu = () => (
    <div className="space-y-3">
      <button
        onClick={() => setShowLoginModal(true)}
        className="w-full flex items-center gap-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-4 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <LogIn className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-emerald-400 font-medium">Giriş Yap</p>
          <p className="text-sm text-slate-400">Google ile giriş yap</p>
        </div>
      </button>

      <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium">Ayarlar</p>
          <p className="text-sm text-slate-400">Uygulama ayarları</p>
        </div>
      </button>

      {/* Locked Features */}
      <div className="w-full flex items-center gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 opacity-60">
        <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center relative">
          <Trophy className="w-5 h-5 text-slate-500" />
          <Lock className="w-3 h-3 text-slate-500 absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-slate-400 font-medium">Başarılar</p>
          <p className="text-sm text-slate-500">Giriş yapmanız gerekiyor</p>
        </div>
      </div>
    </div>
  );

  // Giriş yapmış kullanıcı için menü
  const renderAuthenticatedMenu = () => (
    <div className="space-y-3">
      <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium">Ayarlar</p>
          <p className="text-sm text-slate-400">Uygulama ayarları</p>
        </div>
      </button>

      <button className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-white font-medium">Başarılar</p>
          <p className="text-sm text-slate-400">Kazanılan rozetler</p>
        </div>
      </button>

      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full flex items-center gap-4 bg-slate-800 rounded-xl p-4 border border-red-900/30 hover:border-red-800/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
          <LogOut className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-red-400 font-medium">Çıkış Yap</p>
          <p className="text-sm text-slate-500">Hesaptan çıkış yap</p>
        </div>
      </button>
    </div>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-slate-900">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Loading State */}
        {authLoading || (isAuthenticated && isUserLoading) ? (
          <ProfilePageSkeleton />
        ) : (
          <>
            {/* Profile Card */}
            {isAuthenticated
              ? renderAuthenticatedProfile()
              : renderGuestProfile()}

            {/* Friendship Section */}
            {isAuthenticated && renderFriendshipSection()}

            {/* Menu Items */}
            {isAuthenticated ? renderAuthenticatedMenu() : renderGuestMenu()}
          </>
        )}

        {/* Bottom Padding for AppBar */}
        <div className="h-24" />
      </main>

      {/* Bottom Navigation */}
      <AppBar currentPage="profile" />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Everydle'a Giriş Yap"
        message="Oyun istatistiklerinizi ve başarılarınızı takip etmek için giriş yapın."
      />

      {/* Username Setup Modal */}
      {showUsernameModal && user && (
        <UsernameSetupModal
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          onComplete={handleUsernameSetupComplete}
          firebaseId={user.uid}
          deviceId={deviceId}
          encoreUserId={backendUser?.id || null}
          existingUsername={convexUser?.username}
        />
      )}

      {/* Logout Confirm Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          await signOut();
          setShowLogoutConfirm(false);
        }}
        variant="danger"
        title="Çıkış Yap"
        message="Hesabınızdan çıkış yapmak istediğinize emin misiniz? İlerlemeniz buluta kaydedildi."
        confirmText="Çıkış Yap"
        cancelText="Vazgeç"
        icon={<LogOut className="w-8 h-8" />}
      />

      {/* Friend Remove Confirm Modal */}
      <ConfirmModal
        isOpen={showFriendRemoveConfirm}
        onClose={() => {
          setShowFriendRemoveConfirm(false);
          setFriendToRemove(null);
        }}
        onConfirm={confirmRemoveFriend}
        variant="danger"
        title="Arkadaşı Çıkar"
        message={
          <>
            <span className="font-bold text-white">@{friendToRemove?.username}</span> isimli kullanıcıyı arkadaş listenden çıkarmak istediğine emin misin?
          </>
        }
        confirmText="Arkadaşlıktan Çıkar"
        cancelText="Vazgeç"
        icon={<UserMinus className="w-8 h-8" />}
      />
    </PullToRefresh>
  );
}
