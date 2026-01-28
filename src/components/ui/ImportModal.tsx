"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Copy,
  Bot,
  AlertTriangle,
  BookOpen,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  parseFile,
  getFileType,
  autoDetectMapping,
  validateLeadData,
  ParseResult,
  ValidatedLead,
  ValidationError,
} from "@/lib/import";

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: (result: { success: number; errors: number }) => void;
  courses: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
}

type Step = "upload" | "mapping" | "preview" | "warnings" | "importing" | "complete";

// Fuzzy match warning type
interface FuzzyWarning {
  type: "course" | "commercial";
  inputValue: string;
  suggestions: { name: string; score: number }[];
  count: number;
}

// Correction choice - what user decides to do with unmatched value
interface CorrectionChoice {
  action: "keep" | "replace"; // keep = create new, replace = use existing
  replacementValue?: string; // the existing value to use instead
}

// Lead fields that can be mapped
const LEAD_FIELDS = [
  { key: "nome", label: "Nome", required: true },
  { key: "email", label: "Email", required: false },
  { key: "telefono", label: "Telefono", required: false },
  { key: "corso", label: "Corso", required: false },
  { key: "campagna", label: "Campagna", required: false },
  { key: "stato", label: "Stato", required: false },
  { key: "note", label: "Note", required: false },
  { key: "assignedTo", label: "Assegnato a (email)", required: false },
];

// Helper component for the warnings step import button
function WarningsImportButton({
  fuzzyWarnings,
  corrections,
  getCorrectionKey,
  onImport,
}: {
  fuzzyWarnings: FuzzyWarning[];
  corrections: Record<string, CorrectionChoice>;
  getCorrectionKey: (type: string, inputValue: string) => string;
  onImport: () => void;
}) {
  const allAddressed = fuzzyWarnings.every(w => {
    const key = getCorrectionKey(w.type, w.inputValue);
    return corrections[key] !== undefined;
  });
  const addressedCount = fuzzyWarnings.filter(w => {
    const key = getCorrectionKey(w.type, w.inputValue);
    return corrections[key] !== undefined;
  }).length;

  return (
    <button
      onClick={onImport}
      disabled={!allAddressed}
      className={`flex items-center gap-2 px-6 py-2 rounded-lg transition ${
        allAddressed 
          ? "bg-green-600 text-white hover:bg-green-700" 
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }`}
    >
      {allAddressed ? (
        <>
          <CheckCircle size={18} />
          Importa con correzioni
        </>
      ) : (
        <>
          <AlertTriangle size={18} />
          Seleziona tutte le opzioni ({addressedCount}/{fuzzyWarnings.length})
        </>
      )}
    </button>
  );
}

