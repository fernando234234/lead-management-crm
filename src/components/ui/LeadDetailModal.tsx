"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Phone,
  Mail,
  User,
  Building,
  Calendar,
  MessageSquare,
  PhoneCall,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Edit2,
  Bell,
  Megaphone,
} from "lucide-react";
import ActivityTimeline from "./ActivityTimeline";
import TaskModal from "./TaskModal";
import CallOutcomeModal from "./CallOutcomeModal";
import { getPlatformLabel } from "@/lib/platforms";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  // Binary States
  contacted: boolean;
  contactedAt: string | null;
  isTarget: boolean;
  targetNote: string | null;
  enrolled: boolean;
  enrolledAt: string | null;
  
  // Call tracking
  callAttempts?: number;
  firstAttemptAt?: string | null;
  lastAttemptAt?: string | null;
  callOutcome?: string | null;
  outcomeNotes?: string | null;
  
  // Relations
  createdAt: string;
  updatedAt?: string;
  course: { id: string; name: string; price?: number } | null;
  campaign: { 
    id: string; 
    name: string; 
    platform?: string;
    masterCampaign?: { id: string; name: string } | null;
  } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  
  // Status
  status?: string;
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
  accentColor?: string;
}

export default function LeadDetailModal({
  lead,
  onClose,
  onUpdate,
  accentColor = "blue-600",
}: LeadDetailModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [localLead, setLocalLead] = useState(lead);

  // Update local lead when prop changes
  useEffect(() => {
    setLocalLead(lead);
  }, [lead]);

  // Accessibility refs
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalTitleId = `lead-modal-title-${lead.id}`;

  // Focus trap and keyboard handling
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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
  }, [onClose]);

  const fetchActivities = useCallback(async () => {
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
  }, [lead.id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleAddActivity = async (activity: {
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) => {
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

  const handleBooleanChange = async (field: string, value: boolean) => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = { [field]: value };
      
      // Add timestamp for true states
      if (value) {
        if (field === "contacted") updateData.contactedAt = new Date().toISOString();
        if (field === "enrolled") updateData.enrolledAt = new Date().toISOString();
      }
      
      // Prepare activity data
      const fieldLabels: Record<string, string> = {
        contacted: "Contattato",
        isTarget: "Target",
        enrolled: "Iscritto",
      };
      const activityData = {
        type: "STATUS_CHANGE",
        description: `${fieldLabels[field]} cambiato a ${value ? "Sì" : "No"}`,
      };
      
      // Execute both API calls in parallel for better performance
      await Promise.all([
        onUpdate(lead.id, updateData as Partial<Lead>),
        handleAddActivity(activityData),
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle call outcome submission (using proper call tracking system)
  const handleCallOutcomeSubmit = async (data: { callOutcome: string; outcomeNotes: string }) => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    
    const now = new Date().toISOString();
    const newAttempts = (localLead.callAttempts || 0) + 1;
    
    try {
      // Determine if lead should become PERSO
      const shouldBePerso = 
        data.callOutcome === 'NEGATIVO' || 
        (data.callOutcome === 'RICHIAMARE' && newAttempts >= 8);
      
      // Build update data
      const updateData: Partial<Lead> = {
        contacted: true,
        contactedAt: localLead.contactedAt || now,
        callOutcome: data.callOutcome,
        outcomeNotes: data.outcomeNotes || null,
        callAttempts: newAttempts,
        lastAttemptAt: now,
        firstAttemptAt: localLead.firstAttemptAt || now,
      };
      
      if (shouldBePerso) {
        updateData.status = 'PERSO';
      }
      
      // Update local state optimistically
      setLocalLead(prev => ({ ...prev, ...updateData }));
      
      // Log activity
      const outcomeLabels: Record<string, string> = {
        POSITIVO: "Interessato",
        RICHIAMARE: "Da Richiamare", 
        NEGATIVO: "Non Interessato",
      };
      
      await Promise.all([
        onUpdate(lead.id, updateData),
        handleAddActivity({
          type: "CALL",
          description: `Chiamata #${newAttempts}: ${outcomeLabels[data.callOutcome] || data.callOutcome}${data.outcomeNotes ? ` - ${data.outcomeNotes}` : ''}`,
          metadata: { callOutcome: data.callOutcome, attemptNumber: newAttempts },
        }),
      ]);
      
      setShowCallOutcomeModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check if lead can receive calls (not PERSO or enrolled)
  const canLogCall = localLead.status !== 'PERSO' && !localLead.enrolled;
  
  // Build call history from activities
  const callHistory = activities
    .filter(a => a.type === 'CALL' && a.metadata?.callOutcome)
    .map(a => ({
      date: a.createdAt,
      outcome: (a.metadata?.callOutcome as string) || '',
      notes: a.description.split(' - ')[1] || undefined,
    }))
    .reverse();

  const handleCreateTask = async (taskData: {
    title: string;
    description: string | null;
    dueDate: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    leadId: string | null;
  }) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      throw new Error("Failed to create task");
    }

    await handleAddActivity({
      type: "NOTE",
      description: `Promemoria creato: ${taskData.title}`,
    });
  };

  // Boolean display component
  const BooleanStateDisplay = ({
    label,
    value,
    field,
    date,
    note,
  }: {
    label: string;
    value: boolean;
    field: string;
    date?: string | null;
    note?: string | null;
  }) => {
    return (
      <div className="p-3 bg-white rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{label}</span>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => handleBooleanChange(field, true)}
              disabled={isSubmitting}
              className={`p-1.5 rounded-md transition ${
                value
                  ? "bg-green-100 text-green-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Sì"
            >
              <CheckCircle size={16} />
            </button>
            <button
              onClick={() => handleBooleanChange(field, false)}
              disabled={isSubmitting}
              className={`p-1.5 rounded-md transition ${
                !value
                  ? "bg-red-100 text-red-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="No"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {value ? (
            <span className="text-sm font-medium text-green-600 px-2 py-0.5 rounded bg-green-50 flex items-center gap-1">
              <CheckCircle size={14} /> Sì
            </span>
          ) : (
            <span className="text-sm font-medium text-red-600 px-2 py-0.5 rounded bg-red-50 flex items-center gap-1">
              <XCircle size={14} /> No
            </span>
          )}
          {date && value && (
            <span className="text-xs text-gray-400">
              {new Date(date).toLocaleDateString("it-IT")}
            </span>
          )}
        </div>
        {note && (
          <p className="text-xs text-gray-500 mt-1">{note}</p>
        )}
      </div>
    );
  };

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
      <div
        ref={modalRef}
        className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <User size={28} className="text-gray-500" />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-xl font-bold text-gray-900">
                {lead.name}
              </h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                {lead.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    {lead.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Chiudi"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left side - Lead details */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-6">
              {/* Call button - prominent for leads that can be called */}
              {canLogCall && (
                <button
                  onClick={() => setShowCallOutcomeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-commercial text-white hover:opacity-90 transition font-medium"
                  title="Hai chiamato? Registra l'esito"
                >
                  <PhoneCall size={18} />
                  {localLead.callAttempts ? `Ho Chiamato #${(localLead.callAttempts || 0) + 1}` : "Ho Chiamato"}
                </button>
              )}
              {!canLogCall && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed">
                  <PhoneCall size={18} />
                  {localLead.enrolled ? "Lead iscritto" : "Lead perso"}
                </span>
              )}
              <button
                onClick={() => setShowQuickNote(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-gray-700 hover:border-${accentColor} hover:text-${accentColor} transition`}
              >
                <MessageSquare size={18} />
                Nota
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-gray-700 hover:border-${accentColor} hover:text-${accentColor} transition`}
              >
                <Bell size={18} />
                Promemoria
              </button>
            </div>
            
            {/* Call Tracking Summary */}
            {(localLead.callAttempts || 0) > 0 && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Chiamate effettuate
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    (localLead.callAttempts || 0) >= 6 
                      ? 'bg-red-100 text-red-700' 
                      : (localLead.callAttempts || 0) >= 4 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {localLead.callAttempts}/8 tentativi
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      (localLead.callAttempts || 0) >= 6 ? 'bg-red-500' : 
                      (localLead.callAttempts || 0) >= 4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${((localLead.callAttempts || 0) / 8) * 100}%` }}
                  />
                </div>
                {localLead.lastAttemptAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Ultima chiamata: {new Date(localLead.lastAttemptAt).toLocaleDateString('it-IT')}
                    {localLead.callOutcome && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded ${
                        localLead.callOutcome === 'POSITIVO' ? 'bg-green-100 text-green-700' :
                        localLead.callOutcome === 'RICHIAMARE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {localLead.callOutcome === 'POSITIVO' ? 'Interessato' :
                         localLead.callOutcome === 'RICHIAMARE' ? 'Da Richiamare' : 'Non Interessato'}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Quick Note Input */}
            {showQuickNote && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-start gap-2">
                  <FileText size={20} className="text-gray-400 mt-1" />
                  <div className="flex-1">
                    <textarea
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Scrivi una nota..."
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowQuickNote(false);
                          setQuickNote("");
                        }}
                        className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleQuickNoteSubmit}
                        disabled={isSubmitting || !quickNote.trim()}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Salva"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Lead Info Cards */}
            <div className="space-y-4">
              {/* Tri-State Status Cards */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3">
                  Stato Lead
                </h3>
                <div className="space-y-3">
                  <BooleanStateDisplay
                    label="Contattato"
                    value={localLead.contacted}
                    field="contacted"
                    date={localLead.contactedAt}
                    note={null}
                  />
                  <BooleanStateDisplay
                    label="Target (In obiettivo)"
                    value={localLead.isTarget}
                    field="isTarget"
                    date={null}
                    note={localLead.targetNote}
                  />
                  <BooleanStateDisplay
                    label="Iscritto"
                    value={localLead.enrolled}
                    field="enrolled"
                    date={localLead.enrolledAt}
                    note={null}
                  />
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
                      <Megaphone size={18} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400">Campagna</p>
                        <p className="text-sm font-medium">
                          {lead.campaign.masterCampaign?.name || lead.campaign.name}
                        </p>
                        {lead.campaign.platform && (
                          <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                            {getPlatformLabel(lead.campaign.platform)}
                          </span>
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
                        <p className="text-xs text-gray-500">{lead.assignedTo.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Note</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
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
        <div className="flex items-center justify-end p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition rounded-lg"
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
        leads={[{ id: lead.id, name: lead.name, status: localLead.contacted ? "Contattato" : "Nuovo" }]}
        accent={accentColor === "admin" || accentColor === "marketing" || accentColor === "commercial" ? accentColor : "commercial"}
      />
      
      {/* Call Outcome Modal */}
      <CallOutcomeModal
        isOpen={showCallOutcomeModal}
        onClose={() => setShowCallOutcomeModal(false)}
        onSubmit={handleCallOutcomeSubmit}
        leadName={localLead.name}
        callAttempts={localLead.callAttempts || 0}
        lastAttemptAt={localLead.lastAttemptAt || null}
        firstAttemptAt={localLead.firstAttemptAt || null}
        callHistory={callHistory}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
