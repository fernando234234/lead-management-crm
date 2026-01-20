"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { StatCard } from "@/components/ui/StatCard";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { LineChart } from "@/components/charts/LineChart";
import { PieChart } from "@/components/charts/PieChart";
import {
  Users,
  Phone,
  UserCheck,
  Target,
  PhoneCall,
  Star,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  PhoneOff,
  PhoneMissed,
  TrendingUp,
  LayoutGrid,
  ListTodo,
  Plus,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { commercialTourSteps } from "@/lib/tourSteps";
import Link from "next/link";
import { GoalsProgress } from "@/components/ui/GoalsProgress";
import toast from "react-hot-toast";

// Tri-state type
type TriState = "SI" | "NO" | "ND";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  contattatoStato: TriState;
  contattatoAt: string | null;
  contattatoNote: string | null;
  targetStato: TriState;
  targetNote: string | null;
  iscrittoStato: TriState;
  iscrittoAt: string | null;
  iscrittoNote: string | null;
  createdAt: string;
  updatedAt?: string;
  course?: { id: string; name: string };
  campaign?: { id: string; name: string };
  // Legacy fields for compatibility during migration
  status?: string;
  contacted?: boolean;
  contactedAt?: string | null;
  enrolled?: boolean;
  enrolledAt?: string | null;
  isTarget?: boolean;
  callOutcome?: string | null;
}

interface Activity {
  id: string;
  type: "CALL" | "STATUS_CHANGE" | "ENROLLMENT" | "LEAD_CREATED" | "CONTACT";
  description: string;
  leadId: string;
  leadName: string;
  userId: string;
  createdAt: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    callOutcome?: string;
    courseName?: string;
  };
}

const triStateLabels: Record<TriState, string> = {
  SI: "Sì",
  NO: "No",
  ND: "N/D",
};

