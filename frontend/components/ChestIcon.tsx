"use client";

import { Check, Lock } from "lucide-react";

export interface ChestIconProps {
  status: "locked" | "ready" | "claimed";
  milestone?: number;
  size?: "sm" | "md" | "lg";
}

export const ChestIcon = ({ status, milestone = 4, size = "md" }: ChestIconProps) => {
  const isGold = milestone === 8 || milestone > 20; // milestone can be level id too
  const color = status === "locked" ? "#475569" : (isGold ? "#f59e0b" : "#10b981");
  const lidColor = status === "locked" ? "#334155" : (isGold ? "#fbbf24" : "#34d399");

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  };

  const svgSizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  if (status === "claimed") {
    return (
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        <svg viewBox="0 0 24 24" fill="none" className={`${svgSizeClasses[size]} opacity-60`}>
          <path d="M3 11C3 9.34315 4.34315 8 6 8H18C19.6569 8 21 9.34315 21 11V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V11Z" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <path d="M3 11L5 6C5.5 5 7 4 9 4H15C17 4 18.5 5 19 6L21 11" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 14V17" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center translate-y-1">
          <Check className={`${size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} text-emerald-500`} strokeWidth={3} />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center ${status === "ready" ? "animate-bounce" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" className={`${svgSizeClasses[size]} drop-shadow-lg`}>
        {/* Chest Body */}
        <path d="M3 10C3 8.34315 4.34315 7 6 7H18C19.6569 7 21 8.34315 21 10V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V10Z" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2" />
        {/* Lid */}
        <path d="M3 10C3 8.34315 4.79086 7 7 7H17C19.2091 7 21 8.34315 21 10H3Z" fill={lidColor} fillOpacity="0.2" stroke={color} strokeWidth="2" />
        {/* Straps */}
        <path d="M8 7V21M16 7V21" stroke={color} strokeWidth="1.5" strokeOpacity="0.3" />
        {/* Lock Plate */}
        <rect x="10" y="9" width="4" height="4" rx="1" fill={status === "locked" ? "#1e293b" : "#fbbf24"} stroke={color} strokeWidth="1.5" />
        {/* Keyhole */}
        <circle cx="12" cy="11" r="0.5" fill={status === "locked" ? "#475569" : "#92400e"} />
      </svg>
      {status === "locked" && (
        <div className="absolute inset-0 flex items-center justify-center translate-y-1">
          <Lock className={`${size === 'lg' ? 'w-6 h-6' : 'w-3.5 h-3.5'} text-slate-500`} />
        </div>
      )}
    </div>
  );
};
