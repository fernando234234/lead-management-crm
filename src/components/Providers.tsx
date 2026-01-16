"use client";

import { SessionProvider } from "next-auth/react";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { AnnouncementProvider } from "@/components/ui/ScreenReaderAnnouncement";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <DemoModeProvider>
        <AnnouncementProvider>{children}</AnnouncementProvider>
      </DemoModeProvider>
    </SessionProvider>
  );
}
