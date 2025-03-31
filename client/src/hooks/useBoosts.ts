import { useState, useEffect } from "react";
import { getBoostTypes, purchaseBoost } from "@/lib/firebase";
import { BoostType } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { showConfirm, hapticFeedback } from "@/lib/telegram";
import { formatBoostRemainingTime, calculatePotentialEarnings } from "@/lib/mining";

export const useBoosts = () => {
  const { user, activeBoosts, refreshUser, currentMiningSpeed } = useUser();
  const { toast } = useToast();
  
  const [boostTypes, setBoostTypes] = useState<BoostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load boost types
  useEffect(() => {
    const loadBoostTypes = async () => {
      try {
        setIsLoading(true);
        
        // Try to load boost types from API first
        try {
          console.log("Trying to load boost types from API");
          const response = await fetch("/api/boosts");
          
          if (response.ok) {
            const boostData = await response.json();
            console.log("Boost types loaded from API:", boostData);
            setBoostTypes(boostData);
          } else {
            console.warn("Failed to load boost types from API, falling back to Firebase");
            const availableBoosts = await getBoostTypes();
            setBoostTypes(availableBoosts);
          }
        } catch (apiError) {
          console.warn("API error loading boost types, falling back to Firebase:", apiError);
          const availableBoosts = await getBoostTypes();
          setBoostTypes(availableBoosts);
        }
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
    };
    
    loadBoostTypes();
  }, [toast]);
  
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
      
      // Confirm purchase
      const confirmed = await showConfirm(
        `${boostType.name} satın almak istiyor musunuz? Bu işlem ${boostType.price} puan harcayacak.`
      );
      
      if (!confirmed) return;
      
      // Try to purchase via the API first
      try {
        console.log("Trying to purchase boost via API", user.id, boostTypeId);
        const response = await fetch(`/api/users/${user.id}/boosts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ boostTypeId: parseInt(boostTypeId, 10) }),
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
  const getBoostRemainingTimes = () => {
    return activeBoosts.map(boost => ({
      ...boost,
      formattedRemainingTime: formatBoostRemainingTime(boost.endTime as Date)
    }));
  };
  
  // Calculate and format potential earnings for each boost
  const getPotentialEarnings = (boostType: BoostType) => {
    if (!user) return 0;
    
    const baseSpeed = user.miningSpeed;
    return calculatePotentialEarnings(
      baseSpeed,
      boostType.multiplier,
      boostType.durationHours
    );
  };
  
  return {
    boostTypes,
    isLoading,
    buyBoost,
    getBoostRemainingTimes,
    getPotentialEarnings
  };
};

export default useBoosts;
