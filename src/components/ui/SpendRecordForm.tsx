"use client";

import { useState, useEffect, useId } from "react";
import { Calendar, Euro, FileText, Loader2 } from "lucide-react";
import type { SpendRecord } from "./SpendRecordList";
import { DateInputField } from "@/components/ui/DateInputField";
import { formatDateForInput } from "@/lib/date";

export interface SpendRecordFormData {
  startDate: string;
  endDate: string | null;
  amount: number;
  notes: string | null;
}

interface SpendRecordFormProps {
  initialData?: SpendRecord | null;
  onSubmit: (data: SpendRecordFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  accent?: "admin" | "marketing";
}

export default function SpendRecordForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  accent = "marketing",
}: SpendRecordFormProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountId = useId();
  const notesId = useId();

  const accentStyles = {
    admin: {
      input: "focus:ring-admin focus:border-admin",
      primaryButton: "bg-admin hover:bg-admin/90",
      date: "admin" as const,
    },
    marketing: {
      input: "focus:ring-marketing focus:border-marketing",
      primaryButton: "bg-marketing hover:bg-marketing/90",
      date: "marketing" as const,
    },
  };

  const currentAccent = accentStyles[accent];

  useEffect(() => {
    if (initialData) {
      // Edit mode - populate fields
      setStartDate(initialData.startDate.split("T")[0]);
      setEndDate(initialData.endDate ? initialData.endDate.split("T")[0] : "");
      const amountNum = typeof initialData.amount === "string" 
        ? parseFloat(initialData.amount) 
        : initialData.amount;
      setAmount(amountNum.toString());
      setNotes(initialData.notes || "");
    } else {
      // Create mode - default to current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(formatDateForInput(firstDay));
      setEndDate(formatDateForInput(lastDay));
      setAmount("");
      setNotes("");
    }
    setError(null);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!startDate) {
      setError("La data di inizio è obbligatoria");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setError("Inserisci un importo valido");
      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError("La data di fine deve essere successiva alla data di inizio");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        startDate,
        endDate: endDate || null,
        amount: amountNum,
        notes: notes.trim() || null,
      });
    } catch (err) {
      console.error("Error submitting spend record:", err);
      setError("Errore nel salvataggio. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <DateInputField
          label="Data Inizio *"
          value={startDate}
          onChange={setStartDate}
          disabled={disabled}
          required
          accent={currentAccent.date}
          labelIcon={<Calendar size={14} className="inline mr-1" />}
        />
        <DateInputField
          label="Data Fine"
          value={endDate}
          onChange={setEndDate}
          disabled={disabled}
          min={startDate}
          accent={currentAccent.date}
          labelIcon={<Calendar size={14} className="inline mr-1" />}
        />
      </div>

      {/* Amount */}
      <div>
        <label htmlFor={amountId} className="block text-sm font-medium text-gray-700 mb-1">
          <Euro size={14} className="inline mr-1" />
          Importo (€) *
        </label>
        <input
          id={amountId}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${currentAccent.input}`}
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor={notesId} className="block text-sm font-medium text-gray-700 mb-1">
          <FileText size={14} className="inline mr-1" />
          Note
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Es: Spesa Meta Ads Gennaio..."
          rows={2}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100 ${currentAccent.input}`}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={disabled}
          className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-2 ${currentAccent.primaryButton}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvataggio...
            </>
          ) : initialData ? (
            "Aggiorna"
          ) : (
            "Aggiungi"
          )}
        </button>
      </div>
    </form>
  );
}
