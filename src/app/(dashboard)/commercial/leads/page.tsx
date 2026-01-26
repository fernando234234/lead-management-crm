"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Pencil,
  Phone,
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
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import LeadDetailModal from "@/components/ui/LeadDetailModal";
import EmptyState from "@/components/ui/EmptyState";
import ExportButton from "@/components/ui/ExportButton";
import ConfirmModal from "@/components/ui/ConfirmModal";

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

  // Call outcome modal (required when marking as contacted)
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(false);
  const [pendingContactedLead, setPendingContactedLead] = useState<Lead | null>(null);
  const [callOutcomeData, setCallOutcomeData] = useState({
    callOutcome: "",
    outcomeNotes: "",
  });

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

    try {
      const updateData: Record<string, unknown> = {
        name: editFormData.name,
        notes: editFormData.notes || null,
        contacted: editFormData.contacted,
        isTarget: editFormData.isTarget,
        targetNote: editFormData.targetNote || null,
        enrolled: editFormData.enrolled,
      };

      // Add enrolledAt timestamp if enrolling
      if (editFormData.enrolled && !editingLead.enrolled) {
        updateData.enrolledAt = new Date().toISOString();
      }

      const response = await fetch(`/api/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to update lead");
      
      toast.success("Lead aggiornato con successo");
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to update lead:", error);
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
          contacted: false,
          isTarget: false,
          enrolled: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create lead");
      }

      setShowCreateModal(false);
      setCreateFormData({ name: "", courseId: "", campaignId: "", notes: "" });
      toast.success("Lead creato con successo!");
      fetchData();
    } catch (error) {
      console.error("Failed to create lead:", error);
      toast.error(error instanceof Error ? error.message : "Errore nella creazione del lead");
    } finally {
      setCreating(false);
    }
  };

  // Quick state update
  const handleQuickStateUpdate = async (leadId: string, field: string, value: boolean) => {
    // If setting enrolled to true, show confirmation modal first
    if (field === "enrolled" && value === true) {
      setPendingEnrolledLead(leadId);
      setShowEnrolledConfirm(true);
      return;
    }

    // If setting contacted to true, show call outcome modal first
    if (field === "contacted" && value === true) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setPendingContactedLead(lead);
        setCallOutcomeData({ callOutcome: "", outcomeNotes: "" });
        setShowCallOutcomeModal(true);
      }
      return;
    }

    await performStateUpdate(leadId, field, value);
  };

  // Perform the actual state update
  const performStateUpdate = async (leadId: string, field: string, value: boolean) => {
    try {
      const updateData: Record<string, unknown> = { [field]: value };
      
      // Add timestamp for true states
      if (value) {
        if (field === "contacted") updateData.contactedAt = new Date().toISOString();
        if (field === "enrolled") updateData.enrolledAt = new Date().toISOString();
      }

      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      fetchData();
      
      if (field === "enrolled" && value) {
        toast.success("Lead segnato come iscritto!");
      }
    } catch (error) {
      console.error("Failed to update lead state:", error);
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

  // Handle call outcome submission
  const handleCallOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingContactedLead || !callOutcomeData.callOutcome) return;

    try {
      await fetch(`/api/leads/${pendingContactedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacted: true,
          contactedAt: new Date().toISOString(),
          callOutcome: callOutcomeData.callOutcome,
          outcomeNotes: callOutcomeData.outcomeNotes || null,
        }),
      });
      fetchData();
      
      // Show appropriate message based on outcome
      if (callOutcomeData.callOutcome === 'NEGATIVO') {
        toast.success("Lead segnato come PERSO (non interessato)");
      } else if (callOutcomeData.callOutcome === 'NON_RISPONDE' || callOutcomeData.callOutcome === 'RICHIAMARE') {
        const newAttempts = (pendingContactedLead.callAttempts || 0) + 1;
        if (newAttempts >= 8) {
          toast.success("Lead segnato come PERSO (8 tentativi raggiunti)");
        } else {
          toast.success(`Chiamata #${newAttempts} registrata - ${8 - newAttempts} tentativi rimanenti`);
        }
      } else {
        toast.success("Esito chiamata registrato");
      }
    } catch (error) {
      console.error("Failed to log call outcome:", error);
      toast.error("Errore nel salvataggio");
    }
    
    setShowCallOutcomeModal(false);
    setPendingContactedLead(null);
    setCallOutcomeData({ callOutcome: "", outcomeNotes: "" });
  };

  const handleCallOutcomeCancel = () => {
    setShowCallOutcomeModal(false);
    setPendingContactedLead(null);
    setCallOutcomeData({ callOutcome: "", outcomeNotes: "" });
  };

  const handleLeadUpdate = async (leadId: string, data: Partial<Lead>) => {
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update lead:", error);
    }
  };

  // Boolean Toggle Component
  const BooleanToggle = ({
    value,
    onChange,
    label,
    compact = false,
  }: {
    value: boolean;
    onChange: (value: boolean) => void;
    label?: string;
    compact?: boolean;
  }) => {
    if (compact) {
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            value ? "bg-green-600" : "bg-gray-200"
          }`}
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
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            value ? "bg-green-600" : "bg-gray-200"
          }`}
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
                <th>Campagna</th>
                <th className="text-center">Contattato</th>
                <th className="text-center">Target</th>
                <th className="text-center">Iscritto</th>
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
                  <td className="p-4">
                    <span className="text-sm">{lead.campaign?.name || "-"}</span>
                    {lead.campaign?.platform && (
                      <span className="ml-1 text-xs text-gray-400">
                        ({lead.campaign.platform})
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <BooleanToggle
                        value={lead.contacted}
                        onChange={(v) => handleQuickStateUpdate(lead.id, "contacted", v)}
                        compact
                      />
                      {lead.callAttempts > 0 && !lead.contacted && (
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
                    <BooleanToggle
                      value={lead.isTarget}
                      onChange={(v) => handleQuickStateUpdate(lead.id, "isTarget", v)}
                      compact
                    />
                  </td>
                  <td className="p-4">
                    <BooleanToggle
                      value={lead.enrolled}
                      onChange={(v) => handleQuickStateUpdate(lead.id, "enrolled", v)}
                      compact
                    />
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailLead(lead)}
                        className="p-2 text-gray-500 hover:text-commercial transition"
                        title="Dettagli"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(lead)}
                        className="p-2 text-gray-500 hover:text-commercial transition"
                        title="Modifica lead"
                      >
                        <Pencil size={18} />
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

      {/* Enrolled Confirmation Modal */}
      <ConfirmModal
        isOpen={showEnrolledConfirm}
        onClose={handleEnrolledCancel}
        onConfirm={handleEnrolledConfirm}
        title="Conferma Iscrizione"
        message="Sei sicuro che questo lead ha firmato un contratto? Questa azione segnerà il lead come iscritto e registrerà la data di iscrizione."
        confirmText="Sì, ha firmato"
        cancelText="No, annulla"
        variant="warning"
      />

      {/* Edit Form Enrolled Confirmation Modal */}
      <ConfirmModal
        isOpen={showEditEnrolledConfirm}
        onClose={handleEditEnrolledCancel}
        onConfirm={handleEditEnrolledConfirm}
        title="Conferma Iscrizione"
        message="Sei sicuro che questo lead ha firmato un contratto? Questa azione segnerà il lead come iscritto e registrerà la data di iscrizione."
        confirmText="Sì, ha firmato"
        cancelText="No, annulla"
        variant="warning"
      />

      {/* Call Outcome Modal */}
      {showCallOutcomeModal && pendingContactedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Registra Chiamata</h2>
            
            {/* Call Attempt Tracking Info */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Tentativo #{(pendingContactedLead.callAttempts || 0) + 1} di 8
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  (pendingContactedLead.callAttempts || 0) >= 6 
                    ? 'bg-red-100 text-red-700' 
                    : (pendingContactedLead.callAttempts || 0) >= 4 
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                }`}>
                  {8 - (pendingContactedLead.callAttempts || 0) - 1} tentativi rimanenti
                </span>
              </div>
              {pendingContactedLead.firstAttemptAt && (
                <div className="mt-2 text-xs text-gray-500">
                  Primo tentativo: {new Date(pendingContactedLead.firstAttemptAt).toLocaleDateString('it-IT')}
                  {(() => {
                    const daysSinceFirst = Math.floor((Date.now() - new Date(pendingContactedLead.firstAttemptAt!).getTime()) / (1000 * 60 * 60 * 24));
                    const daysRemaining = 15 - daysSinceFirst;
                    return daysRemaining > 0 
                      ? ` (${daysRemaining} giorni prima di auto-PERSO)` 
                      : ' (limite 15 giorni superato!)';
                  })()}
                </div>
              )}
              {(pendingContactedLead.callAttempts || 0) >= 7 && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  Attenzione: questo è l&apos;ultimo tentativo! Se non risponde, il lead diventerà PERSO.
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Seleziona l&apos;esito della chiamata per <strong>{pendingContactedLead.name}</strong>
            </p>
            <form onSubmit={handleCallOutcomeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Esito <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "POSITIVO", label: "Interessato", color: "green", icon: CheckCircle },
                    { value: "NEGATIVO", label: "Non Interessato", color: "red", icon: XCircle },
                    { value: "RICHIAMARE", label: "Richiamare", color: "yellow", icon: Phone },
                    { value: "NON_RISPONDE", label: "Non Risponde", color: "gray", icon: HelpCircle },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCallOutcomeData({ ...callOutcomeData, callOutcome: option.value })}
                      className={`p-3 rounded-lg border-2 transition text-sm font-medium flex items-center justify-center gap-2 ${
                        callOutcomeData.callOutcome === option.value
                          ? "border-commercial bg-commercial/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <option.icon size={16} />
                      {option.label}
                    </button>
                  ))}
                </div>
                {callOutcomeData.callOutcome === 'NEGATIVO' && (
                  <p className="mt-2 text-xs text-red-600">
                    Il lead sarà automaticamente segnato come PERSO.
                  </p>
                )}
                {(callOutcomeData.callOutcome === 'NON_RISPONDE' || callOutcomeData.callOutcome === 'RICHIAMARE') && 
                 (pendingContactedLead.callAttempts || 0) >= 7 && (
                  <p className="mt-2 text-xs text-red-600">
                    Il lead sarà automaticamente segnato come PERSO (8° tentativo).
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (opzionale)
                </label>
                <textarea
                  value={callOutcomeData.outcomeNotes}
                  onChange={(e) => setCallOutcomeData({ ...callOutcomeData, outcomeNotes: e.target.value })}
                  rows={2}
                  placeholder="Aggiungi note sulla chiamata..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCallOutcomeCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!callOutcomeData.callOutcome}
                  className="flex-1 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salva Esito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
