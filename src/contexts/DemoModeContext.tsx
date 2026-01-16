"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (value: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem("demoMode");
    if (stored !== null) {
      setIsDemoMode(stored === "true");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    // Save to localStorage when changed (only after mount)
    if (mounted) {
      localStorage.setItem("demoMode", String(isDemoMode));
    }
  }, [isDemoMode, mounted]);

  const toggleDemoMode = () => setIsDemoMode((prev) => !prev);
  const setDemoMode = (value: boolean) => setIsDemoMode(value);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