export default function ImportModal({
  onClose,
  onImportComplete,
  courses,
  campaigns,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<{
    validLeads: ValidatedLead[];
    errors: ValidationError[];
  } | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fuzzyWarnings, setFuzzyWarnings] = useState<FuzzyWarning[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  // Track user corrections: key = "type:inputValue", value = correction choice
  const [corrections, setCorrections] = useState<Record<string, CorrectionChoice>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to get correction key
  const getCorrectionKey = (type: string, inputValue: string) => `${type}:${inputValue}`;

  // Handle correction choice
  const handleCorrectionChoice = (
    type: "course" | "commercial",
    inputValue: string,
    action: "keep" | "replace",
    replacementValue?: string
  ) => {
    const key = getCorrectionKey(type, inputValue);
    setCorrections(prev => ({
      ...prev,
      [key]: { action, replacementValue }
    }));
  };

  // Apply corrections to validated data before import
  const applyCorrections = () => {
    if (!validatedData) return validatedData;

    const correctedLeads = validatedData.validLeads.map(lead => {
      let correctedLead = { ...lead };

      // Check for course correction
      if (lead.courseName) {
        const courseKey = getCorrectionKey("course", lead.courseName);
        const courseCorrection = corrections[courseKey];
        if (courseCorrection?.action === "replace" && courseCorrection.replacementValue) {
          correctedLead.courseName = courseCorrection.replacementValue;
        }
      }

      // Check for commercial correction
      if (lead.assignedToName) {
        const commercialKey = getCorrectionKey("commercial", lead.assignedToName);
        const commercialCorrection = corrections[commercialKey];
        if (commercialCorrection?.action === "replace" && commercialCorrection.replacementValue) {
          correctedLead.assignedToName = commercialCorrection.replacementValue;
        }
      }

      return correctedLead;
    });

    return { ...validatedData, validLeads: correctedLeads };
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    const fileType = getFileType(selectedFile);
    if (fileType === "unknown") {
      setError("Formato file non supportato. Usa CSV o Excel (.xlsx, .xls)");
      return;
    }

    try {
      const result = await parseFile(selectedFile);
      setParseResult(result);

      if (result.errors.length > 0) {
        setError(`Attenzione: ${result.errors.join(", ")}`);
      }

      if (result.rows.length === 0) {
        setError("Il file non contiene dati da importare");
        return;
      }

      // Auto-detect column mapping
      const autoMapping = autoDetectMapping(result.headers);
      setColumnMapping(autoMapping);

      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la lettura del file");
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Mapping step handlers
  const handleMappingChange = (field: string, header: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: header === "" ? "" : header,
    }));
  };

  const handleProceedToPreview = () => {
    if (!parseResult) return;

    // Validate that 'nome' is mapped
    if (!columnMapping.nome) {
      setError("Il campo 'Nome' è obbligatorio. Seleziona una colonna.");
      return;
    }

    setError(null);
    const result = validateLeadData(parseResult.rows, columnMapping);
    setValidatedData(result);
    setStep("preview");
  };

  // Validate handler - checks for fuzzy matches before import
  const handleValidateBeforeImport = async () => {
    if (!validatedData || validatedData.validLeads.length === 0) return;

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/leads/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: validatedData.validLeads,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante la validazione");
      }

      const result = await response.json();
      
      if (result.warnings && result.warnings.length > 0) {
        // Show warnings step
        setFuzzyWarnings(result.warnings);
        setStep("warnings");
      } else {
        // No warnings, proceed directly to import
        handleImport();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la validazione");
    } finally {
      setIsValidating(false);
    }
  };

  // Import handler - actual import
  const handleImport = async () => {
    if (!validatedData || validatedData.validLeads.length === 0) return;

    setStep("importing");
    setImportProgress(0);

    // Apply any corrections the user made
    const dataToImport = applyCorrections();

    try {
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: dataToImport?.validLeads || validatedData.validLeads,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Build detailed error message including hints and details from API
        let errorMessage = errorData.error || "Errore durante l'importazione";
        if (errorData.details && Array.isArray(errorData.details)) {
          errorMessage += "\n\n" + errorData.details.join("\n");
        }
        if (errorData.hint) {
          errorMessage += "\n\n💡 " + errorData.hint;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setImportResult(result);
      setImportProgress(100);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'importazione");
      setStep("preview");
    }
  };

  // Template download handler
  const handleDownloadTemplate = () => {
    window.open("/api/leads/template", "_blank");
  };

  // Copy LLM instructions handler
  const handleCopyLLMInstructions = async () => {
    try {
      const response = await fetch("/api/leads/template?format=llm");
      if (!response.ok) throw new Error("Failed to fetch instructions");
      const instructions = await response.text();
      await navigator.clipboard.writeText(instructions);
      toast.success("Istruzioni copiate! Incollale in ChatGPT o Claude per convertire i tuoi dati.");
    } catch (err) {
      toast.error("Errore durante la copia delle istruzioni");
      console.error(err);
    }
  };

  // Close handler
  const handleClose = () => {
    if (importResult) {
      onImportComplete({
        success: importResult.success,
        errors: importResult.errors.length,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Importa Lead</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === "upload" && "Carica un file CSV o Excel"}
              {step === "mapping" && "Associa le colonne ai campi lead"}
              {step === "preview" && "Verifica i dati prima dell'importazione"}
              {step === "warnings" && "Verifica corsi e commerciali non riconosciuti"}
              {step === "importing" && "Importazione in corso..."}
              {step === "complete" && "Importazione completata"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-red-700 text-sm whitespace-pre-line">{error}</div>
            </div>
          )}

          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-6">
              {/* Drag and drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                  isDragging
                    ? "border-admin bg-admin/5"
                    : "border-gray-300 hover:border-admin hover:bg-gray-50"
                }`}
              >
                <Upload
                  size={48}
                  className={`mx-auto mb-4 ${isDragging ? "text-admin" : "text-gray-400"}`}
                />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Trascina qui il file o clicca per selezionare
                </p>
                <p className="text-sm text-gray-500">
                  Formati supportati: CSV, Excel (.xlsx, .xls)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>

              {/* Template download */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="text-gray-500 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-700">Template di esempio</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scarica il template CSV con tutte le colonne e formati corretti
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 text-admin border border-admin rounded-lg hover:bg-admin/5 transition"
                  >
                    <Download size={18} />
                    Scarica Template
                  </button>
                </div>
              </div>

              {/* LLM Instructions */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start gap-3">
                  <Bot className="text-purple-600 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-purple-900">Hai dati in formato diverso?</p>
                    <p className="text-sm text-purple-700 mt-1">
                      Copia le istruzioni per un LLM (ChatGPT, Claude) che convertira automaticamente 
                      i tuoi dati nel formato corretto, gestendo errori di encoding, stati non standard 
                      e problemi comuni.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLLMInstructions}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition whitespace-nowrap"
                  >
                    <Copy size={18} />
                    Copia Istruzioni per LLM
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mapping Step */}
          {step === "mapping" && parseResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>File caricato:</strong> {file?.name} ({parseResult.rows.length} righe
                  trovate)
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Associazione Colonne</h3>
                <p className="text-sm text-gray-600">
                  Associa le colonne del tuo file ai campi del lead. I campi con * sono
                  obbligatori.
                </p>

                <div className="grid gap-3">
                  {LEAD_FIELDS.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-48">
                        <span className="font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </div>
                      <ArrowRight size={20} className="text-gray-400" />
                      <select
                        value={columnMapping[field.key] || ""}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
                      >
                        <option value="">-- Non mappato --</option>
                        {parseResult.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && validatedData && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={20} />
                    <span className="font-semibold text-green-700">
                      {validatedData.validLeads.length} lead validi
                    </span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Pronti per l'importazione</p>
                </div>

                {validatedData.errors.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="text-yellow-500" size={20} />
                      <span className="font-semibold text-yellow-700">
                        {validatedData.errors.length} avvisi
                      </span>
                    </div>
                    <p className="text-sm text-yellow-600 mt-1">Verifica i dati</p>
                  </div>
                )}
              </div>

              {/* Validation errors */}
              {validatedData.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Avvisi di validazione:</h4>
                  <div className="max-h-32 overflow-y-auto bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    {validatedData.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-sm text-yellow-700">
                        Riga {err.row}: {err.message}
                      </p>
                    ))}
                    {validatedData.errors.length > 10 && (
                      <p className="text-sm text-yellow-600 font-medium mt-2">
                        ... e altri {validatedData.errors.length - 10} avvisi
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">
                  Anteprima (prime 5 righe):
                </h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="p-3 font-medium text-gray-600">Nome</th>
                        <th className="p-3 font-medium text-gray-600">Email</th>
                        <th className="p-3 font-medium text-gray-600">Telefono</th>
                        <th className="p-3 font-medium text-gray-600">Corso</th>
                        <th className="p-3 font-medium text-gray-600">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validatedData.validLeads.slice(0, 5).map((lead, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3">{lead.name}</td>
                          <td className="p-3 text-gray-500">{lead.email || "-"}</td>
                          <td className="p-3 text-gray-500">{lead.phone || "-"}</td>
                          <td className="p-3 text-gray-500">{lead.courseName || "-"}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Warnings Step - Fuzzy match warnings */}
          {step === "warnings" && fuzzyWarnings.length > 0 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="font-semibold text-yellow-800">
                      Attenzione: valori non riconosciuti
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Alcuni corsi o commerciali nel file non corrispondono ai dati esistenti.
                      Verifica che siano corretti prima di procedere.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Course warnings */}
                {fuzzyWarnings.filter(w => w.type === "course").length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                      <BookOpen size={18} className="text-blue-600" />
                      Corsi non riconosciuti
                    </h4>
                    <div className="space-y-3">
                      {fuzzyWarnings
                        .filter(w => w.type === "course")
                        .map((warning, idx) => {
                          const correctionKey = getCorrectionKey("course", warning.inputValue);
                          const currentCorrection = corrections[correctionKey];
                          
                          return (
                            <div key={idx} className={`bg-white border rounded-lg p-4 ${
                              currentCorrection ? "border-green-300 bg-green-50/30" : "border-gray-200"
                            }`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    &quot;{warning.inputValue}&quot;
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                      ({warning.count} lead)
                                    </span>
                                  </p>
                                  {currentCorrection ? (
                                    <p className="text-sm text-green-600 mt-1">
                                      {currentCorrection.action === "keep" 
                                        ? "✓ Verrà creato come nuovo corso"
                                        : `✓ Verrà sostituito con "${currentCorrection.replacementValue}"`
                                      }
                                    </p>
                                  ) : (
                                    <p className="text-sm text-yellow-600 mt-1">
                                      Scegli cosa fare con questo valore
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t space-y-2">
                                {/* Keep as new option */}
                                <button
                                  onClick={() => handleCorrectionChoice("course", warning.inputValue, "keep")}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                    currentCorrection?.action === "keep"
                                      ? "bg-blue-100 border-2 border-blue-500 text-blue-800"
                                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  <span className="font-medium">Crea nuovo corso</span>
                                  <span className="text-gray-500 ml-2">
                                    &quot;{warning.inputValue}&quot;
                                  </span>
                                </button>

                                {/* Suggestions */}
                                {warning.suggestions.map((suggestion, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => handleCorrectionChoice("course", warning.inputValue, "replace", suggestion.name)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                      currentCorrection?.action === "replace" && currentCorrection.replacementValue === suggestion.name
                                        ? "bg-green-100 border-2 border-green-500 text-green-800"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                    }`}
                                  >
                                    <span className="font-medium">Usa esistente:</span>
                                    <span className="ml-2">&quot;{suggestion.name}&quot;</span>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                                      {suggestion.score}% simile
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Commercial warnings */}
                {fuzzyWarnings.filter(w => w.type === "commercial").length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                      <User size={18} className="text-purple-600" />
                      Commerciali non riconosciuti
                    </h4>
                    <div className="space-y-3">
                      {fuzzyWarnings
                        .filter(w => w.type === "commercial")
                        .map((warning, idx) => {
                          const correctionKey = getCorrectionKey("commercial", warning.inputValue);
                          const currentCorrection = corrections[correctionKey];
                          
                          return (
                            <div key={idx} className={`bg-white border rounded-lg p-4 ${
                              currentCorrection ? "border-green-300 bg-green-50/30" : "border-gray-200"
                            }`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    &quot;{warning.inputValue}&quot;
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                      ({warning.count} lead)
                                    </span>
                                  </p>
                                  {currentCorrection ? (
                                    <p className="text-sm text-green-600 mt-1">
                                      {currentCorrection.action === "keep" 
                                        ? "✓ Lead rimarranno non assegnati"
                                        : `✓ Verrà assegnato a "${currentCorrection.replacementValue}"`
                                      }
                                    </p>
                                  ) : (
                                    <p className="text-sm text-yellow-600 mt-1">
                                      Scegli cosa fare con questo valore
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t space-y-2">
                                {/* Keep unassigned option */}
                                <button
                                  onClick={() => handleCorrectionChoice("commercial", warning.inputValue, "keep")}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                    currentCorrection?.action === "keep"
                                      ? "bg-purple-100 border-2 border-purple-500 text-purple-800"
                                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                  }`}
                                >
                                  <span className="font-medium">Lascia non assegnati</span>
                                  <span className="text-gray-500 ml-2">
                                    (potrai assegnarli dopo)
                                  </span>
                                </button>

                                {/* Suggestions */}
                                {warning.suggestions.map((suggestion, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => handleCorrectionChoice("commercial", warning.inputValue, "replace", suggestion.name)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                                      currentCorrection?.action === "replace" && currentCorrection.replacementValue === suggestion.name
                                        ? "bg-green-100 border-2 border-green-500 text-green-800"
                                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                    }`}
                                  >
                                    <span className="font-medium">Assegna a:</span>
                                    <span className="ml-2">&quot;{suggestion.name}&quot;</span>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                                      {suggestion.score}% simile
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 border border-blue-200">
                <p>
                  <strong>Seleziona un&apos;opzione per ogni valore</strong> per procedere con l&apos;importazione.
                  Puoi creare nuovi corsi o usare quelli esistenti, e assegnare i lead ai commerciali corretti.
                </p>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === "importing" && (
            <div className="py-12 text-center">
              <Loader2 size={48} className="mx-auto mb-6 text-admin animate-spin" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Importazione in corso...
              </h3>
              <p className="text-gray-500 mb-6">Attendere prego</p>

              <div className="max-w-md mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-admin transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">{importProgress}%</p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === "complete" && importResult && (
            <div className="py-8 text-center">
              <CheckCircle size={64} className="mx-auto mb-6 text-green-500" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Importazione completata!
              </h3>

              <div className="max-w-sm mx-auto space-y-4 mt-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 font-medium">
                    {importResult.success} lead importati con successo
                  </p>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                    <p className="text-red-700 font-medium mb-2">
                      {importResult.errors.length} errori durante l'importazione:
                    </p>
                    <div className="max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} className="text-sm text-red-600">
                          Riga {err.row}: {err.message}
                        </p>
                      ))}
                      {importResult.errors.length > 5 && (
                        <p className="text-sm text-red-500 font-medium mt-2">
                          ... e altri {importResult.errors.length - 5} errori
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            <div>
              {(step === "mapping" || step === "preview" || step === "warnings") && (
                <button
                  onClick={() => {
                    if (step === "mapping") {
                      setStep("upload");
                      setFile(null);
                      setParseResult(null);
                      setColumnMapping({});
                    } else if (step === "preview") {
                      setStep("mapping");
                    } else if (step === "warnings") {
                      setStep("preview");
                      setFuzzyWarnings([]);
                      setCorrections({});
                    }
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                  <ArrowLeft size={18} />
                  Indietro
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                {step === "complete" ? "Chiudi" : "Annulla"}
              </button>

              {step === "mapping" && (
                <button
                  onClick={handleProceedToPreview}
                  className="flex items-center gap-2 px-6 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
                >
                  Continua
                  <ArrowRight size={18} />
                </button>
              )}

              {step === "preview" && validatedData && validatedData.validLeads.length > 0 && (
                <button
                  onClick={handleValidateBeforeImport}
                  disabled={isValidating}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Validazione...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Importa {validatedData.validLeads.length} Lead
                    </>
                  )}
                </button>
              )}

              {step === "warnings" && validatedData && validatedData.validLeads.length > 0 && (
                <WarningsImportButton 
                  fuzzyWarnings={fuzzyWarnings}
                  corrections={corrections}
                  getCorrectionKey={getCorrectionKey}
                  onImport={handleImport}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
