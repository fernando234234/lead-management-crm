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

// Count unique students
const uniqueStudents = new Set<string>();
const byCommercial = new Map<string, number>();

for (const record of records) {
  const studentName = record['Studente']?.trim();
  const commercial = record['Commerciale']?.trim();
  
  if (studentName) {
    uniqueStudents.add(studentName.toLowerCase());
    
    if (commercial) {
      byCommercial.set(commercial, (byCommercial.get(commercial) || 0) + 1);
    }
  }
}

console.log(`Unique students: ${uniqueStudents.size}`);

console.log(`\n=== BY COMMERCIAL ===`);
[...byCommercial.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([comm, count]) => {
    console.log(`  ${comm}: ${count}`);
  });

// Show first 10 records
console.log(`\n=== FIRST 10 RECORDS ===`);
records.slice(0, 10).forEach((r: any, i: number) => {
  console.log(`${i + 1}. ${r['Studente']} - ${r['Corso']} - ${r['Commerciale']}`);
});
