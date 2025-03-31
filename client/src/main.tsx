import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import App from "./App";
import "./index.css";
import { initializeTelegramApp } from "./lib/telegram";

// Initialize Telegram Mini App
console.log("Main.tsx - Starting application initialization");
try {
  console.log("Main.tsx - Calling initializeTelegramApp");
  initializeTelegramApp();
} catch (error) {
  console.error("Main.tsx - Error initializing Telegram app:", error);
}

// Add event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("Main.tsx - DOM content loaded, rendering App");
});

console.log("Main.tsx - Rendering React application");
createRoot(document.getElementById("root")!).render(<App />);
