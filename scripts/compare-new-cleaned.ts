import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareNewCleaned() {
  // Load new cleaned CSV
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_NEW_CLEANED.csv', 'utf-8');
  const records: any[] = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('=== COMPARING NEW CLEANED CSV VS DB ===\n');
  console.log('Total students in new CSV:', records.length);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true, assignedTo: true }
  });
  console.log('Total enrolled in DB:', enrolled.length);
  
  // Normalize
  const normalize = (s: any) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build map by name
  const enrolledByName = new Map<string, typeof enrolled[0][]>();
  for (const e of enrolled) {
    const name = normalize(e.name);
    if (!enrolledByName.has(name)) enrolledByName.set(name, []);
    enrolledByName.get(name)!.push(e);
  }
  
  // Check each CSV row
  const found: any[] = [];
  const missing: any[] = [];
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    const course = row['Corso'];
    const commerciale = row['Commerciale'] || '';
    
    if (!name) continue;
    
    // Try exact name match
    if (enrolledByName.has(name)) {
      found.push({ name: row['Studente'], course, match: 'exact' });
      continue;
    }
    
    // Not found
    missing.push({ name: row['Studente'], course, commerciale });
  }
  
  console.log('\n--- Results ---');
  console.log('Found in DB:', found.length);
  console.log('MISSING from DB:', missing.length);
  
  if (missing.length > 0) {
    console.log('\n=== MISSING STUDENTS (NOT ENROLLED IN DB) ===');
    missing.forEach((m, i) => {
      console.log(`${i+1}. ${m.name} | ${m.course} | ${m.commerciale}`);
    });
  }
  
  await prisma.$disconnect();
}

compareNewCleaned().catch(console.error);
