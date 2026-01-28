"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Phone,
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
  RefreshCw,
  CheckSquare,
  Square,
  Minus,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import LeadDetailModal from "@/components/ui/LeadDetailModal";
import BulkActions, { BulkAction } from "@/components/ui/BulkActions";
import AssignmentModal from "@/components/ui/AssignmentModal";
import ImportModal from "@/components/ui/ImportModal";
import EmptyState from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";

type TriState = "SI" | "NO" | "ND";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  // New tri-state fields
  contattatoStato: TriState;
  contattatoAt: string | null;
  contattatoNote: string | null;
  targetStato: TriState;
  targetNote: string | null;
  iscrittoStato: TriState;
  iscrittoAt: string | null;
  iscrittoNote: string | null;
  // Legacy fields
  status: string;
  contacted: boolean;
  contactedAt: string | null;
  enrolled: boolean;
  enrolledAt: string | null;
  isTarget: boolean;
  callOutcome: string | null;
  outcomeNotes: string | null;
  acquisitionCost?: number | null;
  createdAt: string;
  course: { id: string; name: string; price?: number } | null;
  campaign: { id: string; name: string; source?: string; platform?: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  // Call tracking fields
  callAttempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
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
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  
  // Bulk Selection State
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);
  
  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  
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

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    campaignId: "",
    assignedToId: "",
    isTarget: false,
    notes: "",
    status: "NUOVO",
    contacted: false,
    callOutcome: "",
    outcomeNotes: "",
    enrolled: false,
  });

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
  }, [leads, search, filterStatus, filterCourse, filterCommercial, sortField, sortDirection]);

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
  }, [search, filterStatus, filterCourse, filterCommercial]);

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

  const handleBulkStatusChange = async (status: string) => {
    const leadIds = Array.from(selectedLeads);
    
    // Optimistic update
    const previousLeads = [...leads];
    setLeads(leads.map(lead => 
      leadIds.includes(lead.id) ? { ...lead, status } : lead
    ));
    clearSelection();
    setShowBulkStatusDropdown(false);

    try {
      const response = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          leadIds,
          data: { status },
        }),
      });

      if (!response.ok) {
        // Rollback on error
        setLeads(previousLeads);
        toast.error("Errore nell'aggiornamento dello stato");
      } else {
        toast.success(`${leadIds.length} lead aggiornati`);
      }
    } catch (error) {
      // Rollback on error
      setLeads(previousLeads);
      console.error("Failed to bulk update status:", error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const handleBulkDelete = async () => {
    const leadIds = Array.from(selectedLeads);
    
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
        toast.success(`${leadIds.length} lead eliminati`);
      }
    } catch (error) {
      setLeads(previousLeads);
      console.error("Failed to bulk delete:", error);
      toast.error("Errore nell'eliminazione");
    }
  };

  // Bulk Actions Configuration
  const bulkActions: BulkAction[] = [
    {
      id: "assign",
      label: "Assegna",
      icon: <UserPlus size={18} />,
      onClick: () => setShowAssignmentModal(true),
    },
    {
      id: "status",
      label: "Cambia Stato",
      icon: <RefreshCw size={18} />,
      onClick: () => setShowBulkStatusDropdown(true),
    },
    {
      id: "delete",
      label: "Elimina",
      icon: <Trash2 size={18} />,
      variant: "danger",
      onClick: handleBulkDelete,
    },
  ];

  const openModal = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        courseId: lead.course?.id || "",
        campaignId: lead.campaign?.id || "",
        assignedToId: lead.assignedTo?.id || "",
        isTarget: lead.isTarget,
        notes: lead.notes || "",
        status: lead.status,
        contacted: lead.contacted,
        callOutcome: lead.callOutcome || "",
        outcomeNotes: lead.outcomeNotes || "",
        enrolled: lead.enrolled,
      });
    } else {
      setEditingLead(null);
      // Default to first course, then find campaigns for that course
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
        assignedToId: "",
        isTarget: false,
        notes: "",
        status: "NUOVO",
        contacted: false,
        callOutcome: "",
        outcomeNotes: "",
        enrolled: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Campaign is required
    if (!formData.campaignId) {
      toast.error("Seleziona una campagna per il lead");
      return;
    }

    // Call outcome is required when contacted
    if (formData.contacted && !formData.callOutcome) {
      toast.error("Seleziona l'esito della chiamata");
      return;
    }

    const payload = {
      ...formData,
      email: formData.email || null,
      phone: formData.phone || null,
      campaignId: formData.campaignId, // Required - not null
      assignedToId: formData.assignedToId || null,
      notes: formData.notes || null,
      callOutcome: formData.callOutcome || null,
      outcomeNotes: formData.outcomeNotes || null,
    };

    try {
      if (editingLead) {
        await fetch(`/api/leads/${editingLead.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      toast.success(editingLead ? "Lead aggiornato" : "Lead creato");
      // Only fetch leads, not courses/users/campaigns
      fetchLeadsOnly();
    } catch (error) {
      console.error("Failed to save lead:", error);
      toast.error("Errore nel salvataggio del lead");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo lead?")) return;

    // Optimistic delete
    const previousLeads = [...leads];
    setLeads(leads.filter(lead => lead.id !== id));
    
    try {
      const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Lead eliminato");
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

  const handleQuickStatusUpdate = async (id: string, status: string) => {
    // Optimistic update - update local state immediately
    const previousLeads = [...leads];
    setLeads(leads.map(lead => 
      lead.id === id ? { ...lead, status } : lead
    ));
    
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        // Rollback on error
        setLeads(previousLeads);
        toast.error("Errore nell'aggiornamento dello stato");
      }
    } catch (error) {
      // Rollback on error
      setLeads(previousLeads);
      console.error("Failed to update status:", error);
      toast.error("Errore nell'aggiornamento dello stato");
    }
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
            onClick={() => openModal()}
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
                <th scope="col" className="text-center">Contattato</th>
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
                      <p className="font-medium flex items-center gap-2">
                        {lead.name}
                        {lead.isTarget && (
                          <Tooltip content="Lead prioritario con alta probabilita di conversione" position="top">
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded cursor-help">
                              Target
                            </span>
                          </Tooltip>
                        )}
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
                  <label className="sr-only" htmlFor={`status-${lead.id}`}>Stato del lead {lead.name}</label>
                  <select
                    id={`status-${lead.id}`}
                    value={lead.status}
                    onChange={(e) => handleQuickStatusUpdate(lead.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-admin ${statusColors[lead.status]}`}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {lead.contacted ? (
                      <>
                        <CheckCircle size={20} className="text-green-500" aria-hidden="true" />
                        <span className="sr-only">Contattato</span>
                      </>
                    ) : (
                      <>
                        <Clock size={20} className="text-gray-400" aria-hidden="true" />
                        <span className="sr-only">Non ancora contattato</span>
                      </>
                    )}
                    {lead.callAttempts > 0 && (
                      <span 
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          lead.callAttempts >= 6 
                            ? 'bg-red-100 text-red-700' 
                            : lead.callAttempts >= 4 
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                        title={`${lead.callAttempts} tentativi effettuati`}
                      >
                        {lead.callAttempts}/8
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {lead.enrolled ? (
                    <>
                      <CheckCircle size={20} className="text-green-500" aria-hidden="true" />
                      <span className="sr-only">Iscritto</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={20} className="text-gray-400" aria-hidden="true" />
                      <span className="sr-only">Non iscritto</span>
                    </>
                  )}
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                </td>
                <td className="p-4">
                  <div className="flex gap-1" role="group" aria-label={`Azioni per ${lead.name}`}>
                    <button
                      onClick={() => setDetailLead(lead)}
                      className="flex flex-col items-center p-1.5 text-gray-500 hover:text-admin transition focus:outline-none focus:ring-2 focus:ring-admin rounded"
                      aria-label={`Visualizza dettagli di ${lead.name}`}
                    >
                      <Eye size={16} aria-hidden="true" />
                      <span className="text-[10px] mt-0.5">Dettagli</span>
                    </button>
                    <button
                      onClick={() => openModal(lead)}
                      className="flex flex-col items-center p-1.5 text-gray-500 hover:text-admin transition focus:outline-none focus:ring-2 focus:ring-admin rounded"
                      aria-label={`Modifica ${lead.name}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      <span className="text-[10px] mt-0.5">Modifica</span>
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
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
            onAction={() => openModal()}
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

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-form-title"
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 id="lead-form-title" className="text-xl font-bold mb-4">
              {editingLead ? "Modifica Lead" : "Nuovo Lead"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Basic Info */}
              <fieldset>
                <legend className="sr-only">Informazioni di base</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="lead-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="lead-name"
                      type="text"
                      required
                      aria-required="true"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="lead-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="lead-phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono
                    </label>
                    <input
                      id="lead-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Course & Campaign */}
              <fieldset>
                <legend className="sr-only">Corso e campagna</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lead-course" className="block text-sm font-medium text-gray-700 mb-1">
                      Corso <span aria-hidden="true">*</span>
                    </label>
                    <select
                      id="lead-course"
                      required
                      aria-required="true"
                      value={formData.courseId}
                      onChange={(e) => {
                        const newCourseId = e.target.value;
                        // Find first campaign for this course
                        const courseCampaigns = campaigns.filter(c => c.course?.id === newCourseId);
                        const defaultCampaign = courseCampaigns[0];
                        setFormData({ 
                          ...formData, 
                          courseId: newCourseId,
                          campaignId: defaultCampaign?.id || ""
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                    >
                      <option value="">Seleziona corso</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lead-campaign" className="block text-sm font-medium text-gray-700 mb-1">
                      Campagna <span aria-hidden="true">*</span>
                    </label>
                    <select
                      id="lead-campaign"
                      required
                      aria-required="true"
                      value={formData.campaignId}
                      onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                      disabled={!formData.courseId}
                    >
                      <option value="">{formData.courseId ? "Seleziona campagna" : "Prima seleziona un corso"}</option>
                      {campaigns
                        .filter(campaign => campaign.course?.id === formData.courseId)
                        .map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                        ))}
                    </select>
                    {formData.courseId && campaigns.filter(c => c.course?.id === formData.courseId).length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Nessuna campagna per questo corso. Creane una prima.
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Assignment */}
              <fieldset>
                <legend className="sr-only">Assegnazione</legend>
                <div>
                  <label htmlFor="lead-assigned" className="block text-sm font-medium text-gray-700 mb-1">
                    Assegna a Commerciale
                  </label>
                  <select
                    id="lead-assigned"
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                  >
                    <option value="">Non assegnato</option>
                    {commercials.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </fieldset>

              {/* Status & Target */}
              <fieldset>
                <legend className="sr-only">Stato e opzioni</legend>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lead-status" className="block text-sm font-medium text-gray-700 mb-1">
                      Stato
                    </label>
                    <select
                      id="lead-status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4 pt-6" role="group" aria-label="Opzioni lead">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isTarget}
                        onChange={(e) => setFormData({ ...formData, isTarget: e.target.checked })}
                        className="w-4 h-4 focus:ring-2 focus:ring-admin"
                      />
                      <span className="text-sm">Lead Target</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.contacted}
                        onChange={(e) => setFormData({ ...formData, contacted: e.target.checked })}
                        className="w-4 h-4 focus:ring-2 focus:ring-admin"
                      />
                      <span className="text-sm">Contattato</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enrolled}
                        onChange={(e) => setFormData({ ...formData, enrolled: e.target.checked })}
                        className="w-4 h-4 focus:ring-2 focus:ring-admin"
                      />
                      <span className="text-sm">Iscritto</span>
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* Call Outcome (required when contacted) */}
              {formData.contacted && (
                <fieldset>
                  <legend className="sr-only">Esito chiamata</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="lead-outcome" className="block text-sm font-medium text-gray-700 mb-1">
                        Esito Chiamata <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="lead-outcome"
                        required
                        value={formData.callOutcome}
                        onChange={(e) => setFormData({ ...formData, callOutcome: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                      >
                        <option value="">Seleziona esito</option>
                        <option value="POSITIVO">Interessato</option>
                        <option value="RICHIAMARE">Da Richiamare</option>
                        <option value="NEGATIVO">Non Interessato</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="lead-outcome-notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Note Esito
                      </label>
                      <input
                        id="lead-outcome-notes"
                        type="text"
                        value={formData.outcomeNotes}
                        onChange={(e) => setFormData({ ...formData, outcomeNotes: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:outline-none"
                      />
                    </div>
                  </div>
                </fieldset>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="lead-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  id="lead-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
                >
                  {editingLead ? "Salva Modifiche" : "Crea Lead"}
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

      {/* Bulk Status Change Dropdown */}
      {showBulkStatusDropdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Cambia Stato</h3>
            <p className="text-sm text-gray-500 mb-4">
              Seleziona il nuovo stato per {selectedLeads.size} lead
            </p>
            <div className="space-y-2">
              {Object.entries(statusLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleBulkStatusChange(value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border hover:bg-gray-50 transition flex items-center justify-between ${statusColors[value]}`}
                >
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowBulkStatusDropdown(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annulla
            </button>
          </div>
        </div>
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
    </div>
  );
}
