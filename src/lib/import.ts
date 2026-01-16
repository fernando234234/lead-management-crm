import * as XLSX from 'xlsx';

export interface ImportRow {
  nome: string;
  email?: string;
  telefono?: string;
  corso?: string;
  campagna?: string;
  stato?: string;
  note?: string;
  assignedTo?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

export interface ValidatedLead {
  name: string;
  email: string | null;
  phone: string | null;
  courseName: string | null;
  campaignName: string | null;
  status: string;
  notes: string | null;
  assignedToEmail: string | null;
}

export interface ValidationResult {
  validLeads: ValidatedLead[];
  errors: ValidationError[];
}

// Valid statuses
const VALID_STATUSES = ['NUOVO', 'CONTATTATO', 'IN_TRATTATIVA', 'ISCRITTO', 'PERSO'];

/**
 * Parse CSV file content
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          resolve({ headers: [], rows: [], errors: ['Il file è vuoto'] });
          return;
        }

        // Handle different line endings
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        
        if (lines.length < 2) {
          resolve({ headers: [], rows: [], errors: ['Il file non contiene dati'] });
          return;
        }

        // Parse header row
        const headers = parseCSVRow(lines[0]);
        
        if (headers.length === 0) {
          resolve({ headers: [], rows: [], errors: ['Intestazioni non trovate'] });
          return;
        }

        // Parse data rows
        const rows: Record<string, string>[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines

          const values = parseCSVRow(line);
          
          if (values.length !== headers.length) {
            errors.push(`Riga ${i + 1}: numero di colonne non corrispondente`);
            continue;
          }

          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header.toLowerCase().trim()] = values[index]?.trim() || '';
          });
          rows.push(row);
        }

        resolve({ headers, rows, errors });
      } catch (error) {
        reject(new Error('Errore durante la lettura del file CSV'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Errore durante la lettura del file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Parse a single CSV row, handling quoted values
 */
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current);

  return result;
}

/**
 * Parse Excel file
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({ headers: [], rows: [], errors: ['Nessun foglio trovato nel file Excel'] });
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers (header: 1 returns array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        }) as unknown[][];

        if (jsonData.length < 2) {
          resolve({ headers: [], rows: [], errors: ['Il file non contiene dati'] });
          return;
        }

        // First row is headers
        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
        
        if (headers.length === 0 || headers.every(h => !h)) {
          resolve({ headers: [], rows: [], errors: ['Intestazioni non trovate'] });
          return;
        }

        // Rest are data rows
        const rows: Record<string, string>[] = [];
        const errors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i] as unknown[];
          
          // Skip completely empty rows
          if (!rowData || rowData.every(cell => !cell)) continue;

          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            const value = rowData[index];
            row[header.toLowerCase().trim()] = value !== undefined && value !== null ? String(value).trim() : '';
          });
          rows.push(row);
        }

        resolve({ headers, rows, errors });
      } catch (error) {
        reject(new Error('Errore durante la lettura del file Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Errore durante la lettura del file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate parsed rows and convert to lead data
 */
export function validateLeadData(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>
): ValidationResult {
  const validLeads: ValidatedLead[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because row 1 is headers, index is 0-based

    // Get mapped values
    const nome = getMappedValue(row, columnMapping, 'nome');
    const email = getMappedValue(row, columnMapping, 'email');
    const telefono = getMappedValue(row, columnMapping, 'telefono');
    const corso = getMappedValue(row, columnMapping, 'corso');
    const campagna = getMappedValue(row, columnMapping, 'campagna');
    const stato = getMappedValue(row, columnMapping, 'stato');
    const note = getMappedValue(row, columnMapping, 'note');
    const assignedTo = getMappedValue(row, columnMapping, 'assignedTo');

    // Validate required fields
    if (!nome || nome.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'nome',
        message: 'Il campo "nome" è obbligatorio'
      });
      return; // Skip this row
    }

    // Validate email format if provided
    if (email && email.trim() && !isValidEmail(email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: `Email non valida: "${email}"`
      });
    }

    // Validate status if provided
    let normalizedStatus = 'NUOVO';
    if (stato && stato.trim()) {
      const upperStatus = stato.toUpperCase().replace(/\s+/g, '_');
      if (VALID_STATUSES.includes(upperStatus)) {
        normalizedStatus = upperStatus;
      } else {
        errors.push({
          row: rowNumber,
          field: 'stato',
          message: `Stato non valido: "${stato}". Valori accettati: ${VALID_STATUSES.join(', ')}`
        });
        normalizedStatus = 'NUOVO'; // Default to NUOVO if invalid
      }
    }

    // Add valid lead
    validLeads.push({
      name: nome.trim(),
      email: email?.trim() || null,
      phone: telefono?.trim() || null,
      courseName: corso?.trim() || null,
      campaignName: campagna?.trim() || null,
      status: normalizedStatus,
      notes: note?.trim() || null,
      assignedToEmail: assignedTo?.trim() || null
    });
  });

  return { validLeads, errors };
}

/**
 * Get value from row using column mapping
 */
function getMappedValue(
  row: Record<string, string>,
  mapping: Record<string, string>,
  field: string
): string | undefined {
  const sourceColumn = mapping[field];
  if (!sourceColumn) return undefined;
  
  // Try exact match first
  if (row[sourceColumn] !== undefined) {
    return row[sourceColumn];
  }
  
  // Try lowercase
  if (row[sourceColumn.toLowerCase()] !== undefined) {
    return row[sourceColumn.toLowerCase()];
  }
  
  return undefined;
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Detect file type from file extension
 */
export function getFileType(file: File): 'csv' | 'excel' | 'unknown' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  return 'unknown';
}

/**
 * Parse file based on type
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = getFileType(file);
  
  switch (fileType) {
    case 'csv':
      return parseCSV(file);
    case 'excel':
      return parseExcel(file);
    default:
      throw new Error('Formato file non supportato. Usa CSV o Excel (.xlsx, .xls)');
  }
}

/**
 * Auto-detect column mapping based on common header names
 */
export function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  // Define common variations for each field
  const fieldVariations: Record<string, string[]> = {
    nome: ['nome', 'name', 'nominativo', 'nome completo', 'full name', 'nome e cognome'],
    email: ['email', 'e-mail', 'mail', 'posta elettronica', 'indirizzo email'],
    telefono: ['telefono', 'phone', 'tel', 'cellulare', 'mobile', 'numero telefono', 'numero'],
    corso: ['corso', 'course', 'programma', 'nome corso', 'corso di interesse'],
    campagna: ['campagna', 'campaign', 'fonte', 'source', 'origine', 'provenienza'],
    stato: ['stato', 'status', 'stato lead', 'lead status'],
    note: ['note', 'notes', 'osservazioni', 'commenti', 'annotazioni'],
    assignedTo: ['assegnato', 'assigned', 'commerciale', 'responsabile', 'assegnato a', 'assigned to']
  };

  // Match headers to fields
  for (const [field, variations] of Object.entries(fieldVariations)) {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      if (variations.includes(normalizedHeader)) {
        mapping[field] = header;
        break;
      }
    }
  }

  return mapping;
}
