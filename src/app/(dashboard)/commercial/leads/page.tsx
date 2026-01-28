"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Pencil,
  Phone,
  PhoneCall,
  Mail,
  User,
  Search,
  X,
  Eye,
  Inbox,
  Plus,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import LeadDetailModal from "@/components/ui/LeadDetailModal";
import EmptyState from "@/components/ui/EmptyState";
import ExportButton from "@/components/ui/ExportButton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import CallOutcomeModal from "@/components/ui/CallOutcomeModal";
import EnrolledConfirmModal from "@/components/ui/EnrolledConfirmModal";
import LeadActionWizard from "@/components/ui/LeadActionWizard";
import { Tooltip } from "@/components/ui/Tooltip";

// Boolean display helpers
const booleanConfig = {
  true: { label: "Sì", color: "bg-green-100 text-green-700", icon: CheckCircle },
  false: { label: "No", color: "bg-red-100 text-red-700", icon: XCircle },
};

// Export columns configuration for commercial leads
const leadExportColumns = [
  { key: "name", label: "Nome" },
  { key: "course.name", label: "Corso" },
  { key: "campaign.name", label: "Campagna" },
  { key: "contacted", label: "Contattato" },
  { key: "contactedAt", label: "Data Contatto" },
  { key: "isTarget", label: "Target" },
  { key: "enrolled", label: "Iscritto" },
  { key: "enrolledAt", label: "Data Iscrizione" },
  { key: "createdAt", label: "Data Creazione" },
];

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
  campaign: { id: string; name: string; platform?: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  // Call tracking fields
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
  platform: string;
  course: { id: string; name: string };
}

