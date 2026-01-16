"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCampaigns } from "@/lib/mockData";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { HelpIcon } from "@/components/ui/HelpIcon";
import {
  Euro,
  Wallet,
  PiggyBank,
  TrendingDown,
  TestTube,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
  BarChart3,
} from "lucide-react";

// Platform options
const platformOptions = [
  { value: "FACEBOOK", label: "Facebook", color: "bg-blue-100 text-blue-700" },
  { value: "INSTAGRAM", label: "Instagram", color: "bg-pink-100 text-pink-700" },
  { value: "LINKEDIN", label: "LinkedIn", color: "bg-sky-100 text-sky-700" },
  { value: "GOOGLE_ADS", label: "Google Ads", color: "bg-red-100 text-red-700" },
  { value: "TIKTOK", label: "TikTok", color: "bg-gray-100 text-gray-700" },
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
  totalSpent?: number;
  cost?: number;
  status: string;
  startDate: string;
  spendRecords?: SpendRecord[];
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
  budget: number;
  campaigns: number;
  leads: number;
  cpl: number;
}

type TimeBreakdown = "daily" | "weekly" | "monthly";

export default function MarketingCostsPage() {
  const { isDemoMode } = useDemoMode();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [timeBreakdown, setTimeBreakdown] = useState<TimeBreakdown>("weekly");
  const [filterPlatform, setFilterPlatform] = useState("");

  useEffect(() => {
    if (isDemoMode) {
      setCampaigns(mockCampaigns as Campaign[]);
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

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => !filterPlatform || c.platform === filterPlatform);
  }, [campaigns, filterPlatform]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalSpent = filteredCampaigns.reduce(
      (sum, c) => sum + (c.totalSpent || c.cost || 0),
      0
    );
    const totalBudget = filteredCampaigns.reduce(
      (sum, c) => sum + (c.budget || 0),
      0
    );
    const remainingBudget = totalBudget - totalSpent;
    const totalLeads = filteredCampaigns.reduce(
      (sum, c) => sum + (c.leadCount || c.metrics?.totalLeads || 0),
      0
    );
    const avgCpl = totalLeads > 0 ? totalSpent / totalLeads : 0;

    return {
      totalSpent,
      totalBudget,
      remainingBudget,
      avgCpl,
    };
  }, [filteredCampaigns]);

  // Platform-wise cost distribution
  const platformCosts = useMemo((): PlatformCost[] => {
    const platformMap: Record<string, PlatformCost> = {};

    filteredCampaigns.forEach((campaign) => {
      const platform = campaign.platform;
      const platformConfig = platformOptions.find((p) => p.value === platform);

      if (!platformMap[platform]) {
        platformMap[platform] = {
          platform,
          label: platformConfig?.label || platform,
          color: platformConfig?.color || "bg-gray-100 text-gray-700",
          totalSpent: 0,
          budget: 0,
          campaigns: 0,
          leads: 0,
          cpl: 0,
        };
      }

      platformMap[platform].totalSpent += campaign.totalSpent || campaign.cost || 0;
      platformMap[platform].budget += campaign.budget || 0;
      platformMap[platform].campaigns += 1;
      platformMap[platform].leads += campaign.leadCount || campaign.metrics?.totalLeads || 0;
    });

    // Calculate CPL for each platform
    Object.values(platformMap).forEach((p) => {
      p.cpl = p.leads > 0 ? p.totalSpent / p.leads : 0;
    });

    return Object.values(platformMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredCampaigns]);

  // Time-based spend breakdown
  const spendBreakdown = useMemo(() => {
    const allSpends: { date: string; amount: number; campaign: string }[] = [];

    filteredCampaigns.forEach((campaign) => {
      if (campaign.spendRecords) {
        campaign.spendRecords.forEach((record) => {
          allSpends.push({
            date: record.date,
            amount: record.amount,
            campaign: campaign.name,
          });
        });
      }
    });

    // Group by period
    const grouped: Record<string, { period: string; total: number; count: number }> = {};

    allSpends.forEach((spend) => {
      const date = new Date(spend.date);
      let periodKey: string;

      if (timeBreakdown === "daily") {
        periodKey = date.toISOString().split("T")[0];
      } else if (timeBreakdown === "weekly") {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        periodKey = `Sett. ${startOfWeek.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}`;
      } else {
        periodKey = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = { period: periodKey, total: 0, count: 0 };
      }
      grouped[periodKey].total += spend.amount;
      grouped[periodKey].count += 1;
    });

    return Object.values(grouped).sort((a, b) => b.period.localeCompare(a.period)).slice(0, 10);
  }, [filteredCampaigns, timeBreakdown]);

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
        {isDemoMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            <TestTube size={16} />
            Demo
          </div>
        )}
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
          title="Budget Totale"
          value={`€${stats.totalBudget.toLocaleString("it-IT")}`}
          icon={Wallet}
          className="border-l-4 border-l-blue-500"
        />
        <StatCard
          title="Budget Rimanente"
          value={`€${stats.remainingBudget.toLocaleString("it-IT")}`}
          icon={PiggyBank}
          className={stats.remainingBudget < 0 ? "border-l-4 border-l-red-500 bg-red-50" : "border-l-4 border-l-green-500"}
        />
        <StatCard
          title="Costo per Lead"
          value={`€${stats.avgCpl.toFixed(2)}`}
          icon={TrendingDown}
          tooltip="Costo medio per acquisire un singolo lead (Spesa Totale / Numero Lead)"
          className="border-l-4 border-l-purple-500"
        />
      </div>

      {/* Filters */}
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
                const budgetUsage =
                  platform.budget > 0
                    ? (platform.totalSpent / platform.budget) * 100
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
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{percentage.toFixed(1)}% del totale</span>
                      <span
                        className={
                          budgetUsage > 90
                            ? "text-red-600 font-medium"
                            : budgetUsage > 70
                            ? "text-yellow-600 font-medium"
                            : "text-green-600 font-medium"
                        }
                      >
                        {budgetUsage.toFixed(0)}% del budget utilizzato
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Time-based Spend Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Andamento Spese</h2>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as TimeBreakdown[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimeBreakdown(period)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  timeBreakdown === period
                    ? "bg-marketing text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {period === "daily"
                  ? "Giornaliero"
                  : period === "weekly"
                  ? "Settimanale"
                  : "Mensile"}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          {spendBreakdown.length > 0 ? (
            <div className="space-y-2">
              {spendBreakdown.map((period, index) => {
                const maxAmount = Math.max(...spendBreakdown.map((p) => p.total));
                const barWidth = maxAmount > 0 ? (period.total / maxAmount) * 100 : 0;

                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-40 text-sm text-gray-600 truncate">
                      {period.period}
                    </div>
                    <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-500 rounded-lg transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(barWidth, 5)}%` }}
                      >
                        {barWidth > 20 && (
                          <span className="text-xs font-medium text-white">
                            €{period.total.toLocaleString("it-IT")}
                          </span>
                        )}
                      </div>
                    </div>
                    {barWidth <= 20 && (
                      <span className="text-sm font-medium text-gray-700 w-24 text-right">
                        €{period.total.toLocaleString("it-IT")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Nessun record di spesa disponibile
            </div>
          )}
        </div>
      </div>

      {/* Campaign Spend Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">Dettaglio Spese per Campagna</h2>
        </div>
        <div className="divide-y">
          {filteredCampaigns.map((campaign) => {
            const totalSpent = campaign.totalSpent || campaign.cost || 0;
            const budget = campaign.budget || 0;
            const budgetUsage = budget > 0 ? (totalSpent / budget) * 100 : 0;

            return (
              <div key={campaign.id}>
                <button
                  onClick={() => toggleCampaignExpanded(campaign.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    {expandedCampaigns.has(campaign.id) ? (
                      <ChevronDown size={18} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={18} className="text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                          {getPlatformLabel(campaign.platform)}
                        </span>
                        {campaign.course && (
                          <span className="text-xs text-gray-500">
                            {campaign.course.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold">
                        €{totalSpent.toLocaleString("it-IT")}
                      </p>
                      <p className="text-xs text-gray-500">
                        di €{budget.toLocaleString("it-IT")}
                      </p>
                    </div>
                    <div className="w-24">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            budgetUsage > 90
                              ? "bg-red-500"
                              : budgetUsage > 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {budgetUsage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </button>

                {/* Spend Records */}
                {expandedCampaigns.has(campaign.id) && (
                  <div className="bg-gray-50 px-4 pb-4">
                    {campaign.spendRecords && campaign.spendRecords.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 font-medium">Data</th>
                            <th className="py-2 font-medium">Importo</th>
                            <th className="py-2 font-medium">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaign.spendRecords.map((record) => (
                            <tr key={record.id} className="border-t border-gray-200">
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  {new Date(record.date).toLocaleDateString("it-IT")}
                                </div>
                              </td>
                              <td className="py-2 font-medium">
                                €{record.amount.toLocaleString("it-IT")}
                              </td>
                              <td className="py-2 text-gray-500">
                                {record.notes || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-gray-500 text-sm py-4 text-center">
                        Nessun record di spesa per questa campagna
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredCampaigns.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nessuna campagna trovata
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
