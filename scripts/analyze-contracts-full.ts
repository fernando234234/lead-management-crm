import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const csvContent = fs.readFileSync('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.csv', 'utf-8');

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true
});

console.log(`Total records parsed: ${records.length}`);

// Known professors to exclude (as students, not as commercials)
const PROFESSORS = [
  'manuel alvaro',
  'salvatore sterlino',
  'sergio pescucci',
  'alessio cardelli',
  'pierfilippo ariano',
  'andrea predari',
  'gianluca checchia'
];

// Count records excluding professors as students and Benedetta as commercial
let validContracts = 0;
let excludedProfessors = 0;
let excludedBenedetta = 0;
const uniqueValidStudents = new Set<string>();

for (const record of records) {
  const studentName = record['Studente']?.trim().toLowerCase();
  const commercial = record['Commerciale']?.trim().toLowerCase();
  
  if (!studentName) continue;
  
  // Check if student is a professor
  const isProfessor = PROFESSORS.some(p => studentName.includes(p) || p.includes(studentName));
  
  // Check if commercial is Benedetta
  const isBenedetta = commercial?.includes('benedetta');
  
  if (isProfessor) {
    excludedProfessors++;
    console.log(`  Excluded professor: ${record['Studente']}`);
  } else if (isBenedetta) {
    excludedBenedetta++;
    console.log(`  Excluded Benedetta's: ${record['Studente']}`);
  } else {
    validContracts++;
    uniqueValidStudents.add(studentName);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total records: ${records.length}`);
console.log(`Excluded (professors as students): ${excludedProfessors}`);
console.log(`Excluded (Benedetta's contracts): ${excludedBenedetta}`);
console.log(`Valid contracts: ${validContracts}`);
console.log(`Unique valid students: ${uniqueValidStudents.size}`);
