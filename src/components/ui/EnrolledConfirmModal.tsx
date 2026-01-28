"use client";

import { useState, useEffect } from "react";
import { X, GraduationCap, CheckCircle, AlertTriangle } from "lucide-react";

interface EnrolledConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadName: string;
  courseName: string;
  loading?: boolean;
}

export default function EnrolledConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  courseName,
  loading = false,
}: EnrolledConfirmModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [countdown, setCountdown] = useState(3);
  const [canConfirm, setCanConfirm] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCountdown(3);
      setCanConfirm(false);
    }
  }, [isOpen]);

  // Countdown timer for step 2
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && countdown === 0) {
      setCanConfirm(true);
    }
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleFirstConfirm = () => {
    setStep(2);
  };

  const handleFinalConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Step 1: Initial Confirmation */}
        {step === 1 && (
          <>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <GraduationCap className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Conferma Iscrizione</h2>
                    <p className="text-sm text-white/80">Passaggio 1 di 2</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-lg text-gray-700">
                  Stai per iscrivere <strong className="text-gray-900">{leadName}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  al corso <strong>{courseName || "N/A"}</strong>
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Hai verificato che:</p>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>Il lead ha firmato il contratto?</li>
                      <li>Il pagamento è stato confermato?</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleFirstConfirm}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Sì, procedi
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Final Confirmation with Countdown */}
        {step === 2 && (
          <>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-green-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CheckCircle className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Conferma Finale</h2>
                    <p className="text-sm text-white/80">Passaggio 2 di 2</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="p-2 hover:bg-white/20 rounded-lg transition text-white disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <GraduationCap className="text-green-600" size={32} />
                </div>
                <p className="text-lg text-gray-700">
                  <strong className="text-gray-900">{leadName}</strong>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  sarà iscritto al corso <strong>{courseName || "N/A"}</strong>
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 text-center">
                  ✅ Questa azione registrerà la data di iscrizione e aggiornerà le statistiche
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirm}
                  disabled={!canConfirm || loading}
                  className={`flex-1 px-4 py-3 text-white rounded-lg transition font-medium flex items-center justify-center gap-2
                    ${canConfirm 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Iscrizione...
                    </>
                  ) : canConfirm ? (
                    <>
                      <CheckCircle size={18} />
                      Conferma Iscrizione
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold">
                        {countdown}
                      </div>
                      Attendi {countdown}s...
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
