"use client";

import { cn } from "@/lib/utils";

/**
 * Visual progress indicators for lead conversion and status
 */

// Status colors - consistent across the app
export const STATUS_COLORS = {
  NUOVO: { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700", border: "border-blue-500" },
  CONTATTATO: { bg: "bg-yellow-500", light: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-500" },
  IN_TRATTATIVA: { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700", border: "border-purple-500" },
  ISCRITTO: { bg: "bg-green-500", light: "bg-green-100", text: "text-green-700", border: "border-green-500" },
  PERSO: { bg: "bg-red-500", light: "bg-red-100", text: "text-red-700", border: "border-red-500" },
};

export const STATUS_LABELS: Record<string, string> = {
  NUOVO: "Nuovo",
  CONTATTATO: "Contattato",
  IN_TRATTATIVA: "In Trattativa",
  ISCRITTO: "Iscritto",
  PERSO: "Perso",
};

// Lead status as a progress bar
interface LeadStatusProgressProps {
  status: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const STATUS_ORDER = ["NUOVO", "CONTATTATO", "IN_TRATTATIVA", "ISCRITTO"];

export function LeadStatusProgress({ status, showLabel = true, size = "md" }: LeadStatusProgressProps) {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const isLost = status === "PERSO";
  
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  if (isLost) {
    return (
      <div className="flex flex-col gap-1">
        {showLabel && (
          <span className="text-xs text-red-600 font-medium">Lead Perso</span>
        )}
        <div className={cn("w-full rounded-full bg-red-100", sizeClasses[size])}>
          <div className="h-full rounded-full bg-red-500 w-full" />
        </div>
      </div>
    );
  }

  const progress = currentIndex >= 0 ? ((currentIndex + 1) / STATUS_ORDER.length) * 100 : 0;
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.NUOVO;

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className={cn("text-xs font-medium", colors.text)}>
            {STATUS_LABELS[status] || status}
          </span>
          <span className="text-xs text-gray-400">
            {currentIndex + 1}/{STATUS_ORDER.length}
          </span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-gray-100", sizeClasses[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", colors.bg)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Mini conversion funnel
interface MiniFunnelProps {
  total: number;
  contacted: number;
  negotiating: number;
  enrolled: number;
  lost?: number;
  className?: string;
}

export function MiniFunnel({ total, contacted, negotiating, enrolled, lost = 0, className }: MiniFunnelProps) {
  const stages = [
    { label: "Totale", value: total, color: "bg-blue-500" },
    { label: "Contattati", value: contacted, color: "bg-yellow-500" },
    { label: "Trattativa", value: negotiating, color: "bg-purple-500" },
    { label: "Iscritti", value: enrolled, color: "bg-green-500" },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className={cn("space-y-2", className)}>
      {stages.map((stage, index) => {
        const width = (stage.value / maxValue) * 100;
        const conversionRate = index > 0 && stages[index - 1].value > 0
          ? ((stage.value / stages[index - 1].value) * 100).toFixed(0)
          : null;
        
        return (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-20 text-right">{stage.label}</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", stage.color)}
                style={{ width: `${width}%` }}
              />
            </div>
            <div className="flex items-center gap-2 w-20">
              <span className="text-sm font-medium">{stage.value}</span>
              {conversionRate && (
                <span className="text-xs text-gray-400">({conversionRate}%)</span>
              )}
            </div>
          </div>
        );
      })}
      {lost > 0 && (
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
          <span className="text-xs text-red-500 w-20 text-right">Persi</span>
          <div className="flex-1 h-4 bg-red-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-red-400"
              style={{ width: `${(lost / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-red-600 w-20">{lost}</span>
        </div>
      )}
    </div>
  );
}

// ROI indicator with color coding
interface ROIIndicatorProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showTrend?: boolean;
}

export function ROIIndicator({ value, size = "md", showTrend = false }: ROIIndicatorProps) {
  const getColor = (roi: number) => {
    if (roi >= 100) return { bg: "bg-green-100", text: "text-green-700", label: "Eccellente" };
    if (roi >= 50) return { bg: "bg-green-50", text: "text-green-600", label: "Buono" };
    if (roi >= 0) return { bg: "bg-yellow-50", text: "text-yellow-700", label: "Neutro" };
    if (roi >= -50) return { bg: "bg-orange-50", text: "text-orange-600", label: "Attenzione" };
    return { bg: "bg-red-50", text: "text-red-600", label: "Critico" };
  };

  const colors = getColor(value);
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg font-medium", colors.bg, colors.text, sizeClasses[size])}>
      <span>{value.toFixed(1)}%</span>
      {showTrend && <span className="opacity-70">({colors.label})</span>}
    </div>
  );
}

// CPL indicator with comparison
interface CPLIndicatorProps {
  estimated: number;
  actual: number;
  currency?: string;
}

export function CPLIndicator({ estimated, actual, currency = "€" }: CPLIndicatorProps) {
  const difference = actual - estimated;
  const percentDiff = estimated > 0 ? ((difference / estimated) * 100) : 0;
  
  const getComparisonColor = () => {
    if (actual === 0) return "text-gray-400";
    if (percentDiff <= -10) return "text-green-600"; // Actual is lower = good
    if (percentDiff <= 10) return "text-yellow-600"; // About the same
    return "text-red-600"; // Actual is higher = bad
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-xs text-gray-500">Stimato</p>
        <p className="font-medium">{currency}{estimated.toFixed(2)}</p>
      </div>
      <div className="text-gray-300">→</div>
      <div className="text-center">
        <p className="text-xs text-gray-500">Effettivo</p>
        <p className={cn("font-medium", actual > 0 ? getComparisonColor() : "text-gray-400")}>
          {actual > 0 ? `${currency}${actual.toFixed(2)}` : "-"}
        </p>
      </div>
      {actual > 0 && (
        <div className={cn("text-xs", getComparisonColor())}>
          {percentDiff > 0 ? "+" : ""}{percentDiff.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

// Status badge with consistent styling
interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function StatusBadge({ status, size = "sm", showIcon = false }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || {
    light: "bg-gray-100",
    text: "text-gray-700",
  };
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium", colors.light, colors.text, sizeClasses[size])}>
      {showIcon && <span className={cn("w-2 h-2 rounded-full", colors.bg)} />}
      {STATUS_LABELS[status] || status}
    </span>
  );
}
