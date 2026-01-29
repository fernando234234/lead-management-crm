"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ChevronRight,
  Receipt,
  X,
  Folder,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import SpendRecordList, { SpendRecord } from "@/components/ui/SpendRecordList";
import SpendRecordModal from "@/components/ui/SpendRecordModal";
import { SpendRecordFormData } from "@/components/ui/SpendRecordForm";
import {
  PLATFORM_OPTIONS,
  getPlatformLabel,
  getPlatformColor,
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
  { key: "budget", label: "Spesa Totale" },
  { key: "leadCount", label: "Lead" },
  { key: "costPerLead", label: "CPL" },
  { key: "status", label: "Stato" },
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
  masterCampaign?: { id: string; name: string } | null;
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

// Grouped campaign (folder) for display
interface CampaignFolder {
  masterName: string;
  masterCampaignId: string | null;
  course: { id: string; name: string; price?: number } | null;
  campaigns: Campaign[];
  // Aggregated metrics
  totalSpent: number;
  totalLeads: number;
  totalEnrolled: number;
  platforms: string[];
}

interface Course {
  id: string;
  name: string;
}

interface MasterCampaign {
  id: string;
  name: string;
  courseId: string;
  course?: { id: string; name: string };
  platforms: string[];
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [masterCampaigns, setMasterCampaigns] = useState<MasterCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showAddPlatformModal, setShowAddPlatformModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<CampaignFolder | null>(null);
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");

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

  // New folder form
  const [newFolderForm, setNewFolderForm] = useState({
    name: "",
    courseId: "",
  });

  // Add platform form
  const [addPlatformForm, setAddPlatformForm] = useState({
    masterCampaignId: "",
    platform: "META",
    status: "ACTIVE",
  });

  // Edit campaign form
  const [editCampaignForm, setEditCampaignForm] = useState({
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
      const [campaignsRes, coursesRes, masterCampaignsRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/courses"),
        fetch("/api/master-campaigns"),
      ]);
      const [campaignsData, coursesData, masterCampaignsData] = await Promise.all([
        campaignsRes.json(),
        coursesRes.json(),
        masterCampaignsRes.json(),
      ]);
      setCampaigns(campaignsData);
      setCourses(coursesData);
      setMasterCampaigns(masterCampaignsData);
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

  // Create new folder (MasterCampaign)
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/master-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFolderForm),
      });
      
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Errore nella creazione della cartella");
        return;
      }

      toast.success("Cartella campagna creata! Ora aggiungi una piattaforma.");
      setShowNewFolderModal(false);
      setNewFolderForm({ name: "", courseId: "" });
      
      // Refresh and open add platform modal
      await fetchData();
      
      const created = await res.json();
      // Set up the add platform form with the new folder
      setAddPlatformForm({
        ...addPlatformForm,
        masterCampaignId: created.id,
      });
      setShowAddPlatformModal(true);
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Errore nella creazione della cartella");
    }
  };

  // Add platform to folder
  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault();

    // Find the master campaign to get its name and courseId
    const master = masterCampaigns.find(m => m.id === addPlatformForm.masterCampaignId);
    if (!master) {
      toast.error("Seleziona una cartella campagna");
      return;
    }

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: master.name,
          courseId: master.courseId,
          platform: addPlatformForm.platform,
          status: addPlatformForm.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Errore nell'aggiunta della piattaforma");
        return;
      }

      toast.success(`Piattaforma ${addPlatformForm.platform} aggiunta!`);
      setShowAddPlatformModal(false);
      setAddPlatformForm({
        masterCampaignId: "",
        platform: "META",
        status: "ACTIVE",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to add platform:", error);
      toast.error("Errore nell'aggiunta della piattaforma");
    }
  };

  // Open edit campaign modal
  const openEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    const displayName = campaign.masterCampaign?.name || campaign.name.replace(` - ${campaign.platform}`, '');
    setEditCampaignForm({
      name: displayName,
      platform: campaign.platform,
      courseId: campaign.course?.id || "",
      status: campaign.status,
    });
    fetchSpendRecords(campaign.id);
    setModalTab("details");
    setShowEditCampaignModal(true);
  };

  // Save edited campaign
  const handleSaveEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    try {
      await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCampaignForm.name,
          platform: editCampaignForm.platform,
          courseId: editCampaignForm.courseId,
          status: editCampaignForm.status,
        }),
      });
      toast.success("Campagna aggiornata");
      setShowEditCampaignModal(false);
      fetchData();
    } catch (error) {
      console.error("Failed to save campaign:", error);
      toast.error("Errore nel salvataggio");
    }
  };

  // Open add platform modal for existing folder
  const openAddPlatformToFolder = (folder: CampaignFolder) => {
    if (!folder.masterCampaignId) {
      toast.error("Cartella non valida");
      return;
    }
    setSelectedFolder(folder);
    setAddPlatformForm({
      masterCampaignId: folder.masterCampaignId,
      platform: "META",
      status: "ACTIVE",
    });
    setShowAddPlatformModal(true);
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

  // Helper functions
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

  const getPlatformConfig = (platform: string) => {
    const opt = PLATFORM_OPTIONS.find((p) => p.value === platform);
    return opt ? { value: opt.value, label: opt.label, color: getPlatformColor(platform) } : { value: platform, label: platform, color: "bg-gray-100 text-gray-700" };
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[0];
  };

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Filter campaigns first
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (platformFilter !== "ALL" && c.platform !== platformFilter) return false;
      if (courseFilter !== "ALL" && c.course?.id !== courseFilter) return false;
      return true;
    });
  }, [campaigns, statusFilter, platformFilter, courseFilter]);

  // Group campaigns by masterCampaign (or by name if no masterCampaign)
  const campaignFolders = useMemo(() => {
    const groups = new Map<string, CampaignFolder>();
    
    filteredCampaigns.forEach(campaign => {
      // Use masterCampaign name if available, otherwise extract from campaign name or use full name
      const masterName = campaign.masterCampaign?.name || 
                         campaign.name.replace(` - ${campaign.platform}`, '') ||
                         campaign.name;
      const folderId = campaign.masterCampaign?.id || `standalone-${campaign.id}`;
      
      if (!groups.has(folderId)) {
        groups.set(folderId, {
          masterName,
          masterCampaignId: campaign.masterCampaign?.id || null,
          course: campaign.course,
          campaigns: [],
          totalSpent: 0,
          totalLeads: 0,
          totalEnrolled: 0,
          platforms: [],
        });
      }
      
      const folder = groups.get(folderId)!;
      folder.campaigns.push(campaign);
      folder.totalSpent += getTotalSpent(campaign);
      folder.totalLeads += getLeadCount(campaign);
      folder.totalEnrolled += getEnrolledCount(campaign);
      if (!folder.platforms.includes(campaign.platform)) {
        folder.platforms.push(campaign.platform);
      }
    });
    
    // Sort folders by creation date of first campaign (newest first)
    return Array.from(groups.values()).sort((a, b) => {
      const aDate = new Date(a.campaigns[0]?.createdAt || 0).getTime();
      const bDate = new Date(b.campaigns[0]?.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [filteredCampaigns]);

  // Get available platforms for a folder (platforms not yet added)
  const getAvailablePlatforms = (folder: CampaignFolder | null) => {
    if (!folder) return PLATFORM_OPTIONS;
    return PLATFORM_OPTIONS.filter(p => !folder.platforms.includes(p.value));
  };

  // Pagination calculations - now based on folders
  const totalPages = Math.ceil(campaignFolders.length / pageSize);
  const paginatedFolders = campaignFolders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, platformFilter, courseFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredCampaigns.reduce(
      (acc, campaign) => ({
        spent: acc.spent + getTotalSpent(campaign),
        leads: acc.leads + getLeadCount(campaign),
        enrolled: acc.enrolled + getEnrolledCount(campaign),
      }),
      { spent: 0, leads: 0, enrolled: 0 }
    );
  }, [filteredCampaigns]);

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutte le Campagne</h1>
          <p className="text-gray-500">
            {campaignFolders.length} cartelle, {filteredCampaigns.length} piattaforme
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={filteredCampaigns.map((c) => ({
              ...c,
              leadCount: getLeadCount(c),
              totalSpent: getTotalSpent(c),
              costPerLead: getCostPerLead(c),
            }))}
            columns={campaignExportColumns}
            filename="campagne_export"
          />
          <button
            onClick={() => {
              setNewFolderForm({ name: "", courseId: courses[0]?.id || "" });
              setShowNewFolderModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
          >
            <FolderPlus size={20} />
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
              <div className="p-2 bg-admin/10 rounded-lg">
                <Megaphone size={24} className="text-admin" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cartelle Campagne</p>
                <p className="text-2xl font-bold">{campaignFolders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Piattaforme Attive</p>
                <p className="text-2xl font-bold">
                  {filteredCampaigns.filter((c) => c.status === "ACTIVE").length}
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
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corso</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
            >
              <option value="ALL">Tutti i corsi</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
            >
              <option value="ALL">Tutti</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Piattaforma</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
            >
              <option value="ALL">Tutte</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Campaign Folders */}
      <div className="space-y-3">
        {paginatedFolders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.masterCampaignId || `standalone-${folder.campaigns[0]?.id}`);
          const folderId = folder.masterCampaignId || `standalone-${folder.campaigns[0]?.id}`;
          const folderCpl = folder.totalLeads > 0 ? (folder.totalSpent / folder.totalLeads) : 0;
          const folderConversion = folder.totalLeads > 0 ? ((folder.totalEnrolled / folder.totalLeads) * 100) : 0;
          const availablePlatforms = getAvailablePlatforms(folder);
          
          return (
            <div key={folderId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Folder Header */}
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleFolder(folderId)}
              >
                <button className="p-1 hover:bg-gray-200 rounded">
                  {isExpanded ? (
                    <ChevronDown size={20} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-500" />
                  )}
                </button>
                
                <div className="p-2 bg-admin/10 rounded-lg">
                  {isExpanded ? (
                    <FolderOpen size={24} className="text-admin" />
                  ) : (
                    <Folder size={24} className="text-admin" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{folder.masterName}</h3>
                    <span className="text-sm text-gray-500">
                      ({folder.campaigns.length} {folder.campaigns.length === 1 ? 'piattaforma' : 'piattaforme'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{folder.course?.name || "-"}</span>
                    <span className="text-gray-300">•</span>
                    <div className="flex gap-1">
                      {folder.platforms.map(platform => {
                        const config = getPlatformConfig(platform);
                        return (
                          <span key={platform} className={`px-1.5 py-0.5 text-xs rounded ${config.color}`}>
                            {config.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Folder Aggregated Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Spesa</p>
                    <p className="font-semibold text-blue-600">€{folder.totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Lead</p>
                    <p className="font-semibold">{folder.totalLeads}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">CPL</p>
                    <p className="font-semibold">€{folderCpl.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">Conv.</p>
                    <p className={`font-semibold ${
                      folderConversion > 10 ? 'text-green-600' : 
                      folderConversion > 5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {folderConversion.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Add Platform Button */}
                {folder.masterCampaignId && availablePlatforms.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddPlatformToFolder(folder);
                    }}
                    className="p-2 text-admin hover:bg-admin/10 rounded-lg transition"
                    title="Aggiungi piattaforma"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
              
              {/* Expanded Platform Variants */}
              {isExpanded && (
                <div className="border-t bg-gray-50">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase">
                        <th className="text-left p-3 pl-16">Piattaforma</th>
                        <th className="text-left p-3">Stato</th>
                        <th className="text-right p-3">Spesa</th>
                        <th className="text-right p-3">Lead</th>
                        <th className="text-right p-3">CPL</th>
                        <th className="text-right p-3">Iscritti</th>
                        <th className="text-right p-3">Conv.</th>
                        <th className="text-center p-3">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folder.campaigns.map((campaign, idx) => {
                        const platformConfig = getPlatformConfig(campaign.platform);
                        const statusConfig = getStatusConfig(campaign.status);
                        const campaignSpent = getTotalSpent(campaign);
                        const campaignLeads = getLeadCount(campaign);
                        const campaignEnrolled = getEnrolledCount(campaign);
                        const campaignCpl = campaignLeads > 0 ? (campaignSpent / campaignLeads) : 0;
                        const campaignConversion = getConversionRate(campaign);
                        
                        return (
                          <tr key={campaign.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="p-3 pl-16">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded ${platformConfig.color}`}>
                                  {platformConfig.label}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="p-3 text-right font-medium text-blue-600">
                              €{campaignSpent.toLocaleString()}
                            </td>
                            <td className="p-3 text-right">{campaignLeads}</td>
                            <td className="p-3 text-right">€{campaignCpl.toFixed(2)}</td>
                            <td className="p-3 text-right">{campaignEnrolled}</td>
                            <td className={`p-3 text-right font-medium ${
                              campaignConversion > 10 ? 'text-green-600' : 
                              campaignConversion > 5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {campaignConversion.toFixed(1)}%
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditCampaign(campaign);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-admin hover:bg-admin/10 rounded transition"
                                  title="Modifica"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(campaign.id);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                  title="Elimina"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {campaignFolders.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          Nessuna campagna trovata
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        totalItems={campaignFolders.length}
        showInfo={true}
      />

      {/* NEW FOLDER MODAL (Step 1) */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-admin/10 rounded-lg">
                  <FolderPlus size={20} className="text-admin" />
                </div>
                <h2 className="text-xl font-bold">Nuova Campagna</h2>
              </div>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                Una campagna è una cartella che contiene le piattaforme pubblicitarie (Meta, Google, etc.). 
                Prima crea la campagna, poi aggiungi le piattaforme.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Campagna *
                </label>
                <input
                  type="text"
                  required
                  value={newFolderForm.name}
                  onChange={(e) => setNewFolderForm({ ...newFolderForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                  placeholder="es. Summer Promo 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corso *
                </label>
                <select
                  required
                  value={newFolderForm.courseId}
                  onChange={(e) => setNewFolderForm({ ...newFolderForm, courseId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                >
                  <option value="">Seleziona corso</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
                >
                  Crea e Aggiungi Piattaforma →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PLATFORM MODAL (Step 2) */}
      {showAddPlatformModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-admin/10 rounded-lg">
                  <Plus size={20} className="text-admin" />
                </div>
                <h2 className="text-xl font-bold">Aggiungi Piattaforma</h2>
              </div>
              <button
                onClick={() => {
                  setShowAddPlatformModal(false);
                  setSelectedFolder(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPlatform} className="p-6 space-y-4">
              {/* Show folder info if adding to existing */}
              {selectedFolder && (
                <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                  <Folder size={20} className="text-admin" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFolder.masterName}</p>
                    <p className="text-sm text-gray-500">{selectedFolder.course?.name}</p>
                  </div>
                </div>
              )}

              {/* If no folder selected, show folder dropdown */}
              {!selectedFolder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campagna *
                  </label>
                  <select
                    required
                    value={addPlatformForm.masterCampaignId}
                    onChange={(e) => setAddPlatformForm({ ...addPlatformForm, masterCampaignId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                  >
                    <option value="">Seleziona campagna</option>
                    {masterCampaigns.map((mc) => (
                      <option key={mc.id} value={mc.id}>
                        {mc.name} ({mc.course?.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Piattaforma *
                </label>
                <select
                  required
                  value={addPlatformForm.platform}
                  onChange={(e) => setAddPlatformForm({ ...addPlatformForm, platform: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                >
                  {(selectedFolder ? getAvailablePlatforms(selectedFolder) : PLATFORM_OPTIONS).map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
                {selectedFolder && getAvailablePlatforms(selectedFolder).length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">
                    Tutte le piattaforme sono già state aggiunte a questa campagna.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                <select
                  value={addPlatformForm.status}
                  onChange={(e) => setAddPlatformForm({ ...addPlatformForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlatformModal(false);
                    setSelectedFolder(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!!(selectedFolder && getAvailablePlatforms(selectedFolder).length === 0)}
                  className="flex-1 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aggiungi Piattaforma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CAMPAIGN MODAL */}
      {showEditCampaignModal && editingCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Show which platform is being edited */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Modifica Campagna</h2>
                <span className={`px-2.5 py-1 text-sm font-medium rounded ${getPlatformConfig(editingCampaign.platform).color}`}>
                  {getPlatformConfig(editingCampaign.platform).label}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowEditCampaignModal(false);
                  setEditingCampaign(null);
                  setSpendRecords([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-4">
              <button
                onClick={() => setModalTab("details")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  modalTab === "details"
                    ? "border-admin text-admin"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Dettagli
              </button>
              <button
                onClick={() => setModalTab("spend")}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                  modalTab === "spend"
                    ? "border-admin text-admin"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Receipt size={16} />
                Gestione Spese
                {spendRecords.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-admin/10 text-admin rounded-full">
                    {spendRecords.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalTab === "details" ? (
                <form onSubmit={handleSaveEditCampaign} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Campagna *
                    </label>
                    <input
                      type="text"
                      required
                      value={editCampaignForm.name}
                      onChange={(e) => setEditCampaignForm({ ...editCampaignForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                      placeholder="es. Summer Promo 2025"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Questo nome identifica il gruppo. La piattaforma viene aggiunta automaticamente.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Piattaforma *
                      </label>
                      <select
                        required
                        value={editCampaignForm.platform}
                        onChange={(e) => setEditCampaignForm({ ...editCampaignForm, platform: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
                      >
                        {PLATFORM_OPTIONS.map((platform) => (
                          <option key={platform.value} value={platform.value}>
                            {platform.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Corso *</label>
                      <select
                        required
                        value={editCampaignForm.courseId}
                        onChange={(e) => setEditCampaignForm({ ...editCampaignForm, courseId: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
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
                        Spesa Totale
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 font-medium">
                        €{getTotalSpent(editingCampaign).toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Vai su &quot;Gestione Spese&quot; per modificare
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stato *</label>
                      <select
                        required
                        value={editCampaignForm.status}
                        onChange={(e) => setEditCampaignForm({ ...editCampaignForm, status: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin"
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
                      onClick={() => {
                        setShowEditCampaignModal(false);
                        setEditingCampaign(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
                    >
                      Salva Modifiche
                    </button>
                  </div>
                </form>
              ) : (
                /* Spend Management Tab */
                <div className="space-y-4">
                  {/* Platform-specific indicator */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> Le spese vengono tracciate separatamente per ogni piattaforma. 
                      Stai gestendo le spese per <span className={`inline-flex px-2 py-0.5 mx-1 text-xs font-medium rounded ${getPlatformConfig(editingCampaign.platform).color}`}>{getPlatformConfig(editingCampaign.platform).label}</span>.
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Storico Spese - {getPlatformConfig(editingCampaign.platform).label}
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
                      className="flex items-center gap-2 px-3 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition text-sm"
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
