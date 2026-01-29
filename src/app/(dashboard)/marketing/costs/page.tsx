"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import {
  Euro,
  TrendingDown,
  Filter,
  BarChart3,
  Megaphone,
  Users,
  ChevronDown,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  PLATFORM_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  getPlatformLabel,
  getPlatformColor,
} from "@/lib/platforms";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number; // Legacy
  totalSpent: number; // From CampaignSpend records
  status: string;
  leadCount?: number;
  metrics?: {
    totalLeads: number;
  };
  course?: {
    id: string;
    name: string;
  } | null;
}

interface PlatformCost {
  platform: string;
  label: string;
  color: string;
  totalSpent: number;
  campaigns: number;
  leads: number;
  cpl: number;
}

interface SpendRecord {
  id: string;
  startDate: string;
  endDate: string | null;
  amount: number;
  notes: string | null;
}

export default function MarketingCostsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState("");
  
  // Drill-down state
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [spendRecords, setSpendRecords] = useState<Record<string, SpendRecord[]>>({});
  const [loadingSpend, setLoadingSpend] = useState<string | null>(null);
  
  // AbortController ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Date range filter state (strings for DateRangeFilter component)
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  const fetchData = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    try {
      // Build URL with date parameters for spend filtering
      const params = new URLSearchParams();
      if (startDate) {
        params.append("spendStartDate", startDate);
      }
      if (endDate) {
        params.append("spendEndDate", endDate);
      }
      
      const url = `/api/campaigns${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { signal: abortControllerRef.current.signal });
      const data = await res.json();
      setCampaigns(data);
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);
  
  // Fetch spend records for drill-down
  const fetchSpendRecords = useCallback(async (campaignId: string) => {
    if (spendRecords[campaignId]) {
      // Already loaded, just toggle
      setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
      return;
    }
    
    setLoadingSpend(campaignId);
    setExpandedCampaign(campaignId);
    
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const url = `/api/campaigns/${campaignId}/spend${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      
      setSpendRecords(prev => ({
        ...prev,
        [campaignId]: data.records || []
      }));
    } catch (error) {
      console.error("Failed to fetch spend records:", error);
    } finally {
      setLoadingSpend(null);
    }
  }, [startDate, endDate, spendRecords, expandedCampaign]);
  
  // Clear spend records cache when date filter changes
  useEffect(() => {
    setSpendRecords({});
    setExpandedCampaign(null);
  }, [startDate, endDate]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => !filterPlatform || c.platform === filterPlatform);
  }, [campaigns, filterPlatform]);

  // Stats calculations - use totalSpent from CampaignSpend
  const stats = useMemo(() => {
    const totalSpent = filteredCampaigns.reduce(
      (sum, c) => sum + (c.totalSpent || 0),
      0
    );
    const totalLeads = filteredCampaigns.reduce(
      (sum, c) => sum + (c.leadCount || c.metrics?.totalLeads || 0),
      0
    );
    const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const activeCampaigns = filteredCampaigns.filter(c => c.status === "ACTIVE").length;

    return {
      totalSpent,
      totalLeads,
      avgCpl,
      activeCampaigns,
    };
  }, [filteredCampaigns]);

  // Platform-wise cost distribution
  const platformCosts = useMemo((): PlatformCost[] => {
    const platformMap: Record<string, PlatformCost> = {};

    filteredCampaigns.forEach((campaign) => {
      const platform = campaign.platform;

      if (!platformMap[platform]) {
        platformMap[platform] = {
          platform,
          label: getPlatformLabel(platform),
          color: getPlatformColor(platform),
          totalSpent: 0,
          campaigns: 0,
          leads: 0,
          cpl: 0,
        };
      }

      platformMap[platform].totalSpent += campaign.totalSpent || 0;
      platformMap[platform].campaigns += 1;
      platformMap[platform].leads += campaign.leadCount || campaign.metrics?.totalLeads || 0;
    });

    // Calculate CPL for each platform
    Object.values(platformMap).forEach((p) => {
      p.cpl = p.leads > 0 ? p.totalSpent / p.leads : 0;
    });

    return Object.values(platformMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredCampaigns]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analisi Costi</h1>
          <p className="text-gray-500">
            Monitora la spesa delle tue campagne marketing
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Spesa Totale"
          value={`€${stats.totalSpent.toLocaleString("it-IT")}`}
          icon={Euro}
          className="border-l-4 border-l-orange-500"
        />
        <StatCard
          title="Lead Totali"
          value={stats.totalLeads.toLocaleString("it-IT")}
          icon={Users}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Campagne Attive"
          value={stats.activeCampaigns.toString()}
          icon={Megaphone}
          className="border-l-4 border-l-green-500"
        />
        <StatCard
          title="CPL Medio"
          value={`€${stats.avgCpl.toFixed(2)}`}
          icon={TrendingDown}
          tooltip="Costo medio per acquisire un singolo lead (Spesa Totale / Numero Lead)"
          className="border-l-4 border-l-purple-500"
        />
      </div>

      {/* Filters */}
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
            <span className="font-medium">Periodo di spesa:</span>{" "}
            {startDate ? new Date(startDate).toLocaleDateString("it-IT") : "Inizio"} -{" "}
            {endDate ? new Date(endDate).toLocaleDateString("it-IT") : "Fine"}
          </div>
        )}
      </div>

      {/* Platform Cost Distribution */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <h2 className="font-semibold text-gray-900">
            Distribuzione Costi per Piattaforma
          </h2>
        </div>
        <div className="p-4">
          {platformCosts.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Nessun dato disponibile"
              description="Non ci sono ancora campagne con spese registrate."
            />
          ) : (
            <div className="space-y-4">
              {platformCosts.map((platform) => {
                const percentage =
                  stats.totalSpent > 0
                    ? (platform.totalSpent / stats.totalSpent) * 100
                    : 0;

                return (
                  <div key={platform.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-medium ${platform.color}`}
                        >
                          {platform.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {platform.campaigns} campagne
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          {platform.leads} lead
                        </span>
                        <span className="text-gray-500">
                          CPL: €{platform.cpl.toFixed(2)}
                        </span>
                        <span className="font-semibold">
                          €{platform.totalSpent.toLocaleString("it-IT")}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage.toFixed(1)}% del totale
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Campaign List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Dettaglio Campagne</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 bg-gray-50 border-b">
                <th className="p-4 font-medium">Campagna</th>
                <th className="p-4 font-medium">Piattaforma</th>
                <th className="p-4 font-medium">Corso</th>
                <th className="p-4 font-medium text-right">Spesa Totale</th>
                <th className="p-4 font-medium text-right">Lead</th>
                <th className="p-4 font-medium text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign) => {
                const leads = campaign.leadCount || campaign.metrics?.totalLeads || 0;
                const cpl = leads > 0 ? (campaign.totalSpent || 0) / leads : 0;
                const isExpanded = expandedCampaign === campaign.id;
                const isLoading = loadingSpend === campaign.id;
                const records = spendRecords[campaign.id] || [];

                return (
                  <React.Fragment key={campaign.id}>
                    <tr 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => fetchSpendRecords(campaign.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900">{campaign.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                          {getPlatformLabel(campaign.platform)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">
                        {campaign.course?.name || "-"}
                      </td>
                      <td className="p-4 text-right font-semibold">
                        €{(campaign.totalSpent || 0).toLocaleString("it-IT")}
                      </td>
                      <td className="p-4 text-right text-gray-600">
                        {leads}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-medium ${cpl > 50 ? "text-red-600" : cpl > 30 ? "text-yellow-600" : "text-green-600"}`}>
                          €{cpl.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Drill-down: Spend Records */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 p-0">
                          <div className="p-4 pl-10 border-l-4 border-orange-300">
                            <div className="flex items-center gap-2 mb-3">
                              <Calendar size={14} className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">
                                Storico Spese
                              </span>
                            </div>
                            
                            {isLoading ? (
                              <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                              </div>
                            ) : records.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">
                                Nessuna spesa registrata per questa campagna.
                              </p>
                            ) : (
                              <div className="bg-white rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-100 text-gray-600">
                                      <th className="px-3 py-2 text-left font-medium">Periodo</th>
                                      <th className="px-3 py-2 text-right font-medium">Importo</th>
                                      <th className="px-3 py-2 text-left font-medium">Note</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {records.map((record) => (
                                      <tr key={record.id} className="border-t hover:bg-gray-50">
                                        <td className="px-3 py-2">
                                          {new Date(record.startDate).toLocaleDateString("it-IT")}
                                          {record.endDate && (
                                            <span className="text-gray-400">
                                              {" → "}
                                              {new Date(record.endDate).toLocaleDateString("it-IT")}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">
                                          €{Number(record.amount).toLocaleString("it-IT")}
                                        </td>
                                        <td className="px-3 py-2 text-gray-500">
                                          {record.notes || "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nessuna campagna trovata
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
