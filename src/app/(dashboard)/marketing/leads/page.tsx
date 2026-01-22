"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { StatCard } from "@/components/ui/StatCard";
import {
  Users,
  Filter,
  Search,
  Megaphone,
  TrendingUp,
  Euro,
  ChevronDown,
  ChevronRight,
  Pencil,
  Eye,
  CheckSquare,
  Square,
  Minus,
  Zap,
  CheckCircle,
  XCircle,
  HelpCircle,
  Plus,
  X,
  Phone,
  Mail,
} from "lucide-react";
import ExportButton from "@/components/ui/ExportButton";
import LeadDetailModal from "@/components/ui/LeadDetailModal";
import { CostCoverage, CostCoverageInline, calculateCostMetrics } from "@/components/ui/CostCoverage";
import { BulkCostModal } from "@/components/ui/BulkCostModal";
import { QuickDistributeCostModal } from "@/components/ui/QuickDistributeCostModal";
import toast from "react-hot-toast";

// Tri-state type (removed, using boolean)

// Export columns configuration
const leadExportColumns = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
  { key: "contacted", label: "Contattato" },
  { key: "isTarget", label: "Target" },
  { key: "enrolled", label: "Iscritto" },
  { key: "campaign.name", label: "Campagna" },
  { key: "campaign.platform", label: "Piattaforma" },
  { key: "acquisitionCost", label: "Costo Acquisizione" },
  { key: "createdAt", label: "Data Creazione" },
];

// Platform options
const platformOptions = [
  { value: "META", label: "Meta (FB/IG)" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "TIKTOK", label: "TikTok" },
];

// Boolean display helpers
const booleanConfig = {
  true: { label: "Sì", color: "bg-green-100 text-green-700", icon: CheckCircle },
  false: { label: "No", color: "bg-red-100 text-red-700", icon: XCircle },
};

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

interface SpendRecord {
  id: string;
  date: string;
  amount: number;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status?: string;
  course?: {
    id: string;
    name: string;
  };
  totalSpent?: number;
  cost?: number;
  leadCount?: number;
  spendRecords?: SpendRecord[];
  metrics?: {
    totalLeads: number;
  };
}

interface GroupedLeads {
  campaign: Campaign;
  leads: Lead[];
  cpl: number;           // Estimated CPL from campaign budget
  cplEffettivo: number;  // Actual CPL from lead costs
  leadsWithCost: number;
  totalCost: number;
  costCoverage: number;
}

