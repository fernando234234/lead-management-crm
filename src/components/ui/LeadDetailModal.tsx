"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Phone,
  Mail,
  User,
  Building,
  Calendar,
  Target,
  MessageSquare,
  PhoneCall,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  FileText,
  Edit2,
  Bell,
} from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import TaskModal from "./TaskModal";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  contacted: boolean;
  contactedAt: string | null;
  enrolled: boolean;
  enrolledAt: string | null;
  isTarget: boolean;
  notes: string | null;
  callOutcome: string | null;
  outcomeNotes: string | null;
  createdAt: string;
  updatedAt?: string;
  course: { id: string; name: string; price?: number } | null;
  campaign: { id: string; name: string; platform?: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate?: (leadId: string, data: Partial<Lead>) => Promise<void>;
  isDemoMode?: boolean;
  accentColor?: string;
}

const statusColors: Record<string, string> = {
  NUOVO: "bg-blue-100 text-blue-700",
  CONTATTATO: "bg-yellow-100 text-yellow-700",
  IN_TRATTATIVA: "bg-purple-100 text-purple-700",
  ISCRITTO: "bg-green-100 text-green-700",
  PERSO: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

const outcomeLabels: Record<string, string> = {
  POSITIVO: "Positivo",
  NEGATIVO: "Negativo",
  RICHIAMARE: "Da Richiamare",
  NON_RISPONDE: "Non Risponde",
};

export default function LeadDetailModal({
  lead,
  onClose,
  onUpdate,
  isDemoMode = false,
  accentColor = "blue-600",
}: LeadDetailModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Accessibility refs
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalTitleId = `lead-modal-title-${lead.id}`;

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
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Return focus to the previously focused element
      previousActiveElement.current?.focus();
    };
  }, [onClose]);

  const fetchActivities = useCallback(async () => {
    if (isDemoMode) {
      // Mock activities for demo mode
      setActivities([
        {
          id: "demo-1",
          type: "NOTE",
          description: "Prima chiamata effettuata, interessato al corso",
          metadata: null,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          user: { id: "1", name: "Marco Verdi", email: "marco@example.com" },
        },
        {
          id: "demo-2",
          type: "CALL",
          description: "Chiamata di follow-up, richiesta preventivo",
          metadata: { duration: "15", outcome: "Positivo" },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          user: { id: "1", name: "Marco Verdi", email: "marco@example.com" },
        },
        {
          id: "demo-3",
          type: "STATUS_CHANGE",
          description: "Stato cambiato da NUOVO a CONTATTATO",
          metadata: null,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          user: { id: "1", name: "Marco Verdi", email: "marco@example.com" },
        },
      ]);
      setIsLoadingActivities(false);
      return;
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [lead.id, isDemoMode]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleAddActivity = async (activity: {
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (isDemoMode) {
      const newActivity: Activity = {
        id: `demo-${Date.now()}`,
        type: activity.type,
        description: activity.description,
        metadata: activity.metadata || null,
        createdAt: new Date().toISOString(),
        user: { id: "1", name: "Demo User", email: "demo@example.com" },
      };
      setActivities([newActivity, ...activities]);
      return;
    }

    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity),
      });

      if (res.ok) {
        await fetchActivities();
      }
    } catch (error) {
      console.error("Failed to add activity:", error);
    }
  };

  const handleQuickNoteSubmit = async () => {
    if (!quickNote.trim()) return;
    setIsSubmitting(true);
    try {
      await handleAddActivity({
        type: "NOTE",
        description: quickNote.trim(),
      });
      setQuickNote("");
      setShowQuickNote(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    try {
      await onUpdate(lead.id, { status: newStatus });
      await handleAddActivity({
        type: "STATUS_CHANGE",
        description: `Stato cambiato da ${statusLabels[lead.status]} a ${statusLabels[newStatus]}`,
      });
      setShowStatusChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogCall = async () => {
    const outcome = prompt("Esito della chiamata (Positivo, Negativo, Da richiamare, Non risponde):");
    if (!outcome) return;
    
    const notes = prompt("Note sulla chiamata:");
    await handleAddActivity({
      type: "CALL",
      description: notes || `Chiamata registrata - Esito: ${outcome}`,
      metadata: { outcome },
    });

    if (onUpdate && lead.status === "NUOVO") {
      await onUpdate(lead.id, { 
        status: "CONTATTATO",
        contacted: true,
      });
    }
  };

  const handleCreateTask = async (taskData: {
    title: string;
    description: string | null;
    dueDate: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    leadId: string | null;
  }) => {
    if (isDemoMode) {
      // In demo mode, just close the modal
      setShowTaskModal(false);
      return;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      throw new Error("Failed to create task");
    }

    // Log activity for task creation
    await handleAddActivity({
      type: "NOTE",
      description: `Promemoria creato: ${taskData.title}`,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center" aria-hidden="true">
              <User size={28} className="text-gray-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id={modalTitleId} className="text-xl font-bold text-gray-900">{lead.name}</h2>
                {lead.isTarget && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                    <Target size={12} aria-hidden="true" />
                    <span>Target</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                {lead.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} aria-hidden="true" />
                    <span>{lead.email}</span>
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} aria-hidden="true" />
                    <span>{lead.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Chiudi dettagli lead"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left side - Lead details */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Azioni rapide">
              <button
                onClick={() => setShowQuickNote(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-gray-700 hover:border-${accentColor} hover:text-${accentColor} transition focus:outline-none focus:ring-2 focus:ring-${accentColor}`}
                aria-label="Aggiungi nota al lead"
              >
                <MessageSquare size={18} aria-hidden="true" />
                Aggiungi Nota
              </button>
              <button
                onClick={handleLogCall}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-gray-700 hover:border-${accentColor} hover:text-${accentColor} transition focus:outline-none focus:ring-2 focus:ring-${accentColor}`}
                aria-label="Registra una chiamata"
              >
                <PhoneCall size={18} aria-hidden="true" />
                Registra Chiamata
              </button>
              <button
                onClick={() => setShowStatusChange(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-gray-700 hover:border-${accentColor} hover:text-${accentColor} transition focus:outline-none focus:ring-2 focus:ring-${accentColor}`}
                aria-label="Cambia stato del lead"
              >
                <ArrowRight size={18} aria-hidden="true" />
                Cambia Stato
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-gray-700 hover:border-${accentColor} hover:text-${accentColor} transition focus:outline-none focus:ring-2 focus:ring-${accentColor}`}
                aria-label="Crea promemoria per questo lead"
              >
                <Bell size={18} aria-hidden="true" />
                Promemoria
              </button>
            </div>

            {/* Quick Note Input */}
            {showQuickNote && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border" role="region" aria-label="Aggiungi nota">
                <div className="flex items-start gap-2">
                  <FileText size={20} className="text-gray-400 mt-1" aria-hidden="true" />
                  <div className="flex-1">
                    <label htmlFor="quick-note" className="sr-only">Scrivi una nota</label>
                    <textarea
                      id="quick-note"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Scrivi una nota..."
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowQuickNote(false);
                          setQuickNote("");
                        }}
                        className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:underline"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleQuickNoteSubmit}
                        disabled={isSubmitting || !quickNote.trim()}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-busy={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            <span className="sr-only">Salvataggio in corso...</span>
                          </>
                        ) : (
                          "Salva"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Change Dropdown */}
            {showStatusChange && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium mb-2">Cambia stato del lead:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => handleStatusChange(value)}
                      disabled={isSubmitting || value === lead.status}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        value === lead.status
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-80"
                      } ${statusColors[value]}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowStatusChange(false)}
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Annulla
                </button>
              </div>
            )}

            {/* Lead Info Cards */}
            <div className="space-y-4">
              {/* Status & Progress */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Stato e Progressi
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Stato Attuale</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status]}`}
                    >
                      {statusLabels[lead.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Contattato</p>
                    <div className="flex items-center gap-2">
                      {lead.contacted ? (
                        <>
                          <CheckCircle size={18} className="text-green-500" />
                          <span className="text-sm text-green-700">
                            {lead.contactedAt
                              ? new Date(lead.contactedAt).toLocaleDateString("it-IT")
                              : "Si"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock size={18} className="text-gray-400" />
                          <span className="text-sm text-gray-500">Non ancora</span>
                        </>
                      )}
                    </div>
                  </div>
                  {lead.callOutcome && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Esito Chiamata</p>
                      <span className="text-sm font-medium">
                        {outcomeLabels[lead.callOutcome]}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Iscritto</p>
                    <div className="flex items-center gap-2">
                      {lead.enrolled ? (
                        <>
                          <CheckCircle size={18} className="text-green-500" />
                          <span className="text-sm text-green-700">
                            {lead.enrolledAt
                              ? new Date(lead.enrolledAt).toLocaleDateString("it-IT")
                              : "Si"}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">No</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Course & Campaign */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Corso e Campagna
                </h3>
                <div className="space-y-3">
                  {lead.course && (
                    <div className="flex items-start gap-3">
                      <Building size={18} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Corso</p>
                        <p className="text-sm font-medium">{lead.course.name}</p>
                        {lead.course.price && (
                          <p className="text-xs text-gray-500">
                            {new Intl.NumberFormat("it-IT", {
                              style: "currency",
                              currency: "EUR",
                            }).format(lead.course.price)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {lead.campaign && (
                    <div className="flex items-start gap-3">
                      <Target size={18} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Campagna</p>
                        <p className="text-sm font-medium">{lead.campaign.name}</p>
                        {lead.campaign.platform && (
                          <p className="text-xs text-gray-500">
                            {lead.campaign.platform}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {lead.assignedTo && (
                    <div className="flex items-start gap-3">
                      <User size={18} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Assegnato a</p>
                        <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                        <p className="text-xs text-gray-500">
                          {lead.assignedTo.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Note
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {lead.notes}
                  </p>
                </div>
              )}

              {/* Outcome Notes */}
              {lead.outcomeNotes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Note Esito
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {lead.outcomeNotes}
                  </p>
                </div>
              )}

              {/* Dates */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Date</h3>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>
                    Creato il{" "}
                    {new Date(lead.createdAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {lead.updatedAt && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
                    <Edit2 size={16} className="text-gray-400" />
                    <span>
                      Modificato il{" "}
                      {new Date(lead.updatedAt).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Activity Timeline */}
          <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
            <ActivityTimeline
              leadId={lead.id}
              activities={activities}
              onAddActivity={handleAddActivity}
              isLoading={isLoadingActivities}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {isDemoMode && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                Modalita Demo
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-lg"
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleCreateTask}
        preselectedLeadId={lead.id}
        leads={[{ id: lead.id, name: lead.name, status: lead.status }]}
      />
    </div>
  );
}
