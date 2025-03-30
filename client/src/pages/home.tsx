import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import TasksList from "@/components/TasksList";
import BoostShop from "@/components/BoostShop";
import Profile from "@/components/Profile";
import BottomNavigation from "@/components/BottomNavigation";
import { ActiveTab } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { isTelegramWebApp } from "@/lib/telegram";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [showIntegrationNote, setShowIntegrationNote] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Show Telegram integration notification
    if (isTelegramWebApp()) {
      setTimeout(() => {
        setShowIntegrationNote(true);
        setTimeout(() => {
          setShowIntegrationNote(false);
        }, 3000);
      }, 1000);
    }
  }, []);
  
  // Update mining animation
  useEffect(() => {
    const interval = setInterval(() => {
      const miningElements = document.querySelectorAll('.mining-animation');
      miningElements.forEach(el => {
        el.classList.remove('mining-animation');
        setTimeout(() => {
          el.classList.add('mining-animation');
        }, 100);
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="max-w-md mx-auto min-h-screen bg-dark text-gray-100 pb-16">
      {/* Header */}
      <Header />
      
      {/* Main Content - conditionally show based on active tab */}
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "tasks" && <TasksList />}
      {activeTab === "boost" && <BoostShop />}
      {activeTab === "profile" && <Profile />}
      
      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Telegram WebApp Integration Notification */}
      {showIntegrationNote && (
        <div className="fixed bottom-20 left-0 right-0 mx-auto max-w-xs bg-dark-card p-3 rounded-lg shadow-lg border border-primary/30 text-center text-sm">
          <i className="ri-information-line text-primary mr-1"></i>
          <span>Telegram WebApp API bağlandı</span>
        </div>
      )}
    </div>
  );
};

export default Home;
