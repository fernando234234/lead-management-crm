"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { Tooltip } from "./Tooltip";

interface CostCoverageProps {
  /** Number of leads with acquisitionCost set */
  leadsWithCost: number;
  /** Total number of leads */
  totalLeads: number;
  /** Sum of all acquisitionCost values */
  totalCost: number;
  /** Show compact version (just bar + percentage) */
  compact?: boolean;
  /** Accent color for the progress bar */
  accentColor?: "admin" | "marketing" | "commercial";
}

/**
 * Displays cost coverage for a campaign or group of leads.
 * Shows:
 * - CPL Effettivo (calculated only from leads WITH cost)
 * - Coverage percentage with progress bar
 * - Warning if coverage < 100%
 */
export function CostCoverage({
  leadsWithCost,
  totalLeads,
  totalCost,
  compact = false,
  accentColor = "marketing",
}: CostCoverageProps) {
  const coverage = totalLeads > 0 ? (leadsWithCost / totalLeads) * 100 : 0;
  const cplEffettivo = leadsWithCost > 0 ? totalCost / leadsWithCost : 0;
  const isComplete = coverage === 100;

  const colorClasses = {
    admin: {
      bar: "bg-admin",
      text: "text-admin",
    },
    marketing: {
      bar: "bg-marketing",
      text: "text-marketing",
    },
    commercial: {
      bar: "bg-commercial",
      text: "text-commercial",
    },
  };

  const colors = colorClasses[accentColor];

  if (compact) {
    return (
      <Tooltip
        content={
          isComplete
            ? `CPL Effettivo: €${cplEffettivo.toFixed(2)} (100% copertura)`
            : `${leadsWithCost} di ${totalLeads} lead con costo impostato`
        }
        position="top"
      >
        <div className="flex items-center gap-2 cursor-help">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bar} transition-all duration-300`}
              style={{ width: `${coverage}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${isComplete ? "text-green-600" : "text-gray-500"}`}>
            {coverage.toFixed(0)}%
          </span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="space-y-2">
      {/* CPL Value */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">CPL Effettivo</span>
        <span className={`font-semibold ${colors.text}`}>
          €{cplEffettivo.toFixed(2)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bar} transition-all duration-300`}
              style={{ width: `${coverage}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            {isComplete ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
            <span
              className={`text-xs font-medium ${
                isComplete ? "text-green-600" : "text-amber-600"
              }`}
            >
              {coverage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Coverage Details */}
        <p className="text-xs text-gray-500">
          {leadsWithCost} di {totalLeads} lead con costo impostato
        </p>
      </div>

      {/* Warning if incomplete */}
      {!isComplete && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Imposta il costo di acquisizione per tutti i lead per un calcolo accurato del CPL.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Inline version for table cells or compact displays
 */
export function CostCoverageInline({
  leadsWithCost,
  totalLeads,
  totalCost,
  showCpl = true,
}: {
  leadsWithCost: number;
  totalLeads: number;
  totalCost: number;
  showCpl?: boolean;
}) {
  const coverage = totalLeads > 0 ? (leadsWithCost / totalLeads) * 100 : 0;
  const cplEffettivo = leadsWithCost > 0 ? totalCost / leadsWithCost : 0;
  const isComplete = coverage === 100;

  return (
    <div className="flex items-center gap-2">
      {showCpl && (
        <span className="font-medium">€{cplEffettivo.toFixed(2)}</span>
      )}
      <Tooltip
        content={`${leadsWithCost}/${totalLeads} lead con costo (${coverage.toFixed(0)}%)`}
        position="top"
      >
        <div
          className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-help ${
            isComplete
              ? "bg-green-100 text-green-700"
              : coverage >= 50
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {coverage.toFixed(0)}%
        </div>
      </Tooltip>
    </div>
  );
}

/**
 * Helper function to calculate cost metrics from an array of leads
 */
export function calculateCostMetrics(leads: { acquisitionCost?: number | null }[]) {
  const leadsWithCost = leads.filter(
    (l) => l.acquisitionCost !== null && l.acquisitionCost !== undefined && l.acquisitionCost > 0
  ).length;
  
  const totalCost = leads.reduce(
    (sum, l) => sum + (l.acquisitionCost || 0),
    0
  );

  const totalLeads = leads.length;
  const coverage = totalLeads > 0 ? (leadsWithCost / totalLeads) * 100 : 0;
  const cplEffettivo = leadsWithCost > 0 ? totalCost / leadsWithCost : 0;

  return {
    leadsWithCost,
    totalLeads,
    totalCost,
    coverage,
    cplEffettivo,
    isComplete: coverage === 100,
  };
}
