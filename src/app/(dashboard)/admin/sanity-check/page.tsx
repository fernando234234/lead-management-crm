"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Merge,
  RefreshCw,
  Filter,
  AlertCircle,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  enrolled: boolean;
  contacted: boolean;
  status: string;
  source: string;
  createdAt: string;
  notes: string | null;
  course: { id: string; name: string } | null;
  campaign: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
}

interface DuplicateGroup {
  key: string;
  normalizedName: string;
  courseName: string;
  courseId: string;
  count: number;
  leads: Lead[];
  hasEnrolled: boolean;
  recommendation: string;
}

interface DuplicateStats {
  totalDuplicateGroups: number;
  totalAffectedLeads: number;
  groupsWithEnrolled: number;
  potentialDoublePurchases: number;
}

interface Course {
  id: string;
  name: string;
}

export default function SanityCheckPage() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPrimary, setSelectedPrimary] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [includeResolved, setIncludeResolved] = useState(false);

  // Fetch courses for filter
  useEffect(() => {
    fetch("/api/courses")
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch(console.error);
  }, []);

  // Fetch duplicates
  const fetchDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCourse !== "all") params.set("courseId", selectedCourse);
      if (includeResolved) params.set("includeResolved", "true");

      const res = await fetch(`/api/sanity/duplicates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch duplicates");
      const data = await res.json();
      setDuplicates(data.duplicates);
      setStats(data.stats);
      
      // Auto-select first lead as primary for each group
      const defaultPrimary: Record<string, string> = {};
      for (const group of data.duplicates) {
        // Prefer enrolled lead as primary, otherwise oldest
        const enrolled = group.leads.find((l: Lead) => l.enrolled);
        defaultPrimary[group.key] = enrolled?.id || group.leads[0].id;
      }
      setSelectedPrimary(defaultPrimary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, [selectedCourse, includeResolved]);

  // Toggle group expansion
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Handle merge
  const handleMerge = async (group: DuplicateGroup) => {
    const primaryId = selectedPrimary[group.key];
    if (!primaryId) {
      alert("Seleziona il lead principale da mantenere");
      return;
    }

    const duplicateIds = group.leads
      .filter((l) => l.id !== primaryId)
      .map((l) => l.id);

    if (duplicateIds.length === 0) {
      alert("Nessun duplicato da unire");
      return;
    }

    const confirmed = confirm(
      `Unire ${duplicateIds.length} duplicati nel lead principale?\n\n` +
      `I duplicati verranno eliminati e i loro dati combinati nel lead principale.`
    );

    if (!confirmed) return;

    setMerging(group.key);
    try {
      const res = await fetch("/api/sanity/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, duplicateIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Merge failed");
      }

      // Refresh the list
      await fetchDuplicates();
      alert("Unione completata con successo!");
    } catch (err) {
      alert(`Errore: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setMerging(null);
    }
  };

  // Filter duplicates by severity
  const criticalDuplicates = useMemo(() => 
    duplicates.filter(d => d.leads.filter(l => l.enrolled).length > 1),
    [duplicates]
  );
  
  const warningDuplicates = useMemo(() => 
    duplicates.filter(d => d.hasEnrolled && d.leads.filter(l => l.enrolled).length === 1),
    [duplicates]
  );
  
  const infoDuplicates = useMemo(() => 
    duplicates.filter(d => !d.hasEnrolled),
    [duplicates]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sanity Check</h1>
          <p className="text-gray-600 mt-1">
            Verifica e gestisci i lead duplicati nel sistema
          </p>
        </div>
        <button
          onClick={fetchDuplicates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gruppi Duplicati</p>
                <p className="text-xl font-bold">{stats.totalDuplicateGroups}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lead Coinvolti</p>
                <p className="text-xl font-bold">{stats.totalAffectedLeads}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Con Iscritti</p>
                <p className="text-xl font-bold">{stats.groupsWithEnrolled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Doppi Pagamenti?</p>
                <p className="text-xl font-bold">{stats.potentialDoublePurchases}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtri:</span>
          </div>
          
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Tutti i corsi</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeResolved}
              onChange={(e) => setIncludeResolved(e.target.checked)}
              className="rounded border-gray-300"
            />
            Includi tutti iscritti (potenziali doppi pagamenti)
          </label>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* No Duplicates */}
      {!loading && duplicates.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800">Nessun duplicato trovato!</h3>
          <p className="text-green-600 mt-1">Il database è pulito.</p>
        </div>
      )}

      {/* Critical: Multiple Enrolled */}
      {criticalDuplicates.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
            <AlertCircle className="w-5 h-5" />
            Critico: Possibili Doppi Pagamenti ({criticalDuplicates.length})
          </h2>
          {criticalDuplicates.map((group) => (
            <DuplicateGroupCard
              key={group.key}
              group={group}
              expanded={expandedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              selectedPrimary={selectedPrimary[group.key]}
              onSelectPrimary={(id) => setSelectedPrimary((prev) => ({ ...prev, [group.key]: id }))}
              onMerge={() => handleMerge(group)}
              merging={merging === group.key}
              severity="critical"
            />
          ))}
        </div>
      )}

      {/* Warning: Has Enrolled */}
      {warningDuplicates.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-yellow-700">
            <AlertTriangle className="w-5 h-5" />
            Attenzione: Duplicati con Iscritto ({warningDuplicates.length})
          </h2>
          {warningDuplicates.map((group) => (
            <DuplicateGroupCard
              key={group.key}
              group={group}
              expanded={expandedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              selectedPrimary={selectedPrimary[group.key]}
              onSelectPrimary={(id) => setSelectedPrimary((prev) => ({ ...prev, [group.key]: id }))}
              onMerge={() => handleMerge(group)}
              merging={merging === group.key}
              severity="warning"
            />
          ))}
        </div>
      )}

      {/* Info: No Enrolled */}
      {infoDuplicates.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-700">
            <Users className="w-5 h-5" />
            Info: Duplicati senza Iscritti ({infoDuplicates.length})
          </h2>
          {infoDuplicates.map((group) => (
            <DuplicateGroupCard
              key={group.key}
              group={group}
              expanded={expandedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              selectedPrimary={selectedPrimary[group.key]}
              onSelectPrimary={(id) => setSelectedPrimary((prev) => ({ ...prev, [group.key]: id }))}
              onMerge={() => handleMerge(group)}
              merging={merging === group.key}
              severity="info"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Duplicate Group Card Component
function DuplicateGroupCard({
  group,
  expanded,
  onToggle,
  selectedPrimary,
  onSelectPrimary,
  onMerge,
  merging,
  severity,
}: {
  group: DuplicateGroup;
  expanded: boolean;
  onToggle: () => void;
  selectedPrimary: string;
  onSelectPrimary: (id: string) => void;
  onMerge: () => void;
  merging: boolean;
  severity: "critical" | "warning" | "info";
}) {
  const borderColor = {
    critical: "border-red-200 bg-red-50",
    warning: "border-yellow-200 bg-yellow-50",
    info: "border-blue-200 bg-blue-50",
  }[severity];

  const headerBg = {
    critical: "bg-red-100",
    warning: "bg-yellow-100",
    info: "bg-blue-100",
  }[severity];

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      {/* Header */}
      <div
        className={`${headerBg} px-4 py-3 flex items-center justify-between cursor-pointer`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-800">
            {group.normalizedName}
          </span>
          <span className="text-sm text-gray-600">
            {group.courseName}
          </span>
          <span className="px-2 py-1 bg-white rounded-full text-xs font-medium">
            {group.count} duplicati
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 bg-white">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Raccomandazione:</strong> {group.recommendation}
          </p>

          {/* Lead Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Principale</th>
                  <th className="text-left py-2 px-2">Nome</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Telefono</th>
                  <th className="text-left py-2 px-2">Stato</th>
                  <th className="text-left py-2 px-2">Iscritto</th>
                  <th className="text-left py-2 px-2">Fonte</th>
                  <th className="text-left py-2 px-2">Creato da</th>
                  <th className="text-left py-2 px-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {group.leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b ${
                      selectedPrimary === lead.id ? "bg-green-50" : ""
                    }`}
                  >
                    <td className="py-2 px-2">
                      <input
                        type="radio"
                        name={`primary-${group.key}`}
                        checked={selectedPrimary === lead.id}
                        onChange={() => onSelectPrimary(lead.id)}
                        className="w-4 h-4 text-green-600"
                      />
                    </td>
                    <td className="py-2 px-2 font-medium">{lead.name}</td>
                    <td className="py-2 px-2 text-gray-600">
                      {lead.email || "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {lead.phone || "-"}
                    </td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {lead.enrolled ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-300" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-600">{lead.source}</td>
                    <td className="py-2 px-2 text-gray-600">
                      {lead.createdBy?.name || "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {new Date(lead.createdAt).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Merge Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onMerge}
              disabled={merging}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {merging ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Merge className="w-4 h-4" />
              )}
              Unisci nel Principale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
