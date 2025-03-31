import React, { useState, useCallback } from "react";
import useBoosts from "@/hooks/useBoosts";
import useUser from "@/hooks/useUser";
import { formatPoints } from "@/lib/mining";
import { BoostType } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { hapticFeedback } from "@/lib/telegram";

const BoostShop: React.FC = () => {
  const { boostTypes, isLoading, buyBoost, getPotentialEarnings, refreshBoosts } = useBoosts();
  const { user } = useUser();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBoost, setSelectedBoost] = useState<string | null>(null);
  
  if (!user) return null;
  
  // Pull to refresh implementation
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    hapticFeedback("success");
    
    try {
      await refreshBoosts();
      toast({
        title: "Güncellendi",
        description: "Boost mağazası güncellendi",
        variant: "default"
      });
    } catch (error) {
      console.error("Error refreshing boosts:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshBoosts, isRefreshing, toast]);
  
  // Add pull-to-refresh
  React.useEffect(() => {
    // Setup pull-to-refresh using touch events
    let startY = 0;
    let currentY = 0;
    const threshold = 100; // Pixels to pull down to trigger refresh
    const boostSection = document.getElementById('boost-section');
    
    if (!boostSection) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      // Only allow pull-to-refresh if at top of the page
      if (window.scrollY === 0 && diff > 0 && diff < 200) {
        e.preventDefault();
        boostSection.style.transform = `translateY(${diff / 3}px)`;
        boostSection.style.transition = 'none';
        
        // Show pull to refresh indicator
        if (diff > threshold) {
          document.getElementById('ptr-indicator-boost')?.classList.add('active');
        } else {
          document.getElementById('ptr-indicator-boost')?.classList.remove('active');
        }
      }
    };
    
    const handleTouchEnd = async () => {
      const diff = currentY - startY;
      boostSection.style.transform = 'translateY(0)';
      boostSection.style.transition = 'transform 0.3s ease-out';
      
      if (diff > threshold && window.scrollY === 0) {
        await handleRefresh();
      }
      
      document.getElementById('ptr-indicator-boost')?.classList.remove('active');
    };
    
    boostSection.addEventListener('touchstart', handleTouchStart, { passive: false });
    boostSection.addEventListener('touchmove', handleTouchMove, { passive: false });
    boostSection.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      boostSection.removeEventListener('touchstart', handleTouchStart);
      boostSection.removeEventListener('touchmove', handleTouchMove);
      boostSection.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleRefresh]);
  
  // Handle boost purchase
  const handleBuyBoost = useCallback((boostId: string) => {
    hapticFeedback("success");
    setSelectedBoost(boostId);
    buyBoost(boostId).finally(() => {
      setSelectedBoost(null);
    });
  }, [buyBoost]);
  
  // Render boost item with animations
  const renderBoostItem = (boost: BoostType, index: number) => {
    const colorClass = boost.colorClass || "blue";
    const iconName = boost.iconName || "rocket";
    const potentialEarnings = getPotentialEarnings(boost);
    const isSelected = selectedBoost === boost.id;
    
    // Predefined color classes to avoid tailwind purging issues
    const colorClassMap = {
      blue: "bg-blue-500/20 text-blue-400 hover:bg-blue-600",
      purple: "bg-purple-500/20 text-purple-400 hover:bg-purple-600",
      yellow: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-600",
      red: "bg-red-500/20 text-red-400 hover:bg-red-600",
      green: "bg-green-500/20 text-green-400 hover:bg-green-600",
      pink: "bg-pink-500/20 text-pink-400 hover:bg-pink-600",
      orange: "bg-orange-500/20 text-orange-400 hover:bg-orange-600",
      indigo: "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-600",
      teal: "bg-teal-500/20 text-teal-400 hover:bg-teal-600",
      cyan: "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-600",
    };
    
    const buttonColorMap = {
      blue: "bg-blue-500 hover:bg-blue-600", 
      purple: "bg-purple-500 hover:bg-purple-600",
      yellow: "bg-yellow-500 hover:bg-yellow-600",
      red: "bg-red-500 hover:bg-red-600",
      green: "bg-green-500 hover:bg-green-600",
      pink: "bg-pink-500 hover:bg-pink-600",
      orange: "bg-orange-500 hover:bg-orange-600",
      indigo: "bg-indigo-500 hover:bg-indigo-600",
      teal: "bg-teal-500 hover:bg-teal-600",
      cyan: "bg-cyan-500 hover:bg-cyan-600",
    };
    
    const iconColorClass = colorClassMap[colorClass as keyof typeof colorClassMap] || colorClassMap.blue;
    const buttonColorClass = buttonColorMap[colorClass as keyof typeof buttonColorMap] || buttonColorMap.blue;
    
    return (
      <motion.div 
        key={boost.id} 
        className="bg-dark-card rounded-lg p-4 shadow relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {boost.isPopular && (
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
            EN POPÜLER
          </div>
        )}
        
        <div className="flex items-center mb-3">
          <motion.div 
            className={cn("w-12 h-12 rounded-full flex items-center justify-center mr-3", 
              iconColorClass.split(' ')[0]
            )}
            whileHover={{ rotate: 15 }}
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <i className={cn("text-2xl", `ri-${iconName}-line`, iconColorClass.split(' ')[1])}></i>
          </motion.div>
          <div>
            <h3 className="font-medium text-white">{boost.name}</h3>
            <p className="text-sm text-gray-400">{boost.description}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <i className="ri-coin-line mr-1 text-yellow-500"></i>
            <span className="font-mono font-medium">{boost.price}</span>
          </div>
          
          {boost.isPopular ? (
            <Button 
              className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg text-sm transition"
              onClick={() => handleBuyBoost(boost.id.toString())}
              disabled={user.points < boost.price || isSelected}
            >
              {isSelected ? (
                <><i className="ri-loader-4-line animate-spin mr-1"></i> İşleniyor</>
              ) : (
                <>Satın Al</>
              )}
            </Button>
          ) : (
            <Button 
              className={cn("text-white px-4 py-2 rounded-lg text-sm transition", buttonColorClass)}
              onClick={() => handleBuyBoost(boost.id.toString())}
              disabled={user.points < boost.price || isSelected}
            >
              {isSelected ? (
                <><i className="ri-loader-4-line animate-spin mr-1"></i> İşleniyor</>
              ) : (
                <>Satın Al</>
              )}
            </Button>
          )}
        </div>
        
        {potentialEarnings > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            Potansiyel kazanç: <span className="text-secondary">{potentialEarnings}</span> puan
          </div>
        )}
      </motion.div>
    );
  };
  
  return (
    <>
      {/* Pull to refresh indicator */}
      <div id="ptr-indicator-boost" className="fixed top-0 left-0 right-0 h-1 bg-primary transform scale-x-0 transition-transform origin-center">
        <div className={`absolute left-1/2 top-4 -translate-x-1/2 text-xs text-primary ${isRefreshing ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          Yenileniyor...
        </div>
      </div>
      
      <section id="boost-section" className="px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Boost Mağazası</h2>
          <motion.div 
            className="flex items-center bg-dark-lighter rounded-full px-3 py-1"
            whileHover={{ scale: 1.05 }}
          >
            <i className="ri-coin-line mr-1 text-yellow-500"></i>
            <span className="font-mono font-medium">{formatPoints(user.points)}</span>
          </motion.div>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            // Loading state with animation
            Array(4).fill(0).map((_, index) => (
              <div key={index} className="bg-dark-card rounded-lg p-4 shadow animate-pulse">
                <div className="flex items-center mb-3">
                  <Skeleton className="w-12 h-12 rounded-full mr-3" />
                  <div className="w-3/4">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))
          ) : boostTypes.length > 0 ? (
            // Boost list
            boostTypes.map(renderBoostItem)
          ) : (
            // No boosts
            <div className="bg-dark-card rounded-lg p-6 shadow text-center">
              <i className="ri-rocket-2-line text-4xl text-gray-500 mb-2"></i>
              <p className="text-gray-400">Şu anda mevcut boost bulunmuyor.</p>
              <Button 
                className="mt-4 bg-primary hover:bg-primary/90"
                onClick={handleRefresh}
              >
                <i className="ri-refresh-line mr-2"></i> Yenile
              </Button>
            </div>
          )}
        </div>
        
        {/* Manual refresh button */}
        {boostTypes.length > 0 && !isLoading && (
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              className="text-gray-400 hover:text-white"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Yenileniyor...
                </>
              ) : (
                <>
                  <i className="ri-refresh-line mr-2"></i>
                  Boostları Yenile
                </>
              )}
            </Button>
          </div>
        )}
      </section>
    </>
  );
};

export default BoostShop;
