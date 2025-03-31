import React from "react";
import ReactDOM from "react-dom/client";
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

// Ensure we're not calling createRoot multiple times on the same container
let root: ReactDOM.Root | null = null;
const rootElement = document.getElementById("root");

if (rootElement) {
  // Check if we already have a root associated with this container
  if (!(rootElement as any).__reactContainer$) {
    root = ReactDOM.createRoot(rootElement);
  }

  // Only render if we successfully created a new root
  if (root) {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.warn("App already rendered, skipping duplicate render");
  }
}
