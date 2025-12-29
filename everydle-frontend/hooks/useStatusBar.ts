"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function useStatusBar() {
  useEffect(() => {
    const initStatusBar = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");

        // Status bar rengini ayarla
        await StatusBar.setBackgroundColor({ color: "#0F172B" });

        // Status bar stilini ayarla (açık ikonlar - koyu arka plan için)
        await StatusBar.setStyle({ style: Style.Dark });

        // Status bar'ı görünür yap
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (error) {
        console.error("Status bar initialization error:", error);
      }
    };

    initStatusBar();
  }, []);
}
