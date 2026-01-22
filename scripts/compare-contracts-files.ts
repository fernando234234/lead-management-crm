import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

// Load the NEW xlsx
const newWb = XLSX.readFile('C:\\Users\\ferna\\Desktop\\EastSIde-Project\\v3\\IMMAGINI ORIGINALI\\Contratti  JfContract (6).xlsx');
const newSheet = newWb.Sheets[newWb.SheetNames[0]];
const newData = XLSX.utils.sheet_to_json(newSheet) as any[];

// Load the CLEANED csv
const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');
const cleanedData = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true
}) as any[];

console.log(`=== FILE COUNTS ===`);
console.log(`New xlsx rows: ${newData.length}`);
console.log(`Cleaned csv rows: ${cleanedData.length}`);
console.log(`Difference: ${newData.length - cleanedData.length} rows\n`);

// Show columns from new file
console.log(`=== NEW FILE COLUMNS ===`);
const newCols = Object.keys(newData[0] || {});
console.log(newCols.join(', '));

// Find student column in new file
let studentColNew = newCols.find(c => c.toLowerCase().includes('studente')) || newCols[0];
let corsoColNew = newCols.find(c => c.toLowerCase() === 'corso') || newCols[1];
let commercialColNew = newCols.find(c => c.toLowerCase().includes('commerciale'));
let dataStipulaColNew = newCols.find(c => c.toLowerCase().includes('stipula'));

console.log(`\nStudent col: "${studentColNew}"`);
console.log(`Corso col: "${corsoColNew}"`);
console.log(`Commercial col: "${commercialColNew}"`);
console.log(`Data Stipula col: "${dataStipulaColNew}"`);

// Build sets of student+course combinations
function normalizeKey(student: string, corso: string): string {
  return `${student.toLowerCase().trim()}|${corso.toLowerCase().trim()}`;
}

const newContracts = new Map<string, any>();
const cleanedContracts = new Map<string, any>();

for (const row of newData) {
  const student = String(row[studentColNew] || '').trim();
  const corso = String(row[corsoColNew] || '').trim();
  if (student && student.toLowerCase() !== 'studente') {
    const key = normalizeKey(student, corso);
    newContracts.set(key, { 
      student, 
      corso, 
      commercial: commercialColNew ? row[commercialColNew] : '', 
      dataStipula: dataStipulaColNew ? row[dataStipulaColNew] : '' 
    });
  }
}

for (const row of cleanedData) {
  const student = String(row['Studente'] || '').trim();
  const corso = String(row['Corso'] || '').trim();
  if (student) {
    const key = normalizeKey(student, corso);
    cleanedContracts.set(key, { student, corso, commercial: row['Commerciale'], dataStipula: row['Data Stipula'] });
  }
}

console.log(`\n=== UNIQUE CONTRACTS ===`);
console.log(`New file: ${newContracts.size}`);
console.log(`Cleaned file: ${cleanedContracts.size}`);

// Find contracts in NEW but not in CLEANED (additions)
const additions: any[] = [];
for (const [key, data] of newContracts) {
  if (!cleanedContracts.has(key)) {
    additions.push(data);
  }
}

// Find contracts in CLEANED but not in NEW (removals)
const removals: any[] = [];
for (const [key, data] of cleanedContracts) {
  if (!newContracts.has(key)) {
    removals.push(data);
  }
}

console.log(`\n=== IN NEW BUT NOT IN CLEANED (${additions.length} additions) ===`);
additions.forEach(a => {
  console.log(`  + ${a.student} - ${a.corso} - ${a.commercial} - ${a.dataStipula}`);
});

console.log(`\n=== IN CLEANED BUT NOT IN NEW (${removals.length} removals) ===`);
removals.forEach(r => {
  console.log(`  - ${r.student} - ${r.corso} - ${r.commercial} - ${r.dataStipula}`);
});
