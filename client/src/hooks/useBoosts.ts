import { useState, useEffect, useCallback } from "react";
import { getBoostTypes, purchaseBoost } from "@/lib/firebase";
import { BoostType } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { showConfirm, hapticFeedback } from "@/lib/telegram";
import { formatBoostRemainingTime, calculatePotentialEarnings } from "@/lib/mining";

export const useBoosts = () => {
  const { user, activeBoosts, refreshUser, currentMiningSpeed, isOfflineMode } = useUser();
  const { toast } = useToast();
  
  const [boostTypes, setBoostTypes] = useState<BoostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // Fetch boost types with caching
  const fetchBoostTypes = useCallback(async () => {
    try {
      // First check cache
      const cachedBoostTypes = localStorage.getItem('cachedBoostTypes');
      const cachedTime = localStorage.getItem('cachedBoostTypesTime');
      
      // Use cache if less than 1 hour old
      if (cachedBoostTypes && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime, 10);
        if (cacheAge < 60 * 60 * 1000) { // 1 hour
          console.log("Using cached boost types");
          return JSON.parse(cachedBoostTypes);
        }
      }
      
      // Try API first
      try {
        console.log("Fetching boost types from API");
        const response = await fetch("/api/boosts", {
          signal: AbortSignal.timeout(3000) // 3-second timeout
        });
        
        if (response.ok) {
          const boostData = await response.json();
          
          // Update cache
          localStorage.setItem('cachedBoostTypes', JSON.stringify(boostData));
          localStorage.setItem('cachedBoostTypesTime', Date.now().toString());
          
          return boostData;
        }
      } catch (apiError) {
        console.warn("API error fetching boost types:", apiError);
      }
      
      // Fallback to Firebase with timeout
      const timeoutPromise = new Promise<BoostType[]>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase timeout")), 4000);
      });
      
      const firebasePromise = getBoostTypes();
      const boostData = await Promise.race([firebasePromise, timeoutPromise]);
      
      // Cache the results
      localStorage.setItem('cachedBoostTypes', JSON.stringify(boostData));
      localStorage.setItem('cachedBoostTypesTime', Date.now().toString());
      
      return boostData;
    } catch (error) {
      console.error("Error fetching boost types:", error);
      
      // If there's a cached version, use it even if expired
      const cachedBoostTypes = localStorage.getItem('cachedBoostTypes');
      if (cachedBoostTypes) {
        console.log("Using expired cached boost types due to fetch error");
        return JSON.parse(cachedBoostTypes);
      }
      
      return [];
    }
  }, []);
  
  // Load boosts data
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      // Check if we need to reload
      const shouldReload = forceRefresh || Date.now() - lastFetchTime > 15000 || boostTypes.length === 0;
      
      if (!shouldReload && boostTypes.length > 0) {
        console.log("Using in-memory boost types");
        return;
      }
      
      setIsLoading(true);
      
      // If offline, use cached data only
      if (isOfflineMode) {
        const cachedBoostTypes = localStorage.getItem('cachedBoostTypes');
        if (cachedBoostTypes) {
          setBoostTypes(JSON.parse(cachedBoostTypes));
          setIsLoading(false);
          return;
        }
      }
      
      const boostData = await fetchBoostTypes();
      setBoostTypes(boostData);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Error loading boost types:", error);
      toast({
        title: "Hata",
        description: "Boost tipleri yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchBoostTypes, lastFetchTime, boostTypes.length, isOfflineMode]);
  
  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Refresh function (for pull-to-refresh)
  const refreshBoosts = useCallback(() => {
    return loadData(true);
  }, [loadData]);
  
  // Process boost purchase
  const buyBoost = async (boostTypeId: string) => {
    if (!user) return;
    
    try {
      // Find boost type
      const boostType = boostTypes.find(bt => bt.id === boostTypeId);
      
      if (!boostType) {
        throw new Error("Boost type not found");
      }
      
      // Check if user has enough points
      if (user.points < boostType.price) {
        toast({
          title: "Yetersiz Puan",
          description: `Bu boost için ${boostType.price} puana ihtiyacınız var.`,
          variant: "destructive"
        });
        return;
      }
      
      // Confirm purchase with vibration feedback
      hapticFeedback("success");
      const confirmed = await showConfirm(
        `${boostType.name} satın almak istiyor musunuz? Bu işlem ${boostType.price} puan harcayacak.`
      );
      
      if (!confirmed) return;
      
      // Show loading feedback
      toast({
        title: "İşleniyor",
        description: "Boost satın alınıyor...",
      });
      
      // Update UI optimistically
      const optimisticUser = {...user, points: user.points - boostType.price};
      // We can't directly modify user state here, but we can show a toast with new point balance
      
      // Try to purchase via the API first
      try {
        console.log("Trying to purchase boost via API", user.id, boostTypeId);
        const response = await fetch(`/api/users/${user.id}/boosts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ boostTypeId: boostTypeId }),
          signal: AbortSignal.timeout(5000) // 5-second timeout
        });
        
        if (response.ok) {
          const purchaseResult = await response.json();
          console.log("Boost purchased via API:", purchaseResult);
          
          // Success
          hapticFeedback("success");
          toast({
            title: "Boost Satın Alındı",
            description: `${boostType.name} başarıyla aktifleştirildi!`,
            variant: "default"
          });
          
          // Refresh user data and boosts
          await refreshUser();
          await refreshBoosts();
          return;
        } else {
          console.warn("Failed to purchase boost via API, falling back to Firebase");
        }
      } catch (apiError) {
        console.warn("API error purchasing boost, falling back to Firebase:", apiError);
      }
      
      // Fallback to Firebase
      // Purchase the boost
      const result = await purchaseBoost(user.id, boostTypeId);
      
      if (!result.success) {
        throw new Error(result.error || "Purchase failed");
      }
      
      // Success
      hapticFeedback("success");
      toast({
        title: "Boost Satın Alındı",
        description: `${boostType.name} başarıyla aktifleştirildi!`,
        variant: "default"
      });
      
      // Refresh user data and boosts
      await refreshUser();
      await refreshBoosts();
      
    } catch (error) {
      console.error("Error purchasing boost:", error);
      hapticFeedback("error");
      toast({
        title: "Satın Alma Hatası",
        description: "Boost satın alınırken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  // Get formatted remaining time for active boosts
  const getBoostRemainingTimes = useCallback(() => {
    return activeBoosts.map(boost => ({
      ...boost,
      formattedRemainingTime: formatBoostRemainingTime(boost.endTime as Date)
    }));
  }, [activeBoosts]);
  
  // Calculate and format potential earnings for each boost
  const getPotentialEarnings = useCallback((boostType: BoostType) => {
    if (!user) return 0;
    
    const baseSpeed = user.miningSpeed;
    return calculatePotentialEarnings(
      baseSpeed,
      boostType.multiplier,
      boostType.durationHours
    );
  }, [user]);
  
  return {
    boostTypes,
    isLoading,
    buyBoost,
    getBoostRemainingTimes,
    getPotentialEarnings,
    refreshBoosts
  };
};

export default useBoosts;
