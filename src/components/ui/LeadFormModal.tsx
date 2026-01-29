"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Phone,
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  Info,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { getPlatformLabel } from "@/lib/platforms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import CallOutcomeModal from "@/components/ui/CallOutcomeModal";
import EnrolledConfirmModal from "@/components/ui/EnrolledConfirmModal";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  contacted: boolean;
  contactedAt: string | null;
  isTarget: boolean;
  targetNote: string | null;
  enrolled: boolean;
  enrolledAt: string | null;
  createdAt: string;
  course: { id: string; name: string; price?: number } | null;
  campaign: { id: string; name: string; platform?: string; masterCampaign?: { id: string; name: string } | null } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  callAttempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  callOutcome: string | null;
  status: string;
}

interface Course {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  platform?: string;
  course?: { id: string; name: string } | null;
  masterCampaign?: { id: string; name: string } | null;
}

interface Commercial {
  id: string;
  name: string;
  email?: string;
}

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lead?: Lead | null; // If provided, it's edit mode
  courses: Course[];
  campaigns: Campaign[];
  commercials?: Commercial[]; // Only for Admin
  currentUserId?: string; // For commercial auto-assignment
  accentColor?: "admin" | "commercial";
  showAssignment?: boolean; // Admin can assign, commercial cannot
}

