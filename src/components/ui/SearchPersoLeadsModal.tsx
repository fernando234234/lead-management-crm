"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Search,
  RefreshCw,
  User,
  Calendar,
  AlertTriangle,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Inbox,
  BookOpen,
  Loader2,
  Users,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface PersoLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  course: { id: string; name: string } | null;
  campaign: { id: string; name: string; platform?: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  lostReason: string | null;
  lostAt: string | null;
  createdAt: string;
}

interface Course {
  id: string;
  name: string;
}

interface Commercial {
  id: string;
  name: string;
  count: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

interface SearchPersoLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess: () => void;
  courses: Course[];
  currentUserId: string;
}

export default function SearchPersoLeadsModal({
  isOpen,
  onClose,
  onClaimSuccess,
  courses,
  currentUserId,
}: SearchPersoLeadsModalProps) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [commercialFilter, setCommercialFilter] = useState("");
  const [leads, setLeads] = useState<PersoLead[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [claimingLeadId, setClaimingLeadId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch PERSO leads
  const fetchPersoLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (courseFilter) params.set("courseId", courseFilter);
      if (commercialFilter) params.set("assignedToId", commercialFilter);
      params.set("page", currentPage.toString());
      params.set("pageSize", "8");

      const response = await fetch(`/api/leads/perso?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      setLeads(data.leads);
      setPagination(data.pagination);
      
      // Only update commercials list on first page (it comes with page 1 response)
      if (data.commercials && currentPage === 1) {
        setCommercials(data.commercials);
      }
    } catch (error) {
      console.error("Failed to fetch PERSO leads:", error);
      toast.error("Errore nel caricamento dei lead PERSO");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, courseFilter, commercialFilter, currentPage]);

  // Fetch when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      fetchPersoLeads();
    }
  }, [isOpen, fetchPersoLeads]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setCourseFilter("");
      setCommercialFilter("");
      setCurrentPage(1);
      setLeads([]);
      setCommercials([]);
      setPagination(null);
      setShowHelp(false);
    }
  }, [isOpen]);

  // Handle claim lead
  const handleClaimLead = async (lead: PersoLead) => {
    // Check if trying to claim own lead
    if (lead.assignedTo?.id === currentUserId) {
      toast.error("Questo lead è già assegnato a te. Usa il pulsante 'Recupera' nella lista dei tuoi lead.");
      return;
    }

    setClaimingLeadId(lead.id);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recoverLead: true,
          claimLead: true, // New flag to indicate claiming from pool
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          // Concurrency conflict - lead was already claimed
          toast.error(error.error || "Questo lead è già stato recuperato da qualcun altro");
          fetchPersoLeads(); // Refresh the list
          return;
        }
        throw new Error(error.error || "Failed to claim lead");
      }

      toast.success(`Lead "${lead.name}" recuperato con successo! Ora è assegnato a te.`, {
        duration: 4000,
        icon: "🎉",
      });
      
      onClaimSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to claim lead:", error);
      toast.error("Errore nel recupero del lead");
    } finally {
      setClaimingLeadId(null);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <RefreshCw className="text-green-600" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Recupera Lead Perso
              </h2>
              <p className="text-sm text-gray-500">
                Cerca e recupera lead PERSO da altri commerciali
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-2 rounded-lg transition ${showHelp ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Come funziona?"
            >
              <HelpCircle size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Help Section (collapsible) */}
        {showHelp && (
          <div className="p-4 bg-blue-50 border-b border-blue-100 space-y-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <HelpCircle size={18} />
              Come funziona il recupero lead?
            </h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <p className="font-medium text-blue-800 mb-1">Cosa sono i lead PERSO?</p>
                <p className="text-gray-600">
                  Sono lead che altri commerciali non sono riusciti a convertire 
                  (non interessato, troppi tentativi, inattività).
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <p className="font-medium text-blue-800 mb-1">Perché recuperarli?</p>
                <p className="text-gray-600">
                  A volte un lead &quot;freddo&quot; può essere riattivato con un approccio diverso 
                  o semplicemente in un momento migliore.
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <p className="font-medium text-blue-800 mb-1">Cosa succede quando recuperi?</p>
                <ul className="text-gray-600 space-y-1">
                  <li className="flex items-start gap-1">
                    <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    Il lead diventa tuo (riassegnato a te)
                  </li>
                  <li className="flex items-start gap-1">
                    <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    Lo stato torna a CONTATTATO
                  </li>
                  <li className="flex items-start gap-1">
                    <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    Hai 8 nuovi tentativi di chiamata
                  </li>
                </ul>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <p className="font-medium text-blue-800 mb-1">Il commerciale precedente?</p>
                <p className="text-gray-600">
                  Riceverà una notifica automatica che il lead è stato recuperato da te. 
                  Non può più lavorarlo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="p-4 border-b bg-gray-50 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search input */}
            <div className="flex-1 min-w-[200px] relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Cerca per nome, email o telefono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                autoFocus
              />
            </div>
            
            {/* Course filter */}
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 min-w-[160px]"
            >
              <option value="">Tutti i corsi</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>

            {/* Commercial filter */}
            <select
              value={commercialFilter}
              onChange={(e) => {
                setCommercialFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 min-w-[180px]"
            >
              <option value="">Tutti i commerciali</option>
              {commercials.map((commercial) => (
                <option key={commercial.id} value={commercial.id}>
                  {commercial.name} ({commercial.count})
                </option>
              ))}
            </select>
          </div>
          
          {/* Results count and active filters */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? (
                "Caricamento..."
              ) : pagination?.totalCount === 0 ? (
                "Nessun lead PERSO trovato"
              ) : (
                <>
                  <span className="font-medium text-gray-700">{pagination?.totalCount}</span>
                  {" "}lead PERSO {pagination?.totalCount === 1 ? "disponibile" : "disponibili"}
                </>
              )}
            </p>
            
            {/* Clear filters button */}
            {(search || courseFilter || commercialFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCourseFilter("");
                  setCommercialFilter("");
                  setCurrentPage(1);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X size={14} />
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-green-600" size={32} />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Inbox size={48} className="mb-3" />
              <p className="font-medium text-gray-600">Nessun lead PERSO disponibile</p>
              <p className="text-sm mt-1 text-center max-w-md">
                {debouncedSearch || courseFilter || commercialFilter
                  ? "Prova a modificare i filtri di ricerca"
                  : "Non ci sono lead PERSO nel sistema al momento. Torneranno disponibili quando altri commerciali avranno lead che diventano PERSO."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="border rounded-lg p-4 hover:border-green-300 hover:bg-green-50/30 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User size={20} className="text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {lead.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail size={12} />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {lead.course && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <BookOpen size={14} className="text-blue-500" />
                            {lead.course.name}
                          </span>
                        )}
                        {lead.assignedTo && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Users size={14} className="text-orange-500" />
                            <span className="text-gray-400">Ex:</span> {lead.assignedTo.name}
                          </span>
                        )}
                        {lead.lostAt && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Calendar size={14} />
                            PERSO il {formatDate(lead.lostAt)}
                          </span>
                        )}
                      </div>

                      {/* Lost Reason */}
                      {lead.lostReason && (
                        <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                          <span className="truncate">{lead.lostReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Claim Button */}
                    <button
                      onClick={() => handleClaimLead(lead)}
                      disabled={claimingLeadId === lead.id || lead.assignedTo?.id === currentUserId}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition flex-shrink-0 ${
                        lead.assignedTo?.id === currentUserId
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : claimingLeadId === lead.id
                          ? "bg-green-100 text-green-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {claimingLeadId === lead.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Recupero...
                        </>
                      ) : lead.assignedTo?.id === currentUserId ? (
                        <>
                          <User size={16} />
                          Tuo Lead
                        </>
                      ) : (
                        <>
                          <RefreshCw size={16} />
                          Recupera
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Pagina {pagination.page} di {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages || loading}
                className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Info Footer */}
        {!showHelp && (
          <div className="p-3 border-t bg-blue-50 text-xs text-blue-700 flex items-center justify-between">
            <span>
              <strong>Suggerimento:</strong> Quando recuperi un lead, diventi l&apos;assegnatario e hai 8 nuovi tentativi.
            </span>
            <button 
              onClick={() => setShowHelp(true)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Scopri di più
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
