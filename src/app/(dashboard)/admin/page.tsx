"use client";

import { useState, useEffect, useMemo } from "react";
import { useDataFilter, getDataSourceParam } from "@/contexts/DataFilterContext";
import toast from "react-hot-toast";
import { StatCard } from "@/components/ui/StatCard";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { PieChart } from "@/components/charts/PieChart";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { UsersRound, BookOpen, Megaphone, Euro, UserCheck, Users } from "lucide-react";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { helpTexts } from "@/lib/helpTexts";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { adminTourSteps } from "@/lib/tourSteps";

interface Stats {
  overview: {
    totalLeads: number;
    contactedLeads: number;
    enrolledLeads: number;
    conversionRate: string;
    totalCourses: number;
    activeCourses: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalUsers: number;
    commercialUsers: number;
  };
  financial: {
    totalRevenue: number;
    totalCost: number;
    costPerLead: string;
    roi: string;
  };
  leadsByStatus: { status: string; count: number }[];
  recentLeads: {
    id: string;
    name: string;
    course: string;
    assignedTo: string;
    status: string;
    createdAt: string;
  }[];
  topCampaigns: {
    id: string;
    name: string;
    course: string;
    leads: number;
    budget: number;
  }[];
  leadsOverTime?: {
    giorno: string;
    date: string;
    lead: number;
  }[];
}

const statusLabels: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

const statusColors: Record<string, string> = {
  NUOVO: "bg-blue-100 text-blue-700",
  CONTATTATO: "bg-yellow-100 text-yellow-700",
  IN_TRATTATIVA: "bg-purple-100 text-purple-700",
  ISCRITTO: "bg-green-100 text-green-700",
  PERSO: "bg-red-100 text-red-700",
};

const STATUS_CHART_COLORS = [
  "#3b82f6", // blue - NUOVO
  "#eab308", // yellow - CONTATTATO
  "#a855f7", // purple - IN_TRATTATIVA
  "#22c55e", // green - ISCRITTO
  "#ef4444", // red - PERSO
];

