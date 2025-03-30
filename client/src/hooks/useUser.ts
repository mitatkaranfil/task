import { useContext } from "react";
import { UserContext } from "@/context/UserContext";
import { calculateMiningSpeed, calculateNextMiningTime, getMiningStatus } from "@/lib/mining";

// Custom hook to access user data and functionality
export const useUser = () => {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  
  const { user, activeBoosts, ...rest } = context;
  
  // Calculate current mining speed (with boosts)
  const currentMiningSpeed = user 
    ? calculateMiningSpeed(user.miningSpeed, activeBoosts)
    : 0;
  
  // Calculate next mining time
  const nextMiningTime = user 
    ? calculateNextMiningTime(user.lastMiningTime as Date)
    : "00:00";
  
  // Get mining status
  const miningStatus = user 
    ? getMiningStatus(user.lastMiningTime as Date, activeBoosts)
    : { text: "Bağlanıyor", className: "text-gray-400" };
  
  // Calculate active boost count
  const activeBoostCount = activeBoosts.length;
  
  return {
    user,
    activeBoosts,
    currentMiningSpeed,
    nextMiningTime,
    miningStatus,
    activeBoostCount,
    ...rest
  };
};

export default useUser;
