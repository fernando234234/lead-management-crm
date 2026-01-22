import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const csv = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
const records: any[] = parse(csv, { columns: true, skip_empty_lines: true });

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// Count by name+course
const byCombination = new Map<string, number>();
const byName = new Map<string, number>();

for (const r of records) {
  const name = normalize(r['Studente']);
  const course = normalize(r['Corso']);
  const key = `${name}|${course}`;
  
  if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
  
  byCombination.set(key, (byCombination.get(key) || 0) + 1);
  byName.set(name, (byName.get(name) || 0) + 1);
}

console.log('Unique name+course combinations:', byCombination.size);
console.log('Unique names:', byName.size);

const dupCombos = [...byCombination.entries()].filter(([_, c]) => c > 1);
console.log('\nDuplicate name+course (exact same enrollment twice):', dupCombos.length);
dupCombos.forEach(([k, c]) => console.log(`  ${k}: ${c}`));

const multiCourse = [...byName.entries()].filter(([_, c]) => c > 1);
console.log('\nStudents enrolled in multiple courses:', multiCourse.length);
multiCourse.forEach(([n, c]) => console.log(`  ${n}: ${c} courses`));
