"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

// Set to true to disable pull to refresh functionality
const DISABLED = true;

export default function PullToRefresh({ onRefresh, children, className = "" }: PullToRefreshProps) {
  // If disabled, just render children directly
  if (DISABLED) {
    return <div className={className}>{children}</div>;
  }
  
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const THRESHOLD = 80; // Pull distance needed to trigger refresh
  const MAX_PULL = 120; // Maximum pull distance

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if we're at the top of the page
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      if (diff > 0 && window.scrollY <= 0) {
        // Apply resistance to make pull feel natural
        const resistance = 0.5;
        const pullDist = Math.min(diff * resistance, MAX_PULL);
        setPullDistance(pullDist);
        
        // Prevent default scrolling when pulling
        if (pullDist > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      if (pullDistance >= THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD); // Keep indicator visible during refresh
        
        try {
          await onRefresh();
        } catch (error) {
          console.error("Refresh failed:", error);
        }
        
        setIsRefreshing(false);
      }

      setIsPulling(false);
      setPullDistance(0);
      startY.current = 0;
      currentY.current = 0;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPulling, isRefreshing, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <>
      {/* Pull indicator - fixed at top */}
      {showIndicator && (
        <div 
          className="fixed left-0 right-0 flex items-center justify-center z-[100] pointer-events-none"
          style={{ 
            top: pullDistance > 10 ? Math.min(pullDistance - 30, 60) : 0,
          }}
        >
          <div 
            className={`
              w-10 h-10 rounded-full bg-slate-800 border border-slate-700 
              flex items-center justify-center shadow-lg
              ${isRefreshing ? 'animate-spin' : ''}
            `}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
              opacity: showIndicator ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            <RefreshCw 
              className={`w-5 h-5 ${progress >= 1 || isRefreshing ? 'text-emerald-400' : 'text-slate-400'}`} 
            />
          </div>
        </div>
      )}

      {/* Content - no wrapper, just render children with transform when pulling */}
      <div 
        className={className}
        style={{ 
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </>
  );
}