import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync } from 'fs';

const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
  columns: true, 
  skip_empty_lines: true, 
  relax_quotes: true,
  relax_column_count: true
});

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

console.log('Total rows in source CSV:', data.length);

// Track unique enrollments - keep FIRST occurrence
const seen = new Set<string>();
const validRows: any[] = [];
let testUsers = 0;
let duplicates = 0;

for (const row of data) {
  const name = normalize(row['Studente']);
  const course = normalize(row['Corso']);
  const key = `${name}|${course}`;
  
  // Skip test users
  if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
    testUsers++;
    continue;
  }
  
  // Skip duplicates
  if (seen.has(key)) {
    duplicates++;
    continue;
  }
  
  seen.add(key);
  validRows.push(row);
}

console.log(`Test users skipped: ${testUsers}`);
console.log(`Duplicates skipped: ${duplicates}`);
console.log(`Valid rows: ${validRows.length}`);

// Write to new CSV manually
const headers = Object.keys(validRows[0]);
const csvLines = [
  headers.join(','),
  ...validRows.map(row => 
    headers.map(h => {
      const val = (row[h] || '').toString();
      // Quote if contains comma, newline, or quote
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  )
];

const outputPath = 'C:/Users/ferna/Downloads/Contratti_VALID_485.csv';
writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');

console.log(`\nSaved to: ${outputPath}`);
