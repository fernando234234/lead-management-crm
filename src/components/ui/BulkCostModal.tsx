"use client";

import { useState } from "react";
import { X, Euro, Calculator, DivideCircle } from "lucide-react";

interface BulkCostModalProps {
  leadIds: string[];
  campaignBudget?: number;
  onSetCost: (cost: number) => void;
  onDistributeCost: (totalBudget: number) => void;
  onClose: () => void;
}

/**
 * Modal for setting acquisition cost on multiple leads at once.
 * Two modes:
 * 1. Set same cost for all leads
 * 2. Distribute a total budget evenly across leads
 */
export function BulkCostModal({
  leadIds,
  campaignBudget,
  onSetCost,
  onDistributeCost,
  onClose,
}: BulkCostModalProps) {
  const [mode, setMode] = useState<"same" | "distribute">("same");
  const [sameValue, setSameValue] = useState("");
  const [totalBudget, setTotalBudget] = useState(campaignBudget?.toString() || "");

  const leadCount = leadIds.length;
  const distributedCost = totalBudget ? parseFloat(totalBudget) / leadCount : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "same") {
      const cost = parseFloat(sameValue);
      if (isNaN(cost) || cost < 0) {
        alert("Inserisci un valore valido");
        return;
      }
      onSetCost(cost);
    } else {
      const budget = parseFloat(totalBudget);
      if (isNaN(budget) || budget <= 0) {
        alert("Inserisci un budget valido");
        return;
      }
      onDistributeCost(budget);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Imposta Costo Acquisizione
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Lead count info */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>{leadCount}</strong> lead selezionat{leadCount === 1 ? "o" : "i"}
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("same")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
              mode === "same"
                ? "border-marketing bg-marketing/5 text-marketing"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Euro size={18} />
            <span className="font-medium">Stesso costo</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("distribute")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
              mode === "distribute"
                ? "border-marketing bg-marketing/5 text-marketing"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <DivideCircle size={18} />
            <span className="font-medium">Distribuisci</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "same" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo per ogni lead (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sameValue}
                  onChange={(e) => setSameValue(e.target.value)}
                  placeholder="Es: 25.00"
                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tutti i {leadCount} lead avranno lo stesso costo
              </p>
              
              {sameValue && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Costo totale:</span>
                    <span className="font-semibold">
                      €{(parseFloat(sameValue || "0") * leadCount).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget totale da distribuire (€)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="Es: 500.00"
                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Il budget sarà diviso equamente tra i {leadCount} lead
              </p>
              
              {totalBudget && parseFloat(totalBudget) > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Budget totale:</span>
                    <span className="font-semibold">€{parseFloat(totalBudget).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lead:</span>
                    <span className="font-semibold">{leadCount}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Costo per lead:</span>
                    <span className="font-bold text-marketing">
                      €{distributedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <Calculator size={18} />
              Applica
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
