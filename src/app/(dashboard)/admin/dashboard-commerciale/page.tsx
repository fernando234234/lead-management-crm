"use client";

import { useState, useEffect, useMemo } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useDataFilter, getDataSourceParam } from "@/contexts/DataFilterContext";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Euro, 
  Target,
  Calendar,
  TestTube,
  FileSpreadsheet,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import ExportButton from "@/components/ui/ExportButton";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";

// Types
interface Lead {
  id: string;
  name: string;
  status: string;
  isTarget: boolean;
  contacted: boolean;
  enrolled: boolean;
  acquisitionCost: number | null;
  createdAt: string;
  course: { id: string; name: string; price: number } | null;
  campaign: { id: string; name: string; platform: string } | null;
  assignedTo: { id: string; name: string } | null;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface SpendRecord {
  id: string;
  date: string;
  amount: number;
}

interface Campaign {
  id: string;
  name: string;
  totalSpent: number;
  leadCount: number;
  spendRecords?: SpendRecord[];
  course?: { id: string; name: string };
}

type SortDirection = "asc" | "desc" | null;

// Export configurations
const commercialExportColumns = [
  { key: "name", label: "Commerciale" },
  { key: "leads", label: "Lead" },
  { key: "contacted", label: "Contattati" },
  { key: "enrollments", label: "Iscrizioni" },
  { key: "conversionRate", label: "Conversione %" },
  { key: "costPerConsultation", label: "Costo per Consulenza" },
  { key: "costPerContract", label: "Costo per Contratto" },
];

const courseExportColumns = [
  { key: "name", label: "Corso" },
  { key: "leads", label: "Lead" },
  { key: "contacted", label: "Contattati" },
  { key: "enrollments", label: "Iscrizioni" },
  { key: "conversionRate", label: "Conversione %" },
  { key: "costPerConsultation", label: "Costo per Consulenza" },
  { key: "costPerContract", label: "Costo per Contratto" },
];

export default function DashboardCommercialePage() {
  const { isDemoMode } = useDemoMode();
  const { dataSource } = useDataFilter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Date filter
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // New: Course filter for Commercial Performance table
  const [selectedCourseForCommercial, setSelectedCourseForCommercial] = useState<string>("all");

  // Sort states
  const [commercialSort, setCommercialSort] = useState<{ field: string; direction: SortDirection }>({
    field: "leads",
    direction: "desc",
  });
  const [courseSort, setCourseSort] = useState<{ field: string; direction: SortDirection }>({
    field: "leads",
    direction: "desc",
  });

  useEffect(() => {
    fetchData();
  }, [isDemoMode, dataSource]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query params with data source filter
      const sourceParam = getDataSourceParam(dataSource);
      const leadsUrl = sourceParam ? `/api/leads?${sourceParam}` : "/api/leads";
      
      const [leadsRes, usersRes, campaignsRes] = await Promise.all([
        fetch(leadsUrl),
        fetch("/api/users"),
        fetch("/api/campaigns"),
      ]);

      const [leadsData, usersData, campaignsData] = await Promise.all([
        leadsRes.json(),
        usersRes.json(),
        campaignsRes.json(),
      ]);

      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leads by date
  const filteredLeads = useMemo(() => {
    if (!startDate && !endDate) return leads;
    
    return leads.filter((lead) => {
      const leadDate = new Date(lead.createdAt);
      leadDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (leadDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (leadDate > end) return false;
      }
      
      return true;
    });
  }, [leads, startDate, endDate]);

  // Derive unique courses from leads for the filter dropdown
  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach(l => {
      if (l.course) {
        map.set(l.course.id, l.course.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads]);

  // Calculate filtered spend based on date range
  const filteredSpend = useMemo(() => {
    if (!startDate && !endDate) {
      // No date filter - use total spent
      return campaigns.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    }
    
    // Filter spend records by date range
    return campaigns.reduce((sum, campaign) => {
      if (!campaign.spendRecords) return sum + (campaign.totalSpent || 0);
      
      const filteredRecords = campaign.spendRecords.filter((record) => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (recordDate < start) return false;
        }
        
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recordDate > end) return false;
        }
        
        return true;
      });
      
      return sum + filteredRecords.reduce((s, r) => s + Number(r.amount), 0);
    }, 0);
  }, [campaigns, startDate, endDate]);

  // Calculate KPIs (matching Excel exactly)
  const kpis = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const enrolledLeads = filteredLeads.filter((l) => l.enrolled).length;
    const conversionRate = totalLeads > 0 ? (enrolledLeads / totalLeads) * 100 : 0;
    
    // Total ad spend from campaigns (filtered by date)
    const totalSpend = filteredSpend;
    
