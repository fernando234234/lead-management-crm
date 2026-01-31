"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, User, Lock, AlertCircle, RefreshCw } from "lucide-react";

// Timeout wrapper for any promise
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorParam ? "Credenziali non valide" : "");
  const [loading, setLoading] = useState(false);
  const [loginPhase, setLoginPhase] = useState<string>("");
  const [canRetry, setCanRetry] = useState(false);

  // Safety timeout - if login takes more than 15 seconds, allow retry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => {
        setCanRetry(true);
      }, 15000);
    } else {
      setCanRetry(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleRetry = useCallback(() => {
    setLoading(false);
    setLoginPhase("");
    setCanRetry(false);
    setError("Login interrotto. Riprova.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLoginPhase("Verifica credenziali...");
    setCanRetry(false);

    try {
      // Step 1: Sign in with timeout (10 seconds)
      const result = await withTimeout(
        signIn("credentials", {
          username,
          password,
          redirect: false,
        }),
        10000,
        "Timeout durante l'autenticazione"
      );

      if (result?.error) {
        setError("Username o password non validi");
        setLoading(false);
        setLoginPhase("");
        return;
      }

      if (!result?.ok) {
        setError("Si è verificato un errore. Riprova.");
        setLoading(false);
        setLoginPhase("");
        return;
      }

      // Step 2: Fetch session to get role (with timeout)
      setLoginPhase("Caricamento sessione...");
      
      let userRole: string | null = null;
      
      try {
        const sessionRes = await withTimeout(
          fetch("/api/auth/session"),
          5000,
          "Timeout caricamento sessione"
        );
        const session = await sessionRes.json();
        userRole = session?.user?.role || null;
      } catch (sessionError) {
        console.warn("Session fetch failed, will redirect to callback", sessionError);
      }

      // Step 3: Navigate to appropriate page
      setLoginPhase("Reindirizzamento...");
      
      const roleRoutes: Record<string, string> = {
        ADMIN: "/admin",
        COMMERCIAL: "/commercial",
        MARKETING: "/marketing",
      };
      
      const targetUrl = userRole ? (roleRoutes[userRole] || callbackUrl) : callbackUrl;
      
      // Try router.replace first, then fallback to window.location
      try {
        router.replace(targetUrl);
        
        // Give router 2 seconds to navigate, then force redirect
        setTimeout(() => {
          if (document.location.pathname === "/login") {
            console.log("Router navigation didn't work, forcing redirect");
            window.location.href = targetUrl;
          }
        }, 2000);
      } catch (navError) {
        console.warn("Router navigation failed, using window.location", navError);
        window.location.href = targetUrl;
      }
      
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage = err instanceof Error ? err.message : "Si è verificato un errore";
      setError(errorMessage + ". Riprova.");
      setLoading(false);
      setLoginPhase("");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-xl mb-4 shadow-red">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management CRM</h1>
          <p className="text-gray-500 mt-2">Accedi al tuo account</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="simone."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loginPhase || "Accesso in corso..."}</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Accedi
                </>
              )}
            </button>

            {/* Retry button - appears after 15 seconds of loading */}
            {canRetry && (
              <button
                type="button"
                onClick={handleRetry}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Annulla e riprova
              </button>
            )}
          </form>
        </div>

        {/* Help text */}
        {canRetry && (
          <p className="text-center text-xs text-amber-600 mt-4">
            Il login sta impiegando troppo tempo. Prova a ricaricare la pagina.
          </p>
        )}

        {/* Footer branding */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Lead Management CRM
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-xl mb-4 shadow-red">
          <LogIn className="w-8 h-8 text-white" />
        </div>
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mt-8" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
