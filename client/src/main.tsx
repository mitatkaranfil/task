import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import App from "./App";
import "./index.css";
import { initializeTelegramApp } from "./lib/telegram";

// Initialize Telegram Mini App
initializeTelegramApp();

createRoot(document.getElementById("root")!).render(<App />);
