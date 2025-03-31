import { createContext, useState, useEffect, ReactNode } from "react";
import { User, UserBoost } from "@/types";
import { authenticateTelegramUser } from "@/lib/telegram";
import { getUserActiveBoosts, updateUserLastMiningTime, updateUserPoints } from "@/lib/firebase";
import { calculateMiningSpeed, isMiningAvailable } from "@/lib/mining";
import LoadingScreen from "@/components/LoadingScreen";

// Create a fallback user for use when authentication fails
const FALLBACK_USER: User = {
  id: 'offline-user',
  telegramId: '0',
  firstName: 'Misafir',
  lastName: 'Kullanıcı',
  username: 'guest',
  level: 1,
  points: 100,
  miningSpeed: 10,
  lastMiningTime: new Date(),
  joinDate: new Date(),
  completedTasksCount: 0,
  boostUsageCount: 0,
  referralCode: 'OFFLINE',
  isOfflineMode: true
};

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  activeBoosts: UserBoost[];
  refreshUser: () => Promise<void>;
  claimMiningRewards: () => Promise<boolean>;
  isOfflineMode: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  activeBoosts: [],
  refreshUser: async () => {},
  claimMiningRewards: async () => false,
  isOfflineMode: false
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBoosts, setActiveBoosts] = useState<UserBoost[]>([]);
  const [initAttempts, setInitAttempts] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Initialize user from Telegram
  useEffect(() => {
    // Check if we're offline first
    const checkConnection = () => {
      const isOnline = navigator.onLine;
      setIsOfflineMode(!isOnline);
      return isOnline;
    };

    const initUser = async () => {
      try {
        setIsLoading(true);
        console.log("Kullanıcı bilgileri yükleniyor, deneme:", initAttempts + 1);
        
        // Check if we're offline
        if (!checkConnection()) {
          console.log("Çevrimdışı mod - misafir hesabı kullanılıyor");
          setUser(FALLBACK_USER);
          setIsLoading(false);
          return;
        }
        
        // Try to load user from localStorage first
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            console.log("Önbellek'ten kullanıcı yüklendi");
            setUser(parsedUser);
            // Continue with authentication in background
          } catch (cacheError) {
            console.error("Önbellek hatası:", cacheError);
            // Continue with normal auth
          }
        }
        
        // Get URL parameters for referral
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get("ref");
        
        console.log("Telegram ile kimlik doğrulaması başlatılıyor");
        
        // Set a timeout for authentication - even shorter (2 seconds)
        const authPromise = authenticateTelegramUser(referralCode || undefined);
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log("Kimlik doğrulama zaman aşımı - varsayılan kullanıcı kullanılıyor");
            resolve(null);
          }, 2000); // 2 second timeout
        });
        
        // Race between authentication and timeout
        const authenticatedUser = await Promise.race([authPromise, timeoutPromise]);
        
        if (!authenticatedUser) {
          console.warn("Kimlik doğrulama başarısız oldu");
          
          // If we already set a cached user, continue with that
          if (user) {
            console.log("Önbellekteki kullanıcı bilgileriyle devam ediliyor");
            setIsLoading(false);
            return;
          }
          
          // If we failed but have made less than 2 attempts, try again
          if (initAttempts < 1) {
            console.log(`Kimlik doğrulama yeniden deneniyor (${initAttempts + 1}/2)`);
            setInitAttempts(prev => prev + 1);
            return; // Exit without setting isLoading to false
          }
          
          // After 2 failed attempts, use fallback user
          console.log("Kimlik doğrulama başarısız - misafir hesabı kullanılıyor");
          setUser(FALLBACK_USER);
          setIsOfflineMode(true);
          setIsLoading(false);
          return;
        }
        
        // Cache the user for faster loading next time
        try {
          localStorage.setItem('cachedUser', JSON.stringify(authenticatedUser));
        } catch (e) {
          console.warn("Kullanıcı önbelleğe alınamadı:", e);
        }
        
        setUser(authenticatedUser);
        console.log("Kullanıcı bilgileri yüklendi:", authenticatedUser.firstName);
        
        // Load active boosts in background
        if (authenticatedUser.id) {
          getUserActiveBoosts(authenticatedUser.id)
            .then(boosts => {
              setActiveBoosts(boosts);
            })
            .catch(err => {
              console.error("Boost yüklenirken hata:", err);
            });
            
          // Check for mining rewards in background too
          if (authenticatedUser.lastMiningTime && isMiningAvailable(authenticatedUser.lastMiningTime as any as Date)) {
            claimMiningRewards(authenticatedUser).catch(err => {
              console.error("Kazım ödülü alınırken hata:", err);
            });
          }
        }
        
      } catch (err) {
        console.error("Kullanıcı bilgileri yüklenirken hata:", err);
        setError("Kullanıcı bilgileri yüklenemedi");
        
        // Use fallback user in case of error
        setUser(FALLBACK_USER);
        setIsOfflineMode(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      console.log("Çevrimiçi moduna geçildi");
      setIsOfflineMode(false);
      // Try to refresh user when we come back online
      if (user?.isOfflineMode) {
        initUser();
      }
    };
    
    const handleOffline = () => {
      console.log("Çevrimdışı moduna geçildi");
      setIsOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    initUser();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initAttempts]);

  // Check for mining rewards
  const claimMiningRewards = async (userToUpdate = user): Promise<boolean> => {
    if (!userToUpdate) return false;
    
    try {
      const lastMining = new Date(userToUpdate.lastMiningTime as any);
      const now = new Date();
      
      // Calculate hours passed
      const hoursDiff = Math.floor(
        (now.getTime() - lastMining.getTime()) / (1000 * 60 * 60)
      );
      
      if (hoursDiff <= 0) return false;
      
      // If in offline mode, don't attempt to update server
      if (isOfflineMode || userToUpdate.isOfflineMode) {
        console.log("Çevrimdışı mod - kazım ödülleri geçici olarak saklanıyor");
        return false;
      }
      
      // Calculate mining speed with boosts
      let miningSpeed = userToUpdate.miningSpeed;
      
      // Apply boost multipliers
      for (const boost of activeBoosts) {
        miningSpeed = Math.floor(
          miningSpeed * (boost.boostType!.multiplier / 100)
        );
      }
      
      // Calculate earned points
      const earnedPoints = hoursDiff * miningSpeed;
      
      // Update points in Firebase
      await updateUserPoints(userToUpdate.id, earnedPoints);
      
      // Update last mining time
      await updateUserLastMiningTime(userToUpdate.id);
      
      // Refresh user
      await refreshUser();
      
      return true;
    } catch (err) {
      console.error("Kazım ödülü alınırken hata:", err);
      return false;
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!user) return;
    
    // If in offline mode, don't attempt to refresh
    if (isOfflineMode || user.isOfflineMode) {
      console.log("Çevrimdışı mod - kullanıcı bilgileri yenilenemiyor");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Set a short timeout for the refresh
      const refreshPromise = authenticateTelegramUser();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log("Yenileme zaman aşımı");
          resolve(null);
        }, 2000);
      });
      
      const refreshedUser = await Promise.race([refreshPromise, timeoutPromise]);
      
      if (!refreshedUser) {
        throw new Error("Kullanıcı bilgileri yenilenemedi");
      }
      
      // Update localStorage cache
      try {
        localStorage.setItem('cachedUser', JSON.stringify(refreshedUser));
      } catch (e) {
        console.warn("Kullanıcı önbelleğe alınamadı:", e);
      }
      
      setUser(refreshedUser);
      
      // Refresh active boosts
      if (refreshedUser.id) {
        getUserActiveBoosts(refreshedUser.id)
          .then(boosts => setActiveBoosts(boosts))
          .catch(err => console.error("Boost bilgileri yüklenemedi:", err));
      }
      
    } catch (err) {
      console.error("Kullanıcı bilgileri yenilenirken hata:", err);
      setError("Kullanıcı bilgileri yenilenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return <LoadingScreen message="Telegram'a bağlanıyor..." />;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        error,
        activeBoosts,
        refreshUser,
        claimMiningRewards,
        isOfflineMode
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
