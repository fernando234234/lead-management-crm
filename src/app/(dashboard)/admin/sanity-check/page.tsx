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
  HelpCircle,
  Info,
  Trash2,
  Eye,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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

  // Expand all groups
  const expandAll = () => {
    setExpandedGroups(new Set(duplicates.map(d => d.key)));
  };

  // Collapse all groups
  const collapseAll = () => {
    setExpandedGroups(new Set());
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

    const primaryLead = group.leads.find(l => l.id === primaryId);
    const confirmed = confirm(
      `Unire ${duplicateIds.length} duplicati nel lead principale?\n\n` +
      `Lead principale: ${primaryLead?.name}\n` +
      `Email: ${primaryLead?.email || "N/A"}\n` +
      `Telefono: ${primaryLead?.phone || "N/A"}\n\n` +
      `I ${duplicateIds.length} duplicati verranno eliminati e i loro dati combinati nel lead principale.`
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
      setSuccessMessage(`Unione completata: ${duplicateIds.length} duplicati uniti in "${primaryLead?.name}"`);
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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sanity Check</h1>
            <p className="text-gray-600 mt-1">
              Verifica e gestisci i lead duplicati nel sistema
            </p>
          </div>
          <Tooltip 
            content="Questa pagina identifica lead con lo stesso nome nello stesso corso. I duplicati possono causare confusione e statistiche errate. Usa il pulsante 'Unisci' per combinare i record duplicati in uno solo."
            position="right"
          >
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <HelpCircle className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          {duplicates.length > 0 && (
            <>
              <Tooltip content="Espandi tutti i gruppi" position="bottom">
                <button
                  onClick={expandAll}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Comprimi tutti i gruppi" position="bottom">
                <button
                  onClick={collapseAll}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </Tooltip>
            </>
          )}
          <button
            onClick={fetchDuplicates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{successMessage}</p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tooltip content="Numero di gruppi di lead con lo stesso nome nello stesso corso" position="bottom">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-help transition-shadow hover:shadow-md">
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
          </Tooltip>

          <Tooltip content="Numero totale di lead coinvolti in duplicazioni (es. 3 gruppi da 2 = 6 lead)" position="bottom">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-help transition-shadow hover:shadow-md">
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
          </Tooltip>

          <Tooltip content="Gruppi dove almeno un lead è già iscritto - richiedono attenzione per evitare di perdere dati" position="bottom">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-help transition-shadow hover:shadow-md">
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
          </Tooltip>

          <Tooltip content="CRITICO: Gruppi con PIÙ di un lead iscritto - potrebbe indicare doppio pagamento o errore di registrazione" position="bottom" variant="accent">
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 cursor-help transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Doppi Pagamenti?</p>
                  <p className="text-xl font-bold text-red-600">{stats.potentialDoublePurchases}</p>
                </div>
              </div>
            </div>
          </Tooltip>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtri:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tutti i corsi</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <Tooltip content="Filtra i duplicati per un corso specifico" position="top">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={includeResolved}
                onChange={(e) => setIncludeResolved(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Includi tutti iscritti
            </label>
            <Tooltip 
              content="Di default, i gruppi dove TUTTI i lead sono iscritti sono nascosti (possibili falsi positivi). Attiva per vedere anche questi casi - potrebbero indicare doppi pagamenti."
              position="top"
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Legenda Severità:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div>
              <span className="font-medium text-red-700">Critico</span>
              <p className="text-red-600 text-xs">Più lead iscritti - possibile doppio pagamento</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <div>
              <span className="font-medium text-yellow-700">Attenzione</span>
              <p className="text-yellow-600 text-xs">Un lead iscritto - unire gli altri in questo</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <span className="font-medium text-blue-700">Info</span>
              <p className="text-blue-600 text-xs">Nessun iscritto - pulizia dati</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchDuplicates}
            className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
          >
            Riprova
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500">Analisi duplicati in corso...</p>
        </div>
      )}

      {/* No Duplicates */}
      {!loading && duplicates.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800">Nessun duplicato trovato!</h3>
          <p className="text-green-600 mt-1">Il database è pulito. Ottimo lavoro!</p>
        </div>
      )}

      {/* Critical: Multiple Enrolled */}
      {criticalDuplicates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700">
              <AlertCircle className="w-5 h-5" />
              Critico: Possibili Doppi Pagamenti ({criticalDuplicates.length})
            </h2>
            <Tooltip 
              content="Questi gruppi hanno PIÙ DI UN lead iscritto. Questo potrebbe indicare che la stessa persona ha pagato due volte. Verifica con l'amministrazione prima di unire."
              position="right"
              variant="accent"
            >
              <HelpCircle className="w-4 h-4 text-red-400" />
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-yellow-700">
              <AlertTriangle className="w-5 h-5" />
              Attenzione: Duplicati con Iscritto ({warningDuplicates.length})
            </h2>
            <Tooltip 
              content="Questi gruppi hanno UN lead iscritto. Seleziona il lead iscritto come principale e unisci gli altri per mantenere i dati corretti."
              position="right"
            >
              <HelpCircle className="w-4 h-4 text-yellow-400" />
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-700">
              <Users className="w-5 h-5" />
              Info: Duplicati senza Iscritti ({infoDuplicates.length})
            </h2>
            <Tooltip 
              content="Questi gruppi non hanno lead iscritti. Puoi unirli senza rischi. Scegli il lead con i dati più completi come principale."
              position="right"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
            </Tooltip>
          </div>
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
    critical: "bg-red-100 hover:bg-red-150",
    warning: "bg-yellow-100 hover:bg-yellow-150",
    info: "bg-blue-100 hover:bg-blue-150",
  }[severity];

  const enrolledCount = group.leads.filter(l => l.enrolled).length;

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden transition-shadow hover:shadow-md`}>
      {/* Header */}
      <div
        className={`${headerBg} px-4 py-3 flex items-center justify-between cursor-pointer transition-colors`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-gray-800">
            {group.normalizedName}
          </span>
          <span className="text-sm text-gray-600 bg-white/50 px-2 py-0.5 rounded">
            {group.courseName}
          </span>
          <span className="px-2 py-1 bg-white rounded-full text-xs font-medium">
            {group.count} duplicati
          </span>
          {enrolledCount > 0 && (
            <Tooltip content={`${enrolledCount} lead già iscritti in questo gruppo`} position="top">
              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                enrolledCount > 1 ? "bg-red-200 text-red-700" : "bg-green-200 text-green-700"
              }`}>
                <CheckCircle className="w-3 h-3" />
                {enrolledCount} iscritti
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {expanded ? "Chiudi" : "Espandi"}
          </span>
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
          {/* Recommendation */}
          <div className="flex items-start gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Raccomandazione:</p>
              <p className="text-sm text-gray-600">{group.recommendation}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500"></span>
              = Lead principale (verrà mantenuto)
            </span>
            <span className="flex items-center gap-1">
              <Trash2 className="w-3 h-3" />
              = Verranno eliminati e uniti nel principale
            </span>
          </div>

          {/* Lead Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="text-left py-2 px-3">
                    <Tooltip content="Seleziona il lead da mantenere. Gli altri verranno eliminati e i loro dati uniti qui." position="top">
                      <span className="flex items-center gap-1 cursor-help">
                        Principale
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Telefono</th>
                  <th className="text-left py-2 px-3">Stato</th>
                  <th className="text-left py-2 px-3">
                    <Tooltip content="Se il lead è iscritto al corso" position="top">
                      <span className="flex items-center gap-1 cursor-help">
                        Iscritto
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-left py-2 px-3">
                    <Tooltip content="Come è stato creato il lead: MANUAL = inserito a mano, CAMPAIGN = da campagna, LEGACY_IMPORT = importazione" position="top">
                      <span className="flex items-center gap-1 cursor-help">
                        Fonte
                        <HelpCircle className="w-3 h-3 text-gray-400" />
                      </span>
                    </Tooltip>
                  </th>
                  <th className="text-left py-2 px-3">Creato da</th>
                  <th className="text-left py-2 px-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {group.leads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={`border-b last:border-b-0 transition-colors ${
                      selectedPrimary === lead.id 
                        ? "bg-green-50 border-l-4 border-l-green-500" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-2 px-3">
                      <Tooltip 
                        content={selectedPrimary === lead.id 
                          ? "Questo lead verrà mantenuto" 
                          : "Clicca per selezionare come principale"
                        }
                        position="right"
                      >
                        <input
                          type="radio"
                          name={`primary-${group.key}`}
                          checked={selectedPrimary === lead.id}
                          onChange={() => onSelectPrimary(lead.id)}
                          className="w-4 h-4 text-green-600 cursor-pointer"
                        />
                      </Tooltip>
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {lead.name}
                      {index === 0 && (
                        <span className="ml-2 text-xs text-gray-400">(più vecchio)</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {lead.email ? (
                        <span className="text-blue-600">{lead.email}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {lead.phone || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {lead.enrolled ? (
                        <Tooltip content="Iscritto - lead importante!" position="top">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </Tooltip>
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        lead.source === "MANUAL" ? "bg-blue-100 text-blue-700" :
                        lead.source === "CAMPAIGN" ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {lead.createdBy?.name || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(lead.createdAt).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Merge Button */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {group.leads.length - 1} lead verranno eliminati e uniti nel principale
            </p>
            <Tooltip 
              content="Unisce tutti i duplicati nel lead principale selezionato. I dati mancanti verranno copiati dai duplicati. L'azione è irreversibile."
              position="left"
            >
              <button
                onClick={onMerge}
                disabled={merging}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {merging ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Merge className="w-4 h-4" />
                )}
                Unisci nel Principale
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
