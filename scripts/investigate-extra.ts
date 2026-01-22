import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

async function run() {
  // Load CSV unique enrollments
  const data: any[] = parse(readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8'), { 
    columns: true, 
    skip_empty_lines: true, 
    relax_quotes: true, 
    relax_column_count: true 
  });
  
  const csvEnrollments = new Set<string>();
  for (const row of data) {
    const name = normalize(row['Studente']);
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    const course = normalize(row['Corso']);
    csvEnrollments.add(`${name}|${course}`);
  }
  
  console.log('CSV unique enrollments:', csvEnrollments.size);
  
  // Get DB enrolled
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  console.log('DB enrolled:', enrolled.length);
  
  // Find DB enrolled NOT in CSV
  const extraInDB: { name: string; course: string }[] = [];
  
  for (const lead of enrolled) {
    const key = `${normalize(lead.name)}|${normalize(lead.course?.name || '')}`;
    if (!csvEnrollments.has(key)) {
      extraInDB.push({ name: lead.name, course: lead.course?.name || 'NO COURSE' });
    }
  }
  
  console.log('\n=== ENROLLED IN DB BUT NOT IN CSV:', extraInDB.length, '===');
  extraInDB.forEach(e => console.log(`  ${e.name} | ${e.course}`));
  
  // Also find CSV NOT in DB
  const missingFromDB: string[] = [];
  const dbEnrolledKeys = new Set(enrolled.map(l => `${normalize(l.name)}|${normalize(l.course?.name || '')}`));
  
  for (const key of csvEnrollments) {
    if (!dbEnrolledKeys.has(key)) {
      missingFromDB.push(key.replace('|', ' | '));
    }
  }
  
  console.log('\n=== IN CSV BUT NOT ENROLLED IN DB:', missingFromDB.length, '===');
  if (missingFromDB.length > 0) {
    missingFromDB.slice(0, 20).forEach(m => console.log(`  ${m}`));
    if (missingFromDB.length > 20) console.log(`  ... and ${missingFromDB.length - 20} more`);
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
