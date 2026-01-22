import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  // CSV unique
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
    columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true
  });
  
  const csvSet = new Set<string>();
  for (const row of data) {
    const name = normalize(row['Studente']);
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    csvSet.add(`${name}|${normalize(row['Corso'])}`);
  }
  console.log('CSV unique:', csvSet.size);
  
  // DB enrolled
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  console.log('DB enrolled:', enrolled.length);
  
  // Find DB enrolled NOT in CSV
  const extra: { name: string; course: string }[] = [];
  for (const lead of enrolled) {
    const key = `${normalize(lead.name)}|${normalize(lead.course?.name || '')}`;
    if (!csvSet.has(key)) {
      extra.push({ name: lead.name, course: lead.course?.name || '' });
    }
  }
  
  console.log('\nExtra in DB (not in CSV):', extra.length);
  extra.forEach(e => console.log(`  ${e.name} | ${e.course}`));
  
  // Find CSV not in DB
  const dbSet = new Set(enrolled.map(l => `${normalize(l.name)}|${normalize(l.course?.name || '')}`));
  const missing: string[] = [];
  for (const key of csvSet) {
    if (!dbSet.has(key)) {
      missing.push(key);
    }
  }
  console.log('\nMissing from DB:', missing.length);
  missing.forEach(m => console.log(`  ${m}`));
  
  await prisma.$disconnect();
}

run().catch(console.error);
