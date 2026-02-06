"use client";

import { useState, useEffect, useId } from "react";
import {
  X,
  Calendar,
  Flag,
  FileText,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateInputField } from "@/components/ui/DateInputField";
import { formatDateForInput } from "@/lib/date";

interface Lead {
  id: string;
  name: string;
  status: string;
}

interface Task {
  id?: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  leadId: string | null;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, "id">) => Promise<void>;
  task?: Task | null;
  leads?: Lead[];
  preselectedLeadId?: string | null;
  accent?: "admin" | "commercial" | "marketing";
}

const priorityOptions = [
  { value: "HIGH", label: "Alta", color: "text-red-500 bg-red-50 border-red-200" },
  { value: "MEDIUM", label: "Media", color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
  { value: "LOW", label: "Bassa", color: "text-green-500 bg-green-50 border-green-200" },
];

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  task,
  leads = [],
  preselectedLeadId,
  accent = "commercial",
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dueDateId = useId();
  const leadIdField = useId();

  const accentStyles = {
    admin: {
      input: "focus:ring-admin focus:border-admin",
      primaryButton: "bg-admin hover:bg-admin/90",
    },
    commercial: {
      input: "focus:ring-commercial focus:border-commercial",
      primaryButton: "bg-commercial hover:bg-commercial/90",
    },
    marketing: {
      input: "focus:ring-marketing focus:border-marketing",
      primaryButton: "bg-marketing hover:bg-marketing/90",
    },
  };

  const currentAccent = accentStyles[accent];

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || "");
        setDueDate(task.dueDate.split("T")[0]);
        setPriority(task.priority);
        setLeadId(task.leadId);
      } else {
        setTitle("");
        setDescription("");
        // Default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDueDate(formatDateForInput(tomorrow));
        setPriority("MEDIUM");
        setLeadId(preselectedLeadId || null);
      }
      setError(null);
    }
  }, [isOpen, task, preselectedLeadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("Il titolo e obbligatorio");
      return;
    }
    
    if (!dueDate) {
      setError("La data di scadenza e obbligatoria");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`).toISOString(),
        priority,
        leadId,
      });
      onClose();
    } catch (err) {
      setError("Errore nel salvataggio. Riprova.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? "Modifica Promemoria" : "Nuovo Promemoria"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Chiudi modal promemoria"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor={titleId} className="block text-sm font-medium text-gray-700 mb-1">
              <FileText size={14} className="inline mr-1" />
              Titolo *
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Richiamare per preventivo"
              className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2", currentAccent.input)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor={descriptionId} className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dettagli aggiuntivi..."
              rows={3}
              className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2", currentAccent.input)}
            />
          </div>

          {/* Due Date */}
          <DateInputField
            id={dueDateId}
            label="Data Scadenza *"
            value={dueDate}
            onChange={setDueDate}
            required
            accent={accent}
            labelIcon={<Calendar size={14} className="inline mr-1" />}
          />

          {/* Priority */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              <Flag size={14} className="inline mr-1" />
              Priorita
            </p>
            <div className="flex gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value as "HIGH" | "MEDIUM" | "LOW")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition",
                    priority === option.value
                      ? option.color
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Selection */}
          <div>
            <label htmlFor={leadIdField} className="block text-sm font-medium text-gray-700 mb-1">
              <User size={14} className="inline mr-1" />
              Lead Collegato
            </label>
            <select
              id={leadIdField}
              value={leadId || ""}
              onChange={(e) => setLeadId(e.target.value || null)}
              className={cn("w-full px-3 py-2 border rounded-lg focus:ring-2", currentAccent.input)}
            >
              <option value="">Nessun lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 transition flex items-center justify-center gap-2",
                currentAccent.primaryButton
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
