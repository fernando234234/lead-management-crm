"use client";

import { SessionProvider } from "next-auth/react";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { DataFilterProvider } from "@/contexts/DataFilterContext";
import { AnnouncementProvider } from "@/components/ui/ScreenReaderAnnouncement";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <DemoModeProvider>
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
      </DemoModeProvider>
    </SessionProvider>
  );
}
