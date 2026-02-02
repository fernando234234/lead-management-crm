"use client";

import { useState } from "react";
import {
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface RecoverLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  leadName: string;
  lostReason?: string | null;
  lostAt?: string | null;
  isSubmitting?: boolean;
}

export default function RecoverLeadModal({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  lostReason,
  lostAt,
  isSubmitting = false,
}: RecoverLeadModalProps) {
  const [recoveryNotes, setRecoveryNotes] = useState("");

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm(recoveryNotes);
    setRecoveryNotes("");
  };

  const handleClose = () => {
    setRecoveryNotes("");
    onClose();
  };

  const formattedLostAt = lostAt 
    ? new Date(lostAt).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <RefreshCw className="text-green-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Recupera Lead
              </h2>
              <p className="text-sm text-gray-500">Riporta il lead in lavorazione</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Lead info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User size={20} className="text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{leadName}</p>
              <p className="text-xs text-gray-500">Lead attualmente PERSO</p>
            </div>
          </div>

          {/* Lost info */}
          {(lostReason || lostAt) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="text-sm font-medium text-red-800">Informazioni sul motivo:</p>
              {lostReason && (
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span><strong>Motivo:</strong> {lostReason}</span>
                </div>
              )}
              {formattedLostAt && (
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <Calendar size={16} className="flex-shrink-0 mt-0.5" />
                  <span><strong>Data:</strong> {formattedLostAt}</span>
                </div>
              )}
            </div>
          )}

          {/* What happens */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 mb-2">Cosa succederà:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5 text-green-600" />
                <span>Lo stato tornerà a <strong>CONTATTATO</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5 text-green-600" />
                <span>Il contatore chiamate verrà azzerato (8 nuovi tentativi)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5 text-green-600" />
                <span>Potrai riprendere a lavorare il lead normalmente</span>
              </li>
            </ul>
          </div>

          {/* Recovery notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <MessageSquare size={16} />
              Motivo del recupero (opzionale)
            </label>
            <textarea
              value={recoveryNotes}
              onChange={(e) => setRecoveryNotes(e.target.value)}
              rows={2}
              placeholder="Es: Il lead ha risposto alla mail, vuole essere ricontattato..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
            disabled={isSubmitting}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RefreshCw size={18} />
                Recupera Lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
