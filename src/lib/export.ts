import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Escapes special characters for CSV format
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Gets a nested value from an object using dot notation
 * e.g., getValue(obj, 'course.name') returns obj.course.name
 */
function getValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      return '';
    }
    value = value[key];
  }
  
  return value ?? '';
}

/**
 * Formats a value for export (handles dates, booleans, etc.)
 */
function formatValue(value: any, key: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Sì' : 'No';
  }
  
  // Handle dates (ISO strings or Date objects)
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
    if (typeof value === 'string' && value.includes('T')) {
      try {
        return new Date(value).toLocaleDateString('it-IT');
      } catch {
        return value;
      }
    }
    if (value instanceof Date) {
      return value.toLocaleDateString('it-IT');
    }
  }
  
  // Handle numbers for currency
  if (typeof value === 'number') {
    // Check if it looks like currency (has decimals or is > 1)
    if (key.toLowerCase().includes('cost') || 
        key.toLowerCase().includes('budget') || 
        key.toLowerCase().includes('spent') ||
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('revenue') ||
        key.toLowerCase().includes('cpl')) {
      return value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toString();
  }
  
  return String(value);
}

/**
 * Export data to CSV format and trigger download
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns: ExportColumn[]
): void {
  if (data.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  // Build CSV header
  const header = columns.map(col => escapeCSVValue(col.label)).join(',');
  
  // Build CSV rows
  const rows = data.map(item => {
    return columns.map(col => {
      const rawValue = getValue(item, col.key);
      const formattedValue = formatValue(rawValue, col.key);
      return escapeCSVValue(formattedValue);
    }).join(',');
  });
  
  // Combine header and rows
  const csvContent = [header, ...rows].join('\r\n');
  
  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Trigger download
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format (.xlsx) and trigger download
 */
export function exportToExcel(
  data: any[],
  filename: string,
  columns: ExportColumn[]
): void {
  if (data.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  // Prepare data for Excel
  const excelData = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      const rawValue = getValue(item, col.key);
      row[col.label] = formatValue(rawValue, col.key);
    });
    return row;
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths based on header lengths
  const colWidths = columns.map(col => ({
    wch: Math.max(col.label.length + 2, 15)
  }));
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dati');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Trigger download
  downloadBlob(blob, `${filename}.xlsx`);
}

/**
 * Helper function to trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with current date
 */
export function generateExportFilename(baseName: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${baseName}_${date}`;
}
