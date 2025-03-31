// Firebase configuration
// Firebase varsayılan yapılandırması - geliştirme için
// Üretimde gerçek değerleri kullanmak için .env dosyasına ilgili değişkenleri ekleyin
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkfIJNpO_6dWSLm6jrfxr7-Pg1ysNMGiE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cosmofy-c0363.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cosmofy-c0363",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cosmofy-c0363.appspot.com", 
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "738428383994",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:738428383994:web:e2bde1f0e47da6a7a79d89",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TVFJE9FDHS"
};

// Retry mechanism for Firebase operations
const withRetry = async (operation: () => Promise<any>, maxRetries = 2): Promise<any> => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      lastError = error;
      // Wait a bit before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
};

// Initialize Firebase
export async function initializeFirebase() {
  try {
    // Check if we have cached Firebase instance
    if (app && db) {
      console.log("Using cached Firebase instance");
      return { app, db };
    }

    console.log("Initializing Firebase");
    
    // More aggressive timeout - 3 seconds instead of 5
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Firebase initialization timed out after 3s")), 3000);
    });
    
    try {
      const initPromise = async () => {
        // Lazy load Firebase modules
        const fbModules = await lazyLoadFirebase();
        
        if (!fbModules) {
          throw new Error("Failed to load Firebase modules");
        }
        
        try {
          // Initialize Firebase with minimal configuration
          app = fbModules.initializeApp(firebaseConfig);
          db = fbModules.getFirestore(app);
          console.log("Firebase core services initialized");
        } catch (initError: any) {
          // Handle API key error gracefully
          if (initError.message && initError.message.includes('API key')) {
            console.warn("Firebase API key issue, switching to offline mode:", initError.message);
            return { app: null, db: null, offline: true };
          }
          throw initError;
        }
        
        // Skip analytics in initial load to speed up initialization
        return { app, db };
      };
      
      // Race between initialization and timeout
      const result = await Promise.race([initPromise(), timeoutPromise]);
      
      // If initialization succeeded, initialize collections in background
      if (result && db) {
        // Initialize additional services in background
        setTimeout(() => {
          // Initialize analytics only if we have time
          if (typeof window !== 'undefined') {
            import('firebase/analytics').then(({ getAnalytics }) => {
              try {
                getAnalytics(app);
                console.log("Firebase Analytics initialized in background");
              } catch (e) {
                console.warn("Failed to initialize analytics, continuing without it");
              }
            }).catch(() => {});
          }
          
          // Initialize default data in background
          initializeDefaultData().catch(err => {
            console.warn("Default data initialization failed, using fallback data");
          });
        }, 100);
      }
      
      return result;
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      console.log("Using fallback mode");
      return { app: null, db: null, offline: true };
    }
  } catch (error) {
    console.error("Critical error during Firebase setup:", error);
    return { app: null, db: null, offline: true };
  }
} 