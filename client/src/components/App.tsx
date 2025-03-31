import React, { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/UserContext";
import LoadingScreen from "@/components/LoadingScreen";
import { initializeFirebase } from "./lib/firebase";
import { initializeTelegramApp } from "./lib/telegram";

// Lazy load pages for better performance
const Home = lazy(() => import("@/pages/home"));
const Admin = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<LoadingScreen message="Sayfa yükleniyor..." />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // ... existing code ...
} 