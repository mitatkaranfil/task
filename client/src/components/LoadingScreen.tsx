import React from "react";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Telegram'a bağlanıyor..." 
}) => {
  return (
    <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center flex-col">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-medium text-gray-300">{message}</p>
    </div>
  );
};

export default LoadingScreen;
