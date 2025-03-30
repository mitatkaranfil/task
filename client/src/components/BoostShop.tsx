import React from "react";
import useBoosts from "@/hooks/useBoosts";
import useUser from "@/hooks/useUser";
import { formatPoints } from "@/lib/mining";
import { BoostType } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const BoostShop: React.FC = () => {
  const { boostTypes, isLoading, buyBoost, getPotentialEarnings } = useBoosts();
  const { user } = useUser();
  
  if (!user) return null;
  
  // Render boost item
  const renderBoostItem = (boost: BoostType) => {
    const colorClass = boost.colorClass || "blue";
    const iconName = boost.iconName || "rocket";
    const potentialEarnings = getPotentialEarnings(boost);
    
    return (
      <div key={boost.id} className="bg-dark-card rounded-lg p-4 shadow relative">
        {boost.isPopular && (
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
            EN POPÜLER
          </div>
        )}
        
        <div className="flex items-center mb-3">
          <div className={`w-12 h-12 bg-${colorClass}-500/20 rounded-full flex items-center justify-center mr-3`}>
            <i className={`ri-${iconName}-line text-${colorClass}-400 text-2xl`}></i>
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
              onClick={() => buyBoost(boost.id)}
              disabled={user.points < boost.price}
            >
              Satın Al
            </Button>
          ) : (
            <Button 
              className={`bg-${colorClass}-500 hover:bg-${colorClass}-600 text-white px-4 py-2 rounded-lg text-sm transition`}
              onClick={() => buyBoost(boost.id)}
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
