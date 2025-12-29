"use client";

import React from "react";

// Games page content skeleton (without Header/AppBar)
export function GamesPageSkeleton() {
  return (
    <main className="max-w-lg mx-auto px-4 py-4">
      {/* Week Selector Skeleton */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-800 rounded-lg animate-pulse" />
          <div className="flex-1 flex items-center gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-1 h-16 bg-slate-800 rounded-xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Chest Area Skeleton */}
      <div className="mb-4 bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="w-40 h-4 bg-slate-700 rounded animate-pulse mb-2" />
            <div className="w-56 h-3 bg-slate-700/50 rounded animate-pulse" />
          </div>
          <div className="w-12 h-6 bg-slate-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700/50 rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>

      {/* Games Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-2xl border border-slate-700 p-3 animate-pulse"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-700 rounded-lg mb-2" />
              <div className="w-20 h-4 bg-slate-700 rounded mb-1" />
              <div className="w-24 h-3 bg-slate-700/50 rounded mb-2" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-14" />
    </main>
  );
}

// Challenge page content skeleton
export function ChallengePageSkeleton() {
  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      {/* Trophy Card Skeleton */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-32 h-6 bg-slate-700 rounded animate-pulse" />
          <div className="w-20 h-8 bg-slate-700 rounded-lg animate-pulse" />
        </div>
        <div className="w-full h-3 bg-slate-700/50 rounded-full animate-pulse mb-2" />
        <div className="flex justify-between">
          <div className="w-16 h-4 bg-slate-700/50 rounded animate-pulse" />
          <div className="w-16 h-4 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </div>

      {/* Play Button Skeleton */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-slate-700 rounded-full animate-pulse" />
          <div className="w-32 h-6 bg-slate-700 rounded animate-pulse" />
          <div className="w-full h-14 bg-slate-700 rounded-xl animate-pulse" />
        </div>
      </div>

      <div className="h-24" />
    </main>
  );
}

// Profile page content skeleton
export function ProfilePageSkeleton() {
  return (
    <div className="py-6">
      {/* Profile Card Skeleton */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-slate-700 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="w-32 h-5 bg-slate-700 rounded animate-pulse mb-2" />
            <div className="w-24 h-4 bg-slate-700/50 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-700/50 rounded-xl p-3 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
              <div className="w-8 h-8 bg-slate-600 rounded-lg mb-2 mx-auto" />
              <div className="w-12 h-4 bg-slate-600 rounded mx-auto mb-1" />
              <div className="w-16 h-3 bg-slate-600/50 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items Skeleton */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="w-10 h-10 bg-slate-700 rounded-lg" />
            <div className="flex-1">
              <div className="w-24 h-4 bg-slate-700 rounded mb-1" />
              <div className="w-32 h-3 bg-slate-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="h-24" />
    </div>
  );
}

// Store page content skeleton
export function StorePageSkeleton() {
  return (
    <div className="py-6">
      {/* Balance Card Skeleton */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-lg animate-pulse" />
          <div>
            <div className="w-20 h-4 bg-slate-700 rounded animate-pulse mb-1" />
            <div className="w-24 h-6 bg-slate-700/50 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Daily Reward Skeleton */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-700 rounded-xl animate-pulse" />
          <div className="flex-1">
            <div className="w-32 h-5 bg-slate-700 rounded animate-pulse mb-2" />
            <div className="w-48 h-4 bg-slate-700/50 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-pulse"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="w-12 h-12 bg-slate-700 rounded-lg mx-auto mb-3" />
            <div className="w-20 h-4 bg-slate-700 rounded mx-auto mb-2" />
            <div className="w-16 h-8 bg-slate-700/50 rounded-lg mx-auto" />
          </div>
        ))}
      </div>

      <div className="h-24" />
    </div>
  );
}

// Levels page content skeleton
export function LevelsPageSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center py-6">
      {/* Date Skeleton */}
      <div className="w-32 h-4 bg-slate-700 rounded animate-pulse mb-8" />

      {/* Level Buttons Skeleton */}
      <div className="flex flex-col items-center gap-8">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="w-16 h-16 bg-slate-800 border-2 border-slate-700 rounded-full animate-pulse"
            style={{ 
              animationDelay: `${i * 100}ms`,
              marginLeft: `${(i % 3 - 1) * 30}px`
            }}
          />
        ))}
      </div>

      <div className="h-24" />
    </div>
  );
}

// Generic content skeleton
export function PageSkeleton() {
  return (
    <div className="py-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="w-3/4 h-4 bg-slate-700 rounded mb-2" />
            <div className="w-1/2 h-3 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
