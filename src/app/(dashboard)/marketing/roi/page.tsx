"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCampaigns, mockLeads, mockStats } from "@/lib/mockData";
import { StatCard } from "@/components/ui/StatCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  DollarSign,
  BarChart3,
  TestTube,
  ArrowUp,
  ArrowDown,
  Minus,
  Filter,
  Users,
  Phone,
  FileCheck,
} from "lucide-react";

// Platform options
const platformOptions = [
  { value: "FACEBOOK", label: "Facebook", color: "bg-blue-100 text-blue-700" },
  { value: "INSTAGRAM", label: "Instagram", color: "bg-pink-100 text-pink-700" },
  { value: "LINKEDIN", label: "LinkedIn", color: "bg-sky-100 text-sky-700" },
  { value: "GOOGLE_ADS", label: "Google Ads", color: "bg-red-100 text-red-700" },
  { value: "TIKTOK", label: "TikTok", color: "bg-gray-100 text-gray-700" },
];

interface Lead {
  id: string;
  status: string;
  enrolled: boolean;
  contacted: boolean;
  campaign: {
    id: string;
    name: string;
    platform: string;
  } | null;
  course?: {
    id: string;
    name: string;
    price?: number;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number;
  totalSpent?: number;
  cost?: number;
  status: string;
  leadCount?: number;
  metrics?: {
    totalLeads: number;
    enrolledLeads: number;
    conversionRate: string;
  };
  course?: {
    id: string;
    name: string;
    price?: number;
  } | null;
}

interface CampaignPerformance {
  id: string;
  name: string;
  platform: string;
  platformLabel: string;
  platformColor: string;
  budget: number;
  spent: number;
  leads: number;
  contacted: number; // consulenze
  enrolled: number;  // contratti
  revenue: number;
  roi: number;
  profit: number;
  conversionRate: number;
  cpl: number;              // Costo per Lead
  costPerConsulenza: number; // Costo per Consulenza
  costPerContratto: number;  // Costo per Contratto
}

export default function MarketingROIPage() {
  const { isDemoMode } = useDemoMode();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof CampaignPerformance>("roi");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterPlatform, setFilterPlatform] = useState("");

