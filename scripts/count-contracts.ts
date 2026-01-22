import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true
});

console.log(`Total records (rows) parsed: ${records.length}`);

// Known professors to exclude as students
const PROFESSORS = [
  'manuel alvaro',
  'salvatore sterlino',
];

let validContracts = 0;
let excludedProfessors = 0;
let excludedBenedetta = 0;

const excludedList: string[] = [];

for (const record of records as any[]) {
  const studentName = record['Studente']?.trim().toLowerCase();
  const commercial = record['Commerciale']?.trim().toLowerCase();
  
  if (!studentName) continue;
  
  // Check if student is a professor
  const isProfessor = PROFESSORS.some(p => studentName.includes(p));
  
  // Check if commercial is Benedetta
  const isBenedetta = commercial?.includes('benedetta');
  
  if (isProfessor) {
    excludedProfessors++;
    excludedList.push(`Professor: ${record['Studente']}`);
  } else if (isBenedetta) {
    excludedBenedetta++;
    excludedList.push(`Benedetta: ${record['Studente']}`);
  } else {
    validContracts++;
  }
}

console.log(`\n=== EXCLUSIONS ===`);
excludedList.forEach(e => console.log(`  ${e}`));

console.log(`\n=== FINAL COUNT ===`);
console.log(`Total rows: ${records.length}`);
console.log(`Excluded professors: ${excludedProfessors}`);
console.log(`Excluded Benedetta: ${excludedBenedetta}`);
console.log(`Valid contract ROWS: ${validContracts}`);
