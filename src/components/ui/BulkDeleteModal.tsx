"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, Users, Target, CheckCircle } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  course?: { name: string } | null;
  isTarget?: boolean;
  callAttempts?: number;
  enrolled?: boolean;
}

interface BulkDeleteModalProps {
  leads: Lead[];
  onConfirm: (leadIds: string[]) => void;
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

export default function BulkDeleteModal({ leads, onConfirm, onCancel }: BulkDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const CONFIRM_WORD = "ELIMINA";
  const isConfirmValid = confirmText.toUpperCase() === CONFIRM_WORD;

  // Analyze the leads being deleted
  const highValueLeads = leads.filter(
    l => l.status === "IN_TRATTATIVA" || l.status === "ISCRITTO" || l.isTarget
  );
  const enrolledLeads = leads.filter(l => l.enrolled);
  const targetLeads = leads.filter(l => l.isTarget);
  const totalCalls = leads.reduce((sum, l) => sum + (l.callAttempts || 0), 0);

  const hasHighValueLeads = highValueLeads.length > 0;

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    
    setIsDeleting(true);
    try {
      await onConfirm(leads.map(l => l.id));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-modal-title"
    >
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header - Red danger bar */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Trash2 size={20} className="text-white" />
            </div>
            <h2 id="bulk-delete-modal-title" className="text-lg font-bold text-white">
              Eliminazione Massiva
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
            hasHighValueLeads ? "bg-red-50 border-2 border-red-200" : "bg-yellow-50 border border-yellow-200"
          }`}>
            <AlertTriangle 
              size={24} 
              className={hasHighValueLeads ? "text-red-500 flex-shrink-0 mt-0.5" : "text-yellow-500 flex-shrink-0 mt-0.5"} 
            />
            <div>
              <p className={`font-semibold ${hasHighValueLeads ? "text-red-700" : "text-yellow-700"}`}>
                {hasHighValueLeads 
                  ? "⚠️ Attenzione: Stai eliminando lead di alto valore!" 
                  : `Stai per eliminare ${leads.length} lead`
                }
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Questa azione è <strong>irreversibile</strong>. Tutti i dati dei lead selezionati, 
                incluse le attività e la cronologia chiamate, verranno eliminati permanentemente.
              </p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Users size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-xl text-gray-900">{leads.length} lead</p>
                <p className="text-sm text-gray-500">selezionati per l&apos;eliminazione</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              {enrolledLeads.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {enrolledLeads.length} iscritti
                  </span>
                </div>
              )}
              {targetLeads.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg">
                  <Target size={16} className="text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">
                    {targetLeads.length} target
                  </span>
                </div>
              )}
              {totalCalls > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg col-span-2">
                  <span className="text-sm text-blue-700">
                    📞 {totalCalls} chiamate totali verranno perse
                  </span>
                </div>
              )}
            </div>

            {/* Lead list preview */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Lead selezionati:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {leads.slice(0, 10).map(lead => (
                  <div key={lead.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      lead.status === "ISCRITTO" ? "bg-green-500" :
                      lead.status === "IN_TRATTATIVA" ? "bg-purple-500" :
                      lead.status === "PERSO" ? "bg-red-500" :
                      "bg-gray-400"
                    }`} />
                    <span className="truncate flex-1">{lead.name}</span>
                    {lead.isTarget && (
                      <span className="px-1 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded">
                        Target
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${statusColors[lead.status]}`}>
                      {statusLabels[lead.status]}
                    </span>
                  </div>
                ))}
                {leads.length > 10 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ... e altri {leads.length - 10} lead
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per confermare l&apos;eliminazione di <span className="text-red-600 font-bold">{leads.length} lead</span>, 
              digita <span className="font-bold text-red-600">{CONFIRM_WORD}</span>:
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
                Digita esattamente &quot;{CONFIRM_WORD}&quot; (senza virgolette)
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
                  Elimina {leads.length} Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
