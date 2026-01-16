"use client";

import { useRouter } from "next/navigation";
import { ShieldX, Home, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full mb-6">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Accesso Negato</h1>
        <p className="text-slate-400 mb-8 max-w-md">
          Non hai i permessi per accedere a questa pagina. Contatta l&apos;amministratore se pensi sia un errore.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Torna Indietro
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Home size={18} />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
