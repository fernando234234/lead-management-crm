"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { PieChart, BarChart, LineChart } from "@/components/charts";
import {
  Users,
  Phone,
  UserCheck,
  Target,
  PhoneMissed,
} from "lucide-react";

interface Lead {
  id: string;
  status: string;
  contacted: boolean;
  enrolled: boolean;
  callOutcome: string | null;
  createdAt: string;
  assignedTo: { id: string } | null;
}

interface Stats {
  totalLeads: number;
  contactedLeads: number;
  enrolledLeads: number;
  conversionRate: string;
  leadsByStatus: Record<string, number>;
  callOutcomes: Record<string, number>;
  leadsByMonth: { month: string; count: number }[];
}

const statusLabels: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

// Status colors kept for reference (used in PieChart via colors array)
// Order: NUOVO (blue), CONTATTATO (yellow), IN_TRATTATIVA (purple), ISCRITTO (green), PERSO (red)

const outcomeLabels: Record<string, string> = {
  POSITIVO: "Interessato",
  RICHIAMARE: "Da Richiamare",
  NEGATIVO: "Non Interessato",
  NON_RISPONDE: "Da Richiamare", // Legacy support - counted as RICHIAMARE
};

// Outcome colors kept for reference (used in BarChart via colors array)
// Order: POSITIVO (green), RICHIAMARE (yellow), NEGATIVO (red)

export default function CommercialStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads?assignedToMe=true");
      const leadsData: Lead[] = await res.json();

      // Calculate stats from fetched data
      const leadsByStatus: Record<string, number> = {};
      const callOutcomes: Record<string, number> = {};
      const monthlyData: Record<string, number> = {};

      leadsData.forEach((lead) => {
        leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
        if (lead.callOutcome) {
          callOutcomes[lead.callOutcome] = (callOutcomes[lead.callOutcome] || 0) + 1;
        }

        // Group by month
        const month = new Date(lead.createdAt).toLocaleDateString("it-IT", {
          month: "short",
        });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      });

      const totalLeads = leadsData.length;
      const contactedLeads = leadsData.filter((l) => l.contacted).length;
      const enrolledLeads = leadsData.filter((l) => l.enrolled).length;
      const conversionRate =
        totalLeads > 0
          ? ((enrolledLeads / totalLeads) * 100).toFixed(1)
          : "0.0";

      const leadsByMonth = Object.entries(monthlyData)
        .map(([month, count]) => ({ month, count }))
        .slice(-6);

      setStats({
        totalLeads,
        contactedLeads,
        enrolledLeads,
        conversionRate,
        leadsByStatus,
        callOutcomes,
        leadsByMonth,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  if (!stats) {
    return <div className="p-8">Errore nel caricamento delle statistiche</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Le Mie Statistiche</h1>
          <p className="text-gray-500">Panoramica delle tue performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Lead Assegnati"
          value={stats.totalLeads}
          icon={Users}
          subtitle="Totale"
        />
        <StatCard
          title="Contattati"
          value={stats.contactedLeads}
          icon={Phone}
          subtitle={`${
            stats.totalLeads > 0
              ? ((stats.contactedLeads / stats.totalLeads) * 100).toFixed(0)
              : 0
          }% del totale`}
        />
        <StatCard
          title="Iscritti"
          value={stats.enrolledLeads}
          icon={UserCheck}
          subtitle="Conversioni completate"
        />
        <StatCard
          title="Tasso Conversione"
          value={`${stats.conversionRate}%`}
          icon={Target}
          trend={{
            value: 3.2,
            isPositive: true,
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Status Distribution - PieChart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <PieChart
            data={Object.entries(statusLabels).map(([status, label]) => ({
              name: label,
              value: stats.leadsByStatus[status] || 0,
            }))}
            nameKey="name"
            valueKey="value"
            colors={["#3b82f6", "#eab308", "#a855f7", "#22c55e", "#ef4444"]}
            title="Distribuzione Lead per Stato"
            height={280}
            showLegend={true}
          />
        </div>

        {/* Call Outcomes - BarChart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {Object.keys(stats.callOutcomes).length > 0 ? (
            <BarChart
              data={Object.entries(outcomeLabels).map(([outcome, label]) => ({
                name: label,
                valore: stats.callOutcomes[outcome] || 0,
              }))}
              xKey="name"
              yKey="valore"
              colors={["#22c55e", "#ef4444", "#eab308", "#6b7280"]}
              title="Esiti Chiamate"
              height={280}
              showGrid={true}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 h-[280px]">
              <PhoneMissed size={48} className="mb-4" />
              <p>Nessun esito chiamata registrato</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Over Time - LineChart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <LineChart
          data={stats.leadsByMonth}
          xKey="month"
          yKey="count"
          color="#f97316"
          title="Performance nel Tempo"
          height={280}
          showGrid={true}
        />
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Lead da Contattare</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.leadsByStatus["NUOVO"] || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500 rounded-lg">
              <Target size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-600 font-medium">In Trattativa</p>
              <p className="text-2xl font-bold text-purple-700">
                {stats.leadsByStatus["IN_TRATTATIVA"] || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-lg">
              <UserCheck size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">
                Tasso Successo Chiamate
              </p>
              <p className="text-2xl font-bold text-green-700">
                {stats.callOutcomes["POSITIVO"]
                  ? (
                      (stats.callOutcomes["POSITIVO"] /
                        Object.values(stats.callOutcomes).reduce((a, b) => a + b, 0)) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
