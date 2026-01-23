"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { helpTexts } from "@/lib/helpTexts";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import {
  Users,
  TrendingUp,
  Euro,
  Target,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Facebook,
  Linkedin,
  Filter,
} from "lucide-react";
import ExportButton from "@/components/ui/ExportButton";

// Export columns configuration
const campaignPerformanceExportColumns = [
  { key: "name", label: "Campagna" },
  { key: "platform", label: "Piattaforma" },
  { key: "course.name", label: "Corso" },
  { key: "budget", label: "Spesa Totale" },
  { key: "leadCount", label: "Lead" },
  { key: "cpl", label: "CPL" },
  { key: "conversionRate", label: "Conversione %" },
  { key: "roi", label: "ROI %" },
];

const coursePerformanceExportColumns = [
  { key: "name", label: "Corso" },
  { key: "price", label: "Prezzo" },
  { key: "totalLeads", label: "Lead" },
  { key: "enrolled", label: "Iscritti" },
  { key: "revenue", label: "Ricavo" },
  { key: "activeCampaigns", label: "Campagne Attive" },
];

const commercialPerformanceExportColumns = [
  { key: "name", label: "Commerciale" },
  { key: "assigned", label: "Lead Assegnati" },
  { key: "contacted", label: "Contattati" },
  { key: "enrolled", label: "Iscritti" },
  { key: "conversionRate", label: "Tasso Conversione %" },
];

// Types
interface Stats {
  overview: {
    totalLeads: number;
    enrolledLeads: number;
    conversionRate: string;
  };
  financial: {
    totalRevenue: number;
    totalCost: number;
    roi: string;
  };
  leadsByStatus: { status: string; count: number }[];
}

interface Lead {
  id: string;
  status: string;
  enrolled: boolean;
  contacted: boolean;
  createdAt: string;
  acquisitionCost: number | null;
  revenue: number | string | null; // Lead-specific revenue
  course: { id: string; name: string; price: number } | null;
  campaign: { id: string; name: string; platform: string } | null;
  assignedTo: { id: string; name: string } | null;
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
  spendRecords?: SpendRecord[]; // Individual spend records
  startDate: string | null;
  leadCount: number;
  course: { id: string; name: string; price: number } | null;
  metrics: {
    totalLeads: number;
    enrolledLeads: number;
    totalRevenue?: number; // Actual revenue from leads
    conversionRate: string;
    costPerLead: string;
  };
}

interface Course {
  id: string;
  name: string;
  price: number;
  active: boolean;
  _count: { leads: number; campaigns: number };
}

interface User {
  id: string;
  name: string;
  role: string;
}

type SortDirection = "asc" | "desc" | null;
type CampaignSortField = "name" | "platform" | "budget" | "leadCount" | "cpl" | "conversionRate" | "roi";
type CourseSortField = "name" | "price" | "leads" | "enrolled" | "revenue" | "campaigns";
type CommercialSortField = "name" | "assigned" | "contacted" | "enrolled" | "conversionRate";

const platformLabels: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  GOOGLE_ADS: "Google Ads",
  TIKTOK: "TikTok",
};

const platformIcons: Record<string, React.ReactNode> = {
  FACEBOOK: <Facebook size={16} className="text-blue-600" />,
  INSTAGRAM: <div className="w-4 h-4 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded" />,
  LINKEDIN: <Linkedin size={16} className="text-blue-700" />,
  GOOGLE_ADS: <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center text-white text-xs font-bold">G</div>,
  TIKTOK: <div className="w-4 h-4 bg-black rounded flex items-center justify-center text-white text-xs font-bold">T</div>,
};

const statusLabels: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

const FUNNEL_COLORS = {
  NUOVO: "#3b82f6",
  CONTATTATO: "#eab308",
  IN_TRATTATIVA: "#a855f7",
  ISCRITTO: "#22c55e",
};

