"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  FileText,
  ArrowRight,
  UserPlus,
  CheckCircle,
  Plus,
  X,
  Clock,
  Loader2,
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ActivityTimelineProps {
  leadId: string;
  activities: Activity[];
  onAddActivity: (activity: {
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  isLoading?: boolean;
  compact?: boolean;
}

const activityConfig: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  NOTE: {
    icon: <FileText size={16} />,
    color: "bg-blue-100 text-blue-600 border-blue-200",
    label: "Nota",
  },
  CALL: {
    icon: <Phone size={16} />,
    color: "bg-green-100 text-green-600 border-green-200",
    label: "Chiamata",
  },
  EMAIL: {
    icon: <Mail size={16} />,
    color: "bg-purple-100 text-purple-600 border-purple-200",
    label: "Email",
  },
  STATUS_CHANGE: {
    icon: <ArrowRight size={16} />,
    color: "bg-yellow-100 text-yellow-600 border-yellow-200",
    label: "Cambio Stato",
  },
  ASSIGNMENT: {
    icon: <UserPlus size={16} />,
    color: "bg-orange-100 text-orange-600 border-orange-200",
    label: "Assegnazione",
  },
  ENROLLMENT: {
    icon: <CheckCircle size={16} />,
    color: "bg-emerald-100 text-emerald-600 border-emerald-200",
    label: "Iscrizione",
  },
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Adesso";
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days < 7) return `${days} giorni fa`;

  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

export default function ActivityTimeline({
  leadId,
  activities,
  onAddActivity,
  isLoading = false,
  compact = false,
}: ActivityTimelineProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: "NOTE",
    description: "",
    callDuration: "",
    callOutcome: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.description.trim()) return;

    setIsSubmitting(true);
    try {
      const metadata: Record<string, unknown> = {};
      if (newActivity.type === "CALL") {
        if (newActivity.callDuration)
          metadata.duration = newActivity.callDuration;
        if (newActivity.callOutcome) metadata.outcome = newActivity.callOutcome;
      }

      await onAddActivity({
        type: newActivity.type,
        description: newActivity.description,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      setNewActivity({
        type: "NOTE",
        description: "",
        callDuration: "",
        callOutcome: "",
      });
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickNote = async () => {
    const note = prompt("Aggiungi una nota veloce:");
    if (note?.trim()) {
      await onAddActivity({
        type: "NOTE",
        description: note.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          {compact ? "Attività Recenti" : "Timeline Attività"}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleQuickNote}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <Plus size={16} />
            Nota Veloce
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Attività
          </button>
        </div>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock size={32} className="mx-auto mb-2 text-gray-300" />
          <p>Nessuna attività registrata</p>
          <p className="text-sm">
            Aggiungi una nota o registra una chiamata
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Activities */}
          <div className="space-y-4">
            {(compact ? activities.slice(0, 5) : activities).map((activity) => {
              const config = activityConfig[activity.type] || activityConfig.NOTE;
              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${config.color}`}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <p className="mt-1 text-sm text-gray-900">
                          {activity.description}
                        </p>
                        {activity.metadata && (
                          <div className="mt-1 flex gap-2 flex-wrap">
                            {(activity.metadata as Record<string, unknown>)
                              ?.duration ? (
                              <span className="text-xs text-gray-500">
                                Durata:{" "}
                                {String(
                                  (activity.metadata as Record<string, unknown>)
                                    .duration
                                )}{" "}
                                min
                              </span>
                            ) : null}
                            {(activity.metadata as Record<string, unknown>)
                              ?.outcome ? (
                              <span className="text-xs text-gray-500">
                                Esito:{" "}
                                {String(
                                  (activity.metadata as Record<string, unknown>)
                                    .outcome
                                )}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {activity.user.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {compact && activities.length > 5 && (
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500">
                +{activities.length - 5} altre attività
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Aggiungi Attività</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo di Attività
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(activityConfig).map(([type, config]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setNewActivity({ ...newActivity, type })
                      }
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition ${
                        newActivity.type === type
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className={config.color.split(" ")[1]}>
                        {config.icon}
                      </span>
                      <span className="text-xs font-medium">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Call-specific fields */}
              {newActivity.type === "CALL" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durata (minuti)
                    </label>
                    <input
                      type="number"
                      value={newActivity.callDuration}
                      onChange={(e) =>
                        setNewActivity({
                          ...newActivity,
                          callDuration: e.target.value,
                        })
                      }
                      placeholder="5"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Esito
                    </label>
                    <select
                      value={newActivity.callOutcome}
                      onChange={(e) =>
                        setNewActivity({
                          ...newActivity,
                          callOutcome: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleziona...</option>
                      <option value="Positivo">Positivo</option>
                      <option value="Negativo">Negativo</option>
                      <option value="Da richiamare">Da richiamare</option>
                      <option value="Non risponde">Non risponde</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione *
                </label>
                <textarea
                  required
                  value={newActivity.description}
                  onChange={(e) =>
                    setNewActivity({ ...newActivity, description: e.target.value })
                  }
                  placeholder={
                    newActivity.type === "CALL"
                      ? "Descrivi la conversazione..."
                      : newActivity.type === "EMAIL"
                      ? "Oggetto e contenuto dell'email..."
                      : "Aggiungi una nota..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newActivity.description.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
