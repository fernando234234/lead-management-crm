import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

// Check the main leads CSV
const leadsData: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Dashboard_Commerciale_Formazione (4) - Dati (1).csv', 'utf-8'), { 
  columns: true, 
  skip_empty_lines: true 
});

const leadsCourses = new Set<string>();
for (const row of leadsData) {
  if (row['Corso']) leadsCourses.add(row['Corso']);
}

console.log('=== MAIN LEADS CSV ===');
console.log(`Total rows: ${leadsData.length}`);
console.log(`Unique courses: ${leadsCourses.size}\n`);

// Check the contracts CSV
const contractsData: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_VALID_485.csv', 'utf-8'), { 
  columns: true, 
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

const contractsCourses = new Set<string>();
for (const row of contractsData) {
  if (row['Corso']) contractsCourses.add(row['Corso']);
}

console.log('=== CONTRACTS CSV ===');
console.log(`Total rows: ${contractsData.length}`);
console.log(`Unique courses: ${contractsCourses.size}\n`);

// Compare
console.log('=== COURSES IN CONTRACTS (clean) ===');
Array.from(contractsCourses).sort().forEach(c => console.log(`  ${c}`));

console.log('\n=== COURSES IN LEADS BUT NOT IN CONTRACTS ===');
const extraInLeads: string[] = [];
for (const c of leadsCourses) {
  if (!contractsCourses.has(c)) {
    extraInLeads.push(c);
  }
}
console.log(`Count: ${extraInLeads.length}`);
extraInLeads.sort().forEach(c => console.log(`  ${c}`));
