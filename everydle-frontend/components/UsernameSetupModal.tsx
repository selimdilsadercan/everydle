"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { updateUser as updateEncoreUser } from "@/app/profile/actions";

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (username: string) => void;
  firebaseId: string;
  deviceId: string;
  encoreUserId: string | null;
  existingUsername?: string | null;
}

export default function UsernameSetupModal({
  isOpen,
  onClose,
  onComplete,
  firebaseId,
  deviceId,
  encoreUserId,
  existingUsername,
}: UsernameSetupModalProps) {
  const [usernameInput, setUsernameInput] = useState(existingUsername || "");
  const [usernameError, setUsernameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerUser = useMutation(api.users.registerUser);
  const updateUsername = useMutation(api.users.updateUsername);
  const linkFirebaseId = useMutation(api.users.linkFirebaseId);
  
  // Convex'te device ID ile kullanıcı var mı kontrol et
  const existingConvexUser = useQuery(
    api.users.getUserByDeviceId,
    deviceId ? { deviceId } : "skip"
  );
  
  // Convex'te firebase ID ile kullanıcı var mı kontrol et
  const convexUserByFirebase = useQuery(
    api.users.getUserByFirebaseId,
    firebaseId ? { firebaseId } : "skip"
  );

  useEffect(() => {
    // Eğer firebase ID ile zaten bir Convex kullanıcısı varsa, otomatik olarak kullan
    if (convexUserByFirebase) {
      onComplete(convexUserByFirebase.username);
    }
  }, [convexUserByFirebase, onComplete]);

  useEffect(() => {
    // Eğer device ID ile bir kullanıcı varsa ve username girilmemişse, varsayılan olarak göster
    if (existingConvexUser && !usernameInput) {
      setUsernameInput(existingConvexUser.username);
    }
  }, [existingConvexUser, usernameInput]);

  if (!isOpen) return null;

  const validateUsername = (username: string): string | null => {
    const trimmed = username.trim();
    if (!trimmed) {
      return "Kullanıcı adı boş olamaz";
    }
    if (trimmed.length < 3) {
      return "Kullanıcı adı en az 3 karakter olmalı";
    }
    if (trimmed.length > 15) {
      return "Kullanıcı adı en fazla 15 karakter olabilir";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return "Sadece harf, rakam ve alt çizgi kullanabilirsiniz";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateUsername(usernameInput);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    setIsSubmitting(true);
    setUsernameError("");

    try {
      const trimmedUsername = usernameInput.trim();
      
      // Eğer device ID ile mevcut bir kullanıcı varsa
      if (existingConvexUser) {
        // Firebase ID'yi bağla
        if (!existingConvexUser.firebaseId) {
          await linkFirebaseId({ deviceId, firebaseId });
        }
        
        // Eğer username değişmişse güncelle
        if (existingConvexUser.username !== trimmedUsername) {
          const updateResult = await updateUsername({ 
            deviceId, 
            newUsername: trimmedUsername 
          });
          
          if (!updateResult.success) {
            setUsernameError(updateResult.error || "Username güncellenemedi");
            return;
          }
        }
        
        // Encore DB'yi de güncelle
        if (encoreUserId) {
          await updateEncoreUser(encoreUserId, { username: trimmedUsername });
        }
        
        onComplete(trimmedUsername);
      } else {
        // Yeni kullanıcı oluştur
        const result = await registerUser({
          username: trimmedUsername,
          deviceId,
          firebaseId,
        });
        
        if (result.success) {
          // Encore DB'yi de güncelle
          if (encoreUserId) {
            await updateEncoreUser(encoreUserId, { username: trimmedUsername });
          }
          
          onComplete(result.username || trimmedUsername);
        } else {
          setUsernameError(result.error || "Bir hata oluştu");
        }
      }
    } catch (error) {
      console.error("Username setup error:", error);
      setUsernameError("Bir hata oluştu, tekrar deneyin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Modal'ı kapatma, username gerekli
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackgroundClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <User className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            Kullanıcı Adı Oluştur
          </h2>

          {/* Message */}
          <p className="text-slate-400 text-center text-sm">
            Online maçlarda ve profilde görünecek kullanıcı adını belirle.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-700/50" />

        {/* Form */}
        <div className="p-6">
          <div className="mb-4">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                setUsernameError("");
              }}
              placeholder="kullanici_adi"
              maxLength={15}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            {usernameError && (
              <p className="text-red-400 text-sm mt-2">{usernameError}</p>
            )}
            <p className="text-slate-500 text-xs mt-2">
              3-15 karakter. Sadece harf, rakam ve alt çizgi (_) kullanabilirsiniz.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white disabled:opacity-50 transition-all shadow-lg shadow-red-500/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Kaydet"
            )}
          </button>
        </div>

        {/* Info Section */}
        <div className="bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400 text-center mb-3">
            Bu kullanıcı adı şuralarda görünecek:
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1">
              <span className="text-orange-400">⚔️</span>
              <span>Online Maçlar</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-orange-400">👤</span>
              <span>Profil</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
