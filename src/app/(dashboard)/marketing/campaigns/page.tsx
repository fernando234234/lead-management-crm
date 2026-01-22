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
  Calendar,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import EmptyState from "@/components/ui/EmptyState";
import { SpendManagementModal } from "@/components/ui/SpendManagementModal";

// Platform options matching Prisma enum
const platformOptions = [
  { value: "META", label: "Meta (FB/IG)" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "TIKTOK", label: "TikTok" },
];

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
  { key: "budget", label: "Budget" },
  { key: "totalSpent", label: "Speso" },
  { key: "leadCount", label: "Lead" },
  { key: "costPerLead", label: "CPL" },
  { key: "status", label: "Stato" },
  { key: "startDate", label: "Data Inizio" },
];

interface SpendRecord {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  course: { id: string; name: string; price?: number } | null;
  createdBy?: { id: string; name: string; email?: string } | null;
  spendRecords?: SpendRecord[];
  totalSpent?: number;
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
  const [showSpendManagement, setShowSpendManagement] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaignForSpend, setSelectedCampaignForSpend] = useState<Campaign | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

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
    budget: "",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
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

  const openModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        platform: campaign.platform,
        courseId: campaign.course?.id || "",
        budget: String(campaign.budget || 0),
        status: campaign.status,
        startDate: campaign.startDate?.split("T")[0] || "",
        endDate: campaign.endDate?.split("T")[0] || "",
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: "",
        platform: "META",
        courseId: courses[0]?.id || "",
        budget: "",
        status: "ACTIVE",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
      });
    }
    setShowModal(true);
  };

  const openSpendModal = (campaign: Campaign) => {
    setSelectedCampaignForSpend(campaign);
    setShowSpendManagement(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      platform: formData.platform,
      courseId: formData.courseId,
      budget: parseFloat(formData.budget) || 0,
      status: formData.status,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
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
  const getTotalSpent = (c: Campaign) => c.totalSpent ?? Number(c.budget) ?? 0;
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

  const getPlatformLabel = (platform: string) => {
    return platformOptions.find((p) => p.value === platform)?.label || platform;
  };

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

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
              <th className="p-4 font-medium">Campagna</th>
              <th className="p-4 font-medium">Piattaforma</th>
              <th className="p-4 font-medium">Corso</th>
              <th className="p-4 font-medium">Budget</th>
              <th className="p-4 font-medium">Speso</th>
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
                          {new Date(campaign.startDate).toLocaleDateString("it-IT")}
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
                  <td className="p-4 font-medium">€{Number(campaign.budget).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="font-medium text-blue-600">
                      €{getTotalSpent(campaign).toLocaleString()}
                    </span>
                  </td>
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
                        onClick={() => openSpendModal(campaign)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition"
                        title="Aggiungi Spesa"
                      >
                        <DollarSign size={18} />
                      </button>
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
                {/* Expanded row for spend details */}
                {expandedCampaign === campaign.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={9} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                          <p className="text-xs text-gray-500 uppercase">Data Fine</p>
                          <p className="font-semibold">
                            {campaign.endDate
                              ? new Date(campaign.endDate).toLocaleDateString("it-IT")
                              : "In corso"}
                          </p>
                        </div>
                      </div>
                      {/* Spend Records */}
                      {campaign.spendRecords && campaign.spendRecords.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Storico Spese</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {campaign.spendRecords.slice(0, 5).map((spend) => (
                              <div
                                key={spend.id}
                                className="flex justify-between items-center text-sm bg-white p-2 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  <span>
                                    {new Date(spend.date).toLocaleDateString("it-IT")}
                                  </span>
                                  {spend.notes && (
                                    <span className="text-gray-400 text-xs">
                                      - {spend.notes}
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium">
                                  €{Number(spend.amount).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingCampaign ? "Modifica Campagna" : "Nuova Campagna"}
            </h2>
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
                    {platformOptions.map((platform) => (
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                    placeholder="1000"
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inizio
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fine
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                  />
                </div>
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
                  className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition"
                >
                  {editingCampaign ? "Salva Modifiche" : "Crea Campagna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spend Management Modal */}
      {showSpendManagement && selectedCampaignForSpend && (
        <SpendManagementModal
          campaign={selectedCampaignForSpend}
          onClose={() => {
            setShowSpendManagement(false);
            setSelectedCampaignForSpend(null);
          }}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
