import { createContext, useState, useEffect, ReactNode } from "react";
import { User, UserBoost } from "@/types";
import { authenticateTelegramUser } from "@/lib/telegram";
import { getUserActiveBoosts, updateUserLastMiningTime, updateUserPoints } from "@/lib/firebase";
import { calculateMiningSpeed, isMiningAvailable } from "@/lib/mining";
import LoadingScreen from "@/components/LoadingScreen";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  activeBoosts: UserBoost[];
  refreshUser: () => Promise<void>;
  claimMiningRewards: () => Promise<boolean>;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  error: null,
  activeBoosts: [],
  refreshUser: async () => {},
  claimMiningRewards: async () => false,
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

  // Initialize user from Telegram
  useEffect(() => {
    const initUser = async () => {
      try {
        setIsLoading(true);
        console.log("UserContext - Initializing user, attempt:", initAttempts + 1);
        
        // Get URL parameters for referral
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get("ref");
        
        console.log("UserContext - About to authenticate with Telegram");
        
        // Set a timeout for authentication
        const authPromise = authenticateTelegramUser(referralCode || undefined);
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.log("UserContext - Authentication timed out, using default user");
            resolve(null);
          }, 3000); // 3 second timeout
        });
        
        // Race between authentication and timeout
        const authenticatedUser = await Promise.race([authPromise, timeoutPromise]);
        
        console.log("UserContext - Authentication result:", authenticatedUser ? "Success" : "Failed");
        
        if (!authenticatedUser) {
          console.error("UserContext - Authentication returned null user");
          
          // If we failed to authenticate but have made less than 3 attempts,
          // we'll try again in a moment (to give Telegram WebApp time to initialize)
          if (initAttempts < 3) {
            console.log(`UserContext - Retrying authentication (attempt ${initAttempts + 1}/3)`);
            setInitAttempts(prev => prev + 1);
            return; // Exit without setting isLoading to false
          }
          
          throw new Error("Authentication failed after multiple attempts");
        }
        
        setUser(authenticatedUser);
        console.log("UserContext - User set:", authenticatedUser);
        
        // Load active boosts - do this asynchronously without waiting
        if (authenticatedUser.id) {
          console.log("UserContext - Loading boosts for user:", authenticatedUser.id);
          getUserActiveBoosts(authenticatedUser.id)
            .then(boosts => {
              console.log("UserContext - Loaded boosts:", boosts.length);
              setActiveBoosts(boosts);
            })
            .catch(boostErr => {
              console.error("UserContext - Error loading boosts:", boostErr);
            });
        }
        
        // Check for mining rewards - also asynchronous
        if (authenticatedUser.lastMiningTime && isMiningAvailable(authenticatedUser.lastMiningTime as Date)) {
          console.log("UserContext - Claiming mining rewards");
          claimMiningRewards(authenticatedUser).catch(miningErr => {
            console.error("UserContext - Error claiming mining rewards:", miningErr);
          });
        }
        
      } catch (err) {
        console.error("UserContext - Error initializing user:", err);
        setError("Failed to initialize user");
      } finally {
        console.log("UserContext - User initialization completed or failed after max attempts");
        setIsLoading(false);
      }
    };

    initUser();
  }, [initAttempts]);

  // Check for mining rewards
  const claimMiningRewards = async (userToUpdate = user): Promise<boolean> => {
    if (!userToUpdate) return false;
    
    try {
      const lastMining = new Date(userToUpdate.lastMiningTime as Date);
      const now = new Date();
      
      // Calculate hours passed
      const hoursDiff = Math.floor(
        (now.getTime() - lastMining.getTime()) / (1000 * 60 * 60)
      );
      
      if (hoursDiff <= 0) return false;
      
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
      console.error("Error claiming mining rewards:", err);
      return false;
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Re-authenticate to get fresh user data
      const refreshedUser = await authenticateTelegramUser();
      
      if (!refreshedUser) {
        throw new Error("Failed to refresh user");
      }
      
      setUser(refreshedUser);
      
      // Refresh active boosts
      if (refreshedUser.id) {
        const boosts = await getUserActiveBoosts(refreshedUser.id);
        setActiveBoosts(boosts);
      }
      
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError("Failed to refresh user data");
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
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
