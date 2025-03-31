import { useEffect, useState, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import LoadingScreen from "@/components/LoadingScreen";
import { initializeFirebase } from "./lib/firebase";
import { initializeTelegramApp } from "./lib/telegram";

// Lazy load pages to reduce initial bundle size
const Home = lazy(() => import("@/pages/home"));
const Admin = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<LoadingScreen message="Sayfa yükleniyor..." />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{success: boolean, message: string} | null>(null);
  const [showTelegramStatus, setShowTelegramStatus] = useState(false);

  useEffect(() => {
    // Check network status immediately
    setIsOfflineMode(!navigator.onLine);

    // Initialize app with timeout
    const init = async () => {
      try {
        console.log(`Uygulama başlatılıyor... (Deneme ${retryCount + 1})`);
        
        // Start Firebase initialization immediately rather than waiting for Telegram
        try {
          // Initialize Firebase with a short timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Firebase zamanaşımı")), 1500);
          });
          
          // Race between initialization and timeout
          const firebaseResult = await Promise.race([initializeFirebase(), timeoutPromise]);
          
          if (firebaseResult && typeof firebaseResult === 'object' && 'app' in firebaseResult && firebaseResult.app) {
            console.log("Firebase başarıyla başlatıldı");
          } else {
            console.log("Firebase olmadan devam ediliyor");
            setIsOfflineMode(true);
          }
        } catch (error) {
          console.error("Firebase hatası:", error);
          setIsOfflineMode(true);
        }
        
        // Now initialize Telegram in the background after Firebase
        // This allows the app to load faster
        setTimeout(() => {
          const tgStatus = initializeTelegramApp();
          setTelegramStatus(tgStatus);
          
          // Show the Telegram status briefly
          if (tgStatus.success) {
            setShowTelegramStatus(true);
            setTimeout(() => setShowTelegramStatus(false), 3000);
          } else {
            // If there's an error, show it for longer
            setShowTelegramStatus(true);
            setTimeout(() => setShowTelegramStatus(false), 5000);
          }
        }, 100);
        
        // App is now initialized
        setIsInitialized(true);
        setInitError(null);
        
      } catch (error) {
        console.error("Uygulama başlatma hatası:", error);
        setInitError("Uygulama yüklenirken bir sorun oluştu");
        
        if (retryCount < 1) {
          console.log(`Yeniden deneniyor (${retryCount + 1}/2)`);
          setTimeout(() => setRetryCount(prev => prev + 1), 500);
        } else {
          // After 2 failed attempts, just proceed anyway
          console.log("Çevrimdışı modda devam ediliyor");
          setIsInitialized(true);
          setIsOfflineMode(true);
        }
      }
    };

    // Add network status listeners
    const handleOnline = () => {
      console.log("Çevrimiçi moduna geçildi");
      setIsOfflineMode(false);
    };
    
    const handleOffline = () => {
      console.log("Çevrimdışı moduna geçildi");
      setIsOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start initialization
    init();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryCount]);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <LoadingScreen 
        message={initError ? `${initError}. Yeniden deneniyor...` : "Uygulama yükleniyor..."} 
      />
    );
  }

  // Show offline banner if we're in offline mode
  const OfflineBanner = () => isOfflineMode ? (
    <div className="bg-yellow-500 text-black p-2 text-center text-sm">
      Çevrimdışı mod - Sınırlı özellikler kullanılabilir
    </div>
  ) : null;
  
  // Show Telegram status notification
  const TelegramStatusNotification = () => {
    if (!showTelegramStatus || !telegramStatus) return null;
    
    return (
      <div className={`fixed bottom-20 left-0 right-0 mx-auto max-w-xs p-3 rounded-lg shadow-lg border text-center text-sm z-50 transition-opacity duration-300 ${
        telegramStatus.success 
          ? 'bg-green-900/80 border-green-500/30 text-green-100' 
          : 'bg-yellow-900/80 border-yellow-500/30 text-yellow-100'
      }`}>
        <i className={`${telegramStatus.success ? 'ri-check-line' : 'ri-information-line'} mr-1`}></i>
        <span>{telegramStatus.message}</span>
      </div>
    );
  };

  // Proceed with the app even if there were initialization errors
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <OfflineBanner />
        <Router />
        <TelegramStatusNotification />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
