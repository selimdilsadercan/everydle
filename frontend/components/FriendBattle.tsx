"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords, X, Loader2, Check, Clock } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface FriendBattleProps {
  userId: string;
  username: string;
}

// Cihaz ID'sini al
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
 * Gelen dostluk savaşı davetlerini gösteren bildirim bölümü
 */
export function IncomingBattleRequests({ userId, username }: FriendBattleProps) {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);
  
  // Gelen davetleri gerçek zamanlı olarak dinle
  const pendingRequests = useQuery(
    api.friendBattle.getPendingRequestsForUser,
    userId ? { userId } : "skip"
  );
  
  const acceptRequest = useMutation(api.friendBattle.acceptBattleRequest);
  const rejectRequest = useMutation(api.friendBattle.rejectBattleRequest);
  
  const handleAccept = async (requestId: Id<"friendBattleRequests">) => {
    if (!deviceId) return;
    setProcessingId(requestId);
    
    try {
      const result = await acceptRequest({
        requestId,
        accepterOdaId: deviceId,
      });
      
      if (result.success && result.matchId) {
        // Maça yönlendir
        router.push(`/match/wordle?matchId=${result.matchId}&odaId=${deviceId}`);
      }
    } catch (error) {
      console.error("Davet kabul edilemedi:", error);
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = async (requestId: Id<"friendBattleRequests">) => {
    setProcessingId(requestId);
    try {
      await rejectRequest({ requestId });
    } catch (error) {
      console.error("Davet reddedilemedi:", error);
    } finally {
      setProcessingId(null);
    }
  };
  
  if (!pendingRequests || pendingRequests.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 rounded-2xl overflow-hidden border border-orange-500/30 mb-4">
      <div className="p-3 border-b border-orange-500/20 flex items-center gap-2">
        <Swords className="w-5 h-5 text-orange-400 animate-pulse" />
        <h3 className="text-orange-400 font-bold text-sm">Dostluk Savaşı Daveti!</h3>
      </div>
      <div className="divide-y divide-orange-500/10">
        {pendingRequests.map((request) => (
          <div key={request._id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">@{request.fromUsername}</p>
                <p className="text-xs text-orange-400/70">Seni savaşa davet ediyor!</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(request._id)}
                disabled={processingId === request._id}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-1"
              >
                {processingId === request._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Kabul
                  </>
                )}
              </button>
              <button
                onClick={() => handleReject(request._id)}
                disabled={processingId === request._id}
                className="p-2 rounded-lg bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Arkadaşa savaş daveti gönder butonu
 */
interface BattleButtonProps {
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  isOnline: boolean;
}

export function SendBattleButton({ fromUserId, fromUsername, toUserId, toUsername, isOnline }: BattleButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentRequestId, setSentRequestId] = useState<Id<"friendBattleRequests"> | null>(null);
  const [serverOdaId, setServerOdaId] = useState<string | null>(null);
  
  const sendRequest = useMutation(api.friendBattle.sendBattleRequest);
  const cancelRequest = useMutation(api.friendBattle.cancelBattleRequest);
  
  // Gönderilen daveti dinle (kabul edildiğinde maça git)
  const sentRequest = useQuery(
    api.friendBattle.getBattleRequest,
    sentRequestId ? { requestId: sentRequestId } : "skip"
  );
  
  // Davet kabul edildiğinde maça git
  useEffect(() => {
    if (sentRequest?.status === "accepted" && sentRequest.matchId && serverOdaId) {
      router.push(`/match/wordle?matchId=${sentRequest.matchId}&odaId=${serverOdaId}`);
    }
  }, [sentRequest, router, serverOdaId]);
  
  const handleSendRequest = async () => {
    setIsSending(true);
    try {
      const result = await sendRequest({
        fromUserId,
        fromUsername,
        toUserId,
        toUsername,
      });
      
      if (result.success && result.requestId && result.odaId) {
        setSentRequestId(result.requestId as Id<"friendBattleRequests">);
        setServerOdaId(result.odaId);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Davet gönderilemedi:", error);
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCancel = async () => {
    if (sentRequestId) {
      await cancelRequest({ requestId: sentRequestId });
      setSentRequestId(null);
    }
    setShowModal(false);
  };
  
  // Modal kapanınca temizle
  const closeModal = () => {
    setShowModal(false);
    setSentRequestId(null);
  };
  
  return (
    <>
      <button
        onClick={handleSendRequest}
        disabled={isSending || !isOnline}
        className={`p-2 rounded-lg transition-all ${
          isOnline
            ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 text-orange-400"
            : "bg-slate-700/30 text-slate-600 cursor-not-allowed"
        }`}
        title={isOnline ? "Savaşa Davet Et" : "Arkadaşın çevrimdışı"}
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Swords className="w-4 h-4" />
        )}
      </button>
      
      {/* Bekleme Modalı */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4 animate-pulse">
              <Swords className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">Davet Gönderildi!</h2>
            <p className="text-slate-400 mb-4">
              <span className="text-orange-400 font-bold">@{toUsername}</span> daveti kabul etmesini bekliyorsun...
            </p>
            
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-6">
              <Clock className="w-4 h-4" />
              <span>60 saniye içinde kabul edilmezse davet iptal olur</span>
            </div>
            
            {sentRequest?.status === "rejected" && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">Davet reddedildi 😔</p>
              </div>
            )}
            
            {sentRequest?.status === "expired" && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <p className="text-orange-400 text-sm">Davet süresi doldu ⏰</p>
              </div>
            )}
            
            <button
              onClick={handleCancel}
              className="w-full py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              {sentRequest?.status === "pending" ? "İptal Et" : "Kapat"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
