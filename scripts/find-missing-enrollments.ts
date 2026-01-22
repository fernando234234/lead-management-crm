import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findMissing() {
  // Load CSV
  const csv = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csv, { columns: true, skip_empty_lines: true });
  
  const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build unique name+course from CSV (excluding test users)
  const csvCombos = new Map<string, { name: string; course: string }>();
  for (const r of records) {
    const name = normalize(r['Studente']);
    const course = normalize(r['Corso']);
    
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    
    const key = `${name}|${course}`;
    if (!csvCombos.has(key)) {
      csvCombos.set(key, { name: r['Studente'], course: r['Corso'] });
    }
  }
  
  console.log('Unique name+course in CSV:', csvCombos.size);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  console.log('Enrolled in DB:', enrolled.length);
  
  // Build set of enrolled name+course from DB
  const dbCombos = new Set<string>();
  for (const e of enrolled) {
    const key = `${normalize(e.name)}|${normalize(e.course?.name || '')}`;
    dbCombos.add(key);
  }
  
  console.log('Unique name+course in DB:', dbCombos.size);
  
  // Find CSV combos NOT in DB
  const missing: { name: string; course: string }[] = [];
  for (const [key, val] of csvCombos) {
    if (!dbCombos.has(key)) {
      missing.push(val);
    }
  }
  
  console.log('\n=== MISSING FROM DB (in CSV but not enrolled) ===');
  console.log('Count:', missing.length);
  
  if (missing.length > 0) {
    missing.forEach(m => console.log(`  ${m.name} | ${m.course}`));
  }
  
  // Also find DB combos NOT in CSV (shouldn't be any)
  const extra: string[] = [];
  for (const e of enrolled) {
    const key = `${normalize(e.name)}|${normalize(e.course?.name || '')}`;
    if (!csvCombos.has(key)) {
      extra.push(`${e.name} | ${e.course?.name}`);
    }
  }
  
  if (extra.length > 0) {
    console.log('\n=== EXTRA IN DB (enrolled but not in CSV) ===');
    console.log('Count:', extra.length);
    extra.forEach(e => console.log(`  ${e}`));
  }
  
  await prisma.$disconnect();
}

findMissing();
