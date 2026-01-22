import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
  columns: true, 
  skip_empty_lines: true, 
  relax_quotes: true,
  relax_column_count: true
});

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

console.log('Total rows in CSV:', data.length);
console.log('\n');

// Track what we skip
const testUsers: any[] = [];
const duplicates: any[] = [];
const enrolled = new Map<string, any>();

for (const row of data) {
  const name = normalize(row['Studente']);
  const course = normalize(row['Corso']);
  const key = `${name}|${course}`;
  
  // Test users
  if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) {
    testUsers.push(row);
    continue;
  }
  
  // Check for duplicates
  if (enrolled.has(key)) {
    duplicates.push({
      row,
      firstOccurrence: enrolled.get(key)
    });
  } else {
    enrolled.set(key, row);
  }
}

console.log('=== TEST USERS (excluded) ===');
console.log(`Count: ${testUsers.length}`);
testUsers.forEach(r => {
  console.log(`  ${r['Studente']} | ${r['Corso']} | ${r['Commerciale']} | ${r['DataStipula']}`);
});

console.log('\n=== DUPLICATES (same name+course twice in CSV) ===');
console.log(`Count: ${duplicates.length}`);
duplicates.forEach(d => {
  console.log(`  ${d.row['Studente']} | ${d.row['Corso']}`);
  console.log(`    First: Commerciale=${d.firstOccurrence['Commerciale']}, DataStipula=${d.firstOccurrence['DataStipula']}`);
  console.log(`    Dup:   Commerciale=${d.row['Commerciale']}, DataStipula=${d.row['DataStipula']}`);
});

console.log('\n=== SUMMARY ===');
console.log(`Total rows: ${data.length}`);
console.log(`Test users: ${testUsers.length}`);
console.log(`Duplicates: ${duplicates.length}`);
console.log(`Unique enrolled: ${enrolled.size}`);
console.log(`Accounted for: ${testUsers.length + duplicates.length + enrolled.size}`);
