"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserByFirebaseId, sendFriendRequest, getUser } from "@/app/profile/actions";
import { Loader2, UserPlus, UserCheck, CheckCircle, AlertCircle, Home } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import AppBar from "@/components/AppBar";
import Head from "next/head";

function AddFriendContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "unauthorized">("loading");
  const [errorHeader, setErrorHeader] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [targetUser, setTargetUser] = useState<{ id: string; username: string | null } | null>(null);

  useEffect(() => {
    async function processFriendLink() {
      if (authLoading) return;
      
      if (!isAuthenticated) {
        setStatus("unauthorized");
        return;
      }

      if (!id) {
        setStatus("error");
        setErrorHeader("Geçersiz Link");
        setErrorMessage("Arkadaşlık linki hatalı veya eksik görünüyor.");
        return;
      }

      try {
        // Hedef kullanıcıyı kontrol et
        const targetResult = await getUser(id);
        if (!targetResult.data?.success || !targetResult.data.user) {
          setStatus("error");
          setErrorHeader("Kullanıcı Bulunamadı");
          setErrorMessage("Böyle bir kullanıcı mevcut değil.");
          return;
        }
        
        setTargetUser({
          id: targetResult.data.user.id,
          username: targetResult.data.user.username
        });

        // Mevcut kullanıcıyı Encore DB'den bul
        const meResult = await getUserByFirebaseId(authUser!.uid);
        if (!meResult.data?.success || !meResult.data.user) {
          setStatus("error");
          setErrorHeader("Profil Hatası");
          setErrorMessage("Kendi profil bilgilerine ulaşılamadı. Lütfen tekrar giriş yap.");
          return;
        }

        const myId = meResult.data.user.id;

        if (myId === id) {
          setStatus("error");
          setErrorHeader("Kendinle Arkadaş Olamazsın");
          setErrorMessage("Bu link sana ait. Başka oyuncularla paylaşarak onların seni eklemesini sağlayabilirsin.");
          return;
        }

        // Arkadaşlık isteği gönder
        const requestResult = await sendFriendRequest(myId, id, true);
        
        if (requestResult.data?.success) {
          setStatus("success");
        } else {
          // Zaten arkadaşlarsa veya istek varsa API başarılı dönebilir veya hata verebilir
          setStatus("success"); 
        }
      } catch (err) {
        console.error("Friend request error:", err);
        setStatus("error");
        setErrorHeader("Bir Hata Oluştu");
        setErrorMessage("İstek işlenirken teknik bir problem yaşandı.");
      }
    }

    processFriendLink();
  }, [id, authUser, isAuthenticated, authLoading]);

  return (
    <main className="max-w-md mx-auto px-4 pt-20 pb-24 text-center">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
          <p className="text-slate-400 font-medium">İstek işleniyor...</p>
        </div>
      )}

      {status === "unauthorized" && (
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Giriş Yapmalısın</h1>
          <p className="text-slate-400 mb-8 px-4">
            Arkadaş eklemek için Everydle hesabına giriş yapman gerekiyor.
          </p>
          <Link
            href="/profile"
            className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Giriş Yap ve Devam Et
          </Link>
        </div>
      )}

      {status === "success" && (
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 relative">
            <UserCheck className="w-12 h-12 text-emerald-400" />
            <div className="absolute -top-1 -right-1 bg-emerald-500 text-slate-900 rounded-full p-1 border-4 border-slate-800">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-3">Arkadaş Oldunuz!</h1>
          <p className="text-slate-400 mb-8 px-4">
            Tebrikler! <span className="text-emerald-400 font-bold">@{targetUser?.username || 'Kullanıcı'}</span> ile artık arkadaşsınız. Online maçlarda birbirinizi görebilir ve beraber oynayabilirsiniz.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/profile"
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Arkadaş Listem
            </Link>
            <Link
              href="/"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Hemen Oyna
            </Link>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-red-400">{errorHeader}</h1>
          <p className="text-slate-400 mb-8 px-4">{errorMessage}</p>
          <Link
            href="/"
            className="block w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-all"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      )}
    </main>
  );
}

export default function AddFriendPage() {
  // try
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      <Suspense fallback={
        <main className="max-w-md mx-auto px-4 pt-20 pb-24 text-center">
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <p className="text-slate-400 font-medium">Yükleniyor...</p>
          </div>
        </main>
      }>
        <AddFriendContent />
      </Suspense>
      <AppBar currentPage="profile" />
    </div>
  );
}