export default function LeadFormModal({
  isOpen,
  onClose,
  onSuccess,
  lead,
  courses,
  campaigns,
  commercials = [],
  currentUserId,
  accentColor = "admin",
  showAssignment = false,
}: LeadFormModalProps) {
  const isEditMode = !!lead;
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    campaignId: "",
    assignedToId: "",
    notes: "",
    isTarget: false,
    targetNote: "",
    // These are tracked but managed through guided workflow
    contacted: false,
    callOutcome: "" as string,
    callAttempts: 0,
    enrolled: false,
  });
  
  const [submitting, setSubmitting] = useState(false);
  
  // Call outcome modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callModalTrigger, setCallModalTrigger] = useState<'contattato' | 'target' | 'button' | 'enrolled'>('button');
  
  // Enrolled confirmation modal state
  const [showEnrolledConfirm, setShowEnrolledConfirm] = useState(false);
  
  // Prerequisite confirmation for Iscritto (asks if contacted + positive)
  const [showPrerequisiteConfirm, setShowPrerequisiteConfirm] = useState(false);

  // Initialize form when modal opens or lead changes
  useEffect(() => {
    if (isOpen) {
      if (lead) {
        // Edit mode - populate from lead
        setFormData({
          name: lead.name,
          email: lead.email || "",
          phone: lead.phone || "",
          courseId: lead.course?.id || "",
          campaignId: lead.campaign?.id || "",
          assignedToId: lead.assignedTo?.id || "",
          notes: lead.notes || "",
          isTarget: lead.isTarget,
          targetNote: lead.targetNote || "",
          contacted: lead.contacted,
          callOutcome: lead.callOutcome || "",
          callAttempts: lead.callAttempts || 0,
          enrolled: lead.enrolled,
        });
      } else {
        // Create mode - reset form with defaults
        const defaultCourse = courses[0];
        const courseCampaigns = defaultCourse 
          ? campaigns.filter(c => c.course?.id === defaultCourse.id)
          : [];
        const defaultCampaign = courseCampaigns[0];
        
        setFormData({
          name: "",
          email: "",
          phone: "",
          courseId: defaultCourse?.id || "",
          campaignId: defaultCampaign?.id || "",
          assignedToId: showAssignment ? "" : (currentUserId || ""),
          notes: "",
          isTarget: false,
          targetNote: "",
          contacted: false,
          callOutcome: "",
          callAttempts: 0,
          enrolled: false,
        });
      }
    }
  }, [isOpen, lead, courses, campaigns, currentUserId, showAssignment]);

  // Calculate status based on current form state
  const calculateStatus = (): string => {
    if (formData.enrolled) return "ISCRITTO";
    if (formData.callOutcome === "NEGATIVO") return "PERSO";
    if (formData.callAttempts >= 8 && formData.callOutcome === "RICHIAMARE") return "PERSO";
    if (formData.isTarget || formData.callOutcome === "POSITIVO") return "IN_TRATTATIVA";
    if (formData.contacted) return "CONTATTATO";
    return "NUOVO";
  };

  // Handle course change - update campaign options
  const handleCourseChange = (newCourseId: string) => {
    const courseCampaigns = campaigns.filter(c => c.course?.id === newCourseId);
    const defaultCampaign = courseCampaigns[0];
    setFormData({
      ...formData,
      courseId: newCourseId,
      campaignId: defaultCampaign?.id || "",
    });
  };

  // GUIDED WORKFLOW: Handle "Contattato" toggle
  const handleContactedToggle = () => {
    if (formData.contacted) {
      // Can't unmark as contacted if there are calls logged
      if (formData.callAttempts > 0) {
        toast.error("Non puoi rimuovere 'Contattato' se hai già registrato chiamate");
        return;
      }
      setFormData({ ...formData, contacted: false });
    } else {
      // Guide user to log a call
      setCallModalTrigger('contattato');
      setShowCallModal(true);
    }
  };

  // GUIDED WORKFLOW: Handle "Target" toggle
  const handleTargetToggle = () => {
    if (formData.isTarget) {
      // Simply turn off target
      setFormData({ ...formData, isTarget: false });
    } else {
      // Must have at least one call logged to be target
      if (formData.callAttempts === 0) {
        // Guide user to log a call first
        setCallModalTrigger('target');
        setShowCallModal(true);
      } else {
        setFormData({ ...formData, isTarget: true });
      }
    }
  };

  // GUIDED WORKFLOW: Handle "Iscritto" toggle
  // If prerequisites not met, ask user to confirm they happened
  const handleEnrolledToggle = () => {
    if (formData.enrolled) {
      toast.error("Non puoi rimuovere l'iscrizione da questa schermata");
      return;
    }
    
    // If prerequisites not met, show confirmation asking if they were done
    if (!formData.contacted || formData.callOutcome !== "POSITIVO") {
      setShowPrerequisiteConfirm(true);
      return;
    }
    
    // All prerequisites already met - show enrollment confirmation directly
    setShowEnrolledConfirm(true);
  };
  
  // Handle prerequisite confirmation (user confirms contact + positive outcome happened)
  const handlePrerequisiteConfirm = () => {
    // Set the prerequisites as done
    setFormData({
      ...formData,
      contacted: true,
      callOutcome: "POSITIVO",
      callAttempts: Math.max(formData.callAttempts, 1), // At least 1 call
    });
    setShowPrerequisiteConfirm(false);
    // Now show the enrollment confirmation
    setTimeout(() => setShowEnrolledConfirm(true), 100);
  };

  // Handle call outcome submission
  const handleCallOutcomeSubmit = async (data: { callOutcome: string; outcomeNotes: string }) => {
    const newAttempts = formData.callAttempts + 1;
    const trigger = callModalTrigger;
    
    const updates: Partial<typeof formData> = {
      contacted: true,
      callOutcome: data.callOutcome,
      callAttempts: newAttempts,
    };
    
    // If triggered from target toggle and outcome is positive, also set target
    if (trigger === 'target' && data.callOutcome !== 'NEGATIVO') {
      updates.isTarget = true;
    }
    
    setFormData({ ...formData, ...updates });
    setShowCallModal(false);
    
    // Show feedback and handle enrollment flow
    if (data.callOutcome === 'NEGATIVO') {
      toast.success("Esito registrato - Lead verrà segnato come PERSO");
    } else if (data.callOutcome === 'RICHIAMARE') {
      toast.success(`Chiamata #${newAttempts} registrata - Da richiamare`);
      if (trigger === 'enrolled') {
        toast("Per iscrivere il lead, l'esito deve essere 'Interessato'", { icon: 'ℹ️' });
      }
    } else {
      // POSITIVO outcome
      if (trigger === 'enrolled') {
        // Continue to enrollment confirmation
        toast.success("Contatto confermato! Ora conferma l'iscrizione...");
        setTimeout(() => setShowEnrolledConfirm(true), 300);
      } else if (trigger === 'target') {
        toast.success("Chiamata registrata - Lead segnato come Target e Interessato! 🎯");
      } else {
        toast.success("Chiamata registrata - Lead interessato! ✅");
      }
    }
  };

  // Handle enrolled confirmation
  const handleEnrolledConfirm = () => {
    setFormData({ ...formData, enrolled: true });
    setShowEnrolledConfirm(false);
    toast.success("Lead verrà segnato come iscritto! 🎉");
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }
    if (!formData.courseId) {
      toast.error("Seleziona un corso");
      return;
    }
    if (!formData.campaignId) {
      toast.error("Seleziona una campagna");
      return;
    }
    
    setSubmitting(true);
    const now = new Date().toISOString();
    
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        courseId: formData.courseId,
        campaignId: formData.campaignId,
        notes: formData.notes || null,
        isTarget: formData.isTarget,
        targetNote: formData.targetNote || null,
        contacted: formData.contacted,
        contactedAt: formData.contacted ? (lead?.contactedAt || now) : null,
        callOutcome: formData.callOutcome || null,
        callAttempts: formData.callAttempts,
        enrolled: formData.enrolled,
        enrolledAt: formData.enrolled ? (lead?.enrolledAt || now) : null,
      };
      
      // Add assignment for Admin or auto-assign for Commercial
      if (showAssignment) {
        payload.assignedToId = formData.assignedToId || null;
      } else if (!isEditMode && currentUserId) {
        payload.assignedToId = currentUserId;
        payload.createdById = currentUserId;
      }
      
      // Add source for new leads
      if (!isEditMode) {
        payload.source = "MANUAL";
      }
      
      const url = isEditMode ? `/api/leads/${lead.id}` : "/api/leads";
      const method = isEditMode ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nel salvataggio");
      }
      
      toast.success(isEditMode ? "Lead aggiornato con successo" : "Lead creato con successo!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save lead:", error);
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio del lead");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentStatus = calculateStatus();
  const accentClasses = accentColor === "admin" 
    ? "focus:ring-admin focus:border-admin" 
    : "focus:ring-commercial focus:border-commercial";
  const buttonClasses = accentColor === "admin"
    ? "bg-admin text-white hover:opacity-90"
    : "bg-commercial text-white hover:opacity-90";

  // Get campaigns for selected course
  const courseCampaigns = campaigns.filter(c => c.course?.id === formData.courseId);
  
  // Group campaigns by master campaign
  const groupedCampaigns = new Map<string, Campaign[]>();
  courseCampaigns.forEach(c => {
    const groupName = c.masterCampaign?.name || c.name;
    if (!groupedCampaigns.has(groupName)) groupedCampaigns.set(groupName, []);
    groupedCampaigns.get(groupName)!.push(c);
  });

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
      >
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 id="lead-form-title" className="text-xl font-bold">
              {isEditMode ? "Modifica Lead" : "Nuovo Lead"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Chiudi"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome e cognome del lead"
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@esempio.com"
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                />
              </div>
            </div>

            {/* Course & Campaign */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corso <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                >
                  <option value="">Seleziona un corso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campagna <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                  disabled={!formData.courseId}
                >
                  <option value="">{formData.courseId ? "Seleziona campagna" : "Prima seleziona un corso"}</option>
                  {Array.from(groupedCampaigns.entries()).map(([groupName, groupCampaigns]) => (
                    groupCampaigns.length > 1 ? (
                      <optgroup key={groupName} label={groupName}>
                        {groupCampaigns.map(c => (
                          <option key={c.id} value={c.id}>
                            {getPlatformLabel(c.platform)}
                          </option>
                        ))}
                      </optgroup>
                    ) : (
                      <option key={groupCampaigns[0].id} value={groupCampaigns[0].id}>
                        {groupName} ({getPlatformLabel(groupCampaigns[0].platform)})
                      </option>
                    )
                  ))}
                </select>
                {formData.courseId && courseCampaigns.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nessuna campagna per questo corso.
                  </p>
                )}
              </div>
            </div>

            {/* Assignment (Admin only) */}
            {showAssignment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assegna a Commerciale
                </label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                >
                  <option value="">Non assegnato</option>
                  {commercials.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Section - Guided Workflow */}
            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    Stato del Lead
                    <Info size={14} className="text-gray-400" />
                  </h3>
                  <p className="text-xs text-gray-500">Lo stato viene calcolato automaticamente in base alle azioni</p>
                </div>
                <StatusBadge 
                  status={currentStatus as "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO"}
                  callAttempts={formData.callAttempts}
                  callOutcome={formData.callOutcome as "POSITIVO" | "RICHIAMARE" | "NEGATIVO" | null}
                  contacted={formData.contacted}
                  enrolled={formData.enrolled}
                />
              </div>

              {/* Call Tracking */}
              {currentStatus !== "PERSO" && currentStatus !== "ISCRITTO" && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      formData.callAttempts > 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Phone size={20} className={formData.callAttempts > 0 ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Chiamate</p>
                      <p className="text-xs text-gray-500">
                        {formData.callAttempts === 0 
                          ? "Nessuna chiamata registrata" 
                          : `${formData.callAttempts}/8 tentativi`}
                        {formData.callOutcome && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                            formData.callOutcome === 'POSITIVO' ? 'bg-green-100 text-green-700' :
                            formData.callOutcome === 'RICHIAMARE' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {formData.callOutcome === 'POSITIVO' ? 'Interessato' :
                             formData.callOutcome === 'RICHIAMARE' ? 'Da richiamare' : 'Non interess.'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCallModalTrigger('button');
                      setShowCallModal(true);
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${buttonClasses}`}
                  >
                    {formData.callAttempts === 0 ? 'Registra Chiamata' : `Esito #${formData.callAttempts + 1}`}
                  </button>
                </div>
              )}

              {/* Status Actions Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Contattato */}
                <button
                  type="button"
                  onClick={handleContactedToggle}
                  disabled={currentStatus === "PERSO"}
                  className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                    formData.contacted 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${currentStatus === "PERSO" ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {formData.contacted ? (
                    <CheckCircle size={24} className="text-green-500" />
                  ) : (
                    <Clock size={24} className="text-gray-400" />
                  )}
                  <span className="text-xs font-medium">Contattato</span>
                  {!formData.contacted && formData.callAttempts === 0 && (
                    <span className="text-[10px] text-gray-400">Registra chiamata</span>
                  )}
                </button>

                {/* Target */}
                <button
                  type="button"
                  onClick={handleTargetToggle}
                  disabled={currentStatus === "PERSO"}
                  className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                    formData.isTarget 
                      ? 'border-yellow-500 bg-yellow-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${currentStatus === "PERSO" ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Target size={24} className={formData.isTarget ? 'text-yellow-500' : 'text-gray-400'} />
                  <span className="text-xs font-medium">Target</span>
                  {!formData.isTarget && formData.callAttempts === 0 && (
                    <span className="text-[10px] text-gray-400">Richiede contatto</span>
                  )}
                </button>

                {/* Iscritto */}
                <button
                  type="button"
                  onClick={handleEnrolledToggle}
                  disabled={currentStatus === "PERSO"}
                  className={`p-3 rounded-lg border-2 transition flex flex-col items-center gap-1 ${
                    formData.enrolled 
                      ? 'border-green-500 bg-green-50 cursor-default' 
                      : currentStatus === "PERSO"
                        ? 'border-gray-200 opacity-50 cursor-not-allowed'
                        : formData.callOutcome === 'POSITIVO'
                          ? 'border-gray-200 hover:border-green-300 hover:bg-green-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <CheckCircle size={24} className={
                    formData.enrolled 
                      ? 'text-green-500' 
                      : formData.callOutcome === 'POSITIVO'
                        ? 'text-green-400'
                        : 'text-gray-400'
                  } />
                  <span className="text-xs font-medium">Iscritto</span>
                  {!formData.enrolled && formData.callOutcome !== 'POSITIVO' && (
                    <span className="text-[10px] text-gray-400">Richiede "Interessato"</span>
                  )}
                  {!formData.enrolled && formData.callOutcome === 'POSITIVO' && (
                    <span className="text-[10px] text-green-600">Pronto!</span>
                  )}
                </button>
              </div>

              {/* Hint for current state */}
              {currentStatus === "NUOVO" && (
                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span>Per avanzare il lead, registra una chiamata cliccando su "Registra Chiamata" o su uno dei pulsanti sopra.</span>
                </div>
              )}
              {currentStatus === "CONTATTATO" && formData.callOutcome === "RICHIAMARE" && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>Lead da richiamare. Registra una nuova chiamata quando lo ricontatti.</span>
                </div>
              )}
              {formData.callOutcome === "POSITIVO" && !formData.enrolled && (
                <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg text-xs text-green-700">
                  <CheckCircle size={14} className="mt-0.5 shrink-0" />
                  <span>Lead interessato! Quando firma il contratto, clicca su "Iscritto" per completare.</span>
                </div>
              )}
            </div>

            {/* Target Note (only when target is set) */}
            {formData.isTarget && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Target
                </label>
                <input
                  type="text"
                  value={formData.targetNote}
                  onChange={(e) => setFormData({ ...formData, targetNote: e.target.value })}
                  placeholder="Perché è un target prioritario..."
                  className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Generali
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Note aggiuntive sul lead..."
                className={`w-full px-3 py-2 border rounded-lg ${accentClasses}`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.name || !formData.campaignId}
                className={`flex-1 px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${buttonClasses}`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditMode ? "Salvataggio..." : "Creazione..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? <CheckCircle size={18} /> : <Plus size={18} />}
                    {isEditMode ? "Salva Modifiche" : "Crea Lead"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Call Outcome Modal */}
      <CallOutcomeModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSubmit={handleCallOutcomeSubmit}
        leadName={formData.name || "Nuovo Lead"}
        callAttempts={formData.callAttempts}
        lastAttemptAt={lead?.lastAttemptAt || null}
        firstAttemptAt={lead?.firstAttemptAt || null}
        callHistory={[]}
        isSubmitting={false}
        trigger={callModalTrigger}
      />

      {/* Enrolled Confirmation Modal */}
      <EnrolledConfirmModal
        isOpen={showEnrolledConfirm}
        onClose={() => setShowEnrolledConfirm(false)}
        onConfirm={handleEnrolledConfirm}
        leadName={formData.name || "Nuovo Lead"}
        courseName={courses.find(c => c.id === formData.courseId)?.name || "N/A"}
      />

      {/* Prerequisite Confirmation Modal - Asks if contact + positive outcome happened */}
      {showPrerequisiteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-100">
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle size={20} />
                Conferma per Iscrizione
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-gray-700">
                Per iscrivere <strong>{formData.name || "questo lead"}</strong>, confermi che:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone size={12} className="text-green-600" />
                  </div>
                  <span>Hai contattato il lead</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={12} className="text-green-600" />
                  </div>
                  <span>Il lead è <strong>interessato</strong> (esito positivo)</span>
                </li>
              </ul>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrerequisiteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handlePrerequisiteConfirm}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Sì, Confermo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
