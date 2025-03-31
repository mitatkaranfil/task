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

  // Initialize user from Telegram
  useEffect(() => {
    const initUser = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing user");
        
        // Get URL parameters for referral
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get("ref");
        
        console.log("About to authenticate with Telegram");
        // Authenticate with Telegram
        const authenticatedUser = await authenticateTelegramUser(referralCode || undefined);
        
        console.log("Authentication result:", authenticatedUser ? "Success" : "Failed");
        
        if (!authenticatedUser) {
          console.error("Authentication returned null user");
          throw new Error("Authentication failed");
        }
        
        setUser(authenticatedUser);
        console.log("User set:", authenticatedUser);
        
        // Load active boosts
        if (authenticatedUser.id) {
          console.log("Loading boosts for user:", authenticatedUser.id);
          try {
            const boosts = await getUserActiveBoosts(authenticatedUser.id);
            console.log("Loaded boosts:", boosts.length);
            setActiveBoosts(boosts);
          } catch (boostErr) {
            console.error("Error loading boosts:", boostErr);
          }
        }
        
        // Check for mining rewards
        if (authenticatedUser.lastMiningTime && isMiningAvailable(authenticatedUser.lastMiningTime as Date)) {
          console.log("Claiming mining rewards");
          try {
            await claimMiningRewards(authenticatedUser);
            console.log("Mining rewards claimed");
          } catch (miningErr) {
            console.error("Error claiming mining rewards:", miningErr);
          }
        }
        
      } catch (err) {
        console.error("Error initializing user:", err);
        setError("Failed to initialize user");
      } finally {
        console.log("User initialization completed");
        setIsLoading(false);
      }
    };

    initUser();
  }, []);

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
