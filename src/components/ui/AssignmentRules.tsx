"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Settings2, ArrowRight, CheckCircle } from "lucide-react";

interface Commercial {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
}

type RuleType = "campaign" | "course";

interface AssignmentRule {
  id: string;
  type: RuleType;
  sourceId: string; // campaign or course ID
  sourceName: string;
  commercialId: string;
  commercialName: string;
  enabled: boolean;
}

interface AssignmentRulesProps {
  commercials: Commercial[];
  campaigns: Campaign[];
  courses: Course[];
  onRulesChange?: (rules: AssignmentRule[]) => void;
}

const STORAGE_KEY = "lead-assignment-rules";

export default function AssignmentRules({
  commercials,
  campaigns,
  courses,
  onRulesChange,
}: AssignmentRulesProps) {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState<{
    type: RuleType;
    sourceId: string;
    commercialId: string;
  }>({
    type: "campaign",
    sourceId: "",
    commercialId: "",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Load rules from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedRules = JSON.parse(stored) as AssignmentRule[];
        setRules(parsedRules);
      }
    } catch (error) {
      console.error("Failed to load assignment rules:", error);
    }
  }, []);

  // Save rules to localStorage
  const saveRules = (updatedRules: AssignmentRule[]) => {
    setSaveStatus("saving");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRules));
      setRules(updatedRules);
      onRulesChange?.(updatedRules);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save assignment rules:", error);
      setSaveStatus("idle");
    }
  };

  const getSourceOptions = () => {
    if (newRule.type === "campaign") {
      return campaigns.map((c) => ({ id: c.id, name: c.name }));
    }
    return courses.map((c) => ({ id: c.id, name: c.name }));
  };

  const handleAddRule = () => {
    if (!newRule.sourceId || !newRule.commercialId) return;

    const source =
      newRule.type === "campaign"
        ? campaigns.find((c) => c.id === newRule.sourceId)
        : courses.find((c) => c.id === newRule.sourceId);
    const commercial = commercials.find((c) => c.id === newRule.commercialId);

    if (!source || !commercial) return;

    const rule: AssignmentRule = {
      id: crypto.randomUUID(),
      type: newRule.type,
      sourceId: newRule.sourceId,
      sourceName: source.name,
      commercialId: newRule.commercialId,
      commercialName: commercial.name,
      enabled: true,
    };

    const updatedRules = [...rules, rule];
    saveRules(updatedRules);
    setNewRule({ type: "campaign", sourceId: "", commercialId: "" });
    setIsAdding(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter((r) => r.id !== ruleId);
    saveRules(updatedRules);
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    saveRules(updatedRules);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Regole di Assegnazione Automatica</h3>
        </div>
        {saveStatus === "saved" && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={16} />
            Salvato
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Definisci regole per assegnare automaticamente i nuovi lead ai commerciali
        in base alla campagna o al corso di provenienza.
      </p>

      {/* Rules List */}
      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-4 p-4 border rounded-lg ${
                rule.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200"
              }`}
            >
              {/* Toggle */}
              <button
                onClick={() => handleToggleRule(rule.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rule.enabled ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    rule.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>

              {/* Rule Content */}
              <div className="flex-1 flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    rule.type === "campaign"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {rule.type === "campaign" ? "Campagna" : "Corso"}
                </span>
                <span className={`font-medium ${rule.enabled ? "text-gray-900" : "text-gray-500"}`}>
                  {rule.sourceName}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
                <span className={rule.enabled ? "text-gray-700" : "text-gray-500"}>
                  {rule.commercialName}
                </span>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDeleteRule(rule.id)}
                className="p-2 text-gray-400 hover:text-red-600 transition"
                title="Elimina regola"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Settings2 className="mx-auto w-8 h-8 text-gray-400 mb-2" />
          <p className="text-gray-500">Nessuna regola configurata</p>
          <p className="text-sm text-gray-400">
            Aggiungi una regola per automatizzare l&apos;assegnazione
          </p>
        </div>
      )}

      {/* Add Rule Form */}
      {isAdding ? (
        <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-4">Nuova Regola</h4>
          <div className="grid grid-cols-3 gap-4">
            {/* Rule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={newRule.type}
                onChange={(e) => {
                  setNewRule({
                    ...newRule,
                    type: e.target.value as RuleType,
                    sourceId: "",
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="campaign">Campagna</option>
                <option value="course">Corso</option>
              </select>
            </div>

            {/* Source Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {newRule.type === "campaign" ? "Campagna" : "Corso"}
              </label>
              <select
                value={newRule.sourceId}
                onChange={(e) => setNewRule({ ...newRule, sourceId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona...</option>
                {getSourceOptions().map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Commercial Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assegna a
              </label>
              <select
                value={newRule.commercialId}
                onChange={(e) => setNewRule({ ...newRule, commercialId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona commerciale...</option>
                {commercials.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewRule({ type: "campaign", sourceId: "", commercialId: "" });
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Annulla
            </button>
            <button
              onClick={handleAddRule}
              disabled={!newRule.sourceId || !newRule.commercialId}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={18} />
              Salva Regola
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition border-2 border-dashed border-gray-300"
        >
          <Plus size={20} />
          Aggiungi Regola
        </button>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <strong>Come funziona:</strong> Quando viene creato un nuovo lead da una campagna
        o per un corso con una regola attiva, verrà automaticamente assegnato al
        commerciale specificato.
      </div>
    </div>
  );
}

// Export utility function to get matching rule
export function getMatchingRule(
  rules: AssignmentRule[],
  campaignId?: string | null,
  courseId?: string | null
): AssignmentRule | null {
  // First try to match by campaign
  if (campaignId) {
    const campaignRule = rules.find(
      (r) => r.enabled && r.type === "campaign" && r.sourceId === campaignId
    );
    if (campaignRule) return campaignRule;
  }

  // Then try to match by course
  if (courseId) {
    const courseRule = rules.find(
      (r) => r.enabled && r.type === "course" && r.sourceId === courseId
    );
    if (courseRule) return courseRule;
  }

  return null;
}

export type { AssignmentRule, AssignmentRulesProps };
