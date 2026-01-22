import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
  // CSV analysis
  const csv = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csv, { columns: true, skip_empty_lines: true });
  
  const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Count unique names in CSV
  const csvNames = new Set<string>();
  const csvDupes: string[] = [];
  
  for (const r of records) {
    const name = normalize(r['Studente']);
    if (csvNames.has(name)) {
      csvDupes.push(r['Studente'] + ' | ' + r['Corso']);
    }
    csvNames.add(name);
  }
  
  console.log('=== CSV ANALYSIS ===');
  console.log('Total rows:', records.length);
  console.log('Unique names:', csvNames.size);
  console.log('Duplicate entries:', csvDupes.length);
  
  if (csvDupes.length > 0) {
    console.log('\nCSV Duplicates (same person, different courses):');
    csvDupes.forEach(d => console.log('  ' + d));
  }
  
  // DB analysis
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  const dbNames = new Set<string>();
  enrolled.forEach(e => dbNames.add(normalize(e.name)));
  
  console.log('\n=== DB ANALYSIS ===');
  console.log('Total enrolled:', enrolled.length);
  console.log('Unique names:', dbNames.size);
  
  // Find DB names NOT in CSV
  const dbNotInCsv: string[] = [];
  for (const e of enrolled) {
    if (!csvNames.has(normalize(e.name))) {
      dbNotInCsv.push(e.name + ' | ' + e.course?.name);
    }
  }
  
  console.log('\nDB enrolled NOT in CSV:', dbNotInCsv.length);
  if (dbNotInCsv.length > 0 && dbNotInCsv.length <= 20) {
    dbNotInCsv.forEach(d => console.log('  ' + d));
  }
  
  await prisma.$disconnect();
}

debug();
