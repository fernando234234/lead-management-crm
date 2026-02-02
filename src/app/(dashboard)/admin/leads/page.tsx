"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Phone,
  PhoneCall,
  Mail,
  User,
  Users,
  Search,
  X,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  UserPlus,
  CheckSquare,
  Square,
  Minus,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlertTriangle,
  Target,
  RefreshCw,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import LeadDetailModal from "@/components/ui/LeadDetailModal";
import BulkActions, { BulkAction } from "@/components/ui/BulkActions";
import AssignmentModal from "@/components/ui/AssignmentModal";
import ImportModal from "@/components/ui/ImportModal";
import EmptyState from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import CallOutcomeModal from "@/components/ui/CallOutcomeModal";
import LeadActionWizard from "@/components/ui/LeadActionWizard";
import EnrolledConfirmModal from "@/components/ui/EnrolledConfirmModal";
import DeleteLeadModal from "@/components/ui/DeleteLeadModal";
import BulkDeleteModal from "@/components/ui/BulkDeleteModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPlatformLabel } from "@/lib/platforms";
import LeadFormModal from "@/components/ui/LeadFormModal";
import RecoverLeadModal from "@/components/ui/RecoverLeadModal";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  // Status and tracking
  status: string;
  contacted: boolean;
  contactedAt: string | null;
  enrolled: boolean;
  enrolledAt: string | null;
  isTarget: boolean;
  targetNote: string | null;
  // Call tracking fields
  callAttempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  callOutcome: string | null;
  outcomeNotes: string | null;
  // Lost reason fields
  lostReason?: string | null;
  lostAt?: string | null;
  // Other fields
  acquisitionCost?: number | null;
  createdAt: string;
  course: { id: string; name: string; price?: number } | null;
  campaign: { 
    id: string; 
    name: string; 
    source?: string; 
    platform?: string;
    masterCampaign?: { id: string; name: string } | null;
  } | null;
  assignedTo: { id: string; name: string; email: string } | null;
}

interface Course {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  source?: string;
  platform?: string;
  course?: { id: string; name: string } | null;
  masterCampaign?: { id: string; name: string } | null;
}

interface UserData {
  id: string;
  name: string;
  email?: string;
  role: string;
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

// Export columns configuration
const leadExportColumns = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
  { key: "course.name", label: "Corso" },
  { key: "campaign.name", label: "Campagna" },
  { key: "status", label: "Stato" },
  { key: "assignedTo.name", label: "Commerciale" },

