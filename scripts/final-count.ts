import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
  columns: true, 
  skip_empty_lines: true, 
  relax_quotes: true,
  relax_column_count: true
});

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

const unique = new Set<string>();
let test = 0;

for (const row of data) {
  const name = normalize(row['Studente']);
  if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) { 
    test++; 
    continue; 
  }
  unique.add(`${name}|${normalize(row['Corso'])}`);
}

console.log('Total rows:', data.length);
console.log('Test users:', test);
console.log('Unique name+course:', unique.size);