const PLATFORM_COLORS: Record<string, string> = {
  FACEBOOK: "#1877f2",
  INSTAGRAM: "#e4405f",
  LINKEDIN: "#0077b5",
  GOOGLE_ADS: "#ea4335",
  TIKTOK: "#000000",
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Date range filter state
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Sort states
  const [campaignSort, setCampaignSort] = useState<{ field: CampaignSortField; direction: SortDirection }>({
    field: "leadCount",
    direction: "desc",
  });
  const [courseSort, setCourseSort] = useState<{ field: CourseSortField; direction: SortDirection }>({
    field: "revenue",
    direction: "desc",
  });
  const [commercialSort, setCommercialSort] = useState<{ field: CommercialSortField; direction: SortDirection }>({
    field: "conversionRate",
    direction: "desc",
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build URL with date parameters
      const params = new URLSearchParams();
      if (startDate) {
        params.append("spendStartDate", startDate);
      }
      if (endDate) {
        params.append("spendEndDate", endDate);
      }
      const campaignsUrl = `/api/campaigns${params.toString() ? `?${params}` : ""}`;

      const [statsRes, leadsRes, campaignsRes, coursesRes, usersRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/leads"),
        fetch(campaignsUrl),
        fetch("/api/courses"),
        fetch("/api/users"),
      ]);

      if (!statsRes.ok || !leadsRes.ok || !campaignsRes.ok || !coursesRes.ok || !usersRes.ok) {
        throw new Error("Errore nel caricamento dei dati");
      }

      const [statsData, leadsData, campaignsData, coursesData, usersData] = await Promise.all([
        statsRes.json(),
        leadsRes.json(),
        campaignsRes.json(),
        coursesRes.json(),
        usersRes.json(),
      ]);

      setStats(statsData);
      setLeads(Array.isArray(leadsData) ? leadsData : leadsData.leads || []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : campaignsData.campaigns || []);
      setCourses(Array.isArray(coursesData) ? coursesData : coursesData.courses || []);
      setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Impossibile caricare i dati. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Calculate funnel data
  const funnelData = useMemo(() => {
    const statusCounts = stats?.leadsByStatus || [];
    const getCount = (status: string) => statusCounts.find((s) => s.status === status)?.count || 0;

    const nuovo = getCount("NUOVO");
    const contattato = getCount("CONTATTATO");
    const inTrattativa = getCount("IN_TRATTATIVA");
    const iscritto = getCount("ISCRITTO");
    const perso = getCount("PERSO");
    const total = nuovo + contattato + inTrattativa + iscritto + perso;

    return {
      stages: [
        { name: statusLabels.NUOVO, value: nuovo, color: FUNNEL_COLORS.NUOVO },
        { name: statusLabels.CONTATTATO, value: contattato, color: FUNNEL_COLORS.CONTATTATO },
        { name: statusLabels.IN_TRATTATIVA, value: inTrattativa, color: FUNNEL_COLORS.IN_TRATTATIVA },
        { name: statusLabels.ISCRITTO, value: iscritto, color: FUNNEL_COLORS.ISCRITTO },
      ],
      perso: { count: perso, percentage: total > 0 ? (perso / total) * 100 : 0 },
      total,
    };
  }, [stats]);

  // Platform breakdown for pie chart
  const platformPieData = useMemo(() => {
    const platforms = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "GOOGLE_ADS", "TIKTOK"];
    return platforms
      .map((platform) => {
        const platformCampaigns = campaigns.filter((c) => c.platform === platform);
        const spent = platformCampaigns.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        return {
          name: platformLabels[platform],
          value: spent,
          platform,
        };
      })
      .filter((p) => p.value > 0);
  }, [campaigns]);

  // Commercial performance bar chart data
  const commercialBarData = useMemo(() => {
    const commercials = users.filter((u) => u.role === "COMMERCIAL");
    return commercials.map((user) => {
      const assignedLeads = leads.filter((l) => l.assignedTo?.id === user.id);
      const enrolled = assignedLeads.filter((l) => l.enrolled).length;
      return {
        nome: user.name.split(" ")[0],
        iscritti: enrolled,
      };
    });
  }, [users, leads]);

  // Revenue/Cost trend line chart data - aggregate by month using spend record dates
  const revenueCostTrend = useMemo(() => {
    const monthData = new Map<string, { ricavi: number; costi: number }>();
    
    // Get last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthData.set(key, { ricavi: 0, costi: 0 });
    }
    
    // Aggregate revenue from leads by month
    leads.forEach((lead) => {
      const leadDate = new Date(lead.createdAt);
      const key = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthData.has(key)) {
        const data = monthData.get(key)!;
        // Revenue from enrolled leads
        if (lead.enrolled && lead.course) {
          data.ricavi += lead.course.price || 0;
        }
      }
    });
    
    // Aggregate costs from spend records by their startDate (more accurate than campaign startDate)
    campaigns.forEach((campaign) => {
      if (campaign.spendRecords && campaign.spendRecords.length > 0) {
        // Use individual spend record dates
        campaign.spendRecords.forEach((record) => {
          const recordDate = new Date(record.startDate);
          const key = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (monthData.has(key)) {
            const data = monthData.get(key)!;
            const amount = typeof record.amount === "string" ? parseFloat(record.amount) : record.amount;
            data.costi += amount || 0;
          }
        });
      } else if (campaign.totalSpent > 0 && campaign.startDate) {
        // Fallback: use campaign startDate if no spend records
        const campaignDate = new Date(campaign.startDate);
        const key = `${campaignDate.getFullYear()}-${String(campaignDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthData.has(key)) {
          const data = monthData.get(key)!;
          data.costi += campaign.totalSpent || 0;
        }
      }
    });
    
    // Convert to array with Italian month names
    const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    return Array.from(monthData.entries()).map(([key, data]) => {
      const [, month] = key.split('-');
      return {
        mese: monthNames[parseInt(month) - 1],
        ricavi: data.ricavi,
        costi: data.costi,
      };
    });
  }, [leads, campaigns]);

  // Calculate campaign performance with sorting
  const campaignPerformance = useMemo(() => {
    const data = campaigns.map((campaign) => {
      const spent = campaign.totalSpent || 0;
      const cpl = campaign.leadCount > 0 ? spent / campaign.leadCount : 0;
      // Use pre-calculated totalRevenue from API (which uses lead.revenue)
      // Fall back to enrolled * course.price for backwards compatibility
      const revenue = campaign.metrics.totalRevenue !== undefined 
        ? campaign.metrics.totalRevenue 
        : campaign.metrics.enrolledLeads * (campaign.course?.price || 0);
      const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;

      return {
        ...campaign,
        cpl,
        revenue,
        roi,
        conversionRate: parseFloat(campaign.metrics.conversionRate) || 0,
      };
    });

    // Find best and worst performers
    const activeCampaigns = data.filter((c) => c.leadCount > 0);
    const bestROI = activeCampaigns.length > 0 ? Math.max(...activeCampaigns.map((c) => c.roi)) : null;
    const worstROI = activeCampaigns.length > 0 ? Math.min(...activeCampaigns.map((c) => c.roi)) : null;

    // Sort
    const sorted = [...data].sort((a, b) => {
      if (!campaignSort.direction) return 0;
      const multiplier = campaignSort.direction === "asc" ? 1 : -1;

      switch (campaignSort.field) {
        case "name":
          return a.name.localeCompare(b.name) * multiplier;
        case "platform":
          return a.platform.localeCompare(b.platform) * multiplier;
        case "budget":
          return ((a.totalSpent || 0) - (b.totalSpent || 0)) * multiplier;
        case "leadCount":
          return (a.leadCount - b.leadCount) * multiplier;
        case "cpl":
          return (a.cpl - b.cpl) * multiplier;
        case "conversionRate":
          return (a.conversionRate - b.conversionRate) * multiplier;
        case "roi":
          return (a.roi - b.roi) * multiplier;
        default:
          return 0;
      }
    });

    return { data: sorted, bestROI, worstROI };
  }, [campaigns, campaignSort]);

  // Calculate course performance with sorting
  const coursePerformance = useMemo(() => {
    const data = courses.map((course) => {
      const courseLeads = leads.filter((l) => l.course?.id === course.id);
      const enrolledLeads = courseLeads.filter((l) => l.enrolled);
      const enrolled = enrolledLeads.length;
      // Use lead.revenue if set, otherwise fall back to course.price
      const revenue = enrolledLeads.reduce((sum, lead) => {
        const leadRevenue = lead.revenue ? Number(lead.revenue) : 0;
        return sum + (leadRevenue > 0 ? leadRevenue : course.price);
      }, 0);
      const activeCampaigns = campaigns.filter((c) => c.course?.id === course.id).length;

      return {
        ...course,
        totalLeads: courseLeads.length,
        enrolled,
        revenue,
        activeCampaigns,
      };
    });

    // Sort
    const sorted = [...data].sort((a, b) => {
      if (!courseSort.direction) return 0;
      const multiplier = courseSort.direction === "asc" ? 1 : -1;

      switch (courseSort.field) {
        case "name":
          return a.name.localeCompare(b.name) * multiplier;
        case "price":
          return (a.price - b.price) * multiplier;
        case "leads":
          return (a.totalLeads - b.totalLeads) * multiplier;
        case "enrolled":
          return (a.enrolled - b.enrolled) * multiplier;
        case "revenue":
          return (a.revenue - b.revenue) * multiplier;
        case "campaigns":
          return (a.activeCampaigns - b.activeCampaigns) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [courses, leads, campaigns, courseSort]);

  // Calculate commercial performance with sorting
  const commercialPerformance = useMemo(() => {
    const commercials = users.filter((u) => u.role === "COMMERCIAL");

    const data = commercials.map((user) => {
      const assignedLeads = leads.filter((l) => l.assignedTo?.id === user.id);
      const contacted = assignedLeads.filter((l) => l.status !== "NUOVO").length;
      const enrolled = assignedLeads.filter((l) => l.enrolled).length;
      const conversionRate = assignedLeads.length > 0 ? (enrolled / assignedLeads.length) * 100 : 0;

      return {
        ...user,
        assigned: assignedLeads.length,
        contacted,
        enrolled,
        conversionRate,
      };
    });

    // Sort
    const sorted = [...data].sort((a, b) => {
      if (!commercialSort.direction) return 0;
      const multiplier = commercialSort.direction === "asc" ? 1 : -1;

      switch (commercialSort.field) {
        case "name":
          return a.name.localeCompare(b.name) * multiplier;
        case "assigned":
          return (a.assigned - b.assigned) * multiplier;
        case "contacted":
          return (a.contacted - b.contacted) * multiplier;
        case "enrolled":
          return (a.enrolled - b.enrolled) * multiplier;
        case "conversionRate":
          return (a.conversionRate - b.conversionRate) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  }, [users, leads, commercialSort]);

  // Calculate platform breakdown
  const platformBreakdown = useMemo(() => {
    const platforms = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "GOOGLE_ADS", "TIKTOK"];

    return platforms.map((platform) => {
      const platformCampaigns = campaigns.filter((c) => c.platform === platform);
      const totalLeads = platformCampaigns.reduce((sum, c) => sum + c.leadCount, 0);
      const spent = platformCampaigns.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
      const cpl = totalLeads > 0 ? spent / totalLeads : 0;
      const enrolled = platformCampaigns.reduce((sum, c) => sum + c.metrics.enrolledLeads, 0);
      const conversionRate = totalLeads > 0 ? (enrolled / totalLeads) * 100 : 0;

      return {
        platform,
        campaignCount: platformCampaigns.length,
        totalLeads,
        totalSpent: spent,
        cpl,
        enrolled,
        conversionRate,
      };
    }).filter((p) => p.campaignCount > 0);
  }, [campaigns]);

  // Sort toggle handler
  const handleSort = <T extends string>(
    field: T,
    currentSort: { field: T; direction: SortDirection },
    setSort: React.Dispatch<React.SetStateAction<{ field: T; direction: SortDirection }>>
  ) => {
    if (currentSort.field === field) {
      setSort({
        field,
        direction: currentSort.direction === "asc" ? "desc" : currentSort.direction === "desc" ? null : "asc",
      });
    } else {
      setSort({ field, direction: "desc" });
    }
  };

  // Sort indicator component
  const SortIndicator = ({ field, currentSort }: { field: string; currentSort: { field: string; direction: SortDirection } }) => {
    if (currentSort.field !== field || !currentSort.direction) {
      return <ArrowUpDown size={14} className="text-gray-300" />;
    }
    return currentSort.direction === "asc" ? (
      <ArrowUp size={14} className="text-admin" />
    ) : (
      <ArrowDown size={14} className="text-admin" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-admin/30 border-t-admin rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchAllData}
          className="px-4 py-2 bg-admin text-white rounded-lg hover:bg-admin/90 transition-colors"
        >
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-admin" />
            Report e Analisi
          </h1>
          <p className="text-gray-500">Analisi dettagliata delle performance</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            presets
          />
          {(startDate || endDate) && (
            <div className="flex items-center gap-2 text-xs text-admin">
              <Filter size={12} />
              <span>
                Dati filtrati: {startDate ? new Date(startDate).toLocaleDateString("it-IT") : "inizio"} - {endDate ? new Date(endDate).toLocaleDateString("it-IT") : "oggi"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Overview Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Panoramica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Lead Totali"
            value={stats?.overview.totalLeads || 0}
            icon={Users}
            tooltip="Numero totale di lead acquisiti da tutte le campagne attive."
          />
          <StatCard
            title="Tasso Conversione"
            value={`${stats?.overview.conversionRate || 0}%`}
            icon={TrendingUp}
            tooltip={helpTexts.conversionRate}
          />
          <StatCard
            title="Ricavi"
            value={`€${(stats?.financial.totalRevenue || 0).toLocaleString()}`}
            icon={Euro}
            tooltip={helpTexts.ricavo}
          />
          <StatCard
            title="ROI"
            value={`${stats?.financial.roi || 0}%`}
            icon={Target}
            tooltip={helpTexts.roi}
          />
        </div>
      </section>

      {/* Section 2: Lead Funnel with FunnelChart */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-6">Funnel Lead</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FunnelChart
            stages={funnelData.stages}
            height={320}
            showPercentages
            showDropoff
          />
          <div className="flex flex-col justify-center">
            <div className="bg-red-50 text-center p-6 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-600">Lead Persi</p>
              <p className="text-3xl font-bold text-red-600">{funnelData.perso.count}</p>
              <p className="text-sm text-gray-500">{funnelData.perso.percentage.toFixed(1)}% del totale</p>
            </div>
            <div className="bg-green-50 text-center p-6 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Tasso Conversione Finale</p>
              <p className="text-3xl font-bold text-green-600">
                {funnelData.total > 0
                  ? ((funnelData.stages[3].value / funnelData.total) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2b: Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <div className="chart-container hover:shadow-md transition-shadow duration-300">
          <h2 className="chart-container-title">Distribuzione Spesa per Piattaforma</h2>
          <PieChart
            data={platformPieData}
            nameKey="name"
            valueKey="value"
            colors={platformPieData.map((p) => PLATFORM_COLORS[p.platform] || "#6b7280")}
            height={280}
            formatValue={(value) => `€${value.toLocaleString("it-IT")}`}
          />
        </div>

        {/* Commercial Performance */}
        <div className="chart-container hover:shadow-md transition-shadow duration-300">
          <h2 className="chart-container-title">Performance Commerciali (Iscritti)</h2>
          <BarChart
            data={commercialBarData}
            xKey="nome"
            yKey="iscritti"
            color="#22c55e"
            height={280}
          />
        </div>
      </section>

      {/* Section 2c: Revenue/Cost Trend */}
      <section className="chart-container hover:shadow-md transition-shadow duration-300">
        <h2 className="chart-container-title">Trend Ricavi vs Costi</h2>
        <LineChart
          data={revenueCostTrend}
          xKey="mese"
          lines={[
            { dataKey: "ricavi", color: "#22c55e", name: "Ricavi" },
            { dataKey: "costi", color: "#ef4444", name: "Costi" },
          ]}
          height={300}
          showLegend
          formatValue={(value) => `€${value.toLocaleString("it-IT")}`}
        />
      </section>

      {/* Section 3: Campaign Performance Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="section-title">Performance Campagne</h2>
            <p className="text-sm text-gray-500 mt-1">Clicca sulle intestazioni per ordinare</p>
          </div>
          <ExportButton
            data={campaignPerformance.data}
            columns={campaignPerformanceExportColumns}
            filename="performance_campagne"
          />
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() => handleSort("name", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Campagna
                    <SortIndicator field="name" currentSort={campaignSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("platform", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Piattaforma
                    <SortIndicator field="platform" currentSort={campaignSort} />
                  </div>
                </th>
                <th>Corso</th>
                <th
                  className="sortable"
                  onClick={() => handleSort("budget", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Spesa Totale
                    <SortIndicator field="budget" currentSort={campaignSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("leadCount", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Lead
                    <SortIndicator field="leadCount" currentSort={campaignSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("cpl", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    CPL
                    <SortIndicator field="cpl" currentSort={campaignSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("conversionRate", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Conversione
                    <SortIndicator field="conversionRate" currentSort={campaignSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("roi", campaignSort, setCampaignSort)}
                >
                  <div className="flex items-center gap-1.5">
                    ROI
                    <SortIndicator field="roi" currentSort={campaignSort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {campaignPerformance.data.map((campaign, index) => {
                const isBest = campaign.roi === campaignPerformance.bestROI && campaign.leadCount > 0;
                const isWorst = campaign.roi === campaignPerformance.worstROI && campaign.leadCount > 0 && campaignPerformance.data.filter(c => c.leadCount > 0).length > 1;

                return (
                  <tr
                    key={campaign.id}
                    className={`transition-colors duration-150 ${
                      isBest ? "!bg-green-50 hover:!bg-green-100" : isWorst ? "!bg-red-50 hover:!bg-red-100" : index % 2 === 0 ? "" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-2">
                        {campaign.name}
                        {isBest && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Top</span>}
                        {isWorst && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Peggiore</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {platformIcons[campaign.platform]}
                        {platformLabels[campaign.platform] || campaign.platform}
                      </div>
                    </td>
                    <td className="p-4 text-gray-500">{campaign.course?.name || "-"}</td>
                    <td className="p-4">€{(campaign.totalSpent || 0).toLocaleString()}</td>
                    <td className="p-4">{campaign.leadCount}</td>
                    <td className="p-4">€{campaign.cpl.toFixed(2)}</td>
                    <td className="p-4">{campaign.conversionRate.toFixed(1)}%</td>
                    <td className={`p-4 font-medium ${campaign.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {campaign.roi.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {campaignPerformance.data.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Nessuna campagna disponibile
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4: Course Performance Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Performance Corsi</h2>
            <p className="text-sm text-gray-500">Analisi ricavi per corso</p>
          </div>
          <ExportButton
            data={coursePerformance}
            columns={coursePerformanceExportColumns}
            filename="performance_corsi"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("name", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1">
                    Corso
                    <SortIndicator field="name" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("price", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1">
                    Prezzo
                    <SortIndicator field="price" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("leads", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1">
                    Lead
                    <SortIndicator field="leads" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("enrolled", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1">
                    Iscritti
                    <SortIndicator field="enrolled" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("revenue", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1">
                    Ricavo
                    <SortIndicator field="revenue" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("campaigns", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1">
                    Campagne Attive
                    <SortIndicator field="campaigns" currentSort={courseSort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {coursePerformance.map((course) => (
                <tr key={course.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{course.name}</span>
                      {course.active && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Attivo</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">€{course.price.toLocaleString()}</td>
                  <td className="p-4">{course.totalLeads}</td>
                  <td className="p-4">{course.enrolled}</td>
                  <td className="p-4 font-medium text-green-600">€{course.revenue.toLocaleString()}</td>
                  <td className="p-4">{course.activeCampaigns}</td>
                </tr>
              ))}
              {coursePerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Nessun corso disponibile
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 5: Commercial Performance Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">Performance Commerciali</h2>
            <p className="text-sm text-gray-500">Classifica per tasso di conversione</p>
          </div>
          <ExportButton
            data={commercialPerformance}
            columns={commercialPerformanceExportColumns}
            filename="performance_commerciali"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="p-4 w-12">#</th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("name", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1">
                    Commerciale
                    <SortIndicator field="name" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("assigned", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1">
                    Lead Assegnati
                    <SortIndicator field="assigned" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("contacted", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1">
                    Contattati
                    <SortIndicator field="contacted" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("enrolled", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1">
                    Iscritti
                    <SortIndicator field="enrolled" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="p-4 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("conversionRate", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1">
                    Tasso Conversione
                    <SortIndicator field="conversionRate" currentSort={commercialSort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {commercialPerformance.map((user, index) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-gray-200 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4">{user.assigned}</td>
                  <td className="p-4">{user.contacted}</td>
                  <td className="p-4">{user.enrolled}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-admin rounded-full"
                          style={{ width: `${Math.min(user.conversionRate, 100)}%` }}
                        />
                      </div>
                      <span className="font-medium">{user.conversionRate.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {commercialPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Nessun commerciale disponibile
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6: Platform Breakdown */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-6">Breakdown per Piattaforma</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {platformBreakdown.map((platform) => (
            <div
              key={platform.platform}
              className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-3">
                {platformIcons[platform.platform]}
                <span className="font-medium">{platformLabels[platform.platform]}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Campagne</span>
                  <span className="font-medium">{platform.campaignCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lead</span>
                  <span className="font-medium">{platform.totalLeads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Spesa</span>
                  <span className="font-medium">€{platform.totalSpent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">CPL</span>
                  <span className="font-medium">€{platform.cpl.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Iscritti</span>
                  <span className="font-medium">{platform.enrolled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Conversione</span>
                  <span className="font-medium text-admin">{platform.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
          {platformBreakdown.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              Nessuna piattaforma con dati disponibili
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