  useEffect(() => {
    if (isDemoMode) {
      setCampaigns(mockCampaigns as Campaign[]);
      setLeads(mockLeads as Lead[]);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [isDemoMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, leadsRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/leads"),
      ]);

      const [campaignsData, leadsData] = await Promise.all([
        campaignsRes.json(),
        leadsRes.json(),
      ]);

      setCampaigns(campaignsData);
      setLeads(leadsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate campaign performance
  const campaignPerformance = useMemo((): CampaignPerformance[] => {
    return campaigns
      .filter((c) => !filterPlatform || c.platform === filterPlatform)
      .map((campaign) => {
        const platformConfig = platformOptions.find(
          (p) => p.value === campaign.platform
        );
        const spent = campaign.totalSpent || campaign.cost || 0;
        const leadCount = campaign.leadCount || campaign.metrics?.totalLeads || 0;
        
        // Get leads for this campaign from leads data
        const campaignLeads = leads.filter((l) => l.campaign?.id === campaign.id);
        
        // Count contacted leads (consulenze)
        const contactedCount = campaignLeads.filter(
          (l) => l.status === "CONTATTATO" || l.status === "IN_TRATTATIVA" || l.status === "ISCRITTO"
        ).length;
        
        // Count enrolled leads (contratti)
        const enrolledCount =
          campaign.metrics?.enrolledLeads ||
          campaignLeads.filter((l) => l.enrolled || l.status === "ISCRITTO").length;

        // Calculate revenue (enrolled * course price)
        const coursePrice = campaign.course?.price || 0;
        const revenue = enrolledCount * coursePrice;

        // Calculate ROI
        const profit = revenue - spent;
        const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;
        const conversionRate = leadCount > 0 ? (enrolledCount / leadCount) * 100 : 0;
        
        // Calculate cost metrics
        const cpl = leadCount > 0 ? spent / leadCount : 0;                    // Costo per Lead
        const costPerConsulenza = contactedCount > 0 ? spent / contactedCount : 0; // Costo per Consulenza
        const costPerContratto = enrolledCount > 0 ? spent / enrolledCount : 0;    // Costo per Contratto

        return {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          platformLabel: platformConfig?.label || campaign.platform,
          platformColor: platformConfig?.color || "bg-gray-100 text-gray-700",
          budget: campaign.budget || 0,
          spent,
          leads: leadCount,
          contacted: contactedCount,
          enrolled: enrolledCount,
          revenue,
          roi,
          profit,
          conversionRate,
          cpl,
          costPerConsulenza,
          costPerContratto,
        };
      });
  }, [campaigns, leads, filterPlatform]);

  // Sort campaigns
  const sortedCampaigns = useMemo(() => {
    return [...campaignPerformance].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });
  }, [campaignPerformance, sortBy, sortOrder]);

  // Best and worst performers
  const bestPerformer = useMemo(() => {
    if (sortedCampaigns.length === 0) return null;
    return sortedCampaigns.reduce((best, current) =>
      current.roi > best.roi ? current : best
    );
  }, [sortedCampaigns]);

  const worstPerformer = useMemo(() => {
    if (sortedCampaigns.length === 0) return null;
    const withSpend = sortedCampaigns.filter((c) => c.spent > 0);
    if (withSpend.length === 0) return null;
    return withSpend.reduce((worst, current) =>
      current.roi < worst.roi ? current : worst
    );
  }, [sortedCampaigns]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalRevenue = campaignPerformance.reduce((sum, c) => sum + c.revenue, 0);
    const totalSpent = campaignPerformance.reduce((sum, c) => sum + c.spent, 0);
    const totalProfit = totalRevenue - totalSpent;
    const overallRoi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;
    
    // Aggregate lead counts
    const totalLeads = campaignPerformance.reduce((sum, c) => sum + c.leads, 0);
    const totalContacted = campaignPerformance.reduce((sum, c) => sum + c.contacted, 0);
    const totalEnrolled = campaignPerformance.reduce((sum, c) => sum + c.enrolled, 0);
    
    // Calculate overall cost metrics
    const avgCostPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const avgCostPerConsulenza = totalContacted > 0 ? totalSpent / totalContacted : 0;
    const avgCostPerContratto = totalEnrolled > 0 ? totalSpent / totalEnrolled : 0;

    return {
      totalRevenue,
      totalSpent,
      totalProfit,
      overallRoi,
      totalLeads,
      totalContacted,
      totalEnrolled,
      avgCostPerLead,
      avgCostPerConsulenza,
      avgCostPerContratto,
    };
  }, [campaignPerformance]);

  // ROI trend over time (mock data)
  const roiTrendData = useMemo(() => {
    const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu"];
    return months.map((month, i) => ({
      mese: month,
      roi: Math.floor(50 + Math.random() * 100 + i * 10),
    }));
  }, []);

  // Campaign ROI comparison for bar chart
  const campaignRoiData = useMemo(() => {
    return sortedCampaigns.slice(0, 6).map((c) => ({
      nome: c.name.length > 12 ? c.name.substring(0, 12) + "..." : c.name,
      roi: Math.round(c.roi),
    }));
  }, [sortedCampaigns]);

