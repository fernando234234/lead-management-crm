"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, X, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  presets?: boolean;
  className?: string;
  /**
   * Show tooltip explaining how date filters work with different metrics.
   * Useful on pages where Leads, Revenue, and Spend are shown together.
   */
  showFilterExplanation?: boolean;
}

type PresetKey = "today" | "week" | "month" | "quarter" | "year" | "all";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => { start: string | null; end: string | null };
}

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const getPresets = (): Preset[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    {
      key: "today",
      label: "Oggi",
      getRange: () => ({
        start: formatDateForInput(today),
        end: formatDateForInput(today),
      }),
    },
    {
      key: "week",
      label: "Ultima Settimana",
      getRange: () => {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          start: formatDateForInput(weekAgo),
          end: formatDateForInput(today),
        };
      },
    },
    {
      key: "month",
      label: "Ultimo Mese",
      getRange: () => {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          start: formatDateForInput(monthAgo),
          end: formatDateForInput(today),
        };
      },
    },
    {
      key: "quarter",
      label: "Ultimo Trimestre",
      getRange: () => {
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return {
          start: formatDateForInput(quarterAgo),
          end: formatDateForInput(today),
        };
      },
    },
    {
      key: "year",
      label: "Quest'Anno",
      getRange: () => {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        return {
          start: formatDateForInput(startOfYear),
          end: formatDateForInput(today),
        };
      },
    },
    {
      key: "all",
      label: "Tutto",
      getRange: () => ({
        start: null,
        end: null,
      }),
    },
  ];
};

const getActivePreset = (startDate: string | null, endDate: string | null): PresetKey | null => {
  const presets = getPresets();
  for (const preset of presets) {
    const range = preset.getRange();
    if (range.start === startDate && range.end === endDate) {
      return preset.key;
    }
  }
  return null;
};

export function DateRangeFilter({
  startDate,
  endDate,
  onChange,
  presets = true,
  className,
  showFilterExplanation = false,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const presetsList = getPresets();
  const activePreset = getActivePreset(startDate, endDate);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getRange();
    onChange(range.start, range.end);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null, null);
  };

  const formatDisplayDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDisplayText = (): string => {
    if (!startDate && !endDate) {
      return "Tutto il periodo";
    }
    
    // Check if it matches a preset
    const preset = presetsList.find(p => p.key === activePreset);
    if (preset && preset.key !== "all") {
      return preset.label;
    }

    // Custom range
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatDisplayDate(startDate);
      }
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
    if (startDate) {
      return `Da ${formatDisplayDate(startDate)}`;
    }
    if (endDate) {
      return `Fino a ${formatDisplayDate(endDate)}`;
    }
    return "Seleziona periodo";
  };

  const hasFilter = startDate !== null || endDate !== null;

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-admin",
          "bg-white hover:bg-gray-50",
          hasFilter
            ? "border-admin/30 text-admin"
            : "border-gray-200 text-gray-700"
        )}
        aria-label={`Filtro data: ${getDisplayText()}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Calendar size={16} aria-hidden="true" />
        <span className="max-w-[200px] truncate">{getDisplayText()}</span>
        <ChevronDown
          size={16}
          className={cn("transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
        {hasFilter && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 p-0.5 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-admin"
            aria-label="Cancella filtro data"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[320px]"
          role="dialog"
          aria-label="Seleziona periodo"
        >
          {/* Presets */}
          {presets && (
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2" id="preset-label">Periodo rapido</p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="preset-label">
                {presetsList.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-admin",
                      activePreset === preset.key
                        ? "bg-admin text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                    aria-pressed={activePreset === preset.key}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Date Inputs */}
          <fieldset className="p-3">
            <legend className="text-xs font-medium text-gray-600 mb-2">Periodo personalizzato</legend>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="date-start" className="block text-xs text-gray-500 mb-1">Da</label>
                <input
                  id="date-start"
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => onChange(e.target.value || null, endDate)}
                  max={endDate || undefined}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-admin/20 focus:border-admin"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="date-end" className="block text-xs text-gray-500 mb-1">A</label>
                <input
                  id="date-end"
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => onChange(startDate, e.target.value || null)}
                  min={startDate || undefined}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-admin/20 focus:border-admin"
                />
              </div>
            </div>
          </fieldset>

          {/* Footer */}
          <div className="p-3 border-t border-gray-100 flex justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:underline"
            >
              Cancella
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 text-sm bg-admin text-white rounded-md hover:bg-admin/90 focus:outline-none focus:ring-2 focus:ring-admin focus:ring-offset-2"
            >
              Applica
            </button>
          </div>

          {/* Filter Explanation Tooltip */}
          {showFilterExplanation && (
            <div className="p-3 border-t border-gray-100 bg-blue-50">
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <Info size={14} />
                <span>Come funziona il filtro data?</span>
                <ChevronDown
                  size={12}
                  className={cn("transition-transform", showExplanation && "rotate-180")}
                />
              </button>
              {showExplanation && (
                <div className="mt-2 text-xs text-gray-600 space-y-2">
                  <p>
                    <strong>Lead:</strong> Filtrati per data di creazione (quando il lead è stato acquisito).
                  </p>
                  <p>
                    <strong>Revenue:</strong> Filtrati per data di iscrizione (quando il cliente si è iscritto al corso).
                  </p>
                  <p>
                    <strong>Costi:</strong> Calcolati con pro-rata in base alla sovrapposizione tra il periodo di spesa e il filtro selezionato.
                  </p>
                  <p className="text-amber-600 italic">
                    Nota: Il CPL potrebbe non essere accurato per periodi parziali poiché i lead e i costi usano date di riferimento diverse.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
