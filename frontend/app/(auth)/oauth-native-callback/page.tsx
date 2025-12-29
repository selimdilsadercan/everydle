"use client";

import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function OAuthNativeCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processLogin = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        setError("URL içerisinde token bulunamadı.");
        return;
      }

      try {
        // ID Token ile Firebase'e giriş yap
        const credential = GoogleAuthProvider.credential(token);
        const userCredential = await signInWithCredential(auth, credential);
        
        console.log("Native login success:", userCredential.user.email);
        
        // Giriş başarılı, profile yönlendir
        setTimeout(() => {
          router.push("/profile");
        }, 1000);
      } catch (err) {
        console.error("Native login error:", err);
        setError("Giriş işlemi başarısız oldu. Lütfen tekrar deneyin.");
      }
    };

    processLogin();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-white text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Hata Oluştu</h1>
        <p className="text-red-300 text-sm mb-8">{error}</p>
        <button 
          onClick={() => router.push("/")}
          className="bg-slate-800 px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-white text-center">
      <div className="space-y-6">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Oturum Açılıyor</h1>
          <p className="text-slate-400">Kimlik bilgileriniz doğrulanıyor, lütfen bekleyin...</p>
        </div>
      </div>
    </div>
  );
}

export default function OAuthNativeCallbackPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <OAuthNativeCallbackContent />
    </Suspense>
  );
}