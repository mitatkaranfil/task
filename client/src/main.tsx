import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeTelegramApp } from "./lib/telegram";

// Initialize Telegram Mini App
console.log("Main.tsx - Starting application initialization");
try {
  console.log("Main.tsx - Calling initializeTelegramApp");
  const initResult = initializeTelegramApp();
  console.log("Telegram initialization result:", initResult);
} catch (error) {
  console.error("Main.tsx - Error initializing Telegram app:", error);
}

// Global değişken olarak root'u tanımla
let root: ReactDOM.Root | null = null;

// Render fonksiyonu - tek bir yerden render etmek için
function renderApp() {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found");
    return;
  }
  
  // Eğer halihazırda bir root varsa, tekrar oluşturmamak için kontrol et
  if (!(rootElement as any).__reactContainer$) {
    console.log("Creating new React root");
    try {
      root = ReactDOM.createRoot(rootElement);
      
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (error) {
      console.error("Error creating React root:", error);
    }
  } else {
    console.warn("App already rendered, skipping duplicate render");
  }
}

// Uygulamayı render et
renderApp();
