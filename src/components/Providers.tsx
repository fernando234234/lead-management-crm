"use client";

import { SessionProvider } from "next-auth/react";
import { DataFilterProvider } from "@/contexts/DataFilterContext";
import { AnnouncementProvider } from "@/components/ui/ScreenReaderAnnouncement";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Refetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Refetch when window regains focus
      refetchOnWindowFocus={true}
      // Refetch when coming back online
      refetchWhenOffline={false}
    >
      <DataFilterProvider>
        <AnnouncementProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '8px',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AnnouncementProvider>
      </DataFilterProvider>
    </SessionProvider>
  );
}
