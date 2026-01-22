import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  // Load CSV
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true, 
    relax_column_count: true 
  });
  
  // Get unique enrollments from CSV
  const csvEnrollments = new Map<string, { name: string; course: string }>();
  for (const row of data) {
    const name = normalize(row['Studente']);
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    const course = normalize(row['Corso']);
    const key = `${name}|${course}`;
    if (!csvEnrollments.has(key)) {
      csvEnrollments.set(key, { name: row['Studente'].trim(), course: row['Corso'] });
    }
  }
  
  console.log('CSV unique enrollments:', csvEnrollments.size);
  
  // Get DB enrolled
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  const dbEnrolled = new Set(enrolled.map(l => `${normalize(l.name)}|${normalize(l.course?.name || '')}`));
  console.log('DB enrolled:', dbEnrolled.size);
  
  // Find missing
  const missing: { name: string; course: string }[] = [];
  for (const [key, val] of csvEnrollments) {
    if (!dbEnrolled.has(key)) {
      missing.push(val);
    }
  }
  
  console.log('\nMissing from DB:', missing.length);
  if (missing.length > 0) {
    console.log('\nMissing entries:');
    missing.forEach(m => console.log(`  ${m.name} | ${m.course}`));
  }
  
  // Check if these names exist in DB at all
  console.log('\n--- Checking if names exist in DB ---');
  const allLeads = await prisma.lead.findMany({ include: { course: true } });
  const leadsByName = new Map<string, typeof allLeads>();
  for (const l of allLeads) {
    const n = normalize(l.name);
    if (!leadsByName.has(n)) leadsByName.set(n, []);
    leadsByName.get(n)!.push(l);
  }
  
  for (const m of missing.slice(0, 20)) {
    const normName = normalize(m.name);
    const leads = leadsByName.get(normName);
    if (leads) {
      console.log(`\n${m.name} | ${m.course}`);
      console.log(`  Found ${leads.length} lead(s) with this name:`);
      leads.forEach(l => console.log(`    - ${l.course?.name || 'NO COURSE'} (status: ${l.status})`));
    } else {
      console.log(`\n${m.name} | ${m.course}`);
      console.log(`  NOT FOUND IN DB - needs to be created`);
    }
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
