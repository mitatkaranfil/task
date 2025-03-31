import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import LoadingScreen from "@/components/LoadingScreen";
import { initializeFirebase } from "./lib/firebase";
import { initializeTelegramApp } from "./lib/telegram";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    // Check network status immediately
    setIsOfflineMode(!navigator.onLine);

    // Initialize app with timeout
    const init = async () => {
      try {
        console.log(`Uygulama başlatılıyor... (Deneme ${retryCount + 1})`);
        
        // Initialize Telegram WebApp first (fast operation)
        initializeTelegramApp();
        
        // Use a short timeout for the entire initialization process
        const initTimeout = setTimeout(() => {
          console.log("Zaman aşımı - yine de devam ediliyor");
          setIsInitialized(true);
          setIsOfflineMode(true);
        }, 2000); // Only wait 2 seconds max
        
        try {
          // Initialize Firebase with even shorter timeout
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
        
        // Clear timeout and proceed
        clearTimeout(initTimeout);
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

  // Proceed with the app even if there were initialization errors
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <OfflineBanner />
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
