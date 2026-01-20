"use client";

import { useState, useEffect } from "react";
import { KanbanBoard } from "@/components/ui/KanbanBoard";
import {
  LayoutGrid,
  List,
  X,
  Search,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Phone,
  Mail,
  User,
  Pencil,
} from "lucide-react";

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
}

interface Course {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  name: string;
  role: string;
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

export default function AdminPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [commercials, setCommercials] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterCommercial, setFilterCommercial] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");

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
      setCampaigns(campaignsData);
      setCommercials(usersData.filter((u: UserData) => u.role === "COMMERCIAL"));
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (filterCourse && lead.course?.id !== filterCourse) return false;
    if (filterCommercial && lead.assignedTo?.id !== filterCommercial) return false;
    if (filterCampaign && lead.campaign?.id !== filterCampaign) return false;
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
      // Revert on error
      fetchData();
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const getStats = () => {
    const total = filteredLeads.length;
    const nuovo = filteredLeads.filter((l) => l.status === "NUOVO").length;
    const contattato = filteredLeads.filter((l) => l.status === "CONTATTATO").length;
    const inTrattativa = filteredLeads.filter((l) => l.status === "IN_TRATTATIVA").length;
    const iscritto = filteredLeads.filter((l) => l.status === "ISCRITTO").length;
    const perso = filteredLeads.filter((l) => l.status === "PERSO").length;
    const conversionRate = total > 0 ? ((iscritto / total) * 100).toFixed(1) : "0";

    return { total, nuovo, contattato, inTrattativa, iscritto, perso, conversionRate };
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
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Lead</h1>
          <p className="text-gray-500">{filteredLeads.length} lead totali</p>
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
            <CheckCircle size={16} />
            Iscritti
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.iscritto}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
            <XCircle size={16} />
            Persi
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.perso}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <TrendingUp size={16} />
            Conversione
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutti i corsi</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <select
            value={filterCommercial}
            onChange={(e) => setFilterCommercial(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutti i commerciali</option>
            {commercials.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutte le campagne</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          {(filterCourse || filterCommercial || filterCampaign) && (
            <button
              onClick={() => {
                setFilterCourse("");
                setFilterCommercial("");
                setFilterCampaign("");
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
                <th className="p-4 font-medium">Commerciale</th>
                <th className="p-4 font-medium">Stato</th>
                <th className="p-4 font-medium">Contattato</th>
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
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={14} />
                              {lead.email}
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
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleLeadClick(lead)}
                      className="p-2 text-gray-500 hover:text-admin transition"
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
      {selectedLead && (
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
                  <p className="text-xs text-gray-500 mb-1">Commerciale</p>
                  <p className="text-sm font-medium">{selectedLead.assignedTo?.name || "Non assegnato"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Campagna</p>
                  <p className="text-sm font-medium">{selectedLead.campaign?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data Creazione</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedLead.createdAt).toLocaleDateString("it-IT")}
                  </p>
                </div>
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

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
