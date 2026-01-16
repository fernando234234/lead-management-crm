"use client";

import React, { useState, useEffect } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCampaigns } from "@/lib/mockData";
import {
  Megaphone,
  TrendingUp,
  Users,
  DollarSign,
  TestTube,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";

// Platform options matching Prisma enum
const platformOptions = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
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

export default function AdminCampaignsPage() {
  const { isDemoMode } = useDemoMode();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    if (isDemoMode) {
      const transformedCampaigns = mockCampaigns.map((c) => ({
        ...c,
        platform: c.platform || "FACEBOOK",
        budget: c.budget || c.cost || 0,
        status: c.status || (c.active ? "ACTIVE" : "COMPLETED"),
        totalSpent: c.totalSpent || c.cost || 0,
        costPerLead: c.costPerLead || (c.metrics?.totalLeads > 0 ? (c.cost || 0) / c.metrics.totalLeads : 0),
        leadCount: c.leadCount || c.metrics?.totalLeads || 0,
      })) as Campaign[];
      setCampaigns(transformedCampaigns);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [isDemoMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
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

  const getPlatformLabel = (platform: string) => {
    return platformOptions.find((p) => p.value === platform)?.label || platform;
  };

  const getStatusConfig = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[0];
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (platformFilter !== "ALL" && c.platform !== platformFilter) return false;
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCampaigns.length / pageSize);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, platformFilter]);

  // Calculate totals
  const totals = filteredCampaigns.reduce(
    (acc, campaign) => ({
      budget: acc.budget + Number(campaign.budget || 0),
      spent: acc.spent + getTotalSpent(campaign),
      leads: acc.leads + getLeadCount(campaign),
      enrolled: acc.enrolled + getEnrolledCount(campaign),
    }),
    { budget: 0, spent: 0, leads: 0, enrolled: 0 }
  );

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutte le Campagne</h1>
          <p className="text-gray-500">Panoramica di tutte le campagne marketing</p>
        </div>
        <div className="flex items-center gap-3">
          {isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <TestTube size={16} />
              Demo
            </div>
          )}
          <ExportButton
            data={filteredCampaigns.map(c => ({
              ...c,
              leadCount: getLeadCount(c),
              totalSpent: getTotalSpent(c),
              costPerLead: getCostPerLead(c),
            }))}
            columns={campaignExportColumns}
            filename="campagne_export"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-admin/10 rounded-lg">
              <Megaphone size={24} className="text-admin" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totale Campagne</p>
              <p className="text-2xl font-bold">{filteredCampaigns.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attive</p>
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
              <p className="text-sm text-gray-500">Budget Totale</p>
              <p className="text-2xl font-bold">€{totals.budget.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Speso</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
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
              {platformOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th>Campagna</th>
                <th>Piattaforma</th>
                <th>Corso</th>
                <th>Creatore</th>
                <th>Budget</th>
                <th>Speso</th>
                <th>Lead</th>
                <th>CPL</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCampaigns.map((campaign, index) => (
                <React.Fragment key={campaign.id}>
                  <tr className={index % 2 === 0 ? "" : "bg-gray-50/30"}>
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
                      <div className="p-2 bg-admin/10 rounded-lg">
                        <Megaphone size={20} className="text-admin" />
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(campaign.startDate).toLocaleDateString("it-IT")}
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
                  <td className="p-4 text-sm">
                    {campaign.createdBy?.name || "-"}
                  </td>
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
                </tr>
                {/* Expanded row for details */}
                {expandedCampaign === campaign.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={9} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Budget Rimanente</p>
                          <p className={`font-semibold ${
                            Number(campaign.budget) - getTotalSpent(campaign) < 0 
                              ? "text-red-600" 
                              : "text-green-600"
                          }`}>
                            €{(Number(campaign.budget) - getTotalSpent(campaign)).toLocaleString()}
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
        </div>
        {filteredCampaigns.length === 0 && (
          <div className="p-8 text-center text-gray-500">Nessuna campagna trovata</div>
        )}
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={filteredCampaigns.length}
          showInfo={true}
        />
      </div>
    </div>
  );
}
