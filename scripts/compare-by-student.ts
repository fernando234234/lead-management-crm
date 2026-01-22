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

// Get column names
const newCols = Object.keys(newData[0] || {});
const studentColNew = newCols[0]; // First column is student name
const corsoColNew = newCols[1]; // Second column is course

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z\s]/g, ''); // Remove non-alpha chars
}

// Build student sets - just names, ignoring course for now
const newStudents = new Map<string, any[]>();
const cleanedStudents = new Map<string, any[]>();

for (const row of newData) {
  const student = String(row[studentColNew] || '').trim();
  if (student && student.toLowerCase() !== 'studente' && !student.toLowerCase().includes('contratti')) {
    const key = normalizeName(student);
    if (!newStudents.has(key)) {
      newStudents.set(key, []);
    }
    newStudents.get(key)!.push({
      name: student,
      corso: row[corsoColNew]
    });
  }
}

for (const row of cleanedData) {
  const student = String(row['Studente'] || '').trim();
  if (student) {
    const key = normalizeName(student);
    if (!cleanedStudents.has(key)) {
      cleanedStudents.set(key, []);
    }
    cleanedStudents.get(key)!.push({
      name: student,
      corso: row['Corso'],
      commercial: row['Commerciale'],
      dataStipula: row['Data Stipula']
    });
  }
}

console.log(`New file unique students: ${newStudents.size}`);
console.log(`Cleaned file unique students: ${cleanedStudents.size}`);

// Find students in NEW but not in CLEANED
const newOnly: any[] = [];
for (const [key, records] of newStudents) {
  if (!cleanedStudents.has(key)) {
    newOnly.push(...records);
  }
}

// Find students in CLEANED but not in NEW  
const cleanedOnly: any[] = [];
for (const [key, records] of cleanedStudents) {
  if (!newStudents.has(key)) {
    cleanedOnly.push(...records);
  }
}

console.log(`\n=== STUDENTS IN NEW FILE ONLY (${newOnly.length}) ===`);
newOnly.forEach(s => {
  console.log(`  + ${s.name} - ${s.corso}`);
});

console.log(`\n=== STUDENTS IN CLEANED FILE ONLY (${cleanedOnly.length}) ===`);
cleanedOnly.forEach(s => {
  console.log(`  - ${s.name} - ${s.corso} - ${s.commercial} - ${s.dataStipula}`);
});

// Now check for students with DIFFERENT number of contracts
console.log(`\n=== STUDENTS WITH DIFFERENT CONTRACT COUNTS ===`);
for (const [key, newRecords] of newStudents) {
  const cleanedRecords = cleanedStudents.get(key);
  if (cleanedRecords && newRecords.length !== cleanedRecords.length) {
    console.log(`  ${newRecords[0].name}: NEW has ${newRecords.length}, CLEANED has ${cleanedRecords.length}`);
  }
}
