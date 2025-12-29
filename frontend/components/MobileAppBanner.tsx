"use client";

import { useState, useEffect } from "react";
import { Globe } from "lucide-react";

const APP_ICON_URL = "/favicon.ico"; // Uygulama ikonu

// Platform detection
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || "";
  
  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
  
  // Android detection
  const isAndroid = /android/i.test(userAgent);
  
  // General mobile detection
  const isMobile = /Mobi|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  return isIOS || isAndroid || isMobile;
}

// Check if running inside app (Capacitor)
function isRunningInApp(): boolean {
  if (typeof window === "undefined") return false;
  
  // Capacitor detection
  const hasCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
  
  // Check if it's a standalone PWA
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  
  return hasCapacitor || isStandalone;
}

interface MobileAppBannerProps {
  appStoreUrl?: string;
  playStoreUrl?: string;
}

export default function MobileAppBanner({ 
  appStoreUrl = "#", 
  playStoreUrl = "#" 
}: MobileAppBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const userChoice = localStorage.getItem("everydle-app-choice");
    
    // Show banner only if:
    // 1. User is on mobile
    // 2. User hasn't made a choice yet
    // 3. User is not already in the app
    if (isMobileDevice() && !userChoice && !isRunningInApp()) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowBanner(true);
        setTimeout(() => setIsAnimating(true), 50);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleOpenApp = () => {
    // Try to open the app via deep link
    // If app is not installed, redirect to store
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const storeUrl = isIOS ? appStoreUrl : playStoreUrl;
    
    // Save choice
    localStorage.setItem("everydle-app-choice", "app");
    
    // Try deep link first
    window.location.href = "everydle://open";
    
    // Fallback to store after a short delay
    setTimeout(() => {
      if (storeUrl !== "#") {
        window.location.href = storeUrl;
      }
    }, 1500);
    
    closeBanner();
  };

  const handleContinueInBrowser = () => {
    localStorage.setItem("everydle-app-choice", "browser");
    closeBanner();
  };

  const closeBanner = () => {
    setIsAnimating(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleContinueInBrowser}
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[9999] transition-transform duration-300 ease-out ${
          isAnimating ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="px-6 pb-8">
          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
            Bunu aç...
          </h2>
          
          {/* Divider */}
          <div className="w-full h-px bg-gray-200 mb-4" />
          
          {/* App Option */}
          <button
            onClick={handleOpenApp}
            className="w-full flex items-center justify-between py-3 group"
          >
            <div className="flex items-center gap-4">
              {/* App Icon */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl shadow-lg">
                🧩
              </div>
              <span className="text-lg font-semibold text-gray-900">
                Everydle Uygulaması
              </span>
            </div>
            {/* Open Button */}
            <span className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-full shadow-md hover:bg-emerald-600 transition-colors">
              Aç
            </span>
          </button>
          
          {/* Divider */}
          <div className="w-full h-px bg-gray-200 my-4" />
          
          {/* Browser Option */}
          <button
            onClick={handleContinueInBrowser}
            className="w-full flex items-center justify-between py-3 group"
          >
            <div className="flex items-center gap-4">
              {/* Browser Icon */}
              <div className="w-14 h-14 rounded-xl border-2 border-gray-300 flex items-center justify-center bg-gray-50">
                <Globe className="w-7 h-7 text-gray-500" />
              </div>
              <span className="text-lg font-semibold text-gray-900">
                Tarayıcı
              </span>
            </div>
            {/* Continue Button */}
            <span className="px-5 py-2 border-2 border-gray-300 text-gray-700 font-bold rounded-full hover:bg-gray-100 transition-colors">
              Devam Et
            </span>
          </button>
        </div>
        
        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}
