"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import SpendRecordForm, { SpendRecordFormData } from "./SpendRecordForm";
import type { SpendRecord } from "./SpendRecordList";

interface SpendRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SpendRecordFormData) => Promise<void>;
  record?: SpendRecord | null;
  isLoading?: boolean;
}

export default function SpendRecordModal({
  isOpen,
  onClose,
  onSave,
  record,
  isLoading = false,
}: SpendRecordModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (data: SpendRecordFormData) => {
    await onSave(data);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {record ? "Modifica Spesa" : "Nuova Spesa"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4">
          <SpendRecordForm
            initialData={record}
            onSubmit={handleSave}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
