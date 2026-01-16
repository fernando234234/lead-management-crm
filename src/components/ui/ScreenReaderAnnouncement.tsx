"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";

interface AnnouncementContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export function useAnnouncement() {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error("useAnnouncement must be used within an AnnouncementProvider");
  }
  return context;
}

interface AnnouncementProviderProps {
  children: ReactNode;
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "assertive") {
      setAssertiveMessage("");
      // Force re-render by clearing and then setting
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage("");
      setTimeout(() => setPoliteMessage(message), 50);
    }
  };

  // Clear messages after they've been announced
  useEffect(() => {
    if (politeMessage) {
      const timer = setTimeout(() => setPoliteMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [politeMessage]);

  useEffect(() => {
    if (assertiveMessage) {
      const timer = setTimeout(() => setAssertiveMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [assertiveMessage]);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      
      {/* Polite announcements - for non-urgent updates */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {politeMessage}
      </div>
      
      {/* Assertive announcements - for urgent updates */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {assertiveMessage}
      </div>
    </AnnouncementContext.Provider>
  );
}
