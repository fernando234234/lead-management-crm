"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { signIn, useSession, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, User, Lock, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

// Constants
const LOGIN_TIMEOUT_MS = 15000;
const SIGNIN_TIMEOUT_MS = 10000;
const SESSION_FETCH_TIMEOUT_MS = 5000;
const REDIRECT_FALLBACK_DELAY_MS = 2000;

// Helper: wrap promise with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

// Role-based routes
const ROLE_ROUTES: Record<string, string> = {
  ADMIN: "/admin",
  COMMERCIAL: "/commercial",
  MARKETING: "/marketing",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(errorParam ? "Credenziali non valide" : "");
  const [loading, setLoading] = useState(false);
  const [loginPhase, setLoginPhase] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user?.role) {
      const targetUrl = ROLE_ROUTES[session.user.role] || callbackUrl;
      router.replace(targetUrl);
    }
  }, [sessionStatus, session, router, callbackUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
      }
    };
  }, []);

  const resetLoginState = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
    }
    setLoading(false);
    setLoginPhase("");
  }, []);

  const handleCancel = useCallback(() => {
    resetLoginState();
    setError("Login annullato. Riprova.");
  }, [resetLoginState]);

  const navigateToRole = useCallback(async (role: string | null) => {
    const targetUrl = role ? (ROLE_ROUTES[role] || callbackUrl) : callbackUrl;
    
    setLoginPhase("Reindirizzamento...");
    
    // Try Next.js router first
    try {
      router.replace(targetUrl);
    } catch {
      // Ignore router errors
    }
    
    // Fallback: force navigation after delay if still on login page
    setTimeout(() => {
      if (window.location.pathname === "/login" || window.location.pathname.includes("login")) {
        console.log("[Login] Router failed, forcing navigation to:", targetUrl);
        window.location.href = targetUrl;
      }
    }, REDIRECT_FALLBACK_DELAY_MS);
  }, [router, callbackUrl]);

  const fetchSessionRole = useCallback(async (): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS);
      
      const response = await fetch("/api/auth/session", { 
        signal: controller.signal,
        cache: "no-store",
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Session fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      return data?.user?.role || null;
    } catch (err) {
      console.warn("[Login] Session fetch failed:", err);
      return null;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    // Check online status
    if (!isOnline) {
      setError("Sei offline. Controlla la connessione internet.");
      return;
    }
    
    // Reset state
    setError("");
    setLoading(true);
    setLoginPhase("Verifica credenziali...");
    setRetryCount((prev) => prev + 1);
    
    // Create new abort controller for this attempt
    abortControllerRef.current = new AbortController();
    
    // Set overall timeout
    loginTimeoutRef.current = setTimeout(() => {
      console.warn("[Login] Overall timeout reached");
      setError("Il login sta impiegando troppo tempo. Riprova.");
      resetLoginState();
    }, LOGIN_TIMEOUT_MS);

    try {
      // Refresh CSRF token before authentication
      await getCsrfToken();
      
      // Step 1: Authenticate with timeout
      const result = await withTimeout(
        signIn("credentials", {
          username: username.trim().toLowerCase(),
          password,
          redirect: false,
        }),
        SIGNIN_TIMEOUT_MS,
        "Timeout durante l'autenticazione. Riprova."
      );

      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (result?.error) {
        clearTimeout(loginTimeoutRef.current!);
        setError("Username o password non validi");
        setLoading(false);
        setLoginPhase("");
        return;
      }

      if (!result?.ok) {
        clearTimeout(loginTimeoutRef.current!);
        setError("Errore durante l'autenticazione. Riprova.");
        setLoading(false);
        setLoginPhase("");
        return;
      }

      // Step 2: Get user role
      setLoginPhase("Caricamento profilo...");
      const role = await fetchSessionRole();
      
      // Check if aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Step 3: Navigate
      clearTimeout(loginTimeoutRef.current!);
      await navigateToRole(role);
      
    } catch (err) {
      // Don't show error if aborted intentionally
      if ((err as Error).name === "AbortError") {
        return;
      }
      
      console.error("[Login] Error:", err);
      clearTimeout(loginTimeoutRef.current!);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Si è verificato un errore";
      
      setError(errorMessage);
      setLoading(false);
      setLoginPhase("");
    }
  };

  // Show loading state while checking existing session
  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-xl mb-4 shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mt-4" />
          <p className="text-gray-500 mt-4">Verifica sessione...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-xl mb-4 shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management CRM</h1>
          <p className="text-gray-500 mt-2">Accedi al tuo account</p>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            <WifiOff size={18} className="flex-shrink-0" />
            <span>Sei offline. Connettiti a internet per accedere.</span>
          </div>
        )}

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
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="username"
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="simone."
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="password"
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isOnline}
              className="w-full py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loginPhase || "Accesso in corso..."}</span>
                </>
              ) : (
                <>
                  {isOnline ? <LogIn size={18} /> : <WifiOff size={18} />}
                  {isOnline ? "Accedi" : "Offline"}
                </>
              )}
            </button>

            {/* Cancel button during loading */}
            {loading && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Annulla
              </button>
            )}
          </form>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          {isOnline ? (
            <>
              <Wifi size={14} className="text-green-500" />
              <span>Connesso</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-red-500" />
              <span>Offline</span>
            </>
          )}
          {retryCount > 1 && (
            <span className="ml-2">• Tentativo {retryCount}</span>
          )}
        </div>

        {/* Footer branding */}
        <p className="text-center text-xs text-gray-400 mt-4">
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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-xl mb-4 shadow-lg">
          <LogIn className="w-8 h-8 text-white" />
        </div>
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mt-8" />
        <p className="text-gray-500 mt-4">Caricamento...</p>
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