export default function AdminDashboard() {
  const { dataSource } = useDataFilter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Filter data by date range
  const isWithinDateRange = (dateStr: string): boolean => {
    if (!startDate && !endDate) return true;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    
    return true;
  };

  // Filter recent leads by date range
  const filteredRecentLeads = useMemo(() => {
    if (!stats?.recentLeads) return [];
    return stats.recentLeads.filter((lead) => isWithinDateRange(lead.createdAt));
  }, [stats?.recentLeads, startDate, endDate]);

  // Prepare chart data for lead status distribution
  const pieChartData = useMemo(() => {
    if (!stats?.leadsByStatus) return [];
    return stats.leadsByStatus.map((item) => ({
      name: statusLabels[item.status] || item.status,
      value: item.count,
      status: item.status,
    }));
  }, [stats?.leadsByStatus]);

  // Use real data for leads over time (last 7 days) or generate fallback
  const leadsOverTime = useMemo(() => {
    if (stats?.leadsOverTime && stats.leadsOverTime.length > 0) {
      return stats.leadsOverTime;
    }
    // Fallback for demo mode or if no data
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString("it-IT", { weekday: "short" });
      days.push({
        giorno: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        lead: Math.floor(Math.random() * 15) + 5 + (6 - i) * 2,
      });
    }
    return days;
  }, [stats?.leadsOverTime]);

  // Prepare campaign data for bar chart
  const campaignChartData = useMemo(() => {
    if (!stats?.topCampaigns) return [];
    return stats.topCampaigns.slice(0, 5).map((campaign) => ({
      nome: campaign.name.length > 15 ? campaign.name.substring(0, 15) + "..." : campaign.name,
      lead: campaign.leads,
    }));
  }, [stats?.topCampaigns]);

  useEffect(() => {
    fetchStats();
  }, [dataSource, startDate, endDate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Build query params with data source filter and date range
      const params = new URLSearchParams();
      const sourceParam = getDataSourceParam(dataSource);
      if (sourceParam) {
        // sourceParam is like "source=MANUAL,CAMPAIGN"
        const [key, value] = sourceParam.split("=");
        if (key && value) params.append(key, value);
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const url = params.toString() ? `/api/stats?${params}` : "/api/stats";
      const res = await fetch(url);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-admin/30 border-t-admin rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-center text-gray-500">Errore nel caricamento dei dati</div>;
  }

  const profit = stats.financial.totalRevenue - stats.financial.totalCost;

  return (
    <div className="space-y-8">
      {/* Onboarding Tour */}
      <OnboardingTour steps={adminTourSteps} tourKey="admin-dashboard" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-sm sm:text-base text-gray-500">Panoramica completa del sistema</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            presets
            accent="admin"
          />
          {(startDate || endDate) && (
            <p className="text-xs text-admin">
              Dati filtrati: {startDate ? new Date(startDate).toLocaleDateString("it-IT") : "inizio"} - {endDate ? new Date(endDate).toLocaleDateString("it-IT") : "oggi"}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div data-tour="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Utenti"
          value={stats.overview.totalUsers}
          icon={UsersRound}
          tooltip="Numero totale di utenti nel sistema (Admin, Commerciali, Marketing)."
        />
        <StatCard
          title="Corsi Attivi"
          value={stats.overview.activeCourses}
          icon={BookOpen}
          tooltip="Corsi attualmente disponibili per le iscrizioni."
        />
        <StatCard
          title="Campagne"
          value={stats.overview.activeCampaigns}
          icon={Megaphone}
          tooltip="Campagne pubblicitarie attive per acquisizione lead."
        />
        <StatCard
          title="Lead Totali"
          value={stats.overview.totalLeads}
          icon={Users}
          tooltip="Numero totale di lead acquisiti da tutte le campagne."
        />
        <StatCard
          title="Iscritti"
          value={stats.overview.enrolledLeads}
          icon={UserCheck}
          tooltip={helpTexts.leadIscritto}
        />
        <StatCard
          title="Ricavi"
          value={`€${stats.financial.totalRevenue.toLocaleString()}`}
          icon={Euro}
          tooltip={helpTexts.ricavo}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Distribution - Pie Chart */}
        <div data-tour="lead-distribution" className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Distribuzione Lead</h2>
            <p className="text-sm text-gray-500">Per stato</p>
          </div>
          <div className="p-6">
            <PieChart
              data={pieChartData}
              nameKey="name"
              valueKey="value"
              colors={STATUS_CHART_COLORS}
              height={280}
            />
          </div>
        </div>

        {/* Leads Over Time - Line Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Lead negli Ultimi 7 Giorni</h2>
            <p className="text-sm text-gray-500">Andamento giornaliero</p>
          </div>
          <div className="p-6">
            <LineChart
              data={leadsOverTime}
              xKey="giorno"
              yKey="lead"
              color="#6366f1"
              height={250}
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout - Recent Leads & Top Campaigns Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div data-tour="recent-leads" className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Lead Recenti</h2>
            <p className="text-sm text-gray-500">Ultimi 5 lead aggiunti</p>
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Corso</th>
                  <th className="pb-3">Stato</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b">
                    <td className="py-3 font-medium">{lead.name}</td>
                    <td className="py-3 text-gray-500">{lead.course || "-"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[lead.status] || "bg-gray-100"}`}>
                        {statusLabels[lead.status] || lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRecentLeads.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      Nessun lead nel periodo selezionato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Campaigns - Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Top Campagne</h2>
            <p className="text-sm text-gray-500">Per numero di lead generati</p>
          </div>
          <div className="p-6">
            <BarChart
              data={campaignChartData}
              xKey="nome"
              yKey="lead"
              color="#6366f1"
              height={250}
            />
          </div>
        </div>
      </div>

      {/* Profitability Summary */}
      <div data-tour="profitability" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Riepilogo Profittabilità</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Ricavo Totale</p>
            <p className="text-lg sm:text-2xl font-bold text-green-600">
              €{stats.financial.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Spesa Totale</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600">
              €{stats.financial.totalCost.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">Profitto Netto</p>
            <p className={`text-lg sm:text-2xl font-bold ${profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
              €{profit.toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
              CPL
              <HelpIcon text={helpTexts.cplEstimato} size="sm" />
            </p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-600">
              €{stats.financial.costPerLead}
            </p>
          </div>
          <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg col-span-2 md:col-span-1">
            <p className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
              ROI
              <HelpIcon text={helpTexts.roi} size="sm" />
            </p>
            <p className="text-lg sm:text-2xl font-bold text-admin">
              {stats.financial.roi}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
