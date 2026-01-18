"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockLeads, mockCourses } from "@/lib/mockData";
import {
  Pencil,
  Phone,
  Mail,
  User,
  Search,
  X,
  CheckCircle,
  Clock,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  TestTube,
  Eye,
  Inbox,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "@/components/ui/Pagination";
import LeadDetailModal from "@/components/ui/LeadDetailModal";
import EmptyState from "@/components/ui/EmptyState";

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
  course: { id: string; name: string; price?: number } | null;
  campaign: { id: string; name: string; platform?: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
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

const outcomeColors: Record<string, string> = {
  POSITIVO: "bg-green-100 text-green-700",
  NEGATIVO: "bg-red-100 text-red-700",
  RICHIAMARE: "bg-yellow-100 text-yellow-700",
  NON_RISPONDE: "bg-gray-100 text-gray-700",
};

const outcomeIcons: Record<string, React.ReactNode> = {
  POSITIVO: <CheckCircle size={14} className="text-green-600" />,
  NEGATIVO: <PhoneOff size={14} className="text-red-600" />,
  RICHIAMARE: <PhoneCall size={14} className="text-yellow-600" />,
  NON_RISPONDE: <PhoneMissed size={14} className="text-gray-600" />,
};

export default function CommercialLeadsPage() {
  const { data: session } = useSession();
  const { isDemoMode } = useDemoMode();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForOutcome, setSelectedLeadForOutcome] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCourse, setFilterCourse] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Form data for editing
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    status: "NUOVO",
    contacted: false,
    callOutcome: "",
    outcomeNotes: "",
    isTarget: false,
    enrolled: false,
  });

  // Outcome form
  const [outcomeData, setOutcomeData] = useState({
    callOutcome: "",
    outcomeNotes: "",
  });

  // Create lead form
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    campaignId: "",
    notes: "",
  });

  // Demo user ID (simulating a commercial user)
  const demoUserId = "1"; // Marco Verdi in mockData

  useEffect(() => {
    if (isDemoMode) {
      // Filter leads assigned to current user (demo: user ID "1")
      const myLeads = mockLeads.filter(
        (lead) => lead.assignedTo?.id === demoUserId
      ) as Lead[];
      setLeads(myLeads);
      setCourses(mockCourses.map((c) => ({ id: c.id, name: c.name })));
      setLoading(false);
    } else {
      fetchData();
    }
  }, [isDemoMode]);

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
        (lead: Lead) => 
          lead.assignedTo?.id === session?.user?.id ||
          (lead as Lead & { createdBy?: { id: string } }).createdBy?.id === session?.user?.id
      );
      setLeads(myLeads);
      setCourses(coursesData);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (
      search &&
      !lead.name.toLowerCase().includes(search.toLowerCase()) &&
      !lead.email?.toLowerCase().includes(search.toLowerCase()) &&
      !lead.phone?.includes(search)
    ) {
      return false;
    }
    if (filterStatus && lead.status !== filterStatus) return false;
    if (filterCourse && lead.course?.id !== filterCourse) return false;
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
  }, [search, filterStatus, filterCourse]);

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      notes: lead.notes || "",
      status: lead.status,
      contacted: lead.contacted,
      callOutcome: lead.callOutcome || "",
      outcomeNotes: lead.outcomeNotes || "",
      isTarget: lead.isTarget || false,
      enrolled: lead.enrolled || false,
    });
    setShowModal(true);
  };

  const openOutcomeModal = (lead: Lead) => {
    setSelectedLeadForOutcome(lead);
    setOutcomeData({
      callOutcome: lead.callOutcome || "",
      outcomeNotes: lead.outcomeNotes || "",
    });
    setShowOutcomeModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingLead) return;

    if (isDemoMode) {
      setLeads(
        leads.map((l) =>
          l.id === editingLead.id
            ? {
                ...l,
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                notes: formData.notes || null,
                status: formData.status,
                contacted: formData.contacted,
                contactedAt: formData.contacted ? new Date().toISOString() : l.contactedAt,
                callOutcome: formData.callOutcome || null,
                outcomeNotes: formData.outcomeNotes || null,
              }
            : l
        )
      );
      setShowModal(false);
      return;
    }

    try {
      await fetch(`/api/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          status: formData.status,
          contacted: formData.contacted,
          callOutcome: formData.callOutcome || null,
          outcomeNotes: formData.outcomeNotes || null,
          isTarget: formData.isTarget,
          enrolled: formData.enrolled,
        }),
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to update lead:", error);
    }
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLeadForOutcome) return;

    if (isDemoMode) {
      setLeads(
        leads.map((l) =>
          l.id === selectedLeadForOutcome.id
            ? {
                ...l,
                contacted: true,
                contactedAt: new Date().toISOString(),
                callOutcome: outcomeData.callOutcome || null,
                outcomeNotes: outcomeData.outcomeNotes || null,
                status: l.status === "NUOVO" ? "CONTATTATO" : l.status,
              }
            : l
        )
      );
      setShowOutcomeModal(false);
      return;
    }

    try {
      await fetch(`/api/leads/${selectedLeadForOutcome.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacted: true,
          callOutcome: outcomeData.callOutcome || null,
          outcomeNotes: outcomeData.outcomeNotes || null,
          status: selectedLeadForOutcome.status === "NUOVO" ? "CONTATTATO" : undefined,
        }),
      });
      setShowOutcomeModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to log call outcome:", error);
    }
  };

  const handleQuickStatusUpdate = async (id: string, status: string) => {
    if (isDemoMode) {
      setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)));
      return;
    }

    try {
      await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const markAsContacted = async (lead: Lead) => {
    if (isDemoMode) {
      setLeads(
        leads.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                contacted: true,
                contactedAt: new Date().toISOString(),
                status: l.status === "NUOVO" ? "CONTATTATO" : l.status,
              }
            : l
        )
      );
      return;
    }

    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacted: true,
          status: lead.status === "NUOVO" ? "CONTATTATO" : undefined,
        }),
      });
      fetchData();
    } catch (error) {
      console.error("Failed to mark as contacted:", error);
    }
  };

  const handleLeadUpdate = async (leadId: string, data: Partial<Lead>) => {
    if (isDemoMode) {
      setLeads(leads.map(l => l.id === leadId ? { ...l, ...data } : l));
      if (detailLead?.id === leadId) {
        setDetailLead({ ...detailLead, ...data } as Lead);
      }
      return;
    }

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

    if (isDemoMode) {
      const newLead: Lead = {
        id: `demo-${Date.now()}`,
        name: createFormData.name,
        email: createFormData.email || null,
        phone: createFormData.phone || null,
        status: "NUOVO",
        contacted: false,
        contactedAt: null,
        enrolled: false,
        enrolledAt: null,
        isTarget: false,
        notes: createFormData.notes || null,
        callOutcome: null,
        outcomeNotes: null,
        createdAt: new Date().toISOString(),
        course: courses.find(c => c.id === createFormData.courseId) ? { id: createFormData.courseId, name: courses.find(c => c.id === createFormData.courseId)!.name } : null,
        campaign: campaigns.find(c => c.id === createFormData.campaignId) ? { id: createFormData.campaignId, name: campaigns.find(c => c.id === createFormData.campaignId)!.name } : null,
        assignedTo: session?.user ? { id: session.user.id, name: session.user.name || "", email: session.user.email || "" } : null,
      };
      setLeads([newLead, ...leads]);
      setShowCreateModal(false);
      setCreateFormData({ name: "", email: "", phone: "", courseId: "", campaignId: "", notes: "" });
      toast.success("Lead creato con successo!");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createFormData.name,
          email: createFormData.email || null,
          phone: createFormData.phone || null,
          courseId: createFormData.courseId,
          campaignId: createFormData.campaignId,
          assignedToId: session?.user?.id,
          createdById: session?.user?.id,
          notes: createFormData.notes || null,
          source: "MANUAL",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create lead");
      }

      setShowCreateModal(false);
      setCreateFormData({ name: "", email: "", phone: "", courseId: "", campaignId: "", notes: "" });
      toast.success("Lead creato con successo!");
      fetchData();
    } catch (error) {
      console.error("Failed to create lead:", error);
      toast.error("Errore nella creazione del lead");
    } finally {
      setCreating(false);
    }
  };

  // Filter campaigns by selected course
  const filteredCampaigns = createFormData.courseId 
    ? campaigns.filter(c => c.course?.id === createFormData.courseId)
    : campaigns;

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
          {isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <TestTube size={16} />
              Demo
            </div>
          )}
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
                placeholder="Cerca per nome, email, telefono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
          {(search || filterStatus || filterCourse) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterStatus("");
                setFilterCourse("");
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
                <th>Stato</th>
                <th className="text-center">Contattato</th>
                <th>Esito</th>
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
                      <p className="font-medium flex items-center gap-2">
                        {lead.name}
                        {lead.isTarget && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                            Target
                          </span>
                        )}
                      </p>
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
                  <select
                    value={lead.status}
                    onChange={(e) => handleQuickStatusUpdate(lead.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${statusColors[lead.status]}`}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  {lead.contacted ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle size={20} className="text-green-500" />
                      <span className="text-xs text-gray-500">
                        {lead.contactedAt
                          ? new Date(lead.contactedAt).toLocaleDateString("it-IT")
                          : ""}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => markAsContacted(lead)}
                      className="flex items-center gap-1 text-sm text-commercial hover:underline"
                    >
                      <Clock size={16} className="text-gray-400" />
                      Segna contattato
                    </button>
                  )}
                </td>
                <td className="p-4">
                  {lead.callOutcome ? (
                    <div className="flex items-center gap-1">
                      {outcomeIcons[lead.callOutcome]}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${outcomeColors[lead.callOutcome]}`}
                      >
                        {outcomeLabels[lead.callOutcome]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
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
                    <button
                      onClick={() => openOutcomeModal(lead)}
                      className="p-2 text-gray-500 hover:text-commercial transition"
                      title="Registra esito chiamata"
                    >
                      <PhoneCall size={18} />
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
      {showModal && editingLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Modifica Lead
              {isDemoMode && (
                <span className="ml-2 text-sm font-normal text-purple-600">(Demo)</span>
              )}
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.contacted}
                    onChange={(e) =>
                      setFormData({ ...formData, contacted: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Contattato</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isTarget}
                    onChange={(e) =>
                      setFormData({ ...formData, isTarget: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-orange-600 font-medium">Lead Target</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enrolled}
                    onChange={(e) =>
                      setFormData({ ...formData, enrolled: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-green-600 font-medium">Iscritto</span>
                </label>
              </div>
              {formData.contacted && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Esito Chiamata
                    </label>
                    <select
                      value={formData.callOutcome}
                      onChange={(e) =>
                        setFormData({ ...formData, callOutcome: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                    >
                      <option value="">Seleziona esito</option>
                      {Object.entries(outcomeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note Esito
                    </label>
                    <input
                      type="text"
                      value={formData.outcomeNotes}
                      onChange={(e) =>
                        setFormData({ ...formData, outcomeNotes: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                />
              </div>
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
                  className="flex-1 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call Outcome Modal */}
      {showOutcomeModal && selectedLeadForOutcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Registra Esito Chiamata</h2>
            <p className="text-gray-500 mb-4">Lead: {selectedLeadForOutcome.name}</p>
            <form onSubmit={handleOutcomeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Esito della chiamata
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(outcomeLabels).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setOutcomeData({ ...outcomeData, callOutcome: value })
                      }
                      className={`p-3 rounded-lg border-2 transition flex items-center gap-2 ${
                        outcomeData.callOutcome === value
                          ? "border-commercial bg-commercial/10"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {outcomeIcons[value]}
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={outcomeData.outcomeNotes}
                  onChange={(e) =>
                    setOutcomeData({ ...outcomeData, outcomeNotes: e.target.value })
                  }
                  placeholder="Aggiungi note sulla chiamata..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!outcomeData.callOutcome}
                  className="flex-1 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salva Esito
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
          isDemoMode={isDemoMode}
          accentColor="commercial"
        />
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Nuovo Lead
                {isDemoMode && (
                  <span className="ml-2 text-sm font-normal text-purple-600">(Demo)</span>
                )}
              </h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    placeholder="email@esempio.it"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                    placeholder="+39 123 456 7890"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corso <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createFormData.courseId}
                  onChange={(e) => setCreateFormData({ 
                    ...createFormData, 
                    courseId: e.target.value,
                    campaignId: "" // Reset campaign when course changes
                  })}
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
                  <option value="">
                    {createFormData.courseId ? "Seleziona una campagna" : "Seleziona prima un corso"}
                  </option>
                  {filteredCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.platform})
                    </option>
                  ))}
                </select>
                {createFormData.courseId && filteredCampaigns.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Nessuna campagna attiva per questo corso. Contatta il marketing.
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
    </div>
  );
}