export default function CommercialDashboard() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => isWithinDateRange(lead.createdAt));
  }, [leads, startDate, endDate]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, activitiesRes] = await Promise.all([
        fetch(`/api/leads?assignedToId=${session?.user?.id}`),
        fetch(`/api/activities?limit=10&days=7`),
      ]);

      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads || leadsData || []);

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if lead is contacted (using tri-state)
  const isContacted = (lead: Lead): boolean => {
    return lead.contattatoStato === "SI" || lead.contacted === true;
  };

  // Helper function to check if lead is enrolled (using tri-state)
  const isEnrolled = (lead: Lead): boolean => {
    return lead.iscrittoStato === "SI" || lead.enrolled === true;
  };

  // Helper function to check if lead is target (using tri-state)
  const isTargetLead = (lead: Lead): boolean => {
    return lead.targetStato === "SI" || lead.isTarget === true;
  };

  // Calculate stats dynamically based on filtered leads
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contactedToday = filteredLeads.filter((lead) => {
      const contactDate = lead.contattatoAt || lead.contactedAt;
      if (!contactDate) return false;
      const date = new Date(contactDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    }).length;

    // Pending callbacks - leads that have been contacted but need follow-up
    const pendingCallbacks = filteredLeads.filter((lead) => {
      if (lead.callOutcome !== "RICHIAMARE") return false;
      const contactDate = lead.contattatoAt || lead.contactedAt;
      if (!contactDate) return false;
      const date = new Date(contactDate);
      const hoursSinceContact = (Date.now() - date.getTime()) / (1000 * 60 * 60);
      return hoursSinceContact > 48;
    }).length;

    const targetLeads = filteredLeads.filter(
      (lead) => isTargetLead(lead) && !isContacted(lead)
    ).length;

    const enrolled = filteredLeads.filter((lead) => isEnrolled(lead)).length;
    const contacted = filteredLeads.filter((lead) => isContacted(lead)).length;
    const conversionRate =
      filteredLeads.length > 0
        ? ((enrolled / filteredLeads.length) * 100).toFixed(1)
        : "0";

    // Calculate comparison with last month
    const lastMonthLeads = leads.filter((lead) => {
      const createdDate = new Date(lead.createdAt);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      return createdDate >= twoMonthsAgo && createdDate < oneMonthAgo;
    });
    const lastMonthEnrolled = lastMonthLeads.filter((l) => isEnrolled(l)).length;
    const enrolledTrend =
      lastMonthEnrolled > 0
        ? Math.round(((enrolled - lastMonthEnrolled) / lastMonthEnrolled) * 100)
        : enrolled > 0
        ? 100
        : 0;

    return {
      totalLeads: filteredLeads.length,
      contacted,
      contactedToday,
      enrolled,
      conversionRate,
      pendingCallbacks,
      targetLeads,
      enrolledTrend,
    };
  }, [filteredLeads, leads]);

  // Funnel data for conversion funnel chart
  const funnelData = useMemo(() => {
    const statusCounts = {
      assegnati: filteredLeads.length,
      contattati: filteredLeads.filter((l) => isContacted(l)).length,
      inTarget: filteredLeads.filter((l) => isTargetLead(l)).length,
      iscritti: filteredLeads.filter((l) => isEnrolled(l)).length,
    };

    return [
      { name: "Assegnati", value: statusCounts.assegnati, color: "#3B82F6" },
      { name: "Contattati", value: statusCounts.contattati, color: "#8B5CF6" },
      { name: "In Target", value: statusCounts.inTarget, color: "#F59E0B" },
      { name: "Iscritti", value: statusCounts.iscritti, color: "#10B981" },
    ];
  }, [filteredLeads]);

  // Status distribution for pie chart (tri-state based)
  const statusDistribution = useMemo(() => {
    const counts = {
      nonContattati: filteredLeads.filter((l) => l.contattatoStato === "ND" || (!l.contattatoStato && !l.contacted)).length,
      contattatiInAttesa: filteredLeads.filter((l) => isContacted(l) && l.iscrittoStato !== "SI" && !l.enrolled).length,
      inTarget: filteredLeads.filter((l) => isTargetLead(l) && !isEnrolled(l)).length,
      iscritti: filteredLeads.filter((l) => isEnrolled(l)).length,
      nonTarget: filteredLeads.filter((l) => l.targetStato === "NO").length,
    };

    return [
      { name: "Non Contattati", value: counts.nonContattati, color: "#3B82F6" },
      { name: "Contattati", value: counts.contattatiInAttesa, color: "#F59E0B" },
      { name: "In Target", value: counts.inTarget, color: "#8B5CF6" },
      { name: "Iscritti", value: counts.iscritti, color: "#10B981" },
      { name: "Non Target", value: counts.nonTarget, color: "#EF4444" },
    ].filter(item => item.value > 0);
  }, [filteredLeads]);

  // Performance trend data (last 30 days)
  const trendData = useMemo(() => {
    const days = 30;
    const data: { date: string; contattati: number; iscritti: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const contacted = leads.filter((lead) => {
        const contactDate = lead.contattatoAt || lead.contactedAt;
        if (!contactDate) return false;
        const d = new Date(contactDate);
        return d >= date && d < nextDate;
      }).length;

      const enrolled = leads.filter((lead) => {
        const enrollDate = lead.iscrittoAt || lead.enrolledAt;
        if (!enrollDate) return false;
        const d = new Date(enrollDate);
        return d >= date && d < nextDate;
      }).length;

      data.push({
        date: date.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
        }),
        contattati: contacted,
        iscritti: enrolled,
      });
    }

    return data;
  }, [leads]);

  // Leads needing attention
  const leadsNeedingAttention = useMemo(() => {
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    return filteredLeads
      .filter((lead) => {
        // Overdue callbacks (callback requested > 48h ago)
        if (lead.callOutcome === "RICHIAMARE") {
          const contactDate = lead.contattatoAt || lead.contactedAt;
          if (contactDate) {
            const date = new Date(contactDate).getTime();
            if (now - date > fortyEightHours) return true;
          }
        }

        // Not contacted for 48h+ 
        if (!isContacted(lead)) {
          const createdDate = new Date(lead.createdAt).getTime();
          if (now - createdDate > fortyEightHours) return true;
        }

        // Target leads not contacted
        if (isTargetLead(lead) && !isContacted(lead)) return true;

        return false;
      })
      .slice(0, 5)
      .map((lead) => {
        let reason = "";
        let priority: "high" | "medium" | "low" = "medium";

        if (lead.callOutcome === "RICHIAMARE") {
          const contactDate = lead.contattatoAt || lead.contactedAt;
          if (contactDate) {
            const hours = Math.floor(
              (now - new Date(contactDate).getTime()) / (1000 * 60 * 60)
            );
            reason = `Callback scaduto da ${hours}h`;
            priority = "high";
          }
        } else if (isTargetLead(lead) && !isContacted(lead)) {
          reason = "Lead Target non contattato";
          priority = "high";
        } else if (!isContacted(lead)) {
          const hours = Math.floor(
            (now - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60)
          );
          reason = `Non contattato da ${hours}h`;
          priority = hours > 72 ? "high" : "medium";
        }

        return { ...lead, reason, priority };
      });
  }, [filteredLeads]);

  // Format time for activity timeline
  const formatActivityTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}g fa`;
    } else if (diffHours > 0) {
      return `${diffHours}h fa`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}m fa` : "Ora";
    }
  };

  // Get activity icon
  const getActivityIcon = (type: Activity["type"], metadata?: Activity["metadata"]) => {
    switch (type) {
      case "ENROLLMENT":
        return <UserCheck size={16} className="text-green-600" />;
      case "CALL":
        if (metadata?.callOutcome === "POSITIVO")
          return <CheckCircle size={16} className="text-green-600" />;
        if (metadata?.callOutcome === "NEGATIVO")
          return <PhoneOff size={16} className="text-red-600" />;
        if (metadata?.callOutcome === "RICHIAMARE")
          return <PhoneCall size={16} className="text-yellow-600" />;
        if (metadata?.callOutcome === "NON_RISPONDE")
          return <PhoneMissed size={16} className="text-gray-600" />;
        return <Phone size={16} className="text-blue-600" />;
      case "STATUS_CHANGE":
        return <TrendingUp size={16} className="text-purple-600" />;
      case "LEAD_CREATED":
        return <Plus size={16} className="text-blue-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-commercial/30 border-t-commercial rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Commerciale
          </h1>
          <p className="text-gray-500 mt-1">
            Panoramica dei tuoi lead e performance
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            presets
          />
        </div>
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour steps={commercialTourSteps} tourKey="commercial-dashboard" />

      {/* Stats Grid - 6 cards in 2 rows */}
      <div
        data-tour="stats-grid"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <StatCard
          title="Lead Assegnati"
          value={stats.totalLeads}
          icon={Users}
          iconColor="text-commercial"
          subtitle="Totale"
          animate
        />
        <StatCard
          title="Contattati Oggi"
          value={stats.contactedToday}
          icon={Phone}
          iconColor="text-blue-600"
          subtitle={`${stats.contacted} totali`}
          animate
        />
        <StatCard
          title="Iscritti"
          value={stats.enrolled}
          icon={UserCheck}
          iconColor="text-green-600"
          trend={
            stats.enrolledTrend !== 0
              ? { value: Math.abs(stats.enrolledTrend), isPositive: stats.enrolledTrend > 0 }
              : undefined
          }
          animate
        />
        <StatCard
          title="Callback Pendenti"
          value={stats.pendingCallbacks}
          icon={PhoneCall}
          iconColor="text-yellow-600"
          subtitle="Scaduti >48h"
          animate
        />
        <StatCard
          title="Tasso Conversione"
          value={`${stats.conversionRate}%`}
          icon={Target}
          iconColor="text-purple-600"
          animate
        />
        <StatCard
          title="Lead Target"
          value={stats.targetLeads}
          icon={Star}
          iconColor="text-orange-500"
          subtitle="Da contattare"
          animate
        />
      </div>

      {/* Quick Actions Bar + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/commercial/leads"
              className="flex items-center gap-2 px-4 py-2.5 bg-commercial text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              <Plus size={18} />
              Nuovo Lead
            </Link>
            <Link
              href="/commercial/pipeline"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <LayoutGrid size={18} />
              Pipeline
            </Link>
            <Link
              href="/commercial/leads"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <Users size={18} />
              I Miei Lead
            </Link>
            <Link
              href="/commercial/tasks"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <ListTodo size={18} />
              Promemoria
            </Link>
          </div>
        </div>
        
        {/* Monthly Goals Progress - Compact version */}
        <GoalsProgress compact />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Funnel di Conversione
          </h2>
          <FunnelChart
            stages={funnelData}
            height={280}
            showPercentages={true}
            showDropoff={true}
          />
        </div>

        {/* Performance Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Trend Performance (30 giorni)
          </h2>
          <LineChart
            data={trendData}
            xKey="date"
            height={280}
            showGrid={true}
            showLegend={true}
            lines={[
              { dataKey: "contattati", color: "#3B82F6", name: "Contattati" },
              { dataKey: "iscritti", color: "#10B981", name: "Iscritti" },
            ]}
          />
        </div>
      </div>

      {/* Status Distribution + Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuzione Stati
          </h2>
          {statusDistribution.length > 0 ? (
            <PieChart 
              data={statusDistribution} 
              nameKey="name"
              valueKey="value"
              colors={statusDistribution.map(s => s.color)}
              height={250} 
              showLegend={true} 
            />
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Nessun dato disponibile
            </div>
          )}
        </div>

        {/* Leads Needing Attention */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Richiede Attenzione
            </h2>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {leadsNeedingAttention.length}
            </span>
          </div>
          <div className="space-y-3">
            {leadsNeedingAttention.length > 0 ? (
              leadsNeedingAttention.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/commercial/leads?id=${lead.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
                >
                  <div
                    className={`p-1.5 rounded-full ${
                      lead.priority === "high"
                        ? "bg-red-100"
                        : lead.priority === "medium"
                        ? "bg-yellow-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {lead.priority === "high" ? (
                      <AlertTriangle size={14} className="text-red-600" />
                    ) : isTargetLead(lead) ? (
                      <Star size={14} className="text-orange-500" />
                    ) : (
                      <Clock size={14} className="text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate group-hover:text-commercial transition">
                      {lead.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {lead.reason}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-400 group-hover:text-commercial transition flex-shrink-0 mt-1"
                  />
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <CheckCircle size={32} className="mb-2" />
                <p className="text-sm">Tutto in ordine!</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Attivita Recenti
          </h2>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.slice(0, 6).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="p-1.5 bg-gray-100 rounded-full">
                    {getActivityIcon(activity.type, activity.metadata)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatActivityTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Clock size={32} className="mb-2" />
                <p className="text-sm">Nessuna attivita recente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div
        data-tour="tasks"
        className="bg-white rounded-xl shadow-sm border border-gray-100"
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Lead Recenti da Contattare</h2>
              <p className="text-sm text-gray-500">
                Lead non contattati o da richiamare
              </p>
            </div>
            <Link
              href="/commercial/leads"
              className="text-commercial hover:underline text-sm font-medium flex items-center gap-1"
            >
              Vedi tutti
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Nome</th>
                <th className="px-6 py-3 font-medium">Corso</th>
                <th className="px-6 py-3 font-medium">Contattato</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredLeads
                .filter(
                  (lead) =>
                    !isContacted(lead) || lead.callOutcome === "RICHIAMARE"
                )
                .slice(0, 8)
                .map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={`border-b last:border-0 hover:bg-gray-50 transition ${
                      index % 2 === 0 ? "" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {lead.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {lead.course?.name || "-"}
                    </td>
                    <td className="px-6 py-4">
                      {!isContacted(lead) ? (
                        <Tooltip
                          content="Lead non ancora contattato"
                          position="top"
                        >
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs cursor-help">
                            Da contattare
                          </span>
                        </Tooltip>
                      ) : lead.callOutcome === "RICHIAMARE" ? (
                        <Tooltip
                          content="Il lead ha richiesto di essere richiamato"
                          position="top"
                        >
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs cursor-help">
                            Richiamare
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          Sì
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isTargetLead(lead) ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                          Target
                        </span>
                      ) : lead.targetStato === "NO" ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          No
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                          N/D
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/commercial/leads?id=${lead.id}`}
                        className="text-commercial hover:underline font-medium"
                      >
                        Vedi Dettagli
                      </Link>
                    </td>
                  </tr>
                ))}
              {filteredLeads.filter(
                (lead) => !isContacted(lead) || lead.callOutcome === "RICHIAMARE"
              ).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <CheckCircle
                      size={32}
                      className="mx-auto mb-2 text-green-500"
                    />
                    <p>Ottimo lavoro! Nessun lead da contattare.</p>
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
