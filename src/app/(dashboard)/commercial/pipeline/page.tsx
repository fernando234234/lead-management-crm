"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { KanbanBoard } from "@/components/ui/KanbanBoard";
import {
  LayoutGrid,
  List,
  X,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Phone,
  User,
  Pencil,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";

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
  course: { id: string; name: string; price: number } | null;
  campaign: { id: string; name: string; platform?: string } | null;
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
}

const statusLabels: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

const statusColors: Record<string, string> = {
  NUOVO: "bg-blue-100 text-blue-700",
  CONTATTATO: "bg-yellow-100 text-yellow-700",
  IN_TRATTATIVA: "bg-purple-100 text-purple-700",
  ISCRITTO: "bg-green-100 text-green-700",
  PERSO: "bg-red-100 text-red-700",
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

export default function CommercialPipelinePage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterPerso, setFilterPerso] = useState<string>("active"); // active = hide PERSO

  // Outcome form
  const [outcomeData, setOutcomeData] = useState({
    callOutcome: "",
    outcomeNotes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, coursesRes, campaignsRes] = await Promise.all([
        fetch("/api/leads?assignedToMe=true"),
        fetch("/api/courses"),
        fetch("/api/campaigns"),
      ]);

      const [leadsData, coursesData, campaignsData] = await Promise.all([
        leadsRes.json(),
        coursesRes.json(),
        campaignsRes.json(),
      ]);

      // Filter leads assigned to current user
      const myLeads = leadsData.filter((lead: Lead) => lead.assignedTo?.id === session?.user?.id);
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
    if (filterCourse && lead.course?.id !== filterCourse) return false;
    if (filterCampaign && lead.campaign?.id !== filterCampaign) return false;
    // PERSO filter: "active" hides PERSO, "perso" shows only PERSO, "" shows all
    if (filterPerso === "active" && lead.status === "PERSO") return false;
    if (filterPerso === "perso" && lead.status !== "PERSO") return false;
    return true;
  });

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      fetchData();
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const openOutcomeModal = () => {
    if (!selectedLead) return;
    
    // Don't allow logging calls for PERSO or enrolled leads
    if (selectedLead.status === 'PERSO') {
      toast.error("Impossibile registrare chiamate per lead persi");
      return;
    }
    if (selectedLead.enrolled) {
      toast.error("Lead già iscritto");
      return;
    }
    
    setOutcomeData({
      callOutcome: "",  // Always start fresh, not pre-filled
      outcomeNotes: "",
    });
    setShowOutcomeModal(true);
  };

  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLead || !outcomeData.callOutcome) return;

    const now = new Date().toISOString();
    const newAttempts = (selectedLead.callAttempts || 0) + 1;
    
    // Determine if lead should become PERSO
    let newStatus = selectedLead.status === "NUOVO" ? "CONTATTATO" : selectedLead.status;
    if (outcomeData.callOutcome === 'NEGATIVO') {
      newStatus = 'PERSO';
    } else if ((outcomeData.callOutcome === 'NON_RISPONDE' || outcomeData.callOutcome === 'RICHIAMARE') && newAttempts >= 8) {
      newStatus = 'PERSO';
    }

    const updatedLead = {
      ...selectedLead,
      contacted: true,
      contactedAt: now,
      callOutcome: outcomeData.callOutcome,
      outcomeNotes: outcomeData.outcomeNotes || null,
      callAttempts: newAttempts,
      lastAttemptAt: now,
      firstAttemptAt: selectedLead.firstAttemptAt || now,
      status: newStatus,
    };

    try {
      await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacted: true,
          contactedAt: now,
          callOutcome: outcomeData.callOutcome,
          outcomeNotes: outcomeData.outcomeNotes || null,
        }),
      });
      
      // Show appropriate message
      if (outcomeData.callOutcome === 'NEGATIVO') {
        toast.success("Lead segnato come PERSO (non interessato)");
      } else if ((outcomeData.callOutcome === 'NON_RISPONDE' || outcomeData.callOutcome === 'RICHIAMARE') && newAttempts >= 8) {
        toast.success("Lead segnato come PERSO (8 tentativi raggiunti)");
      } else if (outcomeData.callOutcome === 'NON_RISPONDE' || outcomeData.callOutcome === 'RICHIAMARE') {
        toast.success(`Chiamata #${newAttempts} registrata - ${8 - newAttempts} tentativi rimanenti`);
      } else {
        toast.success("Esito chiamata registrato");
      }
      
      setSelectedLead(updatedLead);
      setShowOutcomeModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to log call outcome:", error);
      toast.error("Errore nel salvataggio");
    }
  };

  const getStats = () => {
    const total = filteredLeads.length;
    const nuovo = filteredLeads.filter((l) => l.status === "NUOVO").length;
    const contattato = filteredLeads.filter((l) => l.status === "CONTATTATO").length;
    const inTrattativa = filteredLeads.filter((l) => l.status === "IN_TRATTATIVA").length;

    return { total, nuovo, contattato, inTrattativa };
  };

  const stats = getStats();

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">La Mia Pipeline</h1>
          <p className="text-gray-500">{filteredLeads.length} lead assegnati a te</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === "kanban"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid size={16} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List size={16} />
              Tabella
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary - Task-related counts only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users size={16} />
            Totali
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
            <Clock size={16} />
            Nuovi
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.nuovo}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
            <Phone size={16} />
            Contattati
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.contattato}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
            <TrendingUp size={16} />
            In Trattativa
          </div>
          <p className="text-2xl font-bold text-purple-600">{stats.inTrattativa}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
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
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="">Tutte le campagne</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <select
            value={filterPerso}
            onChange={(e) => setFilterPerso(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-commercial"
          >
            <option value="active">Attivi (no PERSO)</option>
            <option value="">Tutti</option>
            <option value="perso">Solo PERSO</option>
          </select>
          {(filterCourse || filterCampaign || filterPerso !== "active") && (
            <button
              onClick={() => {
                setFilterCourse("");
                setFilterCampaign("");
                setFilterPerso("active");
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={18} />
              Reset Filtri
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "kanban" ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <KanbanBoard
            leads={filteredLeads}
            onStatusChange={handleStatusChange}
            onLeadClick={handleLeadClick}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="p-4 font-medium">Lead</th>
                <th className="p-4 font-medium">Corso</th>
                <th className="p-4 font-medium">Stato</th>
                <th className="p-4 font-medium">Contattato</th>
                <th className="p-4 font-medium">Esito</th>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-gray-50">
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
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}
                    >
                      {statusLabels[lead.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    {lead.contacted ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <Clock size={20} className="text-gray-300" />
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
                    <button
                      onClick={() => handleLeadClick(lead)}
                      className="p-2 text-gray-500 hover:text-commercial transition"
                    >
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLeads.length === 0 && (
            <div className="p-8 text-center text-gray-500">Nessun lead trovato</div>
          )}
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && !showOutcomeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Dettagli Lead</h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Lead Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <User size={32} className="text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {selectedLead.name}
                    {selectedLead.isTarget && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                        Target
                      </span>
                    )}
                  </h3>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedLead.status]}`}
                  >
                    {statusLabels[selectedLead.status]}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium">{selectedLead.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Telefono</p>
                  <p className="text-sm font-medium">{selectedLead.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Corso</p>
                  <p className="text-sm font-medium">{selectedLead.course?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Campagna</p>
                  <p className="text-sm font-medium">{selectedLead.campaign?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Esito Ultima Chiamata</p>
                  {selectedLead.callOutcome ? (
                    <div className="flex items-center gap-1">
                      {outcomeIcons[selectedLead.callOutcome]}
                      <span className="text-sm font-medium">
                        {outcomeLabels[selectedLead.callOutcome]}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tentativi Chiamata</p>
                  <p className="text-sm font-medium">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      (selectedLead.callAttempts || 0) >= 6 
                        ? 'bg-red-100 text-red-700' 
                        : (selectedLead.callAttempts || 0) >= 4 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedLead.callAttempts || 0}/8
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data Creazione</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedLead.createdAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
                {selectedLead.lastAttemptAt && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ultima Chiamata</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedLead.lastAttemptAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Note</p>
                  <p className="text-sm">{selectedLead.notes}</p>
                </div>
              )}

              {/* Status Change */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Cambia Stato</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        handleStatusChange(selectedLead.id, value);
                        setSelectedLead({ ...selectedLead, status: value });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        selectedLead.status === value
                          ? statusColors[value]
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Chiudi
              </button>
              {selectedLead.status !== 'PERSO' && !selectedLead.enrolled ? (
                <button
                  onClick={openOutcomeModal}
                  className="flex-1 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} />
                  Registra Chiamata ({selectedLead.callAttempts || 0}/8)
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} />
                  {selectedLead.enrolled ? "Già Iscritto" : "Lead Perso"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Outcome Modal */}
      {showOutcomeModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Registra Chiamata</h2>
            
            {/* Call Attempt Tracking Info */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Tentativo #{(selectedLead.callAttempts || 0) + 1} di 8
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  (selectedLead.callAttempts || 0) >= 6 
                    ? 'bg-red-100 text-red-700' 
                    : (selectedLead.callAttempts || 0) >= 4 
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                }`}>
                  {8 - (selectedLead.callAttempts || 0) - 1} tentativi rimanenti
                </span>
              </div>
              {selectedLead.lastAttemptAt && (
                <div className="mt-2 text-xs text-gray-500">
                  Ultima chiamata: {new Date(selectedLead.lastAttemptAt).toLocaleDateString('it-IT')}
                  {(() => {
                    const daysSinceLast = Math.floor((Date.now() - new Date(selectedLead.lastAttemptAt!).getTime()) / (1000 * 60 * 60 * 24));
                    const daysRemaining = 15 - daysSinceLast;
                    return daysRemaining > 0 
                      ? ` (${daysRemaining} giorni prima di auto-PERSO)` 
                      : ' (limite 15 giorni superato!)';
                  })()}
                </div>
              )}
              {(selectedLead.callAttempts || 0) >= 7 && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  Attenzione: questo è l&apos;ultimo tentativo! Se non risponde, il lead diventerà PERSO.
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">Lead: <strong>{selectedLead.name}</strong></p>
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
                      onClick={() => setOutcomeData({ ...outcomeData, callOutcome: value })}
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
                {outcomeData.callOutcome === 'NEGATIVO' && (
                  <p className="mt-2 text-xs text-red-600">
                    Il lead sarà automaticamente segnato come PERSO.
                  </p>
                )}
                {(outcomeData.callOutcome === 'NON_RISPONDE' || outcomeData.callOutcome === 'RICHIAMARE') && 
                 (selectedLead.callAttempts || 0) >= 7 && (
                  <p className="mt-2 text-xs text-red-600">
                    Il lead sarà automaticamente segnato come PERSO (8° tentativo).
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={outcomeData.outcomeNotes}
                  onChange={(e) => setOutcomeData({ ...outcomeData, outcomeNotes: e.target.value })}
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
    </div>
  );
}
