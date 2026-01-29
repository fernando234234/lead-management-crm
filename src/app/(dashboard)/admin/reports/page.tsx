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
  Info,
  GraduationCap,
  Globe,
} from "lucide-react";
import ExportButton from "@/components/ui/ExportButton";
import {
  getPlatformLabel,
  getPlatformChartColor,
} from "@/lib/platforms";

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

// Pro-rata spend calculation: distribute spend across months proportionally
function distributeSpendAcrossMonths(
  record: SpendRecord,
  monthData: Map<string, { ricavi: number; costi: number }>
): void {
  const amount = typeof record.amount === "string" ? parseFloat(record.amount) : Number(record.amount);
  if (isNaN(amount) || amount <= 0) return;
  
  const recordStart = new Date(record.startDate);
  recordStart.setHours(0, 0, 0, 0);
  
  // For endDate: use provided date, or if null (ongoing), use today
  let recordEnd: Date;
  if (record.endDate) {
    recordEnd = new Date(record.endDate);
  } else {
    recordEnd = new Date();
  }
  recordEnd.setHours(23, 59, 59, 999);
  
  if (recordEnd < recordStart) recordEnd = recordStart;
  
  // Total days in spend period
  const totalDays = Math.max(1, Math.ceil(
    (recordEnd.getTime() - recordStart.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1);
  
  // Iterate through each month in our data and calculate overlap
  monthData.forEach((data, monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0); // Last day of month
    monthEnd.setHours(23, 59, 59, 999);
    
    // Calculate overlap
    const overlapStart = new Date(Math.max(recordStart.getTime(), monthStart.getTime()));
    const overlapEnd = new Date(Math.min(recordEnd.getTime(), monthEnd.getTime()));
    
    // No overlap
    if (overlapEnd < overlapStart) return;
    
    const overlapDays = Math.max(1, Math.ceil(
      (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1);
    
    const proRataAmount = amount * (overlapDays / totalDays);
    data.costi += proRataAmount;
  });
}
type CourseSortField = "name" | "price" | "leads" | "enrolled" | "revenue" | "campaigns";
type CommercialSortField = "name" | "assigned" | "contacted" | "enrolled" | "conversionRate";

const platformIcons: Record<string, React.ReactNode> = {
  META: <Facebook size={16} className="text-blue-600" />,
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
      const campaignParams = new URLSearchParams();
      const leadsParams = new URLSearchParams();
      const statsParams = new URLSearchParams();
      if (startDate) {
        campaignParams.append("spendStartDate", startDate);
        leadsParams.append("startDate", startDate);
        statsParams.append("startDate", startDate);
      }
      if (endDate) {
        campaignParams.append("spendEndDate", endDate);
        leadsParams.append("endDate", endDate);
        statsParams.append("endDate", endDate);
      }
      const campaignsUrl = `/api/campaigns${campaignParams.toString() ? `?${campaignParams}` : ""}`;
      const leadsUrl = `/api/leads${leadsParams.toString() ? `?${leadsParams}` : ""}`;
      const statsUrl = `/api/stats${statsParams.toString() ? `?${statsParams}` : ""}`;

      const [statsRes, leadsRes, campaignsRes, coursesRes, usersRes] = await Promise.all([
        fetch(statsUrl),
        fetch(leadsUrl),
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
    const platforms = ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"];
    return platforms
      .map((platform) => {
        const platformCampaigns = campaigns.filter((c) => c.platform === platform);
        const spent = platformCampaigns.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        return {
          name: getPlatformLabel(platform),
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
  // Respects the date filter if set, otherwise shows last 6 months
  const revenueCostTrend = useMemo(() => {
    const monthData = new Map<string, { ricavi: number; costi: number }>();
    
    // Determine date range: use filter if set, otherwise last 6 months
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (startDate && endDate) {
      // Use the selected date range
      rangeStart = new Date(startDate);
      rangeEnd = new Date(endDate);
    } else if (startDate) {
      // Start date only: from start to now
      rangeStart = new Date(startDate);
      rangeEnd = new Date();
    } else if (endDate) {
      // End date only: 6 months before end date
      rangeEnd = new Date(endDate);
      rangeStart = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() - 5, 1);
    } else {
      // No filter: last 6 months (default)
      const now = new Date();
      rangeEnd = now;
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    
    // Generate months between rangeStart and rangeEnd
    const currentMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    
    while (currentMonth <= endMonth) {
      const key = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      monthData.set(key, { ricavi: 0, costi: 0 });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }
    
    // Aggregate revenue from leads by month
    leads.forEach((lead) => {
      const leadDate = new Date(lead.createdAt);
      const key = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthData.has(key)) {
        const data = monthData.get(key)!;
        // Revenue from enrolled leads - use lead.revenue if set, otherwise course.price
        if (lead.enrolled && lead.course) {
          const leadRevenue = lead.revenue ? Number(lead.revenue) : 0;
          const coursePrice = Number(lead.course.price) || 0;
          data.ricavi += leadRevenue > 0 ? leadRevenue : coursePrice;
        }
      }
    });
    
    // Aggregate costs from spend records with PRO-RATA distribution across months
    // When a spend record spans multiple months, distribute proportionally
    campaigns.forEach((campaign) => {
      if (campaign.spendRecords && campaign.spendRecords.length > 0) {
        // Distribute each spend record across months proportionally
        campaign.spendRecords.forEach((record) => {
          distributeSpendAcrossMonths(record, monthData);
        });
      } else if (campaign.totalSpent > 0) {
        // Fallback: distribute totalSpent evenly across visible months when no spend records exist
        const monthCount = monthData.size;
        if (monthCount > 0) {
          const perMonth = campaign.totalSpent / monthCount;
          monthData.forEach((data) => {
            data.costi += perMonth;
          });
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
  }, [leads, campaigns, startDate, endDate]);

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
    const platforms = ["META", "GOOGLE_ADS", "LINKEDIN", "TIKTOK"];

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
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-admin" />
            Report e Analisi
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Dashboard completa per monitorare le performance aziendali</p>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            presets
          />
          {(startDate || endDate) && (
            <div className="flex items-center gap-2 text-xs text-admin bg-admin/5 px-3 py-1.5 rounded-full">
              <Filter size={12} />
              <span>
                Periodo: {startDate ? new Date(startDate).toLocaleDateString("it-IT") : "inizio"} - {endDate ? new Date(endDate).toLocaleDateString("it-IT") : "oggi"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Banner */}
      <div className="bg-gradient-to-r from-admin/10 via-admin/5 to-transparent rounded-xl p-4 sm:p-5 border border-admin/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-admin/20 rounded-full flex items-center justify-center">
              <TrendingUp className="text-admin" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Riepilogo Periodo</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {stats?.overview.totalLeads || 0} lead → {stats?.overview.enrolledLeads || 0} iscritti
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <span className="text-gray-500">Conversione:</span>{" "}
              <span className="font-bold text-admin">{stats?.overview.conversionRate || 0}%</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <span className="text-gray-500">ROI:</span>{" "}
              <span className={`font-bold ${parseFloat(stats?.financial.roi || "0") >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stats?.financial.roi || 0}%
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <span className="text-gray-500">Ricavi:</span>{" "}
              <span className="font-bold text-green-600">€{(stats?.financial.totalRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Overview Stats - Key Performance Indicators */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-admin" />
            <h2 className="text-base sm:text-lg font-semibold">Metriche Chiave (KPI)</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Indicatori principali delle performance aziendali</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard
              title="Lead Totali"
              value={stats?.overview.totalLeads || 0}
              icon={Users}
              tooltip="Numero totale di lead acquisiti da tutte le campagne attive nel periodo."
            />
            <StatCard
              title="Tasso Conversione"
              value={`${stats?.overview.conversionRate || 0}%`}
              icon={TrendingUp}
              tooltip={helpTexts.conversionRate}
            />
            <StatCard
              title="Ricavi Totali"
              value={`€${(stats?.financial.totalRevenue || 0).toLocaleString()}`}
              icon={Euro}
              tooltip={helpTexts.ricavo}
            />
            <StatCard
              title="ROI Complessivo"
              value={`${stats?.financial.roi || 0}%`}
              icon={Target}
              tooltip={helpTexts.roi}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Lead Funnel with FunnelChart */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ArrowDown size={20} className="text-admin" />
            <h2 className="text-base sm:text-lg font-semibold">Funnel di Conversione</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Il percorso dei lead: dalla generazione all&apos;iscrizione
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div>
              <FunnelChart
                stages={funnelData.stages}
                height={320}
                showPercentages
                showDropoff
              />
              <p className="text-xs text-gray-400 text-center mt-2">
                Le percentuali indicano il tasso di passaggio tra fasi
              </p>
            </div>
            <div className="flex flex-col justify-center gap-4">
              {/* Funnel Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 text-center p-4 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 mb-1">Nuovi</p>
                  <p className="text-2xl font-bold text-blue-700">{funnelData.stages[0]?.value || 0}</p>
                </div>
                <div className="bg-yellow-50 text-center p-4 rounded-lg border border-yellow-100">
                  <p className="text-xs font-medium text-yellow-600 mb-1">Contattati</p>
                  <p className="text-2xl font-bold text-yellow-700">{funnelData.stages[1]?.value || 0}</p>
                </div>
                <div className="bg-purple-50 text-center p-4 rounded-lg border border-purple-100">
                  <p className="text-xs font-medium text-purple-600 mb-1">In Trattativa</p>
                  <p className="text-2xl font-bold text-purple-700">{funnelData.stages[2]?.value || 0}</p>
                </div>
                <div className="bg-green-50 text-center p-4 rounded-lg border border-green-100">
                  <p className="text-xs font-medium text-green-600 mb-1">Iscritti</p>
                  <p className="text-2xl font-bold text-green-700">{funnelData.stages[3]?.value || 0}</p>
                </div>
              </div>
              
              {/* Loss vs Success Summary */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-red-50 text-center p-4 rounded-lg border border-red-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">Lead Persi</p>
                  <p className="text-2xl font-bold text-red-600">{funnelData.perso.count}</p>
                  <p className="text-xs text-gray-500">{funnelData.perso.percentage.toFixed(1)}% del totale</p>
                </div>
                <div className="bg-green-50 text-center p-4 rounded-lg border border-green-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">Conversione Finale</p>
                  <p className="text-2xl font-bold text-green-600">
                    {funnelData.total > 0
                      ? ((funnelData.stages[3].value / funnelData.total) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500">Iscritti / Totale</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2b: Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <h2 className="text-sm sm:text-base font-semibold">Distribuzione Spesa Pubblicitaria</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">Come viene ripartito il budget tra le piattaforme</p>
          </div>
          <div className="p-4">
            <PieChart
              data={platformPieData}
              nameKey="name"
              valueKey="value"
              colors={platformPieData.map((p) => getPlatformChartColor(p.platform))}
              height={260}
              formatValue={(value) => `€${value.toLocaleString("it-IT")}`}
            />
            {platformPieData.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Nessuna spesa registrata nel periodo</p>
            )}
          </div>
        </div>

        {/* Commercial Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-green-600" />
              <h2 className="text-sm sm:text-base font-semibold">Iscrizioni per Commerciale</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">Lead convertiti in iscritti da ogni commerciale</p>
          </div>
          <div className="p-4">
            <BarChart
              data={commercialBarData}
              xKey="nome"
              yKey="iscritti"
              color="#22c55e"
              height={260}
            />
            {commercialBarData.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Nessun dato disponibile</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 2c: Revenue/Cost Trend */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Euro size={20} className="text-admin" />
            <h2 className="text-base sm:text-lg font-semibold">
              Andamento Ricavi vs Costi {startDate || endDate ? (
                <span className="text-admin">
                  ({startDate ? new Date(startDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "Inizio"} - {endDate ? new Date(endDate).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "Oggi"})
                </span>
              ) : "(Ultimi 6 Mesi)"}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Confronto mensile tra ricavi generati dalle iscrizioni e costi pubblicitari sostenuti.
            Un trend positivo indica che i ricavi superano i costi.
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <LineChart
            data={revenueCostTrend}
            xKey="mese"
            lines={[
              { dataKey: "ricavi", color: "#22c55e", name: "Ricavi (da iscrizioni)" },
              { dataKey: "costi", color: "#ef4444", name: "Costi (spesa ads)" },
            ]}
            height={280}
            showLegend
            formatValue={(value) => `€${value.toLocaleString("it-IT")}`}
          />
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-700">Verde = Ricavi dalle vendite</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-700">Rosso = Spesa pubblicitaria</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Campaign Performance Table */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-admin" />
                <h2 className="text-base sm:text-lg font-semibold">Performance Campagne Pubblicitarie</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Analisi dettagliata di ogni campagna: spesa, lead generati, costo per lead e ritorno sull&apos;investimento.
              </p>
            </div>
            <ExportButton
              data={campaignPerformance.data}
              columns={campaignPerformanceExportColumns}
              filename="performance_campagne"
            />
          </div>
          
          {/* Legend and Glossary */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:gap-6">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">Top = Miglior ROI</span>
              <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">Peggiore = ROI più basso</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1" title="Costo Per Lead: quanto costa acquisire un singolo contatto">
                <Info size={12} className="text-gray-400" />
                <strong>CPL</strong> = Costo Per Lead
              </span>
              <span className="flex items-center gap-1" title="Return On Investment: ritorno sull'investimento pubblicitario">
                <Info size={12} className="text-gray-400" />
                <strong>ROI</strong> = Ritorno sull&apos;Investimento
              </span>
            </div>
          </div>
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
                        {getPlatformLabel(campaign.platform)}
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
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap size={20} className="text-admin" />
                <h2 className="text-base sm:text-lg font-semibold">Performance per Corso</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Ricavi e iscrizioni suddivisi per ogni corso offerto. 
                Utile per capire quali corsi generano più valore.
              </p>
            </div>
            <ExportButton
              data={coursePerformance}
              columns={coursePerformanceExportColumns}
              filename="performance_corsi"
            />
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() => handleSort("name", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Corso
                    <SortIndicator field="name" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("price", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Prezzo
                    <SortIndicator field="price" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("leads", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Lead
                    <SortIndicator field="leads" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("enrolled", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Iscritti
                    <SortIndicator field="enrolled" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("revenue", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Ricavo
                    <SortIndicator field="revenue" currentSort={courseSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("campaigns", courseSort, setCourseSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Campagne
                    <SortIndicator field="campaigns" currentSort={courseSort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {coursePerformance.map((course, index) => (
                <tr key={course.id} className={`transition-colors duration-150 ${index % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      {course.name}
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
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users size={20} className="text-admin" />
                <h2 className="text-base sm:text-lg font-semibold">Classifica Team Commerciale</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Performance di ogni commerciale ordinata per tasso di conversione.
                Il tasso indica quanti lead assegnati sono diventati iscritti.
              </p>
            </div>
            <ExportButton
              data={commercialPerformance}
              columns={commercialPerformanceExportColumns}
              filename="performance_commerciali"
            />
          </div>
          
          {/* Podium Legend */}
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">1° posto</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">2° posto</span>
            <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200">3° posto</span>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table-enhanced">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th
                  className="sortable"
                  onClick={() => handleSort("name", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Commerciale
                    <SortIndicator field="name" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("assigned", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Assegnati
                    <SortIndicator field="assigned" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("contacted", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Contattati
                    <SortIndicator field="contacted" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("enrolled", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Iscritti
                    <SortIndicator field="enrolled" currentSort={commercialSort} />
                  </div>
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("conversionRate", commercialSort, setCommercialSort)}
                >
                  <div className="flex items-center gap-1.5">
                    Conversione
                    <SortIndicator field="conversionRate" currentSort={commercialSort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {commercialPerformance.map((user, index) => (
                <tr 
                  key={user.id} 
                  className={`transition-colors duration-150 ${
                    index === 0 ? "!bg-yellow-50/50" : 
                    index === 1 ? "!bg-gray-50/70" : 
                    index === 2 ? "!bg-orange-50/50" : 
                    index % 2 === 0 ? "" : "bg-gray-50/30"
                  }`}
                >
                  <td className="p-4">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300"
                          : index === 1
                          ? "bg-gray-200 text-gray-700 ring-2 ring-gray-300"
                          : index === 2
                          ? "bg-orange-100 text-orange-700 ring-2 ring-orange-300"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4">{user.assigned}</td>
                  <td className="p-4">{user.contacted}</td>
                  <td className="p-4 font-medium text-green-600">{user.enrolled}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-24 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            index === 0 ? "bg-yellow-500" : 
                            index === 1 ? "bg-gray-400" : 
                            index === 2 ? "bg-orange-400" : 
                            "bg-admin"
                          }`}
                          style={{ width: `${Math.min(user.conversionRate, 100)}%` }}
                        />
                      </div>
                      <span className="font-medium min-w-[50px]">{user.conversionRate.toFixed(1)}%</span>
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
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-admin" />
            <h2 className="text-base sm:text-lg font-semibold">Dettaglio per Piattaforma Pubblicitaria</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Confronto delle metriche chiave tra le diverse piattaforme: Facebook/Meta, Google Ads, LinkedIn, TikTok.
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
            <Info size={12} className="text-gray-400" />
            <strong>CPL</strong> = Costo Per Lead (quanto costa acquisire un singolo contatto)
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {platformBreakdown.map((platform) => (
              <div
                key={platform.platform}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-lg hover:border-admin/30 transition-all duration-200 bg-white"
              >
                {/* Platform Header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <div className="p-2 rounded-lg bg-gray-50">
                    {platformIcons[platform.platform]}
                  </div>
                  <span className="font-semibold text-gray-800">{getPlatformLabel(platform.platform)}</span>
                </div>
                
                {/* Metrics */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Campagne</span>
                    <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{platform.campaignCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Lead</span>
                    <span className="font-semibold text-blue-600">{platform.totalLeads}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Spesa</span>
                    <span className="font-medium text-red-600">€{platform.totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">CPL</span>
                    <span className="font-medium">€{platform.cpl.toFixed(2)}</span>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Iscritti</span>
                      <span className="font-semibold text-green-600">{platform.enrolled}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-gray-500">Conversione</span>
                      <span className="font-bold text-admin bg-admin/10 px-2 py-0.5 rounded">
                        {platform.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {platformBreakdown.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
                Nessuna piattaforma con dati disponibili nel periodo selezionato
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
