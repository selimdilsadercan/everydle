import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

// Firebase yapılandırması - .env.local'dan alınıyor
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase uygulamasını başlat (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let messaging: Messaging | null = null;

if (typeof window !== "undefined") {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  
  // Messaging sadece tarayıcıda ve HTTPS'de çalışır
  if ("Notification" in window && "serviceWorker" in navigator) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.warn("Firebase Messaging başlatılamadı:", error);
    }
  }
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Google ile giriş yap
export async function signInWithGoogle(isMobile: boolean = false): Promise<User | null> {
  try {
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Google ile giriş hatası:", error);
    return null;
  }
}

// Redirect sonucunu al (Tüm sonucu döner)
export async function getFullRedirectResult(): Promise<any> {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Redirect hatası:", error);
    return null;
  }
}

// Geriye dönük uyumluluk için eski fonksiyonu koruyalım veya güncelleyelim
export async function handleRedirectResult(): Promise<User | null> {
  const result = await getFullRedirectResult();
  return result?.user || null;
}

// Çıkış yap
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Çıkış hatası:", error);
  }
}

// Auth state değişikliklerini dinle
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ==================== PUSH NOTIFICATIONS ====================

// Bildirim izni iste
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  
  const permission = await Notification.requestPermission();
  return permission;
}

// FCM Token al
export async function getFCMToken(): Promise<string | null> {
  if (!messaging) {
    console.warn("Messaging not initialized");
    return null;
  }
  
  try {
    // Service worker'ı kaydet
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    
    // VAPID key - Firebase Console'dan alınmalı
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    
    if (!vapidKey) {
      console.error("VAPID key bulunamadı");
      return null;
    }
    
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    
    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("FCM Token alınamadı:", error);
    return null;
  }
}

// Foreground'da bildirim dinle
export function onForegroundMessage(callback: (payload: any) => void): () => void {
  if (!messaging) {
    return () => {};
  }
  
  return onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);
    callback(payload);
  });
}

// Auth instance'ını export et
export { auth, messaging };
export type { User };
