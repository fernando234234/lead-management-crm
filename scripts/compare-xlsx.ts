import * as XLSX from 'xlsx';

// Load both files
const cleanedWb = XLSX.readFile('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.xlsx');
const originalWb = XLSX.readFile('C:\\Users\\ferna\\Downloads\\Contratti  JfContract (3) (1).xlsx');

// Get first sheet from each
const cleanedSheet = cleanedWb.Sheets[cleanedWb.SheetNames[0]];
const originalSheet = originalWb.Sheets[originalWb.SheetNames[0]];

// Convert to JSON
const cleanedData = XLSX.utils.sheet_to_json(cleanedSheet) as any[];
const originalData = XLSX.utils.sheet_to_json(originalSheet) as any[];

console.log(`=== FILE COMPARISON ===`);
console.log(`Original file rows: ${originalData.length}`);
console.log(`Cleaned file rows: ${cleanedData.length}`);
console.log(`Difference: ${originalData.length - cleanedData.length} rows\n`);

// Get student names from each (first column)
const cleanedStudents = new Set<string>();
const originalStudents = new Set<string>();

// Find the student column name
const cleanedCols = Object.keys(cleanedData[0] || {});
const originalCols = Object.keys(originalData[0] || {});

console.log(`Cleaned columns: ${cleanedCols.join(', ')}`);
console.log(`Original columns: ${originalCols.join(', ')}\n`);

// Use first column as student name
const cleanedStudentCol = cleanedCols[0];
const originalStudentCol = originalCols[0];

for (const row of cleanedData) {
  const name = String(row[cleanedStudentCol] || '').trim().toLowerCase();
  if (name) cleanedStudents.add(name);
}

for (const row of originalData) {
  const name = String(row[originalStudentCol] || '').trim().toLowerCase();
  if (name) originalStudents.add(name);
}

// Find rows in original but not in cleaned
const removedStudents: string[] = [];
for (const name of originalStudents) {
  if (!cleanedStudents.has(name)) {
    removedStudents.push(name);
  }
}

// Find rows in cleaned but not in original
const addedStudents: string[] = [];
for (const name of cleanedStudents) {
  if (!originalStudents.has(name)) {
    addedStudents.push(name);
  }
}

console.log(`=== STUDENTS REMOVED (in original, not in cleaned) ===`);
console.log(`Count: ${removedStudents.length}`);
removedStudents.forEach(s => console.log(`  - ${s}`));

console.log(`\n=== STUDENTS ADDED (in cleaned, not in original) ===`);
console.log(`Count: ${addedStudents.length}`);
addedStudents.forEach(s => console.log(`  - ${s}`));

// Show actual removed rows with details
console.log(`\n=== REMOVED ROWS DETAILS ===`);
for (const row of originalData) {
  const name = String(row[originalStudentCol] || '').trim().toLowerCase();
  if (removedStudents.includes(name)) {
    console.log(`  ${row[originalStudentCol]} - ${row['Corso'] || row[originalCols[1]]} - ${row['Commerciale'] || row[originalCols[7]]}`);
  }
}
