"use client";

import { useState, useMemo } from "react";
import { X, Euro, Calendar, Zap, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  createdAt: string;
  acquisitionCost: number;
}

interface SpendRecord {
  id: string;
  date: string;
  amount: number;
}

interface PeriodData {
  key: string;
  label: string;
  startDate: Date;
  endDate: Date;
  leads: Lead[];
  spend: number;
  cpl: number;
}

interface QuickDistributeCostModalProps {
  campaignName: string;
  campaignId: string;
  leads: Lead[];
  spendRecords: SpendRecord[];
  totalSpent: number;
  onDistribute: (distributions: { leadId: string; cost: number }[]) => Promise<void>;
  onClose: () => void;
}

type PeriodType = "week" | "month";

/**
 * Quick action modal to distribute campaign costs to leads based on time periods.
 * Shows a preview of how costs will be distributed, then applies with one click.
 */
export function QuickDistributeCostModal({
  campaignName,
  campaignId,
  leads,
  spendRecords,
  totalSpent,
  onDistribute,
  onClose,
}: QuickDistributeCostModalProps) {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributed, setDistributed] = useState(false);

  // Calculate periods with leads and spend
  const periods = useMemo((): PeriodData[] => {
    if (leads.length === 0) return [];

    // Get date range from leads
    const dates = leads.map(l => new Date(l.createdAt));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const result: PeriodData[] = [];

    if (periodType === "week") {
      // Group by week
      let currentStart = new Date(minDate);
      currentStart.setHours(0, 0, 0, 0);
      // Move to start of week (Monday)
      const day = currentStart.getDay();
      const diff = currentStart.getDate() - day + (day === 0 ? -6 : 1);
      currentStart.setDate(diff);

      while (currentStart <= maxDate) {
        const weekEnd = new Date(currentStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekLeads = leads.filter(l => {
          const d = new Date(l.createdAt);
          return d >= currentStart && d <= weekEnd;
        });

        const weekSpend = spendRecords
          .filter(s => {
            const d = new Date(s.date);
            return d >= currentStart && d <= weekEnd;
          })
          .reduce((sum, s) => sum + Number(s.amount), 0);

        if (weekLeads.length > 0) {
          result.push({
            key: currentStart.toISOString(),
            label: `${currentStart.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} - ${weekEnd.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}`,
            startDate: new Date(currentStart),
            endDate: new Date(weekEnd),
            leads: weekLeads,
            spend: weekSpend,
            cpl: weekLeads.length > 0 ? weekSpend / weekLeads.length : 0,
          });
        }

        currentStart.setDate(currentStart.getDate() + 7);
      }
    } else {
      // Group by month
      let currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

      while (currentMonth <= maxDate) {
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);

        const monthLeads = leads.filter(l => {
          const d = new Date(l.createdAt);
          return d >= currentMonth && d <= monthEnd;
        });

        const monthSpend = spendRecords
          .filter(s => {
            const d = new Date(s.date);
            return d >= currentMonth && d <= monthEnd;
          })
          .reduce((sum, s) => sum + Number(s.amount), 0);

        if (monthLeads.length > 0) {
          result.push({
            key: currentMonth.toISOString(),
            label: currentMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
            startDate: new Date(currentMonth),
            endDate: new Date(monthEnd),
            leads: monthLeads,
            spend: monthSpend,
            cpl: monthLeads.length > 0 ? monthSpend / monthLeads.length : 0,
          });
        }

        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
    }

    return result;
  }, [leads, spendRecords, periodType]);

  // Stats
  const leadsWithoutCost = leads.filter(l => !l.acquisitionCost || l.acquisitionCost === 0).length;
  const totalLeadsInPeriods = periods.reduce((sum, p) => sum + p.leads.length, 0);
  const totalSpendInPeriods = periods.reduce((sum, p) => sum + p.spend, 0);

  // If we have unassigned spend, distribute it proportionally
  const unassignedSpend = totalSpent - totalSpendInPeriods;
  const periodsWithAdjustedCpl = useMemo(() => {
    if (unassignedSpend <= 0 || totalLeadsInPeriods === 0) return periods;

    // Distribute unassigned spend proportionally by lead count
    return periods.map(p => {
      const additionalSpend = (p.leads.length / totalLeadsInPeriods) * unassignedSpend;
      const adjustedSpend = p.spend + additionalSpend;
      return {
        ...p,
        spend: adjustedSpend,
        cpl: p.leads.length > 0 ? adjustedSpend / p.leads.length : 0,
      };
    });
  }, [periods, unassignedSpend, totalLeadsInPeriods]);

  const handleDistribute = async () => {
    setIsDistributing(true);
    try {
      const distributions: { leadId: string; cost: number }[] = [];
      
      periodsWithAdjustedCpl.forEach(period => {
        period.leads.forEach(lead => {
          distributions.push({
            leadId: lead.id,
            cost: period.cpl,
          });
        });
      });

      await onDistribute(distributions);
      setDistributed(true);
    } catch (error) {
      console.error("Failed to distribute costs:", error);
    } finally {
      setIsDistributing(false);
    }
  };

  if (distributed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Costi Distribuiti!
          </h3>
          <p className="text-gray-600 mb-6">
            I costi sono stati assegnati a {leads.length} lead in base ai periodi.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap size={20} className="text-marketing" />
              Distribuzione Rapida Costi
            </h3>
            <p className="text-sm text-gray-500">{campaignName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              €{totalSpent.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">Spesa Totale</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            <p className="text-xs text-gray-500">Lead Totali</p>
          </div>
          <div className="bg-marketing/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-marketing">
              €{leads.length > 0 ? (totalSpent / leads.length).toFixed(2) : "0.00"}
            </p>
            <p className="text-xs text-gray-500">CPL Medio</p>
          </div>
        </div>

        {/* Period Type Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Raggruppa per:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriodType("week")}
              className={`px-3 py-1 text-sm rounded-md transition ${
                periodType === "week"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Settimana
            </button>
            <button
              onClick={() => setPeriodType("month")}
              className={`px-3 py-1 text-sm rounded-md transition ${
                periodType === "month"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Mese
            </button>
          </div>
        </div>

        {/* Warning if leads without cost */}
        {leadsWithoutCost > 0 && leadsWithoutCost < leads.length && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>{leadsWithoutCost}</strong> lead su {leads.length} non hanno ancora un costo assegnato. 
              Questa azione sovrascriverà tutti i costi esistenti.
            </p>
          </div>
        )}

        {/* Periods Preview */}
        <div className="border rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h4 className="font-medium text-gray-900">Anteprima Distribuzione</h4>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {periodsWithAdjustedCpl.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Nessun lead trovato per questo periodo
              </div>
            ) : (
              periodsWithAdjustedCpl.map((period) => (
                <div key={period.key} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-marketing/10 rounded-lg flex items-center justify-center">
                      <Calendar size={18} className="text-marketing" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{period.label}</p>
                      <p className="text-sm text-gray-500">
                        {period.leads.length} lead • €{period.spend.toFixed(2)} spesa
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-marketing">
                      €{period.cpl.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">per lead</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unassigned Spend Notice */}
        {unassignedSpend > 0 && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <Euro size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              €{unassignedSpend.toFixed(2)} di spesa non è associata a date specifiche e verrà distribuita proporzionalmente.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            disabled={isDistributing}
          >
            Annulla
          </button>
          <button
            onClick={handleDistribute}
            disabled={isDistributing || periodsWithAdjustedCpl.length === 0}
            className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDistributing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Applicazione...
              </>
            ) : (
              <>
                <Zap size={18} />
                Applica a {leads.length} Lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
