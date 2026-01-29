"use client";

import { useState, useEffect, useRef } from "react";
import { CheckSquare, UserPlus, RefreshCw, Trash2, X, AlertTriangle } from "lucide-react";

interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "danger";
  skipConfirm?: boolean; // Skip built-in confirmation (for custom confirmation modals)
  onClick: () => void;
}

interface BulkActionsProps {
  selectedIds: string[];
  onClear: () => void;
  actions: BulkAction[];
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "danger";
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const dialogTitleId = "confirm-dialog-title";
  const dialogDescId = "confirm-dialog-desc";

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    cancelButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }

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
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div ref={modalRef} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full ${
              variant === "danger" ? "bg-red-100" : "bg-blue-100"
            }`}
            aria-hidden="true"
          >
            <AlertTriangle
              className={`w-6 h-6 ${
                variant === "danger" ? "text-red-600" : "text-blue-600"
              }`}
            />
          </div>
          <div className="flex-1">
            <h3 id={dialogTitleId} className="text-lg font-semibold text-gray-900">{title}</h3>
            <p id={dialogDescId} className="mt-2 text-sm text-gray-700">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BulkActions({
  selectedIds,
  onClear,
  actions,
}: BulkActionsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: BulkAction | null;
  }>({ isOpen: false, action: null });

  if (selectedIds.length === 0) return null;

  const handleActionClick = (action: BulkAction) => {
    // If skipConfirm is true, directly call onClick (for custom confirmation modals)
    if (action.skipConfirm) {
      action.onClick();
    } else if (action.variant === "danger") {
      setConfirmDialog({ isOpen: true, action });
    } else {
      action.onClick();
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.action) {
      confirmDialog.action.onClick();
    }
    setConfirmDialog({ isOpen: false, action: null });
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        role="toolbar"
        aria-label={`Azioni per ${selectedIds.length} lead selezionati`}
      >
        <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-6">
          {/* Selection Count */}
          <div className="flex items-center gap-2" aria-live="polite">
            <CheckSquare size={20} className="text-blue-400" aria-hidden="true" />
            <span className="font-medium">
              {selectedIds.length} lead selezionat{selectedIds.length === 1 ? "o" : "i"}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700" aria-hidden="true" />

          {/* Action Buttons */}
          <div className="flex items-center gap-2" role="group" aria-label="Azioni disponibili">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  action.variant === "danger"
                    ? "bg-red-600/20 text-red-400 hover:bg-red-600/30 focus:ring-red-400"
                    : "bg-white/10 hover:bg-white/20 focus:ring-white"
                }`}
                aria-label={`${action.label} ${selectedIds.length} lead`}
              >
                <span aria-hidden="true">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>

          {/* Clear Selection */}
          <button
            onClick={onClear}
            className="p-2 hover:bg-white/10 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label="Deseleziona tutto"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.action?.label || "Conferma"}
        message={`Sei sicuro di voler ${confirmDialog.action?.label.toLowerCase()} ${selectedIds.length} lead? Questa azione non può essere annullata.`}
        confirmLabel={confirmDialog.action?.label || "Conferma"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, action: null })}
        variant={confirmDialog.action?.variant}
      />
    </>
  );
}

// Export sub-components for flexibility
export { ConfirmDialog };
export type { BulkAction, BulkActionsProps };
