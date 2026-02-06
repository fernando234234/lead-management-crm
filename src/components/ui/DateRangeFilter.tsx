"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, X, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateForInput, parseInputDate } from "@/lib/date";

interface DateRangeFilterProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  presets?: boolean;
  className?: string;
  accent?: "admin" | "commercial" | "marketing";
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

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
}

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
  accent = "admin",
  showFilterExplanation = false,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
    width: 320,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startInputId = useId();
  const endInputId = useId();
  const presetLabelId = useId();
  const presetsList = getPresets();
  const activePreset = getActivePreset(startDate, endDate);

  const accentStyles = {
    admin: {
      ring: "focus:ring-admin",
      ringSoft: "focus:ring-admin/20",
      borderTextActive: "border-admin/30 text-admin",
      bgActive: "bg-admin text-white",
      button: "bg-admin text-white hover:bg-admin/90",
      text: "text-admin",
      border: "focus:border-admin",
      subtleBg: "bg-admin/10",
    },
    commercial: {
      ring: "focus:ring-commercial",
      ringSoft: "focus:ring-commercial/20",
      borderTextActive: "border-commercial/30 text-commercial",
      bgActive: "bg-commercial text-white",
      button: "bg-commercial text-white hover:bg-commercial/90",
      text: "text-commercial",
      border: "focus:border-commercial",
      subtleBg: "bg-commercial/10",
    },
    marketing: {
      ring: "focus:ring-marketing",
      ringSoft: "focus:ring-marketing/20",
      borderTextActive: "border-marketing/30 text-marketing",
      bgActive: "bg-marketing text-white",
      button: "bg-marketing text-white hover:bg-marketing/90",
      text: "text-marketing",
      border: "focus:border-marketing",
      subtleBg: "bg-marketing/10",
    },
  };

  const currentAccent = accentStyles[accent];

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 8;
    const spacing = 8;
    const minWidth = 320;
    const maxWidth = window.innerWidth - viewportPadding * 2;
    const desiredWidth = Math.max(minWidth, triggerRect.width);
    const width = Math.min(desiredWidth, maxWidth);

    let left = triggerRect.left;
    if (left + width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - viewportPadding - width;
    }
    if (left < viewportPadding) {
      left = viewportPadding;
    }

    const panelHeight = panelRef.current?.offsetHeight ?? 420;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const openAbove = spaceBelow < panelHeight + spacing && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(viewportPadding, triggerRect.top - panelHeight - spacing)
      : Math.min(window.innerHeight - viewportPadding - panelHeight, triggerRect.bottom + spacing);

    setPopoverPosition({ top, left, width });
  }, [isOpen]);

  // Keep popover attached to trigger and close on outside click / escape.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const rafId = requestAnimationFrame(updatePopoverPosition);

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = containerRef.current?.contains(target);
      const clickedInsidePanel = panelRef.current?.contains(target);
      if (!clickedInsideTrigger && !clickedInsidePanel) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleViewportChange = () => {
      updatePopoverPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, updatePopoverPosition]);

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
    const date = parseInputDate(dateStr);
    if (!date) return "";
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
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative inline-flex">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none focus:ring-2",
            hasFilter && "pr-9",
            currentAccent.ring,
            "bg-white hover:bg-gray-50",
            hasFilter
              ? currentAccent.borderTextActive
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
        </button>

        {hasFilter && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className={cn(
              "absolute right-7 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded focus:outline-none focus:ring-2",
              currentAccent.ring
            )}
            aria-label="Cancella filtro data"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[70] bg-white border border-gray-200 rounded-lg shadow-lg max-h-[min(520px,calc(100vh-16px))] overflow-y-auto"
          role="dialog"
          aria-label="Seleziona periodo"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            width: `${popoverPosition.width}px`,
          }}
        >
          {/* Presets */}
          {presets && (
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2" id={presetLabelId}>Periodo rapido</p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby={presetLabelId}>
                {presetsList.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2",
                      currentAccent.ring,
                      activePreset === preset.key
                        ? currentAccent.bgActive
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
                <label htmlFor={startInputId} className="block text-xs text-gray-500 mb-1">Da</label>
                <input
                  id={startInputId}
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => onChange(e.target.value || null, endDate)}
                  max={endDate || undefined}
                  className={cn(
                    "w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2",
                    currentAccent.ringSoft,
                    currentAccent.border
                  )}
                />
              </div>
              <div className="flex-1">
                <label htmlFor={endInputId} className="block text-xs text-gray-500 mb-1">A</label>
                <input
                  id={endInputId}
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => onChange(startDate, e.target.value || null)}
                  min={startDate || undefined}
                  className={cn(
                    "w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2",
                    currentAccent.ringSoft,
                    currentAccent.border
                  )}
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
              className={cn(
                "px-4 py-1.5 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2",
                currentAccent.button,
                currentAccent.ring
              )}
            >
              Applica
            </button>
          </div>

          {/* Filter Explanation Tooltip */}
          {showFilterExplanation && (
            <div className={cn("p-3 border-t border-gray-100", currentAccent.subtleBg)}>
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className={cn("flex items-center gap-2 text-xs hover:opacity-80 focus:outline-none", currentAccent.text)}
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
        </div>,
        document.body
      )}
    </div>
  );
}
