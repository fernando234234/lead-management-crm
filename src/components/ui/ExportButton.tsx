"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { exportToCSV, exportToExcel, ExportColumn, generateExportFilename } from "@/lib/export";

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  formats?: ("csv" | "excel")[];
  buttonClassName?: string;
  disabled?: boolean;
}

export default function ExportButton({
  data,
  columns,
  filename,
  formats = ["csv", "excel"],
  buttonClassName = "",
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: "csv" | "excel") => {
    if (data.length === 0) {
      alert("Nessun dato da esportare");
      setIsOpen(false);
      return;
    }

    setIsExporting(true);
    
    try {
      const exportFilename = generateExportFilename(filename);
      
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (format === "csv") {
        exportToCSV(data, exportFilename, columns);
      } else {
        exportToExcel(data, exportFilename, columns);
      }
    } catch (error) {
      console.error("Errore durante l'esportazione:", error);
      alert("Errore durante l'esportazione. Riprova.");
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const baseButtonClass = `
    flex items-center gap-2 px-4 py-2 
    bg-gray-100 text-gray-700 rounded-lg 
    hover:bg-gray-200 transition
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || data.length === 0}
        className={`${buttonClassName || baseButtonClass} focus:outline-none focus:ring-2 focus:ring-gray-400`}
        aria-label={data.length === 0 ? "Nessun dato da esportare" : `Esporta ${data.length} elementi`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {isExporting ? (
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
        ) : (
          <Download size={18} aria-hidden="true" />
        )}
        <span>{isExporting ? "Esportazione..." : "Esporta"}</span>
      </button>

      {isOpen && !isExporting && (
        <div 
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
          role="menu"
          aria-label="Formati di esportazione"
        >
          {formats.includes("csv") && (
            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition focus:outline-none focus:bg-gray-100"
              role="menuitem"
            >
              <FileText size={18} className="text-green-600" aria-hidden="true" />
              <span>Esporta CSV</span>
            </button>
          )}
          {formats.includes("excel") && (
            <button
              onClick={() => handleExport("excel")}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition border-t border-gray-100 focus:outline-none focus:bg-gray-100"
              role="menuitem"
            >
              <FileSpreadsheet size={18} className="text-emerald-600" aria-hidden="true" />
              <span>Esporta Excel</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
