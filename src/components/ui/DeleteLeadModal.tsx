"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, User, Mail, Phone, BookOpen, Target } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  course?: { name: string } | null;
  campaign?: { name: string } | null;
  assignedTo?: { name: string } | null;
  isTarget?: boolean;
  callAttempts?: number;
  enrolled?: boolean;
}

interface DeleteLeadModalProps {
  lead: Lead;
  onConfirm: (leadId: string) => void;
  onCancel: () => void;
}

const statusLabels: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

const statusColors: Record<string, string> = {
  NUOVO: "bg-blue-100 text-blue-700",
  CONTATTATO: "bg-yellow-100 text-yellow-700",
  IN_TRATTATIVA: "bg-purple-100 text-purple-700",
  ISCRITTO: "bg-green-100 text-green-700",
  PERSO: "bg-red-100 text-red-700",
};

export default function DeleteLeadModal({ lead, onConfirm, onCancel }: DeleteLeadModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const CONFIRM_WORD = "ELIMINA";
  const isConfirmValid = confirmText.toUpperCase() === CONFIRM_WORD;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    try {
      await onConfirm(lead.id);
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine warning level based on lead status
  const isHighValue = lead.status === "IN_TRATTATIVA" || lead.status === "ISCRITTO" || lead.isTarget;
  const hasActivity = (lead.callAttempts || 0) > 0;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header - Red danger bar */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Trash2 size={20} className="text-white" />
            </div>
            <h2 id="delete-modal-title" className="text-lg font-bold text-white">
              Eliminazione Lead
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition text-white"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Warning message */}
          <div className={`flex items-start gap-3 p-4 rounded-lg ${
            isHighValue ? "bg-red-50 border-2 border-red-200" : "bg-yellow-50 border border-yellow-200"
          }`}>
            <AlertTriangle 
              size={24} 
              className={isHighValue ? "text-red-500 flex-shrink-0 mt-0.5" : "text-yellow-500 flex-shrink-0 mt-0.5"} 
            />
            <div>
              <p className={`font-semibold ${isHighValue ? "text-red-700" : "text-yellow-700"}`}>
                {isHighValue ? "⚠️ Attenzione: Lead di alto valore!" : "Stai per eliminare un lead"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Questa azione è <strong>irreversibile</strong>. Tutti i dati del lead, 
                incluse le attività e la cronologia chiamate, verranno eliminati permanentemente.
              </p>
            </div>
          </div>

          {/* Lead details card */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User size={24} className="text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  {lead.name}
                  {lead.isTarget && (
                    <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1">
                      <Target size={10} />
                      Target
                    </span>
                  )}
                </p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                  {statusLabels[lead.status]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.course && (
                <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                  <BookOpen size={14} className="text-gray-400" />
                  <span>{lead.course.name}</span>
                </div>
              )}
            </div>

            {/* Activity info */}
            {hasActivity && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  📞 {lead.callAttempts} chiamate effettuate
                  {lead.enrolled && " • ✅ Iscritto"}
                </p>
              </div>
            )}
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per confermare, digita <span className="font-bold text-red-600">{CONFIRM_WORD}</span>:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Scrivi "${CONFIRM_WORD}" per confermare`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition ${
                confirmText.length > 0
                  ? isConfirmValid
                    ? "border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200"
                    : "border-gray-300 focus:border-gray-400"
                  : "border-gray-200 focus:border-gray-400"
              }`}
              autoComplete="off"
              autoFocus
            />
            {confirmText.length > 0 && !isConfirmValid && (
              <p className="text-xs text-gray-500 mt-1">
                Digita esattamente "{CONFIRM_WORD}" (senza virgolette)
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmValid || isDeleting}
              className={`flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                isConfirmValid && !isDeleting
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Elimina Definitivamente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
