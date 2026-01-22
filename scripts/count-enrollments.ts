import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const data = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
  columns: true, 
  skip_empty_lines: true, 
  relax_quotes: true, 
  relax_column_count: true 
});

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// Count unique name+course combinations
const combos = new Set<string>();
const testUsers: string[] = [];
const realDuplicates: string[] = [];

for (const row of data) {
  const name = normalize(row['Studente']);
  const course = normalize(row['Corso']);
  const key = `${name}|${course}`;
  
  if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
    testUsers.push(`${row['Studente']} | ${row['Corso']}`);
    continue;
  }
  
  if (combos.has(key)) {
    realDuplicates.push(`${row['Studente']} | ${row['Corso']}`);
  } else {
    combos.add(key);
  }
}

console.log('Total rows:', data.length);
console.log('Test users skipped:', testUsers.length);
console.log('Real duplicates (same name+course twice):', realDuplicates.length);
if (realDuplicates.length > 0) {
  console.log('  Duplicates:');
  realDuplicates.forEach(d => console.log('    ' + d));
}
console.log('');
console.log('==> UNIQUE ENROLLMENTS TO SYNC:', combos.size);
