"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  X,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import EmptyState from "@/components/ui/EmptyState";
import SpendRecordList, { SpendRecord } from "@/components/ui/SpendRecordList";
import SpendRecordModal from "@/components/ui/SpendRecordModal";
import { SpendRecordFormData } from "@/components/ui/SpendRecordForm";
import {
  PLATFORM_OPTIONS,
  getPlatformLabel,
  getPlatformColor,
  DEFAULT_PLATFORM,
} from "@/lib/platforms";

// Status options matching Prisma enum
const statusOptions = [
  { value: "DRAFT", label: "Bozza", color: "bg-gray-100 text-gray-600" },
  { value: "ACTIVE", label: "Attiva", color: "bg-green-100 text-green-700" },
  { value: "PAUSED", label: "In Pausa", color: "bg-yellow-100 text-yellow-700" },
  { value: "COMPLETED", label: "Completata", color: "bg-blue-100 text-blue-700" },
];

// Export columns configuration
const campaignExportColumns = [
  { key: "name", label: "Nome" },
  { key: "platform", label: "Piattaforma" },
  { key: "course.name", label: "Corso" },
  { key: "totalSpent", label: "Spesa Totale" },
  { key: "leadCount", label: "Lead" },
  { key: "costPerLead", label: "CPL" },
  { key: "status", label: "Stato" },
  { key: "createdAt", label: "Data Creazione" },
];

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number; // Legacy
  totalSpent: number; // From CampaignSpend records
  status: string;
  createdAt: string;
  course: { id: string; name: string; price?: number } | null;
  createdBy?: { id: string; name: string; email?: string } | null;
  costPerLead?: number;
  leadCount?: number;
  metrics?: {
    totalLeads: number;
    contactedLeads: number;
    enrolledLeads: number;
    costPerLead: string;
    conversionRate: string;
  };
}

