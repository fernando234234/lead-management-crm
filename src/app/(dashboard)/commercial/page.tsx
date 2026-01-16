"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockLeads } from "@/lib/mockData";
import { StatCard } from "@/components/ui/StatCard";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { Users, Phone, UserCheck, Target, TestTube } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import Link from "next/link";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  contacted: boolean;
  enrolled: boolean;
  callOutcome: string | null;
  createdAt: string;
  course?: { id: string; name: string };
  campaign?: { id: string; name: string };
}

export default function CommercialDashboard() {
  const { data: session } = useSession();
  const { isDemoMode } = useDemoMode();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Mock user ID for demo mode (Marco Verdi - commercial user)
  const DEMO_USER_ID = "1";

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
    if (isDemoMode) {
      // Filter mock leads assigned to demo user
      const demoLeads = mockLeads.filter(
        (lead) => lead.assignedTo?.id === DEMO_USER_ID
      ) as Lead[];
      setLeads(demoLeads);
      setLoading(false);
    } else if (session?.user?.id) {
      fetchLeads();
    }
  }, [isDemoMode, session?.user?.id]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?assignedToId=${session?.user?.id}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats dynamically based on filtered leads
  const stats = useMemo(() => ({
    totalLeads: filteredLeads.length,
    contacted: filteredLeads.filter((lead) => lead.contacted).length,
    enrolled: filteredLeads.filter((lead) => lead.enrolled).length,
    conversionRate: filteredLeads.length > 0
      ? ((filteredLeads.filter((lead) => lead.enrolled).length / filteredLeads.length) * 100).toFixed(1)
      : "0",
  }), [filteredLeads]);

  // Filter leads to contact (not contacted or need to call back)
  const leadsToContact = useMemo(() => {
    return filteredLeads.filter(
      (lead) => !lead.contacted || lead.callOutcome === "RICHIAMARE"
    ).slice(0, 10);
  }, [filteredLeads]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const statusTooltips: Record<string, string> = {
    "Da contattare": "Lead non ancora contattato. Effettua la prima chiamata.",
    "Richiamare": "Il lead ha richiesto di essere richiamato.",
    "NUOVO": "Lead appena acquisito, in attesa di primo contatto.",
    "CONTATTATO": "Lead contattato, in attesa di risposta.",
    "IN_TRATTATIVA": "Trattativa in corso con il lead.",
    "ISCRITTO": "Lead convertito con successo!",
    "PERSO": "Lead non interessato o non raggiungibile.",
  };

  const getStatusBadge = (lead: Lead) => {
    if (!lead.contacted) {
      return (
        <Tooltip content={statusTooltips["Da contattare"]} position="top">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs cursor-help">
            Da contattare
          </span>
        </Tooltip>
      );
    }
    if (lead.callOutcome === "RICHIAMARE") {
      return (
        <Tooltip content={statusTooltips["Richiamare"]} position="top">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs cursor-help">
            Richiamare
          </span>
        </Tooltip>
      );
    }
    return (
      <Tooltip content={statusTooltips[lead.status] || "Stato del lead"} position="top">
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs cursor-help">
          {lead.status}
        </span>
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-commercial/30 border-t-commercial rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Commerciale</h1>
          <p className="text-gray-500">Panoramica dei tuoi lead e performance</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            presets
          />
          {isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <TestTube size={16} />
              Modalita Demo
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Lead Assegnati"
          value={stats.totalLeads}
          icon={Users}
          subtitle="Totale"
        />
        <StatCard
          title="Contattati"
          value={stats.contacted}
          icon={Phone}
          subtitle={stats.totalLeads > 0 ? `${((stats.contacted / stats.totalLeads) * 100).toFixed(0)}% del totale` : "0% del totale"}
        />
        <StatCard
          title="Iscritti"
          value={stats.enrolled}
          icon={UserCheck}
          subtitle="Conversioni completate"
        />
        <StatCard
          title="Tasso Conversione"
          value={`${stats.conversionRate}%`}
          icon={Target}
        />
      </div>

      {/* Recent Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Lead Recenti da Contattare</h2>
          <p className="text-sm text-gray-500">Lead non contattati o da richiamare</p>
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Data Creazione</th>
                <th className="pb-3 font-medium">Nome</th>
                <th className="pb-3 font-medium">Corso</th>
                <th className="pb-3 font-medium">Stato</th>
                <th className="pb-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {leadsToContact.length > 0 ? (
                leadsToContact.map((lead) => (
                  <tr key={lead.id} className="border-b">
                    <td className="py-4">{formatDate(lead.createdAt)}</td>
                    <td className="py-4">{lead.name}</td>
                    <td className="py-4">{lead.course?.name || "-"}</td>
                    <td className="py-4">{getStatusBadge(lead)}</td>
                    <td className="py-4">
                      <Link
                        href={`/commercial/leads?id=${lead.id}`}
                        className="text-commercial hover:underline"
                      >
                        Vedi Dettagli
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Nessun lead da contattare
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
