"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCampaigns, mockLeads } from "@/lib/mockData";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users,
  Filter,
  Search,
  Megaphone,
  TrendingUp,
  Euro,
  TestTube,
  ChevronDown,
  ChevronRight,
  Pencil,
  Eye,
} from "lucide-react";
import ExportButton from "@/components/ui/ExportButton";
import LeadDetailModal from "@/components/ui/LeadDetailModal";

// Export columns configuration
const leadExportColumns = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
  { key: "status", label: "Stato" },
  { key: "campaign.name", label: "Campagna" },
  { key: "campaign.platform", label: "Piattaforma" },
  { key: "acquisitionCost", label: "Costo Acquisizione" },
  { key: "createdAt", label: "Data Creazione" },
];

// Platform options
const platformOptions = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "TIKTOK", label: "TikTok" },
];

// Status options for leads
const statusOptions = [
  { value: "", label: "Tutti gli stati" },
  { value: "NUOVO", label: "Nuovo" },
  { value: "CONTATTATO", label: "Contattato" },
  { value: "IN_TRATTATIVA", label: "In Trattativa" },
  { value: "ISCRITTO", label: "Iscritto" },
  { value: "PERSO", label: "Perso" },
];

const statusColors: Record<string, string> = {
  NUOVO: "bg-blue-100 text-blue-700",
  CONTATTATO: "bg-yellow-100 text-yellow-700",
  IN_TRATTATIVA: "bg-purple-100 text-purple-700",
  ISCRITTO: "bg-green-100 text-green-700",
  PERSO: "bg-red-100 text-red-700",
};

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
  acquisitionCost: number;
  createdAt: string;
  campaign: {
    id: string;
    name: string;
    platform?: string;
  } | null;
  course: {
    id: string;
    name: string;
    price?: number;
  } | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  totalSpent?: number;
  cost?: number;
  leadCount?: number;
  metrics?: {
    totalLeads: number;
  };
}

interface GroupedLeads {
  campaign: Campaign;
  leads: Lead[];
  cpl: number;
}