export default function CommercialLeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);

  // Enrolled confirmation modal
  const [showEnrolledConfirm, setShowEnrolledConfirm] = useState(false);
  const [pendingEnrolledLead, setPendingEnrolledLead] = useState<string | null>(null);
  const [showEditEnrolledConfirm, setShowEditEnrolledConfirm] = useState(false);

  // Call outcome modal
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(false);
  const [pendingContactedLead, setPendingContactedLead] = useState<Lead | null>(null);
  // Track what triggered the call modal: 'button' | 'contattato' | 'target'
  const [callModalTrigger, setCallModalTrigger] = useState<'button' | 'contattato' | 'target'>('button');

  // Help modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterContattato, setFilterContattato] = useState<string>("");
  const [filterTarget, setFilterTarget] = useState<string>("");
  const [filterIscritto, setFilterIscritto] = useState<string>("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("active"); // Default: hide PERSO

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Create lead form
  const [createFormData, setCreateFormData] = useState({
    name: "",
    courseId: "",
    campaignId: "",
    notes: "",
    contacted: false,
    isTarget: false,
    enrolled: false,
  });

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    name: "",
    notes: "",
    contacted: false,
    isTarget: false,
    targetNote: "",
    enrolled: false,
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, coursesRes, campaignsRes] = await Promise.all([
        fetch("/api/leads?assignedToMe=true"),
        fetch("/api/courses"),
        fetch("/api/campaigns?status=ACTIVE"),
      ]);

      const [leadsData, coursesData, campaignsData] = await Promise.all([
        leadsRes.json(),
        coursesRes.json(),
        campaignsRes.json(),
      ]);

      // Filter leads assigned to current user OR created by current user
      const myLeads = leadsData.filter(
        (lead: Lead & { createdBy?: { id: string } }) =>
          lead.assignedTo?.id === session?.user?.id ||
          lead.createdBy?.id === session?.user?.id
      );
      setLeads(myLeads);
      setCourses(coursesData);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  // Lightweight fetch that only reloads leads (not courses/campaigns)
  const fetchLeadsOnly = async () => {
    try {
      const leadsRes = await fetch("/api/leads?assignedToMe=true");
      const leadsData = await leadsRes.json();
      const myLeads = leadsData.filter(
        (lead: Lead & { createdBy?: { id: string } }) =>
          lead.assignedTo?.id === session?.user?.id ||
          lead.createdBy?.id === session?.user?.id
      );
      setLeads(myLeads);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (
      search &&
      !lead.name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (filterContattato !== "" && lead.contacted !== (filterContattato === "true")) return false;
    if (filterTarget !== "" && lead.isTarget !== (filterTarget === "true")) return false;
    if (filterIscritto !== "" && lead.enrolled !== (filterIscritto === "true")) return false;
    if (filterCourse && lead.course?.id !== filterCourse) return false;
    // Status filter: "active" hides PERSO, "perso" shows only PERSO, "" shows all
    if (filterStatus === "active" && lead.status === "PERSO") return false;
    if (filterStatus === "perso" && lead.status !== "PERSO") return false;
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterContattato, filterTarget, filterIscritto, filterCourse, filterStatus]);

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setEditFormData({
      name: lead.name,
      notes: lead.notes || "",
      contacted: lead.contacted,
      isTarget: lead.isTarget,
      targetNote: lead.targetNote || "",
      enrolled: lead.enrolled,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    // If enrolled is being changed from false to true, show confirmation
    if (!editingLead.enrolled && editFormData.enrolled) {
      setShowEditEnrolledConfirm(true);
      return;
    }

    await performEditSubmit();
  };

  const performEditSubmit = async () => {
    if (!editingLead) return;

    // Optimistic update
    const previousLeads = [...leads];
    const now = new Date().toISOString();
    
    const updateData: Partial<Lead> = {
      name: editFormData.name,
      notes: editFormData.notes || null,
      contacted: editFormData.contacted,
      isTarget: editFormData.isTarget,
      targetNote: editFormData.targetNote || null,
      enrolled: editFormData.enrolled,
    };
    
    // Add enrolledAt timestamp if enrolling
    if (editFormData.enrolled && !editingLead.enrolled) {
      updateData.enrolledAt = now;
    }
    
    setLeads(prev => prev.map(lead => 
      lead.id === editingLead.id ? { ...lead, ...updateData } : lead
    ));

    try {
      const apiData: Record<string, unknown> = { ...updateData };
      if (editFormData.enrolled && !editingLead.enrolled) {
        apiData.enrolledAt = now;
      }

      const response = await fetch(`/api/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) throw new Error("Failed to update lead");
      
      toast.success("Lead aggiornato con successo");
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update lead:", error);
      // Rollback on error
      setLeads(previousLeads);
      toast.error("Errore nell'aggiornamento del lead");
    }
  };

  const handleEditEnrolledConfirm = async () => {
    setShowEditEnrolledConfirm(false);
    await performEditSubmit();
  };

  const handleEditEnrolledCancel = () => {
    setShowEditEnrolledConfirm(false);
    setEditFormData({ ...editFormData, enrolled: false });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }
    if (!createFormData.courseId) {
      toast.error("Seleziona un corso");
      return;
    }
    if (!createFormData.campaignId) {
      toast.error("Seleziona una campagna");
      return;
    }

    setCreating(true);
    const now = new Date().toISOString();
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createFormData.name,
          courseId: createFormData.courseId,
          campaignId: createFormData.campaignId,
          assignedToId: session?.user?.id,
          createdById: session?.user?.id,
          notes: createFormData.notes || null,
          source: "MANUAL",
          contacted: createFormData.contacted,
          contactedAt: createFormData.contacted ? now : null,
          isTarget: createFormData.isTarget,
          enrolled: createFormData.enrolled,
          enrolledAt: createFormData.enrolled ? now : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create lead");
      }

      setShowCreateModal(false);
      setCreateFormData({ name: "", courseId: "", campaignId: "", notes: "", contacted: false, isTarget: false, enrolled: false });
      toast.success("Lead creato con successo!");
      // Use lightweight fetch - only reload leads, not courses/campaigns
      fetchLeadsOnly();
    } catch (error) {
      console.error("Failed to create lead:", error);
      toast.error(error instanceof Error ? error.message : "Errore nella creazione del lead");
    } finally {
      setCreating(false);
    }
  };

  // Quick state update - with guided flow for prerequisites
  const handleQuickStateUpdate = async (leadId: string, field: string, value: boolean) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    // RULE 1: Contattato ON requires at least 1 call logged
    // Instead of error, open the call modal to guide them
    if (field === "contacted" && value === true) {
      if (lead.callAttempts === 0) {
        // Guide them: "You say you contacted them? Let's log that call!"
        setPendingContactedLead(lead);
        setCallModalTrigger('contattato');
        setShowCallOutcomeModal(true);
        return;
      }
    }
    
    // RULE 2: Target ON requires at least 1 call logged
    // Instead of error, open the call modal to guide them
    if (field === "isTarget" && value === true) {
      if (lead.callAttempts === 0) {
        // Guide them: "You want to mark as target? Let's confirm the contact first!"
        setPendingContactedLead(lead);
        setCallModalTrigger('target');
        setShowCallOutcomeModal(true);
        return;
      }
    }
    
    // RULE 3: Iscritto requires Contattato=true AND callOutcome=POSITIVO
    if (field === "enrolled" && value === true) {
      if (!lead.contacted || lead.callOutcome !== 'POSITIVO') {
        // Show helpful message about what's missing
        if (!lead.contacted) {
          toast.error("Per iscrivere questo lead, devi prima contattarlo e registrare un esito 'Interessato'", {
            duration: 4000,
            icon: '📞'
          });
        } else {
          toast.error("Solo i lead con esito 'Interessato' possono essere iscritti", {
            duration: 4000,
            icon: '⚠️'
          });
        }
        return;
      }
      // Show confirmation modal
      setPendingEnrolledLead(leadId);
      setShowEnrolledConfirm(true);
      return;
    }

    await performStateUpdate(leadId, field, value);
  };

  // Open call modal for logging calls
  const handleLogCall = (lead: Lead) => {
    // Don't allow logging calls for PERSO or enrolled leads
    if (lead.status === 'PERSO') {
      toast.error("Questo lead è già PERSO");
      return;
    }
    if (lead.enrolled) {
      toast.error("Questo lead è già iscritto");
      return;
    }
    setPendingContactedLead(lead);
    setCallModalTrigger('button');
    setShowCallOutcomeModal(true);
  };

  // Perform the actual state update with optimistic UI
  const performStateUpdate = async (leadId: string, field: string, value: boolean) => {
    // Optimistic update - immediately update local state
    const previousLeads = [...leads];
    const now = new Date().toISOString();
    
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const updateData: Partial<Lead> = { [field]: value } as Partial<Lead>;
        if (value) {
          if (field === "contacted") updateData.contactedAt = now;
          if (field === "enrolled") updateData.enrolledAt = now;
        }
        return { ...lead, ...updateData };
      }
      return lead;
    }));
    
    // Also update detailLead if it's the same lead
    if (detailLead?.id === leadId) {
      const updateData: Partial<Lead> = { [field]: value } as Partial<Lead>;
      if (value) {
        if (field === "contacted") updateData.contactedAt = now;
        if (field === "enrolled") updateData.enrolledAt = now;
      }
      setDetailLead(prev => prev ? { ...prev, ...updateData } : null);
    }

    try {
      const updateData: Record<string, unknown> = { [field]: value };
      
      // Add timestamp for true states
      if (value) {
        if (field === "contacted") updateData.contactedAt = now;
        if (field === "enrolled") updateData.enrolledAt = now;
      }

      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) throw new Error("Failed to update");
      
      if (field === "enrolled" && value) {
        toast.success("Lead segnato come iscritto!");
      }
    } catch (error) {
      console.error("Failed to update lead state:", error);
      // Rollback on error
      setLeads(previousLeads);
      if (detailLead?.id === leadId) {
        setDetailLead(previousLeads.find(l => l.id === leadId) || null);
      }
      toast.error("Errore nell'aggiornamento");
    }
  };

  // Handle enrolled confirmation
  const handleEnrolledConfirm = async () => {
    if (pendingEnrolledLead) {
      await performStateUpdate(pendingEnrolledLead, "enrolled", true);
    }
    setShowEnrolledConfirm(false);
    setPendingEnrolledLead(null);
  };

  const handleEnrolledCancel = () => {
    setShowEnrolledConfirm(false);
    setPendingEnrolledLead(null);
  };

  // Handle call outcome submission with optimistic update
  const handleCallOutcomeSubmit = async (data: { callOutcome: string; outcomeNotes: string }) => {
    if (!pendingContactedLead) return;

    const leadId = pendingContactedLead.id;
    const previousLeads = [...leads];
    const now = new Date().toISOString();
    const newAttempts = (pendingContactedLead.callAttempts || 0) + 1;
    const trigger = callModalTrigger; // Save before resetting
    
    // Optimistic update
    const optimisticUpdate: Partial<Lead> = {
      contacted: true,
      contactedAt: pendingContactedLead.contactedAt || now,
      callOutcome: data.callOutcome,
      callAttempts: newAttempts,
      lastAttemptAt: now,
      firstAttemptAt: pendingContactedLead.firstAttemptAt || now,
    };
    
    // If triggered from Target toggle, also set isTarget (unless going PERSO)
    const shouldSetTarget = trigger === 'target' && data.callOutcome !== 'NEGATIVO' && 
      !(data.callOutcome === 'RICHIAMARE' && newAttempts >= 8);
    if (shouldSetTarget) {
      optimisticUpdate.isTarget = true;
    }
    
    // Mark as PERSO if NEGATIVO or 8 attempts with RICHIAMARE
    if (data.callOutcome === 'NEGATIVO' || 
        (data.callOutcome === 'RICHIAMARE' && newAttempts >= 8)) {
      optimisticUpdate.status = 'PERSO';
    }
    
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, ...optimisticUpdate } : lead
    ));

    try {
      const apiPayload: Record<string, unknown> = {
        contacted: true,
        contactedAt: pendingContactedLead.contactedAt || now,
        callOutcome: data.callOutcome,
        outcomeNotes: data.outcomeNotes || null,
        callAttempts: newAttempts,
        lastAttemptAt: now,
        firstAttemptAt: pendingContactedLead.firstAttemptAt || now,
      };
      
      if (shouldSetTarget) {
        apiPayload.isTarget = true;
      }
      if (optimisticUpdate.status) {
        apiPayload.status = optimisticUpdate.status;
      }
      
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });
      
      // Show appropriate message based on outcome and trigger
      if (data.callOutcome === 'NEGATIVO') {
        toast.success("Lead segnato come PERSO (non interessato)");
      } else if (data.callOutcome === 'RICHIAMARE') {
        if (newAttempts >= 8) {
          toast.success("Lead segnato come PERSO (8 tentativi raggiunti)");
        } else {
          toast.success(`Chiamata #${newAttempts} registrata - ${8 - newAttempts} tentativi rimanenti`);
        }
      } else {
        // POSITIVO
        if (trigger === 'target') {
          toast.success("Chiamata registrata - Lead segnato come Target e Interessato! 🎯");
        } else if (trigger === 'contattato') {
          toast.success("Chiamata registrata - Lead interessato! ✅");
        } else {
          toast.success("Lead interessato!");
        }
      }
    } catch (error) {
      console.error("Failed to log call outcome:", error);
      // Rollback on error
      setLeads(previousLeads);
      toast.error("Errore nel salvataggio");
    }
    
    setShowCallOutcomeModal(false);
    setPendingContactedLead(null);
    setCallModalTrigger('button');
  };

  const handleCallOutcomeCancel = () => {
    setShowCallOutcomeModal(false);
    setPendingContactedLead(null);
    setCallModalTrigger('button');
  };

  const handleLeadUpdate = async (leadId: string, data: Partial<Lead>) => {
    // Optimistic update
    const previousLeads = [...leads];
    const previousDetailLead = detailLead;
    
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, ...data } : lead
    ));
    
    if (detailLead?.id === leadId) {
      setDetailLead(prev => prev ? { ...prev, ...data } : null);
    }

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error("Failed to update");
    } catch (error) {
      console.error("Failed to update lead:", error);
      // Rollback on error
      setLeads(previousLeads);
      setDetailLead(previousDetailLead);
      toast.error("Errore nell'aggiornamento");
    }
  };

  // Boolean Toggle Component
  const BooleanToggle = ({
    value,
    onChange,
    label,
    compact = false,
    disabled = false,
  }: {
    value: boolean;
    onChange: (value: boolean) => void;
    label?: string;
    compact?: boolean;
    disabled?: boolean;
  }) => {
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            value ? "bg-green-600" : "bg-gray-200"
          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <button
          type="button"
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            value ? "bg-green-600" : "bg-gray-200"
          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">I Miei Lead</h1>
          <p className="text-gray-500">{filteredLeads.length} lead</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={filteredLeads}
            columns={leadExportColumns}
            filename="i_miei_lead_export"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            <Plus size={18} />
            Nuovo Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Cerca per nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
              />
            </div>
          </div>
          <select
            value={filterContattato}
            onChange={(e) => setFilterContattato(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="">Contattato: Tutti</option>
            <option value="true">Contattato: Sì</option>
            <option value="false">Contattato: No</option>
          </select>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="">Target: Tutti</option>
            <option value="true">Target: Sì</option>
            <option value="false">Target: No</option>
          </select>
          <select
            value={filterIscritto}
            onChange={(e) => setFilterIscritto(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="">Iscritto: Tutti</option>
            <option value="true">Iscritto: Sì</option>
            <option value="false">Iscritto: No</option>
          </select>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="">Tutti i corsi</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="active">Attivi (no PERSO)</option>
            <option value="">Tutti</option>
            <option value="perso">Solo PERSO</option>
          </select>
          {(search || filterContattato || filterTarget || filterIscritto || filterCourse || filterStatus !== "active") && (
            <button
              onClick={() => {
                setSearch("");
                setFilterContattato("");
                setFilterTarget("");
                setFilterIscritto("");
                setFilterCourse("");
                setFilterStatus("active");
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={18} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Corso</th>
                <th className="text-center">
                  <Tooltip content="Tracciamento chiamate: registra esiti e monitora tentativi (max 8)" position="bottom">
                    <span className="cursor-help flex items-center justify-center gap-1">
                      Chiamate
                      <HelpCircle size={14} className="text-gray-400" />
                    </span>
                  </Tooltip>
                </th>
                <th className="text-center">
                  <Tooltip content="Hai parlato con questa persona? Semplice sì/no" position="bottom">
                    <span className="cursor-help flex items-center justify-center gap-1">
                      Contattato
                      <HelpCircle size={14} className="text-gray-400" />
                    </span>
                  </Tooltip>
                </th>
                <th className="text-center">
                  <Tooltip content="Lead prioritario da seguire con attenzione" position="bottom">
                    <span className="cursor-help flex items-center justify-center gap-1">
                      Target
                      <HelpCircle size={14} className="text-gray-400" />
                    </span>
                  </Tooltip>
                </th>
                <th className="text-center">
                  <Tooltip content="Il lead ha firmato un contratto e si è iscritto" position="bottom">
                    <span className="cursor-help flex items-center justify-center gap-1">
                      Iscritto
                      <HelpCircle size={14} className="text-gray-400" />
                    </span>
                  </Tooltip>
                </th>
                <th>Data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead, index) => (
                <tr key={lead.id} className={index % 2 === 0 ? "" : "bg-gray-50/30"}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
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
                  </td>
                  <td className="p-4">
                    <span className="text-sm">{lead.course?.name || "-"}</span>
                  </td>
                  {/* Chiamate column - call tracking with visible button */}
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1">
                      {lead.status === 'PERSO' ? (
                        <Tooltip content="Lead perso - non più attivo" position="top">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 cursor-help">
                            PERSO
                          </span>
                        </Tooltip>
                      ) : lead.enrolled ? (
                        <Tooltip content="Lead iscritto al corso!" position="top">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 cursor-help">
                            ISCRITTO
                          </span>
                        </Tooltip>
                      ) : (
                        <>
                          {/* Warning for leads approaching auto-PERSO */}
                          {(() => {
                            const daysSinceLastAttempt = lead.lastAttemptAt 
                              ? Math.floor((Date.now() - new Date(lead.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24))
                              : null;
                            const daysUntilAutoPerso = daysSinceLastAttempt !== null ? 15 - daysSinceLastAttempt : null;
                            const isUrgent = daysUntilAutoPerso !== null && daysUntilAutoPerso <= 5 && daysUntilAutoPerso > 0;
                            const isOverdue = daysUntilAutoPerso !== null && daysUntilAutoPerso <= 0;
                            
                            if (isOverdue) {
                              return (
                                <Tooltip 
                                  content={`URGENTE: Sono passati ${daysSinceLastAttempt} giorni dall'ultimo contatto! Il lead può diventare PERSO automaticamente.`}
                                  position="top"
                                  variant="accent"
                                >
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium cursor-help animate-pulse">
                                    <AlertTriangle size={12} />
                                    Scaduto!
                                  </div>
                                </Tooltip>
                              );
                            }
                            if (isUrgent) {
                              return (
                                <Tooltip 
                                  content={`Attenzione: ${daysUntilAutoPerso} giorni rimanenti prima che il lead diventi PERSO automaticamente.`}
                                  position="top"
                                  variant="accent"
                                >
                                  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium cursor-help">
                                    <AlertTriangle size={12} />
                                    {daysUntilAutoPerso}gg
                                  </div>
                                </Tooltip>
                              );
                            }
                            return null;
                          })()}
                          {/* Call button */}
                          <Tooltip 
                            content={lead.callAttempts === 0 
                              ? "Clicca per registrare la prima chiamata" 
                              : `Registra chiamata #${lead.callAttempts + 1} di 8`
                            }
                            position="top"
                          >
                            <button
                              onClick={() => handleLogCall(lead)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                lead.callAttempts === 0
                                  ? 'bg-commercial text-white hover:opacity-90'
                                  : 'bg-commercial/10 text-commercial hover:bg-commercial/20 border border-commercial/30'
                              }`}
                            >
                              <PhoneCall size={14} />
                              {lead.callAttempts === 0 ? 'Chiama' : `#${lead.callAttempts + 1}`}
                            </button>
                          </Tooltip>
                          {/* Progress bar */}
                          <Tooltip 
                            content={`${lead.callAttempts} tentativi effettuati su 8 massimi. ${8 - lead.callAttempts} rimanenti.`}
                            position="bottom"
                          >
                            <div className="flex items-center gap-1 w-full max-w-[80px] cursor-help">
                              <div className="flex-1 bg-gray-200 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${
                                    lead.callAttempts >= 6 ? 'bg-red-500' : 
                                    lead.callAttempts >= 4 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${(lead.callAttempts / 8) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500">{lead.callAttempts}/8</span>
                            </div>
                          </Tooltip>
                          {/* Last outcome */}
                          {lead.callOutcome && (
                            <Tooltip 
                              content={
                                lead.callOutcome === 'POSITIVO' ? 'Ultimo esito: Il lead è interessato' :
                                lead.callOutcome === 'RICHIAMARE' ? 'Ultimo esito: Da richiamare più tardi' :
                                'Ultimo esito: Non interessato'
                              }
                              position="bottom"
                            >
                              <span className={`text-[10px] px-1.5 py-0.5 rounded cursor-help ${
                                lead.callOutcome === 'POSITIVO' ? 'bg-green-100 text-green-700' :
                                lead.callOutcome === 'RICHIAMARE' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {lead.callOutcome === 'POSITIVO' ? 'Interessato' :
                                 lead.callOutcome === 'RICHIAMARE' ? 'Da richiamare' : 'Non interess.'}
                              </span>
                            </Tooltip>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  {/* Contattato - simple toggle, disabled for PERSO */}
                  <td className="p-4">
                    <div className={`flex items-center justify-center ${lead.status === 'PERSO' ? 'opacity-50' : ''}`}>
                      <Tooltip 
                        content={lead.status === 'PERSO' 
                          ? "Non modificabile - lead perso" 
                          : lead.contacted 
                            ? "✅ Hai parlato con questo lead" 
                            : lead.callAttempts > 0
                              ? "Clicca per segnare come contattato"
                              : "Clicca per registrare la chiamata"
                        }
                        position="top"
                      >
                        <div>
                          <BooleanToggle
                            value={lead.contacted}
                            onChange={(v) => handleQuickStateUpdate(lead.id, "contacted", v)}
                            compact
                            disabled={lead.status === 'PERSO'}
                          />
                        </div>
                      </Tooltip>
                    </div>
                  </td>
                  {/* Target - disabled for PERSO */}
                  <td className="p-4">
                    <div className={`flex items-center justify-center ${lead.status === 'PERSO' ? 'opacity-50' : ''}`}>
                      <Tooltip 
                        content={lead.status === 'PERSO' 
                          ? "Non modificabile - lead perso" 
                          : lead.isTarget 
                            ? "🎯 Lead in obiettivo - priorità alta" 
                            : lead.callAttempts > 0
                              ? "Clicca per segnare come target"
                              : "Clicca per confermare contatto e segnare come target"
                        }
                        position="top"
                      >
                        <div>
                          <BooleanToggle
                            value={lead.isTarget}
                            onChange={(v) => handleQuickStateUpdate(lead.id, "isTarget", v)}
                            compact
                            disabled={lead.status === 'PERSO'}
                          />
                        </div>
                      </Tooltip>
                    </div>
                  </td>
                  {/* Iscritto - disabled for PERSO */}
                  <td className="p-4">
                    <div className={`flex items-center justify-center ${lead.status === 'PERSO' ? 'opacity-50' : ''}`}>
                      <Tooltip 
                        content={lead.status === 'PERSO' 
                          ? "Non modificabile - lead perso" 
                          : lead.enrolled 
                            ? "🎉 Lead iscritto al corso!" 
                            : lead.callOutcome === 'POSITIVO'
                              ? "Clicca per iscrivere (richiede conferma)"
                              : "Richiede esito 'Interessato' per iscrivere"
                        }
                        position="top"
                      >
                        <div>
                          <BooleanToggle
                            value={lead.enrolled}
                            onChange={(v) => handleQuickStateUpdate(lead.id, "enrolled", v)}
                            compact
                            disabled={lead.status === 'PERSO'}
                          />
                        </div>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {/* Action Wizard - Contextual helper */}
                      <LeadActionWizard
                        lead={lead}
                        onLogCall={() => handleLogCall(lead)}
                        onSetTarget={(value) => handleQuickStateUpdate(lead.id, "isTarget", value)}
                        onSetEnrolled={() => handleQuickStateUpdate(lead.id, "enrolled", true)}
                      />
                      <Tooltip content="Vedi dettagli completi e storico attività" position="top">
                        <button
                          onClick={() => setDetailLead(lead)}
                          className="p-2 text-gray-500 hover:text-commercial hover:bg-commercial/10 rounded-lg transition"
                        >
                          <Eye size={18} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Modifica informazioni lead" position="top">
                        <button
                          onClick={() => openEditModal(lead)}
                          className="p-2 text-gray-500 hover:text-commercial hover:bg-commercial/10 rounded-lg transition"
                        >
                          <Pencil size={18} />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="Nessun lead assegnato"
            description="Non hai ancora lead assegnati. I lead ti verranno assegnati dall'amministratore."
            accentColor="commercial"
          />
        )}
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={filteredLeads.length}
          showInfo={true}
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && editingLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Modifica Lead</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                />
              </div>

              {/* Contattato */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <BooleanToggle
                    label="Contattato"
                    value={editFormData.contacted}
                    onChange={(v) => setEditFormData({ ...editFormData, contacted: v })}
                  />
                </div>
              </div>

              {/* Target */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <BooleanToggle
                    label="Target (In obiettivo)"
                    value={editFormData.isTarget}
                    onChange={(v) => setEditFormData({ ...editFormData, isTarget: v })}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Note target..."
                  value={editFormData.targetNote}
                  onChange={(e) => setEditFormData({ ...editFormData, targetNote: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Iscritto */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <BooleanToggle
                    label="Iscritto"
                    value={editFormData.enrolled}
                    onChange={(v) => setEditFormData({ ...editFormData, enrolled: v })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Generali
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onUpdate={handleLeadUpdate}
          accentColor="commercial"
        />
      )}

      {/* Create Lead Modal - SIMPLIFIED (no email/phone) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nuovo Lead</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="Nome e cognome del lead"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corso <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createFormData.courseId}
                  onChange={(e) => {
                    const newCourseId = e.target.value;
                    // Find first campaign for this course
                    const courseCampaigns = campaigns.filter(c => c.course?.id === newCourseId);
                    const defaultCampaign = courseCampaigns[0];
                    setCreateFormData({
                      ...createFormData,
                      courseId: newCourseId,
                      campaignId: defaultCampaign?.id || "",
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
                >
                  <option value="">Seleziona un corso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campagna <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createFormData.campaignId}
                  onChange={(e) => setCreateFormData({ ...createFormData, campaignId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
                  disabled={!createFormData.courseId}
                >
                  <option value="">{createFormData.courseId ? "Seleziona una campagna" : "Prima seleziona un corso"}</option>
                  {campaigns
                    .filter(campaign => campaign.course?.id === createFormData.courseId)
                    .map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                </select>
                {createFormData.courseId && campaigns.filter(c => c.course?.id === createFormData.courseId).length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nessuna campagna per questo corso. Contatta l&apos;amministratore.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={createFormData.notes}
                  onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                  rows={3}
                  placeholder="Note aggiuntive sul lead..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
                />
              </div>

              {/* Status Toggles */}
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <BooleanToggle
                    label="Contattato"
                    value={createFormData.contacted}
                    onChange={(v) => setCreateFormData({ ...createFormData, contacted: v })}
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <BooleanToggle
                    label="Target (In obiettivo)"
                    value={createFormData.isTarget}
                    onChange={(v) => setCreateFormData({ ...createFormData, isTarget: v })}
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <BooleanToggle
                    label="Iscritto"
                    value={createFormData.enrolled}
                    onChange={(v) => setCreateFormData({ ...createFormData, enrolled: v })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={creating}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={creating || !createFormData.name || !createFormData.courseId || !createFormData.campaignId}
                  className="flex-1 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Crea Lead
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrolled Confirmation Modal - Two-step with delay */}
      {(() => {
        const enrollingLead = pendingEnrolledLead ? leads.find(l => l.id === pendingEnrolledLead) : null;
        return (
          <EnrolledConfirmModal
            isOpen={showEnrolledConfirm}
            onClose={handleEnrolledCancel}
            onConfirm={handleEnrolledConfirm}
            leadName={enrollingLead?.name || ''}
            courseName={enrollingLead?.course?.name || 'N/A'}
          />
        );
      })()}

      {/* Edit Form Enrolled Confirmation Modal - Two-step with delay */}
      <EnrolledConfirmModal
        isOpen={showEditEnrolledConfirm}
        onClose={handleEditEnrolledCancel}
        onConfirm={handleEditEnrolledConfirm}
        leadName={editingLead?.name || ''}
        courseName={editingLead?.course?.name || 'N/A'}
      />

      {/* Call Outcome Modal - Using Reusable Component */}
      <CallOutcomeModal
        isOpen={showCallOutcomeModal && !!pendingContactedLead}
        onClose={handleCallOutcomeCancel}
        onSubmit={handleCallOutcomeSubmit}
        leadName={pendingContactedLead?.name || ''}
        callAttempts={pendingContactedLead?.callAttempts || 0}
        lastAttemptAt={pendingContactedLead?.lastAttemptAt || null}
        firstAttemptAt={pendingContactedLead?.firstAttemptAt || null}
        callHistory={[]}
        isSubmitting={false}
        trigger={callModalTrigger}
      />

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-commercial text-white rounded-full shadow-lg hover:opacity-90 transition flex items-center justify-center z-40"
        title="Guida e spiegazioni"
      >
        <HelpCircle size={24} />
      </button>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="text-commercial" size={24} />
                Guida - Gestione Lead
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Chiamate Section */}
              <div className="border-l-4 border-commercial pl-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <PhoneCall size={18} className="text-commercial" />
                  Colonna Chiamate
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Serve per tracciare i tentativi di chiamata e determinare se un lead diventa <strong>PERSO</strong>.
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Chiama:</strong> Clicca per registrare l&apos;esito di una chiamata</li>
                  <li><strong>X/8:</strong> Numero di tentativi effettuati (max 8)</li>
                  <li><strong>Interessato:</strong> Il lead è interessato, continua nel funnel</li>
                  <li><strong>Da richiamare:</strong> Non risponde, riprova più tardi</li>
                  <li><strong>Non interessato:</strong> Il lead diventa PERSO</li>
                </ul>
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                  <strong>Auto-PERSO:</strong> Dopo 8 tentativi &quot;Da richiamare&quot; O dopo 15 giorni senza contatto
                </div>
              </div>

              {/* Contattato Section */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" />
                  Contattato
                </h3>
                <p className="text-sm text-gray-600">
                  Semplice indicatore: <strong>hai parlato con questa persona?</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mt-2">
                  <li><strong>ON (verde):</strong> Hai parlato con il lead</li>
                  <li><strong>OFF (grigio):</strong> Non ancora contattato</li>
                </ul>
              </div>

              {/* Target Section */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-yellow-600" />
                  Target
                </h3>
                <p className="text-sm text-gray-600">
                  Il lead è &quot;in obiettivo&quot; - cioè è un potenziale cliente interessante da seguire con priorità.
                </p>
              </div>

              {/* Iscritto Section */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-blue-600" />
                  Iscritto
                </h3>
                <p className="text-sm text-gray-600">
                  Il lead ha <strong>firmato un contratto</strong> e si è iscritto al corso.
                </p>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>Nota:</strong> Richiede conferma perché è un&apos;azione importante
                </div>
              </div>

              {/* PERSO Section */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <XCircle size={18} className="text-red-600" />
                  PERSO
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Un lead diventa PERSO quando:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Segni &quot;Non interessato&quot; dopo una chiamata</li>
                  <li>Raggiungi 8 tentativi senza risposta</li>
                  <li>Passano 15 giorni dall&apos;ultimo contatto</li>
                </ul>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700">
                  I lead PERSO hanno i toggle disabilitati e sono nascosti di default (usa il filtro per vederli)
                </div>
              </div>

              {/* Tips */}
              <div className="bg-commercial/5 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">💡 Consigli</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Usa il filtro &quot;Attivi (no PERSO)&quot; per concentrarti sui lead da lavorare</li>
                  <li>• Clicca su 👁️ (occhio) per vedere i dettagli completi del lead</li>
                  <li>• Registra sempre l&apos;esito delle chiamate per non perdere lead automaticamente</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                Ho capito!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
