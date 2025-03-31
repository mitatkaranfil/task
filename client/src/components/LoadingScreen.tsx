import React, { useEffect, useState } from "react";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Telegram'a bağlanıyor...",
  timeout = 15000
}) => {
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [counter, setCounter] = useState(0);
  
  // After timeout, show retry button
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetryButton(true);
    }, timeout);
    
    // Increment counter every second to show user the app isn't frozen
    const intervalId = setInterval(() => {
      setCounter(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, [timeout]);
  
  // Handle manual retry
  const handleRetry = () => {
    window.location.reload();
  };
  
  return (
    <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center flex-col">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-medium text-gray-300">{message}</p>
      <p className="text-sm text-gray-400 mt-2">{counter} saniye geçti</p>
      
      {showRetryButton && (
        <button 
          onClick={handleRetry} 
          className="mt-6 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          Yeniden Dene
        </button>
      )}
    </div>
  );
};

export default LoadingScreen;
