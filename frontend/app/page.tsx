"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GamesPageSkeleton } from "@/components/SkeletonLoading";
import Header from "@/components/Header";
import AppBar from "@/components/AppBar";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/challenge");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <GamesPageSkeleton />
      <AppBar currentPage="games" />
    </div>
  );
}