    // CPA (Cost Per Acquisition/Enrollment)
    const cpa = enrolledLeads > 0 ? totalSpend / enrolledLeads : 0;
    
    // Total revenue (enrolled * course price)
    // Note: Prisma returns Decimal as string, so we must convert to Number
    const totalRevenue = filteredLeads
      .filter((l) => l.enrolled && l.course)
      .reduce((sum, l) => sum + Number(l.course?.price || 0), 0);
    
    // Net result
    const netResult = totalRevenue - totalSpend;

    return {
      totalLeads,
      enrolledLeads,
      conversionRate,
      cpa,
      totalSpend,
      totalRevenue,
      netResult,
    };
  }, [filteredLeads, filteredSpend]);

  // Funnel data (matching Excel)
  const funnelData = useMemo(() => {
    const totalLeads = filteredLeads.length;
    // Lead Validi = leads marked as target (isTarget field from Excel "Lead Validi" column)
    const validLeads = filteredLeads.filter((l) => l.isTarget).length;
    const contacted = filteredLeads.filter((l) => l.contacted).length;
    // "Appuntamenti" would be IN_TRATTATIVA status
    const appointments = filteredLeads.filter((l) => l.status === "IN_TRATTATIVA").length;
    const enrollments = filteredLeads.filter((l) => l.enrolled).length;

    return {
      leadGenerati: totalLeads,
      leadValidi: validLeads,
      contattati: contacted,
      appuntamenti: appointments,
      iscrizioni: enrollments,
    };
  }, [filteredLeads]);

  // Commercial performance (matching Excel table)
  const commercialPerformance = useMemo(() => {
    const commercials = users.filter((u) => u.role === "COMMERCIAL");
    
    // Calculate total spend relevant to the current filter context
    let viewTotalSpend = filteredSpend;
    let viewTotalLeads = kpis.totalLeads;

    // If a specific course is selected, we need to filter the Total Spend and Total Leads
    // used for proportional calculation just for that course context
    if (selectedCourseForCommercial !== "all") {
      // Filter leads just for the total count of this course
      const leadsForCourse = filteredLeads.filter(l => l.course?.id === selectedCourseForCommercial);
      viewTotalLeads = leadsForCourse.length;

      // Filter spend just for campaigns of this course
      viewTotalSpend = campaigns.reduce((sum, campaign) => {
        // Skip campaigns not for this course
        if (campaign.course?.id !== selectedCourseForCommercial) return sum;

        if (!campaign.spendRecords) return sum + (campaign.totalSpent || 0);
        
        // Apply date filter to records
        const filteredRecords = campaign.spendRecords.filter((record) => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (recordDate < start) return false;
          }
          
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (recordDate > end) return false;
          }
          
          return true;
        });
        
        return sum + filteredRecords.reduce((s, r) => s + Number(r.amount), 0);
      }, 0);
    }
    
    const data = commercials.map((user) => {
      // Filter leads for this user AND the selected course
      const userLeads = filteredLeads.filter((l) => {
        if (l.assignedTo?.id !== user.id) return false;
        if (selectedCourseForCommercial !== "all" && l.course?.id !== selectedCourseForCommercial) return false;
        return true;
      });

      const leads = userLeads.length;
      const contacted = userLeads.filter((l) => l.contacted).length;
      const enrollments = userLeads.filter((l) => l.enrolled).length;
      const conversionRate = leads > 0 ? (enrollments / leads) * 100 : 0;
      
      // Distribute costs proportionally by lead count WITHIN the current filter context
      // Cost Share = (User's Leads for Course X / Total Leads for Course X) * Total Spend for Course X
      const costShare = viewTotalLeads > 0 ? (leads / viewTotalLeads) * viewTotalSpend : 0;
      
      const costPerConsultation = contacted > 0 ? costShare / contacted : 0;
      const costPerContract = enrollments > 0 ? costShare / enrollments : 0;

      return {
        id: user.id,
        name: user.name,
        leads,
        contacted,
        enrollments,
        conversionRate,
        costPerConsultation,
        costPerContract,
      };
    });

    // Sort
    const sorted = [...data].sort((a, b) => {
      if (!commercialSort.direction) return 0;
      const multiplier = commercialSort.direction === "asc" ? 1 : -1;
      const aVal = a[commercialSort.field as keyof typeof a];
      const bVal = b[commercialSort.field as keyof typeof b];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * multiplier;
      }
      return ((aVal as number) - (bVal as number)) * multiplier;
    });

    return sorted;
  }, [users, filteredLeads, filteredSpend, commercialSort, kpis.totalLeads, campaigns, selectedCourseForCommercial, startDate, endDate]);

  // Course performance (matching Excel table)
  const coursePerformance = useMemo(() => {
    const courseMap = new Map<string, {
      id: string;
      name: string;
      leads: number;
      contacted: number;
      enrollments: number;
    }>();

    filteredLeads.forEach((lead) => {
      if (!lead.course) return;
      
      const existing = courseMap.get(lead.course.id) || {
        id: lead.course.id,
        name: lead.course.name,
        leads: 0,
        contacted: 0,
        enrollments: 0,
      };

      existing.leads++;
      if (lead.contacted) existing.contacted++;
      if (lead.enrolled) existing.enrollments++;

      courseMap.set(lead.course.id, existing);
    });

    // Use filtered spend for date-accurate cost calculations
    const totalSpend = filteredSpend;

    const data = Array.from(courseMap.values()).map((course) => {
      const conversionRate = course.leads > 0 ? (course.enrollments / course.leads) * 100 : 0;
      
      // Distribute costs proportionally
      const costShare = kpis.totalLeads > 0 ? (course.leads / kpis.totalLeads) * totalSpend : 0;
      const costPerConsultation = course.contacted > 0 ? costShare / course.contacted : 0;
      const costPerContract = course.enrollments > 0 ? costShare / course.enrollments : 0;

      return {
        ...course,
        conversionRate,
        costPerConsultation,
        costPerContract,
      };
    });

    // Sort
    const sorted = [...data].sort((a, b) => {
      if (!courseSort.direction) return 0;
      const multiplier = courseSort.direction === "asc" ? 1 : -1;
      const aVal = a[courseSort.field as keyof typeof a];
      const bVal = b[courseSort.field as keyof typeof b];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * multiplier;
      }
      return ((aVal as number) - (bVal as number)) * multiplier;
    });

    return sorted;
  }, [filteredLeads, filteredSpend, courseSort, kpis.totalLeads]);

  // Sort handler
  const handleSort = (
    field: string,
    currentSort: { field: string; direction: SortDirection },
    setSort: React.Dispatch<React.SetStateAction<{ field: string; direction: SortDirection }>>
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

  // Sort indicator
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

  const handleDateChange = (start: string | null, end: string | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-admin/30 border-t-admin rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="text-admin" />
            Dashboard Commerciale
          </h1>
          <p className="text-gray-500">Report stile Excel - Panoramica performance</p>
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
              Demo
            </div>
          )}
        </div>
      </div>

      {/* Main Grid - Excel Style Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: KPI COMMERCIALI */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-admin text-white px-4 py-3">
            <h2 className="font-bold text-lg">KPI COMMERCIALI</h2>
          </div>
          <div className="divide-y">
            <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
              <span className="text-gray-600">Totale Lead</span>
              <span className="text-xl font-bold text-gray-900">{kpis.totalLeads.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
              <span className="text-gray-600">Totale Iscrizioni</span>
              <span className="text-xl font-bold text-green-600">{kpis.enrolledLeads.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
              <span className="text-gray-600">Tasso di Conversione %</span>
              <span className="text-xl font-bold text-blue-600">{kpis.conversionRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
              <span className="text-gray-600">CPA (Costo per Iscrizione)</span>
              <span className="text-xl font-bold text-orange-600">€{kpis.cpa.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
              <span className="text-gray-600">Spesa Totale ADS</span>
              <span className="text-xl font-bold text-red-600">€{kpis.totalSpend.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 hover:bg-gray-50">
              <span className="text-gray-600">Ricavi Totali</span>
              <span className="text-xl font-bold text-green-600">€{kpis.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
              <span className="font-semibold text-gray-900">Risultato Netto</span>
              <span className={`text-xl font-bold ${kpis.netResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                €{kpis.netResult.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Column: FUNNEL */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 text-white px-4 py-3">
            <h2 className="font-bold text-lg">FUNNEL</h2>
          </div>
          <div className="p-4 space-y-3">
            {/* Funnel visualization */}
            <div className="space-y-2">
              <FunnelStep 
                label="Lead generati" 
                value={funnelData.leadGenerati} 
                maxValue={funnelData.leadGenerati}
                color="bg-blue-500"
              />
              <FunnelStep 
                label="Lead validi" 
                value={funnelData.leadValidi} 
                maxValue={funnelData.leadGenerati}
                color="bg-blue-400"
              />
              <FunnelStep 
                label="Contattati" 
                value={funnelData.contattati} 
                maxValue={funnelData.leadGenerati}
                color="bg-yellow-500"
              />
              <FunnelStep 
                label="Iscrizioni" 
                value={funnelData.iscrizioni} 
                maxValue={funnelData.leadGenerati}
                color="bg-green-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Date Filter Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-700 text-white px-4 py-3">
            <h2 className="font-bold text-lg">FILTRO DATE</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Data Inizio</p>
                <p className="font-medium">{startDate || "Tutte"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-500">Data Fine</p>
                <p className="font-medium">{endDate || "Tutte"}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{kpis.totalLeads}</p>
                  <p className="text-xs text-gray-500">Lead nel periodo</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{kpis.enrolledLeads}</p>
                  <p className="text-xs text-gray-500">Iscrizioni</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* PERFORMANCE PER COMMERCIALE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-emerald-600 text-white px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
            <h2 className="font-bold text-lg">PERFORMANCE PER COMMERCIALE</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedCourseForCommercial}
                onChange={(e) => setSelectedCourseForCommercial(e.target.value)}
                className="bg-emerald-700 text-white border-none rounded-lg py-1.5 px-3 text-sm focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option value="all">Tutti i Corsi</option>
                {uniqueCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              <ExportButton
                data={commercialPerformance}
                columns={commercialExportColumns}
                filename={`performance_commerciali_${selectedCourseForCommercial !== "all" ? "filtrato" : "totale"}`}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th 
                    className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("name", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center gap-1">
                      Commerciale
                      <SortIndicator field="name" currentSort={commercialSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("leads", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Lead
                      <SortIndicator field="leads" currentSort={commercialSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("contacted", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Contattati
                      <SortIndicator field="contacted" currentSort={commercialSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("enrollments", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Iscrizioni
                      <SortIndicator field="enrollments" currentSort={commercialSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("conversionRate", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Conv. %
                      <SortIndicator field="conversionRate" currentSort={commercialSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("costPerConsultation", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo/Cons.
                      <SortIndicator field="costPerConsultation" currentSort={commercialSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("costPerContract", commercialSort, setCommercialSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo/Contr.
                      <SortIndicator field="costPerContract" currentSort={commercialSort} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {commercialPerformance.map((commercial, idx) => (
                  <tr key={commercial.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 font-medium">{commercial.name}</td>
                    <td className="px-3 py-2 text-right">{commercial.leads}</td>
                    <td className="px-3 py-2 text-right">{commercial.contacted}</td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">{commercial.enrollments}</td>
                    <td className="px-3 py-2 text-right">{commercial.conversionRate.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right">€{commercial.costPerConsultation.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">€{commercial.costPerContract.toFixed(2)}</td>
                  </tr>
                ))}
                {commercialPerformance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                      Nessun commerciale trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PERFORMANCE PER CORSO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-purple-600 text-white px-4 py-3 flex justify-between items-center">
            <h2 className="font-bold text-lg">PERFORMANCE PER CORSO</h2>
            <ExportButton
              data={coursePerformance}
              columns={courseExportColumns}
              filename="performance_corsi"
            />
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-100 text-left">
                  <th 
                    className="px-3 py-2 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("name", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center gap-1">
                      Corso
                      <SortIndicator field="name" currentSort={courseSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("leads", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Lead
                      <SortIndicator field="leads" currentSort={courseSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("contacted", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Contattati
                      <SortIndicator field="contacted" currentSort={courseSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("enrollments", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Iscrizioni
                      <SortIndicator field="enrollments" currentSort={courseSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("conversionRate", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Conv. %
                      <SortIndicator field="conversionRate" currentSort={courseSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("costPerConsultation", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo/Cons.
                      <SortIndicator field="costPerConsultation" currentSort={courseSort} />
                    </div>
                  </th>
                  <th 
                    className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("costPerContract", courseSort, setCourseSort)}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo/Contr.
                      <SortIndicator field="costPerContract" currentSort={courseSort} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coursePerformance.map((course, idx) => (
                  <tr key={course.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={course.name}>
                      {course.name}
                    </td>
                    <td className="px-3 py-2 text-right">{course.leads}</td>
                    <td className="px-3 py-2 text-right">{course.contacted}</td>
                    <td className="px-3 py-2 text-right font-medium text-green-600">{course.enrollments}</td>
                    <td className="px-3 py-2 text-right">{course.conversionRate.toFixed(2)}%</td>
                    <td className="px-3 py-2 text-right">€{course.costPerConsultation.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">€{course.costPerContract.toFixed(2)}</td>
                  </tr>
                ))}
                {coursePerformance.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                      Nessun corso trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funnel Step Component
function FunnelStep({ 
  label, 
  value, 
  maxValue, 
  color 
}: { 
  label: string; 
  value: number; 
  maxValue: number; 
  color: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold">{value.toLocaleString()}</span>
      </div>
      <div className="h-8 bg-gray-100 rounded overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        >
          {percentage > 15 && (
            <span className="text-white text-xs font-medium">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
