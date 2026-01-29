"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { helpTexts } from "@/lib/helpTexts";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { MiniFunnel, ROIIndicator } from "@/components/ui/ProgressIndicators";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  DollarSign,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Filter,
  Users,
  Phone,
  FileCheck,
} from "lucide-react";
import {
  PLATFORM_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  getPlatformLabel,
  getPlatformColor,
} from "@/lib/platforms";

interface Lead {
  id: string;
  status: string;
  enrolled: boolean;
  contacted: boolean;
  createdAt: string;
  revenue?: number | string | null; // Lead-specific revenue (takes priority over course price)
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

interface SpendRecord {
  id: string;
  startDate: string;
  endDate: string | null;
  amount: number | string;
  notes: string | null;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number; // Legacy
  totalSpent: number; // From CampaignSpend records
  spendRecords?: SpendRecord[]; // Individual spend records with dates
  status: string;
  leadCount?: number;
  metrics?: {
    totalLeads: number;
    totalLeadsAllTime?: number;
    enrolledLeads: number;
    totalRevenue?: number;
    costPerLead?: string;
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
  spent: number;              // Campaign budget (= total spent)
  leads: number;
  contacted: number;          // consulenze
  enrolled: number;           // contratti
  revenue: number;
  roi: number;
  profit: number;
  conversionRate: number;
  cpl: number;                // Costo per Lead
  costPerConsulenza: number;  // Costo per Consulenza
  costPerContratto: number;   // Costo per Contratto
}

export default function MarketingROIPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<keyof CampaignPerformance>("roi");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterPlatform, setFilterPlatform] = useState("");
  
  // Date range filter state
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Build URL with date parameters for spend filtering
      const campaignParams = new URLSearchParams();
      if (startDate) {
        campaignParams.append("spendStartDate", startDate);
      }
      if (endDate) {
        campaignParams.append("spendEndDate", endDate);
      }
      
      // Build URL with date parameters for leads filtering
      // This ensures CPL calculations use leads from the same period as spend
      const leadsParams = new URLSearchParams();
      if (startDate) {
        leadsParams.append("startDate", startDate);
      }
      if (endDate) {
        leadsParams.append("endDate", endDate);
      }
      
      const campaignsUrl = `/api/campaigns${campaignParams.toString() ? `?${campaignParams}` : ""}`;
      const leadsUrl = `/api/leads${leadsParams.toString() ? `?${leadsParams}` : ""}`;
      