interface Course {
  id: string;
  name: string;
}

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  // Modal tabs: 'details' or 'spend'
  const [modalTab, setModalTab] = useState<"details" | "spend">("details");
  
  // Spend management state
  const [spendRecords, setSpendRecords] = useState<SpendRecord[]>([]);
  const [loadingSpendRecords, setLoadingSpendRecords] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [editingSpendRecord, setEditingSpendRecord] = useState<SpendRecord | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Pagination calculations
  const totalPages = Math.ceil(campaigns.length / pageSize);
  const paginatedCampaigns = campaigns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const [formData, setFormData] = useState({
    name: "",
    platform: "META",
    courseId: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, coursesRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/courses"),
      ]);

      const [campaignsData, coursesData] = await Promise.all([
        campaignsRes.json(),
        coursesRes.json(),
      ]);

      setCampaigns(campaignsData);
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  // Fetch spend records for a campaign
  const fetchSpendRecords = async (campaignId: string) => {
    setLoadingSpendRecords(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/spend`);
      const data = await res.json();
      setSpendRecords(data.records || []);
    } catch (error) {
      console.error("Failed to fetch spend records:", error);
      toast.error("Errore nel caricamento dei record di spesa");
    } finally {
      setLoadingSpendRecords(false);
    }
  };

  // Add or update a spend record
  const handleSaveSpendRecord = async (data: SpendRecordFormData) => {
    if (!editingCampaign) return;

    try {
      if (editingSpendRecord) {
        // Update existing record
        await fetch(`/api/campaigns/${editingCampaign.id}/spend?spendId=${editingSpendRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast.success("Spesa aggiornata");
      } else {
        // Create new record
        await fetch(`/api/campaigns/${editingCampaign.id}/spend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        toast.success("Spesa aggiunta");
      }
      // Refresh spend records and campaigns
      await fetchSpendRecords(editingCampaign.id);
      fetchData();
    } catch (error) {
      console.error("Failed to save spend record:", error);
      toast.error("Errore nel salvataggio della spesa");
      throw error;
    }
  };

  // Delete a spend record
  const handleDeleteSpendRecord = async (spendId: string) => {
    if (!editingCampaign) return;
    if (!confirm("Sei sicuro di voler eliminare questo record di spesa?")) return;

    try {
      await fetch(`/api/campaigns/${editingCampaign.id}/spend?spendId=${spendId}`, {
        method: "DELETE",
      });
      toast.success("Spesa eliminata");
      await fetchSpendRecords(editingCampaign.id);
      fetchData();
    } catch (error) {
      console.error("Failed to delete spend record:", error);
      toast.error("Errore nell'eliminazione della spesa");
    }
  };

  const openModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        platform: campaign.platform,
        courseId: campaign.course?.id || "",
        status: campaign.status,
      });
      // Fetch spend records for the campaign
      fetchSpendRecords(campaign.id);
      setModalTab("details");
    } else {
      setEditingCampaign(null);
      setFormData({
        name: "",
        platform: "META",
        courseId: courses[0]?.id || "",
        status: "ACTIVE",
      });
      setSpendRecords([]);
      setModalTab("details");
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCampaign(null);
    setSpendRecords([]);
    setModalTab("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      platform: formData.platform,
      courseId: formData.courseId,
      status: formData.status,
    };

    try {
      if (editingCampaign) {
        await fetch(`/api/campaigns/${editingCampaign.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Campagna aggiornata con successo");
      } else {
        await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Campagna creata con successo");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save campaign:", error);
      toast.error("Errore nel salvataggio della campagna");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa campagna?")) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Errore nell'eliminazione della campagna");
        return;
      }
      toast.success("Campagna eliminata");
      fetchData();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
      toast.error("Errore nell'eliminazione della campagna");
    }
  };

  // Helper to get metrics for a campaign
  const getLeadCount = (c: Campaign) => c.leadCount ?? c.metrics?.totalLeads ?? 0;
  const getEnrolledCount = (c: Campaign) => c.metrics?.enrolledLeads ?? 0;
  // Use totalSpent from CampaignSpend records
  const getTotalSpent = (c: Campaign) => Number(c.totalSpent) || 0;
  const getCostPerLead = (c: Campaign) => {
    if (c.costPerLead !== undefined) return c.costPerLead;
    const leads = getLeadCount(c);
    const spent = getTotalSpent(c);
    return leads > 0 ? spent / leads : 0;
  };
  const getConversionRate = (c: Campaign) => {
    if (c.metrics?.conversionRate) return parseFloat(c.metrics.conversionRate);
    const leads = getLeadCount(c);
    const enrolled = getEnrolledCount(c);
    return leads > 0 ? (enrolled / leads) * 100 : 0;
  };

  // Calculate totals
  const totals = campaigns.reduce(
    (acc, campaign) => ({
      spent: acc.spent + getTotalSpent(campaign),
      leads: acc.leads + getLeadCount(campaign),
      enrolled: acc.enrolled + getEnrolledCount(campaign),
    }),
    { spent: 0, leads: 0, enrolled: 0 }
  );

  const getStatusConfig = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[0];
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campagne Marketing</h1>
          <p className="text-gray-500">Gestisci le tue campagne pubblicitarie</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={campaigns.map(c => ({
              ...c,
              leadCount: getLeadCount(c),
              totalSpent: getTotalSpent(c),
              costPerLead: getCostPerLead(c),
            }))}
            columns={campaignExportColumns}
            filename="campagne_export"
          />
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Nuova Campagna
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-gray-300 rounded-full"></span>
          Metriche complessive (tutto il periodo)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-marketing/10 rounded-lg">
                <Megaphone size={24} className="text-marketing" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Campagne Attive</p>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === "ACTIVE").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Spesa Totale</p>
                <p className="text-2xl font-bold">€{totals.spent.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lead Totali</p>
                <p className="text-2xl font-bold">{totals.leads}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conv. Media</p>
                <p className="text-2xl font-bold">
                  {totals.leads > 0 ? ((totals.enrolled / totals.leads) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="p-4 font-medium">Campagna</th>
              <th className="p-4 font-medium">Piattaforma</th>
              <th className="p-4 font-medium">Corso</th>
              <th className="p-4 font-medium">Spesa Totale</th>
              <th className="p-4 font-medium">Lead</th>
              <th className="p-4 font-medium">CPL</th>
              <th className="p-4 font-medium">Stato</th>
              <th className="p-4 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCampaigns.map((campaign) => (
              <React.Fragment key={campaign.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setExpandedCampaign(
                            expandedCampaign === campaign.id ? null : campaign.id
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedCampaign === campaign.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                      <div className="p-2 bg-marketing/10 rounded-lg">
                        <Megaphone size={20} className="text-marketing" />
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(campaign.createdAt).toLocaleDateString("it-IT")}
                          {campaign.createdBy && (
                            <span className="ml-2 text-xs text-gray-400">
                              di {campaign.createdBy.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {getPlatformLabel(campaign.platform)}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{campaign.course?.name || "-"}</td>
                  <td className="p-4 font-medium text-blue-600">€{getTotalSpent(campaign).toLocaleString()}</td>
                  <td className="p-4">{getLeadCount(campaign)}</td>
                  <td className="p-4">€{getCostPerLead(campaign).toFixed(2)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        getStatusConfig(campaign.status).color
                      }`}
                    >
                      {getStatusConfig(campaign.status).label}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal(campaign)}
                        className="p-2 text-gray-500 hover:text-marketing transition"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition"
                        disabled={getLeadCount(campaign) > 0}
                        title={
                          getLeadCount(campaign) > 0
                            ? "Impossibile eliminare: campagna con lead"
                            : ""
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Expanded row for details */}
                {expandedCampaign === campaign.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Contattati</p>
                          <p className="font-semibold">
                            {campaign.metrics?.contactedLeads || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Iscritti</p>
                          <p className="font-semibold">{getEnrolledCount(campaign)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Conversione</p>
                          <p
                            className={`font-semibold ${
                              getConversionRate(campaign) > 10
                                ? "text-green-600"
                                : getConversionRate(campaign) > 5
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {getConversionRate(campaign).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Creata il</p>
                          <p className="font-semibold">
                            {new Date(campaign.createdAt).toLocaleDateString("it-IT")}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title="Nessuna campagna"
            description="Crea la tua prima campagna marketing per iniziare a generare lead."
            actionLabel="Nuova Campagna"
            onAction={() => openModal()}
            accentColor="marketing"
          />
        )}
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={campaigns.length}
          showInfo={true}
        />
      </div>

      {/* Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Show platform badge when editing */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">
                  {editingCampaign ? "Modifica Campagna" : "Nuova Campagna"}
                </h2>
                {editingCampaign && (
                  <span className={`px-2.5 py-1 text-sm font-medium rounded ${getPlatformColor(editingCampaign.platform)}`}>
                    {getPlatformLabel(editingCampaign.platform)}
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs (only show for editing) */}
            {editingCampaign && (
              <div className="flex border-b px-4">
                <button
                  onClick={() => setModalTab("details")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                    modalTab === "details"
                      ? "border-marketing text-marketing"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Dettagli
                </button>
                <button
                  onClick={() => setModalTab("spend")}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                    modalTab === "spend"
                      ? "border-marketing text-marketing"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Receipt size={16} />
                  Gestione Spese
                  {spendRecords.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-marketing/10 text-marketing rounded-full">
                      {spendRecords.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalTab === "details" ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Campagna *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                      placeholder="es. Facebook - Corso Excel Q1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Piattaforma *
                      </label>
                      <select
                        required
                        value={formData.platform}
                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                      >
                        {PLATFORM_OPTIONS.map((platform) => (
                          <option key={platform.value} value={platform.value}>
                            {platform.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Corso *
                      </label>
                      <select
                        required
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                      >
                        <option value="">Seleziona corso</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {editingCampaign && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Spesa Totale
                        </label>
                        <div className="px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 font-medium">
                          €{getTotalSpent(editingCampaign).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Vai su &quot;Gestione Spese&quot; per modificare
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stato *
                      </label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                      >
                        {statusOptions.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition"
                    >
                      {editingCampaign ? "Salva Modifiche" : "Crea Campagna"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Spend Management Tab */
                <div className="space-y-4">
                  {/* Platform-specific indicator */}
                  {editingCampaign && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Nota:</strong> Le spese vengono tracciate separatamente per ogni piattaforma. 
                        Stai gestendo le spese per <span className={`inline-flex px-2 py-0.5 mx-1 text-xs font-medium rounded ${getPlatformColor(editingCampaign.platform)}`}>{getPlatformLabel(editingCampaign.platform)}</span>.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Storico Spese {editingCampaign && `- ${getPlatformLabel(editingCampaign.platform)}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Registra le spese pubblicitarie per questa piattaforma
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingSpendRecord(null);
                        setShowSpendModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition text-sm"
                    >
                      <Plus size={16} />
                      Aggiungi Spesa
                    </button>
                  </div>

                  <SpendRecordList
                    records={spendRecords}
                    isLoading={loadingSpendRecords}
                    onEdit={(record) => {
                      setEditingSpendRecord(record);
                      setShowSpendModal(true);
                    }}
                    onDelete={handleDeleteSpendRecord}
                    emptyStateText="Nessuna spesa registrata per questa campagna"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spend Record Modal */}
      <SpendRecordModal
        isOpen={showSpendModal}
        onClose={() => {
          setShowSpendModal(false);
          setEditingSpendRecord(null);
        }}
        onSave={handleSaveSpendRecord}
        record={editingSpendRecord}
      />
    </div>
  );
}
