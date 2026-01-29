import { Sidebar } from "@/components/ui/Sidebar";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { MobileBlocker } from "@/components/ui/MobileBlocker";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Block mobile access - show desktop required message */}
      <MobileBlocker role="marketing" />
      
      <div className="hidden md:flex min-h-screen bg-gray-50">
        {/* Skip to content link for keyboard/screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-marketing focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marketing"
        >
          Vai al contenuto principale
        </a>
        <Sidebar role="marketing" />
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-2.5" role="banner">
            <div className="flex items-center justify-end gap-3">
              <GlobalSearch role="marketing" />
              <NotificationBell role="marketing" />
            </div>
          </header>
          <main id="main-content" className="flex-1 p-5" role="main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
