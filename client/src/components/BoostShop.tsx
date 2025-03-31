import React, { useEffect } from "react";
import useBoosts from "@/hooks/useBoosts";
import useUser from "@/hooks/useUser";
import { formatPoints } from "@/lib/mining";
import { BoostType } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BoostShop: React.FC = () => {
  const { boostTypes, isLoading, buyBoost, getPotentialEarnings } = useBoosts();
  const { user } = useUser();
  
  if (!user) return null;
  
  // Render boost item
  const renderBoostItem = (boost: BoostType) => {
    const colorClass = boost.colorClass || "blue";
    const iconName = boost.iconName || "rocket";
    const potentialEarnings = getPotentialEarnings(boost);
    
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
      <div key={boost.id} className="bg-dark-card rounded-lg p-4 shadow relative">
        {boost.isPopular && (
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
            EN POPÜLER
          </div>
        )}
        
        <div className="flex items-center mb-3">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mr-3", 
            iconColorClass.split(' ')[0]
          )}>
            <i className={cn("text-2xl", `ri-${iconName}-line`, iconColorClass.split(' ')[1])}></i>
          </div>
          <div>
            <h3 className="font-medium">{boost.name}</h3>
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
              onClick={() => buyBoost(boost.id.toString())}
              disabled={user.points < boost.price}
            >
              Satın Al
            </Button>
          ) : (
            <Button 
              className={cn("text-white px-4 py-2 rounded-lg text-sm transition", buttonColorClass)}
              onClick={() => buyBoost(boost.id.toString())}
              disabled={user.points < boost.price}
            >
              Satın Al
            </Button>
          )}
        </div>
        
        {potentialEarnings > 0 && (
          <div className="mt-2 text-xs text-gray-400">
            Potansiyel kazanç: <span className="text-secondary">{potentialEarnings}</span> puan
          </div>
        )}
      </div>
    );
  };
  
  return (
    <section id="boost-section" className="px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Boost Mağazası</h2>
        <div className="flex items-center bg-dark-lighter rounded-full px-3 py-1">
          <i className="ri-coin-line mr-1 text-yellow-500"></i>
          <span className="font-mono font-medium">{formatPoints(user.points)}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          // Loading state
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="bg-dark-card rounded-lg p-4 shadow">
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
          </div>
        )}
      </div>
    </section>
  );
};

export default BoostShop;