export default function MarketingLeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("");
  const [filterContattato, setFilterContattato] = useState<string>("");
  const [filterTarget, setFilterTarget] = useState<string>("");
  const [filterIscritto, setFilterIscritto] = useState<string>("");
  const [filterWithoutCost, setFilterWithoutCost] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  
  // Edit/Detail modal state
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create form data
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    phone: "",
    courseId: "",
    campaignId: "",
    notes: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    contacted: false,
    isTarget: false,
    enrolled: false,
    acquisitionCost: "",
  });
  
  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showBulkCostModal, setShowBulkCostModal] = useState(false);
  
  // Quick distribute modal state
  const [quickDistributeCampaign, setQuickDistributeCampaign] = useState<{
    campaign: Campaign;
    leads: Lead[];
  } | null>(null);
  
  // Available courses (derived from campaigns)
  const availableCourses = useMemo(() => {
    const courseMap = new Map();
    campaigns.forEach(c => {
      if (c.course) {
        courseMap.set(c.course.id, c.course.name);
      }
    });
    return Array.from(courseMap.entries()).map(([id, name]) => ({ id, name }));
  }, [campaigns]);

  // Filter campaigns for create modal based on selected course
  const filteredCreateCampaigns = useMemo(() => {
    if (!createFormData.courseId) return campaigns;
    return campaigns.filter(c => c.course?.id === createFormData.courseId && c.status === "ACTIVE");
  }, [campaigns, createFormData.courseId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFormData.name || !createFormData.courseId || !createFormData.campaignId) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

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
          notes: createFormData.notes || null,
          source: "MANUAL",
          createdById: session?.user?.id || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create lead");

      toast.success("Lead creato con successo");
      setShowCreateModal(false);
      setCreateFormData({
        name: "",
        email: "",
        phone: "",
        courseId: "",
        campaignId: "",
        notes: "",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to create lead:", error);
      toast.error("Errore nella creazione del lead");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      toast.error("Errore nel caricamento dei dati");
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
      const matchesContattato = filterContattato === "" || lead.contacted === (filterContattato === "true");
      const matchesTarget = filterTarget === "" || lead.isTarget === (filterTarget === "true");
      const matchesIscritto = filterIscritto === "" || lead.enrolled === (filterIscritto === "true");
      const matchesWithoutCost = !filterWithoutCost || !lead.acquisitionCost || lead.acquisitionCost === 0;
      return matchesSearch && matchesCampaign && matchesContattato && matchesTarget && matchesIscritto && matchesWithoutCost;
    });
  }, [leads, searchTerm, filterCampaign, filterContattato, filterTarget, filterIscritto, filterWithoutCost]);

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
              cplEffettivo: 0,
              leadsWithCost: 0,
              totalCost: 0,
              costCoverage: 0,
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
      // Estimated CPL from campaign budget
      const totalSpent = group.campaign.totalSpent || group.campaign.cost || 0;
      const leadCount = group.leads.length;
      group.cpl = leadCount > 0 ? totalSpent / leadCount : 0;
      
      // Actual CPL from individual lead costs (only divide by leads WITH cost)
      const costMetrics = calculateCostMetrics(group.leads);
      group.cplEffettivo = costMetrics.cplEffettivo;
      group.leadsWithCost = costMetrics.leadsWithCost;
      group.totalCost = costMetrics.totalCost;
      group.costCoverage = costMetrics.coverage;
    });

    return Object.values(groups).sort((a, b) => b.leads.length - a.leads.length);
  }, [filteredLeads, campaigns]);

  // Stats calculations
  const stats = useMemo(() => {
    const costMetrics = calculateCostMetrics(filteredLeads);
    const uniqueCampaigns = new Set(
      filteredLeads.map((l) => l.campaign?.id).filter(Boolean)
    ).size;

    return {
      totalLeads: costMetrics.totalLeads,
      leadsWithCost: costMetrics.leadsWithCost,
      totalCost: costMetrics.totalCost,
      avgCpl: costMetrics.cplEffettivo,
      costCoverage: costMetrics.coverage,
      uniqueCampaigns,
    };
  }, [filteredLeads]);

  const getPlatformLabel = (platform: string) => {
    return platformOptions.find((p) => p.value === platform)?.label || platform;
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

  // Bulk selection helpers
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const handleSelectCampaignLeads = (campaignLeads: Lead[]) => {
    const campaignLeadIds = campaignLeads.map((l) => l.id);
    const allSelected = campaignLeadIds.every((id) => selectedLeads.has(id));
    
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        campaignLeadIds.forEach((id) => newSet.delete(id));
      } else {
        campaignLeadIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedLeads(new Set());
  };

  // Bulk cost operations
  const handleBulkSetCost = async (cost: number) => {
    const leadIds = Array.from(selectedLeads);
    
    try {
      await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_cost",
          leadIds,
          data: { acquisitionCost: cost },
        }),
      });
      clearSelection();
      setShowBulkCostModal(false);
      toast.success("Costi aggiornati con successo");
      fetchData();
    } catch (error) {
      console.error("Failed to set bulk cost:", error);
      toast.error("Errore nell'aggiornamento dei costi");
    }
  };

  const handleBulkDistributeCost = async (totalBudget: number) => {
    const leadIds = Array.from(selectedLeads);
    
    try {
      await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_cost",
          leadIds,
          data: { totalBudget },
        }),
      });
      clearSelection();
      setShowBulkCostModal(false);
      toast.success("Costi distribuiti con successo");
      fetchData();
    } catch (error) {
      console.error("Failed to distribute cost:", error);
      toast.error("Errore nella distribuzione dei costi");
    }
  };

  // Handle quick period-wise distribution
  const handleQuickDistribute = async (distributions: { leadId: string; cost: number }[]) => {
    try {
      const response = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distribute_by_period",
          leadIds: distributions.map(d => d.leadId),
          data: { distributions },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to distribute costs");
      }

      toast.success("Costi distribuiti con successo!");
      fetchData();
    } catch (error) {
      console.error("Failed to distribute costs:", error);
      toast.error("Errore nella distribuzione dei costi");
      throw error;
    }
  };

  // Handle lead update from detail modal
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
      toast.error("Errore nell'aggiornamento del lead");
    }
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      notes: lead.notes || "",
      contacted: lead.contacted,
      isTarget: lead.isTarget,
      enrolled: lead.enrolled,
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

    try {
      await fetch(`/api/leads/${editingLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          contacted: formData.contacted,
          isTarget: formData.isTarget,
          enrolled: formData.enrolled,
          acquisitionCost: acquisitionCostValue,
        }),
      });
      setShowEditModal(false);
      toast.success("Lead aggiornato con successo");
      fetchData();
    } catch (error) {
      console.error("Failed to update lead:", error);
      toast.error("Errore nell'aggiornamento del lead");
    }
  };

  // Boolean Toggle Component
  const BooleanToggle = ({
    value,
    onChange,
    label,
  }: {
    value: boolean;
    onChange: (value: boolean) => void;
    label: string;
  }) => {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
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

  // Render boolean badge
  const BooleanBadge = ({ value }: { value: boolean }) => {
    if (value) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} />
          Sì
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={12} />
        No
      </span>
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
          <h1 className="text-2xl font-bold text-gray-900">Lead per Campagna</h1>
          <p className="text-gray-500">Visualizza i lead raggruppati per campagna</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={filteredLeads}
            columns={leadExportColumns}
            filename="lead_campagne_export"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            <Plus size={18} />
            Nuovo Lead
          </button>
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
          subtitle={`${stats.leadsWithCost} lead con costo`}
        />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-marketing" />
            <span className="text-sm font-medium text-gray-600">CPL Effettivo</span>
          </div>
          <CostCoverage
            leadsWithCost={stats.leadsWithCost}
            totalLeads={stats.totalLeads}
            totalCost={stats.totalCost}
            accentColor="marketing"
          />
        </div>
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
            value={filterContattato}
            onChange={(e) => setFilterContattato(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
          >
            <option value="">Contattato: Tutti</option>
            <option value="true">Contattato: Sì</option>
            <option value="false">Contattato: No</option>
          </select>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
          >
            <option value="">Target: Tutti</option>
            <option value="true">Target: Sì</option>
            <option value="false">Target: No</option>
          </select>
          <select
            value={filterIscritto}
            onChange={(e) => setFilterIscritto(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
          >
            <option value="">Iscritto: Tutti</option>
            <option value="true">Iscritto: Sì</option>
            <option value="false">Iscritto: No</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
            <input
              type="checkbox"
              checked={filterWithoutCost}
              onChange={(e) => setFilterWithoutCost(e.target.checked)}
              className="w-4 h-4 text-marketing rounded focus:ring-marketing"
            />
            <span className="text-sm text-gray-700 whitespace-nowrap">
              Solo senza costo
            </span>
            {filterWithoutCost && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {leads.filter(l => !l.acquisitionCost || l.acquisitionCost === 0).length}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Selection Info Bar */}
      {selectedLeads.size > 0 && (
        <div className="bg-marketing/10 border border-marketing/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare size={20} className="text-marketing" />
            <span className="font-medium text-gray-900">
              {selectedLeads.size} lead selezionati
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Deseleziona tutti
            </button>
          </div>
          <button
            onClick={() => setShowBulkCostModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition"
          >
            <Euro size={18} />
            Imposta Costi
          </button>
        </div>
      )}

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
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
              <button
                onClick={() => toggleCampaignExpanded(group.campaign.id)}
                className="flex items-center gap-4 flex-1"
              >
                <div className="p-2 bg-marketing/10 rounded-lg">
                  <Megaphone size={20} className="text-marketing" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    {group.campaign.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      {getPlatformLabel(group.campaign.platform)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {group.leads.length} lead
                    </span>
                    <span className="text-sm text-gray-400">
                      CPL Stim: €{group.cpl.toFixed(2)}
                    </span>
                    {group.leadsWithCost > 0 && (
                      <CostCoverageInline
                        leadsWithCost={group.leadsWithCost}
                        totalLeads={group.leads.length}
                        totalCost={group.totalCost}
                      />
                    )}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {/* Quick Distribute Button - only show if campaign has spend */}
                {(group.campaign.totalSpent || 0) > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const fullCampaign = campaigns.find(c => c.id === group.campaign.id);
                      if (fullCampaign) {
                        setQuickDistributeCampaign({
                          campaign: fullCampaign,
                          leads: group.leads,
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-marketing/10 text-marketing rounded-lg hover:bg-marketing/20 transition text-sm font-medium"
                    title="Distribuzione rapida costi per periodo"
                  >
                    <Zap size={14} />
                    Distribuisci
                  </button>
                )}
                <button onClick={() => toggleCampaignExpanded(group.campaign.id)}>
                  {expandedCampaigns.has(group.campaign.id) ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Leads Table */}
            {expandedCampaigns.has(group.campaign.id) && (
              <div className="border-t">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 bg-gray-50 border-b">
                      <th className="p-3 w-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCampaignLeads(group.leads);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition"
                          title="Seleziona tutti i lead di questa campagna"
                        >
                          {group.leads.every((l) => selectedLeads.has(l.id)) ? (
                            <CheckSquare size={18} className="text-marketing" />
                          ) : group.leads.some((l) => selectedLeads.has(l.id)) ? (
                            <Minus size={18} className="text-marketing" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-3 font-medium">Nome</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Contattato</th>
                      <th className="p-3 font-medium">Target</th>
                      <th className="p-3 font-medium">Iscritto</th>
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium">Costo Acq.</th>
                      <th className="p-3 font-medium">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.leads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className={`border-b last:border-b-0 hover:bg-gray-50 ${
                          selectedLeads.has(lead.id) ? "bg-marketing/5" : ""
                        }`}
                      >
                        <td className="p-3">
                          <button
                            onClick={() => handleSelectLead(lead.id)}
                            className="p-1 hover:bg-gray-200 rounded transition"
                          >
                            {selectedLeads.has(lead.id) ? (
                              <CheckSquare size={18} className="text-marketing" />
                            ) : (
                              <Square size={18} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-medium">{lead.name}</td>
                        <td className="p-3 text-gray-600">{lead.email || "-"}</td>
                        <td className="p-3">
                          <BooleanBadge value={lead.contacted} />
                        </td>
                        <td className="p-3">
                          <BooleanBadge value={lead.isTarget} />
                        </td>
                        <td className="p-3">
                          <BooleanBadge value={lead.enrolled} />
                        </td>
                        <td className="p-3 text-gray-600">
                          {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                        </td>
                        <td className="p-3 font-medium">
                          {lead.acquisitionCost && lead.acquisitionCost > 0 ? (
                            <span className="text-marketing">€{lead.acquisitionCost.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
            <h2 className="text-xl font-bold mb-4">Modifica Lead</h2>
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
              
              {/* Boolean toggles */}
              <div className="space-y-4 pt-2">
                <BooleanToggle
                  label="Contattato"
                  value={formData.contacted}
                  onChange={(value) => setFormData({ ...formData, contacted: value })}
                />
                <BooleanToggle
                  label="Target (In obiettivo)"
                  value={formData.isTarget}
                  onChange={(value) => setFormData({ ...formData, isTarget: value })}
                />
                <BooleanToggle
                  label="Iscritto"
                  value={formData.enrolled}
                  onChange={(value) => setFormData({ ...formData, enrolled: value })}
                />
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

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                >
                  <option value="">Seleziona un corso</option>
                  {availableCourses.map((course) => (
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                  disabled={!createFormData.courseId}
                >
                  <option value="">
                    {createFormData.courseId ? "Seleziona una campagna" : "Seleziona prima un corso"}
                  </option>
                  {filteredCreateCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaign.platform})
                    </option>
                  ))}
                </select>
                {createFormData.courseId && filteredCreateCampaigns.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Nessuna campagna attiva per questo corso.
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!createFormData.name || !createFormData.courseId || !createFormData.campaignId}
                  className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  Crea Lead
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
          accentColor="marketing"
        />
      )}

      {/* Bulk Cost Modal */}
      {showBulkCostModal && (
        <BulkCostModal
          leadIds={Array.from(selectedLeads)}
          onClose={() => setShowBulkCostModal(false)}
          onSetCost={handleBulkSetCost}
          onDistributeCost={handleBulkDistributeCost}
        />
      )}

      {/* Quick Distribute Cost Modal */}
      {quickDistributeCampaign && (
        <QuickDistributeCostModal
          campaignName={quickDistributeCampaign.campaign.name}
          campaignId={quickDistributeCampaign.campaign.id}
          leads={quickDistributeCampaign.leads}
          spendRecords={quickDistributeCampaign.campaign.spendRecords || []}
          totalSpent={quickDistributeCampaign.campaign.totalSpent || 0}
          onDistribute={handleQuickDistribute}
          onClose={() => setQuickDistributeCampaign(null)}
        />
      )}
    </div>
  );
}
