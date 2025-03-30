import React from "react";
import { ActiveTab } from "@/types";

interface BottomNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab, 
  setActiveTab 
}) => {
  const getTabClasses = (tabName: ActiveTab) => {
    return `py-3 px-4 flex flex-col items-center ${
      activeTab === tabName ? "text-primary" : "text-gray-400"
    }`;
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-lighter shadow-lg z-40 max-w-md mx-auto">
      <div className="flex justify-around">
        <button
          id="dashboard-tab"
          className={getTabClasses("dashboard")}
          onClick={() => setActiveTab("dashboard")}
        >
          <i className="ri-dashboard-line text-xl"></i>
          <span className="text-xs mt-1">Kazım</span>
        </button>
        
        <button
          id="tasks-tab"
          className={getTabClasses("tasks")}
          onClick={() => setActiveTab("tasks")}
        >
          <i className="ri-task-line text-xl"></i>
          <span className="text-xs mt-1">Görevler</span>
        </button>
        
        <button
          id="boost-tab"
          className={getTabClasses("boost")}
          onClick={() => setActiveTab("boost")}
        >
          <i className="ri-rocket-2-line text-xl"></i>
          <span className="text-xs mt-1">Boost</span>
        </button>
        
        <button
          id="profile-tab"
          className={getTabClasses("profile")}
          onClick={() => setActiveTab("profile")}
        >
          <i className="ri-user-line text-xl"></i>
          <span className="text-xs mt-1">Profil</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
