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

  useEffect(() => {
    const init = async () => {
      try {
        console.log(`App initialization attempt ${retryCount + 1}`);
        
        // Initialize Telegram WebApp first
        initializeTelegramApp();
        
        try {
          // Initialize Firebase with shorter timeout
          const firebasePromise = initializeFirebase();
          
          // Create a shorter timeout promise - 5s instead of 10s
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Firebase initialization timed out")), 5000);
          });
          
          // Race between Firebase initialization and timeout
          const result = await Promise.race([firebasePromise, timeoutPromise]);
          
          if (result && typeof result === 'object' && 'app' in result) {
            console.log("Firebase initialization complete");
          } else {
            console.log("Continuing without Firebase");
          }
        } catch (firebaseError) {
          console.error("Firebase initialization error:", firebaseError);
          console.log("Continuing without Firebase");
          // Continue despite Firebase errors
        }
        
        // Always set initialized to true after a short timeout
        // This ensures the app loads even if Firebase fails
        setTimeout(() => {
          setIsInitialized(true);
          setInitError(null);
        }, 500);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setInitError("Uygulama başlatılırken bir hata oluştu");
        
        // Automatically retry up to 2 times but with shorter interval
        if (retryCount < 2) {
          console.log(`Will retry initialization in 1 second (attempt ${retryCount + 1}/3)`);
          setTimeout(() => setRetryCount(prev => prev + 1), 1000);
        } else {
          // After 3 failed attempts, just proceed with the app anyway
          console.log("Max retries exceeded, proceeding anyway");
          setIsInitialized(true);
        }
      }
    };

    init();
  }, [retryCount]);

  // If we're still initializing, show loading screen
  if (!isInitialized) {
    return (
      <LoadingScreen 
        message={initError ? `${initError}. Yeniden deneniyor...` : "Uygulama yükleniyor..."} 
      />
    );
  }

  // Proceed with the app even if there were initialization errors
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
