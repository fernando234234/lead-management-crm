"use client";

import { useState, useEffect } from "react";
import { Target, TrendingUp, Phone, UserCheck, DollarSign, Settings, X, Plus } from "lucide-react";

interface Goal {
  id: string;
  userId: string;
  month: number;
  year: number;
  targetLeads: number;
  targetEnrolled: number;
  targetCalls: number;
  targetRevenue: string | number;
  notes: string | null;
  progress: {
    leads: number;
    contacted: number;
    enrolled: number;
    revenue: string | number;
  };
}

interface GoalsProgressProps {
  userId?: string;
  compact?: boolean;
}

export function GoalsProgress({ userId, compact = false }: GoalsProgressProps) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [formData, setFormData] = useState({
    targetLeads: 0,
    targetEnrolled: 0,
    targetCalls: 0,
    targetRevenue: 0,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchGoal();
  }, [userId]);

  const fetchGoal = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: currentMonth.toString(),
        year: currentYear.toString(),
      });
      if (userId) params.append("userId", userId);

      const res = await fetch(`/api/goals?${params}`);
      if (res.ok) {
        const goals = await res.json();
        if (goals.length > 0) {
          setGoal(goals[0]);
          setFormData({
            targetLeads: goals[0].targetLeads,
            targetEnrolled: goals[0].targetEnrolled,
            targetCalls: goals[0].targetCalls,
            targetRevenue: parseFloat(goals[0].targetRevenue) || 0,
            notes: goals[0].notes || "",
          });
        } else {
          setGoal(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    setSaving(true);
    try {
      const method = goal ? "PUT" : "POST";
      const url = goal ? `/api/goals/${goal.id}` : "/api/goals";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          year: currentYear,
          ...formData,
        }),
      });

      if (res.ok) {
        await fetchGoal();
        setShowSetupModal(false);
      }
    } catch (error) {
      console.error("Failed to save goal:", error);
    } finally {
      setSaving(false);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-gray-300";
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const monthNames = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-4">
            <Target size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              Obiettivi {monthNames[currentMonth - 1]}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Imposta i tuoi obiettivi mensili per tracciare i progressi
            </p>
            <button
              onClick={() => setShowSetupModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition text-sm font-medium"
            >
              <Plus size={16} />
              Imposta Obiettivi
            </button>
          </div>
        </div>

        {/* Setup Modal */}
        {showSetupModal && (
          <SetupModal
            formData={formData}
            setFormData={setFormData}
            onSave={handleSaveGoal}
            onClose={() => setShowSetupModal(false)}
            saving={saving}
            monthName={monthNames[currentMonth - 1]}
            year={currentYear}
          />
        )}
      </>
    );
  }

  const progressItems = [
    {
      label: "Lead Contattati",
      icon: Phone,
      current: goal.progress.contacted,
      target: goal.targetCalls,
      color: "blue",
    },
    {
      label: "Iscrizioni",
      icon: UserCheck,
      current: goal.progress.enrolled,
      target: goal.targetEnrolled,
      color: "green",
    },
    {
      label: "Fatturato",
      icon: DollarSign,
      current: parseFloat(goal.progress.revenue as string) || 0,
      target: parseFloat(goal.targetRevenue as string) || 0,
      color: "purple",
      isCurrency: true,
    },
  ];

  if (compact) {
    // Compact version for smaller spaces
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-commercial" />
            <span className="font-semibold text-sm text-gray-900">
              Obiettivi {monthNames[currentMonth - 1]}
            </span>
          </div>
          <button
            onClick={() => setShowSetupModal(true)}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <Settings size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="space-y-2">
          {progressItems.map((item, idx) => {
            const percentage = getProgressPercentage(item.current, item.target);
            return (
              <div key={idx} className="flex items-center gap-2">
                <item.icon size={14} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(percentage)} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 w-10 text-right">
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>

        {showSetupModal && (
          <SetupModal
            formData={formData}
            setFormData={setFormData}
            onSave={handleSaveGoal}
            onClose={() => setShowSetupModal(false)}
            saving={saving}
            monthName={monthNames[currentMonth - 1]}
            year={currentYear}
          />
        )}
      </div>
    );
  }

  // Full version
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-commercial" />
            <h2 className="text-lg font-semibold text-gray-900">
              Obiettivi {monthNames[currentMonth - 1]} {currentYear}
            </h2>
          </div>
          <button
            onClick={() => setShowSetupModal(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Modifica obiettivi"
          >
            <Settings size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {progressItems.map((item, idx) => {
            const percentage = getProgressPercentage(item.current, item.target);
            const IconComponent = item.icon;
            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <IconComponent size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {item.isCurrency
                      ? `${formatCurrency(item.current)} / ${formatCurrency(item.target)}`
                      : `${item.current} / ${item.target}`}
                  </span>
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full ${getProgressColor(percentage)} transition-all duration-500 rounded-full`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {percentage >= 100 ? "Obiettivo raggiunto!" : `${100 - percentage}% rimanente`}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      percentage >= 100
                        ? "text-green-600"
                        : percentage >= 75
                        ? "text-blue-600"
                        : percentage >= 50
                        ? "text-yellow-600"
                        : "text-gray-500"
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {goal.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">{goal.notes}</p>
          </div>
        )}
      </div>

      {showSetupModal && (
        <SetupModal
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveGoal}
          onClose={() => setShowSetupModal(false)}
          saving={saving}
          monthName={monthNames[currentMonth - 1]}
          year={currentYear}
        />
      )}
    </>
  );
}

// Setup Modal Component
interface SetupModalProps {
  formData: {
    targetLeads: number;
    targetEnrolled: number;
    targetCalls: number;
    targetRevenue: number;
    notes: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    targetLeads: number;
    targetEnrolled: number;
    targetCalls: number;
    targetRevenue: number;
    notes: string;
  }>>;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  monthName: string;
  year: number;
}

function SetupModal({ formData, setFormData, onSave, onClose, saving, monthName, year }: SetupModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">
            Obiettivi {monthName} {year}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Phone size={14} />
                Lead da Contattare
              </div>
            </label>
            <input
              type="number"
              min="0"
              value={formData.targetCalls}
              onChange={(e) => setFormData({ ...formData, targetCalls: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-commercial/20 focus:border-commercial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <UserCheck size={14} />
                Iscrizioni Target
              </div>
            </label>
            <input
              type="number"
              min="0"
              value={formData.targetEnrolled}
              onChange={(e) => setFormData({ ...formData, targetEnrolled: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-commercial/20 focus:border-commercial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <DollarSign size={14} />
                Fatturato Target (€)
              </div>
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.targetRevenue}
              onChange={(e) => setFormData({ ...formData, targetRevenue: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-commercial/20 focus:border-commercial"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (opzionale)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-commercial/20 focus:border-commercial resize-none"
              placeholder="Appunti sugli obiettivi..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Annulla
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-commercial text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <TrendingUp size={16} />
                Salva Obiettivi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
