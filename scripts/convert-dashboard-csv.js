/**
 * Convert Dashboard Commerciale CSV to CRM Import Format
 * 
 * Input columns:
 * Data, Nome Leads, Commerciale, Corso, Sorgente, Campagna, Lead generati, 
 * Lead Validi, Contattati, Tel x esito, Iscrizioni, Spesa ads, Ricavi
 * 
 * Output: JSON array matching ImportLead interface
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INPUT_FILE = process.argv[2] || path.join(__dirname, '..', '..', 'Downloads', 'Dashboard_Commerciale_Formazione (4) - Dati (2).csv');
const OUTPUT_FILE = path.join(__dirname, 'import-leads.json');
const CUTOFF_DATE = new Date('2026-01-21'); // Only import leads AFTER this date
const MAX_DATE = new Date('2026-01-31'); // Only import leads BEFORE end of January 2026

// Parse DD/MM/YYYY date format (strict - only numeric dates)
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) return null;
  
  // Check all parts are numeric
  const [dayStr, monthStr, yearStr] = parts;
  if (!/^\d+$/.test(dayStr) || !/^\d+$/.test(monthStr) || !/^\d+$/.test(yearStr)) {
    return null;
  }
  
  const [day, month, year] = parts.map(Number);
  
  // Basic validation
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2020 || year > 2030) {
    return null;
  }
  
  return new Date(year, month - 1, day);
}

// Capitalize name properly (e.g., "MARIO ROSSI" -> "Mario Rossi")
function capitalizeName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

// Convert SI/NO/empty to boolean
function parseSiNo(value) {
  if (!value) return false;
  const v = value.trim().toUpperCase();
  return v === 'SI' || v === 'SÌ' || v === 'YES' || v === '1';
}

// Derive status from the binary fields
function deriveStatus(iscrizioni, contattati, telEsito) {
  // Priority: ISCRITTO > CONTATTATO > NUOVO
  if (parseSiNo(iscrizioni)) return 'ISCRITTO';
  if (parseSiNo(contattati) || parseSiNo(telEsito)) return 'CONTATTATO';
  return 'NUOVO';
}

// Parse a CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Main conversion function
async function convertCSV() {
  console.log('Reading CSV from:', INPUT_FILE);
  
  // Read and parse CSV
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`Total lines (including header): ${lines.length}`);
  
  // Parse header
  const header = parseCSVLine(lines[0]);
  console.log('Headers:', header);
  
  // Column indices (based on header analysis)
  const COL = {
    DATA: 0,            // Data
    NOME: 1,            // Nome Leads
    COMMERCIALE: 2,     // Commerciale
    CORSO: 3,           // Corso
    SORGENTE: 4,        // Sorgente
    CAMPAGNA: 5,        // Campagna
    LEAD_GEN: 6,        // Lead generati
    LEAD_VALIDI: 7,     // Lead Validi
    CONTATTATI: 8,      // Contattati
    TEL_ESITO: 9,       // Tel x esito
    ISCRIZIONI: 10,     // Iscrizioni
    SPESA_ADS: 11,      // Spesa ads
    RICAVI: 12          // Ricavi
  };
  
  const leads = [];
  let skipped = { emptyRows: 0, beforeCutoff: 0, noName: 0 };
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line || line.trim() === '' || line.match(/^,+$/)) {
      skipped.emptyRows++;
      continue;
    }
    
    const fields = parseCSVLine(line);
    
    // Skip if no date (junk row)
    const dateStr = fields[COL.DATA];
    if (!dateStr || dateStr.trim() === '') {
      skipped.emptyRows++;
      continue;
    }
    
    // Parse and filter by date
    const date = parseDate(dateStr);
    if (!date) {
      skipped.emptyRows++;
      continue;
    }
    
    // Only include leads AFTER cutoff date AND before max date (Jan 2026 only)
    if (date <= CUTOFF_DATE || date > MAX_DATE) {
      skipped.beforeCutoff++;
      continue;
    }
    
    // Get name - skip if empty
    const name = capitalizeName(fields[COL.NOME]);
    if (!name) {
      skipped.noName++;
      continue;
    }
    
    // Extract fields
    const commerciale = fields[COL.COMMERCIALE]?.trim() || null;
    const corso = fields[COL.CORSO]?.trim() || null;
    const campagna = fields[COL.CAMPAGNA]?.trim() || null;
    const isTarget = parseSiNo(fields[COL.LEAD_VALIDI]);
    const contattati = fields[COL.CONTATTATI];
    const telEsito = fields[COL.TEL_ESITO];
    const iscrizioni = fields[COL.ISCRIZIONI];
    const ricavi = parseFloat(fields[COL.RICAVI]) || 0;
    
    // Derive status
    const status = deriveStatus(iscrizioni, contattati, telEsito);
    
    // Build lead object matching ImportLead interface
    const lead = {
      name: name,
      email: null,
      phone: null,
      courseName: corso,
      campaignName: campagna,
      status: status,
      notes: null,
      assignedToName: commerciale,
      // Extra fields for extended import (if API supports them)
      _extra: {
        originalDate: dateStr,
        isTarget: isTarget,
        contacted: parseSiNo(contattati),
        enrolled: parseSiNo(iscrizioni),
        revenue: ricavi > 0 ? ricavi : null,
        callOutcome: parseSiNo(telEsito) ? 'POSITIVO' : null
      }
    };
    
    leads.push(lead);
  }
  
  console.log('\n--- Conversion Summary ---');
  console.log(`Total data rows processed: ${lines.length - 1}`);
  console.log(`Skipped - Empty rows: ${skipped.emptyRows}`);
  console.log(`Skipped - Before cutoff (${CUTOFF_DATE.toISOString().split('T')[0]}): ${skipped.beforeCutoff}`);
  console.log(`Skipped - No name: ${skipped.noName}`);
  console.log(`Leads to import: ${leads.length}`);
  
  // Status breakdown
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
  console.log('\nStatus breakdown:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Commercial breakdown
  const commercialCounts = leads.reduce((acc, lead) => {
    const name = lead.assignedToName || '(Non assegnato)';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  console.log('\nCommercial breakdown:');
  Object.entries(commercialCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    });
  
  // Write output
  const output = { leads };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);
  
  // Also output a sample
  console.log('\n--- Sample leads (first 3) ---');
  leads.slice(0, 3).forEach((lead, i) => {
    console.log(`\n[${i + 1}] ${lead.name}`);
    console.log(`    Corso: ${lead.courseName || 'N/A'}`);
    console.log(`    Commerciale: ${lead.assignedToName || 'N/A'}`);
    console.log(`    Status: ${lead.status}`);
  });
  
  return leads;
}

convertCSV().catch(console.error);