  const handleSort = (column: keyof CampaignPerformance) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ column }: { column: keyof CampaignPerformance }) => {
    if (sortBy !== column) return <Minus size={14} className="text-gray-300" />;
    return sortOrder === "desc" ? (
      <ArrowDown size={14} className="text-marketing" />
    ) : (
      <ArrowUp size={14} className="text-marketing" />
    );
  };

  const getRoiColor = (roi: number) => {
    if (roi >= 100) return "text-green-600 bg-green-50";
    if (roi >= 50) return "text-green-500 bg-green-50";
    if (roi >= 0) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ROI & Performance</h1>
          <p className="text-gray-500">
            Analizza il ritorno sugli investimenti delle campagne
          </p>
        </div>
        {isDemoMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            <TestTube size={16} />
            Demo
          </div>
        )}
      </div>

      {/* Stats Cards - Row 1: Revenue & ROI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Ricavo Totale"
          value={`€${overallStats.totalRevenue.toLocaleString("it-IT")}`}
          icon={Euro}
          className="border-green-200"
        />
        <StatCard
          title="Spesa Totale"
          value={`€${overallStats.totalSpent.toLocaleString("it-IT")}`}
          icon={DollarSign}
          className="border-red-200"
        />
        <StatCard
          title="ROI %"
          value={`${overallStats.overallRoi.toFixed(1)}%`}
          icon={BarChart3}
          trend={{
            value: overallStats.overallRoi,
            isPositive: overallStats.overallRoi >= 0,
          }}
        />
        <StatCard
          title="Profitto Netto"
          value={`€${overallStats.totalProfit.toLocaleString("it-IT")}`}
          icon={overallStats.totalProfit >= 0 ? TrendingUp : TrendingDown}
          className={
            overallStats.totalProfit >= 0
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        />
      </div>

      {/* Stats Cards - Row 2: Cost Metrics (from your notes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Costo per Lead"
          value={`€${overallStats.avgCostPerLead.toFixed(2)}`}
          icon={Users}
          subtitle={`${overallStats.totalLeads} lead totali`}
        />
        <StatCard
          title="Costo per Consulenza"
          value={`€${overallStats.avgCostPerConsulenza.toFixed(2)}`}
          icon={Phone}
          subtitle={`${overallStats.totalContacted} contattati`}
        />
        <StatCard
          title="Costo per Contratto"
          value={`€${overallStats.avgCostPerContratto.toFixed(2)}`}
          icon={FileCheck}
          subtitle={`${overallStats.totalEnrolled} iscritti`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Trend ROI nel Tempo</h2>
          <LineChart
            data={roiTrendData}
            xKey="mese"
            yKey="roi"
            color="#10b981"
            height={250}
            formatValue={(value) => `${value}%`}
          />
        </div>

        {/* Campaign ROI Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Confronto ROI Campagne</h2>
          <BarChart
            data={campaignRoiData}
            xKey="nome"
            yKey="roi"
            color="#6366f1"
            height={250}
            formatValue={(value) => `${value}%`}
          />
        </div>
      </div>

      {/* Best/Worst Performers */}
      {(bestPerformer || worstPerformer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestPerformer && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-green-600" />
                <h3 className="font-semibold text-green-800">Miglior Performance</h3>
              </div>
              <p className="font-bold text-lg text-green-900">{bestPerformer.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-green-700">
                  ROI: {bestPerformer.roi.toFixed(1)}%
                </span>
                <span className="text-green-700">
                  Profitto: €{bestPerformer.profit.toLocaleString("it-IT")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${bestPerformer.platformColor}`}
                >
                  {bestPerformer.platformLabel}
                </span>
              </div>
            </div>
          )}
          {worstPerformer && worstPerformer.id !== bestPerformer?.id && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={20} className="text-red-600" />
                <h3 className="font-semibold text-red-800">Performance da Migliorare</h3>
              </div>
              <p className="font-bold text-lg text-red-900">{worstPerformer.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-red-700">
                  ROI: {worstPerformer.roi.toFixed(1)}%
                </span>
                <span className="text-red-700">
                  Profitto: €{worstPerformer.profit.toLocaleString("it-IT")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${worstPerformer.platformColor}`}
                >
                  {worstPerformer.platformLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtri:</span>
          </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
          >
            <option value="">Tutte le piattaforme</option>
            {platformOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">
            Confronto Performance Campagne
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="p-3 font-medium">Campagna</th>
                <th className="p-3 font-medium">Platform</th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("spent")}
                >
                  <div className="flex items-center gap-1">
                    Spesa <SortIcon column="spent" />
                  </div>
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("leads")}
                >
                  <div className="flex items-center gap-1">
                    Lead <SortIcon column="leads" />
                  </div>
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("cpl")}
                >
                  <div className="flex items-center gap-1">
                    CPL <SortIcon column="cpl" />
                  </div>
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("costPerConsulenza")}
                >
                  <div className="flex items-center gap-1">
                    C/Consulenza <SortIcon column="costPerConsulenza" />
                  </div>
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("costPerContratto")}
                >
                  <div className="flex items-center gap-1">
                    C/Contratto <SortIcon column="costPerContratto" />
                  </div>
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("revenue")}
                >
                  <div className="flex items-center gap-1">
                    Ricavo <SortIcon column="revenue" />
                  </div>
                </th>
                <th
                  className="p-3 font-medium cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort("roi")}
                >
                  <div className="flex items-center gap-1">
                    ROI <SortIcon column="roi" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.map((campaign, index) => (
                <tr
                  key={campaign.id}
                  className={`border-b hover:bg-gray-50 ${
                    campaign.id === bestPerformer?.id
                      ? "bg-green-50/50"
                      : campaign.id === worstPerformer?.id && campaign.spent > 0
                      ? "bg-red-50/50"
                      : ""
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {campaign.id === bestPerformer?.id && (
                        <span className="text-green-600" title="Miglior ROI">
                          <TrendingUp size={16} />
                        </span>
                      )}
                      {campaign.id === worstPerformer?.id &&
                        campaign.spent > 0 &&
                        campaign.id !== bestPerformer?.id && (
                          <span className="text-red-600" title="ROI più basso">
                            <TrendingDown size={16} />
                          </span>
                        )}
                      <span className="font-medium">{campaign.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${campaign.platformColor}`}
                    >
                      {campaign.platformLabel}
                    </span>
                  </td>
                  <td className="p-3">€{campaign.spent.toLocaleString("it-IT")}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span>{campaign.leads}</span>
                      <span className="text-xs text-gray-400">
                        ({campaign.contacted}C/{campaign.enrolled}I)
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-medium text-blue-600">
                    €{campaign.cpl.toFixed(2)}
                  </td>
                  <td className="p-3 font-medium text-orange-600">
                    €{campaign.costPerConsulenza.toFixed(2)}
                  </td>
                  <td className="p-3 font-medium text-purple-600">
                    €{campaign.costPerContratto.toFixed(2)}
                  </td>
                  <td className="p-3 font-medium text-green-600">
                    €{campaign.revenue.toLocaleString("it-IT")}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded font-semibold ${getRoiColor(
                        campaign.roi
                      )}`}
                    >
                      {campaign.roi.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedCampaigns.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nessuna campagna trovata
            </div>
          )}
        </div>
      </div>

      {/* ROI Summary by Platform */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">ROI per Piattaforma</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformOptions.map((platform) => {
              const platformCampaigns = campaignPerformance.filter(
                (c) => c.platform === platform.value
              );

              if (platformCampaigns.length === 0) return null;

              const totalRevenue = platformCampaigns.reduce(
                (sum, c) => sum + c.revenue,
                0
              );
              const totalSpent = platformCampaigns.reduce(
                (sum, c) => sum + c.spent,
                0
              );
              const platformRoi =
                totalSpent > 0
                  ? ((totalRevenue - totalSpent) / totalSpent) * 100
                  : 0;
              const totalProfit = totalRevenue - totalSpent;

              return (
                <div
                  key={platform.value}
                  className="p-4 border rounded-lg hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${platform.color}`}
                    >
                      {platform.label}
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        platformRoi >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {platformRoi.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Campagne</span>
                      <span className="font-medium">{platformCampaigns.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ricavo</span>
                      <span className="font-medium text-green-600">
                        €{totalRevenue.toLocaleString("it-IT")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Speso</span>
                      <span className="font-medium text-red-600">
                        €{totalSpent.toLocaleString("it-IT")}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-500">Profitto</span>
                      <span
                        className={`font-bold ${
                          totalProfit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        €{totalProfit.toLocaleString("it-IT")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
