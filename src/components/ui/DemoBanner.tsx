"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface DemoBannerProps {
  dismissible?: boolean;
}

export function DemoBanner({ dismissible = true }: DemoBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>Ambiente Demo:</strong> I dati visualizzati sono fittizi e generati automaticamente a scopo dimostrativo.
          </span>
        </div>
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-amber-100 rounded transition-colors text-amber-700"
            aria-label="Chiudi avviso"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
