"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUser, useUserStats, useFriendsWithOnlineStatus, useUserByFirebaseId, useUserMutations, useCompletedGamesForToday } from "@/hooks/useProfileData";
import { Trophy, Gamepad2, Diamond, Zap, ArrowLeft, UserPlus, UserMinus, Loader2, Check } from "lucide-react";
import gamesData from "@/data/games.json";
import AppBar from "@/components/AppBar";
import Header from "@/components/Header";
import { PageSkeleton } from "@/components/SkeletonLoading";
import { SendBattleButton } from "@/components/FriendBattle";
import ConfirmModal from "@/components/ConfirmModal";
import { useState, Suspense } from "react";

function UserProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetUserId = searchParams.get("id"); // URL: /user?id=123
  
  const { user: firebaseUser } = useAuth();
  
  // Kendi user ID'mizi bulalım
  const { data: currentUserData } = useUserByFirebaseId(firebaseUser?.uid);
  const currentUserId = currentUserData?.data?.user?.id;
  const currentUsername = currentUserData?.data?.user?.username;

  // Hedef kullanıcı verileri
  const { data: targetUserData, isLoading: isUserLoading } = useUser(targetUserId || undefined);
  const targetUser = targetUserData?.data?.user;
  
  // Hedef kullanıcı istatistikleri
  const stats = useUserStats(targetUserId || undefined);

  // Completed Games
  const { data: completedGamesData = [] } = useCompletedGamesForToday(targetUserId || undefined);
  // Extract game IDs from the response objects
  const completedGameIds = Array.isArray(completedGamesData) 
    ? completedGamesData.map((g: any) => g.game_id || g) 
    : [];
    
  const games = Object.values(gamesData.games);

  // Arkadaşlık durumu kontrolü
  const { friends = [] } = useFriendsWithOnlineStatus(currentUserId);
  const isFriend = targetUserId ? friends.some(f => f.id === targetUserId) : false;
  // Arkadaş objesini bul
  const friendObject = targetUserId ? friends.find(f => f.id === targetUserId) : undefined;

  // Arkadaşlık işlemleri
  const { sendFriendRequest, removeFriend } = useUserMutations(currentUserId);
  
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Check if target user is self
  const isSelf = currentUserId && targetUserId && currentUserId === targetUserId;


  // Loading
  if (isUserLoading || stats.isLoading) {
    return (
        <div className="min-h-screen bg-slate-900">
            <Header />
            <div className="max-w-lg mx-auto px-4 py-6">
                <PageSkeleton />
            </div>
            <AppBar currentPage="profile" />
        </div>
    );
  }

  if (!targetUser) {
     return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-slate-400 mb-4">Kullanıcı bulunamadı.</p>
                <button onClick={() => router.back()} className="text-emerald-400 hover:underline">Geri Dön</button>
            </div>
            <AppBar currentPage="profile" />
        </div>
     );
  }

  // Eğer kendi profilimizse profile sayfasına yönlendir
  if (isSelf) {
    router.replace("/profile");
    return null;
  }

  const handleSendRequest = async () => {
    if (!currentUserId || !targetUserId) return;
    try {
        await sendFriendRequest.mutateAsync(targetUserId);
    } catch (e) {
        console.error(e);
    }
  };

  const handleRemoveFriend = async () => {
      if (!currentUserId || !targetUserId) return;
      try {
          await removeFriend.mutateAsync(targetUserId);
          setShowRemoveConfirm(false);
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
        <Header />
        
        <main className="max-w-lg mx-auto px-4 py-6">
            <button 
                onClick={() => router.back()} 
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span>Geri</span>
            </button>

            {/* Profile Card */}
            <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-emerald-900/20 to-transparent" />

                <div className="relative flex flex-col items-center mb-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl mb-4 shadow-xl border-4 border-slate-700 relative z-10">
                        {targetUser.avatar ? (
                            <img src={targetUser.avatar} alt={targetUser.username || "User"} className="w-full h-full rounded-full" />
                        ) : (
                            "👤"
                        )}
                        {/* Online Indicator if friend */}
                        {isFriend && friendObject && (
                            <div className={`absolute bottom-1 right-1 w-5 h-5 border-4 border-slate-800 rounded-full ${friendObject.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                        )}
                    </div>
                    
                    <h1 className="text-2xl font-bold text-white mb-1">@{targetUser.username}</h1>
                    {isFriend && friendObject && (
                         <p className={`text-sm font-medium ${friendObject.isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {friendObject.isOnline ? 'Çevrim içi' : 'Çevrim dışı'}
                         </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                    {isFriend ? (
                        <>
                            {currentUserId && currentUsername && (
                                <div className="flex-1">
                                    <SendBattleButton 
                                        fromUserId={currentUserId}
                                        fromUsername={currentUsername || "Ben"}
                                        toUserId={targetUserId!}
                                        toUsername={targetUser.username || "Arkadaş"}
                                        isOnline={friendObject?.isOnline || false}
                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                                        showText={true}
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => setShowRemoveConfirm(true)}
                                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                            >
                                <UserMinus className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleSendRequest}
                            disabled={sendFriendRequest.isPending}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {sendFriendRequest.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                            <span>Arkadaş Ekle</span>
                        </button>
                    )}
                </div>

                {/* Daily Progress */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center justify-between">
                        <span>Bugünkü İlerleme</span>
                        <span className="text-xs text-slate-400 font-normal">{completedGameIds.length}/{games.length} Tamamlandı</span>
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                        {games.map((game: any) => {
                            const isCompleted = completedGameIds.includes(game.id);
                            return (
                                <div key={game.id} className="flex flex-col items-center gap-1">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border transition-all ${
                                         isCompleted 
                                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                                            : 'bg-slate-700/30 border-slate-700/30 grayscale opacity-50'
                                     }`}>
                                        {game.icon}
                                     </div>
                                     <div className="h-4 flex items-center justify-center">
                                        {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                     </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
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
                        <p className="text-xs text-slate-400">Coin</p>
                    </div>
                </div>
            </div>
            
        </main>

        <AppBar currentPage="profile" />

        {/* Remove Friend Confirm Modal */}
        <ConfirmModal
            isOpen={showRemoveConfirm}
            onClose={() => setShowRemoveConfirm(false)}
            onConfirm={handleRemoveFriend}
            variant="danger"
            title="Arkadaşı Çıkar"
            message={
                <>
                    <span className="font-bold text-white">@{targetUser.username}</span> isimli kullanıcıyı arkadaş listenden çıkarmak istediğine emin misin?
                </>
            }
            confirmText="Arkadaşlıktan Çıkar"
            cancelText="Vazgeç"
            icon={<UserMinus className="w-8 h-8" />}
        />
    </div>
  );
}

export default function UserProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900"><Header /><div className="max-w-lg mx-auto px-4 py-6"><PageSkeleton /></div><AppBar currentPage="profile" /></div>}>
            <UserProfileContent />
        </Suspense>
    );
}
