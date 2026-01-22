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
  
  // Build CSV lookup by name
  const csvByName = new Map<string, string[]>();
  for (const row of data) {
    const name = normalize(row['Studente']);
    if (name.includes('manuel alvaro') || name.includes('benedetta barbarisi')) continue;
    if (!csvByName.has(name)) csvByName.set(name, []);
    csvByName.get(name)!.push(row['Corso']);
  }
  
  // Get enrolled leads
  const enrolled = await prisma.lead.findMany({
    where: { status: 'ISCRITTO' },
    include: { course: true }
  });
  
  console.log('Enrolled leads:', enrolled.length);
  
  // Check mismatches
  const mismatches: { name: string; dbCourse: string; csvCourses: string[] }[] = [];
  
  for (const lead of enrolled) {
    const normName = normalize(lead.name);
    const csvCourses = csvByName.get(normName);
    
    if (!csvCourses) {
      // Not in CSV at all
      mismatches.push({ 
        name: lead.name, 
        dbCourse: lead.course?.name || 'NO COURSE', 
        csvCourses: ['NOT IN CSV'] 
      });
    } else {
      // Check if DB course matches any CSV course for this person
      const dbCourse = normalize(lead.course?.name || '');
      const csvNorm = csvCourses.map(c => normalize(c));
      
      if (!csvNorm.includes(dbCourse)) {
        mismatches.push({
          name: lead.name,
          dbCourse: lead.course?.name || 'NO COURSE',
          csvCourses: csvCourses
        });
      }
    }
  }
  
  console.log('\nMismatches (enrolled with wrong course or not in CSV):', mismatches.length);
  console.log('\n=== DETAILS ===');
  mismatches.slice(0, 50).forEach(m => {
    console.log(`${m.name}`);
    console.log(`  DB:  ${m.dbCourse}`);
    console.log(`  CSV: ${m.csvCourses.join(', ')}`);
  });
  
  if (mismatches.length > 50) {
    console.log(`\n... and ${mismatches.length - 50} more`);
  }
  
  await prisma.$disconnect();
}

run().catch(console.error);