  { key: "createdAt", label: "Data Creazione" },
  { key: "contacted", label: "Contattato" },
  { key: "enrolled", label: "Iscritto" },
];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [commercials, setCommercials] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadFormModal, setShowLeadFormModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  
  // Bulk Selection State
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Call Outcome Modal State
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(false);
  const [pendingCallLead, setPendingCallLead] = useState<Lead | null>(null);
  
  // Enrolled Confirmation Modal State
  const [showEnrolledConfirm, setShowEnrolledConfirm] = useState(false);
  const [pendingEnrolledLead, setPendingEnrolledLead] = useState<Lead | null>(null);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteLead, setPendingDeleteLead] = useState<Lead | null>(null);
  
  // Bulk Delete Modal State
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Recovery Modal State
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [pendingRecoverLead, setPendingRecoverLead] = useState<Lead | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPerso, setFilterPerso] = useState<string>("active"); // active = hide PERSO, "" = all, "perso" = only PERSO
  const [filterCourse, setFilterCourse] = useState("");
  const [filterCommercial, setFilterCommercial] = useState("");
  
  // Sorting
  type SortField = "name" | "course" | "commercial" | "status" | "createdAt";
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, coursesRes, usersRes, campaignsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/courses"),
        fetch("/api/users"),
        fetch("/api/campaigns"),
      ]);
      
      const [leadsData, coursesData, usersData, campaignsData] = await Promise.all([
        leadsRes.json(),
        coursesRes.json(),
        usersRes.json(),
        campaignsRes.json(),
      ]);

      setLeads(leadsData);
      setCourses(coursesData);
      setCommercials(usersData.filter((u: UserData) => u.role === "COMMERCIAL"));
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lightweight fetch - only refetches leads (not courses, users, campaigns)
  const fetchLeadsOnly = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    }
  };

  // Sort function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter((lead) => {
      if (search && !lead.name.toLowerCase().includes(search.toLowerCase()) &&
          !lead.email?.toLowerCase().includes(search.toLowerCase()) &&
          !lead.phone?.includes(search)) {
        return false;
      }
      if (filterStatus && lead.status !== filterStatus) return false;
      // PERSO filter: "active" hides PERSO, "perso" shows only PERSO, "" shows all
      if (filterPerso === "active" && lead.status === "PERSO") return false;
      if (filterPerso === "perso" && lead.status !== "PERSO") return false;
      if (filterCourse && lead.course?.id !== filterCourse) return false;
      if (filterCommercial && lead.assignedTo?.id !== filterCommercial) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | null = null;
      let bVal: string | number | null = null;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "course":
          aVal = a.course?.name?.toLowerCase() || "";
          bVal = b.course?.name?.toLowerCase() || "";
          break;
        case "commercial":
          aVal = a.assignedTo?.name?.toLowerCase() || "";
          bVal = b.assignedTo?.name?.toLowerCase() || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
      }

      if (aVal === null || bVal === null) return 0;
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, search, filterStatus, filterPerso, filterCourse, filterCommercial, sortField, sortDirection]);

  // Sort icon helper
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortDirection === "asc" 
      ? <ArrowUp size={14} className="text-admin" />
      : <ArrowDown size={14} className="text-admin" />;
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedLeads(new Set()); // Clear selection when filters change
  }, [search, filterStatus, filterPerso, filterCourse, filterCommercial]);

  // Selection helpers
  const allCurrentPageSelected = useMemo(() => {
    if (paginatedLeads.length === 0) return false;
    return paginatedLeads.every(lead => selectedLeads.has(lead.id));
  }, [paginatedLeads, selectedLeads]);

  const someCurrentPageSelected = useMemo(() => {
    return paginatedLeads.some(lead => selectedLeads.has(lead.id)) && !allCurrentPageSelected;
  }, [paginatedLeads, selectedLeads, allCurrentPageSelected]);

  const handleSelectAll = () => {
    if (allCurrentPageSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedLeads);
      paginatedLeads.forEach(lead => newSelected.delete(lead.id));
      setSelectedLeads(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedLeads);
      paginatedLeads.forEach(lead => newSelected.add(lead.id));
      setSelectedLeads(newSelected);
    }
  };

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  // Bulk Actions
  const handleBulkAssign = async (data: { assignedToId: string } | { distribute: true }) => {
    const leadIds = Array.from(selectedLeads);
    
    // For simple assignment (not distribute), we can do optimistic update
    if ('assignedToId' in data) {
      const assignedUser = commercials.find(c => c.id === data.assignedToId);
      const previousLeads = [...leads];
      
      setLeads(leads.map(lead => 
        leadIds.includes(lead.id) 
          ? { ...lead, assignedTo: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email || '' } : null }
          : lead
      ));
      clearSelection();
      
      try {
        const response = await fetch("/api/leads/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            leadIds,
            data,
          }),
        });

        if (!response.ok) {
          setLeads(previousLeads);
          toast.error("Errore nell'assegnazione");
        } else {
          toast.success(`${leadIds.length} lead assegnati`);
        }
      } catch (error) {
        setLeads(previousLeads);
        console.error("Failed to bulk assign:", error);
        toast.error("Errore nell'assegnazione");
      }
    } else {
      // For distribute, we need to refetch to get the distributed assignments
      try {
        const response = await fetch("/api/leads/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            leadIds,
            data,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to assign leads");
        }

        // Only refetch leads, not courses/users/campaigns
        const leadsRes = await fetch("/api/leads");
        const leadsData = await leadsRes.json();
        setLeads(leadsData);
        clearSelection();
        toast.success(`${leadIds.length} lead distribuiti`);
      } catch (error) {
        console.error("Failed to bulk assign:", error);
        toast.error("Errore nella distribuzione");
      }
    }
  };

  // Open bulk delete modal
  const handleBulkDeleteClick = () => {
    setShowBulkDeleteModal(true);
  };

  // Confirm bulk delete (called from BulkDeleteModal)
  const handleBulkDeleteConfirm = async (leadIds: string[]) => {
    // Optimistic delete
    const previousLeads = [...leads];
    setLeads(leads.filter(lead => !leadIds.includes(lead.id)));
    clearSelection();

    try {
      const response = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          leadIds,
        }),
      });

      if (!response.ok) {
        setLeads(previousLeads);
        toast.error("Errore nell'eliminazione");
      } else {
        toast.success(`${leadIds.length} lead eliminati definitivamente`);
        setShowBulkDeleteModal(false);
      }
    } catch (error) {
      setLeads(previousLeads);
      console.error("Failed to bulk delete:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteModal(false);
  };

  // Bulk Actions Configuration - Status is READ-ONLY, so no status change action
  const bulkActions: BulkAction[] = [
    {
      id: "assign",
      label: "Assegna",
      icon: <UserPlus size={18} />,
      onClick: () => setShowAssignmentModal(true),
    },
    {
      id: "delete",
      label: "Elimina",
      icon: <Trash2 size={18} />,
      variant: "danger",
      skipConfirm: true, // We use our own BulkDeleteModal
      onClick: handleBulkDeleteClick,
    },
  ];

  // Open modal for creating new lead
  const openCreateModal = () => {
    setEditingLead(null);
    setShowLeadFormModal(true);
  };

  // Open modal for editing existing lead
  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setShowLeadFormModal(true);
  };

  // Handle modal success (create or edit)
  const handleLeadFormSuccess = () => {
    fetchLeadsOnly();
  };

  // Open delete modal
  const handleDeleteClick = (lead: Lead) => {
    setPendingDeleteLead(lead);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async (id: string) => {
    // Optimistic delete
    const previousLeads = [...leads];
    setLeads(leads.filter(lead => lead.id !== id));
    
    try {
      const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Lead eliminato definitivamente");
        setShowDeleteModal(false);
        setPendingDeleteLead(null);
      } else {
        setLeads(previousLeads);
        toast.error("Errore nell'eliminazione del lead");
      }
    } catch (error) {
      setLeads(previousLeads);
      console.error("Failed to delete lead:", error);
      toast.error("Errore nell'eliminazione del lead");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPendingDeleteLead(null);
  };

  const handleLeadUpdate = async (leadId: string, data: Partial<Lead>) => {
    // Optimistic update - update local state immediately
    const previousLeads = [...leads];
    setLeads(leads.map(lead => 
      lead.id === leadId ? { ...lead, ...data } : lead
    ));
    
    // Also update detailLead if it's open
    if (detailLead?.id === leadId) {
      setDetailLead({ ...detailLead, ...data });
    }
    
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        // Rollback on error
        setLeads(previousLeads);
        toast.error("Errore nell'aggiornamento del lead");
      }
    } catch (error) {
      // Rollback on error
      setLeads(previousLeads);
      console.error("Failed to update lead:", error);
      toast.error("Errore nell'aggiornamento del lead");
    }
  };

  // Open recovery modal for a PERSO lead
  const handleOpenRecoverModal = (lead: Lead) => {
    if (lead.status !== 'PERSO') {
      return;
    }
    setPendingRecoverLead(lead);
    setShowRecoverModal(true);
  };

  // Handle lead recovery
  const handleRecoverLead = async (notes?: string) => {
    if (!pendingRecoverLead) return;

    const leadId = pendingRecoverLead.id;
    const previousLeads = [...leads];
    setIsRecovering(true);

    // Optimistic update
    const optimisticUpdate: Partial<Lead> = {
      status: 'CONTATTATO',
      callOutcome: null,
      callAttempts: 0,
      lostReason: null,
      lostAt: null,
    };

    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, ...optimisticUpdate } : lead
    ));

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoverLead: true,
          recoveryNotes: notes || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to recover");

      toast.success(`Lead "${pendingRecoverLead.name}" recuperato con successo! 🎉`);
      
      // Refetch to get accurate data from server
      fetchLeadsOnly();
    } catch (error) {
      console.error("Failed to recover lead:", error);
      // Rollback on error
      setLeads(previousLeads);
      toast.error("Errore nel recupero del lead");
    } finally {
      setIsRecovering(false);
      setShowRecoverModal(false);
      setPendingRecoverLead(null);
    }
  };

  // Open call outcome modal
  const handleLogCall = (lead: Lead) => {
    // For PERSO leads, guide them to recovery instead of blocking
    if (lead.status === 'PERSO') {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-medium">Questo lead è PERSO</p>
          <p className="text-sm text-gray-600">Vuoi recuperarlo per riprendere a lavorarlo?</p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                handleOpenRecoverModal(lead);
              }}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Recupera Lead
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Annulla
            </button>
          </div>
        </div>
      ), { duration: 10000 });
      return;
    }
    if (lead.enrolled) {
      toast.error("Questo lead è già iscritto");
      return;
    }
    setPendingCallLead(lead);
    setShowCallOutcomeModal(true);
  };

  // Handle call outcome submission
  const handleCallOutcomeSubmit = async (data: { callOutcome: string; outcomeNotes: string }) => {
    if (!pendingCallLead) return;

    const leadId = pendingCallLead.id;
    const previousLeads = [...leads];
    const now = new Date().toISOString();
    const newAttempts = (pendingCallLead.callAttempts || 0) + 1;
    
    const optimisticUpdate: Partial<Lead> = {
      contacted: true,
      contactedAt: pendingCallLead.contactedAt || now,
      callOutcome: data.callOutcome,
      callAttempts: newAttempts,
      lastAttemptAt: now,
      firstAttemptAt: pendingCallLead.firstAttemptAt || now,
    };
    
    // Mark as PERSO if NEGATIVO or 8 attempts with RICHIAMARE
    if (data.callOutcome === 'NEGATIVO' || 
        (data.callOutcome === 'RICHIAMARE' && newAttempts >= 8)) {
      optimisticUpdate.status = 'PERSO';
    }
    
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, ...optimisticUpdate } : lead
    ));

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacted: true,
          contactedAt: pendingCallLead.contactedAt || now,
          callOutcome: data.callOutcome,
          outcomeNotes: data.outcomeNotes || null,
          callAttempts: newAttempts,
          lastAttemptAt: now,
          firstAttemptAt: pendingCallLead.firstAttemptAt || now,
          ...(optimisticUpdate.status && { status: optimisticUpdate.status }),
        }),
      });
      
      if (data.callOutcome === 'NEGATIVO') {
        toast.success("Lead segnato come PERSO (non interessato)");
      } else if (data.callOutcome === 'RICHIAMARE') {
        if (newAttempts >= 8) {
          toast.success("Lead segnato come PERSO (8 tentativi raggiunti)");
        } else {
          toast.success(`Chiamata #${newAttempts} registrata - ${8 - newAttempts} tentativi rimanenti`);
        }
      } else {
        toast.success("Lead interessato!");
      }
    } catch (error) {
      console.error("Failed to log call outcome:", error);
      setLeads(previousLeads);
      toast.error("Errore nel salvataggio");
    }
    
    setShowCallOutcomeModal(false);
    setPendingCallLead(null);
  };

  const handleCallOutcomeCancel = () => {
    setShowCallOutcomeModal(false);
    setPendingCallLead(null);
  };

  // Handle set target
  const handleSetTarget = async (lead: Lead, value: boolean) => {
    if (lead.status === 'PERSO') {
      // Guide to recovery instead of blocking
      handleOpenRecoverModal(lead);
      return;
    }
    
    const previousLeads = [...leads];
    setLeads(prev => prev.map(l => 
      l.id === lead.id ? { ...l, isTarget: value } : l
    ));
    
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTarget: value }),
      });
      toast.success(value ? "Lead segnato come target" : "Target rimosso");
    } catch (error) {
      console.error("Failed to update target:", error);
      setLeads(previousLeads);
      toast.error("Errore nell'aggiornamento");
    }
  };

  // Handle enrollment
  const handleSetEnrolled = (lead: Lead) => {
    if (lead.status === 'PERSO') {
      // Guide to recovery instead of blocking
      handleOpenRecoverModal(lead);
      return;
    }
    if (!lead.contacted || lead.callOutcome !== 'POSITIVO') {
      toast.error("Il lead deve essere contattato con esito POSITIVO per poterlo iscrivere", {
        duration: 4000,
        icon: '⚠️'
      });
      return;
    }
    setPendingEnrolledLead(lead);
    setShowEnrolledConfirm(true);
  };

  const handleEnrolledConfirm = async () => {
    if (!pendingEnrolledLead) return;
    
    const leadId = pendingEnrolledLead.id;
    const previousLeads = [...leads];
    const now = new Date().toISOString();
    
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, enrolled: true, enrolledAt: now, status: 'ISCRITTO' } : lead
    ));
    
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          enrolled: true, 
          enrolledAt: now,
          status: 'ISCRITTO'
        }),
      });
      toast.success("🎉 Lead iscritto con successo!");
    } catch (error) {
      console.error("Failed to enroll:", error);
      setLeads(previousLeads);
      toast.error("Errore nell'iscrizione");
    }
    
    setShowEnrolledConfirm(false);
    setPendingEnrolledLead(null);
  };

  const handleEnrolledCancel = () => {
    setShowEnrolledConfirm(false);
    setPendingEnrolledLead(null);
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Lead</h1>
          <p className="text-gray-500">{filteredLeads.length} lead totali</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={filteredLeads}
            columns={leadExportColumns}
            filename="lead_export"
          />
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-admin text-admin rounded-lg hover:bg-admin/5 transition"
          >
            <Upload size={20} />
            Importa
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Nuovo Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cerca per nome, email, telefono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
              />
            </div>
          </div>
          <select
            value={filterPerso}
            onChange={(e) => setFilterPerso(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="active">Attivi (no PERSO)</option>
            <option value="">Tutti</option>
            <option value="perso">Solo PERSO</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutti i corsi</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
          <select
            value={filterCommercial}
            onChange={(e) => setFilterCommercial(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutti i commerciali</option>
            {commercials.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
          {(search || filterStatus || filterPerso !== "active" || filterCourse || filterCommercial) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("");
                setFilterPerso("active");
                setFilterCourse("");
                setFilterCommercial("");
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={18} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Selection Info Bar */}
      {selectedLeads.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-blue-700 font-medium">
            {selectedLeads.size} lead selezionat{selectedLeads.size === 1 ? "o" : "i"}
          </span>
          <button
            onClick={() => {
              // Select all filtered leads
              const newSelected = new Set<string>();
              filteredLeads.forEach(lead => newSelected.add(lead.id));
              setSelectedLeads(newSelected);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Seleziona tutti i {filteredLeads.length} lead filtrati
          </button>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-enhanced" aria-label="Tabella lead">
            <caption className="sr-only">
              Lista dei lead con opzioni per selezionare, visualizzare e modificare
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-12">
                  <button
                    onClick={handleSelectAll}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-admin"
                    aria-label={allCurrentPageSelected ? "Deseleziona tutti i lead della pagina" : "Seleziona tutti i lead della pagina"}
                  >
                    {allCurrentPageSelected ? (
                      <CheckSquare size={20} className="text-admin" aria-hidden="true" />
                    ) : someCurrentPageSelected ? (
                      <Minus size={20} className="text-admin" aria-hidden="true" />
                    ) : (
                      <Square size={20} className="text-gray-400" aria-hidden="true" />
                    )}
                  </button>
                </th>
                <th scope="col">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-1 hover:text-admin transition-colors">
                    Lead <SortIcon field="name" />
                  </button>
                </th>
                <th scope="col">
                  <button onClick={() => handleSort("course")} className="flex items-center gap-1 hover:text-admin transition-colors">
                    Corso <SortIcon field="course" />
                  </button>
                </th>
                <th scope="col">
                  <button onClick={() => handleSort("commercial")} className="flex items-center gap-1 hover:text-admin transition-colors">
                    Commerciale <SortIcon field="commercial" />
                  </button>
                </th>
                <th scope="col">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-admin transition-colors">
                    Stato <SortIcon field="status" />
                  </button>
                </th>
                <th scope="col" className="text-center">
                  <Tooltip content="Numero di chiamate effettuate e ultimo esito" position="top">
                    <span className="flex items-center justify-center gap-1 cursor-help">
                      Chiamate
                      <span className="text-gray-400 text-xs">(?)</span>
                    </span>
                  </Tooltip>
                </th>
                <th scope="col" className="text-center">Contattato</th>
                <th scope="col" className="text-center">Target</th>
                <th scope="col" className="text-center">Iscritto</th>
                <th scope="col">
                  <button onClick={() => handleSort("createdAt")} className="flex items-center gap-1 hover:text-admin transition-colors">
                    Data Creazione <SortIcon field="createdAt" />
                  </button>
                </th>
                <th scope="col">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead, index) => (
                <tr
                  key={lead.id}
                  className={`transition-all duration-150 ${
                    selectedLeads.has(lead.id) ? "!bg-blue-50" : index % 2 === 0 ? "" : "bg-gray-50/30"
                  }`}
                >
                <td className="p-4">
                  <button
                    onClick={() => handleSelectLead(lead.id)}
                    className="p-1 hover:bg-gray-200 rounded transition focus:outline-none focus:ring-2 focus:ring-admin"
                    aria-label={selectedLeads.has(lead.id) ? `Deseleziona ${lead.name}` : `Seleziona ${lead.name}`}
                    aria-pressed={selectedLeads.has(lead.id)}
                  >
                    {selectedLeads.has(lead.id) ? (
                      <CheckSquare size={20} className="text-blue-600" aria-hidden="true" />
                    ) : (
                      <Square size={20} className="text-gray-400" aria-hidden="true" />
                    )}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center" aria-hidden="true">
                      <User size={20} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {lead.name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
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
                </td>
                <td className="p-4">
                  <span className="text-sm">{lead.course?.name || "-"}</span>
                </td>
                <td className="p-4">
                  <span className="text-sm">{lead.assignedTo?.name || "-"}</span>
                </td>
                <td className="p-4">
                  {/* Status is READ-ONLY on admin leads page - display only */}
                  <StatusBadge status={lead.status as "NUOVO" | "CONTATTATO" | "IN_TRATTATIVA" | "ISCRITTO" | "PERSO"} />
                </td>
                {/* Chiamate Column - with call button, progress, outcome */}
                <td className="p-4">
                  <div className="flex flex-col items-center gap-1">
                    {/* Call button or status */}
                    {lead.status === 'PERSO' ? (
                      <Tooltip content="Clicca per recuperare questo lead" position="top">
                        <button
                          onClick={() => handleOpenRecoverModal(lead)}
                          className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-1.5 font-medium"
                        >
                          <RefreshCw size={12} />
                          Recupera
                        </button>
                      </Tooltip>
                    ) : lead.enrolled ? (
                      <Tooltip content="Lead iscritto!" position="top">
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          ISCRITTO
                        </span>
                      </Tooltip>
                    ) : (
                      <>
                        {(() => {
                          // Calculate days left for RICHIAMARE leads
                          const isRichiamare = lead.callOutcome === 'RICHIAMARE';
                          const isPositivo = lead.callOutcome === 'POSITIVO';
                          let daysLeft = 15;
                          if (isRichiamare && lead.lastAttemptAt) {
                            const daysSince = Math.floor((Date.now() - new Date(lead.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24));
                            daysLeft = 15 - daysSince;
                          }
                          const isUrgent = isRichiamare && daysLeft <= 3;
                          const isWarning = isRichiamare && daysLeft <= 7 && daysLeft > 3;
                          const isExpired = isRichiamare && daysLeft <= 0;

                          return (
                            <button
                              onClick={() => handleLogCall(lead)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex flex-col items-center gap-0.5 min-w-[90px] ${
                                isExpired ? 'bg-red-600 text-white animate-pulse' :
                                isUrgent ? 'bg-red-500 text-white' :
                                isWarning ? 'bg-amber-500 text-white' :
                                isRichiamare ? 'bg-yellow-500 text-white' :
                                isPositivo ? 'bg-green-600 text-white' :
                                'bg-admin text-white hover:opacity-90'
                              }`}
                              title={isRichiamare ? `${daysLeft} giorni prima di PERSO automatico` : "Registra l'esito di una chiamata"}
                            >
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {lead.callAttempts === 0 ? 'Ho Chiamato' : 
                                 isExpired ? 'SCADUTO!' :
                                 isRichiamare ? 'Richiama!' : 
                                 isPositivo ? `Esito #${lead.callAttempts + 1} ✓` :
                                 `Esito #${lead.callAttempts + 1}`}
                              </span>
                              {isRichiamare && !isExpired && (
                                <span className="text-[10px] opacity-90 flex items-center gap-0.5">
                                  <Clock size={9} />
                                  {daysLeft}gg rimasti
                                </span>
                              )}
                              {isPositivo && (
                                <span className="text-[10px] opacity-90">Interessato</span>
                              )}
                            </button>
                          );
                        })()}
                        
                        {/* Progress bar - only show if calls made */}
                        {lead.callAttempts > 0 && (
                          <div className="w-full mt-1">
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  lead.callAttempts >= 7 ? 'bg-red-500' : 
                                  lead.callAttempts >= 5 ? 'bg-yellow-500' : 'bg-admin'
                                }`}
                                style={{ width: `${(lead.callAttempts / 8) * 100}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-gray-400 text-center mt-0.5">
                              {lead.callAttempts}/8 tentativi
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </td>
                {/* Contattato */}
                <td className="p-4 text-center">
                  {lead.contacted ? (
                    <CheckCircle size={20} className="text-green-500 mx-auto" aria-hidden="true" />
                  ) : (
                    <Clock size={20} className="text-gray-400 mx-auto" aria-hidden="true" />
                  )}
                </td>
                {/* Target - clickable toggle */}
                <td className="p-4 text-center">
                  <Tooltip 
                    content={lead.status === 'PERSO' 
                      ? "Clicca per opzioni di recupero" 
                      : lead.isTarget 
                        ? "🎯 Lead prioritario - clicca per rimuovere" 
                        : "Clicca per segnare come prioritario"
                    }
                    position="top"
                  >
                    <button
                      onClick={() => {
                        if (lead.status === 'PERSO') {
                          handleOpenRecoverModal(lead);
                        } else {
                          handleSetTarget(lead, !lead.isTarget);
                        }
                      }}
                      className={`p-1 rounded-lg transition ${
                        lead.status === 'PERSO' 
                          ? 'opacity-50 hover:opacity-100 hover:bg-green-50 cursor-pointer' 
                          : 'hover:bg-yellow-50 cursor-pointer'
                      }`}
                    >
                      {lead.isTarget ? (
                        <Target size={20} className="text-yellow-500 mx-auto" aria-hidden="true" />
                      ) : (
                        <Target size={20} className="text-gray-300 mx-auto" aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip>
                </td>
                {/* Iscritto - Clickable with confirmation */}
                <td className="p-4 text-center">
                  <Tooltip 
                    content={
                      lead.enrolled 
                        ? "✅ Lead iscritto!"
                        : lead.status === 'PERSO'
                          ? "🔄 Clicca per opzioni di recupero"
                          : lead.callOutcome === 'POSITIVO'
                            ? "🎯 Clicca per iscrivere questo lead"
                            : "⚠️ Richiede esito 'Interessato' prima dell'iscrizione"
                    }
                    position="top"
                  >
                    <button
                      onClick={() => {
                        if (lead.enrolled) {
                          toast.error("Non puoi rimuovere l'iscrizione da qui");
                          return;
                        }
                        if (lead.status === 'PERSO') {
                          handleOpenRecoverModal(lead);
                          return;
                        }
                        handleSetEnrolled(lead);
                      }}
                      disabled={lead.enrolled}
                      className={`p-1 rounded-lg transition ${
                        lead.enrolled
                          ? 'cursor-default'
                          : lead.status === 'PERSO'
                            ? 'opacity-50 hover:opacity-100 hover:bg-green-50 cursor-pointer'
                            : lead.callOutcome === 'POSITIVO'
                              ? 'hover:bg-green-50 cursor-pointer'
                              : 'opacity-60 cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      {lead.enrolled ? (
                        <CheckCircle size={20} className="text-green-500 mx-auto" aria-hidden="true" />
                      ) : (
                        <XCircle size={20} className={`mx-auto ${
                          lead.callOutcome === 'POSITIVO' ? 'text-green-300' : 'text-gray-400'
                        }`} aria-hidden="true" />
                      )}
                    </button>
                  </Tooltip>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                </td>
                <td className="p-4">
                  <div className="flex gap-1" role="group" aria-label={`Azioni per ${lead.name}`}>
                    {/* Action Wizard */}
                    <LeadActionWizard
                      lead={lead}
                      onLogCall={() => handleLogCall(lead)}
                      onSetTarget={(value) => handleSetTarget(lead, value)}
                      onSetEnrolled={() => handleSetEnrolled(lead)}
                      onRecover={lead.status === 'PERSO' ? () => handleOpenRecoverModal(lead) : undefined}
                    />
                    <button
                      onClick={() => setDetailLead(lead)}
                      className="flex flex-col items-center p-1.5 text-gray-500 hover:text-admin transition focus:outline-none focus:ring-2 focus:ring-admin rounded"
                      aria-label={`Visualizza dettagli di ${lead.name}`}
                    >
                      <Eye size={16} aria-hidden="true" />
                      <span className="text-[10px] mt-0.5">Dettagli</span>
                    </button>
                    <button
                      onClick={() => openEditModal(lead)}
                      className="flex flex-col items-center p-1.5 text-gray-500 hover:text-admin transition focus:outline-none focus:ring-2 focus:ring-admin rounded"
                      aria-label={`Modifica ${lead.name}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      <span className="text-[10px] mt-0.5">Modifica</span>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(lead)}
                      className="flex flex-col items-center p-1.5 text-gray-500 hover:text-red-600 transition focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                      aria-label={`Elimina ${lead.name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      <span className="text-[10px] mt-0.5">Elimina</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        {filteredLeads.length === 0 && (
          <EmptyState
            icon={Users}
            title="Nessun lead trovato"
            description="Non ci sono lead che corrispondono ai filtri selezionati. Prova a modificare i filtri o crea un nuovo lead."
            actionLabel="Nuovo Lead"
            onAction={openCreateModal}
            accentColor="admin"
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

      {/* Unified Lead Form Modal (Create/Edit) */}
      <LeadFormModal
        isOpen={showLeadFormModal}
        onClose={() => setShowLeadFormModal(false)}
        onSuccess={handleLeadFormSuccess}
        lead={editingLead}
        courses={courses}
        campaigns={campaigns}
        commercials={commercials}
        accentColor="admin"
        showAssignment={true}
      />

      {/* Lead Detail Modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onUpdate={handleLeadUpdate}
          accentColor="admin"
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedIds={Array.from(selectedLeads)}
        onClear={clearSelection}
        actions={bulkActions}
      />

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <AssignmentModal
          leadIds={Array.from(selectedLeads)}
          commercials={commercials}
          onAssign={handleBulkAssign}
          onClose={() => setShowAssignmentModal(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={(result) => {
            setShowImportModal(false);
            if (result.success > 0) {
              fetchData();
            }
          }}
          courses={courses}
          campaigns={campaigns}
        />
      )}

      {/* Call Outcome Modal */}
      <CallOutcomeModal
        isOpen={showCallOutcomeModal && !!pendingCallLead}
        onClose={handleCallOutcomeCancel}
        onSubmit={handleCallOutcomeSubmit}
        leadName={pendingCallLead?.name || ''}
        callAttempts={pendingCallLead?.callAttempts || 0}
        lastAttemptAt={pendingCallLead?.lastAttemptAt || null}
        firstAttemptAt={pendingCallLead?.firstAttemptAt || null}
        callHistory={[]}
        isSubmitting={false}
        trigger="button"
      />

      {/* Enrolled Confirmation Modal */}
      <EnrolledConfirmModal
        isOpen={showEnrolledConfirm}
        onClose={handleEnrolledCancel}
        onConfirm={handleEnrolledConfirm}
        leadName={pendingEnrolledLead?.name || ''}
        courseName={pendingEnrolledLead?.course?.name || 'N/A'}
      />

      {/* Delete Lead Modal */}
      {showDeleteModal && pendingDeleteLead && (
        <DeleteLeadModal
          lead={pendingDeleteLead}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && selectedLeads.size > 0 && (
        <BulkDeleteModal
          leads={leads.filter(lead => selectedLeads.has(lead.id))}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={handleBulkDeleteCancel}
        />
      )}

      {/* Recovery Modal */}
      <RecoverLeadModal
        isOpen={showRecoverModal && !!pendingRecoverLead}
        onClose={() => {
          setShowRecoverModal(false);
          setPendingRecoverLead(null);
        }}
        onConfirm={handleRecoverLead}
        leadName={pendingRecoverLead?.name || ''}
        lostReason={pendingRecoverLead?.lostReason}
        lostAt={pendingRecoverLead?.lostAt}
        isSubmitting={isRecovering}
      />
    </div>
  );
}
