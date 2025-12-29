"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthChange, signInWithGoogle, handleRedirectResult, logOut } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getUserByFirebaseId, createUser } from "@/app/profile/actions";
import { useStatusBar } from "@/hooks/useStatusBar";

interface AuthContextType {
  user: User | null;
  backendUser: any | null;
  backendUserId: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<any | null>(null);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Native platformda status bar rengini ayarla
  useStatusBar();

  useEffect(() => {
    // Auth state dinleyicisi
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Backend kullanıcıyı yükle veya oluştur
          const userResult = await getUserByFirebaseId(firebaseUser.uid);
          if (userResult.data?.success && userResult.data.user) {
            setBackendUser(userResult.data.user);
            setBackendUserId(userResult.data.user.id);
          } else {
            const createResult = await createUser({
              firebaseId: firebaseUser.uid,
              name: firebaseUser.displayName || undefined,
              avatar: firebaseUser.photoURL || undefined,
            });
            if (createResult.data?.success && createResult.data.user) {
              setBackendUser(createResult.data.user);
              setBackendUserId(createResult.data.user.id);
            }
          }
        } catch (error) {
          console.error("Backend user load failed:", error);
        }
      } else {
        setBackendUser(null);
        setBackendUserId(null);
      }
      
      setLoading(false);
    });

    // Capacitor Deep Link dinleyicisi
    const setupDeepLinks = async () => {
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        const { App } = await import("@capacitor/app");
        
        // 1. Uygulama zaten açıkken gelen linkler
        App.addListener('appUrlOpen', (data) => {
          console.log("App URL Opened:", data.url);
          handleUrl(data.url);
        });

        // 2. Uygulama kapalıyken linkle açıldığında (Cold Start)
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl) {
          console.log("App Launch URL:", launchUrl.url);
          handleUrl(launchUrl.url);
        }
      }
    };

    const handleUrl = (urlStr: string) => {
      console.log('Final Handling URL:', urlStr);
      if (urlStr.includes('oauth-native-callback')) {
        const url = new URL(urlStr.replace('com.everydle.app://', 'http://localhost/'));
        const token = url.searchParams.get('token');
        if (token) {
          console.log('Token found in Deep Link, navigating to oauth-native-callback...');
          // Next.js router ile yönlendirme
          router.push(`/oauth-native-callback?token=${token}`);
        }
      }
    };

    setupDeepLinks();

    // ... (checkRedirect remains)
    const checkRedirect = async () => {
      const user = await handleRedirectResult();
      if (user) setUser(user);
    };
    checkRedirect();

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    try {
      // Daha güvenilir native platform kontrolü
      // Capacitor.isNativePlatform() gerçekten native app içinde mi diye kontrol eder
      // window.Capacitor varlığı yeterli değil - PWA veya cached objeler yanlış pozitif verebilir
      let isNativeApp = false;
      
      if (typeof window !== "undefined" && (window as any).Capacitor) {
        const Capacitor = (window as any).Capacitor;
        // isNativePlatform fonksiyonu varsa ve true dönerse native app'teyiz
        isNativeApp = typeof Capacitor.isNativePlatform === 'function' 
          ? Capacitor.isNativePlatform() 
          : (Capacitor.platform !== 'web');
      }
      
      if (isNativeApp) {
        // Tam Clerk/Native akışı: Doğrudan Google OAuth URL'sini oluşturuyoruz.
        // Bu sayede kullanıcı sso-callback sayfasını görmeden doğrudan Google'a gider.
        const clientId = "697982187928-dp1anm49jaj8cdic0rk6metj9g77vnfe.apps.googleusercontent.com"; 
        // redirect_uri değişmemeli, source=native bilgisini state parametresinde taşıyoruz
        const redirectUri = encodeURIComponent("https://playeverydle.com/sso-callback");
        const scope = encodeURIComponent("email profile openid");
        const responseType = "id_token";
        const nonce = Math.random().toString(36).substring(2);
        // state parametresinde source=native bilgisini taşıyoruz
        const state = encodeURIComponent("source=native");
        
        // Google OAuth URL (Firebase'in kullandığı endpoint)
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&nonce=${nonce}&state=${state}&prompt=select_account`;
        
        window.open(googleAuthUrl, '_system');
      } else {
        await signInWithGoogle(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await logOut();
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    backendUser,
    backendUserId,
    loading,
    signIn,
    signOut: signOutUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
