"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, User, ArrowRight, AlertTriangle } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();

  const roleRoutes: Record<string, { href: string; label: string; color: string; hoverColor: string }> = {
    ADMIN: { href: "/admin", label: "Dashboard Admin", color: "bg-red-600", hoverColor: "hover:bg-red-700" },
    COMMERCIAL: { href: "/commercial", label: "Dashboard Commerciale", color: "bg-emerald-600", hoverColor: "hover:bg-emerald-700" },
    MARKETING: { href: "/marketing", label: "Dashboard Marketing", color: "bg-orange-600", hoverColor: "hover:bg-orange-700" },
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      {/* Subtle red accent top bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-red-600" />
      
      {/* Demo/Mock Data Banner */}
      <div className="fixed top-1 left-0 right-0 bg-amber-50 border-b border-amber-200 py-2 px-4 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-amber-800 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>Versione Demo:</strong> Questo sito utilizza dati fittizi a scopo dimostrativo. 
            Nessun dato reale viene memorizzato o elaborato.
          </span>
        </div>
      </div>
      
      <div className="text-center space-y-8 p-8 max-w-lg mt-12">
        {/* Logo area */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-2xl shadow-red mb-4">
          <span className="text-3xl font-bold text-white">LM</span>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900">
          Lead Management <span className="text-red-600">CRM</span>
        </h1>
        <p className="text-gray-500 max-w-md mx-auto">
          Gestione completa di Lead, Corsi, Campagne Marketing e Performance Commerciali
        </p>

        {status === "loading" ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : session ? (
          // Logged in view
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-3 text-gray-700 bg-gray-50 rounded-xl px-4 py-3">
              <User className="w-5 h-5 text-red-600" />
              <span>
                Benvenuto, <strong>{session.user?.name}</strong>
              </span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
                {session.user?.role}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session.user?.role && roleRoutes[session.user.role] && (
                <Link
                  href={roleRoutes[session.user.role].href}
                  className={`px-6 py-3 ${roleRoutes[session.user.role].color} ${roleRoutes[session.user.role].hoverColor} text-white rounded-lg transition-all duration-200 font-medium flex items-center gap-2 justify-center shadow-sm hover:shadow-md`}
                >
                  {roleRoutes[session.user.role].label}
                  <ArrowRight size={18} />
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium flex items-center gap-2 justify-center"
              >
                <LogOut size={18} />
                Esci
              </button>
            </div>
          </div>
        ) : (
          // Not logged in view
          <div className="space-y-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <LogIn size={20} />
              Accedi
            </Link>

            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                Oppure accedi direttamente come:
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/admin"
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Admin
                </Link>
                <Link
                  href="/commercial"
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Commerciale
                </Link>
                <Link
                  href="/marketing"
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                >
                  Marketing
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Footer branding */}
        <div className="pt-8 space-y-2">
          <p className="text-xs text-gray-400">
            Ispirato allo stile Job Formazione
          </p>
          <p className="text-xs text-amber-600 font-medium">
            I dati visualizzati sono fittizi e generati automaticamente
          </p>
        </div>
      </div>
    </main>
  );
}
