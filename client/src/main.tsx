import { createRoot } from "react-dom/client";
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
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(<App />);
    console.log("Main.tsx - App rendered");
  } else {
    console.error("Main.tsx - Root element not found");
  }
});

// Yedek render işlemi (eğer DOMContentLoaded tetiklenmezse)
setTimeout(() => {
  console.log("Main.tsx - Timeout render check");
  if (!document.getElementById("root")?.hasChildNodes()) {
    console.log("Main.tsx - Rendering App after timeout");
    const rootElement = document.getElementById("root");
    if (rootElement) {
      createRoot(rootElement).render(<App />);
    }
  }
}, 1000);
