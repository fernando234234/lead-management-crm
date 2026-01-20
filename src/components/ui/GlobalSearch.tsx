"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, X, Users, BookOpen, Megaphone, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadResult {
  id: string;
  name: string;
  email: string | null;
  courseName: string;
  status: string;
}

interface CampaignResult {
  id: string;
  name: string;
  platform: string;
  courseName: string;
}

interface CourseResult {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SearchResults {
  leads: LeadResult[];
  campaigns: CampaignResult[];
  courses: CourseResult[];
  users?: UserResult[];
}

interface GlobalSearchProps {
  role: "admin" | "commercial" | "marketing";
}

export function GlobalSearch({ role }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const isAdmin = role === "admin";

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Get all results as flat array for keyboard navigation
  const getAllResults = () => {
    if (!results) return [];
    const all: { type: string; item: LeadResult | CampaignResult | CourseResult | UserResult }[] = [];
    results.leads.forEach(item => all.push({ type: "lead", item }));
    results.campaigns.forEach(item => all.push({ type: "campaign", item }));
    results.courses.forEach(item => all.push({ type: "course", item }));
    results.users?.forEach(item => all.push({ type: "user", item }));
    return all;
  };

  // Navigate to result
  const navigateToResult = (type: string, id: string) => {
    setIsOpen(false);
    switch (type) {
      case "lead":
        router.push(`/${role}/leads/${id}`);
        break;
      case "campaign":
        router.push(`/${role === "commercial" ? "marketing" : role}/campaigns/${id}`);
        break;
      case "course":
        router.push(`/${role}/courses/${id}`);
        break;
      case "user":
        if (isAdmin) router.push(`/admin/users/${id}`);
        break;
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const allResults = getAllResults();
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && allResults.length > 0) {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        navigateToResult(selected.type, (selected.item as { id: string }).id);
      }
    }
  };

  const hasResults = results && (
    results.leads.length > 0 ||
    results.campaigns.length > 0 ||
    results.courses.length > 0 ||
    (results.users && results.users.length > 0)
  );

  const statusColors: Record<string, string> = {
    NUOVO: "bg-blue-100 text-blue-700",
    CONTATTATO: "bg-yellow-100 text-yellow-700",
    IN_TRATTATIVA: "bg-purple-100 text-purple-700",
    ISCRITTO: "bg-green-100 text-green-700",
    PERSO: "bg-red-100 text-red-700",
  };

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    COMMERCIAL: "bg-blue-100 text-blue-700",
    MARKETING: "bg-green-100 text-green-700",
  };

  let currentIndex = 0;

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors min-w-[200px] focus:outline-none focus:ring-2 focus:ring-gray-400"
        aria-label="Apri ricerca globale"
        aria-haspopup="dialog"
      >
        <Search size={16} aria-hidden="true" />
        <span className="flex-1 text-left">Cerca...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded" aria-hidden="true">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Ricerca globale"
        >
          <div
            ref={modalRef}
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center px-4 border-b border-gray-200">
              <Search size={20} className="text-gray-400" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cerca lead, campagne, corsi..."
                className="flex-1 px-3 py-4 text-lg outline-none"
                aria-label="Cerca lead, campagne, corsi"
                aria-autocomplete="list"
                aria-controls="search-results"
              />
              {isLoading ? (
                <Loader2 size={20} className="text-gray-400 animate-spin" aria-label="Ricerca in corso" />
              ) : query && (
                <button 
                  onClick={() => setQuery("")} 
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                  aria-label="Cancella ricerca"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Results */}
            <div id="search-results" className="max-h-[60vh] overflow-y-auto" role="listbox" aria-label="Risultati ricerca">
              {query.length < 2 ? (
                <div className="px-4 py-8 text-center text-gray-600">
                  <p>Digita almeno 2 caratteri per cercare</p>
                </div>
              ) : isLoading ? (
                <div className="px-4 py-8 text-center text-gray-600" aria-live="polite">
                  <Loader2 size={24} className="mx-auto animate-spin mb-2" aria-hidden="true" />
                  <p>Ricerca in corso...</p>
                </div>
              ) : !hasResults ? (
                <div className="px-4 py-8 text-center text-gray-600" aria-live="polite">
                  <p>Nessun risultato per &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Leads */}
                  {results.leads.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                        Lead
                      </div>
                      {results.leads.map((lead) => {
                        const index = currentIndex++;
                        return (
                          <button
                            key={lead.id}
                            onClick={() => navigateToResult("lead", lead.id)}
                            className={cn(
                              "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left",
                              selectedIndex === index && "bg-blue-50"
                            )}
                          >
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users size={16} className="text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{lead.name}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {lead.email || "No email"} • {lead.courseName}
                              </p>
                            </div>
                            <span className={cn("px-2 py-1 text-xs font-medium rounded", statusColors[lead.status])}>
                              {lead.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Campaigns */}
                  {results.campaigns.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                        Campagne
                      </div>
                      {results.campaigns.map((campaign) => {
                        const index = currentIndex++;
                        return (
                          <button
                            key={campaign.id}
                            onClick={() => navigateToResult("campaign", campaign.id)}
                            className={cn(
                              "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left",
                              selectedIndex === index && "bg-blue-50"
                            )}
                          >
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <Megaphone size={16} className="text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{campaign.name}</p>
                              <p className="text-sm text-gray-500 truncate">
                                {campaign.platform} • {campaign.courseName}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Courses */}
                  {results.courses.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                        Corsi
                      </div>
                      {results.courses.map((course) => {
                        const index = currentIndex++;
                        return (
                          <button
                            key={course.id}
                            onClick={() => navigateToResult("course", course.id)}
                            className={cn(
                              "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left",
                              selectedIndex === index && "bg-blue-50"
                            )}
                          >
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <BookOpen size={16} className="text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{course.name}</p>
                              <p className="text-sm text-gray-500 truncate">
                                €{course.price.toLocaleString()} • {course.active ? "Attivo" : "Non attivo"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Users (admin only) */}
                  {isAdmin && results.users && results.users.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                        Utenti
                      </div>
                      {results.users.map((user) => {
                        const index = currentIndex++;
                        return (
                          <button
                            key={user.id}
                            onClick={() => navigateToResult("user", user.id)}
                            className={cn(
                              "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left",
                              selectedIndex === index && "bg-blue-50"
                            )}
                          >
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                              <User size={16} className="text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{user.name}</p>
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            </div>
                            <span className={cn("px-2 py-1 text-xs font-medium rounded", roleColors[user.role])}>
                              {user.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-4">
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded">↑↓</kbd> per navigare</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded">↵</kbd> per selezionare</span>
              <span><kbd className="px-1.5 py-0.5 bg-white border rounded">esc</kbd> per chiudere</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
