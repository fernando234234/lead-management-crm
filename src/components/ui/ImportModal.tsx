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
} from "lucide-react";
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
  isDemoMode?: boolean;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "complete";

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

export default function ImportModal({
  onClose,
  onImportComplete,
  courses,
  campaigns,
  isDemoMode = false,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Import handler
  const handleImport = async () => {
    if (!validatedData || validatedData.validLeads.length === 0) return;

    setStep("importing");
    setImportProgress(0);

    if (isDemoMode) {
      // Simulate import in demo mode
      const total = validatedData.validLeads.length;
      for (let i = 0; i <= total; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setImportProgress(Math.round((i / total) * 100));
      }

      const result = {
        success: total,
        errors: [] as { row: number; message: string }[],
      };
      setImportResult(result);
      setStep("complete");
      return;
    }

    try {
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: validatedData.validLeads,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'importazione");
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
              <p className="text-red-700 text-sm">{error}</p>
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
              {(step === "mapping" || step === "preview") && (
                <button
                  onClick={() => {
                    if (step === "mapping") {
                      setStep("upload");
                      setFile(null);
                      setParseResult(null);
                      setColumnMapping({});
                    } else {
                      setStep("mapping");
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
                  onClick={handleImport}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Upload size={18} />
                  Importa {validatedData.validLeads.length} Lead
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
