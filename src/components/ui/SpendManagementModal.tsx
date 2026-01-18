"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Euro,
  Copy,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

interface SpendRecord {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
}

interface Campaign {
  id: string;
  name: string;
  platform: string;
  budget: number;
  totalSpent?: number;
  spendRecords?: SpendRecord[];
}

interface SpendManagementModalProps {
  campaign: Campaign;
  onClose: () => void;
  onUpdate: () => void;
  isDemoMode?: boolean;
}

type TabType = "records" | "add" | "recurring" | "bulk";

export function SpendManagementModal({
  campaign,
  onClose,
  onUpdate,
  isDemoMode = false,
}: SpendManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("records");
  const [spendRecords, setSpendRecords] = useState<SpendRecord[]>(
    campaign.spendRecords || []
  );
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SpendRecord | null>(null);

  // Single spend form
  const [singleForm, setSingleForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
  });

  // Recurring spend form
  const [recurringForm, setRecurringForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    amount: "",
    frequency: "daily" as "daily" | "weekly",
    notes: "",
  });

  // Bulk entry form
  const [bulkText, setBulkText] = useState("");

  // Calculate budget stats
  const totalSpent = spendRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const remainingBudget = Number(campaign.budget) - totalSpent;
  const budgetPercentage = campaign.budget > 0 
    ? Math.min((totalSpent / Number(campaign.budget)) * 100, 100) 
    : 0;
  const isOverBudget = remainingBudget < 0;
  const isNearBudget = !isOverBudget && budgetPercentage >= 80;

  // Fetch spend records
  const fetchRecords = async () => {
    if (isDemoMode) return;
    
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/spend`);
      const data = await res.json();
      setSpendRecords(data);
    } catch (error) {
      console.error("Failed to fetch spend records:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [campaign.id]);

  // Add or update single record
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleForm.amount || parseFloat(singleForm.amount) <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        const newRecord: SpendRecord = {
          id: editingRecord?.id || `demo-${Date.now()}`,
          date: singleForm.date,
          amount: parseFloat(singleForm.amount),
          notes: singleForm.notes || null,
        };
        
        if (editingRecord) {
          setSpendRecords(spendRecords.map(r => 
            r.id === editingRecord.id ? newRecord : r
          ));
        } else {
          setSpendRecords([newRecord, ...spendRecords]);
        }
        
        toast.success(editingRecord ? "Spesa modificata!" : "Spesa aggiunta!");
        resetSingleForm();
        return;
      }

      const res = await fetch(`/api/campaigns/${campaign.id}/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: singleForm.date,
          amount: parseFloat(singleForm.amount),
          notes: singleForm.notes || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save spend");

      toast.success(editingRecord ? "Spesa modificata!" : "Spesa aggiunta!");
      resetSingleForm();
      await fetchRecords();
      onUpdate();
    } catch (error) {
      console.error("Failed to save spend:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setLoading(false);
    }
  };

  const resetSingleForm = () => {
    setSingleForm({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      notes: "",
    });
    setEditingRecord(null);
    setActiveTab("records");
  };

  // Edit record
  const handleEdit = (record: SpendRecord) => {
    setEditingRecord(record);
    setSingleForm({
      date: record.date.split("T")[0],
      amount: String(record.amount),
      notes: record.notes || "",
    });
    setActiveTab("add");
  };

  // Delete record
  const handleDelete = async (recordId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa spesa?")) return;

    setLoading(true);
    try {
      if (isDemoMode) {
        setSpendRecords(spendRecords.filter(r => r.id !== recordId));
        toast.success("Spesa eliminata!");
        return;
      }

      const res = await fetch(`/api/campaigns/${campaign.id}/spend?recordId=${recordId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete spend");

      toast.success("Spesa eliminata!");
      await fetchRecords();
      onUpdate();
    } catch (error) {
      console.error("Failed to delete spend:", error);
      toast.error("Errore nell'eliminazione");
    } finally {
      setLoading(false);
    }
  };

  // Generate recurring entries
  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.amount || parseFloat(recurringForm.amount) <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    if (!recurringForm.endDate) {
      toast.error("Seleziona una data di fine");
      return;
    }

    const startDate = new Date(recurringForm.startDate);
    const endDate = new Date(recurringForm.endDate);
    
    if (endDate <= startDate) {
      toast.error("La data di fine deve essere successiva alla data di inizio");
      return;
    }

    // Generate dates
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const increment = recurringForm.frequency === "daily" ? 1 : 7;

    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + increment);
    }

    if (dates.length > 90) {
      toast.error("Troppi giorni selezionati (max 90). Riduci l'intervallo.");
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(recurringForm.amount);
      
      if (isDemoMode) {
        const newRecords = dates.map((date, i) => ({
          id: `demo-${Date.now()}-${i}`,
          date,
          amount,
          notes: recurringForm.notes || null,
        }));
        setSpendRecords([...newRecords, ...spendRecords]);
        toast.success(`${dates.length} spese create!`);
        setRecurringForm({
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          amount: "",
          frequency: "daily",
          notes: "",
        });
        setActiveTab("records");
        return;
      }

      // Create all records
      for (const date of dates) {
        await fetch(`/api/campaigns/${campaign.id}/spend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            amount,
            notes: recurringForm.notes || null,
          }),
        });
      }

      toast.success(`${dates.length} spese create!`);
      setRecurringForm({
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        amount: "",
        frequency: "daily",
        notes: "",
      });
      setActiveTab("records");
      await fetchRecords();
      onUpdate();
    } catch (error) {
      console.error("Failed to create recurring spend:", error);
      toast.error("Errore nella creazione delle spese ricorrenti");
    } finally {
      setLoading(false);
    }
  };

  // Parse bulk entries
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse format: date,amount,notes (one per line)
    // Example:
    // 2024-01-15,100,Facebook boost
    // 2024-01-16,150
    const lines = bulkText.trim().split("\n").filter(line => line.trim());
    
    if (lines.length === 0) {
      toast.error("Inserisci almeno una riga");
      return;
    }

    const entries: { date: string; amount: number; notes: string | null }[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length < 2) {
        errors.push(`Riga ${index + 1}: formato non valido`);
        return;
      }

      const date = parts[0];
      const amount = parseFloat(parts[1]);
      const notes = parts[2] || null;

      // Validate date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push(`Riga ${index + 1}: data non valida (usa YYYY-MM-DD)`);
        return;
      }

      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Riga ${index + 1}: importo non valido`);
        return;
      }

      entries.push({ date, amount, notes });
    });

    if (errors.length > 0) {
      toast.error(errors.join("\n"));
      return;
    }

    if (entries.length > 100) {
      toast.error("Troppi record (max 100). Importa in più batch.");
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        const newRecords = entries.map((entry, i) => ({
          id: `demo-${Date.now()}-${i}`,
          date: entry.date,
          amount: entry.amount,
          notes: entry.notes,
        }));
        setSpendRecords([...newRecords, ...spendRecords]);
        toast.success(`${entries.length} spese importate!`);
        setBulkText("");
        setActiveTab("records");
        return;
      }

      for (const entry of entries) {
        await fetch(`/api/campaigns/${campaign.id}/spend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
      }

      toast.success(`${entries.length} spese importate!`);
      setBulkText("");
      setActiveTab("records");
      await fetchRecords();
      onUpdate();
    } catch (error) {
      console.error("Failed to import bulk spend:", error);
      toast.error("Errore nell'importazione");
    } finally {
      setLoading(false);
    }
  };

  // Get platform color
  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      FACEBOOK: "bg-blue-500",
      INSTAGRAM: "bg-pink-500",
      LINKEDIN: "bg-blue-700",
      GOOGLE_ADS: "bg-green-500",
      TIKTOK: "bg-gray-900",
    };
    return colors[platform] || "bg-gray-500";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getPlatformColor(campaign.platform)}`} />
            <div>
              <h2 className="text-lg font-semibold">{campaign.name}</h2>
              <p className="text-sm text-gray-500">Gestione Spese Campagna</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Budget Progress Bar */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Budget: €{Number(campaign.budget).toLocaleString("it-IT")}
            </span>
            <span className={`text-sm font-medium ${
              isOverBudget ? "text-red-600" : isNearBudget ? "text-amber-600" : "text-green-600"
            }`}>
              {isOverBudget 
                ? `Sforato di €${Math.abs(remainingBudget).toLocaleString("it-IT")}`
                : `Rimanente: €${remainingBudget.toLocaleString("it-IT")}`
              }
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                isOverBudget ? "bg-red-500" : isNearBudget ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              Speso: €{totalSpent.toLocaleString("it-IT")} ({budgetPercentage.toFixed(1)}%)
            </span>
            <span className="text-xs text-gray-500">
              {spendRecords.length} registrazioni
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: "records", label: "Storico", icon: Calendar },
            { key: "add", label: editingRecord ? "Modifica" : "Aggiungi", icon: Plus },
            { key: "recurring", label: "Ricorrente", icon: RefreshCw },
            { key: "bulk", label: "Importa", icon: Upload },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                if (key === "add" && editingRecord) {
                  resetSingleForm();
                }
                setActiveTab(key as TabType);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === key
                  ? "text-marketing border-b-2 border-marketing bg-marketing/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Records Tab */}
          {activeTab === "records" && (
            <div className="space-y-2">
              {spendRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Euro size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Nessuna spesa registrata</p>
                  <button
                    onClick={() => setActiveTab("add")}
                    className="mt-2 text-marketing hover:underline"
                  >
                    Aggiungi la prima spesa
                  </button>
                </div>
              ) : (
                spendRecords
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Calendar size={18} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Date(record.date).toLocaleDateString("it-IT", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          {record.notes && (
                            <p className="text-sm text-gray-500">{record.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">
                          €{Number(record.amount).toLocaleString("it-IT")}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-2 text-gray-400 hover:text-marketing hover:bg-white rounded-lg transition"
                            title="Modifica"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                            title="Elimina"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* Add/Edit Tab */}
          {activeTab === "add" && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {editingRecord && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <Pencil size={16} className="text-amber-600" />
                  <span className="text-sm text-amber-800">
                    Stai modificando la spesa del {new Date(editingRecord.date).toLocaleDateString("it-IT")}
                  </span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  required
                  value={singleForm.date}
                  onChange={(e) => setSingleForm({ ...singleForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importo (€) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={singleForm.amount}
                  onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                  placeholder="100.00"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                  placeholder="es. Boost post, Campagna retargeting..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                {editingRecord && (
                  <button
                    type="button"
                    onClick={resetSingleForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annulla
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {editingRecord ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                      {editingRecord ? "Salva Modifiche" : "Aggiungi Spesa"}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Recurring Tab */}
          {activeTab === "recurring" && (
            <form onSubmit={handleRecurringSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Crea automaticamente spese ricorrenti per un periodo. Utile per budget giornalieri o settimanali costanti.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inizio *
                  </label>
                  <input
                    type="date"
                    required
                    value={recurringForm.startDate}
                    onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fine *
                  </label>
                  <input
                    type="date"
                    required
                    value={recurringForm.endDate}
                    onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo per periodo (€) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={recurringForm.amount}
                    onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                    placeholder="50.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequenza *
                  </label>
                  <select
                    value={recurringForm.frequency}
                    onChange={(e) => setRecurringForm({ 
                      ...recurringForm, 
                      frequency: e.target.value as "daily" | "weekly" 
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                  >
                    <option value="daily">Giornaliero</option>
                    <option value="weekly">Settimanale</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  value={recurringForm.notes}
                  onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })}
                  placeholder="es. Budget giornaliero Facebook"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Genera Spese Ricorrenti
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bulk Import Tab */}
          {activeTab === "bulk" && (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  Importa più spese contemporaneamente. Formato: una riga per spesa.
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded">
                  YYYY-MM-DD,importo,note (opzionale)
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dati da importare
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={8}
                  placeholder={`2024-01-15,100,Boost post
2024-01-16,150,Campagna retargeting
2024-01-17,75`}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-marketing focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Puoi copiare da Excel: seleziona le colonne Data, Importo, Note e incolla qui.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !bulkText.trim()}
                className="w-full px-4 py-2 bg-marketing text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={18} />
                    Importa Spese
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer with budget warning */}
        {(isOverBudget || isNearBudget) && (
          <div className={`px-4 py-3 border-t flex items-center gap-2 ${
            isOverBudget ? "bg-red-50" : "bg-amber-50"
          }`}>
            <AlertTriangle size={18} className={isOverBudget ? "text-red-600" : "text-amber-600"} />
            <span className={`text-sm ${isOverBudget ? "text-red-800" : "text-amber-800"}`}>
              {isOverBudget 
                ? `Attenzione: il budget è stato superato di €${Math.abs(remainingBudget).toLocaleString("it-IT")}`
                : `Il budget è quasi esaurito (${budgetPercentage.toFixed(0)}% utilizzato)`
              }
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
