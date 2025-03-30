import React, { useState, useEffect } from "react";
import useUser from "@/hooks/useUser";
import { formatPoints, formatBoostRemainingTime } from "@/lib/mining";

const Dashboard: React.FC = () => {
  const { 
    user, 
    activeBoosts, 
    currentMiningSpeed, 
    nextMiningTime, 
    miningStatus, 
    claimMiningRewards 
  } = useUser();
  
  const [remainingTimes, setRemainingTimes] = useState<Record<string, string>>({});
  
  // Update countdown timers
  useEffect(() => {
    if (!activeBoosts.length) return;
    
    // Initial update
    updateRemainingTimes();
    
    // Set interval for updates
    const interval = setInterval(updateRemainingTimes, 1000);
    
    return () => clearInterval(interval);
  }, [activeBoosts]);
  
  // Update boost remaining times
  const updateRemainingTimes = () => {
    const times: Record<string, string> = {};
    
    activeBoosts.forEach(boost => {
      times[boost.id] = formatBoostRemainingTime(boost.endTime as Date);
    });
    
    setRemainingTimes(times);
  };
  
  if (!user) return null;
  
  return (
    <section className="px-4 pt-4 pb-2">
      <div className="bg-dark-card rounded-xl p-4 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Toplam Puanlar</h3>
          <div className="bg-dark-lighter rounded-full px-3 py-1 text-xs">
            <i className="ri-coin-line mr-1 text-yellow-500"></i>
            <span className="font-mono font-medium">{formatPoints(user.points)}</span>
          </div>
        </div>
        
        {/* Mining Widget */}
        <div className="border border-dark-lighter rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <i className="ri-cpu-line mr-2 text-primary text-xl mining-animation"></i>
              <span className="font-medium">Aktif Kazım</span>
            </div>
            <span className={`text-xs bg-${miningStatus.className}/20 ${miningStatus.className} px-2 py-1 rounded-full`}>
              {miningStatus.text}
            </span>
          </div>
          
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Kazım Hızı:</span>
            <span className="font-mono font-medium text-secondary">{currentMiningSpeed} puan/saat</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Sonraki Kazım:</span>
            <span className="font-mono countdown">{nextMiningTime}</span>
          </div>
        </div>
        
        {/* Boost Widget */}
        <div className="border border-dark-lighter rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <i className="ri-rocket-2-line mr-2 text-accent text-xl"></i>
              <span className="font-medium">Aktif Boost</span>
            </div>
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
              {activeBoosts.length} Aktif
            </span>
          </div>
          
          {activeBoosts.length > 0 ? (
            activeBoosts.map(boost => (
              <div key={boost.id} className="flex justify-between items-center py-2 border-b border-dark-lighter">
                <div>
                  <div className="font-medium">{boost.boostType?.name}</div>
                  <div className="text-xs text-gray-400">
                    <span>{boost.boostType?.multiplier / 100}x</span> hız artışı
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-accent">
                    {remainingTimes[boost.id] || formatBoostRemainingTime(boost.endTime as Date)}
                  </div>
                  <div className="text-xs text-gray-400">Kalan süre</div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-3 text-center text-gray-400 text-sm">
              Aktif boost bulunmuyor
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
