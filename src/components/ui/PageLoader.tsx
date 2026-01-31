"use client";

import { RefreshCw, AlertCircle, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

interface PageLoaderProps {
  /** Loading state */
  loading: boolean;
  /** Error to display */
  error?: Error | null;
  /** Retry function */
  onRetry?: () => void;
  /** Custom loading message */
  loadingMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Children to render when not loading */
  children: React.ReactNode;
  /** Minimum height for the loader */
  minHeight?: string;
  /** Color theme */
  color?: "admin" | "commercial" | "marketing" | "red";
  /** Show skeleton instead of spinner */
  skeleton?: React.ReactNode;
}

const colorClasses = {
  admin: {
    spinner: "border-purple-200 border-t-purple-600",
    button: "bg-purple-600 hover:bg-purple-700",
    text: "text-purple-600",
  },
  commercial: {
    spinner: "border-blue-200 border-t-blue-600",
    button: "bg-blue-600 hover:bg-blue-700",
    text: "text-blue-600",
  },
  marketing: {
    spinner: "border-green-200 border-t-green-600",
    button: "bg-green-600 hover:bg-green-700",
    text: "text-green-600",
  },
  red: {
    spinner: "border-red-200 border-t-red-600",
    button: "bg-red-600 hover:bg-red-700",
    text: "text-red-600",
  },
};

export default function PageLoader({
  loading,
  error,
  onRetry,
  loadingMessage = "Caricamento...",
  errorMessage = "Si è verificato un errore",
  children,
  minHeight = "200px",
  color = "red",
  skeleton,
}: PageLoaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const colors = colorClasses[color];

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

  // Show slow loading warning after 5 seconds
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowSlowWarning(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowSlowWarning(false);
    }
  }, [loading]);

  // Show error state
  if (error) {
    return (
      <div 
        className="flex flex-col items-center justify-center p-8 text-center"
        style={{ minHeight }}
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          {!isOnline ? (
            <WifiOff className="w-8 h-8 text-red-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-600" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {!isOnline ? "Sei offline" : errorMessage}
        </h3>
        <p className="text-gray-500 text-sm mb-4 max-w-md">
          {!isOnline 
            ? "Controlla la connessione internet e riprova."
            : error.message || "Impossibile caricare i dati. Riprova."
          }
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className={`px-4 py-2 ${colors.button} text-white rounded-lg flex items-center gap-2 transition-colors`}
          >
            <RefreshCw size={18} />
            Riprova
          </button>
        )}
      </div>
    );
  }

  // Show loading state
  if (loading) {
    // If skeleton is provided, show it
    if (skeleton) {
      return <>{skeleton}</>;
    }

    return (
      <div 
        className="flex flex-col items-center justify-center p-8"
        style={{ minHeight }}
      >
        <div className={`w-10 h-10 border-4 ${colors.spinner} rounded-full animate-spin mb-4`} />
        <p className="text-gray-500 text-sm">{loadingMessage}</p>
        
        {showSlowWarning && (
          <div className="mt-4 text-center">
            <p className="text-amber-600 text-xs mb-2">
              Il caricamento sta impiegando più tempo del previsto...
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-gray-500 hover:text-gray-700 underline flex items-center gap-1 mx-auto"
              >
                <RefreshCw size={12} />
                Ricarica
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show children when loaded
  return <>{children}</>;
}

/**
 * Simple inline spinner
 */
export function InlineSpinner({ 
  size = 16, 
  color = "red" 
}: { 
  size?: number; 
  color?: "admin" | "commercial" | "marketing" | "red";
}) {
  const colors = colorClasses[color];
  return (
    <div 
      className={`border-2 ${colors.spinner} rounded-full animate-spin`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Full-page loading overlay
 */
export function FullPageLoader({
  message = "Caricamento...",
  color = "red",
}: {
  message?: string;
  color?: "admin" | "commercial" | "marketing" | "red";
}) {
  const colors = colorClasses[color];
  
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div className={`w-12 h-12 border-4 ${colors.spinner} rounded-full animate-spin mx-auto mb-4`} />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeleton({ 
  rows = 5, 
  cols = 5 
}: { 
  rows?: number; 
  cols?: number;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="bg-gray-50 p-4 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 flex gap-4 border-t border-gray-100">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div 
                key={colIndex} 
                className="h-4 bg-gray-100 rounded flex-1"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card skeleton loader
 */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="w-16 h-6 bg-gray-100 rounded" />
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}
