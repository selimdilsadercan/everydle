"use client";

import { useEffect, useState } from "react";
import { auth, signInWithGoogle, handleRedirectResult, getFullRedirectResult } from "@/lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";

// This page acts as a bridge for OAuth.
// - For NATIVE apps (source=native): Forwards auth back via Deep Link
// - For WEB users: Processes normally

export default function SSOCallbackPage() {
  useEffect(() => {
    // 1. Google 'id_token'ı URL Hash (#) içinde döner (response_type=id_token)
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Native uygulamadan mı geldiğini kontrol et
    // Google OAuth, state parametresini hash fragment içinde döndürür
    // Sadece source=native ise mobil uygulamaya yönlendir
    // iOS Safari veya diğer mobil tarayıcılardan geliniyorsa yönlendirme yapma
    let isFromNativeApp = searchParams.get("source") === "native";
    
    // Hash fragment içinde state parametresini kontrol et
    if (hash && !isFromNativeApp) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const state = hashParams.get("state");
      if (state) {
        const decodedState = decodeURIComponent(state);
        isFromNativeApp = decodedState.includes("source=native");
      }
    }
    
    let token = null;

    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      token = hashParams.get("id_token");
    }
    
    // 2. Eğer hash'te yoksa query'de ara
    if (!token) {
      token = searchParams.get("id_token") || searchParams.get("token");
    }

    if (token && isFromNativeApp) {
      // Sadece native uygulamadan gelindiyse deep link ile yönlendir
      const appUrl = `com.everydle.app://oauth-native-callback?token=${encodeURIComponent(token)}`;
      window.location.href = appUrl;
    } else if (token && !isFromNativeApp) {
      // Mobil web veya desktop web'den gelindiyse
      // Token'ı işle ve normal web akışına devam et
      console.log("Web login detected, processing token...");
      // Web login akışı için token'ı localStorage'a kaydet veya başka işlem yap
      // Bu kısım web login akışına göre özelleştirilebilir
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white text-center">
      <div className="space-y-6">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Giriş Yapılıyor</h1>
          <p className="text-slate-400">Lütfen bekleyin, uygulamaya yönlendiriliyorsunuz...</p>
        </div>
      </div>
    </div>
  );  
}