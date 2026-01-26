import { Sidebar } from "@/components/ui/Sidebar";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { NotificationBell } from "@/components/ui/NotificationBell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-admin focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-admin"
      >
        Vai al contenuto principale
      </a>
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - hidden on mobile since Sidebar has mobile header */}
        <header className="hidden md:block bg-white border-b border-gray-200 px-4 md:px-8 py-4" role="banner">
          <div className="flex items-center justify-end gap-4">
            <GlobalSearch role="admin" />
            <NotificationBell role="admin" />
          </div>
        </header>
        {/* Mobile header spacer - accounts for fixed mobile header from Sidebar */}
        <div className="md:hidden h-14" />
        {/* Main content - responsive padding */}
        <main id="main-content" className="flex-1 p-4 md:p-8 overflow-x-hidden" role="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