export default function MarketingLeadsPage() {
  const { isDemoMode } = useDemoMode();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  
  // Edit/Detail modal state
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "NUOVO",
    notes: "",
    isTarget: false,
    acquisitionCost: "",
  });

  useEffect(() => {
    if (isDemoMode) {
      setLeads(mockLeads as Lead[]);
      setCampaigns(mockCampaigns as Campaign[]);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [isDemoMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, campaignsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/campaigns"),
      ]);

      const [leadsData, campaignsData] = await Promise.all([
        leadsRes.json(),
        campaignsRes.json(),
      ]);

      setLeads(leadsData);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCampaign =
        !filterCampaign || lead.campaign?.id === filterCampaign;
      const matchesStatus = !filterStatus || lead.status === filterStatus;
      return matchesSearch && matchesCampaign && matchesStatus;
    });
  }, [leads, searchTerm, filterCampaign, filterStatus]);

  // Group leads by campaign
  const groupedLeads = useMemo((): GroupedLeads[] => {
    const groups: Record<string, GroupedLeads> = {};

    filteredLeads.forEach((lead) => {
      if (lead.campaign) {
        const campaignId = lead.campaign.id;
        if (!groups[campaignId]) {
          const campaign = campaigns.find((c) => c.id === campaignId);
          if (campaign) {
            groups[campaignId] = {
              campaign,
              leads: [],
              cpl: 0,
            };
          }
        }
        if (groups[campaignId]) {
          groups[campaignId].leads.push(lead);
        }
      }
    });

    // Calculate CPL for each group
    Object.values(groups).forEach((group) => {
      const totalSpent = group.campaign.totalSpent || group.campaign.cost || 0;
      const leadCount = group.leads.length;
      group.cpl = leadCount > 0 ? totalSpent / leadCount : 0;
    });

    return Object.values(groups).sort((a, b) => b.leads.length - a.leads.length);
  }, [filteredLeads, campaigns]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const totalCost = filteredLeads.reduce(
      (sum, lead) => sum + (lead.acquisitionCost || 0),
      0
    );
    const avgCpl = totalLeads > 0 ? totalCost / totalLeads : 0;
    const uniqueCampaigns = new Set(
      filteredLeads.map((l) => l.campaign?.id).filter(Boolean)
    ).size;

    return {
      totalLeads,
      totalCost,
      avgCpl,
      uniqueCampaigns,
    };
  }, [filteredLeads]);

  const getPlatformLabel = (platform: string) => {
    return platformOptions.find((p) => p.value === platform)?.label || platform;
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find((s) => s.value === status)?.label || status;
  };

  const toggleCampaignExpanded = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCampaigns(new Set(groupedLeads.map((g) => g.campaign.id)));
  };

  const collapseAll = () => {
    setExpandedCampaigns(new Set());
  };

  // Open edit modal
  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status,
      notes: lead.notes || "",
      isTarget: lead.isTarget,
      acquisitionCost: lead.acquisitionCost ? String(lead.acquisitionCost) : "",
    });
    setShowEditModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    const acquisitionCostValue = formData.acquisitionCost 
      ? parseFloat(formData.acquisitionCost) 
      : null;

    if (isDemoMode) {
      setLeads(
        leads.map((l) =>
          l.id === editingLead.id
            ? {
                ...l,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                status: formData.status,
                notes: formData.notes,
                isTarget: formData.isTarget,
                acquisitionCost: acquisitionCostValue || 0,
              }
            : l
        )
      );
      setShowEditModal(false);
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
          status: formData.status,
          notes: formData.notes || null,
          isTarget: formData.isTarget,
          acquisitionCost: acquisitionCostValue,
        }),
      });
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to update lead:", error);
    }
  };

  // Handle lead update from detail modal
  const handleLeadUpdate = async (leadId: string, data: Partial<Lead>) => {
    if (isDemoMode) {
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, ...data } : l)));
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

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead per Campagna</h1>
          <p className="text-gray-500">Visualizza i lead raggruppati per campagna</p>
        </div>
        <div className="flex items-center gap-3">
          {isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <TestTube size={16} />
              Demo
            </div>
          )}
          <ExportButton
            data={filteredLeads}
            columns={leadExportColumns}
            filename="lead_campagne_export"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Lead Totali"
          value={stats.totalLeads}
          icon={Users}
        />
        <StatCard
          title="Campagne"
          value={stats.uniqueCampaigns}
          icon={Megaphone}
        />
        <StatCard
          title="Costo Totale"
          value={`€${stats.totalCost.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`}
          icon={Euro}
        />
        <StatCard
          title="CPL Medio"
          value={`€${stats.avgCpl.toFixed(2)}`}
          icon={TrendingUp}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtri:</span>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cerca lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
            />
          </div>
          <select
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
          >
            <option value="">Tutte le campagne</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expand/Collapse buttons */}
      <div className="flex gap-2">
        <button
          onClick={expandAll}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition"
        >
          Espandi tutto
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50 transition"
        >
          Comprimi tutto
        </button>
      </div>

      {/* Grouped Leads */}
      <div className="space-y-4">
        {groupedLeads.map((group) => (
          <div
            key={group.campaign.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Campaign Header */}
            <button
              onClick={() => toggleCampaignExpanded(group.campaign.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-marketing/10 rounded-lg">
                  <Megaphone size={20} className="text-marketing" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    {group.campaign.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      {getPlatformLabel(group.campaign.platform)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {group.leads.length} lead
                    </span>
                    <span className="text-sm text-gray-500">
                      CPL: €{group.cpl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {expandedCampaigns.has(group.campaign.id) ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>

            {/* Leads Table */}
            {expandedCampaigns.has(group.campaign.id) && (
              <div className="border-t">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 bg-gray-50 border-b">
                      <th className="p-3 font-medium">Nome</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Stato</th>
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium">Costo Acq.</th>
                      <th className="p-3 font-medium">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.leads.map((lead) => (
                      <tr key={lead.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {lead.name}
                            {lead.isTarget && (
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                                Target
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">{lead.email}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              statusColors[lead.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {getStatusLabel(lead.status)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                        </td>
                        <td className="p-3 font-medium">
                          €{(lead.acquisitionCost || 0).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDetailLead(lead)}
                              className="p-1.5 text-gray-500 hover:text-marketing transition"
                              title="Dettagli"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(lead)}
                              className="p-1.5 text-gray-500 hover:text-marketing transition"
                              title="Modifica"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {groupedLeads.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
            Nessun lead trovato con i filtri selezionati
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingLead && (
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Acquisizione (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.acquisitionCost}
                  onChange={(e) => setFormData({ ...formData, acquisitionCost: e.target.value })}
                  placeholder="Es: 25.50"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Costo effettivo per acquisire questo lead
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTarget"
                  checked={formData.isTarget}
                  onChange={(e) => setFormData({ ...formData, isTarget: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isTarget" className="text-sm text-gray-700">
                  Lead Target (prioritario)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
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
                  className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition"
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
          isDemoMode={isDemoMode}
          accentColor="marketing"
        />
      )}
    </div>
  );
}