      const [campaignsRes, leadsRes] = await Promise.all([
        fetch(campaignsUrl),
        fetch(leadsUrl),
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
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate campaign performance
  const campaignPerformance = useMemo((): CampaignPerformance[] => {
    return campaigns
      .filter((c) => !filterPlatform || c.platform === filterPlatform)
      .map((campaign) => {
        // Use totalSpent from CampaignSpend records
        const spent = Number(campaign.totalSpent) || 0;
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

        // Use pre-calculated revenue from campaigns API (properly filtered by enrolledAt)
        // This ensures revenue aligns with the selected date range
        // Fallback to client-side calculation only for backwards compatibility
        const coursePrice = campaign.course?.price || 0;
        let revenue: number;
        if (campaign.metrics?.totalRevenue !== undefined) {
          // Use API-calculated revenue (filtered by enrolledAt date range)
          revenue = campaign.metrics.totalRevenue;
        } else {
          // Fallback: calculate from leads (unfiltered - less accurate)
          const enrolledLeads = campaignLeads.filter((l) => l.enrolled || l.status === "ISCRITTO");
          revenue = enrolledLeads.reduce((sum, lead) => {
            const leadRevenue = lead.revenue ? Number(lead.revenue) : 0;
            return sum + (leadRevenue > 0 ? leadRevenue : coursePrice);
          }, 0);
        }

        // Calculate ROI
        const profit = revenue - spent;
        const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;
        const conversionRate = leadCount > 0 ? (enrolledCount / leadCount) * 100 : 0;
        
        // Calculate cost metrics
        const cpl = leadCount > 0 ? spent / leadCount : 0;
        const costPerConsulenza = contactedCount > 0 ? spent / contactedCount : 0;
        const costPerContratto = enrolledCount > 0 ? spent / enrolledCount : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          platformLabel: getPlatformLabel(campaign.platform),
          platformColor: getPlatformColor(campaign.platform),
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

  // ROI trend over time (calculated from spend records by month)
  // Respects the date filter if set, otherwise shows last 6 months
  const roiTrendData = useMemo(() => {
    const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    
    // Aggregate spend records by month
    const monthlyData: Record<string, { spent: number; revenue: number }> = {};
    
    // Determine date range: use filter if set, otherwise last 6 months
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (startDate && endDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
    } else if (startDate) {
      rangeStart = new Date(startDate);
      rangeEnd = new Date();
    } else if (endDate) {
      rangeEnd = new Date(endDate);
      rangeStart = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() - 5, 1);
    } else {
      const now = new Date();
      rangeEnd = now;
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    
    // Generate months between rangeStart and rangeEnd
    const currentMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    
    while (currentMonth <= endMonth) {
      const key = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
      monthlyData[key] = { spent: 0, revenue: 0 };
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    // Aggregate spend from spend records
    campaigns.forEach((campaign) => {
      if (campaign.spendRecords && campaign.spendRecords.length > 0) {
        campaign.spendRecords.forEach((record) => {
          const recordDate = new Date(record.startDate);
          const key = `${recordDate.getFullYear()}-${recordDate.getMonth()}`;
          if (monthlyData[key]) {
            const amount = typeof record.amount === "string" ? parseFloat(record.amount) : record.amount;
            monthlyData[key].spent += amount;
          }
        });
      } else if (campaign.totalSpent > 0) {
        // Fallback: distribute total spent across all months if no records
        const monthKeys = Object.keys(monthlyData);
        const perMonth = campaign.totalSpent / monthKeys.length;
        monthKeys.forEach((key) => {
          monthlyData[key].spent += perMonth;
        });
      }
      
      // Distribute revenue based on enrolled leads
      const campaignLeads = leads.filter((l) => l.campaign?.id === campaign.id);
      const enrolledLeads = campaignLeads.filter((l) => l.enrolled || l.status === "ISCRITTO");
      const coursePrice = campaign.course?.price || 0;
      
      enrolledLeads.forEach((lead) => {
        const leadDate = new Date(lead.createdAt);
        const key = `${leadDate.getFullYear()}-${leadDate.getMonth()}`;
        if (monthlyData[key]) {
          // Use lead.revenue if set, otherwise fall back to course price
          const leadRevenue = lead.revenue ? Number(lead.revenue) : 0;
          const revenue = leadRevenue > 0 ? leadRevenue : coursePrice;
          monthlyData[key].revenue += revenue;
        }
      });
    });
    
    // Convert to chart data with ROI calculation
    return Object.entries(monthlyData).map(([key, data]) => {
      const [year, month] = key.split("-").map(Number);
      const roi = data.spent > 0 ? ((data.revenue - data.spent) / data.spent) * 100 : 0;
      return {
        mese: monthNames[month],
        roi: Math.round(roi),
        spent: Math.round(data.spent),
        revenue: Math.round(data.revenue),
      };
    });
  }, [campaigns, leads, startDate, endDate]);

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

  // Table header with optional help tooltip
  const TableHeader = ({ 
    column, 
    label, 
    helpText 
  }: { 
    column: keyof CampaignPerformance; 
    label: string; 
    helpText?: string;
  }) => (
    <th
      className="p-3 font-medium cursor-pointer hover:text-gray-700"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {helpText && <HelpIcon text={helpText} size="sm" />}
        <SortIcon column={column} />
      </div>
    </th>
  );

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
      </div>

      {/* Stats Cards - Row 1: Revenue & ROI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Ricavo Totale"
          value={`€${overallStats.totalRevenue.toLocaleString("it-IT")}`}
          icon={Euro}
          className="border-green-200"
          tooltip={helpTexts.ricavo}
        />
        <StatCard
          title="Spesa Totale"
          value={`€${overallStats.totalSpent.toLocaleString("it-IT")}`}
          icon={DollarSign}
          className="border-red-200"
          tooltip={helpTexts.spesa}
        />
        <StatCard
          title="ROI %"
          value={`${overallStats.overallRoi.toFixed(1)}%`}
          icon={BarChart3}
          tooltip={helpTexts.roi}
          trend={{
            value: overallStats.overallRoi,
            isPositive: overallStats.overallRoi >= 0,
          }}
        />
        <StatCard
          title="Profitto Netto"
          value={`€${overallStats.totalProfit.toLocaleString("it-IT")}`}
          icon={overallStats.totalProfit >= 0 ? TrendingUp : TrendingDown}
          tooltip={helpTexts.profitto}
          className={
            overallStats.totalProfit >= 0
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        />
      </div>

      {/* Stats Cards - Row 2: Cost Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="CPL (Costo per Lead)"
          value={`€${overallStats.avgCostPerLead.toFixed(2)}`}
          icon={Users}
          subtitle={`${overallStats.totalLeads} lead totali`}
          tooltip={helpTexts.cplEstimato}
        />
        <StatCard
          title="Costo per Consulenza"
          value={`€${overallStats.avgCostPerConsulenza.toFixed(2)}`}
          icon={Phone}
          subtitle={`${overallStats.totalContacted} contattati`}
          tooltip={helpTexts.costoConsulenza}
        />
        <StatCard
          title="Costo per Contratto"
          value={`€${overallStats.avgCostPerContratto.toFixed(2)}`}
          icon={FileCheck}
          subtitle={`${overallStats.totalEnrolled} iscritti`}
          tooltip={helpTexts.costoContratto}
        />
      </div>

      {/* Conversion Funnel Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Funnel di Conversione</h2>
            <p className="text-sm text-gray-500">Panoramica del percorso lead → iscritto</p>
          </div>
          <ROIIndicator value={overallStats.overallRoi} size="md" showTrend />
        </div>
        <MiniFunnel
          total={overallStats.totalLeads}
          contacted={overallStats.totalContacted}
          negotiating={Math.floor(overallStats.totalContacted * 0.6)}
          enrolled={overallStats.totalEnrolled}
          lost={overallStats.totalLeads - overallStats.totalEnrolled - Math.floor(overallStats.totalContacted * 0.3)}
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
        <div className="flex flex-wrap gap-4 items-center justify-between">
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
              {PLATFORM_FILTER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Date Range Filter */}
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
          />
        </div>
        
        {/* Active date filter indicator */}
        {(startDate || endDate) && (
          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
            <span className="font-medium">Periodo analisi:</span>{" "}
            {startDate ? new Date(startDate).toLocaleDateString("it-IT") : "Inizio"} -{" "}
            {endDate ? new Date(endDate).toLocaleDateString("it-IT") : "Fine"}
          </div>
        )}
      </div>

      {/* Performance Table */}
      <CollapsibleSection
        title="Confronto Performance Campagne"
        subtitle="Clicca sulle intestazioni per ordinare"
        badge={sortedCampaigns.length}
        defaultOpen={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="p-3 font-medium">Campagna</th>
                <th className="p-3 font-medium">Platform</th>
                <TableHeader column="spent" label="Spesa" helpText={helpTexts.spesa} />
                <TableHeader column="leads" label="Lead" />
                <TableHeader column="cpl" label="CPL" helpText={helpTexts.cplEstimato} />
                <TableHeader column="costPerConsulenza" label="C/Consulenza" helpText={helpTexts.costoConsulenza} />
                <TableHeader column="costPerContratto" label="C/Contratto" helpText={helpTexts.costoContratto} />
                <TableHeader column="revenue" label="Ricavo" helpText={helpTexts.ricavo} />
                <TableHeader column="roi" label="ROI" helpText={helpTexts.roi} />
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
                  <td className="p-3 font-medium">
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
      </CollapsibleSection>

      {/* ROI Summary by Platform */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">ROI per Piattaforma</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_OPTIONS.map((platform) => {
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
                      className={`px-2 py-1 rounded text-sm font-medium ${getPlatformColor(platform.value)}`}
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
                      <span className="text-gray-500">Spesa</span>
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
