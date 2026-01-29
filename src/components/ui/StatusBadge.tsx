"use client";

import { useState } from "react";
import { Info, X, Phone, UserCheck, Target, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

type LeadStatus = "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO";

interface StatusBadgeProps {
  status: LeadStatus;
  // Optional: show WHY the status is what it is
  callAttempts?: number;
  callOutcome?: "POSITIVO" | "RICHIAMARE" | "NEGATIVO" | null;
  contacted?: boolean;
  enrolled?: boolean;
  firstAttemptAt?: Date | string | null;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<LeadStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ReactNode;
}> = {
  NUOVO: { 
    label: "Nuovo", 
    color: "text-blue-700", 
    bgColor: "bg-blue-100",
    icon: <Clock className="w-3 h-3" />
  },
  CONTATTATO: { 
    label: "Contattato", 
    color: "text-yellow-700", 
    bgColor: "bg-yellow-100",
    icon: <Phone className="w-3 h-3" />
  },
  IN_TRATTATIVA: { 
    label: "In Trattativa", 
    color: "text-purple-700", 
    bgColor: "bg-purple-100",
    icon: <Target className="w-3 h-3" />
  },
  ISCRITTO: { 
    label: "Iscritto", 
    color: "text-green-700", 
    bgColor: "bg-green-100",
    icon: <CheckCircle className="w-3 h-3" />
  },
  PERSO: { 
    label: "Perso", 
    color: "text-red-700", 
    bgColor: "bg-red-100",
    icon: <XCircle className="w-3 h-3" />
  },
};

// Explain HOW to change from current status
const statusTransitions: Record<LeadStatus, { 
  explanation: string;
  nextSteps: { action: string; result: string }[];
}> = {
  NUOVO: {
    explanation: "Questo lead non e stato ancora contattato.",
    nextSteps: [
      { action: "Registra una chiamata con esito RICHIAMARE", result: "Rimane NUOVO (chiamata registrata)" },
      { action: "Registra una chiamata con esito POSITIVO", result: "Diventa IN TRATTATIVA" },
      { action: "Registra una chiamata con esito NEGATIVO", result: "Diventa PERSO" },
    ]
  },
  CONTATTATO: {
    explanation: "Questo lead e stato contattato ma non ha ancora mostrato interesse.",
    nextSteps: [
      { action: "Registra esito POSITIVO", result: "Diventa IN TRATTATIVA" },
      { action: "Registra esito NEGATIVO", result: "Diventa PERSO" },
      { action: "8 tentativi con RICHIAMARE", result: "Diventa PERSO automaticamente" },
    ]
  },
  IN_TRATTATIVA: {
    explanation: "Questo lead e interessato (esito POSITIVO). E' in fase di trattativa.",
    nextSteps: [
      { action: "Conferma iscrizione", result: "Diventa ISCRITTO" },
      { action: "Registra esito NEGATIVO", result: "Diventa PERSO" },
    ]
  },
  ISCRITTO: {
    explanation: "Questo lead si e iscritto al corso. Congratulazioni!",
    nextSteps: []
  },
  PERSO: {
    explanation: "Questo lead e stato perso.",
    nextSteps: []
  },
};

export function StatusBadge({ 
  status, 
  callAttempts = 0, 
  callOutcome,
  contacted = false,
  enrolled = false,
  firstAttemptAt,
  size = "md" 
}: StatusBadgeProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  
  const config = statusConfig[status];
  const transitions = statusTransitions[status];
  
  // Calculate why it's PERSO (if applicable)
  const getPersoReason = (): string | null => {
    if (status !== "PERSO") return null;
    if (callOutcome === "NEGATIVO") return "Non interessato (esito NEGATIVO)";
    if (callAttempts >= 8) return `Troppi tentativi (${callAttempts}/8)`;
    if (firstAttemptAt) {
      const daysSinceFirst = Math.floor(
        (new Date().getTime() - new Date(firstAttemptAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceFirst >= 15) return `Inattivo da ${daysSinceFirst} giorni`;
    }
    return "Motivo non specificato";
  };
  
  const persoReason = getPersoReason();
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <div className="relative inline-block">
      {/* Badge Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowExplanation(true);
        }}
        className={`
          ${sizeClasses[size]}
          ${config.bgColor}
          ${config.color}
          rounded-full font-medium
          inline-flex items-center gap-1.5
          hover:ring-2 hover:ring-offset-1 hover:ring-gray-300
          transition-all cursor-help
        `}
        title="Clicca per capire come cambia lo stato"
      >
        {config.icon}
        {config.label}
        <Info className="w-3 h-3 opacity-50" />
      </button>

      {/* Explanation Modal/Popover */}
      {showExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowExplanation(false)}>
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${config.bgColor} ${config.color} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                {config.icon}
                <span className="font-semibold text-lg">{config.label}</span>
              </div>
              <button 
                onClick={() => setShowExplanation(false)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Explanation */}
              <p className="text-gray-600">{transitions.explanation}</p>

              {/* PERSO Reason */}
              {persoReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Motivo:</p>
                    <p className="text-sm text-red-700">{persoReason}</p>
                  </div>
                </div>
              )}

              {/* Current State Info */}
              {status !== "ISCRITTO" && status !== "PERSO" && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Stato Attuale:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>Chiamate: <strong>{callAttempts}/8</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gray-400" />
                      <span>Contattato: <strong>{contacted ? "Si" : "No"}</strong></span>
                    </div>
                    {callOutcome && (
                      <div className="col-span-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span>Ultimo esito: <strong className={
                          callOutcome === "POSITIVO" ? "text-green-600" :
                          callOutcome === "NEGATIVO" ? "text-red-600" : "text-yellow-600"
                        }>{callOutcome}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {transitions.nextSteps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Come cambia lo stato:</p>
                  <ul className="space-y-2">
                    {transitions.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-medium">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="text-gray-600">{step.action}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium text-gray-900">{step.result}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Nota:</strong> Lo stato viene calcolato automaticamente in base alle chiamate e agli esiti registrati. Non puo essere modificato manualmente.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple inline version for tables (no modal, just tooltip)
export function StatusBadgeInline({ status, size = "sm" }: { status: LeadStatus; size?: "sm" | "md" }) {
  const config = statusConfig[status];
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`
        ${sizeClasses[size]}
        ${config.bgColor}
        ${config.color}
        rounded-full font-medium
        inline-flex items-center gap-1
      `}
      title={statusTransitions[status].explanation}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
