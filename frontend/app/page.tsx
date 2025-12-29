"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/challenge");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Everydle</h1>
        <p className="text-slate-400 mb-8">Türkiye'nin günlük kelime ve bulmaca oyunları koleksiyonu.</p>
        <div className="animate-pulse text-emerald-500 font-bold">Yönlendiriliyorsunuz...</div>
      </div>
    </div>
  );
}
