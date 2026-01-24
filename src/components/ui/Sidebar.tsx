"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useDataFilter } from "@/contexts/DataFilterContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Columns3,
  ClipboardList,
  FileSpreadsheet,
  Archive,
  Plus,
  Layers,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "commercial" | "marketing";
}

const roleConfig = {
  admin: {
    color: "bg-admin",
    colorLight: "bg-admin/10",
    textColor: "text-admin",
    borderColor: "border-admin",
    title: "Admin Panel",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/dashboard-commerciale", label: "Dashboard Excel", icon: FileSpreadsheet },
      { href: "/admin/users", label: "Utenti", icon: Users },
      { href: "/admin/courses", label: "Corsi", icon: BookOpen },
      { href: "/admin/campaigns", label: "Campagne", icon: Megaphone },
      { href: "/admin/leads", label: "Tutti i Lead", icon: Users },
      { href: "/admin/pipeline", label: "Pipeline", icon: Columns3 },
      { href: "/admin/reports", label: "Report", icon: BarChart3 },
      { href: "/admin/sanity-check", label: "Sanity Check", icon: ShieldCheck },
      { href: "/admin/settings", label: "Impostazioni", icon: Settings },
    ],
  },
  commercial: {
    color: "bg-commercial",
    colorLight: "bg-commercial/10",
    textColor: "text-commercial",
    borderColor: "border-commercial",
    title: "Area Commerciale",
    links: [
      { href: "/commercial", label: "Dashboard", icon: LayoutDashboard },
      { href: "/commercial/leads", label: "I Miei Lead", icon: Users },
      { href: "/commercial/pipeline", label: "Pipeline", icon: Columns3 },
      { href: "/commercial/tasks", label: "Promemoria", icon: ClipboardList },
      { href: "/commercial/courses", label: "Corsi", icon: BookOpen },
      { href: "/commercial/stats", label: "Le Mie Stats", icon: BarChart3 },
      { href: "/commercial/faq", label: "Guida e FAQ", icon: HelpCircle },
    ],
  },
  marketing: {
    color: "bg-marketing",
    colorLight: "bg-marketing/10",
    textColor: "text-marketing",
    borderColor: "border-marketing",
    title: "Area Marketing",
    links: [
      { href: "/marketing", label: "Dashboard", icon: LayoutDashboard },
      { href: "/marketing/campaigns", label: "Campagne", icon: Megaphone },
      { href: "/marketing/leads", label: "Lead per Campagna", icon: Users },
      { href: "/marketing/costs", label: "Costi", icon: BarChart3 },
      { href: "/marketing/roi", label: "ROI & Performance", icon: BarChart3 },
    ],
  },
};

export function Sidebar({ role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { dataSource } = useDataFilter();
  const config = roleConfig[role];

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Header with Job Formazione branding */}
      <div 
        className={cn(
          "p-5 flex items-center justify-between",
          "bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900",
          "border-b border-gray-700/50"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Red accent bar */}
          <div className="w-1.5 h-10 bg-gradient-to-b from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/20" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">{config.title}</h1>
            <p className="text-xs text-gray-500">Lead Management CRM</p>
          </div>
        </div>
        {/* Close button - only visible on mobile */}
        <button
          onClick={closeSidebar}
          className="md:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Chiudi menu"
        >
          <X size={22} />
        </button>
      </div>

      {/* Data Source Filter Indicator */}
      {dataSource !== "all" && (
        <div className={cn(
          "mx-4 mt-4 px-3 py-2.5 rounded-xl",
          dataSource === "legacy" 
            ? "bg-amber-900/30 border border-amber-500/30" 
            : "bg-emerald-900/30 border border-emerald-500/30"
        )}>
          <div className={cn(
            "flex items-center gap-2 text-sm",
            dataSource === "legacy" ? "text-amber-300" : "text-emerald-300"
          )}>
            {dataSource === "legacy" ? <Archive size={16} /> : <Plus size={16} />}
            <span className="font-medium">
              {dataSource === "legacy" ? "Solo Legacy" : "Solo Nuovi"}
            </span>
          </div>
          <p className={cn(
            "text-xs mt-1",
            dataSource === "legacy" ? "text-amber-400/80" : "text-emerald-400/80"
          )}>
            {dataSource === "legacy" 
              ? "Filtro: dati importati da Excel" 
              : "Filtro: lead creati manualmente"}
          </p>
        </div>
      )}

      {/* User Info */}
      {session?.user && (
        <div className="px-4 py-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-red-500/20 to-red-600/20",
              "ring-2 ring-red-500/30"
            )}>
              <User size={18} className="text-red-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{session.user.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav data-tour="sidebar-nav" className="flex-1 p-4 space-y-1" aria-label="Navigazione principale">
        {config.links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-gray-900",
                isActive
                  ? cn(
                      "bg-white text-gray-900 shadow-lg shadow-black/20",
                      "border-l-4",
                      config.borderColor
                    )
                  : "text-gray-400 hover:bg-gray-800/80 hover:text-white"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon 
                size={20} 
                aria-hidden="true" 
                className={cn(
                  "transition-transform duration-200",
                  isActive ? config.textColor : "group-hover:scale-110"
                )}
              />
              <span className={cn(
                "font-medium",
                isActive && config.textColor
              )}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700/50">
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl",
            "text-gray-400 hover:bg-red-500/10 hover:text-red-400",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
          )}
          aria-label="Esci dall'account"
        >
          <LogOut size={20} aria-hidden="true" />
          <span className="font-medium">Esci</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white h-14 flex items-center px-4 shadow-lg border-b border-gray-800">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Apri menu di navigazione"
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu size={24} aria-hidden="true" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className={cn("w-1.5 h-5 rounded-full", config.color)} />
          <h1 className="text-base font-semibold">{config.title}</h1>
        </div>
        {session?.user && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center" aria-hidden="true">
              <User size={16} />
            </div>
            <span className="sr-only">Utente: {session.user.name}</span>
          </div>
        )}
      </header>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Overlay */}
      <aside
        id="mobile-sidebar"
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white flex flex-col",
          "transform transition-transform duration-300 ease-out",
          "shadow-2xl shadow-black/50",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu di navigazione principale"
        aria-hidden={!isOpen}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex w-64 min-h-screen bg-gray-900 text-white flex-col",
          "shadow-xl shadow-black/20 border-r border-gray-800"
        )}
        aria-label="Menu di navigazione principale"
      >
        <SidebarContent />
      </aside>
    </>
  );
}
