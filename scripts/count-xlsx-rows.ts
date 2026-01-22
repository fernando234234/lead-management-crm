import * as XLSX from 'xlsx';

// Load cleaned xlsx
const cleanedWb = XLSX.readFile('C:\\Users\\ferna\\Downloads\\Contratti_CLEANED.xlsx');
const cleanedSheet = cleanedWb.Sheets[cleanedWb.SheetNames[0]];
const cleanedData = XLSX.utils.sheet_to_json(cleanedSheet) as any[];

console.log(`=== CLEANED XLSX ===`);
console.log(`Total data rows: ${cleanedData.length}`);

// Count by commercial
const byCommercial = new Map<string, number>();
const byStudent = new Map<string, number>();

for (const row of cleanedData) {
  const student = String(row['Studente'] || '').trim();
  const commercial = String(row['Commerciale'] || '').trim();
  
  if (student) {
    byStudent.set(student.toLowerCase(), (byStudent.get(student.toLowerCase()) || 0) + 1);
  }
  if (commercial) {
    byCommercial.set(commercial, (byCommercial.get(commercial) || 0) + 1);
  }
}

console.log(`Unique students: ${byStudent.size}`);

console.log(`\n=== BY COMMERCIAL ===`);
[...byCommercial.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([comm, count]) => {
    console.log(`  ${comm}: ${count}`);
  });

// Students with multiple contracts
const multipleContracts = [...byStudent.entries()].filter(([_, count]) => count > 1);
console.log(`\n=== STUDENTS WITH MULTIPLE CONTRACTS (${multipleContracts.length}) ===`);
multipleContracts.slice(0, 20).forEach(([name, count]) => {
  console.log(`  ${name}: ${count} contracts`);
});
if (multipleContracts.length > 20) {
  console.log(`  ... and ${multipleContracts.length - 20} more`);
}

// Total sum
const totalByCommercial = [...byCommercial.values()].reduce((a, b) => a + b, 0);
console.log(`\nTotal contracts (sum by commercial): ${totalByCommercial}`);
