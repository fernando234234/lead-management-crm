"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Users, UserPlus, X, ArrowRight, CheckCircle } from "lucide-react";

interface Commercial {
  id: string;
  name: string;
  email?: string;
}

interface AssignmentPreview {
  commercialId: string;
  commercialName: string;
  leadCount: number;
}

interface AssignmentModalProps {
  leadIds: string[];
  commercials: Commercial[];
  onAssign: (data: { assignedToId: string } | { distribute: true }) => Promise<void>;
  onClose: () => void;
}

export default function AssignmentModal({
  leadIds,
  commercials,
  onAssign,
  onClose,
}: AssignmentModalProps) {
  const [assignmentMode, setAssignmentMode] = useState<"single" | "distribute">("single");
  const [selectedCommercialId, setSelectedCommercialId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Accessibility refs
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalTitleId = "assignment-modal-title";

  // Focus trap and keyboard handling
  useEffect(() => {
    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;
    
    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      
      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousActiveElement.current?.focus();
    };
  }, [onClose]);

  // Calculate distribution preview for round-robin
  const distributionPreview = useMemo<AssignmentPreview[]>(() => {
    if (assignmentMode !== "distribute" || commercials.length === 0) {
      return [];
    }

    const baseCount = Math.floor(leadIds.length / commercials.length);
    const remainder = leadIds.length % commercials.length;

    return commercials.map((commercial, index) => ({
      commercialId: commercial.id,
      commercialName: commercial.name,
      leadCount: baseCount + (index < remainder ? 1 : 0),
    }));
  }, [assignmentMode, commercials, leadIds.length]);

  // Calculate single assignment preview
  const singlePreview = useMemo<AssignmentPreview | null>(() => {
    if (assignmentMode !== "single" || !selectedCommercialId) {
      return null;
    }

    const commercial = commercials.find((c) => c.id === selectedCommercialId);
    if (!commercial) return null;

    return {
      commercialId: commercial.id,
      commercialName: commercial.name,
      leadCount: leadIds.length,
    };
  }, [assignmentMode, selectedCommercialId, commercials, leadIds.length]);

  const handleSubmit = async () => {
    if (assignmentMode === "single" && !selectedCommercialId) return;

    setIsSubmitting(true);
    try {
      if (assignmentMode === "distribute") {
        await onAssign({ distribute: true });
      } else {
        await onAssign({ assignedToId: selectedCommercialId });
      }
      onClose();
    } catch (error) {
      console.error("Assignment failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = assignmentMode === "distribute" || 
    (assignmentMode === "single" && selectedCommercialId);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg" aria-hidden="true">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-lg font-semibold text-gray-900">Assegna Lead</h2>
              <p className="text-sm text-gray-600">
                {leadIds.length} lead selezionat{leadIds.length === 1 ? "o" : "i"}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Chiudi"
          >
            <X size={20} className="text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Assignment Mode Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              Modalità di assegnazione
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAssignmentMode("single")}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  assignmentMode === "single"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <UserPlus
                  size={24}
                  className={assignmentMode === "single" ? "text-blue-600" : "text-gray-400"}
                />
                <p className="mt-2 font-medium text-gray-900">Assegna tutti a</p>
                <p className="text-sm text-gray-500">Un singolo commerciale</p>
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode("distribute")}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  assignmentMode === "distribute"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Users
                  size={24}
                  className={assignmentMode === "distribute" ? "text-blue-600" : "text-gray-400"}
                />
                <p className="mt-2 font-medium text-gray-900">Distribuisci equamente</p>
                <p className="text-sm text-gray-500">Round-robin tra tutti</p>
              </button>
            </div>
          </div>

          {/* Commercial Selection (Single Mode) */}
          {assignmentMode === "single" && (
            <div className="space-y-3">
              <label htmlFor="commercial-select" className="text-sm font-medium text-gray-700">
                Seleziona commerciale
              </label>
              <select
                id="commercial-select"
                value={selectedCommercialId}
                onChange={(e) => setSelectedCommercialId(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-required="true"
              >
                <option value="">Seleziona un commerciale...</option>
                {commercials.map((commercial) => (
                  <option key={commercial.id} value={commercial.id}>
                    {commercial.name}
                    {commercial.email && ` (${commercial.email})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <ArrowRight size={16} />
              Anteprima assegnazione
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              {assignmentMode === "distribute" ? (
                distributionPreview.length > 0 ? (
                  <div className="space-y-2">
                    {distributionPreview.map((preview) => (
                      <div
                        key={preview.commercialId}
                        className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
                      >
                        <span className="font-medium text-gray-900">
                          {preview.commercialName}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {preview.leadCount} lead
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nessun commerciale disponibile
                  </p>
                )
              ) : singlePreview ? (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {singlePreview.commercialName}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {singlePreview.leadCount} lead
                  </span>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Seleziona un commerciale per vedere l&apos;anteprima
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="flex-1 px-4 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Assegnando...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Conferma Assegnazione
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { Commercial, AssignmentPreview, AssignmentModalProps };
