"use client";

import { useState, useEffect } from "react";
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
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Wallet,
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
      { href: "/admin/platforms", label: "Analisi Piattaforme", icon: Wallet },
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
      { href: "/marketing/costs", label: "Costi Campagne", icon: BarChart3 },
      { href: "/marketing/platforms", label: "Analisi Piattaforme", icon: Wallet },
      { href: "/marketing/roi", label: "ROI & Performance", icon: BarChart3 },
    ],
  },
};

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar({ role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { dataSource } = useDataFilter();
  const config = roleConfig[role];

  // Load collapse state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  // Save collapse state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {/* Header with Job Formazione branding */}
      <div 
        className={cn(
          "p-4 flex items-center",
          collapsed ? "justify-center" : "justify-between",
          "bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900",
          "border-b border-gray-700/50"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 sidebar-header-content">
            {/* Red accent bar */}
            <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/20" />
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">{config.title}</h1>
              <p className="text-[10px] text-gray-500">Lead Management CRM</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-1.5 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full" />
        )}
        {/* Close button - only visible on mobile */}
        <button
          onClick={closeSidebar}
          className="md:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Chiudi menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Data Source Filter Indicator */}
      {dataSource !== "all" && !collapsed && (
        <div className={cn(
          "mx-3 mt-3 px-2.5 py-2 rounded-lg",
          dataSource === "legacy" 
            ? "bg-amber-900/30 border border-amber-500/30" 
            : "bg-emerald-900/30 border border-emerald-500/30"
        )}>
          <div className={cn(
            "flex items-center gap-1.5 text-xs",
            dataSource === "legacy" ? "text-amber-300" : "text-emerald-300"
          )}>
            {dataSource === "legacy" ? <Archive size={14} /> : <Plus size={14} />}
            <span className="font-medium">
              {dataSource === "legacy" ? "Solo Legacy" : "Solo Nuovi"}
            </span>
          </div>
          <p className={cn(
            "text-[10px] mt-0.5",
            dataSource === "legacy" ? "text-amber-400/80" : "text-emerald-400/80"
          )}>
            {dataSource === "legacy" 
              ? "Filtro: dati importati da Excel" 
              : "Filtro: lead creati manualmente"}
          </p>
        </div>
      )}

      {/* User Info */}
      {session?.user && !collapsed && (
        <div className="px-3 py-3 border-b border-gray-700/50 sidebar-user-info">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              "bg-gradient-to-br from-red-500/20 to-red-600/20",
              "ring-1 ring-red-500/30"
            )}>
              <User size={14} className="text-red-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white">{session.user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Collapsed user avatar */}
      {session?.user && collapsed && (
        <div className="py-3 flex justify-center border-b border-gray-700/50">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br from-red-500/20 to-red-600/20",
            "ring-1 ring-red-500/30"
          )} title={session.user.name || ""}>
            <User size={14} className="text-red-300" />
          </div>
        </div>
      )}

      {/* Navigation - scrollable area */}
      <nav data-tour="sidebar-nav" className="flex-1 p-2 space-y-0.5 overflow-y-auto" aria-label="Navigazione principale">
        {config.links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              title={collapsed ? link.label : undefined}
              className={cn(
                "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 sidebar-nav-item",
                "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-1 focus:ring-offset-gray-900",
                collapsed && "justify-center px-2",
                isActive
                  ? cn(
                      "bg-white text-gray-900 shadow-md shadow-black/20",
                      "border-l-3",
                      config.borderColor
                    )
                  : "text-gray-400 hover:bg-gray-800/80 hover:text-white"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon 
                size={18} 
                aria-hidden="true" 
                className={cn(
                  "transition-transform duration-200 flex-shrink-0",
                  isActive ? config.textColor : "group-hover:scale-110"
                )}
              />
              {!collapsed && (
                <span className={cn(
                  "text-sm font-medium sidebar-label transition-all duration-200",
                  isActive && config.textColor
                )}>{link.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer with collapse toggle and logout */}
      <div className="p-2 border-t border-gray-700/50 space-y-1">
        {/* Collapse toggle - only on desktop */}
        <button 
          onClick={toggleCollapse}
          className={cn(
            "hidden md:flex items-center gap-2 px-2.5 py-2 w-full rounded-lg",
            "text-gray-400 hover:bg-gray-800 hover:text-white",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-white/20",
            collapsed && "justify-center px-2"
          )}
          aria-label={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          title={collapsed ? "Espandi" : "Comprimi"}
        >
          {collapsed ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft size={18} aria-hidden="true" />
              <span className="text-xs font-medium">Comprimi</span>
            </>
          )}
        </button>
        
        {/* Logout */}
        <button 
          onClick={handleLogout}
          title={collapsed ? "Esci" : undefined}
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 w-full rounded-lg",
            "text-gray-400 hover:bg-red-500/10 hover:text-red-400",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-red-500/50",
            collapsed && "justify-center px-2"
          )}
          aria-label="Esci dall'account"
        >
          <LogOut size={18} aria-hidden="true" />
          {!collapsed && <span className="text-xs font-medium">Esci</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white h-12 flex items-center px-3 shadow-lg border-b border-gray-800">
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 hover:bg-gray-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Apri menu di navigazione"
          aria-expanded={isOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <div className="ml-2.5 flex items-center gap-1.5">
          <div className={cn("w-1 h-4 rounded-full", config.color)} />
          <h1 className="text-sm font-semibold">{config.title}</h1>
        </div>
        {session?.user && (
          <div className="ml-auto flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-700 rounded-lg flex items-center justify-center" aria-hidden="true">
              <User size={14} />
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
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col",
          "transform transition-transform duration-300 ease-out",
          "shadow-2xl shadow-black/50",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menu di navigazione principale"
        aria-hidden={!isOpen}
      >
        <SidebarContent collapsed={false} />
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex h-screen bg-gray-900 text-white flex-col",
          "shadow-xl shadow-black/20 border-r border-gray-800",
          "transition-all duration-300 ease-out",
          "sticky top-0",
          isCollapsed ? "w-16" : "w-56"
        )}
        aria-label="Menu di navigazione principale"
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}
