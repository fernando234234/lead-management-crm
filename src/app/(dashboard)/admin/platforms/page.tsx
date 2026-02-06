"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
} from "lucide-react";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import {
  PLATFORMS,
  PLATFORM_OPTIONS,
  getPlatformLabel,
  getPlatformColor,
  getPlatformChartColor,
  type Platform,
} from "@/lib/platforms";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  status: string;
  totalSpent: number;
  course?: { id: string; name: string } | null;
  masterCampaign?: { id: string; name: string } | null;
  metrics?: {
    totalLeads: number;
    contactedLeads: number;
    enrolledLeads: number;
  };
}

interface Course {
  id: string;
  name: string;
}

interface PlatformStats {
  platform: Platform;
  totalSpent: number;
  totalLeads: number;
  contacted: number;
  enrolled: number;
  campaigns: number;
  cpl: number;
  conversionRate: number;
}

export default function PlatformAnalyticsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.set("spendStartDate", filterStartDate);
      if (filterEndDate) params.set("spendEndDate", filterEndDate);

      const [campaignsRes, coursesRes] = await Promise.all([
        fetch(`/api/campaigns?${params.toString()}`),
        fetch("/api/courses"),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data);
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterCourse && c.course?.id !== filterCourse) return false;
      if (filterPlatform && c.platform !== filterPlatform) return false;
      return true;
    });
  }, [campaigns, filterCourse, filterPlatform]);

  // Calculate platform stats
  const platformStats = useMemo((): PlatformStats[] => {
    const stats: Record<string, PlatformStats> = {};

    PLATFORMS.forEach((platform) => {
      stats[platform] = {
        platform,
        totalSpent: 0,
        totalLeads: 0,
        contacted: 0,
        enrolled: 0,
        campaigns: 0,
        cpl: 0,
        conversionRate: 0,
      };
    });

    filteredCampaigns.forEach((campaign) => {
      const platform = campaign.platform;
      if (stats[platform]) {
        stats[platform].totalSpent += campaign.totalSpent || 0;
        stats[platform].totalLeads += campaign.metrics?.totalLeads || 0;
        stats[platform].contacted += campaign.metrics?.contactedLeads || 0;
        stats[platform].enrolled += campaign.metrics?.enrolledLeads || 0;
        stats[platform].campaigns += 1;
      }
    });

    // Calculate derived metrics
    Object.values(stats).forEach((s) => {
      s.cpl = s.totalLeads > 0 ? s.totalSpent / s.totalLeads : 0;
      s.conversionRate = s.totalLeads > 0 ? (s.enrolled / s.totalLeads) * 100 : 0;
    });

    return Object.values(stats).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredCampaigns]);

  // Totals
  const totals = useMemo(() => {
    return platformStats.reduce(
      (acc, s) => ({
        spent: acc.spent + s.totalSpent,
        leads: acc.leads + s.totalLeads,
        contacted: acc.contacted + s.contacted,
        enrolled: acc.enrolled + s.enrolled,
        campaigns: acc.campaigns + s.campaigns,
      }),
      { spent: 0, leads: 0, contacted: 0, enrolled: 0, campaigns: 0 }
    );
  }, [platformStats]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return platformStats
      .filter((s) => s.totalSpent > 0)
      .map((s) => ({
        name: getPlatformLabel(s.platform),
        value: s.totalSpent,
        color: getPlatformChartColor(s.platform),
      }));
  }, [platformStats]);

  // Bar chart data (leads per platform)
  const leadsBarData = useMemo(() => {
    return platformStats.map((s) => ({
      platform: getPlatformLabel(s.platform, true),
      lead: s.totalLeads,
      iscritti: s.enrolled,
      fill: getPlatformChartColor(s.platform),
    }));
  }, [platformStats]);

  // CPL comparison
  const cplData = useMemo(() => {
    return platformStats
      .filter((s) => s.cpl > 0)
      .map((s) => ({
        platform: getPlatformLabel(s.platform, true),
        cpl: s.cpl,
        fill: getPlatformChartColor(s.platform),
      }));
  }, [platformStats]);

  // Get campaigns for a platform
  const getCampaignsForPlatform = (platform: Platform) => {
    return filteredCampaigns
      .filter((c) => c.platform === platform)
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyDecimal = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-admin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analisi Piattaforme</h1>
        <p className="text-sm text-gray-500 mt-1">
          Performance aggregate per piattaforma pubblicitaria
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Questa analisi include solo i lead associati a campagne. I lead importati senza associazione a una campagna non sono inclusi nei conteggi.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtri:</span>
          </div>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutti i corsi</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>

          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-admin"
          >
            <option value="">Tutte le piattaforme</option>
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <DateRangeFilter
            startDate={filterStartDate || null}
            endDate={filterEndDate || null}
            onChange={(start, end) => {
              setFilterStartDate(start || "");
              setFilterEndDate(end || "");
            }}
            presets
            accent="admin"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Spesa Totale</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totals.spent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Lead Totali</p>
              <p className="text-lg font-bold text-gray-900">{totals.leads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Iscritti</p>
              <p className="text-lg font-bold text-gray-900">{totals.enrolled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">CPL Medio</p>
              <p className="text-lg font-bold text-gray-900">
                {totals.leads > 0 ? formatCurrencyDecimal(totals.spent / totals.leads) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Campagne</p>
              <p className="text-lg font-bold text-gray-900">{totals.campaigns}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Distribution Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuzione Spesa</h3>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              Nessun dato
            </div>
          )}
        </div>

        {/* Leads per Platform Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead per Piattaforma</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leadsBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="lead" name="Lead" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="iscritti" name="Iscritti" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CPL Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CPL per Piattaforma</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cplData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} tickFormatter={(v) => `€${v}`} />
              <YAxis dataKey="platform" type="category" fontSize={12} width={60} />
              <Tooltip formatter={(value) => formatCurrencyDecimal(Number(value))} />
              <Bar dataKey="cpl" name="CPL" radius={[0, 4, 4, 0]}>
                {cplData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform Detail Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Dettaglio per Piattaforma</h2>

        {platformStats.map((stats) => {
          const isExpanded = expandedPlatform === stats.platform;
          const platformCampaigns = getCampaignsForPlatform(stats.platform);
          const spendPercentage = totals.spent > 0 ? (stats.totalSpent / totals.spent) * 100 : 0;

          return (
            <div
              key={stats.platform}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedPlatform(isExpanded ? null : stats.platform)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlatformColor(
                        stats.platform
                      )}`}
                    >
                      {getPlatformLabel(stats.platform)}
                    </span>
                    <div className="text-sm text-gray-500">
                      {stats.campaigns} campagne
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Spesa</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
                      <p className="text-xs text-gray-400">{spendPercentage.toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Lead</p>
                      <p className="font-semibold text-gray-900">{stats.totalLeads}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Iscritti</p>
                      <p className="font-semibold text-gray-900">{stats.enrolled}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">CPL</p>
                      <p className="font-semibold text-gray-900">
                        {stats.cpl > 0 ? formatCurrencyDecimal(stats.cpl) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Conv.</p>
                      <p className="font-semibold text-gray-900">
                        {stats.conversionRate > 0 ? `${stats.conversionRate.toFixed(1)}%` : "—"}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {platformCampaigns.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nessuna campagna per questa piattaforma</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="pb-2 font-medium">Campagna</th>
                            <th className="pb-2 font-medium">Corso</th>
                            <th className="pb-2 font-medium text-right">Spesa</th>
                            <th className="pb-2 font-medium text-right">Lead</th>
                            <th className="pb-2 font-medium text-right">Iscritti</th>
                            <th className="pb-2 font-medium text-right">CPL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {platformCampaigns.map((campaign) => {
                            const cpl =
                              (campaign.metrics?.totalLeads || 0) > 0
                                ? (campaign.totalSpent || 0) / (campaign.metrics?.totalLeads || 1)
                                : 0;
                            return (
                              <tr key={campaign.id} className="hover:bg-white">
                                <td className="py-2">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {campaign.masterCampaign?.name || campaign.name}
                                    </p>
                                    {campaign.masterCampaign && (
                                      <p className="text-xs text-gray-400">{campaign.name}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 text-gray-600">
                                  {campaign.course?.name || "—"}
                                </td>
                                <td className="py-2 text-right font-medium">
                                  {formatCurrency(campaign.totalSpent || 0)}
                                </td>
                                <td className="py-2 text-right">
                                  {campaign.metrics?.totalLeads || 0}
                                </td>
                                <td className="py-2 text-right">
                                  {campaign.metrics?.enrolledLeads || 0}
                                </td>
                                <td className="py-2 text-right">
                                  {cpl > 0 ? formatCurrencyDecimal(cpl) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
