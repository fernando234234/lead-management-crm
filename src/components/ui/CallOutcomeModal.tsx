"use client";

import { useState } from "react";
import {
  X,
  Phone,
  PhoneCall,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  History,
} from "lucide-react";

interface CallHistory {
  date: string;
  outcome: string;
  notes?: string;
}

interface CallOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { callOutcome: string; outcomeNotes: string }) => Promise<void>;
  leadName: string;
  callAttempts: number;
  lastAttemptAt: string | null;
  firstAttemptAt: string | null;
  callHistory?: CallHistory[];
  isSubmitting?: boolean;
  // What triggered opening this modal - affects messaging
  trigger?: 'button' | 'contattato' | 'target';
}

export default function CallOutcomeModal({
  isOpen,
  onClose,
  onSubmit,
  leadName,
  callAttempts,
  lastAttemptAt,
  firstAttemptAt,
  callHistory = [],
  isSubmitting = false,
  trigger = 'button',
}: CallOutcomeModalProps) {
  const [callOutcome, setCallOutcome] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showNegativoConfirm, setShowNegativoConfirm] = useState(false);

  if (!isOpen) return null;

  const nextAttempt = callAttempts + 1;
  const remainingAttempts = 8 - nextAttempt;
  const isLastAttempt = nextAttempt >= 8;
  const isFirstCall = callAttempts === 0;

  // Calculate days since last attempt
  const daysSinceLastAttempt = lastAttemptAt
    ? Math.floor((Date.now() - new Date(lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysUntilAutoPerso = daysSinceLastAttempt !== null ? 15 - daysSinceLastAttempt : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callOutcome) return;
    
    // Show confirmation for NEGATIVO (will mark as PERSO)
    if (callOutcome === "NEGATIVO" && !showNegativoConfirm) {
      setShowNegativoConfirm(true);
      return;
    }
    
    await onSubmit({ callOutcome, outcomeNotes });
    setCallOutcome("");
    setOutcomeNotes("");
    setShowNegativoConfirm(false);
  };
  
  const handleConfirmNegativo = async () => {
    await onSubmit({ callOutcome: "NEGATIVO", outcomeNotes });
    setCallOutcome("");
    setOutcomeNotes("");
    setShowNegativoConfirm(false);
  };
  
  const handleCancelNegativo = () => {
    setShowNegativoConfirm(false);
    setCallOutcome("");
  };

  const handleClose = () => {
    setCallOutcome("");
    setOutcomeNotes("");
    setShowHistory(false);
    setShowNegativoConfirm(false);
    onClose();
  };

  const outcomeOptions = [
    {
      value: "POSITIVO",
      label: "Interessato",
      description: "Il lead e interessato, continua nel funnel",
      icon: CheckCircle,
      color: "green",
    },
    {
      value: "RICHIAMARE",
      label: "Da Richiamare",
      description: "Non risponde o chiede di essere richiamato",
      icon: PhoneCall,
      color: "yellow",
    },
    {
      value: "NEGATIVO",
      label: "Non Interessato",
      description: "Il lead non e interessato",
      icon: XCircle,
      color: "red",
    },
  ];

  const getOutcomeLabel = (outcome: string) => {
    return outcomeOptions.find(o => o.value === outcome)?.label || outcome;
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case "POSITIVO": return "text-green-600 bg-green-50";
      case "RICHIAMARE": return "text-yellow-600 bg-yellow-50";
      case "NEGATIVO": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  // Get contextual title and subtitle based on trigger
  const getHeaderContent = () => {
    if (trigger === 'contattato') {
      return {
        title: "Conferma Contatto",
        subtitle: `Hai contattato ${leadName}? Registra l'esito della chiamata:`,
        hint: "Per segnare come contattato, registra l'esito della chiamata"
      };
    }
    if (trigger === 'target') {
      return {
        title: "Conferma Target",
        subtitle: `Vuoi segnare ${leadName} come target? Prima conferma il contatto:`,
        hint: "Per segnare come target, devi prima registrare una chiamata"
      };
    }
    return {
      title: isFirstCall ? "Ho Chiamato - Prima Volta" : "Ho Chiamato - Registra Esito",
      subtitle: leadName,
      hint: null
    };
  };

  const headerContent = getHeaderContent();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-commercial/10 rounded-lg">
              <Phone className="text-commercial" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {headerContent.title}
              </h2>
              <p className="text-sm text-gray-500">{headerContent.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Contextual hint for toggle-triggered modals */}
        {headerContent.hint && (
          <div className="mx-4 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 {headerContent.hint}
            </p>
          </div>
        )}

        {/* Call Tracking Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Tentativo #{nextAttempt} di 8
              </span>
              {callHistory.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-commercial hover:underline flex items-center gap-1"
                >
                  <History size={12} />
                  {showHistory ? "Nascondi" : "Storico"}
                </button>
              )}
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                isLastAttempt
                  ? "bg-red-100 text-red-700"
                  : remainingAttempts <= 2
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isLastAttempt ? "Ultimo tentativo!" : `${remainingAttempts} rimanenti`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${
                nextAttempt >= 7 ? "bg-red-500" : nextAttempt >= 5 ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{ width: `${(nextAttempt / 8) * 100}%` }}
            />
          </div>

          {/* Last attempt info */}
          {lastAttemptAt && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={12} />
              <span>
                Ultima chiamata: {new Date(lastAttemptAt).toLocaleDateString("it-IT")}
                {daysUntilAutoPerso !== null && daysUntilAutoPerso > 0 && (
                  <span className="text-orange-600 ml-1">
                    ({daysUntilAutoPerso} giorni prima di auto-PERSO)
                  </span>
                )}
                {daysUntilAutoPerso !== null && daysUntilAutoPerso <= 0 && (
                  <span className="text-red-600 ml-1 font-medium">
                    (Limite 15 giorni superato!)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Call History */}
          {showHistory && callHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-2">Storico chiamate:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {callHistory.map((call, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 w-16 flex-shrink-0">
                      #{callHistory.length - idx}
                    </span>
                    <span className="text-gray-500 w-20 flex-shrink-0">
                      {new Date(call.date).toLocaleDateString("it-IT")}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${getOutcomeColor(call.outcome)}`}>
                      {getOutcomeLabel(call.outcome)}
                    </span>
                    {call.notes && (
                      <span className="text-gray-500 truncate">{call.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {isLastAttempt && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                <strong>Attenzione:</strong> Questo e l&apos;ultimo tentativo disponibile. 
                Se il lead non risponde, diventerà automaticamente PERSO.
              </p>
            </div>
          )}

          {isFirstCall && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Phone size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>Prima chiamata:</strong> Hai fino a 8 tentativi per contattare questo lead. 
                Dopo 15 giorni senza risposta o 8 tentativi falliti, il lead diventa automaticamente PERSO.
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Esito della chiamata <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {outcomeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = callOutcome === option.value;
                const colorClasses = {
                  green: isSelected ? "border-green-500 bg-green-50" : "hover:border-green-300",
                  yellow: isSelected ? "border-yellow-500 bg-yellow-50" : "hover:border-yellow-300",
                  red: isSelected ? "border-red-500 bg-red-50" : "hover:border-red-300",
                };

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCallOutcome(option.value)}
                    className={`w-full p-3 rounded-lg border-2 transition text-left flex items-start gap-3 ${
                      colorClasses[option.color as keyof typeof colorClasses]
                    } ${isSelected ? `ring-2 ring-offset-1 ${
                      option.color === "green" ? "ring-green-500" : 
                      option.color === "yellow" ? "ring-yellow-500" : "ring-red-500"
                    }` : "border-gray-200"}`}
                  >
                    <Icon
                      size={20}
                      className={
                        option.color === "green"
                          ? "text-green-600"
                          : option.color === "yellow"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }
                    />
                    <div>
                      <p className="font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Outcome warnings */}
            {callOutcome === "NEGATIVO" && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} />
                Il lead sara automaticamente segnato come PERSO
              </p>
            )}
            {callOutcome === "RICHIAMARE" && isLastAttempt && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} />
                Il lead sara automaticamente segnato come PERSO (8 tentativo)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (opzionale)
            </label>
            <textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              rows={2}
              placeholder="Aggiungi note sulla chiamata..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!callOutcome || isSubmitting}
              className="flex-1 px-4 py-2.5 bg-commercial text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Salva Esito
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* NEGATIVO Confirmation Overlay */}
        {showNegativoConfirm && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-6 rounded-xl">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Conferma: Lead Non Interessato
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Stai per segnare <strong>{leadName}</strong> come <strong className="text-red-600">NON INTERESSATO</strong>.
                <br /><br />
                Questa azione lo marcherà come <strong className="text-red-600">PERSO</strong> e non potrà essere facilmente annullata.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelNegativo}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNegativo}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <XCircle size={18} />
                      Conferma PERSO
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
