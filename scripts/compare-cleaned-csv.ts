import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareCleanedCSV() {
  // Load cleaned CSV
  const csvContent = readFileSync('C:/Users/ferna/Downloads/Contratti_CLEANED.csv', 'utf-8');
  const records = parse(csvContent, { columns: true, skip_empty_lines: true });
  
  console.log('=== COMPARING CLEANED CSV VS DB ===\n');
  console.log('Total students in cleaned CSV:', records.length);
  
  // Get all enrolled from DB
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true, assignedTo: true }
  });
  console.log('Total enrolled in DB:', enrolled.length);
  
  // Normalize for comparison
  const normalize = (s: any) => (s || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Build map of enrolled by normalized name + course
  const enrolledMap = new Map<string, typeof enrolled[0]>();
  const enrolledByName = new Map<string, typeof enrolled[0][]>();
  
  for (const e of enrolled) {
    const name = normalize(e.name);
    const course = normalize(e.course?.name || '');
    const key = `${name}|${course}`;
    enrolledMap.set(key, e);
    
    if (!enrolledByName.has(name)) enrolledByName.set(name, []);
    enrolledByName.get(name)!.push(e);
  }
  
  // Check each CSV row
  const found: any[] = [];
  const missing: any[] = [];
  
  for (const row of records) {
    const name = normalize(row['Studente']);
    const course = normalize(row['Corso']);
    const commerciale = row['Commerciale'] || '';
    
    if (!name) continue;
    
    const key = `${name}|${course}`;
    
    // Exact match
    if (enrolledMap.has(key)) {
      found.push({ name: row['Studente'], course: row['Corso'], match: 'exact' });
      continue;
    }
    
    // Name match with any course
    if (enrolledByName.has(name)) {
      const matches = enrolledByName.get(name)!;
      found.push({ 
        name: row['Studente'], 
        course: row['Corso'], 
        match: 'name-only',
        dbCourse: matches[0].course?.name 
      });
      continue;
    }
    
    // Not found
    missing.push({ 
      name: row['Studente'], 
      course: row['Corso'], 
      commerciale 
    });
  }
  
  console.log('\n--- Results ---');
  console.log('Found in DB:', found.length);
  console.log('MISSING from DB:', missing.length);
  
  if (missing.length > 0) {
    console.log('\n=== MISSING STUDENTS ===');
    missing.forEach((m, i) => {
      console.log(`${i+1}. ${m.name} | ${m.course} | ${m.commerciale}`);
    });
  }
  
  // Match type breakdown
  const byType = found.reduce((acc, f) => {
    acc[f.match] = (acc[f.match] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('\n--- Match Types ---');
  Object.entries(byType).forEach(([t, c]) => console.log(`${t}: ${c}`));
  
  await prisma.$disconnect();
}

compareCleanedCSV().catch(console.error);
